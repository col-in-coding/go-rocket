require("@nomicfoundation/hardhat-chai-matchers");
const { deployments, ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { getTokenId } = require("./helpers/testHelpers");


describe("NftAuction Test", () => {
    let myERC20, myNftToken, nftAuctionProxy, nftAuctionBeacon;
    let mockEthPriceFeed, mockMercPriceFeed;
    // deployer：部署合约的账户
    // nftOwner：NFT的所有者
    // bidder1、bidder2：参与拍卖的竞标者
    let deployer, nftOwner, bidder1, bidder2;
    let tokenId, nftAddress;

    async function deployTestContracts() {

        // 1. Deploy the MyNftToken contract and mint an NFT
        myNftToken = await ethers.deployContract("MyNftToken", [deployer.address]);
        await myNftToken.waitForDeployment();
        const tx = await myNftToken.mint(nftOwner.address);
        tokenId = await getTokenId(tx, myNftToken);

        // 2. Deploy the MyERC20 contract
        myERC20 = await ethers.deployContract("MyERC20", [1000000]);
        await myERC20.waitForDeployment();

        // 3. Deploy the NftAuction Beacon and NftAuction Proxy
        await deployments.fixture("DeployAuctionImpl");
        const NftAuctionImpl = await deployments.get("NftAuctionImpl");

        // 使用已部署的实现合约创建 beacon
        const UpgradeableBeacon = await ethers.getContractFactory("UpgradeableBeacon");
        nftAuctionBeacon = await UpgradeableBeacon.deploy(
            NftAuctionImpl.address,
            deployer.address // beacon 的 owner
        );
        await nftAuctionBeacon.waitForDeployment();

        // 使用 deployer 部署合约
        const NftAuction = await ethers.getContractFactory('NftAuction', deployer);
        nftAuctionProxy = await upgrades.deployBeaconProxy(
            await nftAuctionBeacon.getAddress(),
            NftAuction,
            [nftOwner.address], // 传递 seller 参数
            { initializer: 'initialize', from: deployer.address }
        );
        await nftAuctionProxy.waitForDeployment();

        nftAddress = await myNftToken.getAddress();
    }

    async function deployMockPriceFeedFixture() {
        // 假设初始价格为 2000美元
        const initialEth2Usd = ethers.parseUnits("2000", 8); // 1 ETH = 2000 USD
        mockEthPriceFeed = await ethers.deployContract("MockAggregator", [initialEth2Usd]);
        await mockEthPriceFeed.waitForDeployment();

        const initialMERC2Usd = ethers.parseUnits("1", 8); // 1 MERC = 1 USD
        mockMercPriceFeed = await ethers.deployContract("MockAggregator", [initialMERC2Usd]);
        await mockMercPriceFeed.waitForDeployment();
    }

    beforeEach(async () => {
        [deployer, nftOwner, bidder1, bidder2] = await ethers.getSigners();
        await loadFixture(deployTestContracts);
        await loadFixture(deployMockPriceFeedFixture);
        // 设置价格喂价器
        await nftAuctionProxy.setPriceFeed(
            ethers.ZeroAddress, // ETH 地址
            mockEthPriceFeed.getAddress()
        );
        await nftAuctionProxy.setPriceFeed(
            myERC20.getAddress(), // MERC 地址
            mockMercPriceFeed.getAddress()
        );

    });

    it("should be allow user to deposit NFT", async function () {

        expect(await myNftToken.ownerOf(tokenId)).to.equal(nftOwner.address);

        // ethers v6 合约实例没有直接的.address属性
        const nftAuctionProxyAddress = nftAuctionProxy.target;
        await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
        await nftAuctionProxy.connect(deployer).depositNft(
            tokenId,
            10 * 1000,
            nftAddress,
            ethers.parseEther("0.01")
        );
        console.log("NftAuction Proxy deployed at:", nftAuctionProxy.target);

        expect(await nftAuctionProxy.version()).to.equal("1.0.0");
        expect(await nftAuctionProxy.seller()).to.equal(nftOwner.address);
        expect(await nftAuctionProxy.nftAddress()).to.equal(nftAddress);
        expect(await nftAuctionProxy.tokenId()).to.equal(tokenId);
        // the owner of the NFT should be proxy
        expect(await myNftToken.ownerOf(tokenId)).to.equal(nftAuctionProxy.target);

    });

    it("should allow user to place a bid (end by ETH)", async function () {
        const startPrice = 0.01;
        const bidPrice = 0.02;

        const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
        await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
        await nftAuctionProxy.connect(deployer).depositNft(
            tokenId,
            10 * 1000,
            nftAddress,
            ethers.parseEther(startPrice.toString())
        );

        // Bid by ETH
        const ethAmount = ethers.parseEther(bidPrice.toString());
        await nftAuctionProxy.connect(bidder1).priceBid(0, ethers.ZeroAddress, {
            value: ethAmount
        });

        expect(await nftAuctionProxy.highestBidder()).to.equal(bidder1.address);
        expect(await nftAuctionProxy.highestBid()).to.equal(ethAmount);

        // Bid by MERC
        const bidMercPrice1 = ethers.parseUnits((0.02 * 2000).toString(), 18);
        myERC20.connect(deployer)._mint(bidder2.address, bidMercPrice1);

        await myERC20.connect(bidder2).approve(nftAuctionProxyAddress, bidMercPrice1);
        await expect(
            nftAuctionProxy.connect(bidder2).priceBid(bidMercPrice1, myERC20.getAddress())
        ).to.be.revertedWith("Bid amount is not sufficient");

        // Bid by ETH
        const ethAmount2 = ethers.parseEther("0.05");
        await nftAuctionProxy.connect(bidder1).priceBid(ethAmount2, ethers.ZeroAddress, {
            value: ethAmount2
        });
        expect(await nftAuctionProxy.highestBidder()).to.equal(bidder1.address);
        expect(await nftAuctionProxy.highestBid()).to.equal(ethAmount2);

        await nftAuctionProxy.connect(deployer).endAuction();
        expect(await myNftToken.ownerOf(tokenId)).to.equal(bidder1.address);

    });

    it("should allow user to withdraw NFT after auction ends (end without any bids)", async function () {
        const startPrice = 0.01;

        // End the Auction without any bids
        const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
        await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
        await nftAuctionProxy.connect(deployer).depositNft(
            tokenId,
            10 * 1000,
            nftAddress,
            ethers.parseEther(startPrice.toString())
        );

        // End the auction
        await nftAuctionProxy.connect(deployer).endAuction();
        expect(await myNftToken.ownerOf(tokenId)).to.equal(nftOwner.address);
    });

    it("should allow user to withdraw NFT after auction ends (end by ERC20)", async function () {
        const startPrice = 0.01;

        // End the Auction without any bids
        const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
        await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
        await nftAuctionProxy.connect(deployer).depositNft(
            tokenId,
            10 * 1000,
            nftAddress,
            ethers.parseEther(startPrice.toString())
        );
        const feeRate = await nftAuctionProxy.feeRate();

        // Bid by MERC
        const bidMercPrice = ethers.parseUnits((0.02 * 2000).toString(), 18);
        myERC20.connect(deployer)._mint(bidder1.address, bidMercPrice);
        await myERC20.connect(bidder1).approve(nftAuctionProxyAddress, bidMercPrice);
        await nftAuctionProxy.connect(bidder1).priceBid(bidMercPrice, myERC20.getAddress());
        expect(await nftAuctionProxy.highestBidder()).to.equal(bidder1.address);
        expect(await nftAuctionProxy.highestBid()).to.equal(bidMercPrice);

        await nftAuctionProxy.connect(deployer).endAuction();
        expect(await myNftToken.ownerOf(tokenId)).to.equal(bidder1.address);
        expect(await myERC20.balanceOf(bidder1.address)).to.equal(0);

        const nftOwnerBalance = bidMercPrice * (BigInt(10000) - BigInt(feeRate)) / BigInt(10000);
        expect(await myERC20.balanceOf(nftOwner.address)).to.equal(nftOwnerBalance);

        await expect(
            nftAuctionProxy.connect(nftOwner).endAuction()
        ).to.be.revertedWith("Auction already ended");
    });

    describe("Error Tests", () => {
        it("should revert if initialize is called again", async function () {
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
            await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress
                , true);
            await nftAuctionProxy.connect(deployer).depositNft(
                tokenId,
                10 * 1000,
                nftAddress,
                ethers.parseEther("0.01")
            );
            // 尝试再次调用 initialize，应该会失败
            await expect(
                nftAuctionProxy.connect(deployer).initialize(nftOwner)
            ).to.be.revertedWithCustomError(nftAuctionProxy, "InvalidInitialization");
        });

        it("should revert if double deposit NFT", async function () {
            // ethers v6 合约实例没有直接的.address属性
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
            await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
            await nftAuctionProxy.connect(deployer).depositNft(
                tokenId,
                10 * 1000,
                nftAddress,
                ethers.parseEther("0.01")
            );

            // 再次尝试存入同一个 NFT，应该会失败
            // 在测试中断言交易 revert 时，不应先使用 await 得到结果再用 expect 检查，而应将返回的交易 Promise 直接传入 expect。
            await expect(
                nftAuctionProxy.connect(deployer).depositNft(
                    tokenId,
                    10 * 1000,
                    nftAddress,
                    ethers.parseEther("0.01")
                )
            ).to.be.revertedWith("NFT already deposited");
        });

        it("should revert if depositing by non-seller", async function () {
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
            // 尝试其他人存入 NFT，应该会失败
            await myNftToken.connect(bidder1).setApprovalForAll(nftAuctionProxyAddress, true);
            await expect(
                nftAuctionProxy.connect(bidder1).depositNft(
                    tokenId,
                    10 * 1000,
                    nftAddress,
                    ethers.parseEther("0.01")
                )
            ).to.be.revertedWith("Only admin can deposit NFT.");
        });

        it("should revert if nft address is zero", async function () {
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();

            await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
            await expect(
                nftAuctionProxy.connect(deployer).depositNft(
                    tokenId,
                    10 * 1000,
                    ethers.ZeroAddress,
                    ethers.parseEther("0.01")
                )
            ).to.be.revertedWith("NFT address cannot be 0.");
        });

        it("should revert if the price feed address is not set when get price", async function () {
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();

            await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
            await nftAuctionProxy.connect(deployer).depositNft(
                tokenId,
                10 * 1000,
                nftAddress,
                ethers.parseEther("0.01")
            );
            const mockTokenAddress = "0xB0C712f98daE15264c8E26132BCC91C40aD4d5F9";
            await expect(
                nftAuctionProxy.getChainLinkLatestPrice(mockTokenAddress)
            ).to.be.revertedWith("Price feed not set");
        });

        it("should revert if bid after auction ended", async function () {
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
            await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
            await nftAuctionProxy.connect(deployer).depositNft(
                tokenId,
                1,
                nftAddress,
                ethers.parseEther("0.01")
            );
            // 等待拍卖结束
            await new Promise(resolve => setTimeout(resolve, 2000));

            await expect(
                nftAuctionProxy.connect(bidder1).priceBid(ethers.parseEther("0.02"), ethers.ZeroAddress)
            ).to.be.revertedWith("Auction has ended");
        });

        it("should revert if bid before the Nft deposited", async function () {
            await expect(
                nftAuctionProxy.connect(bidder1).priceBid(ethers.parseEther("0.02"), ethers.ZeroAddress)
            ).to.be.revertedWith("NFT not deposited");
        });

        it("should revert if bid amount is not sufficient", async function () {
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
            await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
            await nftAuctionProxy.connect(deployer).depositNft(
                tokenId,
                10 * 1000,
                nftAddress,
                ethers.parseEther("0.01")
            );

            await expect(
                nftAuctionProxy.connect(bidder1).priceBid(0, ethers.ZeroAddress)
            ).to.be.revertedWith("Bid amount is not sufficient");
        });

        it("should revert if end auction by non-seller", async function () {
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
            await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
            await nftAuctionProxy.connect(deployer).depositNft(
                tokenId,
                10 * 1000,
                nftAddress,
                ethers.parseEther("0.01")
            );

            // 尝试其他人结束拍卖，应该会失败
            await expect(
                nftAuctionProxy.connect(bidder1).endAuction()
            ).to.be.revertedWith("Only seller or admin can end the auction");
        });

        it("should allow deployer to end auction", async function () {
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
            await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
            await nftAuctionProxy.connect(deployer).depositNft(
                tokenId,
                10 * 1000,
                nftAddress,
                ethers.parseEther("0.01")
            );

            // deployer（nftOwner）应该能够结束拍卖
            await nftAuctionProxy.connect(deployer).endAuction();
            expect(await myNftToken.ownerOf(tokenId)).to.equal(nftOwner.address);
        });
    });

    describe("Upgrade Tests", () => {
        it("should upgrade the NftAuction contract", async function () {
            // 升级前
            const nftAuctionProxyAddress = await nftAuctionProxy.getAddress();
            await myNftToken.connect(nftOwner).setApprovalForAll(nftAuctionProxyAddress, true);
            await nftAuctionProxy.connect(deployer).depositNft(
                tokenId,
                10 * 1000,
                nftAddress,
                ethers.parseEther("0.01")
            );

            // 检查当前版本
            expect(await nftAuctionProxy.version()).to.equal("1.0.0");

            // 部署新版本实现合约
            const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
            const nftAuctionV2Impl = await NftAuctionV2.deploy();
            await nftAuctionV2Impl.waitForDeployment();

            // 升级 beacon 指向新的实现合约
            await nftAuctionBeacon.connect(deployer).upgradeTo(await nftAuctionV2Impl.getAddress());

            // 验证升级后的合约版本
            expect(await nftAuctionProxy.version()).to.equal("2.0.0");
            expect(await nftAuctionProxy.seller()).to.equal(nftOwner.address);
        });
    });
});

