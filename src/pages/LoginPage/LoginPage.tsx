import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PasswordInput } from '../../components/PasswordInput';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { validateEmail } from '../../utils/validators';
import { mapCognitoError } from '../../utils/errorMapper';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setEmailError(null);

    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      setEmailError(emailResult.errorMessage);
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.status === 'confirmSignUp') {
        navigate('/confirm-email', { state: { email } });
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      if (errorCode === 'UserNotConfirmedException') {
        navigate('/confirm-email', { state: { email } });
      } else {
        setGeneralError(mapCognitoError(errorCode));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Entrar</h1>

        {successMessage && (
          <div className={styles.successMessage} role="status">
            {successMessage}
          </div>
        )}

        <ErrorMessage message={generalError} />

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fieldGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={isLoading}
              className={`${styles.input} ${emailError ? styles.inputError : ''}`}
              autoComplete="email"
            />
            {emailError && <span className={styles.fieldError}>{emailError}</span>}
          </div>

          <PasswordInput
            id="password"
            label="Senha"
            value={password}
            onChange={setPassword}
            placeholder="Sua senha"
            disabled={isLoading}
          />

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>

          {isLoading && (
            <div className={styles.loadingWrapper}>
              <LoadingSpinner />
            </div>
          )}
        </form>

        <div className={styles.footer}>
          <Link to="/forgot-password" className={styles.link}>
            Esqueci minha senha
          </Link>
          <span className={styles.separator}>•</span>
          <Link to="/register" className={styles.link}>
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}
