# Arc USDC Onboarding - Real Mode

> Email → Smart Wallet → Nhận $5 USDC thật trên Arc Testnet (<1 giây finality)

⚠️ **REAL MODE ONLY** - Gửi USDC thật trên Arc Network, không có mock!

## 🌟 Tính năng

- ✅ **Email-based onboarding**: Tạo ví chỉ từ email
- ✅ **Smart Account**: Sử dụng Account Abstraction với Zerodev
- ✅ **Paymaster sponsorship**: Không cần gas phí
- ✅ **Instant finality**: Giao dịch finalize trong <1 giây (Arc BFT)
- ✅ **USDC native gas**: Phí giao dịch bằng USDC stablecoin
- ✅ **Modern UI**: Giao diện React đẹp, responsive

## 🏗️ Kiến trúc

```
┌─────────────┐
│   Frontend  │ React + Vite
│  (Port 5173)│
└──────┬──────┘
       │ HTTP POST /api/onboard
       ▼
┌─────────────┐
│   Backend   │ Node.js + Express
│  (Port 3001)│
└──────┬──────┘
       │
       ├─► Circle Wallets (Email → Wallet)
       ├─► Zerodev (Smart Account)
       ├─► Pimlico Paymaster (Gas sponsorship)
       │
       ▼
┌─────────────┐
│ Arc Testnet │
│  USDC Funds │
└─────────────┘
```

## 📋 Yêu cầu

- Node.js >= 18
- npm hoặc yarn
- Foundry (cho smart contracts)
- Git

## ⚡ Quick Start (< 5 phút)

**Xem hướng dẫn chi tiết:** [REAL_MODE_SETUP.md](REAL_MODE_SETUP.md)

**Tóm tắt:**
1. Cài dependencies: `npm install` trong backend & frontend
2. Lấy test USDC: https://faucet.circle.com
3. Tạo wallet: `cast wallet new`
4. Fund wallet với USDC
5. Set `FUNDER_PRIVATE_KEY` trong `.env`
6. Chạy!

## 🚀 Hướng dẫn cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd arc-payusdc
```

### 2. Setup Backend

```bash
cd backend
npm install
cp env.example .env
# Edit .env với API keys của bạn
npm run dev
```

**Configuration (TẤT CẢ BẮT BUỘC):**
```env
ARC_RPC_URL=https://rpc.testnet.arc.network
FUNDER_PRIVATE_KEY=0xYourPrivateKeyHere  # BẮT BUỘC!
```

**Setup theo thứ tự:**
1. Nhận test USDC từ faucet: https://faucet.circle.com
2. Tạo funder wallet: `cast wallet new`
3. Fund wallet với USDC từ faucet
4. Copy private key vào `backend/.env`
5. Chạy `npm run dev` trong backend
6. Server sẽ tự check balance khi start

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Deploy Smart Contract (Tùy chọn)

```bash
cd contracts

# Install Foundry (nếu chưa có)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Deploy contract
forge create src/Faucet.sol:ArcOnboardFaucet \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## 🎯 Sử dụng

1. Đảm bảo backend đang chạy với đủ USDC
2. Mở http://localhost:5173
3. Nhấn button "Send me $5 USDC"
4. Nhập email của bạn
5. Xem transaction thật trên Arcscan!

**Transaction hash sẽ link đến**: https://testnet.arcscan.app

⏱️ **Finality**: <1 giây trên Arc!

## 📚 Arc Network

Arc là Layer-1 blockchain EVM-compatible với:
- **USDC as gas**: Phí giao dịch bằng stablecoin
- **Deterministic finality**: Giao dịch finalize <1 giây
- **Enterprise-grade**: Built bởi Circle

### Contract Addresses

| Contract | Address | Decimals |
|----------|---------|----------|
| USDC | `0x3600000000000000000000000000000000000000` | 6 |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 |

### Network Details

- **RPC**: https://rpc.testnet.arc.network
- **Chain ID**: 5042002
- **Explorer**: https://testnet.arcscan.app
- **Faucet**: https://faucet.circle.com

## 🔧 Scripts

### Backend

```bash
npm run dev      # Development mode với hot reload
npm run build    # Build TypeScript
npm start        # Production mode
```

### Frontend

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

### Contracts

```bash
forge build      # Compile contracts
forge test       # Run tests
forge script     # Deploy scripts
```

## 📂 Cấu trúc thư mục

```
arc-payusdc/
├── backend/
│   ├── src/
│   │   └── server.ts       # Express API server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Main React component
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── contracts/
│   ├── src/
│   │   ├── Faucet.sol      # USDC Faucet contract
│   │   └── Faucet.t.sol    # Tests
│   └── foundry.toml
└── README.md
```

## 🔒 Bảo mật

⚠️ **Chú ý**: Dự án này yêu cầu **REAL MODE** - gửi USDC thật trên Arc Testnet!

**Yêu cầu:**
- ✅ FUNDER_PRIVATE_KEY bắt buộc (không có mock)
- ✅ Test USDC từ faucet
- ✅ Wallet có USDC để fund users

**Setup Real Mode:**
1. Nhận test USDC: https://faucet.circle.com
2. Tạo wallet: `cast wallet new` trong thư mục `contracts/`
3. Copy private key vào `.env`: `FUNDER_PRIVATE_KEY=0x...`
4. Start server → Sẽ check balance và exit nếu thiếu USDC

**Tính năng:**
- ✅ Tạo wallet từ email (deterministic hash-based)
- ✅ Smart account addresses (deterministic)
- ✅ **Real USDC transfers** trên Arc Testnet
- ✅ Instant finality (<1 second)
- ✅ Arcscan explorer links
- ✅ Balance checking & validation

**Production-ready features:**
- Đã dùng real Arc RPC và native USDC transfers
- Có thể tích hợp: Circle Wallets, Zerodev, Pimlico SDKs
- Cần thêm: Rate limiting, auth, monitoring, compliance

## 🤝 Đóng góp

PRs welcome! Vui lòng:
1. Fork project
2. Tạo feature branch
3. Commit changes
4. Push và tạo PR

## 📄 License

MIT

## 🙏 Credits

- **Arc Network**: Circle's stablecoin-native L1
- **Zerodev**: Account Abstraction SDK
- **Pimlico**: Paymaster infrastructure
- **Circle Wallets**: Wallet-as-a-service

## 📖 Documentation

- [Arc Docs](https://docs.arc.network)
- [Arc Explorer](https://testnet.arcscan.app)
- [Circle Developer Portal](https://developers.circle.com)

## 🐛 Troubleshooting

### Backend không start

```bash
# Check Node version
node --version  # Should be >= 18

# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check .env file
cat backend/.env
```

### Frontend không kết nối backend

```bash
# Check CORS settings trong backend/src/server.ts
# Check backend đang chạy ở port 3001
curl http://localhost:3001/health
```

### Contract deployment failed

```bash
# Check Foundry installed
forge --version

# Check Arc RPC
curl -X POST https://rpc.testnet.arc.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Get testnet USDC từ faucet
# https://faucet.circle.com
```

## 📞 Support

- Discord: [Arc Community](https://discord.gg/arc)
- Email: support@circle.com
- Twitter: [@ArcNetwork](https://twitter.com/ArcNetwork)

---

**Built with ❤️ on Arc Network**

