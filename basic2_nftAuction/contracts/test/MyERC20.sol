// SPDX-License-Identifier: MIT
pragma solidity ~0.8.0;

contract MyERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;

    address owner;
    uint256 totalSupply;
    mapping (address => uint256) public balances;
    mapping (address => mapping (address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 _totalSupply) {
        name = "MyERC20";
        symbol = "MERC";
        decimals = 0;

        owner = msg.sender;
        _mint(owner, _totalSupply);
    }

    function _mint(address addr, uint supply) public {
        require(addr != address(0), "Mint to zero address");
        require(msg.sender == owner, 'Only owner can mint tokens');
        totalSupply += supply;
        balances[addr] += supply;
    }

    function balanceOf(address _owner) public view returns (uint256) {return balances[_owner];}

    function _transfer(address from, address to, uint256 value) public {
        require(to != address(0), "Transfer to zero address");
        require(balances[from] >= value, 'Transfer amount exceeds balance');
        balances[from] -= value;
        balances[to] += value;
        emit Transfer(from, to, value);
    }

    function transfer(address to, uint256 value) public {
        _transfer(msg.sender, to, value);
    }

    function approve(address spender, uint256 value) public {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
    }

    function transferFrom(address from, address to, uint256 value) public {
        address spender = msg.sender;
        require(allowance[from][spender] >= value, 'Insufficient approval');
        allowance[from][spender] -= value;
        _transfer(from, to, value);
    }
}