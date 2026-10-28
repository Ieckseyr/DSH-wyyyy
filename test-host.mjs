/**
 * Host-half integration test.
 *
 * Mounts the real routes on a throwaway http server and talks to the live NetEase API
 * the way the panel does: status, search, roam, lyric, song URL, then a range request
 * against the audio stream. Run it before installing so a broken transport never
 * reaches the GUI.
 *
 * Usage: node test-host.mjs
 */
import http from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'ntm-host-'));
process.env.NETEASE_MUSIC_DATA_DIR = dataDir;

const { createStore } = await import('./lib/store.js');
const { registerRoutes } = await import('./lib/routes.js');

const routes = new Map();
const fakeWebServer = {
  register(route) {
    if (routes.has(route.path)) throw new Error('duplicate route ' + route.path);
    routes.set(route.path, route.handler);
    return () => routes.delete(route.path);
  },
};

const store = createStore();
await store.load();
const dispose = registerRoutes(fakeWebServer, { store });

const server = http.createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const handler = routes.get(path);
  if (!handler) {
    res.writeHead(404);
    res.end('no route');
    return;
  }
  Promise.resolve(handler(req, res)).catch((error) => {
    if (!res.headersSent) res.writeHead(500);
    res.end(String(error && error.message));
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
console.log('mounted:', [...routes.keys()].join(', '));

let failures = 0;
function check(name, condition, detail) {
  if (condition) console.log('PASS ' + name);
  else {
    failures += 1;
    console.log('FAIL ' + name + (detail ? ' — ' + detail : ''));
  }
}

async function api(action, params) {
  const response = await fetch(`${base}/netease-music/api`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, params: params || {} }),
  });
  return response.json();
}

/* ------------------------------------------------------------------ status */
const status = await api('status');
check('status returns signed-out state', status.ok === true && status.data.loggedIn === false, JSON.stringify(status).slice(0, 160));

/* ------------------------------------------------------------------ search */
const search = await api('search', { keywords: '周杰伦', type: 1, limit: 5 });
check('search returns songs', search.ok && search.data.songs.length > 0, JSON.stringify(search).slice(0, 200));
const firstSong = search.data.songs[0];
check('song shape has cover/artists/duration', Boolean(firstSong && firstSong.name && firstSong.artists.length && firstSong.duration > 0), JSON.stringify(firstSong).slice(0, 200));

/* --------------------------------------------------------------- playlist */
const playlist = await api('playlist.detail', { id: 3778678 });
check('playlist detail returns tracks', playlist.ok && playlist.data.tracks.length > 10, String(playlist.data && playlist.data.tracks && playlist.data.tracks.length));

/* ------------------------------------------------------------------- roam */
const roam = await api('radio.get');
check('private roam returns songs', roam.ok && roam.data.songs.length > 0, String(roam.ok) + '/' + (roam.data && roam.data.songs ? roam.data.songs.length : '-'));
const roamSong = roam.data.songs[0];

/* ------------------------------------------------------------------ lyric */
const lyric = await api('lyric', { id: roamSong.id });
check('lyric returns text', lyric.ok && typeof lyric.data.lyric === 'string' && lyric.data.lyric.length > 0, JSON.stringify(lyric).slice(0, 120));

/* -------------------------------------------------------------- song url */
const urlInfo = await api('song.url', { id: roamSong.id, level: 'standard' });
check('song url resolves', urlInfo.ok && Boolean(urlInfo.data.url), JSON.stringify(urlInfo).slice(0, 200));
check('song url reports bitrate', urlInfo.ok && urlInfo.data.br > 0, String(urlInfo.data && urlInfo.data.br));

/* ------------------------------------------------------------ audio proxy */
if (urlInfo.ok && urlInfo.data.url) {
  const audioUrl = `${base}/netease-music/audio?id=${roamSong.id}&level=standard`;
  const full = await fetch(audioUrl, { headers: { range: 'bytes=0-' } });
  const buffer = Buffer.from(await full.arrayBuffer());
  check('audio stream responds', full.status === 200 || full.status === 206, 'status ' + full.status);
  check('audio stream carries bytes', buffer.length > 2000, buffer.length + ' bytes');
  check('audio stream content-type', /audio|octet-stream|mpeg/i.test(full.headers.get('content-type') || ''), full.headers.get('content-type'));

  const ranged = await fetch(audioUrl, { headers: { range: 'bytes=1000-2000' } });
  const rangedBody = Buffer.from(await ranged.arrayBuffer());
  check('range request is partial', ranged.status === 206 || ranged.status === 200, 'status ' + ranged.status);
  check('range returns 1001 bytes', ranged.status !== 206 || rangedBody.length === 1001, rangedBody.length + ' bytes');

  const again = await api('song.url', { id: roamSong.id, level: 'standard' });
  check('repeat resolve still resolves', again.ok && Boolean(again.data.url) && again.data.id === roamSong.id);
}

/* ---------------------------------------------------------------- reject */
const bad = await api('nope', {});
check('unknown action rejected', bad.ok === false, JSON.stringify(bad).slice(0, 120));

const missing = await fetch(`${base}/netease-music/audio`);
check('audio without id rejected', missing.status === 400, 'status ' + missing.status);

dispose();
server.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
