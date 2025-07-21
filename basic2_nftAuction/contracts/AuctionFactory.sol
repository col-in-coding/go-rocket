// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./NftAuction.sol";
import "./interfaces/INftAuction.sol";

contract AuctionFactory is Initializable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

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

    function getAuctionFeeRate(uint256 _auctionId) external view returns (uint256) {
        require(_auctionId < nextAuctionId, "Auction does not exist.");
        INftAuction auctionContract = INftAuction(auctionAddresses[_auctionId]);
        return auctionContract.feeRate();
    }

    function depositNft(
        uint256 _auctionId,
        uint256 _tokenId,
        uint256 _duration,
        address _nftAddress,
        uint256 _startPrice
    ) external virtual {
        require(_auctionId < nextAuctionId, "Auction does not exist.");

        INftAuction auctionContract = INftAuction(auctionAddresses[_auctionId]);

        require(
            msg.sender == auctionContract.seller() || msg.sender == admin,
            "Only the seller or admin can deposit NFT."
        );

        auctionContract.depositNft(_tokenId, _duration, _nftAddress, _startPrice);
    }

    function endAuction(uint256 _auctionId) external virtual onlyAdmin {
        require(_auctionId < nextAuctionId, "Auction does not exist.");

        INftAuction auctionContract = INftAuction(auctionAddresses[_auctionId]);
        auctionContract.endAuction();
        emit AuctionEnded(_auctionId, address(auctionContract));
    }

    /**
     * @dev 设置特定拍卖的手续费率
     * @param _auctionId 拍卖ID
     * @param _feeRate 手续费率（基点）
     */
    function setAuctionFeeRate(uint256 _auctionId, uint256 _feeRate) external virtual onlyAdmin {
        require(_auctionId < nextAuctionId, "Auction does not exist.");

        INftAuction auctionContract = INftAuction(auctionAddresses[_auctionId]);
        auctionContract.setFeeRate(_feeRate);
    }

    /**
     * @dev 批量设置所有拍卖的手续费率
     * @param _feeRate 手续费率（基点）
     */
    function setGlobalFeeRate(uint256 _feeRate) external virtual onlyAdmin {
        for (uint256 i = 0; i < nextAuctionId; i++) {
            INftAuction auctionContract = INftAuction(auctionAddresses[i]);
            auctionContract.setFeeRate(_feeRate);
        }
    }

    /**
     * @dev 从指定拍卖合约提取ETH手续费
     * @param _auctionId 拍卖ID
     */
    function withdrawFeeFromAuction(uint256 _auctionId) external onlyAdmin {
        require(_auctionId < nextAuctionId, "Auction does not exist.");
        INftAuction auctionContract = INftAuction(auctionAddresses[_auctionId]);
        auctionContract.withdrawETH(admin);
    }

    /**
     * @dev 从指定拍卖合约提取ERC20手续费
     * @param _auctionId 拍卖ID
     * @param tokenAddress ERC20代币地址
     */
    function withdrawERC20FeeFromAuction(uint256 _auctionId, address tokenAddress) external onlyAdmin {
        require(_auctionId < nextAuctionId, "Auction does not exist.");
        INftAuction auctionContract = INftAuction(auctionAddresses[_auctionId]);
        auctionContract.withdrawERC20(tokenAddress, admin);
    }

    /**
     * @dev 从所有拍卖合约批量提取ETH手续费
     */
    function withdrawAllETHFees() external onlyAdmin {
        for (uint256 i = 0; i < nextAuctionId; i++) {
            INftAuction auctionContract = INftAuction(auctionAddresses[i]);
            try auctionContract.withdrawETH(admin) {
                // 成功提取
            } catch {
                // 忽略失败的提取（可能是余额为0）
                console.log("Failed to withdraw ETH from auction %d", i);
            }
        }
    }

    /**
     * @dev 从所有拍卖合约批量提取ERC20手续费
     * @param tokenAddress ERC20代币地址
     */
    function withdrawAllERC20Fees(address tokenAddress) external onlyAdmin {
        for (uint256 i = 0; i < nextAuctionId; i++) {
            INftAuction auctionContract = INftAuction(auctionAddresses[i]);
            try auctionContract.withdrawERC20(tokenAddress, admin) {
                // 成功提取
            } catch {
                // 忽略失败的提取（可能是余额为0）
                console.log("Failed to withdraw ERC20 from auction %d", i);
            }
        }
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

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
}