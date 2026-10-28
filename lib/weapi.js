/**
 * NetEase Cloud Music `weapi` transport.
 *
 * The public web client talks to music.163.com through two encrypted POST fields:
 *   `params`   — AES-128-CBC twice (fixed preset key, then a per-request random key)
 *   `encSecKey`— that random key, RSA-encrypted with the site's fixed public modulus
 * Reproducing it here keeps every call identical to what the real site sends, so the
 * endpoints accept us without a browser or a second local service.
 */
import crypto from 'node:crypto';

const PRESET_KEY = '0CoJUm6Qyw8W8jud';
const IV = '0102030405060708';
const PUB_KEY = '010001';
const MODULUS =
  '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b72515' +
  '2b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbd' +
  'a92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cf' +
  'e4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

/** Extra cookies the web client always carries; some endpoints gate on `os`/`appver`. */
const BASE_COOKIE = 'os=pc; appver=9.1.15; osver=Microsoft-Windows-10-Professional-build-19045-64bit; channel=netease;';

function aes(text, key) {
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(IV, 'utf8'));
  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64');
}

function modPow(base, exponent, modulus) {
  let result = 1n;
  let b = base % modulus;
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e >>= 1n;
  }
  return result;
}

function rsaEncrypt(text, modulusHex, exponentHex) {
  const reversed = text.split('').reverse().join('');
  const hex = Buffer.from(reversed, 'utf8').toString('hex');
  const value = modPow(BigInt(`0x${hex}`), BigInt(`0x${exponentHex}`), BigInt(`0x${modulusHex}`));
  return value.toString(16).padStart(256, '0');
}

/**
 * Encrypt a request body the way the web player does.
 * @param {unknown} payload JSON-serialisable request body.
 */
export function encryptPayload(payload) {
  const secretKey = crypto.randomBytes(8).toString('hex');
  const body = JSON.stringify(payload);
  const params = aes(aes(body, PRESET_KEY), secretKey);
  const encSecKey = rsaEncrypt(secretKey, MODULUS, PUB_KEY);
  return { params, encSecKey };
}

/** Parse `Set-Cookie` headers into name → value pairs (accepts Headers or a node header bag). */
export function parseSetCookie(headers) {
  let list = [];
  if (typeof headers?.getSetCookie === 'function') list = headers.getSetCookie();
  else if (typeof headers?.get === 'function') {
    const joined = headers.get('set-cookie');
    if (joined) list = [joined];
  } else {
    const raw = headers?.['set-cookie'];
    if (raw) list = Array.isArray(raw) ? raw : [raw];
  }
  const out = [];
  for (const line of list) {
    const head = String(line).split(';')[0];
    const eq = head.indexOf('=');
    if (eq > 0) out.push([head.slice(0, eq).trim(), head.slice(eq + 1).trim()]);
  }
  return out;
}

let requestSeq = 0;

/**
 * One `weapi` call.
 * @param {string} path   Endpoint below `/weapi/`, e.g. `song/url/v1`.
 * @param {object} data   Request body.
 * @param {{ cookie?: Record<string, string>, timeoutMs?: number }} [options]
 * @returns {Promise<{ json: any, setCookie: Array<[string, string]>, status: number }>}
 */
export async function weapi(path, data = {}, options = {}) {
  const cookie = options.cookie || {};
  const csrf = cookie.__csrf || '';
  const { params, encSecKey } = encryptPayload({ ...data, csrf_token: data.csrf_token ?? csrf });
  const body = new URLSearchParams({ params, encSecKey }).toString();
  const cookieHeader = `${Object.entries(cookie)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')}${Object.keys(cookie).length ? '; ' : ''}${BASE_COOKIE}`;

  const url = `https://music.163.com/weapi/${path}?csrf_token=${encodeURIComponent(csrf)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Referer: 'https://music.163.com/',
        Origin: 'https://music.163.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeader,
        Accept: '*/*',
      },
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { code: res.status, raw: text.slice(0, 400) };
    }
    requestSeq += 1;
    return {
      json,
      status: res.status,
      setCookie: parseSetCookie(res.headers),
      seq: requestSeq,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const WEAPI_META = { userAgent: UA, baseCookie: BASE_COOKIE };
