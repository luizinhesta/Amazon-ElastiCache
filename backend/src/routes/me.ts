// GET /me - Returns authenticated user data from Cognito claims

import { APIGatewayProxyEvent } from 'aws-lambda';
import { LambdaResponse } from '../types';
import { buildResponse, buildErrorResponse } from '../utils/response';

export function handleMe(event: APIGatewayProxyEvent): LambdaResponse {
  const origin = event.headers?.origin || event.headers?.Origin;
  const claims = event.requestContext?.authorizer?.claims;

  if (!claims || !claims.sub) {
    return buildErrorResponse(401, 'Não foi possível identificar o usuário', origin);
  }

  return buildResponse(200, {
    autenticado: true,
    usuarioId: claims.sub,
    email: claims.email || '',
    nome: claims.name || '',
    apelido: claims.preferred_username || '',
  }, origin);
}
