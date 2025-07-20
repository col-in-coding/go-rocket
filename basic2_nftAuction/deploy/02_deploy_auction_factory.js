const { ethers, upgrades } = require('hardhat');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();

    console.log("Deploying AuctionFactory with account:", deployer);

    // 1. 获取已部署的 NftAuction 实现合约地址
    const NftAuctionImplDeployment = await deployments.get('NftAuctionImpl');
    const implAddress = NftAuctionImplDeployment.address;
    console.log("Using NftAuction implementation at:", implAddress);

    // 2. 部署 AuctionFactory (使用 UUPS 代理模式)
    const AuctionFactory = await ethers.getContractFactory('AuctionFactory');

    // 使用 upgrades.deployProxy 部署可升级的工厂合约
    const auctionFactory = await upgrades.deployProxy(
        AuctionFactory,
        [implAddress], // 传入 NftAuction 实现合约地址
        {
            initializer: 'initialize',
            kind: 'uups'
        }
    );
    await auctionFactory.waitForDeployment();
    const factoryAddress = await auctionFactory.getAddress();
    console.log("AuctionFactory proxy deployed at:", factoryAddress);

    // 获取实现合约地址用于验证
    const factoryImplAddress = await upgrades.erc1967.getImplementationAddress(factoryAddress);
    console.log("AuctionFactory implementation deployed at:", factoryImplAddress);

    // 获取beacon地址
    const beaconAddress = await auctionFactory.auctionBeacon();
    console.log("Auction Beacon created at:", beaconAddress);

    // 保存部署信息
    const AuctionFactoryProxy = {
        address: factoryAddress,
        implementation: factoryImplAddress,
        abi: AuctionFactory.interface.format("json")
    };
    await deployments.save('AuctionFactoryProxy', AuctionFactoryProxy);

    const AuctionBeacon = {
        address: beaconAddress,
        implementation: implAddress,
        abi: [] // Beacon 本身的 ABI
    };
    await deployments.save('AuctionBeacon', AuctionBeacon);

    console.log("✅ AuctionFactory deployment completed!");
    console.log("- Factory can now upgrade beacon implementations");
    console.log("- All auction contracts created through factory will be upgradeable");
}

module.exports.tags = ['DeployAuctionFactory'];
module.exports.dependencies = ['DeployAuctionImpl']; // 依赖实现合约的部署
