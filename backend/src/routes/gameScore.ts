// POST /game/score - Records final score and updates ranking

import { APIGatewayProxyEvent } from 'aws-lambda';
import { LambdaResponse } from '../types';
import { cacheService } from '../services/cacheService';
import { buildResponse, buildErrorResponse } from '../utils/response';

export async function handleGameScore(event: APIGatewayProxyEvent): Promise<LambdaResponse> {
  const origin = event.headers?.origin || event.headers?.Origin;
  const sub = event.requestContext?.authorizer?.claims?.sub;

  if (!sub) {
    return buildErrorResponse(401, 'Não autorizado', origin);
  }

  // Validate body
  let body: { score?: unknown };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return buildErrorResponse(400, 'Pontuação inválida', origin);
  }

  const score = body.score;

  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score >= 1_000_000) {
    return buildErrorResponse(400, 'Pontuação inválida', origin);
  }

  try {
    // Check active session
    const session = await cacheService.getGameSession(sub);
    if (!session || session.status !== 'playing') {
      return buildErrorResponse(409, 'Nenhuma sessão de jogo ativa', origin);
    }

    // Update ranking (ZADD GT - only updates if score is higher)
    const result = await cacheService.updateRanking(sub, score);

    // End session
    await cacheService.endGameSession(sub, score);

    return buildResponse(200, {
      recorded: true,
      newBest: result.newBest,
      bestScore: result.bestScore,
      rankPosition: result.rankPosition,
    }, origin);
  } catch {
    return buildErrorResponse(503, 'Serviço do jogo temporariamente indisponível.', origin);
  }
}
