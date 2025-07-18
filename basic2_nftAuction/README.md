# NFT Auction

## Folder Structure
- contracts
    - test/MockAggregator.sol: ChainLink的 Price Feed mock数据
    - test/MyNftToken.sol: 测试使用的NFT合约
    - test/MyERC20.sol: 测试使用的ERC20合约
- deploy
    - 01_deploy_auction_beacon.js: 使用 Beacon Proxy 模式部署 NftAuction 合约
    - 02_deploy_auction_factory.js: 使用 UUPS 代理模式部署 AuctionFactory 合约
- test
    - MyNftToken.test.js: NFT 合约测试
    - NftAuction.test.js: NftAuction 合约测试

## NFT Auction 测试
```
npx hardhat test test/NftAuction.test.js
```
输出：
    ✔ should be allow user to deposit NFT (269ms)
    ✔ should allow user to place a bid (end by ETH) (244ms)
    ✔ should allow user to withdraw NFT after auction ends (end without any bids) (67ms)
    ✔ should allow user to withdraw NFT after auction ends (end by ERC20) (151ms)
    Error Tests
      ✔ should revert if initialize is called again
      ✔ should revert if double deposit NFT
      ✔ should revert if depositing by non-seller
      ✔ should revert if nft address is zero
      ✔ should revert if the price feed address is not set when get price
      ✔ should revert if bid after auction ended (2027ms)
      ✔ should revert if bid before the Nft deposited
      ✔ should revert if bid amount is not sufficient
      ✔ should revert if end auction by non-seller
    Upgrade Tests
      ✔ should upgrade the NftAuction contract (206ms)


  14 passing (13s)