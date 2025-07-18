require('hardhat-deploy');
require('@openzeppelin/hardhat-upgrades');
require("solidity-coverage");

module.exports = {
  solidity: "0.8.28",
  settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,  // 显著提升编译速度（0.8.18+）
    },
  namedAccounts: {
    deployer: {
      default: 0, // 默认使用第一个账户作为部署者
    },
  },
};
