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
  const [activeTab, setActiveTab] = useState<'balance' | 'send' | 'deploy' | 'history' | 'marketplace'>('balance');
  
  // History states
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Marketplace states
  const [allTokens, setAllTokens] = useState<any[]>([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
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

  // Get wallet - prioritize external wallets (MetaMask, etc.) over embedded wallet
  // External wallets have walletClientType like 'metamask', 'walletconnect', etc.
  // Embedded wallet has walletClientType === 'privy'
  
  // Debug: Log all wallets
  useEffect(() => {
    if (wallets.length > 0) {
      console.log('=== WALLETS DEBUG ===');
      console.log(`Total wallets: ${wallets.length}`);
      wallets.forEach((w, idx) => {
        console.log(`Wallet ${idx + 1}:`, {
          address: w.address,
          walletClientType: w.walletClientType,
          chainId: w.chainId,
        });
      });
      console.log('====================');
    }
  }, [wallets]);
  
  // First, try to find external wallet (MetaMask, WalletConnect, etc.)
  const externalWallet = wallets.find(w => w.walletClientType !== 'privy' && w.walletClientType !== undefined);
  
  // If no external wallet, use embedded wallet
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  
  // Prioritize external wallet
  const wallet = externalWallet || embeddedWallet;
  
  // Debug: Log selected wallet
  useEffect(() => {
    if (wallet) {
      console.log('Selected wallet:', {
        address: wallet.address,
        walletClientType: wallet.walletClientType,
        isExternal: wallet.walletClientType !== 'privy',
      });
    }
  }, [wallet]);

  // Switch to Arc Testnet for external wallets (MetaMask, etc.)
  const switchToArcTestnet = useCallback(async () => {
    // Only switch for external wallets, not embedded wallet
    if (!wallet || wallet.walletClientType === 'privy') return;
    
    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      
      // Get current network
      const network = await ethersProvider.getNetwork();
      const arcTestnetChainId = 5042002n;
      
      // If already on Arc Testnet, nothing to do
      if (network.chainId === arcTestnetChainId) {
        console.log('Already on Arc Testnet');
        return;
      }
      
      console.log(`Current network: ${network.chainId}, switching to Arc Testnet (${arcTestnetChainId})`);
      
      // Arc Testnet network params
      const arcTestnetParams = {
        chainId: `0x${arcTestnetChainId.toString(16)}`, // 0x4d3b0a in hex
        chainName: 'Arc Testnet',
        nativeCurrency: {
          name: 'USDC',
          symbol: 'USDC',
          decimals: 18,
        },
        rpcUrls: ['https://rpc.testnet.arc.network'],
        blockExplorerUrls: ['https://testnet.arcscan.app'],
      };
      
      // Try to switch to Arc Testnet
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: arcTestnetParams.chainId }],
        });
        console.log('Successfully switched to Arc Testnet');
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902 || switchError.code === -32603) {
          console.log('Arc Testnet not found, adding network...');
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [arcTestnetParams],
          });
          console.log('Successfully added and switched to Arc Testnet');
        } else {
          console.error('Error switching to Arc Testnet:', switchError);
        }
      }
    } catch (err: any) {
      console.error('Error in switchToArcTestnet:', err);
    }
  }, [wallet]);

  // Load balance
  const loadBalance = useCallback(async () => {
    if (!wallet) return;
    
    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const address = wallet.address;
      
      // Native USDC on Arc uses 18 decimals
      const bal = await ethersProvider.getBalance(address);
      const formatted = ethers.formatUnits(bal, USDC_NATIVE_DECIMALS); // Use 18 for native
      const num = parseFloat(formatted);
      const final = isNaN(num) ? formatted : num.toFixed(USDC_DISPLAY_DECIMALS).replace(/\.?0+$/, '');
      setBalance(final);
    } catch (err: any) {
      console.error('Error loading balance:', err);
    }
  }, [wallet]);

  // Load custom token info
  const loadCustomTokenInfo = useCallback(async (tokenAddress: string) => {
    if (!wallet || !ethers.isAddress(tokenAddress)) {
      setCustomTokenInfo(null);
      setCustomTokenBalance(null);
      return;
    }

    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const address = wallet.address;

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
  }, [wallet]);

  // Send Token (USDC or ERC20)
  const sendToken = async () => {
    if (!authenticated || !wallet) {
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
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      if (selectedToken === 'usdc') {
        // Send native USDC
        const amountToSend = ethers.parseUnits(amountNum.toString(), USDC_NATIVE_DECIMALS);
        
        console.log(`Sending ${amountNum} USDC to ${sendToAddress}...`);
        const tx = await signer.sendTransaction({
          to: sendToAddress,
          value: amountToSend,
        });

        console.log(`Transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Transaction confirmed!`);
        
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
        
        console.log(`Sending ${amountNum} ${tokenSymbol} to ${sendToAddress}...`);
        
        const tx = await contract.transfer(sendToAddress, amountWei);
        console.log(`Transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Transaction confirmed!`);

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
      console.error('Error sending token:', err);
      setError(`Failed to send: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load transaction history from Arcscan API - ONLY for the currently connected wallet
  // This only fetches transactions for the wallet that user is currently using (not all wallets)
  const loadTransactionHistory = useCallback(async () => {
    // Only fetch if wallet is connected and user is authenticated
    if (!wallet || !authenticated) {
      setTransactions([]);
      return;
    }
    
    setLoadingHistory(true);
    try {
      // Get address of the CURRENTLY CONNECTED wallet only (not all wallets)
      const connectedAddress = wallet.address;
      console.log(`Fetching transaction history for connected wallet: ${connectedAddress}`);
      
      // Arcscan API endpoint - only fetch transactions for this one address
      const response = await fetch(`https://testnet.arcscan.app/api?module=account&action=txlist&address=${connectedAddress}&startblock=0&endblock=99999999&sort=desc`);
      const data = await response.json();
      
      if (data.status === '1' && data.result && Array.isArray(data.result)) {
        // Format transactions - API already returns only transactions involving this address
        // So no need to filter again, just format the data
        const formattedTxs = data.result
          .map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: ethers.formatUnits(tx.value || '0', 18),
            timestamp: parseInt(tx.timeStamp),
            type: tx.from.toLowerCase() === connectedAddress.toLowerCase() ? 'sent' : 'received',
            tokenAddress: null,
            isTokenTransfer: tx.input && tx.input !== '0x' && tx.input.length > 10
          }))
          .slice(0, 30); // Limit to 30 most recent to save bandwidth
        
        console.log(`Loaded ${formattedTxs.length} transactions for wallet ${connectedAddress}`);
        setTransactions(formattedTxs);
      } else {
        console.log(`No transactions found for wallet ${connectedAddress}`);
        setTransactions([]);
      }
    } catch (err: any) {
      console.error('Error loading transaction history:', err);
      setTransactions([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [wallet, authenticated]);

  // Load all tokens from Registry (Marketplace)
  const loadAllTokens = useCallback(async () => {
    if (!wallet || !authenticated) return;
    
    const registryAddr = REGISTRY_ADDRESS || localStorage.getItem('registryAddress') || '';
    if (!registryAddr || !ethers.isAddress(registryAddr)) {
      setAllTokens([]);
      return;
    }

    setLoadingMarketplace(true);
    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      
      const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, ethersProvider);
      
      // Try to get all tokens, handle empty/error responses gracefully
      try {
        const [addresses, infos] = await registry.getAllTokens();
        
        // Check if we got valid data
        if (addresses && infos && Array.isArray(addresses) && Array.isArray(infos) && addresses.length > 0) {
          const tokens = infos.map((info: any) => ({
            address: info.tokenAddress,
            deployer: info.deployer,
            name: info.name,
            symbol: info.symbol,
            decimals: Number(info.decimals),
            initialSupply: info.initialSupply.toString(),
            deployTimestamp: Number(info.deployTimestamp),
            isOwned: deployedTokens.some(t => t.address === info.tokenAddress)
          }));
          
          setAllTokens(tokens);
        } else {
          // No tokens found in Registry
          console.log('No tokens found in Registry');
          setAllTokens([]);
        }
      } catch (contractErr: any) {
        // If contract call fails (e.g., BAD_DATA from empty response), show empty list
        if (contractErr.code === 'BAD_DATA' || contractErr.message?.includes('could not decode')) {
          console.log('Registry returned empty or invalid data (likely no tokens registered)');
          setAllTokens([]);
        } else {
          throw contractErr; // Re-throw other errors
        }
      }
    } catch (err: any) {
      console.error('Error loading all tokens:', err);
      setAllTokens([]);
    } finally {
      setLoadingMarketplace(false);
    }
  }, [wallet, authenticated, deployedTokens]);

  // Load history when tab is activated
  useEffect(() => {
    if (activeTab === 'history' && authenticated && wallet) {
      loadTransactionHistory();
    }
  }, [activeTab, authenticated, wallet, loadTransactionHistory]);

  // Load marketplace when tab is activated
  useEffect(() => {
    if (activeTab === 'marketplace' && authenticated && wallet) {
      loadAllTokens();
    }
  }, [activeTab, authenticated, wallet, loadAllTokens]);

  // Load token balances
  const loadTokenBalances = useCallback(async (tokens: DeployedToken[]) => {
    if (!wallet || tokens.length === 0) {
      console.log('Cannot load token balances: no wallet or no tokens');
      return;
    }
    
    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const address = wallet.address;
      
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
      
      console.log(`Loading balances for ${tokens.length} tokens, wallet address: ${address}`);
      
      const balances = await Promise.all(
        tokens.map(async (token) => {
          try {
            console.log(`Fetching balance for token: ${token.name} (${token.symbol}) at ${token.address}`);
            
            if (!ethers.isAddress(token.address)) {
              console.error(`Invalid token address: ${token.address}`);
              return { ...token, balance: '0' };
            }
            
            const contract = new ethers.Contract(token.address, SimpleTokenABI, ethersProvider);
            
            // Fetch balance and decimals
            const balance = await contract.balanceOf(address);
            const decimals = await contract.decimals();
            
            console.log(`Token ${token.symbol}:`);
            console.log(`   - Address: ${address}`);
            console.log(`   - Token Address: ${token.address}`);
            console.log(`   - Raw Balance (BigInt): ${balance.toString()}`);
            console.log(`   - Decimals: ${decimals}`);
            
            if (!balance || balance.toString() === '0') {
              console.warn(`Token ${token.symbol} has zero balance`);
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
              console.error(`Error loading balance for ${token.address}:`, err);
            console.error(`   Error message: ${err.message}`);
            console.error(`   Error stack: ${err.stack}`);
            return { ...token, balance: 'Error' };
          }
        })
      );
      
      console.log(`Finished loading balances:`, balances);
      
      setDeployedTokens(balances);
    } catch (err: any) {
      console.error('Error loading token balances:', err);
    }
  }, [wallet]);

  // Load deployed tokens from Registry (on-chain) or localStorage (fallback)
  const loadTokensFromRegistry = useCallback(async () => {
    if (!wallet || !authenticated) return;
    
    const registryAddr = REGISTRY_ADDRESS || localStorage.getItem('registryAddress') || '';
    
    if (registryAddr && ethers.isAddress(registryAddr)) {
      try {
        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const deployerAddress = wallet.address;
        
        const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, ethersProvider);
        
        // Try to get tokens, handle empty/error responses gracefully
        try {
          const [addresses, infos] = await registry.getTokensByDeployer(deployerAddress);
          
          // Check if we got valid data
          if (addresses && infos && Array.isArray(addresses) && Array.isArray(infos) && addresses.length > 0) {
            const tokens: DeployedToken[] = infos.map((info: any) => ({
              address: info.tokenAddress,
              name: info.name,
              symbol: info.symbol,
              decimals: Number(info.decimals),
            }));
            
            console.log(`Loaded ${tokens.length} tokens from Registry`);
            
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
          } else {
            // No tokens found for this deployer
            console.log('No tokens found in Registry for this deployer');
            setDeployedTokens([]);
            loadTokensFromLocalStorage();
          }
        } catch (contractErr: any) {
          // If contract call fails (e.g., BAD_DATA from empty response), check localStorage
          if (contractErr.code === 'BAD_DATA' || contractErr.message?.includes('could not decode')) {
            console.log('Registry returned empty or invalid data (likely no tokens registered), checking localStorage');
            loadTokensFromLocalStorage();
          } else {
            throw contractErr; // Re-throw other errors
          }
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
  }, [wallet, authenticated, loadTokenBalances]);

  const loadTokensFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem('deployedTokens');
    if (saved) {
      try {
        const tokens = JSON.parse(saved);
        setDeployedTokens(tokens);
        console.log(`Loaded ${tokens.length} tokens from localStorage`);
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
  const handleTokenDeployed = useCallback(async (address: string, _txHash: string, name: string, symbol: string, decimals: number) => {
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
    if (wallet) {
      try {
        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const walletAddress = wallet.address;
        
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
  }, [deployedTokens, wallet, loadTokensFromRegistry]);

  // Auto-load balances and switch network when authenticated
  useEffect(() => {
    if (authenticated && wallet) {
      // Switch to Arc Testnet for external wallets
      switchToArcTestnet();
      loadBalance();
    }
  }, [authenticated, wallet, loadBalance, switchToArcTestnet]);

  // When user logs in, optionally disconnect external wallets if they want email-only mode
  // Note: This is optional - Privy supports multiple wallets simultaneously
  // Uncomment the code below if you want to auto-disconnect external wallets on email login
  /*
  useEffect(() => {
    if (authenticated && disconnectWallet) {
      // Check if user has both embedded and external wallets
      const hasEmbedded = wallets.some(w => w.walletClientType === 'privy');
      const hasExternal = wallets.some(w => w.walletClientType !== 'privy');
      
      // If user has both, and they just logged in with email (has embedded wallet),
      // optionally disconnect external wallets
      // Uncomment below to enable this behavior:
      // if (hasEmbedded && hasExternal) {
      //   const externalWallets = wallets.filter(w => w.walletClientType !== 'privy');
      //   externalWallets.forEach(async (wallet) => {
      //     try {
      //       await disconnectWallet(wallet.address);
      //     } catch (err) {
      //       console.error('Error disconnecting wallet:', err);
      //     }
      //   });
      // }
    }
  }, [authenticated, wallets, disconnectWallet]);
  */

  // Load token balances when tokens change
  useEffect(() => {
    if (authenticated && wallet && deployedTokens.length > 0) {
      // Only load if tokens don't have balances yet
      const needsBalance = deployedTokens.some(t => t.balance === undefined);
      if (needsBalance) {
        loadTokenBalances(deployedTokens);
      }
    }
  }, [authenticated, wallet, deployedTokens.length, loadTokenBalances]);

  // Not ready yet
  if (!ready) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        width: '100%',
        background: '#020617',
        position: 'relative',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ color: '#e2e8f0' }}>Loading Privy...</div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!authenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        width: '100%',
        background: '#020617',
        position: 'relative',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Dark Sphere Grid Background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: '#020617',
            backgroundImage: `
              linear-gradient(to right, rgba(71,85,105,0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(71,85,105,0.3) 1px, transparent 1px),
              radial-gradient(circle at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 70%)
            `,
            backgroundSize: '32px 32px, 32px 32px, 100% 100%',
          }}
        />
        
        <div style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '3rem',
          maxWidth: '600px',
          width: '100%',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: '#fff'
          }}>
            Arc Onboard MVP
          </h1>
          
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#cbd5e1', 
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
              background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
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
            Login with Privy
          </button>

          <p style={{ 
            fontSize: '0.9rem', 
            color: '#94a3b8', 
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
      width: '100%', 
      background: '#020617',
      position: 'relative',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Dark Sphere Grid Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: '#020617',
          backgroundImage: `
            linear-gradient(to right, rgba(71,85,105,0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(71,85,105,0.3) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 70%)
          `,
          backgroundSize: '32px 32px, 32px 32px, 100% 100%',
        }}
      />
      
      <div style={{
        position: 'relative',
        zIndex: 1,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '2.5rem',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        border: '1px solid rgba(71, 85, 105, 0.3)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: '#fff'
          }}>
            Arc Wallet
          </h1>
          <button
            onClick={async () => {
              // Try to disconnect MetaMask permissions before logout
              if (window.ethereum && window.ethereum.isMetaMask) {
                try {
                  // Revoke MetaMask permissions
                  await window.ethereum.request({
                    method: 'wallet_revokePermissions',
                    params: [{ eth_accounts: {} }],
                  });
                  console.log('MetaMask permissions revoked');
                } catch (err: any) {
                  // Ignore errors (user may have rejected or method not supported)
                  console.log('MetaMask revoke optional:', err.message || err);
                }
              }
              // Logout from Privy (this will disconnect all Privy-managed wallets)
              await logout();
            }}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              background: 'rgba(71, 85, 105, 0.5)',
              color: '#e2e8f0',
              border: '1px solid rgba(71, 85, 105, 0.5)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(71, 85, 105, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(71, 85, 105, 0.5)';
            }}
          >
            Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '2rem',
          borderBottom: '2px solid rgba(71, 85, 105, 0.3)',
          paddingBottom: '0',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <style>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <button
            onClick={() => setActiveTab('balance')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              background: activeTab === 'balance' ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 'rgba(30, 41, 59, 0.6)',
              color: activeTab === 'balance' ? 'white' : '#cbd5e1',
              border: 'none',
              borderBottom: activeTab === 'balance' ? '3px solid #818cf8' : '3px solid transparent',
              borderRadius: '12px 12px 0 0',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'balance' ? '0 4px 12px rgba(129, 140, 248, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'balance') {
                e.currentTarget.style.background = 'rgba(51, 65, 85, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'balance') {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
              }
            }}
          >
            Balance
          </button>
          <button
            onClick={() => setActiveTab('send')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              background: activeTab === 'send' ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 'rgba(30, 41, 59, 0.6)',
              color: activeTab === 'send' ? 'white' : '#cbd5e1',
              border: 'none',
              borderBottom: activeTab === 'send' ? '3px solid #818cf8' : '3px solid transparent',
              borderRadius: '12px 12px 0 0',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'send' ? '0 4px 12px rgba(129, 140, 248, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'send') {
                e.currentTarget.style.background = 'rgba(51, 65, 85, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'send') {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
              }
            }}
          >
            Send
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              background: activeTab === 'deploy' ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 'rgba(30, 41, 59, 0.6)',
              color: activeTab === 'deploy' ? 'white' : '#cbd5e1',
              border: 'none',
              borderBottom: activeTab === 'deploy' ? '3px solid #818cf8' : '3px solid transparent',
              borderRadius: '12px 12px 0 0',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'deploy' ? '0 4px 12px rgba(129, 140, 248, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'deploy') {
                e.currentTarget.style.background = 'rgba(51, 65, 85, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'deploy') {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
              }
            }}
          >
            Deploy
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              background: activeTab === 'history' ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 'rgba(30, 41, 59, 0.6)',
              color: activeTab === 'history' ? 'white' : '#cbd5e1',
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid #818cf8' : '3px solid transparent',
              borderRadius: '12px 12px 0 0',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'history' ? '0 4px 12px rgba(129, 140, 248, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'history') {
                e.currentTarget.style.background = 'rgba(51, 65, 85, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'history') {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
              }
            }}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              background: activeTab === 'marketplace' ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 'rgba(30, 41, 59, 0.6)',
              color: activeTab === 'marketplace' ? 'white' : '#cbd5e1',
              border: 'none',
              borderBottom: activeTab === 'marketplace' ? '3px solid #818cf8' : '3px solid transparent',
              borderRadius: '12px 12px 0 0',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'marketplace' ? '0 4px 12px rgba(129, 140, 248, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'marketplace') {
                e.currentTarget.style.background = 'rgba(51, 65, 85, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'marketplace') {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
              }
            }}
          >
            Marketplace
          </button>
        </div>

        {/* Tab Content */}
        <div>
        {activeTab === 'balance' && wallet && (
          <div style={{ 
            padding: '2rem', 
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '16px',
            minHeight: '400px',
            border: '1px solid rgba(71, 85, 105, 0.2)'
          }}>
            <div style={{ 
              padding: '1.5rem', 
              background: 'rgba(30, 41, 59, 0.6)', 
              borderRadius: '12px',
              marginBottom: '2rem',
              border: '1px solid rgba(71, 85, 105, 0.3)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Wallet Address
              </div>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: wallet.walletClientType !== 'privy' ? '#22c55e' : '#f59e0b', fontWeight: 500 }}>
                {wallet.walletClientType === 'privy' ? 'Embedded Wallet (Privy)' : `External Wallet (${wallet.walletClientType || 'Unknown'})`}
              </div>
              <div style={{ 
                fontFamily: 'monospace', 
                fontSize: '0.95rem',
                wordBreak: 'break-all',
                marginBottom: '1rem',
                color: '#e2e8f0',
                fontWeight: 500
              }}>
                {wallet.address}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(wallet.address);
                  setError('');
                  setTimeout(() => setError(''), 100);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Copy Address
              </button>
            </div>
            
            <div style={{ 
              padding: '1.5rem', 
              background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
              borderRadius: '12px',
              marginBottom: '2rem',
              boxShadow: '0 4px 16px rgba(129, 140, 248, 0.3)'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                USDC Balance
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>
                {balance ? `${balance} USDC` : 'Loading...'}
              </div>
            </div>
            
            {deployedTokens.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(71, 85, 105, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
                    Your Tokens:
                  </div>
                  <button
                    onClick={() => {
                      console.log('Manual refresh balances...');
                      loadTokenBalances(deployedTokens);
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      background: '#818cf8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#a78bfa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#818cf8'}
                  >
                    Refresh
                  </button>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {deployedTokens.map((token) => (
                    <div 
                      key={token.address} 
                      style={{ 
                        padding: '1.25rem', 
                        background: 'rgba(30, 41, 59, 0.6)',
                        borderRadius: '12px',
                        border: '1px solid rgba(71, 85, 105, 0.3)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(129, 140, 248, 0.3)';
                        e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                        e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.3)';
                      }}
                    >
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                        {token.name}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.75rem' }}>
                        {token.symbol}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '6px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
                        {token.address.slice(0, 8)}...{token.address.slice(-6)}
                      </div>
                      <div style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: 700, 
                        color: '#a78bfa',
                        padding: '0.75rem',
                        background: 'rgba(129, 140, 248, 0.15)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid rgba(129, 140, 248, 0.2)'
                      }}>
                        {token.balance !== undefined && token.balance !== 'Error' ? (
                          `${token.balance} ${token.symbol}`
                        ) : token.balance === 'Error' ? (
                          <span style={{ color: '#f87171', fontSize: '0.9rem' }}>Error loading</span>
                        ) : (
                          'Loading...'
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
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
              Get USDC from Faucet
            </a>
          </div>
        )}

        {activeTab === 'send' && (
          <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
            {/* Token Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
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
                  border: '2px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                  outline: 'none',
                  background: 'rgba(30, 41, 59, 0.6)',
                  color: '#e2e8f0'
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
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
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
                    border: '2px solid rgba(71, 85, 105, 0.5)',
                    borderRadius: '8px',
                    outline: 'none',
                    background: 'rgba(30, 41, 59, 0.6)',
                    color: '#e2e8f0'
                  }}
                />
                {customTokenInfo && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(129, 140, 248, 0.15)', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
                    <div style={{ color: '#e2e8f0' }}><strong>{customTokenInfo.name}</strong> ({customTokenInfo.symbol})</div>
                    <div style={{ color: '#cbd5e1', marginTop: '0.25rem' }}>
                      Your Balance: {customTokenBalance || '0'} {customTokenInfo.symbol}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recipient Address */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
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
                  border: '2px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                  outline: 'none',
                  background: 'rgba(30, 41, 59, 0.6)',
                  color: '#e2e8f0'
                }}
              />
            </div>
          
            {/* Amount Input */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
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
                  border: '2px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                  outline: 'none',
                  background: 'rgba(30, 41, 59, 0.6)',
                  color: '#e2e8f0'
                }}
              />
              <span style={{
                position: 'absolute',
                right: '1rem',
                top: '2.5rem',
                color: '#94a3b8',
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
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                Your Balance: {balance} USDC
              </div>
            )}
            {selectedToken !== 'usdc' && selectedToken !== 'custom' && (
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                Your Balance: {deployedTokens.find(t => t.address === selectedToken)?.balance || '0'} {deployedTokens.find(t => t.address === selectedToken)?.symbol || ''}
              </div>
            )}

            <button 
              onClick={sendToken} 
              disabled={loading || (selectedToken === 'custom' && !customTokenInfo)}
              style={{ 
                padding: '1rem 2rem', 
                fontSize: '1.1rem',
                background: (loading || (selectedToken === 'custom' && !customTokenInfo)) ? 'rgba(71, 85, 105, 0.5)' : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
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
              {loading ? 'Sending...' : `Send ${selectedToken === 'usdc' 
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
                background: 'rgba(239, 68, 68, 0.2)',
                borderLeft: '4px solid #ef4444',
                borderRadius: '4px',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {result && result.txHash && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: 'rgba(34, 197, 94, 0.2)',
                borderLeft: '4px solid #22c55e',
                borderRadius: '4px',
                color: '#86efac',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <strong>Success!</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  <a 
                    href={`https://testnet.arcscan.app/tx/${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#a78bfa', textDecoration: 'none' }}
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

        {activeTab === 'history' && wallet && (
          <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e2e8f0' }}>Transaction History</h2>
              <button
                onClick={() => loadTransactionHistory()}
                disabled={loadingHistory}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  background: loadingHistory ? 'rgba(71, 85, 105, 0.5)' : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loadingHistory ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {loadingHistory ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#cbd5e1' }}>
                Loading transaction history...
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#cbd5e1' }}>
                No transactions found
              </div>
            ) : (
              <div>
                {transactions.map((tx) => (
                  <div
                    key={tx.hash}
                    style={{
                      padding: '1rem',
                      marginBottom: '0.75rem',
                      background: 'rgba(30, 41, 59, 0.6)',
                      borderRadius: '8px',
                      border: '1px solid rgba(71, 85, 105, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: 600,
                          color: tx.type === 'sent' ? '#f87171' : '#86efac',
                          marginBottom: '0.25rem'
                        }}>
                          {tx.type === 'sent' ? 'Sent' : 'Received'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                          {tx.type === 'sent' ? (
                            <>To: {tx.to.slice(0, 6)}...{tx.to.slice(-4)}</>
                          ) : (
                            <>From: {tx.from.slice(0, 6)}...{tx.from.slice(-4)}</>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#a78bfa' }}>
                          {parseFloat(tx.value) > 0 ? `${parseFloat(tx.value).toFixed(6)} USDC` : 'Token Transfer'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                          {new Date(tx.timestamp * 1000).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`https://testnet.arcscan.app/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.85rem',
                        color: '#a78bfa',
                        textDecoration: 'none',
                        fontFamily: 'monospace'
                      }}
                    >
                      {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)} →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'marketplace' && wallet && (
          <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e2e8f0' }}>Token Marketplace</h2>
              <button
                onClick={() => loadAllTokens()}
                disabled={loadingMarketplace}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  background: loadingMarketplace ? 'rgba(71, 85, 105, 0.5)' : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loadingMarketplace ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {loadingMarketplace ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Search tokens by name or symbol..."
                value={marketplaceSearch}
                onChange={(e) => setMarketplaceSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '2px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                  outline: 'none',
                  background: 'rgba(30, 41, 59, 0.6)',
                  color: '#e2e8f0'
                }}
              />
            </div>

            {loadingMarketplace ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#cbd5e1', fontSize: '1.1rem' }}>
                Loading tokens...
              </div>
            ) : allTokens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#cbd5e1' }}>No tokens found</div>
                <div style={{ fontSize: '0.9rem' }}>Deploy a TokenRegistry first to start tracking tokens!</div>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                gap: '1.25rem' 
              }}>
                {allTokens
                  .filter((token) => {
                    if (!marketplaceSearch) return true;
                    const search = marketplaceSearch.toLowerCase();
                    return token.name.toLowerCase().includes(search) || 
                           token.symbol.toLowerCase().includes(search) ||
                           token.address.toLowerCase().includes(search);
                  })
                  .map((token) => (
                    <div
                      key={token.address}
                      style={{
                        padding: '1.5rem',
                        background: token.isOwned ? 'rgba(129, 140, 248, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                        borderRadius: '16px',
                        border: `2px solid ${token.isOwned ? 'rgba(129, 140, 248, 0.5)' : 'rgba(71, 85, 105, 0.3)'}`,
                        boxShadow: token.isOwned ? '0 4px 16px rgba(129, 140, 248, 0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = token.isOwned 
                          ? '0 8px 24px rgba(129, 140, 248, 0.4)' 
                          : '0 4px 16px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = token.isOwned 
                          ? '0 4px 16px rgba(129, 140, 248, 0.3)' 
                          : '0 2px 8px rgba(0,0,0,0.2)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0' }}>
                              {token.name}
                            </div>
                            {token.isOwned && (
                              <span style={{ 
                                fontSize: '0.75rem', 
                                background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                                color: 'white', 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '12px',
                                fontWeight: 700,
                                boxShadow: '0 2px 8px rgba(129, 140, 248, 0.3)'
                              }}>
                                Your Token
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '1rem', color: '#a78bfa', fontWeight: 700, marginBottom: '1rem' }}>
                            {token.symbol}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
                            {token.address.slice(0, 10)}...{token.address.slice(-8)}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                            <strong>Deployer:</strong> {token.deployer.slice(0, 8)}...{token.deployer.slice(-6)}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(129, 140, 248, 0.15)', borderRadius: '8px', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
                            Supply: {ethers.formatUnits(token.initialSupply, token.decimals)} {token.symbol}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Deployed: {new Date(token.deployTimestamp * 1000).toLocaleDateString()} {new Date(token.deployTimestamp * 1000).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(71, 85, 105, 0.3)' }}>
                        <a
                          href={`https://testnet.arcscan.app/address/${token.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            width: '100%',
                            textAlign: 'center',
                            padding: '0.75rem 1rem',
                            fontSize: '0.9rem',
                            background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            boxShadow: '0 4px 12px rgba(129, 140, 248, 0.3)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(129, 140, 248, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(129, 140, 248, 0.3)';
                          }}
                        >
                          View on Arcscan →
                        </a>
                      </div>
                    </div>
                  ))}
                {allTokens.filter((token) => {
                  if (!marketplaceSearch) return true;
                  const search = marketplaceSearch.toLowerCase();
                  return token.name.toLowerCase().includes(search) || 
                         token.symbol.toLowerCase().includes(search) ||
                         token.address.toLowerCase().includes(search);
                }).length === 0 && (
                  <div style={{ 
                    gridColumn: '1 / -1',
                    textAlign: 'center', 
                    padding: '4rem', 
                    color: '#94a3b8' 
                  }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#cbd5e1' }}>No tokens match your search</div>
                    <div style={{ fontSize: '0.9rem' }}>Try a different keyword</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ 
          marginTop: '2rem', 
          paddingTop: '2rem', 
          borderTop: '1px solid rgba(71, 85, 105, 0.3)',
          fontSize: '0.9rem',
          color: '#94a3b8'
        }}>
          <p style={{ margin: '0.5rem 0', color: '#94a3b8' }}>
            Built on Arc Testnet with Privy
          </p>
          <p style={{ margin: '0.5rem 0', color: '#94a3b8' }}>
            Powered by Embedded Wallets
          </p>
          <p style={{ margin: '0.5rem 0', color: '#94a3b8' }}>
            Zero gas for users, instant finality
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

export default App;
