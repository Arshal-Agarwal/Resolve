const { randomUUID } = require('crypto');

/**
 * Every response error body includes requestId + traceId
 * (Contracts/Authentication_Service.md §2). traceId is accepted from an
 * inbound `traceparent`/`x-trace-id` header if present (so a call chain
 * across services stays correlated, per NFR-OBS-01), otherwise generated.
 */
function requestContext(req, res, next) {
  req.requestId = `req_${randomUUID().slice(0, 8)}`;
  req.traceId = req.headers['x-trace-id'] || req.requestId;
  res.setHeader('x-request-id', req.requestId);
  next();
}

module.exports = requestContext;
