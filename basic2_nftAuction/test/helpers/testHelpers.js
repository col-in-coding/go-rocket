/**
 * 测试辅助函数集合
 */

/**
 * 从交易收据中提取NFT的tokenId
 * @param {Object} tx - 交易对象
 * @param {Object} myNftToken - NFT合约实例
 * @returns {Promise<number>} tokenId
 */
async function getTokenId(tx, myNftToken) {
    let tokenId;
    const receipt = await tx.wait();
    const logs = receipt.logs;
    const iface = myNftToken.interface;

    for (const log of logs) {
        try {
            const parsed = iface.parseLog(log);
            if (parsed.name === "Minted") {
                tokenId = parsed.args.tokenId;
                break;
            }
        } catch (e) {
            continue;
        }
    }
    return tokenId;
}

/**
 * 计算gas费用
 * @param {Object} receipt - 交易收据
 * @returns {BigInt} gas费用（以wei为单位）
 */
function calculateGasCost(receipt) {
    return receipt.gasUsed * receipt.gasPrice;
}

/**
 * 等待指定的区块数
 * @param {number} blocks - 要等待的区块数
 */
async function waitForBlocks(blocks) {
    const { ethers } = require("hardhat");

    for (let i = 0; i < blocks; i++) {
        await ethers.provider.send("evm_mine", []);
    }
}

/**
 * 增加区块链时间
 * @param {number} seconds - 要增加的秒数
 */
async function increaseTime(seconds) {
    const { ethers } = require("hardhat");

    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
}

/**
 * 格式化ETH金额为字符串（便于调试）
 * @param {BigInt} amount - 金额（以wei为单位）
 * @returns {string} 格式化的ETH金额
 */
function formatEther(amount) {
    const { ethers } = require("hardhat");
    return ethers.formatEther(amount);
}

/**
 * 检查地址是否为零地址
 * @param {string} address - 要检查的地址
 * @returns {boolean} 是否为零地址
 */
function isZeroAddress(address) {
    const { ethers } = require("hardhat");
    return address === ethers.ZeroAddress;
}

/**
 * 生成随机地址（用于测试）
 * @returns {string} 随机地址
 */
function randomAddress() {
    const { ethers } = require("hardhat");
    return ethers.Wallet.createRandom().address;
}

module.exports = {
    getTokenId,
    calculateGasCost,
    waitForBlocks,
    increaseTime,
    formatEther,
    isZeroAddress,
    randomAddress
};
