import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  LineSeries,
  // @ts-ignore - CandlestickSeries might not be in types but exists in runtime
  CandlestickSeries 
} from 'lightweight-charts';
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

interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

type ChartType = 'line' | 'candlestick';
type Timeframe = '1h' | '4h' | '24h' | '7d';

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
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('24h');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | ISeriesApi<'Candlestick'> | null>(null);

  // Helper function to get timeframe in milliseconds
  const getTimeframeMs = (tf: Timeframe): number => {
    switch (tf) {
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  };

  // Filter price history by timeframe
  const getFilteredHistory = useCallback((): PriceDataPoint[] => {
    const now = Date.now();
    const timeframeMs = getTimeframeMs(timeframe);
    const cutoff = now - timeframeMs;
    return priceHistory.filter(p => p.timestamp > cutoff);
  }, [priceHistory, timeframe]);

  // Convert price data to candlestick OHLC format
  const convertToCandlestick = useCallback((data: PriceDataPoint[]): CandlestickData[] => {
    if (data.length === 0) return [];
    
    // Group data by time intervals (e.g., 5 minutes for 1h, 30 min for 24h, etc.)
    const intervalMs = timeframe === '1h' ? 5 * 60 * 1000 : 
                       timeframe === '4h' ? 15 * 60 * 1000 :
                       timeframe === '24h' ? 60 * 60 * 1000 : 
                       4 * 60 * 60 * 1000; // 7d: 4 hour intervals
    
    const grouped: { [key: number]: PriceDataPoint[] } = {};
    
    data.forEach(point => {
      const intervalStart = Math.floor(point.timestamp / intervalMs) * intervalMs;
      if (!grouped[intervalStart]) {
        grouped[intervalStart] = [];
      }
      grouped[intervalStart].push(point);
    });
    
    // Convert each group to OHLC
    const candles: CandlestickData[] = [];
    Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(intervalStart => {
        const points = grouped[intervalStart];
        const prices = points.map(p => p.price);
        candles.push({
          time: Math.floor(intervalStart / 1000) as any,
          open: prices[0],
          high: Math.max(...prices),
          low: Math.min(...prices),
          close: prices[prices.length - 1],
        });
      });
    
    return candles;
  }, [timeframe]);

  // Initialize TradingView chart
  useEffect(() => {
    if (!chartContainerRef.current || priceHistory.length < 2) return;

    const filteredHistory = getFilteredHistory();
    if (filteredHistory.length < 2) return;

    // Remove existing series if chart type changed
    if (chartRef.current && seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    // Create chart if it doesn't exist
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'rgba(15, 23, 42, 0.8)' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: 'rgba(71, 85, 105, 0.2)' },
          horzLines: { color: 'rgba(71, 85, 105, 0.2)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: 'rgba(71, 85, 105, 0.5)',
        },
        rightPriceScale: {
          borderColor: 'rgba(71, 85, 105, 0.5)',
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: '#818cf8',
            width: 1,
            style: 1,
          },
          horzLine: {
            color: '#818cf8',
            width: 1,
            style: 1,
          },
        },
      });
    }

    const chart = chartRef.current;

    // Add series based on chart type
    if (chartType === 'candlestick') {
      const candlestickData = convertToCandlestick(filteredHistory);
      // Try using CandlestickSeries class if available, otherwise use string
      const CandlestickSeriesClass = (typeof CandlestickSeries !== 'undefined' ? CandlestickSeries : 'Candlestick');
      const candlestickSeries = chart.addSeries(CandlestickSeriesClass as any, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: true,
        wickVisible: true,
        priceFormat: {
          type: 'price',
          precision: 6,
          minMove: 0.000001,
        },
      }) as ISeriesApi<'Candlestick'>;
      
      candlestickSeries.setData(candlestickData);
      seriesRef.current = candlestickSeries;
    } else {
      const lineData = filteredHistory.map(point => ({
        time: Math.floor(point.timestamp / 1000) as any,
        value: point.price,
      }));
      
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#818cf8',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        priceFormat: {
          type: 'price',
          precision: 6,
          minMove: 0.000001,
        },
      }) as ISeriesApi<'Line'>;
      
      lineSeries.setData(lineData);
      seriesRef.current = lineSeries;
    }

    // Fit content
    chart.timeScale().fitContent();


    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [priceHistory, chartType, timeframe, getFilteredHistory, convertToCandlestick]);


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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
            Price History
          </h2>
          
          {/* Chart Type Toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setChartType('line')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                background: chartType === 'line' ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 'rgba(71, 85, 105, 0.6)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                background: chartType === 'candlestick' ? 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' : 'rgba(71, 85, 105, 0.6)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Candlestick
            </button>
          </div>

          {/* Timeframe Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {(['1h', '4h', '24h', '7d'] as Timeframe[]).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  background: timeframe === tf ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(71, 85, 105, 0.6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                {tf}
              </button>
            ))}
          </div>

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
          {priceHistory.length === 0 ? (
            <div style={{ 
              height: '400px', 
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
          ) : priceHistory.length === 1 ? (
            <div style={{ 
              height: '400px', 
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
                Current price: {priceHistory[0].price.toFixed(6)} USDC
              </div>
              <div style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                Refresh the page to collect more data points for the chart.
              </div>
            </div>
          ) : (
            <div
              ref={chartContainerRef}
              style={{
                width: '100%',
                height: '400px',
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '8px',
              }}
            />
          )}
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

