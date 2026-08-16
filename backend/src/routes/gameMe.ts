// GET /game/me - Returns player info and current game session

import { APIGatewayProxyEvent } from 'aws-lambda';
import { LambdaResponse } from '../types';
import { cacheService } from '../services/cacheService';
import { buildResponse, buildErrorResponse } from '../utils/response';

export async function handleGameMe(event: APIGatewayProxyEvent): Promise<LambdaResponse> {
  const origin = event.headers?.origin || event.headers?.Origin;
  const sub = event.requestContext?.authorizer?.claims?.sub;

  if (!sub) {
    return buildErrorResponse(401, 'Não autorizado', origin);
  }

  try {
    const playerInfo = await cacheService.getPlayerInfo(sub);
    const session = await cacheService.getGameSession(sub);

    return buildResponse(200, {
      username: playerInfo?.username || 'Jogador',
      bestScore: playerInfo?.bestScore || 0,
      session: session ? { status: session.status } : null,
    }, origin);
  } catch {
    return buildErrorResponse(503, 'Serviço do jogo temporariamente indisponível.', origin);
  }
}
