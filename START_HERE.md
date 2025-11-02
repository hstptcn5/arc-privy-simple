# 🚀 BẮT ĐẦU Ở ĐÂY

Chào mừng đến với **Arc USDC Onboarding** - Real Mode!

## ⚡ Bắt đầu trong 3 bước

### 1️⃣ Install

```bash
# Backend
cd backend && npm install

# Frontend  
cd frontend && npm install
```

### 2️⃣ Setup USDC

```bash
# 1. Lấy test USDC
# Mở: https://faucet.circle.com
# Chọn Arc Testnet

# 2. Tạo funder wallet
cd contracts
cast wallet new

# 3. Fund wallet với USDC từ faucet
```

### 3️⃣ Run

```bash
# Terminal 1: Backend
cd backend
cp env.example .env
# Edit .env với FUNDER_PRIVATE_KEY
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Browser: http://localhost:5173
```

## ✅ Khi thành công

Backend sẽ show:
```
✅ Funder wallet loaded: 0x...
💰 Funder balance: XX.XXXXXX USDC
🚀 Backend running on http://localhost:3001
```

Frontend: Click button → Nhập email → Nhận USDC thật!

Transaction sẽ visible trên: https://testnet.arcscan.app

## 📖 Docs

- **Chi tiết setup**: [REAL_MODE_SETUP.md](REAL_MODE_SETUP.md)
- **API docs**: [README.md](README.md)
- **Arc Network**: [Arc Docs](https://docs.arc.network)

## 🆘 Cần giúp?

**Error "FUNDER_PRIVATE_KEY is required"**
→ Set private key trong `backend/.env`

**"Insufficient balance"**
→ Request thêm USDC từ faucet

**Server không start**
→ Check `backend/.env` có đúng format không

Xem [REAL_MODE_SETUP.md](REAL_MODE_SETUP.md) cho troubleshooting chi tiết.

---

**Let's onboard users with $5 USDC on Arc!** 🔥

