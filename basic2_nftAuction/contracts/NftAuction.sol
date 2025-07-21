// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

contract NftAuction is Initializable, ERC721Holder {
    using SafeERC20 for IERC20;

    address public admin;  // 管理员（通常是工厂合约）
    address public seller; // 卖家（拍卖物品的所有者）
    address public highestBidder;
    address public nftAddress;
    // Token for bidding (if needed)
    // 0: ETH, xxx: ERC20, etc.
    address public tokenAddress;

    uint256 public duration;
    uint256 public startPrice;
    uint256 public startTime;
    uint256 public tokenId;
    uint256 public highestBid;
    uint256 public feeRate; // 手续费率 (basis points, 例如 250 = 2.5%)

    bool public deposited;
    bool public ended;

    mapping(address => AggregatorV3Interface) public priceFeeds;

    // 事件
    event FeeCollected(address indexed tokenAddress, uint256 feeAmount, address indexed collector);
    event AuctionCompleted(address indexed winner, uint256 amount, uint256 fee);

    function initialize(address _seller) public initializer {
        admin = msg.sender;  // 初始化时，调用者（工厂合约）是管理员
        seller = _seller;    // 同时设置卖家
        feeRate = 250;       // 默认手续费率 2.5% (250 basis points)
    }

    function version() public pure virtual returns (string memory) {
        return "1.0.0";
    }

    /**
     * @dev 设置手续费率
     * @param _feeRate 手续费率（基点，10000 = 100%）
     */
    function setFeeRate(uint256 _feeRate) external {
        require(msg.sender == admin, "Only admin can set fee rate");
        require(_feeRate <= 1000, "Fee rate cannot exceed 10%"); // 最大10%
        feeRate = _feeRate;
    }

    /**
     * @dev 获取当前手续费率
     */
    function getFeeRate() external view returns (uint256) {
        return feeRate;
    }

    /**
     * @dev 提取合约中的ETH余额（仅管理员）
     * @param _to 接收ETH的地址
     */
    function withdrawETH(address _to) external {
        require(msg.sender == admin, "Only admin can withdraw");
        require(_to != address(0), "Invalid recipient address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(_to).transfer(balance);
    }

    /**
     * @dev 提取合约中的ERC20代币余额（仅管理员）
     * @param _tokenAddress ERC20代币地址
     * @param _to 接收代币的地址
     */
    function withdrawERC20(address _tokenAddress, address _to) external {
        require(msg.sender == admin, "Only admin can withdraw");
        require(_to != address(0), "Invalid recipient address");
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        token.safeTransfer(_to, balance);
    }

    /**
     * @dev Deposit NFT into the auction.
     * @param _tokenId The ID of the NFT to deposit.
     * @param _duration Duration of the auction in seconds.
     * @param _nftAddress Address of the NFT contract.
     * @param _startPrice Starting price for the auction.
     */
    function depositNft(
        uint256 _tokenId,
        uint256 _duration,
        address _nftAddress,
        uint256 _startPrice
    ) external {
        require(msg.sender == admin, "Only admin can deposit NFT.");
        require(!deposited, "NFT already deposited");
        require(_nftAddress != address(0), "NFT address cannot be 0.");

        tokenId = _tokenId;
        duration = _duration;
        startPrice = _startPrice;
        startTime = block.timestamp;
        nftAddress = _nftAddress;
        deposited = true;

        // * 需要先给代理合约地址授权 *
        // 外部调用合约的 `safeTransferFrom` 方法从 seller 转移 NFT
        IERC721(nftAddress).safeTransferFrom(seller, address(this), tokenId);
    }

    function setPriceFeed(address _tokenAddress, address _priceFeed) public {
        priceFeeds[_tokenAddress] = AggregatorV3Interface(_priceFeed);
    }

    function getChainLinkLatestPrice(address _tokenAddress) public view returns (int) {
        AggregatorV3Interface priceFeed = priceFeeds[_tokenAddress];
        require(address(priceFeed) != address(0), "Price feed not set");

        (
            /* uint80 roundID */,
            int price,
            /* uint startedAt */,
            /* uint timeStamp */,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        return price;
    }

    // Bid by sending ETH or ERC20 tokens
    function priceBid(
        uint256 amount,
        address _tokenAddress
    ) public payable virtual {
        require(deposited, "NFT not deposited");
        require(!ended && startTime + duration > block.timestamp, "Auction has ended");

        if (_tokenAddress == address(0)) {
            // Handle ETH bid
            amount = msg.value;
        } else {
            // Handle ERC20 token bid
            IERC20(_tokenAddress).safeTransferFrom(msg.sender, address(this), amount);

        }
        uint256 payValue = amount * uint256(getChainLinkLatestPrice(_tokenAddress));

        uint256 startPriceValue = startPrice * uint256(getChainLinkLatestPrice(address(0)));
        uint256 highestBidValue = highestBid * uint256(getChainLinkLatestPrice(tokenAddress));

        require(
            payValue >= startPriceValue && payValue > highestBidValue,
            "Bid amount is not sufficient"
        );

        if (highestBidder != address(0)) {
            // Refund the previous highest bidder
            if (tokenAddress == address(0)) {
                payable(highestBidder).transfer(highestBid);
            } else {
                // console.log("Refunding previous highest bidder:", highestBidder, "with amount:", highestBid);
                IERC20(tokenAddress).safeTransfer(highestBidder, highestBid);
            }
        }

        highestBidder = msg.sender;
        highestBid = amount;
        tokenAddress = _tokenAddress;
        // console.log("New highest bidder:", highestBidder, "with bid:", highestBid);
    }

    function endAuction() external virtual {
        require(
            seller == msg.sender || admin == msg.sender,
            "Only seller or admin can end the auction"
        );
        require(!ended, "Auction already ended");

        ended = true;

        // 只有在存入了NFT的情况下才进行转移操作
        if (!deposited) return;

        if (highestBidder != address(0)) {
            // 转移NFT给最高竞价者
            IERC721(nftAddress).safeTransferFrom(address(this), highestBidder, tokenId);

            // 计算手续费和卖家收益
            uint256 feeAmount = (highestBid * feeRate) / 10000;
            uint256 sellerAmount = highestBid - feeAmount;

            if (tokenAddress == address(0)) {
                // ETH 转账 - 只给卖家转账，手续费保留在合约中
                payable(seller).transfer(sellerAmount);
            } else {
                // ERC20 转账 - 只给卖家转账，手续费保留在合约中
                IERC20(tokenAddress).safeTransfer(seller, sellerAmount);
            }

            // 发送事件
            emit FeeCollected(tokenAddress, feeAmount, admin);
            emit AuctionCompleted(highestBidder, highestBid, feeAmount);
        } else {
            // 没有竞价者，NFT返还给卖家
            IERC721(nftAddress).safeTransferFrom(address(this), seller, tokenId);
        }
    }

}
