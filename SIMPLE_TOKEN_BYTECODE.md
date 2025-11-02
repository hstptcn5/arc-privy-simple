# Simple Token Bytecode

## How to Get Bytecode

### Option 1: Use Remix IDE (Easiest)

1. Go to https://remix.ethereum.org
2. Create new file: `SimpleToken.sol`
3. Paste contract code from `contracts/src/SimpleToken.sol`
4. Compile (Ctrl+S or Settings → Compile)
5. Copy bytecode from "Bytecode" tab

### Option 2: Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup

cd contracts
forge build
```

Then read bytecode from `out/SimpleToken.sol/SimpleToken.json`

### Option 3: Use Online Compiler

- https://solc-bin.ethereum.org/bin/soljson-v0.8.30+commit.abfa5be2.js
- Or any Solidity online IDE

---

## Once You Have Bytecode

Save it to: `contracts/bytecode.json`

```json
{
  "deployedBytecode": "0x6080...",
  "abi": [...]
}
```

Then we can use it in frontend!


