// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MyNftToken is ERC721, Ownable {
    uint256 private _nextTokenId;

    event Minted(address indexed to, uint256 tokenId);

    constructor(address initialOwner)
        ERC721("Colin's Collections", "CCtns")
        Ownable(initialOwner)
    {}

    function mint(address to) public onlyOwner {
        _mint(to, _nextTokenId);
        emit Minted(to, _nextTokenId);
        _nextTokenId++;
    }
}