/**
 * Every thrown error in this service should be (or be wrapped into) an
 * AppError, so the error middleware can always produce the contract shape:
 *   { error: { code, message, details, requestId, traceId } }
 * (Contracts/Authentication_Service.md §2 "Error shape")
 */
class AppError extends Error {
  constructor(code, message, statusCode, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Error code catalog — Contracts/Authentication_Service.md §12.
// Phase 0 defines the shape; each code is wired up to real logic in later phases.
const ErrorCodes = Object.freeze({
  AUTH_INVALID_CREDENTIALS: { status: 401 },
  AUTH_ACCOUNT_DISABLED: { status: 403 },
  AUTH_INVALID_TOKEN: { status: 401 },
  AUTH_FORBIDDEN: { status: 403 },
  AUTH_INVALID_REFRESH_TOKEN: { status: 401 },
  AUTH_RESET_TOKEN_INVALID: { status: 400 },
  AUTH_MFA_INVALID_CODE: { status: 401 },
  AUTH_MFA_ALREADY_ENABLED: { status: 409 },
  AUTH_MFA_CHALLENGE_EXPIRED: { status: 401 },
  AUTH_RATE_LIMITED: { status: 429 },
  AUTH_VALIDATION_ERROR: { status: 400 },
  PAYLOAD_TOO_LARGE: { status: 413 },
  NOT_FOUND: { status: 404 },
  INTERNAL_ERROR: { status: 500 },
  DEPENDENCY_UNAVAILABLE: { status: 503 },
});

function fromCode(code, message, details) {
  const entry = ErrorCodes[code] || ErrorCodes.INTERNAL_ERROR;
  return new AppError(code, message, entry.status, details);
}

module.exports = { AppError, ErrorCodes, fromCode };
