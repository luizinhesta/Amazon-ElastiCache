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
  validateName,
  validatePreferredUsername,
} from '../../utils/validators';
import { mapCognitoError } from '../../utils/errorMapper';
import styles from './RegisterPage.module.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [preferredUsername, setPreferredUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateFields = (): boolean => {
    let isValid = true;

    const nameResult = validateName(name);
    if (!nameResult.isValid) {
      setNameError(nameResult.errorMessage);
      isValid = false;
    } else {
      setNameError(null);
    }

    const usernameResult = validatePreferredUsername(preferredUsername);
    if (!usernameResult.isValid) {
      setUsernameError(usernameResult.errorMessage);
      isValid = false;
    } else {
      setUsernameError(null);
    }

    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      setEmailError(emailResult.errorMessage);
      isValid = false;
    } else {
      setEmailError(null);
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.isValid) {
      setPasswordError(passwordResult.errorMessage);
      isValid = false;
    } else {
      setPasswordError(null);
    }

    const matchResult = validatePasswordMatch(password, confirmPassword);
    if (!matchResult.isValid) {
      setConfirmPasswordError(matchResult.errorMessage);
      isValid = false;
    } else {
      setConfirmPasswordError(null);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateFields()) {
      return;
    }

    setIsLoading(true);

    try {
      await register({ email, password, name, preferredUsername });
      navigate('/confirm-email', { state: { email } });
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      setGeneralError(mapCognitoError(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Criar Conta</h1>

        <ErrorMessage message={generalError} />

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fieldGroup}>
            <label htmlFor="name" className={styles.label}>
              Nome completo
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
              placeholder="Seu nome completo"
              disabled={isLoading}
              className={`${styles.input} ${nameError ? styles.inputError : ''}`}
              autoComplete="name"
            />
            {nameError && <span className={styles.fieldError}>{nameError}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="preferredUsername" className={styles.label}>
              Apelido
            </label>
            <input
              id="preferredUsername"
              type="text"
              value={preferredUsername}
              onChange={(e) => setPreferredUsername(e.target.value)}
              maxLength={64}
              placeholder="Como deseja ser chamado"
              disabled={isLoading}
              className={`${styles.input} ${usernameError ? styles.inputError : ''}`}
              autoComplete="username"
            />
            {usernameError && <span className={styles.fieldError}>{usernameError}</span>}
          </div>

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
            placeholder="Mínimo 8 caracteres"
            error={passwordError}
            disabled={isLoading}
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirmar senha"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repita a senha"
            error={confirmPasswordError}
            disabled={isLoading}
          />

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Criando conta...' : 'Criar conta'}
          </button>

          {isLoading && (
            <div className={styles.loadingWrapper}>
              <LoadingSpinner />
            </div>
          )}
        </form>

        <div className={styles.footer}>
          <Link to="/" className={styles.link}>
            Página inicial
          </Link>
          <span className={styles.separator}>•</span>
          <Link to="/login" className={styles.link}>
            Já tenho conta
          </Link>
        </div>
      </div>
    </div>
  );
}
