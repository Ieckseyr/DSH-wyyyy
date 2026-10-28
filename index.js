/**
 * Host half of the NetEase Cloud Music player.
 *
 * Responsibilities: hold the account cookie, translate the panel's commands into
 * `weapi` calls, and stream audio back through this origin. The Client half owns all
 * rendering and playback; nothing here knows about pixels.
 */
import { registerRoutes } from './lib/routes.js';
import { createStore } from './lib/store.js';

export const name = 'netease-music';

/** The browser carrier is the only hard dependency: without it the panel has no data. */
export const inject = ['webServer'];

export function apply(ctx) {
  const store = createStore();
  const apiCtx = { store };

  // Warm the jar before the first request so a restart resumes the session.
  store.load().catch(() => {});

  ctx.effect(() => registerRoutes(ctx.webServer, apiCtx), 'netease-music: host routes');
}
