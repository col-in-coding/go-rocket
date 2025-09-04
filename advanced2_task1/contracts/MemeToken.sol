// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "hardhat/console.sol";
import { IUniswapV2Router } from "./interfaces/IUniswapV2Router.sol";
import { IUniswapV2Factory } from "./interfaces/IUniswapV2Factory.sol";

contract MemeToken is ERC20, Ownable, ReentrancyGuard {

    IUniswapV2Router public uniswapRouter;
    address public uniswapPair;

    // 2% lp tax rate
    uint256 public constant TAX_PERCENT = 2;
    uint256 private constant TAX_DENOMINATOR = 100;
    uint256 private constant MIN_TOKENS_BEFORE_SWAP = 5000 * 10 ** 18;

    bool public liquidityAdded;

    mapping(address => bool) public isExcludedFromTax;

    uint256 public slippagePercent = 5;
    uint256 public slippageThreshold = 10000 * 10 ** 18; // 10000 tokens以上才启用滑点保护

    // Transfer Limit
    uint256 public maxTxAmount = 20000 * 10 ** 18; // 最大交易量20,000代币

    event TaxProcessed(uint256 tokenSwapped, uint256 ethReceived);
    event LiquidityAdded(uint256 tokensAmount, uint256 ethAmount, uint256 liquidity);

    constructor(address _uniswapRouter)
        ERC20("MemeToken", "MEME")
        Ownable(msg.sender)
    {
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
        uniswapPair = IUniswapV2Factory(uniswapRouter.factory()).createPair(
            address(this),
            uniswapRouter.WETH()
        );

        // 发送者和接受者必须同时被排除，才可以不交税
        isExcludedFromTax[msg.sender] = true;
        isExcludedFromTax[address(this)] = true;
        isExcludedFromTax[uniswapPair] = true;

        _mint(msg.sender, 1000000000 * 10 ** decimals());
    }

    // 创建初始流动性
    function addInitialLiquidity(uint256 tokenAmount, uint256 ethAmount)
        external
        payable
        onlyOwner
        nonReentrant
    {
        console.log(msg.value);
        console.log(ethAmount);
        require(!liquidityAdded, "Liquidity already added");
        require(msg.value == ethAmount, "ETH amount mismatch");
        require(tokenAmount > 0 && ethAmount > 0, "Amounts must be greater than 0");
        require(balanceOf(owner()) >= tokenAmount, "Not enough tokens");

        // 先将代币从 owner 转移到合约
        _transfer(owner(), address(this), tokenAmount);

        // 然后授权 router 使用合约的代币
        _approve(address(this), address(uniswapRouter), tokenAmount);

        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = uniswapRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0,
            0,
            owner(),
            block.timestamp
        );

        liquidityAdded = true;
        emit LiquidityAdded(amountToken, amountETH, liquidity);
    }

    // 公开的添加流动性函数（仅在初始流动性添加后可用）
    function addLiquidity(uint256 tokenAmount)
        external
        payable
        nonReentrant
    {
        require(liquidityAdded, "Initial liquidity not added yet");
        require(tokenAmount > 0, "Invalid token amount");
        require(msg.value > 0, "Invalid ETH amount");

        // 将用户的代币转移到合约
        _transfer(msg.sender, address(this), tokenAmount);

        _addLiquidity(tokenAmount, msg.value, msg.sender);

        emit LiquidityAdded(tokenAmount, msg.value, 0); // liquidity值在这里设为0，实际值由事件内部计算
    }

    // 允许用户移除流动性
    function removeLiquidity(uint256 lpTokenAmount) external nonReentrant {
        require(liquidityAdded, "Liquidity not added yet");
        require(lpTokenAmount > 0, "Invalid LP token amount");

        // 获取LP代币合约
        IERC20 lpToken = IERC20(uniswapPair);

        // 从用户地址转移LP代币到合约
        lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);

        // 授权router使用LP代币
        lpToken.approve(address(uniswapRouter), lpTokenAmount);

        // 移除流动性
        uniswapRouter.removeLiquidityETH(
            address(this),
            lpTokenAmount,
            0, // 接受任何数量的代币
            0, // 接受任何数量的ETH
            msg.sender, // 代币和ETH发送给调用者
            block.timestamp
        );
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        address sender = _msgSender();
        _transferWithTax(sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address sender = _msgSender();
        _spendAllowance(from, sender, amount);
        _transferWithTax(from, to, amount);
        return true;
    }

    function _transferWithTax(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        // 交易限制检查
        if (sender != owner() && recipient != owner()) {
            require(amount <= maxTxAmount, "Transfer amount exceeds the maxTxAmount");
        }

        // 如果流动性还没有添加，就直接转账（避免在添加流动性时收税）
        if (!liquidityAdded) {
            _transfer(sender, recipient, amount);
            return;
        }

        uint256 taxAmount = 0;

        // 判断是否需要收取税
        bool shouldTakeTax = !isExcludedFromTax[sender] && !isExcludedFromTax[recipient] &&
                            (sender == uniswapPair || recipient == uniswapPair);

        if (shouldTakeTax) {
            taxAmount = (amount * TAX_PERCENT) / TAX_DENOMINATOR;
        }

        _transfer(sender, recipient, amount - taxAmount);

        if (taxAmount > 0) {
            _transfer(sender, address(this), taxAmount);

            uint256 contractTokenBalance = balanceOf(address(this));
            bool canProcessTax = contractTokenBalance >= MIN_TOKENS_BEFORE_SWAP && sender != uniswapPair;

            if (canProcessTax) {
                _processTax(contractTokenBalance);
            }
        }
    }

    function _processTax(uint256 tokenAmount) private {

        uint256 half = tokenAmount / 2;
        uint256 otherHalf = tokenAmount - half;

        uint256 initialEthBalance = address(this).balance;
        // 交换代币为ETH
        _swapTokensForEth(half);
        uint256 ethReceived = address(this).balance - initialEthBalance;
        // 添加到流动池，并销毁LP
        _addLiquidity(otherHalf, ethReceived, address(0));

        emit TaxProcessed(half, ethReceived);
    }

    function _swapTokensForEth(uint256 tokenAmount) private {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapRouter.WETH();

        _approve(address(this), address(uniswapRouter), tokenAmount);

        uniswapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // 接受任何数量的ETH
            path,
            address(this),
            block.timestamp
        );
    }

    function _addLiquidity(uint256 tokenAmount, uint256 ethAmount, address lpReceiver) private
    {
        // 授权uniswap使用代币
        _approve(address(this), address(uniswapRouter), tokenAmount);

        uint256 minTokenAmount = 0;
        uint256 minEthAmount = 0;

        // 只有当代币数量超过阈值时才启用滑点保护
        if (tokenAmount >= slippageThreshold) {
            minTokenAmount = tokenAmount * (100 - slippagePercent) / 100;
            minEthAmount = ethAmount * (100 - slippagePercent) / 100;
        }

        uniswapRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            minTokenAmount,
            minEthAmount,
            lpReceiver,
            block.timestamp
        );
    }

    function processTaxManual() external onlyOwner nonReentrant {
        uint256 contractTokenBalance = balanceOf(address(this));
        require(contractTokenBalance > 0, "No taxes to process");

        _processTax(contractTokenBalance);
    }

    function setExcludedFromTax(address account, bool excluded) external onlyOwner {
        isExcludedFromTax[account] = excluded;
    }

    function setSlippagePercent(uint256 _slippagePercent) external onlyOwner {
        require(_slippagePercent <= 50, "Slippage too high"); // 最大50%滑点
        slippagePercent = _slippagePercent;
    }

    function setSlippageThreshold(uint256 _threshold) external onlyOwner {
        slippageThreshold = _threshold;
    }

    function withdrawStuckETH() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No ETH to withdraw");


        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // Helper function to get contract info
    function getContractInfo() external view returns (uint256 tokenBalance, uint256 ethBalance, bool isLiquidityAdded) {
        return (balanceOf(address(this)), address(this).balance, liquidityAdded);
    }
    // 允许合约接收ETH
    receive() external payable {}
}