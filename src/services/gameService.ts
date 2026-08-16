import { apiService } from './apiService';
import { StartGameResponse, SubmitScoreResponse, RankingEntry, PlayerInfo, GameStatusResponse } from '../types';

export const gameService = {
  startGame: () => apiService.post<StartGameResponse>('/game/start', {}),
  submitScore: (score: number) => apiService.post<SubmitScoreResponse>('/game/score', { score }),
  getRanking: () => apiService.get<RankingEntry[]>('/game/ranking'),
  getPlayerInfo: () => apiService.get<PlayerInfo>('/game/me'),
  getStatus: () => apiService.get<GameStatusResponse>('/game/status'),
};
