// GET /game/ranking - Returns top 10 players ranking

import { APIGatewayProxyEvent } from 'aws-lambda';
import { LambdaResponse } from '../types';
import { cacheService } from '../services/cacheService';
import { buildResponse, buildErrorResponse } from '../utils/response';

export async function handleGameRanking(event: APIGatewayProxyEvent): Promise<LambdaResponse> {
  const origin = event.headers?.origin || event.headers?.Origin;

  try {
    const ranking = await cacheService.getTopRanking(10);
    return buildResponse(200, ranking, origin);
  } catch {
    return buildErrorResponse(503, 'Serviço do jogo temporariamente indisponível.', origin);
  }
}
