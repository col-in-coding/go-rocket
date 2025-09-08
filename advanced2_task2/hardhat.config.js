require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      forking: {
        url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
        blockNumber: 9123048
      },
      chainId: 11155111, // Sepolia chain ID
      // 让 hardhat 自动处理 gas 价格
      initialBaseFeePerGas: 0, // 设置为0来避免gas问题
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    }
  },
  // 可选：配置 etherscan 用于验证合约
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
