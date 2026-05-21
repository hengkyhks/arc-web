'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Coins, Trophy, Clock, Play, RotateCcw } from 'lucide-react';
import { ConnectButton } from '../providers';
import Link from 'next/link';

const GAME_DURATION = 60; // seconds
const GLASS_WIDTH = 80;
const GLASS_HEIGHT = 50;
const DROP_SPEED = 12; // pixels per frame
const STACK_TOLERANCE = 25; // pixels misalignment tolerance

interface Glass {
  x: number;
  y: number;
  fell: boolean;
}

interface GameState {
  glasses: Glass[];
  activeGlass: Glass | null;
  score: number;
  timeLeft: number;
  isPlaying: boolean;
  isGameOver: boolean;
  currentX: number; // moving platform x
  direction: number; // 1 = right, -1 = left
  canDrop: boolean; // cooldown after drop
}

export default function PlayPage() {
  const { isConnected } = useAccount();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    glasses: [],
    activeGlass: null,
    score: 0,
    timeLeft: GAME_DURATION,
    isPlaying: false,
    isGameOver: false,
    currentX: 200,
    direction: 1,
    canDrop: true,
  });
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTime, setDisplayTime] = useState(GAME_DURATION);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const canDropRef = useRef(true);

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 600;
  const PLATFORM_Y = 550;
  const PLATFORM_SPEED = 3;
  const GLASS_DROP_SPEED = 15;

  const resetGame = useCallback(() => {
    const state = gameStateRef.current;
    state.glasses = [];
    state.activeGlass = null;
    state.score = 0;
    state.timeLeft = GAME_DURATION;
    state.isPlaying = false;
    state.isGameOver = false;
    state.currentX = CANVAS_WIDTH / 2;
    state.direction = 1;
    state.canDrop = true;
    canDropRef.current = true;
    setDisplayScore(0);
    setDisplayTime(GAME_DURATION);
    setGameStatus('idle');
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    const state = gameStateRef.current;
    state.isPlaying = true;
    setGameStatus('playing');
    lastTimeRef.current = Date.now();
    gameLoop();
  }, [resetGame]);

  const dropGlass = useCallback(() => {
    if (!canDropRef.current || !gameStateRef.current.isPlaying) return;
    
    const state = gameStateRef.current;
    canDropRef.current = false;
    state.canDrop = false;
    
    // Create glass at current platform position
    state.activeGlass = {
      x: state.currentX,
      y: 50,
      fell: false,
    };
    
    // Reset after short delay
    setTimeout(() => {
      canDropRef.current = true;
      state.canDrop = true;
    }, 300);
  }, []);

  const gameLoop = useCallback(() => {
    const state = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update time
    const now = Date.now();
    if (now - lastTimeRef.current >= 1000) {
      state.timeLeft--;
      setDisplayTime(state.timeLeft);
      lastTimeRef.current = now;
      
      if (state.timeLeft <= 0) {
        state.isPlaying = false;
        state.isGameOver = true;
        setGameStatus('gameover');
        return;
      }
    }

    // Move platform
    state.currentX += PLATFORM_SPEED * state.direction;
    if (state.currentX >= CANVAS_WIDTH - 40) {
      state.direction = -1;
    } else if (state.currentX <= 40) {
      state.direction = 1;
    }

    // Update active glass falling
    if (state.activeGlass && !state.activeGlass.fell) {
      state.activeGlass.y += GLASS_DROP_SPEED;

      // Check collision with stack or platform
      const stackTop = state.glasses.length > 0 
        ? state.glasses[state.glasses.length - 1].y 
        : PLATFORM_Y - GLASS_HEIGHT;
      
      const targetY = stackTop - GLASS_HEIGHT;
      
      if (state.activeGlass.y >= targetY) {
        state.activeGlass.y = targetY;
        
        // Check if within tolerance
        const baseX = state.glasses.length > 0 
          ? state.glasses[state.glasses.length - 1].x 
          : state.currentX;
        
        const diff = Math.abs(state.activeGlass.x - baseX);
        
        if (diff <= STACK_TOLERANCE) {
          // Success - stack the glass
          state.glasses.push({ ...state.activeGlass });
          state.score++;
          setDisplayScore(state.score);
        } else {
          // Fell - game over
          state.activeGlass.fell = true;
          state.isPlaying = false;
          state.isGameOver = true;
          setGameStatus('gameover');
          return;
        }
        
        state.activeGlass = null;
      }
    }

    // Draw
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw platform
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(state.currentX - 40, PLATFORM_Y, 80, 15);
    
    // Draw guide line
    ctx.strokeStyle = '#52525b';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(state.currentX, PLATFORM_Y - 300);
    ctx.lineTo(state.currentX, PLATFORM_Y - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw stacked glasses
    state.glasses.forEach((glass, i) => {
      drawGlass(ctx, glass.x, glass.y, i === 0);
    });

    // Draw active falling glass
    if (state.activeGlass && !state.activeGlass.fell) {
      drawGlass(ctx, state.activeGlass.x, state.activeGlass.y, false);
    }

    // Draw score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.score}`, CANVAS_WIDTH / 2, 40);

    // Draw timer
    ctx.fillStyle = state.timeLeft <= 10 ? '#ef4444' : '#a1a1aa';
    ctx.font = '18px monospace';
    ctx.fillText(`${state.timeLeft}s`, CANVAS_WIDTH / 2, 65);

    if (state.isPlaying) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, []);

  const drawGlass = (ctx: CanvasRenderingContext2D, x: number, y: number, isBase: boolean) => {
    const w = GLASS_WIDTH;
    const h = GLASS_HEIGHT;
    
    // Glass body (trapezoid-ish shape for beer glass)
    ctx.beginPath();
    ctx.moveTo(x - w/2 + 5, y);
    ctx.lineTo(x + w/2 - 5, y);
    ctx.lineTo(x + w/2, y + h);
    ctx.lineTo(x - w/2, y + h);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(x - w/2, y, x + w/2, y);
    gradient.addColorStop(0, '#fbbf24');
    gradient.addColorStop(0.5, '#f59e0b');
    gradient.addColorStop(1, '#d97706');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Beer foam top
    ctx.beginPath();
    ctx.ellipse(x, y + 5, w/2 - 5, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fef3c7';
    ctx.fill();
    
    // Glass shine
    ctx.beginPath();
    ctx.moveTo(x - w/3, y + 10);
    ctx.lineTo(x - w/3 + 3, y + h - 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleDrop = useCallback(() => {
    dropGlass();
  }, [dropGlass]);

  useEffect(() => {
    if (gameStatus === 'playing') {
      const handleKeyDown = (e: SpacebarEvent) => {
        if (e.code === 'Space') {
          e.preventDefault();
          handleDrop();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [gameStatus, handleDrop]);

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
        <div className="text-center mb-6">
          <div className="mb-2 flex justify-center"><Trophy className="w-14 h-14 text-amber-400" /></div>
          <h1 className="text-3xl font-bold">Beer Stack</h1>
          <p className="text-zinc-400 mt-2">Stack as many glasses as you can in 60 seconds!</p>
        </div>

        {/* Info Cards */}
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

        {/* Game Area */}
        <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
          {!isConnected ? (
            <div className="text-center py-12">
              <p className="text-zinc-400 mb-4">Connect wallet to play</p>
              <ConnectButton />
            </div>
          ) : gameStatus === 'idle' ? (
            <div className="text-center py-12">
              <div className="mb-6">
                <Play className="w-16 h-16 text-green-500 mx-auto" />
              </div>
              <h2 className="text-xl font-bold mb-2">Ready to Stack?</h2>
              <p className="text-zinc-400 mb-6">Click START then press SPACE or click TAP to drop glasses</p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 font-bold rounded-xl transition-colors flex items-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5" /> START GAME
              </button>
              <p className="text-xs text-zinc-500 mt-4">Entry fee: 0.2 HKY will be deducted when you start</p>
            </div>
          ) : gameStatus === 'playing' ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="rounded-xl border border-zinc-600"
                  style={{ cursor: 'pointer' }}
                  onClick={handleDrop}
                />
              </div>
              <p className="text-zinc-400 text-sm">Press SPACE or click canvas to drop glass</p>
              <div className="mt-4 flex justify-center gap-4">
                <div className="bg-zinc-700 px-4 py-2 rounded-lg">
                  <span className="text-zinc-400 text-sm">Score: </span>
                  <span className="font-bold text-2xl">{displayScore}</span>
                </div>
                <div className="bg-zinc-700 px-4 py-2 rounded-lg">
                  <span className="text-zinc-400 text-sm">Time: </span>
                  <span className={`font-bold text-2xl ${displayTime <= 10 ? 'text-red-400' : ''}`}>{displayTime}s</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-6">
                {displayScore >= 10 ? (
                  <Trophy className="w-16 h-16 text-amber-400 mx-auto" />
                ) : (
                  <RotateCcw className="w-16 h-16 text-zinc-500 mx-auto" />
                )}
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {displayScore >= 10 ? 'Great Job!' : 'Game Over!'}
              </h2>
              <p className="text-4xl font-bold text-green-400 mb-2">{displayScore} glasses</p>
              <p className="text-zinc-400 mb-6">
                {displayScore >= 10 
                  ? 'You might be in the leaderboard!' 
                  : 'Try again to get a higher score!'}
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

        {/* Tournament Info */}
        <div className="mt-6 bg-zinc-800 rounded-xl p-4 border border-zinc-700">
          <h3 className="font-bold mb-2">🏆 Weekly Tournament</h3>
          <div className="text-sm text-zinc-400 space-y-1">
            <p>• Tournament runs every week (auto-start Monday 00:00 UTC)</p>
            <p>• Top 5 players share the 2,000 HKY prize pool</p>
            <p>• Your highest score per tournament is counted</p>
            <p>• Winners can claim prizes after tournament ends</p>
          </div>
          <div className="mt-3 flex gap-2">
            <Link href="/leaderboard" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
              View Leaderboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}