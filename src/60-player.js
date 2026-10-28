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
