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
