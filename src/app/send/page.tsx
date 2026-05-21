'use client';

import { http, createPublicClient, encodeFunctionData, parseUnits } from 'viem';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Send, PlusCircle, Trash2, Copy, ExternalLink } from 'lucide-react';

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

// ERC-20 ABI for transfer
const ERC20_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// USDC contract on Arc Testnet
const USDC_CONTRACT = '0x47ecf59f75acddc754882b28b141495429083013';

// Make this file a module (required for 'declare global')
export {};

// Type for window.ethereum - use type assertion instead of declare global to avoid ambient context issues
declare global {}

// Extend Window type via module augmentation
declare module 'react' {
  interface DOMAttributes<T> {
    // Add any needed custom attributes here
  }
}

// Type for window.ethereum
type EthereumProvider = {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  isMetaMask?: boolean;
};

export default function SendPage() {
  const [recipients, setRecipients] = useState('');
  const [amountPerPerson, setAmountPerPerson] = useState('1.00');
  const [tokenAddress, setTokenAddress] = useState('0x');
  const [status, setStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { address: connectedAddress } = useAccount();

  const handleMultisend = async () => {
    if (!connectedAddress) {
      setStatus('❌ Please connect your wallet first');
      return;
    }

    if (!window.ethereum) {
      setStatus('❌ No wallet detected. Please install MetaMask or OKX wallet.');
      return;
    }

    if (!recipients) {
      setStatus('❌ Please enter recipient addresses');
      return;
    }

    const finalTokenAddress = (tokenAddress && tokenAddress !== '0x')
      ? tokenAddress
      : USDC_CONTRACT;

    setLoading(true);
    setStatus('🚀 Processing multisend...');
    setTxHash('');

    try {
      // Parse addresses (one per line or comma separated)
      const addressList = recipients
        .split(/[\n,]/).map((a) => a.trim())
        .filter((a) => /^0x[a-fA-F0-9]{40}$/.test(a));

      if (addressList.length === 0) {
        setStatus('❌ No valid addresses found');
        setLoading(false);
        return;
      }

      // Create public client for waiting receipts
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http('https://rpc.testnet.arc.network'),
      });

      let successCount = 0;
      let lastHash = '';

      // Send to each recipient via ERC-20 transfer
      for (const recipient of addressList) {
        try {
          const amount = parseUnits(amountPerPerson, 6); // USDC has 6 decimals

          // Encode ERC-20 transfer call
          const data = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [recipient as `0x${string}`, amount],
          });

          // Use window.ethereum directly (wallet extension interface)
          const result = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
              from: connectedAddress,
              to: finalTokenAddress,
              data,
              gas: '0x5208', // 21000 gas minimum
            }],
          }) as `0x${string}`;

          const hash = result;
          lastHash = hash;
          successCount++;
          setStatus(`📤 Sent ${amountPerPerson} USDC to ${successCount}/${addressList.length}...`);

          // Wait for confirmation
          await publicClient.waitForTransactionReceipt({ hash });
        } catch (err: any) {
          console.error(`Failed to send to ${recipient}:`, err);
          setStatus(`❌ Failed to send to ${recipient}: ${err?.message || 'Unknown error'}`);
        }
      }

      if (successCount > 0) {
        setTxHash(lastHash);
        setStatus(`✅ Multisend complete! Sent to ${successCount}/${addressList.length} recipients`);
      }
    } catch (err: any) {
      setStatus(`❌ Error: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 to-black p-4">
      <div className="w-full max-w-2xl p-8 bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-700">
        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center"><Send className="w-12 h-12 text-blue-400" /></div>
          <h1 className="text-2xl font-bold text-white">Multisend</h1>
          <p className="text-zinc-400 text-sm mt-2">Airdrop USDC to multiple recipients</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Token Contract Address (leave empty for default USDC)
            </label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x... (defaults to Arc USDC)"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Recipient Addresses (one per line or comma separated)
            </label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="0x1234...\n0x5678...\n0xabcd..."
              rows={6}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Amount Per Person (USDC)
            </label>
            <input
              type="text"
              value={amountPerPerson}
              onChange={(e) => setAmountPerPerson(e.target.value)}
              placeholder="1.00"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Sender Address (auto-detected)
            </label>
            <div
              suppressHydrationWarning
              className="px-4 py-3 bg-zinc-900 border border-zinc-600 rounded-lg font-mono text-sm text-zinc-400"
            >
              {connectedAddress || 'Not connected - please connect wallet'}
            </div>
          </div>

          <button
            suppressHydrationWarning
            onClick={handleMultisend}
            disabled={loading || !connectedAddress}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 text-white font-semibold rounded-lg transition-colors mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin">⏳</span> Processing...</>
            ) : (
              <><Send className="w-5 h-5" /> Send to All</>
            )}
          </button>

          {status && (
            <div className="mt-4 p-3 bg-zinc-900 rounded-lg border border-zinc-700">
              <p className="text-sm text-zinc-300">{status}</p>
              {txHash && (
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-xs hover:text-blue-300 mt-2 block font-mono break-all"
                >
                  {txHash.slice(0, 20)}...
                </a>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-700">
          <p className="text-zinc-500 text-xs text-center">
            ⚠️ Each transaction sent individually • Network: Arc Testnet • Gas: USDC
          </p>
        </div>
      </div>
    </div>
  );
}