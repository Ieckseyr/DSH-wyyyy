window.__ModuleLoader__.load({
  id: "dsh-wyyyy",
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NT = { React, h };

/* ---- 00-base.js ---- */
/**
 * Shared foundations: the Host API client, a tiny observable store, i18n, icons.
 *
 * Everything here is plain browser JavaScript registered on one `NT` namespace.
 * The build step concatenates the chunks into a single module factory, so each chunk
 * is an IIFE receiving that namespace — no bundler, no imports, no duplicate globals.
 */
(function (NT) {
  'use strict';

  var React = NT.React;
  var h = NT.h;

  var API_BASE = '/netease-music/api';

  /** One JSON command per call; the Host holds the cookie and the `weapi` crypto. */
  NT.api = async function (action, params) {
    var response;
    // A Host reload can drop a request mid-flight; without a deadline the calling view
    // would spin forever instead of showing a failure.
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;
    try {
      response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: action, params: params || {} }),
        signal: controller ? controller.signal : undefined,
      });
    } catch (cause) {
      if (cause && cause.name === 'AbortError') throw new Error('请求超时，请重试');
      var offline = new Error('无法连接本地音乐服务');
      offline.cause = cause;
      throw offline;
    } finally {
      if (timer) clearTimeout(timer);
    }
    var payload = null;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new Error('本地音乐服务返回了非 JSON 响应');
    }
    if (!payload || payload.ok !== true) {
      var error = new Error((payload && payload.error) || '请求失败 ' + response.status);
      error.code = payload && payload.code;
      throw error;
    }
    return payload.data;
  };

  /** Stream URL for the `<audio>` element; same-origin so Web Audio can process it. */
  NT.audioUrl = function (id, level) {
    return '/netease-music/audio?id=' + encodeURIComponent(id) + '&level=' + encodeURIComponent(level || 'exhigh');
  };

  NT.cls = function () {
    var out = [];
    for (var i = 0; i < arguments.length; i++) {
      var part = arguments[i];
      if (part) out.push(part);
    }
    return out.join(' ');
  };

  /** mm:ss */
  NT.duration = function (ms) {
    var total = Math.max(0, Math.round((ms || 0) / 1000));
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  };

  NT.playCount = function (count) {
    var n = Number(count) || 0;
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return String(n);
  };

  NT.artistLine = function (song) {
    return (song && song.artists ? song.artists.join(' / ') : '') || '未知歌手';
  };

  /* ---------------------------------------------------------------- preferences */

  var PREF_KEY = 'dsh-netease-music.prefs';

  NT.readPrefs = function () {
    try {
      var raw = window.localStorage.getItem(PREF_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  };

  NT.writePrefs = function (patch) {
    try {
      var next = Object.assign({}, NT.readPrefs(), patch);
      window.localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    } catch (error) {
      return NT.readPrefs();
    }
  };

  /* ------------------------------------------------------------------- i18n */

  var DICT = {
    zh: {
      title: '网易云音乐',
      open: '打开网易云音乐',
      close: '收起',
      tab_search: '搜索',
      tab_roam: '漫游',
      tab_playlists: '歌单',
      tab_mine: '我的',
      search_placeholder: '搜索歌曲、歌单、歌手',
      search_empty: '输入关键词开始搜索',
      login_title: '登录网易云音乐',
      login_qr: '扫码登录',
      login_phone: '手机号登录',
      login_cookie: '导入 Cookie',
      login_scan_hint: '用网易云音乐 App 扫一扫',
      login_waiting: '等待扫码…',
      login_scanned: '已扫码，请在手机上确认',
      login_expired: '二维码已过期，点击刷新',
      login_success: '登录成功',
      login_refresh: '刷新二维码',
      login_later: '先随便听听',
      phone: '手机号',
      password: '密码',
      cookie_hint: '在浏览器登录 music.163.com 后，从开发者工具复制 Cookie（需包含 MUSIC_U）',
      login_submit: '登录',
      logout: '退出登录',
      play_all: '播放全部',
      play: '播放',
      pause: '暂停',
      next: '下一首',
      prev: '上一首',
      like: '喜欢',
      liked: '已喜欢',
      add_to_playlist: '收藏到歌单',
      new_playlist: '新建歌单',
      playlist_name: '歌单名称',
      create: '创建',
      cancel: '取消',
      confirm: '确定',
      loading: '加载中…',
      empty_playlist: '这个歌单还没有歌曲',
      empty_list: '暂无内容',
      my_playlists: '我创建的歌单',
      collected_playlists: '我收藏的歌单',
      liked_songs: '我喜欢的音乐',
      daily_roam: '私人漫游',
      roam_refresh: '换一批',
      roam_hint: '根据你的口味持续推荐',
      login_needed: '登录后可用',
      quality: '音质',
      effects: '音效',
      settings: '设置',
      lyrics: '歌词',
      no_lyrics: '暂无歌词',
      volume: '音量',
      mode_order: '顺序播放',
      mode_single: '单曲循环',
      mode_shuffle: '随机播放',
      added: '已收藏',
      add_failed: '收藏失败',
      removed: '已移除',
      play_failed: '这首暂时不能播放',
      load_failed: '加载失败',
      account_vip: '黑胶 VIP',
      tab_settings: '设置',
      eq_preset: '均衡器',
      eq_custom: '自定义',
      bass: '低音增强',
      treble: '高音增强',
      width: '立体声宽度',
      reverb: '空间混响',
      rate: '播放速度',
      normalizer: '音量均衡',
      reset: '重置',
      premium_needed: '该音质需要黑胶 VIP',
      back: '返回',
      more: '更多',
      play_next: '下一首播放',
      add_queue: '添加到播放列表',
      copy_link: '复制歌曲链接',
      copied: '已复制',
      hot_playlists: '热门歌单',
      songs_unit: '首',
      tracks: '歌曲',
      artist: '歌手',
      album: '专辑',
      search_all: '综合',
      now_playing: '未在播放',
      pick_song: '选一首歌开始',
      daily: '每日推荐',
      my_music: '我的音乐',
      remove: '移除',
      clear: '清空',
      spectrum: '频谱条',
      spectrum_desc: '在播放条上显示实时频谱',
      on: '开',
      off: '关',
      login_sync_hint: '登录后可同步歌单、喜欢与私人漫游',
      login_sub_hint: '登录后可用歌单、收藏与私人漫游',
      artist_albums: '{n} 张专辑',
      view_songs: '查看单曲',
      view: '查看',
      create_failed: '创建失败',
      eq_desc: '10 段均衡器',
      bass_desc: '低频搁架 · 105Hz',
      treble_desc: '高频搁架 · 9.8kHz',
      width_desc: '中侧扩展',
      reverb_desc: '卷积混响',
      rate_desc: '不变调',
      vip_ok: '当前账号支持高音质',
      sign_in: '登录',
      filter_song: '单曲',
      filter_playlist: '歌单',
      filter_artist: '歌手',
      filter_album: '专辑',
      plays: '次播放',
      buffering: '缓冲中…',
      drag_hint: '拖动标题栏移动 · 双击复位 · 左/下边缘调整大小',
      window: '窗口',
      panel_pos: '面板位置',
      panel_pos_custom: '已自定义，可拖动',
      panel_pos_docked: '默认停靠右侧',
      balance: '左右平衡',
      balance_desc: '声道偏移',
      center: '居中',
      bypass_on: '旁通：关',
      bypass_off: '旁通：开',
      fx_mono: '单声道',
      fx_mono_desc: '合并左右声道',
      fx_vocal: '人声消除',
      fx_vocal_desc: '中置相位抵消，留下伴奏',
      fx_dynamics: '动态压缩',
      fx_dynamics_desc: '压住峰值，避免削波',
      fx_normalize: '音量均衡',
      fx_normalize_desc: '自动补偿每首的响度差',
      bg_lyrics: '背景歌词',
      bg_lyrics_on: '显示背景歌词',
      bg_lyrics_desc: '叠在壁纸层，随播放滚动',
      bg_opacity: '不透明度',
      bg_size: '字号',
      bg_position: '垂直位置',
      bg_offset_x: '水平位置',
      typography: '排版',
      lyrics_align: '对齐',
      align_left: '左',
      align_center: '中',
      align_right: '右',
      lyrics_line_height: '行距',
      lyrics_weight: '字重',
      weight_regular: '常规',
      weight_medium: '中粗',
      weight_bold: '粗',
      weight_black: '特粗',
      lyrics_translate: '歌词翻译',
      lyrics_translate_desc: '有翻译时在原文下方显示',
      pos_top: '上方',
      pos_center: '居中',
      pos_bottom: '下方',
      roam_removed: '已从漫游移除',
      roam_refill_hint: '播到末尾会自动补十首',
      not_interested: '不感兴趣',
      quality_effects: '音质与音效',
      open_settings: '打开完整设置',
      smart: '智能音效',
      smart_eq: '自动均衡',
      smart_eq_desc: '分析当前响度，自动拉平十个频段',
      smart_eq_ready: '已校准',
      smart_eq_learning: '校准中…',
      recalibrate: '重新校准',
      smart_bass: '智能低音',
      smart_bass_desc: '低频偏薄时自动补一点点',
      crossfeed: '耳机空间',
      crossfeed_desc: '左右轻微互馈，久听不累',
      crossfeed_amount: '互馈量',
      mute: '点击静音',
      unmute: '恢复声音',
      quality_fallback: '该音质不可用，已降到 {level}',
      trial_only: '会员专享，正在试听',
    },
    en: {
      title: 'NetEase Cloud Music',
      open: 'Open NetEase Cloud Music',
      close: 'Collapse',
      tab_search: 'Search',
      tab_roam: 'Roam',
      tab_playlists: 'Playlists',
      tab_mine: 'Mine',
      search_placeholder: 'Search songs, playlists, artists',
      search_empty: 'Type to search',
      login_title: 'Sign in to NetEase Cloud Music',
      login_qr: 'QR code',
      login_phone: 'Phone',
      login_cookie: 'Cookie',
      login_scan_hint: 'Scan with the NetEase Cloud Music app',
      login_waiting: 'Waiting for scan…',
      login_scanned: 'Scanned — confirm on your phone',
      login_expired: 'Code expired, tap to refresh',
      login_success: 'Signed in',
      login_refresh: 'Refresh code',
      login_later: 'Just let me listen',
      phone: 'Phone number',
      password: 'Password',
      cookie_hint: 'Copy the Cookie header from a signed-in music.163.com session (must include MUSIC_U)',
      login_submit: 'Sign in',
      logout: 'Sign out',
      play_all: 'Play all',
      play: 'Play',
      pause: 'Pause',
      next: 'Next',
      prev: 'Previous',
      like: 'Like',
      liked: 'Liked',
      add_to_playlist: 'Add to playlist',
      new_playlist: 'New playlist',
      playlist_name: 'Playlist name',
      create: 'Create',
      cancel: 'Cancel',
      confirm: 'OK',
      loading: 'Loading…',
      empty_playlist: 'This playlist is empty',
      empty_list: 'Nothing here yet',
      my_playlists: 'Created by me',
      collected_playlists: 'Saved playlists',
      liked_songs: 'Liked songs',
      daily_roam: 'Private roam',
      roam_refresh: 'Refresh',
      roam_hint: 'Endless picks tuned to your taste',
      login_needed: 'Sign in to use this',
      quality: 'Quality',
      effects: 'Effects',
      settings: 'Settings',
      lyrics: 'Lyrics',
      no_lyrics: 'No lyrics',
      volume: 'Volume',
      mode_order: 'In order',
      mode_single: 'Repeat one',
      mode_shuffle: 'Shuffle',
      added: 'Saved',
      add_failed: 'Could not save',
      removed: 'Removed',
      play_failed: 'This track cannot play right now',
      load_failed: 'Failed to load',
      account_vip: 'Vinyl VIP',
      tab_settings: 'Settings',
      eq_preset: 'Equaliser',
      eq_custom: 'Custom',
      bass: 'Bass boost',
      treble: 'Treble',
      width: 'Stereo width',
      reverb: 'Reverb',
      rate: 'Speed',
      normalizer: 'Volume levelling',
      reset: 'Reset',
      premium_needed: 'This quality needs Vinyl VIP',
      back: 'Back',
      more: 'More',
      play_next: 'Play next',
      add_queue: 'Add to queue',
      copy_link: 'Copy song link',
      copied: 'Copied',
      hot_playlists: 'Hot playlists',
      songs_unit: 'tracks',
      tracks: 'Tracks',
      artist: 'Artists',
      album: 'Albums',
      search_all: 'All',
      now_playing: 'Nothing playing',
      pick_song: 'Pick a track to start',
      daily: 'Daily mixes',
      my_music: 'My music',
      remove: 'Remove',
      clear: 'Clear',
      spectrum: 'Spectrum',
      spectrum_desc: 'Live bars on the play bar',
      on: 'On',
      off: 'Off',
      login_sync_hint: 'Sign in to sync playlists, likes and private roam',
      login_sub_hint: 'Playlists, likes and private roam need an account',
      artist_albums: '{n} albums',
      view_songs: 'Show songs',
      view: 'View',
      create_failed: 'Could not create',
      eq_desc: '10-band equaliser',
      bass_desc: 'Low shelf · 105Hz',
      treble_desc: 'High shelf · 9.8kHz',
      width_desc: 'Mid/side widening',
      reverb_desc: 'Convolution reverb',
      rate_desc: 'Keeps pitch',
      vip_ok: 'This account supports high quality',
      sign_in: 'Sign in',
      filter_song: 'Songs',
      filter_playlist: 'Playlists',
      filter_artist: 'Artists',
      filter_album: 'Albums',
      plays: 'plays',
      buffering: 'buffering…',
      drag_hint: 'Drag the title bar to move · double-click to reset · drag the left or bottom edge to resize',
      window: 'Window',
      panel_pos: 'Panel position',
      panel_pos_custom: 'Customised — draggable',
      panel_pos_docked: 'Docked right by default',
      balance: 'Balance',
      balance_desc: 'Channel offset',
      center: 'centre',
      bypass_on: 'Bypass: off',
      bypass_off: 'Bypass: on',
      fx_mono: 'Mono',
      fx_mono_desc: 'Merge both channels',
      fx_vocal: 'Vocal removal',
      fx_vocal_desc: 'Centre phase cancellation, leaves the backing track',
      fx_dynamics: 'Dynamics',
      fx_dynamics_desc: 'Peak limiting without clipping',
      fx_normalize: 'Volume levelling',
      fx_normalize_desc: 'Evens out loudness between tracks',
      bg_lyrics: 'Background lyrics',
      bg_lyrics_on: 'Show background lyrics',
      bg_lyrics_desc: 'Painted behind the UI, over the wallpaper',
      bg_opacity: 'Opacity',
      bg_size: 'Size',
      bg_position: 'Vertical position',
      bg_offset_x: 'Horizontal position',
      typography: 'Typography',
      lyrics_align: 'Align',
      align_left: 'Left',
      align_center: 'Center',
      align_right: 'Right',
      lyrics_line_height: 'Line height',
      lyrics_weight: 'Weight',
      weight_regular: 'Regular',
      weight_medium: 'Medium',
      weight_bold: 'Bold',
      weight_black: 'Black',
      lyrics_translate: 'Lyric translation',
      lyrics_translate_desc: 'Show the translation under each line',
      pos_top: 'Top',
      pos_center: 'Middle',
      pos_bottom: 'Bottom',
      roam_removed: 'Removed from roam',
      roam_refill_hint: 'Ten more tracks load automatically near the end',
      not_interested: 'Not interested',
      quality_effects: 'Quality and effects',
      open_settings: 'Open full settings',
      smart: 'Smart effects',
      smart_eq: 'Auto EQ',
      smart_eq_desc: 'Measures the mix and flattens the ten bands',
      smart_eq_ready: 'Calibrated',
      smart_eq_learning: 'Calibrating…',
      recalibrate: 'Recalibrate',
      smart_bass: 'Adaptive bass',
      smart_bass_desc: 'Adds low end only when it measures thin',
      crossfeed: 'Headphone crossfeed',
      crossfeed_desc: 'Bleeds channels slightly; less tiring over time',
      crossfeed_amount: 'Crossfeed',
      mute: 'Click to mute',
      unmute: 'Unmute',
      quality_fallback: 'That tier is locked, dropped to {level}',
      trial_only: 'Members only — playing the preview',
    },
  };

  var locale = 'zh';

  NT.initLocale = function (ctx) {
    try {
      var service = ctx && ctx.get ? ctx.get('locale') : null;
      if (!service || typeof service.getLocale !== 'function') return;
      var snapshot = service.getLocale();
      var id = String((snapshot && (snapshot.id || snapshot.locale || snapshot.language)) || '');
      if (id) locale = id.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
      if (typeof service.subscribe === 'function') {
        service.subscribe(function () {
          var next = service.getLocale();
          var nextId = String((next && (next.id || next.locale || next.language)) || '');
          locale = nextId.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
        });
      }
    } catch (error) {
      /* locale is a nicety: an unexpected shape must not break the panel */
    }
  };

  NT.t = function (key, vars) {
    var table = DICT[locale] || DICT.zh;
    var text = table[key] || DICT.zh[key] || key;
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, function (match, name) {
        return vars[name] == null ? match : String(vars[name]);
      });
    }
    return text;
  };

  /** Quality tiers carry a translated label plus a technical note. */
  NT.levelName = function (item) {
    if (!item) return '';
    return locale === 'en' && item.nameEn ? item.nameEn : item.name;
  };

  /** 1000 → "1k", 16000 → "16k" for equaliser band labels. */
  NT.freqLabel = function (hz) {
    var value = Number(hz) || 0;
    return value >= 1000 ? value / 1000 + 'k' : String(value);
  };

  /* ---------------------------------------------------------------- store */

  /**
   * Minimal observable store. `set` always produces a new snapshot and notifies
   * subscribers once per microtask: several `set` calls inside one handler (start
   * buffering, record the URL, reset the lyric cursor) collapse into a single React pass.
   */
  NT.createStore = function (initial) {
    var state = initial;
    var listeners = new Set();
    var scheduled = false;
    var notify = function () {
      scheduled = false;
      listeners.forEach(function (listener) {
        listener();
      });
    };
    return {
      get: function () {
        return state;
      },
      set: function (patch) {
        var next = typeof patch === 'function' ? patch(state) : Object.assign({}, state, patch);
        if (next === state) return;
        state = next;
        if (scheduled) return;
        scheduled = true;
        if (typeof queueMicrotask === 'function') queueMicrotask(notify);
        else Promise.resolve().then(notify);
      },
      subscribe: function (listener) {
        listeners.add(listener);
        return function () {
          listeners.delete(listener);
        };
      },
    };
  };

  NT.useStore = function (store, selector) {
    var pick = selector || function (value) {
      return value;
    };
    var pickRef = React.useRef(pick);
    pickRef.current = pick;
    var pair = React.useState(function () {
      return pickRef.current(store.get());
    });
    var value = pair[0];
    var setValue = pair[1];
    React.useEffect(function () {
      var update = function () {
        setValue(pickRef.current(store.get()));
      };
      update();
      return store.subscribe(update);
    }, [store]);
    return value;
  };

  /* ------------------------------------------------------------------ icons */

  var PATHS = {
    note: ['M9 18V5l12-2v13', 'circle:6,18,3', 'circle:18,16,3'],
    play: ['fill:M8 5l11 7-11 7z'],
    pause: ['fill:M7 5h4v14H7z', 'fill:M13 5h4v14h-4z'],
    prev: ['fill:M18 6l-9 6 9 6z', 'M6 5v14'],
    next: ['fill:M6 6l9 6-9 6z', 'M18 5v14'],
    heart: ['M20.8 5.6a5.4 5.4 0 0 0-7.7 0L12 6.7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7l1.1 1.1 7.7 7.7 7.7-7.7 1.1-1.1a5.4 5.4 0 0 0 0-7.7z'],
    heartFill: ['fill:M20.8 5.6a5.4 5.4 0 0 0-7.7 0L12 6.7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7l1.1 1.1 7.7 7.7 7.7-7.7 1.1-1.1a5.4 5.4 0 0 0 0-7.7z'],
    search: ['circle:11,11,7', 'M20 20l-3.6-3.6'],
    close: ['M18 6L6 18', 'M6 6l12 12'],
    repeat: ['M17 2l4 4-4 4', 'M3 11V9a4 4 0 0 1 4-4h14', 'M7 22l-4-4 4-4', 'M21 13v2a4 4 0 0 1-4 4H3'],
    repeatOne: ['M17 2l4 4-4 4', 'M3 11V9a4 4 0 0 1 4-4h14', 'M7 22l-4-4 4-4', 'M21 13v2a4 4 0 0 1-4 4H3', 'M11 10h1v5'],
    shuffle: ['M16 3h5v5', 'M4 20L21 3', 'M21 16v5h-5', 'M15 15l6 6', 'M4 4l5 5'],
    volume: ['M11 5L6 9H2v6h4l5 4z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M18.5 5.5a9 9 0 0 1 0 13'],
    volumeMute: ['M11 5L6 9H2v6h4l5 4z', 'M22 9l-6 6', 'M16 9l6 6'],
    sliders: ['M4 21v-6', 'M4 11V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-4', 'M20 13V3', 'M1 15h6', 'M9 8h6', 'M17 17h6'],
    plus: ['M12 5v14', 'M5 12h14'],
    check: ['M20 6L9 17l-5-5'],
    chevronLeft: ['M15 18l-6-6 6-6'],
    chevronRight: ['M9 6l6 6-6 6'],
    chevronDown: ['M6 9l6 6 6-6'],
    more: ['circle:5,12,1.4', 'circle:12,12,1.4', 'circle:19,12,1.4'],
    user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'circle:12,7,4'],
    compass: ['circle:12,12,9', 'M16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3z'],
    list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
    listMusic: ['M9 18V5l12-2v13', 'circle:6,18,3', 'circle:18,16,3'],
    refresh: ['M21 3v6h-6', 'M3 21v-6h6', 'M20 12a8 8 0 0 1-13.7 5.7L3 15', 'M4 12a8 8 0 0 1 13.7-5.7L21 9'],
    disc: ['circle:12,12,9', 'circle:12,12,2.6'],
    lyrics: ['M4 5h16', 'M4 10h10', 'M4 15h13', 'M4 20h7'],
    cloud: ['M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.6A3.5 3.5 0 0 0 6 19z'],
    musicNote: ['M9 18V5l12-2v13'],
    logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  };

  function pathElement(spec, key) {
    if (spec.indexOf('circle:') === 0) {
      var parts = spec.slice(7).split(',');
      return h('circle', { key: key, cx: parts[0], cy: parts[1], r: parts[2], fill: 'currentColor', stroke: 'none' });
    }
    if (spec.indexOf('fill:') === 0) {
      return h('path', { key: key, d: spec.slice(5), fill: 'currentColor', stroke: 'none' });
    }
    return h('path', { key: key, d: spec });
  }

  NT.Icon = function Icon(props) {
    var specs = PATHS[props.name] || PATHS.note;
    var children = specs.map(pathElement);
    return h(
      'svg',
      {
        viewBox: '0 0 24 24',
        width: props.size || 16,
        height: props.size || 16,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: props.stroke || 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        className: props.className,
        style: props.style,
      },
      children,
    );
  };

  /** Round icon button matching the host header's own controls. */
  NT.IconButton = function IconButton(props) {
    return h(
      'button',
      {
        type: 'button',
        title: props.title,
        'aria-label': props.title,
        'aria-pressed': props.pressed,
        className: NT.cls('ntm-iconbtn', props.className, props.active && 'is-active', props.disabled && 'is-disabled'),
        disabled: props.disabled,
        onClick: props.onClick,
        style: props.style,
      },
      h(NT.Icon, { name: props.name, size: props.size || 16, stroke: props.stroke }),
    );
  };

  /* --------------------------------------------------------------- small ui */

  NT.Spinner = function Spinner() {
    return h('span', { className: 'ntm-spinner', 'aria-hidden': 'true' });
  };

  NT.Empty = function Empty(props) {
    return h('div', { className: 'ntm-empty' }, h(NT.Icon, { name: props.icon || 'note', size: 22 }), h('span', null, props.text));
  };

  NT.Cover = function Cover(props) {
    var size = props.size || 40;
    var radius = props.radius == null ? 6 : props.radius;
    if (!props.src) {
      return h(
        'div',
        {
          className: 'ntm-cover ntm-cover-empty',
          style: { width: size, height: size, borderRadius: radius },
        },
        h(NT.Icon, { name: 'note', size: Math.round(size * 0.42) }),
      );
    }
    return h('img', {
      className: 'ntm-cover',
      src: props.src + '?param=' + size + 'y' + size,
      width: size,
      height: size,
      style: { width: size, height: size, borderRadius: radius },
      alt: '',
      loading: 'lazy',
      draggable: false,
    });
  };

  NT.Toast = function Toast(props) {
    if (!props.text) return null;
    return h('div', { className: 'ntm-toast', role: 'status' }, props.text);
  };
})(NT);

/* ---- 05-css.js ---- */
(function (NT) {
  'use strict';

  /**
   * One stylesheet for the whole plugin.
   *
   * Two rules drive most of it:
   *  · Surfaces use `--dsw-alias-bg-layer-1`, which the wallpaper plugin rewrites to an
   *    opaque colour. `--dsw-alias-bg-overlay` stays translucent there, and a translucent
   *    panel over a wallpaper is unreadable — the app's own text behind it shows through.
   *  · Nested surfaces are tinted from the label colour instead of a second theme token,
   *    so a hovered row reads correctly in both light and dark themes.
   */
  NT.CSS = `
.ntm-root {
  --ntm-surface: var(--dsw-alias-bg-layer-1);
  --ntm-raised: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-layer-1));
  --ntm-sunken: color-mix(in srgb, var(--dsw-alias-label-primary) 4%, var(--dsw-alias-bg-layer-1));
  --ntm-hairline: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent);
  pointer-events: none;
}
.ntm-root > * { pointer-events: auto; }

.ntm-panel {
  --ntm-gap: 10px;
  --ntm-radius: 10px;
  position: fixed;
  /* Two things own the top of the window: the desktop shell's title bar (40px, with the
     native window buttons in its top-right corner) and the session header below it.
     The shell header paints above this overlay, so the panel starts under both. */
  top: calc(var(--dsh-windows-titlebar-height, 0px) + 48px);
  right: 8px;
  bottom: 10px;
  z-index: 2000;
  width: min(420px, calc(100vw - 24px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid var(--ntm-hairline);
  background: var(--ntm-surface);
  /* The wallpaper plugin keeps the layer tokens slightly translucent; without the frost
     the wallpaper art shows straight through the song titles. */
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  box-shadow: 0 24px 60px rgba(0, 0, 0, .32), 0 2px 8px rgba(0, 0, 0, .16);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.45;
  transform: translateX(calc(100% + 24px));
  opacity: 0;
  transition: transform .3s cubic-bezier(.22, .61, .36, 1), opacity .22s ease;
  -webkit-font-smoothing: antialiased;
}
.ntm-panel.is-open { transform: translateX(0); opacity: 1; }
.ntm-panel.is-floating { transform: none; }
.ntm-panel.is-floating:not(.is-open) { transform: scale(.98); opacity: 0; pointer-events: none; }
.ntm-panel, .ntm-panel * { box-sizing: border-box; }
.ntm-panel button { font-family: inherit; }

/* Resize grips, revealed on hover. */
.ntm-grip { position: absolute; z-index: 3; opacity: 0; transition: opacity .15s ease, background .15s ease; }
.ntm-panel:hover .ntm-grip { opacity: 1; }
.ntm-grip.is-w { left: 0; top: 14px; bottom: 14px; width: 6px; cursor: ew-resize; }
.ntm-grip.is-s { left: 14px; right: 14px; bottom: 0; height: 6px; cursor: ns-resize; }
.ntm-grip.is-sw { left: 0; bottom: 0; width: 16px; height: 16px; cursor: nesw-resize; }
.ntm-grip:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent); border-radius: 3px; }

/* ---------------------------------------------------------------- trigger */
.ntm-trigger {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; padding: 0; border: none; border-radius: 7px;
  background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.ntm-trigger:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.ntm-trigger.is-open { color: var(--dsw-alias-brand-primary); }
.ntm-float-trigger {
  position: fixed; top: calc(var(--dsh-windows-titlebar-height, 0px) + 10px); right: 14px; z-index: 41;
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0; border-radius: 9px;
  border: 1px solid var(--ntm-hairline, rgba(128,128,128,.25));
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary);
  cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.14);
}
.ntm-float-trigger:hover { color: var(--dsw-alias-label-primary); }

/* ----------------------------------------------------------------- header */
.ntm-head {
  flex: none; display: flex; align-items: center; gap: 8px;
  height: 46px; padding: 0 10px 0 14px;
  border-bottom: 1px solid var(--ntm-hairline);
}
.ntm-head-title { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.ntm-head-name { font-size: 13.5px; font-weight: 600; letter-spacing: .01em; white-space: nowrap; }
.ntm-head-user { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
.ntm-mark {
  width: 22px; height: 22px; border-radius: 7px; flex: none; align-self: center;
  display: inline-flex; align-items: center; justify-content: center; color: #fff;
  background: linear-gradient(145deg, #ff5d6c, #c9162b);
  box-shadow: 0 1px 3px rgba(201, 22, 43, .35);
}
.ntm-head-spacer { flex: 1; }
.ntm-head-actions { display: flex; align-items: center; gap: 2px; }
.ntm-head-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; border: none; border-radius: 8px;
  background: transparent; cursor: pointer; color: var(--dsw-alias-label-tertiary);
  transition: background .15s ease, color .15s ease;
}
.ntm-head-btn:hover { background: var(--ntm-raised); color: var(--dsw-alias-label-primary); }
.ntm-head-signin {
  border: none; background: transparent; cursor: pointer; padding: 3px 6px; border-radius: 6px;
  color: var(--dsw-alias-brand-primary); font-size: 12px;
}
.ntm-head-signin:hover { background: var(--ntm-raised); }

/* ------------------------------------------------------------------- tabs */
.ntm-tabs {
  flex: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px;
  margin: 10px 12px 8px; padding: 3px; border-radius: 10px; background: var(--ntm-sunken);
}
.ntm-tab {
  border: none; background: transparent; cursor: pointer; height: 28px; border-radius: 8px;
  color: var(--dsw-alias-label-tertiary); font-size: 12.5px; letter-spacing: .02em;
  transition: background .15s ease, color .15s ease;
}
.ntm-tab:hover { color: var(--dsw-alias-label-secondary); }
.ntm-tab.is-active {
  background: var(--ntm-surface); color: var(--dsw-alias-label-primary); font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .14);
}

/* ------------------------------------------------------------------- body */
.ntm-body {
  flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
  overscroll-behavior: contain; padding: 2px 8px 16px;
  scrollbar-width: thin;
}
.ntm-body::-webkit-scrollbar { width: 9px; }
.ntm-body::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);
  border-radius: 9px; border: 2px solid transparent; background-clip: content-box;
}
.ntm-body::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 28%, transparent); background-clip: content-box; }
.ntm-body::-webkit-scrollbar-track { background: transparent; }

/* ---------------------------------------------------------------- section */
.ntm-section {
  display: flex; align-items: baseline; gap: 6px;
  padding: 14px 8px 6px; font-size: 11.5px; letter-spacing: .04em;
  color: var(--dsw-alias-label-tertiary); text-transform: uppercase;
}
.ntm-section-count { opacity: .65; }
.ntm-section-action {
  margin-left: auto; border: none; background: none; padding: 2px 4px; border-radius: 6px;
  color: var(--dsw-alias-brand-primary); font-size: 11.5px; letter-spacing: 0; cursor: pointer;
  text-transform: none;
}
.ntm-section-action:hover { background: var(--ntm-raised); }

/* ------------------------------------------------------------------- rows */
.ntm-row {
  position: relative; display: flex; align-items: center; gap: 10px;
  min-height: 48px; padding: 5px 8px; border-radius: var(--ntm-radius);
  transition: background .12s ease;
}
.ntm-row.is-clickable { cursor: pointer; }
.ntm-row:hover { background: var(--ntm-raised); }
.ntm-row.is-current { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent); }
.ntm-row.is-current .ntm-row-title { color: var(--dsw-alias-brand-primary); }
.ntm-row-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
.ntm-row-title { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ntm-row-sub { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ntm-row-index {
  width: 16px; flex: none; text-align: right; font-size: 11px;
  color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums;
}
.ntm-row-actions { display: flex; align-items: center; gap: 0; flex: none; opacity: 0; transition: opacity .12s ease; }
.ntm-row:hover .ntm-row-actions,
.ntm-row.is-current .ntm-row-actions,
.ntm-row:focus-within .ntm-row-actions { opacity: 1; }
.ntm-row-trail { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }

.ntm-cover { object-fit: cover; flex: none; background: var(--ntm-sunken); display: block; }
.ntm-cover-empty {
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--dsw-alias-label-tertiary);
  background: linear-gradient(150deg, var(--ntm-raised), var(--ntm-sunken));
}

/* ------------------------------------------------------------------ icons */
.ntm-iconbtn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; padding: 0; border: none; border-radius: 7px;
  background: transparent; cursor: pointer; color: var(--dsw-alias-label-tertiary); flex: none;
  transition: background .12s ease, color .12s ease;
}
.ntm-iconbtn:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent); color: var(--dsw-alias-label-primary); }
.ntm-iconbtn.is-active { color: var(--dsw-alias-brand-primary); }
.ntm-iconbtn.is-disabled { opacity: .35; pointer-events: none; }
.ntm-panel button:focus-visible,
.ntm-panel [role="tab"]:focus-visible,
.ntm-panel .ntm-track:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.ntm-panel .ntm-input:focus-visible,
.ntm-panel .ntm-textarea:focus-visible,
.ntm-panel .ntm-select:focus-visible { outline: none; }

/* ------------------------------------------------------------------ cards */
.ntm-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 2px 6px 6px; }
.ntm-card {
  border-radius: 12px; overflow: hidden; cursor: pointer;
  background: var(--ntm-sunken); transition: transform .15s ease, box-shadow .15s ease;
}
.ntm-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0, 0, 0, .18); }
.ntm-card-art { position: relative; aspect-ratio: 1 / 1; }
.ntm-card-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ntm-card-fallback {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  color: var(--dsw-alias-label-tertiary); background: var(--ntm-raised);
}
.ntm-card-play {
  position: absolute; right: 8px; bottom: 8px; width: 28px; height: 28px; padding: 0;
  border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center;
  justify-content: center; background: rgba(0, 0, 0, .55); color: #fff;
  opacity: 0; transform: translateY(3px); transition: opacity .15s ease, transform .15s ease;
  backdrop-filter: blur(6px);
}
.ntm-card:hover .ntm-card-play { opacity: 1; transform: translateY(0); }
.ntm-card-body { padding: 8px 9px 10px; }
.ntm-card-title { font-size: 12.5px; line-height: 1.35; height: 2.7em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ntm-card-sub { margin-top: 4px; font-size: 11px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ----------------------------------------------------------------- inputs */
.ntm-input, .ntm-textarea, .ntm-select {
  width: 100%; padding: 7px 10px; font-family: inherit; font-size: 12.5px;
  color: var(--dsw-alias-label-primary); border-radius: 9px; outline: none;
  border: 1px solid var(--ntm-hairline); background: var(--ntm-sunken);
  transition: border-color .15s ease, background .15s ease;
}
.ntm-input::placeholder, .ntm-textarea::placeholder { color: var(--dsw-alias-label-tertiary); }
.ntm-input:focus, .ntm-textarea:focus, .ntm-select:focus {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--ntm-surface);
}
.ntm-textarea {
  resize: vertical; min-height: 74px; line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px;
}
.ntm-select { appearance: none; cursor: pointer; padding-right: 26px;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 15px) 14px, calc(100% - 10px) 14px;
  background-size: 5px 5px, 5px 5px; background-repeat: no-repeat;
}

.ntm-searchbar { position: relative; padding: 6px 6px 8px; }
.ntm-searchbar .ntm-input { height: 34px; padding-left: 32px; padding-right: 30px; border-radius: 10px; }
.ntm-searchbar-icon { position: absolute; left: 16px; top: 16px; color: var(--dsw-alias-label-tertiary); pointer-events: none; display: flex; }
.ntm-searchbar-clear { position: absolute; right: 12px; top: 10px; width: 24px; height: 24px; }

.ntm-filters { display: flex; gap: 6px; padding: 0 6px 10px; flex-wrap: wrap; }
.ntm-chip {
  border: 1px solid var(--ntm-hairline); background: transparent; color: var(--dsw-alias-label-secondary);
  border-radius: 999px; padding: 3px 11px; font-size: 11.5px; cursor: pointer;
  transition: border-color .15s ease, color .15s ease, background .15s ease;
}
.ntm-chip:hover { background: var(--ntm-raised); }
.ntm-chip.is-active {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);
  color: var(--dsw-alias-brand-primary);
}

.ntm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 7px 14px; border-radius: 9px; cursor: pointer; font-size: 12.5px; white-space: nowrap;
  border: 1px solid var(--ntm-hairline); background: var(--ntm-raised); color: var(--dsw-alias-label-primary);
  transition: filter .15s ease, border-color .15s ease, background .15s ease;
}
.ntm-btn:hover { border-color: color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent); }
.ntm-btn.is-primary { border-color: transparent; background: var(--dsw-alias-brand-primary); color: #fff; }
.ntm-btn.is-primary:hover { filter: brightness(1.07); }
.ntm-btn.is-ghost { background: transparent; border-color: transparent; }
.ntm-btn.is-ghost:hover { background: var(--ntm-raised); }
.ntm-btn.is-block { width: 100%; }
.ntm-btn:disabled { opacity: .5; cursor: default; filter: none; }

.ntm-form { display: flex; flex-direction: column; gap: 8px; padding: 0 6px; }
.ntm-field { display: flex; flex-direction: column; gap: 6px; padding: 6px; }
.ntm-field-label { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }

/* ------------------------------------------------------------------ login */
.ntm-login { display: flex; flex-direction: column; gap: 14px; padding: 6px 6px 24px; }
.ntm-login-hero { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 8px 4px; text-align: center; }
.ntm-login-title { font-size: 14px; font-weight: 600; }
.ntm-login-sub { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); line-height: 1.6; }
.ntm-segmented { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 3px; border-radius: 10px; background: var(--ntm-sunken); }
.ntm-segmented button {
  border: none; background: transparent; color: var(--dsw-alias-label-tertiary);
  height: 28px; border-radius: 8px; font-size: 12px; cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.ntm-segmented button.is-active { background: var(--ntm-surface); color: var(--dsw-alias-label-primary); box-shadow: 0 1px 3px rgba(0,0,0,.14); }

.ntm-qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.ntm-qr {
  position: relative; width: 176px; height: 176px; padding: 10px; border-radius: 14px;
  background: #fff; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,.16);
}
.ntm-qr svg { width: 100%; height: 100%; display: block; }
.ntm-qr-mask {
  position: absolute; inset: 0; border-radius: 14px; padding: 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  background: rgba(255,255,255,.94); color: #333; font-size: 12px; text-align: center;
}
.ntm-qr-state { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); min-height: 17px; }

/* ----------------------------------------------------------------- player */
.ntm-player {
  flex: none; padding: 10px 12px 12px; border-top: 1px solid var(--ntm-hairline);
  background: var(--ntm-sunken);
}
.ntm-now { display: flex; align-items: center; gap: 10px; }
.ntm-now-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
.ntm-now-title { font-size: 12.8px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ntm-now-sub { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ntm-now-actions { display: flex; align-items: center; gap: 1px; flex: none; }

.ntm-progress { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.ntm-time {
  width: 32px; flex: none; font-size: 10.5px; color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.ntm-time.is-right { text-align: right; }
.ntm-track { position: relative; flex: 1; height: 16px; display: flex; align-items: center; cursor: pointer; touch-action: none; }
.ntm-track::before {
  content: ''; position: absolute; left: 0; right: 0; height: 3px; border-radius: 3px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);
}
.ntm-track-fill {
  position: absolute; left: 0; height: 3px; border-radius: 3px;
  background: var(--dsw-alias-label-primary);
}
.ntm-track-knob {
  position: absolute; width: 10px; height: 10px; border-radius: 50%;
  background: var(--dsw-alias-label-primary); transform: translateX(-50%);
  opacity: 0; transition: opacity .12s ease;
}
/* The knob is a drag affordance: it only appears while the button is held. */
.ntm-track:active .ntm-track-knob { opacity: 1; }

.ntm-controls {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  gap: 6px; margin-top: 6px;
}
.ntm-controls-left { display: flex; align-items: center; gap: 2px; justify-self: start; }
.ntm-controls-center { display: flex; align-items: center; gap: 4px; justify-self: center; }
.ntm-controls-right { display: flex; align-items: center; gap: 6px; justify-self: end; }
.ntm-play {
  width: 34px; height: 34px; padding: 0; border: none; border-radius: 50%; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--dsw-alias-label-primary); color: var(--ntm-surface);
  transition: transform .12s ease, filter .15s ease;
}
.ntm-play:hover { filter: brightness(.92); }
.ntm-play:active { transform: scale(.96); }
.ntm-play:disabled { opacity: .45; cursor: default; }

.ntm-vol { display: flex; align-items: center; gap: 2px; }
.ntm-vol input { width: 64px; }

.ntm-badge {
  flex: none; padding: 2px 6px; border-radius: 5px; font-size: 10px; letter-spacing: .02em;
  border: 1px solid var(--ntm-hairline); color: var(--dsw-alias-label-tertiary);
  background: transparent; font-variant-numeric: tabular-nums;
}
.ntm-badge.is-vip { border-color: rgba(201, 22, 43, .45); color: #e04b62; }
button.ntm-badge { cursor: pointer; }
button.ntm-badge:hover { background: var(--ntm-raised); color: var(--dsw-alias-label-primary); }

/* ------------------------------------------------------------------ menu */
.ntm-menu-wrap { position: relative; }
.ntm-menu {
  position: absolute; right: 0; bottom: calc(100% + 6px); z-index: 30;
  min-width: 190px; max-height: 340px; overflow-y: auto; padding: 5px;
  border-radius: 12px; border: 1px solid var(--ntm-hairline);
  background: var(--ntm-surface); box-shadow: 0 16px 40px rgba(0, 0, 0, .28);
}
.ntm-menu-label {
  padding: 6px 9px 3px; font-size: 10.5px; letter-spacing: .05em;
  text-transform: uppercase; color: var(--dsw-alias-label-tertiary);
}
.ntm-menu-item {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 9px;
  border: none; border-radius: 8px; background: transparent; cursor: pointer;
  color: var(--dsw-alias-label-primary); font-size: 12.5px; text-align: left;
}
.ntm-menu-item:hover { background: var(--ntm-raised); }
.ntm-menu-sub { margin-left: auto; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.ntm-menu-sep { height: 1px; margin: 4px 4px; background: var(--ntm-hairline); }

/* ---------------------------------------------------------------- lyrics */
.ntm-lyrics { display: flex; flex-direction: column; gap: 10px; padding: 18px 14px 70px; text-align: center; }
.ntm-lyrics-line {
  display: flex; flex-direction: column; gap: 1px;
  font-size: 13px; line-height: 1.55; color: var(--dsw-alias-label-tertiary);
  transition: color .2s ease, transform .2s ease, opacity .2s ease; opacity: .8;
}
.ntm-lyrics-tr { font-size: 11.5px; font-weight: 400; opacity: .72; }
.ntm-lyrics-line.is-active {
  color: var(--dsw-alias-label-primary); font-weight: 600; opacity: 1; transform: scale(1.03);
}

/* --------------------------------------------------------------- settings */
.ntm-settings { display: flex; flex-direction: column; padding: 0 0 26px; }
.ntm-setting { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 6px 10px; border-radius: 10px; }
.ntm-setting:hover { background: var(--ntm-raised); }
.ntm-setting-label { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ntm-setting-name { font-size: 12.5px; }
.ntm-setting-desc { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.ntm-setting-ctl { flex: none; display: flex; align-items: center; gap: 8px; }
.ntm-setting-ctl .ntm-select { width: 138px; }
.ntm-range { width: 118px; accent-color: var(--dsw-alias-brand-primary); height: 16px; cursor: pointer; }
.ntm-range-value {
  width: 40px; flex: none; text-align: right; font-size: 11px;
  color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums;
}
.ntm-eq { display: flex; flex-direction: column; gap: 1px; padding: 2px 10px 8px; }
.ntm-eq-band { display: flex; align-items: center; gap: 10px; padding: 1px 0; }
.ntm-eq-band span { width: 34px; flex: none; font-size: 10.5px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.ntm-eq-band input { flex: 1; }
.ntm-eq-value {
  width: 30px; flex: none; text-align: right; font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums;
}

/* switch */
.ntm-switch {
  position: relative; width: 38px; height: 22px; flex: none; padding: 0;
  border-radius: 999px; border: 1px solid var(--ntm-hairline); cursor: pointer;
  background: var(--ntm-sunken); transition: background .16s ease, border-color .16s ease;
}
.ntm-switch.is-on { background: var(--dsw-alias-brand-primary); border-color: transparent; }
.ntm-switch-knob {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
  background: var(--dsw-alias-label-primary); transition: transform .16s ease, background .16s ease;
}
.ntm-switch.is-on .ntm-switch-knob { transform: translateX(16px); background: #fff; }

/* ------------------------------------------------------------------ misc */
.ntm-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  padding: 46px 16px; text-align: center; font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}
.ntm-empty svg { opacity: .5; }
.ntm-spinner {
  width: 14px; height: 14px; display: inline-block; border-radius: 50%;
  border: 1.7px solid color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent);
  border-top-color: var(--dsw-alias-brand-primary);
  animation: ntm-spin .7s linear infinite;
}
@keyframes ntm-spin { to { transform: rotate(360deg); } }
.ntm-loading-row {
  display: flex; align-items: center; justify-content: center; gap: 9px;
  padding: 26px; font-size: 12px; color: var(--dsw-alias-label-tertiary);
}
.ntm-toast {
  position: absolute; left: 50%; bottom: 108px; transform: translateX(-50%);
  max-width: 82%; padding: 7px 13px; border-radius: 9px; z-index: 35;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 92%, transparent);
  color: var(--ntm-surface); font-size: 12px; text-align: center; pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .24);
  animation: ntm-toast-in .18s ease;
}
@keyframes ntm-toast-in { from { opacity: 0; transform: translate(-50%, 6px); } }

/* --------------------------------------------------------------- profile */
.ntm-profile { display: flex; align-items: center; gap: 12px; padding: 14px 8px 10px; }
.ntm-profile-main { min-width: 0; flex: 1; }
.ntm-profile-name { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; }
.ntm-profile-sub { margin-top: 2px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }

.ntm-plhead { display: flex; gap: 12px; padding: 8px 6px 12px; }
.ntm-plhead-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 5px; }
.ntm-plhead-title { font-size: 14px; font-weight: 600; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ntm-plhead-meta { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }
.ntm-plhead-desc { font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ntm-plhead-actions { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.ntm-hint { padding: 0 14px 10px; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }

/* -------------------------------------------------- composer dock (ambient) */
.ntm-dock-wrap { position: relative; }
.ntm-dock {
  position: relative; display: flex; align-items: center; gap: 6px;
  width: 100%; max-width: 560px; height: 40px; margin: 0 auto;
  padding: 0 8px 0 6px; overflow: hidden;
  border-radius: 12px; border: 1px solid var(--ntm-hairline);
  background: var(--ntm-surface);
  box-shadow: 0 2px 10px rgba(0, 0, 0, .12);
}
.ntm-dock-open {
  display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;
  padding: 3px 4px; border: none; border-radius: 8px; background: transparent;
  color: inherit; cursor: pointer; text-align: left;
}
.ntm-dock-open:hover { background: var(--ntm-raised); }
.ntm-dock-text { min-width: 0; display: flex; flex-direction: column; gap: 0; }
.ntm-dock-title { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ntm-dock-artist { font-size: 10.5px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ntm-dock-time { flex: none; font-size: 10.5px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.ntm-dock-controls { display: flex; align-items: center; gap: 0; flex: none; }
.ntm-dock-play {
  width: 26px; height: 26px; padding: 0; border: none; border-radius: 50%; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--dsw-alias-label-primary); color: var(--ntm-surface);
}
.ntm-dock-play:hover { filter: brightness(.92); }
.ntm-dock-track {
  position: absolute; left: 0; right: 0; bottom: 0; height: 8px; cursor: pointer; touch-action: none;
}
.ntm-dock-track::before {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);
}
.ntm-dock-fill {
  position: absolute; left: 0; bottom: 0; height: 2px;
  background: var(--dsw-alias-brand-primary); opacity: .8;
  transition: width .25s linear;
}
.ntm-volwrap { position: relative; display: flex; align-items: center; }
.ntm-volpop {
  position: absolute; bottom: calc(100% + 6px); right: 26px;
  width: 44px; height: 130px; padding: 8px 0 18px; z-index: 6;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px; border: 1px solid var(--ntm-hairline);
  background: var(--ntm-surface); box-shadow: 0 14px 34px rgba(0, 0, 0, .3);
}
.ntm-volpop-range {
  width: 92px; margin: 0; cursor: pointer; transform: rotate(-90deg);
  accent-color: var(--dsw-alias-brand-primary);
}
.ntm-volpop-value {
  position: absolute; left: 0; right: 0; bottom: 4px; text-align: center;
  font-size: 9.5px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums;
}
.ntm-dock-pop {
  position: absolute; right: 0; bottom: calc(100% + 8px); z-index: 6;
  width: 288px; padding: 10px; display: flex; flex-direction: column; gap: 8px;
  border-radius: 12px; border: 1px solid var(--ntm-hairline);
  background: var(--ntm-surface); box-shadow: 0 18px 44px rgba(0, 0, 0, .3);
}
.ntm-dock-row { display: flex; align-items: center; gap: 8px; }
.ntm-dock-label { width: 52px; flex: none; font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }
.ntm-dock-row .ntm-select { flex: 1; width: auto; padding: 5px 24px 5px 9px; }
.ntm-dock-row .ntm-range { flex: 1; width: auto; }

/* ------------------------------------------------------- background lyrics */
.ntm-bglyrics {
  position: fixed; left: 0; right: 0; z-index: -1;
  pointer-events: none; padding: 0 8%;
  transition: opacity .4s ease;
}
.ntm-bglyrics-inner {
  width: 100%; max-width: 1180px; margin: 0 auto;
  transform: translateX(calc((var(--ntm-bg-x, 50) - 50) * 0.5vw));
  text-align: var(--ntm-bg-align, center);
}
.ntm-bglyrics { top: calc(var(--ntm-bg-offset, 78) * 1%); transform: translateY(-50%); }
.ntm-bglyrics-line {
  font-size: var(--ntm-bg-size, 34px); font-weight: var(--ntm-bg-weight, 700); line-height: var(--ntm-bg-lh, 1.32);
  letter-spacing: .01em; color: var(--dsw-alias-label-primary);
  opacity: var(--ntm-bg-opacity, .42);
  text-shadow: 0 2px 22px rgba(0, 0, 0, .34), 0 1px 2px rgba(0, 0, 0, .22);
  transition: opacity .35s ease;
}
.ntm-bglyrics-tr {
  font-size: calc(var(--ntm-bg-size, 34px) * 0.5); font-weight: 500; line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  opacity: calc(var(--ntm-bg-opacity, .42) * 0.9);
  text-shadow: 0 2px 14px rgba(0, 0, 0, .3);
  margin-top: 1px;
}
.ntm-bglyrics-next {
  font-size: calc(var(--ntm-bg-size, 34px) * .6); font-weight: 600;
  color: var(--dsw-alias-label-primary);
  opacity: calc(var(--ntm-bg-opacity, .42) * .42);
  text-shadow: 0 2px 16px rgba(0, 0, 0, .3);
}
.ntm-bglyrics.unavailable { display: none; }

@media (prefers-reduced-motion: reduce) {
  .ntm-panel, .ntm-card, .ntm-tab, .ntm-btn { transition: none; }
}
`;

  NT.StyleTag = function StyleTag() {
    return NT.h('style', { 'data-ntm-style': 'true' }, NT.CSS);
  };
})(NT);

/* ---- 10-qr.js ---- */
/**
 * Minimal QR encoder (byte mode, error-correction level M, versions 1-10).
 *
 * The QR login flow needs the code generated in the page: the unikey is minted per
 * visit, and no image host is reachable from the browser. This is the classic
 * Reed-Solomon + mask construction — deliberately fixed to mask 0, which is a legal
 * code (the format information encodes the mask actually used) and removes the
 * penalty-scoring heuristic that would otherwise be the only heuristic part.
 */
(function (NT) {
  'use strict';

  var PAD0 = 0xec;
  var PAD1 = 0x11;
  var ECL_M = 0; // Arase's numbering: L=1, M=0, Q=3, H=2

  var EXP = new Array(256);
  var LOG = new Array(256);
  (function () {
    var i;
    for (i = 0; i < 8; i++) EXP[i] = 1 << i;
    for (i = 8; i < 256; i++) EXP[i] = EXP[i - 4] ^ EXP[i - 5] ^ EXP[i - 6] ^ EXP[i - 8];
    for (i = 0; i < 255; i++) LOG[EXP[i]] = i;
  })();

  function gexp(n) {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return EXP[n];
  }
  function glog(n) {
    if (n < 1) throw new Error('glog(' + n + ')');
    return LOG[n];
  }

  /** [totalCount, dataCount] pairs per block group, level M, versions 1-10. */
  var RS_BLOCKS_M = {
    1: [[1, 26, 16]],
    2: [[1, 44, 28]],
    3: [[1, 70, 44]],
    4: [[2, 50, 32]],
    5: [[2, 67, 43]],
    6: [[4, 43, 27]],
    7: [[4, 49, 31]],
    8: [[2, 60, 38], [2, 61, 39]],
    9: [[3, 58, 36], [2, 59, 37]],
    10: [[4, 69, 43], [1, 70, 44]],
  };

  var ALIGN_POS = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
    9: [6, 26, 46],
    10: [6, 28, 50],
  };

  var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | 1;
  var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | 1;
  var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

  function bchDigit(data) {
    var digit = 0;
    while (data !== 0) {
      digit += 1;
      data >>>= 1;
    }
    return digit;
  }
  function bchTypeInfo(data) {
    var d = data << 10;
    while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15));
    return ((data << 10) | d) ^ G15_MASK;
  }
  function bchTypeNumber(data) {
    var d = data << 12;
    while (bchDigit(d) - bchDigit(G18) >= 0) d ^= G18 << (bchDigit(d) - bchDigit(G18));
    return (data << 12) | d;
  }

  function Poly(num, shift) {
    var offset = 0;
    while (offset < num.length && num[offset] === 0) offset += 1;
    this.num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    for (var j = num.length - offset; j < this.num.length; j++) this.num[j] = 0;
  }
  Poly.prototype.get = function (index) {
    return this.num[index];
  };
  Poly.prototype.getLength = function () {
    return this.num.length;
  };
  Poly.prototype.multiply = function (e) {
    var num = new Array(this.getLength() + e.getLength() - 1);
    for (var i = 0; i < num.length; i++) num[i] = 0;
    for (var i2 = 0; i2 < this.getLength(); i2++) {
      for (var j = 0; j < e.getLength(); j++) {
        num[i2 + j] ^= gexp(glog(this.get(i2)) + glog(e.get(j)));
      }
    }
    return new Poly(num, 0);
  };
  Poly.prototype.mod = function (e) {
    if (this.getLength() - e.getLength() < 0) return this;
    var ratio = glog(this.get(0)) - glog(e.get(0));
    var num = this.num.slice();
    for (var i = 0; i < e.getLength(); i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
    return new Poly(num, 0).mod(e);
  };

  function errorCorrectPolynomial(ecLength) {
    var a = new Poly([1], 0);
    for (var i = 0; i < ecLength; i++) a = a.multiply(new Poly([1, gexp(i)], 0));
    return a;
  }

  function blocksFor(type) {
    var groups = RS_BLOCKS_M[type];
    var out = [];
    for (var g = 0; g < groups.length; g++) {
      var count = groups[g][0];
      var total = groups[g][1];
      var data = groups[g][2];
      for (var c = 0; c < count; c++) out.push({ totalCount: total, dataCount: data });
    }
    return out;
  }

  function dataCapacityBytes(type) {
    var blocks = blocksFor(type);
    var dataCount = 0;
    for (var i = 0; i < blocks.length; i++) dataCount += blocks[i].dataCount;
    var lengthBits = type < 10 ? 8 : 16;
    return Math.floor((dataCount * 8 - 4 - lengthBits) / 8);
  }

  function BitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  BitBuffer.prototype.putBit = function (bit) {
    var byteIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= byteIndex) this.buffer.push(0);
    if (bit) this.buffer[byteIndex] |= 0x80 >>> this.length % 8;
    this.length += 1;
  };
  BitBuffer.prototype.put = function (num, length) {
    for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
  };
  BitBuffer.prototype.getLengthInBits = function () {
    return this.length;
  };

  function utf8(text) {
    if (typeof TextEncoder === 'function') return Array.from(new TextEncoder().encode(text));
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out;
  }

  function createBytes(buffer, rsBlocks) {
    var offset = 0;
    var maxDcCount = 0;
    var maxEcCount = 0;
    var dcdata = new Array(rsBlocks.length);
    var ecdata = new Array(rsBlocks.length);

    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount;
      var ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);
      for (var i = 0; i < dcCount; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;

      var rsPoly = errorCorrectPolynomial(ecCount);
      var rawPoly = new Poly(dcdata[r], rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var j = 0; j < ecdata[r].length; j++) {
        var modIndex = j + modPoly.getLength() - ecdata[r].length;
        ecdata[r][j] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }

    var totalCodeCount = 0;
    for (var t = 0; t < rsBlocks.length; t++) totalCodeCount += rsBlocks[t].totalCount;

    var data = new Array(totalCodeCount);
    var index = 0;
    for (var d = 0; d < maxDcCount; d++) {
      for (var rr = 0; rr < rsBlocks.length; rr++) {
        if (d < dcdata[rr].length) data[index++] = dcdata[rr][d];
      }
    }
    for (var e = 0; e < maxEcCount; e++) {
      for (var r2 = 0; r2 < rsBlocks.length; r2++) {
        if (e < ecdata[r2].length) data[index++] = ecdata[r2][e];
      }
    }
    return data;
  }

  function createData(type, bytes) {
    var rsBlocks = blocksFor(type);
    var buffer = new BitBuffer();
    var totalDataCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;

    buffer.put(4, 4); // byte mode
    buffer.put(bytes.length, type < 10 ? 8 : 16);
    for (var b = 0; b < bytes.length; b++) buffer.put(bytes[b], 8);

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error('QR payload does not fit version ' + type);
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD1, 8);
    }
    return createBytes(buffer, rsBlocks);
  }

  function mask(row, col) {
    return (row + col) % 2 === 0;
  }

  function build(type, data, maskPattern) {
    var size = type * 4 + 17;
    var modules = new Array(size);
    for (var i = 0; i < size; i++) {
      modules[i] = new Array(size);
      for (var j = 0; j < size; j++) modules[i][j] = null;
    }

    function probe(row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || size <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || size <= col + c) continue;
          var on =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          modules[row + r][col + c] = on;
        }
      }
    }
    probe(0, 0);
    probe(size - 7, 0);
    probe(0, size - 7);

    var pos = ALIGN_POS[type];
    for (var pi = 0; pi < pos.length; pi++) {
      for (var pj = 0; pj < pos.length; pj++) {
        var arow = pos[pi];
        var acol = pos[pj];
        if (modules[arow][acol] !== null) continue;
        for (var ar = -2; ar <= 2; ar++) {
          for (var ac = -2; ac <= 2; ac++) {
            modules[arow + ar][acol + ac] =
              ar === -2 || ar === 2 || ac === -2 || ac === 2 || (ar === 0 && ac === 0);
          }
        }
      }
    }

    for (var tr = 8; tr < size - 8; tr++) if (modules[tr][6] === null) modules[tr][6] = tr % 2 === 0;
    for (var tc = 8; tc < size - 8; tc++) if (modules[6][tc] === null) modules[6][tc] = tc % 2 === 0;

    var bits = bchTypeInfo((ECL_M << 3) | maskPattern);
    for (var i2 = 0; i2 < 15; i2++) {
      var mod = ((bits >> i2) & 1) === 1;
      if (i2 < 6) modules[i2][8] = mod;
      else if (i2 < 8) modules[i2 + 1][8] = mod;
      else modules[size - 15 + i2][8] = mod;
    }
    for (var i3 = 0; i3 < 15; i3++) {
      var mod2 = ((bits >> i3) & 1) === 1;
      if (i3 < 8) modules[8][size - i3 - 1] = mod2;
      else if (i3 < 9) modules[8][15 - i3 - 1 + 1] = mod2;
      else modules[8][15 - i3 - 1] = mod2;
    }
    modules[size - 8][8] = true;

    if (type >= 7) {
      var vbits = bchTypeNumber(type);
      for (var v = 0; v < 18; v++) {
        var vm = ((vbits >> v) & 1) === 1;
        modules[Math.floor(v / 3)][(v % 3) + size - 8 - 3] = vm;
        modules[(v % 3) + size - 8 - 3][Math.floor(v / 3)] = vm;
      }
    }

    var inc = -1;
    var row = size - 1;
    var bitIndex = 7;
    var byteIndex = 0;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      while (true) {
        for (var c2 = 0; c2 < 2; c2++) {
          if (modules[row][col - c2] === null) {
            var dark = false;
            if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            if (mask(row, col - c2)) dark = !dark;
            modules[row][col - c2] = dark;
            bitIndex -= 1;
            if (bitIndex === -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || size <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }

    return { type: type, size: size, modules: modules, mask: maskPattern };
  }

  /**
   * Encode `text` as a QR symbol.
   * @param {string} text
   * @returns {{type:number,size:number,modules:boolean[][],mask:number}}
   */
  NT.qrEncode = function (text) {
    var bytes = utf8(String(text));
    var type = 0;
    for (var t = 1; t <= 10; t++) {
      if (bytes.length <= dataCapacityBytes(t)) {
        type = t;
        break;
      }
    }
    if (!type) throw new Error('QR payload too long: ' + bytes.length + ' bytes');
    return build(type, createData(type, bytes), 0);
  };
})(typeof NT !== 'undefined' && NT ? NT : (globalThis.__NTM_QR__ = globalThis.__NTM_QR__ || {}));

/* ---- 20-audio.js ---- */
/**
 * Playback engine.
 *
 * Audio path decisions that matter for smooth playback:
 *  · The CDN sends `Access-Control-Allow-Origin: *`, so the element plays the real CDN
 *    URL with `crossOrigin="anonymous"` and still feeds an untainted Web Audio graph.
 *    That keeps the bytes out of the Node host — piping ~1 MB/s through the host's single
 *    thread competes with the agent itself — and halves the time from click to sound.
 *    When a host refuses CORS we fall back to the local proxy for that host only.
 *  · The convolver is built on demand and only fed while wet > 0. A 1.9s reverb IR keeps
 *    convolving even when nobody can hear it, and that is by far the most expensive node
 *    in this graph.
 *  · Everything else is a handful of biquads and gains, which cost almost nothing.
 */
(function (NT) {
  'use strict';

  var EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  function impulseBuffer(ac, seconds, decay) {
    var length = Math.max(1, Math.floor(ac.sampleRate * seconds));
    var buffer = ac.createBuffer(2, length, ac.sampleRate);
    for (var channel = 0; channel < 2; channel++) {
      var data = buffer.getChannelData(channel);
      for (var i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  NT.createEngine = function (options) {
    var onEvent = options.onEvent || function () {};
    var element = new Audio();
    element.preload = 'auto';
    element.setAttribute('playsinline', '');
    var audioContext = null;
    var graph = null;
    var graphFailed = false;
    var effects = options.getEffects ? options.getEffects() : {};
    var corsHosts = Object.create(null);
    var lastDirect = null;

    /** The element can only play this CDN host directly if it answers a CORS probe. */
    function probeCors(url) {
      var host;
      try {
        host = new URL(url).host;
      } catch (error) {
        return Promise.resolve(false);
      }
      if (host in corsHosts) return Promise.resolve(corsHosts[host]);
      return fetch(url, { headers: { Range: 'bytes=0-1' }, mode: 'cors', cache: 'no-store' })
        .then(function (response) {
          corsHosts[host] = response.ok || response.status === 206;
          return corsHosts[host];
        })
        .catch(function () {
          corsHosts[host] = false;
          return false;
        });
    }

    function buildGraph() {
      if (graph || graphFailed) return graph;
      try {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) throw new Error('no Web Audio');
        audioContext = new Ctor();
        var source = audioContext.createMediaElementSource(element);

        var preGain = audioContext.createGain();
        preGain.gain.value = 1;

        var bands = EQ_FREQS.map(function (freq) {
          var filter = audioContext.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1.1;
          filter.gain.value = 0;
          return filter;
        });
        var bass = audioContext.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 105;
        var treble = audioContext.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 9800;

        // One 2x2 channel matrix covers width, mono, vocal removal and balance.
        var splitter = audioContext.createChannelSplitter(2);
        var merger = audioContext.createChannelMerger(2);
        var gLL = audioContext.createGain();
        var gLR = audioContext.createGain();
        var gRL = audioContext.createGain();
        var gRR = audioContext.createGain();

        var dry = audioContext.createGain();
        var wet = audioContext.createGain();
        wet.gain.value = 0;
        var reverbIn = audioContext.createGain();
        var convolver = null;
        var reverbConnected = false;

        var limiter = audioContext.createDynamicsCompressor();
        limiter.threshold.value = -1.5;
        limiter.knee.value = 4;
        limiter.ratio.value = 14;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.2;

        var analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.78;
        var scope = new Uint8Array(analyser.fftSize);
        var spectrum = new Uint8Array(analyser.frequencyBinCount);

        var cursor = source;
        cursor.connect(preGain);
        cursor = preGain;
        bands.forEach(function (filter) {
          cursor.connect(filter);
          cursor = filter;
        });
        cursor.connect(bass);
        bass.connect(treble);

        treble.connect(splitter);
        splitter.connect(gLL, 0, 0);
        splitter.connect(gLR, 1, 0);
        splitter.connect(gRL, 0, 0);
        splitter.connect(gRR, 1, 0);
        gLL.connect(merger, 0, 0);
        gLR.connect(merger, 0, 0);
        gRL.connect(merger, 0, 1);
        gRR.connect(merger, 0, 1);

        // Headphone crossfeed: a delayed, low-passed copy of each channel leaks into the
        // other one. Two delays and two filters cost almost nothing, and it is the one
        // "spatial" effect that actually reduces listening fatigue on headphones.
        var cfSplit = audioContext.createChannelSplitter(2);
        var cfMerge = audioContext.createChannelMerger(2);
        var cfDirectL = audioContext.createGain();
        var cfDirectR = audioContext.createGain();
        var cfCrossL = audioContext.createGain();
        var cfCrossR = audioContext.createGain();
        var cfDelayL = audioContext.createDelay(0.01);
        var cfDelayR = audioContext.createDelay(0.01);
        var cfLowL = audioContext.createBiquadFilter();
        var cfLowR = audioContext.createBiquadFilter();
        cfLowL.type = 'lowpass';
        cfLowL.frequency.value = 720;
        cfLowR.type = 'lowpass';
        cfLowR.frequency.value = 720;
        cfDelayL.delayTime.value = 0.00027;
        cfDelayR.delayTime.value = 0.00027;
        cfDirectL.gain.value = 1;
        cfDirectR.gain.value = 1;
        cfCrossL.gain.value = 0;
        cfCrossR.gain.value = 0;

        merger.connect(cfSplit);
        cfSplit.connect(cfDirectL, 0, 0);
        cfSplit.connect(cfDirectR, 1, 0);
        cfSplit.connect(cfDelayL, 0, 0);
        cfSplit.connect(cfDelayR, 1, 0);
        cfDelayL.connect(cfLowL);
        cfLowL.connect(cfCrossR);
        cfDelayR.connect(cfLowR);
        cfLowR.connect(cfCrossL);
        cfDirectL.connect(cfMerge, 0, 0);
        cfCrossL.connect(cfMerge, 0, 0);
        cfDirectR.connect(cfMerge, 0, 1);
        cfCrossR.connect(cfMerge, 0, 1);

        cfMerge.connect(dry);
        dry.connect(limiter);
        cfMerge.connect(reverbIn);
        reverbIn.connect(wet);
        wet.connect(limiter);

        limiter.connect(analyser);
        analyser.connect(audioContext.destination);

        graph = {
          source: source,
          preGain: preGain,
          bands: bands,
          bass: bass,
          treble: treble,
          gLL: gLL,
          gLR: gLR,
          gRL: gRL,
          gRR: gRR,
          cfCrossL: cfCrossL,
          cfCrossR: cfCrossR,
          dry: dry,
          wet: wet,
          reverbIn: reverbIn,
          /** Built on first use and detached again when the wet level returns to zero. */
          setReverbActive: function (on) {
            if (on) {
              if (!convolver) {
                convolver = audioContext.createConvolver();
                convolver.buffer = impulseBuffer(audioContext, 1.9, 3.2);
                convolver.connect(wet);
              }
              if (!reverbConnected) {
                reverbIn.connect(convolver);
                reverbConnected = true;
              }
            } else if (reverbConnected) {
              try {
                reverbIn.disconnect(convolver);
              } catch (error) {
                /* already detached */
              }
              reverbConnected = false;
            }
          },
          limiter: limiter,
          analyser: analyser,
          scope: scope,
          spectrum: spectrum,
        };
        applyEffects(effects);
        return graph;
      } catch (error) {
        graphFailed = true;
        onEvent({ type: 'effect-unavailable', error: error });
        return null;
      }
    }

    function applyEffects(next) {
      effects = next || effects || {};
      if (!graph) return;
      var bypass = Boolean(effects.bypass);

      var eq = Array.isArray(effects.eq) ? effects.eq : [];
      var auto = Array.isArray(effects.autoEq) ? effects.autoEq : [];
      for (var i = 0; i < graph.bands.length; i++) {
        var value = Number(eq[i]);
        var correction = Number(auto[i]) || 0;
        graph.bands[i].gain.value = bypass || !isFinite(value) ? 0 : value + correction;
      }
      graph.bass.gain.value = bypass
        ? 0
        : (Number(effects.bass) || 0) + (Number(effects.smartBass) || 0);
      graph.treble.gain.value = bypass ? 0 : Number(effects.treble) || 0;

      var cross = bypass ? 0 : effects.crossfeed ? Math.max(0, Math.min(1, Number(effects.crossfeedAmount) || 0.22)) : 0;
      graph.cfCrossL.gain.value = cross;
      graph.cfCrossR.gain.value = cross;

      var width = bypass ? 0 : Math.max(0, Math.min(1, Number(effects.width == null ? 0.18 : effects.width)));
      var fold = width * 0.32;
      var gLL = 1;
      var gRR = 1;
      var gLR = fold;
      var gRL = fold;
      var scale = 1 / (1 + fold);
      if (!bypass && effects.vocal) {
        gLL = 0.72;
        gRR = 0.72;
        gLR = -0.72;
        gRL = -0.72;
        scale = 1;
      } else if (!bypass && effects.mono) {
        gLL = gLR = gRL = gRR = 0.5;
        scale = 1;
      }
      var balance = bypass ? 0 : Math.max(-1, Math.min(1, Number(effects.balance) || 0));
      graph.gLL.gain.value = gLL * scale * (1 - Math.max(0, balance));
      graph.gRR.gain.value = gRR * scale * (1 + Math.min(0, balance));
      graph.gLR.gain.value = gLR * scale * (1 - Math.max(0, balance));
      graph.gRL.gain.value = gRL * scale * (1 + Math.min(0, balance));

      var reverb = bypass ? 0 : Math.max(0, Math.min(1, Number(effects.reverb) || 0));
      if (reverb > 0.001) {
        graph.setReverbActive(true);
        graph.wet.gain.value = reverb;
        graph.dry.gain.value = 1 - reverb * 0.3;
      } else {
        // Detach the wet path entirely so an idle reverb costs nothing per block.
        graph.setReverbActive(false);
        graph.wet.gain.value = 0;
        graph.dry.gain.value = 1;
      }

      var comp = bypass ? false : effects.comp !== false;
      graph.limiter.threshold.value = comp ? -1.5 : 0;
      graph.limiter.ratio.value = comp ? 14 : 1;
      graph.limiter.knee.value = comp ? 4 : 0;

      graph.preGain.gain.value = bypass || effects.normalize === false ? 1 : gainForNorm;
      element.playbackRate = Math.max(0.5, Math.min(2, Number(effects.rate) || 1));
    }

    /* Level-driven makeup gain for "volume levelling", updated a few times a second. */
    var gainForNorm = 1;
    var normTimer = null;
    function startNormalizer() {
      if (normTimer) return;
      normTimer = setInterval(function () {
        if (!graph || !NT.controller || !NT.controller.state) return;
        var settings = NT.controller.state().effects || {};
        var target = 1;
        if (!settings.bypass && settings.normalize !== false) {
          var level = readLevel();
          if (level > 0.004) target = Math.max(0.55, Math.min(1.9, 0.22 / level));
        }
        gainForNorm += (target - gainForNorm) * 0.25;
        if (graph) graph.preGain.gain.value = gainForNorm;
      }, 250);
    }

    function readLevel() {
      if (!graph) return 0;
      graph.analyser.getByteTimeDomainData(graph.scope);
      var sum = 0;
      for (var i = 0; i < graph.scope.length; i++) {
        var v = (graph.scope[i] - 128) / 128;
        sum += v * v;
      }
      return Math.sqrt(sum / graph.scope.length);
    }

    /* ------------------------------------------------------------ element events */

    element.addEventListener('timeupdate', function () {
      onEvent({ type: 'time', currentTime: element.currentTime, duration: element.duration || 0 });
    });
    element.addEventListener('ended', function () {
      onEvent({ type: 'ended' });
    });
    element.addEventListener('error', function () {
      onEvent({ type: 'error', error: element.error, direct: lastDirect });
    });
    element.addEventListener('playing', function () {
      startNormalizer();
      onEvent({ type: 'playing' });
    });
    element.addEventListener('waiting', function () {
      onEvent({ type: 'waiting' });
    });

    return {
      element: element,

      /**
       * Start one track: prefer the CDN, fall back to the local proxy when the host
       * refuses CORS. `proxyUrl` is only used as the fallback.
       */
      play: async function (url, proxyUrl) {
        if (!graph && !graphFailed) buildGraph();
        if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
          } catch (error) {
            /* resumes on the next gesture */
          }
        }
        var direct = null;
        if (url && proxyUrl && /^https?:/i.test(url) && (await probeCors(url))) direct = url;
        lastDirect = Boolean(direct);
        if (direct) element.crossOrigin = 'anonymous';
        else element.removeAttribute('crossorigin');
        element.src = direct || proxyUrl || url;
        try {
          await element.play();
          return true;
        } catch (error) {
          onEvent({ type: 'blocked', error: error });
          return false;
        }
      },

      /** Retry the same track through the proxy after a direct-load failure. */
      playProxy: async function (proxyUrl) {
        lastDirect = false;
        element.removeAttribute('crossorigin');
        element.src = proxyUrl;
        try {
          await element.play();
          return true;
        } catch (error) {
          onEvent({ type: 'blocked', error: error });
          return false;
        }
      },

      pause: function () {
        element.pause();
      },
      resume: async function () {
        if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
          } catch (error) {
            /* ignored */
          }
        }
        try {
          await element.play();
          return true;
        } catch (error) {
          onEvent({ type: 'blocked', error: error });
          return false;
        }
      },
      stop: function () {
        element.pause();
        element.removeAttribute('src');
        try {
          element.load();
        } catch (error) {
          /* ignored */
        }
      },
      seek: function (seconds) {
        if (!isFinite(seconds)) return;
        try {
          element.currentTime = Math.max(0, seconds);
        } catch (error) {
          /* seeking before metadata is a no-op */
        }
      },
      setVolume: function (value) {
        element.volume = Math.max(0, Math.min(1, value));
      },
      setMuted: function (muted) {
        element.muted = Boolean(muted);
      },
      applyEffects: applyEffects,
      get playing() {
        return !element.paused && !element.ended && element.readyState > 2;
      },
      get currentTime() {
        return element.currentTime || 0;
      },
      get duration() {
        var d = element.duration;
        return isFinite(d) && d > 0 ? d : 0;
      },
      readSpectrum: function () {
        if (!graph) return null;
        graph.analyser.getByteFrequencyData(graph.spectrum);
        return graph.spectrum;
      },
      /**
       * Average analyser value per octave band, 0..255. The smart equaliser compares
       * these against each other to flatten the response.
       */
      readBandLevels: function (freqs) {
        if (!graph) return null;
        graph.analyser.getByteFrequencyData(graph.spectrum);
        var nyquist = audioContext.sampleRate / 2;
        var binCount = graph.spectrum.length;
        var levels = [];
        for (var i = 0; i < freqs.length; i++) {
          var lo = Math.max(1, Math.floor(((freqs[i] / 1.6) / nyquist) * binCount));
          var hi = Math.min(binCount - 1, Math.ceil(((freqs[i] * 1.6) / nyquist) * binCount));
          var sum = 0;
          var count = 0;
          for (var b = lo; b <= hi; b++) {
            sum += graph.spectrum[b];
            count += 1;
          }
          levels.push(count ? sum / count : 0);
        }
        return levels;
      },
      readLevel: readLevel,
      dispose: function () {
        if (normTimer) {
          clearInterval(normTimer);
          normTimer = null;
        }
        try {
          element.pause();
          element.removeAttribute('src');
          element.load();
        } catch (error) {
          /* ignored */
        }
        if (audioContext) {
          try {
            audioContext.close();
          } catch (error) {
            /* ignored */
          }
        }
      },
    };
  };

  NT.EQ_FREQS = EQ_FREQS;
})(NT);

/* ---- 30-state.js ---- */
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

/* ---- 50-panel.js ---- */
/**
 * Panel shell, header trigger, and the pieces every view reuses.
 */
(function (NT) {
  'use strict';

  var React = NT.React;
  var h = NT.h;
  var store = NT.playerStore;

  function use(pick) {
    return NT.useStore(store, pick);
  }

  /* ------------------------------------------------------------------ trigger */

  NT.HeaderTrigger = function HeaderTrigger() {
    var open = use(function (state) {
      return state.open;
    });
    React.useEffect(function () {
      NT.controller.setHeaderTrigger(true);
      return function () {
        NT.controller.setHeaderTrigger(false);
      };
    }, []);
    return h(
      'button',
      {
        type: 'button',
        className: NT.cls('ntm-trigger', open && 'is-open'),
        title: NT.t('open'),
        'aria-label': NT.t('open'),
        'aria-expanded': open,
        onClick: function (event) {
          // The header row is owned by the shell: a click that keeps bubbling can
          // toggle a host menu underneath the icon.
          event.preventDefault();
          event.stopPropagation();
          NT.controller.togglePanel();
        },
      },
      h(NT.Icon, { name: 'note', size: 16 }),
    );
  };

  /** Only rendered when the header seat is unavailable (no Session open). */
  NT.FloatTrigger = function FloatTrigger() {
    var open = use(function (state) {
      return state.open;
    });
    var hasHeader = use(function (state) {
      return state.headerTrigger;
    });
    if (hasHeader) return null;
    return h(
      'div',
      { className: 'ntm-root' },
      h(NT.StyleTag),
      h(
        'button',
        {
          type: 'button',
          className: 'ntm-float-trigger',
          title: NT.t('open'),
          'aria-label': NT.t('open'),
          onClick: function () {
            NT.controller.togglePanel();
          },
        },
        h(NT.Icon, { name: 'note', size: 17 }),
      ),
    );
  };

  /* -------------------------------------------------------------------- panel */

  NT.MusicPanel = function MusicPanel() {
    var open = use(function (state) {
      return state.open;
    });
    var panelRef = React.useRef(null);

    /**
     * Native isolation for the keyboard.
     *
     * The shell routes every key it recognises through one window-level listener, and
     * it only stands down when the event arrives already `defaultPrevented`. While the
     * pointer or focus is inside this panel, a bare key is ours: it may be a native
     * shortcut ("/" focuses the composer, letters trigger commands) and having it fire
     * mid-playback is exactly the collision this fence removes. Keys held with
     * Ctrl/Alt/Meta are left alone so browser and app commands still work, and typing
     * targets are never touched.
     */
    React.useEffect(
      function () {
        if (!open) return undefined;
        var node = panelRef.current;
        if (!node) return undefined;
        var onKeyDown = function (event) {
          var target = event.target;
          if (!target || !node.contains(target)) return;
          var editable =
            target.closest && target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]');
          if (event.key === 'Escape') {
            event.preventDefault();
            if (store.get().detail) NT.controller.back();
            else NT.controller.closePanel();
            return;
          }
          if (editable) return;
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ' || event.key.indexOf('Arrow') === 0) return;
          event.preventDefault();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return function () {
          window.removeEventListener('keydown', onKeyDown, true);
        };
      },
      [open],
    );

    /* ------------------------------------------------------- move and resize */

    var box = use(function (state) {
      return state.panelBox;
    });
    var dragRef = React.useRef(null);

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    /** Write the live geometry straight to the node: no React pass per pointermove. */
    function paint(node, next) {
      node.style.left = next.x + 'px';
      node.style.top = next.y + 'px';
      node.style.width = next.w + 'px';
      node.style.height = next.h + 'px';
      node.style.right = 'auto';
      node.style.bottom = 'auto';
    }

    function beginDrag(mode, event) {
      if (event.button !== 0) return;
      if (mode === 'move' && event.target.closest && event.target.closest('button, input, select, textarea, a, .ntm-tab, .ntm-track')) return;
      var node = panelRef.current;
      if (!node) return;
      var rect = node.getBoundingClientRect();
      dragRef.current = {
        mode: mode,
        node: node,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        w: rect.width,
        h: rect.height,
        next: null,
      };
      try {
        node.setPointerCapture(event.pointerId);
      } catch (error) {
        /* capture is best effort */
      }
      document.body.style.userSelect = 'none';
      event.preventDefault();
    }

    function moveDrag(event) {
      var drag = dragRef.current;
      if (!drag) return;
      var dx = event.clientX - drag.startX;
      var dy = event.clientY - drag.startY;
      var maxW = Math.min(window.innerWidth - 16, 720);
      var next = { x: drag.left, y: drag.top, w: drag.w, h: drag.h };
      if (drag.mode === 'move') {
        next.x = clamp(drag.left + dx, 8, Math.max(8, window.innerWidth - 160));
        next.y = clamp(drag.top + dy, 8, Math.max(8, window.innerHeight - 120));
      } else if (drag.mode === 'w') {
        var left = clamp(drag.left + dx, 8, drag.left + drag.w - 320);
        next.x = left;
        next.w = clamp(drag.w + (drag.left - left), 320, maxW);
      } else if (drag.mode === 'h') {
        next.h = clamp(drag.h + dy, 320, window.innerHeight - 16);
      } else if (drag.mode === 'sw') {
        var left2 = clamp(drag.left + dx, 8, drag.left + drag.w - 320);
        next.x = left2;
        next.w = clamp(drag.w + (drag.left - left2), 320, maxW);
        next.h = clamp(drag.h + dy, 320, window.innerHeight - 16);
      }
      drag.next = next;
      paint(drag.node, next);
    }

    function endDrag() {
      var drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      document.body.style.userSelect = '';
      if (drag.next) NT.controller.setPanelBox(drag.next);
    }

    var floating = Boolean(box);
    var boxStyle = box
      ? { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px', right: 'auto', bottom: 'auto' }
      : undefined;

    React.useEffect(
      function () {
        if (open) return undefined;
        dragRef.current = null;
        return undefined;
      },
      [open],
    );

    return h(
      'div',
      { className: 'ntm-root' },
      h(NT.StyleTag),
      h(
        'aside',
        {
          ref: panelRef,
          className: NT.cls('ntm-panel', open && 'is-open', floating && 'is-floating'),
          'aria-hidden': !open,
          role: 'complementary',
          'aria-label': NT.t('title'),
          style: boxStyle,
          onPointerMove: moveDrag,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
        },
        h(
          'header',
          {
            className: 'ntm-head',
            style: { cursor: 'grab', touchAction: 'none' },
            onPointerDown: function (event) {
              beginDrag('move', event);
            },
            onDoubleClick: function () {
              NT.controller.resetPanelBox();
            },
            title: NT.t('drag_hint'),
          },
          h(NT.HeaderContent),
        ),
        h(NT.PanelBody),
        h(NT.PlayerBar),
        h(NT.PickerHost),
        h(NT.ToastHost),
        h('div', {
          className: 'ntm-grip is-w',
          onPointerDown: function (event) {
            beginDrag('w', event);
          },
        }),
        h('div', {
          className: 'ntm-grip is-s',
          onPointerDown: function (event) {
            beginDrag('h', event);
          },
        }),
        h('div', {
          className: 'ntm-grip is-sw',
          onPointerDown: function (event) {
            beginDrag('sw', event);
          },
        }),
      ),
    );
  };

  /** Header contents, split out so the drag chrome can own the outer element. */
  NT.HeaderContent = function HeaderContent() {
    var detail = use(function (state) {
      return state.detail;
    });
    var profile = use(function (state) {
      return state.login.profile;
    });
    return h(
      React.Fragment,
      null,
      h(
        'div',
        { className: 'ntm-head-title' },
        h('span', { className: 'ntm-mark' }, h(NT.Icon, { name: 'note', size: 13 })),
        h('span', { className: 'ntm-head-name' }, NT.t('title')),
        profile
          ? h('span', { className: 'ntm-head-user', title: profile.nickname }, profile.nickname)
          : h(
              'button',
              {
                type: 'button',
                className: 'ntm-head-signin',
                onClick: function () {
                  NT.controller.setDetail({ kind: 'login' });
                },
              },
              NT.t('sign_in'),
            ),
      ),
      h('div', { className: 'ntm-head-spacer' }),
      h(
        'div',
        { className: 'ntm-head-actions' },
        detail
          ? h(NT.IconButton, {
              name: 'chevronLeft',
              title: NT.t('back'),
              className: 'ntm-head-btn',
              onClick: function () {
                NT.controller.back();
              },
            })
          : null,
        h(NT.IconButton, {
          name: 'close',
          title: NT.t('close'),
          className: 'ntm-head-btn',
          onClick: function () {
            NT.controller.closePanel();
          },
        }),
      ),
    );
  };

  var TABS = [
    { id: 'roam', label: 'tab_roam' },
    { id: 'search', label: 'tab_search' },
    { id: 'playlists', label: 'tab_playlists' },
    { id: 'mine', label: 'tab_mine' },
  ];

  NT.PanelBody = function PanelBody() {
    var detail = use(function (state) {
      return state.detail;
    });
    var tab = use(function (state) {
      return state.tab;
    });

    var content;
    if (detail) {
      if (detail.kind === 'playlist') content = h(NT.PlaylistDetailView, { detail: detail });
      else if (detail.kind === 'daily') content = h(NT.DailyDetailView, { detail: detail });
      else if (detail.kind === 'lyrics') content = h(NT.LyricsView);
      else if (detail.kind === 'settings') content = h(NT.SettingsView);
      else if (detail.kind === 'login') content = h(NT.LoginView);
      else content = h(NT.Empty, { text: NT.t('empty_list') });
    } else if (tab === 'search') content = h(NT.SearchView);
    else if (tab === 'playlists') content = h(NT.PlaylistsView);
    else if (tab === 'mine') content = h(NT.MineView);
    else content = h(NT.RoamView);

    // The tab strip stays outside the scroll container: scrolling a long playlist must
    // not take the navigation with it.
    if (detail) return h('div', { className: 'ntm-body' }, content);
    return h(
      React.Fragment,
      null,
      h(NT.Tabs),
      h('div', { className: 'ntm-body' }, content),
    );
  };

  NT.Tabs = function Tabs() {
    var tab = use(function (state) {
      return state.tab;
    });
    return h(
      'div',
      { className: 'ntm-tabs', role: 'tablist' },
      TABS.map(function (item) {
        return h(
          'button',
          {
            key: item.id,
            type: 'button',
            role: 'tab',
            'aria-selected': tab === item.id,
            className: NT.cls('ntm-tab', tab === item.id && 'is-active'),
            onClick: function () {
              NT.controller.setTab(item.id);
            },
          },
          NT.t(item.label),
        );
      }),
    );
  };

  /* --------------------------------------------------------------- shared bits */

  NT.SectionHeader = function SectionHeader(props) {
    return h(
      'div',
      { className: 'ntm-section' },
      h('span', null, props.title),
      props.count == null ? null : h('span', { className: 'ntm-section-count' }, props.count),
      props.action
        ? h(
            'button',
            {
              type: 'button',
              className: 'ntm-section-action',
              onClick: props.onAction,
            },
            props.action,
          )
        : null,
    );
  };

  NT.SongRow = function SongRow(props) {
    var song = props.song;
    var liked = use(function (state) {
      return state.liked.has(Number(song.id));
    });
    var isCurrent = use(function (state) {
      return (
        state.index >= 0 && state.queue[state.index] && String(state.queue[state.index].id) === String(song.id)
      );
    });
    var playing = use(function (state) {
      return state.playing;
    });
    return h(
      'div',
      {
        className: NT.cls('ntm-row', 'is-clickable', isCurrent && 'is-current'),
        onClick: function () {
          props.onPlay();
        },
      },
      props.showIndex
        ? h(
            'span',
            { className: 'ntm-row-index' },
            isCurrent && playing ? h(NT.Icon, { name: 'play', size: 10 }) : (props.index || 0) + 1,
          )
        : null,
      h(NT.Cover, { src: song.cover, size: 38, radius: 6 }),
      h(
        'div',
        { className: 'ntm-row-main' },
        h('span', { className: 'ntm-row-title', title: song.name }, song.name),
        h(
          'span',
          { className: 'ntm-row-sub', title: NT.artistLine(song) + ' · ' + (song.album || '') },
          NT.artistLine(song),
          song.album ? ' · ' + song.album : '',
        ),
      ),
      h(
        'div',
        { className: 'ntm-row-actions' },
        props.onPick
          ? h(NT.IconButton, {
              name: 'plus',
              title: NT.t('add_to_playlist'),
              onClick: function (event) {
                event.stopPropagation();
                props.onPick(song);
              },
            })
          : null,
        h(NT.IconButton, {
          name: liked ? 'heartFill' : 'heart',
          active: liked,
          title: liked ? NT.t('liked') : NT.t('like'),
          onClick: function (event) {
            event.stopPropagation();
            NT.controller.toggleLike(song);
          },
        }),
        h(NT.IconButton, {
          name: 'play',
          title: NT.t('play'),
          onClick: function (event) {
            event.stopPropagation();
            props.onPlay();
          },
        }),
        props.onRemove
          ? h(NT.IconButton, {
              name: 'close',
              title: props.removeTitle || NT.t('remove'),
              onClick: function (event) {
                event.stopPropagation();
                props.onRemove();
              },
            })
          : null,
      ),
    );
  };

  NT.PlaylistCard = function PlaylistCard(props) {
    var playlist = props.playlist;
    return h(
      'div',
      {
        className: 'ntm-card',
        onClick: function () {
          NT.controller.openPlaylist(playlist.id, playlist.name);
        },
      },
      h(
        'div',
        { className: 'ntm-card-art' },
        playlist.cover
          ? h('img', { src: playlist.cover + '?param=240y240', alt: '', loading: 'lazy', draggable: false })
          : h('div', { className: 'ntm-card-fallback' }, h(NT.Icon, { name: 'note', size: 22 })),
        h(
          'button',
          {
            type: 'button',
            className: 'ntm-card-play',
            title: NT.t('play_all'),
            onClick: function (event) {
              event.stopPropagation();
              NT.controller.openPlaylist(playlist.id, playlist.name);
            },
          },
          h(NT.Icon, { name: 'play', size: 12 }),
        ),
      ),
      h(
        'div',
        { className: 'ntm-card-body' },
        h('div', { className: 'ntm-card-title', title: playlist.name }, playlist.name),
        h(
          'div',
          { className: 'ntm-card-sub' },
          playlist.playCount
            ? NT.playCount(playlist.playCount) + ' ' + NT.t('plays')
            : String(playlist.trackCount || 0) + ' ' + NT.t('songs_unit'),
        ),
      ),
    );
  };

  NT.Loading = function Loading(props) {
    return h('div', { className: 'ntm-loading-row' }, h(NT.Spinner), props.text || NT.t('loading'));
  };

  /* ------------------------------------------------------------------ toasts */

  NT.ToastHost = function ToastHost() {
    var text = use(function (state) {
      return state.toast;
    });
    if (!text) return null;
    return h('div', { className: 'ntm-toast', role: 'status' }, text);
  };

  /* --------------------------------------------------------- playlist picker */

  NT.PickerHost = function PickerHost() {
    var picker = use(function (state) {
      return state.picker;
    });
    var myPlaylists = use(function (state) {
      return state.myPlaylists;
    });
    var pair = React.useState('');
    var name = pair[0];
    var setName = pair[1];

    if (!picker) return null;
    var close = function () {
      NT.controller.setPicker(null);
      setName('');
    };
    return h(
      'div',
      {
        style: {
          position: 'absolute',
          inset: 0,
          zIndex: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: 'rgba(0,0,0,.34)',
          backdropFilter: 'blur(2px)',
        },
        onClick: close,
      },
      h(
        'div',
        {
          style: {
            width: '100%',
            maxWidth: 300,
            padding: 12,
            borderRadius: 14,
            background: 'var(--ntm-surface)',
            border: '1px solid var(--ntm-hairline)',
            boxShadow: '0 24px 60px rgba(0,0,0,.34)',
          },
          onClick: function (event) {
            event.stopPropagation();
          },
        },
        h('div', { style: { fontSize: 13, fontWeight: 600, padding: '2px 4px 2px' } }, NT.t('add_to_playlist')),
        h(
          'div',
          { className: 'ntm-row-sub', style: { padding: '0 4px 10px' } },
          picker.name || '',
        ),
        h(
          'div',
          { style: { maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 } },
          myPlaylists.length
            ? myPlaylists.map(function (playlist) {
                return h(
                  'button',
                  {
                    key: playlist.id,
                    type: 'button',
                    className: 'ntm-menu-item',
                    onClick: async function () {
                      await NT.controller.addToPlaylist(picker, playlist.id);
                      close();
                    },
                  },
                  h(NT.Cover, { src: playlist.cover, size: 24, radius: 5 }),
                  h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, playlist.name),
                  h('span', { className: 'ntm-menu-sub' }, String(playlist.trackCount || '')),
                );
              })
            : h('div', { className: 'ntm-row-sub', style: { padding: '8px 4px' } }, NT.t('empty_list')),
        ),
        h('div', { className: 'ntm-menu-sep' }),
        h(
          'div',
          { style: { display: 'flex', gap: 6 } },
          h('input', {
            className: 'ntm-input',
            placeholder: NT.t('playlist_name'),
            value: name,
            onChange: function (event) {
              setName(event.target.value);
            },
            onKeyDown: function (event) {
              if (event.key === 'Enter' && name.trim()) event.currentTarget.blur();
            },
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'ntm-btn is-primary',
              disabled: !name.trim(),
              onClick: async function () {
                try {
                  await NT.controller.createPlaylist(name.trim(), picker);
                  close();
                } catch (error) {
                  NT.controller.toast(error.message || NT.t('create_failed'));
                }
              },
            },
            NT.t('create'),
          ),
        ),
      ),
    );
  };

  /* --------------------------------------------------------------- playhead */

  /** Reads the media element directly so progress never re-renders the panel. */
  NT.ProgressBar = function ProgressBar() {
    var fillRef = React.useRef(null);
    var knobRef = React.useRef(null);
    var leftRef = React.useRef(null);
    var rightRef = React.useRef(null);
    var trackRef = React.useRef(null);
    var draggingRef = React.useRef(false);
    var open = use(function (state) {
      return state.open;
    });

    React.useEffect(
      function () {
        if (!open) return undefined;
        var engine = NT.controller.engine;
        if (!engine) return undefined;
        var raf = 0;
        var last = -1;
        var paint = function () {
          var duration = engine.duration || 0;
          var position = engine.currentTime || 0;
          var ratio = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;
          if (Math.abs(ratio - last) > 0.0005) {
            last = ratio;
            if (fillRef.current) fillRef.current.style.width = (ratio * 100).toFixed(2) + '%';
            if (knobRef.current) knobRef.current.style.left = (ratio * 100).toFixed(2) + '%';
          }
          if (leftRef.current) leftRef.current.textContent = NT.duration(position * 1000);
          if (rightRef.current) rightRef.current.textContent = NT.duration(duration * 1000);
          raf = requestAnimationFrame(paint);
        };
        raf = requestAnimationFrame(paint);
        return function () {
          cancelAnimationFrame(raf);
        };
      },
      [open],
    );

    var seekTo = function (clientX) {
      var engine = NT.controller.engine;
      var track = trackRef.current;
      if (!engine || !track || !engine.duration) return;
      var rect = track.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      engine.seek(ratio * engine.duration);
    };

    return h(
      'div',
      { className: 'ntm-progress' },
      h('span', { className: 'ntm-time', ref: leftRef }, '0:00'),
      h(
        'div',
        {
          className: 'ntm-track',
          ref: trackRef,
          role: 'slider',
          'aria-label': NT.t('now_playing'),
          tabIndex: 0,
          // Seeking is press-and-drag only: the pointer has to be down with the left
          // button, and a hover that arrives while the button is up is ignored.
          onPointerDown: function (event) {
            if (event.button !== 0) return;
            event.preventDefault();
            draggingRef.current = true;
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch (error) {
              /* capture is best effort */
            }
            seekTo(event.clientX);
          },
          onPointerMove: function (event) {
            if (!draggingRef.current) return;
            if ((event.buttons & 1) === 0) {
              draggingRef.current = false;
              return;
            }
            seekTo(event.clientX);
          },
          onPointerUp: function () {
            draggingRef.current = false;
          },
          onPointerCancel: function () {
            draggingRef.current = false;
          },
        },
        h('div', { className: 'ntm-track-fill', ref: fillRef, style: { width: '0%' } }),
        h('div', { className: 'ntm-track-knob', ref: knobRef, style: { left: '0%' } }),
      ),
      h('span', { className: 'ntm-time is-right', ref: rightRef }, '0:00'),
    );
  };

  /* ---------------------------------------------------------------- spectrum */

  NT.Spectrum = function Spectrum() {
    var hostRef = React.useRef(null);
    var enabled = use(function (state) {
      return state.spectrumOn && state.open && state.playing;
    });
    var prevPlaying = use(function (state) {
      return state.playing;
    });
    React.useEffect(
      function () {
        if (!enabled) return undefined;
        var host = hostRef.current;
        if (!host) return undefined;
        var bars = [];
        for (var i = 0; i < 9; i++) {
          var bar = document.createElement('span');
          bar.style.cssText =
            'width:2px;height:2px;border-radius:1px;background:currentColor;opacity:.6;align-self:flex-end;transition:height .1s linear;';
          host.appendChild(bar);
          bars.push(bar);
        }
        // 12fps is plenty for a 9px meter and leaves the frame budget to the app.
        var timer = setInterval(function () {
          var engine = NT.controller.engine;
          var data = engine ? engine.readSpectrum() : null;
          for (var b = 0; b < bars.length; b++) {
            var value = data ? data[Math.floor((b + 1) * 1.6)] : 0;
            bars[b].style.height = 2 + Math.round((value / 255) * 11) + 'px';
          }
        }, 80);
        return function () {
          clearInterval(timer);
          bars.forEach(function (bar) {
            if (bar.parentNode) bar.parentNode.removeChild(bar);
          });
        };
      },
      [enabled, prevPlaying],
    );
    if (!enabled) {
      return h('span', {
        style: { display: 'inline-block', width: 22, height: 13, flex: 'none', opacity: 0 },
      });
    }
    return h('div', {
      ref: hostRef,
      'aria-hidden': true,
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 2,
        width: 22,
        height: 13,
        flex: 'none',
        color: 'var(--dsw-alias-brand-primary)',
      },
    });
  };
})(NT);

/* ---- 55-views.js ---- */
/**
 * The tab views and detail screens.
 */
(function (NT) {
  'use strict';

  var React = NT.React;
  var h = NT.h;
  var store = NT.playerStore;

  function use(pick) {
    return NT.useStore(store, pick);
  }

  function debounce(value, delay) {
    var pair = React.useState(value);
    React.useEffect(
      function () {
        var timer = setTimeout(function () {
          pair[1](value);
        }, delay);
        return function () {
          clearTimeout(timer);
        };
      },
      [value, delay],
    );
    return pair[0];
  }

  /* ------------------------------------------------------------- shared list */

  NT.TrackList = function TrackList(props) {
    var tracks = props.tracks || [];
    if (!tracks.length) return h(NT.Empty, { icon: 'note', text: props.empty || NT.t('empty_list') });
    return h(
      'div',
      null,
      tracks.map(function (song, index) {
        return h(NT.SongRow, {
          key: String(song.id) + '-' + index,
          song: song,
          index: index,
          showIndex: props.showIndex !== false,
          removeTitle: props.removeTitle,
          onPlay: function () {
            NT.controller.playSongs(tracks, index, props.label, props.source);
          },
          onPick: function (target) {
            NT.controller.setPicker(target);
          },
          onRemove: props.onRemove
            ? function () {
                props.onRemove(song);
              }
            : null,
        });
      }),
    );
  };

  /* ------------------------------------------------------------------- search */

  var SEARCH_TYPES = [
    { id: 1, labelKey: 'filter_song' },
    { id: 1000, labelKey: 'filter_playlist' },
    { id: 100, labelKey: 'filter_artist' },
    { id: 10, labelKey: 'filter_album' },
  ];

  NT.SearchView = function SearchView() {
    var search = use(function (state) {
      return state.search;
    });
    var pair = React.useState(search.q || '');
    var text = pair[0];
    var setText = pair[1];
    var settled = debounce(text, 380);

    React.useEffect(
      function () {
        var query = settled.trim();
        if (!query) return;
        if (query === store.get().search.q) return;
        NT.controller.search(query, store.get().search.type);
      },
      [settled],
    );

    var submit = function () {
      var query = text.trim();
      if (query) NT.controller.search(query, search.type);
    };

    var body;
    if (!search.q) {
      body = h(NT.Empty, { icon: 'search', text: NT.t('search_empty') });
    } else if (search.loading) {
      body = h(NT.Loading);
    } else if (search.type === 1000) {
      body = search.playlists.length
        ? h(
            'div',
            { className: 'ntm-cards' },
            search.playlists.map(function (playlist) {
              return h(NT.PlaylistCard, { key: playlist.id, playlist: playlist });
            }),
          )
        : h(NT.Empty, { text: NT.t('empty_list') });
    } else if (search.type === 100) {
      body = search.artists.length
        ? h(
            'div',
            null,
            search.artists.map(function (artist) {
              return h(
                'div',
                { className: 'ntm-row', key: artist.id },
                h(NT.Cover, { src: artist.cover, size: 36, radius: 18 }),
                h(
                  'div',
                  { className: 'ntm-row-main' },
                  h('span', { className: 'ntm-row-title' }, artist.name),
                  h('span', { className: 'ntm-row-sub' }, NT.t('artist_albums', { n: artist.albumSize })),
                ),
                h(NT.IconButton, {
                  name: 'search',
                  title: NT.t('view_songs'),
                  onClick: function () {
                    setText(artist.name);
                    NT.controller.search(artist.name, 1);
                  },
                }),
              );
            }),
          )
        : h(NT.Empty, { text: NT.t('empty_list') });
    } else if (search.type === 10) {
      body = search.albums.length
        ? h(
            'div',
            { className: 'ntm-cards' },
            search.albums.map(function (album) {
              return h(
                'div',
                {
                  className: 'ntm-card',
                  key: album.id,
                  onClick: function () {
                    setText(album.name);
                    NT.controller.search(album.name, 1);
                  },
                },
                h(
                  'div',
                  { className: 'ntm-card-art' },
                  album.cover
                    ? h('img', { src: album.cover + '?param=200y200', alt: '', loading: 'lazy' })
                    : h('div', { className: 'ntm-card-fallback' }, h(NT.Icon, { name: 'disc', size: 20 })),
                ),
                h(
                  'div',
                  { className: 'ntm-card-body' },
                  h('div', { className: 'ntm-card-title' }, album.name),
                  h('div', { className: 'ntm-card-sub' }, album.artist),
                ),
              );
            }),
          )
        : h(NT.Empty, { text: NT.t('empty_list') });
    } else {
      body = h(NT.TrackList, { tracks: search.songs, label: search.q, empty: NT.t('empty_list') });
    }

    return h(
      'div',
      null,
      h(
        'div',
        { className: 'ntm-searchbar' },
        h('span', { className: 'ntm-searchbar-icon' }, h(NT.Icon, { name: 'search', size: 14 })),
        h('input', {
          className: 'ntm-input',
          placeholder: NT.t('search_placeholder'),
          value: text,
          onChange: function (event) {
            setText(event.target.value);
          },
          onKeyDown: function (event) {
            if (event.key === 'Enter') submit();
          },
          spellCheck: false,
        }),
        text
          ? h(NT.IconButton, {
              name: 'close',
              title: NT.t('clear'),
              className: 'ntm-searchbar-clear',
              onClick: function () {
                setText('');
                NT.controller.search('', search.type);
              },
            })
          : null,
      ),
      h(
        'div',
        { className: 'ntm-filters' },
        SEARCH_TYPES.map(function (type) {
          return h(
            'button',
            {
              key: type.id,
              type: 'button',
              className: NT.cls('ntm-chip', search.type === type.id && 'is-active'),
              onClick: function () {
                NT.controller.search(search.q || text, type.id);
              },
            },
            NT.t(type.labelKey),
          );
        }),
      ),
      body,
    );
  };

  /* --------------------------------------------------------------------- roam */

  NT.RoamView = function RoamView() {
    var roam = use(function (state) {
      return state.roam;
    });
    var profile = use(function (state) {
      return state.login.profile;
    });

    React.useEffect(
      function () {
        if (!store.get().roam.songs.length && !store.get().roam.loading) NT.controller.loadRoam();
      },
      [],
    );

    return h(
      'div',
      null,
      h(NT.SectionHeader, {
        title: NT.t('daily_roam'),
        count: roam.songs.length ? '(' + roam.songs.length + ')' : '',
        action: NT.t('roam_refresh'),
        onAction: function () {
          NT.controller.loadRoam();
        },
      }),
      h(
        'div',
        { className: 'ntm-hint' },
        profile ? NT.t('roam_hint') : NT.t('roam_hint') + ' · ' + NT.t('login_needed'),
      ),
      profile
        ? null
        : h(
            'div',
            { className: 'ntm-hint' },
            h(
              'button',
              {
                type: 'button',
                className: 'ntm-btn is-primary is-block',
                onClick: function () {
                  NT.controller.setDetail({ kind: 'login' });
                },
              },
              NT.t('login_title'),
            ),
          ),
      roam.loading && !roam.songs.length
        ? h(NT.Loading)
        : h(NT.TrackList, {
            tracks: roam.songs,
            label: NT.t('daily_roam'),
            empty: NT.t('empty_list'),
            source: 'roam',
            removeTitle: NT.t('not_interested'),
            onRemove: function (song) {
              NT.controller.removeRoamSong(song.id);
            },
          }),
      roam.songs.length
        ? h(
            'div',
            { className: 'ntm-hint', style: { textAlign: 'center', paddingTop: 6 } },
            roam.loading ? NT.t('loading') : NT.t('roam_refill_hint'),
          )
        : null,
    );
  };

  /* ---------------------------------------------------------------- playlists */

  function loginGate() {
    return h(
      'div',
      { className: 'ntm-login-hero' },
      h(NT.Icon, { name: 'user', size: 26 }),
      h('div', { className: 'ntm-login-title' }, NT.t('login_needed')),
      h(
        'button',
        {
          type: 'button',
          className: 'ntm-btn is-primary',
          style: { marginTop: 6 },
          onClick: function () {
            NT.controller.setDetail({ kind: 'login' });
          },
        },
        NT.t('login_title'),
      ),
    );
  }

  NT.PlaylistsView = function PlaylistsView() {
    var login = use(function (state) {
      return state.login;
    });
    var mine = use(function (state) {
      return state.myPlaylists;
    });
    var collected = use(function (state) {
      return state.collectedPlaylists;
    });
    var state = use(function (snapshot) {
      return snapshot.playlistsState;
    });

    React.useEffect(
      function () {
        if (login.profile) NT.controller.loadPlaylists();
      },
      [login.profile && login.profile.userId],
    );

    if (!login.profile) return loginGate();
    if (state === 'loading' && !mine.length) return h(NT.Loading);

    return h(
      'div',
      null,
      h(NT.SectionHeader, {
        title: NT.t('liked_songs'),
        action: null,
      }),
      h(
        'div',
        { className: 'ntm-row is-clickable', onClick: function () { NT.controller.openLiked(); } },
        h('div', { className: 'ntm-cover ntm-cover-empty', style: { width: 36, height: 36, borderRadius: 5 } }, h(NT.Icon, { name: 'heart', size: 16 })),
        h('div', { className: 'ntm-row-main' }, h('span', { className: 'ntm-row-title' }, NT.t('liked_songs'))),
        h(NT.IconButton, { name: 'chevronRight', title: NT.t('play_all') }),
      ),
      h(
        'div',
        { className: 'ntm-row is-clickable', onClick: function () { NT.controller.setDetail({ kind: 'daily' }); } },
        h('div', { className: 'ntm-cover ntm-cover-empty', style: { width: 36, height: 36, borderRadius: 5 } }, h(NT.Icon, { name: 'compass', size: 16 })),
        h('div', { className: 'ntm-row-main' }, h('span', { className: 'ntm-row-title' }, NT.t('daily'))),
        h(NT.IconButton, { name: 'chevronRight', title: NT.t('view') }),
      ),
      h(NT.SectionHeader, {
        title: NT.t('my_playlists'),
        count: mine.length ? '(' + mine.length + ')' : '',
        action: NT.t('new_playlist'),
        onAction: function () {
          NT.controller.setPicker({ id: null, name: NT.t('new_playlist') });
        },
      }),
      mine.length
        ? h(
            'div',
            { className: 'ntm-cards' },
            mine.map(function (playlist) {
              return h(NT.PlaylistCard, { key: playlist.id, playlist: playlist });
            }),
          )
        : h(NT.Empty, { text: NT.t('empty_list') }),
      collected.length
        ? h(NT.SectionHeader, { title: NT.t('collected_playlists'), count: '(' + collected.length + ')' })
        : null,
      collected.length
        ? h(
            'div',
            { className: 'ntm-cards' },
            collected.map(function (playlist) {
              return h(NT.PlaylistCard, { key: playlist.id, playlist: playlist });
            }),
          )
        : null,
    );
  };

  /* --------------------------------------------------------------------- mine */

  NT.MineView = function MineView() {
    var login = use(function (state) {
      return state.login;
    });
    var profile = login.profile;

    if (!profile) {
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ntm-login-hero' },
          h(NT.Icon, { name: 'cloud', size: 26 }),
          h('div', { className: 'ntm-login-title' }, NT.t('login_title')),
          h('div', { className: 'ntm-login-sub' }, NT.t('login_sync_hint')),
          h(
            'button',
            {
              type: 'button',
              className: 'ntm-btn is-primary',
              style: { marginTop: 8 },
              onClick: function () {
                NT.controller.setDetail({ kind: 'login' });
              },
            },
            NT.t('login_submit'),
          ),
        ),
        h(NT.SectionHeader, { title: NT.t('settings') }),
        h(
          'div',
          { className: 'ntm-row is-clickable', onClick: function () { NT.controller.setDetail({ kind: 'settings' }); } },
          h('div', { className: 'ntm-cover ntm-cover-empty', style: { width: 36, height: 36, borderRadius: 5 } }, h(NT.Icon, { name: 'sliders', size: 16 })),
          h('div', { className: 'ntm-row-main' }, h('span', { className: 'ntm-row-title' }, NT.t('quality') + ' · ' + NT.t('effects'))),
          h(NT.IconButton, { name: 'chevronRight', title: NT.t('settings') }),
        ),
      );
    }

    return h(
      'div',
      null,
      h(
        'div',
        { className: 'ntm-profile' },
        h(NT.Cover, { src: profile.avatar, size: 46, radius: 23 }),
        h(
          'div',
          { className: 'ntm-profile-main' },
          h(
            'div',
            { className: 'ntm-profile-name' },
            profile.nickname,
            profile.vipType ? h('span', { className: 'ntm-badge is-vip' }, NT.t('account_vip')) : null,
          ),
          h('div', { className: 'ntm-profile-sub' }, 'ID ' + profile.userId),
        ),
      ),
      h(NT.SectionHeader, { title: NT.t('my_music') }),
      h(
        'div',
        { className: 'ntm-row is-clickable', onClick: function () { NT.controller.openLiked(); } },
        h('div', { className: 'ntm-cover ntm-cover-empty', style: { width: 36, height: 36, borderRadius: 5 } }, h(NT.Icon, { name: 'heart', size: 16 })),
        h('div', { className: 'ntm-row-main' }, h('span', { className: 'ntm-row-title' }, NT.t('liked_songs'))),
        h(NT.IconButton, { name: 'chevronRight', title: NT.t('play_all') }),
      ),
      h(
        'div',
        { className: 'ntm-row is-clickable', onClick: function () { NT.controller.setDetail({ kind: 'daily' }); } },
        h('div', { className: 'ntm-cover ntm-cover-empty', style: { width: 36, height: 36, borderRadius: 5 } }, h(NT.Icon, { name: 'compass', size: 16 })),
        h('div', { className: 'ntm-row-main' }, h('span', { className: 'ntm-row-title' }, NT.t('daily'))),
        h(NT.IconButton, { name: 'chevronRight', title: NT.t('view') }),
      ),
      h(
        'div',
        { className: 'ntm-row is-clickable', onClick: function () { NT.controller.setDetail({ kind: 'lyrics' }); } },
        h('div', { className: 'ntm-cover ntm-cover-empty', style: { width: 36, height: 36, borderRadius: 5 } }, h(NT.Icon, { name: 'lyrics', size: 16 })),
        h('div', { className: 'ntm-row-main' }, h('span', { className: 'ntm-row-title' }, NT.t('lyrics'))),
        h(NT.IconButton, { name: 'chevronRight', title: NT.t('lyrics') }),
      ),
      h(NT.SectionHeader, { title: NT.t('settings') }),
      h(
        'div',
        { className: 'ntm-row is-clickable', onClick: function () { NT.controller.setDetail({ kind: 'settings' }); } },
        h('div', { className: 'ntm-cover ntm-cover-empty', style: { width: 36, height: 36, borderRadius: 5 } }, h(NT.Icon, { name: 'sliders', size: 16 })),
        h('div', { className: 'ntm-row-main' }, h('span', { className: 'ntm-row-title' }, NT.t('quality') + ' · ' + NT.t('effects'))),
        h(NT.IconButton, { name: 'chevronRight', title: NT.t('settings') }),
      ),
      h(
        'div',
        { style: { padding: '14px 8px 20px' } },
        h(
          'button',
          {
            type: 'button',
            className: 'ntm-btn is-block',
            onClick: function () {
              NT.controller.logout();
            },
          },
          h(NT.Icon, { name: 'logout', size: 13 }),
          NT.t('logout'),
        ),
      ),
    );
  };

  /* -------------------------------------------------------------------- login */

  var LOGIN_METHODS = [
    { id: 'qr', label: 'login_qr' },
    { id: 'phone', label: 'login_phone' },
    { id: 'cookie', label: 'login_cookie' },
  ];

  function qrPath(matrix) {
    var size = matrix.length;
    var quiet = 4;
    var d = '';
    for (var row = 0; row < size; row++) {
      var col = 0;
      while (col < size) {
        if (matrix[row][col]) {
          var start = col;
          while (col < size && matrix[row][col]) col++;
          d += 'M' + (start + quiet) + ' ' + (row + quiet) + 'h' + (col - start) + 'v1h-' + (col - start) + 'z';
        } else {
          col++;
        }
      }
    }
    return d;
  }

  NT.LoginView = function LoginView() {
    var pair = React.useState('qr');
    var method = pair[0];
    var setMethod = pair[1];
    return h(
      'div',
      { className: 'ntm-login' },
      h(
        'div',
        { className: 'ntm-login-hero' },
        h('span', { className: 'ntm-mark', style: { width: 34, height: 34, borderRadius: 10 } }, h(NT.Icon, { name: 'note', size: 18 })),
        h('div', { className: 'ntm-login-title' }, NT.t('login_title')),
        h('div', { className: 'ntm-login-sub' }, NT.t('login_sub_hint')),
      ),
      h(
        'div',
        { className: 'ntm-segmented' },
        LOGIN_METHODS.map(function (item) {
          return h(
            'button',
            {
              key: item.id,
              type: 'button',
              className: NT.cls(method === item.id && 'is-active'),
              onClick: function () {
                setMethod(item.id);
              },
            },
            NT.t(item.label),
          );
        }),
      ),
      method === 'qr' ? h(NT.QrLogin) : method === 'phone' ? h(NT.PhoneLogin) : h(NT.CookieLogin),
      h(
        'button',
        {
          type: 'button',
          className: 'ntm-btn is-ghost is-block',
          onClick: function () {
            NT.controller.back();
            NT.controller.setTab('roam');
          },
        },
        NT.t('login_later'),
      ),
    );
  };

  NT.QrLogin = function QrLogin() {
    var pair = React.useState({ status: 'loading', key: null, path: null, extent: 25, message: '' });
    var view = pair[0];
    var setView = pair[1];
    var timerRef = React.useRef(null);

    var stopPolling = function () {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    var start = function () {
      stopPolling();
      setView({ status: 'loading', key: null, path: null, message: '' });
      NT.controller
        .qrKey()
        .then(function (result) {
          var symbol = NT.qrEncode('https://music.163.com/login?codekey=' + result.key);
          setView({
            status: 'waiting',
            key: result.key,
            path: qrPath(symbol.modules),
            extent: symbol.size + 8,
            message: NT.t('login_waiting'),
          });
          timerRef.current = setInterval(function () {
            NT.controller
              .qrCheck(result.key)
              .then(function (check) {
                if (check.code === 803) {
                  stopPolling();
                  setView({ status: 'done', key: result.key, path: null, message: NT.t('login_success') });
                  setTimeout(function () {
                    NT.controller.back();
                  }, 700);
                } else if (check.code === 800) {
                  stopPolling();
                  setView({ status: 'expired', key: result.key, path: null, message: NT.t('login_expired') });
                } else if (check.code === 802) {
                  setView(function (previous) {
                    return Object.assign({}, previous, { status: 'scanned', message: NT.t('login_scanned') });
                  });
                }
              })
              .catch(function (error) {
                stopPolling();
                setView({ status: 'expired', key: null, path: null, message: error.message || NT.t('load_failed') });
              });
          }, 2000);
        })
        .catch(function (error) {
          setView({ status: 'expired', key: null, path: null, message: error.message || NT.t('load_failed') });
        });
    };

    React.useEffect(
      function () {
        start();
        return stopPolling;
      },
      [],
    );

    var overlay = null;
    if (view.status === 'expired' || view.status === 'loading' || view.status === 'done') {
      overlay = h(
        'div',
        { className: 'ntm-qr-mask' },
        view.status === 'loading' ? h(NT.Spinner) : null,
        h('span', null, view.message || NT.t('loading')),
        view.status === 'expired' ? h('span', { style: { fontSize: 11, opacity: 0.7 } }, NT.t('login_refresh')) : null,
      );
    }

    return h(
      'div',
      { className: 'ntm-qr-wrap' },
      h(
        'div',
        { className: 'ntm-qr', onClick: start, title: NT.t('login_refresh') },
        view.path
          ? h(
              'svg',
              { viewBox: '0 0 ' + view.extent + ' ' + view.extent, shapeRendering: 'crispEdges' },
              h('rect', { x: 0, y: 0, width: view.extent, height: view.extent, fill: '#fff' }),
              h('path', { d: view.path, fill: '#111' }),
            )
          : h('div', { className: 'ntm-qr-mask', style: { position: 'static', background: 'transparent' } }, h(NT.Spinner)),
        overlay,
      ),
      h('div', { className: 'ntm-qr-state' }, view.message),
      h('div', { className: 'ntm-login-sub' }, NT.t('login_scan_hint')),
    );
  };

  NT.PhoneLogin = function PhoneLogin() {
    var phonePair = React.useState('');
    var passwordPair = React.useState('');
    var busyPair = React.useState(false);
    var submit = async function () {
      busyPair[1](true);
      try {
        await NT.controller.loginPhone(phonePair[0].trim(), passwordPair[0], '86');
        NT.controller.back();
      } catch (error) {
        NT.controller.toast(error.message || NT.t('load_failed'));
      } finally {
        busyPair[1](false);
      }
    };
    return h(
      'div',
      { className: 'ntm-form' },
      h('input', {
        className: 'ntm-input',
        placeholder: NT.t('phone'),
        inputMode: 'numeric',
        value: phonePair[0],
        onChange: function (event) {
          phonePair[1](event.target.value);
        },
      }),
      h('input', {
        className: 'ntm-input',
        type: 'password',
        placeholder: NT.t('password'),
        value: passwordPair[0],
        onChange: function (event) {
          passwordPair[1](event.target.value);
        },
        onKeyDown: function (event) {
          if (event.key === 'Enter') submit();
        },
      }),
      h(
        'button',
        {
          type: 'button',
          className: 'ntm-btn is-primary is-block',
          disabled: busyPair[0] || !phonePair[0] || !passwordPair[0],
          onClick: submit,
        },
        busyPair[0] ? h(NT.Spinner) : null,
        NT.t('login_submit'),
      ),
    );
  };

  NT.CookieLogin = function CookieLogin() {
    var pair = React.useState('');
    var busy = React.useState(false);
    var submit = async function () {
      busy[1](true);
      try {
        await NT.controller.loginCookie(pair[0]);
        NT.controller.back();
      } catch (error) {
        NT.controller.toast(error.message || NT.t('load_failed'));
      } finally {
        busy[1](false);
      }
    };
    return h(
      'div',
      { className: 'ntm-form' },
      h('div', { className: 'ntm-login-sub', style: { lineHeight: 1.6 } }, NT.t('cookie_hint')),
      h('textarea', {
        className: 'ntm-textarea',
        placeholder: 'MUSIC_U=xxxx; __csrf=xxxx; ...',
        value: pair[0],
        onChange: function (event) {
          pair[1](event.target.value);
        },
      }),
      h(
        'button',
        {
          type: 'button',
          className: 'ntm-btn is-primary is-block',
          disabled: busy[0] || !pair[0].trim(),
          onClick: submit,
        },
        busy[0] ? h(NT.Spinner) : null,
        NT.t('login_submit'),
      ),
    );
  };

  /* ----------------------------------------------------------------- settings */

  function Slider(props) {
    return h(
      'div',
      { className: 'ntm-setting-ctl' },
      h('input', {
        className: 'ntm-range',
        type: 'range',
        min: props.min,
        max: props.max,
        step: props.step || 1,
        value: props.value,
        onChange: function (event) {
          props.onChange(Number(event.target.value));
        },
      }),
      h('span', { className: 'ntm-range-value' }, props.display == null ? String(props.value) : props.display),
    );
  }

  function SettingRow(props) {
    return h(
      'div',
      { className: 'ntm-setting' },
      h(
        'div',
        { className: 'ntm-setting-label' },
        h('span', { className: 'ntm-setting-name' }, props.name),
        props.desc ? h('span', { className: 'ntm-setting-desc' }, props.desc) : null,
      ),
      props.children,
    );
  }

  function Toggle(props) {
    return h(
      'button',
      {
        type: 'button',
        role: 'switch',
        'aria-checked': Boolean(props.on),
        className: NT.cls('ntm-switch', props.on && 'is-on'),
        onClick: function () {
          props.onChange(!props.on);
        },
      },
      h('span', { className: 'ntm-switch-knob' }),
    );
  }

  NT.SettingsView = function SettingsView() {
    var level = use(function (state) {
      return state.level;
    });
    var effects = use(function (state) {
      return state.effects;
    });
    var bgLyrics = use(function (state) {
      return state.bgLyrics;
    });
    var spectrumOn = use(function (state) {
      return state.spectrumOn;
    });
    var smart = use(function (state) {
      return state.smart;
    });
    var translateOn = use(function (state) {
      return state.lyricsTranslate;
    });
    var profile = use(function (state) {
      return state.login.profile;
    });
    var box = use(function (state) {
      return state.panelBox;
    });

    var set = function (patch) {
      NT.controller.setEffects(patch);
    };

    return h(
      'div',
      { className: 'ntm-settings' },
      h('div', { className: 'ntm-section' }, NT.t('quality')),
      h(
        SettingRow,
        {
          name: NT.t('quality'),
          desc: profile && profile.vipType ? NT.t('vip_ok') : NT.t('premium_needed'),
        },
        h(
          'div',
          { className: 'ntm-setting-ctl' },
          h(
            'select',
            {
              className: 'ntm-select',
              value: level,
              onChange: function (event) {
                NT.controller.setLevel(event.target.value);
              },
            },
            NT.LEVELS.map(function (item) {
              return h('option', { key: item.id, value: item.id }, NT.levelName(item) + ' · ' + item.note);
            }),
          ),
        ),
      ),

      h(
        'div',
        { className: 'ntm-section' },
        NT.t('effects'),
        h(
          'button',
          {
            type: 'button',
            className: 'ntm-section-action',
            onClick: function () {
              set({ bypass: !effects.bypass });
            },
          },
          effects.bypass ? NT.t('bypass_off') : NT.t('bypass_on'),
        ),
      ),
      h(
        SettingRow,
        { name: NT.t('eq_preset'), desc: NT.t('eq_desc') },
        h(
          'div',
          { className: 'ntm-setting-ctl' },
          h(
            'select',
            {
              className: 'ntm-select',
              value: effects.preset || 'flat',
              onChange: function (event) {
                NT.controller.applyPreset(event.target.value);
              },
            },
            Object.keys(NT.EQ_PRESETS).map(function (key) {
              return h('option', { key: key, value: key }, NT.EQ_PRESETS[key].name);
            }),
            effects.preset === 'custom' ? h('option', { value: 'custom' }, NT.t('eq_custom')) : null,
          ),
        ),
      ),
      h(
        'div',
        { className: 'ntm-eq' },
        (effects.eq || []).map(function (gain, index) {
          return h(
            'div',
            { className: 'ntm-eq-band', key: String(index) },
            h('span', null, NT.freqLabel(NT.EQ_FREQS[index])),
            h('input', {
              className: 'ntm-range',
              type: 'range',
              min: -12,
              max: 12,
              step: 1,
              value: gain,
              onChange: function (event) {
                NT.controller.setEqBand(index, Number(event.target.value));
              },
            }),
            h('span', { className: 'ntm-eq-value' }, (gain > 0 ? '+' : '') + gain),
          );
        }),
      ),
      h(SettingRow, { name: NT.t('bass'), desc: NT.t('bass_desc') }, h(Slider, {
        min: 0, max: 12, value: effects.bass || 0,
        display: (effects.bass || 0) + 'dB',
        onChange: function (value) { set({ bass: value }); },
      })),
      h(SettingRow, { name: NT.t('treble'), desc: NT.t('treble_desc') }, h(Slider, {
        min: -12, max: 12, value: effects.treble || 0,
        display: (effects.treble || 0) + 'dB',
        onChange: function (value) { set({ treble: value }); },
      })),
      h(SettingRow, { name: NT.t('width'), desc: NT.t('width_desc') }, h(Slider, {
        min: 0, max: 1, step: 0.01, value: effects.width == null ? 0.18 : effects.width,
        display: Math.round((effects.width == null ? 0.18 : effects.width) * 100) + '%',
        onChange: function (value) { set({ width: value }); },
      })),
      h(SettingRow, { name: NT.t('balance'), desc: NT.t('balance_desc') }, h(Slider, {
        min: -1, max: 1, step: 0.05, value: effects.balance || 0,
        display: (effects.balance || 0) === 0 ? NT.t('center') : (effects.balance > 0 ? 'R' : 'L') + Math.round(Math.abs(effects.balance) * 100),
        onChange: function (value) { set({ balance: value }); },
      })),
      h(SettingRow, { name: NT.t('reverb'), desc: NT.t('reverb_desc') }, h(Slider, {
        min: 0, max: 0.85, step: 0.01, value: effects.reverb || 0,
        display: Math.round((effects.reverb || 0) * 100) + '%',
        onChange: function (value) { set({ reverb: value }); },
      })),
      h(SettingRow, { name: NT.t('rate'), desc: NT.t('rate_desc') }, h(Slider, {
        min: 0.75, max: 1.25, step: 0.05, value: effects.rate || 1,
        display: (effects.rate || 1).toFixed(2) + 'x',
        onChange: function (value) { set({ rate: value }); },
      })),
      h(SettingRow, { name: NT.t('fx_mono'), desc: NT.t('fx_mono_desc') },
        h(Toggle, { on: Boolean(effects.mono), onChange: function (on) { set({ mono: on }); } })),
      h(SettingRow, { name: NT.t('fx_vocal'), desc: NT.t('fx_vocal_desc') },
        h(Toggle, { on: Boolean(effects.vocal), onChange: function (on) { set({ vocal: on }); } })),
      h(SettingRow, { name: NT.t('fx_dynamics'), desc: NT.t('fx_dynamics_desc') },
        h(Toggle, { on: effects.comp !== false, onChange: function (on) { set({ comp: on }); } })),
      h(SettingRow, { name: NT.t('fx_normalize'), desc: NT.t('fx_normalize_desc') },
        h(Toggle, { on: effects.normalize !== false, onChange: function (on) { set({ normalize: on }); } })),
      h(SettingRow, { name: NT.t('spectrum'), desc: NT.t('spectrum_desc') },
        h(Toggle, {
          on: spectrumOn,
          onChange: function () { NT.controller.toggleSpectrum(); },
        })),

      h('div', { className: 'ntm-section' }, NT.t('bg_lyrics')),
      h(SettingRow, { name: NT.t('bg_lyrics_on'), desc: NT.t('bg_lyrics_desc') },
        h(Toggle, { on: Boolean(bgLyrics.on), onChange: function (on) { NT.controller.setBgLyrics({ on: on }); } })),
      h(SettingRow, { name: NT.t('bg_opacity') }, h(Slider, {
        min: 0.08, max: 1, step: 0.02, value: bgLyrics.opacity,
        display: Math.round(bgLyrics.opacity * 100) + '%',
        onChange: function (value) { NT.controller.setBgLyrics({ opacity: value }); },
      })),
      h(SettingRow, { name: NT.t('bg_size') }, h(Slider, {
        min: 18, max: 72, step: 1, value: bgLyrics.size,
        display: bgLyrics.size + 'px',
        onChange: function (value) { NT.controller.setBgLyrics({ size: value }); },
      })),
      h(SettingRow, { name: NT.t('bg_position') }, h(Slider, {
        min: 8, max: 92, step: 1, value: bgLyrics.offset == null ? 78 : bgLyrics.offset,
        display: (bgLyrics.offset == null ? 78 : bgLyrics.offset) + '%',
        onChange: function (value) { NT.controller.setBgLyrics({ offset: value }); },
      })),
      h(SettingRow, { name: NT.t('bg_offset_x') }, h(Slider, {
        min: 0, max: 100, step: 1, value: bgLyrics.offsetX == null ? 50 : bgLyrics.offsetX,
        display: (bgLyrics.offsetX == null ? 50 : bgLyrics.offsetX) + '%',
        onChange: function (value) { NT.controller.setBgLyrics({ offsetX: value }); },
      })),
      h('div', { className: 'ntm-section' }, NT.t('typography')),
      h(
        SettingRow,
        { name: NT.t('lyrics_align') },
        h(
          'div',
          { className: 'ntm-segmented', style: { width: 150 } },
          ['left', 'center', 'right'].map(function (key) {
            return h(
              'button',
              {
                key: key,
                type: 'button',
                className: NT.cls((bgLyrics.align || 'center') === key && 'is-active'),
                onClick: function () {
                  NT.controller.setBgLyrics({ align: key });
                },
              },
              NT.t('align_' + key),
            );
          }),
        ),
      ),
      h(SettingRow, { name: NT.t('lyrics_line_height') }, h(Slider, {
        min: 1.1, max: 2, step: 0.02, value: bgLyrics.lineHeight == null ? 1.32 : bgLyrics.lineHeight,
        display: (bgLyrics.lineHeight == null ? 1.32 : bgLyrics.lineHeight).toFixed(2),
        onChange: function (value) { NT.controller.setBgLyrics({ lineHeight: value }); },
      })),
      h(
        SettingRow,
        { name: NT.t('lyrics_weight') },
        h(
          'div',
          { className: 'ntm-setting-ctl' },
          h(
            'select',
            {
              className: 'ntm-select',
              value: String(bgLyrics.weight || 700),
              onChange: function (event) {
                NT.controller.setBgLyrics({ weight: Number(event.target.value) });
              },
            },
            h('option', { value: '400' }, NT.t('weight_regular')),
            h('option', { value: '600' }, NT.t('weight_medium')),
            h('option', { value: '700' }, NT.t('weight_bold')),
            h('option', { value: '800' }, NT.t('weight_black')),
          ),
        ),
      ),
      h(SettingRow, { name: NT.t('lyrics_translate'), desc: NT.t('lyrics_translate_desc') },
        h(Toggle, {
          on: Boolean(translateOn),
          onChange: function (on) { NT.controller.setLyricsTranslate(on); },
        })),

      h('div', { className: 'ntm-section' }, NT.t('smart')),
      h(SettingRow, {
        name: NT.t('smart_eq'),
        desc: smart.state === 'ready' ? NT.t('smart_eq_ready') : smart.state === 'learning' ? NT.t('smart_eq_learning') : NT.t('smart_eq_desc'),
      }, h(Toggle, { on: Boolean(effects.smartEq), onChange: function (on) { set({ smartEq: on }); } })),
      h(
        SettingRow,
        { name: NT.t('recalibrate'), desc: NT.t('smart_eq_desc') },
        h(
          'button',
          {
            type: 'button',
            className: 'ntm-btn',
            disabled: !effects.smartEq,
            onClick: function () {
              NT.controller.resetSmart();
            },
          },
          NT.t('recalibrate'),
        ),
      ),
      h(SettingRow, { name: NT.t('smart_bass'), desc: NT.t('smart_bass_desc') },
        h(Toggle, { on: Boolean(effects.smartBass), onChange: function (on) { set({ smartBass: on }); } })),
      h(SettingRow, { name: NT.t('crossfeed'), desc: NT.t('crossfeed_desc') },
        h(Toggle, { on: Boolean(effects.crossfeed), onChange: function (on) { set({ crossfeed: on }); } })),
      h(SettingRow, { name: NT.t('crossfeed_amount') }, h(Slider, {
        min: 0.05, max: 0.6, step: 0.01, value: effects.crossfeedAmount == null ? 0.22 : effects.crossfeedAmount,
        display: Math.round((effects.crossfeedAmount == null ? 0.22 : effects.crossfeedAmount) * 100) + '%',
        onChange: function (value) { set({ crossfeedAmount: value }); },
      })),

      h('div', { className: 'ntm-section' }, NT.t('window')),
      h(
        SettingRow,
        { name: NT.t('panel_pos'), desc: box ? NT.t('panel_pos_custom') : NT.t('panel_pos_docked') },
        h(
          'button',
          {
            type: 'button',
            className: 'ntm-btn',
            disabled: !box,
            onClick: function () {
              NT.controller.resetPanelBox();
            },
          },
          NT.t('reset'),
        ),
      ),

      h(
        'div',
        { style: { padding: '12px 10px 0' } },
        h(
          'button',
          {
            type: 'button',
            className: 'ntm-btn is-block',
            onClick: function () {
              NT.controller.resetEffects();
            },
          },
          NT.t('reset') + ' · ' + NT.t('effects'),
        ),
      ),
    );
  };



  /* ------------------------------------------------------------------- lyrics */

  NT.LyricsView = function LyricsView() {
    var lyrics = use(function (state) {
      return state.lyrics;
    });
    var translateOn = use(function (state) {
      return state.lyricsTranslate;
    });
    var listRef = React.useRef(null);


    React.useEffect(
      function () {
        var host = listRef.current;
        if (!host) return;
        var node = host.querySelector('.ntm-lyrics-line.is-active');
        if (node && node.scrollIntoView) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      },
      [lyrics.active],
    );

    if (lyrics.loading) return h(NT.Loading);
    if (!lyrics.lines.length) return h(NT.Empty, { icon: 'lyrics', text: NT.t('no_lyrics') });

    return h(
      'div',
      { className: 'ntm-lyrics', ref: listRef },
      lyrics.lines.map(function (line, index) {
        return h(
          'div',
          { key: index, className: NT.cls('ntm-lyrics-line', lyrics.active === index && 'is-active') },
          h('span', null, line.text || '·'),
          translateOn && line.tr ? h('span', { className: 'ntm-lyrics-tr' }, line.tr) : null,
        );
      }),
    );
  };

  /* ------------------------------------------------------------- detail views */

  NT.PlaylistDetailView = function PlaylistDetailView(props) {
    var detail = props.detail;
    var profile = use(function (state) {
      return state.login.profile;
    });

    if (detail.loading) {
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ntm-plhead' },
          h(NT.Cover, { src: null, size: 84, radius: 10 }),
          h(
            'div',
            { className: 'ntm-plhead-main' },
            h('div', { className: 'ntm-plhead-title' }, detail.name || NT.t('loading')),
            h('div', { className: 'ntm-plhead-meta' }, NT.t('loading')),
          ),
        ),
        h(NT.Loading),
      );
    }

    var playlist = detail.playlist || { name: detail.name };
    var isOwn = Boolean(profile && playlist.creator && String(profile.userId) === String(playlist.creator.id));
    return h(
      'div',
      null,
      h(
        'div',
        { className: 'ntm-plhead' },
        h(NT.Cover, { src: playlist.cover, size: 84, radius: 10 }),
        h(
          'div',
          { className: 'ntm-plhead-main' },
          h('div', { className: 'ntm-plhead-title' }, playlist.name || detail.name),
          h(
            'div',
            { className: 'ntm-plhead-meta' },
            (playlist.trackCount || detail.tracks.length) + ' ' + NT.t('songs_unit'),
            playlist.playCount ? ' · ' + NT.playCount(playlist.playCount) + ' ' + NT.t('plays') : '',
            playlist.creator ? ' · ' + playlist.creator.name : '',
          ),
          playlist.description ? h('div', { className: 'ntm-plhead-desc' }, playlist.description) : null,
          h(
            'div',
            { className: 'ntm-plhead-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'ntm-btn is-primary',
                onClick: function () {
                  NT.controller.playSongs(detail.tracks, 0, playlist.name || detail.name);
                },
              },
              h(NT.Icon, { name: 'play', size: 12 }),
              NT.t('play_all'),
            ),
            h(NT.IconButton, {
              name: 'listMusic',
              title: NT.t('add_queue'),
              onClick: function () {
                NT.controller.setPicker({ id: null, name: playlist.name });
              },
            }),
          ),
        ),
      ),
      h(NT.TrackList, {
        tracks: detail.tracks,
        label: playlist.name || detail.name,
        empty: NT.t('empty_playlist'),
        onRemove: isOwn
          ? function (song) {
              NT.controller.removeFromPlaylist(detail.id, song.id);
            }
          : null,
      }),
    );
  };

  NT.DailyDetailView = function DailyDetailView() {
    var pair = React.useState({ loading: true, songs: [] });
    var daily = pair[0];
    var setDaily = pair[1];

    React.useEffect(
      function () {
        var alive = true;
        NT.api('recommend.songs')
          .then(function (result) {
            if (alive) setDaily({ loading: false, songs: result.songs || [] });
          })
          .catch(function (error) {
            if (!alive) return;
            setDaily({ loading: false, songs: [] });
            NT.controller.toast(error.message || NT.t('load_failed'));
          });
        return function () {
          alive = false;
        };
      },
      [],
    );

    if (daily.loading) return h(NT.Loading);
    return h(
      'div',
      null,
      h(NT.SectionHeader, {
        title: NT.t('daily'),
        count: daily.songs.length ? '(' + daily.songs.length + ')' : '',
        action: NT.t('play_all'),
        onAction: function () {
          NT.controller.playSongs(daily.songs, 0, NT.t('daily'));
        },
      }),
      h(NT.TrackList, { tracks: daily.songs, label: NT.t('daily'), empty: NT.t('login_needed') }),
    );
  };
})(NT);

/* ---- 60-player.js ---- */
/**
 * The persistent playback bar at the bottom of the panel.
 *
 * Three rows, each with one job: what is playing, where we are in it, and what the
 * buttons do. Cramming transport, quality and volume onto a single line is what made
 * the first version unreadable at 400px.
 */
(function (NT) {
  'use strict';

  var React = NT.React;
  var h = NT.h;
  var store = NT.playerStore;

  function use(pick) {
    return NT.useStore(store, pick);
  }

  var MODE_ICON = { order: 'repeat', single: 'repeatOne', shuffle: 'shuffle' };
  var MODE_LABEL = { order: 'mode_order', single: 'mode_single', shuffle: 'mode_shuffle' };

  NT.PlayerBar = function PlayerBar() {
    var song = use(function (state) {
      return state.index >= 0 && state.queue[state.index] ? state.queue[state.index] : null;
    });
    var playing = use(function (state) {
      return state.playing;
    });
    var buffering = use(function (state) {
      return state.buffering;
    });
    var mode = use(function (state) {
      return state.mode;
    });
    var level = use(function (state) {
      return state.level;
    });
    var volume = use(function (state) {
      return state.volume;
    });
    var muted = use(function (state) {
      return state.muted;
    });
    var liked = use(function (state) {
      return song ? state.liked.has(Number(song.id)) : false;
    });
    var info = use(function (state) {
      return state.currentUrlInfo;
    });

    var menuPair = React.useState(false);
    var menuOpen = menuPair[0];
    var setMenuOpen = menuPair[1];

    React.useEffect(
      function () {
        if (!menuOpen) return undefined;
        var close = function (event) {
          var target = event.target;
          if (target && target.closest && target.closest('.ntm-menu-wrap')) return;
          setMenuOpen(false);
        };
        document.addEventListener('mousedown', close, true);
        return function () {
          document.removeEventListener('mousedown', close, true);
        };
      },
      [menuOpen],
    );

    var levelInfo = null;
    for (var i = 0; i < NT.LEVELS.length; i++) {
      if (NT.LEVELS[i].id === level) levelInfo = NT.LEVELS[i];
    }
    // "3220k" is technically true for a master stream but reads like noise; past CD
    // bitrate the tier name says more.
    var bitrateLabel = levelInfo ? levelInfo.note : '320k';
    if (info && info.br) {
      bitrateLabel = info.br >= 1500 ? NT.levelName(levelInfo || { name: 'Hi-Res' }) : Math.round(info.br / 1000) + 'k';
    }

    return h(
      'footer',
      { className: 'ntm-player' },
      h(
        'div',
        { className: 'ntm-now' },
        h(NT.Cover, { src: song ? song.cover : null, size: 42, radius: 7 }),
        h(
          'div',
          { className: 'ntm-now-main' },
          h('div', { className: 'ntm-now-title', title: song ? song.name : '' }, song ? song.name : NT.t('now_playing')),
          h(
            'div',
            { className: 'ntm-now-sub', title: song ? NT.artistLine(song) : '' },
            song ? NT.artistLine(song) + (buffering ? ' · ' + NT.t('buffering') : '') : NT.t('pick_song'),
          ),
        ),
        h('div', { className: 'ntm-now-actions' }, h(NT.Spectrum)),
        song
          ? h(NT.IconButton, {
              name: liked ? 'heartFill' : 'heart',
              active: liked,
              title: liked ? NT.t('liked') : NT.t('like'),
              onClick: function () {
                NT.controller.toggleLike(song);
              },
            })
          : null,
        h(
          'div',
          { className: 'ntm-menu-wrap' },
          h(NT.IconButton, {
            name: 'more',
            title: NT.t('more'),
            onClick: function () {
              setMenuOpen(!menuOpen);
            },
          }),
          menuOpen
            ? h(
                'div',
                { className: 'ntm-menu' },
                song
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'ntm-menu-item',
                        onClick: function () {
                          setMenuOpen(false);
                          NT.controller.setDetail({ kind: 'lyrics' });
                        },
                      },
                      h(NT.Icon, { name: 'lyrics', size: 14 }),
                      NT.t('lyrics'),
                    )
                  : null,
                song
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'ntm-menu-item',
                        onClick: function () {
                          setMenuOpen(false);
                          NT.controller.setPicker(song);
                        },
                      },
                      h(NT.Icon, { name: 'plus', size: 14 }),
                      NT.t('add_to_playlist'),
                    )
                  : null,
                h('div', { className: 'ntm-menu-sep' }),
                h('div', { className: 'ntm-menu-label' }, NT.t('quality')),
                NT.LEVELS.map(function (item) {
                  return h(
                    'button',
                    {
                      key: item.id,
                      type: 'button',
                      className: 'ntm-menu-item',
                      onClick: function () {
                        setMenuOpen(false);
                        NT.controller.setLevel(item.id);
                      },
                    },
                    level === item.id
                      ? h(NT.Icon, { name: 'check', size: 14 })
                      : h('span', { style: { width: 14, flex: 'none' } }),
                    NT.levelName(item),
                    h('span', { className: 'ntm-menu-sub' }, item.note),
                  );
                }),
                h('div', { className: 'ntm-menu-sep' }),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ntm-menu-item',
                    onClick: function () {
                      setMenuOpen(false);
                      NT.controller.setDetail({ kind: 'settings' });
                    },
                  },
                  h(NT.Icon, { name: 'sliders', size: 14 }),
                  NT.t('effects') + ' · ' + NT.t('settings'),
                ),
              )
            : null,
        ),
      ),
      song
        ? h(NT.ProgressBar)
        : h(
            'div',
            { className: 'ntm-progress', style: { opacity: 0.5 } },
            h('span', { className: 'ntm-time' }, '0:00'),
            h('div', { className: 'ntm-track' }),
            h('span', { className: 'ntm-time is-right' }, '0:00'),
          ),
      h(
        'div',
        { className: 'ntm-controls' },
        h(
          'div',
          { className: 'ntm-controls-left' },
          h(NT.IconButton, {
            name: MODE_ICON[mode],
            title: NT.t(MODE_LABEL[mode]),
            onClick: function () {
              NT.controller.cycleMode();
            },
          }),
        ),
        h(
          'div',
          { className: 'ntm-controls-center' },
          h(NT.IconButton, {
            name: 'prev',
            title: NT.t('prev'),
            onClick: function () {
              NT.controller.prev();
            },
            disabled: !song,
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'ntm-play',
              title: playing ? NT.t('pause') : NT.t('play'),
              'aria-label': playing ? NT.t('pause') : NT.t('play'),
              disabled: !song,
              onClick: function () {
                NT.controller.toggle();
              },
            },
            buffering && !playing ? h(NT.Spinner) : h(NT.Icon, { name: playing ? 'pause' : 'play', size: 15 }),
          ),
          h(NT.IconButton, {
            name: 'next',
            title: NT.t('next'),
            onClick: function () {
              NT.controller.next();
            },
            disabled: !song,
          }),
        ),
        h(
          'div',
          { className: 'ntm-controls-right' },
          h(
            'button',
            {
              type: 'button',
              className: 'ntm-badge',
              title: NT.t('quality'),
              onClick: function () {
                setMenuOpen(true);
              },
            },
            bitrateLabel,
          ),
          h(
            'div',
            { className: 'ntm-vol' },
            h(NT.IconButton, {
              name: muted || volume === 0 ? 'volumeMute' : 'volume',
              title: NT.t('volume'),
              onClick: function () {
                NT.controller.toggleMute();
              },
            }),
            h('input', {
              className: 'ntm-range',
              type: 'range',
              min: 0,
              max: 1,
              step: 0.01,
              value: muted ? 0 : volume,
              onChange: function (event) {
                NT.controller.setVolume(Number(event.target.value));
              },
              'aria-label': NT.t('volume'),
            }),
          ),
        ),
      ),
    );
  };
})(NT);

/* ---- 70-dock.js ---- */
/**
 * Two surfaces outside the panel itself:
 *  · the ambient strip under the composer (`conversation.composer.dock`), and
 *  · the lyric line painted into the page background.
 *
 * The dock is the always-visible one, so it carries the controls you reach for while
 * typing: seek by dragging its progress line, volume, quality and the effect preset.
 * Everything else lives one click away in the panel.
 */
(function (NT) {
  'use strict';

  var React = NT.React;
  var h = NT.h;
  var store = NT.playerStore;

  function use(pick) {
    return NT.useStore(store, pick);
  }

  /* ----------------------------------------------------------- composer dock */

  NT.DockBar = function DockBar() {
    var song = use(function (state) {
      return state.index >= 0 && state.queue[state.index] ? state.queue[state.index] : null;
    });
    var playing = use(function (state) {
      return state.playing;
    });
    var buffering = use(function (state) {
      return state.buffering;
    });
    var liked = use(function (state) {
      return song ? state.liked.has(Number(song.id)) : false;
    });
    var volume = use(function (state) {
      return state.volume;
    });
    var muted = use(function (state) {
      return state.muted;
    });
    var fillRef = React.useRef(null);
    var timeRef = React.useRef(null);
    var trackRef = React.useRef(null);
    var draggingRef = React.useRef(false);
    var volPair = React.useState(false);
    var volOpen = volPair[0];
    var setVolOpen = volPair[1];
    var volTimer = React.useRef(null);

    function openVolume() {
      if (volTimer.current) {
        clearTimeout(volTimer.current);
        volTimer.current = null;
      }
      setVolOpen(true);
    }
    function scheduleVolumeClose() {
      if (volTimer.current) clearTimeout(volTimer.current);
      volTimer.current = setTimeout(function () {
        volTimer.current = null;
        setVolOpen(false);
      }, 220);
    }

    React.useEffect(
      function () {
        return function () {
          if (volTimer.current) clearTimeout(volTimer.current);
        };
      },
      [],
    );
    var active = Boolean(song);

    React.useEffect(
      function () {
        if (!active) return undefined;
        var timer = setInterval(function () {
          var engine = NT.controller.engine;
          if (!engine) return;
          var duration = engine.duration || 0;
          var ratio = duration > 0 ? Math.max(0, Math.min(1, engine.currentTime / duration)) : 0;
          if (fillRef.current) fillRef.current.style.width = (ratio * 100).toFixed(2) + '%';
          if (timeRef.current) timeRef.current.textContent = NT.duration(engine.currentTime * 1000);
        }, 250);
        return function () {
          clearInterval(timer);
        };
      },
      [active],
    );

    var seekTo = function (clientX) {
      var engine = NT.controller.engine;
      var track = trackRef.current;
      if (!engine || !track || !engine.duration) return;
      var rect = track.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      engine.seek(ratio * engine.duration);
      if (fillRef.current) fillRef.current.style.width = (ratio * 100).toFixed(2) + '%';
    };

    if (!song) return null;

    return h(
      'div',
      { className: 'ntm-root ntm-dock-wrap', style: { marginTop: 6 } },
      h(NT.StyleTag),
      volOpen
        ? h(
            'div',
            { className: 'ntm-volpop', onMouseEnter: openVolume, onMouseLeave: scheduleVolumeClose },
            h('input', {
              className: 'ntm-volpop-range',
              type: 'range',
              min: 0,
              max: 1,
              step: 0.01,
              value: muted ? 0 : volume,
              onChange: function (event) {
                NT.controller.setVolume(Number(event.target.value));
              },
              'aria-label': NT.t('volume'),
            }),
            h('span', { className: 'ntm-volpop-value' }, Math.round((muted ? 0 : volume) * 100) + '%'),
          )
        : null,
      h(
        'div',
        { className: 'ntm-dock', role: 'group', 'aria-label': NT.t('now_playing') },
        h(
          'button',
          {
            type: 'button',
            className: 'ntm-dock-open',
            title: NT.t('open'),
            onClick: function () {
              NT.controller.openPanel();
            },
          },
          h(NT.Cover, { src: song.cover, size: 26, radius: 7 }),
          h(
            'span',
            { className: 'ntm-dock-text' },
            h('span', { className: 'ntm-dock-title' }, song.name),
            h('span', { className: 'ntm-dock-artist' }, NT.artistLine(song)),
          ),
        ),
        h('span', { className: 'ntm-dock-time', ref: timeRef }, '0:00'),
        h(
          'span',
          { className: 'ntm-dock-controls' },
          h(NT.IconButton, {
            name: 'prev',
            title: NT.t('prev'),
            onClick: function () {
              NT.controller.prev();
            },
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'ntm-dock-play',
              title: playing ? NT.t('pause') : NT.t('play'),
              onClick: function () {
                NT.controller.toggle();
              },
            },
            buffering && !playing ? h(NT.Spinner) : h(NT.Icon, { name: playing ? 'pause' : 'play', size: 12 }),
          ),
          h(NT.IconButton, {
            name: 'next',
            title: NT.t('next'),
            onClick: function () {
              NT.controller.next();
            },
          }),
        ),
        h(NT.IconButton, {
          name: liked ? 'heartFill' : 'heart',
          active: liked,
          title: liked ? NT.t('liked') : NT.t('like'),
          onClick: function () {
            NT.controller.toggleLike(song);
          },
        }),
        // Volume: click toggles mute, hovering reveals a vertical slider.
        h(
          'div',
          {
            className: 'ntm-volwrap',
            onMouseEnter: openVolume,
            onMouseLeave: scheduleVolumeClose,
          },
          h(NT.IconButton, {
            name: muted || volume === 0 ? 'volumeMute' : 'volume',
            title: muted ? NT.t('unmute') : NT.t('mute'),
            active: volOpen,
            onClick: function () {
              NT.controller.toggleMute();
            },
          }),
        ),
        // Everything detailed lives in the panel's settings screen.
        h(NT.IconButton, {
          name: 'sliders',
          title: NT.t('open_settings'),
          onClick: function () {
            NT.controller.setDetail({ kind: 'settings' });
            NT.controller.openPanel();
          },
        }),
        h(
          'div',
          {
            className: 'ntm-dock-track',
            ref: trackRef,
            role: 'slider',
            'aria-label': NT.t('now_playing'),
            onPointerDown: function (event) {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              draggingRef.current = true;
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch (error) {
                /* capture is best effort */
              }
              seekTo(event.clientX);
            },
            onPointerMove: function (event) {
              if (!draggingRef.current) return;
              if ((event.buttons & 1) === 0) {
                draggingRef.current = false;
                return;
              }
              seekTo(event.clientX);
            },
            onPointerUp: function () {
              draggingRef.current = false;
            },
            onPointerCancel: function () {
              draggingRef.current = false;
            },
          },
          h('span', { className: 'ntm-dock-fill', ref: fillRef, style: { width: '0%' } }),
        ),
      ),
    );
  };

  /* ------------------------------------------------------- background lyrics */

  NT.BgLyrics = function BgLyrics() {
    var settings = use(function (state) {
      return state.bgLyrics;
    });
    var lines = use(function (state) {
      return state.lyrics.lines;
    });
    var active = use(function (state) {
      return state.lyrics.active;
    });
    var playing = use(function (state) {
      return state.playing;
    });
    var open = use(function (state) {
      return state.open;
    });
    var translate = use(function (state) {
      return state.lyricsTranslate;
    });

    if (!settings.on || !lines.length || active < 0) return null;
    var currentLine = lines[active] ? lines[active].text : '';
    var nextLine = lines[active + 1] ? lines[active + 1].text : '';
    var currentTr = translate && lines[active] ? lines[active].tr || '' : '';
    if (!currentLine) return null;

    return h(
      'div',
      {
        className: 'ntm-bglyrics',
        'aria-hidden': true,
        style: {
          '--ntm-bg-opacity': String(settings.opacity == null ? 0.42 : settings.opacity),
          '--ntm-bg-size': String(settings.size || 34) + 'px',
          '--ntm-bg-offset': String(settings.offset == null ? 78 : settings.offset),
          '--ntm-bg-x': String(settings.offsetX == null ? 50 : settings.offsetX),
          '--ntm-bg-align': settings.align || 'center',
          '--ntm-bg-lh': String(settings.lineHeight == null ? 1.32 : settings.lineHeight),
          '--ntm-bg-weight': String(settings.weight || 700),
          opacity: playing || open ? 1 : 0.55,
        },
      },
      h(NT.StyleTag),
      h(
        'div',
        { className: 'ntm-bglyrics-inner' },
        h('div', { className: 'ntm-bglyrics-line' }, currentLine),
        currentTr ? h('div', { className: 'ntm-bglyrics-tr' }, currentTr) : null,
        nextLine ? h('div', { className: 'ntm-bglyrics-next' }, nextLine) : null,
      ),
    );
  };
})(NT);

/* ---- 90-apply.js ---- */
/**
 * Entry point of the Client half: wire the player to three seats.
 *
 *  · `conversation.session.header.utilities` — the top-right icon.
 *  · `shell.overlay` — the frame-wide floating layer: the panel, the fallback trigger,
 *    and the lyric line painted into the background.
 *  · `conversation.composer.dock` — the ambient strip under the composer.
 */
(function (NT) {
  'use strict';

  NT.OverlayRoot = function OverlayRoot() {
    var React = NT.React;
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(NT.MusicPanel),
      React.createElement(NT.FloatTrigger),
      React.createElement(NT.BgLyrics),
    );
  };

  NT.apply = function (ctx) {
    NT.controller.boot(ctx);

    // Opt-in observability: the headless smoke test (and anyone debugging in devtools)
    // sets this flag before activation to reach the store. It is inert otherwise.
    if (typeof window !== 'undefined' && window.__DSH_NETEASE_MUSIC_DEBUG__) {
      window.__DSH_NETEASE_MUSIC__ = NT;
    }

    ctx.slots.inject('conversation.session.header.utilities', function () {
      return ctx.slots.register(
        {
          name: 'conversation.session.header.utilities',
          id: 'netease-music-trigger',
          order: 40,
          label: NT.t('open'),
        },
        NT.HeaderTrigger,
      );
    });

    ctx.slots.inject('conversation.composer.dock', function () {
      return ctx.slots.register(
        {
          name: 'conversation.composer.dock',
          id: 'netease-music-dock',
          order: 20,
          label: NT.t('now_playing'),
        },
        NT.DockBar,
      );
    });

    ctx.slots.inject('shell.overlay', function () {
      return ctx.slots.register(
        {
          name: 'shell.overlay',
          id: 'netease-music-overlay',
          order: 60,
          label: NT.t('title'),
        },
        NT.OverlayRoot,
      );
    });
  };
})(NT);

    return {
      inject: ['slots'],
      apply(ctx) {
        NT.apply(ctx);
      },
    };
  },
});
