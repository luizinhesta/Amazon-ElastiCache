/**
 * Mapeamento de erros Cognito e HTTP para mensagens em português brasileiro.
 * 
 * Nota de segurança: NotAuthorizedException e UserNotFoundException retornam
 * a mesma mensagem para não revelar se um email está cadastrado no sistema.
 */

type CognitoErrorCode =
  | 'NotAuthorizedException'
  | 'UserNotFoundException'
  | 'UsernameExistsException'
  | 'CodeMismatchException'
  | 'ExpiredCodeException'
  | 'InvalidPasswordException'
  | 'LimitExceededException'
  | 'UserNotConfirmedException';

const cognitoErrorMessages: Record<CognitoErrorCode, string> = {
  NotAuthorizedException: 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.',
  UserNotFoundException: 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.',
  UsernameExistsException: 'Este email já está cadastrado. Tente fazer login ou recuperar sua senha.',
  CodeMismatchException: 'Código de verificação inválido. Verifique o código e tente novamente.',
  ExpiredCodeException: 'O código de verificação expirou. Solicite um novo código.',
  InvalidPasswordException: 'A senha não atende aos requisitos de segurança.',
  LimitExceededException: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  UserNotConfirmedException: 'Sua conta ainda não foi confirmada. Verifique seu email.',
};

const DEFAULT_ERROR_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';

const apiErrorMessages: Record<number, string> = {
  401: 'Sua sessão expirou. Faça login novamente.',
  403: 'Acesso negado.',
  404: 'Recurso não encontrado.',
  500: 'Serviço temporariamente indisponível.',
  0: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
  [-1]: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
};

/**
 * Mapeia um código de erro do Cognito para uma mensagem em português brasileiro.
 * Códigos desconhecidos retornam uma mensagem genérica.
 */
export function mapCognitoError(errorCode: string): string {
  if (errorCode in cognitoErrorMessages) {
    return cognitoErrorMessages[errorCode as CognitoErrorCode];
  }
  return DEFAULT_ERROR_MESSAGE;
}

/**
 * Mapeia um status HTTP para uma mensagem em português brasileiro.
 * Status desconhecidos retornam uma mensagem genérica.
 * Use status 0 para erros de rede e -1 para timeout.
 */
export function mapApiError(status: number): string {
  if (status in apiErrorMessages) {
    return apiErrorMessages[status];
  }
  return DEFAULT_ERROR_MESSAGE;
}
