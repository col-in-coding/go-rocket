// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./NftAuction.sol";

contract AuctionFactory is Initializable, UUPSUpgradeable {
    address public auctionBeaconAddress;

    address public admin;

    mapping(uint256 => address) public auctionAddresses;
    uint256[] public auctionIds;

    uint256 public nextAuctionId;

    event AuctionCreated(uint256 indexed auctionId, address indexed auctionAddress);
    event AuctionEnded(uint256 indexed auctionId, address indexed auctionAddress);

    function initialize(address _auctionBeacon) initializer public {
        admin = msg.sender;
        auctionBeaconAddress = _auctionBeacon;
    }

    function version() public pure virtual returns (string memory) {
        return "1.0.0";
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only the administrator can perform this action.");
        _;
    }

    function createAuction(address _seller) external virtual {
        // 创建一个新的拍卖代理合约，直接在初始化时设置 seller
        BeaconProxy auction = new BeaconProxy(
            auctionBeaconAddress,
            abi.encodeWithSelector(NftAuction.initialize.selector, _seller)
        );

        auctionAddresses[nextAuctionId] = address(auction);
        auctionIds.push(nextAuctionId);

        emit AuctionCreated(nextAuctionId, address(auction));
        nextAuctionId++;
    }

    function getAuctionCount() external view returns (uint256) {
        return auctionIds.length;
    }

    function depositNft(
        uint256 _auctionId,
        uint256 _tokenId,
        uint256 _duration,
        address _nftAddress,
        uint256 _startPrice
    ) external {
        require(_auctionId < nextAuctionId, "Auction does not exist.");

        NftAuction auctionContract = NftAuction(auctionAddresses[_auctionId]);
        auctionContract.depositNft(_tokenId, _duration, _nftAddress, _startPrice);
    }

    function endAuction(uint256 _auctionId) external onlyAdmin {
        require(_auctionId < nextAuctionId, "Auction does not exist.");

        NftAuction auctionContract = NftAuction(auctionAddresses[_auctionId]);
        auctionContract.endAuction();
        emit AuctionEnded(_auctionId, address(auctionContract));
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
}