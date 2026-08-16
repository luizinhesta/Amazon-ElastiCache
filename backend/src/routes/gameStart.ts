// POST /game/start - Creates a new game session in cache

import { APIGatewayProxyEvent } from 'aws-lambda';
import { LambdaResponse } from '../types';
import { cacheService } from '../services/cacheService';
import { buildResponse, buildErrorResponse } from '../utils/response';

declare const process: { env: Record<string, string | undefined> };

const GAME_SESSION_TTL = parseInt(process.env.GAME_SESSION_TTL || '1800', 10);

export async function handleGameStart(event: APIGatewayProxyEvent): Promise<LambdaResponse> {
  const origin = event.headers?.origin || event.headers?.Origin;
  const sub = event.requestContext?.authorizer?.claims?.sub;
  const username = event.requestContext?.authorizer?.claims?.preferred_username ||
                   event.requestContext?.authorizer?.claims?.name || 'Jogador';

  if (!sub) {
    return buildErrorResponse(401, 'Não autorizado', origin);
  }

  try {
    const session = await cacheService.createGameSession(sub);
    await cacheService.setPlayerUsername(sub, username);
    return buildResponse(200, {
      sessionId: sub,
      status: session.status,
      expiresIn: GAME_SESSION_TTL,
    }, origin);
  } catch {
    return buildErrorResponse(503, 'Serviço do jogo temporariamente indisponível.', origin);
  }
}
