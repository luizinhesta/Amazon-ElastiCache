import { createClient, RedisClientType } from 'redis';
import { logError, logSafe } from '../utils/logger';

declare const process: { env: Record<string, string | undefined> };

const CACHE_ENDPOINT = process.env.CACHE_ENDPOINT || 'localhost';
const CACHE_PORT = parseInt(process.env.CACHE_PORT || '6379', 10);
const CACHE_TLS = process.env.CACHE_TLS !== 'false'; // default true
const GAME_SESSION_TTL = parseInt(process.env.GAME_SESSION_TTL || '1800', 10); // 30 min

let client: RedisClientType | null = null;

async function getClient(): Promise<RedisClientType> {
  if (client && client.isOpen) {
    return client;
  }

  client = createClient({
    url: `redis${CACHE_TLS ? 's' : ''}://${CACHE_ENDPOINT}:${CACHE_PORT}`,
    socket: {
      tls: CACHE_TLS,
      reconnectStrategy: (retries: number) => {
        if (retries > 3) return new Error('Max reconnect attempts reached');
        return Math.min(retries * 100, 1000);
      },
      connectTimeout: 5000,
    },
  });

  (client as any).on('error', (err: any) => {
    logError('Cache connection error', { error: err.message });
  });

  await client.connect();
  logSafe('Cache connected', { endpoint: CACHE_ENDPOINT, port: String(CACHE_PORT) });
  return client;
}

export const cacheService = {
  async ping(): Promise<boolean> {
    try {
      const redis = await getClient();
      const result = await redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  },

  async createGameSession(sub: string): Promise<{ status: string; score: number; startedAt: string }> {
    const redis = await getClient();
    const key = `game:session:${sub}`;
    const session = {
      status: 'playing',
      score: '0',
      startedAt: new Date().toISOString(),
    };

    await redis.hSet(key, session);
    await redis.expire(key, GAME_SESSION_TTL);

    return { status: 'playing', score: 0, startedAt: session.startedAt };
  },

  async getGameSession(sub: string): Promise<{ status: string; score: number; startedAt: string } | null> {
    const redis = await getClient();
    const key = `game:session:${sub}`;
    const data = await redis.hGetAll(key);

    if (!data || !data.status) return null;

    return {
      status: data.status,
      score: parseInt(data.score || '0', 10),
      startedAt: data.startedAt || '',
    };
  },

  async endGameSession(sub: string, finalScore: number): Promise<void> {
    const redis = await getClient();
    const key = `game:session:${sub}`;
    await redis.hSet(key, { status: 'finished', score: String(finalScore) });
    await redis.expire(key, 60);
  },

  async updateRanking(sub: string, score: number): Promise<{ newBest: boolean; bestScore: number; rankPosition: number }> {
    const redis = await getClient();
    const key = 'ranking:global';

    const previousScore = await redis.zScore(key, sub);

    await redis.zAdd(key, { score, value: sub }, { GT: true });

    const currentScore = await redis.zScore(key, sub) || score;

    const rank = await redis.zRevRank(key, sub);
    const rankPosition = rank !== null ? rank + 1 : -1;

    return {
      newBest: previousScore === null || score > previousScore,
      bestScore: currentScore,
      rankPosition,
    };
  },

  async getTopRanking(limit: number): Promise<Array<{ position: number; username: string; score: number }>> {
    const redis = await getClient();

    const results = await redis.zRangeWithScores('ranking:global', 0, limit - 1, { REV: true });

    const ranking = await Promise.all(
      results.map(async (entry: { value: string; score: number }, index: number) => {
        const playerData = await redis.hGetAll(`player:${entry.value}`);
        return {
          position: index + 1,
          username: playerData?.username || 'Jogador',
          score: entry.score,
        };
      })
    );

    return ranking;
  },

  async getPlayerInfo(sub: string): Promise<{ username: string; bestScore: number } | null> {
    const redis = await getClient();

    const playerData = await redis.hGetAll(`player:${sub}`);
    const bestScore = await redis.zScore('ranking:global', sub);

    return {
      username: playerData?.username || 'Jogador',
      bestScore: bestScore || 0,
    };
  },

  async setPlayerUsername(sub: string, username: string): Promise<void> {
    const redis = await getClient();
    await redis.hSet(`player:${sub}`, { username });
  },
};
