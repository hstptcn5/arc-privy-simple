# ⚡ Setup ngay bây giờ!

Làm theo steps này để backend có thể chạy:

## 🚀 Quick Setup (< 5 phút)

### 1️⃣ Lấy Private Key

**Bạn có thể dùng:**
- Private key từ ví EVM bình thường (MetaMask, etc.)
- Hoặc tạo mới:
```powershell
cd backend
node -e "const {ethers} = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address: ' + w.address); console.log('Private: ' + w.privateKey);"
```

**Lưu ý:** Private key format: `0x` + 64 hex characters

### 2️⃣ Get Test USDC

1. Mở: https://faucet.circle.com
2. Chọn **Arc Testnet**
3. Paste **Address** từ bước 1
4. Request USDC

### 3️⃣ Tạo `.env` file

**PowerShell:**
```powershell
cd backend
@"
# Arc Network Configuration (REQUIRED)
ARC_RPC_URL=https://rpc.testnet.arc.network

# Funder Wallet (REQUIRED - for real USDC transfers)
FUNDER_PRIVATE_KEY=0xPASTE_YOUR_PRIVATE_KEY_HERE

# Server Port
PORT=3001
"@ | Out-File -FilePath .env -Encoding UTF8
```

**Sau đó edit `.env` và paste private key thật vào!**

### 4️⃣ Chạy Backend

```powershell
cd backend
npm run dev
```

✅ Nếu thấy:
```
✅ Funder wallet loaded: 0x...
💰 Funder balance: XX.XXXXXX USDC
🚀 Backend running on http://localhost:3001
```

→ **Backend đã sẵn sàng!**

### 5️⃣ Chạy Frontend

```powershell
cd frontend
npm run dev
```

Mở http://localhost:5173 và test!

---

**Nếu lỗi:**
- Check `.env` file có tồn tại không
- Check private key có đúng format không (0x...)
- Check có USDC trong wallet không

Xem [TROUBLESHOOTING.md](TROUBLESHOOTING.md) cho chi tiết.

