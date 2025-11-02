# 🚀 Deployment Guide

## Development Mode (Recommended for now)

Chạy riêng frontend và backend:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev

# Open: http://localhost:5173
```

**Vite proxy** sẽ tự động forward `/api` requests tới backend port 3001.

---

## Production Mode (Single Port)

Build và chạy tất cả từ backend:

```bash
# One-time setup
cd backend
npm run prod
```

**Chạy cả build backend + frontend + serve từ port 3001**

Open: http://localhost:3001

---

## Manual Production Build

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build

# Run production server
cd ../backend
NODE_ENV=production npm start
```

---

## Environment Variables

Backend cần `.env` file:

```env
ARC_RPC_URL=https://rpc.testnet.arc.network
FUNDER_PRIVATE_KEY=0xYourPrivateKey
PORT=3001
```

---

## Port Configuration

- **Development**: Frontend (5173) + Backend (3001)
- **Production**: Single server (3001)

### Change Port:

**Backend:**
```env
PORT=8080  # in .env or environment
```

**Frontend (dev):**
```typescript
// vite.config.ts
server: { port: 3000 }
```

---

## Deployment Options

### 1. Heroku / Render / Railway

```bash
# Install dependencies
cd backend
npm install

# Build
npm run build

# Set env vars
NODE_ENV=production
ARC_RPC_URL=...
FUNDER_PRIVATE_KEY=...

# Start
npm start
```

### 2. Docker

**Dockerfile:**
```dockerfile
FROM node:18

WORKDIR /app

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy source
COPY . .

# Build
RUN cd backend && npm run build
RUN cd frontend && npm run build

WORKDIR /app/backend

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

**Build & Run:**
```bash
docker build -t arc-onboard .
docker run -p 3001:3001 --env-file backend/.env arc-onboard
```

### 3. Vercel / Netlify

**Not recommended** vì cần backend Node.js. Use Heroku/Railway instead.

---

## Troubleshooting

### Port already in use

```bash
# Kill process on port 3001 (Windows)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change port in .env
PORT=8080
```

### Frontend not loading in production

Check:
1. Frontend built: `ls frontend/dist`
2. NODE_ENV=production set
3. Static serving enabled in server.ts

### API calls fail

Check:
1. Backend running
2. Port configuration
3. CORS enabled
4. API routes defined before static serving

---

## Quick Commands

```bash
# Dev mode
cd backend && npm run dev
cd frontend && npm run dev

# Production
cd backend && npm run prod

# Build only
cd backend && npm run build
cd frontend && npm run build
```

---

**Choose the deployment method that suits your needs!**

