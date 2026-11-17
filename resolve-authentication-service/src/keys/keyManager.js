const { generateKeyPair, exportPKCS8, exportSPKI, importPKCS8, importSPKI, exportJWK } = require('jose');
const config = require('../config');
const logger = require('../utils/logger');
const { getSecretsProvider } = require('./secretsProvider');

/**
 * Signing-key storage (Schema doc §8): "Private keys must not be stored in
 * PostgreSQL or Redis." This module doesn't know or care WHERE keys are
 * stored — that's entirely delegated to secretsProvider.js. Today the only
 * provider is local PEM files (dev-only, git-ignored). Whoever picks a real
 * secrets backend for production implements the same provider interface;
 * nothing here needs to change.
 */

let cachedKeys = null; // { privateKey, publicKey (KeyLike), jwk }

async function generateAndPersist(provider) {
  const { privateKey, publicKey } = await generateKeyPair('RS256', {
    modulusLength: 2048,
    extractable: true,
  });
  const privatePem = await exportPKCS8(privateKey);
  const publicPem = await exportSPKI(publicKey);

  await provider.persist(privatePem, publicPem);

  logger.warn(
    'Generated a new RS256 signing keypair via the local-file secrets provider. ' +
      'This provider is dev-only — production must be configured with a real secrets backend ' +
      '(see src/keys/secretsProvider.js) before this path is ever reachable.',
  );

  return { privateKey, publicKey };
}

async function loadOrGenerateKeys() {
  if (cachedKeys) return cachedKeys;

  const provider = getSecretsProvider(config);
  const stored = await provider.load();

  let privateKey;
  let publicKey;

  if (stored) {
    privateKey = await importPKCS8(stored.privatePem, 'RS256');
    publicKey = await importSPKI(stored.publicPem, 'RS256');
  } else {
    ({ privateKey, publicKey } = await generateAndPersist(provider));
  }

  const jwk = await exportJWK(publicKey);
  jwk.kid = config.jwt.kid;
  jwk.use = 'sig';
  jwk.alg = 'RS256';

  cachedKeys = { privateKey, publicKey, jwk };
  return cachedKeys;
}

async function getJWKS() {
  const { jwk } = await loadOrGenerateKeys();
  return { keys: [jwk] };
}

async function getSigningKey() {
  const { privateKey } = await loadOrGenerateKeys();
  return privateKey;
}

// Test/ops helper — never used by application code paths.
function _resetCacheForTests() {
  cachedKeys = null;
}

module.exports = { loadOrGenerateKeys, getJWKS, getSigningKey, _resetCacheForTests };
