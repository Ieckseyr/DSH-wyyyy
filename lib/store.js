/**
 * Durable state for the music plugin: the NetEase cookie jar.
 *
 * Login is the one thing the browser cannot keep for us — the cookie must survive
 * page reloads and Host restarts, and it must never be handed back to the Client.
 * Everything else the player needs is a preference and lives in `localStorage`.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

function resolveDataDir() {
  const explicit = process.env.NETEASE_MUSIC_DATA_DIR;
  if (explicit) return explicit;
  const profileDir = process.env.DSH_PROFILE_DIR;
  if (profileDir) return join(profileDir, '.netease-music');
  return join(homedir(), '.dsh', 'netease-music');
}

export function createStore() {
  const dir = resolveDataDir();
  const file = join(dir, 'session.json');
  /** @type {Record<string, string>} */
  let cookie = {};
  let loaded = null;

  async function load() {
    if (!loaded) {
      loaded = (async () => {
        try {
          const text = await readFile(file, 'utf8');
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed.cookie === 'object' && parsed.cookie) cookie = { ...parsed.cookie };
        } catch {
          /* first run, or an unreadable file: start signed out */
        }
        return cookie;
      })();
    }
    return loaded;
  }

  async function persist() {
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ cookie, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    await rename(tmp, file);
  }

  return {
    dir,
    get cookie() {
      return cookie;
    },
    hasLogin() {
      return Boolean(cookie.MUSIC_U);
    },
    /** Merge freshly received cookies; the site sends partial updates on login. */
    async absorb(pairs, revokeRemaining = false) {
      if (revokeRemaining) cookie = {};
      for (const [name, value] of pairs) {
        if (!value || value === '""') delete cookie[name];
        else cookie[name] = value;
      }
      await persist();
      return cookie;
    },
    /** Replace the whole jar, e.g. when the user pastes a raw `Cookie:` header. */
    async replace(next) {
      cookie = { ...next };
      await persist();
      return cookie;
    },
    async clear() {
      cookie = {};
      await persist();
      return cookie;
    },
    async load() {
      return load();
    },
  };
}
