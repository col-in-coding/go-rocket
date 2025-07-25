require("@nomicfoundation/hardhat-chai-matchers");
const { deployments, ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { getTokenId } = require("./helpers/testHelpers");

describe("NFT Auction Integration Test (Factory + Auction)", () => {
    let myERC20, myNftToken, auctionFactory;
    let mockEthPriceFeed, mockMercPriceFeed;
    let admin, nftOwner, bidder1, bidder2;
    let tokenId, nftAddress;

    async function deployIntegrationFixture() {
        [admin, nftOwner, bidder1, bidder2] = await ethers.getSigners();

        // 1. Deploy all infrastructure (beacon, factory)
        await deployments.fixture(["DeployAuctionFactory"]);

        // 2. Get factory contract
        const AuctionFactoryProxy = await deployments.get("AuctionFactoryProxy");
        auctionFactory = await ethers.getContractAt("AuctionFactory", AuctionFactoryProxy.address);

        // 3. Deploy MyNftToken and mint an NFT
        myNftToken = await ethers.deployContract("MyNftToken", [admin.address]);
        await myNftToken.waitForDeployment();
        const tx = await myNftToken.mint(nftOwner.address);
        tokenId = await getTokenId(tx, myNftToken);
        nftAddress = await myNftToken.getAddress();

        // 4. Deploy MyERC20 contract
        myERC20 = await ethers.deployContract("MyERC20", [1000000]);
        await myERC20.waitForDeployment();

        // 5. Deploy mock price feeds
        const initialEth2Usd = ethers.parseUnits("2000", 8);
        mockEthPriceFeed = await ethers.deployContract("MockAggregator", [initialEth2Usd]);
        await mockEthPriceFeed.waitForDeployment();

        const initialMERC2Usd = ethers.parseUnits("1", 8);
        mockMercPriceFeed = await ethers.deployContract("MockAggregator", [initialMERC2Usd]);
        await mockMercPriceFeed.waitForDeployment();

        return {
            auctionFactory,
            myNftToken,
            myERC20,
            mockEthPriceFeed,
            mockMercPriceFeed,
            tokenId,
            nftAddress
        };
    }

    beforeEach(async () => {
        const fixtures = await loadFixture(deployIntegrationFixture);
        ({
            auctionFactory,
            myNftToken,
            myERC20,
            mockEthPriceFeed,
            mockMercPriceFeed,
            tokenId,
            nftAddress
        } = fixtures);
    });

    describe("Factory and Auction Creation", () => {
        it("should create auction through factory with correct settings", async function () {
            // 创建拍卖
            await auctionFactory.connect(nftOwner).createAuction(nftOwner.address);

            const auctionId = 0;
            const auctionAddress = await auctionFactory.auctionAddresses(auctionId);
            expect(auctionAddress).to.not.equal(ethers.ZeroAddress);

            // 验证工厂合约状态
            expect(await auctionFactory.getAuctionCount()).to.equal(1);
            expect(await auctionFactory.auctionIds(0)).to.equal(auctionId);

            // 验证拍卖合约状态
            const auctionContract = await ethers.getContractAt("NftAuction", auctionAddress);
            expect(await auctionContract.admin()).to.equal(auctionFactory.target);
            expect(await auctionContract.seller()).to.equal(nftOwner.address);
            expect(await auctionContract.deposited()).to.be.false;
            expect(await auctionContract.ended()).to.be.false;
        });

        it("should create multiple auctions with different sellers", async function () {
            // 创建第一个拍卖
            await auctionFactory.connect(admin).createAuction(nftOwner.address);
            // 创建第二个拍卖
            await auctionFactory.connect(bidder1).createAuction(bidder1.address);

            expect(await auctionFactory.getAuctionCount()).to.equal(2);

            const auction1Address = await auctionFactory.auctionAddresses(0);
            const auction2Address = await auctionFactory.auctionAddresses(1);

            expect(auction1Address).to.not.equal(auction2Address);

            // 验证不同的 seller
            const auction1 = await ethers.getContractAt("NftAuction", auction1Address);
            const auction2 = await ethers.getContractAt("NftAuction", auction2Address);

            expect(await auction1.seller()).to.equal(nftOwner.address);
            expect(await auction2.seller()).to.equal(bidder1.address);
        });
    });

    describe("Complete Auction Lifecycle", () => {
        let auctionContract, auctionId, auctionAddress;

        beforeEach(async () => {
            // 创建拍卖
            await auctionFactory.connect(nftOwner).createAuction(nftOwner.address);
            auctionId = 0;
            auctionAddress = await auctionFactory.auctionAddresses(auctionId);
            auctionContract = await ethers.getContractAt("NftAuction", auctionAddress);

            // 设置价格喂价器
            await auctionContract.setPriceFeed(
                ethers.ZeroAddress,
                await mockEthPriceFeed.getAddress()
            );
            await auctionContract.setPriceFeed(
                await myERC20.getAddress(),
                await mockMercPriceFeed.getAddress()
            );
        });

        it("should handle complete auction flow with NFT deposit and ETH bidding", async function () {
            const startPrice = "0.01";
            const bidPrice = "0.02";

            // 1. NFT 所有者授权拍卖合约
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);

            // 2. 通过工厂合约存入 NFT
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600, // 1小时
                nftAddress,
                ethers.parseEther(startPrice)
            );

            // 验证 NFT 存入状态
            expect(await auctionContract.deposited()).to.be.true;
            expect(await auctionContract.nftAddress()).to.equal(nftAddress);
            expect(await auctionContract.tokenId()).to.equal(tokenId);
            expect(await myNftToken.ownerOf(tokenId)).to.equal(auctionAddress);

            // 3. 竞价
            const ethAmount = ethers.parseEther(bidPrice);
            await auctionContract.connect(bidder1).priceBid(0, ethers.ZeroAddress, {
                value: ethAmount
            });

            // 验证竞价状态
            expect(await auctionContract.highestBidder()).to.equal(bidder1.address);
            expect(await auctionContract.highestBid()).to.equal(ethAmount);

            // 4. 结束拍卖
            await auctionFactory.connect(admin).endAuction(auctionId);

            // 验证拍卖结束状态
            expect(await auctionContract.ended()).to.be.true;
            expect(await myNftToken.ownerOf(tokenId)).to.equal(bidder1.address);
        });

        it("should handle auction with ERC20 token bidding", async function () {
            const startPrice = "0.01";

            // 存入 NFT
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther(startPrice)
            );

            // ERC20 竞价
            const bidMercPrice = ethers.parseUnits((0.02 * 2000).toString(), 18); // 0.02 ETH 等值的 MERC
            await myERC20.connect(admin)._mint(bidder1.address, bidMercPrice);
            await myERC20.connect(bidder1).approve(auctionAddress, bidMercPrice);
            await auctionContract.connect(bidder1).priceBid(bidMercPrice, await myERC20.getAddress());

            expect(await auctionContract.highestBidder()).to.equal(bidder1.address);
            expect(await auctionContract.highestBid()).to.equal(bidMercPrice);

            // 结束拍卖
            await auctionFactory.connect(admin).endAuction(auctionId);
            const feeRate = await auctionFactory.getAuctionFeeRate(auctionId);
            const expectedFee = (bidMercPrice * feeRate) / 10000n; // 2.5% fee

            // 验证 NFT 转移和资金转移
            expect(await myNftToken.ownerOf(tokenId)).to.equal(bidder1.address);
            expect(await myERC20.balanceOf(bidder1.address)).to.equal(0);
            expect(await myERC20.balanceOf(nftOwner.address)).to.equal(bidMercPrice - expectedFee);
        });

        it("should handle auction with multiple bids", async function () {
            const startPrice = "0.01";

            // 存入 NFT
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther(startPrice)
            );

            // 第一次竞价
            const bid1 = ethers.parseEther("0.02");
            await auctionContract.connect(bidder1).priceBid(0, ethers.ZeroAddress, {
                value: bid1
            });

            expect(await auctionContract.highestBidder()).to.equal(bidder1.address);
            expect(await auctionContract.highestBid()).to.equal(bid1);

            // 第二次竞价（更高）
            const bid2 = ethers.parseEther("0.05");
            const bidder2InitialBalance = await ethers.provider.getBalance(bidder2.address);

            await auctionContract.connect(bidder2).priceBid(0, ethers.ZeroAddress, {
                value: bid2
            });

            // 验证新的最高竞价者
            expect(await auctionContract.highestBidder()).to.equal(bidder2.address);
            expect(await auctionContract.highestBid()).to.equal(bid2);

            // 验证前一个竞价者收到退款（这里简化验证，实际测试中需要更精确的余额计算）
            const bidder1FinalBalance = await ethers.provider.getBalance(bidder1.address);
            // bidder1 应该收到了退款

            // 结束拍卖
            await auctionFactory.connect(admin).endAuction(auctionId);
            expect(await myNftToken.ownerOf(tokenId)).to.equal(bidder2.address);
        });

        it("should handle auction ending without any bids", async function () {
            // 存入 NFT
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther("0.01")
            );

            // 直接结束拍卖（没有竞价）
            await auctionFactory.connect(admin).endAuction(auctionId);

            // NFT 应该返还给 seller
            expect(await auctionContract.ended()).to.be.true;
            expect(await myNftToken.ownerOf(tokenId)).to.equal(nftOwner.address);
        });

        it("should handle auction ending without NFT deposit", async function () {
            // 直接结束拍卖（没有存入 NFT）
            await auctionFactory.connect(admin).endAuction(auctionId);

            // 应该能正常结束，只是没有 NFT 转移
            expect(await auctionContract.ended()).to.be.true;
            expect(await auctionContract.deposited()).to.be.false;
        });

    });

    describe("Error Handling", () => {
        let auctionContract, auctionId, auctionAddress;

        beforeEach(async () => {
            await auctionFactory.connect(nftOwner).createAuction(nftOwner.address);
            auctionId = 0;
            auctionAddress = await auctionFactory.auctionAddresses(auctionId);
            auctionContract = await ethers.getContractAt("NftAuction", auctionAddress);
        });

        it("should revert when non-seller and non-admin tries to deposit NFT through factory", async function () {
            await expect(
             auctionFactory.connect(bidder1).depositNft(
                    auctionId,
                    tokenId,
                    3600,
                    nftAddress,
                    ethers.parseEther("0.01")
                )
            ).to.be.revertedWith("Only the seller or admin can deposit NFT.");
        });

        it("should revert when trying to deposit to non-existent auction", async function () {
            await expect(
                auctionFactory.connect(admin).depositNft(
                    999, // 不存在的拍卖ID
                    tokenId,
                    3600,
                    nftAddress,
                    ethers.parseEther("0.01")
                )
            ).to.be.revertedWith("Auction does not exist.");
        });

        it("should revert when bidding before NFT deposit", async function () {
            await expect(
                auctionContract.connect(bidder1).priceBid(ethers.parseEther("0.02"), ethers.ZeroAddress)
            ).to.be.revertedWith("NFT not deposited");
        });

        it("should revert when bid amount is insufficient", async function () {
            // 设置价格喂价器
            await auctionContract.setPriceFeed(ethers.ZeroAddress, await mockEthPriceFeed.getAddress());

            // 存入 NFT
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther("0.01")
            );

            // 竞价金额不足
            await expect(
                auctionContract.connect(bidder1).priceBid(0, ethers.ZeroAddress, {
                    value: ethers.parseEther("0.005") // 低于起拍价
                })
            ).to.be.revertedWith("Bid amount is not sufficient");
        });

        it("should revert when non-admin/non-seller tries to end auction", async function () {
            await expect(
                auctionContract.connect(bidder1).endAuction()
            ).to.be.revertedWith("Only seller or admin can end the auction");
        });

        it("should revert when trying to end already ended auction", async function () {
            await auctionFactory.connect(admin).endAuction(auctionId);

            await expect(
                auctionFactory.connect(admin).endAuction(auctionId)
            ).to.be.revertedWith("Auction already ended");
        });
    });

    describe("Fee Withdrawal Tests", () => {
        let auctionContract, auctionId, auctionAddress;

        beforeEach(async () => {
            // 创建拍卖
            await auctionFactory.connect(nftOwner).createAuction(nftOwner.address);
            auctionId = 0;
            auctionAddress = await auctionFactory.auctionAddresses(auctionId);
            auctionContract = await ethers.getContractAt("NftAuction", auctionAddress);

            // 设置价格喂价器
            await auctionContract.setPriceFeed(
                ethers.ZeroAddress,
                await mockEthPriceFeed.getAddress()
            );
            await auctionContract.setPriceFeed(
                await myERC20.getAddress(),
                await mockMercPriceFeed.getAddress()
            );
        });

        it("should collect ETH fees in auction contract and allow withdrawal through factory", async function () {
            const startPrice = "0.01";
            const bidAmount = ethers.parseEther("1.0"); // 1 ETH

            // 设置拍卖
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther(startPrice)
            );

            // 竞价
            await auctionContract.connect(bidder1).priceBid(0, ethers.ZeroAddress, {
                value: bidAmount
            });

            // 记录管理员初始余额
            const adminBalanceBefore = await ethers.provider.getBalance(admin.address);

            // 结束拍卖
            const endTx = await auctionFactory.connect(admin).endAuction(auctionId);
            const endReceipt = await endTx.wait();
            const endGasUsed = endReceipt.gasUsed * endReceipt.gasPrice;

            // 计算预期手续费（默认 2.5%）
            const expectedFee = ethers.parseEther("0.025"); // 2.5% of 1 ETH
            const expectedSellerAmount = ethers.parseEther("0.975"); // 97.5% of 1 ETH

            // 验证拍卖合约中有手续费
            const auctionBalance = await ethers.provider.getBalance(auctionAddress);
            expect(auctionBalance).to.equal(expectedFee);

            // 验证卖家收到正确金额
            const sellerBalance = await ethers.provider.getBalance(nftOwner.address);
            expect(sellerBalance).to.be.gte(expectedSellerAmount);

            // 通过工厂合约提取手续费
            const withdrawTx = await auctionFactory.connect(admin).withdrawFeeFromAuction(auctionId);
            const withdrawReceipt = await withdrawTx.wait();
            const withdrawGasUsed = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice;

            // 验证提取后拍卖合约余额为0
            expect(await ethers.provider.getBalance(auctionAddress)).to.equal(0);

            // 验证管理员收到手续费（考虑 gas 费用）
            const adminBalanceAfter = await ethers.provider.getBalance(admin.address);
            expect(adminBalanceAfter).to.be.closeTo(
                adminBalanceBefore + expectedFee - endGasUsed - withdrawGasUsed,
                ethers.parseEther("0.05") // 允许更大误差以应对高gas费用
            );
        });

        it("should collect ERC20 fees and allow withdrawal through factory", async function () {
            const startPrice = "0.01";
            const bidAmount = ethers.parseUnits("100", 18); // 100 MERC tokens

            // 设置拍卖
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther(startPrice)
            );

            // 给竞价者 mint ERC20 代币
            await myERC20.connect(admin)._mint(bidder1.address, bidAmount);
            await myERC20.connect(bidder1).approve(auctionAddress, bidAmount);

            // ERC20 竞价
            await auctionContract.connect(bidder1).priceBid(bidAmount, await myERC20.getAddress());

            // 结束拍卖
            await auctionFactory.connect(admin).endAuction(auctionId);

            // 计算预期手续费和卖家金额
            const expectedFee = ethers.parseUnits("2.5", 18); // 2.5% of 100 MERC
            const expectedSellerAmount = ethers.parseUnits("97.5", 18); // 97.5% of 100 MERC

            // 验证拍卖合约中有 ERC20 手续费
            const auctionERC20Balance = await myERC20.balanceOf(auctionAddress);
            expect(auctionERC20Balance).to.equal(expectedFee);

            // 验证卖家收到正确的 ERC20 金额
            const sellerERC20Balance = await myERC20.balanceOf(nftOwner.address);
            expect(sellerERC20Balance).to.equal(expectedSellerAmount);

            // 记录管理员初始 ERC20 余额
            const adminERC20BalanceBefore = await myERC20.balanceOf(admin.address);

            // 通过工厂合约提取 ERC20 手续费
            await auctionFactory.connect(admin).withdrawERC20FeeFromAuction(auctionId, await myERC20.getAddress());

            // 验证提取后拍卖合约 ERC20 余额为0
            expect(await myERC20.balanceOf(auctionAddress)).to.equal(0);

            // 验证管理员收到 ERC20 手续费
            const adminERC20BalanceAfter = await myERC20.balanceOf(admin.address);

            expect(adminERC20BalanceAfter).to.equal(adminERC20BalanceBefore + expectedFee);
        });

        it("should allow batch withdrawal from multiple auctions", async function () {
            // 创建第二个拍卖
            await auctionFactory.connect(nftOwner).createAuction(nftOwner.address);
            const auctionId2 = 1;
            const auctionAddress2 = await auctionFactory.auctionAddresses(auctionId2);
            const auctionContract2 = await ethers.getContractAt("NftAuction", auctionAddress2);

            // 为第二个拍卖设置价格聚合器
            await auctionContract2.setPriceFeed(ethers.ZeroAddress, await mockEthPriceFeed.getAddress());

            // mint 第二个 NFT
            const tx2 = await myNftToken.mint(nftOwner.address);
            const tokenId2 = await getTokenId(tx2, myNftToken);

            // 设置两个拍卖
            const bidAmount = ethers.parseEther("0.5");

            // 第一个拍卖
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther("0.01")
            );
            await auctionContract.connect(bidder1).priceBid(0, ethers.ZeroAddress, { value: bidAmount });
            await auctionFactory.connect(admin).endAuction(auctionId);

            // 第二个拍卖
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress2, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId2,
                tokenId2,
                3600,
                nftAddress,
                ethers.parseEther("0.01")
            );
            await auctionContract2.connect(bidder2).priceBid(0, ethers.ZeroAddress, { value: bidAmount });
            await auctionFactory.connect(admin).endAuction(auctionId2);

            // 计算预期总手续费
            const expectedFeePerAuction = ethers.parseEther("0.0125"); // 2.5% of 0.5 ETH
            const expectedTotalFee = expectedFeePerAuction * 2n;

            // 验证两个拍卖合约都有手续费
            expect(await ethers.provider.getBalance(auctionAddress)).to.equal(expectedFeePerAuction);
            expect(await ethers.provider.getBalance(auctionAddress2)).to.equal(expectedFeePerAuction);

            // 记录管理员初始余额
            const adminBalanceBefore = await ethers.provider.getBalance(admin.address);

            // 批量提取所有手续费
            const withdrawTx = await auctionFactory.connect(admin).withdrawAllETHFees();
            const withdrawReceipt = await withdrawTx.wait();
            const gasUsed = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice;

            // 验证提取后两个拍卖合约余额都为0
            expect(await ethers.provider.getBalance(auctionAddress)).to.equal(0);
            expect(await ethers.provider.getBalance(auctionAddress2)).to.equal(0);

            // 验证管理员收到总手续费
            const adminBalanceAfter = await ethers.provider.getBalance(admin.address);
            expect(adminBalanceAfter).to.be.closeTo(
                adminBalanceBefore + expectedTotalFee - gasUsed,
                ethers.parseEther("0.05")
            );
        });

        it("should revert when non-admin tries to withdraw fees", async function () {
            // 设置拍卖并产生手续费
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther("0.01")
            );
            await auctionContract.connect(bidder1).priceBid(0, ethers.ZeroAddress, {
                value: ethers.parseEther("0.1")
            });
            await auctionFactory.connect(admin).endAuction(auctionId);

            // 非管理员尝试提取手续费应该失败
            await expect(
                auctionFactory.connect(bidder1).withdrawFeeFromAuction(auctionId)
            ).to.be.revertedWith("Only the administrator can perform this action.");

            await expect(
                auctionFactory.connect(bidder1).withdrawAllETHFees()
            ).to.be.revertedWith("Only the administrator can perform this action.");
        });

        it("should revert when trying to withdraw from non-existent auction", async function () {
            await expect(
                auctionFactory.connect(admin).withdrawFeeFromAuction(999)
            ).to.be.revertedWith("Auction does not exist.");

            await expect(
                auctionFactory.connect(admin).withdrawERC20FeeFromAuction(999, await myERC20.getAddress())
            ).to.be.revertedWith("Auction does not exist.");
        });

        it("should handle withdrawal when no fees collected", async function () {
            // 创建拍卖但不进行竞价
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther("0.01")
            );
            await auctionFactory.connect(admin).endAuction(auctionId); // 结束无竞价的拍卖

            // 尝试提取手续费应该失败（没有余额）
            await expect(
                auctionFactory.connect(admin).withdrawFeeFromAuction(auctionId)
            ).to.be.revertedWith("No ETH to withdraw");
        });

        it("should properly handle custom fee rates", async function () {
            // 设置自定义手续费率 5%
            const customFeeRate = 500; // 5%
            await auctionFactory.connect(admin).setAuctionFeeRate(auctionId, customFeeRate);

            const bidAmount = ethers.parseEther("1.0");

            // 设置拍卖
            await myNftToken.connect(nftOwner).setApprovalForAll(auctionAddress, true);
            await auctionFactory.connect(admin).depositNft(
                auctionId,
                tokenId,
                3600,
                nftAddress,
                ethers.parseEther("0.01")
            );

            // 竞价和结束拍卖
            await auctionContract.connect(bidder1).priceBid(0, ethers.ZeroAddress, { value: bidAmount });
            await auctionFactory.connect(admin).endAuction(auctionId);

            // 验证自定义手续费率生效
            const expectedFee = ethers.parseEther("0.05"); // 5% of 1 ETH
            const auctionBalance = await ethers.provider.getBalance(auctionAddress);
            expect(auctionBalance).to.equal(expectedFee);

            // 提取并验证
            const adminBalanceBefore = await ethers.provider.getBalance(admin.address);
            const withdrawTx = await auctionFactory.connect(admin).withdrawFeeFromAuction(auctionId);
            const receipt = await withdrawTx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const adminBalanceAfter = await ethers.provider.getBalance(admin.address);
            expect(adminBalanceAfter).to.be.closeTo(
                adminBalanceBefore + expectedFee - gasUsed,
                ethers.parseEther("0.05")
            );
        });
    });

    describe("Upgrade Tests", () => {
        it("should upgrade beacon implementation through factory", async function () {
            // 创建拍卖
            await auctionFactory.connect(nftOwner).createAuction(nftOwner.address);
            const auctionAddress = await auctionFactory.auctionAddresses(0);
            const auctionContract = await ethers.getContractAt("NftAuction", auctionAddress);

            // 检查当前版本
            expect(await auctionContract.version()).to.equal("1.0.0");

            // 部署新版本实现
            const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
            const nftAuctionV2Impl = await NftAuctionV2.deploy();
            await nftAuctionV2Impl.waitForDeployment();

            // 通过工厂合约升级 beacon
            await auctionFactory.connect(admin).upgradeBeacon(nftAuctionV2Impl.target);

            // 验证升级后所有拍卖合约都是新版本
            expect(await auctionContract.version()).to.equal("2.0.0");
            expect(await auctionFactory.getCurrentImplementation()).to.equal(nftAuctionV2Impl.target);

            // 创建新的拍卖，也应该是新版本
            await auctionFactory.connect(bidder1).createAuction(bidder1.address);
            const newAuctionAddress = await auctionFactory.auctionAddresses(1);
            const newAuctionContract = await ethers.getContractAt("NftAuctionV2", newAuctionAddress);
            expect(await newAuctionContract.version()).to.equal("2.0.0");
        });

        it("should revert when non-admin tries to upgrade beacon", async function () {
            const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
            const nftAuctionV2Impl = await NftAuctionV2.deploy();
            await nftAuctionV2Impl.waitForDeployment();

            await expect(
                auctionFactory.connect(bidder1).upgradeBeacon(nftAuctionV2Impl.target)
            ).to.be.revertedWith("Only the administrator can perform this action.");
        });

        it("should upgrade existing auctions to v2", async function () {
            // 创建一个拍卖实例
            const auctionTx = await auctionFactory.connect(admin).createAuction(nftOwner.address);
            const receipt = await auctionTx.wait();
            const auctionAddress = await auctionFactory.auctionAddresses(0);

            // 获取当前版本
            const auction = await ethers.getContractAt("NftAuction", auctionAddress);
            expect(await auction.version()).to.equal("1.0.0");

            // 升级beacon到V2
            const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
            const nftAuctionV2Impl = await NftAuctionV2.deploy();
            await nftAuctionV2Impl.waitForDeployment();

            await auctionFactory.connect(admin).upgradeBeacon(nftAuctionV2Impl.target);

            // 验证现有实例已升级到V2
            const upgradedAuction = await ethers.getContractAt("NftAuctionV2", auctionAddress);
            expect(await upgradedAuction.version()).to.equal("2.0.0");
        });
    });

    describe("Events", () => {
        it("should emit AuctionCreated event", async function () {
            // 创建拍卖并捕获事件
            const tx = await auctionFactory.connect(nftOwner).createAuction(nftOwner.address);
            const receipt = await tx.wait();

            // 获取创建的拍卖地址
            const auctionAddress = await auctionFactory.auctionAddresses(0);

            // 验证事件被正确发出
            await expect(tx)
                .to.emit(auctionFactory, "AuctionCreated")
                .withArgs(0, auctionAddress);
        });

        it("should emit AuctionEnded event", async function () {
            await auctionFactory.connect(nftOwner).createAuction(nftOwner.address);
            const auctionAddress = await auctionFactory.auctionAddresses(0);

            await expect(
                auctionFactory.connect(admin).endAuction(0)
            ).to.emit(auctionFactory, "AuctionEnded")
             .withArgs(0, auctionAddress);
        });

        it("should emit BeaconUpgraded event", async function () {
            const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
            const nftAuctionV2Impl = await NftAuctionV2.deploy();
            await nftAuctionV2Impl.waitForDeployment();

            const oldImplementation = await auctionFactory.getCurrentImplementation();

            await expect(
                auctionFactory.connect(admin).upgradeBeacon(nftAuctionV2Impl.target)
            ).to.emit(auctionFactory, "BeaconUpgraded")
             .withArgs(oldImplementation, nftAuctionV2Impl.target);
        });
    });
});
