'use client';

import { http, createPublicClient, formatUnits } from 'viem';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Coins, Clock, CheckCircle } from 'lucide-react';

// Arc Testnet chain definition
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
} as const;

// HengkyToken v4 - BURN 1 HKY per claim (reduces total supply)
const HENGKY_TOKEN_ADDRESS = '0x0A7d051Ca47282c8351b8C045FeE96CF91c358b4';

// Minimal ERC20 ABI for balanceOf and faucet functions
const HENGKY_TOKEN_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimFaucet',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'getRemainingCooldown',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'canClaim',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'CLAIM_AMOUNT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export default function FaucetPage() {
  const [balance, setBalance] = useState<string>('0');
  const [cooldown, setCooldown] = useState<string>('0');
  const [canClaimNow, setCanClaimNow] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [claimAmount, setClaimAmount] = useState<string>('100');
  const { address: connectedAddress } = useAccount();

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network'),
  });

  // Fetch balance and cooldown
  const fetchInfo = async () => {
    if (!connectedAddress) return;

    try {
      // Get HKY balance
      const balanceRaw: bigint = await publicClient.readContract({
        address: HENGKY_TOKEN_ADDRESS,
        abi: HENGKY_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [connectedAddress],
      });
      setBalance(formatUnits(balanceRaw, 18));

      // Get remaining cooldown
      const cooldownRaw: bigint = await publicClient.readContract({
        address: HENGKY_TOKEN_ADDRESS,
        abi: HENGKY_TOKEN_ABI,
        functionName: 'getRemainingCooldown',
        args: [connectedAddress],
      });
      setCooldown(cooldownRaw.toString());

      // Check if can claim
      const canClaim: boolean = await publicClient.readContract({
        address: HENGKY_TOKEN_ADDRESS,
        abi: HENGKY_TOKEN_ABI,
        functionName: 'canClaim',
        args: [connectedAddress],
      });
      setCanClaimNow(canClaim);

      // Get claim amount
      const claimAmtRaw: bigint = await publicClient.readContract({
        address: HENGKY_TOKEN_ADDRESS,
        abi: HENGKY_TOKEN_ABI,
        functionName: 'CLAIM_AMOUNT',
        args: [],
      });
      setClaimAmount(formatUnits(claimAmtRaw, 18));
    } catch (err: any) {
      console.error('Error fetching info:', err);
    }
  };

  useEffect(() => {
    fetchInfo();
    // Refresh every 5 seconds to update countdown
    const interval = setInterval(fetchInfo, 5000);
    return () => clearInterval(interval);
  }, [connectedAddress]);

  // Handle faucet claim
  const handleClaim = async () => {
    if (!connectedAddress) {
      setStatus('❌ Please connect your wallet first');
      return;
    }

    if (!window.ethereum) {
      setStatus('❌ No wallet detected');
      return;
    }

    if (!canClaimNow) {
      setStatus('❌ Cooldown not expired. Please wait until timer reaches 0.');
      return;
    }

    setLoading(true);
    setStatus('🚀 Claiming HKY from faucet...');
    setTxHash('');

    try {
      // Encode claimFaucet call
      const data = {
        to: HENGKY_TOKEN_ADDRESS,
        data: '0x4fe15335', // claimFaucet() selector
        from: connectedAddress,
      };

      // Send transaction via wallet
      const result = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [data],
      }) as `0x${string}`;

      setTxHash(result);
      setStatus(`✅ Transaction submitted! Waiting for confirmation...`);

      // Wait for receipt
      await publicClient.waitForTransactionReceipt({ hash: result });

      setStatus(`🎉 Successfully claimed ${claimAmount} HKY!`);
      fetchInfo(); // Refresh balance and cooldown
    } catch (err: any) {
      console.error('Claim failed:', err);
      setStatus(`❌ Error: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Format cooldown time
  const formatCooldown = (seconds: number) => {
    if (seconds === 0) return 'Ready!';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 to-black p-4">
      <div className="w-full max-w-md p-8 bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-700">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center"><Coins className="w-14 h-14 text-green-400" /></div>
          <h1 className="text-2xl font-bold text-white">HKY Faucet</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Claim free HKY tokens once every 24 hours
          </p>
        </div>

        {/* Balance Display */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-6 border border-zinc-700">
          <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Your HKY Balance</div>
          <div className="text-3xl font-bold text-white">{balance} <span className="text-lg text-zinc-400">HKY</span></div>
        </div>

        {/* Claim Amount Info */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-6 border border-zinc-700">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Claim Amount</div>
              <div className="text-xl font-bold text-green-400"><Coins className="inline w-5 h-5 mr-1" />{claimAmount} HKY</div>
            </div>
            <div className="text-right">
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Cooldown</div>
              <div className={`text-xl font-bold ${canClaimNow ? 'text-green-400' : 'text-red-400'}`}>
                {canClaimNow ? <CheckCircle className="inline w-5 h-5 mr-1" /> : <Clock className="inline w-5 h-5 mr-1" />}
                {formatCooldown(parseInt(cooldown))}
              </div>
            </div>
          </div>
        </div>

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={loading || !canClaimNow}
          className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all mb-4 flex items-center justify-center gap-2 ${
            canClaimNow && !loading
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/30'
              : 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span> Processing...
            </>
          ) : canClaimNow ? (
            <>
              <Coins className="w-5 h-5" /> Claim HKY Now!
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" /> Cooldown Active
            </>
          )}
        </button>

        {/* Status */}
        {status && (
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-700 mb-4">
            <p className="text-sm text-zinc-300 text-center">{status}</p>
            {txHash && (
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-xs hover:text-blue-300 mt-2 block text-center font-mono break-all"
              >
                View on ArcScan →
              </a>
            )}
          </div>
        )}

        {/* Rules */}
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700">
          <h3 className="text-white font-semibold mb-2 text-sm">📋 Faucet Rules</h3>
          <ul className="text-zinc-400 text-xs space-y-1">
            <li>• Each wallet can claim once per 24 hours</li>
            <li>• You receive 100 HKY per claim</li>
            <li>• Timer resets after each successful claim</li>
            <li>• Wait for "Ready!" status before claiming again</li>
          </ul>
        </div>

        {/* Network Info */}
        <div className="mt-6 pt-4 border-t border-zinc-700">
          <p className="text-zinc-500 text-xs text-center">
            Network: Arc Testnet • Contract: {HENGKY_TOKEN_ADDRESS.slice(0, 10)}...
          </p>
        </div>
      </div>
    </div>
  );
}