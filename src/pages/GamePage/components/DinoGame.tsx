import { useRef, useEffect, useCallback, useState } from 'react';
import styles from './DinoGame.module.css';

// ============================================
// Game Constants
// ============================================

export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 200,
  GROUND_Y: 160,
  GRAVITY: 0.6,
  JUMP_FORCE: -12,
  BASE_SPEED: 5,
  MAX_SPEED: 12,
  SPEED_INCREMENT: 0.001,
  MIN_OBSTACLE_GAP: 60,
  DINO_WIDTH: 40,
  DINO_HEIGHT: 44,
  OBSTACLE_WIDTH: 20,
  OBSTACLE_HEIGHT: 40,
};

// ============================================
// Interfaces
// ============================================

export interface Dino {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isJumping: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  dino: Dino;
  obstacles: Obstacle[];
  score: number;
  speed: number;
  isGameOver: boolean;
  frameCount: number;
  lastSpawnFrame: number;
}

interface DinoGameProps {
  onGameStart: () => void;
  onGameOver: (score: number) => void;
  isPlaying: boolean;
}

// ============================================
// Pure Functions (exported for testing)
// ============================================

export function applyGravity(dino: Dino, groundY: number): Dino {
  if (!dino.isJumping) return dino;

  const newVelocityY = dino.velocityY + GAME_CONFIG.GRAVITY;
  const newY = dino.y + newVelocityY;

  // Dino reached the ground
  const dinoGroundY = groundY - dino.height;
  if (newY >= dinoGroundY) {
    return {
      ...dino,
      y: dinoGroundY,
      velocityY: 0,
      isJumping: false,
    };
  }

  return {
    ...dino,
    y: newY,
    velocityY: newVelocityY,
  };
}

export function applyJump(dino: Dino): Dino {
  if (dino.isJumping) return dino;

  return {
    ...dino,
    velocityY: GAME_CONFIG.JUMP_FORCE,
    isJumping: true,
  };
}

export function moveObstacles(obstacles: Obstacle[], speed: number): Obstacle[] {
  return obstacles
    .map((obstacle) => ({
      ...obstacle,
      x: obstacle.x - speed,
    }))
    .filter((obstacle) => obstacle.x + obstacle.width > 0);
}

export function checkCollision(dino: Rect, obstacle: Rect): boolean {
  return (
    dino.x < obstacle.x + obstacle.width &&
    dino.x + dino.width > obstacle.x &&
    dino.y < obstacle.y + obstacle.height &&
    dino.y + dino.height > obstacle.y
  );
}

export function calculateSpeed(frameCount: number, baseSpeed: number): number {
  const speed = baseSpeed + frameCount * GAME_CONFIG.SPEED_INCREMENT;
  return Math.min(speed, GAME_CONFIG.MAX_SPEED);
}

export function calculateScore(frameCount: number): number {
  return Math.floor(frameCount / 10);
}

export function shouldSpawnObstacle(
  frameCount: number,
  lastSpawnFrame: number,
  minGap: number
): boolean {
  if (frameCount - lastSpawnFrame < minGap) return false;
  return Math.random() < 0.02;
}

// ============================================
// Component
// ============================================

export function DinoGame({ onGameStart, onGameOver, isPlaying }: DinoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [finalScore, setFinalScore] = useState(0);

  const createInitialState = useCallback((): GameState => {
    return {
      dino: {
        x: 50,
        y: GAME_CONFIG.GROUND_Y - GAME_CONFIG.DINO_HEIGHT,
        width: GAME_CONFIG.DINO_WIDTH,
        height: GAME_CONFIG.DINO_HEIGHT,
        velocityY: 0,
        isJumping: false,
      },
      obstacles: [],
      score: 0,
      speed: GAME_CONFIG.BASE_SPEED,
      isGameOver: false,
      frameCount: 0,
      lastSpawnFrame: 0,
    };
  }, []);

  const render = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } = GAME_CONFIG;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw ground line
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    // Draw dino (green rectangle - pixel art style)
    ctx.fillStyle = '#4a7c4f';
    ctx.fillRect(state.dino.x, state.dino.y, state.dino.width, state.dino.height);

    // Dino eye
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(state.dino.x + 28, state.dino.y + 6, 6, 6);
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(state.dino.x + 30, state.dino.y + 8, 3, 3);

    // Draw obstacles (dark red rectangles - cacti)
    ctx.fillStyle = '#8B2500';
    for (const obstacle of state.obstacles) {
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Cactus detail lines
      ctx.strokeStyle = '#6B1C00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height);
      ctx.stroke();
    }

    // Draw score
    ctx.fillStyle = '#2d2d2d';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Pontos: ${state.score}`, CANVAS_WIDTH - 10, 25);
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;
    if (!state || state.isGameOver) return;

    // Update frame count
    const frameCount = state.frameCount + 1;

    // Apply gravity
    const dino = applyGravity(state.dino, GAME_CONFIG.GROUND_Y);

    // Calculate speed and score
    const speed = calculateSpeed(frameCount, GAME_CONFIG.BASE_SPEED);
    const score = calculateScore(frameCount);

    // Move obstacles
    let obstacles = moveObstacles(state.obstacles, speed);

    // Spawn new obstacle
    let lastSpawnFrame = state.lastSpawnFrame;
    if (shouldSpawnObstacle(frameCount, lastSpawnFrame, GAME_CONFIG.MIN_OBSTACLE_GAP)) {
      const obstacleHeight = GAME_CONFIG.OBSTACLE_HEIGHT + Math.floor(Math.random() * 15);
      obstacles = [
        ...obstacles,
        {
          x: GAME_CONFIG.CANVAS_WIDTH,
          y: GAME_CONFIG.GROUND_Y - obstacleHeight,
          width: GAME_CONFIG.OBSTACLE_WIDTH,
          height: obstacleHeight,
        },
      ];
      lastSpawnFrame = frameCount;
    }

    // Check collisions
    let isGameOver = false;
    for (const obstacle of obstacles) {
      if (checkCollision(dino, obstacle)) {
        isGameOver = true;
        break;
      }
    }

    // Update game state
    const newState: GameState = {
      dino,
      obstacles,
      score,
      speed,
      isGameOver,
      frameCount,
      lastSpawnFrame,
    };
    gameStateRef.current = newState;

    // Render
    render(ctx, newState);

    if (isGameOver) {
      setGameStatus('gameover');
      setFinalScore(score);
      onGameOver(score);
      return;
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [onGameOver, render]);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    gameStateRef.current = createInitialState();
    setGameStatus('playing');
    setFinalScore(0);
    onGameStart();

    // Start game loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [createInitialState, gameLoop, onGameStart]);

  const handleJump = useCallback(() => {
    const state = gameStateRef.current;
    if (!state || state.isGameOver) return;

    if (!state.dino.isJumping) {
      gameStateRef.current = {
        ...state,
        dino: applyJump(state.dino),
      };
    }
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameStatus === 'playing') {
          handleJump();
        } else if (gameStatus === 'idle' || gameStatus === 'gameover') {
          startGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, handleJump, startGame]);

  // Handle touch input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (gameStatus === 'playing') {
        handleJump();
      } else if (gameStatus === 'idle' || gameStatus === 'gameover') {
        startGame();
      }
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    return () => canvas.removeEventListener('touchstart', handleTouch);
  }, [gameStatus, handleJump, startGame]);

  // Sync with external isPlaying prop
  useEffect(() => {
    if (isPlaying && gameStatus === 'idle') {
      startGame();
    }
  }, [isPlaying, gameStatus, startGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Draw initial state when idle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameStatus === 'idle') {
      const initialState = createInitialState();
      render(ctx, initialState);
    }
  }, [gameStatus, createInitialState, render]);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.CANVAS_WIDTH}
        height={GAME_CONFIG.CANVAS_HEIGHT}
        className={styles.canvas}
        role="img"
        aria-label="Dino Game - Pressione Espaço para pular"
      />

      {gameStatus === 'idle' && (
        <div className={styles.overlay}>
          <button
            type="button"
            className={styles.startButton}
            onClick={startGame}
          >
            Iniciar Jogo
          </button>
          <p className={styles.instructions}>
            Pressione Espaço ou toque na tela para pular
          </p>
        </div>
      )}

      {gameStatus === 'gameover' && (
        <div className={styles.overlay}>
          <h2 className={styles.overlayTitle}>Game Over</h2>
          <p className={styles.overlayScore}>Pontuação: {finalScore}</p>
          <button
            type="button"
            className={styles.restartButton}
            onClick={startGame}
          >
            Jogar novamente
          </button>
          <p className={styles.instructions}>
            Pressione Espaço para jogar novamente
          </p>
        </div>
      )}
    </div>
  );
}
