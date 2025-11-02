# 🔧 Decimals Fix Explained

## The Problem

Transaction `0x77d1...` sent only `0.000000000005 USDC` instead of `5.0 USDC`

## Root Cause

**Before fix (wrong):**
```typescript
const USDC_DECIMALS = 6;
const amount = ethers.parseUnits("5.0", 6);
// Result: 5_000_000 wei = 0.000005 USDC
```

**After fix (correct):**
```typescript
const USDC_NATIVE_DECIMALS = 18;
const amount = ethers.parseUnits("5.0", 18);
// Result: 5_000_000_000_000_000_000 wei = 5.0 USDC
```

## Arc Documentation

From [Arc USDC docs](https://docs.arc.network/arc/references/contract-addresses#USDC):

> **Native USDC balance** uses **18 decimals** of precision  
> **ERC-20 interface** uses **6 decimals**

> **Note:** Native balances behave like ETH on Ethereum and are represented with 18 decimals.

## The Fix Applied

```typescript
// Line 18-21 in backend/src/server.ts
const USDC_NATIVE_DECIMALS = 18;  // For native transactions
const USDC_ERC20_DECIMALS = 6;    // For display only

// Line 102: Parse with 18 decimals
const amount = ethers.parseUnits(amountUsd.toString(), USDC_NATIVE_DECIMALS);

// Line 83: Display with 6 decimals (user-friendly)
const formatted = ethers.formatUnits(balance, USDC_ERC20_DECIMALS);
```

## Action Required

**Restart backend** để apply fix:

```bash
# Stop backend (Ctrl+C in terminal)
# Restart
cd backend && npm run dev
```

After restart:
- New transactions will send `5.0 USDC` correctly
- Old transaction `0x77d1...` is invalid (sent tiny amount by mistake)

## Verification

**Check backend logs:**
```
✅ Funder wallet loaded: 0x...
💰 Funder balance: XX.XXXXXX USDC
```

**Test new transaction:**
1. Open frontend
2. Enter new email
3. Check transaction on Arcscan
4. Should see: `5.0 USDC` or `5.000000 USDC`

## Math

```
5.0 USDC
= 5 * 10^6 (6 decimals)
= 5 * 10^18 (18 decimals) ← Correct for native

Wrong calculation:
  5 * 10^6 wei = 0.000005 USDC

Correct calculation:
  5 * 10^18 wei = 5.0 USDC ✅
```

---

**The code is fixed. Now RESTART the backend!**

