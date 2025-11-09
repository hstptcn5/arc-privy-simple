# Arc Dex - Token Launchpad & Trading Platform

A comprehensive decentralized exchange (DEX) application for deploying, managing, and trading ERC-20 tokens on Arc Testnet with Automated Market Maker (AMM), on-chain token registry, and invoice-based payment flows.

**Live Demo**: [https://arc-privy-simple-backend.vercel.app/](https://arc-privy-simple-backend.vercel.app/)

## Overview

Arc Dex is a complete Web3 DEX platform that enables users to deploy custom ERC-20 tokens, create liquidity pools, execute batch transfers, trade tokens through Automated Market Makers, and manage both their portfolio and invoicing workflows in one interface. The platform features real-time price charts, an on-chain token registry, and seamless wallet integration for both crypto-native and non-crypto users.

### Key Capabilities

- Deploy ERC-20 tokens with optional liquidity pool creation
- Trade tokens through AMM with real-time price discovery
- View interactive price charts with multiple timeframes
- Manage token portfolio and transaction history
- Browse decentralized token marketplace
- Send and receive tokens (native USDC and ERC-20)
- Create, track, and share on-chain invoices with optional pay-per-link flows
- Execute multi-recipient batch transfers with smart gas management and status reporting

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

## Features

### Token Deployment
- Deploy ERC-20 tokens with custom name, symbol, decimals, and initial supply
- Automatic minting of initial supply to deployer address
- Automatic token registration to on-chain TokenRegistry
- Optional liquidity pool creation during deployment
- Instant balance display for newly deployed tokens

### Automated Market Maker (AMM)
- Constant product formula (x * y = k) for dynamic pricing
- Liquidity pools pairing tokens with native USDC
- Create pools during token deployment or add liquidity manually
- Buy and sell tokens with real-time price quotes
- Price discovery based on pool reserves
- Pool status tracking for all tokens

### Trading Interface
- Dedicated token detail pages with integrated trading
- Real-time price quotes before execution
- Buy and sell functionality with slippage protection
- Pool reserves and liquidity information
- Balance updates after successful trades

### Price Charts & Analytics
- TradingView Lightweight Charts integration
- Line chart and candlestick chart (OHLC) views
- Multiple timeframe options (1h, 4h, 24h, 7d)
- Real-time price data collection from AMM
- Automatic OHLC conversion for candlestick display
- Professional chart styling with dark theme, crosshair, and grid lines

### Token Marketplace
- Browse all tokens deployed on the network
- Search functionality by name or symbol
- Detailed token information (deployer, supply, timestamp)
- Real-time price display for tokens with liquidity pools
- Ownership highlighting for user's tokens
- Direct links to Arcscan for contract verification
- Token detail pages with trading interface
- Publish public payment links by generating invoices directly from the dashboard

### On-chain Invoicing & Payments
- Generate professional invoices with token selection, discounts, and tax inputs
- Support both public invoices (anyone with the link can pay) and private invoices (restricted recipient address)
- Automatically track invoice lifecycle (pending, paid, expired) using smart contract events
- Seamless wallet prompts for payers to settle invoices in native USDC or configured ERC-20 tokens
- Export invoice data for accounting and share payment links with clients instantly

### Batch Transfers
- Upload or compose multi-recipient payout lists directly in the dashboard
- Support for native USDC and any registered ERC-20 tokens with automatic decimal handling
- Pre-flight validation to catch duplicate addresses, malformed inputs, and insufficient balances
- Aggregate transaction submission that optimizes gas usage while providing per-recipient status
- Detailed completion summary with downloadable CSV for reconciliation

### Token Wallet & Management
- View balances for native USDC and all deployed tokens
- Send tokens to any address (USDC, deployed tokens, or custom ERC-20)
- Automatic balance loading and updates
- Accurate number formatting for various decimal precisions
- Multi-token portfolio management

### Transaction History
- View complete transaction history for connected wallet
- Fetched from Arcscan API
- Display sent and received transactions with timestamps
- Direct links to transaction details on Arcscan
- Manual refresh functionality

### Wallet Integration
- MetaMask support with automatic Arc Testnet configuration
- Privy embedded wallets for email-based authentication
- External wallet prioritization (MetaMask over embedded)
- Seamless wallet switching
- Network management and automatic chain switching

### On-chain Token Registry
- Decentralized token directory stored on blockchain
- TokenRegistry contract manages all token records
- Automatic registration upon token deployment
- Pool address tracking for tokens with liquidity
- Query tokens by deployer or browse all tokens
- Immutable on-chain records

## Smart Contracts

### TokenRegistry
**Address**: `0x85667fc0ad255789814B952D73DFe91bd9A58C21`

Central contract managing all tokens deployed on the network.

**Functions**:
- `registerToken()`: Register a new token in the registry
- `getTokensByDeployer()`: Get all tokens by a specific deployer
- `getAllTokens()`: Get all tokens in the registry
- `getTotalTokens()`: Get total number of registered tokens
- `setPoolAddress()`: Associate a liquidity pool address with a token

**Arcscan**: [View on Arcscan](https://testnet.arcscan.app/address/0x85667fc0ad255789814B952D73DFe91bd9A58C21)

### SimpleToken (ERC-20)
Standard ERC-20 token contract with the following features:
- Standard ERC-20 transfer, approve, and allowance functions
- Customizable name, symbol, and decimals
- Initial supply minting to deployer on initialization
- Full ERC-20 compliance

### SimpleAMM
**Address**: `0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5` (default)

Automated Market Maker contract implementing the constant product formula (x * y = k).

**Functions**:
- `createPool()`: Create a new liquidity pool for a token
- `addLiquidity()`: Add liquidity to an existing pool
- `buyTokens()`: Swap USDC for tokens
- `sellTokens()`: Swap tokens for USDC
- `getPrice()`: Get current token price in USDC
- `getReserves()`: Get pool reserves (token and USDC amounts)
- `getBuyQuote()`: Calculate tokens received for a given USDC amount
- `getSellQuote()`: Calculate USDC received for a given token amount
- `poolExists()`: Check if a pool exists for a token

**Features**:
- Each pool pairs a token with native USDC
- Dynamic pricing based on reserve ratios
- Price = USDC Reserve / Token Reserve
- Built-in slippage protection through constant product formula
- Events emitted for all operations (PoolCreated, Swap, LiquidityAdded)

**Arcscan**: [View on Arcscan](https://testnet.arcscan.app/address/0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5)

## Installation & Setup

### Prerequisites
- Node.js >= 18
- npm or yarn package manager
- MetaMask browser extension (optional, for external wallet)

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd arc-dex
```

2. **Install Dependencies**
```bash
cd frontend
npm install
```

3. **Start Development Server**
```bash
npm run dev
```

The application will be available at **http://localhost:5173**.

**Note**: The frontend connects directly to the Arc blockchain via Privy and doesn't require a separate backend server.

4. **Deploy Smart Contracts** (if not already deployed)

The TokenRegistry and SimpleAMM contracts may already be deployed. If you need to deploy new instances:

- Go to the "Deploy" tab in the application
- Use "Deploy TokenRegistry" and "Deploy SimpleAMM" components
- Copy deployed addresses and update configuration files:
  - `frontend/src/registryConfig.ts` for TokenRegistry
  - `frontend/src/ammConfig.ts` for SimpleAMM

5. **Configure Application**

See the Configuration section below for details on setting up Privy App ID and contract addresses.

## Usage Guide

### Deploy Token

1. Navigate to the "Deploy" tab
2. Fill in token information:
   - **Name**: Token name (e.g., "My Token")
   - **Symbol**: Token symbol (e.g., "MTK")
   - **Decimals**: Number of decimal places (typically 18)
   - **Initial Supply**: Initial token amount to mint
3. **Optional - Create Liquidity Pool**:
   - Enable "Create Liquidity Pool" checkbox
   - Enter initial token amount for the pool (default: 50% of supply)
   - Enter initial USDC amount (default: 100 USDC)
4. Click "Deploy Token"
5. Confirm transaction(s) in your wallet
6. Token will be deployed, minted to your wallet, and pool created (if enabled)

**Note**: Tokens can be deployed without a pool and pools can be created later from the Marketplace.

### Send Tokens

1. Navigate to the "Send" tab
2. Select token type:
   - **USDC**: Native USDC on Arc
   - **Deployed Tokens**: Tokens you've deployed
   - **Custom**: Enter custom ERC-20 contract address
3. Enter recipient address and amount
4. Click "Send" and confirm transaction in your wallet

### View Transaction History

1. Navigate to the "History" tab
2. View all transactions for the connected wallet
3. Click on transaction hash to view details on Arcscan
4. Click "Refresh" to update the transaction list

### Explore Marketplace

1. Navigate to the "Marketplace" tab
2. Browse all tokens deployed on the network
3. Use the search bar to find specific tokens
4. Your owned tokens will be highlighted
5. View real-time prices for tokens with liquidity pools
6. Click "View Details & Trade" to open the token detail page
7. For tokens without pools, click "Create Pool" to add liquidity manually
8. Click on token cards to view contracts on Arcscan

### Trade Tokens

1. From the Marketplace, click "View Details & Trade" on any token with a pool
2. On the token detail page:
   - View price chart with historical price data
   - See current price, your balances, and pool reserves
   - Switch between "Buy" and "Sell" tabs
3. Enter amount to buy or sell
4. Review the quote showing the exact amount you'll receive
5. Click "Buy" or "Sell" and confirm transaction
6. Transaction will execute and balances will update automatically

### Create Liquidity Pool (Manual)

1. Navigate to the "Marketplace" tab
2. Find a token without a liquidity pool (indicated by pool status)
3. Click "Create Pool" button
4. Enter:
   - **Token Amount**: Amount of tokens to add to the pool
   - **USDC Amount**: Amount of USDC to pair with tokens
5. Click "Create Pool" and confirm transaction
6. Pool will be created and the token will become tradeable

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

The application will also automatically load the address from `localStorage.getItem('registryAddress')` if available.

### AMM Contract Address

Default AMM address: `0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5`

To change, edit `frontend/src/ammConfig.ts`:

```typescript
export const DEFAULT_AMM_ADDRESS = '0xYourAMMAddress';
```

The application will also automatically load the address from `localStorage.getItem('ammAddress')` if deployed via the UI.

To deploy a new AMM contract:
1. Go to the "Deploy" tab
2. Click "Deploy SimpleAMM"
3. The address will be automatically saved to localStorage

## Network Information

**Arc Testnet**

- **RPC URL**: https://rpc.testnet.arc.network
- **Chain ID**: 5042002
- **Explorer**: https://testnet.arcscan.app
- **Faucet**: https://faucet.circle.com
- **Native Currency**: USDC (18 decimals on-chain, 6 decimals for display)

## Tech Stack

### Frontend
- **React** 18.2 - UI framework
- **TypeScript** 5.2 - Type safety
- **Vite** 5.0 - Build tool and dev server
- **Ethers.js** 6.15 - Blockchain interaction
- **Privy** 3.5 - Wallet infrastructure and authentication
- **Lightweight Charts** 5.0 - TradingView chart library
- **Viem** 2.38 - Chain configuration utilities

### Smart Contracts
- **Solidity** 0.8.30 - Smart contract language
- **Hardhat** / **solc** - Compilation tools
- **ERC-20** Standard - Token standard implementation

## Project Structure

```
arc-dex/
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
│   ├── vite.config.ts
│   └── index.html
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

- **Private Keys**: Never stored or transmitted to any server
- **MetaMask**: All transactions are signed locally in MetaMask
- **Privy Embedded Wallet**: Uses MPC (Multi-Party Computation) for enhanced security
- **On-chain Registry**: All token data stored on-chain, no backend dependency
- **Smart Contract Audits**: Users should audit contracts before deploying to mainnet

## Deployment

### Deploy to Vercel

**Live Application**: [https://arc-privy-simple-backend.vercel.app/](https://arc-privy-simple-backend.vercel.app/)

#### Deployment Steps

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click "Add New Project" or "Import Project"
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Configure build settings:

   - **Root Directory**: Override → Type: `frontend` → Save
   - **Framework Preset**: Override → Select "Other" (do not select "Vite")
   - **Build Command**: Override → Type: `npm run build`
   - **Output Directory**: Override → Type: `dist`
   - **Install Command**: Override → Type: `npm install`

5. Click "Deploy"

#### Important Configuration Notes

- Root Directory must be set to `frontend` (not the repository root)
- Framework Preset must be "Other" (not "Vite" or any other framework preset)
- Vercel will automatically detect static files after build completion

## Built on Arc Network

Arc Network is a stablecoin-native Layer-1 blockchain by Circle, optimized for USDC transactions and Web3 applications.
