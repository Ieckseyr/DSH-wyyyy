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
