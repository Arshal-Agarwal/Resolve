const { Router } = require('express');
const { pingRedis } = require('../redis/client');

const router = Router();

// Liveness — process is up, no dependency checks.
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

// Readiness — checks the one dependency this service directly owns (Redis).
router.get('/health/ready', async (req, res) => {
  const redisOk = await pingRedis();
  const status = redisOk ? 'ok' : 'degraded';
  res.status(redisOk ? 200 : 503).json({
    status,
    service: 'auth-service',
    checks: { redis: redisOk ? 'ok' : 'unreachable' },
  });
});

module.exports = router;
