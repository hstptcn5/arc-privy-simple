# 🔧 Privy Troubleshooting

## ❌ Error: 403 Forbidden on Email Login

**Error:** `POST https://auth.privy.io/api/v1/passwordless/init 403 (Forbidden)`

### Cause
App ID không đúng hoặc email login chưa được enable trong Privy Dashboard.

## ✅ Solution: Check Privy Dashboard

### Step 1: Verify App ID

1. Go to https://dashboard.privy.com
2. Sign in
3. Select your app: "Arc Onboard MVP" (hoặc app name của bạn)
4. Find "App ID" section
5. Copy the **correct App ID**

### Step 2: Check Login Methods

In Privy Dashboard:

1. Go to **Configuration** → **Login Methods**
2. Make sure:
   - ✅ **Email** is enabled
   - ✅ **Google** is enabled (optional)
   - ✅ **Wallet Connect** is enabled

### Step 3: Check Network Configuration

1. Go to **Configuration** → **Networks**
2. Make sure Arc Testnet is allowed:
   - Chain ID: 5042002
   - Or "Allow custom networks" is enabled

### Step 4: Update App ID

```typescript
// frontend/src/main.tsx
<PrivyProvider
  appId="YOUR_CORRECT_APP_ID_HERE"  // Paste from dashboard
  ...
/>
```

### Step 5: Restart

```bash
# Stop current dev server (Ctrl+C)
# Restart
cd frontend
npm run dev
```

## 🆘 Alternative: Use Wallet-Only Login

If email login doesn't work, you can temporarily use wallet-only:

```typescript
// frontend/src/main.tsx
config={{
  loginMethods: ['wallet'],  // Only wallet, no email
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'all-users',
    },
  },
  defaultChain: arcTestnet,
  supportedChains: [arcTestnet],
  externalWallets: {
    solana: { connect: false },
  },
}}
```

**Note:** This removes email login but allows MetaMask/WalletConnect.

## 🔍 Other Possible Issues

### Issue 1: Network Not Supported

**Error:** "Configured chains are not supported"

**Solution:** 
- Check Privy Dashboard → Networks
- Enable "Custom Networks" or add Arc Testnet manually

### Issue 2: CSP/Iframe Error

**Error:** "frame-ancestors violates CSP"

**Solution:**
- This is a warning, usually not blocking
- If blocking, check Privy Dashboard → Settings → Allowed Origins
- Add `http://localhost:5173`

### Issue 3: Solana Warnings

**Error:** "Solana wallet login enabled but no connectors"

**Solution:** Already fixed with `solana: { connect: false }`

## 📝 Quick Test

After fixing App ID, you should see:

1. ✅ Page loads without 403 errors
2. ✅ "Login with Privy" button appears
3. ✅ Click button → Privy modal opens
4. ✅ Can select email or MetaMask

## 🎯 Still Not Working?

Share:
1. Your App ID (first 8 chars): `cmewiuzl...`
2. Privy Dashboard screenshot of Login Methods
3. New console errors after restart

---

**Most likely fix:** Update App ID from Privy Dashboard!

