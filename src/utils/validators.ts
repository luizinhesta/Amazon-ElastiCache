import { ValidationResult } from '../types';

/**
 * Valida formato de email.
 * Verifica: exatamente um @, partes local e domínio não vazias, domínio com pelo menos um ponto.
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Informe um email válido (ex: usuario@dominio.com)',
    };
  }

  const atIndex = email.indexOf('@');
  const lastAtIndex = email.lastIndexOf('@');

  // Deve conter exatamente um @
  if (atIndex === -1 || atIndex !== lastAtIndex) {
    return {
      isValid: false,
      errorMessage: 'Informe um email válido (ex: usuario@dominio.com)',
    };
  }

  const localPart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex + 1);

  // Partes local e domínio não podem ser vazias
  if (localPart.length === 0 || domainPart.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Informe um email válido (ex: usuario@dominio.com)',
    };
  }

  // Domínio deve conter pelo menos um ponto
  if (!domainPart.includes('.')) {
    return {
      isValid: false,
      errorMessage: 'Informe um email válido (ex: usuario@dominio.com)',
    };
  }

  return { isValid: true, errorMessage: null };
}

/**
 * Valida complexidade de senha.
 * Requisitos: mínimo 8 caracteres, pelo menos 1 maiúscula, 1 minúscula, 1 número, 1 caractere especial.
 * Se múltiplas regras falham, descreve TODOS os requisitos não atendidos.
 */
export function validatePassword(password: string): ValidationResult {
  const failures: string[] = [];

  if (password.length < 8) {
    failures.push('pelo menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    failures.push('uma letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    failures.push('uma letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    failures.push('um número');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    failures.push('um caractere especial');
  }

  if (failures.length > 0) {
    return {
      isValid: false,
      errorMessage: `A senha deve conter ${failures.join(', ')}`,
    };
  }

  return { isValid: true, errorMessage: null };
}

/**
 * Valida se as senhas coincidem (comparação exata).
 */
export function validatePasswordMatch(
  password: string,
  confirmation: string
): ValidationResult {
  if (password !== confirmation) {
    return {
      isValid: false,
      errorMessage: 'As senhas não conferem',
    };
  }

  return { isValid: true, errorMessage: null };
}

/**
 * Valida nome: não vazio (após trim), máximo 128 caracteres.
 */
export function validateName(name: string): ValidationResult {
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'O nome é obrigatório',
    };
  }

  if (name.length > 128) {
    return {
      isValid: false,
      errorMessage: 'O nome deve ter no máximo 128 caracteres',
    };
  }

  return { isValid: true, errorMessage: null };
}

/**
 * Valida apelido (preferred username): não vazio (após trim), máximo 64 caracteres.
 */
export function validatePreferredUsername(username: string): ValidationResult {
  if (!username || username.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'O apelido é obrigatório',
    };
  }

  if (username.length > 64) {
    return {
      isValid: false,
      errorMessage: 'O apelido deve ter no máximo 64 caracteres',
    };
  }

  return { isValid: true, errorMessage: null };
}

/**
 * Valida código de confirmação: exatamente 6 dígitos numéricos.
 */
export function validateConfirmationCode(code: string): ValidationResult {
  if (!/^\d{6}$/.test(code)) {
    return {
      isValid: false,
      errorMessage: 'O código deve conter 6 dígitos numéricos',
    };
  }

  return { isValid: true, errorMessage: null };
}
