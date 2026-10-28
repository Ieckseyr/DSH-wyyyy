/**
 * Host HTTP surface for the music player: one JSON command endpoint and one audio stream.
 *
 * The browser never talks to music.163.com directly. It cannot: the API is CORS-closed,
 * the session cookie is httpOnly-equivalent here, and a cross-origin `<audio>` element
 * would work in an `<audio>` tag but could not be routed through Web Audio (no CORS
 * headers on the CDN), which would silently kill the equaliser. Proxying both through the
 * Host keeps the cookie off the wire, makes the page same-origin, and lets the audio
 * element be an AnalyserNode-compatible source.
 */
import http from 'node:http';
import https from 'node:https';
import { actions, ApiError } from './actions.js';

const JSON_MAX_BYTES = 256 * 1024;
const URL_TTL_MS = 10 * 60 * 1000;

function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > JSON_MAX_BYTES) {
        reject(new ApiError('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new ApiError('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Stream an upstream URL to the browser, honouring Range so seeking works.
 * Redirects are followed because the CDN hops once per request.
 */
function streamUpstream(target, req, res, depth = 0) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      sendJson(res, 502, { ok: false, error: '音频地址无效' });
      return resolve();
    }
    const lib = parsed.protocol === 'http:' ? http : https;
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://music.163.com/',
      Accept: '*/*',
    };
    if (req.headers.range) headers.Range = req.headers.range;

    const upstream = lib.get(parsed, { headers }, (upstreamRes) => {
      const status = upstreamRes.statusCode || 502;
      if (status >= 300 && status < 400 && upstreamRes.headers.location && depth < 5) {
        upstreamRes.resume();
        resolve(streamUpstream(new URL(upstreamRes.headers.location, parsed).toString(), req, res, depth + 1));
        return;
      }
      if (status >= 400) {
        upstreamRes.resume();
        sendJson(res, status === 404 ? 404 : 502, { ok: false, error: `音频源返回 ${status}` });
        resolve();
        return;
      }
      const out = {
        'content-type': upstreamRes.headers['content-type'] || 'audio/mpeg',
        'accept-ranges': upstreamRes.headers['accept-ranges'] || 'bytes',
        'cache-control': 'public, max-age=3600',
      };
      if (upstreamRes.headers['content-length']) out['content-length'] = upstreamRes.headers['content-length'];
      if (upstreamRes.headers['content-range']) out['content-range'] = upstreamRes.headers['content-range'];
      res.writeHead(status, out);
      upstreamRes.pipe(res);
      upstreamRes.on('end', () => resolve());
      upstreamRes.on('error', () => {
        res.destroy();
        resolve();
      });
    });
    upstream.on('error', () => {
      if (!res.headersSent) sendJson(res, 502, { ok: false, error: '音频源连接失败' });
      else res.destroy();
      resolve();
    });
    upstream.setTimeout(20000, () => {
      upstream.destroy();
      if (!res.headersSent) sendJson(res, 504, { ok: false, error: '音频源超时' });
      else res.destroy();
      resolve();
    });
    req.on('close', () => upstream.destroy());
  });
}

export function registerRoutes(webServer, ctx) {
  /** id+level → resolved CDN URL; CDN links expire, so entries are short-lived. */
  const urlCache = new Map();

  async function resolveAudio(id, level) {
    const cacheKey = `${id}:${level}`;
    const hit = urlCache.get(cacheKey);
    if (hit && hit.expires > Date.now()) return hit.value;
    const value = await actions['song.url']({ id, level }, ctx);
    if (value.url) urlCache.set(cacheKey, { value, expires: Date.now() + URL_TTL_MS });
    if (urlCache.size > 400) {
      const now = Date.now();
      for (const [key, entry] of urlCache) if (entry.expires <= now) urlCache.delete(key);
    }
    return value;
  }

  const handleApi = async (req, res) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: '只接受 POST' });
      return;
    }
    let payload;
    try {
      payload = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
      return;
    }
    const { action, params } = payload || {};
    const handler = actions[action];
    if (typeof handler !== 'function') {
      sendJson(res, 404, { ok: false, error: `未知操作 ${String(action)}` });
      return;
    }
    try {
      const data = await handler(params && typeof params === 'object' ? params : {}, ctx);
      sendJson(res, 200, { ok: true, data });
    } catch (error) {
      const status = error instanceof ApiError && error.code === 301 ? 401 : 200;
      sendJson(res, status, {
        ok: false,
        error: error?.message || '调用失败',
        code: error?.code ?? 0,
      });
    }
  };

  const handleAudio = async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const id = url.searchParams.get('id');
    const level = url.searchParams.get('level') || 'exhigh';
    const mode = url.searchParams.get('mode');
    if (!id) {
      sendJson(res, 400, { ok: false, error: '缺少歌曲 id' });
      return;
    }
    let resolved;
    try {
      resolved = await resolveAudio(id, level);
    } catch (error) {
      sendJson(res, 200, { ok: false, error: error?.message || '取流地址失败' });
      return;
    }
    if (!resolved.url) {
      sendJson(res, 404, { ok: false, error: resolved.reason || '无可用音源' });
      return;
    }
    if (mode === 'json') {
      sendJson(res, 200, { ok: true, data: { ...resolved, proxy: `/netease-music/audio?id=${id}&level=${level}` } });
      return;
    }
    await streamUpstream(resolved.url, req, res);
  };

  const disposers = [
    webServer.register({ kind: 'exact', path: '/netease-music/api', handler: handleApi }),
    webServer.register({ kind: 'exact', path: '/netease-music/audio', handler: handleAudio }),
  ];
  return () => {
    for (const dispose of disposers.reverse()) dispose();
  };
}
