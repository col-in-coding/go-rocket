
## init go module
```
go mod init advancedTask1
go get github.com/ethereum/go-ethereum
go get github.com/ethereum/go-ethereum/rpc
```

## install solc Compiler
```
npm install -g solc
```

## install abigen
```
go install github.com/ethereum/go-ethereum/cmd/abigen@latest
```

## output
```
2025/08/03 15:05:36 block number: 8900887
2025/08/03 15:05:36 block hash: 0xa3c9a11d14c67f57f6d638d4ca680bff0e3d4bf2643bd0ac9b59df6e0138367d
2025/08/03 15:05:36 block timestamp: 1754189664
2025/08/03 15:05:36 block parent hash: 0xd1f7ee35fb6608a5bf2b13069d6d1615121de1e5263806e69183208d614f14ac
2025/08/03 15:05:36 block difficulty: 0
2025/08/03 15:05:37 block transaction count: 254
2025/08/03 15:05:37 block transaction count (via TransactionCount): 254
2025/08/03 15:05:37 From address: 0xDbA78ec19c5c9F5Cc57741096e1D76De117A5f0d
2025/08/03 15:05:38 Transaction sent: 0x5aa5995747cc0ddbf31b619eb6a194e29ac5a1bfe9b3e6e34f707b97eb643333
2025/08/03 15:05:47 Transaction receipt: &{Type:0 PostState:[] Status:1 CumulativeGasUsed:14468701 Bloom:[0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0] Logs:[] TxHash:0x5aa5995747cc0ddbf31b619eb6a194e29ac5a1bfe9b3e6e34f707b97eb643333 ContractAddress:0x0000000000000000000000000000000000000000 GasUsed:21000 EffectiveGasPrice:+3911822 BlobGasUsed:0 BlobGasPrice:<nil> BlockHash:0x66370af7997cd97af1a529cc8ab1e2b852e85e71e66513c8959c950f5d1979c6 BlockNumber:+8902144 TransactionIndex:99}
2025/08/03 15:05:47 Transaction was successful
```