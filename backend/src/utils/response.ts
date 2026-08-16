// Response helper - builds Lambda Proxy integration responses

import { LambdaResponse } from '../types';
import { getCorsHeaders } from './cors';

export function buildResponse(statusCode: number, body: object, origin?: string): LambdaResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
    },
    body: JSON.stringify(body),
  };
}

export function buildErrorResponse(statusCode: number, message: string, origin?: string): LambdaResponse {
  return buildResponse(statusCode, { message }, origin);
}
