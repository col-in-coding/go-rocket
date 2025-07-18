const { ethers, upgrades } = require('hardhat');


module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();

    const NftAuction = await ethers.getContractFactory('NftAuction');

    const beacon = await upgrades.deployBeacon(NftAuction, {
        from: deployer,
    });
    await beacon.waitForDeployment();
    const beaconAddress = await beacon.getAddress();
    console.log("NftAuction Beacon deployed at:", beaconAddress);

    const implAddress = await beacon.implementation();
    console.log("Current implementation address is:", implAddress);

    const NftAuctionBeacon = {
        address: beaconAddress,
        implementation: implAddress,
        abi: NftAuction.interface.format("json")
    };
    await deployments.save('NftAuctionBeacon', NftAuctionBeacon);
}

module.exports.tags = ['DeployNftAuctionBeacon'];