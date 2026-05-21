'use client';

import Link from 'next/link';
import { Puzzle, Coins, Fuel, Mail, Palette } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 to-black p-8">
      <div className="w-full max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4 flex justify-center"><Puzzle className="w-16 h-16 text-blue-500" /></div>
          <h1 className="text-5xl font-bold text-white mb-4">Arc Starter Kit</h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            A collection of simple but powerful tools to get started building on Arc blockchain.
            Powered by Circle App Kit & Next.js.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Faucet */}
          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 hover:border-green-500 transition-colors">
            <div className="text-4xl mb-4 text-center flex justify-center"><Coins className="w-10 h-10 text-green-400" /></div>
            <h2 className="text-xl font-bold text-white text-center mb-2">HKY Faucet</h2>
            <p className="text-zinc-400 text-sm text-center mb-4">
              Claim free HKY tokens — 100 HKY every 24 hours
            </p>
            <Link
              href="/faucet"
              className="block w-full py-2 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors text-center"
            >
              Claim →
            </Link>
          </div>

          {/* Gas Tracker */}
          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 hover:border-zinc-500 transition-colors">
            <div className="text-4xl mb-4 text-center flex justify-center"><Fuel className="w-10 h-10 text-orange-400" /></div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Gas Tracker</h2>
            <p className="text-zinc-400 text-sm text-center mb-4">
              Real-time gas prices and network stats for Arc Testnet
            </p>
            <Link
              href="/gas"
              className="block w-full py-2 px-4 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors text-center"
            >
              Open →
            </Link>
          </div>

          {/* Multisend */}
          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 hover:border-zinc-500 transition-colors">
            <div className="text-4xl mb-4 text-center flex justify-center"><Mail className="w-10 h-10 text-blue-400" /></div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Multisend</h2>
            <p className="text-zinc-400 text-sm text-center mb-4">
              Airdrop tokens to multiple recipients in one click
            </p>
            <Link
              href="/send"
              className="block w-full py-2 px-4 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors text-center"
            >
              Open →
            </Link>
          </div>

          {/* NFT Minter */}
          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 hover:border-zinc-500 transition-colors">
            <div className="text-4xl mb-4 text-center flex justify-center"><Palette className="w-10 h-10 text-purple-400" /></div>
            <h2 className="text-xl font-bold text-white text-center mb-2">PFP Minter</h2>
            <p className="text-zinc-400 text-sm text-center mb-4">
              Generate and mint unique PFP avatars on Arc
            </p>
            <Link
              href="/mint"
              className="block w-full py-2 px-4 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors text-center"
            >
              Open →
            </Link>
          </div>
        </div>

        {/* Network Info */}
        <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 mb-8">
          <h2 className="text-lg font-bold text-white mb-4 text-center">Network Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Network</div>
              <div className="text-white font-semibold mt-1">Arc Testnet</div>
            </div>
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Chain ID</div>
              <div className="text-white font-semibold mt-1">5042002</div>
            </div>
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">RPC</div>
              <div className="text-white font-semibold mt-1 text-xs">rpc.testnet.arc.network</div>
            </div>
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Gas Token</div>
              <div className="text-white font-semibold mt-1">USDC</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-zinc-500 text-sm">
          <p>Built with ❤️ on Arc • Powered by Circle App Kit</p>
          <p className="mt-2">
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              ArcScan Explorer
            </a>
            {' • '}
            <a
              href="https://docs.arc.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              Arc Docs
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}