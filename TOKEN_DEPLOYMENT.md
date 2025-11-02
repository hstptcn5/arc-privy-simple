# 🪙 Token Deployment Guide

## ✅ Deploy ERC-20 Token on Arc Testnet

### Step 1: Compile Contract

```bash
cd contracts
forge build
```

### Step 2: Deploy Token

```bash
# Get your private key
PRIVATE_KEY="0xYourPrivateKeyHere"

# Deploy SimpleToken
forge create src/SimpleToken.sol:SimpleToken \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.testnet.arc.network \
  --constructor-args "MyToken" "MTK" 18 1000000000000000000000000 \
  --broadcast
```

**Parameters:**
- `"MyToken"` - Token name
- `"MTK"` - Token symbol  
- `18` - Decimals
- `1000000000000000000000000` - Initial supply (1 million tokens with 18 decimals)

### Step 3: Get Contract Address

After deployment, you'll see:
```
Deployed to: 0xYourTokenAddress
```

### Step 4: View on Arcscan

Open: https://testnet.arcscan.app/address/0xYourTokenAddress

---

## 📋 Example Deployments

### Deploy "My Token" with 1M supply

```bash
forge create src/SimpleToken.sol:SimpleToken \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.testnet.arc.network \
  --constructor-args "My Token" "MTK" 18 1000000000000000000000000 \
  --broadcast
```

### Deploy "ARC Token" with 10M supply

```bash
forge create src/SimpleToken.sol:SimpleToken \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.testnet.arc.network \
  --constructor-args "ARC Token" "ARC" 18 10000000000000000000000000 \
  --broadcast
```

---

## 🔧 Contract Features

**SimpleToken** includes:
- ✅ Standard ERC-20 functions
- ✅ Mint function (owner only)
- ✅ Transfer & approve
- ✅ TransferFrom (allowances)
- ✅ All standard events

---

## ⚠️ Gas Costs

Deploying ERC-20 on Arc costs USDC in gas:
- Deployment: ~0.1-0.5 USDC (depending on contract size)
- Transactions: Standard Arc fees

---

## 🎯 Next Steps

After deploying, you can:
1. Add token to MetaMask
2. Transfer to users
3. Build DApp around it
4. List on DEX

---

**Note:** This is for testnet only! Deploy your own tokens at your own risk.


