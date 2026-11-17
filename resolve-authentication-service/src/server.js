const createApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { closeRedisClient } = require('./redis/client');

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(
    `auth-service listening on port ${config.port} (env=${config.env}, mocks=${config.dependencies.useMocks})`,
  );
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    logger.info('HTTP server closed');
    await closeRedisClient();
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
