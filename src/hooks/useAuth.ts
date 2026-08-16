import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { AuthContextValue } from '../types';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
