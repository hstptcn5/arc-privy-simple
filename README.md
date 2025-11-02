# Arc Pay USDC - Token Wallet & Marketplace

> A complete Web3 application for deploying, managing, and trading ERC-20 tokens on Arc Testnet with on-chain token registry.

## Project Overview

Arc Pay USDC is a comprehensive Web3 application that enables users to:

- **Deploy ERC-20 Tokens**: Create and deploy custom tokens on Arc Testnet with just a few clicks
- **Token Wallet**: Manage and send/receive tokens (native USDC and ERC-20 tokens)
- **Token Marketplace**: Discover and browse all tokens deployed on the network
- **Transaction History**: Track transaction history for the connected wallet
- **On-chain Registry**: All tokens are stored and managed on-chain through the TokenRegistry contract

## Applications & Use Cases

This project serves as a complete token management and trading platform with various real-world applications:

### 1. Token Creation Platform
- **For Developers**: Quickly create and deploy test tokens for dApp development
- **For Communities**: Launch community tokens or governance tokens
- **For Businesses**: Create branded tokens or loyalty points tokens
- **For Education**: Teach token economics and blockchain fundamentals

### 2. Token Wallet & Management
- **Personal Token Portfolio**: Manage all your deployed tokens in one place
- **Multi-token Support**: Handle both native USDC and custom ERC-20 tokens
- **Balance Tracking**: Real-time balance updates across all tokens
- **Transaction Monitoring**: Complete transaction history for auditing

### 3. Token Marketplace & Discovery
- **Token Browser**: Discover new tokens created by the community
- **Token Search**: Find tokens by name, symbol, or contract address
- **Token Analytics**: View deployment details, supply, and ownership
- **Public Registry**: Transparent on-chain token directory

### 4. On-chain Token Registry
- **Decentralized Directory**: All tokens registered on-chain (no central server)
- **Query Interface**: Query tokens by deployer or browse all tokens
- **Immutable Records**: Token information permanently stored on blockchain
- **Future Extensions**: Foundation for token swaps, auctions, or trading features

### 5. Web3 Wallet Integration
- **MetaMask Support**: Full compatibility with MetaMask and other EIP-1193 wallets
- **Embedded Wallets**: Email-based wallet creation for non-crypto users
- **Network Management**: Automatic Arc Testnet configuration
- **Seamless UX**: Easy wallet switching and management

### Potential Extensions
- **Token Swapping**: Build DEX features on top of the registry
- **Token Staking**: Implement staking mechanisms for registered tokens
- **Token Auctions**: Create auction system for token sales
- **Governance**: Add voting and governance features for token communities
- **Multi-chain Support**: Extend to other EVM-compatible chains

## Features

### 1. Token Deployment
- Deploy ERC-20 tokens with custom name, symbol, decimals, and initial supply
- Automatic minting of initial supply to deployer
- Automatic token registration to on-chain TokenRegistry
- Instant balance display for newly deployed tokens

### 2. Token Wallet
- View balance of native USDC and all deployed tokens
- Send tokens (native USDC, deployed tokens, or custom token address)
- Automatic loading and display of token balances
- Accurate number formatting for both large and small values

### 3. Transaction History
- View transaction history from Arcscan API
- Only fetches transactions for the connected wallet (saves bandwidth)
- Display sent/received transactions with timestamps and Arcscan links
- Refresh to update with latest history

### 4. Token Marketplace
- Browse all tokens deployed on the network
- Search tokens by name or symbol
- View detailed information: deployer, initial supply, deploy timestamp
- Highlight tokens that you own
- Link to Arcscan for contract details

### 5. Wallet Integration
- **MetaMask**: Connect and use MetaMask wallet
- **Privy Embedded Wallet**: Create embedded wallet for newcomers
- Automatic network switch to Arc Testnet when connecting MetaMask
- Prioritizes external wallets (MetaMask) over embedded wallet
- Displays wallet type currently in use in the UI

### 6. On-chain Token Registry
- TokenRegistry contract manages all tokens on-chain
- Automatic token registration upon deployment
- Fetch tokens from registry (no localStorage needed)
- Fallback to localStorage if registry not available

## Architecture

```
┌─────────────────────────────────────────┐
│          Frontend (React)               │
│  - Token Deployment UI                 │
│  - Wallet Integration (Privy + MetaMask)│
│  - Transaction History                  │
│  - Token Marketplace                   │
└──────────────┬──────────────────────────┘
               │
               ├─► Privy (Auth & Wallets)
               │
               ▼
┌─────────────────────────────────────────┐
│        Arc Testnet                      │
│                                          │
│  ┌──────────────────────────────┐       │
│  │  TokenRegistry Contract      │       │
│  │  0x85667fc0...952D73DFe91... │       │
│  └──────────────────────────────┘       │
│                                          │
│  ┌──────────────────────────────┐       │
│  │  SimpleToken (ERC-20)         │       │
│  │  User deployed tokens         │       │
│  └──────────────────────────────┘       │
└─────────────────────────────────────────┘
```

## Smart Contracts

### TokenRegistry
**Address**: `0x85667fc0ad255789814B952D73DFe91bd9A58C21`

TokenRegistry is the central contract that manages all tokens deployed on the network:

- `registerToken()`: Register a new token in the registry
- `getTokensByDeployer()`: Get all tokens by a specific deployer
- `getAllTokens()`: Get all tokens in the registry
- `getTotalTokens()`: Get total number of registered tokens

**Arcscan**: [https://testnet.arcscan.app/address/0x85667fc0ad255789814B952D73DFe91bd9A58C21](https://testnet.arcscan.app/address/0x85667fc0ad255789814B952D73DFe91bd9A58C21)

### SimpleToken (ERC-20)
Standard ERC-20 token contract with features:
- Transfer, approve, allowance
- Mint tokens to deployer on initialization
- Customizable name, symbol, decimals, initial supply

## Installation & Setup

### Requirements
- Node.js >= 18
- npm or yarn
- MetaMask (optional, for external wallet)

### 1. Clone Repository

```bash
git clone <repository-url>
cd arc-payusdc
```

### 2. Setup Frontend

```bash
cd frontend
npm install
```

### 3. Run Development Server

From the root directory:

```bash
npm run dev
```

This will start the frontend development server on **http://localhost:5173**.

**Note**: The frontend connects directly to the Arc blockchain via Privy and doesn't require a separate backend server. If you need backend API features, you can run both:

```bash
npm run dev:both
```

This runs both frontend (port 5173) and backend (port 3001) simultaneously.

### 4. Deploy TokenRegistry (If not already deployed)

1. Open the application at http://localhost:5173 and login with Privy
2. Go to "Deploy" tab
3. Click "Deploy TokenRegistry"
4. Copy the deployed address and update `frontend/src/registryConfig.ts`

Or use the `frontend/src/DeployRegistry.tsx` component.

### 5. Start Using

1. Open http://localhost:5173
2. Login with Privy (email or MetaMask)
3. If using MetaMask, the app will automatically switch to Arc Testnet
4. Deploy tokens, send/receive, and explore the marketplace!

## Usage Guide

### Deploy Token

1. Go to **"Deploy"** tab
2. Fill in token information:
   - **Name**: Token name (e.g., "My Token")
   - **Symbol**: Token symbol (e.g., "MTK")
   - **Decimals**: Number of decimal places (usually 18)
   - **Initial Supply**: Initial token amount
3. Click **"Deploy Token"**
4. Confirm transaction in MetaMask or Privy
5. Token will be deployed and automatically minted to your wallet!

### Send Tokens

1. Go to **"Send"** tab
2. Select token type:
   - **USDC**: Native USDC on Arc
   - **Deployed Tokens**: Tokens you've deployed
   - **Custom**: Enter contract address
3. Enter recipient address and amount
4. Click **"Send"** and confirm transaction

### View Transaction History

1. Go to **"History"** tab
2. View all transactions for the connected wallet
3. Click on transaction hash to view on Arcscan
4. Click **"Refresh"** to update

### Explore Marketplace

1. Go to **"Marketplace"** tab
2. View all tokens deployed on the network
3. Use search bar to find tokens
4. Your owned tokens will be highlighted
5. Click on token to view on Arcscan

## Configuration

### Privy App ID

Current Privy App ID: `cmewiuzl900mylc0csry901tg`

To change, edit `frontend/src/main.tsx`:

```typescript
<PrivyProvider
  appId="YOUR_PRIVY_APP_ID"
  ...
/>
```

### Token Registry Address

Default TokenRegistry address: `0x85667fc0ad255789814B952D73DFe91bd9A58C21`

To change, edit `frontend/src/registryConfig.ts`:

```typescript
export const REGISTRY_ADDRESS = '0xYourRegistryAddress';
```

Or it will automatically load from `localStorage.getItem('registryAddress')` when deployed.

## Network Information

**Arc Testnet**

- **RPC URL**: https://rpc.testnet.arc.network
- **Chain ID**: 5042002
- **Explorer**: https://testnet.arcscan.app
- **Faucet**: https://faucet.circle.com
- **Native Currency**: USDC (18 decimals on-chain, 6 decimals for display)

## Tech Stack

### Frontend
- **React** 18.2
- **TypeScript** 5.2
- **Vite** 5.0
- **Ethers.js** 6.15 - Blockchain interaction
- **Privy** 3.5 - Wallet & Authentication
- **Viem** 2.38 - Chain configuration

### Smart Contracts
- **Solidity** 0.8.30
- **Hardhat** / **solc** - Compilation
- **ERC-20** Standard tokens

## Project Structure

```
arc-payusdc/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main application component
│   │   ├── DeployToken.tsx      # Token deployment component
│   │   ├── DeployRegistry.tsx   # Registry deployment component
│   │   ├── registryConfig.ts    # Registry address & ABI
│   │   └── main.tsx             # Privy setup & entry point
│   ├── package.json
│   └── vite.config.ts
├── contracts/
│   ├── src/
│   │   ├── SimpleToken.sol      # ERC-20 token contract
│   │   └── TokenRegistry.sol    # Token registry contract
│   ├── SimpleToken.json         # Compiled ABI & bytecode
│   ├── TokenRegistry.json       # Compiled ABI & bytecode
│   └── compile-*.js             # Compilation scripts
└── README.md
```

## Security

- **Private Keys**: Never stored or sent to server
- **MetaMask**: All transactions are signed in MetaMask
- **Privy Embedded Wallet**: Uses MPC (Multi-Party Computation) for security
- **On-chain Registry**: All token data stored on-chain, no backend dependency

## Deploy to Vercel

### Step-by-Step Guide

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **"Add New Project"** or **"Import Project"**
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. **CRITICAL - Configure Build Settings**:
   
   In the **"Configure Project"** page:
   
   - **Root Directory**: Click **"Override"** → Type: `frontend` → Save
   - **Framework Preset**: Click **"Override"** → Select **"Other"** (DO NOT select "Vite")
   - **Build Command**: Click **"Override"** → Type: `npm run build`
   - **Output Directory**: Click **"Override"** → Type: `dist`
   - **Install Command**: Click **"Override"** → Type: `npm install`
   
5. Click **"Deploy"**

### Important Notes

- **Root Directory MUST be `frontend`** - This is critical!
- **Framework Preset MUST be "Other"** - Not "Vite" or any other framework
- Vercel will automatically detect the static files after build

### Troubleshooting

If you get errors:

- **"No entrypoint found"**: Framework Preset must be "Other", not "Vite". Also ensure Root Directory is `frontend`
- **"Cannot read properties"**: Make sure Root Directory is set to `frontend` (not root)
- **"Command exited with 1"**: Check that `frontend/package.json` exists and dependencies are correct
- **"Cannot find module"**: Ensure all dependencies are in `frontend/package.json`

**Most common fix**: Delete the project on Vercel, create a new one, and set Framework Preset to "Other" (not Vite)!

## Contributing

PRs welcome! Please:
1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Credits

- **Arc Network**: Stablecoin-native Layer-1 blockchain by Circle
- **Privy**: Wallet infrastructure and authentication
- **Ethers.js**: Ethereum JavaScript library
- **React**: UI framework

## Documentation

- [Arc Network Docs](https://docs.arc.network)
- [Arc Explorer](https://testnet.arcscan.app)
- [Privy Docs](https://docs.privy.io)
- [Ethers.js Docs](https://docs.ethers.org)

---

**Built on Arc Network**
