// SPDX-License-Identifier: MIT
pragma solidity ~0.8.0;

contract CharityContract{
    address payable owner;
    mapping(address => uint256) public donations;
    uint256 public totalDonations;

    constructor() {
        owner = payable(msg.sender);
    }

    receive() external payable {
        require(msg.value > 0, "Donation amount must be greater than 0");
        donations[msg.sender] += msg.value;
        totalDonations += msg.value;
        emit DonationReceived(msg.sender, msg.value);
    }

    function donate() external payable {
        require(msg.value > 0, "Donation amount must be greater than 0");
        donations[msg.sender] += msg.value;
        totalDonations += msg.value;
        emit DonationReceived(msg.sender, msg.value);
    }

    function withdraw() external {
        require(msg.sender == owner, "not the owner");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        owner.transfer(balance);
    }

    function getDonation(address donor) public view returns (uint256) {
        return donations[donor];
    }

    event FundsWithdrawn(address indexed owner, uint256 amount);
    event DonationReceived(address indexed donor, uint256 amount);
}