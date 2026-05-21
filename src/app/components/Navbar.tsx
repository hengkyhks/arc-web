'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '../providers';
import { Home, Fuel, Mail, Palette, Puzzle } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/gas', label: 'Gas Tracker', Icon: Fuel },
  { href: '/send', label: 'Multisend', Icon: Mail },
  { href: '/mint', label: 'NFT Minter', Icon: Palette },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-zinc-900 border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="text-blue-500"><Puzzle className="w-6 h-6" /></span>
            <span>Arc Starter Kit</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <item.Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* RainbowKit Connect Button */}
            <ConnectButton showBalance={false} />
          </div>
        </div>
      </div>
    </nav>
  );
}