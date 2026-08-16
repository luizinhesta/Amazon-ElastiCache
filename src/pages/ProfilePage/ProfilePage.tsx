import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PasswordInput } from '../../components/PasswordInput';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  validateName,
  validatePreferredUsername,
  validatePassword,
  validatePasswordMatch,
} from '../../utils/validators';
import { mapCognitoError } from '../../utils/errorMapper';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, logout } = useAuth();

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(false);

  // Edit username state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Change password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Logout state
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleEditName = () => {
    setIsEditingName(true);
    setNewName(user?.name ?? '');
    setNameError(null);
    setNameSuccess(null);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setNewName('');
    setNameError(null);
  };

  const handleSaveName = async () => {
    setNameError(null);
    setNameSuccess(null);

    const result = validateName(newName);
    if (!result.isValid) {
      setNameError(result.errorMessage);
      return;
    }

    setNameLoading(true);
    try {
      await updateProfile({ name: newName });
      setNameSuccess('Nome atualizado com sucesso.');
      setIsEditingName(false);
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      setNameError(mapCognitoError(errorCode));
    } finally {
      setNameLoading(false);
    }
  };

  const handleEditUsername = () => {
    setIsEditingUsername(true);
    setNewUsername(user?.preferredUsername ?? '');
    setUsernameError(null);
    setUsernameSuccess(null);
  };

  const handleCancelEditUsername = () => {
    setIsEditingUsername(false);
    setNewUsername('');
    setUsernameError(null);
  };

  const handleSaveUsername = async () => {
    setUsernameError(null);
    setUsernameSuccess(null);

    const result = validatePreferredUsername(newUsername);
    if (!result.isValid) {
      setUsernameError(result.errorMessage);
      return;
    }

    setUsernameLoading(true);
    try {
      await updateProfile({ preferredUsername: newUsername });
      setUsernameSuccess('Apelido atualizado com sucesso.');
      setIsEditingUsername(false);
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      setUsernameError(mapCognitoError(errorCode));
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleToggleChangePassword = () => {
    setIsChangingPassword(!isChangingPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const handleSavePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.isValid) {
      setPasswordError(passwordResult.errorMessage);
      return;
    }

    const matchResult = validatePasswordMatch(newPassword, confirmNewPassword);
    if (!matchResult.isValid) {
      setPasswordError(matchResult.errorMessage);
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Senha alterada com sucesso.');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      const errorCode = (err as { name?: string }).name ?? 'UnknownError';
      if (errorCode === 'NotAuthorizedException') {
        setPasswordError('A senha atual está incorreta.');
      } else {
        setPasswordError(mapCognitoError(errorCode));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutError(null);
    setLogoutLoading(true);
    try {
      await logout();
      navigate('/');
    } catch {
      setLogoutError('Erro ao encerrar sessão. Tente novamente.');
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Meu Perfil</h1>

        <ErrorMessage message={logoutError} />

        {/* User Attributes Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Informações pessoais</h2>

          {/* Name */}
          <div className={styles.attributeRow}>
            <div className={styles.attributeInfo}>
              <span className={styles.attributeLabel}>Nome</span>
              <span className={styles.attributeValue}>{user?.name}</span>
            </div>
            {!isEditingName && (
              <button
                type="button"
                className={styles.editButton}
                onClick={handleEditName}
                aria-label="Editar nome"
              >
                ✏️ Editar
              </button>
            )}
          </div>

          {isEditingName && (
            <div className={styles.editSection}>
              <div className={styles.fieldGroup}>
                <label htmlFor="editName" className={styles.label}>
                  Novo nome
                </label>
                <input
                  id="editName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={128}
                  placeholder="Seu novo nome"
                  disabled={nameLoading}
                  className={`${styles.input} ${nameError ? styles.inputError : ''}`}
                />
                {nameError && <span className={styles.fieldError}>{nameError}</span>}
              </div>
              <div className={styles.editActions}>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={handleSaveName}
                  disabled={nameLoading}
                >
                  {nameLoading ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancelEditName}
                  disabled={nameLoading}
                >
                  Cancelar
                </button>
              </div>
              {nameLoading && (
                <div className={styles.loadingWrapper}>
                  <LoadingSpinner />
                </div>
              )}
            </div>
          )}
          {nameSuccess && <p className={styles.successMessage}>{nameSuccess}</p>}

          {/* Username */}
          <div className={styles.attributeRow}>
            <div className={styles.attributeInfo}>
              <span className={styles.attributeLabel}>Apelido</span>
              <span className={styles.attributeValue}>{user?.preferredUsername}</span>
            </div>
            {!isEditingUsername && (
              <button
                type="button"
                className={styles.editButton}
                onClick={handleEditUsername}
                aria-label="Editar apelido"
              >
                ✏️ Editar
              </button>
            )}
          </div>

          {isEditingUsername && (
            <div className={styles.editSection}>
              <div className={styles.fieldGroup}>
                <label htmlFor="editUsername" className={styles.label}>
                  Novo apelido
                </label>
                <input
                  id="editUsername"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  maxLength={64}
                  placeholder="Seu novo apelido"
                  disabled={usernameLoading}
                  className={`${styles.input} ${usernameError ? styles.inputError : ''}`}
                />
                {usernameError && <span className={styles.fieldError}>{usernameError}</span>}
              </div>
              <div className={styles.editActions}>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={handleSaveUsername}
                  disabled={usernameLoading}
                >
                  {usernameLoading ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancelEditUsername}
                  disabled={usernameLoading}
                >
                  Cancelar
                </button>
              </div>
              {usernameLoading && (
                <div className={styles.loadingWrapper}>
                  <LoadingSpinner />
                </div>
              )}
            </div>
          )}
          {usernameSuccess && <p className={styles.successMessage}>{usernameSuccess}</p>}

          {/* Email (read-only) */}
          <div className={styles.attributeRow}>
            <div className={styles.attributeInfo}>
              <span className={styles.attributeLabel}>Email</span>
              <span className={styles.attributeValue}>{user?.email}</span>
            </div>
          </div>

          {/* Email verification status */}
          <div className={styles.attributeRow}>
            <div className={styles.attributeInfo}>
              <span className={styles.attributeLabel}>Verificação de email</span>
              <span className={styles.attributeValue}>
                {user?.emailVerified ? (
                  <span className={styles.verifiedBadge}>✅ Verificado</span>
                ) : (
                  <span className={styles.unverifiedBadge}>⚠️ Não verificado</span>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Change Password Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Segurança</h2>

          <button
            type="button"
            className={styles.changePasswordToggle}
            onClick={handleToggleChangePassword}
          >
            {isChangingPassword ? 'Cancelar alteração de senha' : '🔒 Alterar senha'}
          </button>

          {isChangingPassword && (
            <div className={styles.editSection}>
              <PasswordInput
                id="currentPassword"
                label="Senha atual"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Digite sua senha atual"
                disabled={passwordLoading}
              />

              <PasswordInput
                id="newPassword"
                label="Nova senha"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Mínimo 8 caracteres"
                disabled={passwordLoading}
              />

              <PasswordInput
                id="confirmNewPassword"
                label="Confirmar nova senha"
                value={confirmNewPassword}
                onChange={setConfirmNewPassword}
                placeholder="Repita a nova senha"
                disabled={passwordLoading}
              />

              {passwordError && <ErrorMessage message={passwordError} />}

              <div className={styles.editActions}>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={handleSavePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Alterando...' : 'Alterar senha'}
                </button>
              </div>

              {passwordLoading && (
                <div className={styles.loadingWrapper}>
                  <LoadingSpinner />
                </div>
              )}
            </div>
          )}
          {passwordSuccess && <p className={styles.successMessage}>{passwordSuccess}</p>}
        </section>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/dashboard')}
          >
            ← Voltar
          </button>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </div>
    </div>
  );
}
