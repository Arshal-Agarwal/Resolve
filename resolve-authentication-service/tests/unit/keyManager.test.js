const fs = require('fs');
const os = require('os');
const path = require('path');

describe('keyManager (Schema doc §6-8)', () => {
  let tmpDir;
  let originalPrivatePath;
  let originalPublicPath;
  let config;
  let keyManager;

  beforeEach(() => {
    jest.resetModules();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-keys-'));
    config = require('../../src/config');
    originalPrivatePath = config.jwt.privateKeyPath;
    originalPublicPath = config.jwt.publicKeyPath;
    config.jwt.privateKeyPath = path.join(tmpDir, 'private.pem');
    config.jwt.publicKeyPath = path.join(tmpDir, 'public.pem');
    keyManager = require('../../src/keys/keyManager');
  });

  afterEach(() => {
    config.jwt.privateKeyPath = originalPrivatePath;
    config.jwt.publicKeyPath = originalPublicPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates a keypair on first call and persists it to disk', async () => {
    const { jwk } = await keyManager.loadOrGenerateKeys();

    expect(fs.existsSync(config.jwt.privateKeyPath)).toBe(true);
    expect(fs.existsSync(config.jwt.publicKeyPath)).toBe(true);
    expect(jwk.kty).toBe('RSA');
    expect(jwk.use).toBe('sig');
    expect(jwk.alg).toBe('RS256');
    expect(jwk).toHaveProperty('kid');
    // Private key material must never leak into the JWK we publish.
    expect(jwk).not.toHaveProperty('d');
  });

  it('loads the same keys from disk on a fresh module instance rather than regenerating', async () => {
    const first = await keyManager.loadOrGenerateKeys();

    jest.resetModules();
    const configAgain = require('../../src/config');
    configAgain.jwt.privateKeyPath = config.jwt.privateKeyPath;
    configAgain.jwt.publicKeyPath = config.jwt.publicKeyPath;
    const keyManagerAgain = require('../../src/keys/keyManager');
    const second = await keyManagerAgain.loadOrGenerateKeys();

    expect(second.jwk.n).toBe(first.jwk.n);
    expect(second.jwk.kid).toBe(first.jwk.kid);
  });

  it('getJWKS() returns a standard RFC 7517 document with exactly one key', async () => {
    const jwks = await keyManager.getJWKS();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]).toMatchObject({ kty: 'RSA', use: 'sig', alg: 'RS256' });
  });
});
