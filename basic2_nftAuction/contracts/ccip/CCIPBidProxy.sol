// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {CCIPReceiverUpgradable} from "./CCIPReceiverUpgradable.sol";
import "hardhat/console.sol";
import {CCIPMessageProtocal} from "../library/CCIPMessageProtocal.sol";

/**
 * @title CCIPBidProxy
 * @notice 最小化的侧链竞拍代理合约，只支持主币(ETH)竞价
 */
contract CCIPBidProxy is CCIPReceiverUpgradable {
    // CCIP
    IRouterClient private i_router;
    uint64 public mainChainSelector;
    address public mainAuctionContract;

    // 简化的竞拍记录 - 只记录 ETH 竞价
    mapping(bytes32 => address) public bidders; // messageId => bidder
    mapping(bytes32 => uint256) public bidAmounts; // messageId => amount

    struct Auction {
        address seller; // 卖家（拍卖物品的所有者）
        address currentHighestBidder;
        address nftAddress;
        // Token for bidding (if needed)
        // 0: ETH, xxx: ERC20, etc.
        address tokenAddress;
        uint256 startPrice;
        uint256 startTime;
        uint256 endTime;
        uint256 tokenId;
        uint256 currentHighestBid;
        uint256 feeRate; // 手续费率 (basis points, 例如 250 = 2.5%)
        bool deposited;
        bool ended;
    }
    Auction public auction;

    // 事件
    event MessageReceived(
        uint64 indexed sourceChain,
        bytes32 indexed messageId
    );
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

    /**
     * @dev 锁定资产，提交 ETH 竞拍到主链
     */
    function submitETHBid() external payable {
        require(msg.value > 0, "Amount must be greater than 0");

        bytes32 messageId = _sendBidToMainChain(msg.sender, msg.value);
    }

    function _sendBidToMainChain(address bidder, uint256 amount) internal {
        CCIPMessageProtocal.CCIPMessage message = CCIPMessageProtocal
            .createBidRequestMessage(
                auction.tokenId,
                bidder,
                amount,
                auction.tokenAddress
            );
        bytes memory data = CCIPMessageProtocal.encodeMessage(message);
    }

    function _sendData(data) {
        // Initialize a router client instance to interact with cross-chain router
        IRouterClient router = IRouterClient(this.getRouter());

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(chainToBidProxy[targetChainId]),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0), // 无需传递代币
            extraArgs: "", // 使用默认 gas limit
            feeToken: address(0) // 使用 ETH 支付 CCIP 费用
        });

        // Get the fee required to send the message
        uint256 fees = i_router.getFee(targetChainId, message);

        require(
            address(this).balance >= fees,
            "Insufficient ETH for CCIP fees"
        );

        // Send the message through the router and store the returned message ID
        bytes32 messageId = router.ccipSend{value: fees}(
            targetChainId,
            message
        );
    }

    // 接收 ETH
    receive() external payable {}

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

        // 解码消息数据
        CCIPMessageProtocal.CCIPMessage memory message = CCIPMessageProtocal
            .decodeMessage(any2EvmMessage.data);

        if (message.msgType == CCIPMessageProtocal.MessageType.AUCTION_INFO) {
            _handleAuctionInfo(
                CCIPMessageProtocal.parseAuctionInfoMessage(message.payload)
            );
        } else {
            revert("Unsupported message type");
        }
    }

    function _handleAuctionInfo(
        CCIPMessageProtocal.AuctionInfoMessage memory auctionInfo
    ) internal {
        auction.seller = auctionInfo.seller;
        auction.currentHighestBidder = auctionInfo.currentHighestBidder;
        auction.nftAddress = auctionInfo.nftAddress;
        auction.tokenAddress = auctionInfo.tokenAddress;

        auction.startPrice = auctionInfo.startPrice;
        auction.startTime = auctionInfo.startTime;
        auction.endTime = auctionInfo.endTime;
        auction.tokenId = auctionInfo.tokenId;
        auction.currentHighestBid = auctionInfo.currentHighestBid;
        auction.feeRate = auctionInfo.feeRate;

        auction.deposited = auctionInfo.deposited;
        auction.ended = auctionInfo.ended;
    }
}
