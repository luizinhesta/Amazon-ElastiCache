import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  message: string | null;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className={`${styles.container} ${className || ''}`} role="alert">
      <span className={styles.icon}>⚠️</span>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
