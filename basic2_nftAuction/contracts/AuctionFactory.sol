// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./NftAuction.sol";

contract AuctionFactory is Initializable, UUPSUpgradeable {
    address public auctionBeaconAddress;

    address public admin;
    mapping(uint256 => address) public auctions;
    uint256 public nextAuctionId;

    event AuctionCreated(uint256 indexed auctionId, address indexed auctionAddress);

    function initialize(address _auctionBeacon) initializer public {
        admin = msg.sender;
        auctionBeaconAddress = _auctionBeacon;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only the administrator can perform this action.");
        _;
    }

    function createAuction() external onlyAdmin {

        BeaconProxy auction = new BeaconProxy(
            auctionBeaconAddress,
            abi.encodeWithSelector(NftAuction.initialize.selector)
        );
        auctions[nextAuctionId] = address(auction);

        emit AuctionCreated(nextAuctionId, address(auction));
        nextAuctionId++;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
}