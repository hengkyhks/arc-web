'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Coins, Trophy, Clock, Play, RotateCcw, Wallet } from 'lucide-react';

const GAME_DURATION = 60;
const GLASS_W = 48;
const GLASS_H = 54;
const ALIGN_TOLERANCE = 22;

const W = 400;
const H = 650;
const PLATFORM_Y = 620;
const PLATFORM_SPEED = 3.5;
const DROP_SPEED = 14;

interface Glass {
  x: number;
  y: number;
  falling: boolean;
  vx: number;
  vy: number;
}

export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTime, setDisplayTime] = useState(GAME_DURATION);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [highScore, setHighScore] = useState(0);

  const game = useRef({
    glasses: [] as Glass[],
    activeGlass: null as { x: number; y: number } | null,
    score: 0,
    timeLeft: GAME_DURATION,
    platformX: W / 2,
    direction: 1,
  });

  const canDrop = useRef(true);
  const rafId = useRef<number>(0);
  const lastTime = useRef(Date.now());
  const isPlaying = useRef(false);
  const gameEnded = useRef(false);
  const isCollapsing = useRef(false);

  const drawGlass = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const w = GLASS_W;
    const h = GLASS_H;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + h + 2, w / 2 + 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glass body (straight sides for stacking)
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x - w / 2, y + h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    grad.addColorStop(0, '#dd9f20');
    grad.addColorStop(0.4, '#f5c542');
    grad.addColorStop(0.6, '#f5c542');
    grad.addColorStop(1, '#c9921f');
    ctx.fillStyle = grad;
    ctx.fill();

    // Beer liquid
    ctx.fillStyle = 'rgba(150, 90, 0, 0.65)';
    ctx.fillRect(x - w / 2 + 3, y + h * 0.28, w - 6, h * 0.6);

    // Foam top
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w / 2 - 2, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fffce8';
    ctx.fill();

    // Foam texture
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(x - 7, y + 1, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 6, y, 1.2, 0, Math.PI * 2);
    ctx.arc(x + 12, y + 2, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Glass shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x - w / 2 + 5, y + 6, 3, h - 14);

    // Rim line
    ctx.strokeStyle = 'rgba(255,220,80,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.stroke();
  };

  const triggerCollapse = useCallback((glasses: Glass[]) => {
    isCollapsing.current = true;

    glasses.forEach(g => {
      g.falling = true;
      g.vx = (Math.random() - 0.5) * 6;
      g.vy = -Math.random() * 4 - 2;
    });

    const collapseTick = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      let stillFalling = false;

      for (const g of glasses) {
        if (!g.falling) continue;

        g.vy += 0.4;
        g.x += g.vx;
        g.y += g.vy;
        g.vx *= 0.99;

        if (g.y < H + 200) stillFalling = true;
      }

      // Draw
      ctx.fillStyle = '#121218';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#3d3d4a';
      ctx.fillRect(20, PLATFORM_Y, W - 40, 20);

      for (const g of glasses) {
        if (g.y < H + 100) drawGlass(ctx, g.x, g.y);
      }

      if (stillFalling && isCollapsing.current) {
        requestAnimationFrame(collapseTick);
      } else {
        isCollapsing.current = false;
        isPlaying.current = false;
        gameEnded.current = true;
        if (game.current.score > highScore) setHighScore(game.current.score);
        setGameStatus('gameover');
      }
    };

    requestAnimationFrame(collapseTick);
  }, [highScore]);

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = game.current;

    if (gameEnded.current || isCollapsing.current) return;

    // Time
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

    // Move platform
    g.platformX += PLATFORM_SPEED * g.direction;
    if (g.platformX >= W - 40) g.direction = -1;
    else if (g.platformX <= 40) g.direction = 1;

    // Drop active glass
    if (g.activeGlass) {
      g.activeGlass.y += DROP_SPEED;

      const stackTop = g.glasses.length > 0
        ? g.glasses[g.glasses.length - 1].y
        : PLATFORM_Y - GLASS_H;

      if (g.activeGlass.y >= stackTop) {
        const prevX = g.glasses.length > 0 ? g.glasses[g.glasses.length - 1].x : g.activeGlass.x;
        const diff = Math.abs(g.activeGlass.x - prevX);

        if (diff > ALIGN_TOLERANCE) {
          // Miss! Trigger collapse
          g.activeGlass = null;
          triggerCollapse(g.glasses);
          return;
        }

        // Stack it
        g.glasses.push({ x: g.activeGlass.x, y: stackTop, falling: false, vx: 0, vy: 0 });
        g.score += 1;
        setDisplayScore(g.score);
        g.activeGlass = null;
        canDrop.current = true;
      }
    }

    // Draw
    ctx.fillStyle = '#121218';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Platform base
    ctx.fillStyle = '#3d3d4a';
    ctx.fillRect(20, PLATFORM_Y, W - 40, 20);
    ctx.fillStyle = '#52525b';
    ctx.fillRect(20, PLATFORM_Y, W - 40, 5);

    // Moving platform indicator
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(g.platformX - 22, PLATFORM_Y - 3, 44, 3);

    // Draw glasses (bottom to top)
    for (let i = 0; i < g.glasses.length; i++) {
      drawGlass(ctx, g.glasses[i].x, g.glasses[i].y);
    }

    // Draw falling glass
    if (g.activeGlass) {
      // Target indicator
      ctx.fillStyle = 'rgba(245,197,66,0.15)';
      ctx.beginPath();
      ctx.arc(g.platformX, PLATFORM_Y - GLASS_H - 5, ALIGN_TOLERANCE, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245,197,66,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      drawGlass(ctx, g.activeGlass.x, g.activeGlass.y);
    }

    // UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${g.score}`, W / 2, 42);

    ctx.fillStyle = g.timeLeft <= 10 ? '#ef4444' : '#71717a';
    ctx.font = '16px monospace';
    ctx.fillText(`${g.timeLeft}s`, W / 2, 68);

    if (highScore > 0) {
      ctx.fillStyle = '#a78bfa';
      ctx.font = '14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Best: ${highScore}`, W - 20, 40);
    }

    // Height indicator
    if (g.glasses.length >= 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Height: ${g.glasses.length}`, W / 2, H - 15);
    }

    if (isPlaying.current) {
      rafId.current = requestAnimationFrame(tick);
    }
  }, [highScore, triggerCollapse]);

  const startGame = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const g = game.current;
    g.glasses = [];
    g.activeGlass = null;
    g.score = 0;
    g.timeLeft = GAME_DURATION;
    g.platformX = W / 2;
    g.direction = 1;
    canDrop.current = true;
    isPlaying.current = true;
    gameEnded.current = false;
    isCollapsing.current = false;

    setDisplayScore(0);
    setDisplayTime(GAME_DURATION);
    lastTime.current = Date.now();
    setGameStatus('playing');

    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  const dropGlass = useCallback(() => {
    if (!canDrop.current || !isPlaying.current || gameEnded.current || isCollapsing.current) return;
    if (game.current.activeGlass) return;

    canDrop.current = false;
    game.current.activeGlass = {
      x: game.current.platformX,
      y: 40,
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPlaying.current && !gameEnded.current && !isCollapsing.current) {
        e.preventDefault();
        dropGlass();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dropGlass]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="w-full bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
              <span className="text-blue-500">🧩</span>
              <span>Arc Starter Kit</span>
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium">
              <Wallet className="w-4 h-4" /> Connect Wallet
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">🍺 Beer Stack</h1>
          <p className="text-zinc-400 text-sm">Stack glasses perfectly — miss and the tower collapses!</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-zinc-800 rounded-lg p-3 text-center border border-zinc-700">
            <Coins className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <div className="text-sm font-bold">0.2 HKY</div>
            <div className="text-xs text-zinc-500">Entry</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-center border border-zinc-700">
            <Clock className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <div className="text-sm font-bold">{displayTime}s</div>
            <div className="text-xs text-zinc-500">Time</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-center border border-zinc-700">
            <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-sm font-bold text-green-400">{displayScore}</div>
            <div className="text-xs text-zinc-500">Score</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-center border border-zinc-700">
            <Trophy className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div className="text-sm font-bold text-purple-400">{highScore}</div>
            <div className="text-xs text-zinc-500">Best</div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-700">
          {gameStatus === 'idle' ? (
            <div className="text-center py-16">
              <div className="mb-6"><span className="text-7xl">🍻</span></div>
              <h2 className="text-2xl font-bold mb-2">Ready to Stack?</h2>
              <p className="text-zinc-400 mb-2">Click or press SPACE to drop</p>
              <p className="text-zinc-500 text-sm mb-6">Land within the target circle to stack!</p>
              <button
                onClick={startGame}
                className="px-10 py-4 bg-green-600 hover:bg-green-500 font-bold rounded-xl transition-colors flex items-center gap-2 mx-auto text-lg"
              >
                <Play className="w-5 h-5" /> START GAME
              </button>
              <p className="text-xs text-zinc-600 mt-4">Connect wallet for real play with HKY</p>
            </div>
          ) : gameStatus === 'playing' ? (
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  className="rounded-xl border border-zinc-700 cursor-pointer"
                  onClick={dropGlass}
                />
              </div>
              <p className="text-zinc-500 text-sm">SPACE or click to drop — aim for the target!</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4 text-5xl">{displayScore >= 5 ? '🏆' : '💥'}</div>
              <h2 className="text-2xl font-bold mb-1">Game Over!</h2>
              <p className="text-4xl font-bold text-green-400 mb-2">{displayScore} glasses</p>
              {highScore > 0 && <p className="text-zinc-400 text-sm mb-4">Best: {highScore}</p>}
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
                <Link
                  href="/leaderboard"
                  className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" /> Leaderboard
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 bg-zinc-900 rounded-xl p-4 border border-zinc-700">
          <h3 className="font-bold text-sm mb-2">🏆 Tournament Info</h3>
          <div className="text-xs text-zinc-400 space-y-1">
            <p>• Prize pool: 2,000 HKY (top 5 players)</p>
            <p>• Weekly tournament, auto-starts Monday</p>
            <p>• Your highest score per week is counted</p>
          </div>
        </div>
      </div>
    </div>
  );
}