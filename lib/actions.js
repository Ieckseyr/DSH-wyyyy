/**
 * The whole NetEase surface the player uses, in one dispatch table.
 *
 * Every entry has the same shape: it receives the parsed request parameters and a
 * small context (`store`, `log`) and returns JSON the Client can render directly.
 * Keeping the table here — not in the route handler — means the audio stream and any
 * future agent tool reach the same code instead of a second copy of it.
 */
import { createHash } from 'node:crypto';
import { weapi, parseSetCookie, WEAPI_META } from './weapi.js';

const UA = WEAPI_META.userAgent;

/** `code` values NetEase uses for "fine" on the endpoints below. */
const OK = new Set([200]);
/** `code` values that mean "this account cannot do that here yet". */
const AUTH_CODES = new Set([301, 302, 400, 401, 402]);

class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code ?? 0;
  }
}

function cookieHeader(cookie) {
  const pairs = Object.entries(cookie).map(([k, v]) => `${k}=${v}`);
  if (!pairs.length) return WEAPI_META.baseCookie;
  return `${pairs.join('; ')}; ${WEAPI_META.baseCookie}`;
}

/** Plain (unencrypted) `/api/...` GET; a few endpoints only exist on that surface. */
async function plainGet(pathWithQuery, cookie, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://music.163.com${pathWithQuery}`, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://music.163.com/',
        Cookie: cookieHeader(cookie),
        Accept: 'application/json, text/plain, */*',
      },
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { code: res.status, raw: text.slice(0, 400) };
    }
    return { json, setCookie: parseSetCookie(res.headers), status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Plain form-encoded POST to the legacy `/api/...` surface.
 *
 * Library mutations (add tracks to a playlist, create a playlist, subscribe) only exist
 * there — the `weapi` POST returns 400 参数错误 because their parameter names differ
 * (`trackIds`, not `tracks`).
 */
async function plainPost(path, data, cookie, timeoutMs = 15000) {
  const payload = { ...data, csrf_token: cookie.__csrf || '' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://music.163.com${path}`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Referer: 'https://music.163.com/',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeader(cookie),
        Accept: 'application/json, text/plain, */*',
      },
      body: new URLSearchParams(payload).toString(),
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { code: res.status, raw: text.slice(0, 400) };
    }
    return { json, setCookie: parseSetCookie(res.headers), status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/** List the pieces of a raw `Cookie:` header the user pasted. */
export function parseCookieHeader(text) {
  const out = {};
  for (const part of String(text || '').split(/[;\n]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (/^(cookie|cookie:)$/i.test(name)) continue;
    if (name) out[name] = value;
  }
  return out;
}

/**
 * Commit a login: cookies arrive either as `Set-Cookie` headers or, on some QR
 * responses, as a ready-made `cookie` string in the body. Take both.
 */
async function commitSession(ctx, setCookie, json) {
  const pairs = [...(setCookie || [])];
  const inline = typeof json?.cookie === 'string' ? parseCookieHeader(json.cookie) : {};
  for (const [name, value] of Object.entries(inline)) pairs.push([name, value]);
  if (pairs.length) await ctx.store.absorb(pairs, true);
  return pairs.length > 0;
}

async function call(path, data, ctx, { allow = null } = {}) {
  const { json, setCookie } = await weapi(path, data, { cookie: ctx.store.cookie });
  if (setCookie.length) await ctx.store.absorb(setCookie);
  const code = typeof json?.code === 'number' ? json.code : 200;
  const accepted = allow ? allow.includes(code) : OK.has(code);
  if (!accepted) {
    const message = json?.message || json?.msg || `网易云返回 ${code}`;
    throw new ApiError(message, code);
  }
  return json;
}

function pickLevel(raw, requested) {
  const level = raw?.level || requested || 'standard';
  return level;
}

/** Normalise one search/song/radio item into the flat shape the UI draws. */
export function shapeSong(song) {
  const artists = song.ar || song.artists || [];
  const album = song.al || song.album || {};
  const duration = song.dt || song.duration || 0;
  const privilege = song.privilege || {};
  return {
    id: song.id,
    name: song.name,
    artists: artists.map((a) => a?.name).filter(Boolean),
    artistIds: artists.map((a) => a?.id).filter(Boolean),
    album: album.name || '',
    albumId: album.id,
    cover: album.picUrl || album.img1v1Url || '',
    duration,
    fee: song.fee,
    mvid: song.mvid,
    alias: song.alia || song.alias || [],
    /** `pr`/`fee` decide whether a play attempt is worth making; `st < 0` means gone. */
    playable: privilege.st === undefined ? true : privilege.st >= 0,
  };
}

function shapePlaylist(playlist) {
  return {
    id: playlist.id,
    name: playlist.name,
    cover: playlist.coverImgUrl || '',
    trackCount: playlist.trackCount ?? (playlist.tracks?.length || 0),
    playCount: playlist.playCount ?? 0,
    subscribed: Boolean(playlist.subscribed),
    creator: playlist.creator ? { id: playlist.creator.userId, name: playlist.creator.nickname } : null,
    description: playlist.description || '',
    updateTime: playlist.updateTime || 0,
  };
}

export const actions = {
  /** Login state + profile; the single source the whole panel reads on open. */
  async status(_params, ctx) {
    if (!ctx.store.hasLogin()) return { loggedIn: false, profile: null, account: null };
    try {
      const json = await call('w/nuser/account/get', {}, ctx, { allow: [200, 301, 302] });
      if (json.code !== 200 || !json.profile) return { loggedIn: false, profile: null, account: null };
      return {
        loggedIn: true,
        profile: {
          userId: json.profile.userId,
          nickname: json.profile.nickname,
          avatar: json.profile.avatarUrl,
          vipType: json.profile.vipType ?? 0,
          signature: json.profile.signature || '',
        },
        account: json.account ? { id: json.account.id, status: json.account.status } : null,
      };
    } catch (error) {
      return { loggedIn: false, profile: null, account: null, error: error.message };
    }
  },

  async 'login.qr.key'() {
    const { json } = await plainGet('/api/login/qrcode/unikey?type=1', {});
    if (json?.code !== 200 || !json.unikey) throw new ApiError('二维码获取失败', json?.code);
    return { key: json.unikey };
  },

  /**
   * Poll one QR state. 800 expired · 801 waiting · 802 scanned · 803 authorised.
   * 803 carries the session cookie, so this is the only place login is committed.
   */
  async 'login.qr.check'(params, ctx) {
    const key = String(params.key || '');
    if (!key) throw new ApiError('缺少二维码 key');
    const { json, setCookie } = await plainGet(
      `/api/login/qrcode/client/login?key=${encodeURIComponent(key)}&type=1`,
      ctx.store.cookie,
    );
    if (json?.code === 803) {
      await commitSession(ctx, setCookie, json);
      const status = await actions.status({}, ctx);
      return { code: 803, message: '登录成功', status };
    }
    return { code: json?.code ?? 801, message: json?.message || '', nickname: json?.nickname || '' };
  },

  async 'login.phone'(params, ctx) {
    const phone = String(params.phone || '').trim();
    const password = String(params.password || '');
    if (!/^\d{5,20}$/.test(phone)) throw new ApiError('手机号格式不对');
    if (!password) throw new ApiError('请输入密码');
    const { json, setCookie } = await weapi(
      'login/cellphone',
      {
        phone,
        countrycode: String(params.countrycode || '86').replace(/\D/g, '') || '86',
        password: createHash('md5').update(password).digest('hex'),
        rememberLogin: 'true',
      },
      { cookie: ctx.store.cookie },
    );
    if (json?.code !== 200) throw new ApiError(json?.message || json?.msg || '登录失败', json?.code);
    await commitSession(ctx, setCookie, json);
    return { code: 200, status: await actions.status({}, ctx) };
  },

  /** Paste a `MUSIC_U=...` header from an already signed-in browser. */
  async 'login.cookie'(params, ctx) {
    const parsed = parseCookieHeader(params.cookie);
    if (!parsed.MUSIC_U) throw new ApiError('没有找到 MUSIC_U，请复制完整的 Cookie');
    await ctx.store.replace(parsed);
    const status = await actions.status({}, ctx);
    if (!status.loggedIn) {
      await ctx.store.clear();
      throw new ApiError('Cookie 无效或已过期');
    }
    return { code: 200, status };
  },

  async logout(_params, ctx) {
    try {
      await weapi('logout', {}, { cookie: ctx.store.cookie });
    } catch {
      /* the cookie is going away regardless */
    }
    await ctx.store.clear();
    return { code: 200 };
  },

  async 'user.playlists'(params, ctx) {
    const uid = String(params.uid || '');
    if (!uid) throw new ApiError('缺少用户 id');
    const limit = Number(params.limit) || 1000;
    const offset = Number(params.offset) || 0;
    const json = await call('user/playlist', { uid, limit, offset }, ctx, { allow: [200, 301, 302] });
    const lists = (json.playlist || []).map(shapePlaylist);
    const mine = lists.filter((p) => !p.subscribed);
    const collected = lists.filter((p) => p.subscribed);
    return { mine, collected, more: Boolean(json.more) };
  },

  /**
   * The liked songs, read through the account's special "我喜欢" playlist
   * (`specialType === 5`). Its `trackIds` is complete, unlike `tracks` which the
   * detail endpoint caps — and it replaces the retired `/api/song/like/list`.
   */
  async 'user.liked'(params, ctx) {
    const uid = String(params.uid || '');
    if (!uid) throw new ApiError('缺少用户 id');
    const json = await call('user/playlist', { uid, limit: 1000, offset: 0 }, ctx, { allow: [200, 301, 302] });
    const liked = (json.playlist || []).find((playlist) => playlist.specialType === 5);
    if (!liked) return { id: null, ids: [], name: '我喜欢的音乐' };
    const detail = await call('v6/playlist/detail', { id: String(liked.id), n: 100000, s: 8 }, ctx, {
      allow: [200, 301, 302],
    });
    const ids = (detail.playlist?.trackIds || []).map((entry) => entry.id);
    return { id: liked.id, ids, name: liked.name };
  },

  async 'playlist.detail'(params, ctx) {
    const id = String(params.id || '');
    if (!id) throw new ApiError('缺少歌单 id');
    const json = await call('v6/playlist/detail', { id, n: 100000, s: 8 }, ctx, { allow: [200, 404, 301] });
    if (!json.playlist) throw new ApiError('歌单不存在', json?.code);
    const tracks = (json.playlist.tracks || []).map(shapeSong);
    return {
      playlist: { ...shapePlaylist(json.playlist), trackCount: json.playlist.trackCount },
      tracks,
      privileges: (json.privileges || []).map((p) => ({ id: p.id, st: p.st, fee: p.fee })),
    };
  },

  async 'playlist.subscribe'(params, ctx) {
    const { json } = await plainPost(
      '/api/playlist/subscribe',
      { id: String(params.id || ''), t: params.subscribe ? '1' : '0' },
      ctx.store.cookie,
    );
    if (json?.code !== 200) throw new ApiError(json?.message || '操作失败', json?.code);
    return { code: 200, subscribed: Boolean(params.subscribe) };
  },

  async 'playlist.tracks'(params, ctx) {
    const tracks = (Array.isArray(params.tracks) ? params.tracks : [params.tracks]).filter(Boolean).map(String);
    const { json } = await plainPost(
      '/api/playlist/manipulate/tracks',
      { op: params.op === 'del' ? 'del' : 'add', pid: String(params.pid || ''), trackIds: tracks.join(','), imme: 'true' },
      ctx.store.cookie,
    );
    if (json?.code !== 200) throw new ApiError(json?.message || json?.msg || '操作失败', json?.code);
    return { code: 200 };
  },

  async 'playlist.create'(params, ctx) {
    const name = String(params.name || '').trim();
    if (!name) throw new ApiError('请输入歌单名');
    const { json } = await plainPost(
      '/api/playlist/create',
      { name, type: 'playlist', privacy: '0' },
      ctx.store.cookie,
    );
    if (json?.code !== 200 || !json.id) throw new ApiError(json?.message || '创建失败', json?.code);
    return { id: json.id, name };
  },

  async search(params, ctx) {
    const keywords = String(params.keywords || '').trim();
    if (!keywords) return { songs: [], playlists: [], artists: [], albums: [] };
    const type = Number(params.type) || 1;
    const limit = Math.min(Number(params.limit) || 30, 100);
    const offset = Number(params.offset) || 0;
    const json = await call('cloudsearch/pc', { s: keywords, type, limit, offset, total: true }, ctx);
    const result = json.result || {};
    return {
      songs: (result.songs || []).map(shapeSong),
      playlists: (result.playlists || []).map(shapePlaylist),
      artists: (result.artists || []).map((a) => ({
        id: a.id,
        name: a.name,
        cover: a.picUrl || a.img1v1Url || '',
        albumSize: a.albumSize ?? 0,
      })),
      albums: (result.albums || []).map((a) => ({
        id: a.id,
        name: a.name,
        cover: a.picUrl || '',
        artist: a.artist?.name || '',
        size: a.size ?? 0,
      })),
      total: result.songCount ?? result.playlistCount ?? 0,
      more: Boolean(json.result?.more),
    };
  },

  /**
   * Resolve a playable URL.
   *
   * A track is often locked only at the *requested* tier — asking for 无损 when the
   * account is not a member returns nothing, while the same track plays fine at 320k.
   * So walk down the ladder instead of failing, and report which tier actually answered.
   * The legacy `player/url` surface is tried last because it sometimes carries a stream
   * the v1 endpoint withholds.
   */
  async 'song.url'(params, ctx) {
    const id = Number(params.id);
    if (!id) throw new ApiError('缺少歌曲 id');
    const requested = String(params.level || 'exhigh');
    const ladder = [requested, 'lossless', 'exhigh', 'higher', 'standard'].filter(
      (level, index, list) => list.indexOf(level) === index,
    );
    let sawTrial = null;
    for (const level of ladder) {
      let json;
      try {
        json = await call(
          'song/enhance/player/url/v1',
          { ids: JSON.stringify([id]), level, encodeType: 'flac' },
          ctx,
          { allow: [200, 404] },
        );
      } catch {
        continue;
      }
      const item = Array.isArray(json.data) ? json.data[0] : null;
      if (!item) continue;
      if (item.freeTrialInfo && !sawTrial) sawTrial = item;
      if (item.url) {
        return {
          id,
          url: item.url,
          level: pickLevel(item, level),
          requested,
          downgraded: requested !== pickLevel(item, level),
          br: item.br || 0,
          size: item.size || 0,
          type: item.type || '',
          time: item.time || 0,
          fee: item.fee,
          trial: Boolean(item.freeTrialInfo),
          trialEnd: item.freeTrialInfo ? item.freeTrialInfo.end : 0,
        };
      }
    }
    const legacy = await plainGet(`/api/song/enhance/player/url?ids=[${id}]&br=999000`, ctx.store.cookie).catch(
      () => null,
    );
    const legacyItem = legacy && Array.isArray(legacy.json?.data) ? legacy.json.data[0] : null;
    if (legacyItem && legacyItem.url) {
      return {
        id,
        url: legacyItem.url,
        level: 'standard',
        requested,
        downgraded: requested !== 'standard',
        br: legacyItem.br || 0,
        size: legacyItem.size || 0,
        type: legacyItem.type || '',
        time: legacyItem.time || 0,
        fee: legacyItem.fee,
        trial: Boolean(legacyItem.freeTrialInfo),
        trialEnd: legacyItem.freeTrialInfo ? legacyItem.freeTrialInfo.end : 0,
      };
    }
    return {
      id,
      url: null,
      level: null,
      br: 0,
      size: 0,
      reason: sawTrial ? '会员专享，暂无试听片段' : '无版权或需要会员',
      trial: Boolean(sawTrial),
    };
  },

  async lyric(params, ctx) {
    const id = String(params.id || '');
    if (!id) throw new ApiError('缺少歌曲 id');
    const json = await call('song/lyric', { id, lv: -1, kv: -1, tv: -1, rv: -1 }, ctx, { allow: [200, 404] });
    return {
      lyric: json?.lrc?.lyric || '',
      translated: json?.tlyric?.lyric || '',
      romaji: json?.romalrc?.lyric || '',
      noLyric: Boolean(json?.nolyric || json?.uncollected),
    };
  },

  /**
   * Like / unlike. Three surfaces accept it and accounts differ in which one they get
   * past the risk check on, so try them in order and report the last real refusal.
   */
  async 'song.like'(params, ctx) {
    const id = String(params.id || '');
    if (!id) throw new ApiError('缺少歌曲 id');
    const like = Boolean(params.like);
    const attempts = [
      () => weapi('radio/like', { trackId: id, like: String(like), alg: 'itembased', time: '3' }, { cookie: ctx.store.cookie }),
      () => plainPost('/api/radio/like', { alg: 'itembased', trackId: id, like: String(like), time: '3' }, ctx.store.cookie),
      () => weapi('song/like', { trackId: id, like: String(like), time: '3' }, { cookie: ctx.store.cookie }),
    ];
    let last = null;
    for (const attempt of attempts) {
      let result;
      try {
        result = await attempt();
      } catch {
        continue;
      }
      if (result.setCookie?.length) await ctx.store.absorb(result.setCookie);
      last = result.json;
      if (last?.code === 200) return { code: 200, liked: like };
    }
    throw new ApiError(last?.message || last?.msg || '操作失败', last?.code);
  },

  /** 私人漫游：an endless stream keyed to the account's taste profile. */
  async 'radio.get'(_params, ctx) {
    const json = await call('v1/radio/get', {}, ctx, { allow: [200, 301, 302] });
    const songs = (json.data || []).map(shapeSong);
    return { songs };
  },

  async 'recommend.songs'(_params, ctx) {
    const json = await call('v1/discovery/recommend/songs', {}, ctx, { allow: [200, 301, 302] });
    const data = json?.data?.dailySongs || json?.recommend || [];
    return { songs: data.map(shapeSong) };
  },

  async 'recommend.resources'(_params, ctx) {
    const json = await call('v1/discovery/recommend/resource', {}, ctx, { allow: [200, 301, 302] });
    return { playlists: (json.recommend || []).map(shapePlaylist) };
  },

  async 'top.playlists'(params, ctx) {
    const json = await call(
      'top/playlist',
      { cat: String(params.cat || '全部'), order: 'hot', limit: Math.min(Number(params.limit) || 30, 100), offset: 0 },
      ctx,
    );
    return { playlists: (json.playlists || []).map(shapePlaylist) };
  },
};

/** Names accepted over the wire; anything else is rejected before reaching the table. */
export const ACTION_NAMES = Object.keys(actions);

export { ApiError, AUTH_CODES };
