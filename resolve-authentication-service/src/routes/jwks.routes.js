const { Router } = require('express');
const { getJWKS } = require('../keys/keyManager');
const { fromCode } = require('../errors/AppError');

const router = Router();

// GET /.well-known/jwks.json — Contracts/Authentication_Service.md §11.
// Public, no auth. Every other service fetches + caches this to verify
// access tokens locally without calling back into this service per request.
router.get('/.well-known/jwks.json', async (req, res, next) => {
  try {
    const jwks = await getJWKS();
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json(jwks);
  } catch (err) {
    next(fromCode('INTERNAL_ERROR', 'Failed to load signing keys.', { cause: err.message }));
  }
});

module.exports = router;
