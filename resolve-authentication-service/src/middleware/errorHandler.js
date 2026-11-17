const { AppError, fromCode } = require('../errors/AppError');
const logger = require('../utils/logger');

/**
 * body-parser (express.json) throws plain errors with a `type` field for
 * malformed JSON and oversized bodies. Left alone those fall through to the
 * generic branch below and surface as a misleading 500 - a client mistake
 * must be a 4xx.
 */
// ioredis surfaces an unreachable Redis as MaxRetriesPerRequestError (after
// exhausting its retries) or a raw connection error. Redis holds ALL of this
// service's state (sessions, revocations, rate limits), so this is a
// dependency outage - 503, distinguishable from a genuine bug (500) by
// monitoring and by clients deciding whether to retry.
function isRedisUnavailable(err) {
  return (
    err.name === 'MaxRetriesPerRequestError' ||
    err.code === 'ECONNREFUSED' ||
    /Connection is closed|Stream isn't writeable/.test(err.message || '')
  );
}

function normalizeError(err) {
  if (err instanceof AppError) return err;
  if (isRedisUnavailable(err)) {
    return fromCode('DEPENDENCY_UNAVAILABLE', 'A required backing store is temporarily unavailable.');
  }
  if (err.type === 'entity.parse.failed') {
    return fromCode('AUTH_VALIDATION_ERROR', 'Request body is not valid JSON.');
  }
  if (err.type === 'entity.too.large') {
    return fromCode('PAYLOAD_TOO_LARGE', 'Request body is too large.');
  }
  return err;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(rawErr, req, res, next) {
  const err = normalizeError(rawErr);
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';
  const message = isAppError ? err.message : 'An unexpected error occurred.';

  if (statusCode >= 500) {
    logger.error({ err, requestId: req.requestId }, 'Unhandled error');
  } else {
    logger.warn({ code, requestId: req.requestId }, message);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(isAppError && err.details ? { details: err.details } : {}),
      requestId: req.requestId,
      traceId: req.traceId,
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route for ${req.method} ${req.originalUrl}`,
      requestId: req.requestId,
      traceId: req.traceId,
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
