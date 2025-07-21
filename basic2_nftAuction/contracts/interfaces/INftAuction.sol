// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface INftAuction {
    function feeRate() external view returns (uint256);
    function seller() external view returns (address);
    function depositNft(uint256 _tokenId, uint256 _duration, address _nftAddress, uint256 _startPrice) external;
    function endAuction() external;
    function setFeeRate(uint256 _feeRate) external;
    function withdrawETH(address _to) external;
    function withdrawERC20(address tokenAddress, address _to) external;
}