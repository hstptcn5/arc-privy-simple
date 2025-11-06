import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, useSwitchChain, useBalance } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { formatUnits } from 'viem';

// Arc Testnet configuration
const ARC_TESTNET = {
  chainId: 5042002,
  domain: 26, // Arc Testnet CCTP domain
  name: 'Arc Testnet',
  bridgeKitName: 'Arc_Testnet',
};

// Supported TESTNET chains for bridging
const SUPPORTED_CHAINS = [
  { ...ARC_TESTNET, bridgeKitName: 'Arc_Testnet' },
  {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    domain: 0,
    bridgeKitName: 'Ethereum_Sepolia',
  },
  {
    chainId: 43113,
    name: 'Avalanche Fuji',
    domain: 1,
    bridgeKitName: 'Avalanche_Fuji',
  },
  {
    chainId: 84532,
    name: 'Base Sepolia',
    domain: 6,
    bridgeKitName: 'Base_Sepolia',
  },
  {
    chainId: 80001,
    name: 'Polygon Mumbai',
    domain: 7,
    bridgeKitName: 'Polygon_Mumbai',
  },
  {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    domain: 3,
    bridgeKitName: 'Arbitrum_Sepolia',
  },
  {
    chainId: 534351,
    name: 'Scroll Sepolia',
    domain: 19,
    bridgeKitName: 'Scroll_Sepolia',
  },
  {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    domain: 2,
    bridgeKitName: 'Optimism_Sepolia',
  },
  {
    chainId: 168587773,
    name: 'Blast Sepolia',
    domain: 23,
    bridgeKitName: 'Blast_Sepolia',
  },
];

interface BridgeState {
  fromChain: typeof SUPPORTED_CHAINS[0];
  toChain: typeof SUPPORTED_CHAINS[0];
  amount: string;
  recipientAddress: string;
  status: 'idle' | 'approving' | 'bridging' | 'success' | 'error';
  txHashes?: {
    approve?: string;
    burn?: string;
    mint?: string;
  };
  error?: string;
}

export default function CrossChainBridgeWithKit() {
  // Wagmi hooks for MetaMask
  const { address: wagmiAddress, isConnected: isWagmiConnected, chain: wagmiChain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();
  
  // Privy hooks
  const { wallets: privyWallets } = useWallets();
  const privyWallet = privyWallets.find(w => w.walletClientType === 'privy');
  
  // Determine which wallet to use (prioritize Wagmi/MetaMask)
  const isUsingWagmi = isWagmiConnected && wagmiAddress;
  const activeAddress = isUsingWagmi ? wagmiAddress : privyWallet?.address;
  const isConnected = isWagmiConnected || !!privyWallet;
  
  // Balance for current chain
  const { data: balance } = useBalance({
    address: isUsingWagmi && activeAddress ? (activeAddress as `0x${string}`) : undefined,
    chainId: wagmiChain?.id,
  });

  const [bridgeState, setBridgeState] = useState<BridgeState>({
    fromChain: ARC_TESTNET,
    toChain: SUPPORTED_CHAINS.find(c => c.chainId !== ARC_TESTNET.chainId) || SUPPORTED_CHAINS[0],
    amount: '',
    recipientAddress: activeAddress || '',
    status: 'idle',
  });

  const [loading, setLoading] = useState(false);
  const [privyBalance, setPrivyBalance] = useState<string | null>(null);

  // Initialize BridgeKit
  const kit = new BridgeKit();

  // Load Privy balance
  const loadPrivyBalance = useCallback(async () => {
    if (!privyWallet || !activeAddress) return;
    
    try {
      const provider = await privyWallet.getEthereumProvider();
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [activeAddress, 'latest'],
      });
      const formatted = formatUnits(BigInt(balance), 18);
      const num = parseFloat(formatted);
      setPrivyBalance(isNaN(num) ? formatted : num.toFixed(6).replace(/\.?0+$/, ''));
    } catch (err) {
      console.error('Error loading Privy balance:', err);
    }
  }, [privyWallet, activeAddress]);

  useEffect(() => {
    if (privyWallet && !isUsingWagmi) {
      loadPrivyBalance();
    }
  }, [privyWallet, isUsingWagmi, loadPrivyBalance]);

  // Update recipient address when wallet changes
  useEffect(() => {
    if (activeAddress && !bridgeState.recipientAddress) {
      setBridgeState(prev => ({ ...prev, recipientAddress: activeAddress }));
    }
  }, [activeAddress, bridgeState.recipientAddress]);

  // Switch chain function
  const switchToChain = useCallback(async (chainId: number) => {
    if (isUsingWagmi && wagmiSwitchChain) {
      try {
        await wagmiSwitchChain({ chainId });
        console.log(`Switched to chain ${chainId}`);
      } catch (err: any) {
        console.error('Error switching chain:', err);
        throw err;
      }
    } else if (privyWallet) {
      // Privy wallet switching is handled automatically
      console.log(`Privy wallet will use chain ${chainId}`);
    }
  }, [isUsingWagmi, wagmiSwitchChain, privyWallet]);

  // Execute bridge using BridgeKit
  const executeBridge = useCallback(async () => {
    if (!activeAddress || !bridgeState.amount || !bridgeState.recipientAddress) {
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
      // Switch to source chain if needed
      const currentChainId = isUsingWagmi ? wagmiChain?.id : undefined;
      if (currentChainId !== bridgeState.fromChain.chainId) {
        setBridgeState(prev => ({ ...prev, status: 'approving' }));
        await switchToChain(bridgeState.fromChain.chainId);
        // Wait a bit for chain switch
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get provider adapter
      let adapter;
      if (isUsingWagmi && walletClient && window.ethereum) {
        // Use Wagmi wallet client
        adapter = await createAdapterFromProvider({
          provider: window.ethereum as any,
        });
      } else if (privyWallet) {
        // Use Privy wallet
        const provider = await privyWallet.getEthereumProvider();
        if (!provider) {
          throw new Error('Privy provider not available');
        }
        adapter = await createAdapterFromProvider({
          provider: provider as any,
        });
      } else {
        throw new Error('No wallet connected');
      }

      // Get chain names for BridgeKit
      const sourceChainName = bridgeState.fromChain.bridgeKitName as any;
      const destinationChainName = bridgeState.toChain.bridgeKitName as any;

      setBridgeState(prev => ({ ...prev, status: 'bridging' }));
      console.log(`Bridging ${bridgeState.amount} USDC from ${sourceChainName} to ${destinationChainName}`);

      // Execute bridge using BridgeKit
      // BridgeKit handles 3 steps automatically:
      // 1. Approve USDC to TokenMessenger (if needed)
      // 2. Burn USDC on source chain (depositForBurn)
      // 3. Mint USDC on destination chain (after attestation)
      console.log('Starting bridge process...');
      console.log('Steps: 1. Approve → 2. Burn → 3. Mint (automatic)');
      
      // BridgeKit bridge method - uses adapter address by default
      // If recipient is different, we'll need to handle it separately
      const bridgeParams: any = {
        from: { adapter, chain: sourceChainName },
        to: { adapter, chain: destinationChainName },
        amount: bridgeState.amount,
      };
      
      const result: any = await kit.bridge(bridgeParams);

      console.log('Bridge result:', result);

      // Extract transaction hashes
      const txHashes: any = {};
      if (result?.approvalTxHash) {
        txHashes.approve = result.approvalTxHash;
        setBridgeState(prev => ({ 
          ...prev, 
          status: 'approving', 
          txHashes,
          error: undefined,
        }));
        console.log('✅ Step 1/3: Approval transaction:', result.approvalTxHash);
      }

      if (result?.burnTxHash) {
        txHashes.burn = result.burnTxHash;
        setBridgeState(prev => ({ 
          ...prev, 
          status: 'bridging', 
          txHashes,
          error: undefined,
        }));
        console.log('✅ Step 2/3: Burn transaction:', result.burnTxHash);
      }

      if (result?.mintTxHash) {
        txHashes.mint = result.mintTxHash;
        setBridgeState(prev => ({
          ...prev,
          status: 'success',
          txHashes,
          error: undefined,
        }));
        console.log('✅ Step 3/3: Mint transaction:', result.mintTxHash);
        console.log('🎉 Bridge completed successfully!');
      } else {
        // If no mint hash yet, bridge is still in progress (waiting for attestation)
        setBridgeState(prev => ({
          ...prev,
          status: 'bridging',
          txHashes,
        }));
        console.log('⏳ Waiting for attestation and minting...');
      }

      // Reload balance
      if (isUsingWagmi) {
        // Balance will auto-refresh via Wagmi
      } else {
        loadPrivyBalance();
      }
    } catch (err: any) {
      console.error('Bridge error:', err);
      
      let errorMessage = err.message || 'Bridge transaction failed';
      
      // Handle specific error cases
      if (err.code === 4001 || err.message?.includes('User denied')) {
        errorMessage = 'Transaction was rejected. Please approve the transaction in MetaMask to continue.';
      } else if (err.message?.includes('insufficient funds') || err.message?.includes('insufficient balance')) {
        errorMessage = 'Insufficient balance. Please check your USDC balance and try again.';
      } else if (err.message?.includes('network') || err.message?.includes('RPC')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message?.includes('chain')) {
        errorMessage = 'Please switch to the correct network in MetaMask.';
      }
      
      setBridgeState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  }, [
    activeAddress,
    bridgeState,
    isUsingWagmi,
    wagmiChain,
    walletClient,
    privyWallet,
    switchToChain,
    kit,
    loadPrivyBalance,
  ]);

  // Auto-switch network when fromChain changes
  useEffect(() => {
    if (isConnected && bridgeState.fromChain) {
      switchToChain(bridgeState.fromChain.chainId);
    }
  }, [bridgeState.fromChain, isConnected, switchToChain]);

  // Display balance
  const displayBalance = isUsingWagmi
    ? balance
      ? parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(6).replace(/\.?0+$/, '')
      : null
    : privyBalance;

  return (
    <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}>
          Cross-Chain Bridge
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
          Transfer USDC across chains
        </p>
      </div>

      {/* Balance Display */}
      {displayBalance && (
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
            {displayBalance} USDC
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
          onChange={(e) => {
            const selectedChain = SUPPORTED_CHAINS.find(c => c.chainId === parseInt(e.target.value));
            if (selectedChain) {
              setBridgeState(prev => {
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
          onClick={() => {
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
        {displayBalance && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            Available: {displayBalance} USDC
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
        disabled={loading || !bridgeState.amount || !bridgeState.recipientAddress || !isConnected}
        style={{
          width: '100%',
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          background: (loading || !bridgeState.amount || !bridgeState.recipientAddress || !isConnected)
            ? 'rgba(71, 85, 105, 0.5)'
            : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: (loading || !bridgeState.amount || !bridgeState.recipientAddress || !isConnected) ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          transition: 'transform 0.2s',
          marginBottom: '1rem',
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

      {/* Progress Steps */}
      {loading && bridgeState.status !== 'idle' && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '12px',
          border: '1px solid rgba(71, 85, 105, 0.3)',
        }}>
          <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.75rem', fontWeight: 600 }}>
            Bridge Progress:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Step 1: Approve */}
            <div style={{
              padding: '0.75rem',
              background: bridgeState.txHashes?.approve ? 'rgba(34, 197, 94, 0.15)' : bridgeState.status === 'approving' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(71, 85, 105, 0.3)',
              borderRadius: '8px',
              border: `1px solid ${bridgeState.txHashes?.approve ? 'rgba(34, 197, 94, 0.4)' : bridgeState.status === 'approving' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(71, 85, 105, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.2rem' }}>
                {bridgeState.txHashes?.approve ? '✅' : bridgeState.status === 'approving' ? '⏳' : '⏸️'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>
                  Step 1: Approve USDC
                </div>
                {bridgeState.txHashes?.approve && (
                  <div style={{ fontSize: '0.75rem', color: '#86efac', marginTop: '0.25rem' }}>
                    Transaction: {bridgeState.txHashes.approve.slice(0, 10)}...{bridgeState.txHashes.approve.slice(-8)}
                  </div>
                )}
                {bridgeState.status === 'approving' && !bridgeState.txHashes?.approve && (
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                    Waiting for approval in MetaMask...
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Burn */}
            <div style={{
              padding: '0.75rem',
              background: bridgeState.txHashes?.burn ? 'rgba(34, 197, 94, 0.15)' : bridgeState.txHashes?.approve ? 'rgba(251, 191, 36, 0.15)' : 'rgba(71, 85, 105, 0.3)',
              borderRadius: '8px',
              border: `1px solid ${bridgeState.txHashes?.burn ? 'rgba(34, 197, 94, 0.4)' : bridgeState.txHashes?.approve ? 'rgba(251, 191, 36, 0.4)' : 'rgba(71, 85, 105, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.2rem' }}>
                {bridgeState.txHashes?.burn ? '✅' : bridgeState.txHashes?.approve ? '⏳' : '⏸️'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>
                  Step 2: Burn USDC on {bridgeState.fromChain.name}
                </div>
                {bridgeState.txHashes?.burn && (
                  <div style={{ fontSize: '0.75rem', color: '#86efac', marginTop: '0.25rem' }}>
                    Transaction: {bridgeState.txHashes.burn.slice(0, 10)}...{bridgeState.txHashes.burn.slice(-8)}
                  </div>
                )}
                {bridgeState.txHashes?.approve && !bridgeState.txHashes?.burn && (
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                    Burning USDC... (may take a few seconds)
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Mint */}
            <div style={{
              padding: '0.75rem',
              background: bridgeState.txHashes?.mint ? 'rgba(34, 197, 94, 0.15)' : bridgeState.txHashes?.burn ? 'rgba(251, 191, 36, 0.15)' : 'rgba(71, 85, 105, 0.3)',
              borderRadius: '8px',
              border: `1px solid ${bridgeState.txHashes?.mint ? 'rgba(34, 197, 94, 0.4)' : bridgeState.txHashes?.burn ? 'rgba(251, 191, 36, 0.4)' : 'rgba(71, 85, 105, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.2rem' }}>
                {bridgeState.txHashes?.mint ? '✅' : bridgeState.txHashes?.burn ? '⏳' : '⏸️'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>
                  Step 3: Mint USDC on {bridgeState.toChain.name}
                </div>
                {bridgeState.txHashes?.mint && (
                  <div style={{ fontSize: '0.75rem', color: '#86efac', marginTop: '0.25rem' }}>
                    Transaction: {bridgeState.txHashes.mint.slice(0, 10)}...{bridgeState.txHashes.mint.slice(-8)}
                  </div>
                )}
                {bridgeState.txHashes?.burn && !bridgeState.txHashes?.mint && (
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                    Waiting for attestation and minting... (1-5 minutes)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {bridgeState.status === 'success' && bridgeState.txHashes && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(34, 197, 94, 0.2)',
          borderLeft: '4px solid #22c55e',
          borderRadius: '4px',
          color: '#86efac',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}>
          <strong>🎉 Bridge Completed Successfully!</strong>
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <div>✅ Approval: {bridgeState.txHashes.approve ? 'Completed' : 'N/A'}</div>
            <div>✅ Burn: {bridgeState.txHashes.burn ? 'Completed' : 'N/A'}</div>
            <div>✅ Mint: {bridgeState.txHashes.mint ? 'Completed' : 'Pending'}</div>
          </div>
          {bridgeState.txHashes.mint && (
            <div style={{ marginTop: '0.5rem' }}>
              <a
                href={`https://sepolia.etherscan.io/tx/${bridgeState.txHashes.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#a78bfa', textDecoration: 'none' }}
              >
                View Mint Transaction on Etherscan →
              </a>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Your USDC has arrived on {bridgeState.toChain.name} via CCTP.
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
          💡 About BridgeKit SDK
        </div>
        <ul style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: '1.5rem', lineHeight: '1.6' }}>
          <li>Official Circle SDK for CCTP transfers</li>
          <li>Automatic attestation handling</li>
          <li>Progress tracking built-in</li>
          <li>Simplified API - just specify from, to, and amount</li>
          <li>Supports both MetaMask and Privy wallets</li>
        </ul>
      </div>
    </div>
  );
}

