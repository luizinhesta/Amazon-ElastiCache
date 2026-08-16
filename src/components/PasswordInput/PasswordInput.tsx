import { useState } from 'react';
import styles from './PasswordInput.module.css';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.container}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.inputWrapper}>
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={styles.toggleButton}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          disabled={disabled}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
