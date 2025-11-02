# 🎯 Single Port Setup

Đã config để có thể chạy frontend + backend chung 1 port!

## ✅ Đã Done

1. ✅ Frontend dùng relative API paths: `/api/onboard` (thay vì `http://localhost:3001/api`)
2. ✅ Vite proxy config cho dev mode
3. ✅ Backend serve static files trong production
4. ✅ Package.json scripts updated

## 🚀 Cách Chạy

### Option 1: Single Port (Recommended!)

**Build frontend once, then run backend:**

```bash
# Build frontend (one time)
cd frontend
npm run build

# Run backend
cd ../backend
npm run dev

# Browser: http://localhost:3001
```

Backend tự động detect và serve frontend từ `frontend/dist`!

### Option 2: Development Mode (2 terminals)

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend  
npm run dev

# Browser: http://localhost:5173
```

**Vite proxy** tự động forward `/api/*` → `http://localhost:3001/api/*`

### Option 3: Production Build

```bash
# Build everything
cd backend
npm run prod

# Browser: http://localhost:3001
```

Backend serve cả API và frontend static files!

## 📋 Changes Made

### 1. Frontend API Calls

**Before:**
```typescript
fetch('http://localhost:3001/api/onboard', ...)
```

**After:**
```typescript
fetch('/api/onboard', ...)  // Relative path
```

### 2. Vite Config

**Added proxy:**
```typescript
// frontend/vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

### 3. Backend Static Serving

**Added:**
```typescript
// backend/src/server.ts
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}
```

### 4. Build Script

**Added:**
```json
{
  "build:frontend": "cd ../frontend && npm run build",
  "prod": "npm run build && npm run build:frontend && NODE_ENV=production node dist/server.js"
}
```

## 🎯 Result

- ✅ **Dev**: Chạy riêng, vite proxy tự động
- ✅ **Prod**: 1 port, backend serve tất cả
- ✅ **API**: Luôn ở `/api/*` path
- ✅ **Frontend**: Relative paths work everywhere

## ⚠️ Note

**Production mode cần build frontend trước:**
```bash
cd frontend && npm run build
```

**Hoặc dùng script:**
```bash
cd backend && npm run prod
```

---

**Choose dev mode for development, prod mode for deployment!**

