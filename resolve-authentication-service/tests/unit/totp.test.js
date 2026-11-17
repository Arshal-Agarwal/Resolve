const totp = require('../../src/services/totp');

describe('TOTP (RFC 6238 compatible)', () => {
  it('generates and verifies six-digit codes', () => {
    const secret = totp.generateSecret();
    const code = totp.codeForCounter(secret, Math.floor(Date.now() / 30000));
    expect(code).toMatch(/^\\d{6}$/);
    expect(totp.verifyCode(secret, code)).not.toBeNull();
  });

  it('rejects malformed and incorrect codes', () => {
    const secret = totp.generateSecret();
    expect(totp.verifyCode(secret, '123')).toBeNull();
    expect(totp.verifyCode(secret, 'abcdef')).toBeNull();
    expect(totp.verifyCode(secret, '000000')).toBeNull();
  });

  it('creates a standard otpauth URI', () => {
    const uri = totp.provisioningUri({ secret: 'JBSWY3DPEHPK3PXP', email: 'person@example.com' });
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('issuer=Resolve');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});
