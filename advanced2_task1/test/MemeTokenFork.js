const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MemeToken on Sepolia Fork", function () {
    let memeToken;
    let owner;
    let addr1;
    let addr2;

    // Uniswap V2 Router address on Sepolia (official deployment)
    const UNISWAP_ROUTER_SEPOLIA = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy MemeToken with real Uniswap V2 Router on Sepolia
        const MemeToken = await ethers.getContractFactory("MemeToken");
        memeToken = await MemeToken.deploy(UNISWAP_ROUTER_SEPOLIA);

        console.log("MemeToken deployed to:", await memeToken.getAddress());
        console.log("Using Uniswap Router:", UNISWAP_ROUTER_SEPOLIA);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await memeToken.owner()).to.equal(owner.address);
        });

        it("Should mint initial supply to owner", async function () {
            const totalSupply = await memeToken.totalSupply();
            const ownerBalance = await memeToken.balanceOf(owner.address);
            expect(ownerBalance).to.equal(totalSupply);
            expect(totalSupply).to.equal(ethers.parseUnits("1000000000", 18));
        });

        it("Should exclude owner, contract, and pair from tax", async function () {
            expect(await memeToken.isExcludedFromTax(owner.address)).to.be.true;
            expect(await memeToken.isExcludedFromTax(await memeToken.getAddress())).to.be.true;

            const pairAddress = await memeToken.uniswapPair();
            expect(await memeToken.isExcludedFromTax(pairAddress)).to.be.true;
        });

        it("Should have correct router and pair addresses", async function () {
            const routerAddress = await memeToken.uniswapRouter();
            expect(routerAddress).to.equal(UNISWAP_ROUTER_SEPOLIA);

            const pairAddress = await memeToken.uniswapPair();
            expect(pairAddress).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Tax Exclusion Management", function () {
        it("Should allow owner to exclude/include addresses from tax", async function () {
            // Initially addr1 is not excluded
            expect(await memeToken.isExcludedFromTax(addr1.address)).to.be.false;

            // Owner excludes addr1
            await memeToken.setExcludedFromTax(addr1.address, true);
            expect(await memeToken.isExcludedFromTax(addr1.address)).to.be.true;

            // Owner includes addr1 back in tax
            await memeToken.setExcludedFromTax(addr1.address, false);
            expect(await memeToken.isExcludedFromTax(addr1.address)).to.be.false;
        });

        it("Should not allow non-owner to modify tax exclusion", async function () {
            await expect(
                memeToken.connect(addr1).setExcludedFromTax(addr2.address, true)
            ).to.be.revertedWithCustomError(memeToken, "OwnableUnauthorizedAccount");
        });
    });

    describe("Transfers without liquidity", function () {
        it("Should transfer without tax when liquidity not added", async function () {
            const transferAmount = ethers.parseUnits("1000", 18);

            await memeToken.transfer(addr1.address, transferAmount);

            expect(await memeToken.balanceOf(addr1.address)).to.equal(transferAmount);
            expect(await memeToken.balanceOf(await memeToken.getAddress())).to.equal(0);
        });

        it("Should allow transferFrom without tax when liquidity not added", async function () {
            const transferAmount = ethers.parseUnits("1000", 18);

            // Approve addr1 to spend owner's tokens
            await memeToken.approve(addr1.address, transferAmount);

            // addr1 transfers from owner to addr2
            await memeToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);

            expect(await memeToken.balanceOf(addr2.address)).to.equal(transferAmount);
            expect(await memeToken.balanceOf(await memeToken.getAddress())).to.equal(0);
        });
    });

    describe("Liquidity Management", function () {
        it("Should add initial liquidity correctly", async function () {
            const tokenAmount = ethers.parseUnits("10000", 18);
            const ethAmount = ethers.parseEther("1");

            await expect(
                memeToken.addInitialLiquidity(tokenAmount, ethAmount, { value: ethAmount })
            ).to.emit(memeToken, "LiquidityAdded");

            expect(await memeToken.liquidityAdded()).to.be.true;
        });

        it("Should not allow adding liquidity twice", async function () {
            const tokenAmount = ethers.parseUnits("10000", 18);
            const ethAmount = ethers.parseEther("1");

            // Add liquidity first time
            await memeToken.addInitialLiquidity(tokenAmount, ethAmount, { value: ethAmount });

            // Try to add liquidity second time
            await expect(
                memeToken.addInitialLiquidity(tokenAmount, ethAmount, { value: ethAmount })
            ).to.be.revertedWith("Liquidity already added");
        });

        it("Should require ETH amount to match msg.value", async function () {
            const tokenAmount = ethers.parseUnits("10000", 18);
            const ethAmount = ethers.parseEther("1");
            const wrongEthAmount = ethers.parseEther("0.5");

            await expect(
                memeToken.addInitialLiquidity(tokenAmount, ethAmount, { value: wrongEthAmount })
            ).to.be.revertedWith("ETH amount mismatch");
        });

        it("Should not allow non-owner to add liquidity", async function () {
            const tokenAmount = ethers.parseUnits("10000", 18);
            const ethAmount = ethers.parseEther("1");

            await expect(
                memeToken.connect(addr1).addInitialLiquidity(tokenAmount, ethAmount, { value: ethAmount })
            ).to.be.revertedWithCustomError(memeToken, "OwnableUnauthorizedAccount");
        });
    });

    describe("Manual Tax Processing", function () {
        beforeEach(async function () {
            // First add liquidity to enable tax processing
            const tokenAmount = ethers.parseUnits("10000", 18);
            const ethAmount = ethers.parseEther("1");
            await memeToken.addInitialLiquidity(tokenAmount, ethAmount, { value: ethAmount });

            // Add some tokens to contract for testing
            const transferAmount = ethers.parseUnits("10000", 18);
            await memeToken.transfer(await memeToken.getAddress(), transferAmount);
        });

        it("Should allow owner to process tax manually", async function () {
            await expect(memeToken.processTaxManual()).to.emit(memeToken, "TaxProcessed");
        });

        it("Should not allow non-owner to process tax manually", async function () {
            await expect(
                memeToken.connect(addr1).processTaxManual()
            ).to.be.revertedWithCustomError(memeToken, "OwnableUnauthorizedAccount");
        });

        it("Should revert if no taxes to process", async function () {
            // First process existing taxes
            await memeToken.processTaxManual();

            // Try to process again with no taxes
            await expect(memeToken.processTaxManual()).to.be.revertedWith("No taxes to process");
        });
    });

    describe("ETH Withdrawal", function () {
        beforeEach(async function () {
            // Send some ETH to contract
            await owner.sendTransaction({
                to: await memeToken.getAddress(),
                value: ethers.parseEther("1")
            });
        });

        it("Should allow owner to withdraw stuck ETH", async function () {
            const initialBalance = await ethers.provider.getBalance(owner.address);
            const contractBalance = await ethers.provider.getBalance(await memeToken.getAddress());

            await memeToken.withdrawStuckETH();

            const finalBalance = await ethers.provider.getBalance(owner.address);
            const finalContractBalance = await ethers.provider.getBalance(await memeToken.getAddress());

            expect(finalContractBalance).to.equal(0);
            // Owner balance should increase (minus gas costs)
            expect(finalBalance).to.be.gt(initialBalance - ethers.parseEther("0.01"));
        });

        it("Should not allow non-owner to withdraw ETH", async function () {
            await expect(
                memeToken.connect(addr1).withdrawStuckETH()
            ).to.be.revertedWithCustomError(memeToken, "OwnableUnauthorizedAccount");
        });

        it("Should revert if no ETH to withdraw", async function () {
            // First withdraw all ETH
            await memeToken.withdrawStuckETH();

            // Try to withdraw again
            await expect(memeToken.withdrawStuckETH()).to.be.revertedWith("No ETH to withdraw");
        });
    });

    describe("Contract Info", function () {
        it("Should return correct contract info", async function () {
            // Transfer some tokens to contract
            const transferAmount = ethers.parseUnits("5000", 18);
            await memeToken.transfer(await memeToken.getAddress(), transferAmount);

            // Send some ETH to contract
            await owner.sendTransaction({
                to: await memeToken.getAddress(),
                value: ethers.parseEther("0.5")
            });

            const [tokenBalance, ethBalance, isLiquidityAdded] = await memeToken.getContractInfo();

            expect(tokenBalance).to.equal(transferAmount);
            expect(ethBalance).to.equal(ethers.parseEther("0.5"));
            expect(isLiquidityAdded).to.be.false;
        });
    });

    describe("Receive Function", function () {
        it("Should accept ETH via receive function", async function () {
            const ethAmount = ethers.parseEther("1");

            await expect(
                owner.sendTransaction({
                    to: await memeToken.getAddress(),
                    value: ethAmount
                })
            ).to.not.be.reverted;

            expect(await ethers.provider.getBalance(await memeToken.getAddress())).to.equal(ethAmount);
        });
    });

    describe("Constants and View Functions", function () {
        it("Should have correct tax percent", async function () {
            expect(await memeToken.TAX_PERCENT()).to.equal(2);
        });

        it("Should have correct slippage percent", async function () {
            expect(await memeToken.slippagePercent()).to.equal(5);
        });

        it("Should have correct router interface", async function () {
            const router = await memeToken.uniswapRouter();
            expect(router).to.equal(UNISWAP_ROUTER_SEPOLIA);
        });
    });

    describe("Real Uniswap Integration", function () {
        it("Should create a real pair with WETH", async function () {
            const pairAddress = await memeToken.uniswapPair();
            expect(pairAddress).to.not.equal(ethers.ZeroAddress);

            console.log("Pair address:", pairAddress);
            console.log("Token address:", await memeToken.getAddress());
        });
    });

    describe("Public Liquidity Management", function () {
        beforeEach(async function () {
            // First add initial liquidity by owner
            const initialTokenAmount = ethers.parseUnits("10000", 18);
            const initialEthAmount = ethers.parseEther("1");
            await memeToken.addInitialLiquidity(initialTokenAmount, initialEthAmount, { value: initialEthAmount });
        });

        describe("Public Add Liquidity", function () {
            it("Should allow users to add liquidity after initial liquidity is added", async function () {
                const tokenAmount = ethers.parseUnits("1000", 18);
                const ethAmount = ethers.parseEther("0.1");

                // Transfer tokens to addr1 for testing
                await memeToken.transfer(addr1.address, tokenAmount);

                // Get LP pair contract
                const pairAddress = await memeToken.uniswapPair();
                const pairContract = await ethers.getContractAt("IERC20", pairAddress);

                // Check initial LP balance
                const initialLpBalance = await pairContract.balanceOf(addr1.address);

                // Add liquidity as addr1
                await expect(
                    memeToken.connect(addr1).addLiquidity(tokenAmount, { value: ethAmount })
                ).to.emit(memeToken, "LiquidityAdded");

                // Check LP balance increased
                const finalLpBalance = await pairContract.balanceOf(addr1.address);
                expect(finalLpBalance).to.be.gt(initialLpBalance);
            });

            it("Should not allow adding liquidity before initial liquidity", async function () {
                // Deploy a new token without initial liquidity
                const MemeToken = await ethers.getContractFactory("MemeToken");
                const newToken = await MemeToken.deploy(UNISWAP_ROUTER_SEPOLIA);

                const tokenAmount = ethers.parseUnits("1000", 18);
                const ethAmount = ethers.parseEther("0.1");

                await expect(
                    newToken.addLiquidity(tokenAmount, { value: ethAmount })
                ).to.be.revertedWith("Initial liquidity not added yet");
            });

            it("Should require valid amounts", async function () {
                await expect(
                    memeToken.connect(addr1).addLiquidity(0, { value: ethers.parseEther("0.1") })
                ).to.be.revertedWith("Amounts must be greater than 0");

                await expect(
                    memeToken.connect(addr1).addLiquidity(ethers.parseUnits("1000", 18), { value: 0 })
                ).to.be.revertedWith("Amounts must be greater than 0");
            });

            it("Should require sufficient token balance", async function () {
                const tokenAmount = ethers.parseUnits("1000", 18);
                const ethAmount = ethers.parseEther("0.1");

                // addr1 doesn't have enough tokens
                await expect(
                    memeToken.connect(addr1).addLiquidity(tokenAmount, { value: ethAmount })
                ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });

            it("Should apply slippage protection for large amounts", async function () {
                const largeTokenAmount = ethers.parseUnits("15000", 18); // Above threshold
                const ethAmount = ethers.parseEther("1.5");

                // Transfer large amount to addr1
                await memeToken.transfer(addr1.address, largeTokenAmount);

                // This should work even with slippage protection
                await expect(
                    memeToken.connect(addr1).addLiquidity(largeTokenAmount, { value: ethAmount })
                ).to.not.be.reverted;
            });
        });

        describe("Remove Liquidity", function () {
            let lpTokens;

            beforeEach(async function () {
                // Add liquidity first to get LP tokens
                const tokenAmount = ethers.parseUnits("1000", 18);
                const ethAmount = ethers.parseEther("0.1");

                // Transfer tokens to addr1
                await memeToken.transfer(addr1.address, tokenAmount);

                // Add liquidity
                await memeToken.connect(addr1).addLiquidity(tokenAmount, { value: ethAmount });

                // Get LP token balance
                const pairAddress = await memeToken.uniswapPair();
                const pairContract = await ethers.getContractAt("IERC20", pairAddress);
                lpTokens = await pairContract.balanceOf(addr1.address);
            });

            it("Should allow users to remove liquidity", async function () {
                const pairAddress = await memeToken.uniswapPair();
                const pairContract = await ethers.getContractAt("IERC20", pairAddress);

                // Check initial balances
                const initialTokenBalance = await memeToken.balanceOf(addr1.address);
                const initialEthBalance = await ethers.provider.getBalance(addr1.address);

                // Approve LP tokens for removal
                await pairContract.connect(addr1).approve(await memeToken.getAddress(), lpTokens);

                // Remove liquidity
                await memeToken.connect(addr1).removeLiquidity(lpTokens);

                // Check balances increased
                const finalTokenBalance = await memeToken.balanceOf(addr1.address);
                const finalEthBalance = await ethers.provider.getBalance(addr1.address);

                expect(finalTokenBalance).to.be.gt(initialTokenBalance);
                expect(finalEthBalance).to.be.gt(initialEthBalance - ethers.parseEther("0.01")); // Account for gas
            });

            it("Should not allow removing liquidity before initial liquidity", async function () {
                // Deploy a new token without initial liquidity
                const MemeToken = await ethers.getContractFactory("MemeToken");
                const newToken = await MemeToken.deploy(UNISWAP_ROUTER_SEPOLIA);

                await expect(
                    newToken.connect(addr1).removeLiquidity(ethers.parseUnits("1", 18))
                ).to.be.revertedWith("Liquidity not added yet");
            });

            it("Should require valid LP token amount", async function () {
                await expect(
                    memeToken.connect(addr1).removeLiquidity(0)
                ).to.be.revertedWith("Invalid LP token amount");
            });

            it("Should require sufficient LP token balance", async function () {
                const excessiveAmount = lpTokens + ethers.parseUnits("1000", 18);

                await expect(
                    memeToken.connect(addr1).removeLiquidity(excessiveAmount)
                ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });
        });

        describe("Slippage Configuration", function () {
            it("Should allow owner to set slippage percentage", async function () {
                await memeToken.setSlippagePercent(10);
                expect(await memeToken.slippagePercent()).to.equal(10);
            });

            it("Should not allow slippage percentage above 50%", async function () {
                await expect(
                    memeToken.setSlippagePercent(51)
                ).to.be.revertedWith("Slippage too high");
            });

            it("Should not allow non-owner to set slippage", async function () {
                await expect(
                    memeToken.connect(addr1).setSlippagePercent(10)
                ).to.be.revertedWithCustomError(memeToken, "OwnableUnauthorizedAccount");
            });

            it("Should allow owner to set slippage threshold", async function () {
                const newThreshold = ethers.parseUnits("5000", 18);
                await memeToken.setSlippageThreshold(newThreshold);
                expect(await memeToken.slippageThreshold()).to.equal(newThreshold);
            });

            it("Should not allow non-owner to set slippage threshold", async function () {
                await expect(
                    memeToken.connect(addr1).setSlippageThreshold(ethers.parseUnits("5000", 18))
                ).to.be.revertedWithCustomError(memeToken, "OwnableUnauthorizedAccount");
            });
        });

        describe("Integration with Tax System", function () {
            it("Should not charge tax when adding liquidity", async function () {
                const tokenAmount = ethers.parseUnits("1000", 18);
                const ethAmount = ethers.parseEther("0.1");

                // Transfer tokens to addr1
                await memeToken.transfer(addr1.address, tokenAmount);

                const initialBalance = await memeToken.balanceOf(addr1.address);

                // Add liquidity - should not be taxed since it's not a swap
                await memeToken.connect(addr1).addLiquidity(tokenAmount, { value: ethAmount });

                // Balance should have decreased by exactly the token amount (no tax)
                const finalBalance = await memeToken.balanceOf(addr1.address);
                expect(initialBalance - finalBalance).to.equal(tokenAmount);
            });

            it("Should handle large liquidity additions with slippage protection", async function () {
                const largeAmount = ethers.parseUnits("20000", 18); // Above threshold
                const ethAmount = ethers.parseEther("2");

                // Transfer large amount to addr1
                await memeToken.transfer(addr1.address, largeAmount);

                // Should work with slippage protection enabled
                await expect(
                    memeToken.connect(addr1).addLiquidity(largeAmount, { value: ethAmount })
                ).to.not.be.reverted;
            });
        });
    });
});
