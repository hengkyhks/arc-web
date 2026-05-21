'use client';

import { http, createPublicClient, encodeFunctionData } from 'viem';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Palette, Sparkles, ExternalLink } from 'lucide-react';

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

// ERC-721 ABI for publicMint and currentTokenId
const ERC721_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' },
    ],
    name: 'publicMint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'currentTokenId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Your deployed NEW NFT contract address
const NFT_CONTRACT = '0xC448393fF5411d871dD8B652C3A317932FddE4E4';

// Color palettes for unique NFTs
const PALETTES = [
  ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
  ['#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'],
  ['#FF8C00', '#FFD700', '#FF4500', '#32CD32', '#1E90FF'],
  ['#FF69B4', '#FF1493', '#C71585', '#DB7093', '#FFB6C1'],
  ['#00CED1', '#20B2AA', '#008B8B', '#2E8B57', '#3CB371'],
  ['#8A2BE2', '#9400D3', '#FF00FF', '#BA55D3', '#DA70D6'],
  ['#FFD700', '#FFA500', '#FF6347', '#FF4500', '#FF0000'],
  ['#00FF00', '#32CD32', '#228B22', '#006400', '#2E8B57'],
];

// Generate unique SVG based on token ID (deterministic from seed)
function generateUniqueSVG(tokenId: number): string {
  const palette = PALETTES[tokenId % PALETTES.length];
  const bgColor = palette[0];
  const shapes: string[] = [];
  
  // Generate unique pattern based on token ID
  const seed = tokenId * 123456789;
  
  // Random circle positions and sizes based on seed
  for (let i = 0; i < 5; i++) {
    const cx = ((seed * (i + 1) * 7) % 300) + 50;
    const cy = ((seed * (i + 2) * 11) % 300) + 50;
    const r = ((seed * (i + 3) * 13) % 80) + 20;
    const color = palette[(i + 1) % palette.length];
    const opacity = 0.3 + ((seed * (i + 4)) % 70) / 100;
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`);
  }
  
  // Add some rectangles
  for (let i = 0; i < 3; i++) {
    const x = ((seed * (i + 7) * 17) % 250) + 25;
    const y = ((seed * (i + 8) * 19) % 250) + 25;
    const w = ((seed * (i + 9) * 23) % 100) + 50;
    const h = ((seed * (i + 10) * 29) % 100) + 50;
    const color = palette[(i + 3) % palette.length];
    const opacity = 0.2 + ((seed * (i + 11)) % 60) / 100;
    const rotate = ((seed * (i + 12)) % 360);
    shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="${opacity}" transform="rotate(${rotate} ${x + w/2} ${y + h/2})"/>`);
  }
  
  // Add center gradient circle
  const gradientId = `grad${tokenId}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="${gradientId}">
      <stop offset="0%" stop-color="${palette[1]}"/>
      <stop offset="100%" stop-color="${palette[0]}"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="${bgColor}"/>
  ${shapes.join('\n')}
  <circle cx="200" cy="200" r="100" fill="url(#${gradientId})" opacity="0.9"/>
  <text x="200" y="385" text-anchor="middle" font-family="Arial" font-size="28" fill="white" font-weight="bold" stroke="black" stroke-width="2">#${tokenId}</text>
</svg>`;
}

// Convert SVG to data URL
function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

// Type for window.ethereum
type EthereumProvider = {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  isMetaMask?: boolean;
};

export default function MintPage() {
  const [status, setStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string>('');
  const [currentTokenId, setCurrentTokenId] = useState<number>(0);
  const { address: connectedAddress } = useAccount();

  // Fetch current token ID from contract
  const fetchCurrentTokenId = async () => {
    try {
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http('https://rpc.testnet.arc.network'),
      });
      
      const data = await publicClient.readContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'currentTokenId',
        args: [],
      });
      
      const nextTokenId = Number(data);
      setCurrentTokenId(nextTokenId);
      // Generate preview for next token
      const svg = generateUniqueSVG(nextTokenId);
      setPreviewSvg(svgToDataUrl(svg));
    } catch (err) {
      console.error('Failed to fetch token ID:', err);
      setCurrentTokenId(0);
      setPreviewSvg(svgToDataUrl(generateUniqueSVG(0)));
    }
  };

  // Initial load
  useState(() => {
    fetchCurrentTokenId();
  });

  const handleMint = async () => {
    if (!connectedAddress) {
      setStatus('❌ Please connect your wallet first');
      return;
    }

    // Cast window.ethereum to our type
    const ethereum = window.ethereum as EthereumProvider | undefined;
    if (!ethereum) {
      setStatus('❌ No wallet detected. Please install MetaMask or OKX wallet.');
      return;
    }

    setLoading(true);
    setStatus('🚀 Preparing unique NFT...');

    try {
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http('https://rpc.testnet.arc.network'),
      });
      
      const nextTokenId = await publicClient.readContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'currentTokenId',
        args: [],
      });
      
      const tokenIdNum = Number(nextTokenId);
      
      // Generate unique SVG for this token
      const svg = generateUniqueSVG(tokenIdNum);
      const imageDataUrl = svgToDataUrl(svg);
      
      // Show preview
      setPreviewSvg(imageDataUrl);
      
      setStatus(`🎨 Minting NFT #${tokenIdNum}...`);

      // Create metadata object
      const metadata = {
        name: `Hengky NFT #${tokenIdNum}`,
        description: `A unique generative NFT from Hengky collection. Token ID: ${tokenIdNum}`,
        image: imageDataUrl,
        attributes: [
          { trait_type: 'Token ID', value: tokenIdNum },
          { trait_type: 'Background', value: PALETTES[tokenIdNum % PALETTES.length][0] },
          { trait_type: 'Rarity', value: tokenIdNum % 10 === 0 ? 'Legendary' : tokenIdNum % 5 === 0 ? 'Rare' : 'Common' },
        ],
      };
      
      const metadataString = JSON.stringify(metadata);

      // Encode mint function call
      const data = encodeFunctionData({
        abi: ERC721_ABI,
        functionName: 'publicMint',
        args: [connectedAddress as `0x${string}`, metadataString],
      });

      // Use window.ethereum directly
      const result = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: connectedAddress,
          to: NFT_CONTRACT,
          data,
        }],
      }) as `0x${string}`;

      setTxHash(result);
      setStatus(`✅ NFT #${tokenIdNum} minted! Waiting for confirmation...`);

      // Wait for receipt
      await publicClient.waitForTransactionReceipt({ hash: result });
      
      setStatus(`✅ NFT #${tokenIdNum} minted successfully!`);
      
      // Refresh preview for next NFT
      fetchCurrentTokenId();
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Mint error:', err);
      setStatus(`❌ Mint failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 to-black p-4">
      <div className="w-full max-w-lg p-8 bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-700">
        <div className="text-center mb-6">
          <div className="mb-2 flex justify-center"><Palette className="w-12 h-12 text-purple-400" /></div>
          <h1 className="text-2xl font-bold text-white">Mint Unique NFT</h1>
          <p className="text-zinc-400 text-sm mt-2">Auto-generate unique SVG NFT with random colors & patterns</p>
        </div>

        {/* NFT Preview */}
        <div className="relative mb-6">
          <div className="bg-white rounded-xl p-4 flex items-center justify-center">
            {previewSvg ? (
              <img 
                src={previewSvg} 
                alt="NFT Preview" 
                className="w-64 h-64 rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-zinc-700 rounded-lg flex items-center justify-center">
                <span className="text-zinc-500">Loading preview...</span>
              </div>
            )}
          </div>
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
            #{currentTokenId}
          </div>
        </div>

        {/* Info */}
        <div className="mb-4 p-3 bg-zinc-900 rounded-lg">
          <div className="text-xs text-zinc-400 space-y-1">
            <p><Palette className="inline w-3 h-3 mr-1 text-purple-400" /><span className="text-zinc-300">Unique pattern</span> generated from token ID</p>
            <p><Palette className="inline w-3 h-3 mr-1 text-purple-400" /><span className="text-zinc-300">Random colors</span> from 8 curated palettes</p>
            <p><Palette className="inline w-3 h-3 mr-1 text-purple-400" /><span className="text-zinc-300">Metadata embedded</span> in token</p>
          </div>
        </div>

        {/* Contract Address */}
        <div className="mb-4">
          <label className="block text-zinc-300 text-sm font-medium mb-1">Contract Address</label>
          <div className="px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg font-mono text-xs text-zinc-400 break-all">
            {NFT_CONTRACT}
          </div>
        </div>

        {/* Recipient */}
        <div className="mb-4">
          <label className="block text-zinc-300 text-sm font-medium mb-1">Recipient</label>
          <div 
            suppressHydrationWarning
            className="px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg font-mono text-xs text-zinc-400 truncate"
          >
            {connectedAddress || 'Not connected - please connect wallet'}
          </div>
        </div>

        {/* Mint Button */}
        <button
          suppressHydrationWarning
          onClick={handleMint}
          disabled={loading || !connectedAddress}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-zinc-600 disabled:to-zinc-600 text-white font-semibold rounded-lg transition-all mt-2 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin">⏳</span> Minting...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> Mint Unique NFT</>
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
                className="text-purple-400 text-xs hover:text-purple-300 mt-2 block font-mono break-all"
              >
                {txHash.slice(0, 20)}...
              </a>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-700">
          <p className="text-zinc-500 text-xs text-center">
            ⚠️ Each NFT is unique • Network: Arc Testnet • Gas: USDC
          </p>
        </div>
      </div>
    </div>
  );
}