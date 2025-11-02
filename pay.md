ARC ONBOARD MVP – TỪ A ĐẾN Z (TỰ TẠO TRONG 10 PHÚT)Mục tiêu: Email → Smart Wallet → Nhận $5 USDC (0 gas, 0 seed)
BƯỚC 1: Tạo cấu trúc thư mụcbash

mkdir arc-onboard-mvp && cd arc-onboard-mvp
mkdir backend frontend contracts

BƯỚC 2: Tạo Backend (Node.js + Express)backend/package.jsonjson

{
  "name": "arc-onboard-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node src/server.ts"
  },
  "dependencies": {
    "@circle-finance/wallets": "^1.0.0",
    "@zerodev/sdk": "^5.0.0",
    "pimlico": "^0.1.0",
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "ts-node": "^10.9.1",
    "typescript": "^5.2.2"
  }
}

backend/.envenv

CIRCLE_API_KEY=ck_test_XXXXXXXXXXXXXXXXXXXXXXXX
ZERODEV_PROJECT_ID=zd_arc_123456789
PIMLICO_API_KEY=pim_test_XXXXXXXXXXXXXXXXXXXXXXXX
ARC_RPC_URL=https://rpc.testnet.arc.network
FAUCET_ADDRESS=0xYourFaucetAfterDeploy

backend/src/server.tsts

import express from 'express';
import cors from 'cors';
import { createWallet } from '@circle-finance/wallets';
import { ZerodevKernel } from '@zerodev/sdk';
import { PimlicoPaymaster } from 'pimlico';
import { ethers } from 'ethers';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
const paymaster = new PimlicoPaymaster({
  endpoint: 'https://api.pimlico.io/v2/5042002',
  apiKey: process.env.PIMLICO_API_KEY!
});

app.post('/api/onboard', async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Tạo wallet bằng email
    const wallet = await createWallet({
      userId: email,
      blockchain: 'ARC-TESTNET',
      walletSetId: 'arc-onboard'
    });

    // 2. Tạo Smart Account
    const kernel = await ZerodevKernel.init({
      projectId: process.env.ZERODEV_PROJECT_ID!,
      owner: wallet.ecdsaPublicKey
    });

    const smartAccount = await kernel.getAddress();

    // 3. Gửi $5 USDC qua Paymaster
    const usdc = new ethers.Contract(
      '0x3600000000000000000000000000000000000000',
      ['function transfer(address,uint256)'],
      provider
    );

    const userOp = await kernel.createSignedUserOp({
      callData: usdc.interface.encodeFunctionData('transfer', [
        smartAccount,
        ethers.parseUnits('5', 6)
      ]),
      paymaster: paymaster.address
    });

    await paymaster.sponsorUserOp(userOp);

    res.json({ address: smartAccount, balance: '5.00' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});

BƯỚC 3: Tạo Frontend (React + Vite)frontend/package.jsonjson

{
  "name": "arc-onboard-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}

frontend/vite.config.tsts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()]
});

frontend/index.htmlhtml

<!DOCTYPE html>
<html>
  <head>
    <title>Arc Onboard</title>
    <meta charset="UTF-8" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

frontend/src/main.tsxtsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

frontend/src/App.tsxtsx

import { useState } from 'react';

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const onboard = async () => {
    setLoading(true);
    const email = prompt('Enter your email:');
    if (!email) return;

    const res = await fetch('http://localhost:3001/api/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    setResult(`You have $${data.balance} USDC!\nWallet: ${data.address}`);
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>Arc Onboard MVP</h1>
      <p>Get $5 USDC in 3 seconds – no wallet, no gas</p>
      <button onClick={onboard} disabled={loading} style={{ padding: '1rem', fontSize: '1.2rem' }}>
        {loading ? 'Creating...' : 'Send me $5 USDC'}
      </button>
      {result && <pre style={{ marginTop: '1rem', background: '#f0f0f0', padding: '1rem' }}>{result}</pre>}
    </div>
  );
}

export default App;

BƯỚC 4: Tạo Smart Contract (Foundry)contracts/foundry.tomltoml

[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
arc_testnet = "https://rpc.testnet.arc.network"

contracts/src/Faucet.solsolidity

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ArcOnboardFaucet {
    IERC20 public usdc = IERC20(0x3600000000000000000000000000000000000000);
    address public paymaster;

    constructor(address _paymaster) {
        paymaster = _paymaster;
    }

    function onboard(address user) external {
        require(msg.sender == paymaster, "Only paymaster");
        usdc.transfer(user, 5_000_000); // 5 USDC
    }
}

BƯỚC 5: Chạy toàn bộbash

# 1. Backend
cd backend && npm install && npm run dev

# 2. Frontend (terminal mới)
cd frontend && npm install && npm run dev

# 3. Deploy Faucet (terminal khác)
cd contracts
forge create src/Faucet.sol:ArcOnboardFaucet \
  --rpc-url $ARC_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args 0xYourPaymasterAddress \
  --broadcast

KẾT QUẢMở http://localhost:5173  
Nhập email → "You have $5.00 USDC!"  
Kiểm tra: https://testnet.arcscan.app/address/YOUR_SMART_ACCOUNT

API Key miễn phí (5 phút)Dịch vụ
Link
Circle Wallets
developers.circle.com → API Keys
Zerodev
zerodev.app → Create Project → Arc Testnet
Pimlico
pimlico.io → Dashboard → Testnet

