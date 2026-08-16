import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.spinner} role="status" aria-label="Carregando" />
    </div>
  );
}
