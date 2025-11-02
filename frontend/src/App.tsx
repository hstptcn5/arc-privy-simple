import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const USDC_NATIVE_DECIMALS = 18; // Native USDC uses 18 decimals on Arc
const USDC_DISPLAY_DECIMALS = 6; // Display format

interface SendResult {
  txHash?: string;
  error?: string;
}

function App() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string>('');
  const [sendToAddress, setSendToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<string | null>(null);

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

  // Send USDC
  const sendUSDC = async () => {
    if (!authenticated || !embeddedWallet) {
      setError('Please login first');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!sendToAddress || !ethers.isAddress(sendToAddress)) {
      setError('Please enter a valid recipient address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      // Send native USDC (18 decimals for transfer)
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
      
      // Reload balance
      await loadBalance();
    } catch (err: any) {
      console.error('❌ Error sending USDC:', err);
      setError(`Failed to send USDC: ${err.message}`);
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };


  // Auto-load balance when authenticated
  useEffect(() => {
    if (authenticated && embeddedWallet) {
      loadBalance();
    }
  }, [authenticated, embeddedWallet, loadBalance]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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

        {embeddedWallet && (
          <div style={{ 
            marginBottom: '2rem', 
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
                marginBottom: '1rem'
              }}
            >
              📋 Copy Address
            </button>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>
              Balance: {balance ? `${balance} USDC` : 'Loading...'}
            </div>
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
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              🚰 Get USDC from Faucet
            </a>
          </div>
        )}

        <div>
          <input
            type="text"
            placeholder="Recipient Address (0x...)"
            value={sendToAddress}
            onChange={(e) => setSendToAddress(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              marginBottom: '1rem',
              outline: 'none'
            }}
          />
          
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              min="0.000001"
              step="0.000001"
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingRight: '3rem',
                fontSize: '1rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
            <span style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              USDC
            </span>
          </div>

          <button 
            onClick={sendUSDC} 
            disabled={loading}
            style={{ 
              padding: '1rem 2rem', 
              fontSize: '1.1rem',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              width: '100%',
              transition: 'transform 0.2s',
              marginBottom: '1rem'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
          >
            {loading ? '🔄 Sending...' : '💰 Send USDC'}
          </button>
        </div>

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
