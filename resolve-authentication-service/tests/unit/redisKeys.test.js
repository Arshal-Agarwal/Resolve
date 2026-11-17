const keys = require('../../src/redis/keys');

describe('Redis key builders (Schema doc §4/§5)', () => {
  it('builds all keys under the resolve:auth: prefix', () => {
    expect(keys.refreshSession('rt1')).toBe('resolve:auth:refresh:rt1');
    expect(keys.revokedAccessToken('tok1')).toBe('resolve:auth:session:revoked:tok1');
    expect(keys.mfaOtp('user1')).toBe('resolve:auth:mfa:otp:user1');
    expect(keys.mfaChallenge('chal1')).toBe('resolve:auth:mfa:challenge:chal1');
    expect(keys.passwordResetToken('reset1')).toBe('resolve:auth:password-reset:reset1');
    expect(keys.loginRateLimitByEmail('jane@acme.com', '15m')).toBe(
      'resolve:auth:ratelimit:login:email:jane@acme.com:15m',
    );
    expect(keys.loginRateLimitByIp('1.2.3.4', '15m')).toBe('resolve:auth:ratelimit:login:ip:1.2.3.4:15m');
  });
});
