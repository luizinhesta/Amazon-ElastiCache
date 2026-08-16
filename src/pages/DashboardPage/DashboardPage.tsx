import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { mapCognitoError } from '../../utils/errorMapper';
import styles from './DashboardPage.module.css';


export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setError(null);
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/');
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      setError(mapCognitoError(errorCode));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleJogar = () => {
    navigate('/game');
  };

  const handleRanking = () => {
    navigate('/game');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <span className={styles.dinoIcon} role="img" aria-label="Dinossauro">
            🦖
          </span>
          <h1 className={styles.title}>
            Olá, {user?.preferredUsername || user?.name || 'Explorador'}!
          </h1>
        </header>

        <section className={styles.userInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Nome</span>
            <span className={styles.infoValue}>{user?.name}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Apelido</span>
            <span className={styles.infoValue}>{user?.preferredUsername}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{user?.email}</span>
          </div>
        </section>

        <ErrorMessage message={error} />

        <nav className={styles.actions}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => navigate('/profile')}
            disabled={isLoggingOut}
          >
            Meu perfil
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleJogar}
            disabled={isLoggingOut}
          >
            Jogar
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleRanking}
            disabled={isLoggingOut}
          >
            Ranking
          </button>

          <button
            type="button"
            className={styles.btnDanger}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Saindo...' : 'Sair'}
          </button>
        </nav>

        {isLoggingOut && (
          <div className={styles.loadingWrapper}>
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  );
}
