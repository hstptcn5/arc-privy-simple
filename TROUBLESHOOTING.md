# 🔧 Troubleshooting Guide

## Error: "Failed to fetch"

### Nguyên nhân: Backend không chạy

**Kiểm tra:**
```bash
# Check backend có đang chạy không
curl http://localhost:3001/health

# Hoặc mở browser:
# http://localhost:3001/health
```

**Fix:**
1. Open terminal mới
2. `cd backend`
3. `npm run dev`
4. Đợi thấy: `🚀 Backend running on http://localhost:3001`

### Backend exits ngay lập tức

**Error message:** "FUNDER_PRIVATE_KEY is required but not set!"

**Fix:**
```bash
cd backend
cp env.example .env

# Edit .env với private key của bạn
# Thêm FUNDER_PRIVATE_KEY=0xYourKeyHere
```

### Backend starts nhưng không có USDC

**Warning:** "Low balance! Get more USDC"

**Fix:**
1. Check balance current: http://localhost:3001/health
2. Request USDC: https://faucet.circle.com
3. Restart backend sau khi nhận USDC

### Frontend không connect

**Check:**
- Backend đang chạy ở port 3001?
- `http://localhost:3001/health` return JSON?
- Browser console có CORS errors không?

**Fix:**
```bash
# Kill process on port 3001
# Windows PowerShell:
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }

# Restart backend
cd backend && npm run dev
```

### Contract deployment fails

**Error:** "insufficient funds"

**Fix:**
1. Check wallet balance: https://testnet.arcscan.app/address/YOUR_ADDRESS
2. Request thêm USDC từ faucet
3. Wait for confirmation (~5 seconds)

**Error:** "nonce too low"

**Fix:**
- Wait 10 seconds
- Try deploy again
- Hoặc check network connection

## Port đã được sử dụng

```bash
# Windows PowerShell - Find process using port 3001
Get-NetTCPConnection -LocalPort 3001

# Kill process
Stop-Process -Id <PID> -Force
```

## npm install fails

**Error:** Module not found

**Fix:**
```bash
# Clear cache
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Hoặc dùng admin rights
npm install --force
```

## TypeScript errors

**Fix:**
```bash
# Check version
node --version  # Should be >= 18
npm --version   # Should be >= 9

# Rebuild
npm run build
```

## Arc RPC connection issues

**Test RPC:**
```bash
curl -X POST https://rpc.testnet.arc.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Alternative RPC:**
- https://rpc.blockdaemon.testnet.arc.network
- https://rpc.drpc.testnet.arc.network
- https://rpc.quicknode.testnet.arc.network

Update `ARC_RPC_URL` trong `.env` nếu cần.

## Still stuck?

1. Check console logs (F12 trong browser)
2. Check backend logs trong terminal
3. Verify .env file exists và có đúng format
4. Restart everything: frontend, backend, browser

---

**Xem thêm:**
- [REAL_MODE_SETUP.md](REAL_MODE_SETUP.md)
- [START_HERE.md](START_HERE.md)

