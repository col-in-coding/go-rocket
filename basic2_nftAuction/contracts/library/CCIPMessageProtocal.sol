// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title CCIPMessageProtocal
 * @notice CCIP 跨链消息协议定义
 * @dev 定义所有跨链消息的数据结构和类型
 */
library CCIPMessageProtocal {

    /**
     * @dev 消息类型枚举
     */
    enum MessageType {
        AUCTION_INFO,       // 拍卖信息广播（主链 → 侧链）
        BID_REQUEST,        // 竞拍请求（侧链 → 主链）
        BID_RESPONSE,       // 竞拍响应（主链 → 侧链）
        AUCTION_END         // 拍卖结束通知（主链 → 侧链）
    }

    /**
     * @dev 通用消息包装器
     */
    struct CCIPMessage {
        MessageType msgType;
        uint256 timestamp;      // 消息时间戳，用于时效性检查
        bytes payload;          // 具体消息内容
    }

    /**
     * @dev 拍卖信息消息（主链 → 侧链）
     * 用于广播新拍卖或更新拍卖状态
     */
    struct AuctionInfoMessage {
        uint256 tokenId;
        address nftAddress;
        address tokenAddress; // address(0) 表示 ETH
        address seller;
        uint256 startPrice;
        uint256 currentHighestBid;
        address currentHighestBidder;
        uint256 startTime;
        uint256 endTime;
        uint256 feeRate;
        bool deposited;
        bool ended;
    }

    /**
     * @dev 竞拍请求消息（侧链 → 主链）
     * 侧链用户提交竞拍时发送
     */
    struct BidRequestMessage {
        uint256 tokenId;
        address bidder;
        uint256 amount;
        address tokenAddress;   // address(0) 表示 ETH
    }

    /**
     * @dev 竞拍响应消息（主链 → 侧链）
     * 主链处理竞拍后返回结果
     */
    struct BidResponseMessage {
        bytes32 originalMessageId;     // 原始竞拍请求的消息ID
        address bidder;
        bool success;
        string reason;                  // 成功/失败原因
        uint256 newHighestBid;         // 新的最高出价（如果成功）
        address newHighestBidder;      // 新的最高出价者（如果成功）
    }

    /**
     * @dev 拍卖结束消息（主链 → 侧链）
     * 通知侧链拍卖已结束
     */
    struct AuctionEndMessage {
        uint256 tokenId;
        address winner;
        uint256 finalPrice;
        bool hasWinner;                 // 是否有获胜者
    }

    /**
     * @dev 编码消息为 bytes
     */
    function encodeMessage(CCIPMessage memory message) internal pure returns (bytes memory) {
        return abi.encode(message);
    }

    /**
     * @dev 解码消息从 bytes
     */
    function decodeMessage(bytes memory data) internal pure returns (CCIPMessage memory) {
        return abi.decode(data, (CCIPMessage));
    }

    /**
     * @dev 创建拍卖信息消息
     */
    function createAuctionInfoMessage(
        uint256 tokenId,
        address nftAddress,
        address tokenAddress,
        address seller,
        uint256 startPrice,
        uint256 currentHighestBid,
        address currentHighestBidder,
        uint256 startTime,
        uint256 endTime,
        uint256 feeRate,
        bool deposited,
        bool ended
    ) internal view returns (CCIPMessage memory) {
        AuctionInfoMessage memory auctionInfo = AuctionInfoMessage({
            tokenId: tokenId,
            nftAddress: nftAddress,
            tokenAddress: tokenAddress,
            seller: seller,
            startPrice: startPrice,
            currentHighestBid: currentHighestBid,
            currentHighestBidder: currentHighestBidder,
            startTime: startTime,
            endTime: endTime,
            feeRate: feeRate,
            deposited: deposited,
            ended: ended
        });

        return CCIPMessage({
            msgType: MessageType.AUCTION_INFO,
            timestamp: block.timestamp,
            payload: abi.encode(auctionInfo)
        });
    }

    /**
     * @dev 创建竞拍请求消息
     */
    function createBidRequestMessage(
        uint256 tokenId,
        address bidder,
        uint256 amount,
        address tokenAddress
    ) internal view returns (CCIPMessage memory) {
        BidRequestMessage memory bidRequest = BidRequestMessage({
            tokenId: tokenId,
            bidder: bidder,
            amount: amount,
            tokenAddress: tokenAddress
        });

        return CCIPMessage({
            msgType: MessageType.BID_REQUEST,
            timestamp: block.timestamp,
            payload: abi.encode(bidRequest)
        });
    }

    /**
     * @dev 创建竞拍响应消息
     */
    function createBidResponseMessage(
        bytes32 originalMessageId,
        address bidder,
        bool success,
        string memory reason,
        uint256 newHighestBid,
        address newHighestBidder
    ) internal view returns (CCIPMessage memory) {
        BidResponseMessage memory bidResponse = BidResponseMessage({
            originalMessageId: originalMessageId,
            bidder: bidder,
            success: success,
            reason: reason,
            newHighestBid: newHighestBid,
            newHighestBidder: newHighestBidder
        });

        return CCIPMessage({
            msgType: MessageType.BID_RESPONSE,
            timestamp: block.timestamp,
            payload: abi.encode(bidResponse)
        });
    }

    /**
     * @dev 创建拍卖结束消息
     */
    function createAuctionEndMessage(
        uint256 tokenId,
        address winner,
        uint256 finalPrice,
        bool hasWinner
    ) internal view returns (CCIPMessage memory) {
        AuctionEndMessage memory auctionEnd = AuctionEndMessage({
            tokenId: tokenId,
            winner: winner,
            finalPrice: finalPrice,
            hasWinner: hasWinner
        });

        return CCIPMessage({
            msgType: MessageType.AUCTION_END,
            timestamp: block.timestamp,
            payload: abi.encode(auctionEnd)
        });
    }    /**
     * @dev 解析拍卖信息消息
     */
    function parseAuctionInfoMessage(bytes memory payload)
        internal
        pure
        returns (AuctionInfoMessage memory)
    {
        return abi.decode(payload, (AuctionInfoMessage));
    }

    /**
     * @dev 解析竞拍请求消息
     */
    function parseBidRequestMessage(bytes memory payload)
        internal
        pure
        returns (BidRequestMessage memory)
    {
        return abi.decode(payload, (BidRequestMessage));
    }

    /**
     * @dev 解析竞拍响应消息
     */
    function parseBidResponseMessage(bytes memory payload)
        internal
        pure
        returns (BidResponseMessage memory)
    {
        return abi.decode(payload, (BidResponseMessage));
    }

    /**
     * @dev 解析拍卖结束消息
     */
    function parseAuctionEndMessage(bytes memory payload)
        internal
        pure
        returns (AuctionEndMessage memory)
    {
        return abi.decode(payload, (AuctionEndMessage));
    }
}
