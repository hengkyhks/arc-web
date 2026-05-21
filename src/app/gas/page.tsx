'use client';

import { useEffect, useState } from 'react';
import { Fuel, RefreshCw, ExternalLink } from 'lucide-react';

interface GasData {
  slow: number | null;
  standard: number | null;
  fast: number | null;
  blockNumber: number | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

const DEMO_GAS_PRICES = {
  slow: 25,
  standard: 35,
  fast: 50,
  blockNumber: 27349887,
};

async function fetchGasData(): Promise<{ gasPrice: string; blockNumber: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const [gasRes, blockRes] = await Promise.all([
      fetch('https://rpc.testnet.arc.network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1,
        }),
        signal: controller.signal,
      }),
      fetch('https://rpc.testnet.arc.network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 2,
        }),
        signal: controller.signal,
      }),
    ]);

    clearTimeout(timeout);

    if (!gasRes.ok || !blockRes.ok) throw new Error('RPC responded with error');

    const gasData = await gasRes.json();
    const blockData = await blockRes.json();

    return {
      gasPrice: gasData.result || '0x0',
      blockNumber: blockData.result || '0x0',
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export default function GasPage() {
  const [gasData, setGasData] = useState<GasData>({
    slow: null,
    standard: null,
    fast: null,
    blockNumber: null,
    lastUpdated: null,
    isLoading: true,
    error: null,
  });
  const [useDemo, setUseDemo] = useState(false);

  const fetchData = async () => {
    const result = await fetchGasData();

    if (result) {
      const gasPriceHex = result.gasPrice;
      const blockHex = result.blockNumber;

      const gasPriceWei = BigInt(gasPriceHex);
      const gasPriceGwei = Number(gasPriceWei / BigInt(1e9));

      const blockNum = parseInt(blockHex, 16);

      setGasData({
        slow: Math.round(gasPriceGwei * 0.8),
        standard: Math.round(gasPriceGwei),
        fast: Math.round(gasPriceGwei * 1.3),
        blockNumber: blockNum,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      });
      setUseDemo(false);
    } else {
      // Fallback to demo data
      setUseDemo(true);
      setGasData({
        slow: DEMO_GAS_PRICES.slow,
        standard: DEMO_GAS_PRICES.standard,
        fast: DEMO_GAS_PRICES.fast,
        blockNumber: DEMO_GAS_PRICES.blockNumber,
        lastUpdated: new Date(),
        isLoading: false,
        error: 'RPC slow - showing demo data',
      });
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const refresh = () => {
    setGasData((prev) => ({ ...prev, isLoading: true }));
    fetchData();
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 to-black p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center"><Fuel className="w-12 h-12 text-orange-400" /></div>
          <h1 className="text-3xl font-bold text-white">Gas Tracker</h1>
          <p className="text-zinc-400 text-sm mt-2">Real-time Arc Testnet gas prices</p>
          <p className="text-zinc-500 text-xs mt-1">
            Network: Arc Testnet • Auto-refresh every 30s
          </p>
        </div>

        {/* Demo Mode Warning */}
        {useDemo && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg text-center">
            <p className="text-yellow-400 text-sm">
              ⚠️ RPC slow - showing demo data (last real block: #{gasData.blockNumber?.toLocaleString()})
            </p>
          </div>
        )}

        {/* Gas Prices Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 text-center">
            <div className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Slow</div>
            <div className="text-3xl font-bold text-green-400">
              {gasData.isLoading ? '...' : gasData.slow}
            </div>
            <div className="text-zinc-500 text-xs mt-1">Gwei</div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-6 border border-blue-500 border-2 text-center">
            <div className="text-blue-400 text-xs uppercase tracking-wider mb-2">Standard</div>
            <div className="text-4xl font-bold text-white">
              {gasData.isLoading ? '...' : gasData.standard}
            </div>
            <div className="text-zinc-500 text-xs mt-1">Gwei</div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 text-center">
            <div className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Fast</div>
            <div className="text-3xl font-bold text-orange-400">
              {gasData.isLoading ? '...' : gasData.fast}
            </div>
            <div className="text-zinc-500 text-xs mt-1">Gwei</div>
          </div>
        </div>

        {/* Network Stats */}
        <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Network Stats</h2>
            <button
              onClick={refresh}
              disabled={gasData.isLoading}
              className="flex items-center gap-1 px-3 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white text-xs rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${gasData.isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Latest Block</div>
              <div className="text-2xl font-bold text-white mt-1">
                {gasData.isLoading ? '...' : gasData.blockNumber?.toLocaleString() || '...'}
              </div>
            </div>
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Block Time</div>
              <div className="text-2xl font-bold text-white mt-1">~12s</div>
            </div>
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Base Fee</div>
              <div className="text-2xl font-bold text-blue-400 mt-1">
                {gasData.standard ? `${gasData.standard} Gwei` : '...'}
              </div>
            </div>
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Network</div>
              <div className="text-2xl font-bold text-white mt-1">Arc Testnet</div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        {gasData.lastUpdated && (
          <div className="mt-4 text-center text-zinc-500 text-xs">
            Last updated: {gasData.lastUpdated.toLocaleTimeString()}
            {useDemo && ' • Demo mode'}
          </div>
        )}

        {/* Explorer Link */}
        <div className="mt-6 text-center">
          <a
            href="https://testnet.arcscan.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink className="w-4 h-4" /> View on ArcScan Explorer
          </a>
        </div>
      </div>
    </div>
  );
}