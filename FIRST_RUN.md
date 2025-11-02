# 🎯 First Run Guide

Nếu đây là lần đầu chạy, làm theo từng bước này:

## Bước 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

## Bước 2: Lấy Private Key và Get USDC

**Bạn có thể dùng:**
- ✅ Private key từ ví EVM bất kỳ (MetaMask, Trust Wallet, etc.)
- ✅ Hoặc tạo mới với Node.js:

```bash
cd backend
node -e "const {ethers} = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

**Hoặc với Foundry:**
```bash
cd contracts
cast wallet new
```

Copy cả **Address** và **Private Key**!

## Bước 3: Get Test USDC

1. Mở: **https://faucet.circle.com**
2. Chọn **Arc Testnet**
3. Paste **Address** từ bước 2
4. Request USDC
5. Đợi 10-30 giây

## Bước 4: Config Backend

```bash
cd backend

# Tạo .env file
echo "# Arc Network Configuration (REQUIRED)" > .env
echo "ARC_RPC_URL=https://rpc.testnet.arc.network" >> .env
echo "" >> .env
echo "# Funder Wallet (REQUIRED)" >> .env
echo "FUNDER_PRIVATE_KEY=0xPASTE_YOUR_KEY_HERE" >> .env
echo "" >> .env
echo "PORT=3001" >> .env

# Edit .env và paste private key của bạn
# Hoặc mở .env trong text editor
```

**Format .env:**
```env
ARC_RPC_URL=https://rpc.testnet.arc.network
FUNDER_PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY
PORT=3001
```

⚠️ **Replace** `0xYOUR_ACTUAL_PRIVATE_KEY` với private key từ bước 2!

## Bước 5: Start Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
✅ Funder wallet loaded: 0x...
💰 Funder balance: XX.XXXXXX USDC
🚀 Backend running on http://localhost:3001
```

Nếu thấy warning "Low balance", request thêm USDC.

## Bước 6: Start Frontend

```bash
cd frontend
npm run dev
```

Mở: http://localhost:5173

## Bước 7: Test!

1. Click "Send me $5 USDC"
2. Nhập email: `test@example.com`
3. Nhấn OK
4. Xem transaction hash
5. Check trên: https://testnet.arcscan.app

## ✅ Verification Checklist

- [ ] Backend starts không error
- [ ] Shows funder address và balance
- [ ] Frontend load được
- [ ] Click button không lỗi
- [ ] Console log show transaction hash
- [ ] Arcscan có transaction

## 🆘 Issues?

**Backend exits:**
→ Check .env file có đúng private key không

**"Insufficient balance":**
→ Request thêm USDC từ faucet

**Frontend "Failed to fetch":**
→ Backend chưa chạy hoặc port 3001 bị chặn

**Transaction failed:**
→ Check backend logs để xem error cụ thể

Xem [TROUBLESHOOTING.md](TROUBLESHOOTING.md) cho chi tiết.

---

**Let's send some USDC! 🚀**

