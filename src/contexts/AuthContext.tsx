import { createContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';

import { AuthState, AuthContextValue, LoginResult, RegisterData, ProfileAttributes, UserProfile } from '../types';
import { authService } from '../services/authService';

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTHENTICATED'; payload: UserProfile }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_USER'; payload: UserProfile };

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_AUTHENTICATED':
      return { isAuthenticated: true, isLoading: false, user: action.payload };
    case 'SET_UNAUTHENTICATED':
      return { isAuthenticated: false, isLoading: false, user: null };
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const refreshUser = useCallback(async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      dispatch({ type: 'SET_USER', payload: user });
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          dispatch({ type: 'SET_AUTHENTICATED', payload: user });
        } else {
          dispatch({ type: 'SET_UNAUTHENTICATED' });
        }
      } catch {
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    }

    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const result = await authService.signIn(email, password);

    if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
      return { status: 'confirmSignUp', email };
    }

    // Buscar dados do usuário e definir como autenticado ANTES de retornar
    const user = await authService.getCurrentUser();
    if (user) {
      dispatch({ type: 'SET_AUTHENTICATED', payload: user });
    }

    return { status: 'success' };
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    await authService.signUp(data);
  }, []);

  const confirmEmail = useCallback(async (email: string, code: string): Promise<void> => {
    await authService.confirmSignUp(email, code);
  }, []);

  const resendConfirmationCode = useCallback(async (email: string): Promise<void> => {
    await authService.resendSignUpCode(email);
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    await authService.resetPassword(email);
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string): Promise<void> => {
    await authService.confirmResetPassword(email, code, newPassword);
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<void> => {
    await authService.changePassword(oldPassword, newPassword);
  }, []);

  const updateProfile = useCallback(async (attributes: Partial<ProfileAttributes>): Promise<void> => {
    const mapped: Record<string, string> = {};
    if (attributes.name) {
      mapped['name'] = attributes.name;
    }
    if (attributes.preferredUsername) {
      mapped['preferred_username'] = attributes.preferredUsername;
    }
    await authService.updateUserAttributes(mapped);
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async (): Promise<void> => {
    await authService.signOut();
    dispatch({ type: 'SET_UNAUTHENTICATED' });
  }, []);

  const contextValue = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    register,
    confirmEmail,
    resendConfirmationCode,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    logout,
    refreshUser,
  }), [
    state,
    login,
    register,
    confirmEmail,
    resendConfirmationCode,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    logout,
    refreshUser,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
