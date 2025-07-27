const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { getTokenId } = require("./helpers/testHelpers");
const { expect } = require("chai");


describe("CCIP Test", function () {
    this.timeout(300000);

    let deployer, nftOwner, bidder1;
    let ccipLocalSimulator, ccipNftAuction, ccipBidProxy, myNftToken;
    let chainSelector_, sourceRouter_, destinationRouter_;
    let tokenId, nftAddress;
    let chainId1 = 1; // Mainnet

    async function deployCCIPFixture() {
        [deployer, nftOwner, bidder1] = await ethers.getSigners();

        // 1. deploy CCIPLocalSimulator contract
        const ccipLocalSimualtorFactory = await ethers.getContractFactory(
            "CCIPLocalSimulator"
        );
        ccipLocalSimulator = await ccipLocalSimualtorFactory.deploy();
        await ccipLocalSimulator.waitForDeployment();

        const config = await ccipLocalSimulator.configuration();
        chainSelector_ = config.chainSelector_;
        sourceRouter_ = config.sourceRouter_;
        destinationRouter_ = config.destinationRouter_;

        // 2. deploy CCIPNftAuction contract (use proxy pattern)
        const CCIPNftAuction = await ethers.getContractFactory("CCIPNftAuction");
        ccipNftAuction = await CCIPNftAuction.connect(deployer).deploy();
        await ccipNftAuction.waitForDeployment();

        // Initialize the contract with seller and router (use specific function signature)
        await ccipNftAuction["initialize(address,address)"](nftOwner.address, sourceRouter_);

        // 3. deploy CCIPBidProxy contract
        const CCIPBidProxy = await ethers.getContractFactory("CCIPBidProxy");
        ccipBidProxy = await CCIPBidProxy.deploy();
        await ccipBidProxy.waitForDeployment();
        await ccipBidProxy.initialize(destinationRouter_, chainSelector_, ccipNftAuction.target);

        // 4. register supported chains and bid proxies
        await ccipNftAuction.registerBidProxy(chainId1, ccipBidProxy.target);

        // 5. Deploy MyNftToken and mint an NFT
        myNftToken = await ethers.deployContract("MyNftToken", [deployer.address]);
        await myNftToken.waitForDeployment();
        const tx = await myNftToken.mint(nftOwner.address);
        tokenId = await getTokenId(tx, myNftToken);
        nftAddress = await myNftToken.getAddress();

    }

    async function deployMockAggregator() {
        const initialEth2Usd = ethers.parseUnits("2000", 8);
        mockEthPriceFeed = await ethers.deployContract("MockAggregator", [initialEth2Usd]);
        await mockEthPriceFeed.waitForDeployment();

        await ccipNftAuction.setPriceFeed(
            ethers.ZeroAddress,
            await mockEthPriceFeed.getAddress()
        );
    }

    beforeEach(async function () {
        await loadFixture(deployCCIPFixture);
        await loadFixture(deployMockAggregator);
    });

    it("should be able to send and receive auction info message", async function () {

        const startPrice = ethers.parseEther("0.01");
        const bidAmount = ethers.parseEther("1.0");

        // NFT owner needs to approve the auction contract and call depositNft
        await myNftToken.connect(nftOwner).setApprovalForAll(await ccipNftAuction.getAddress(), true);
        await ccipNftAuction.connect(deployer).depositNft(
            tokenId,
            3600,
            nftAddress,
            startPrice
        );

        // 等待一段时间让跨链消息传递
        await new Promise(resolve => setTimeout(resolve, 2000));

        compareStates(ccipNftAuction, ccipBidProxy);

        await ccipNftAuction.connect(bidder1).priceBid(0, ethers.ZeroAddress, {
            value: bidAmount
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
        compareStates(ccipNftAuction, ccipBidProxy);

        console.log("✅ Auction state synchronized successfully!");
    });


    it("should be able to bid from side chain", async function () {

    });
});

async function compareStates(ccipNftAuction, ccipBidProxy) {
    const auctionState = await ccipBidProxy.auction();
    const expectedState = {
        seller: await ccipNftAuction.seller(),
        currentHighestBidder: await ccipNftAuction.highestBidder(),
        nftAddress: await ccipNftAuction.nftAddress(),
        tokenAddress: await ccipNftAuction.tokenAddress(),
        startPrice: await ccipNftAuction.startPrice(),
        startTime: await ccipNftAuction.startTime(),
        endTime: await ccipNftAuction.startTime() + await ccipNftAuction.duration(),
        tokenId: await ccipNftAuction.tokenId(),
        currentHighestBid: await ccipNftAuction.highestBid(),
        feeRate: 250n, // 默认费率
        deposited: await ccipNftAuction.deposited(),
        ended: await ccipNftAuction.ended()
    };
    expect(auctionState.seller).to.equal(expectedState.seller);
    expect(auctionState.currentHighestBidder).to.equal(expectedState.currentHighestBidder);
    expect(auctionState.nftAddress).to.equal(expectedState.nftAddress);
    expect(auctionState.tokenAddress).to.equal(expectedState.tokenAddress);
    expect(auctionState.startPrice).to.equal(expectedState.startPrice);
    expect(auctionState.startTime).to.equal(expectedState.startTime);
    expect(auctionState.endTime).to.equal(expectedState.endTime);
    expect(auctionState.tokenId).to.equal(expectedState.tokenId);
    expect(auctionState.currentHighestBid).to.equal(expectedState.currentHighestBid);
    expect(auctionState.deposited).to.equal(expectedState.deposited);
    expect(auctionState.ended).to.equal(expectedState.ended);
}
