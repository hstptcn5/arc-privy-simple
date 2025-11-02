# 🏗️ Architecture & Logic Flow

## Quy trình tổng quát

```
User nhập email → Backend tạo wallet → Gửi USDC → User nhận $5 USDC
```

## Logic chi tiết

### 1️⃣ Email → Wallet Address (Deterministic)

**Input:** Email của user  
**Output:** Wallet address cố định

**Cách hoạt động:**
```typescript
function createWalletFromEmail(email: string) {
  // Hash email thành private key
  const hash = ethers.id(email);
  // Tạo wallet từ private key đó
  const wallet = new ethers.Wallet(hash, provider);
  return wallet;
}
```

**Đặc điểm:**
- ✅ **Deterministic**: Cùng email → Cùng wallet address
- ✅ **No seed phrase**: User không cần lưu gì
- ✅ **Recoverable**: Biết email là recover được wallet

**Ví dụ:**
```
email: "test@example.com"
→ hash: 0xabc123...
→ wallet address: 0x1234...
→ MỖI LẦN chạy với email này = CÙNG address!
```

### 2️⃣ Wallet → Smart Account (Deterministic)

**Input:** Wallet owner address  
**Output:** Smart account address

**Cách hoạt động:**
```typescript
async function createSmartAccount(ownerAddress: string) {
  // Hash owner address thành salt
  const salt = ethers.id(ownerAddress);
  // Tạo address từ salt
  const smartAccountAddress = ethers.getAddress(
    '0x' + ethers.hexlify(ethers.getBytes(salt).slice(0, 20))
  );
  return smartAccountAddress;
}
```

**Đặc điểm:**
- ✅ **Deterministic**: Cùng owner → Cùng smart account
- ✅ **Consistent**: Mỗi lần gọi = cùng kết quả

**Production note:**
- MVP: Deterministic hash-based address
- Production: Nên dùng thật Account Abstraction SDK (Zerodev/Biconomy)

### 3️⃣ USDC Transfer (Real on Arc)

**Input:** Smart account address, amount  
**Output:** Transaction hash

**Cách hoạt động:**
```typescript
async function transferUSDC(to: string, amountUsd: number) {
  // Parse amount (18 decimals cho native USDC)
  const amount = ethers.parseUnits(amountUsd.toString(), 18);
  
  // Send transaction như gửi ETH
  const tx = await funderWallet.sendTransaction({
    to,
    value: amount
  });
  
  // Wait confirmation (<1 second)
  const receipt = await tx.wait();
  return receipt.hash;
}
```

**Đặc điểm:**
- ✅ **Real USDC**: Thật trên Arc Testnet
- ✅ **Instant**: Finalize <1 second
- ✅ **Native**: USDC là native token (không wrapped)

## Complete Flow

```
┌─────────────────┐
│  User nhập      │
│  email          │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Backend: /api/onboard      │
│  1. hash email → wallet     │
│  2. hash wallet → smart acct│
│  3. Send USDC to smart acct │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Arc Testnet Transaction    │
│  • From: Funder wallet      │
│  • To: Smart account        │
│  • Amount: 5.0 USDC         │
│  • Finalize: <1s            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Response to Frontend       │
│  • Address: 0x2126...7197   │
│  • Balance: 5.0 USDC        │
│  • TxHash: 0x77d1...a7eb    │
└─────────────────────────────┘
```

## Deterministic Mapping

| Email | Wallet Address | Smart Account |
|-------|---------------|---------------|
| `alice@test.com` | `0xABC...` | `0xDEF...` |
| `bob@test.com` | `0x123...` | `0x456...` |

**Mỗi email map to một cặp wallet+smart account cố định!**

## Why Deterministic?

**Lợi ích:**
1. **No onboarding spam**: User không thể claim nhiều lần với cùng email
2. **Recovery**: Chỉ cần nhớ email
3. **Identity binding**: Email = Wallet identity
4. **Simple UX**: Không cần seed phrase/keystore

**Trade-offs:**
- ⚠️ Không an toàn cho production (email có thể bị guess)
- ⚠️ Sẽ dùng SDK thật trong production

## Production Flow (Future)

**Hiện tại (MVP):**
```
Email → hash → wallet → hash → smart account → transfer
```

**Production:**
```
Email → Circle Wallets SDK → Wallet keys
     ↓
Zerodev/Biconomy SDK → Smart Account
     ↓
Pimlico Paymaster → Sponsored transaction
     ↓
Result
```

## Security Considerations

**MVP (Current):**
- ✅ Deterministic cho demo
- ⚠️ Không có rate limiting
- ⚠️ Email không verify
- ⚠️ Hash-based không an toàn

**Production needs:**
- Email verification (OTP/magic link)
- Rate limiting (express-rate-limit)
- Key derivation từ email (secure method)
- Audit smart account logic
- Multi-signature support
- Session keys management

## Key Decisions

1. **Deterministic wallets**: Chọn vì simplicity cho MVP
2. **Native USDC transfers**: Không dùng contract call, dùng native send
3. **No paymaster**: Tạm bỏ (có thể thêm sau)
4. **Direct transfers**: Funder wallet → User wallet, không qua contract

## Architecture Benefits

**Cho user:**
- ✅ Nhập email → Nhận USDC ngay
- ✅ Không cần cài ví
- ✅ Không seed phrase
- ✅ Instant finality

**Cho developer:**
- ✅ EVM-compatible dễ tích hợp
- ✅ USDC stable, predictable
- ✅ Fast confirmation
- ✅ Deterministic testing

---

**Summary:** Email → Deterministic address generation → Real USDC transfer on Arc!

