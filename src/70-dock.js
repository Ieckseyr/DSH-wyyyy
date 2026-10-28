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
