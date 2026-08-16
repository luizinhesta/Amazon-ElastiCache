import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './HomePage.module.css';

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <span className={styles.dinoIcon} role="img" aria-label="Dinossauro">
          🦕
        </span>

        <h1 className={styles.title}>Dino Login</h1>

        <p className={styles.subtitle}>
          Bem-vindo ao mundo dos dinossauros! Faça login ou crie sua conta para
          acessar a área exclusiva.
        </p>

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => navigate('/login')}
            type="button"
          >
            Entrar
          </button>

          <button
            className={styles.btnSecondary}
            onClick={() => navigate('/register')}
            type="button"
          >
            Criar conta
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Projeto 1 — Login customizado com Amazon Cognito</p>
        <p className={styles.footerDinos}>🦖🌿🦕</p>
      </footer>
    </div>
  );
}
