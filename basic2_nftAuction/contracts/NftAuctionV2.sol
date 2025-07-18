// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./NftAuction.sol";

contract NftAuctionV2 is NftAuction {

    function version() public pure virtual override returns (string memory) {
        return "2.0.0";
    }

}
