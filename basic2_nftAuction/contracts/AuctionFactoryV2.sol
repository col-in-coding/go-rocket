// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./AuctionFactory.sol";

contract AuctionFactoryV2 is AuctionFactory {
    function version() public pure virtual override returns (string memory) {
        return "2.0.0";
    }

    // 可以在这里添加新的功能或修改现有功能
}