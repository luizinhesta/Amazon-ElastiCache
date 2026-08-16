// GET /health - Public health check endpoint

import { APIGatewayProxyEvent } from 'aws-lambda';
import { LambdaResponse } from '../types';
import { buildResponse } from '../utils/response';

export function handleHealth(event: APIGatewayProxyEvent): LambdaResponse {
  const origin = event.headers?.origin || event.headers?.Origin;
  return buildResponse(200, {
    status: 'ok',
    message: 'API funcionando corretamente',
  }, origin);
}
