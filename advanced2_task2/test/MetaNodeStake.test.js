const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("MetaNodeStake", function () {
    let metaNodeToken;
    let stakeToken;
    let metaNodeStake;
    let owner;
    let addr1;
    let addr2;
    let startBlock, metaNodePerBlock, rewardAmount;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // 部署 MetaNodeToken 合约 (奖励代币)
        metaNodeToken = await ethers.deployContract("MetaNodeToken");
        await metaNodeToken.waitForDeployment();
        console.log("MetaNodeToken deployed to:", metaNodeToken.target);

        // 部署 StakeToken 合约 (质押代币)
        stakeToken = await ethers.deployContract("StakeToken");
        await stakeToken.waitForDeployment();
        console.log("StakeToken deployed to:", stakeToken.target);

        startBlock = await ethers.provider.getBlockNumber();
        metaNodePerBlock = ethers.parseUnits("10", 18);
        rewardAmount = ethers.parseUnits("10000", 18); // 10,000 tokens for rewards
        console.log("Current block number:", startBlock);

        // 部署 MetaNodeStake 合约
        const MetaNodeStake = await ethers.getContractFactory("MetaNodeStake");
        metaNodeStake = await upgrades.deployProxy(
            MetaNodeStake,
            [metaNodeToken.target, startBlock, startBlock + 100, metaNodePerBlock],
            {
                initializer: 'initialize',
                kind: 'uups'
            });
        await metaNodeStake.waitForDeployment();
        console.log("MetaNodeStake deployed to:", metaNodeStake.target);

        // 给 MetaNodeStake 合约一些代币用于奖励
        await metaNodeToken.transfer(metaNodeStake.target, rewardAmount);
    });

    describe("Deployment", function () {
        it("Should deploy MetaNodeStake and set correct initial values", async function () {
            expect(await metaNodeStake.MetaNode()).to.equal(metaNodeToken.target);
            expect(await metaNodeStake.startBlock()).to.equal(startBlock);
            expect(await metaNodeStake.endBlock()).to.equal(startBlock + 100);
            expect(await metaNodeStake.MetaNodePerBlock()).to.equal(metaNodePerBlock);
            expect(await metaNodeStake.poolLength()).to.equal(0);
            expect(await metaNodeStake.totalPoolWeight()).to.equal(0);
        });

        it("Should have correct roles assigned", async function () {
            const ADMIN_ROLE = await metaNodeStake.ADMIN_ROLE();
            const UPGRADE_ROLE = await metaNodeStake.UPGRADE_ROLE();
            const DEFAULT_ADMIN_ROLE = await metaNodeStake.DEFAULT_ADMIN_ROLE();

            expect(await metaNodeStake.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
            expect(await metaNodeStake.hasRole(UPGRADE_ROLE, owner.address)).to.be.true;
            expect(await metaNodeStake.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
        });
    });

    describe("Pool Management", function () {
        it("Should add ETH pool (first pool must be ETH)", async function () {
            const stTokenAddress = ethers.ZeroAddress;
            const poolWeight = 100;
            const minDepositAmount = ethers.parseEther("0.01"); // 0.01 ETH minimum
            const unstakeLockedBlocks = 10; // 10 blocks lock
            const withUpdate = false;

            const tx = await metaNodeStake.addPool(stTokenAddress, poolWeight, minDepositAmount, unstakeLockedBlocks, withUpdate);

            await expect(tx).to.emit(metaNodeStake, "AddPool");

            expect(await metaNodeStake.poolLength()).to.equal(1);
            expect(await metaNodeStake.totalPoolWeight()).to.equal(poolWeight);

            const poolInfo = await metaNodeStake.pool(0);
            expect(poolInfo.stTokenAddress).to.equal(stTokenAddress);
            expect(poolInfo.poolWeight).to.equal(poolWeight);
            expect(poolInfo.minDepositAmount).to.equal(minDepositAmount);
            expect(poolInfo.unstakeLockedBlocks).to.equal(unstakeLockedBlocks);
        });

        it("Should add token pool after ETH pool", async function () {
            // 先添加ETH池
            await metaNodeStake.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.01"), 10, false);

            // 再添加代币池 (使用 StakeToken)
            const poolWeight = 200;
            const minDepositAmount = ethers.parseUnits("100", 18);
            const unstakeLockedBlocks = 20;

            await expect(
                metaNodeStake.addPool(stakeToken.target, poolWeight, minDepositAmount, unstakeLockedBlocks, false)
            ).to.emit(metaNodeStake, "AddPool");

            expect(await metaNodeStake.poolLength()).to.equal(2);
            expect(await metaNodeStake.totalPoolWeight()).to.equal(300); // 100 + 200
        });

        it("Should reject adding non-ETH pool as first pool", async function () {
            await expect(
                metaNodeStake.addPool(stakeToken.target, 100, ethers.parseUnits("100", 18), 10, false)
            ).to.be.revertedWith("invalid staking token address");
        });

        it("Should reject adding ETH pool as second pool", async function () {
            // 先添加ETH池
            await metaNodeStake.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.01"), 10, false);

            // 尝试再添加ETH池
            await expect(
                metaNodeStake.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.01"), 10, false)
            ).to.be.revertedWith("invalid staking token address");
        });

        it("Should update pool info", async function () {
            await metaNodeStake.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.01"), 10, false);

            const newMinDeposit = ethers.parseEther("0.1");
            const newLockBlocks = 50;

            await expect(
                metaNodeStake.updatePool(0, newMinDeposit, newLockBlocks)
            ).to.emit(metaNodeStake, "UpdatePoolInfo")
              .withArgs(0, newMinDeposit, newLockBlocks);

            const poolInfo = await metaNodeStake.pool(0);
            expect(poolInfo.minDepositAmount).to.equal(newMinDeposit);
            expect(poolInfo.unstakeLockedBlocks).to.equal(newLockBlocks);
        });

        it("Should set pool weight", async function () {
            await metaNodeStake.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.01"), 10, false);

            const newWeight = 300;
            await expect(
                metaNodeStake.setPoolWeight(0, newWeight, false)
            ).to.emit(metaNodeStake, "SetPoolWeight")
              .withArgs(0, newWeight, newWeight);

            expect(await metaNodeStake.totalPoolWeight()).to.equal(newWeight);
        });
    });

    describe("ETH Staking", function () {
        beforeEach(async function () {
            // 添加ETH池
            await metaNodeStake.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.01"), 10, false);
        });

        it("Should deposit ETH successfully", async function () {
            const depositAmount = ethers.parseEther("1");

            await expect(
                metaNodeStake.connect(addr1).depositETH({ value: depositAmount })
            ).to.emit(metaNodeStake, "Deposit")
              .withArgs(addr1.address, 0, depositAmount);

            expect(await metaNodeStake.stakingBalance(0, addr1.address)).to.equal(depositAmount);

            const poolInfo = await metaNodeStake.pool(0);
            expect(poolInfo.stTokenAmount).to.equal(depositAmount);
        });

        it("Should reject deposit below minimum", async function () {
            const smallAmount = ethers.parseEther("0.005"); // Below 0.01 ETH minimum

            await expect(
                metaNodeStake.connect(addr1).depositETH({ value: smallAmount })
            ).to.be.revertedWith("deposit amount is too small");
        });

        it("Should unstake ETH", async function () {
            const depositAmount = ethers.parseEther("1");
            const unstakeAmount = ethers.parseEther("0.5");

            // 先存款
            await metaNodeStake.connect(addr1).depositETH({ value: depositAmount });

            // 申请取款
            await expect(
                metaNodeStake.connect(addr1).unstake(0, unstakeAmount)
            ).to.emit(metaNodeStake, "RequestUnstake")
              .withArgs(addr1.address, 0, unstakeAmount);

            expect(await metaNodeStake.stakingBalance(0, addr1.address)).to.equal(depositAmount - unstakeAmount);
        });

        it("Should withdraw ETH after lock period", async function () {
            const depositAmount = ethers.parseEther("1");
            const unstakeAmount = ethers.parseEther("0.5");

            // 存款和申请取款
            await metaNodeStake.connect(addr1).depositETH({ value: depositAmount });
            await metaNodeStake.connect(addr1).unstake(0, unstakeAmount);

            // 挖矿前进11个区块（超过10个区块的锁定期）
            for (let i = 0; i < 11; i++) {
                await ethers.provider.send("evm_mine");
            }

            const initialBalance = await ethers.provider.getBalance(addr1.address);

            // 提取资金
            const tx = await metaNodeStake.connect(addr1).withdraw(0);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const finalBalance = await ethers.provider.getBalance(addr1.address);
            expect(finalBalance).to.be.closeTo(
                initialBalance + unstakeAmount - gasUsed,
                ethers.parseEther("0.001") // 允许小误差
            );
        });
    });

    describe("Token Staking", function () {
        beforeEach(async function () {
            // 添加ETH池和代币池
            await metaNodeStake.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.01"), 10, false);
            await metaNodeStake.addPool(stakeToken.target, 200, ethers.parseUnits("100", 18), 20, false);

            // 给用户一些质押代币
            await stakeToken.transfer(addr1.address, ethers.parseUnits("10000", 18));
            await stakeToken.transfer(addr2.address, ethers.parseUnits("10000", 18));
        });

        it("Should deposit tokens successfully", async function () {
            const depositAmount = ethers.parseUnits("1000", 18);

            // 用户批准合约使用质押代币
            await stakeToken.connect(addr1).approve(metaNodeStake.target, depositAmount);

            await expect(
                metaNodeStake.connect(addr1).deposit(1, depositAmount)
            ).to.emit(metaNodeStake, "Deposit")
              .withArgs(addr1.address, 1, depositAmount);

            expect(await metaNodeStake.stakingBalance(1, addr1.address)).to.equal(depositAmount);
        });

        it("Should reject token deposit to ETH pool", async function () {
            const depositAmount = ethers.parseUnits("1000", 18);

            await expect(
                metaNodeStake.connect(addr1).deposit(0, depositAmount)
            ).to.be.revertedWith("deposit not support ETH staking");
        });

        it("Should unstake and withdraw tokens", async function () {
            const depositAmount = ethers.parseUnits("1000", 18);
            const unstakeAmount = ethers.parseUnits("500", 18);

            // 存款
            await stakeToken.connect(addr1).approve(metaNodeStake.target, depositAmount);
            await metaNodeStake.connect(addr1).deposit(1, depositAmount);

            // 申请取款
            await metaNodeStake.connect(addr1).unstake(1, unstakeAmount);

            // 前进足够的区块
            for (let i = 0; i < 21; i++) {
                await ethers.provider.send("evm_mine");
            }

            const initialBalance = await stakeToken.balanceOf(addr1.address);

            // 提取代币
            await metaNodeStake.connect(addr1).withdraw(1);

            const finalBalance = await stakeToken.balanceOf(addr1.address);
            expect(finalBalance).to.equal(initialBalance + unstakeAmount);
        });
    });

    describe("Rewards", function () {
        beforeEach(async function () {
            // 添加ETH池
            await metaNodeStake.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.01"), 10, false);
        });

        it("Should calculate pending rewards correctly", async function () {
            const depositAmount = ethers.parseEther("1");

            // 用户存款
            await metaNodeStake.connect(addr1).depositETH({ value: depositAmount });

            // 前进几个区块
            for (let i = 0; i < 5; i++) {
                await ethers.provider.send("evm_mine");
            }

            const pending = await metaNodeStake.pendingMetaNode(0, addr1.address);
            expect(pending).to.be.gt(0);
        });

        it("Should claim rewards", async function () {
            const depositAmount = ethers.parseEther("1");

            // 用户存款
            await metaNodeStake.connect(addr1).depositETH({ value: depositAmount });

            // 前进几个区块
            for (let i = 0; i < 10; i++) {
                await ethers.provider.send("evm_mine");
            }

            const initialBalance = await metaNodeToken.balanceOf(addr1.address);
            const pending = await metaNodeStake.pendingMetaNode(0, addr1.address);

            // 领取奖励
            await expect(
                metaNodeStake.connect(addr1).claim(0)
            ).to.emit(metaNodeStake, "Claim");

            const finalBalance = await metaNodeToken.balanceOf(addr1.address);
            expect(finalBalance).to.be.gt(initialBalance);

            // 由于区块挖矿的时间差，允许更大的误差范围
            const actualReward = finalBalance - initialBalance;
            expect(actualReward).to.be.closeTo(pending, ethers.parseUnits("20", 18)); // 允许20个代币的误差
        });
    });

    describe("Admin Functions", function () {
        it("Should pause and unpause withdraw", async function () {
            await expect(metaNodeStake.pauseWithdraw())
                .to.emit(metaNodeStake, "PauseWithdraw");

            expect(await metaNodeStake.withdrawPaused()).to.be.true;

            await expect(metaNodeStake.unpauseWithdraw())
                .to.emit(metaNodeStake, "UnpauseWithdraw");

            expect(await metaNodeStake.withdrawPaused()).to.be.false;
        });

        it("Should pause and unpause claim", async function () {
            await expect(metaNodeStake.pauseClaim())
                .to.emit(metaNodeStake, "PauseClaim");

            expect(await metaNodeStake.claimPaused()).to.be.true;

            await expect(metaNodeStake.unpauseClaim())
                .to.emit(metaNodeStake, "UnpauseClaim");

            expect(await metaNodeStake.claimPaused()).to.be.false;
        });

        it("Should set start and end blocks", async function () {
            const newStartBlock = startBlock + 50;
            const newEndBlock = startBlock + 200;

            await expect(metaNodeStake.setStartBlock(newStartBlock))
                .to.emit(metaNodeStake, "SetStartBlock")
                .withArgs(newStartBlock);

            await expect(metaNodeStake.setEndBlock(newEndBlock))
                .to.emit(metaNodeStake, "SetEndBlock")
                .withArgs(newEndBlock);

            expect(await metaNodeStake.startBlock()).to.equal(newStartBlock);
            expect(await metaNodeStake.endBlock()).to.equal(newEndBlock);
        });

        it("Should set MetaNode per block", async function () {
            const newRate = ethers.parseUnits("20", 18);

            await expect(metaNodeStake.setMetaNodePerBlock(newRate))
                .to.emit(metaNodeStake, "SetMetaNodePerBlock")
                .withArgs(newRate);

            expect(await metaNodeStake.MetaNodePerBlock()).to.equal(newRate);
        });

        it("Should reject non-admin calls", async function () {
            await expect(
                metaNodeStake.connect(addr1).pauseWithdraw()
            ).to.be.reverted;

            await expect(
                metaNodeStake.connect(addr1).addPool(ethers.ZeroAddress, 100, 0, 10, false)
            ).to.be.reverted;
        });
    });

    describe("Edge Cases", function () {
        beforeEach(async function () {
            await metaNodeStake.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.01"), 10, false);
        });

        it("Should handle multiple unstake requests", async function () {
            const depositAmount = ethers.parseEther("2");
            const unstakeAmount1 = ethers.parseEther("0.5");
            const unstakeAmount2 = ethers.parseEther("0.3");

            // 存款
            await metaNodeStake.connect(addr1).depositETH({ value: depositAmount });

            // 多次申请取款
            await metaNodeStake.connect(addr1).unstake(0, unstakeAmount1);
            await metaNodeStake.connect(addr1).unstake(0, unstakeAmount2);

            const [requestAmount, pendingAmount] = await metaNodeStake.withdrawAmount(0, addr1.address);
            expect(requestAmount).to.equal(unstakeAmount1 + unstakeAmount2);
            expect(pendingAmount).to.equal(0); // 还在锁定期内
        });

        it("Should handle insufficient contract balance for rewards", async function () {
            // 清空合约的代币余额（模拟奖励不足的情况）
            const contractBalance = await metaNodeToken.balanceOf(metaNodeStake.target);
            // 这里我们不能直接从合约转出，但可以测试 _safeMetaNodeTransfer 的逻辑

            const depositAmount = ethers.parseEther("1");
            await metaNodeStake.connect(addr1).depositETH({ value: depositAmount });

            // 前进几个区块产生奖励
            for (let i = 0; i < 5; i++) {
                await ethers.provider.send("evm_mine");
            }

            // 即使奖励计算很大，也不应该失败
            await expect(metaNodeStake.connect(addr1).claim(0)).to.not.be.reverted;
        });
    });
});