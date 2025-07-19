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
    - MyNftToken.local.test.js: 本地节点的 NFT 合约测试
    - NftAuction.local.test.js: 本地节点的 NftAuction 合约测试
    - AuctionFactory.local.test.js: 本地节点的 AuctionFactory 合约测试

## 测试结果
```
npx hardhat test test/NftAuction.local.test.js
```
输出：
```
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
```

```
npx hardhat test test/AuctionFactory.test.js
```
输出：
```
✔ should be able to create a new auction (425ms)
✔ should create multiple auctions with different sellers (394ms)
✔ should emit AuctionCreated event when creating auction (103ms)
✔ should be able to deposit NFT into auction (258ms)
✔ should be able to end an auction
Error Tests
    ✔ should revert if initialized multiple times (78ms)
    ✔ should revert when deposit to a non-existent auction
    ✔ should revert when trying to end non-existent auction
    ✔ should revert when tring to end auction by non-admin
Upgrade Test
    ✔ should allow upgrading the AuctionFactory contract (240ms)

10 passing (13s)
```

## Test Coverage
-----------------------|----------|----------|----------|----------|----------------|
File                   |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-----------------------|----------|----------|----------|----------|----------------|
 contracts/            |    95.65 |    93.48 |    88.24 |    96.88 |                |
  AuctionFactory.sol   |      100 |    83.33 |     87.5 |      100 |                |
  AuctionFactoryV2.sol |        0 |      100 |        0 |        0 |              8 |
  NftAuction.sol       |    96.77 |    97.06 |      100 |    97.73 |            121 |
  NftAuctionV2.sol     |      100 |      100 |      100 |      100 |                |
 contracts/test/       |    78.95 |    58.33 |    73.33 |    86.67 |                |
  MockAggregator.sol   |       20 |      100 |    33.33 |    33.33 |    14,18,22,37 |
  MyERC20.sol          |      100 |       50 |      100 |      100 |                |
  MyNftToken.sol       |      100 |      100 |      100 |      100 |                |
-----------------------|----------|----------|----------|----------|----------------|
All files              |    90.77 |    86.21 |    81.25 |    93.62 |                |
-----------------------|----------|----------|----------|----------|----------------|