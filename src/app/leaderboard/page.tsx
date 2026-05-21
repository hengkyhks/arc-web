'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Medal, Clock, Users, ExternalLink } from 'lucide-react';
import { ConnectButton } from '../providers';
import { useAccount } from 'wagmi';

// Mock data for demo (replace with contract calls later)
const MOCK_LEADERBOARD = [
  { rank: 1, address: '0x1234...5678', score: 47, name: 'BeerMaster' },
  { rank: 2, address: '0xabcd...efgh', score: 42, name: 'StackKing' },
  { rank: 3, address: '0x9999...1111', score: 38, name: 'GlassWizard' },
  { rank: 4, address: '0xaaaa...bbbb', score: 35, name: 'PourPro' },
  { rank: 5, address: '0xcccc...dddd', score: 31, name: 'TapChampion' },
  { rank: 6, address: '0x8888...2222', score: 28, name: 'BalancingPro' },
  { rank: 7, address: '0x7777...3333', score: 25, name: 'SteadyHands' },
  { rank: 8, address: '0x6666...4444', score: 22, name: 'StackAddict' },
];

const PRIZE_POOL = 2000;
const PRIZE_PERCENT = [40, 25, 15, 12, 8];

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const [tournamentTime, setTournamentTime] = useState({ days: 0, hours: 0, minutes: 0 });
  const [totalPlayers, setTotalPlayers] = useState(156);

  useEffect(() => {
    // Calculate time until next Monday 00:00 UTC
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    nextMonday.setHours(0, 0, 0, 0);
    
    const diff = nextMonday.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    setTournamentTime({ days, hours, minutes });
  }, []);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <nav className="w-full bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
              <span className="text-blue-500">🧩</span>
              <span>Arc Starter Kit</span>
            </Link>
            <ConnectButton />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center"><Trophy className="w-14 h-14 text-amber-400" /></div>
          <h1 className="text-3xl font-bold">Beer Stack Leaderboard</h1>
          <p className="text-zinc-400 mt-2">Weekly tournament — compete for 2,000 HKY!</p>
        </div>

        {/* Tournament Timer */}
        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-2xl p-6 border border-amber-700/50 mb-6">
          <div className="text-center">
            <p className="text-amber-400 text-sm font-medium mb-2">⏰ Next tournament starts in</p>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{tournamentTime.days}</div>
                <div className="text-xs text-zinc-400">Days</div>
              </div>
              <div className="text-2xl font-bold text-zinc-500">:</div>
              <div className="text-center">
                <div className="text-3xl font-bold">{tournamentTime.hours.toString().padStart(2, '0')}</div>
                <div className="text-xs text-zinc-400">Hours</div>
              </div>
              <div className="text-2xl font-bold text-zinc-500">:</div>
              <div className="text-center">
                <div className="text-3xl font-bold">{tournamentTime.minutes.toString().padStart(2, '0')}</div>
                <div className="text-xs text-zinc-400">Minutes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Prize Pool */}
        <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Prize Pool: 2,000 HKY
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {PRIZE_PERCENT.map((pct, i) => (
              <div key={i} className={`text-center p-3 rounded-xl ${
                i === 0 ? 'bg-amber-900/30 border border-amber-600/50' :
                i === 1 ? 'bg-zinc-600/30 border border-zinc-500/50' :
                i === 2 ? 'bg-orange-900/30 border border-orange-700/50' :
                'bg-zinc-800 border border-zinc-700'
              }`}>
                <div className="text-lg font-bold">#{i + 1}</div>
                <div className="text-green-400 font-semibold">{(PRIZE_POOL * pct / 100).toLocaleString()} HKY</div>
                <div className="text-xs text-zinc-400">{pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-zinc-800 rounded-2xl border border-zinc-700 overflow-hidden mb-6">
          <div className="bg-zinc-700/50 px-6 py-4 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-400" /> Current Standings
            </h2>
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Users className="w-4 h-4" /> {totalPlayers} players
            </div>
          </div>

          {/* Top 5 Headers */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-900/50 text-xs text-zinc-400 uppercase tracking-wider">
            <div className="col-span-1">Rank</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-5 text-right">Score</div>
          </div>

          {/* Leaderboard Rows */}
          {MOCK_LEADERBOARD.map((player, i) => (
            <div key={i} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center border-t border-zinc-700/50 ${
              player.rank <= 3 ? 'bg-gradient-to-r from-amber-900/10 to-transparent' : ''
            }`}>
              <div className="col-span-1">
                {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
              </div>
              <div className="col-span-6">
                <div className="font-medium">{player.name}</div>
                <div className="text-xs text-zinc-500">{formatAddress(player.address)}</div>
              </div>
              <div className="col-span-5 text-right">
                <span className="text-2xl font-bold text-green-400">{player.score}</span>
                <span className="text-zinc-500 text-sm ml-1">glasses</span>
              </div>
            </div>
          ))}

          {MOCK_LEADERBOARD.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No players yet. Be the first to join!</p>
            </div>
          )}
        </div>

        {/* My Position */}
        {isConnected && address && (
          <div className="bg-green-900/20 rounded-xl p-4 border border-green-700/50 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Your Position</p>
                <p className="text-2xl font-bold">#12</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Your Best Score</p>
                <p className="text-2xl font-bold text-green-400">23 glasses</p>
              </div>
              <Link
                href="/play"
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium flex items-center gap-2"
              >
                Play Now
              </Link>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
          <h3 className="font-bold mb-4">📋 How It Works</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p>Join tournament by clicking "Play" and approving the 0.2 HKY entry fee</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p>Click or press SPACE to drop glasses onto the stack — time it right!</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p>Score as many glasses as possible in 60 seconds — your best score counts</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</div>
              <p>Top 5 players share the 2,000 HKY prize pool when the tournament ends</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-700">
            <p className="text-xs text-zinc-500">
              Tournament auto-starts every Monday at 00:00 UTC and runs for 7 days.
              Winner claiming is trustless — prizes are distributed by the smart contract.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}