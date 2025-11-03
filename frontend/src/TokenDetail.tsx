import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import { AMM_ADDRESS, AMM_ABI } from './ammConfig';
import BuySellToken from './BuySellToken';

interface TokenDetailProps {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenDeployer: string;
  tokenSupply: string;
  onBack: () => void;
}

interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export default function TokenDetail({
  tokenAddress,
  tokenName,
  tokenSymbol,
  tokenDecimals,
  tokenDeployer,
  tokenSupply,
  onBack
}: TokenDetailProps) {
  const { wallets } = useWallets();
  const externalWallet = wallets.find(w => w.walletClientType !== 'privy' && w.walletClientType !== undefined);
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const wallet = externalWallet || embeddedWallet;

  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [poolExists, setPoolExists] = useState(false);

  // Simple price chart using SVG
  const PriceChart = ({ data }: { data: PriceDataPoint[] }) => {
    if (data.length === 0) {
      return (
        <div style={{ 
          height: '300px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '8px',
          color: '#94a3b8',
          padding: '2rem'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#cbd5e1' }}>
            No price history yet
          </div>
          <div style={{ fontSize: '0.85rem', textAlign: 'center' }}>
            Price data will be collected as you refresh. Check back later for historical data.
          </div>
        </div>
      );
    }
    
    if (data.length === 1) {
      return (
        <div style={{ 
          height: '300px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '8px',
          color: '#94a3b8',
          padding: '2rem'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#cbd5e1' }}>
            Collecting price data...
          </div>
          <div style={{ fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>
            Current price: {data[0].price.toFixed(6)} USDC
          </div>
          <div style={{ fontSize: '0.85rem', textAlign: 'center' }}>
            Refresh the page to collect more data points for the chart.
          </div>
        </div>
      );
    }

    const width = 800;
    const height = 300;
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    const areaPoints = [
      `${padding},${padding + chartHeight}`,
      ...data.map((point, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
        const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
        return `${x},${y}`;
      }),
      `${padding + chartWidth},${padding + chartHeight}`
    ].join(' ');

    // Format time labels
    const timeLabels = data.map((point, index) => {
      if (index % Math.ceil(data.length / 6) === 0 || index === data.length - 1) {
        const date = new Date(point.timestamp);
        return { x: padding + (index / (data.length - 1 || 1)) * chartWidth, label: date.toLocaleTimeString() };
      }
      return null;
    }).filter(Boolean) as { x: number; label: string }[];

    return (
      <svg width={width} height={height} style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px' }}>
        {/* Area under line */}
        <polygon
          points={areaPoints}
          fill="url(#gradient)"
          opacity={0.3}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => {
          const y = padding + (i / 4) * chartHeight;
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={padding + chartWidth}
              y2={y}
              stroke="rgba(71, 85, 105, 0.3)"
              strokeWidth={1}
            />
          );
        })}

        {/* Price line */}
        <polyline
          points={points}
          fill="none"
          stroke="#818cf8"
          strokeWidth={2}
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
          const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={3}
              fill="#818cf8"
              stroke="#fff"
              strokeWidth={1}
            />
          );
        })}

        {/* Price labels on Y axis */}
        {[0, 1, 2, 3, 4].map(i => {
          const price = minPrice + (maxPrice - minPrice) * (1 - i / 4);
          const y = padding + (i / 4) * chartHeight;
          return (
            <text
              key={i}
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="12"
            >
              {price.toFixed(6)}
            </text>
          );
        })}

        {/* Time labels on X axis */}
        {timeLabels.map((label, index) => (
          <text
            key={index}
            x={label.x}
            y={height - padding + 20}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="11"
          >
            {label.label}
          </text>
        ))}

        {/* Y axis label */}
        <text
          x={-height / 2}
          y={15}
          transform={`rotate(-90, ${padding / 2}, ${height / 2})`}
          textAnchor="middle"
          fill="#cbd5e1"
          fontSize="12"
          fontWeight="600"
        >
          Price (USDC)
        </text>
      </svg>
    );
  };

  const loadPriceHistory = useCallback(async () => {
    if (!wallet) return;

    const currentAmmAddress = localStorage.getItem('ammAddress') || AMM_ADDRESS || '0x0249C38Cbbf8623CB4BE09d7ad4002B8517ce5b5';
    if (!currentAmmAddress || !ethers.isAddress(currentAmmAddress)) return;

    setLoading(true);
    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const ammContract = new ethers.Contract(currentAmmAddress, AMM_ABI, ethersProvider);

      // Check if pool exists
      const exists = await ammContract.poolExists(tokenAddress);
      setPoolExists(exists);

      if (!exists) {
        setLoading(false);
        return;
      }

      // Get current price
      const priceWei = await ammContract.getPrice(tokenAddress);
      const price = parseFloat(ethers.formatUnits(priceWei, 18));
      setCurrentPrice(price.toFixed(6));

      // Load price history from localStorage (real data collected over time)
      const storageKey = `priceHistory_${tokenAddress}`;
      const storedHistory = localStorage.getItem(storageKey);
      let history: PriceDataPoint[] = [];
      
      if (storedHistory) {
        try {
          const parsed = JSON.parse(storedHistory);
          // Filter out old data (keep only last 24 hours)
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          history = parsed.filter((p: PriceDataPoint) => p.timestamp > oneDayAgo);
        } catch (err) {
          console.error('Error parsing stored price history:', err);
        }
      }

      // Add current price point
      const now = Date.now();
      const newPoint: PriceDataPoint = {
        timestamp: now,
        price
      };

      // Only add if price changed or it's been more than 5 minutes since last point
      const lastPoint = history[history.length - 1];
      const shouldAdd = !lastPoint || 
                       Math.abs(lastPoint.price - price) > price * 0.001 || // Price changed by >0.1%
                       (now - lastPoint.timestamp) > 5 * 60 * 1000; // More than 5 minutes ago

      if (shouldAdd) {
        history.push(newPoint);
      } else {
        // Update last point with current price
        if (history.length > 0) {
          history[history.length - 1] = newPoint;
        } else {
          history.push(newPoint);
        }
      }

      // Save updated history (limit to 100 points to save space)
      const limitedHistory = history.slice(-100);
      localStorage.setItem(storageKey, JSON.stringify(limitedHistory));

      setPriceHistory(limitedHistory);
    } catch (err) {
      console.error('Error loading price history:', err);
    } finally {
      setLoading(false);
    }
  }, [wallet, tokenAddress]);

  useEffect(() => {
    loadPriceHistory();
  }, [loadPriceHistory]);

  return (
    <div style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
      {/* Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            background: 'rgba(71, 85, 105, 0.6)',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            marginRight: '1rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(71, 85, 105, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(71, 85, 105, 0.6)';
          }}
        >
          ← Back to Marketplace
        </button>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            {tokenName} ({tokenSymbol})
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            {tokenAddress.slice(0, 10)}...{tokenAddress.slice(-8)}
          </div>
        </div>
      </div>

      {/* Token Info Card */}
      <div style={{
        padding: '1.5rem',
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '12px',
        border: '1px solid rgba(71, 85, 105, 0.3)',
        marginBottom: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Current Price</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: currentPrice ? '#86efac' : '#94a3b8' }}>
            {currentPrice ? `${currentPrice} USDC` : loading ? 'Loading...' : 'No pool'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Total Supply</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>
            {ethers.formatUnits(tokenSupply, tokenDecimals)} {tokenSymbol}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Deployer</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace' }}>
            {tokenDeployer.slice(0, 8)}...{tokenDeployer.slice(-6)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Pool Status</div>
          <div style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: poolExists ? '#86efac' : '#fca5a5'
          }}>
            {poolExists ? '✓ Active' : '✗ No Pool'}
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
            Price History (24h)
          </h2>
          <button
            onClick={loadPriceHistory}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              background: loading ? 'rgba(71, 85, 105, 0.5)' : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <PriceChart data={priceHistory} />
        </div>
      </div>

      {/* Buy/Sell Section */}
      {poolExists && (
        <BuySellToken
          tokenAddress={tokenAddress}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
        />
      )}

      {!poolExists && (
        <div style={{
          padding: '2rem',
          background: 'rgba(239, 68, 68, 0.15)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.1rem', color: '#fca5a5', marginBottom: '0.5rem' }}>
            ⚠️ No Liquidity Pool
          </div>
          <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
            This token doesn't have a liquidity pool yet. You need to create a pool before trading.
          </div>
        </div>
      )}
    </div>
  );
}

