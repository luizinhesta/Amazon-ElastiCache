// Secure logger - masks sensitive data in log output

const SENSITIVE_KEYS = ['token', 'password', 'secret', 'authorization'];

/**
 * Masks sensitive data showing at most the last 4 characters.
 * - If value length <= 4: returns all asterisks (same length)
 * - If value length > 4: replaces first (length - 4) characters with asterisks, shows last 4 as-is
 */
export function maskSensitiveData(value: string): string {
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }
  const visiblePart = value.slice(-4);
  const maskedPart = '*'.repeat(value.length - 4);
  return maskedPart + visiblePart;
}

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));
}

function sanitizeContext(
  context: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string' && isSensitiveKey(key)) {
      sanitized[key] = maskSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Logs a message to console.log with sanitized context.
 * String values in context whose keys contain 'token', 'password', 'secret', or 'authorization'
 * are masked to show at most the last 4 characters.
 */
export function logSafe(
  message: string,
  context?: Record<string, unknown>
): void {
  if (context) {
    console.log(message, sanitizeContext(context));
  } else {
    console.log(message);
  }
}

/**
 * Logs a message to console.error with sanitized context.
 * Same masking rules as logSafe.
 */
export function logError(
  message: string,
  context?: Record<string, unknown>
): void {
  if (context) {
    console.error(message, sanitizeContext(context));
  } else {
    console.error(message);
  }
}
