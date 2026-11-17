const authService = require('../services/authService');
const passwordResetService = require('../services/passwordResetService');
const tokenSettingsService = require('../services/tokenSettingsService');
const mfaService = require('../services/mfaService');
const userTeamClient = require('../clients/userTeamClient');

async function login(req, res, next) {
  try {
    const requestIp = req.ip;
    const result = await authService.login(req.body, requestIp);
    res.status(result.mfaRequired ? 202 : 200).json(result);
  } catch (err) {
    next(err);
  }
}

async function beginMfaEnrollment(req, res, next) {
  try {
    const result = await mfaService.beginEnrollment({
      userId: req.auth.sub,
      tenantId: req.auth.tenantId,
      email: req.auth.email,
    });
    res.status(200).json(result);
  } catch (err) { next(err); }
}

async function confirmMfaEnrollment(req, res, next) {
  try {
    await mfaService.confirmEnrollment({
      userId: req.auth.sub,
      tenantId: req.auth.tenantId,
      code: req.body.code,
    });
    res.status(204).send();
  } catch (err) { next(err); }
}

async function getMfaStatus(req, res, next) {
  try {
    res.status(200).json(await mfaService.status(req.auth.sub, req.auth.tenantId));
  } catch (err) { next(err); }
}

async function verifyMfa(req, res, next) {
  try {
    const result = await authService.verifyMfa(req.body);
    res.status(200).json(result);
  } catch (err) { next(err); }
}

async function disableMfa(req, res, next) {
  try {
    const verification = await userTeamClient.verifyCredentials(req.auth.sub, req.body.currentPassword);
    if (!verification.valid || verification.status !== 'ACTIVE') {
      const { fromCode } = require('../errors/AppError');
      throw fromCode('AUTH_INVALID_CREDENTIALS', 'Current password is incorrect.');
    }
    await mfaService.verifyCurrentCode({
      userId: req.auth.sub,
      tenantId: req.auth.tenantId,
      code: req.body.code,
    });
    await mfaService.disable({ userId: req.auth.sub, tenantId: req.auth.tenantId });
    res.status(204).send();
  } catch (err) { next(err); }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.auth, req.body?.refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function requestPasswordReset(req, res, next) {
  try {
    // Always 202, regardless of outcome — anti-enumeration (Contract §8).
    // Errors from downstream services still surface, since those are real
    // outages, not "this account doesn't exist."
    await passwordResetService.requestPasswordReset(req.body, req.ip);
    res.status(202).json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function confirmPasswordReset(req, res, next) {
  try {
    await passwordResetService.confirmPasswordReset(req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getTokenSettings(req, res, next) {
  try {
    const settings = await tokenSettingsService.getTokenSettings(req.auth.tenantId);
    res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
}

async function updateTokenSettings(req, res, next) {
  try {
    const settings = await tokenSettingsService.updateAccessTokenTtl(
      req.auth.tenantId,
      req.body.accessTokenTtlSeconds,
    );
    res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  beginMfaEnrollment,
  confirmMfaEnrollment,
  getMfaStatus,
  verifyMfa,
  disableMfa,
  refresh,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  getTokenSettings,
  updateTokenSettings,
};
