# 🔍 Quick Test Guide

## Issue: Blank White Screen

### Step 1: Check Browser Console

Open browser DevTools (F12) và xem tab Console:

**Possible Errors:**

1. **"App ID not found"**
   - Check App ID trong `main.tsx`
   - Verify trong Privy dashboard

2. **"Network error"**
   - Check internet connection
   - Arc RPC might be down

3. **"Cannot find module"**
   - Reinstall dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. **"Privy init error"**
   - App ID invalid
   - Network blocked by firewall

### Step 2: Simple Test

Tạo test file đơn giản:

```typescript
// frontend/src/App-test.tsx
function App() {
  return <div>Hello World - App is working!</div>;
}
export default App;
```

Nếu test file hiển thị → Privy issue  
Nếu vẫn blank → Vite/build issue

### Step 3: Check Logs

```bash
# Frontend terminal
cd frontend
npm run dev

# Look for:
# - "Local: http://localhost:5173"
# - "ready in XXXms"
# - Errors in red
```

### Step 4: Common Fixes

**Fix 1: Clear cache**
```bash
cd frontend
rm -rf node_modules dist
npm install
npm run dev
```

**Fix 2: Check App ID**
- Dashboard: https://dashboard.privy.com
- Copy correct App ID
- Update `main.tsx`

**Fix 3: Network issues**
- Check firewall
- Try different network
- Use VPN if needed

### Step 5: Still Blank?

Please provide:
1. Browser console errors (F12 → Console tab)
2. Terminal output from `npm run dev`
3. Screenshot of blank screen
4. Browser you're using (Chrome/Firefox/etc)

---

## Expected Behavior

1. **Page loads** → Shows "Loading Privy..."
2. **Privy ready** → Shows "Login with Privy" button
3. **Click login** → Privy modal opens
4. **Choose method** → Email/Google/MetaMask
5. **Authenticated** → Shows wallet screen

If stuck at step 1 → Privy init issue  
If stuck at step 2 → Authentication issue

