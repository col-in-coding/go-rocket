require("@nomicfoundation/hardhat-chai-matchers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { getTokenId } = require("./helpers/testHelpers");

describe("MyNFT Contract", () => {

    async function deployTokenFixture() {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();

        const myNftToken = await ethers.deployContract("MyNftToken", [owner.address]);
        await myNftToken.waitForDeployment();

        return { myNftToken, owner, addr1, addr2, addr3 };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { myNftToken, owner } = await loadFixture(deployTokenFixture);
            expect(await myNftToken.owner()).to.equal(owner.address);
        });
    });

    describe("Mint and Transfer", function () {
        it("Should mint a new NFT", async function () {
            const { myNftToken, owner, addr1 } = await loadFixture(deployTokenFixture);
            await myNftToken.mint(addr1.address);
            console.log(await myNftToken.balanceOf(addr1.address));
            expect(await myNftToken.balanceOf(addr1.address)).to.equal(1n);
            expect(await myNftToken.ownerOf(0)).to.equal(addr1.address);
        });

        it("Should not allow minting by non-owner", async function () {
            const { myNftToken, owner, addr1 } = await loadFixture(deployTokenFixture);
            // should revert with error OwnableUnauthorizedAccount(address account);
            await expect(
                myNftToken.connect(addr1).mint(addr1.address)
            ).to.be.revertedWithCustomError(myNftToken, "OwnableUnauthorizedAccount").withArgs(addr1.address);
        });

        it("Should transfer an NFT", async function () {
            const { myNftToken, owner, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);

            const tx = await myNftToken.mint(addr1.address);
            const tokenId = await getTokenId(tx, myNftToken);

            await myNftToken.connect(addr1).approve(addr2.address, tokenId);
            await myNftToken.connect(addr2).transferFrom(addr1.address, addr3.address, tokenId);
            expect(await myNftToken.ownerOf(tokenId)).to.equal(addr3.address);
        });
    });
});
