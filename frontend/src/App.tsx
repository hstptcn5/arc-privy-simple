import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import DeployToken from './DeployToken';
import DeployRegistry from './DeployRegistry';
import { REGISTRY_ADDRESS, REGISTRY_ABI } from './registryConfig';

const USDC_NATIVE_DECIMALS = 18; // Native USDC uses 18 decimals on Arc
const USDC_DISPLAY_DECIMALS = 6; // Display format

interface SendResult {
  txHash?: string;
  error?: string;
}

interface DeployedToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance?: string;
}

function App() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  
  // UI States
  const [activeTab, setActiveTab] = useState<'balance' | 'send' | 'deploy'>('balance');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string>('');
  const [sendToAddress, setSendToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
  
  // Send token states
  const [selectedToken, setSelectedToken] = useState<'usdc' | 'custom' | string>('usdc');
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [customTokenInfo, setCustomTokenInfo] = useState<{name: string, symbol: string, decimals: number} | null>(null);
  const [customTokenBalance, setCustomTokenBalance] = useState<string | null>(null);

  // Get embedded wallet
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');

  // Load balance
  const loadBalance = useCallback(async () => {
    if (!embeddedWallet) return;
    
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const address = embeddedWallet.address;
      
      // Native USDC on Arc uses 18 decimals
      const bal = await ethersProvider.getBalance(address);
      const formatted = ethers.formatUnits(bal, USDC_NATIVE_DECIMALS); // Use 18 for native
      const num = parseFloat(formatted);
      const final = isNaN(num) ? formatted : num.toFixed(USDC_DISPLAY_DECIMALS).replace(/\.?0+$/, '');
      setBalance(final);
    } catch (err: any) {
      console.error('Error loading balance:', err);
    }
  }, [embeddedWallet]);

  // Load custom token info
  const loadCustomTokenInfo = useCallback(async (tokenAddress: string) => {
    if (!embeddedWallet || !ethers.isAddress(tokenAddress)) {
      setCustomTokenInfo(null);
      setCustomTokenBalance(null);
      return;
    }

    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const address = embeddedWallet.address;

      const TokenABI = [
        { 
          inputs: [], 
          name: 'name', 
          outputs: [{ internalType: 'string', name: '', type: 'string' }], 
          stateMutability: 'view',
          type: 'function'
        },
        { 
          inputs: [], 
          name: 'symbol', 
          outputs: [{ internalType: 'string', name: '', type: 'string' }], 
          stateMutability: 'view',
          type: 'function'
        },
        { 
          inputs: [], 
          name: 'decimals', 
          outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }], 
          stateMutability: 'view',
          type: 'function'
        },
        { 
          inputs: [{ internalType: 'address', name: 'to', type: 'address' }], 
          name: 'balanceOf', 
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], 
          stateMutability: 'view',
          type: 'function'
        },
      ];

      const contract = new ethers.Contract(tokenAddress, TokenABI, ethersProvider);
      const [name, symbol, decimals, balance] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.balanceOf(address)
      ]);

      const formatted = ethers.formatUnits(balance, decimals);
      const num = parseFloat(formatted);
      let displayBalance = formatted;
      if (!isNaN(num)) {
        if (num === 0) {
          displayBalance = '0';
        } else if (num < 0.000001) {
          displayBalance = num.toFixed(Number(decimals));
        } else {
          displayBalance = num.toFixed(6).replace(/\.?0+$/, '');
        }
      }

      setCustomTokenInfo({ name, symbol, decimals: Number(decimals) });
      setCustomTokenBalance(displayBalance);
      setError('');
    } catch (err: any) {
      console.error('Error loading custom token:', err);
      setCustomTokenInfo(null);
      setCustomTokenBalance(null);
      setError(`Invalid token address: ${err.message}`);
    }
  }, [embeddedWallet]);

  // Send Token (USDC or ERC20)
  const sendToken = async () => {
    if (!authenticated || !embeddedWallet) {
      setError('Please login first');
      return;
    }

    if (!sendToAddress || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (!ethers.isAddress(sendToAddress)) {
      setError('Invalid recipient address');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      if (selectedToken === 'usdc') {
        // Send native USDC
        const amountToSend = ethers.parseUnits(amountNum.toString(), USDC_NATIVE_DECIMALS);
        
        console.log(`💸 Sending ${amountNum} USDC to ${sendToAddress}...`);
        const tx = await signer.sendTransaction({
          to: sendToAddress,
          value: amountToSend,
        });

        console.log(`📝 Transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed!`);
        
        setResult({ txHash: receipt!.hash });
        setSendToAddress('');
        setAmount('');
        await loadBalance();
      } else {
        // Send ERC20 token
        let tokenAddress: string;
        let decimals: number;
        let tokenSymbol: string;

        if (selectedToken === 'custom') {
          if (!customTokenAddress || !ethers.isAddress(customTokenAddress)) {
            setError('Invalid custom token address');
            setLoading(false);
            return;
          }
          if (!customTokenInfo) {
            setError('Please wait for token info to load');
            setLoading(false);
            return;
          }
          tokenAddress = customTokenAddress;
          decimals = customTokenInfo.decimals;
          tokenSymbol = customTokenInfo.symbol;
        } else {
          // Selected from deployed tokens
          const token = deployedTokens.find(t => t.address === selectedToken);
          if (!token) {
            setError('Token not found');
            setLoading(false);
            return;
          }
          tokenAddress = token.address;
          decimals = token.decimals;
          tokenSymbol = token.symbol;
        }

        const TokenABI = [
          { 
            inputs: [
              { internalType: 'address', name: 'to', type: 'address' },
              { internalType: 'uint256', name: 'value', type: 'uint256' }
            ], 
            name: 'transfer', 
            outputs: [{ internalType: 'bool', name: '', type: 'bool' }], 
            stateMutability: 'nonpayable',
            type: 'function'
          },
        ];

        const contract = new ethers.Contract(tokenAddress, TokenABI, signer);
        const amountWei = ethers.parseUnits(amountNum.toString(), decimals);
        
        console.log(`💸 Sending ${amountNum} ${tokenSymbol} to ${sendToAddress}...`);
        
        const tx = await contract.transfer(sendToAddress, amountWei);
        console.log(`📝 Transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed!`);

        setResult({ txHash: receipt!.hash });
        setSendToAddress('');
        setAmount('');
        
        // Reload balances
        await loadBalance();
        if (selectedToken === 'custom') {
          await loadCustomTokenInfo(customTokenAddress);
        } else {
          await loadTokenBalances(deployedTokens);
        }
      }
    } catch (err: any) {
      console.error('❌ Error sending token:', err);
      setError(`Failed to send: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  // Load token balances
  const loadTokenBalances = useCallback(async (tokens: DeployedToken[]) => {
    if (!embeddedWallet || tokens.length === 0) {
      console.log('⚠️ Cannot load token balances: no wallet or no tokens');
      return;
    }
    
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const address = embeddedWallet.address;
      
      const SimpleTokenABI = [
        { 
          inputs: [{ internalType: 'address', name: 'to', type: 'address' }], 
          name: 'balanceOf', 
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], 
          stateMutability: 'view',
          type: 'function'
        },
        { 
          inputs: [], 
          name: 'decimals', 
          outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }], 
          stateMutability: 'view',
          type: 'function'
        },
      ];
      
      console.log(`🔍 Loading balances for ${tokens.length} tokens, wallet address: ${address}`);
      
      const balances = await Promise.all(
        tokens.map(async (token) => {
          try {
            console.log(`📊 Fetching balance for token: ${token.name} (${token.symbol}) at ${token.address}`);
            
            if (!ethers.isAddress(token.address)) {
              console.error(`❌ Invalid token address: ${token.address}`);
              return { ...token, balance: '0' };
            }
            
            const contract = new ethers.Contract(token.address, SimpleTokenABI, ethersProvider);
            
            // Fetch balance and decimals
            const balance = await contract.balanceOf(address);
            const decimals = await contract.decimals();
            
            console.log(`✅ Token ${token.symbol}:`);
            console.log(`   - Address: ${address}`);
            console.log(`   - Token Address: ${token.address}`);
            console.log(`   - Raw Balance (BigInt): ${balance.toString()}`);
            console.log(`   - Decimals: ${decimals}`);
            
            if (!balance || balance.toString() === '0') {
              console.warn(`⚠️ Token ${token.symbol} has zero balance`);
              return { ...token, balance: '0' };
            }
            
            const formatted = ethers.formatUnits(balance, decimals);
            console.log(`   - Formatted: ${formatted}`);
            
            // Format balance to show properly (avoid scientific notation and trailing zeros)
            const num = parseFloat(formatted);
            let displayBalance = formatted;
            if (!isNaN(num)) {
              if (num === 0) {
                displayBalance = '0';
              } else if (num < 0.000001) {
                // For very small numbers, show full precision with decimals
                displayBalance = num.toFixed(Number(decimals));
              } else {
                // For normal numbers, show up to 6 decimals but remove trailing zeros
                displayBalance = num.toFixed(6).replace(/\.?0+$/, '');
              }
            }
            
            console.log(`   - Display Balance: ${displayBalance}`);
            return { ...token, balance: displayBalance };
          } catch (err: any) {
            console.error(`❌ Error loading balance for ${token.address}:`, err);
            console.error(`   Error message: ${err.message}`);
            console.error(`   Error stack: ${err.stack}`);
            return { ...token, balance: 'Error' };
          }
        })
      );
      
      console.log(`✅ Finished loading balances:`, balances);
      
      setDeployedTokens(balances);
    } catch (err: any) {
      console.error('Error loading token balances:', err);
    }
  }, [embeddedWallet]);

  // Load deployed tokens from Registry (on-chain) or localStorage (fallback)
  const loadTokensFromRegistry = useCallback(async () => {
    if (!embeddedWallet || !authenticated) return;
    
    const registryAddr = REGISTRY_ADDRESS || localStorage.getItem('registryAddress') || '';
    
    if (registryAddr && ethers.isAddress(registryAddr)) {
      try {
        const provider = await embeddedWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const deployerAddress = embeddedWallet.address;
        
        const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, ethersProvider);
        const [addresses, infos] = await registry.getTokensByDeployer(deployerAddress);
        
        const tokens: DeployedToken[] = infos.map((info: any) => ({
          address: info.tokenAddress,
          name: info.name,
          symbol: info.symbol,
          decimals: Number(info.decimals),
        }));
        
        console.log(`✅ Loaded ${tokens.length} tokens from Registry`);
        
        // Immediately load balances for these tokens
        if (tokens.length > 0) {
          setDeployedTokens(tokens);
          // Load balances after a short delay to ensure state is updated
          setTimeout(() => {
            loadTokenBalances(tokens);
          }, 100);
        } else {
          setDeployedTokens(tokens);
        }
      } catch (err: any) {
        console.error('Error loading tokens from Registry:', err);
        // Fallback to localStorage
        loadTokensFromLocalStorage();
      }
    } else {
      // No Registry, use localStorage
      loadTokensFromLocalStorage();
    }
  }, [embeddedWallet, authenticated, loadTokenBalances]);

  const loadTokensFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem('deployedTokens');
    if (saved) {
      try {
        const tokens = JSON.parse(saved);
        setDeployedTokens(tokens);
        console.log(`✅ Loaded ${tokens.length} tokens from localStorage`);
      } catch (e) {
        console.error('Error loading tokens from localStorage:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadTokensFromRegistry();
    }
  }, [authenticated, loadTokensFromRegistry]);

  // Handle token deployment success
  const handleTokenDeployed = useCallback(async (address: string, txHash: string, name: string, symbol: string, decimals: number) => {
    // Reload tokens from Registry (if available) or add to state
    const registryAddr = REGISTRY_ADDRESS || localStorage.getItem('registryAddress') || '';
    
    if (registryAddr && ethers.isAddress(registryAddr)) {
      // If registered in Registry, reload from Registry
      setTimeout(() => {
        loadTokensFromRegistry();
      }, 2000); // Wait for transaction to be mined
    } else {
      // Fallback: add to local state and localStorage
      const newToken: DeployedToken = {
        address,
        name,
        symbol,
        decimals,
      };
      
      const updated = [...deployedTokens, newToken];
      setDeployedTokens(updated);
      localStorage.setItem('deployedTokens', JSON.stringify(updated));
    }
    
    // Load balance immediately
    if (embeddedWallet) {
      try {
        const provider = await embeddedWallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const walletAddress = embeddedWallet.address;
        
        const SimpleTokenABI = [
          { 
            inputs: [{ internalType: 'address', name: 'to', type: 'address' }], 
            name: 'balanceOf', 
            outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], 
            stateMutability: 'view',
            type: 'function'
          },
        ];
        
        const contract = new ethers.Contract(address, SimpleTokenABI, ethersProvider);
        const balance = await contract.balanceOf(walletAddress);
        const formatted = ethers.formatUnits(balance, decimals);
        
        // Format balance properly
        const num = parseFloat(formatted);
        let displayBalance = formatted;
        if (!isNaN(num)) {
          if (num === 0) {
            displayBalance = '0';
          } else if (num < 0.000001) {
            displayBalance = num.toFixed(decimals);
          } else {
            displayBalance = num.toFixed(6).replace(/\.?0+$/, '');
          }
        }
        
        setDeployedTokens(prev => prev.map(t => 
          t.address === address ? { ...t, balance: displayBalance } : t
        ));
      } catch (err) {
        console.error('Error loading new token balance:', err);
      }
    }
  }, [deployedTokens, embeddedWallet, loadTokensFromRegistry]);

  // Auto-load balances when authenticated
  useEffect(() => {
    if (authenticated && embeddedWallet) {
      loadBalance();
    }
  }, [authenticated, embeddedWallet, loadBalance]);

  // Load token balances when tokens change
  useEffect(() => {
    if (authenticated && embeddedWallet && deployedTokens.length > 0) {
      // Only load if tokens don't have balances yet
      const needsBalance = deployedTokens.some(t => t.balance === undefined);
      if (needsBalance) {
        loadTokenBalances(deployedTokens);
      }
    }
  }, [authenticated, embeddedWallet, deployedTokens.length, loadTokenBalances]);

  // Not ready yet
  if (!ready) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div>Loading Privy...</div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!authenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        padding: '2rem', 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '3rem',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Arc Onboard MVP
          </h1>
          
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#666', 
            marginBottom: '2rem',
            fontWeight: 300
          }}>
            Get USDC instantly – no wallet, no gas, no seed phrase
          </p>

          <button 
            onClick={login}
            style={{ 
              padding: '1rem 2rem', 
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              width: '100%',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🔐 Login with Privy
          </button>

          <p style={{ 
            fontSize: '0.9rem', 
            color: '#999', 
            marginTop: '1.5rem'
          }}>
            Login with email, Google, or MetaMask
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - show send UI
  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '2rem', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '3rem',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Arc Wallet
          </h1>
          <button
            onClick={logout}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '0'
        }}>
          <button
            onClick={() => setActiveTab('balance')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              background: activeTab === 'balance' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: activeTab === 'balance' ? 'white' : '#666',
              border: 'none',
              borderBottom: activeTab === 'balance' ? '3px solid transparent' : '3px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            💰 Balance
          </button>
          <button
            onClick={() => setActiveTab('send')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              background: activeTab === 'send' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: activeTab === 'send' ? 'white' : '#666',
              border: 'none',
              borderBottom: activeTab === 'send' ? '3px solid transparent' : '3px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📤 Send
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              background: activeTab === 'deploy' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: activeTab === 'deploy' ? 'white' : '#666',
              border: 'none',
              borderBottom: activeTab === 'deploy' ? '3px solid transparent' : '3px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🪙 Deploy
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'balance' && embeddedWallet && (
          <div style={{ 
            padding: '1rem', 
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
              Wallet Address:
            </div>
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '0.85rem',
              wordBreak: 'break-all',
              marginBottom: '0.5rem'
            }}>
              {embeddedWallet.address}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(embeddedWallet.address);
                setError('');
                setTimeout(() => setError(''), 100);
              }}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                background: '#e0e0e0',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '1.5rem'
              }}
            >
              📋 Copy Address
            </button>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Balance: {balance ? `${balance} USDC` : 'Loading...'}
              </div>
            </div>
            
            {deployedTokens.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>
                    Your Tokens:
                  </div>
                  <button
                    onClick={() => {
                      console.log('🔄 Manual refresh balances...');
                      loadTokenBalances(deployedTokens);
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Refresh
                  </button>
                </div>
                {deployedTokens.map((token, idx) => (
                  <div 
                    key={token.address} 
                    style={{ 
                      padding: '0.5rem', 
                      marginBottom: '0.5rem',
                      background: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #e0e0e0'
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      {token.name} ({token.symbol})
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                      {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#667eea', marginTop: '0.25rem' }}>
                      {token.balance !== undefined && token.balance !== 'Error' ? (
                        `${token.balance} ${token.symbol}`
                      ) : token.balance === 'Error' ? (
                        <span style={{ color: '#e00', fontSize: '0.85rem' }}>Error loading balance</span>
                      ) : (
                        'Loading...'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <a
              href="https://faucet.circle.com/?_gl=1*h9fy22*_gcl_au*NDczMTU0OTc4LjE3NjE5MTg2OTg."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textDecoration: 'none',
                fontWeight: 600,
                transition: 'transform 0.2s',
                marginTop: '1.5rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              🚰 Get USDC from Faucet
            </a>
          </div>
        )}

        {activeTab === 'send' && (
          <div>
            {/* Token Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem', fontWeight: 600 }}>
                Select Token:
              </label>
              <select
                value={selectedToken}
                onChange={(e) => {
                  setSelectedToken(e.target.value);
                  setCustomTokenAddress('');
                  setCustomTokenInfo(null);
                  setCustomTokenBalance(null);
                  setError('');
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="usdc">USDC (Native)</option>
                {deployedTokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
                <option value="custom">Custom Token Address</option>
              </select>
            </div>

            {/* Custom Token Address Input */}
            {selectedToken === 'custom' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Token Contract Address:
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={customTokenAddress}
                  onChange={async (e) => {
                    setCustomTokenAddress(e.target.value);
                    if (e.target.value && ethers.isAddress(e.target.value)) {
                      await loadCustomTokenInfo(e.target.value);
                    } else {
                      setCustomTokenInfo(null);
                      setCustomTokenBalance(null);
                    }
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                />
                {customTokenInfo && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0f7ff', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div><strong>{customTokenInfo.name}</strong> ({customTokenInfo.symbol})</div>
                    <div style={{ color: '#666', marginTop: '0.25rem' }}>
                      Your Balance: {customTokenBalance || '0'} {customTokenInfo.symbol}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recipient Address */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem', fontWeight: 600 }}>
                Recipient Address:
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={sendToAddress}
                onChange={(e) => setSendToAddress(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
          
            {/* Amount Input */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem', fontWeight: 600 }}>
                Amount:
              </label>
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                min="0.000001"
                step="0.000001"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '4rem',
                  fontSize: '1rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
              <span style={{
                position: 'absolute',
                right: '1rem',
                top: '2.5rem',
                color: '#999',
                fontSize: '0.9rem',
                fontWeight: 600
              }}>
                {selectedToken === 'usdc' 
                  ? 'USDC' 
                  : selectedToken === 'custom' && customTokenInfo
                    ? customTokenInfo.symbol
                    : selectedToken !== 'custom'
                      ? deployedTokens.find(t => t.address === selectedToken)?.symbol || 'TOKEN'
                      : 'TOKEN'}
              </span>
            </div>

            {/* Balance Display */}
            {selectedToken === 'usdc' && balance && (
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#666' }}>
                Your Balance: {balance} USDC
              </div>
            )}
            {selectedToken !== 'usdc' && selectedToken !== 'custom' && (
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#666' }}>
                Your Balance: {deployedTokens.find(t => t.address === selectedToken)?.balance || '0'} {deployedTokens.find(t => t.address === selectedToken)?.symbol || ''}
              </div>
            )}

            <button 
              onClick={sendToken} 
              disabled={loading || (selectedToken === 'custom' && !customTokenInfo)}
              style={{ 
                padding: '1rem 2rem', 
                fontSize: '1.1rem',
                background: (loading || (selectedToken === 'custom' && !customTokenInfo)) ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (loading || (selectedToken === 'custom' && !customTokenInfo)) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                width: '100%',
                transition: 'transform 0.2s',
                marginBottom: '1rem'
              }}
              onMouseEnter={(e) => !loading && !(selectedToken === 'custom' && !customTokenInfo) && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? '🔄 Sending...' : `💰 Send ${selectedToken === 'usdc' 
                ? 'USDC' 
                : selectedToken === 'custom' && customTokenInfo
                  ? customTokenInfo.symbol
                  : selectedToken !== 'custom'
                    ? deployedTokens.find(t => t.address === selectedToken)?.symbol || 'Token'
                    : 'Token'}`}
            </button>

            {error && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#fee',
                borderLeft: '4px solid #e00',
                borderRadius: '4px',
                color: '#c00'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {result && result.txHash && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#efe',
                borderLeft: '4px solid #0e0',
                borderRadius: '4px',
                color: '#0a0'
              }}>
                <strong>✅ Success!</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  <a 
                    href={`https://testnet.arcscan.app/tx/${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#667eea', textDecoration: 'none' }}
                  >
                    View on Arcscan →
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'deploy' && (
          <>
            <DeployRegistry />
            <DeployToken onDeploySuccess={handleTokenDeployed} />
          </>
        )}

        <div style={{ 
          marginTop: '2rem', 
          paddingTop: '2rem', 
          borderTop: '1px solid #eee',
          fontSize: '0.9rem',
          color: '#999'
        }}>
          <p style={{ margin: '0.5rem 0' }}>
            ⚡ Built on Arc Testnet with Privy
          </p>
          <p style={{ margin: '0.5rem 0' }}>
            🔐 Powered by Embedded Wallets
          </p>
          <p style={{ margin: '0.5rem 0' }}>
            💸 Zero gas for users, instant finality
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
