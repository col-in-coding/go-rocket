package main

import (
	"context"
	"crypto/ecdsa"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/joho/godotenv"
)

func query(client *ethclient.Client, blockNumber *big.Int) {
	header, err := client.HeaderByNumber(context.Background(), blockNumber)
	if err != nil {
		log.Fatalf("Failed to get the block header: %v", err)
	}

	log.Printf("block number: %d", header.Number.Uint64())
	log.Printf("block hash: %s", header.Hash().Hex())
	log.Printf("block timestamp: %d", header.Time)
	log.Printf("block parent hash: %s", header.ParentHash.Hex())
	log.Printf("block difficulty: %d", header.Difficulty.Uint64())

	block, err := client.BlockByNumber(context.Background(), blockNumber)
	if err != nil {
		log.Fatalf("Failed to get the block: %v", err)
	}
	log.Printf("block transaction count: %d", len(block.Transactions()))

	count, err := client.TransactionCount(context.Background(), block.Hash())
	if err != nil {
		log.Fatalf("Failed to get transaction count: %v", err)
	}
	log.Printf("block transaction count (via TransactionCount): %d", count)
}

func main() {

	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Failed to load .env file: %v", err)
	}

	client, err := ethclient.Dial(os.Getenv("ETHEREUM_SEPOLIA_RPC_URL"))
	if err != nil {
		log.Fatalf("Failed to connect to the Ethereum client: %v", err)
	}
	query(client, big.NewInt(8900887))

	// Transfer ETH
	// 将十六进制的字符串转换为私钥对象
	privateKey, err := crypto.HexToECDSA(os.Getenv("PRIVATE_KEY"))
	if err != nil {
		log.Fatalf("Failed to parse private key: %v", err)
	}
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatalf("Failed to cast public key to ECDSA")
	}
	// 生成以太坊地址
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	log.Printf("From address: %s", fromAddress.Hex())

	toAddress := common.HexToAddress("0xBE4F728dc90488c963FE61EF6d84Ba67278B7cA0")
	value := big.NewInt(1000000000000000000) // 1 ETH
	gasLimit := uint64(21000)                // 交易的gas限制
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Fatalf("Failed to suggest gas price: %v", err)
	}

	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Fatalf("Failed to get nonce: %v", err)
	}
	var data []byte

	// 创建交易
	tx := types.NewTransaction(nonce, toAddress, value, gasLimit, gasPrice, data)
	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		log.Fatalf("Failed to get chain ID: %v", err)
	}

	// 使用私钥对交易进行签名
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		log.Fatalf("Failed to sign transaction: %v", err)
	}

	// 发送交易
	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		log.Fatalf("Failed to send transaction: %v", err)
	}
	log.Printf("Transaction sent: %s", signedTx.Hash().Hex())

	// 等待交易被挖掘
	receipt, err := waitForReceipt(client, signedTx.Hash())
	if err != nil {
		log.Fatalf("Failed to wait for transaction receipt: %v", err)
	}
	log.Printf("Transaction receipt: %+v", receipt)

	// 检查交易状态
	if receipt.Status == types.ReceiptStatusSuccessful {
		log.Println("Transaction was successful")
	} else {
		log.Println("Transaction failed")
	}
}

func waitForReceipt(client *ethclient.Client, txHash common.Hash) (*types.Receipt, error) {
	for {
		receipt, err := client.TransactionReceipt(context.Background(), txHash)
		if err == nil {
			return receipt, nil
		}
		if err != ethereum.NotFound {
			return nil, err
		}
		// 等待一段时间后再次查询
		time.Sleep(1 * time.Second)
	}
}
