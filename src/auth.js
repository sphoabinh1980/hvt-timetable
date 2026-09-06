import crypto from 'node:crypto';

const b64 = (value) => Buffer.from(value).toString('base64url');
const unb64 = (value) => Buffer.from(value, 'base64url').toString('utf8');

export function createAuth({ user, secret, ttlSeconds = 60 * 60 * 8 }) {
  function sign(payload) {
    return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  }

  function issue(username) {
    const payload = b64(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
    return `${payload}.${sign(payload)}`;
  }

  function verify(token) {
    if (!token || !token.includes('.')) return null;
    const [payload, signature] = token.split('.');
    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const data = JSON.parse(unb64(payload));
      if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
      if (data.sub !== user) return null;
      return data;
    } catch {
      return null;
    }
  }

  return { issue, verify };
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}
