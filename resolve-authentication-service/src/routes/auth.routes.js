const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const validateBody = require('../middleware/validateBody');
const authenticate = require('../middleware/authenticate');
const {
  loginSchema,
  refreshSchema,
  logoutSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  updateTokenSettingsSchema,
  mfaVerifySchema,
  mfaConfirmSchema,
  mfaDisableSchema,
} = require('../validation/authSchemas');
const requirePermission = require('../middleware/requirePermission');

const router = Router();

// POST /api/v1/auth/login — Contract §5. No auth required.
router.post('/login', validateBody(loginSchema), controller.login);

// MFA endpoints — TOTP enrollment and login verification.
router.get('/mfa/status', authenticate, controller.getMfaStatus);
router.post('/mfa/enroll', authenticate, controller.beginMfaEnrollment);
router.post('/mfa/enroll/confirm', authenticate, validateBody(mfaConfirmSchema), controller.confirmMfaEnrollment);
router.post('/mfa/verify', validateBody(mfaVerifySchema), controller.verifyMfa);
router.post('/mfa/disable', authenticate, validateBody(mfaDisableSchema), controller.disableMfa);

// POST /api/v1/auth/refresh — Contract §6. No auth required (refresh token is the credential).
router.post('/refresh', validateBody(refreshSchema), controller.refresh);

// POST /api/v1/auth/logout — Contract §7. Requires a valid access token.
router.post('/logout', authenticate, validateBody(logoutSchema), controller.logout);

// POST /api/v1/auth/password-reset/request — Contract §8. No auth required.
router.post(
  '/password-reset/request',
  validateBody(passwordResetRequestSchema),
  controller.requestPasswordReset,
);

// POST /api/v1/auth/password-reset/confirm — Contract §8. No auth required (reset token is the credential).
router.post(
  '/password-reset/confirm',
  validateBody(passwordResetConfirmSchema),
  controller.confirmPasswordReset,
);

// GET/PATCH /api/v1/auth/token-settings — Contract §10. Requires AUTH_SETTINGS_MANAGE via RBAC Service.
router.get(
  '/token-settings',
  authenticate,
  requirePermission('AUTH_SETTINGS_MANAGE'),
  controller.getTokenSettings,
);
router.patch(
  '/token-settings',
  authenticate,
  requirePermission('AUTH_SETTINGS_MANAGE'),
  validateBody(updateTokenSettingsSchema),
  controller.updateTokenSettings,
);

module.exports = router;
