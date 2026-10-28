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
