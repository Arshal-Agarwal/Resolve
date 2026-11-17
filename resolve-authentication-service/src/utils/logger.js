const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.logLevel,
  // Never let raw tokens/secrets leak into logs — Schemas doc §13 (Security
  // Requirements): refresh tokens, reset tokens, MFA OTPs, private keys must
  // never be logged.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.newPassword',
      'req.body.refreshToken',
      'req.body.resetToken',
      'req.body.code',
      'res.body.accessToken',
      'res.body.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  transport:
    config.env === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});

module.exports = logger;
