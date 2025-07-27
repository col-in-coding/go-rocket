# NFT Auction

## Folder Structure
- contracts
    - ccip/CCIPBidProxy.sol: 侧链竞价代理
    - ccip/CCIPNftAuction.sol: 主链拍卖合约
    - ccip/CCIPReceiverUpgradable: 原CCIPReceiver不能够升级，改造一下
    - interfaces/INftAuction.sol: NftAuction 接口合约
    - test/MockAggregator.sol: ChainLink的 Price Feed mock数据
    - test/MyNftToken.sol: 测试使用的NFT合约
    - test/MyERC20.sol: 测试使用的ERC20合约
    - AuctionFactory.sol: 工厂合约，用于生成和管理拍卖合约，可使用UUPS代理模式升级
    - NftAuction.sol: 拍卖合约，可以托管NFT进行拍卖，可使用Beacon代理模式升级
- deploy
    - 01_deploy_auction_impl.js: 使用 NftAuction 逻辑合约
    - 02_deploy_auction_factory.js: 使用 UUPS 代理模式部署 AuctionFactory 合约
- test
    - MyNftToken.test.js: 本地节点的 NFT 合约测试
    - NftAuction.test.js: 本地节点的 NftAuction 合约测试
    - AuctionFactory.test.js: 本地节点的 AuctionFactory 合约测试
    - NftAuctionIntegration.test.js: 本地节点，集成测试

## Business Logic For Single Chain

### Core Components

#### AuctionFactory.sol (Factory Contract)
- **Purpose**: Creates and manages multiple NFT auction instances
- **Upgrade Pattern**: Uses UUPS (Universal Upgradeable Proxy Standard) for factory upgrades
- **Key Features**:
  - Deploys new NftAuction contracts using Beacon Proxy pattern
  - Maintains registry of all created auctions
  - Provides centralized management and governance
  - Supports factory contract upgrades without affecting existing auctions

#### NftAuction.sol (Core Auction Contract)
- **Purpose**: Handles individual NFT auctions with comprehensive bidding logic
- **Upgrade Pattern**: Uses Beacon Proxy pattern for auction logic upgrades
- **Key Features**:
  - NFT escrow during auction period
  - Multi-token bidding support (ETH + multiple ERC20 tokens)
  - Chainlink Price Feed integration for accurate price conversions
  - Configurable fee system (default 2.5%)
  - Time-based auction mechanics

### Auction Lifecycle

#### Phase 1: Auction Creation
```
1. Admin calls AuctionFactory.createAuction(seller)
2. Factory deploys new NftAuction proxy instance
3. Auction contract initialized with seller address
4. Seller becomes the designated NFT depositor
```

#### Phase 2: NFT Deposit & Auction Setup
```
1. Seller approves NFT to auction contract
2. Seller calls depositNft(tokenId, duration, nftAddress, startPrice)
3. NFT transferred to auction contract escrow
4. Auction parameters set:
   - duration: auction length in seconds
   - startPrice: minimum acceptable bid
   - startTime: current timestamp
```

#### Phase 3: Bidding Process
```
1. Bidders call priceBid(amount, tokenAddress) with payment
2. System validates bid:
   - Converts bid amount to USD using Chainlink Price Feed
   - Ensures bid exceeds start price and current highest bid
   - Checks auction is active and not expired
3. If valid:
   - Previous highest bidder gets refunded automatically
   - New bidder becomes highest bidder
   - Bid amount held in contract escrow
```

#### Phase 4: Auction Settlement
```
1. Auction ends when duration expires
2. Admin or any user can call endAuction()
3. Settlement process:
   - Calculate fee (2.5% of winning bid)
   - Transfer fee to admin wallet
   - Transfer remaining amount to seller
   - Transfer NFT to winner
```

### Price Feed Integration

The system uses Chainlink Price Feeds for accurate token valuation:

```solidity
// Example: Converting different tokens to USD for comparison
ETH bid: 0.5 ETH × $3000/ETH = $1500 USD
USDC bid: 1600 USDC × $1.00/USDC = $1600 USD
// USDC bid wins as it's higher in USD terms
```

### Security Features

1. **Access Control**: Only designated seller can deposit NFT
2. **Reentrancy Protection**: Safe transfer patterns throughout
3. **Price Oracle**: Chainlink feeds prevent price manipulation
4. **Automatic Refunds**: Previous bidders refunded immediately
5. **Escrow Safety**: NFTs and funds secured until proper settlement

### Gas Optimization

1. **Proxy Patterns**: Reduces deployment costs for new auctions
2. **Efficient Storage**: Minimal state variables per auction
3. **Batch Operations**: Single transaction for bid processing
4. **Event Indexing**: Off-chain data retrieval via events

### Fee Structure

- **Default Fee Rate**: 2.5% (250 basis points)
- **Fee Calculation**: Applied to final winning bid amount
- **Fee Distribution**: Collected by factory admin
- **Configurable**: Admin can adjust fee rates as needed

## Business Logic For Cross Chain

