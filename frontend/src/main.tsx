import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import { defineChain } from 'viem';
import { Buffer } from 'buffer';
import App from './App';
import './index.css';

// Polyfill for browser
(window as any).Buffer = Buffer;

// Define Arc Testnet for Privy
const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6, // Display decimals
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrivyProvider
      appId="cmewiuzl900mylc0csry901tg"
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'light',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users',
          },
        },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
        externalWallets: {
          solana: {
            connect: false,
          },
        },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
);

