# 🔌 Wallet Connect Implementation Plan

## Hiện Tại (MVP)

**Flow:**
```
User nhập email → Backend tạo wallet → Backend gửi USDC từ FUNDER_PRIVATE_KEY
```

**Vấn đề:**
- Funder wallet controlled bởi server admin
- User không có control
- Không thể dùng wallet ngoài (MetaMask, etc.)

---

## Có 2 Hướng Triển Khai

### Option A: Direct Send từ User Wallet (Recommended)

**Flow mới:**
```
User connect MetaMask → User sign transaction → Send USDC trực tiếp
```

**Pros:**
- User full control
- Không cần funder wallet
- True peer-to-peer

**Cons:**
- User phải tự có USDC
- Không phù hợp cho "onboarding giveaway"

---

### Option B: Hybrid Approach (Best for Onboarding)

**Flow mới:**
```
1. Quick Onboard (existing): Email → Receive USDC từ funder
2. Wallet Connect: User connect MetaMask để manage/withdraw
```

**Pros:**
- Vẫn onboarding dễ
- User có thể import wallet vào MetaMask
- Flexible cho nhiều use case

---

## Recommended: Option C - Add MetaMask as Sender Option

**Triple Mode:**

### Mode 1: Onboard (Current)
- Email → Receive USDC from funder wallet
- Tạo wallet from email hash

### Mode 2: Connect & Send
- User connect MetaMask
- User tự send USDC (any amount, to any address)

### Mode 3: Import Wallet
- User nhập email → Generate wallet
- Import private key to MetaMask
- Manage trong MetaMask

---

## Implementation Priority

### Phase 1: Add MetaMask Send Mode (Simple)

**New UI:**
```
┌─────────────────────────────┐
│  Arc USDC Onboarding        │
├─────────────────────────────┤
│                             │
│  [Onboard Mode]  [Send Mode]│
│    ✓ Selected                │
│                             │
│  Email: ________________    │
│  Amount: _______________    │
│  [Send USDC]              │
└─────────────────────────────┘
```

**Features:**
- Toggle between Onboard / Send mode
- Connect MetaMask button
- Send USDC to any address
- From connected wallet

---

### Phase 2: Import Wallet (Advanced)

**New Feature:**
- "Export Wallet" button
- Generate private key from email
- QR code for easy import
- Instructions for MetaMask

---

### Phase 3: Circle Wallets / AA SDK (Production)

**Integrate:**
- Circle Wallets SDK
- Zerodev / Biconomy
- Social login (Google, etc.)
- True Account Abstraction

---

## Quick Implementation: Add MetaMask Send

**Steps:**

1. Install dependencies
2. Add wallet connect UI
3. Add send from wallet endpoint
4. Update frontend for 2 modes

---

## Tech Stack Options

### Option 1: Vanilla MetaMask (Easiest)

```bash
npm install @metamask/detect-provider
```

**Pros:**
- Simple
- Native MetaMask
- No extra SDK

**Cons:**
- MetaMask only
- Need manual chain switching (Arc)

### Option 2: WalletConnect

```bash
npm install @walletconnect/web3modal
```

**Pros:**
- Multiple wallets
- Better UX
- QR code connect

**Cons:**
- More complex
- Extra dependencies

### Option 3: ethers.js Only

Already have ethers.js!

**Use:**
```typescript
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
```

**Pros:**
- No extra deps
- Works with any EIP-1193 wallet

**Cons:**
- Manual implementation

---

## Recommended Approach: ethers.js BrowserProvider

**Already have ethers.js - just use it!**

```typescript
// frontend/src/App.tsx
import { ethers } from 'ethers';

const connectWallet = async () => {
  if (!window.ethereum) {
    alert('Install MetaMask!');
    return;
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  
  return { provider, signer, address };
};
```

---

## Next Steps

**Bạn muốn implement:**

1. **MetaMask Send Mode** - User tự send từ MetaMask
2. **Export Wallet** - Export private key từ email
3. **Both** - Full dual mode

**Recommendation:** Bắt đầu với #1 (MetaMask Send) vì đơn giản và useful nhất!

---

**Let me know which approach you prefer! 🚀**

