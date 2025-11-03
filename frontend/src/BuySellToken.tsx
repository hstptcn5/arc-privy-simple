import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import { AMM_ADDRESS, AMM_ABI } from './ammConfig';

interface BuySellTokenProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
}

export default function BuySellToken({ tokenAddress, tokenSymbol, tokenDecimals }: BuySellTokenProps) {
  const { wallets } = useWallets();
  
  // Get wallet - prioritize external wallets
  const externalWallet = wallets.find(w => w.walletClientType !== 'privy' && w.walletClientType !== undefined);
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const wallet = externalWallet || embeddedWallet;
  
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [poolExists, setPoolExists] = useState(false);
  const [reserves, setReserves] = useState<{ token: string; usdc: string } | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  
  const USDC_DECIMALS = 18;
  
  // Load pool info and balances
  const loadPoolInfo = useCallback(async () => {
    // Get AMM address at runtime from localStorage
    const currentAmmAddress = localStorage.getItem('ammAddress') || AMM_ADDRESS || '0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5';
    
    if (!wallet || !currentAmmAddress || !ethers.isAddress(currentAmmAddress) || !ethers.isAddress(tokenAddress)) {
      setPoolExists(false);
      return;
    }
    
    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const ammContract = new ethers.Contract(currentAmmAddress, AMM_ABI, ethersProvider);
      
      // Check if pool exists
      const exists = await ammContract.poolExists(tokenAddress);
      setPoolExists(exists);
      
      if (exists) {
        // Get price
        const priceWei = await ammContract.getPrice(tokenAddress);
        const priceFormatted = ethers.formatUnits(priceWei, USDC_DECIMALS);
        setPrice(priceFormatted);
        
        // Get reserves
        const [tokenReserve, usdcReserve] = await ammContract.getReserves(tokenAddress);
        setReserves({
          token: ethers.formatUnits(tokenReserve, tokenDecimals),
          usdc: ethers.formatUnits(usdcReserve, USDC_DECIMALS)
        });
      }
      
      // Load balances
      const address = wallet.address;
      
      // Token balance
      const tokenABI = [
        { inputs: [{ name: 'to', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }
      ];
      const tokenContract = new ethers.Contract(tokenAddress, tokenABI, ethersProvider);
      const tokenBal = await tokenContract.balanceOf(address);
      setTokenBalance(ethers.formatUnits(tokenBal, tokenDecimals));
      
      // USDC balance (native)
      const usdcBal = await ethersProvider.getBalance(address);
      setUsdcBalance(ethers.formatUnits(usdcBal, USDC_DECIMALS));
      
    } catch (err: any) {
      console.error('Error loading pool info:', err);
      setPoolExists(false);
    }
  }, [wallet, tokenAddress, tokenDecimals]);
  
  // Update quote when amount or mode changes
  useEffect(() => {
    const updateQuote = async () => {
      // Get AMM address at runtime
      const currentAmmAddress = localStorage.getItem('ammAddress') || AMM_ADDRESS || '0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5';
      
      if (!wallet || !currentAmmAddress || !ethers.isAddress(currentAmmAddress) || !amount || !poolExists) {
        setQuote(null);
        return;
      }
      
      try {
        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        const ammContract = new ethers.Contract(currentAmmAddress, AMM_ABI, ethersProvider);
        
        if (mode === 'buy') {
          const usdcAmount = ethers.parseUnits(amount, USDC_DECIMALS);
          const tokenAmount = await ammContract.getBuyQuote(tokenAddress, usdcAmount);
          setQuote(ethers.formatUnits(tokenAmount, tokenDecimals));
        } else {
          const tokenAmount = ethers.parseUnits(amount, tokenDecimals);
          const usdcAmount = await ammContract.getSellQuote(tokenAddress, tokenAmount);
          setQuote(ethers.formatUnits(usdcAmount, USDC_DECIMALS));
        }
      } catch (err) {
        console.error('Error getting quote:', err);
        setQuote(null);
      }
    };
    
    updateQuote();
  }, [wallet, amount, mode, tokenAddress, tokenDecimals, poolExists]);
  
  // Load pool info on mount
  useEffect(() => {
    loadPoolInfo();
  }, [loadPoolInfo]);
  
  const handleBuy = async () => {
    // Get AMM address at runtime
    const currentAmmAddress = localStorage.getItem('ammAddress') || AMM_ADDRESS || '0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5';
    
    if (!wallet || !currentAmmAddress || !ethers.isAddress(currentAmmAddress) || !amount) {
      setError('Please fill in amount');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const ammContract = new ethers.Contract(currentAmmAddress, AMM_ABI, signer);
      
      const usdcAmount = ethers.parseUnits(amount, USDC_DECIMALS);
      
      const tx = await ammContract.buyTokens(tokenAddress, usdcAmount, {
        value: usdcAmount
      });
      
      await tx.wait();
      
      setSuccess(`Successfully bought ${quote || amount} ${tokenSymbol}!`);
      setAmount('');
      setQuote(null);
      loadPoolInfo(); // Refresh balances and reserves
      
    } catch (err: any) {
      console.error('Error buying tokens:', err);
      setError(`Failed to buy tokens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSell = async () => {
    // Get AMM address at runtime
    const currentAmmAddress = localStorage.getItem('ammAddress') || AMM_ADDRESS || '0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5';
    
    if (!wallet || !currentAmmAddress || !ethers.isAddress(currentAmmAddress) || !amount) {
      setError('Please fill in amount');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const ammContract = new ethers.Contract(currentAmmAddress, AMM_ABI, signer);
      
      const tokenAmount = ethers.parseUnits(amount, tokenDecimals);
      
      // Approve AMM to spend tokens
      const tokenABI = [
        {
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ];
      const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
      
      // Approve max amount (or just the amount)
      const approveTx = await tokenContract.approve(currentAmmAddress, tokenAmount);
      await approveTx.wait();
      
      // Sell tokens
      const tx = await ammContract.sellTokens(tokenAddress, tokenAmount);
      await tx.wait();
      
      setSuccess(`Successfully sold ${amount} ${tokenSymbol} for ${quote || '0'} USDC!`);
      setAmount('');
      setQuote(null);
      loadPoolInfo(); // Refresh balances and reserves
      
    } catch (err: any) {
      console.error('Error selling tokens:', err);
      setError(`Failed to sell tokens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (!wallet) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', textAlign: 'center', color: '#e2e8f0' }}>
        Please connect wallet first
      </div>
    );
  }
  
  // Get AMM address at runtime
  const currentAmmAddress = localStorage.getItem('ammAddress') || AMM_ADDRESS || '0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5';
  
  if (!currentAmmAddress || !ethers.isAddress(currentAmmAddress)) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
        <strong>AMM Contract not configured</strong>
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Please deploy SimpleAMM contract first or set AMM address in localStorage ('ammAddress')
        </div>
      </div>
    );
  }
  
  if (!poolExists) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
        <strong>Liquidity pool does not exist</strong>
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          This token does not have a liquidity pool yet. Create a pool when deploying the token.
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(71, 85, 105, 0.3)' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#e2e8f0' }}>Buy / Sell {tokenSymbol}</h2>
      
      {/* Price and Reserves Info */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        background: 'rgba(129, 140, 248, 0.15)', 
        borderRadius: '8px',
        border: '1px solid rgba(129, 140, 248, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', flex: 1 }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Price</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e2e8f0' }}>
                {price ? `${price} USDC` : 'Loading...'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Your {tokenSymbol} Balance</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e2e8f0' }}>
                {tokenBalance ? `${tokenBalance} ${tokenSymbol}` : 'Loading...'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>Your USDC Balance</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e2e8f0' }}>
                {usdcBalance ? `${usdcBalance} USDC` : 'Loading...'}
              </div>
            </div>
          </div>
          <button
            onClick={loadPoolInfo}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              marginLeft: '1rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🔄 Refresh
          </button>
        </div>
        {reserves && (
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '6px' }}>
            <strong>Pool Reserves:</strong> {reserves.token} {tokenSymbol} / {reserves.usdc} USDC
          </div>
        )}
      </div>
      
      {/* Mode Toggle */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '8px',
        padding: '0.25rem'
      }}>
        <button
          onClick={() => {
            setMode('buy');
            setAmount('');
            setQuote(null);
          }}
          style={{
            flex: 1,
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: 600,
            background: mode === 'buy' ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 'transparent',
            color: mode === 'buy' ? 'white' : '#cbd5e1',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Buy {tokenSymbol}
        </button>
        <button
          onClick={() => {
            setMode('sell');
            setAmount('');
            setQuote(null);
          }}
          style={{
            flex: 1,
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: 600,
            background: mode === 'sell' ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 'transparent',
            color: mode === 'sell' ? 'white' : '#cbd5e1',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Sell {tokenSymbol}
        </button>
      </div>
      
      {/* Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontWeight: 600 }}>
          {mode === 'buy' ? 'USDC Amount to Spend' : `${tokenSymbol} Amount to Sell`}
        </label>
        <input
          type="number"
          placeholder={mode === 'buy' ? '0.0 USDC' : `0.0 ${tokenSymbol}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          min="0"
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
        {quote && amount && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#a78bfa', fontWeight: 600 }}>
            You will receive: {quote} {mode === 'buy' ? tokenSymbol : 'USDC'}
          </div>
        )}
      </div>
      
      {/* Action Button */}
      <button
        onClick={mode === 'buy' ? handleBuy : handleSell}
        disabled={loading || !amount || parseFloat(amount) <= 0}
        style={{
          width: '100%',
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          background: loading || !amount || parseFloat(amount) <= 0
            ? 'rgba(71, 85, 105, 0.5)'
            : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading || !amount || parseFloat(amount) <= 0 ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          transition: 'transform 0.2s',
          marginBottom: '1rem'
        }}
        onMouseEnter={(e) => {
          if (!loading && amount && parseFloat(amount) > 0) {
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {loading ? (mode === 'buy' ? 'Buying...' : 'Selling...') : (mode === 'buy' ? `Buy ${tokenSymbol}` : `Sell ${tokenSymbol}`)}
      </button>
      
      {/* Messages */}
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
      
      {success && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(34, 197, 94, 0.2)',
          borderLeft: '4px solid #22c55e',
          borderRadius: '4px',
          color: '#86efac',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          <strong>Success:</strong> {success}
        </div>
      )}
    </div>
  );
}

