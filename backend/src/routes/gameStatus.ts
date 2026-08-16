// GET /game/status - Verifica conectividade real com o cache

import { APIGatewayProxyEvent } from 'aws-lambda';
import { LambdaResponse } from '../types';
import { cacheService } from '../services/cacheService';
import { buildResponse } from '../utils/response';

export async function handleGameStatus(event: APIGatewayProxyEvent): Promise<LambdaResponse> {
  const origin = event.headers?.origin || event.headers?.Origin;

  try {
    const isConnected = await cacheService.ping();
    return buildResponse(200, {
      game: isConnected ? 'online' : 'offline',
      cache: isConnected ? 'connected' : 'disconnected',
    }, origin);
  } catch {
    return buildResponse(200, {
      game: 'offline',
      cache: 'disconnected',
    }, origin);
  }
}
