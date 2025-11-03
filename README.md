# Arc Pay USDC - Token Wallet & Marketplace

> A complete Web3 application for deploying, managing, and trading ERC-20 tokens on Arc Testnet with on-chain token registry.

**Live Demo**: [https://arc-privy-simple-backend.vercel.app/](https://arc-privy-simple-backend.vercel.app/)

## Project Overview

Arc Pay USDC is a comprehensive Web3 application that enables users to:

- **Deploy ERC-20 Tokens**: Create and deploy custom tokens on Arc Testnet with just a few clicks
- **Liquid Pricing with AMM**: Deploy tokens with instant liquidity pools using Automated Market Maker
- **Token Trading**: Buy and sell tokens directly through AMM pools
- **Price Charts**: View real-time price history with interactive charts
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

### 3. Token Marketplace & Trading
- **Token Browser**: Discover new tokens created by the community
- **Token Search**: Find tokens by name, symbol, or contract address
- **Token Analytics**: View deployment details, supply, and ownership
- **Live Price Display**: Real-time token prices from AMM pools
- **Token Detail Pages**: Deep dive into token information with price charts
- **Trading Interface**: Buy and sell tokens directly through AMM
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

### 4. Automated Market Maker (AMM) & Trading
- **Liquidity Pools**: Create pools when deploying tokens or add liquidity later
- **Dynamic Pricing**: Token prices determined by supply and demand (constant product formula)
- **Buy/Sell Tokens**: Trade tokens directly through AMM pools
- **Price History**: Track price movements over time with interactive charts
- **Real-time Quotes**: See exact amounts before executing trades
- **Pool Management**: View pool reserves and liquidity status

### Potential Extensions
- **Token Staking**: Implement staking mechanisms for registered tokens
- **Token Auctions**: Create auction system for token sales
- **Governance**: Add voting and governance features for token communities
- **Advanced Charting**: Add technical indicators and more detailed analytics
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
- Real-time price display for tokens with liquidity pools
- Highlight tokens that you own
- Link to Arcscan for contract details
- **Token Detail Pages**: Click on tokens to view detailed trading interface

### 5. Wallet Integration
- **MetaMask**: Connect and use MetaMask wallet
- **Privy Embedded Wallet**: Create embedded wallet for newcomers
- Automatic network switch to Arc Testnet when connecting MetaMask
- Prioritizes external wallets (MetaMask) over embedded wallet
- Displays wallet type currently in use in the UI

### 6. Automated Market Maker (AMM)
- **SimpleAMM Contract**: Constant product formula (x * y = k) for pricing
- **Liquidity Pools**: Each token can have a pool paired with USDC
- **Create Pools**: Add liquidity when deploying or create pools manually
- **Buy/Sell**: Execute swaps with real-time price quotes
- **Price Discovery**: Dynamic pricing based on pool reserves
- **Pool Status**: Track which tokens have active liquidity pools

### 7. Price History & Charts
- **Real-time Charts**: Interactive SVG charts showing 24h price history
- **Local Storage**: Price data collected and stored in browser
- **Automatic Updates**: Prices tracked when refreshing token details
- **Historical Data**: View price movements over time
- **Visual Analytics**: Easy-to-read charts with grid lines and labels

### 8. On-chain Token Registry
- TokenRegistry contract manages all tokens on-chain
- Automatic token registration upon deployment
- Pool address tracking for tokens with liquidity
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
│  - AMM Trading Interface                │
│  - Price Charts & Analytics             │
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
│  │  SimpleAMM Contract           │       │
│  │  Liquidity pools & trading     │       │
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

### SimpleAMM
**Address**: `0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5` (default)

Automated Market Maker contract using constant product formula (x * y = k):

- `createPool()`: Create a new liquidity pool for a token
- `addLiquidity()`: Add liquidity to an existing pool
- `buyTokens()`: Swap USDC for tokens
- `sellTokens()`: Swap tokens for USDC
- `getPrice()`: Get current token price
- `getReserves()`: Get pool reserves (token and USDC)
- `getBuyQuote()`: Calculate tokens received for USDC amount
- `getSellQuote()`: Calculate USDC received for token amount
- `poolExists()`: Check if a pool exists for a token

**Key Features**:
- Each pool pairs a token with native USDC
- Dynamic pricing based on reserves
- Price = USDC Reserve / Token Reserve
- Slippage protection built-in
- Events emitted for all operations (PoolCreated, Swap, LiquidityAdded, etc.)

**Arcscan**: [https://testnet.arcscan.app/address/0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5](https://testnet.arcscan.app/address/0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5)

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
3. **Optional - Create Liquidity Pool**:
   - Check "Create Liquidity Pool" checkbox
   - Enter initial token amount to add to pool (default: 50% of supply)
   - Enter initial USDC amount (default: 100 USDC)
4. Click **"Deploy Token"**
5. Confirm transaction(s) in MetaMask or Privy
6. Token will be deployed, minted to your wallet, and pool created (if enabled)!

**Note**: If you deploy without a pool, you can create one later from the Marketplace.

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
5. View real-time prices for tokens with liquidity pools
6. **For tokens with pools**: Click **"View Details & Trade →"** to open token detail page
7. **For tokens without pools**: Click **"Create Pool"** to add liquidity manually
8. Click on token card to view on Arcscan

### Trade Tokens (Buy/Sell)

1. In Marketplace, click **"View Details & Trade →"** on any token with a pool
2. On the token detail page:
   - View price chart showing 24h price history
   - See current price, your balances, and pool reserves
   - Click **"Buy CHARL"** or **"Sell CHARL"** tab
3. Enter amount to buy/sell
4. View quote showing exact amount you'll receive
5. Click **"Buy"** or **"Sell"** and confirm transaction
6. Transaction will execute and balances will update

### Create Liquidity Pool (Manual)

1. Go to **"Marketplace"** tab
2. Find a token without a liquidity pool (marked with ⚠️)
3. Click **"Create Pool"** button
4. Enter:
   - **Token Amount**: Amount of tokens to add
   - **USDC Amount**: Amount of USDC to pair with
5. Click **"Create Pool"** and confirm transaction
6. Pool will be created and token will become tradeable!

## Configuration

### Privy App ID

Current Privy App ID: `cmhhuc79100e1kw0ctnh9xyjd`

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

### AMM Contract Address

Default AMM address: `0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5`

To change, edit `frontend/src/ammConfig.ts`:

```typescript
export const DEFAULT_AMM_ADDRESS = '0xYourAMMAddress';
```

Or it will automatically load from `localStorage.getItem('ammAddress')` when deployed via the UI.

To deploy a new AMM contract:
1. Go to **"Deploy"** tab
2. Click **"Deploy SimpleAMM"**
3. Address will be automatically saved to localStorage

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
│   │   ├── DeployAMM.tsx        # AMM contract deployment component
│   │   ├── BuySellToken.tsx     # Trading interface component
│   │   ├── TokenDetail.tsx      # Token detail page with price chart
│   │   ├── registryConfig.ts    # Registry address & ABI
│   │   ├── ammConfig.ts         # AMM address & ABI
│   │   └── main.tsx             # Privy setup & entry point
│   ├── package.json
│   └── vite.config.ts
├── contracts/
│   ├── src/
│   │   ├── SimpleToken.sol      # ERC-20 token contract
│   │   ├── TokenRegistry.sol    # Token registry contract
│   │   └── SimpleAMM.sol        # Automated Market Maker contract
│   ├── SimpleToken.json         # Compiled ABI & bytecode
│   ├── TokenRegistry.json       # Compiled ABI & bytecode
│   ├── SimpleAMM.json           # Compiled ABI & bytecode
│   └── compile-*.js             # Compilation scripts
└── README.md
```

## Security

- **Private Keys**: Never stored or sent to server
- **MetaMask**: All transactions are signed in MetaMask
- **Privy Embedded Wallet**: Uses MPC (Multi-Party Computation) for security
- **On-chain Registry**: All token data stored on-chain, no backend dependency

## Deploy to Vercel

**Live Application**: [https://arc-privy-simple-backend.vercel.app/](https://arc-privy-simple-backend.vercel.app/)

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
