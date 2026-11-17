const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input) {
  const normalized = String(input).replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of normalized) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function codeForCounter(secret, counter) {
  const key = base32Decode(secret);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1000000).padStart(6, '0');
}

function verifyCode(secret, code, now = Date.now(), window = 1) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const currentCounter = Math.floor(now / 30000);
  const supplied = Buffer.from(String(code));
  for (let drift = -window; drift <= window; drift += 1) {
    const counter = currentCounter + drift;
    if (counter < 0) continue;
    const expected = Buffer.from(codeForCounter(secret, counter));
    if (supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)) return counter;
  }
  return null;
}

function provisioningUri({ secret, email, issuer = 'Resolve' }) {
  const label = `${issuer}:${email}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

module.exports = { generateSecret, verifyCode, provisioningUri, codeForCounter, base32Encode, base32Decode };
