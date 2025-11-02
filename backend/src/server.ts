import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { ethers } from 'ethers';
import 'dotenv/config';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize provider
const provider = new ethers.JsonRpcProvider(
  process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network'
);

// USDC contract address on Arc Testnet (native token)
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

// IMPORTANT: Native USDC on Arc uses 18 decimals (like ETH)
// ERC-20 interface uses 6 decimals, but native balances use 18
const USDC_NATIVE_DECIMALS = 18;
const USDC_ERC20_DECIMALS = 6;

// Funder wallet - REQUIRED for real USDC transfers
const FUNDER_PRIVATE_KEY = process.env.FUNDER_PRIVATE_KEY;

if (!FUNDER_PRIVATE_KEY || FUNDER_PRIVATE_KEY === '0xYourPrivateKeyHere') {
  console.error('❌ ERROR: FUNDER_PRIVATE_KEY is required but not set!');
  console.error('📝 Please set FUNDER_PRIVATE_KEY in your .env file');
  console.error('💡 Quick setup:');
  console.error('   1. cd contracts');
  console.error('   2. cast wallet new');
  console.error('   3. Copy private key to backend/.env');
  console.error('   4. Get USDC from: https://faucet.circle.com');
  process.exit(1);
}

const funderWallet = new ethers.Wallet(FUNDER_PRIVATE_KEY, provider);
console.log('✅ Funder wallet loaded:', funderWallet.address);

// Check funder balance
provider.getBalance(funderWallet.address).then((balance) => {
  // Display in USDC format (6 decimals for user-friendly display)
  const usdcBalance = ethers.formatUnits(balance, USDC_ERC20_DECIMALS);
  console.log(`💰 Funder balance: ${usdcBalance} USDC`);
  if (parseFloat(usdcBalance) < 10) {
    console.warn('⚠️  Low balance! Get more USDC from: https://faucet.circle.com');
  }
});

/**
 * Create deterministic wallet from email
 * Using ethereum hash of email as private key
 */
function createWalletFromEmail(email: string) {
  // Generate deterministic wallet from email hash
  const hash = ethers.id(email);
  const wallet = new ethers.Wallet(hash, provider);
  return wallet;
}

/**
 * Create deterministic smart account address from owner
 * In production, this would use actual Account Abstraction SDK
 */
async function createSmartAccount(ownerAddress: string): Promise<string> {
  // Generate deterministic smart account address
  // For MVP: Use CREATE2-style deterministic address
  const salt = ethers.id(ownerAddress);
  const smartAccountAddress = ethers.getAddress(
    '0x' + ethers.hexlify(ethers.getBytes(salt).slice(0, 20)).slice(2).padStart(40, '0')
  );
  return smartAccountAddress;
}

/**
 * Get USDC balance of an address
 */
async function getUSDCBalance(address: string): Promise<string> {
  try {
    // Native USDC on Arc uses 18 decimals
    const balance = await provider.getBalance(address);
    // Convert from native (18 decimals) to USDC display format (6 decimals)
    const formatted = ethers.formatUnits(balance, USDC_ERC20_DECIMALS);
    return formatted;
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
}

/**
 * Transfer USDC to a user account on Arc Network
 */
async function transferUSDC(
  to: string,
  amountUsd: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Real USDC transfer using native USDC on Arc
    // IMPORTANT: Native USDC on Arc uses 18 decimals precision!
    // Even though ERC-20 interface uses 6 decimals for display
    const amount = ethers.parseUnits(amountUsd.toString(), USDC_NATIVE_DECIMALS);
    
    // Check funder balance first (native balance uses 18 decimals)
    const balance = await provider.getBalance(funderWallet.address);
    if (balance < amount) {
      const balanceUsd = ethers.formatUnits(balance, USDC_ERC20_DECIMALS);
      return {
        success: false,
        error: `Insufficient balance: ${balanceUsd} USDC (need ${amountUsd} USDC)`
      };
    }
    
    console.log(`💸 Transferring ${amountUsd} USDC to ${to}...`);
    
    // On Arc, USDC is native token like ETH on Ethereum
    // Native value uses 18 decimals precision
    const tx = await funderWallet.sendTransaction({
      to,
      value: amount, // USDC amount in native format (18 decimals)
    });
    
    console.log(`📝 Transaction submitted: ${tx.hash}`);
    
    // Wait for confirmation (<1 second on Arc due to deterministic finality)
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt!.blockNumber}`);
    
    return {
      success: true,
      txHash: receipt!.hash
    };
  } catch (error: any) {
    console.error('❌ Transfer failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main onboarding endpoint
 */
app.post('/api/onboard', async (req, res) => {
  const { email, amount } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Default to 5 USDC if not provided
  const transferAmount = amount || 5.0;

  // Validate amount
  const amountNum = parseFloat(transferAmount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
  }

  try {
    console.log(`Onboarding user with email: ${email}, amount: ${transferAmount} USDC`);

    // 1. Create wallet from email
    const wallet = createWalletFromEmail(email);
    console.log(`Created wallet: ${wallet.address}`);

    // 2. Create smart account
    const smartAccount = await createSmartAccount(wallet.address);
    console.log(`Created smart account: ${smartAccount}`);

    // 3. Transfer USDC to the smart account
    const transferResult = await transferUSDC(
      smartAccount,
      amountNum
    );

    if (!transferResult.success) {
      return res.status(500).json({ error: transferResult.error || 'Failed to transfer USDC' });
    }

    // 4. Get balance
    const balance = await getUSDCBalance(smartAccount);

    res.json({
      address: smartAccount,
      balance: balance,
      txHash: transferResult.txHash
    });
  } catch (err: any) {
    console.error('Onboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get balance endpoint
 */
app.get('/api/balance/:address', async (req, res) => {
  const { address } = req.params;

  try {
    const balance = await getUSDCBalance(address);
    res.json({ address, balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from frontend (after API routes)
const frontendDist = path.join(__dirname, '../../frontend/dist');
const hasFrontendBuild = fs.existsSync(frontendDist);

// Try to serve frontend if dist exists (regardless of NODE_ENV)
if (hasFrontendBuild) {
  app.use(express.static(frontendDist));
  
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) return next();
    
    const indexPath = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (hasFrontendBuild) {
    console.log(`✅ Serving frontend from: ${frontendDist}`);
  } else {
    console.log(`🔧 Dev mode: Build frontend and restart, or run separately on port 5173`);
  }
  console.log(`📡 Arc RPC: ${process.env.ARC_RPC_URL || 'Not configured'}`);
});

