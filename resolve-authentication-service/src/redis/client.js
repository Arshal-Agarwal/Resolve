const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

let client = null;

/**
 * Returns the shared ioredis client, creating it on first call.
 * Not auto-connecting at require-time keeps this file safe to import in
 * tests without opening a real socket (tests call jest.mock('ioredis', ...)
 * to swap in ioredis-mock instead).
 */
function getRedisClient() {
  if (client) return client;

  client = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

  client.on('connect', () => logger.info('Redis: connected'));
  client.on('error', (err) => logger.error({ err }, 'Redis: connection error'));
  client.on('close', () => logger.warn('Redis: connection closed'));

  return client;
}

/**
 * Used by the readiness probe (GET /health/ready). Never throws — returns
 * a boolean so the route can report status without crashing the request.
 */
async function pingRedis() {
  try {
    const result = await getRedisClient().ping();
    return result === 'PONG';
  } catch (err) {
    logger.warn({ err }, 'Redis: ping failed');
    return false;
  }
}

async function closeRedisClient() {
  if (client) {
    await client.quit();
    client = null;
  }
}

module.exports = { getRedisClient, pingRedis, closeRedisClient };
