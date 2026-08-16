import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { gameService } from '../../services/gameService';
import { ApiError } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { DinoGame } from './components/DinoGame';
import { Ranking } from './components/Ranking';
import { PlayerInfo, RankingEntry } from '../../types';
import styles from './GamePage.module.css';

type GameStatus = 'idle' | 'playing' | 'gameover';

export function GamePage() {
  const { user } = useAuth();

  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [currentScore, setCurrentScore] = useState(0);
  const [lastBestScore, setLastBestScore] = useState(0);

  const mapErrorMessage = useCallback((err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 503) return 'Serviço indisponível';
      if (err.status === 0) return 'Erro de conexão. Verifique sua internet.';
      if (err.status === -1) return 'Tempo de resposta esgotado.';
    }
    return 'Ocorreu um erro inesperado.';
  }, []);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [playerResponse, rankingResponse] = await Promise.all([
        gameService.getPlayerInfo(),
        gameService.getRanking(),
      ]);

      setPlayerInfo(playerResponse.data);
      setLastBestScore(playerResponse.data.bestScore);
      setRanking(rankingResponse.data);
    } catch (err: unknown) {
      setError(mapErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [mapErrorMessage]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleGameStart = useCallback(async () => {
    setError(null);
    setCurrentScore(0);
    setGameStatus('playing');

    try {
      await gameService.startGame();
    } catch (err: unknown) {
      setError(mapErrorMessage(err));
      setGameStatus('idle');
    }
  }, [mapErrorMessage]);

  const handleGameOver = useCallback(async (score: number) => {
    setCurrentScore(score);
    setGameStatus('gameover');

    try {
      const response = await gameService.submitScore(score);

      if (response.data.newBest) {
        setLastBestScore(response.data.bestScore);
        setPlayerInfo((prev) =>
          prev ? { ...prev, bestScore: response.data.bestScore } : prev
        );
      }

      // Atualizar ranking após submissão
      const rankingResponse = await gameService.getRanking();
      setRanking(rankingResponse.data);
    } catch (err: unknown) {
      setError(mapErrorMessage(err));
    }
  }, [mapErrorMessage]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <span className={styles.dinoIcon} role="img" aria-label="Dinossauro">
            🦖
          </span>
          <div className={styles.headerInfo}>
            <h1 className={styles.title}>Dino Game</h1>
            <p className={styles.playerName}>
              {playerInfo?.username || user?.preferredUsername || 'Jogador'}
            </p>
          </div>
        </header>

        <ErrorMessage message={error} />

        <section className={styles.scoreSection}>
          {gameStatus === 'playing' && (
            <div className={styles.scoreItem}>
              <span className={styles.scoreLabel}>Pontuação atual</span>
              <span className={styles.scoreValue}>{currentScore}</span>
            </div>
          )}
          <div className={styles.scoreItem}>
            <span className={styles.scoreLabel}>Melhor pontuação</span>
            <span className={styles.scoreValue}>{lastBestScore}</span>
          </div>
        </section>

        <section className={styles.gameSection}>
          <DinoGame
            onGameStart={handleGameStart}
            onGameOver={handleGameOver}
            isPlaying={gameStatus === 'playing'}
          />
        </section>

        <section className={styles.rankingSection}>
          <Ranking
            entries={ranking}
            currentPlayerSub={user?.userId}
            isLoading={false}
          />
        </section>
      </div>
    </div>
  );
}
