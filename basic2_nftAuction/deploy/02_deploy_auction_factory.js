const {ethers, upgrades} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    // Load the Beacon Upgradeable contract
    const NftAuctionBeacon = await deployments.get("NftAuctionBeacon");
    const NftAuctionBeaconAddress = NftAuctionBeacon.address;

    const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
    const auctionFactory = await upgrades.deployProxy(
        AuctionFactory,
        [NftAuctionBeaconAddress],
        {kind: "uups", from: deployer});
    await auctionFactory.waitForDeployment();

    console.log("AuctionFactory deployed at:", auctionFactory.target);

    // 保存部署信息
    const auctionFactoryProxy = {
        address: auctionFactory.target,
        abi: auctionFactory.interface.format("json")
    };
    await deployments.save('AuctionFactoryProxy', auctionFactoryProxy);
}

module.exports.tags = ['DeployAuctionFactory'];
module.exports.dependencies = ['DeployNftAuctionBeacon'];