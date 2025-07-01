// SPDX-License-Identifier: MIT
pragma solidity ~0.8;

struct Candidate{
    uint id;
    string name;
    uint voteCount;
}

contract Voting {

    // owner
    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action.");
        _;
    }
    constructor() {
        owner = msg.sender;
    }
    // candidates
    mapping (uint => Candidate) public candidates;
    uint public candidatesCount;
    // voters
    mapping (address => bool) public voters;
    address[] public voterAddresses;

    function addCandidate(string memory _name) external onlyOwner {
        candidatesCount++;
        Candidate storage candidate = candidates[candidatesCount];
        candidate.id = candidatesCount;
        candidate.name = _name;
        candidate.voteCount = 0;
    }

    function resetVotes() external onlyOwner {
        for (uint i = 0; i < voterAddresses.length; i++) {
            voters[voterAddresses[i]] = false;
        }
        delete voterAddresses;
        for (uint i = 1; i <= candidatesCount; i++) {
            candidates[i].voteCount = 0;
        }
    }

    function vote(uint _candidateId) external {
        // check if the voter has already voted
        require(!voters[msg.sender], "You have already voted.");
        // check if the candidate exists
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID.");
        
        // record the vote
        voters[msg.sender] = true;
        candidates[_candidateId].voteCount++;
    }

    function getvotes(uint _candidateId) external view returns (uint) {
        // check if the candidate exists
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID.");
        return candidates[_candidateId].voteCount;
    }

}