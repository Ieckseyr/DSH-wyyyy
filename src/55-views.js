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
