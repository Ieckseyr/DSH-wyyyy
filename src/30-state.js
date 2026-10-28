/**
 * Player state and every operation the UI can trigger.
 *
 * The store holds only what changes on user intent or a track boundary — never the
 * playhead. Progress is read straight from the media element by the component that
 * draws it, so a 4Hz `timeupdate` cannot re-render the whole panel.
 */
(function (NT) {
  'use strict';

  var LEVELS = [
    { id: 'standard', name: '标准', nameEn: 'Standard', note: '128k' },
    { id: 'higher', name: '较高', nameEn: 'Higher', note: '192k' },
    { id: 'exhigh', name: '极高', nameEn: 'Very high', note: '320k' },
    { id: 'lossless', name: '无损', nameEn: 'Lossless', note: 'FLAC' },
    { id: 'hires', name: 'Hi-Res', nameEn: 'Hi-Res', note: '24bit', vip: true },
    { id: 'jyeffect', name: '沉浸环绕', nameEn: 'Immersive', note: '环绕', vip: true },
    { id: 'sky', name: '天空音效', nameEn: 'Sky', note: '空间', vip: true },
    { id: 'jymaster', name: '超清母带', nameEn: 'Master', note: '母带', vip: true },
  ];

  var EQ_PRESETS = {
    flat: { name: '原声', nameEn: 'Flat', eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    pop: { name: '流行', nameEn: 'Pop', eq: [-1, 0, 2, 4, 3, 1, -1, -1, 0, 1] },
    rock: { name: '摇滚', nameEn: 'Rock', eq: [4, 3, 1, -1, -1, 0, 2, 3, 4, 3] },
    electronic: { name: '电子', nameEn: 'Electronic', eq: [5, 4, 2, 0, -1, 1, 2, 3, 4, 5] },
    hiphop: { name: '嘻哈', nameEn: 'Hip-hop', eq: [6, 4, 1, 2, -1, -1, 1, -1, 2, 3] },
    metal: { name: '金属', nameEn: 'Metal', eq: [5, 3, -1, -2, -1, 1, 3, 4, 4, 2] },
    folk: { name: '民谣', nameEn: 'Folk', eq: [0, 1, 2, 3, 2, 1, 0, -1, -1, 0] },
    vocal: { name: '人声', nameEn: 'Vocal', eq: [-2, -1, 1, 3, 4, 4, 2, 0, -1, -2] },
    classical: { name: '古典', nameEn: 'Classical', eq: [3, 2, 1, 0, 0, 0, 1, 2, 3, 4] },
    bass: { name: '重低音', nameEn: 'Bass', eq: [7, 6, 4, 1, 0, -1, -2, 0, 1, 2] },
    night: { name: '夜间', nameEn: 'Night', eq: [-3, -2, 0, 1, 1, 0, -1, -2, -3, -4] },
    acg: { name: 'ACG', nameEn: 'ACG', eq: [1, 2, 3, 2, 0, 1, 3, 3, 2, 1] },
    podcast: { name: '播客', nameEn: 'Podcast', eq: [-4, -3, 0, 3, 5, 4, 2, 0, -1, -2] },
    hifi: { name: 'HiFi', nameEn: 'HiFi', eq: [2, 1, 0, 0, -1, 0, 0, 1, 2, 2] },
  };

  function defaultEffects() {
    return {
      preset: 'flat',
      eq: EQ_PRESETS.flat.eq.slice(),
      bass: 0,
      treble: 0,
      width: 0.18,
      reverb: 0,
      rate: 1,
      balance: 0,
      mono: false,
      vocal: false,
      comp: true,
      normalize: true,
      bypass: false,
      crossfeed: false,
      crossfeedAmount: 0.22,
      smartEq: false,
      smartBass: false,
    };
  }

  function initialState() {
    var prefs = NT.readPrefs();
    return {
      open: false,
      tab: 'roam',
      detail: null,
      headerTrigger: false,
      login: { state: 'unknown', profile: null },
      queue: [],
      index: -1,
      playing: false,
      buffering: false,
      level: prefs.level || 'exhigh',
      volume: typeof prefs.volume === 'number' ? prefs.volume : 0.8,
      muted: false,
      mode: prefs.mode || 'order',
      liked: new Set(),
      myPlaylists: [],
      collectedPlaylists: [],
      playlistsState: 'idle',
      search: { q: '', type: 1, loading: false, songs: [], playlists: [], artists: [], albums: [], total: 0 },
      roam: { loading: false, songs: [], round: 0 },
      lyrics: { forId: null, loading: false, lines: [], translated: [], active: 0 },
      toast: null,
      effects: Object.assign(defaultEffects(), prefs.effects || {}),
      /** Values the analyser writes, never persisted: correction curve + adaptive bass. */
      smart: { autoEq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], bassOffset: 0, state: 'idle', ticks: 0 },
      queueSource: '',
      spectrumOn: prefs.spectrumOn !== false,
      currentUrlInfo: null,
      picker: null,
      contextLabel: '',
      likedPlaylistId: null,
      panelBox: prefs.panelBox || null,
      bgLyrics: Object.assign(
        { on: false, opacity: 0.42, size: 34, offset: 78, offsetX: 50, align: 'center', lineHeight: 1.32, weight: 700 },
        prefs.bgLyrics || {},
      ),
      lyricsTranslate: prefs.lyricsTranslate !== false,
    };
  }

  var store = NT.createStore(initialState());
  NT.playerStore = { get: store.get, set: store.set, subscribe: store.subscribe };

  var engine = null;
  var toastTimer = null;
  var skipGuard = 0;
  var booted = false;
  var ctxRef = null;
  /** Resolved track URLs, so `next` and quality switches do not re-ask the API. */
  var urlCache = new Map();
  var currentProxyUrl = '';
  var proxyRetried = false;
  var lyricTimer = null;
  /** Set when a roam track ends exactly on the last loaded one. */
  var pendingAdvance = false;

  function levelLabel(id) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].id === id) return NT.levelName(LEVELS[i]);
    }
    return id || '';
  }

  function cacheKey(id, level) {
    return String(id) + ':' + level;
  }

  function rememberUrl(id, level, info) {
    urlCache.set(cacheKey(id, level), { info: info, at: Date.now() });
    if (urlCache.size > 60) {
      var oldest = null;
      urlCache.forEach(function (entry, key) {
        if (!oldest || entry.at < oldest.at) oldest = { key: key, at: entry.at };
      });
      if (oldest) urlCache.delete(oldest.key);
    }
  }

  function cachedUrl(id, level) {
    var hit = urlCache.get(cacheKey(id, level));
    if (hit && Date.now() - hit.at < 8 * 60 * 1000) return hit.info;
    return null;
  }

  /**
   * One lyric cursor for the whole plugin: the in-panel lyric list and the wallpaper
   * backdrop read the same `lyrics.active`, so they can never disagree and only one
   * timer runs.
   */  function startLyricTicker() {
    if (lyricTimer) return;
    lyricTimer = setInterval(function () {
      var snapshot = store.get();
      var lines = snapshot.lyrics.lines;
      if (!lines.length || !engine) return;
      var position = engine.currentTime || 0;
      var active = -1;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].time <= position + 0.15) active = i;
        else break;
      }
      if (active !== snapshot.lyrics.active) {
        store.set({ lyrics: Object.assign({}, snapshot.lyrics, { active: active }) });
      }
    }, 220);
  }

  function t(key, vars) {
    return NT.t(key, vars);
  }

  /** Effects plus the analyser-written values, which are never persisted. */
  function mergedEffects() {
    var snapshot = store.get();
    return Object.assign({}, snapshot.effects, {
      autoEq: snapshot.smart.autoEq,
      smartBass: snapshot.smart.bassOffset,
    });
  }

  function pushEffects() {
    if (engine) engine.applyEffects(mergedEffects());
  }

  /**
   * 智能音效.
   *
   * Auto-EQ compares the ten octave bands against each other and slowly pushes the
   * quieter ones up, which flattens whatever colour the headphones or speakers add.
   * It learns for about six seconds and then freezes — a room correction that keeps
   * chasing every new song is worse than none. Adaptive bass works the other way: it
   * only lifts low end when the low bands are measurably thinner than the mids.
   */
  var smartTimer = null;
  var SMART_LEARN_TICKS = 16;

  function startSmartEngine() {
    if (smartTimer) return;
    smartTimer = setInterval(function () {
      var snapshot = store.get();
      var fx = snapshot.effects;
      if (!fx.smartEq && !fx.smartBass) return;
      if (!engine || !snapshot.playing || snapshot.muted) return;
      var levels = engine.readBandLevels(NT.EQ_FREQS);
      if (!levels || !levels.length) return;
      var smart = snapshot.smart;
      var next = { autoEq: smart.autoEq, bassOffset: smart.bassOffset, state: smart.state, ticks: smart.ticks };
      var changed = false;

      if (fx.smartEq && smart.state !== 'ready') {
        var mean = 0;
        for (var i = 0; i < levels.length; i++) mean += levels[i];
        mean /= levels.length;
        if (mean > 4) {
          var curve = smart.autoEq.slice();
          for (var b = 0; b < curve.length; b++) {
            var delta = (mean - levels[b]) * 0.055;
            curve[b] = Math.max(-7, Math.min(7, curve[b] * 0.88 + delta * 0.35));
          }
          next.autoEq = curve;
          next.ticks = smart.ticks + 1;
          if (next.ticks >= SMART_LEARN_TICKS) next.state = 'ready';
          changed = true;
        }
      }

      if (fx.smartBass) {
        var low = (levels[0] + levels[1] + levels[2]) / 3;
        var high = (levels[6] + levels[7]) / 2;
        var target = Math.max(0, Math.min(6, (high - low) * 0.06));
        var bass = smart.bassOffset + (target - smart.bassOffset) * 0.2;
        if (Math.abs(bass - smart.bassOffset) > 0.04) {
          next.bassOffset = bass;
          changed = true;
        }
      }

      if (changed) {
        store.set({ smart: next });
        engine.applyEffects(Object.assign({}, fx, { autoEq: next.autoEq, smartBass: next.bassOffset }));
      }
    }, 400);
  }

  function current(state) {
    var snapshot = state || store.get();
    if (snapshot.index < 0 || snapshot.index >= snapshot.queue.length) return null;
    return snapshot.queue[snapshot.index];
  }

  function toast(text) {
    store.set({ toast: text });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastTimer = null;
      store.set({ toast: null });
    }, 2200);
  }

  function savePrefs(patch) {
    NT.writePrefs(patch);
  }

  function setLiked(ids) {
    store.set({ liked: new Set(ids.map(Number)) });
  }

  var controller = {
    get engine() {
      return engine;
    },
    get current() {
      return current();
    },
    state: store.get,
    subscribe: store.subscribe,
    isLiked: function (id) {
      return store.get().liked.has(Number(id));
    },

    /* ------------------------------------------------------------- lifecycle */

    boot: function (ctx) {
      if (booted) return;
      booted = true;
      ctxRef = ctx;
      NT.initLocale(ctx);
      engine = NT.createEngine({
        getEffects: function () {
          return store.get().effects;
        },
        onEvent: function (event) {
          if (event.type === 'ended') controller.next(true);
          else if (event.type === 'error') {
            store.set({ playing: false });
            // A CDN host that answered the CORS probe can still fail on the media load
            // itself; retry the same track through the local proxy before skipping.
            if (event.direct && currentProxyUrl && !proxyRetried) {
              proxyRetried = true;
              engine.playProxy(currentProxyUrl).then(function (ok) {
                if (ok) store.set({ playing: true });
              });
              return;
            }
            if (skipGuard < 4) {
              skipGuard += 1;
              toast(t('play_failed'));
              setTimeout(function () {
                controller.next(true);
              }, 400);
            }
          } else if (event.type === 'playing') store.set({ buffering: false });
          else if (event.type === 'waiting') store.set({ buffering: true });
        },
      });
      engine.setVolume(store.get().volume);
      engine.setMuted(store.get().muted);
      engine.applyEffects(mergedEffects());
      startLyricTicker();
      startSmartEngine();
      controller.refreshStatus();
    },

    dispose: function () {
      if (engine) engine.dispose();
      engine = null;
      booted = false;
    },

    /* ------------------------------------------------------------------ panel */

    togglePanel: function () {
      var open = !store.get().open;
      store.set({ open: open });
      if (open) controller.bootstrap();
    },
    openPanel: function () {
      store.set({ open: true });
      controller.bootstrap();
    },
    closePanel: function () {
      store.set({ open: false });
    },
    setTab: function (tab) {
      store.set({ tab: tab, detail: null });
      if (tab === 'playlists') controller.loadPlaylists();
    },
    setDetail: function (detail) {
      store.set({ detail: detail });
    },
    setPicker: function (song) {
      store.set({ picker: song });
    },
    back: function () {
      store.set({ detail: null });
    },
    setHeaderTrigger: function (present) {
      store.set({ headerTrigger: present });
    },

    /** First-open work: who am I, what do I like, what playlists do I have. */
    bootstrap: function () {
      var state = store.get();
      if (state.login.state === 'unknown') controller.refreshStatus();
      if (state.tab === 'roam' && !state.roam.songs.length && !state.roam.loading) controller.loadRoam();
    },

    /* ------------------------------------------------------------------ login */

    refreshStatus: async function () {
      try {
        var status = await NT.api('status');
        store.set({ login: { state: status.loggedIn ? 'in' : 'out', profile: status.profile } });
        if (status.loggedIn) {
          controller.loadLiked();
          controller.loadPlaylists();
        }
      } catch (error) {
        store.set({ login: { state: 'out', profile: null } });
      }
    },

    qrKey: function () {
      return NT.api('login.qr.key');
    },
    qrCheck: async function (key) {
      var result = await NT.api('login.qr.check', { key: key });
      if (result.code === 803 && result.status) {
        store.set({ login: { state: 'in', profile: result.status.profile } });
        toast(t('login_success'));
        controller.loadLiked();
        controller.loadPlaylists();
      }
      return result;
    },
    loginPhone: async function (phone, password, countrycode) {
      var result = await NT.api('login.phone', { phone: phone, password: password, countrycode: countrycode });
      store.set({ login: { state: 'in', profile: result.status.profile } });
      toast(t('login_success'));
      controller.loadLiked();
      controller.loadPlaylists();
      return result;
    },
    loginCookie: async function (cookie) {
      var result = await NT.api('login.cookie', { cookie: cookie });
      store.set({ login: { state: 'in', profile: result.status.profile } });
      toast(t('login_success'));
      controller.loadLiked();
      controller.loadPlaylists();
      return result;
    },
    logout: async function () {
      try {
        await NT.api('logout');
      } catch (error) {
        /* ignore */
      }
      store.set({
        login: { state: 'out', profile: null },
        liked: new Set(),
        myPlaylists: [],
        collectedPlaylists: [],
        detail: null,
        tab: 'roam',
      });
    },

    /* ----------------------------------------------------------------- library */

    loadLiked: async function () {
      var profile = store.get().login.profile;
      if (!profile) return;
      try {
        var result = await NT.api('user.liked', { uid: profile.userId });
        setLiked(result.ids || []);
        store.set({ likedPlaylistId: result.id || null });
      } catch (error) {
        /* like state is decoration; a failure must not block playback */
      }
    },

    loadPlaylists: async function (force) {
      var profile = store.get().login.profile;
      if (!profile) return;
      var state = store.get();
      if (state.playlistsState === 'loading') return;
      if (!force && (state.myPlaylists.length || state.collectedPlaylists.length)) {
        // still refresh in the background on explicit tab visits
      }
      store.set({ playlistsState: 'loading' });
      try {
        var result = await NT.api('user.playlists', { uid: profile.userId, limit: 1000 });
        store.set({
          myPlaylists: result.mine || [],
          collectedPlaylists: result.collected || [],
          playlistsState: 'ready',
        });
      } catch (error) {
        store.set({ playlistsState: 'error' });
        toast(error.message || t('load_failed'));
      }
    },

    openPlaylist: async function (id, fallbackName) {
      store.set({ detail: { kind: 'playlist', id: id, name: fallbackName || '', loading: true, tracks: [], playlist: null } });
      try {
        var result = await NT.api('playlist.detail', { id: id });
        var detail = store.get().detail;
        if (!detail || detail.kind !== 'playlist' || String(detail.id) !== String(id)) return;
        store.set({
          detail: {
            kind: 'playlist',
            id: id,
            name: result.playlist.name,
            loading: false,
            tracks: result.tracks,
            playlist: result.playlist,
          },
        });
      } catch (error) {
        var currentDetail = store.get().detail;
        if (currentDetail && currentDetail.kind === 'playlist') {
          store.set({ detail: Object.assign({}, currentDetail, { loading: false, error: error.message }) });
        }
        toast(error.message || t('load_failed'));
      }
    },

    /** "我喜欢的音乐" is an ordinary playlist with `specialType 5`, so it opens like one. */
    openLiked: async function () {
      var profile = store.get().login.profile;
      if (!profile) {
        toast(t('login_needed'));
        return;
      }
      var id = store.get().likedPlaylistId;
      if (!id) {
        try {
          var result = await NT.api('user.liked', { uid: profile.userId });
          id = result.id;
          setLiked(result.ids || []);
          store.set({ likedPlaylistId: id || null });
        } catch (error) {
          toast(error.message || t('load_failed'));
          return;
        }
      }
      if (!id) {
        toast(t('empty_playlist'));
        return;
      }
      await controller.openPlaylist(id, t('liked_songs'));
    },

    search: async function (keywords, type) {
      var query = (keywords || '').trim();
      if (!query) {
        store.set({ search: { q: '', type: type || 1, loading: false, songs: [], playlists: [], artists: [], albums: [], total: 0 } });
        return;
      }
      store.set({ search: Object.assign({}, store.get().search, { q: query, type: type || 1, loading: true }) });
      try {
        var result = await NT.api('search', { keywords: query, type: type || 1, limit: 30, offset: 0 });
        var latest = store.get().search;
        if (latest.q !== query) return;
        store.set({
          search: {
            q: query,
            type: type || 1,
            loading: false,
            songs: result.songs || [],
            playlists: result.playlists || [],
            artists: result.artists || [],
            albums: result.albums || [],
            total: result.total || 0,
          },
        });
      } catch (error) {
        store.set({ search: Object.assign({}, store.get().search, { loading: false }) });
        toast(error.message || t('load_failed'));
      }
    },

    /**
     * 私人漫游 hands out three tracks per call and moves its cursor on every call, so a
     * batch of ten is four *sequential* calls. Firing them together makes all of them
     * read the same cursor and return the same three songs.
     */
    loadRoam: async function (append) {
      var state = store.get();
      if (state.roam.loading) return;
      store.set({ roam: Object.assign({}, state.roam, { loading: true }) });
      try {
        var seen = new Set();
        var fresh = [];
        for (var round = 0; round < 4 && fresh.length < 10; round++) {
          var batch = await NT.api('radio.get');
          (batch.songs || []).forEach(function (song) {
            if (!song || !song.id || seen.has(String(song.id)) || fresh.length >= 10) return;
            seen.add(String(song.id));
            fresh.push(song);
          });
        }
        var latest = store.get();
        if (append) {
          var known = new Set(latest.roam.songs.map(function (song) {
            return String(song.id);
          }));
          var added = fresh.filter(function (song) {
            return !known.has(String(song.id));
          });
          var patch = { roam: Object.assign({}, latest.roam, { loading: false, songs: latest.roam.songs.concat(added) }) };
          if (latest.queueSource === 'roam' && added.length) {
            // Extend the live queue so playback flows into the new batch.
            var known2 = new Set(latest.queue.map(function (song) {
              return String(song.id);
            }));
            var queueExtra = added.filter(function (song) {
              return !known2.has(String(song.id));
            });
            if (queueExtra.length) patch.queue = latest.queue.concat(queueExtra);
          }
          store.set(patch);
          // A track ended while this refill was in flight; start the first new one.
          if (pendingAdvance) {
            pendingAdvance = false;
            var resumeAt = latest.queue.length;
            if (patch.queue && patch.queue.length > resumeAt) controller.playIndex(resumeAt);
            else controller.playIndex(0);
          }
        } else {
          store.set({ roam: { loading: false, songs: fresh, round: (latest.roam.round || 0) + 1 } });
        }
      } catch (error) {
        pendingAdvance = false;
        store.set({ roam: Object.assign({}, store.get().roam, { loading: false }) });
        toast(error.message || t('load_failed'));
      }
    },

    /** 不感兴趣: drop it from the roam list (and from a live roam queue). */
    removeRoamSong: function (id) {
      var state = store.get();
      var key = String(id);
      var songs = state.roam.songs.filter(function (song) {
        return String(song.id) !== key;
      });
      var patch = { roam: Object.assign({}, state.roam, { songs: songs }) };
      var wasCurrent = state.queueSource === 'roam' && state.queue[state.index] && String(state.queue[state.index].id) === key;
      if (state.queueSource === 'roam') {
        var queue = state.queue.slice();
        var at = -1;
        for (var i = 0; i < queue.length; i++) {
          if (String(queue[i].id) === key) {
            at = i;
            break;
          }
        }
        if (at >= 0) {
          queue.splice(at, 1);
          var index = state.index;
          if (at < index) index -= 1;
          if (index >= queue.length) index = queue.length - 1;
          patch.queue = queue;
          patch.index = index;
          if (!queue.length) {
            patch.index = -1;
            patch.playing = false;
          }
        }
      }
      store.set(patch);
      if (wasCurrent && patch.index >= 0) controller.loadCurrent();
      toast(t('roam_removed'));
    },

    /* --------------------------------------------------------------- playback */

    playSongs: function (songs, startIndex, contextLabel, source) {
      var list = songs.filter(function (song) {
        return song && song.id;
      });
      if (!list.length) return;
      var index = Math.max(0, Math.min(list.length - 1, startIndex || 0));
      skipGuard = 0;
      store.set({
        queue: list.slice(),
        index: index,
        contextLabel: contextLabel || '',
        queueSource: source || '',
      });
      controller.loadCurrent();
    },

    playNextIn: function (song) {
      var state = store.get();
      if (!song || !song.id) return;
      var queue = state.queue.slice();
      var insertAt = state.index < 0 ? queue.length : state.index + 1;
      queue.splice(insertAt, 0, song);
      store.set({ queue: queue });
      toast(t('play_next'));
    },

    loadCurrent: async function (seekSeconds) {
      var state = store.get();
      var song = current(state);
      if (!song) return;
      store.set({ buffering: true, lyrics: { forId: null, loading: true, lines: [], translated: [], active: 0 } });
      controller.loadLyrics(song.id);
      var resolved = cachedUrl(song.id, state.level);
      if (!resolved) {
        try {
          resolved = await NT.api('song.url', { id: song.id, level: state.level });
          if (resolved && resolved.url) rememberUrl(song.id, state.level, resolved);
        } catch (error) {
          store.set({ buffering: false, playing: false });
          toast(error.message || t('play_failed'));
          return;
        }
      }
      // The level may have changed while the request was in flight.
      var latestSong = current();
      if (!latestSong || String(latestSong.id) !== String(song.id)) return;
      if (!resolved || !resolved.url) {
        store.set({ buffering: false, playing: false });
        toast((resolved && resolved.reason) || t('play_failed'));
        if (skipGuard < 4) {
          skipGuard += 1;
          setTimeout(function () {
            controller.next(true);
          }, 500);
        }
        return;
      }
      currentProxyUrl = NT.audioUrl(song.id, store.get().level);
      proxyRetried = false;
      store.set({
        currentUrlInfo: {
          level: resolved.level,
          br: resolved.br,
          type: resolved.type,
          downgraded: Boolean(resolved.downgraded),
          trial: Boolean(resolved.trial),
        },
      });
      // Tell the user when the account could not take the tier they asked for, instead
      // of silently playing something quieter.
      if (resolved.trial) toast(t('trial_only'));
      else if (resolved.downgraded) toast(t('quality_fallback', { level: levelLabel(resolved.level) }));
      var ok = await engine.play(resolved.url, currentProxyUrl);
      if (seekSeconds) engine.seek(seekSeconds);
      store.set({ playing: ok, buffering: false });
      if (ok) skipGuard = 0;
      controller.prefetchNext();
    },

    /** Warm the CDN URL for the following track so `next` starts on the first frame. */
    prefetchNext: function () {
      var state = store.get();
      if (state.queue.length < 2) return;
      var nextIndex = state.index + 1;
      if (nextIndex >= state.queue.length) nextIndex = state.mode === 'shuffle' ? -1 : 0;
      if (nextIndex < 0) return;
      var nextSong = state.queue[nextIndex];
      if (!nextSong || !nextSong.id) return;
      if (cachedUrl(nextSong.id, state.level)) return;
      NT.api('song.url', { id: nextSong.id, level: state.level })
        .then(function (resolved) {
          if (resolved && resolved.url) rememberUrl(nextSong.id, state.level, resolved);
        })
        .catch(function () {
          /* prefetch is best effort */
        });
    },

    toggle: async function () {
      var state = store.get();
      if (!state.queue.length) return;
      if (state.playing) {
        engine.pause();
        store.set({ playing: false, buffering: false });
        return;
      }
      if (!engine.element.src) {
        await controller.loadCurrent();
        return;
      }
      var ok = await engine.resume();
      store.set({ playing: ok });
    },

    seek: function (seconds) {
      if (engine) engine.seek(seconds);
    },

    playIndex: function (index) {
      var state = store.get();
      if (index < 0 || index >= state.queue.length) return;
      store.set({ index: index });
      skipGuard = 0;
      controller.loadCurrent();
    },

    next: function (auto) {
      var state = store.get();
      if (!state.queue.length) return;
      // Roam never runs dry. Near the end we top the queue up in the background; on the
      // very last track there is nothing to advance INTO yet, so wait for the refill
      // instead of wrapping back to the first song.
      if (state.queueSource === 'roam' && state.mode !== 'shuffle') {
        if (state.index >= state.queue.length - 1) {
          pendingAdvance = true;
          if (!state.roam.loading) controller.loadRoam(true);
          return;
        }
        if (state.index + 3 >= state.queue.length && !state.roam.loading) controller.loadRoam(true);
      }
      var index;
      if (state.mode === 'shuffle' && state.queue.length > 1) {
        do {
          index = Math.floor(Math.random() * state.queue.length);
        } while (index === state.index);
      } else {
        index = state.index + 1;
        if (index >= state.queue.length) {
          if (state.mode === 'single' && auto) index = state.index;
          else index = 0;
        }
      }
      controller.playIndex(index);
    },

    prev: function () {
      var state = store.get();
      if (!state.queue.length) return;
      if (engine && engine.currentTime > 3) {
        engine.seek(0);
        return;
      }
      var index = state.index - 1;
      if (index < 0) index = state.queue.length - 1;
      controller.playIndex(index);
    },

    cycleMode: function () {
      var order = ['order', 'single', 'shuffle'];
      var mode = store.get().mode;
      var nextMode = order[(order.indexOf(mode) + 1) % order.length];
      store.set({ mode: nextMode });
      savePrefs({ mode: nextMode });
    },

    setVolume: function (value) {
      var volume = Math.max(0, Math.min(1, value));
      store.set({ volume: volume, muted: false });
      engine.setVolume(volume);
      engine.setMuted(false);
      savePrefs({ volume: volume });
    },

    toggleMute: function () {
      var muted = !store.get().muted;
      store.set({ muted: muted });
      engine.setMuted(muted);
    },

    setLevel: async function (level) {
      store.set({ level: level });
      savePrefs({ level: level });
      var state = store.get();
      if (!state.queue.length) return;
      var position = engine ? engine.currentTime : 0;
      if (state.playing) await controller.loadCurrent(position);
    },

    /* ------------------------------------------------------------------- likes */

    toggleLike: async function (song) {
      if (!store.get().login.profile) {
        toast(t('login_needed'));
        return;
      }
      var id = Number(song.id);
      var liked = store.get().liked.has(id);
      var nextSet = new Set(store.get().liked);
      if (liked) nextSet.delete(id);
      else nextSet.add(id);
      store.set({ liked: nextSet });
      try {
        await NT.api('song.like', { id: id, like: !liked });
      } catch (error) {
        var revert = new Set(store.get().liked);
        if (liked) revert.add(id);
        else revert.delete(id);
        store.set({ liked: revert });
        toast(error.message || t('add_failed'));
      }
    },

    addToPlaylist: async function (song, playlistId) {
      if (!song || !song.id) return;
      try {
        await NT.api('playlist.tracks', { op: 'add', pid: playlistId, tracks: [song.id] });
        toast(t('added'));
        controller.loadPlaylists(true);
      } catch (error) {
        toast(error.message || t('add_failed'));
      }
    },

    createPlaylist: async function (name, songToAdd) {
      var result = await NT.api('playlist.create', { name: name });
      await controller.loadPlaylists(true);
      if (songToAdd) await controller.addToPlaylist(songToAdd, result.id);
      return result;
    },

    removeFromPlaylist: async function (playlistId, songId) {
      try {
        await NT.api('playlist.tracks', { op: 'del', pid: playlistId, tracks: [songId] });
        toast(t('removed'));
        var detail = store.get().detail;
        if (detail && detail.kind === 'playlist' && String(detail.id) === String(playlistId)) {
          store.set({
            detail: Object.assign({}, detail, {
              tracks: detail.tracks.filter(function (track) {
                return String(track.id) !== String(songId);
              }),
            }),
          });
        }
      } catch (error) {
        toast(error.message || '操作失败');
      }
    },

    /* ------------------------------------------------------------------ lyrics */

    loadLyrics: async function (songId) {
      if (!songId) return;
      var payload;
      try {
        payload = await NT.api('lyric', { id: songId });
      } catch (error) {
        store.set({ lyrics: { forId: songId, loading: false, lines: [], translated: [], active: 0 } });
        return;
      }
      var state = store.get();
      var song = current(state);
      if (!song || String(song.id) !== String(songId)) return;
      var lines = NT.parseLyrics(payload.lyric || '');
      var translated = NT.parseLyrics(payload.translated || '');
      // Attach each translation to the line it belongs to. The two files drift by a few
      // hundred milliseconds, so match within a tolerance instead of exactly.
      if (translated.length) {
        for (var i = 0; i < lines.length; i++) {
          var best = null;
          var bestDelta = 0.45;
          for (var j = 0; j < translated.length; j++) {
            var delta = Math.abs(translated[j].time - lines[i].time);
            if (delta < bestDelta) {
              bestDelta = delta;
              best = translated[j].text;
            }
          }
          if (best) lines[i].tr = best;
        }
      }
      store.set({ lyrics: { forId: Number(songId), loading: false, lines: lines, translated: translated, active: 0 } });
    },

    setActiveLyric: function (index) {
      var state = store.get();
      if (state.lyrics.active === index) return;
      store.set({ lyrics: Object.assign({}, state.lyrics, { active: index }) });
    },

    /* ----------------------------------------------------------------- effects */

    setEffects: function (patch) {
      var effects = Object.assign({}, store.get().effects, patch);
      store.set({ effects: effects });
      if (patch.smartEq) store.set({ smart: Object.assign({}, store.get().smart, { state: "idle", ticks: 0 }) });
      pushEffects();
      savePrefs({ effects: effects });
    },

    applyPreset: function (key) {
      var preset = EQ_PRESETS[key];
      if (!preset) return;
      controller.setEffects({ preset: key, eq: preset.eq.slice() });
    },

    setEqBand: function (band, value) {
      var eq = store.get().effects.eq.slice();
      eq[band] = Number(value);
      controller.setEffects({ preset: 'custom', eq: eq });
    },

    resetEffects: function () {
      var effects = defaultEffects();
      store.set({ effects: effects });
      store.set({ smart: Object.assign({}, store.get().smart, { state: "idle", ticks: 0, autoEq: [0,0,0,0,0,0,0,0,0,0], bassOffset: 0 }) });
      savePrefs({ effects: effects });
      pushEffects();
    },

    resetSmart: function () {
      store.set({ smart: Object.assign({}, store.get().smart, { state: "idle", ticks: 0, autoEq: [0,0,0,0,0,0,0,0,0,0], bassOffset: 0 }) });
      pushEffects();
    },

    toggleSpectrum: function () {
      var next = !store.get().spectrumOn;
      store.set({ spectrumOn: next });
      savePrefs({ spectrumOn: next });
    },

    /* ------------------------------------------------------------ window layout */

    setPanelBox: function (box) {
      store.set({ panelBox: box });
      savePrefs({ panelBox: box });
    },

    resetPanelBox: function () {
      store.set({ panelBox: null });
      savePrefs({ panelBox: null });
    },

    setLyricsTranslate: function (on) {
      store.set({ lyricsTranslate: Boolean(on) });
      savePrefs({ lyricsTranslate: Boolean(on) });
    },

    setBgLyrics: function (patch) {
      var next = Object.assign({}, store.get().bgLyrics, patch);
      store.set({ bgLyrics: next });
      savePrefs({ bgLyrics: next });
    },

    toast: toast,
  };

  NT.EQ_PRESETS = EQ_PRESETS;
  NT.LEVELS = LEVELS;
  NT.controller = controller;

  /** `[mm:ss.xx]` tagged lyric file → sorted `{time, text}` entries. */
  NT.parseLyrics = function (raw) {
    if (!raw) return [];
    var out = [];
    var pattern = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
    raw.split(/\r?\n/).forEach(function (line) {
      var stamps = [];
      var match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(line))) {
        var minutes = parseInt(match[1], 10);
        var seconds = parseInt(match[2], 10);
        var fraction = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) / 1000 : 0;
        stamps.push(minutes * 60 + seconds + fraction);
      }
      var text = line.replace(pattern, '').trim();
      if (!stamps.length) return;
      stamps.forEach(function (time) {
        out.push({ time: time, text: text });
      });
    });
    out.sort(function (a, b) {
      return a.time - b.time;
    });
    return out;
  };
})(NT);
