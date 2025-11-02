# 🔐 Privy Setup Guide

## ✅ Privy Integration Complete!

Privy đã được tích hợp vào Arc Onboard MVP. Bạn chỉ cần lấy App ID là có thể dùng được!

## 📝 Step 1: Get Privy App ID

1. **Đăng ký tài khoản Privy:**
   - Truy cập: https://dashboard.privy.com/users/sign_up
   - Đăng ký bằng email hoặc Google

2. **Tạo App mới:**
   - Click "Create App"
   - Đặt tên app: `Arc Onboard MVP`
   - Chọn environment: `Development` (cho Arc Testnet)

3. **Copy App ID:**
   - Trong dashboard, tìm "App ID"
   - Copy App ID (ví dụ: `clp1234567890abcdef`)

## 🔧 Step 2: Add App ID to Code

Mở file `frontend/src/main.tsx` và thay thế:

```typescript
// TỪ:
appId="YOUR_PRIVY_APP_ID_HERE"

// THÀNH:
appId="clp_xxxxxxxxxxxxx" // App ID của bạn
```

## 🚀 Step 3: Test

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Truy cập http://localhost:5173 và test:

1. Click "Login with Privy"
2. Chọn login method (email hoặc Google)
3. Nhập email hoặc dùng Google
4. Kiểm tra email để xác nhận (nếu dùng email)
5. Done! Wallet tự động tạo

## ✨ Features

### 🔐 Authentication
- ✅ Email login
- ✅ Google login  
- ✅ MetaMask connect
- ✅ Apple/Facebook (configurable)

### 💰 Wallet
- ✅ Embedded wallet tự động tạo
- ✅ Self-custodial (user owns keys)
- ✅ Zero gas experience
- ✅ Native USDC support

### 📱 UI
- ✅ Modern, clean design
- ✅ Responsive
- ✅ Auto-load balance
- ✅ Transaction tracking

## 🎯 Migration from Triple Mode

**Old (Triple Mode):**
- ❌ Manual email hash
- ❌ Manual private key management
- ❌ Limited to MetaMask
- ❌ Backend generates wallets

**New (Privy):**
- ✅ Production-ready auth
- ✅ No key management for users
- ✅ All wallet types
- ✅ Privy generates wallets

## 📚 Docs

- **Privy Docs:** https://docs.privy.io
- **Embedded Wallets:** https://docs.privy.io/guide/react/wallets/embedded
- **Arc Network:** https://arc.network

## ⚠️ Important Notes

1. **App ID là public** - OK để commit vào git
2. **No backend changes needed** - Privy handles all auth
3. **Free tier** - Enough for testing/development
4. **Arc Testnet only** - Mainnet requires paid tier

## 🐛 Troubleshooting

**"App ID not found":**
- Check App ID trong dashboard
- Restart frontend server

**"Network not supported":**
- Check `arcTestnet` config in `main.tsx`
- Ensure chain ID is 5042002

**"Balance not loading":**
- Check console for errors
- Ensure backend is running
- Check Arc RPC is accessible

**"Login not working":**
- Check email spam folder
- Try Google login instead
- Check browser console for errors

---

## 🎉 Done!

Bạn đã setup xong Privy! App sẵn sàng test trên Arc Testnet.

**Next:** Get USDC from faucet: https://faucet.circle.com

