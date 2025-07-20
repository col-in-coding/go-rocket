const { ethers } = require('hardhat');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();

    console.log("Deploying NftAuction implementation with account:", deployer);

    // 部署 NftAuction 实现合约
    const NftAuction = await ethers.getContractFactory('NftAuction');
    const nftAuctionImpl = await NftAuction.deploy();
    await nftAuctionImpl.waitForDeployment();

    const implAddress = await nftAuctionImpl.getAddress();
    console.log("NftAuction implementation deployed at:", implAddress);

    // 保存部署信息
    const NftAuctionImpl = {
        address: implAddress,
        abi: NftAuction.interface.format("json")
    };
    await deployments.save('NftAuctionImpl', NftAuctionImpl);

    console.log("✅ NftAuction implementation deployment completed!");
}

module.exports.tags = ['DeployAuctionImpl'];
module.exports.dependencies = []; // 不依赖其他部署
