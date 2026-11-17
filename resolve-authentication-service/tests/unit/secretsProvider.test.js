const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalFileSecretsProvider } = require('../../src/keys/secretsProvider');

describe('LocalFileSecretsProvider', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-provider-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when nothing has been persisted yet', async () => {
    const provider = new LocalFileSecretsProvider(
      path.join(tmpDir, 'private.pem'),
      path.join(tmpDir, 'public.pem'),
    );
    expect(await provider.load()).toBeNull();
  });

  it('persists and reloads exactly what was written', async () => {
    const provider = new LocalFileSecretsProvider(
      path.join(tmpDir, 'private.pem'),
      path.join(tmpDir, 'public.pem'),
    );
    await provider.persist('fake-private-pem', 'fake-public-pem');

    const loaded = await provider.load();
    expect(loaded).toEqual({ privatePem: 'fake-private-pem', publicPem: 'fake-public-pem' });
  });

  it('sets restrictive file permissions on the private key', async () => {
    const privatePath = path.join(tmpDir, 'private.pem');
    const provider = new LocalFileSecretsProvider(privatePath, path.join(tmpDir, 'public.pem'));
    await provider.persist('fake-private-pem', 'fake-public-pem');

    const mode = fs.statSync(privatePath).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
