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
