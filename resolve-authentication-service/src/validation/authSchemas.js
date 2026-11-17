const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
  organizationSlug: z.string().trim().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .optional();

const passwordResetRequestSchema = z.object({
  email: z.string().trim().min(1).email(),
  organizationSlug: z.string().trim().min(1),
});

const passwordResetConfirmSchema = z.object({
  resetToken: z.string().min(1),
  // 8-char minimum is a sensible default, not something the contract specifies —
  // flagging in case the team wants a shared password-policy source of truth instead.
  newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
});

const totpCodeSchema = z.string().regex(/^\d{6}$/, 'Code must be six digits.');
const mfaVerifySchema = z.object({
  mfaChallengeToken: z.string().min(32).max(256),
  code: totpCodeSchema,
});
const mfaConfirmSchema = z.object({ code: totpCodeSchema });
const mfaDisableSchema = z.object({
  currentPassword: z.string().min(1),
  code: totpCodeSchema,
});

const updateTokenSettingsSchema = z.object({
  accessTokenTtlSeconds: z.number().int().positive(),
});

module.exports = {
  loginSchema,
  refreshSchema,
  logoutSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  updateTokenSettingsSchema,
  mfaVerifySchema,
  mfaConfirmSchema,
  mfaDisableSchema,
};
