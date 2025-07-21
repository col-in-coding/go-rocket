require("@nomicfoundation/hardhat-chai-matchers");
const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { deployments, ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { getTokenId } = require("./helpers/testHelpers");

describe("AuctionFactory Test", () => {

    let deployer, nftOwner, auctionFactory;

    beforeEach(async () => {
        await deployments.fixture(["DeployAuctionFactory"]);
        [deployer, nftOwner] = await ethers.getSigners();
        const AuctionFactoryProxy = await deployments.get("AuctionFactoryProxy");
        auctionFactory = await ethers.getContractAt("AuctionFactory", AuctionFactoryProxy.address);
    });

    async function createAuction(seller) {
        // 先创建拍卖
        await auctionFactory.createAuction(seller);

        // 然后获取拍卖地址
        const auctionCount = await auctionFactory.getAuctionCount();
        const auctionId = auctionCount - 1n;
        const auctionAddress = await auctionFactory.auctionAddresses(auctionId);

        return { auctionId, auctionAddress };
    }

    it("should be able to create a new auction", async () => {
        const { auctionId, auctionAddress } = await createAuction(nftOwner.address);

        expect(await auctionFactory.version()).to.equal("1.0.0");
        expect(auctionAddress).to.not.equal(ethers.ZeroAddress);
        expect(await auctionFactory.auctionIds(0)).to.equal(auctionId);
        expect(await auctionFactory.getAuctionCount()).to.equal(1);

        // 检查拍卖合约的 admin 是否为工厂合约地址
        const auctionContract = await ethers.getContractAt("NftAuction", auctionAddress);
        expect(await auctionContract.admin()).to.equal(auctionFactory.target);
        expect(await auctionContract.seller()).to.equal(nftOwner);
    });

    it("should create multiple auctions with different sellers", async () => {
        // 创建第一个拍卖
        await auctionFactory.connect(deployer).createAuction(deployer.address);
        const auction1Address = await auctionFactory.auctionAddresses(0);

        // 创建第二个拍卖
        await auctionFactory.connect(deployer).createAuction(nftOwner.address);
        const auction2Address = await auctionFactory.auctionAddresses(1);

        expect(auction1Address).to.not.equal(auction2Address);
        expect(await auctionFactory.getAuctionCount()).to.equal(2);

        // 验证拍卖合约的设置
        const auction1 = await ethers.getContractAt("NftAuction", auction1Address);
        const auction2 = await ethers.getContractAt("NftAuction", auction2Address);

        // 两个拍卖都应该有相同的 admin（工厂合约）
        expect(await auction1.admin()).to.equal(auctionFactory.target);
        expect(await auction2.admin()).to.equal(auctionFactory.target);

        // 但应该有不同的 seller
        expect(await auction1.seller()).to.equal(deployer.address);
        expect(await auction2.seller()).to.equal(nftOwner.address);
    });

    it("should emit AuctionCreated event when creating auction", async () => {
        const tx = await auctionFactory.connect(deployer).createAuction(deployer.address);
        const receipt = await tx.wait();

        // 获取创建的拍卖地址
        const auctionAddress = await auctionFactory.auctionAddresses(0);

        // 验证事件
        await expect(tx)
            .to.emit(auctionFactory, "AuctionCreated")
            .withArgs(0, auctionAddress);
    });

    it("should be able to deposit NFT into auction", async () => {
        const { auctionId, auctionAddress } = await createAuction(nftOwner.address);
        const myNftToken = await ethers.deployContract("MyNftToken", [deployer.address]);
        await myNftToken.waitForDeployment();

        // Mint an NFT to the nftOwner
        const tx = await myNftToken.mint(nftOwner.address);
        const tokenId = await getTokenId(tx, myNftToken);

        // Approve the auction contract to transfer the NFT
        await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);

        // Deposit the NFT into the auction
        await auctionFactory.connect(nftOwner).depositNft(
            auctionId, tokenId, 10, myNftToken.target, ethers.parseEther("0.01"));

        const auctionContract = await ethers.getContractAt("NftAuction", auctionAddress);
        expect(await auctionContract.seller()).to.equal(nftOwner);
        expect(await auctionContract.nftAddress()).to.equal(myNftToken.target);
        expect(await auctionContract.tokenId()).to.equal(tokenId);
    });

    it("should be able to set fee rate", async () => {
        const auction1 = await createAuction(nftOwner.address);
        const newFeeRate = 300; // 3%
        await auctionFactory.connect(deployer).setAuctionFeeRate(auction1.auctionId, newFeeRate);
        expect(
            await auctionFactory.getAuctionFeeRate(auction1.auctionId)
        ).to.equal(newFeeRate);

        const auction2 = await createAuction(nftOwner.address);
        const newFeeRate2 = 400; // 4%
        await auctionFactory.connect(deployer).setGlobalFeeRate(newFeeRate2);
        expect(
            await auctionFactory.getAuctionFeeRate(auction2.auctionId)
        ).to.equal(newFeeRate2);
        expect(
            await auctionFactory.getAuctionFeeRate(auction1.auctionId)
        ).to.equal(newFeeRate2);

        await expect(
            auctionFactory.connect(deployer).setAuctionFeeRate(auction2.auctionId + BigInt(100), 500)
        ).to.be.revertedWith("Auction does not exist.");
    });

    it("should be able to end an auction", async () => {
        const { auctionId, auctionAddress } = await createAuction(nftOwner.address);

        // 结束拍卖
        await auctionFactory.connect(deployer).endAuction(auctionId);

        const auctionContract = await ethers.getContractAt("NftAuction", auctionAddress);
        expect(await auctionContract.ended()).to.be.true;

    });

    describe("Error Tests", () => {
        it("should revert if initialized multiple times", async () => {
            await expect(
                auctionFactory.connect(deployer).initialize(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(auctionFactory, "InvalidInitialization");
        });

        it("should revert when deposit to a non-existent auction", async () => {
            await expect(
                auctionFactory.depositNft(999, 1, 1, ethers.ZeroAddress, 1)
            ).to.be.revertedWith("Auction does not exist.");
        });

        it("should revert when trying to end non-existent auction", async () => {
            await expect(
                auctionFactory.connect(deployer).endAuction(999) // 非法的拍卖ID
            ).to.be.revertedWith("Auction does not exist.");
        });

        it("should revert when tring to end auction by non-admin", async () => {
            const { auctionId } = await createAuction(nftOwner.address);

            // 尝试非管理员结束拍卖
            await expect(
                auctionFactory.connect(nftOwner).endAuction(auctionId)
            ).to.be.revertedWith("Only the administrator can perform this action.");
        });
    });

    describe("Upgrade Test", () => {
        it("should allow upgrading the AuctionFactory contract", async () => {
            const AuctionFactoryV2 = await ethers.getContractFactory("AuctionFactoryV2");
            const upgradedFactory = await upgrades.upgradeProxy(auctionFactory.target, AuctionFactoryV2);
            await upgradedFactory.waitForDeployment();

            expect(await upgradedFactory.version()).to.equal("2.0.0");
            expect(await upgradedFactory.getAuctionCount()).to.equal(0); // 升级后拍卖计数应为0
        });
    });
});
