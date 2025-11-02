# 🔥 Quick Fix - Dùng Private Key của bạn

## Bạn đã có private key từ ví EVM? Perfect!

### Bước 1: Tạo file `.env`

**PowerShell:**
```powershell
cd backend
@"
ARC_RPC_URL=https://rpc.testnet.arc.network
FUNDER_PRIVATE_KEY=0xYOUR_KEY_HERE
PORT=3001
"@ | Out-File -FilePath .env -Encoding UTF8
```

### Bước 2: Edit `.env`

Mở file `backend\.env` và thay `0xYOUR_KEY_HERE` bằng private key của bạn:

```env
ARC_RPC_URL=https://rpc.testnet.arc.network
FUNDER_PRIVATE_KEY=0xABC123...   ← Đây là private key của bạn
PORT=3001
```

### Bước 3: Get USDC

1. Mở: https://faucet.circle.com
2. Chọn **Arc Testnet**
3. Paste **address** của private key đó
4. Request USDC

### Bước 4: Chạy

```powershell
cd backend
npm run dev
```

Done! ✅

