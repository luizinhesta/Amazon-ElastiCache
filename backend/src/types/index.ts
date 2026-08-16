// Shared types for the backend Lambda function

export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface HealthResponse {
  status: string;
  message: string;
}

export interface MeResponse {
  autenticado: boolean;
  usuarioId: string;
  email: string;
  nome: string;
  apelido: string;
}

// Game types

export interface GameSession {
  status: 'playing' | 'finished';
  score: number;
  startedAt: string;
}

export interface GameStartResponse {
  sessionId: string;
  status: string;
  expiresIn: number;
}

export interface GameScoreRequest {
  score: number;
}

export interface GameScoreResponse {
  recorded: boolean;
  newBest: boolean;
  bestScore: number;
  rankPosition: number;
}

export interface RankingEntry {
  position: number;
  username: string;
  score: number;
}

export interface PlayerInfo {
  username: string;
  bestScore: number;
  session: { status: string } | null;
}

export interface GameStatusResponse {
  game: 'online' | 'offline';
  cache: 'connected' | 'disconnected';
}

export interface ErrorResponse {
  message: string;
}
