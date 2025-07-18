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

    address public seller;
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

    bool public deposited;
    bool public ended;

    mapping(address => AggregatorV3Interface) public priceFeeds;

    function initialize() public initializer {
        seller = msg.sender;
    }

    function version() public pure virtual returns (string memory) {
        return "1.0.0";
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
        require(msg.sender == seller, "Only seller can deposit NFT.");
        require(!deposited, "NFT already deposited");
        require(_nftAddress != address(0), "NFT address cannot be 0.");

        duration = _duration;
        startPrice = _startPrice;
        startTime = block.timestamp;
        nftAddress = _nftAddress;
        tokenId = _tokenId;
        deposited = true;

        // * 需要先给代理合约地址授权 *
        // 外部调用合约的 `safeTransferFrom` 方法来转移 NFT
        IERC721(nftAddress).safeTransferFrom(msg.sender, address(this), tokenId);
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
            seller == msg.sender,
            "Only seller can end the auction"
        );
        require(!ended, "Auction already ended");

        ended = true;

        if (highestBidder != address(0)) {
            IERC721(nftAddress).safeTransferFrom(address(this), highestBidder, tokenId);
            if (tokenAddress == address(0)) {
                payable(seller).transfer(highestBid);
            } else {
                IERC20(tokenAddress).safeTransfer(seller, highestBid);
            }
        } else {
            IERC721(nftAddress).safeTransferFrom(address(this), seller, tokenId);
        }
    }
}
