// CORS utility - validates origins and builds CORS headers

/**
 * Allowed origins list built at module load time:
 * 1. Always includes http://localhost:5173 (Vite dev server)
 * 2. Additional origins from ALLOWED_ORIGINS env var (comma-separated)
 */
const ALLOWED_ORIGINS: string[] = [
  'http://localhost:5173',
  ...(process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
];

/**
 * Checks if the given origin is in the allowed origins list.
 * Returns false for undefined origins.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Returns CORS headers if the request origin is allowed.
 * If the origin is not allowed, returns an empty object.
 */
export function getCorsHeaders(requestOrigin: string | undefined): Record<string, string> {
  if (!isOriginAllowed(requestOrigin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': requestOrigin!,
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}
