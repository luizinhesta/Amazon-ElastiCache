import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PasswordInput } from '../../components/PasswordInput';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateConfirmationCode,
} from '../../utils/validators';
import { mapCognitoError } from '../../utils/errorMapper';
import styles from './ForgotPasswordPage.module.css';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, resetPassword } = useAuth();

  // Step management: 1 = request code, 2 = reset password
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [email, setEmail] = useState('');

  // Step 2 fields
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Shared state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setFieldErrors({ email: emailValidation.errorMessage });
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email);
      setStep(2);
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      // Per Req 5.10: UserNotFoundException shows generic message
      // without revealing if email exists
      if (errorCode === 'UserNotFoundException') {
        setError('Se este email estiver cadastrado, você receberá um código de recuperação.');
      } else {
        setError(mapCognitoError(errorCode));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string | null> = {};

    // Validate code
    const codeValidation = validateConfirmationCode(code);
    if (!codeValidation.isValid) {
      errors.code = codeValidation.errorMessage;
    }

    // Validate password complexity
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      errors.newPassword = passwordValidation.errorMessage;
    }

    // Validate password match
    const matchValidation = validatePasswordMatch(newPassword, confirmPassword);
    if (!matchValidation.isValid) {
      errors.confirmPassword = matchValidation.errorMessage;
    }

    if (Object.values(errors).some((e) => e !== null)) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email, code, newPassword);
      navigate('/login', {
        state: { successMessage: 'Senha redefinida com sucesso! Faça login com sua nova senha.' },
      });
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      setError(mapCognitoError(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <span className={styles.icon} role="img" aria-label="Cadeado">
          🔒
        </span>
        <h1 className={styles.title}>Recuperar senha</h1>

        {step === 1 && (
          <>
            <p className={styles.description}>
              Informe seu email para receber um código de recuperação.
            </p>

            <form onSubmit={handleRequestCode} className={styles.form} noValidate>
              <div className={styles.field}>
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
                  className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <span className={styles.fieldError}>{fieldErrors.email}</span>
                )}
              </div>

              <ErrorMessage message={error} />

              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={isLoading}
              >
                {isLoading ? <LoadingSpinner /> : 'Enviar código'}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <p className={styles.description}>
              Insira o código enviado para <strong>{email}</strong> e defina sua nova senha.
            </p>

            <form onSubmit={handleResetPassword} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="code" className={styles.label}>
                  Código de verificação
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                  className={`${styles.input} ${fieldErrors.code ? styles.inputError : ''}`}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
                {fieldErrors.code && (
                  <span className={styles.fieldError}>{fieldErrors.code}</span>
                )}
              </div>

              <PasswordInput
                id="newPassword"
                label="Nova senha"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Digite sua nova senha"
                error={fieldErrors.newPassword}
                disabled={isLoading}
              />

              <PasswordInput
                id="confirmPassword"
                label="Confirmar nova senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirme sua nova senha"
                error={fieldErrors.confirmPassword}
                disabled={isLoading}
              />

              <ErrorMessage message={error} />

              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={isLoading}
              >
                {isLoading ? <LoadingSpinner /> : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}

        <Link to="/login" className={styles.link}>
          Voltar para login
        </Link>
      </div>
    </div>
  );
}
