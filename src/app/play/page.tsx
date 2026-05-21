'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Coins, Trophy, Clock, Play, RotateCcw, Wallet } from 'lucide-react';

const GAME_DURATION = 60;
const GLASS_W = 50;
const GLASS_H = 55;
const BASE_TOLERANCE = 20;

const W = 400;
const H = 650;
const PLATFORM_Y = 620;
const PLATFORM_SPEED = 2.5;
const DROP_SPEED = 8;
const GRAVITY = 0.15;
const FRICTION = 0.92;

interface Glass {
  x: number;
  y: number;
  angle: number;
  settled: boolean;
  vy: number;
}

export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTime, setDisplayTime] = useState(GAME_DURATION);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [highScore, setHighScore] = useState(0);

  const gameState = useRef({
    glasses: [] as Glass[],
    activeGlass: null as { x: number; y: number; vx: number; vy: number; angle: number } | null,
    score: 0,
    timeLeft: GAME_DURATION,
    platformX: W / 2,
    direction: 1,
    isDropping: false,
  });

  const canDrop = useRef(true);
  const rafId = useRef<number>(0);
  const lastTime = useRef(Date.now());
  const isPlaying = useRef(false);
  const gameOver = useRef(false);

  const drawGlass = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Glass body (beer mug shape)
    const w = GLASS_W;
    const h = GLASS_H;

    // Body
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 5, 0);
    ctx.lineTo(w / 2 - 5, 0);
    ctx.lineTo(w / 2 + 2, h);
    ctx.lineTo(-w / 2 - 2, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.fill();

    // Beer liquid
    ctx.fillStyle = 'rgba(180, 120, 0, 0.6)';
    ctx.fillRect(-w / 2 + 4, h * 0.3, w - 8, h * 0.6);

    // Foam top
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2 - 3, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fef3c7';
    ctx.fill();

    // Handle
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2 + 6, h * 0.4, 8, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    // Shine
    ctx.beginPath();
    ctx.moveTo(-w / 3, 5);
    ctx.lineTo(-w / 3 + 3, h - 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  };

  const calculateTowerAngle = (glasses: Glass[]): number => {
    if (glasses.length < 2) return 0;

    let totalAngle = 0;
    for (const g of glasses) {
      totalAngle += g.angle;
    }
    return totalAngle / glasses.length;
  };

  const checkCollapse = (glasses: Glass[], newGlass: Glass): boolean => {
    if (glasses.length === 0) return false;

    const topGlass = glasses[glasses.length - 1];
    const combinedAngle = Math.abs(topGlass.angle) + Math.abs(newGlass.angle);

    // Higher stack = more likely to collapse
    // Each glass adds instability
    const heightPenalty = glasses.length * 3;
    const maxStableAngle = Math.max(15, 35 - heightPenalty);

    // Check if new glass would make tower too tilted
    const avgAngle = (topGlass.angle + newGlass.angle) / 2;
    if (Math.abs(avgAngle) > maxStableAngle) return true;

    // Check center of mass - if new glass is too far from center
    const stackTop = glasses[glasses.length - 1];
    const dx = Math.abs(newGlass.x - stackGlass.x);
    if (dx > BASE_TOLERANCE + (glasses.length * 2)) return true;

    return false;
  };

  const checkCollapseSimple = (glasses: Glass[]): boolean => {
    if (glasses.length < 2) return false;

    // Calculate average angle of tower
    let avgAngle = 0;
    for (const g of glasses) {
      avgAngle += g.angle;
    }
    avgAngle /= glasses.length;

    // Higher stack = less stable
    const maxStable = Math.max(8, 25 - glasses.length * 2.5);

    return Math.abs(avgAngle) > maxStable;
  };

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = gameState.current;

    if (gameOver.current) return;

    // Update time
    const now = Date.now();
    if (now - lastTime.current >= 1000) {
      s.timeLeft -= 1;
      setDisplayTime(s.timeLeft);
      lastTime.current = now;

      if (s.timeLeft <= 0) {
        gameOver.current = true;
        isPlaying.current = false;
        if (s.score > highScore) setHighScore(s.score);
        setGameStatus('gameover');
        return;
      }
    }

    // Move platform
    s.platformX += PLATFORM_SPEED * s.direction;
    if (s.platformX >= W - 50) s.direction = -1;
    else if (s.platformX <= 50) s.direction = 1;

    // Drop active glass
    if (s.activeGlass && !s.isDropping) {
      s.activeGlass.vy += GRAVITY;
      s.activeGlass.y += s.activeGlass.vy;
      s.activeGlass.x += s.activeGlass.vx;
      s.activeGlass.vx *= FRICTION;

      // Constrain to canvas
      if (s.activeGlass.x < GLASS_W) s.activeGlass.x = GLASS_W;
      if (s.activeGlass.x > W - GLASS_W) s.activeGlass.x = W - GLASS_W;

      const stackTop = s.glasses.length > 0
        ? s.glasses[s.glasses.length - 1].y
        : PLATFORM_Y - GLASS_H;

      // Check landing
      if (s.activeGlass.y >= stackTop) {
        s.activeGlass.y = stackTop;

        const prevGlass = s.glasses.length > 0 ? s.glasses[s.glasses.length - 1] : null;

        if (prevGlass) {
          // Calculate where this glass lands relative to previous
          const dx = s.activeGlass.x - prevGlass.x;
          const baseTolerance = BASE_TOLERANCE + (s.glasses.length * 1.5);

          // Physics-based angle based on offset
          const normalizedOffset = dx / GLASS_W;
          const newAngle = prevGlass.angle + (normalizedOffset * 0.15);

          // Check if collapsed
          if (Math.abs(newAngle) > 12 + (s.glasses.length * 2)) {
            // Tower collapses!
            gameOver.current = true;
            isPlaying.current = false;
            if (s.score > highScore) setHighScore(s.score);
            setGameStatus('gameover');

            // Animate collapse
            s.glasses.forEach(g => {
              g.vy = Math.random() * 3 + 2;
              g.vx = (Math.random() - 0.5) * 4;
            });
            s.activeGlass = null;
          } else {
            s.glasses.push({
              x: s.activeGlass.x,
              y: stackTop,
              angle: newAngle,
              settled: true,
              vy: 0,
            });
            s.score += 1;
            setDisplayScore(s.score);
            s.activeGlass = null;
            canDrop.current = true;
          }
        } else {
          // First glass
          s.glasses.push({
            x: s.activeGlass.x,
            y: stackTop,
            angle: 0,
            settled: true,
            vy: 0,
          });
          s.score += 1;
          setDisplayScore(s.score);
          s.activeGlass = null;
          canDrop.current = true;
        }
      }
    }

    // Animate falling glasses (collapse animation)
    for (const g of s.glasses) {
      if (g.vy !== undefined && g.vy > 0) {
        g.vy += GRAVITY;
        g.y += g.vy;
        g.x += g.vx;
        g.vx *= 0.98;
        g.angle += g.vx * 0.05;
      }
    }

    // Remove glasses that fell off screen
    s.glasses = s.glasses.filter(g => g.y < H + 100);

    // Draw
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, W, H);

    // Background pattern
    ctx.fillStyle = '#1a1a1a';
    for (let i = 0; i < W; i += 20) {
      ctx.fillRect(i, 0, 1, H);
    }
    for (let i = 0; i < H; i += 20) {
      ctx.fillRect(0, i, W, 1);
    }

    // Platform / table
    ctx.fillStyle = '#44403c';
    ctx.fillRect(30, PLATFORM_Y, W - 60, 15);
    ctx.fillStyle = '#78716c';
    ctx.fillRect(30, PLATFORM_Y, W - 60, 4);

    // Draw stacked glasses
    for (const g of s.glasses) {
      drawGlass(ctx, g.x, g.y, g.angle);
    }

    // Draw falling glass
    if (s.activeGlass) {
      drawGlass(ctx, s.activeGlass.x, s.activeGlass.y, 0);
    }

    // Draw platform indicator
    ctx.fillStyle = 'rgba(255,200,100,0.3)';
    ctx.fillRect(s.platformX - 25, 60, 50, 3);

    // Guide line
    ctx.strokeStyle = 'rgba(255,200,100,0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(s.platformX, 80);
    ctx.lineTo(s.platformX, PLATFORM_Y - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Score UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.score}`, W / 2, 40);

    // Timer
    ctx.fillStyle = s.timeLeft <= 10 ? '#ef4444' : '#a1a1aa';
    ctx.font = '18px monospace';
    ctx.fillText(`${s.timeLeft}s`, W / 2, 65);

    // Stability indicator
    if (s.glasses.length > 1) {
      const angle = calculateTowerAngle(s.glasses);
      const maxStable = Math.max(8, 25 - s.glasses.length * 2.5);
      const stabilityPct = Math.max(0, 100 - (Math.abs(angle) / maxStable) * 100);

      ctx.fillStyle = stabilityPct > 50 ? '#22c55e' : stabilityPct > 25 ? '#eab308' : '#ef4444';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Stability: ${Math.round(stabilityPct)}%`, W - 20, 40);
    }

    if (isPlaying.current) {
      rafId.current = requestAnimationFrame(tick);
    }
  }, []);

  const startGame = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const s = gameState.current;
    s.glasses = [];
    s.activeGlass = null;
    s.score = 0;
    s.timeLeft = GAME_DURATION;
    s.platformX = W / 2;
    s.direction = 1;
    s.isDropping = false;
    canDrop.current = true;
    isPlaying.current = true;
    gameOver.current = false;

    setDisplayScore(0);
    setDisplayTime(GAME_DURATION);
    lastTime.current = Date.now();
    setGameStatus('playing');

    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  const dropGlass = useCallback(() => {
    if (!canDrop.current || !isPlaying.current || gameOver.current) return;

    const s = gameState.current;
    if (s.activeGlass) return; // Already dropping

    canDrop.current = false;
    s.isDropping = true;

    // Add slight randomness to drop position
    const randomOffset = (Math.random() - 0.5) * 20;
    const dropX = s.platformX + randomOffset;

    s.activeGlass = {
      x: dropX,
      y: 50,
      vx: 0,
      vy: 0,
      angle: 0,
    };

    setTimeout(() => {
      s.isDropping = false;
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPlaying.current && !gameOver.current) {
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
          <p className="text-zinc-400 text-sm">Stack glasses — higher = more unstable!</p>
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
              <div className="mb-6">
                <span className="text-7xl">🍻</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Ready to Stack?</h2>
              <p className="text-zinc-400 mb-2">Click or press SPACE to drop glasses</p>
              <p className="text-zinc-500 text-sm mb-6">Higher stack = more unstable!</p>
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
              <p className="text-zinc-500 text-sm">Click or SPACE to drop</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4 text-5xl">{displayScore >= 5 ? '🏆' : '💥'}</div>
              <h2 className="text-2xl font-bold mb-1">Game Over!</h2>
              <p className="text-4xl font-bold text-green-400 mb-2">{displayScore} glasses</p>
              {highScore > 0 && (
                <p className="text-zinc-400 text-sm mb-4">Best: {highScore}</p>
              )}
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