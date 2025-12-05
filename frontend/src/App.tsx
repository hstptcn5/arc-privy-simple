import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import DeployToken from './DeployToken';
import DeployRegistry from './DeployRegistry';
import DeployAMM from './DeployAMM';
import { REGISTRY_ADDRESS, REGISTRY_ABI } from './registryConfig';
import { AMM_ADDRESS, AMM_ABI } from './ammConfig';
import { USDC_ADDRESSES, ERC20_ABI } from './cctpConfig';
import TokenDetail from './TokenDetail';
import CrossChainBridge from './CrossChainBridge';
import CrossChainBridgeWithKit from './CrossChainBridgeWithKit';
import { MULTISEND_ADDRESS, MULTISEND_ABI, MULTISEND_BYTECODE } from './multisendConfig';

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

  // Wagmi hooks for MetaMask
  const { address: wagmiAddress, isConnected: isWagmiConnected, chain } = useAccount();
  const { connect: wagmiConnect, connectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // Wallet selection state - default to Privy if authenticated, otherwise MetaMask
  const [walletType, setWalletType] = useState<'privy' | 'metamask'>(
    authenticated ? 'privy' : 'metamask'
  );

  // Supported testnet chains for network switching
  const SUPPORTED_NETWORKS = [
    { id: 5042002, name: 'Arc Testnet', shortName: 'Arc' },
    { id: 11155111, name: 'Ethereum Sepolia', shortName: 'Sepolia' },
    { id: 84532, name: 'Base Sepolia', shortName: 'Base' },
    { id: 421614, name: 'Arbitrum Sepolia', shortName: 'Arbitrum' },
    { id: 11155420, name: 'Optimism Sepolia', shortName: 'Optimism' },
  ];

  // Helper to get active wallet info
  const getActiveWalletInfo = () => {
    if (walletType === 'metamask' && isWagmiConnected && wagmiAddress) {
      return {
        address: wagmiAddress,
        type: 'metamask',
        name: 'MetaMask',
      };
    }
    if (walletType === 'privy' && wallet) {
      return {
        address: wallet.address,
        type: wallet.walletClientType || 'privy',
        name: wallet.walletClientType === 'privy' ? 'Privy Embedded Wallet' : `External Wallet (${wallet.walletClientType})`,
      };
    }
    return null;
  };

  // UI States
  const [activeTab, setActiveTab] = useState<'balance' | 'send' | 'deploy' | 'history' | 'marketplace' | 'bridge' | 'batch' | 'invoices'>('balance');

  // History states
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Marketplace states
  const [allTokens, setAllTokens] = useState<any[]>([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [creatingPoolFor, setCreatingPoolFor] = useState<string | null>(null);
  const [poolLiquidityTokens, setPoolLiquidityTokens] = useState('');
  const [poolLiquidityUSDC, setPoolLiquidityUSDC] = useState('');
  const [selectedTokenDetail, setSelectedTokenDetail] = useState<any | null>(null);
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
  const [customTokenInfo, setCustomTokenInfo] = useState<{ name: string, symbol: string, decimals: number } | null>(null);
  const [customTokenBalance, setCustomTokenBalance] = useState<string | null>(null);

  // Gas fee estimation states
  const [estimatedGasFee, setEstimatedGasFee] = useState<string | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);

  // Real-time transaction status
  const [txStatus, setTxStatus] = useState<'idle' | 'estimating' | 'pending' | 'confirming' | 'confirmed' | 'error'>('idle');
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);

  // Batch payments states
  const [batchRecipients, setBatchRecipients] = useState<Array<{ address: string, amount: string }>>([{ address: '', amount: '' }]);
  const [batchToken, setBatchToken] = useState<'usdc' | 'custom' | string>('usdc');
  const [batchTokenAddress, setBatchTokenAddress] = useState('');
  const [batchTokenInfo, setBatchTokenInfo] = useState<{ name: string, symbol: string, decimals: number } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [batchResults, setBatchResults] = useState<Array<{ address: string, txHash?: string, error?: string }>>([]);

  // Multisend contract state
  // Initialize from localStorage, or fallback to MULTISEND_ADDRESS from config (for Vercel builds)
  const [multisendAddress, setMultisendAddress] = useState<string>(() => {
    const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('multisendAddress') : null;
    return fromStorage || MULTISEND_ADDRESS || '';
  });
  const [isDeployingMultisend, setIsDeployingMultisend] = useState(false);

  // Invoice/Payment Request states
  interface Invoice {
    id: string;
    invoiceNumber: string; // Professional invoice number (INV-001, INV-002, etc.)
    title: string;
    description: string;
    amount: string;
    token: 'usdc' | string; // token address or 'usdc'
    tokenSymbol: string;
    recipientAddress: string; // who should receive payment
    createdAt: number;
    expiresAt?: number; // optional expiry timestamp
    status: 'pending' | 'paid' | 'expired';
    paidTxHash?: string;
    paidAt?: number;
    discount?: string; // optional discount amount
    tax?: string; // optional tax amount
    totalAmount?: string; // amount + tax - discount
    clientName?: string; // optional client/customer name
    clientEmail?: string; // optional client email
  }

  interface InvoiceTemplate {
    id: string;
    name: string;
    title: string;
    description: string;
    token: 'usdc' | string;
    discount?: string;
    tax?: string;
    clientName?: string;
  }

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('invoices');
    return saved ? JSON.parse(saved) : [];
  });
  const [newInvoice, setNewInvoice] = useState({
    title: '',
    description: '',
    amount: '',
    token: 'usdc' as 'usdc' | string,
    expiresInDays: '',
    discount: '',
    tax: '',
    clientName: '',
    clientEmail: ''
  });
  const [invoiceTokenInfo, setInvoiceTokenInfo] = useState<{ name: string, symbol: string, decimals: number } | null>(null);
  const [invoiceCustomTokenAddress, setInvoiceCustomTokenAddress] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplate[]>(() => {
    const saved = localStorage.getItem('invoiceTemplates');
    return saved ? JSON.parse(saved) : [];
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'pending' | 'paid' | 'expired'>('all');

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

  // Get current active address as a memoized value - used for history to prevent unnecessary fetches
  const activeAddress = useMemo(() => {
    if (walletType === 'metamask' && isWagmiConnected && wagmiAddress) {
      return wagmiAddress;
    }
    if (walletType === 'privy' && wallet) {
      return wallet.address;
    }
    return null;
  }, [walletType, isWagmiConnected, wagmiAddress, wallet]);

  // Helper to get provider and signer based on wallet type
  const getProviderAndSigner = useCallback(async () => {
    if (walletType === 'metamask' && isWagmiConnected && window.ethereum) {
      // Use MetaMask provider from window.ethereum
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = wagmiAddress!;
      return { provider, signer, address };
    } else if (walletType === 'privy' && wallet) {
      // Use Privy wallet
      const privyProvider = await wallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(privyProvider);
      const signer = await provider.getSigner();
      const address = wallet.address;
      return { provider, signer, address };
    }
    throw new Error('No wallet connected');
  }, [walletType, isWagmiConnected, wagmiAddress, wallet]);

  // Helper to switch network with auto-add if needed (for MetaMask)
  const switchNetworkWithAutoAdd = useCallback(async (chainId: number) => {
    if (!isWagmiConnected || !window.ethereum) {
      console.error('MetaMask not connected');
      return;
    }

    try {
      // Try to switch chain first
      await switchChain({ chainId });
    } catch (err: any) {
      console.log('Error switching chain, attempting to add network:', err);

      // If network doesn't exist (error code 4902), add it
      if (err.code === 4902 || err.code === -32603 || err.message?.includes('unrecognized chain')) {
        // Get network params
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
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              };
            case 84532: // Base Sepolia
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Base Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia-explorer.base.org'],
              };
            case 421614: // Arbitrum Sepolia
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Arbitrum Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://sepolia-explorer.arbitrum.io'],
              };
            case 11155420: // Optimism Sepolia
              return {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Optimism Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.optimism.io'],
                blockExplorerUrls: ['https://sepolia-optimism.etherscan.io'],
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

        // Add network to MetaMask
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkParams],
          });
          console.log(`Successfully added and switched to chain ${chainId}`);

          // After adding, try to switch again
          await switchChain({ chainId });
        } catch (addError: any) {
          console.error(`Error adding network ${chainId}:`, addError);
          throw addError;
        }
      } else {
        // Other errors, re-throw
        throw err;
      }
    }
  }, [isWagmiConnected, switchChain]);

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
    // Check if we have a valid wallet connection
    if (walletType === 'metamask' && !isWagmiConnected) return;
    if (walletType === 'privy' && !wallet) return;

    try {
      let provider: ethers.BrowserProvider;
      let address: string;

      if (walletType === 'metamask' && isWagmiConnected && window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        address = wagmiAddress!;
      } else if (walletType === 'privy' && wallet) {
        const privyProvider = await wallet.getEthereumProvider();
        provider = new ethers.BrowserProvider(privyProvider);
        address = wallet.address;
      } else {
        return;
      }

      const ethersProvider = provider;

      // Get current chain ID
      let currentChainId: number;
      if (walletType === 'metamask' && chain?.id) {
        // Use wagmi chain ID for MetaMask
        currentChainId = chain.id;
      } else {
        // Get chain ID from provider for Privy wallet
        const network = await ethersProvider.getNetwork();
        currentChainId = Number(network.chainId);
      }

      // Get USDC address for current chain
      const usdcAddress = USDC_ADDRESSES[currentChainId];

      if (usdcAddress) {
        // Use ERC-20 balance for chains with USDC contract
        const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, ethersProvider);
        const decimals = await usdcContract.decimals();
        const bal = await usdcContract.balanceOf(address);
        const formatted = ethers.formatUnits(bal, decimals);
        const num = parseFloat(formatted);
        const final = isNaN(num) ? formatted : num.toFixed(USDC_DISPLAY_DECIMALS).replace(/\.?0+$/, '');
        setBalance(final);
      } else {
        // Fallback to native balance for Arc or chains without USDC contract
        const bal = await ethersProvider.getBalance(address);
        const formatted = ethers.formatUnits(bal, USDC_NATIVE_DECIMALS); // Use 18 for native
        const num = parseFloat(formatted);
        const final = isNaN(num) ? formatted : num.toFixed(USDC_DISPLAY_DECIMALS).replace(/\.?0+$/, '');
        setBalance(final);
      }
    } catch (err: any) {
      console.error('Error loading balance:', err);
    }
  }, [wallet, walletType, chain, isWagmiConnected, wagmiAddress]);

  // Load custom token info
  const loadCustomTokenInfo = useCallback(async (tokenAddress: string) => {
    // Check wallet connection
    if (walletType === 'metamask' && !isWagmiConnected) {
      setCustomTokenInfo(null);
      setCustomTokenBalance(null);
      return;
    }
    if (walletType === 'privy' && !wallet) {
      setCustomTokenInfo(null);
      setCustomTokenBalance(null);
      return;
    }
    if (!ethers.isAddress(tokenAddress)) {
      setCustomTokenInfo(null);
      setCustomTokenBalance(null);
      return;
    }

    try {
      const { provider: ethersProvider, address } = await getProviderAndSigner();

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
  }, [wallet, walletType, isWagmiConnected, getProviderAndSigner]);

  // Estimate gas fee for transaction
  const estimateGasFee = useCallback(async (transactionType: 'native' | 'erc20', params?: { tokenAddress?: string, decimals?: number }) => {
    if (!activeAddress) return null;

    try {
      const { provider } = await getProviderAndSigner();

      let gasEstimate: bigint;

      if (transactionType === 'native') {
        // Estimate for native USDC transfer
        const amountToSend = ethers.parseUnits(amount || '0', USDC_NATIVE_DECIMALS);
        gasEstimate = await provider.estimateGas({
          from: activeAddress,
          to: sendToAddress,
          value: amountToSend,
        });
      } else {
        // Estimate for ERC20 transfer
        if (!params?.tokenAddress || !params?.decimals) return null;

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

        const contract = new ethers.Contract(params.tokenAddress, TokenABI, provider);
        const amountWei = ethers.parseUnits(amount || '0', params.decimals);
        gasEstimate = await contract.transfer.estimateGas(sendToAddress, amountWei);
      }

      // Get fee data
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 0n;

      // Calculate fee in USDC (gas * gasPrice)
      const feeWei = gasEstimate * gasPrice;
      const feeInUSDC = ethers.formatUnits(feeWei, USDC_NATIVE_DECIMALS);

      // Format to show ~$0.01 (Arc's typical fee)
      const feeNum = parseFloat(feeInUSDC);
      if (feeNum < 0.01) {
        return '~$0.01';
      }
      return `~$${feeNum.toFixed(4)}`;
    } catch (err: any) {
      console.error('Error estimating gas:', err);
      // Fallback to Arc's typical fee
      return '~$0.01';
    }
  }, [activeAddress, amount, sendToAddress, getProviderAndSigner]);

  // Estimate gas when form changes
  useEffect(() => {
    if (!sendToAddress || !amount || !activeAddress) {
      setEstimatedGasFee(null);
      return;
    }

    const estimate = async () => {
      setIsEstimatingGas(true);
      try {
        if (selectedToken === 'usdc') {
          const fee = await estimateGasFee('native');
          setEstimatedGasFee(fee);
        } else if (selectedToken === 'custom' && customTokenInfo) {
          const fee = await estimateGasFee('erc20', {
            tokenAddress: customTokenAddress,
            decimals: customTokenInfo.decimals
          });
          setEstimatedGasFee(fee);
        } else if (selectedToken !== 'usdc' && selectedToken !== 'custom') {
          const token = deployedTokens.find(t => t.address === selectedToken);
          if (token) {
            const fee = await estimateGasFee('erc20', {
              tokenAddress: token.address,
              decimals: token.decimals
            });
            setEstimatedGasFee(fee);
          }
        }
      } catch (err) {
        console.error('Error estimating gas fee:', err);
        setEstimatedGasFee('~$0.01'); // Fallback
      } finally {
        setIsEstimatingGas(false);
      }
    };

    // Debounce estimation
    const timeoutId = setTimeout(estimate, 500);
    return () => clearTimeout(timeoutId);
  }, [sendToAddress, amount, selectedToken, customTokenAddress, customTokenInfo, deployedTokens, activeAddress, estimateGasFee]);

  // Send Token (USDC or ERC20)
  const sendToken = async () => {
    // Check wallet connection based on walletType
    if (walletType === 'metamask' && !isWagmiConnected) {
      setError('Please connect MetaMask first');
      return;
    }
    if (walletType === 'privy' && (!authenticated || !wallet)) {
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
    setTxStatus('estimating');

    try {
      const { signer } = await getProviderAndSigner();

      if (selectedToken === 'usdc') {
        // Send native USDC
        const amountToSend = ethers.parseUnits(amountNum.toString(), USDC_NATIVE_DECIMALS);

        setTxStatus('pending');
        console.log(`Sending ${amountNum} USDC to ${sendToAddress}...`);
        const tx = await signer.sendTransaction({
          to: sendToAddress,
          value: amountToSend,
        });

        setCurrentTxHash(tx.hash);
        setTxStatus('confirming');
        console.log(`Transaction submitted: ${tx.hash}`);

        // Wait for confirmation with real-time status
        const receipt = await tx.wait();
        setTxStatus('confirmed');
        console.log(`Transaction confirmed!`);

        setResult({ txHash: receipt!.hash });

        // Check if this was an invoice payment and update status immediately
        if (selectedInvoice && sendToAddress.toLowerCase() === selectedInvoice.recipientAddress.toLowerCase()) {
          // Wait a bit for transaction to be indexed, then check
          setTimeout(() => {
            checkInvoicePayment(selectedInvoice);
          }, 2000);
        }

        // Reset after a moment
        setTimeout(() => {
          setTxStatus('idle');
          setCurrentTxHash(null);
          setSendToAddress('');
          setAmount('');
        }, 2000);

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

        setTxStatus('pending');
        console.log(`Sending ${amountNum} ${tokenSymbol} to ${sendToAddress}...`);

        const tx = await contract.transfer(sendToAddress, amountWei);

        setCurrentTxHash(tx.hash);
        setTxStatus('confirming');
        console.log(`Transaction submitted: ${tx.hash}`);

        // Wait for confirmation with real-time status
        const receipt = await tx.wait();
        setTxStatus('confirmed');
        console.log(`Transaction confirmed!`);

        setResult({ txHash: receipt!.hash });

        // Check if this was an invoice payment and update status immediately
        if (selectedInvoice && sendToAddress.toLowerCase() === selectedInvoice.recipientAddress.toLowerCase()) {
          // Wait a bit for transaction to be indexed, then check
          setTimeout(() => {
            checkInvoicePayment(selectedInvoice);
          }, 2000);
        }

        // Reset after a moment
        setTimeout(() => {
          setTxStatus('idle');
          setCurrentTxHash(null);
          setSendToAddress('');
          setAmount('');
        }, 2000);

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
      setTxStatus('error');
      setError(`Failed to send: ${err.message}`);
      setTimeout(() => {
        setTxStatus('idle');
        setCurrentTxHash(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Batch Payments - Send to multiple recipients using Multisend contract (single transaction)
  const sendBatchPayments = async () => {
    // Check wallet connection
    if (walletType === 'metamask' && !isWagmiConnected) {
      setBatchError('Please connect MetaMask first');
      return;
    }
    if (walletType === 'privy' && (!authenticated || !wallet)) {
      setBatchError('Please login first');
      return;
    }

    // Validate recipients
    const validRecipients = batchRecipients.filter(r =>
      r.address && ethers.isAddress(r.address) && r.amount && parseFloat(r.amount) > 0
    );

    if (validRecipients.length === 0) {
      setBatchError('Please add at least one valid recipient');
      return;
    }

    // Check if Multisend contract address is set
    const currentMultisendAddress = multisendAddress || MULTISEND_ADDRESS || localStorage.getItem('multisendAddress');
    if (!currentMultisendAddress || !ethers.isAddress(currentMultisendAddress)) {
      setBatchError('Multisend contract address not set. Please deploy Multisend contract first or set the address in localStorage (multisendAddress)');
      return;
    }

    setBatchLoading(true);
    setBatchError('');
    setBatchResults([]);

    try {
      const { signer } = await getProviderAndSigner();

      // Prepare recipients and amounts arrays
      const recipients = validRecipients.map(r => r.address);
      let amounts: bigint[];
      let totalAmount: bigint = 0n;

      if (batchToken === 'usdc') {
        // Native USDC - amounts in wei
        amounts = validRecipients.map(r => {
          const amount = ethers.parseUnits(r.amount, USDC_NATIVE_DECIMALS);
          totalAmount += amount;
          return amount;
        });

        // Use Multisend contract for native USDC
        const multisendContract = new ethers.Contract(currentMultisendAddress, MULTISEND_ABI, signer);

        console.log(`Sending batch of ${recipients.length} native USDC transfers...`);
        const tx = await multisendContract.batchSendNative(recipients, amounts, { value: totalAmount });

        console.log(`Batch transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Batch transaction confirmed!`);

        // All recipients succeeded in one transaction
        const results = recipients.map(addr => ({ address: addr, txHash: receipt.hash }));
        setBatchResults(results);
      } else {
        // ERC20 tokens
        let tokenAddress: string;
        let decimals: number;
        let tokenSymbol: string;

        if (batchToken === 'custom') {
          // Custom token address
          if (!batchTokenAddress || !ethers.isAddress(batchTokenAddress)) {
            setBatchError('Invalid custom token address');
            setBatchLoading(false);
            return;
          }
          if (!batchTokenInfo) {
            setBatchError('Please wait for token info to load');
            setBatchLoading(false);
            return;
          }
          tokenAddress = batchTokenAddress;
          decimals = batchTokenInfo.decimals;
          tokenSymbol = batchTokenInfo.symbol;
        } else {
          // Deployed token
          const token = deployedTokens.find(t => t.address === batchToken);
          if (!token) {
            setBatchError('Token not found');
            setBatchLoading(false);
            return;
          }
          tokenAddress = token.address;
          decimals = token.decimals;
          tokenSymbol = token.symbol;
        }

        amounts = validRecipients.map(r => {
          return ethers.parseUnits(r.amount, decimals);
        });

        // For ERC20, we need to approve Multisend contract first
        const TokenABI = [
          {
            inputs: [
              { internalType: 'address', name: 'spender', type: 'address' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' }
            ],
            name: 'approve',
            outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function'
          },
          {
            inputs: [
              { internalType: 'address', name: 'owner', type: 'address' },
              { internalType: 'address', name: 'spender', type: 'address' }
            ],
            name: 'allowance',
            outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }
        ];

        const tokenContract = new ethers.Contract(tokenAddress, TokenABI, signer);

        // Calculate total amount needed
        totalAmount = amounts.reduce((sum, amount) => sum + amount, 0n);

        // Check current allowance
        const currentAllowance = await tokenContract.allowance(activeAddress, currentMultisendAddress);

        if (currentAllowance < totalAmount) {
          console.log(`Approving Multisend contract to spend ${ethers.formatUnits(totalAmount, decimals)} ${tokenSymbol}...`);
          const approveTx = await tokenContract.approve(currentMultisendAddress, totalAmount);
          await approveTx.wait();
          console.log('Approval confirmed');
        }

        // Use Multisend contract for ERC20
        const multisendContract = new ethers.Contract(currentMultisendAddress, MULTISEND_ABI, signer);

        console.log(`Sending batch of ${recipients.length} ERC20 transfers...`);
        const tx = await multisendContract.batchSendERC20Direct(tokenAddress, recipients, amounts);

        console.log(`Batch transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Batch transaction confirmed!`);

        // All recipients succeeded in one transaction
        const results = recipients.map(addr => ({ address: addr, txHash: receipt.hash }));
        setBatchResults(results);
      }

      // Reload balance after batch
      await loadBalance();
      if (batchToken !== 'usdc') {
        await loadTokenBalances(deployedTokens);
      }
    } catch (err: any) {
      console.error('Error in batch payments:', err);
      setBatchError(`Batch payment failed: ${err.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // Generate next invoice number
  const getNextInvoiceNumber = useCallback(() => {
    const lastInvoice = invoices.sort((a, b) => {
      const numA = parseInt(a.invoiceNumber?.replace('INV-', '') || '0');
      const numB = parseInt(b.invoiceNumber?.replace('INV-', '') || '0');
      return numB - numA;
    })[0];

    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.replace('INV-', '') || '0');
      return `INV-${String(lastNum + 1).padStart(4, '0')}`;
    }
    return 'INV-0001';
  }, [invoices]);

  // Calculate total amount with discount and tax
  const calculateInvoiceTotal = useCallback((amount: string, discount?: string, tax?: string) => {
    let total = parseFloat(amount) || 0;
    if (discount) {
      total -= parseFloat(discount) || 0;
    }
    if (tax) {
      total += parseFloat(tax) || 0;
    }
    return Math.max(0, total).toFixed(6);
  }, []);

  // Create new invoice/payment request
  const createInvoice = useCallback(async () => {
    if (!activeAddress) {
      alert('Please connect wallet first');
      return;
    }

    if (!newInvoice.title || !newInvoice.amount) {
      alert('Please fill in title and amount');
      return;
    }

    const amountNum = parseFloat(newInvoice.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Invalid amount');
      return;
    }

    // Determine token info and actual token address
    let tokenSymbol = 'USDC';
    let actualTokenAddress: string = 'usdc';

    if (newInvoice.token !== 'usdc') {
      if (newInvoice.token === 'custom') {
        // For custom token, use the address from input field
        if (!invoiceCustomTokenAddress || !ethers.isAddress(invoiceCustomTokenAddress)) {
          alert('Please enter a valid custom token address');
          return;
        }
        if (!invoiceTokenInfo) {
          alert('Please load custom token info first');
          return;
        }
        actualTokenAddress = invoiceCustomTokenAddress;
        tokenSymbol = invoiceTokenInfo.symbol;
      } else {
        // For deployed token, use the address from dropdown
        const token = deployedTokens.find(t => t.address === newInvoice.token);
        if (!token) {
          alert('Token not found');
          return;
        }
        actualTokenAddress = newInvoice.token;
        tokenSymbol = token.symbol;
      }
    }

    // Generate unique invoice ID and professional invoice number
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const invoiceNumber = getNextInvoiceNumber();

    // Calculate expiry
    const expiresAt = newInvoice.expiresInDays
      ? Date.now() + (parseInt(newInvoice.expiresInDays) * 24 * 60 * 60 * 1000)
      : undefined;

    // Calculate total with discount and tax
    const totalAmount = calculateInvoiceTotal(newInvoice.amount, newInvoice.discount, newInvoice.tax);

    const invoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      title: newInvoice.title,
      description: newInvoice.description || '',
      amount: newInvoice.amount,
      token: actualTokenAddress, // Use actual token address instead of 'custom' or dropdown value
      tokenSymbol,
      recipientAddress: activeAddress,
      createdAt: Date.now(),
      expiresAt,
      status: 'pending',
      discount: newInvoice.discount || undefined,
      tax: newInvoice.tax || undefined,
      totalAmount: totalAmount !== newInvoice.amount ? totalAmount : undefined,
      clientName: newInvoice.clientName || undefined,
      clientEmail: newInvoice.clientEmail || undefined
    };

    const updatedInvoices = [invoice, ...invoices];
    setInvoices(updatedInvoices);
    localStorage.setItem('invoices', JSON.stringify(updatedInvoices));

    // Reset form
    setNewInvoice({
      title: '',
      description: '',
      amount: '',
      token: 'usdc',
      expiresInDays: '',
      discount: '',
      tax: '',
      clientName: '',
      clientEmail: ''
    });
    setInvoiceTokenInfo(null);
    setInvoiceCustomTokenAddress('');

    // Select the new invoice to show shareable link
    setSelectedInvoice(invoice);
  }, [activeAddress, newInvoice, invoiceTokenInfo, invoiceCustomTokenAddress, deployedTokens, invoices, getNextInvoiceNumber, calculateInvoiceTotal]);

  // Save invoice as template
  const saveAsTemplate = useCallback(() => {
    if (!newInvoice.title) {
      alert('Please fill in at least title');
      return;
    }

    const template: InvoiceTemplate = {
      id: `tpl_${Date.now()}`,
      name: newInvoice.title,
      title: newInvoice.title,
      description: newInvoice.description,
      token: newInvoice.token,
      discount: newInvoice.discount || undefined,
      tax: newInvoice.tax || undefined,
      clientName: newInvoice.clientName || undefined
    };

    const updated = [...invoiceTemplates, template];
    setInvoiceTemplates(updated);
    localStorage.setItem('invoiceTemplates', JSON.stringify(updated));
    alert('Template saved!');
  }, [newInvoice, invoiceTemplates]);

  // Load template into form
  const loadTemplate = useCallback((template: InvoiceTemplate) => {
    setNewInvoice({
      title: template.title,
      description: template.description || '',
      amount: '',
      token: template.token,
      expiresInDays: '',
      discount: template.discount || '',
      tax: template.tax || '',
      clientName: template.clientName || '',
      clientEmail: ''
    });
    setShowTemplateModal(false);
  }, []);

  // Export invoices to CSV
  const exportInvoicesToCSV = useCallback(() => {
    const headers = ['Invoice Number', 'Title', 'Amount', 'Token', 'Status', 'Created', 'Paid', 'Client Name', 'Client Email'];
    const rows = invoices.map(inv => [
      inv.invoiceNumber || inv.id,
      inv.title,
      inv.amount,
      inv.tokenSymbol,
      inv.status,
      new Date(inv.createdAt).toLocaleString(),
      inv.paidAt ? new Date(inv.paidAt).toLocaleString() : '',
      inv.clientName || '',
      inv.clientEmail || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [invoices]);

  // Calculate invoice statistics
  const invoiceStats = useMemo(() => {
    const total = invoices.length;
    const pending = invoices.filter(inv => inv.status === 'pending').length;
    const paid = invoices.filter(inv => inv.status === 'paid').length;
    const expired = invoices.filter(inv => inv.status === 'expired').length;

    const totalAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);

    return { total, pending, paid, expired, totalAmount };
  }, [invoices]);

  // Check invoice payment status by monitoring on-chain transactions
  const checkInvoicePayment = useCallback(async (invoice: Invoice) => {
    try {
      // Check if expired
      if (invoice.expiresAt && Date.now() > invoice.expiresAt) {
        if (invoice.status !== 'expired') {
          const updated = invoices.map(inv =>
            inv.id === invoice.id ? { ...inv, status: 'expired' as const } : inv
          );
          setInvoices(updated);
          localStorage.setItem('invoices', JSON.stringify(updated));
        }
        return;
      }

      // Check Arcscan API for recent transactions to recipient address
      const response = await fetch(
        `https://testnet.arcscan.app/api?module=account&action=txlist&address=${invoice.recipientAddress}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10`
      );
      const data = await response.json();

      if (data.status === '1' && data.result && Array.isArray(data.result)) {
        // Check if any transaction matches invoice amount and token
        for (const tx of data.result) {
          // Check if transaction is after invoice creation
          if (parseInt(tx.timeStamp) * 1000 < invoice.createdAt) continue;

          // For native USDC
          if (invoice.token === 'usdc') {
            const amountWei = ethers.parseUnits(invoice.amount, USDC_NATIVE_DECIMALS);
            const txValue = BigInt(tx.value || '0');
            // Allow small tolerance (0.1% difference)
            const tolerance = amountWei * BigInt(999) / BigInt(1000);
            if (txValue >= tolerance && tx.to?.toLowerCase() === invoice.recipientAddress.toLowerCase()) {
              // Payment found!
              const updated = invoices.map(inv =>
                inv.id === invoice.id
                  ? { ...inv, status: 'paid' as const, paidTxHash: tx.hash, paidAt: parseInt(tx.timeStamp) * 1000 }
                  : inv
              );
              setInvoices(updated);
              localStorage.setItem('invoices', JSON.stringify(updated));
              return;
            }
          } else {
            // For ERC20 tokens - check token transfers
            // First, get token transfers for this address
            try {
              const tokenTransferResponse = await fetch(
                `https://testnet.arcscan.app/api?module=account&action=tokentx&address=${invoice.recipientAddress}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10`
              );
              const tokenData = await tokenTransferResponse.json();

              if (tokenData.status === '1' && tokenData.result && Array.isArray(tokenData.result)) {
                for (const tokenTx of tokenData.result) {
                  // Check if transaction is after invoice creation
                  if (parseInt(tokenTx.timeStamp) * 1000 < invoice.createdAt) continue;

                  // Check if token address matches
                  if (tokenTx.contractAddress?.toLowerCase() !== invoice.token.toLowerCase()) continue;

                  // Check if recipient matches
                  if (tokenTx.to?.toLowerCase() !== invoice.recipientAddress.toLowerCase()) continue;

                  // Get token decimals - try to get from deployedTokens first, then from contract
                  let decimals = 18;
                  const deployedToken = deployedTokens.find(t => t.address.toLowerCase() === invoice.token.toLowerCase());
                  if (deployedToken) {
                    decimals = deployedToken.decimals;
                  } else {
                    // Try to fetch from contract if not in deployedTokens
                    try {
                      const { provider } = await getProviderAndSigner();
                      const TokenABI = [
                        { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' }
                      ];
                      const tokenContract = new ethers.Contract(invoice.token, TokenABI, provider);
                      decimals = Number(await tokenContract.decimals());
                    } catch (e) {
                      console.warn('Could not fetch token decimals, using 18');
                    }
                  }

                  // Parse amounts
                  const invoiceAmountWei = ethers.parseUnits(invoice.amount, decimals);
                  const txAmountWei = BigInt(tokenTx.value || '0');

                  // Allow small tolerance (0.1% difference)
                  const tolerance = invoiceAmountWei * BigInt(999) / BigInt(1000);

                  if (txAmountWei >= tolerance) {
                    // Payment found!
                    const updated = invoices.map(inv =>
                      inv.id === invoice.id
                        ? { ...inv, status: 'paid' as const, paidTxHash: tokenTx.hash, paidAt: parseInt(tokenTx.timeStamp) * 1000 }
                        : inv
                    );
                    setInvoices(updated);
                    localStorage.setItem('invoices', JSON.stringify(updated));
                    return;
                  }
                }
              }
            } catch (tokenErr: any) {
              console.error('Error checking ERC20 token payment:', tokenErr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error checking invoice payment:', err);
    }
  }, [invoices, deployedTokens, getProviderAndSigner]);

  // Monitor all pending invoices periodically
  useEffect(() => {
    if (activeTab !== 'invoices') return;

    const interval = setInterval(() => {
      invoices.filter(inv => inv.status === 'pending').forEach(invoice => {
        checkInvoicePayment(invoice);
      });
    }, 5000); // Check every 5 seconds (Arc's sub-second finality makes this fast!)

    return () => clearInterval(interval);
  }, [activeTab, invoices, checkInvoicePayment]);

  // Generate shareable link for invoice
  const getInvoiceLink = useCallback((invoice: Invoice) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?invoice=${invoice.id}`;
  }, []);

  // Load invoice from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('invoice');
    if (invoiceId) {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        setSelectedInvoice(invoice);
        setActiveTab('invoices');
      }
    }
  }, [invoices]);

  // Load transaction history from Arcscan API - ONLY for the currently connected wallet
  // This only fetches transactions for the wallet that user is currently using (not all wallets)
  const loadTransactionHistory = useCallback(async () => {
    // Check wallet connection
    if (!activeAddress) {
      setTransactions([]);
      return;
    }

    // For Privy, require authentication
    if (walletType === 'privy' && !authenticated) {
      setTransactions([]);
      return;
    }

    setLoadingHistory(true);
    try {
      console.log(`Fetching transaction history for connected wallet: ${activeAddress}`);

      // Arcscan API endpoint - only fetch transactions for this one address
      const response = await fetch(`https://testnet.arcscan.app/api?module=account&action=txlist&address=${activeAddress}&startblock=0&endblock=99999999&sort=desc`);
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
            type: tx.from.toLowerCase() === activeAddress.toLowerCase() ? 'sent' : 'received',
            tokenAddress: null,
            isTokenTransfer: tx.input && tx.input !== '0x' && tx.input.length > 10
          }))
          .slice(0, 30); // Limit to 30 most recent to save bandwidth

        console.log(`Loaded ${formattedTxs.length} transactions for wallet ${activeAddress}`);
        setTransactions(formattedTxs);
      } else {
        console.log(`No transactions found for wallet ${activeAddress}`);
        setTransactions([]);
      }
    } catch (err: any) {
      console.error('Error loading transaction history:', err);
      setTransactions([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [activeAddress, authenticated, walletType]);

  // Cache for token prices and pool existence to reduce RPC calls
  const tokenPriceCache = useRef<Map<string, { price: string | null; poolExists: boolean; timestamp: number }>>(new Map());
  const CACHE_DURATION = 60000; // 1 minute cache

  // Load all tokens from Registry (Marketplace)
  const loadAllTokens = useCallback(async () => {
    // Check wallet connection
    if (walletType === 'metamask' && !isWagmiConnected) return;
    if (walletType === 'privy' && (!wallet || !authenticated)) return;

    const registryAddr = REGISTRY_ADDRESS || localStorage.getItem('registryAddress') || '';
    if (!registryAddr || !ethers.isAddress(registryAddr)) {
      setAllTokens([]);
      return;
    }

    setLoadingMarketplace(true);
    try {
      const { provider: ethersProvider } = await getProviderAndSigner();

      const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, ethersProvider);

      // Try to get all tokens, handle empty/error responses gracefully
      try {
        const [addresses, infos] = await registry.getAllTokens();

        // Check if we got valid data
        if (addresses && infos && Array.isArray(addresses) && Array.isArray(infos) && addresses.length > 0) {
          // Process tokens sequentially with delays to avoid rate limits
          const tokensWithPrices = [];
          const currentAmmAddress = localStorage.getItem('ammAddress') || AMM_ADDRESS || '0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5';
          const now = Date.now();

          for (let i = 0; i < infos.length; i++) {
            const info = infos[i];
            const tokenAddress = info.tokenAddress;
            let price: string | null = null;
            let poolExists = false;

            // Check cache first
            const cached = tokenPriceCache.current.get(tokenAddress);
            if (cached && (now - cached.timestamp) < CACHE_DURATION) {
              price = cached.price;
              poolExists = cached.poolExists;
              console.log(`Token ${tokenAddress}: using cached data`);
            } else if (currentAmmAddress && ethers.isAddress(currentAmmAddress)) {
              // If registry has poolAddress, trust it and only fetch price (skip poolExists check)
              if (info.poolAddress && ethers.isAddress(info.poolAddress) && info.poolAddress !== ethers.ZeroAddress) {
                poolExists = true;
                // Only fetch price, don't verify poolExists to save RPC calls
                try {
                  const ammContract = new ethers.Contract(currentAmmAddress, AMM_ABI, ethersProvider);
                  const priceWei = await ammContract.getPrice(tokenAddress);
                  price = ethers.formatUnits(priceWei, USDC_NATIVE_DECIMALS);
                  console.log(`Token ${tokenAddress}: price = ${price} USDC`);
                } catch (err: any) {
                  console.warn(`Error fetching price for ${tokenAddress}:`, err.message);
                  // Trust registry, keep poolExists = true even if price fetch fails
                }
              } else {
                // No pool address in registry, check AMM once (no retries to save calls)
                try {
                  const ammContract = new ethers.Contract(currentAmmAddress, AMM_ABI, ethersProvider);
                  poolExists = await ammContract.poolExists(tokenAddress);

                  if (poolExists) {
                    const priceWei = await ammContract.getPrice(tokenAddress);
                    price = ethers.formatUnits(priceWei, USDC_NATIVE_DECIMALS);
                    console.log(`Token ${tokenAddress}: price = ${price} USDC`);
                  }
                } catch (err: any) {
                  console.warn(`Error checking pool for ${tokenAddress}:`, err.message);
                  poolExists = false;
                }
              }

              // Cache the result
              tokenPriceCache.current.set(tokenAddress, { price, poolExists, timestamp: now });
            }

            tokensWithPrices.push({
              address: tokenAddress,
              deployer: info.deployer,
              name: info.name,
              symbol: info.symbol,
              decimals: Number(info.decimals),
              initialSupply: info.initialSupply.toString(),
              deployTimestamp: Number(info.deployTimestamp),
              isOwned: deployedTokens.some(t => t.address === tokenAddress),
              price: price,
              poolExists: poolExists
            });

            // Add delay between requests to avoid rate limiting (except for last token)
            if (i < infos.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay between tokens
            }
          }

          setAllTokens(tokensWithPrices);
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
  }, [wallet, authenticated, deployedTokens, activeTab, walletType, isWagmiConnected, getProviderAndSigner]);

  // Load history when tab is activated or address changes
  useEffect(() => {
    if (activeTab === 'history' && activeAddress) {
      if (walletType === 'privy' && !authenticated) return;
      loadTransactionHistory();
    } else if (activeTab !== 'history') {
      // Clear transactions when switching away from history tab to save memory
      setTransactions([]);
    }
  }, [activeTab, activeAddress, authenticated, walletType, loadTransactionHistory]);

  // Load marketplace when tab is activated
  useEffect(() => {
    if (activeTab === 'marketplace') {
      if (walletType === 'metamask' && !isWagmiConnected) return;
      if (walletType === 'privy' && (!authenticated || !wallet)) return;
      loadAllTokens();
    }
  }, [activeTab, authenticated, walletType, isWagmiConnected, wallet, loadAllTokens]);


  // Load token balances
  const loadTokenBalances = useCallback(async (tokens: DeployedToken[]) => {
    // Check wallet connection
    if (walletType === 'metamask' && !isWagmiConnected) {
      return;
    }
    if (walletType === 'privy' && !wallet) {
      return;
    }
    if (tokens.length === 0) {
      console.log('Cannot load token balances: no tokens');
      return;
    }

    try {
      const { provider: ethersProvider, address } = await getProviderAndSigner();

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
  }, [wallet, walletType, isWagmiConnected, getProviderAndSigner]);

  // Load deployed tokens from Registry (on-chain) or localStorage (fallback)
  const loadTokensFromRegistry = useCallback(async () => {
    // Check wallet connection
    if (walletType === 'metamask' && !isWagmiConnected) return;
    if (walletType === 'privy' && (!wallet || !authenticated)) return;

    const registryAddr = REGISTRY_ADDRESS || localStorage.getItem('registryAddress') || '';

    if (registryAddr && ethers.isAddress(registryAddr)) {
      try {
        const { provider: ethersProvider, address: deployerAddress } = await getProviderAndSigner();

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

  // Removed auto-load on authentication - user must click "Load Tokens" button manually
  // This prevents unnecessary API calls on Vercel builds
  // useEffect(() => {
  //   if (authenticated) {
  //     loadTokensFromRegistry();
  //   }
  // }, [authenticated, loadTokensFromRegistry]);

  // Handle token deployment success
  const handleTokenDeployed = useCallback(async (address: string, _txHash: string, name: string, symbol: string, decimals: number) => {
    // Reload tokens from Registry (if available) or add to state
    const registryAddr = REGISTRY_ADDRESS || localStorage.getItem('registryAddress') || '';

    if (registryAddr && ethers.isAddress(registryAddr)) {
      // If registered in Registry, reload from Registry
      setTimeout(() => {
        loadTokensFromRegistry();
        // Also refresh marketplace to show pool status
        if (activeTab === 'marketplace') {
          loadAllTokens();
        }
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

  // Reload balance when chain changes (for MetaMask network switching)
  useEffect(() => {
    if (wallet && walletType === 'metamask' && chain?.id) {
      loadBalance();
    }
  }, [wallet, walletType, chain?.id, loadBalance]);

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
  if (!authenticated && !isWagmiConnected) {
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
            Arc Dex
          </h1>

          <p style={{
            fontSize: '1.1rem',
            color: '#cbd5e1',
            marginBottom: '2rem',
            fontWeight: 300
          }}>
            Token Launchpad & Trading Platform on Arc Blockchain
          </p>

          {/* Privy Login Button */}
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
              transition: 'transform 0.2s',
              marginBottom: '1rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Login with Privy
          </button>

          <p style={{
            fontSize: '0.9rem',
            color: '#94a3b8',
            marginBottom: '1.5rem'
          }}>
            Login with email, Google, or MetaMask
          </p>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '1.5rem 0',
            color: '#475569'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(71, 85, 105, 0.3)' }}></div>
            <span style={{ padding: '0 1rem', fontSize: '0.85rem', color: '#64748b' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(71, 85, 105, 0.3)' }}></div>
          </div>

          {/* MetaMask Connect Button */}
          <button
            onClick={async () => {
              try {
                const metaMaskConnector = connectors.find(c =>
                  c.id === 'metaMaskSDK' ||
                  c.id === 'io.metamask' ||
                  c.name === 'MetaMask'
                );
                if (metaMaskConnector) {
                  await wagmiConnect({ connector: metaMaskConnector });
                } else {
                  const injectedConnector = connectors.find(c => c.id === 'injected');
                  if (injectedConnector) {
                    await wagmiConnect({ connector: injectedConnector });
                  }
                }
                setWalletType('metamask');
              } catch (err) {
                console.error('Error connecting MetaMask:', err);
              }
            }}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #f6851b 0%, #e2761b 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              width: '100%',
              transition: 'transform 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Connect MetaMask
          </button>

          <p style={{
            fontSize: '0.85rem',
            color: '#64748b',
            marginTop: '1rem'
          }}>
            Connect directly with MetaMask wallet extension
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - show send UI
  return (
    <div className="min-h-screen pb-20">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gradient">Arc Dex</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Network Selector */}
            {isWagmiConnected && chain && (
              <select
                value={chain.id}
                onChange={async (e) => {
                  const targetChainId = parseInt(e.target.value);
                  try {
                    await switchNetworkWithAutoAdd(targetChainId);
                  } catch (err: any) {
                    console.error('Error switching chain:', err);
                  }
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg border border-zinc-700 cursor-pointer hover:border-zinc-600 transition-colors text-sm font-medium text-zinc-200"
              >
                {SUPPORTED_NETWORKS.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.shortName}{chain.id === network.id ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            )}

            {/* MetaMask Connection */}
            {(walletType === 'metamask' || !authenticated) && (
              <>
                {!isWagmiConnected ? (
                  <button
                    onClick={async () => {
                      try {
                        const metaMaskConnector = connectors.find(c =>
                          c.id === 'metaMaskSDK' ||
                          c.id === 'io.metamask' ||
                          c.name === 'MetaMask'
                        );
                        if (metaMaskConnector) {
                          await wagmiConnect({ connector: metaMaskConnector });
                        } else {
                          const injectedConnector = connectors.find(c => c.id === 'injected');
                          if (injectedConnector) {
                            await wagmiConnect({ connector: injectedConnector });
                          }
                        }
                        setWalletType('metamask');
                      } catch (err) {
                        console.error('Error connecting MetaMask:', err);
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-medium text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/20 transition-all"
                  >
                    Connect MetaMask
                  </button>
                ) : (
                  <div className="hidden md:flex items-center gap-0 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
                    <div className="px-3 py-1.5 text-orange-400 text-sm font-mono border-r border-zinc-700 bg-orange-500/10">
                      {wagmiAddress?.slice(0, 6)}...{wagmiAddress?.slice(-4)}
                    </div>
                    <button
                      onClick={() => {
                        wagmiDisconnect();
                        if (authenticated && wallet) {
                          setWalletType('privy');
                        }
                      }}
                      className="px-3 py-1.5 text-red-400 text-sm font-medium hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Privy Wallet Status */}
            {authenticated && wallet && (
              <div className={`px-3 py-1.5 text-sm rounded-lg border flex items-center gap-2 font-semibold ${walletType === 'privy'
                ? 'bg-indigo-500/20 text-violet-400 border-indigo-500/40'
                : 'bg-zinc-700/20 text-zinc-400 border-zinc-600/40'
                }`}>
                Privy: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                {walletType === 'privy' && (
                  <span className="text-xs text-emerald-500">(Active)</span>
                )}
              </div>
            )}

            {/* Wallet Type Selector */}
            {isWagmiConnected && authenticated && wallet && (
              <select
                value={walletType}
                onChange={(e) => setWalletType(e.target.value as 'privy' | 'metamask')}
                className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg cursor-pointer"
              >
                <option value="metamask">Use MetaMask</option>
                <option value="privy">Use Privy</option>
              </select>
            )}

            {/* Logout Button */}
            {authenticated && walletType === 'privy' && (
              <button
                onClick={async () => {
                  if (isWagmiConnected) {
                    wagmiDisconnect();
                  }
                  if (window.ethereum && window.ethereum.isMetaMask) {
                    try {
                      await window.ethereum.request({
                        method: 'wallet_revokePermissions',
                        params: [{ eth_accounts: {} }],
                      });
                    } catch (err: any) {
                      console.log('MetaMask revoke optional:', err.message || err);
                    }
                  }
                  await logout();
                }}
                className="px-3 py-1.5 text-sm bg-zinc-700/50 text-zinc-200 border border-zinc-600/50 rounded-lg hover:bg-zinc-600/50 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">


        {/* Navigation Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-1 min-w-max p-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
            {['Balance', 'Send', 'Deploy', 'History', 'Marketplace', 'Bridge', 'Batch', 'Invoices'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase() as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.toLowerCase()
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="glass-panel rounded-2xl p-4 md:p-8 min-h-[600px]">
          {activeTab === 'balance' && (
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
                  Active Wallet Address
                </div>
                {(() => {
                  try {
                    const activeWallet = getActiveWalletInfo();
                    if (!activeWallet || !activeWallet.address) {
                      return (
                        <div style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
                          No wallet connected. Please connect MetaMask or login with Privy.
                        </div>
                      );
                    }
                    return (
                      <>
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: activeWallet.type === 'metamask' ? '#f6851b' : '#a78bfa', fontWeight: 500 }}>
                          {activeWallet.type === 'metamask' ? 'MetaMask Wallet' : activeWallet.name}
                          {walletType === activeWallet.type && (
                            <span style={{ marginLeft: '0.5rem', color: '#22c55e', fontSize: '0.7rem' }}>(Active)</span>
                          )}
                        </div>
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: '0.95rem',
                          wordBreak: 'break-all',
                          marginBottom: '1rem',
                          color: '#e2e8f0',
                          fontWeight: 500
                        }}>
                          {activeWallet.address}
                        </div>
                        <button
                          onClick={() => {
                            if (activeWallet.address) {
                              navigator.clipboard.writeText(activeWallet.address);
                              setError('');
                              setTimeout(() => setError(''), 100);
                            }
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
                      </>
                    );
                  } catch (err) {
                    console.error('Error getting wallet info:', err);
                    return (
                      <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                        Error loading wallet information
                      </div>
                    );
                  }
                })()}
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                borderRadius: '12px',
                marginBottom: '2rem',
                boxShadow: '0 4px 16px rgba(129, 140, 248, 0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    USDC Balance
                  </div>
                  <button
                    onClick={async () => {
                      await loadBalance();
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.75rem',
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  >
                    Refresh
                  </button>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>
                  {balance ? `${balance} USDC` : 'Loading...'}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(71, 85, 105, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
                    Your Tokens {deployedTokens.length > 0 && `(${deployedTokens.length})`}:
                  </div>
                  <button
                    onClick={async () => {
                      console.log('Loading tokens from Registry/localStorage...');
                      await loadTokensFromRegistry();
                      // Wait a bit for state to update, then load balances
                      setTimeout(async () => {
                        // Get current tokens from state or localStorage
                        const saved = localStorage.getItem('deployedTokens');
                        const currentTokens = saved ? JSON.parse(saved) : deployedTokens;
                        if (currentTokens && currentTokens.length > 0) {
                          await loadTokenBalances(currentTokens);
                        }
                      }, 300);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      background: 'rgba(129, 140, 248, 0.2)',
                      color: '#a78bfa',
                      border: '1px solid rgba(129, 140, 248, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(129, 140, 248, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(129, 140, 248, 0.2)'}
                  >
                    Load Tokens
                  </button>
                </div>
                {deployedTokens.length > 0 ? (
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
                ) : (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    background: 'rgba(30, 41, 59, 0.3)',
                    borderRadius: '8px',
                    border: '1px dashed rgba(71, 85, 105, 0.3)'
                  }}>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      No tokens found
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Click "Load Tokens" to fetch from Registry or localStorage
                    </div>
                  </div>
                )}
              </div>

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
          )
          }

          {
            activeTab === 'send' && (
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

                {/* Gas Fee Estimation */}
                {estimatedGasFee && sendToAddress && amount && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(129, 140, 248, 0.1)',
                    border: '1px solid rgba(129, 140, 248, 0.2)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#a78bfa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {isEstimatingGas ? (
                      <>Estimating gas fee...</>
                    ) : (
                      <>Estimated gas fee: {estimatedGasFee} USDC</>
                    )}
                  </div>
                )}

                {/* Real-time Transaction Status */}
                {txStatus !== 'idle' && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: txStatus === 'error'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : txStatus === 'confirmed'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(129, 140, 248, 0.15)',
                    border: `1px solid ${txStatus === 'error'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : txStatus === 'confirmed'
                        ? 'rgba(34, 197, 94, 0.3)'
                        : 'rgba(129, 140, 248, 0.3)'}`,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: txStatus === 'error'
                      ? '#fca5a5'
                      : txStatus === 'confirmed'
                        ? '#86efac'
                        : '#a78bfa'
                  }}>
                    {txStatus === 'estimating' && 'Estimating gas...'}
                    {txStatus === 'pending' && 'Transaction pending...'}
                    {txStatus === 'confirming' && (
                      <>
                        Confirming transaction...
                        {currentTxHash && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
                            <a
                              href={`https://testnet.arcscan.app/tx/${currentTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'inherit', textDecoration: 'underline' }}
                            >
                              View on Arcscan
                            </a>
                          </div>
                        )}
                      </>
                    )}
                    {txStatus === 'confirmed' && (
                      <>
                        Transaction confirmed!
                        {currentTxHash && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
                            <a
                              href={`https://testnet.arcscan.app/tx/${currentTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'inherit', textDecoration: 'underline' }}
                            >
                              View on Arcscan
                            </a>
                          </div>
                        )}
                      </>
                    )}
                    {txStatus === 'error' && 'Transaction failed'}
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
                  {loading ? (
                    txStatus === 'estimating' ? 'Estimating...' :
                      txStatus === 'pending' ? 'Pending...' :
                        txStatus === 'confirming' ? 'Confirming...' :
                          'Sending...'
                  ) : `Send ${selectedToken === 'usdc'
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
            )
          }

          {
            activeTab === 'deploy' && (
              <>
                <DeployRegistry />
                <DeployAMM />
                <DeployToken onDeploySuccess={handleTokenDeployed} />
              </>
            )
          }

          {
            activeTab === 'history' && wallet && (
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
            )
          }

          {
            activeTab === 'marketplace' && wallet && (
              <>
                {selectedTokenDetail ? (
                  <TokenDetail
                    tokenAddress={selectedTokenDetail.address}
                    tokenName={selectedTokenDetail.name}
                    tokenSymbol={selectedTokenDetail.symbol}
                    tokenDecimals={selectedTokenDetail.decimals}
                    tokenDeployer={selectedTokenDetail.deployer}
                    tokenSupply={selectedTokenDetail.initialSupply}
                    onBack={() => setSelectedTokenDetail(null)}
                  />
                ) : (
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
                                  {token.poolExists && token.price && (
                                    <div style={{ fontSize: '1rem', color: '#86efac', fontWeight: 700, marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(34, 197, 94, 0.15)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                      Price: {parseFloat(token.price).toFixed(6)} USDC
                                    </div>
                                  )}
                                  {token.poolExists && !token.price && (
                                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px' }}>
                                      Pool exists - Loading price...
                                    </div>
                                  )}
                                  {!token.poolExists && (
                                    <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                      ⚠️ No liquidity pool
                                    </div>
                                  )}
                                  {!token.poolExists && creatingPoolFor !== token.address && (
                                    <button
                                      onClick={() => setCreatingPoolFor(token.address)}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.85rem',
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        marginBottom: '0.5rem',
                                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                      }}
                                    >
                                      Create Pool
                                    </button>
                                  )}
                                  {!token.poolExists && creatingPoolFor === token.address && (
                                    <div style={{
                                      marginBottom: '0.5rem',
                                      padding: '1rem',
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      borderRadius: '8px',
                                      border: '1px solid rgba(245, 158, 11, 0.3)'
                                    }}>
                                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.75rem' }}>
                                        Create Liquidity Pool for {token.symbol}
                                      </div>
                                      <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                          Token Amount:
                                        </label>
                                        <input
                                          type="number"
                                          placeholder={`Enter token amount (you have ${deployedTokens.find(t => t.address === token.address)?.balance || '0'})`}
                                          value={poolLiquidityTokens}
                                          onChange={(e) => setPoolLiquidityTokens(e.target.value)}
                                          style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            fontSize: '0.9rem',
                                            border: '2px solid rgba(71, 85, 105, 0.5)',
                                            borderRadius: '6px',
                                            outline: 'none',
                                            background: 'rgba(30, 41, 59, 0.6)',
                                            color: '#e2e8f0'
                                          }}
                                        />
                                      </div>
                                      <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                          USDC Amount:
                                        </label>
                                        <input
                                          type="number"
                                          placeholder="Enter USDC amount (e.g. 100)"
                                          value={poolLiquidityUSDC}
                                          onChange={(e) => setPoolLiquidityUSDC(e.target.value)}
                                          style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            fontSize: '0.9rem',
                                            border: '2px solid rgba(71, 85, 105, 0.5)',
                                            borderRadius: '6px',
                                            outline: 'none',
                                            background: 'rgba(30, 41, 59, 0.6)',
                                            color: '#e2e8f0'
                                          }}
                                        />
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                          onClick={async () => {
                                            if (!wallet || !poolLiquidityTokens || !poolLiquidityUSDC) return;

                                            const currentAmmAddress = localStorage.getItem('ammAddress') || AMM_ADDRESS || '0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5';
                                            if (!currentAmmAddress || !ethers.isAddress(currentAmmAddress)) {
                                              setError('AMM contract not configured');
                                              return;
                                            }

                                            setLoading(true);
                                            setError('');

                                            try {
                                              const provider = await wallet.getEthereumProvider();
                                              const ethersProvider = new ethers.BrowserProvider(provider);
                                              const signer = await ethersProvider.getSigner();

                                              const ammContract = new ethers.Contract(currentAmmAddress, AMM_ABI, signer);

                                              // Get token contract
                                              const tokenABI = [
                                                { inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], name: 'approve', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable', type: 'function' }
                                              ];
                                              const tokenContract = new ethers.Contract(token.address, tokenABI, signer);

                                              const tokenAmountWei = ethers.parseUnits(poolLiquidityTokens, token.decimals);
                                              const usdcAmountWei = ethers.parseUnits(poolLiquidityUSDC, 18);

                                              // Approve
                                              console.log(`Approving ${poolLiquidityTokens} ${token.symbol} to AMM...`);
                                              const approveTx = await tokenContract.approve(currentAmmAddress, tokenAmountWei);
                                              await approveTx.wait();
                                              console.log('Approved!');

                                              // Create pool
                                              console.log(`Creating pool with ${poolLiquidityTokens} ${token.symbol} and ${poolLiquidityUSDC} USDC...`);
                                              const createPoolTx = await ammContract.createPool(token.address, tokenAmountWei, usdcAmountWei, {
                                                value: usdcAmountWei
                                              });
                                              await createPoolTx.wait();
                                              console.log('Pool created successfully!');

                                              // Update registry
                                              const registryAddr = REGISTRY_ADDRESS || localStorage.getItem('registryAddress') || '';
                                              if (registryAddr && ethers.isAddress(registryAddr)) {
                                                try {
                                                  const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, signer);
                                                  await registry.setPoolAddress(token.address, currentAmmAddress);
                                                } catch (err) {
                                                  console.error('Failed to update pool address:', err);
                                                }
                                              }

                                              setCreatingPoolFor(null);
                                              setPoolLiquidityTokens('');
                                              setPoolLiquidityUSDC('');

                                              // Refresh marketplace
                                              setTimeout(() => {
                                                loadAllTokens();
                                              }, 2000);

                                            } catch (err: any) {
                                              console.error('Error creating pool:', err);
                                              setError(`Failed to create pool: ${err.message}`);
                                            } finally {
                                              setLoading(false);
                                            }
                                          }}
                                          disabled={loading || !poolLiquidityTokens || !poolLiquidityUSDC}
                                          style={{
                                            flex: 1,
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.85rem',
                                            background: loading || !poolLiquidityTokens || !poolLiquidityUSDC
                                              ? 'rgba(71, 85, 105, 0.5)'
                                              : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 600,
                                            cursor: loading || !poolLiquidityTokens || !poolLiquidityUSDC ? 'not-allowed' : 'pointer'
                                          }}
                                        >
                                          {loading ? 'Creating...' : 'Create Pool'}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setCreatingPoolFor(null);
                                            setPoolLiquidityTokens('');
                                            setPoolLiquidityUSDC('');
                                          }}
                                          style={{
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.85rem',
                                            background: 'rgba(71, 85, 105, 0.5)',
                                            color: '#e2e8f0',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                      {error && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#fca5a5' }}>
                                          {error}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Deployed: {new Date(token.deployTimestamp * 1000).toLocaleDateString()} {new Date(token.deployTimestamp * 1000).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(71, 85, 105, 0.3)', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                {token.poolExists && (
                                  <button
                                    onClick={() => setSelectedTokenDetail(token)}
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem 1rem',
                                      fontSize: '0.9rem',
                                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '10px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                  >
                                    View Details & Trade →
                                  </button>
                                )}
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
              </>
            )
          }

          {
            activeTab === 'batch' && (
              <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '1rem' }}>
                  Batch Payments
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1rem' }}>
                  Send tokens to multiple recipients in a single transaction (no need to sign 100 times!)
                </p>

                {/* Multisend Contract Address - Only show deployment UI if not set */}
                {!multisendAddress && !MULTISEND_ADDRESS ? (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(129, 140, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Multisend Contract Address:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={multisendAddress}
                        onChange={(e) => {
                          if (ethers.isAddress(e.target.value) || e.target.value === '') {
                            setMultisendAddress(e.target.value);
                            localStorage.setItem('multisendAddress', e.target.value);
                            setBatchError('');
                          }
                        }}
                        style={{
                          flex: 1,
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
                      <button
                        onClick={async () => {
                          try {
                            setIsDeployingMultisend(true);
                            const { signer } = await getProviderAndSigner();
                            const factory = new ethers.ContractFactory(MULTISEND_ABI, MULTISEND_BYTECODE, signer);
                            console.log('Deploying Multisend contract...');
                            const contract = await factory.deploy();
                            await contract.waitForDeployment();
                            const address = await contract.getAddress();
                            console.log('Multisend deployed at:', address);
                            setMultisendAddress(address);
                            localStorage.setItem('multisendAddress', address);
                            setBatchError('');
                            alert(`Multisend contract deployed successfully at: ${address}`);
                          } catch (err: any) {
                            console.error('Error deploying Multisend:', err);
                            setBatchError(`Failed to deploy: ${err.message}`);
                          } finally {
                            setIsDeployingMultisend(false);
                          }
                        }}
                        disabled={isDeployingMultisend}
                        style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.85rem',
                          background: isDeployingMultisend ? 'rgba(71, 85, 105, 0.5)' : 'rgba(34, 197, 94, 0.2)',
                          color: isDeployingMultisend ? '#94a3b8' : '#86efac',
                          border: `1px solid ${isDeployingMultisend ? 'rgba(71, 85, 105, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                          borderRadius: '8px',
                          cursor: isDeployingMultisend ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          fontWeight: 600
                        }}
                        onMouseEnter={(e) => !isDeployingMultisend && (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.3)')}
                        onMouseLeave={(e) => !isDeployingMultisend && (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)')}
                      >
                        {isDeployingMultisend ? 'Deploying...' : 'Deploy Contract'}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                      Please set or deploy Multisend contract address to enable batch transfers
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#86efac', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Multisend Contract Ready
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Using: {(multisendAddress || MULTISEND_ADDRESS).slice(0, 10)}...{(multisendAddress || MULTISEND_ADDRESS).slice(-8)}
                    </div>
                  </div>
                )}

                {/* Token Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Select Token:
                  </label>
                  <select
                    value={batchToken}
                    onChange={(e) => {
                      setBatchToken(e.target.value);
                      setBatchTokenAddress('');
                      setBatchTokenInfo(null);
                      setBatchError('');
                    }}
                    disabled={batchLoading}
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
                    <option value="custom">Custom ERC20 Token Address</option>
                  </select>
                </div>

                {/* Custom Token Address Input */}
                {batchToken === 'custom' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Token Contract Address:
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={batchTokenAddress}
                      onChange={async (e) => {
                        setBatchTokenAddress(e.target.value);
                        if (e.target.value && ethers.isAddress(e.target.value)) {
                          try {
                            const { provider } = await getProviderAndSigner();
                            const ERC20_ABI_FULL = [
                              { constant: true, inputs: [], name: 'name', outputs: [{ name: '', type: 'string' }], type: 'function' },
                              { constant: true, inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], type: 'function' },
                              { constant: true, inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], type: 'function' }
                            ];
                            const contract = new ethers.Contract(e.target.value, ERC20_ABI_FULL, provider);
                            const [name, symbol, decimals] = await Promise.all([
                              contract.name(),
                              contract.symbol(),
                              contract.decimals()
                            ]);
                            setBatchTokenInfo({ name, symbol, decimals: Number(decimals) });
                            setBatchError('');
                          } catch (err: any) {
                            console.error('Error loading token info:', err);
                            setBatchTokenInfo(null);
                            setBatchError(`Failed to load token info: ${err.message}`);
                          }
                        } else {
                          setBatchTokenInfo(null);
                          setBatchError('');
                        }
                      }}
                      disabled={batchLoading}
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
                    {batchTokenInfo && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(129, 140, 248, 0.15)', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
                        <div style={{ color: '#e2e8f0' }}><strong>{batchTokenInfo.name}</strong> ({batchTokenInfo.symbol})</div>
                        <div style={{ color: '#cbd5e1', marginTop: '0.25rem' }}>
                          Decimals: {batchTokenInfo.decimals}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recipients List */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
                      Recipients:
                    </label>
                    <button
                      onClick={() => setBatchRecipients([...batchRecipients, { address: '', amount: '' }])}
                      disabled={batchLoading}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        background: 'rgba(129, 140, 248, 0.2)',
                        color: '#a78bfa',
                        border: '1px solid rgba(129, 140, 248, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => !batchLoading && (e.currentTarget.style.background = 'rgba(129, 140, 248, 0.3)')}
                      onMouseLeave={(e) => !batchLoading && (e.currentTarget.style.background = 'rgba(129, 140, 248, 0.2)')}
                    >
                      + Add Recipient
                    </button>
                  </div>

                  {batchRecipients.map((recipient, index) => (
                    <div key={index} style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr auto',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                      alignItems: 'center'
                    }}>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={recipient.address}
                        onChange={(e) => {
                          const updated = [...batchRecipients];
                          updated[index].address = e.target.value;
                          setBatchRecipients(updated);
                        }}
                        disabled={batchLoading}
                        style={{
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
                      <input
                        type="number"
                        placeholder="0.0"
                        value={recipient.amount}
                        onChange={(e) => {
                          const updated = [...batchRecipients];
                          updated[index].amount = e.target.value;
                          setBatchRecipients(updated);
                        }}
                        disabled={batchLoading}
                        min="0.000001"
                        step="0.000001"
                        style={{
                          padding: '0.75rem',
                          fontSize: '0.9rem',
                          border: '2px solid rgba(71, 85, 105, 0.5)',
                          borderRadius: '8px',
                          outline: 'none',
                          background: 'rgba(30, 41, 59, 0.6)',
                          color: '#e2e8f0'
                        }}
                      />
                      <button
                        onClick={() => {
                          const updated = batchRecipients.filter((_, i) => i !== index);
                          setBatchRecipients(updated.length > 0 ? updated : [{ address: '', amount: '' }]);
                        }}
                        disabled={batchLoading || batchRecipients.length === 1}
                        style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.9rem',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#fca5a5',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          cursor: (batchLoading || batchRecipients.length === 1) ? 'not-allowed' : 'pointer',
                          opacity: (batchLoading || batchRecipients.length === 1) ? 0.5 : 1
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Batch Summary */}
                {batchRecipients.filter(r => r.address && r.amount).length > 0 && (
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(129, 140, 248, 0.1)',
                    border: '1px solid rgba(129, 140, 248, 0.2)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#a78bfa'
                  }}>
                    <strong>Batch Summary:</strong> Sending to {batchRecipients.filter(r => r.address && r.amount).length} recipient(s)
                    <br />
                    Total Amount: {batchRecipients
                      .filter(r => r.address && r.amount)
                      .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0)
                      .toFixed(6)} {batchToken === 'usdc'
                        ? 'USDC'
                        : batchToken === 'custom'
                          ? batchTokenInfo?.symbol || 'TOKEN'
                          : deployedTokens.find(t => t.address === batchToken)?.symbol || 'TOKEN'}
                  </div>
                )}

                {/* Error Display */}
                {batchError && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    borderLeft: '4px solid #ef4444',
                    borderRadius: '4px',
                    color: '#fca5a5',
                    fontSize: '0.9rem'
                  }}>
                    {batchError}
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={sendBatchPayments}
                  disabled={batchLoading || batchRecipients.filter(r => r.address && r.amount).length === 0}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    background: (batchLoading || batchRecipients.filter(r => r.address && r.amount).length === 0)
                      ? 'rgba(71, 85, 105, 0.5)'
                      : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (batchLoading || batchRecipients.filter(r => r.address && r.amount).length === 0) ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    width: '100%',
                    transition: 'transform 0.2s',
                    marginBottom: '1.5rem'
                  }}
                >
                  {batchLoading ? 'Processing Batch...' : `Send Batch (${batchRecipients.filter(r => r.address && r.amount).length} recipients)`}
                </button>

                {/* Results */}
                {batchResults.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '1rem' }}>
                      Batch Results:
                    </h3>
                    <div style={{
                      display: 'grid',
                      gap: '0.75rem',
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}>
                      {batchResults.map((result, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '1rem',
                            background: result.error
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'rgba(34, 197, 94, 0.1)',
                            border: `1px solid ${result.error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                            borderRadius: '8px',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div style={{
                            color: result.error ? '#fca5a5' : '#86efac',
                            marginBottom: '0.25rem',
                            fontWeight: 600
                          }}>
                            {result.error ? 'Failed' : 'Success'}
                          </div>
                          <div style={{
                            color: '#cbd5e1',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            marginBottom: '0.25rem'
                          }}>
                            {result.address.slice(0, 8)}...{result.address.slice(-6)}
                          </div>
                          {result.txHash && (
                            <a
                              href={`https://testnet.arcscan.app/tx/${result.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#818cf8',
                                textDecoration: 'underline',
                                fontSize: '0.75rem'
                              }}
                            >
                              View Transaction
                            </a>
                          )}
                          {result.error && (
                            <div style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                              {result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          {
            activeTab === 'bridge' && (
              <div>
                {/* Bridge Component */}
                {walletType === 'metamask' && isWagmiConnected ? (
                  <CrossChainBridgeWithKit />
                ) : walletType === 'privy' && wallet ? (
                  <CrossChainBridge />
                ) : (
                  <div style={{
                    padding: '2rem',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '16px',
                    border: '1px solid rgba(71, 85, 105, 0.2)',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}>
                    <div style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: '#cbd5e1' }}>
                      Connect a Wallet to Use Bridge
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>
                      {walletType === 'metamask'
                        ? 'Please connect MetaMask using the button in the header above.'
                        : 'Please login with Privy or connect MetaMask using the buttons in the header above.'}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          {
            activeTab === 'invoices' && (
              <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                      Payment Requests / Invoices
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                      Create shareable payment requests. Perfect for remittances, marketplaces, and trade finance.
                    </p>
                  </div>
                  {invoices.length > 0 && (
                    <button
                      onClick={exportInvoicesToCSV}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.9rem',
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#86efac',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Export CSV
                    </button>
                  )}
                </div>

                {/* Invoice Statistics Dashboard */}
                {invoices.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                  }}>
                    <div style={{ padding: '1rem', background: 'rgba(129, 140, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Total</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>{invoiceStats.total}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Pending</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>{invoiceStats.pending}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Paid</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#86efac' }}>{invoiceStats.paid}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Expired</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fca5a5' }}>{invoiceStats.expired}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Total Paid</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#86efac' }}>{invoiceStats.totalAmount.toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {!selectedInvoice ? (
                  <>
                    {/* Create New Invoice */}
                    <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(129, 140, 248, 0.1)', borderRadius: '12px', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>
                          Create New Invoice
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {invoiceTemplates.length > 0 && (
                            <button
                              onClick={() => setShowTemplateModal(true)}
                              style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.85rem',
                                background: 'rgba(129, 140, 248, 0.2)',
                                color: '#a78bfa',
                                border: '1px solid rgba(129, 140, 248, 0.3)',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              Load Template
                            </button>
                          )}
                          <button
                            onClick={saveAsTemplate}
                            disabled={!newInvoice.title}
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.85rem',
                              background: !newInvoice.title ? 'rgba(71, 85, 105, 0.5)' : 'rgba(34, 197, 94, 0.2)',
                              color: !newInvoice.title ? '#94a3b8' : '#86efac',
                              border: `1px solid ${!newInvoice.title ? 'rgba(71, 85, 105, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                              borderRadius: '6px',
                              cursor: !newInvoice.title ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Save Template
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Title:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Payment for Services"
                          value={newInvoice.title}
                          onChange={(e) => setNewInvoice({ ...newInvoice, title: e.target.value })}
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

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Description (optional):
                        </label>
                        <textarea
                          placeholder="Additional details about the payment..."
                          value={newInvoice.description}
                          onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            fontSize: '0.9rem',
                            border: '2px solid rgba(71, 85, 105, 0.5)',
                            borderRadius: '8px',
                            outline: 'none',
                            background: 'rgba(30, 41, 59, 0.6)',
                            color: '#e2e8f0',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                            Amount:
                          </label>
                          <input
                            type="number"
                            placeholder="0.0"
                            value={newInvoice.amount}
                            onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
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
                              color: '#e2e8f0'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                            Token:
                          </label>
                          <select
                            value={newInvoice.token}
                            onChange={(e) => {
                              setNewInvoice({ ...newInvoice, token: e.target.value });
                              setInvoiceTokenInfo(null);
                              setInvoiceCustomTokenAddress('');
                            }}
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
                            <option value="custom">Custom ERC20</option>
                          </select>
                        </div>
                      </div>

                      {newInvoice.token === 'custom' && (
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                            Token Contract Address:
                          </label>
                          <input
                            type="text"
                            placeholder="0x..."
                            value={invoiceCustomTokenAddress}
                            onChange={async (e) => {
                              setInvoiceCustomTokenAddress(e.target.value);
                              if (e.target.value && ethers.isAddress(e.target.value)) {
                                try {
                                  const { provider } = await getProviderAndSigner();
                                  const ERC20_ABI_FULL = [
                                    { constant: true, inputs: [], name: 'name', outputs: [{ name: '', type: 'string' }], type: 'function' },
                                    { constant: true, inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], type: 'function' },
                                    { constant: true, inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], type: 'function' }
                                  ];
                                  const contract = new ethers.Contract(e.target.value, ERC20_ABI_FULL, provider);
                                  const [name, symbol, decimals] = await Promise.all([
                                    contract.name(),
                                    contract.symbol(),
                                    contract.decimals()
                                  ]);
                                  setInvoiceTokenInfo({ name, symbol, decimals: Number(decimals) });
                                } catch (err: any) {
                                  console.error('Error loading token info:', err);
                                  setInvoiceTokenInfo(null);
                                }
                              } else {
                                setInvoiceTokenInfo(null);
                              }
                            }}
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
                          {invoiceTokenInfo && (
                            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(129, 140, 248, 0.15)', borderRadius: '6px', fontSize: '0.85rem' }}>
                              {invoiceTokenInfo.name} ({invoiceTokenInfo.symbol})
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Expires in (days, optional):
                        </label>
                        <input
                          type="number"
                          placeholder="Leave empty for no expiry"
                          value={newInvoice.expiresInDays}
                          onChange={(e) => setNewInvoice({ ...newInvoice, expiresInDays: e.target.value })}
                          min="1"
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

                      <button
                        onClick={createInvoice}
                        disabled={!activeAddress || !newInvoice.title || !newInvoice.amount}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          fontSize: '1.1rem',
                          background: (!activeAddress || !newInvoice.title || !newInvoice.amount)
                            ? 'rgba(71, 85, 105, 0.5)'
                            : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: (!activeAddress || !newInvoice.title || !newInvoice.amount) ? 'not-allowed' : 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Create Invoice
                      </button>
                    </div>

                    {/* Invoice List */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>
                          Your Invoices ({invoices.length})
                        </h3>
                        {invoices.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {(['all', 'pending', 'paid', 'expired'] as const).map((filter) => (
                              <button
                                key={filter}
                                onClick={() => setInvoiceFilter(filter)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.85rem',
                                  background: invoiceFilter === filter
                                    ? 'rgba(129, 140, 248, 0.3)'
                                    : 'rgba(71, 85, 105, 0.5)',
                                  color: invoiceFilter === filter ? '#e2e8f0' : '#94a3b8',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  textTransform: 'capitalize'
                                }}
                              >
                                {filter}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {invoices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                          No invoices yet. Create your first payment request above.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {invoices
                            .filter(inv => invoiceFilter === 'all' || inv.status === invoiceFilter)
                            .map((invoice) => (
                              <div
                                key={invoice.id}
                                onClick={() => setSelectedInvoice(invoice)}
                                style={{
                                  padding: '1.5rem',
                                  background: invoice.status === 'paid'
                                    ? 'rgba(34, 197, 94, 0.1)'
                                    : invoice.status === 'expired'
                                      ? 'rgba(239, 68, 68, 0.1)'
                                      : 'rgba(30, 41, 59, 0.6)',
                                  border: `1px solid ${invoice.status === 'paid'
                                    ? 'rgba(34, 197, 94, 0.3)'
                                    : invoice.status === 'expired'
                                      ? 'rgba(239, 68, 68, 0.3)'
                                      : 'rgba(71, 85, 105, 0.3)'
                                    }`,
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(129, 140, 248, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontFamily: 'monospace' }}>
                                      {invoice.invoiceNumber || invoice.id}
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>
                                      {invoice.title}
                                    </div>
                                    {invoice.clientName && (
                                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                                        Client: {invoice.clientName}
                                      </div>
                                    )}
                                    {invoice.description && (
                                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                        {invoice.description}
                                      </div>
                                    )}
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.5rem' }}>
                                      {invoice.amount} {invoice.tokenSymbol}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                      Created: {new Date(invoice.createdAt).toLocaleString()}
                                      {invoice.expiresAt && (
                                        <> • Expires: {new Date(invoice.expiresAt).toLocaleString()}</>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    background: invoice.status === 'paid'
                                      ? 'rgba(34, 197, 94, 0.2)'
                                      : invoice.status === 'expired'
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : 'rgba(251, 191, 36, 0.2)',
                                    color: invoice.status === 'paid'
                                      ? '#86efac'
                                      : invoice.status === 'expired'
                                        ? '#fca5a5'
                                        : '#fbbf24'
                                  }}>
                                    {invoice.status.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Template Modal */}
                    {showTemplateModal && (
                      <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                      }}>
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.95)',
                          padding: '2rem',
                          borderRadius: '16px',
                          border: '1px solid rgba(71, 85, 105, 0.3)',
                          maxWidth: '500px',
                          width: '90%',
                          maxHeight: '80vh',
                          overflowY: 'auto'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0' }}>
                              Load Template
                            </h3>
                            <button
                              onClick={() => setShowTemplateModal(false)}
                              style={{
                                padding: '0.5rem',
                                background: 'rgba(71, 85, 105, 0.5)',
                                color: '#e2e8f0',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1.2rem'
                              }}
                            >
                              ×
                            </button>
                          </div>
                          {invoiceTemplates.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                              No templates saved yet. Create an invoice and save it as a template.
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                              {invoiceTemplates.map((template) => (
                                <div
                                  key={template.id}
                                  onClick={() => loadTemplate(template)}
                                  style={{
                                    padding: '1rem',
                                    background: 'rgba(129, 140, 248, 0.1)',
                                    border: '1px solid rgba(129, 140, 248, 0.2)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(129, 140, 248, 0.2)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(129, 140, 248, 0.1)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}
                                >
                                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>
                                    {template.name}
                                  </div>
                                  {template.description && (
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                      {template.description}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Invoice Detail View */
                  <div>
                    <button
                      onClick={() => setSelectedInvoice(null)}
                      style={{
                        marginBottom: '1rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        background: 'rgba(71, 85, 105, 0.5)',
                        color: '#e2e8f0',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      ← Back to List
                    </button>

                    <div style={{
                      padding: '2rem',
                      background: selectedInvoice.status === 'paid'
                        ? 'rgba(34, 197, 94, 0.1)'
                        : selectedInvoice.status === 'expired'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(129, 140, 248, 0.1)',
                      border: `2px solid ${selectedInvoice.status === 'paid'
                        ? 'rgba(34, 197, 94, 0.3)'
                        : selectedInvoice.status === 'expired'
                          ? 'rgba(239, 68, 68, 0.3)'
                          : 'rgba(129, 140, 248, 0.3)'
                        }`,
                      borderRadius: '12px',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                            {selectedInvoice.title}
                          </h3>
                          <div style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            background: selectedInvoice.status === 'paid'
                              ? 'rgba(34, 197, 94, 0.2)'
                              : selectedInvoice.status === 'expired'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(251, 191, 36, 0.2)',
                            color: selectedInvoice.status === 'paid'
                              ? '#86efac'
                              : selectedInvoice.status === 'expired'
                                ? '#fca5a5'
                                : '#fbbf24'
                          }}>
                            {selectedInvoice.status.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {selectedInvoice.totalAmount && selectedInvoice.totalAmount !== selectedInvoice.amount ? (
                            <div>
                              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                                Subtotal: {selectedInvoice.amount} {selectedInvoice.tokenSymbol}
                              </div>
                              {selectedInvoice.discount && (
                                <div style={{ fontSize: '0.85rem', color: '#86efac', marginBottom: '0.25rem' }}>
                                  Discount: -{selectedInvoice.discount} {selectedInvoice.tokenSymbol}
                                </div>
                              )}
                              {selectedInvoice.tax && (
                                <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginBottom: '0.25rem' }}>
                                  Tax: +{selectedInvoice.tax} {selectedInvoice.tokenSymbol}
                                </div>
                              )}
                              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#a78bfa', marginTop: '0.5rem' }}>
                                {selectedInvoice.totalAmount} {selectedInvoice.tokenSymbol}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#a78bfa' }}>
                              {selectedInvoice.amount} {selectedInvoice.tokenSymbol}
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedInvoice.description && (
                        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', color: '#cbd5e1' }}>
                          {selectedInvoice.description}
                        </div>
                      )}

                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                        <div>Recipient: {selectedInvoice.recipientAddress.slice(0, 10)}...{selectedInvoice.recipientAddress.slice(-8)}</div>
                        <div>Created: {new Date(selectedInvoice.createdAt).toLocaleString()}</div>
                        {selectedInvoice.expiresAt && (
                          <div>Expires: {new Date(selectedInvoice.expiresAt).toLocaleString()}</div>
                        )}
                        {selectedInvoice.paidTxHash && (
                          <div style={{ marginTop: '0.5rem', color: '#86efac' }}>
                            Paid: {new Date(selectedInvoice.paidAt!).toLocaleString()}
                            <br />
                            <a
                              href={`https://testnet.arcscan.app/tx/${selectedInvoice.paidTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#818cf8', textDecoration: 'underline' }}
                            >
                              View Transaction
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Shareable Link */}
                      <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Shareable Link:
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            readOnly
                            value={getInvoiceLink(selectedInvoice)}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              fontSize: '0.85rem',
                              fontFamily: 'monospace',
                              border: '2px solid rgba(71, 85, 105, 0.5)',
                              borderRadius: '8px',
                              background: 'rgba(30, 41, 59, 0.6)',
                              color: '#e2e8f0'
                            }}
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(getInvoiceLink(selectedInvoice));
                              alert('Link copied to clipboard!');
                            }}
                            style={{
                              padding: '0.75rem 1rem',
                              fontSize: '0.85rem',
                              background: 'rgba(129, 140, 248, 0.2)',
                              color: '#a78bfa',
                              border: '1px solid rgba(129, 140, 248, 0.3)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {/* QR Code (using URL-based approach) */}
                      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '1rem',
                          background: 'white',
                          borderRadius: '8px'
                        }}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getInvoiceLink(selectedInvoice))}`}
                            alt="Invoice QR Code"
                            style={{ width: '200px', height: '200px' }}
                          />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                          Scan to open payment link
                        </div>
                      </div>

                      {/* Quick Pay Button (for recipient) */}
                      {selectedInvoice.status === 'pending' && activeAddress && activeAddress.toLowerCase() !== selectedInvoice.recipientAddress.toLowerCase() && (
                        <button
                          onClick={async () => {
                            // Pre-fill send form with invoice data
                            setSendToAddress(selectedInvoice.recipientAddress);
                            setAmount(selectedInvoice.amount);

                            // Handle token selection based on invoice token
                            if (selectedInvoice.token === 'usdc') {
                              // USDC native payment
                              setSelectedToken('usdc');
                            } else {
                              // Custom token or deployed token - treat as custom token
                              const tokenAddress = selectedInvoice.token;
                              setSelectedToken('custom');
                              setCustomTokenAddress(tokenAddress);

                              // Load token info - always load to ensure it's fresh
                              try {
                                await loadCustomTokenInfo(tokenAddress);
                                // Wait a bit for state to update
                                await new Promise(resolve => setTimeout(resolve, 300));
                              } catch (err: any) {
                                console.error('Error loading token info:', err);
                                alert(`Failed to load token info: ${err.message}`);
                                return;
                              }
                            }

                            // Navigate to send tab first
                            setActiveTab('send');

                            // Wait a bit for tab switch and state to fully update, then trigger send
                            setTimeout(async () => {
                              // For custom tokens, verify token info is loaded before sending
                              if (selectedInvoice.token !== 'usdc') {
                                // Get current state values
                                const currentTokenAddress = selectedInvoice.token;

                                // If token info is not loaded or address doesn't match, load it
                                if (!customTokenInfo || customTokenAddress !== currentTokenAddress) {
                                  try {
                                    await loadCustomTokenInfo(currentTokenAddress);
                                    // Wait for state update
                                    await new Promise(resolve => setTimeout(resolve, 300));
                                  } catch (err: any) {
                                    console.error('Error loading token info:', err);
                                    alert(`Failed to load token info: ${err.message}`);
                                    return;
                                  }
                                }
                              }

                              // Now send the transaction
                              await sendToken();
                            }, 500);
                          }}
                          style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1.1rem',
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          Pay {selectedInvoice.amount} {selectedInvoice.tokenSymbol}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          }

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
      </main>
    </div>
  );
}

export default App;
