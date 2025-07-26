// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {CCIPReceiverUpgradable} from "./CCIPReceiverUpgradable.sol";
import "hardhat/console.sol";

/**
 * @title CCIPBidProxy
 * @notice 最小化的侧链竞拍代理合约，只支持主币(ETH)竞价
 */
contract CCIPBidProxy is CCIPReceiverUpgradable {

    IRouterClient private i_router;
    uint64 public mainChainSelector;
    address public mainAuctionContract;

    // 简化的竞拍记录 - 只记录 ETH 竞价
    mapping(bytes32 => address) public bidders; // messageId => bidder
    mapping(bytes32 => uint256) public bidAmounts; // messageId => amount

    struct AuctionItem {
        uint256 tokenId;
        address nftAddress;
        address seller;
        uint256 startPrice;
        uint256 duration;
        uint256 startTime;
        bool deposited;
        bool ended;
    }

    struct AuctionBid {
        address bidder;
        uint256 amount;
        address tokenAddress; // 0: ETH, xxx: ERC20
    }

    // 事件
    event MessageReceived(uint64 indexed sourceChain, bytes32 indexed messageId);
    event BidSubmitted(
        address indexed bidder,
        uint256 amount,
        bytes32 indexed messageId
    );

    function initialize(
        address _router,
        uint64 _mainChainSelector,
        address _mainAuctionContract
    ) public virtual initializer {
        __ccipReceiver_init(_router);

        mainChainSelector = _mainChainSelector;
        mainAuctionContract = _mainAuctionContract;
        i_router = IRouterClient(_router);
    }

    // /**
    //  * @dev 提交 ETH 竞拍到主链
    //  */
    // function submitETHBid() external payable {
    //     require(msg.value > 0, "Amount must be greater than 0");

    //     // 构造 CCIP 消息
    //     Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
    //         receiver: abi.encode(mainAuctionContract),
    //         data: abi.encode(msg.sender, msg.value, address(0)), // address(0) 表示 ETH
    //         tokenAmounts: new Client.EVMTokenAmount[](0),
    //         extraArgs: "", // 使用默认 gas limit，适用于简单消息传递
    //         feeToken: address(0) // 使用 ETH 支付 CCIP 费用
    //     });

    //     // 计算 CCIP 费用
    //     uint256 fees = i_router.getFee(mainChainSelector, evm2AnyMessage);

    //     // 检查是否有足够的 ETH 支付 CCIP 费用
    //     require(address(this).balance >= fees, "Insufficient ETH for CCIP fees");

    //     // 发送消息到主链
    //     bytes32 messageId = i_router.ccipSend{value: fees}(
    //         mainChainSelector,
    //         evm2AnyMessage
    //     );

    //     // 记录竞拍
    //     bidders[messageId] = msg.sender;
    //     bidAmounts[messageId] = msg.value;

    //     emit BidSubmitted(msg.sender, msg.value, messageId);
    // }

    /**
     * @dev 处理来自主链的消息
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    ) internal override {
        uint64 sourceChainSelector = any2EvmMessage.sourceChainSelector; // fetch the source chain identifier (aka selector)
        // 验证消息来源
        require(
            sourceChainSelector == mainChainSelector,
            "Invalid source chain"
        );

        address sender = abi.decode(any2EvmMessage.sender, (address));
        require(sender == mainAuctionContract, "Invalid sender");

        bytes32 messageId = any2EvmMessage.messageId; // fetch the messageId
        emit MessageReceived(sourceChainSelector, messageId);

        AuctionItem memory item = abi.decode(any2EvmMessage.data, (AuctionItem));
        console.log("Cross Chain Message Received");
        console.log("Token ID:", item.tokenId);
        console.log("NFT Address:", item.nftAddress);
        console.log("Seller:", item.seller);
        console.log("Start Price:", item.startPrice);
        console.log("Duration:", item.duration);
        console.log("Start Time:", item.startTime);
        console.log("Deposited:", item.deposited);
        console.log("Ended:", item.ended);
    }

    /**
     * @dev 估算 CCIP 费用
     */
    function estimateCCIPFee(uint256 amount) external view returns (uint256) {
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(mainAuctionContract),
            data: abi.encode(msg.sender, amount, address(0)), // address(0) 表示 ETH
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "", // 使用默认 gas limit
            feeToken: address(0)
        });

        return i_router.getFee(mainChainSelector, evm2AnyMessage);
    }

    /**
     * @dev 获取竞拍信息
     */
    function getBidInfo(bytes32 messageId) external view returns (address bidder, uint256 amount) {
        return (bidders[messageId], bidAmounts[messageId]);
    }

    // 接收 ETH
    receive() external payable {}
}
