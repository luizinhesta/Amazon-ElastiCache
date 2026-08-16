import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { validateConfirmationCode } from '../../utils/validators';
import { mapCognitoError } from '../../utils/errorMapper';
import styles from './ConfirmEmailPage.module.css';

export function ConfirmEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmEmail, resendConfirmationCode } = useAuth();

  const email = (location.state as { email?: string })?.email;

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResending, setIsResending] = useState(false);

  if (!email) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Confirmação de Email</h1>
          <div className={styles.noEmailContainer}>
            <p className={styles.noEmailMessage}>
              Nenhum email encontrado. Volte para a página de registro ou login para continuar.
            </p>
            <a
              className={styles.backLink}
              onClick={() => navigate('/register')}
              role="link"
              tabIndex={0}
            >
              Ir para registro
            </a>
            <a
              className={styles.backLink}
              onClick={() => navigate('/login')}
              role="link"
              tabIndex={0}
            >
              Ir para login
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = isConfirming || isResending;

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    if (codeError) {
      setCodeError(null);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const validation = validateConfirmationCode(code);
    if (!validation.isValid) {
      setCodeError(validation.errorMessage);
      return;
    }

    setCodeError(null);
    setIsConfirming(true);

    try {
      await confirmEmail(email, code);
      navigate('/login', {
        state: { successMessage: 'Email confirmado com sucesso! Faça login para continuar.' },
      });
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      setError(mapCognitoError(errorCode));
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsResending(true);

    try {
      await resendConfirmationCode(email);
      setSuccessMessage('Código reenviado com sucesso');
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      setError(mapCognitoError(errorCode));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Confirmação de Email</h1>
        <p className={styles.subtitle}>
          Insira o código de 6 dígitos enviado para{' '}
          <span className={styles.email}>{email}</span>
        </p>

        <form className={styles.form} onSubmit={handleConfirm}>
          <ErrorMessage message={error} />

          {successMessage && (
            <div className={styles.successMessage} role="status">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="confirmation-code">
              Código de verificação
            </label>
            <input
              id="confirmation-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={styles.input}
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              disabled={isLoading}
              maxLength={6}
              aria-describedby={codeError ? 'code-error' : undefined}
              aria-invalid={!!codeError}
            />
            {codeError && (
              <span id="code-error" className={styles.fieldError}>
                {codeError}
              </span>
            )}
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.confirmButton}
              disabled={isLoading}
            >
              {isConfirming ? <LoadingSpinner /> : 'Confirmar'}
            </button>

            <button
              type="button"
              className={styles.resendButton}
              onClick={handleResendCode}
              disabled={isLoading}
            >
              {isResending ? <LoadingSpinner /> : 'Reenviar código'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
