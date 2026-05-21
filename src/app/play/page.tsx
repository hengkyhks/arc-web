'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Coins, Trophy, Clock, Play, RotateCcw, Wallet } from 'lucide-react';

const GAME_DURATION = 60;
const GLASS_W = 80;
const GLASS_H = 50;
const STACK_TOLERANCE = 30;

interface Glass { x: number; y: number; }

const W = 400;
const H = 600;
const PLATFORM_Y = 550;
const PLATFORM_SPEED = 3;
const DROP_SPEED = 10;

export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTime, setDisplayTime] = useState(GAME_DURATION);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');

  // Game state in ref to avoid closure issues
  const state = useRef({
    glasses: [] as Glass[],
    activeGlass: null as Glass | null,
    score: 0,
    timeLeft: GAME_DURATION,
    currentX: W / 2,
    direction: 1,
  });

  const canDrop = useRef(true);
  const rafId = useRef<number>(0);
  const lastTime = useRef(Date.now());
  const isPlaying = useRef(false);

  const drawGlass = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Beer glass body (trapezoid)
    ctx.beginPath();
    ctx.moveTo(x - GLASS_W / 2 + 8, y);
    ctx.lineTo(x + GLASS_W / 2 - 8, y);
    ctx.lineTo(x + GLASS_W / 2, y + GLASS_H);
    ctx.lineTo(x - GLASS_W / 2, y + GLASS_H);
    ctx.closePath();

    const grad = ctx.createLinearGradient(x - GLASS_W / 2, y, x + GLASS_W / 2, y);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.fill();

    // Foam top
    ctx.beginPath();
    ctx.ellipse(x, y + 5, GLASS_W / 2 - 6, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fef3c7';
    ctx.fill();

    // Shine
    ctx.beginPath();
    ctx.moveTo(x - GLASS_W / 3, y + 10);
    ctx.lineTo(x - GLASS_W / 3 + 3, y + GLASS_H - 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = state.current;

    // Update time every second
    const now = Date.now();
    if (now - lastTime.current >= 1000) {
      s.timeLeft -= 1;
      setDisplayTime(s.timeLeft);
      lastTime.current = now;

      if (s.timeLeft <= 0) {
        isPlaying.current = false;
        setGameStatus('gameover');
        return;
      }
    }

    // Move platform
    s.currentX += PLATFORM_SPEED * s.direction;
    if (s.currentX >= W - 40) s.direction = -1;
    else if (s.currentX <= 40) s.direction = 1;

    // Drop active glass
    if (s.activeGlass && s.activeGlass.y < PLATFORM_Y - GLASS_H) {
      s.activeGlass.y += DROP_SPEED;

      const stackTop = s.glasses.length > 0
        ? s.glasses[s.glasses.length - 1].y
        : PLATFORM_Y - GLASS_H;

      if (s.activeGlass.y >= stackTop) {
        s.activeGlass.y = stackTop;

        const baseX = s.glasses.length > 0 ? s.glasses[s.glasses.length - 1].x : W / 2;
        const diff = Math.abs(s.activeGlass.x - baseX);

        if (diff <= STACK_TOLERANCE) {
          s.glasses.push({ ...s.activeGlass });
          s.score += 1;
          setDisplayScore(s.score);
        } else {
          isPlaying.current = false;
          setGameStatus('gameover');
          return;
        }

        s.activeGlass = null;
        canDrop.current = true;
      }
    }

    // Draw
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, W, H);

    // Platform
    ctx.fillStyle = '#52525b';
    ctx.fillRect(s.currentX - 40, PLATFORM_Y, 80, 12);

    // Guide line
    ctx.strokeStyle = '#3f3f46';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(s.currentX, 80);
    ctx.lineTo(s.currentX, PLATFORM_Y - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glasses
    for (const g of s.glasses) drawGlass(ctx, g.x, g.y);
    if (s.activeGlass) drawGlass(ctx, s.activeGlass.x, s.activeGlass.y);

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.score}`, W / 2, 35);

    // Timer
    ctx.fillStyle = s.timeLeft <= 10 ? '#ef4444' : '#71717a';
    ctx.font = '16px monospace';
    ctx.fillText(`${s.timeLeft}s`, W / 2, 58);

    if (isPlaying.current) {
      rafId.current = requestAnimationFrame(tick);
    }
  }, [drawGlass]);

  const startGame = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const s = state.current;
    s.glasses = [];
    s.activeGlass = null;
    s.score = 0;
    s.timeLeft = GAME_DURATION;
    s.currentX = W / 2;
    s.direction = 1;
    canDrop.current = true;
    isPlaying.current = true;

    setDisplayScore(0);
    setDisplayTime(GAME_DURATION);
    lastTime.current = Date.now();
    setGameStatus('playing');

    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  const dropGlass = useCallback(() => {
    if (!canDrop.current || !isPlaying.current) return;
    canDrop.current = false;
    state.current.activeGlass = { x: state.current.currentX, y: 30 };
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPlaying.current) {
        e.preventDefault();
        dropGlass();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dropGlass]);

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="mb-2 flex justify-center">
            <Trophy className="w-14 h-14 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold">🍺 Beer Stack</h1>
          <p className="text-zinc-400 mt-2">Stack as many glasses as you can in 60 seconds!</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-800 rounded-xl p-4 text-center border border-zinc-700">
            <Coins className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold">0.2 HKY</div>
            <div className="text-xs text-zinc-400">Entry Fee</div>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4 text-center border border-zinc-700">
            <Clock className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <div className="text-lg font-bold">60 sec</div>
            <div className="text-xs text-zinc-400">Game Duration</div>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4 text-center border border-zinc-700">
            <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-lg font-bold">2,000 HKY</div>
            <div className="text-xs text-zinc-400">Prize Pool</div>
          </div>
        </div>

        <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
          {gameStatus === 'idle' ? (
            <div className="text-center py-12">
              <div className="mb-6"><span className="text-6xl">🍻</span></div>
              <h2 className="text-xl font-bold mb-2">Ready to Stack?</h2>
              <p className="text-zinc-400 mb-6">Press SPACE or click TAP to drop glasses</p>
              <button
                onClick={startGame}
                className="px-8 py-4 bg-green-600 hover:bg-green-500 font-bold rounded-xl transition-colors flex items-center gap-2 mx-auto text-lg"
              >
                <Play className="w-5 h-5" /> START GAME
              </button>
              <p className="text-xs text-zinc-500 mt-4">Entry fee: 0.2 HKY (connect wallet for real play)</p>
            </div>
          ) : gameStatus === 'playing' ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  className="rounded-xl border-2 border-zinc-600 cursor-pointer"
                  onClick={dropGlass}
                />
              </div>
              <p className="text-zinc-400 text-sm mb-4">Press SPACE or click canvas to drop</p>
              <div className="flex justify-center gap-6">
                <div className="bg-zinc-700 px-6 py-3 rounded-xl">
                  <span className="text-zinc-400 text-sm">Score: </span>
                  <span className="font-bold text-3xl text-green-400">{displayScore}</span>
                </div>
                <div className="bg-zinc-700 px-6 py-3 rounded-xl">
                  <span className="text-zinc-400 text-sm">Time: </span>
                  <span className={`font-bold text-3xl ${displayTime <= 10 ? 'text-red-400' : 'text-orange-400'}`}>{displayTime}s</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-6 text-6xl">{displayScore >= 10 ? '🏆' : '😢'}</div>
              <h2 className="text-2xl font-bold mb-2">
                {displayScore >= 10 ? 'Great Job!' : 'Game Over!'}
              </h2>
              <p className="text-4xl font-bold text-green-400 mb-2">{displayScore} glasses</p>
              <p className="text-zinc-400 mb-6">
                {displayScore >= 10 ? 'You might be in the leaderboard!' : 'Try again!'}
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" /> Play Again
                </button>
                <Link
                  href="/leaderboard"
                  className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <Trophy className="w-5 h-5" /> Leaderboard
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-zinc-800 rounded-xl p-4 border border-zinc-700">
          <h3 className="font-bold mb-2">🏆 Weekly Tournament</h3>
          <div className="text-sm text-zinc-400 space-y-1">
            <p>• Tournament runs every week (auto-start Monday 00:00 UTC)</p>
            <p>• Top 5 players share the 2,000 HKY prize pool</p>
            <p>• Your highest score per tournament is counted</p>
            <p>• Winners can claim prizes after tournament ends</p>
          </div>
          <div className="mt-3">
            <Link href="/leaderboard" className="text-blue-400 hover:text-blue-300 text-sm">
              View Leaderboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}