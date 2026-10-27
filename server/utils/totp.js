import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 secret for TOTP (Google Authenticator, Authy, etc.)
 */
export const generateSecret = (length = 20) => {
  const randomBytes = crypto.randomBytes(length);
  let base32 = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < randomBytes.length; i++) {
    value = (value << 8) | randomBytes[i];
    bits += 8;

    while (bits >= 5) {
      base32 += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    base32 += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return base32;
};

/**
 * Decode Base32 string to Buffer
 */
const base32ToBuffer = (base32) => {
  const clean = (base32 || '').replace(/[\s=-]/g, '').toUpperCase();
  const bytes = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

/**
 * Generate 6-digit TOTP code for a given timestamp offset
 */
export const generateTotp = (secret, timeOffsetSteps = 0, timeStep = 30) => {
  const key = base32ToBuffer(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep) + timeOffsetSteps;

  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
};

/**
 * Verify a 6-digit TOTP code with time drift window (default ±1 step = ±30s)
 */
export const verifyTotp = (secret, token, window = 1, timeStep = 30) => {
  if (!secret || !token) return false;
  const cleanToken = String(token).trim();
  for (let offset = -window; offset <= window; offset++) {
    const valid = generateTotp(secret, offset, timeStep);
    if (valid === cleanToken) {
      return true;
    }
  }
  return false;
};

/**
 * Get standard otpauth URI
 */
export const getOtpAuthUrl = (username, secret, issuer = 'SocialSphere') => {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
};
