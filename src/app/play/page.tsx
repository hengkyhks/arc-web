'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Coins, Trophy, Clock, Play, RotateCcw, Wallet, Heart } from 'lucide-react';

const GAME_DURATION = 60;
const BLOCK_W = 100;
const BLOCK_H = 32;
const CRANE_SPEED = 3;
const DROP_SPEED = 15;
const PLATFORM_Y = 620;
const W = 400;
const H = 650;

const BLOCK_COLORS = [
  '#60a5fa', '#f87171', '#4ade80', '#facc15', '#c084fc',
  '#fb923c', '#38bdf8', '#a78bfa', '#f472b6', '#34d399',
];

interface Block {
  x: number;
  y: number;
  w: number;
  color: string;
  tilt: number; // angle in radians
}

export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayTime, setDisplayTime] = useState(GAME_DURATION);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [highScore, setHighScore] = useState(0);

  const game = useRef({
    blocks: [] as Block[],
    craneX: W / 2,
    craneDir: 1,
    activeBlock: null as { x: number; y: number; w: number; color: string } | null,
    dropped: false,
    score: 0,
    lives: 3,
    timeLeft: GAME_DURATION,
  });

  const rafId = useRef<number>(0);
  const lastTime = useRef(Date.now());
  const isPlaying = useRef(false);
  const gameEnded = useRef(false);
  const colorIndex = useRef(0);

  const drawBlock = (ctx: CanvasRenderingContext2D, block: Block) => {
    const { x, y, w, color, tilt } = block;
    const h = BLOCK_H;

    ctx.save();
    ctx.translate(x, y + h / 2);
    ctx.rotate(tilt);
    ctx.translate(-x, -(y + h / 2));

    // Block body
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, w, h);

    // Glossy top
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x - w / 2, y, w, 5);

    // Left highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x - w / 2, y, 3, h);

    // Bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x - w / 2, y + h - 4, w, 4);

    // Outline
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2, y, w, h);

    ctx.restore();
  };

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = game.current;

    if (gameEnded.current) return;

    // Timer
    const now = Date.now();
    if (now - lastTime.current >= 1000) {
      g.timeLeft -= 1;
      setDisplayTime(g.timeLeft);
      lastTime.current = now;

      if (g.timeLeft <= 0) {
        gameEnded.current = true;
        isPlaying.current = false;
        if (g.score > highScore) setHighScore(g.score);
        setGameStatus('gameover');
        return;
      }
    }

    // Move crane (always moves, even while block is falling)
    g.craneX += CRANE_SPEED * g.craneDir;
    if (g.craneX >= W - 50) g.craneDir = -1;
    else if (g.craneX <= 50) g.craneDir = 1;

    // Block falls after player clicks — follows crane position at drop time
    if (g.activeBlock && g.dropped) {
      g.activeBlock.y += DROP_SPEED;

      // Calculate where it should land
      const landY = g.blocks.length > 0
        ? g.blocks[g.blocks.length - 1].y - BLOCK_H
        : PLATFORM_Y - BLOCK_H;

      if (g.activeBlock.y >= landY) {
        const active = g.activeBlock;

        // Check if block lands on top of tower
        if (g.blocks.length > 0) {
          const topBlock = g.blocks[g.blocks.length - 1];
          const topLeft = topBlock.x - topBlock.w / 2;
          const topRight = topBlock.x + topBlock.w / 2;
          const currLeft = active.x - BLOCK_W / 2;
          const currRight = active.x + BLOCK_W / 2;

          // Check overlap
          const overlapLeft = Math.max(topLeft, currLeft);
          const overlapRight = Math.min(topRight, currRight);

          if (overlapRight <= overlapLeft) {
            // Miss! Block fell off — lose a life
            g.lives -= 1;
            setDisplayLives(g.lives);
            g.activeBlock = null;

            if (g.lives <= 0) {
              gameEnded.current = true;
              isPlaying.current = false;
              if (g.score > highScore) setHighScore(g.score);
              setGameStatus('gameover');
              return;
            }

            // Spawn next block
            spawnNextBlock();
          } else {
            // Landed! Stack it — adjust position to center of overlap
            const newX = (overlapLeft + overlapRight) / 2;
            const newW = overlapRight - overlapLeft;

            // Calculate tilt based on offset from top block center
            const offset = active.x - topBlock.x;
            const tilt = offset * 0.008; // subtle tilt based on offset

            g.blocks.push({ x: newX, y: landY, w: newW, color: active.color, tilt });
            g.score += 1;
            setDisplayScore(g.score);
            g.activeBlock = null;

            // Spawn next block at current crane position
            spawnNextBlock();
          }
        } else {
          // First block — place it
          g.blocks.push({ x: active.x, y: landY, w: BLOCK_W, color: active.color, tilt: 0 });
          g.score += 1;
          setDisplayScore(g.score);
          g.activeBlock = null;
          spawnNextBlock();
        }
      }
    }

    // Draw background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Platform
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(50, PLATFORM_Y, W - 100, 16);

    // Ground
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, PLATFORM_Y + 16, W, H - PLATFORM_Y - 16);

    // Draw stacked blocks (bottom to top, with tilt)
    for (const block of g.blocks) {
      drawBlock(ctx, block);
    }

    // Draw crane rope
    if (g.activeBlock) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(g.craneX, 0);
      ctx.lineTo(g.craneX, g.activeBlock.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw hanging block
      drawBlock(ctx, { x: g.craneX, y: g.activeBlock.y, w: BLOCK_W, color: g.activeBlock.color, tilt: 0 });

      // Ghost/preview — show where block will land
      if (g.blocks.length > 0) {
        const topBlock = g.blocks[g.blocks.length - 1];
        ctx.globalAlpha = 0.2;
        drawBlock(ctx, { x: g.craneX, y: topBlock.y - BLOCK_H, w: BLOCK_W, color: g.activeBlock.color, tilt: 0 });
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 0.2;
        drawBlock(ctx, { x: g.craneX, y: PLATFORM_Y - BLOCK_H, w: BLOCK_W, color: g.activeBlock.color, tilt: 0 });
        ctx.globalAlpha = 1;
      }
    }

    // Crane indicator at top
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(g.craneX - 15, 0);
    ctx.lineTo(g.craneX + 15, 0);
    ctx.lineTo(g.craneX, 12);
    ctx.closePath();
    ctx.fill();

    // UI - Score (right)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${g.score}`, W - 16, 38);

    // Height (left)
    if (g.blocks.length > 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Floor ${g.blocks.length}`, 16, 38);
    }

    // Lives (hearts)
    const heartX = 16;
    const heartY = 60;
    for (let i = 0; i < 3; i++) {
      const filled = i < g.lives;
      ctx.fillStyle = filled ? '#ef4444' : '#374151';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(filled ? '❤️' : '🖤', heartX + i * 26, heartY);
    }

    if (isPlaying.current) {
      rafId.current = requestAnimationFrame(tick);
    }
  }, [highScore]);

  const spawnNextBlock = useCallback(() => {
    const color = BLOCK_COLORS[colorIndex.current % BLOCK_COLORS.length];
    colorIndex.current += 1;
    const g = game.current;
    g.activeBlock = {
      x: g.craneX,
      y: 20,
      w: BLOCK_W,
      color,
    };
    g.dropped = false;
  }, []);

  const startGame = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const g = game.current;
    g.blocks = [];
    g.craneX = W / 2;
    g.craneDir = 1;
    g.activeBlock = null;
    g.score = 0;
    g.lives = 3;
    g.timeLeft = GAME_DURATION;
    colorIndex.current = 0;
    isPlaying.current = true;
    gameEnded.current = false;

    setDisplayScore(0);
    setDisplayLives(3);
    setDisplayTime(GAME_DURATION);
    lastTime.current = Date.now();
    setGameStatus('playing');

    spawnNextBlock();
    rafId.current = requestAnimationFrame(tick);
  }, [tick, spawnNextBlock]);

  const dropBlock = useCallback(() => {
    if (!isPlaying.current || gameEnded.current) return;
    const g = game.current;
    if (g.activeBlock && !g.dropped) {
      // Lock the X position at drop time
      g.activeBlock.x = g.craneX;
      g.dropped = true;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPlaying.current && !gameEnded.current) {
        e.preventDefault();
        dropBlock();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dropBlock]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="w-full bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
              <span className="text-blue-500">🧩</span>
              <span>Arc Starter Kit</span>
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium">
              <Wallet className="w-4 h-4" /> Connect Wallet
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">🏗️ Tower Builder</h1>
          <p className="text-slate-400 text-sm">Timing + precision — build as high as you can!</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-800 rounded-lg p-3 text-center border border-slate-700">
            <Coins className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <div className="text-sm font-bold">0.2 HKY</div>
            <div className="text-xs text-slate-500">Entry</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center border border-slate-700">
            <Clock className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <div className="text-sm font-bold">{displayTime}s</div>
            <div className="text-xs text-slate-500">Time</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center border border-slate-700">
            <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-sm font-bold text-green-400">{displayScore}</div>
            <div className="text-xs text-slate-500">Score</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center border border-slate-700">
            <Heart className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <div className="text-sm font-bold text-red-400">{displayLives}</div>
            <div className="text-xs text-slate-500">Lives</div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700">
          {gameStatus === 'idle' ? (
            <div className="text-center py-16">
              <div className="mb-6"><span className="text-7xl">🏗️</span></div>
              <h2 className="text-2xl font-bold mb-2">Build Your Tower!</h2>
              <p className="text-slate-400 mb-2">Click or press SPACE to drop blocks</p>
              <p className="text-slate-500 text-sm mb-6">3 lives — miss 3 blocks and it&apos;s game over!</p>
              <button
                onClick={startGame}
                className="px-10 py-4 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl transition-colors flex items-center gap-2 mx-auto text-lg"
              >
                <Play className="w-5 h-5" /> START GAME
              </button>
              <p className="text-xs text-slate-600 mt-4">Connect wallet for real play with HKY</p>
            </div>
          ) : gameStatus === 'playing' ? (
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  className="rounded-xl border border-slate-700 cursor-pointer"
                  onClick={dropBlock}
                />
              </div>
              <p className="text-slate-500 text-sm">Click or SPACE to drop — timing is everything!</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4 text-5xl">{displayScore >= 5 ? '🏆' : '💥'}</div>
              <h2 className="text-2xl font-bold mb-1">Game Over!</h2>
              <p className="text-4xl font-bold text-green-400 mb-2">{displayScore} floors</p>
              {highScore > 0 && <p className="text-slate-400 text-sm mb-4">Best: {highScore}</p>}
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
                <Link
                  href="/leaderboard"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" /> Leaderboard
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 bg-slate-900 rounded-xl p-4 border border-slate-700">
          <h3 className="font-bold text-sm mb-2">🏆 Tournament Info</h3>
          <div className="text-xs text-slate-400 space-y-1">
            <p>• Prize pool: 2,000 HKY (top 5 players)</p>
            <p>• Weekly tournament, auto-starts Monday</p>
            <p>• Your highest score per week is counted</p>
          </div>
        </div>
      </div>
    </div>
  );
}