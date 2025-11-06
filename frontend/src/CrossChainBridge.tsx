import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import {
  CCTP_DOMAINS,
  CCTP_TOKEN_MESSENGER,
  USDC_ADDRESSES,
  TOKEN_MESSENGER_ABI,
  ERC20_ABI,
} from './cctpConfig';

// Arc Testnet configuration
const ARC_TESTNET = {
  chainId: 5042002,
  domain: 26, // Arc Testnet CCTP domain
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
};

// Supported TESTNET chains for bridging
// All testnet chains use the same TokenMessenger address (0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA)
const SUPPORTED_CHAINS = [
  ARC_TESTNET,
  {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    domain: 0,
  },
  {
    chainId: 43113,
    name: 'Avalanche Fuji',
    domain: 1,
  },
  {
    chainId: 84532,
    name: 'Base Sepolia',
    domain: 6,
  },
  {
    chainId: 80001,
    name: 'Polygon Mumbai',
    domain: 7,
  },
  {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    domain: 3,
  },
  {
    chainId: 534351,
    name: 'Scroll Sepolia',
    domain: 19,
  },
  {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    domain: 2,
  },
  {
    chainId: 168587773,
    name: 'Blast Sepolia',
    domain: 23,
  },
];

interface BridgeState {
  fromChain: typeof SUPPORTED_CHAINS[0];
  toChain: typeof SUPPORTED_CHAINS[0];
  amount: string;
  recipientAddress: string;
  status: 'idle' | 'approving' | 'bridging' | 'success' | 'error';
  txHash?: string;
  error?: string;
}

export default function CrossChainBridge() {
  const { wallets } = useWallets();
  const externalWallet = wallets.find(w => w.walletClientType !== 'privy' && w.walletClientType !== undefined);
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const wallet = externalWallet || embeddedWallet;

  const [bridgeState, setBridgeState] = useState<BridgeState>({
    fromChain: ARC_TESTNET, // Default to Arc Testnet
    toChain: SUPPORTED_CHAINS.find(c => c.chainId !== ARC_TESTNET.chainId) || SUPPORTED_CHAINS[0], // Default to first non-Arc chain
    amount: '',
    recipientAddress: '',
    status: 'idle',
  });

  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Switch to selected chain network
  const switchToChain = useCallback(async (chainId: number) => {
    if (!wallet) return;
    
    try {
      // For Privy embedded wallet, try to switch chain using wallet.switchChain
      if (wallet.walletClientType === 'privy' && embeddedWallet) {
        try {
          // Privy embedded wallet should support switchChain method
          if (embeddedWallet.switchChain) {
            await embeddedWallet.switchChain(chainId);
            console.log(`Successfully switched Privy wallet to chain ${chainId}`);
            return;
          }
        } catch (err: any) {
          console.error('Error switching Privy wallet chain:', err);
          // Continue with fallback - Privy may handle chain switching automatically
          // when using supportedChains in PrivyProvider
        }
      }
      
      // For external wallets (MetaMask, etc.), use wallet_switchEthereumChain
      if (wallet.walletClientType !== 'privy') {
        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        
        // Get current network
        const network = await ethersProvider.getNetwork();
        const targetChainId = BigInt(chainId);
        
        // If already on target chain, nothing to do
        if (network.chainId === targetChainId) {
          console.log(`Already on chain ${chainId}`);
          return;
        }
        
        console.log(`Current network: ${network.chainId}, switching to chain ${chainId}`);
        
        // Network params for different chains
        const getNetworkParams = (chainId: number) => {
          switch (chainId) {
            case 5042002: // Arc Testnet
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Arc Testnet',
                nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                rpcUrls: ['https://rpc.testnet.arc.network'],
                blockExplorerUrls: ['https://testnet.arcscan.app'],
              };
            case 11155111: // Ethereum Sepolia
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              };
            case 43113: // Avalanche Fuji
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Avalanche Fuji Testnet',
                nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
                rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
                blockExplorerUrls: ['https://testnet.snowtrace.io'],
              };
            case 84532: // Base Sepolia
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Base Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia-explorer.base.org'],
              };
            case 80001: // Polygon Mumbai
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Polygon Mumbai',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
                blockExplorerUrls: ['https://mumbai.polygonscan.com'],
              };
            case 421614: // Arbitrum Sepolia
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Arbitrum Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://sepolia-explorer.arbitrum.io'],
              };
            case 534351: // Scroll Sepolia
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Scroll Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia-rpc.scroll.io'],
                blockExplorerUrls: ['https://sepolia.scrollscan.com'],
              };
            case 11155420: // Optimism Sepolia
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Optimism Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.optimism.io'],
                blockExplorerUrls: ['https://sepolia-optimism.etherscan.io'],
              };
            case 168587773: // Blast Sepolia
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Blast Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.blast.io'],
                blockExplorerUrls: ['https://testnet.blastscan.io'],
              };
            default:
              return null;
          }
        };
        
        const networkParams = getNetworkParams(chainId);
        if (!networkParams) {
          console.error(`Network params not configured for chain ${chainId}`);
          return;
        }
        
        // Try to switch to target chain
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: networkParams.chainId }],
          });
          console.log(`Successfully switched to chain ${chainId}`);
        } catch (switchError: any) {
          // If network doesn't exist, add it
          if (switchError.code === 4902 || switchError.code === -32603) {
            console.log(`Chain ${chainId} not found, adding network...`);
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [networkParams],
            });
            console.log(`Successfully added and switched to chain ${chainId}`);
          } else {
            console.error(`Error switching to chain ${chainId}:`, switchError);
            throw switchError;
          }
        }
      }
    } catch (err: any) {
      console.error('Error in switchToChain:', err);
      // Don't throw - just log the error, user can manually switch
    }
  }, [wallet, embeddedWallet]);

  // Auto-switch network when fromChain changes
  useEffect(() => {
    if (wallet && bridgeState.fromChain) {
      switchToChain(bridgeState.fromChain.chainId);
    }
  }, [bridgeState.fromChain, wallet, switchToChain]);

  // Load balance - check USDC balance on current chain
  const loadBalance = useCallback(async () => {
    if (!wallet || !bridgeState.fromChain) return;

    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const address = wallet.address;

      // Get USDC address for current chain
      const usdcAddress = USDC_ADDRESSES[bridgeState.fromChain.chainId];
      
      if (usdcAddress) {
        // Use ERC-20 balance
        const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, ethersProvider);
        const decimals = await usdcContract.decimals();
        const bal = await usdcContract.balanceOf(address);
        const formatted = ethers.formatUnits(bal, decimals);
        const num = parseFloat(formatted);
        const final = isNaN(num) ? formatted : num.toFixed(6).replace(/\.?0+$/, '');
        setBalance(final);
      } else {
        // Fallback to native balance for Arc
        const bal = await ethersProvider.getBalance(address);
        const formatted = ethers.formatUnits(bal, 18);
        const num = parseFloat(formatted);
        const final = isNaN(num) ? formatted : num.toFixed(6).replace(/\.?0+$/, '');
        setBalance(final);
      }
    } catch (err: any) {
      console.error('Error loading balance:', err);
    }
  }, [wallet, bridgeState.fromChain]);

  useEffect(() => {
    if (wallet && bridgeState.fromChain) {
      loadBalance();
    }
  }, [wallet, bridgeState.fromChain, loadBalance]);

  // Get CCTP configuration for a chain
  const getCCTPConfig = useCallback((chainId: number) => {
    const domain = CCTP_DOMAINS[chainId];
    const tokenMessenger = CCTP_TOKEN_MESSENGER[chainId];
    const usdcAddress = USDC_ADDRESSES[chainId];

    // Note: domain can be 0 (Ethereum Sepolia), so we check for undefined instead of falsy
    if (domain === undefined || !tokenMessenger || !usdcAddress) {
      throw new Error(`CCTP not configured for chain ${chainId}. Domain: ${domain}, TokenMessenger: ${tokenMessenger}, USDC: ${usdcAddress}`);
    }

    return { domain, tokenMessenger, usdcAddress };
  }, []);

  // Execute bridge transfer
  const executeBridge = useCallback(async () => {
    if (!wallet || !bridgeState.amount || !bridgeState.recipientAddress) {
      setBridgeState(prev => ({
        ...prev,
        status: 'error',
        error: 'Please fill in all fields',
      }));
      return;
    }

    const amountNum = parseFloat(bridgeState.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setBridgeState(prev => ({
        ...prev,
        status: 'error',
        error: 'Invalid amount',
      }));
      return;
    }

    setLoading(true);
    setBridgeState(prev => ({ ...prev, status: 'bridging', error: undefined }));

    try {
      // Get CCTP configuration
      const sourceConfig = getCCTPConfig(bridgeState.fromChain.chainId);
      const destConfig = getCCTPConfig(bridgeState.toChain.chainId);

      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // Parse amount - USDC uses 6 decimals on most chains, but Arc native uses 18
      // For Arc, we use ERC-20 interface which uses 6 decimals
      const usdcDecimals = bridgeState.fromChain.chainId === 5042002 ? 6 : 6; // Arc ERC-20 uses 6 decimals
      const amountWei = ethers.parseUnits(bridgeState.amount, usdcDecimals);

      // Verify contract exists before proceeding
      const contractCode = await ethersProvider.getCode(sourceConfig.usdcAddress);
      if (contractCode === '0x' || contractCode === '0x0') {
        throw new Error(`USDC contract not found at address ${sourceConfig.usdcAddress} on chain ${bridgeState.fromChain.chainId}. Please verify the contract address.`);
      }

      // Get USDC contract
      const usdcContract = new ethers.Contract(sourceConfig.usdcAddress, ERC20_ABI, signer);

      // Check and approve USDC if needed
      setBridgeState(prev => ({ ...prev, status: 'approving' }));
      
      // Check allowance - handle cases where contract might not support it properly
      let needsApproval = true;
      try {
        const allowance = await usdcContract.allowance(wallet.address, sourceConfig.tokenMessenger);
        console.log(`Current allowance: ${allowance.toString()}`);
        needsApproval = allowance < amountWei;
      } catch (allowanceError: any) {
        console.warn('Could not check allowance, proceeding with approval:', allowanceError.message);
        // If allowance check fails, assume we need approval
        needsApproval = true;
      }
      
      if (needsApproval) {
        console.log('Approving USDC...');
        try {
          const approveTx = await usdcContract.approve(sourceConfig.tokenMessenger, ethers.MaxUint256);
          await approveTx.wait();
          console.log('USDC approved');
        } catch (approveError: any) {
          // Check if approval already exists or contract doesn't need approval
          if (approveError.message?.includes('execution reverted')) {
            throw new Error(`Approval failed: ${approveError.message}. Please check if the USDC contract address is correct for this chain.`);
          }
          throw approveError;
        }
      } else {
        console.log('Sufficient allowance already exists');
      }

      // Get TokenMessenger contract
      const tokenMessenger = new ethers.Contract(sourceConfig.tokenMessenger, TOKEN_MESSENGER_ABI, signer);

      // Convert recipient address to bytes32 (left-padded)
      const recipientBytes32 = ethers.zeroPadValue(bridgeState.recipientAddress || wallet.address, 32);

      // Call depositForBurn
      setBridgeState(prev => ({ ...prev, status: 'bridging' }));
      console.log(`Bridging ${bridgeState.amount} USDC from chain ${bridgeState.fromChain.chainId} to chain ${bridgeState.toChain.chainId}`);
      
      const tx = await tokenMessenger.depositForBurn(
        amountWei,
        destConfig.domain,
        recipientBytes32,
        sourceConfig.usdcAddress
      );

      console.log(`Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt!.blockNumber}`);

      setBridgeState(prev => ({
        ...prev,
        status: 'success',
        txHash: receipt!.hash,
      }));

      // Reload balance after successful bridge
      setTimeout(() => {
        loadBalance();
      }, 2000);
    } catch (err: any) {
      console.error('Bridge error:', err);
      setBridgeState(prev => ({
        ...prev,
        status: 'error',
        error: err.message || 'Bridge transaction failed',
      }));
    } finally {
      setLoading(false);
    }
  }, [wallet, bridgeState, getCCTPConfig, loadBalance]);

  // Set recipient to current wallet address by default
  useEffect(() => {
    if (wallet && !bridgeState.recipientAddress) {
      setBridgeState(prev => ({
        ...prev,
        recipientAddress: wallet.address,
      }));
    }
  }, [wallet, bridgeState.recipientAddress]);

  return (
    <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}>
          Cross-Chain Bridge
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
          Transfer USDC using Circle's CCTP protocol
        </p>
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(34, 197, 94, 0.15)',
          borderRadius: '6px',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          fontSize: '0.85rem',
          color: '#86efac',
        }}>
          ✅ Bridge between 9+ testnet chains using Circle's CCTP protocol
        </div>
      </div>

      {/* Balance Display */}
      {balance && (
        <div style={{
          padding: '1rem',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          border: '1px solid rgba(71, 85, 105, 0.3)',
        }}>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
            Available Balance
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>
            {balance} USDC
          </div>
        </div>
      )}

      {/* From Chain Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
          From Chain:
        </label>
        <select
          value={bridgeState.fromChain.chainId}
          onChange={async (e) => {
            const selectedChain = SUPPORTED_CHAINS.find(c => c.chainId === parseInt(e.target.value));
            if (selectedChain) {
              // Switch network first (for external wallets)
              if (wallet && wallet.walletClientType !== 'privy') {
                await switchToChain(selectedChain.chainId);
              }
              
              setBridgeState(prev => {
                // If selected chain is the same as toChain, swap them
                const newToChain = selectedChain.chainId === prev.toChain.chainId 
                  ? prev.fromChain 
                  : prev.toChain;
                return { 
                  ...prev, 
                  fromChain: selectedChain,
                  toChain: newToChain,
                };
              });
            }
          }}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '8px',
            outline: 'none',
            background: 'rgba(30, 41, 59, 0.6)',
            color: '#e2e8f0',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {SUPPORTED_CHAINS.map((chain) => (
            <option key={chain.chainId} value={chain.chainId}>
              {chain.name} (Chain ID: {chain.chainId})
            </option>
          ))}
        </select>
      </div>

      {/* Swap Direction Button */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={async () => {
            // Switch network when swapping
            if (wallet && wallet.walletClientType !== 'privy') {
              await switchToChain(bridgeState.toChain.chainId);
            }
            
            setBridgeState(prev => ({
              ...prev,
              fromChain: prev.toChain,
              toChain: prev.fromChain,
            }));
          }}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            background: 'rgba(129, 140, 248, 0.2)',
            color: '#a78bfa',
            border: '2px solid rgba(129, 140, 248, 0.5)',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(129, 140, 248, 0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(129, 140, 248, 0.2)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ⇅ Swap Direction
        </button>
      </div>

      {/* To Chain Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
          To Chain:
        </label>
        <select
          value={bridgeState.toChain.chainId}
          onChange={(e) => {
            const selectedChain = SUPPORTED_CHAINS.find(c => c.chainId === parseInt(e.target.value));
            if (selectedChain) {
              setBridgeState(prev => ({ ...prev, toChain: selectedChain }));
            }
          }}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '8px',
            outline: 'none',
            background: 'rgba(30, 41, 59, 0.6)',
            color: '#e2e8f0',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {SUPPORTED_CHAINS
            .filter(chain => chain.chainId !== bridgeState.fromChain.chainId)
            .map((chain) => (
              <option key={chain.chainId} value={chain.chainId}>
                {chain.name} (Chain ID: {chain.chainId})
              </option>
            ))}
        </select>
      </div>

      {/* Amount Input */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
          Amount (USDC):
        </label>
        <input
          type="number"
          placeholder="0.0"
          value={bridgeState.amount}
          onChange={(e) => setBridgeState(prev => ({ ...prev, amount: e.target.value }))}
          disabled={loading}
          min="0.000001"
          step="0.000001"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '8px',
            outline: 'none',
            background: 'rgba(30, 41, 59, 0.6)',
            color: '#e2e8f0',
          }}
        />
        {balance && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            Available: {balance} USDC
          </div>
        )}
      </div>

      {/* Recipient Address */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
          Recipient Address (on destination chain):
        </label>
        <input
          type="text"
          placeholder="0x..."
          value={bridgeState.recipientAddress}
          onChange={(e) => setBridgeState(prev => ({ ...prev, recipientAddress: e.target.value }))}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '0.9rem',
            fontFamily: 'monospace',
            border: '2px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '8px',
            outline: 'none',
            background: 'rgba(30, 41, 59, 0.6)',
            color: '#e2e8f0',
          }}
        />
        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          Defaults to your current wallet address
        </div>
      </div>

      {/* Bridge Button */}
      <button
        onClick={executeBridge}
        disabled={loading || !bridgeState.amount || !bridgeState.recipientAddress}
        style={{
          width: '100%',
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          background: (loading || !bridgeState.amount || !bridgeState.recipientAddress)
            ? 'rgba(71, 85, 105, 0.5)'
            : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: (loading || !bridgeState.amount || !bridgeState.recipientAddress) ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          transition: 'transform 0.2s',
          marginBottom: '1rem',
        }}
        onMouseEnter={(e) => {
          if (!loading && bridgeState.amount && bridgeState.recipientAddress) {
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {loading
          ? bridgeState.status === 'approving'
            ? 'Approving...'
            : bridgeState.status === 'bridging'
            ? 'Bridging...'
            : 'Processing...'
          : `Bridge ${bridgeState.amount || '0'} USDC to ${bridgeState.toChain.name}`}
      </button>

      {/* Status Messages */}
      {bridgeState.status === 'success' && bridgeState.txHash && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(34, 197, 94, 0.2)',
          borderLeft: '4px solid #22c55e',
          borderRadius: '4px',
          color: '#86efac',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}>
          <strong>Bridge Successful!</strong>
          <div style={{ marginTop: '0.5rem' }}>
            <a
              href={`https://testnet.arcscan.app/tx/${bridgeState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#a78bfa', textDecoration: 'none' }}
            >
              View Transaction on Arcscan →
            </a>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Your USDC will arrive on {bridgeState.toChain.name} shortly via CCTP.
          </div>
        </div>
      )}

      {bridgeState.status === 'error' && bridgeState.error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.2)',
          borderLeft: '4px solid #ef4444',
          borderRadius: '4px',
          color: '#fca5a5',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}>
          <strong>Error:</strong> {bridgeState.error}
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(129, 140, 248, 0.15)',
        borderRadius: '8px',
        border: '1px solid rgba(129, 140, 248, 0.3)',
      }}>
        <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
          💡 About Cross-Chain Bridge
        </div>
        <ul style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: '1.5rem', lineHeight: '1.6' }}>
          <li>Powered by Circle's Cross-Chain Transfer Protocol (CCTP)</li>
          <li>Native USDC transfers between 18+ testnet chains</li>
          <li>Fast and secure with deterministic finality</li>
          <li>Bridge Kit SDK makes integration seamless</li>
          <li><strong>Testnet only:</strong> Currently supports testnet-to-testnet bridging</li>
        </ul>
      </div>

      {/* Info: CCTP Implementation */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: 'rgba(34, 197, 94, 0.15)',
        borderRadius: '8px',
        border: '1px solid rgba(34, 197, 94, 0.3)',
      }}>
        <div style={{ fontSize: '0.9rem', color: '#86efac', marginBottom: '0.5rem', fontWeight: 600 }}>
          ✅ Direct CCTP Implementation
        </div>
        <div style={{ fontSize: '0.85rem', color: '#86efac', lineHeight: '1.6' }}>
          This bridge uses Circle's CCTP contracts directly (no SDK required). 
          <br />
          <strong>How it works:</strong>
          <br />
          1. Approve USDC to TokenMessenger contract
          <br />
          2. Call depositForBurn() to burn USDC and create message
          <br />
          3. Message is transmitted to destination chain
          <br />
          4. USDC is minted on destination chain
          <br />
          <br />
          ⏱️ Bridge time: Usually 1-5 minutes depending on chain
        </div>
      </div>
    </div>
  );
}

