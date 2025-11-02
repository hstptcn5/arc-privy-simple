# Arc Pay USDC - Token Wallet & Marketplace

> Ứng dụng ví token và marketplace trên Arc Testnet với khả năng deploy, gửi/nhận tokens, và quản lý tokens on-chain.

## 🌟 Ứng dụng của dự án

Arc Pay USDC là một ứng dụng Web3 hoàn chỉnh cho phép người dùng:

- **Deploy ERC-20 Tokens**: Tạo và deploy token tùy chỉnh trên Arc Testnet với một vài cú click
- **Token Wallet**: Quản lý và gửi/nhận tokens (USDC native và ERC-20 tokens)
- **Token Marketplace**: Khám phá và duyệt tất cả tokens đã được deploy trên network
- **Transaction History**: Theo dõi lịch sử giao dịch của ví đang kết nối
- **On-chain Registry**: Tất cả tokens được lưu trữ và quản lý on-chain thông qua TokenRegistry contract

## ✨ Tính năng chính

### 1. **Token Deployment** 🚀
- Deploy ERC-20 tokens với tên, symbol, decimals và initial supply tùy chỉnh
- Tự động mint initial supply cho deployer
- Tự động đăng ký token vào TokenRegistry on-chain
- Hiển thị balance của token vừa deploy ngay lập tức

### 2. **Token Wallet** 💼
- Xem balance của USDC native và tất cả deployed tokens
- Gửi tokens (USDC native, deployed tokens, hoặc custom token address)
- Tự động load và hiển thị balance của token
- Format số chính xác cho cả số lớn và số nhỏ

### 3. **Transaction History** 📜
- Xem lịch sử giao dịch từ Arcscan API
- Chỉ fetch transactions của ví đang kết nối (tiết kiệm bandwidth)
- Hiển thị sent/received với timestamp và link đến Arcscan
- Refresh để cập nhật lịch sử mới nhất

### 4. **Token Marketplace** 🏪
- Duyệt tất cả tokens đã được deploy trên network
- Tìm kiếm tokens theo tên hoặc symbol
- Xem thông tin chi tiết: deployer, initial supply, deploy timestamp
- Highlight tokens mà bạn sở hữu
- Link đến Arcscan để xem chi tiết contract

### 5. **Wallet Integration** 🔐
- **MetaMask**: Kết nối và sử dụng MetaMask wallet
- **Privy Embedded Wallet**: Tạo ví embedded cho người mới
- Tự động chuyển sang Arc Testnet khi connect MetaMask
- Ưu tiên external wallets (MetaMask) over embedded wallet
- Hiển thị loại wallet đang sử dụng trong UI

### 6. **On-chain Token Registry** 📋
- TokenRegistry contract quản lý tất cả tokens on-chain
- Tự động đăng ký tokens khi deploy
- Fetch tokens từ registry (không cần localStorage)
- Fallback về localStorage nếu chưa có registry

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────┐
│          Frontend (React)               │
│  - Token Deployment UI                  │
│  - Wallet Integration (Privy + MetaMask)│
│  - Transaction History                  │
│  - Token Marketplace                    │
└──────────────┬──────────────────────────┘
               │
               ├─► Privy (Auth & Wallets)
               │
               ▼
┌─────────────────────────────────────────┐
│        Arc Testnet                      │
│                                          │
│  ┌──────────────────────────────┐       │
│  │  TokenRegistry Contract      │       │
│  │  0x85667fc0...952D73DFe91... │       │
│  └──────────────────────────────┘       │
│                                          │
│  ┌──────────────────────────────┐       │
│  │  SimpleToken (ERC-20)         │       │
│  │  User deployed tokens         │       │
│  └──────────────────────────────┘       │
└─────────────────────────────────────────┘
```

## 📋 Smart Contracts

### TokenRegistry
**Address**: `0x85667fc0ad255789814B952D73DFe91bd9A58C21`

TokenRegistry là contract trung tâm quản lý tất cả tokens được deploy trên network:

- `registerToken()`: Đăng ký token mới vào registry
- `getTokensByDeployer()`: Lấy tất cả tokens của một deployer
- `getAllTokens()`: Lấy tất cả tokens trong registry
- `getTotalTokens()`: Lấy tổng số tokens đã đăng ký

**Arcscan**: [https://testnet.arcscan.app/address/0x85667fc0ad255789814B952D73DFe91bd9A58C21](https://testnet.arcscan.app/address/0x85667fc0ad255789814B952D73DFe91bd9A58C21)

### SimpleToken (ERC-20)
Standard ERC-20 token contract với các tính năng:
- Transfer, approve, allowance
- Mint tokens cho deployer khi khởi tạo
- Tùy chỉnh name, symbol, decimals, initial supply

## 🚀 Cài đặt và Chạy

### Yêu cầu
- Node.js >= 18
- npm hoặc yarn
- MetaMask (tùy chọn, cho external wallet)

### 1. Clone repository

```bash
git clone <repository-url>
cd arc-payusdc
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend sẽ chạy tại: http://localhost:5173

### 3. Deploy TokenRegistry (Nếu chưa có)

1. Mở ứng dụng và login với Privy
2. Vào tab "Deploy"
3. Click "Deploy TokenRegistry"
4. Copy địa chỉ deployed và cập nhật vào `frontend/src/registryConfig.ts`

Hoặc sử dụng `frontend/src/DeployRegistry.tsx` component.

### 4. Bắt đầu sử dụng

1. Mở http://localhost:5173
2. Login với Privy (email hoặc MetaMask)
3. Nếu dùng MetaMask, ứng dụng sẽ tự động chuyển sang Arc Testnet
4. Deploy tokens, gửi/nhận, và khám phá marketplace!

## 🎯 Hướng dẫn sử dụng

### Deploy Token

1. Vào tab **"Deploy"**
2. Điền thông tin token:
   - **Name**: Tên token (VD: "My Token")
   - **Symbol**: Ký hiệu (VD: "MTK")
   - **Decimals**: Số chữ số thập phân (thường là 18)
   - **Initial Supply**: Số lượng token ban đầu
3. Click **"Deploy Token"**
4. Confirm transaction trong MetaMask hoặc Privy
5. Token sẽ được deploy và tự động mint cho bạn!

### Gửi Tokens

1. Vào tab **"Send"**
2. Chọn loại token:
   - **USDC**: Native USDC trên Arc
   - **Deployed Tokens**: Tokens bạn đã deploy
   - **Custom**: Nhập contract address
3. Nhập địa chỉ người nhận và số lượng
4. Click **"Send"** và confirm transaction

### Xem Transaction History

1. Vào tab **"History"**
2. Xem tất cả transactions của ví đang kết nối
3. Click vào transaction hash để xem trên Arcscan
4. Click **"Refresh"** để cập nhật

### Khám phá Marketplace

1. Vào tab **"Marketplace"**
2. Xem tất cả tokens đã được deploy trên network
3. Sử dụng search bar để tìm tokens
4. Tokens bạn sở hữu sẽ được highlight
5. Click vào token để xem trên Arcscan

## 🔧 Cấu hình

### Privy App ID

Privy App ID hiện tại: `cmewiuzl900mylc0csry901tg`

Để thay đổi, sửa trong `frontend/src/main.tsx`:

```typescript
<PrivyProvider
  appId="YOUR_PRIVY_APP_ID"
  ...
/>
```

### Token Registry Address

Địa chỉ TokenRegistry mặc định: `0x85667fc0ad255789814B952D73DFe91bd9A58C21`

Để thay đổi, sửa trong `frontend/src/registryConfig.ts`:

```typescript
export const REGISTRY_ADDRESS = '0xYourRegistryAddress';
```

Hoặc nó sẽ tự động load từ `localStorage.getItem('registryAddress')` khi deploy.

## 📊 Network Info

**Arc Testnet**

- **RPC URL**: https://rpc.testnet.arc.network
- **Chain ID**: 5042002
- **Explorer**: https://testnet.arcscan.app
- **Faucet**: https://faucet.circle.com
- **Native Currency**: USDC (18 decimals on-chain, 6 decimals for display)

## 🛠️ Tech Stack

### Frontend
- **React** 18.2
- **TypeScript** 5.2
- **Vite** 5.0
- **Ethers.js** 6.15 - Blockchain interaction
- **Privy** 3.5 - Wallet & Authentication
- **Viem** 2.38 - Chain configuration

### Smart Contracts
- **Solidity** 0.8.30
- **Hardhat** / **solc** - Compilation
- **ERC-20** Standard tokens

## 📂 Cấu trúc thư mục

```
arc-payusdc/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main application component
│   │   ├── DeployToken.tsx      # Token deployment component
│   │   ├── DeployRegistry.tsx   # Registry deployment component
│   │   ├── registryConfig.ts    # Registry address & ABI
│   │   └── main.tsx             # Privy setup & entry point
│   ├── package.json
│   └── vite.config.ts
├── contracts/
│   ├── src/
│   │   ├── SimpleToken.sol      # ERC-20 token contract
│   │   └── TokenRegistry.sol    # Token registry contract
│   ├── SimpleToken.json         # Compiled ABI & bytecode
│   ├── TokenRegistry.json       # Compiled ABI & bytecode
│   └── compile-*.js             # Compilation scripts
└── README.md
```

## 🔒 Bảo mật

- **Private Keys**: Không bao giờ được lưu trữ hoặc gửi lên server
- **MetaMask**: Tất cả transactions được ký trong MetaMask
- **Privy Embedded Wallet**: Sử dụng MPC (Multi-Party Computation) cho bảo mật
- **On-chain Registry**: Tất cả token data được lưu trữ on-chain, không phụ thuộc backend

## 🐛 Troubleshooting

### MetaMask không tự động chuyển network

- Kiểm tra xem MetaMask đã có Arc Testnet chưa
- Nếu chưa, ứng dụng sẽ tự động thêm network
- Đảm bảo bạn đã approve request switch network

### Không thấy tokens trong balance

- Đảm bảo bạn đã deploy TokenRegistry trước
- Check xem token đã được đăng ký vào Registry chưa
- Refresh balance bằng cách click "Refresh" button
- Kiểm tra Arcscan để verify balance on-chain

### Transaction history không hiển thị

- Đảm bảo wallet đang kết nối đúng
- Check Arcscan API có đang hoạt động không
- Thử refresh lại

## 🤝 Đóng góp

PRs welcome! Vui lòng:
1. Fork project
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT

## 🙏 Credits

- **Arc Network**: Stablecoin-native Layer-1 blockchain by Circle
- **Privy**: Wallet infrastructure and authentication
- **Ethers.js**: Ethereum JavaScript library
- **React**: UI framework

## 📖 Documentation

- [Arc Network Docs](https://docs.arc.network)
- [Arc Explorer](https://testnet.arcscan.app)
- [Privy Docs](https://docs.privy.io)
- [Ethers.js Docs](https://docs.ethers.org)

---

**Built with ❤️ on Arc Network**
