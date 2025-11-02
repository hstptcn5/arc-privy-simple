# 🔥 REAL MODE Setup - Gửi USDC Thật trên Arc

Dự án này **không dùng mock** - mọi thứ đều real trên Arc Testnet!

## ⚡ Quick Start (< 10 phút)

### Bước 1: Cài Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### Bước 2: Tạo Funder Wallet

```bash
cd contracts

# Cài Foundry nếu chưa có
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Tạo wallet mới
cast wallet new
```

Copy **Address** và **Private key**.

### Bước 3: Nhận Test USDC

1. Truy cập: https://faucet.circle.com
2. Chọn **Arc Testnet**
3. Paste **Address** vừa tạo
4. Request USDC
5. Đợi vài giây để receive

### Bước 4: Config Backend

```bash
cd backend
cp env.example .env
```

Edit `.env`:
```env
ARC_RPC_URL=https://rpc.testnet.arc.network
FUNDER_PRIVATE_KEY=0xYourPrivateKeyHere
PORT=3001
```

⚠️ **Lưu ý**: Thay `0xYourPrivateKeyHere` bằng private key thật!

### Bước 5: Start Server

```bash
npm run dev
```

**Expected output:**
```
✅ Funder wallet loaded: 0x...
💰 Funder balance: XX.XXXXXX USDC
🚀 Backend running on http://localhost:3001
📡 Arc RPC: https://rpc.testnet.arc.network
```

Nếu thấy warning "Low balance", cần request thêm USDC.

### Bước 6: Start Frontend

```bash
cd frontend
npm run dev
```

Mở http://localhost:5173

## 🎯 Test Flow

1. Click "Send me $5 USDC"
2. Nhập email: `test@example.com`
3. Xem transaction thật trên Arcscan!

**Console output:**
```
Onboarding user with email: test@example.com
Created wallet: 0x...
Created smart account: 0x...
💸 Transferring 5 USDC to 0x...
📝 Transaction submitted: 0xabc123...
✅ Transaction confirmed in block 12345
```

## 🔍 Verify trên Arc Explorer

Copy transaction hash và check:
https://testnet.arcscan.app/tx/YOUR_TX_HASH

## ⚠️ Lỗi thường gặp

### "FUNDER_PRIVATE_KEY is required"

→ Bạn chưa set private key trong `.env`

**Fix:**
```bash
# Edit backend/.env
FUNDER_PRIVATE_KEY=0xYourActualPrivateKey
```

### "Insufficient balance: X USDC (need 5 USDC)"

→ Funder wallet không đủ USDC

**Fix:**
1. Check balance: https://testnet.arcscan.app/address/YOUR_ADDRESS
2. Request thêm USDC: https://faucet.circle.com

### "Nonce too low"

→ Private key bị sai hoặc format không đúng

**Fix:**
- Private key phải start với `0x`
- Phải có 66 ký tự (bao gồm `0x` + 64 hex)
- Check lại từ output `cast wallet new`

### Server không start

**Fix:**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Cần >= 18
```

## 🎓 Understanding

### Real USDC on Arc

- Arc dùng USDC làm **native gas token**
- Không phải wrapped token, là native!
- Balance check như ETH trên Ethereum
- Decimals: Native = 18, ERC-20 interface = 6

### Transaction Flow

```
Email → Hash → Wallet Address → Smart Account → USDC Transfer
                ↓                    ↓               ↓
           Deterministic        Deterministic    Real on Arc!
```

### Gas Fees

- Arc: ~$0.01 per transaction (ổn định)
- Finality: <1 second
- No reorgs (deterministic finality)

## 💰 Cost Breakdown

**Setup:**
- Test USDC: **FREE** từ faucet
- Wallet creation: **FREE**

**Per User:**
- $5 USDC to user wallet
- ~$0.01 gas fee cho transfer
- Total: ~$5.01 per onboard

**Budget recommendation:**
- Start: Request 100-200 USDC từ faucet
- Enough for 20-40 users
- Request thêm khi cần

## 🚀 Production Considerations

**Current implementation:**
- ✅ Real Arc Network integration
- ✅ Real USDC transfers
- ✅ Deterministic wallets
- ⚠️ Email-based (insecure for production)
- ⚠️ No rate limiting
- ⚠️ No authentication

**For production:**
1. Replace email-based wallets với Circle Wallets/Dynamic
2. Add rate limiting (express-rate-limit)
3. Add authentication (JWT/OAuth)
4. Monitor usage & costs
5. Set max users per funder
6. Implement auto-refund logic

## 📚 Resources

- **Arc Docs**: https://docs.arc.network
- **USDC Faucet**: https://faucet.circle.com
- **Arc Explorer**: https://testnet.arcscan.app
- **Arc RPC**: https://rpc.testnet.arc.network
- **Contract Address**: https://testnet.arcscan.app/address/0x3600000000000000000000000000000000000000

## 🎉 Success Criteria

Khi setup đúng, bạn sẽ thấy:

1. ✅ Server starts không error
2. ✅ Shows funder balance > 10 USDC
3. ✅ Có thể click button và nhận USDC
4. ✅ Transaction hash clickable
5. ✅ Balance update on Arcscan
6. ✅ Finality < 1 second

---

**Bạn đã sẵn sàng gửi USDC thật trên Arc!** 🔥

