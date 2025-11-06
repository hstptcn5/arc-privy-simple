# Hướng dẫn Setup Multisend Contract Address trên Vercel

## Vấn đề
Khi deploy lên Vercel, địa chỉ Multisend contract bị mất vì nó được lưu trong `localStorage` (chỉ có trong browser).

## Giải pháp: Sử dụng Environment Variable

### Bước 1: Lấy địa chỉ contract đã deploy
1. Deploy Multisend contract lên Arc Testnet
2. Copy địa chỉ contract (ví dụ: `0x1234...5678`)

### Bước 2: Thêm Environment Variable trên Vercel
1. Vào **Vercel Dashboard** → Chọn project
2. Vào **Settings** → **Environment Variables**
3. Thêm biến mới:
   - **Name**: `VITE_MULTISEND_ADDRESS` (cho Vite) hoặc `NEXT_PUBLIC_MULTISEND_ADDRESS` (cho Next.js)
   - **Value**: Địa chỉ contract đã deploy (ví dụ: `0x1234...5678`)
   - **Environment**: Chọn tất cả (Production, Preview, Development)
4. Click **Save**

### Bước 3: Redeploy
1. Vào **Deployments** tab
2. Click **Redeploy** trên deployment mới nhất
3. Hoặc push code mới lên Git

## Hoặc: Hardcode trong code

Nếu không muốn dùng environment variable, bạn có thể hardcode địa chỉ trong `frontend/src/multisendConfig.ts`:

```typescript
// Option 2: Hardcode deployed address here
const DEPLOYED_ADDRESS = '0x1234...5678'; // Replace with your deployed contract address

// Use environment variable first, then hardcoded, then localStorage
export const MULTISEND_ADDRESS = envAddress || DEPLOYED_ADDRESS || localStorageAddress;
```

**Lưu ý**: Hardcode không khuyến nghị vì:
- Phải commit địa chỉ vào Git
- Khó quản lý cho nhiều môi trường (testnet/mainnet)
- Không linh hoạt

## Kiểm tra
Sau khi setup, kiểm tra:
1. Build trên Vercel thành công
2. Ứng dụng hiển thị địa chỉ contract trong UI
3. Batch payments hoạt động bình thường

