// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "./NftAuction.sol";

contract AuctionFactory is Initializable, UUPSUpgradeable {

    address public admin;

    UpgradeableBeacon public auctionBeacon;

    mapping(uint256 => address) public auctionAddresses;

    uint256[] public auctionIds;

    uint256 public nextAuctionId;

    // Events
    event AuctionCreated(uint256 indexed auctionId, address indexed auctionAddress);
    event AuctionEnded(uint256 indexed auctionId, address indexed auctionAddress);
    event BeaconUpgraded(address indexed oldImplementation, address indexed newImplementation);

    function initialize(address _nftAuctionImplementation) initializer public {
        admin = msg.sender;

        // 工厂合约创建并拥有beacon
        auctionBeacon = new UpgradeableBeacon(_nftAuctionImplementation, address(this));
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
            address(auctionBeacon),
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
    ) external virtual {
        require(_auctionId < nextAuctionId, "Auction does not exist.");

        NftAuction auctionContract = NftAuction(auctionAddresses[_auctionId]);

        require(
            msg.sender == auctionContract.seller() || msg.sender == admin,
            "Only the seller or admin can deposit NFT."
        );

        auctionContract.depositNft(_tokenId, _duration, _nftAddress, _startPrice);
    }

    function endAuction(uint256 _auctionId) external virtual onlyAdmin {
        require(_auctionId < nextAuctionId, "Auction does not exist.");

        NftAuction auctionContract = NftAuction(auctionAddresses[_auctionId]);
        auctionContract.endAuction();
        emit AuctionEnded(_auctionId, address(auctionContract));
    }

    /**
     * @dev 升级 beacon 指向的实现合约
     * @param newImplementation 新的实现合约地址
     */
    function upgradeBeacon(address newImplementation) external virtual onlyAdmin {
        address oldImplementation = auctionBeacon.implementation();

        auctionBeacon.upgradeTo(newImplementation);

        emit BeaconUpgraded(oldImplementation, newImplementation);
    }

    /**
     * @dev 获取当前 beacon 的实现合约地址
     */
    function getCurrentImplementation() external view virtual returns (address) {
        return auctionBeacon.implementation();
    }

    /**
     * @dev 获取所有拍卖合约的当前版本
     */
    function getAllAuctionsVersion() external view returns (string memory) {
        if (auctionIds.length == 0) return "No auctions created";

        // 获取第一个拍卖合约的版本（所有代理合约版本相同）
        NftAuction auctionContract = NftAuction(auctionAddresses[auctionIds[0]]);
        return auctionContract.version();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
}