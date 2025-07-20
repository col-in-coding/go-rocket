# NFT Auction

## Folder Structure
- contracts
    - test/MockAggregator.sol: ChainLink的 Price Feed mock数据
    - test/MyNftToken.sol: 测试使用的NFT合约
    - test/MyERC20.sol: 测试使用的ERC20合约
    - AuctionFactory.sol: 工厂合约，用于生成和管理拍卖合约，可使用UUPS代理模式升级
    - NftAuction.sol: 拍卖合约，可以托管NFT进行拍卖，可使用Beacon代理模式升级
- deploy
    - 01_deploy_auction_impl.js: 使用 NftAuction 逻辑合约
    - 02_deploy_auction_factory.js: 使用 UUPS 代理模式部署 AuctionFactory 合约
- test
    - MyNftToken.local.test.js: 本地节点的 NFT 合约测试
    - NftAuction.local.test.js: 本地节点的 NftAuction 合约测试
    - AuctionFactory.local.test.js: 本地节点的 AuctionFactory 合约测试
    - NftAuctionIntegration.local.test.js: 本地节点，集成测试

## 测试结果
```
npx hardhat test test/NftAuction.local.test.js
```
输出：
```
✔ should be allow user to deposit NFT (333ms)
✔ should allow user to place a bid (end by ETH) (250ms)
✔ should allow user to withdraw NFT after auction ends (end without any bids) (70ms)
✔ should allow user to withdraw NFT after auction ends (end by ERC20) (166ms)
Error Tests
✔ should revert if initialize is called again
✔ should revert if double deposit NFT
✔ should revert if depositing by non-seller
✔ should revert if nft address is zero
✔ should revert if the price feed address is not set when get price
✔ should revert if bid after auction ended (2029ms)
✔ should revert if bid before the Nft deposited
✔ should revert if bid amount is not sufficient
✔ should revert if end auction by non-seller
✔ should allow deployer to end auction (62ms)
Upgrade Tests
✔ should upgrade the NftAuction contract (193ms)


15 passing (27s)
```

```
npx hardhat test test/AuctionFactory.local.test.js
```
输出：
```
✔ should be able to create a new auction (301ms)
✔ should create multiple auctions with different sellers (392ms)
✔ should emit AuctionCreated event when creating auction (89ms)
✔ should be able to deposit NFT into auction (194ms)
✔ should be able to end an auction
Error Tests
✔ should revert if initialized multiple times (54ms)
✔ should revert when deposit to a non-existent auction
✔ should revert when trying to end non-existent auction
✔ should revert when tring to end auction by non-admin
Upgrade Test
✔ should allow upgrading the AuctionFactory contract (182ms)
```

```
npx hardhat test test/NftAuctionIntegration.local.test.js
```
输出：
```
✔ should create auction through factory with correct settings (183ms)
✔ should create multiple auctions with different sellers (194ms)
Complete Auction Lifecycle
✔ should handle complete auction flow with NFT deposit and ETH bidding (246ms)
✔ should handle auction with ERC20 token bidding (136ms)
✔ should handle auction with multiple bids (186ms)
✔ should handle auction ending without any bids (73ms)
✔ should handle auction ending without NFT deposit
Error Handling
✔ should revert when non-seller and non-admin tries to deposit NFT through factory (61ms)
✔ should revert when trying to deposit to non-existent auction
✔ should revert when bidding before NFT deposit
✔ should revert when bid amount is insufficient (38ms)
✔ should revert when non-admin/non-seller tries to end auction
✔ should revert when trying to end already ended auction
Upgrade Tests
✔ should upgrade beacon implementation through factory (277ms)
✔ should revert when non-admin tries to upgrade beacon
✔ should upgrade existing auctions to v2 (167ms)
Events
✔ should emit AuctionCreated event (90ms)
✔ should emit AuctionEnded event (83ms)
✔ should emit BeaconUpgraded event (156ms)


19 passing (23s)
```

## Test Coverage
-------------------------------------------------------------------------------------
File                   |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-----------------------|----------|----------|----------|----------|----------------|
 contracts/            |    90.91 |    92.59 |       95 |    94.44 |                |
  AuctionFactory.sol   |    81.82 |       85 |    90.91 |    88.46 |    111,114,115 |
  AuctionFactoryV2.sol |      100 |      100 |      100 |      100 |                |
  NftAuction.sol       |    96.77 |    97.06 |      100 |    97.73 |            121 |
  NftAuctionV2.sol     |      100 |      100 |      100 |      100 |                |
 contracts/test/       |    78.95 |    58.33 |    73.33 |    86.67 |                |
  MockAggregator.sol   |       20 |      100 |    33.33 |    33.33 |    14,18,22,37 |
  MyERC20.sol          |      100 |       50 |      100 |      100 |                |
  MyNftToken.sol       |      100 |      100 |      100 |      100 |                |
-----------------------|----------|----------|----------|----------|----------------|
All files              |    87.84 |    86.36 |    85.71 |    92.16 |                |
-----------------------|----------|----------|----------|----------|----------------|