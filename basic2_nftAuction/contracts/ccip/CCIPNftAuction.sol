// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../NftAuction.sol";
import "hardhat/console.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {CCIPReceiverUpgradable} from "./CCIPReceiverUpgradable.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";

/**
 * @title CCIPNftAuction
 * @notice 支持 CCIP 跨链竞拍的主拍卖合约（部署在主链）
 * @dev 继承原有的 NftAuction 合约，增加跨链功能
 */
contract CCIPNftAuction is NftAuction, CCIPReceiverUpgradable {
    // CCIP 相关 - 可升级合约不能使用 immutable
    IRouterClient private i_router;

    // 支持的链和对应的竞拍代理合约
    uint64[] public supportedChainIds;
    mapping(uint64 => address) public chainToBidProxy; // 链ID => 竞拍代理合约地址链

    // 事件
    event CrossChainBroadcast(
        bytes32 indexed messageId,
        uint64 indexed targetChain,
        AuctionItem auctionItem
    );

    event CrossChainBidReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChain,
        address indexed bidder,
        uint256 amount,
        address tokenAddress
    );

    event BidProxyRegistered(
        uint64 indexed chainId,
        address indexed proxyAddress
    );
    event CrossChainBidProcessed(
        bytes32 indexed messageId,
        bool successful,
        string reason
    );

    function initialize(address _seller, address router) public virtual initializer {
        // 调用父合约的内部初始化函数
        __NftAuction_init(_seller);

        // 初始化 CCIP Receiver
        __ccipReceiver_init(router);

        // 设置 router
        i_router = IRouterClient(router);
    }

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

    /**
     * @dev 重写版本号以区分跨链版本
     */
    function version() public pure override returns (string memory) {
        return "1.0.0-CCIP";
    }

    /**
     * @dev 注册支持的链和对应的竞拍代理合约
     */
    function registerBidProxy(
        uint64 _chainId,
        address _proxyAddress
    ) external onlyAdmin {
        chainToBidProxy[_chainId] = _proxyAddress;
        supportedChainIds.push(_chainId);
        emit BidProxyRegistered(_chainId, _proxyAddress);
    }

    /**
     * @dev 处理来自其他链的竞拍消息
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    ) internal pure override {
        console.log("CCIPNftAuction: Received cross-chain message");
    //     bytes32 messageId = any2EvmMessage.messageId;
    //     (address bidder, uint256 amount, address tokenAddress) = abi.decode(
    //         any2EvmMessage.data,
    //         (address, uint256, address)
    //     );

    //     // 验证发送者是注册的代理合约
    //     address sender = abi.decode(any2EvmMessage.sender, (address));
    //     require(
    //         sender == chainToBidProxy[any2EvmMessage.sourceChainSelector],
    //         "Unauthorized sender"
    //     );

    //     emit CrossChainBidReceived(
    //         messageId,
    //         any2EvmMessage.sourceChainSelector,
    //         bidder,
    //         amount,
    //         tokenAddress
    //     );

    //     // 处理竞拍逻辑
    //     _processCrossChainBid(bidder, amount, tokenAddress);
    //     emit CrossChainBidProcessed(messageId, true, "Bid accepted");
    }

    // /**
    //  * @dev 处理跨链竞拍逻辑 - 完全复用父合约的验证逻辑
    //  */
    // function _processCrossChainBid(address bidder, uint256 amount, address tokenAddress) internal {
    //     require(deposited, "NFT not deposited");
    //     require(
    //         !ended && startTime + duration > block.timestamp,
    //         "Auction has ended"
    //     );

    //     uint256 payValue = amount *
    //         uint256(getChainLinkLatestPrice(tokenAddress));
    //     uint256 startPriceValue = startPrice *
    //         uint256(getChainLinkLatestPrice(address(0)));
    //     uint256 highestBidValue = highestBid *
    //         uint256(getChainLinkLatestPrice(tokenAddress));

    //     require(
    //         payValue >= startPriceValue && payValue > highestBidValue,
    //         "Bid amount is not sufficient"
    //     );

    //     // === 跨链特殊处理：不进行实际退款，由代理合约处理 ===
    //     // 父合约会在这里退款给之前的竞拍者，但跨链竞拍的退款逻辑由各链代理合约处理

    //     // === 复用父合约的状态更新逻辑 ===
    //     highestBidder = bidder;
    //     highestBid = amount;
    //     tokenAddress = tokenAddress;
    // }

    // 暂时分开测试
    function _broadcastAuctionItem(uint64 targetChain) public {
        require(chainToBidProxy[targetChain] != address(0), "Proxy not registered");

        AuctionItem memory item = AuctionItem({
            tokenId: tokenId,
            nftAddress: nftAddress,
            seller: seller,
            startPrice: startPrice,
            duration: duration,
            startTime: startTime,
            deposited: deposited,
            ended: ended
        });

        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(chainToBidProxy[targetChain]),
            data: abi.encode(item),
            tokenAmounts: new Client.EVMTokenAmount[](0), // 无需传递代币
            extraArgs: "", // 使用默认 gas limit
            feeToken: address(0) // 使用 ETH 支付 CCIP 费用
        });

        // Initialize a router client instance to interact with cross-chain router
        IRouterClient router = IRouterClient(this.getRouter());

        // Get the fee required to send the message
        uint256 fees = i_router.getFee(targetChain, evm2AnyMessage);
        console.log("CCIPNftAuction: CCIP fees calculated");
        require(address(this).balance >= fees, "Insufficient ETH for CCIP fees");

        // Send the message through the router and store the returned message ID
        bytes32 messageId = router.ccipSend{value: fees}(targetChain, evm2AnyMessage);
        emit CrossChainBroadcast(messageId, targetChain, item);
        console.log("CCIPNftAuction: Cross-chain broadcast completed");
    }

    // function depositNft(
    //     uint256 _tokenId,
    //     uint256 _duration,
    //     address _nftAddress,
    //     uint256 _startPrice
    // ) external virtual override {
    //     // 逻辑与父合约相同
    //     super.depositNft(_tokenId, _duration, _nftAddress, _startPrice);

    //     // _broadcastCrossChainBid(_targetChain, _bidder, _amount, _tokenAddress);
    // }

    // /**
    //  * @dev 重写竞拍函数，支持本地和跨链竞拍
    //  */
    // function priceBid(
    //     uint256 amount,
    //     address _tokenAddress
    // ) public payable override {
    //     // 调用父合约的竞拍逻辑（本地竞拍）
    //     super.priceBid(amount, _tokenAddress);
    // }
}
