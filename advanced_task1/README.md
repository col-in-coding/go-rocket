
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

## task1 output
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

## task2

### Generate ABI and byte code
```
solcjs --abi counter.sol
solcjs --bin counter.sol
```

### Generate Go file from abi
```
abigen --abi counter_sol_Counter.abi --bin counter_sol_Counter.bin --pkg=counter --out=counter.go
```

### Deploy Contract
```
2025/08/07 22:24:14 From address: 0xDbA78ec19c5c9F5Cc57741096e1D76De117A5f0d
2025/08/07 22:24:15 Contract deployed at address: 0xacd4E88A54252d98F30C2912227d86B7fe6A4842
2025/08/07 22:24:15 Transaction hash: 0xc62bdf93fa5929e4e1876f9c3017ba992a81081dc59d39953c3a7b76b5df860b
2025/08/07 22:24:35 Transaction receipt: &{Type:0 PostState:[] Status:1 CumulativeGasUsed:21640303 Bloom:[0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0] Logs:[] TxHash:0xc62bdf93fa5929e4e1876f9c3017ba992a81081dc59d39953c3a7b76b5df860b ContractAddress:0xacd4E88A54252d98F30C2912227d86B7fe6A4842 GasUsed:261488 EffectiveGasPrice:+7056100 BlobGasUsed:0 BlobGasPrice:<nil> BlockHash:0x22c77a5bf0b781474a4eca23c6aac1bafd91eaae9120e3ea1c5ec49f291006cd BlockNumber:+8932998 TransactionIndex:238}
2025/08/07 22:24:35 Transaction was successful
```

### Add count
```
2025/08/07 22:39:42 From address: 0xDbA78ec19c5c9F5Cc57741096e1D76De117A5f0d
2025/08/07 22:39:49 Transaction receipt: &{Type:2 PostState:[] Status:1 CumulativeGasUsed:25216027 Bloom:[0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 128 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 16 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 4 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 16 0 0 0 0 0 0 16 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0] Logs:[0xc00047a580] TxHash:0x981e11bdb36140766bd0164294e306329e0226a7ae3c77140b1b256051dc9609 ContractAddress:0x0000000000000000000000000000000000000000 GasUsed:45231 EffectiveGasPrice:+5222888 BlobGasUsed:0 BlobGasPrice:<nil> BlockHash:0x03aecac694c834e47debd802e18098b802bada69125438a0107be20d190fdb2f BlockNumber:+8933074 TransactionIndex:243}
2025/08/07 22:39:49 Current count: 1
```