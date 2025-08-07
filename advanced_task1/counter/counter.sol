// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Counter {
    uint256 private count;

    // 事件，用于记录计数变化
    event CountChanged(uint256 newCount, address changedBy);

    // 构造函数，初始化计数器为0
    constructor() {
        count = 0;
    }

    // 获取当前计数值
    function getCount() public view returns (uint256) {
        return count;
    }

    // 增加计数器值
    function increment() public {
        count += 1;
        emit CountChanged(count, msg.sender);
    }

    // 减少计数器值（防止下溢）
    function decrement() public {
        require(count > 0, "Counter: cannot decrement below zero");
        count -= 1;
        emit CountChanged(count, msg.sender);
    }

    // 重置计数器为0
    function reset() public {
        count = 0;
        emit CountChanged(count, msg.sender);
    }
}