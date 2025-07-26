const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const {ethers} = require("hardhat");
const { getTokenId } = require("./helpers/testHelpers");


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

        return {
            ccipLocalSimulator,
            ccipNftAuction,
            ccipBidProxy,
            myNftToken,
            chainSelector_,
            sourceRouter_,
            destinationRouter_,
            tokenId,
            nftAddress
        };
    }

    beforeEach(async function () {
        const fixtures = await loadFixture(deployCCIPFixture);
        ccipLocalSimulator = fixtures.ccipLocalSimulator;
        ccipNftAuction = fixtures.ccipNftAuction;
        ccipBidProxy = fixtures.ccipBidProxy;
        myNftToken = fixtures.myNftToken;
        chainSelector_ = fixtures.chainSelector_;
        sourceRouter_ = fixtures.sourceRouter_;
        destinationRouter_ = fixtures.destinationRouter_;
        tokenId = fixtures.tokenId;
        nftAddress = fixtures.nftAddress;
    });

    it("send and receive cross-chain message", async function () {

        // NFT owner needs to approve the auction contract and call depositNft
        await myNftToken.connect(nftOwner).setApprovalForAll(await ccipNftAuction.getAddress(), true);
        await ccipNftAuction.connect(deployer).depositNft(
            tokenId,
            3600,
            nftAddress,
            ethers.parseEther("1")
        );

        // broadcast auction item to registered chains
        await ccipNftAuction._broadcastAuctionItem(chainId1);

        // wait for the message to be received

    });

});