// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StakeToken is ERC20 {
    constructor() ERC20("StakeToken", "STK") {
        // 铸造 100,000,000 个代币给部署者
        _mint(msg.sender, 100_000_000 * 10**decimals());
    }
}
