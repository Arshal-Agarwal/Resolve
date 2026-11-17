const fs = require('fs');
const path = require('path');

/**
 * Interface every secrets provider must implement:
 *   async load()                       -> { privatePem, publicPem } | null
 *   async persist(privatePem, publicPem) -> void
 *
 * `load()` returning null means "nothing stored yet" — the caller (keyManager)
 * decides what to do about that (generate + persist, in local dev; in a real
 * provider, this should probably never happen and could throw instead once
 * you're past initial setup).
 */

/**
 * LOCAL DEV ONLY. Reads/writes PEM files on disk. This is what every
 * environment uses today because no real secrets backend has been chosen
 * yet — that's a decision for whoever owns deployment infra, not something
 * this codebase should silently assume (Vault? AWS Secrets Manager? a
 * cloud KMS with envelope encryption? each has a different persist/rotate
 * story). Whoever picks one implements this same two-method interface
 * (see JSDoc above) and swaps it in via `getSecretsProvider()` below —
 * nothing in keyManager.js needs to change.
 */
class LocalFileSecretsProvider {
  constructor(privatePath, publicPath) {
    this.privatePath = privatePath;
    this.publicPath = publicPath;
  }

  async load() {
    if (!fs.existsSync(this.privatePath) || !fs.existsSync(this.publicPath)) return null;
    return {
      privatePem: fs.readFileSync(this.privatePath, 'utf8'),
      publicPem: fs.readFileSync(this.publicPath, 'utf8'),
    };
  }

  async persist(privatePem, publicPem) {
    fs.mkdirSync(path.dirname(this.privatePath), { recursive: true });
    fs.writeFileSync(this.privatePath, privatePem, { mode: 0o600 });
    fs.writeFileSync(this.publicPath, publicPem, { mode: 0o644 });
  }
}

function resolvePath(p) {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

function getSecretsProvider(config) {
  // Only one provider exists today. When a real backend is chosen, branch
  // here on a config value (e.g. config.secrets.provider) rather than
  // changing keyManager.js at all.
  return new LocalFileSecretsProvider(
    resolvePath(config.jwt.privateKeyPath),
    resolvePath(config.jwt.publicKeyPath),
  );
}

module.exports = { getSecretsProvider, LocalFileSecretsProvider };
