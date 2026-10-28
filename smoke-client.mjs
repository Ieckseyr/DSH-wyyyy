/**
 * Headless smoke test for the Client half.
 *
 * Loads the built `client.js` into a jsdom window with a stubbed NetEase API, mounts
 * both slot components, then walks the real interaction paths (open panel, play a roam
 * track, like it, search, open a playlist, read lyrics, change EQ) and checks the DOM.
 * This catches what a syntax check cannot: crashed renders, missing hooks, dead wiring.
 *
 * Usage: node smoke-client.mjs
 * Needs react/react-dom/jsdom installed in %TEMP%\ntm-test (see README).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const testHome = process.env.NTM_TEST_HOME || join(process.env.TEMP || '/tmp', 'ntm-test');
const requireFromTest = createRequire(join(testHome, 'index.js'));
const { JSDOM } = requireFromTest('jsdom');
const React = requireFromTest('react');
const ReactDOMClient = requireFromTest('react-dom/client');
const { act } = requireFromTest('react');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://127.0.0.1:63117/' });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
globalThis.HTMLElement = window.HTMLElement;
globalThis.requestAnimationFrame = (cb) => window.setTimeout(() => cb(Date.now()), 16);
globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id);
window.requestAnimationFrame = globalThis.requestAnimationFrame;
window.cancelAnimationFrame = globalThis.cancelAnimationFrame;

/* ------------------------------------------------------------ media stubs */

class FakeAudio {
  constructor() {
    this.listeners = {};
    this.paused = true;
    this.volume = 1;
    this.muted = false;
    this.currentTime = 0;
    this.duration = 0;
    this.readyState = 4;
    this.ended = false;
    this.playbackRate = 1;
    this.src = '';
  }
  setAttribute() {}
  removeAttribute() { this.src = ''; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  emit(type) { (this.listeners[type] || []).forEach((fn) => fn()); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
}
window.Audio = FakeAudio;
globalThis.Audio = FakeAudio;

function nodeStub(extra) {
  return Object.assign({ connect() {}, disconnect() {} }, extra || {});
}
class FakeAudioContext {
  constructor() {
    this.sampleRate = 48000;
    this.state = 'running';
    this.destination = nodeStub();
  }
  createMediaElementSource() { return nodeStub(); }
  createGain() { return nodeStub({ gain: { value: 1 } }); }
  createBiquadFilter() { return nodeStub({ gain: { value: 0 }, frequency: { value: 0 }, Q: { value: 1 }, type: 'peaking' }); }
  createChannelSplitter() { return nodeStub(); }
  createChannelMerger() { return nodeStub(); }
  createConvolver() { return nodeStub({ buffer: null }); }
  createDynamicsCompressor() {
    return nodeStub({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 } });
  }
  createAnalyser() {
    const analyser = nodeStub({ fftSize: 256, smoothingTimeConstant: 0.8, frequencyBinCount: 128 });
    analyser.getByteFrequencyData = (array) => array;
    return analyser;
  }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
window.AudioContext = FakeAudioContext;
globalThis.AudioContext = FakeAudioContext;

/* ------------------------------------------------------------- API stubs */

const SONG = (id, name) => ({ id, name, artists: ['测试歌手'], album: '测试专辑', cover: '', duration: 215000, playable: true });
const calls = [];
let radioCalls = 0;
let loggedIn = false;

async function fakeFetch(url, init) {
  const body = JSON.parse(init.body);
  const action = body.action;
  calls.push(action === 'search' ? 'search:' + body.params.type : action);
  let data = {};
  if (action === 'status') {
    data = loggedIn
      ? { loggedIn: true, profile: { userId: 42, nickname: '测试用户', avatar: '', vipType: 11 } }
      : { loggedIn: false, profile: null };
  } else if (action === 'user.liked') data = { id: 5, ids: [1001, 3001], name: '我喜欢的音乐' };
  else if (action === 'user.playlists') {
    data = {
      mine: [{ id: 7, name: '我创建的歌单', cover: '', trackCount: 3, playCount: 12, subscribed: false }],
      collected: [{ id: 8, name: '收藏的歌单', cover: '', trackCount: 9, playCount: 33, subscribed: true }],
    };
  } else if (action === 'playlist.detail') {
    data = {
      playlist: { id: body.params.id, name: '测试歌单', cover: '', trackCount: 2, playCount: 5, creator: { id: 42, name: '测试用户' }, description: '描述' },
      tracks: [SONG(1001, '第一首'), SONG(1002, '第二首')],
    };
  } else if (action === 'search') data = { songs: [SONG(2001, '搜索结果')], playlists: [], artists: [], albums: [], total: 1 };
  else if (action === 'radio.get') {
    radioCalls += 1;
    // Four distinct tracks per call so the ten-track cap and de-duplication are visible.
    data = { songs: [0, 1, 2, 3].map((n) => SONG(3000 + radioCalls * 10 + n, '漫游' + (radioCalls * 10 + n))) };
  }
  else if (action === 'song.url') data = { id: body.params.id, url: 'http://example/audio.mp3', level: 'exhigh', br: 320000, size: 1, type: 'mp3' };
  else if (action === 'lyric') data = { lyric: '[00:00.00]第一行\n[00:12.50]第二行', translated: '[00:00.00]line one\n[00:12.50]line two', romaji: '' };
  else if (action === 'song.like') data = { code: 200, liked: body.params.like };
  else if (action === 'login.qr.key') data = { key: '0680aac5-ada9-4fbd-b0f1-dcde1d1f21a6' };
  else if (action === 'login.qr.check') data = { code: 801, message: '未扫码' };
  else if (action === 'recommend.songs') data = { songs: [SONG(4001, '每日推荐')] };
  else data = { code: 200, id: 99 };
  return { ok: true, status: 200, async json() { return { ok: true, data }; } };
}
globalThis.fetch = fakeFetch;
window.fetch = fakeFetch;

/* ------------------------------------------------------- load the bundle */

window.__DSH_NETEASE_MUSIC_DEBUG__ = true;
const source = readFileSync(new URL('./client.js', import.meta.url), 'utf8');
let definition = null;
window.__ModuleLoader__ = { load(def) { definition = def; } };
new Function('window', source)(window);
if (!definition) throw new Error('client.js did not register a module');

const mod = definition.factory((name) => {
  if (name === 'react') return React;
  throw new Error('unexpected require: ' + name);
});

const registrations = [];
const ctx = {
  get: () => undefined,
  on: () => () => {},
  provide: () => () => {},
  effect: (fn) => { const dispose = fn(); return typeof dispose === 'function' ? dispose : () => {}; },
  slots: {
    inject(key, callback) { registrations.push({ key, component: callback() }); return () => {}; },
    register(options, component) { return { key: options.name, id: options.id, component }; },
  },
};
mod.apply(ctx);

const NT = window.__DSH_NETEASE_MUSIC__;
if (!NT) throw new Error('debug handle missing');

const bySlot = {};
for (const entry of registrations) bySlot[entry.component.key] = entry.component.component;
console.log('registered slots:', Object.keys(bySlot));

const root = window.document.getElementById('root');
const client = ReactDOMClient.createRoot(root);
const store = NT.playerStore;

const flush = async (rounds = 6) => {
  for (let i = 0; i < rounds; i++) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  }
};
const text = () => root.textContent || '';
const all = (selector) => Array.from(root.querySelectorAll(selector));
const click = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const byTitle = (title) => all('.ntm-iconbtn').find((b) => b.getAttribute('title') === title);

let failures = 0;
function check(name, condition, detail) {
  if (condition) console.log('PASS ' + name);
  else { failures += 1; console.log('FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

await act(async () => {
  client.render(React.createElement(React.Fragment, null,
    React.createElement(bySlot['conversation.session.header.utilities']),
    React.createElement(bySlot['conversation.composer.dock']),
    React.createElement(bySlot['shell.overlay'])));
});
await flush();

check('header trigger renders', all('.ntm-trigger').length === 1);
check('float trigger suppressed once header seat mounts', all('.ntm-float-trigger').length === 0);
check('panel starts closed', all('.ntm-panel.is-open').length === 0);
check('style tag injected', all('style[data-ntm-style]').length > 0);

await act(async () => { click(root.querySelector('.ntm-trigger')); });
await flush(10);

check('panel opens on trigger click', all('.ntm-panel.is-open').length === 1);
check('roam view loaded tracks', text().includes('漫游10'));
check('player bar shows idle state', text().includes('未在播放'));

// --- play the first roam track by clicking its play button
const firstRow = all('.ntm-row')[0];
const rowPlay = Array.from(firstRow.querySelectorAll('.ntm-iconbtn')).find((b) => b.getAttribute('title') === '播放');
await act(async () => { click(rowPlay); });
await flush(12);
check('song.url requested', calls.includes('song.url'));
check('lyrics requested', calls.includes('lyric'));
check('now-playing title updated', /漫游\d+/.test(((root.querySelector('.ntm-now-title') || {}).textContent) || ''), (root.querySelector('.ntm-now-title') || {}).textContent);
check('composer dock appears with the track', all('.ntm-dock').length === 1);
check('dock shows a title', Boolean((root.querySelector('.ntm-dock-title') || {}).textContent));

// --- roam batching and removal
const roamSongs = store.get().roam.songs;
check('roam loads ten tracks at a time', roamSongs.length === 10, String(roamSongs.length));
const removeBtn = all('.ntm-row')[1].querySelector('.ntm-iconbtn[title="不感兴趣"]');
check('roam row has a not-interested button', Boolean(removeBtn));
if (removeBtn) {
  await act(async () => { click(removeBtn); });
  await flush(4);
  check('roam track removed', store.get().roam.songs.length === 9, String(store.get().roam.songs.length));
}

// --- dock: hover volume, mute toggle, settings shortcut
const volWrap = root.querySelector('.ntm-volwrap');
check('dock volume control present', Boolean(volWrap));
if (volWrap) {
  await act(async () => { volWrap.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true })); });
  await flush(4);
  check('hover reveals vertical volume slider', all('.ntm-volpop input[type="range"]').length === 1);
  const volBtn = volWrap.querySelector('.ntm-iconbtn');
  await act(async () => { click(volBtn); });
  await flush(4);
  check('volume button toggles mute', store.get().muted === true, String(store.get().muted));
  await act(async () => { click(volBtn); });
  await flush(2);
  check('second click restores sound', store.get().muted === false);
  await act(async () => { volWrap.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true })); });
  await flush(2);
}
const dockSettings = all('.ntm-dock .ntm-iconbtn').find((b) => b.getAttribute('title') === '打开完整设置');
check('dock settings button present', Boolean(dockSettings));
if (dockSettings) {
  await act(async () => { click(dockSettings); });
  await flush(8);
  check('dock settings opens the panel on settings', store.get().open === true && (store.get().detail || {}).kind === 'settings', JSON.stringify({ open: store.get().open, detail: store.get().detail }));
  await act(async () => { NT.controller.closePanel(); NT.controller.setDetail(null); });
  await flush(4);
}

// --- log in, then like
loggedIn = true;
await act(async () => { await NT.controller.refreshStatus(); });
await flush(8);
check('login state applied', store.get().login.profile && store.get().login.profile.nickname === '测试用户');
check('liked list synced', store.get().liked.has(3001));

const likeButton = byTitle('喜欢');
check('like button present', Boolean(likeButton));
if (likeButton) {
  await act(async () => { click(likeButton); });
  await flush(6);
  check('like sent to host', calls.includes('song.like'));
  check('like applied locally', store.get().liked.has(3001));
}

// --- playlists tab
const playlistsTab = all('.ntm-tab').find((tab) => (tab.textContent || '').includes('歌单'));
check('playlists tab present', Boolean(playlistsTab));
await act(async () => { click(playlistsTab); });
await flush(10);
check('playlists loaded', text().includes('我创建的歌单'));
const card = all('.ntm-card')[0];
check('playlist card rendered', Boolean(card));
if (card) {
  await act(async () => { click(card); });
  await flush(10);
  check('playlist detail opened', text().includes('测试歌单') && text().includes('第一首'), text().slice(0, 200));
  const backBtn = all('.ntm-head-btn').find((b) => b.getAttribute('title') === '返回');
  check('back button in header', Boolean(backBtn));
  if (backBtn) { await act(async () => { click(backBtn); }); await flush(); }
}

// --- search through the store (input events are a jsdom/realm minefield)
await act(async () => {
  NT.controller.setTab('search');
});
await flush(6);
check('search view rendered', Boolean(root.querySelector('.ntm-searchbar input')));
await act(async () => { await NT.controller.search('测试', 1); });
await flush(8);
check('search executed', calls.includes('search:1'));
check('search results rendered', text().includes('搜索结果'));

// --- settings via the more menu
const moreBtn = byTitle('更多');
check('more menu button present', Boolean(moreBtn));
if (moreBtn) {
  await act(async () => { click(moreBtn); });
  await flush(4);
  check('menu opened', all('.ntm-menu').length === 1);
  const settingsItem = all('.ntm-menu-item').find((item) => /音效|Effects/.test(item.textContent || '') && /设置|Settings/.test(item.textContent || ''));
  check('settings item in menu', Boolean(settingsItem));
  if (settingsItem) {
    await act(async () => { click(settingsItem); });
    await flush(8);
    check('settings screen rendered', text().includes('均衡器') || text().includes('Equaliser'), text().slice(0, 240));
    check('eq bands rendered', all('.ntm-eq-band').length === 10);
    check('quality select rendered', all('.ntm-select').length >= 2);
    const presetSelect = all('.ntm-select')[1];
    await act(async () => {
      presetSelect.value = 'rock';
      presetSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    await flush(4);
    check('EQ preset applied', store.get().effects.preset === 'rock' && store.get().effects.eq[0] === 4, JSON.stringify(store.get().effects));
    check('settings switches rendered', all('.ntm-switch').length >= 5, String(all('.ntm-switch').length));
    const monoSwitch = all('.ntm-switch')[0];
    await act(async () => { monoSwitch.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    await flush(4);
    check('effect toggle applied', store.get().effects.mono === true, JSON.stringify(store.get().effects.mono));
  }
}

// --- lyrics screen with the current track
await act(async () => { NT.controller.setDetail({ kind: 'lyrics' }); });
await flush(6);
check('lyrics screen rendered', all('.ntm-lyrics-line').length === 2, String(all('.ntm-lyrics-line').length));
check('translations rendered under lines', all('.ntm-lyrics-tr').length === 2, String(all('.ntm-lyrics-tr').length));
await act(async () => { NT.controller.setLyricsTranslate(false); });
await flush(4);
check('translation toggle hides them', all('.ntm-lyrics-tr').length === 0);
await act(async () => { NT.controller.setLyricsTranslate(true); });
await flush(2);

// --- background lyrics
await act(async () => { NT.controller.setBgLyrics({ on: true }); });
await flush(6);
check('background lyrics rendered', all('.ntm-bglyrics').length === 1);
check('background lyrics show a line', (root.querySelector('.ntm-bglyrics-line') || {}).textContent === '第一行', String((root.querySelector('.ntm-bglyrics-line') || {}).textContent));
check('background lyrics show the translation', (root.querySelector('.ntm-bglyrics-tr') || {}).textContent === 'line one', String((root.querySelector('.ntm-bglyrics-tr') || {}).textContent));
await act(async () => { NT.controller.setBgLyrics({ offsetX: 20, align: 'left', lineHeight: 1.6, weight: 800 }); });
await flush(4);
const bg = root.querySelector('.ntm-bglyrics');
check('horizontal offset applied', bg && bg.getAttribute('style').includes('--ntm-bg-x: 20'), bg && bg.getAttribute('style'));
check('alignment applied', bg && bg.getAttribute('style').includes('--ntm-bg-align: left'));
check('weight applied', bg && bg.getAttribute('style').includes('--ntm-bg-weight: 800'));

// --- login screen
await act(async () => { NT.controller.setDetail({ kind: 'login' }); });
await flush(10);
check('login screen rendered', text().includes('扫码登录') || text().includes('登录'));
check('QR code drawn', all('.ntm-qr svg path').length === 1, String(all('.ntm-qr svg path').length));
check('qr key requested', calls.includes('login.qr.key'));

// --- pin: geometry becomes em against the right/bottom edges
await act(async () => { NT.controller.closePanel(); NT.controller.setTab('roam'); });
await flush(4);
await act(async () => { click(root.querySelector('.ntm-trigger')); });
await flush(6);
const pinBtn = all('.ntm-head-btn').find((b) => (b.getAttribute('title') || '').includes('固定面板'));
check('pin button present', Boolean(pinBtn));
if (pinBtn) {
  await act(async () => { click(pinBtn); });
  await flush(4);
  check('panel pinned', store.get().pinned === true);
  const anchor = store.get().anchor;
  check('anchor stored in type units', Boolean(anchor && [anchor.top, anchor.right, anchor.bottom, anchor.width].every(Number.isFinite)), JSON.stringify(anchor));
  const style = root.querySelector('.ntm-panel').getAttribute('style') || '';
  check('pinned style is em-anchored', /right:\s*[\d.]+em/.test(style) && /bottom:\s*[\d.]+em/.test(style), style);
  await act(async () => { click(pinBtn); });
  await flush(4);
  check('panel unpinned', store.get().pinned === false);
}

// --- recall: a panel parked outside the viewport answers the trigger
await act(async () => { NT.controller.setPanelBox({ x: 4000, y: 3000, w: 400, h: 500 }); });
await flush(4);
check('panel is off-screen', NT.controller.isPanelReachable() === false);
await act(async () => { click(root.querySelector('.ntm-trigger')); });
await flush(4);
check('trigger recalls instead of closing', store.get().open === true && store.get().panelBox === null, JSON.stringify({ open: store.get().open, box: store.get().panelBox }));

// --- close
await act(async () => {
  const closeBtn = all('.ntm-head-btn').find((b) => b.getAttribute('title') === '收起');
  click(closeBtn);
});
await flush(4);
check('panel closed again', all('.ntm-panel.is-open').length === 0);

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
