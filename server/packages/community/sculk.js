const CONFIG_KEY = '/.config/sculk.json';

function ensureConfigDir() {
  if (!window.fs.existsSync('/.config')) window.fs.mkdirSync('/.config');
}

function loadConfig() {
  try {
    return JSON.parse(window.fs.readFileSync(CONFIG_KEY, 'utf8'));
  } catch {
    return { apiBase: 'http://localhost:8787', session: '' };
  }
}

function saveConfig(config) {
  ensureConfigDir();
  window.fs.writeFileSync(CONFIG_KEY, JSON.stringify(config, null, 2));
}

function joinUrl(base, path) {
  if (!base) return path;
  const normalized = String(base).replace(/\/$/, '');
  return `${normalized}${path}`;
}

export default class SculkStoreCommand {
  description() {
    return 'Sculk ID login and Sculk API utilities for NE-DOS Store';
  }

  help(term) {
    term.writeln('Usage:');
    term.writeln('  sculk config [storeApiUrl]');
    term.writeln('  sculk authorize');
    term.writeln('  sculk callback');
    term.writeln('  sculk auth token <token>');
    term.writeln('  sculk auth code <code>');
    term.writeln('  sculk account');
    term.writeln('  sculk logout');
  }

  async execute(term, params) {
    const action = String(params[1] || '').toLowerCase();
    const config = loadConfig();

    if (!action) {
      this.help(term);
      return;
    }

    if (action === 'config') {
      const url = params[2];
      if (url) {
        config.apiBase = url;
        saveConfig(config);
      }
      term.writeln(`Store API: ${config.apiBase}`);
      return;
    }

    if (action === 'authorize') {
      const res = await fetch(joinUrl(config.apiBase, '/api/auth/sculk/config'));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        term.writeln(`HTTP ${res.status}: ${data.message || 'Failed to load Sculk config'}`);
        return;
      }
      window.open(data.authorizeUrl, '_blank', 'noopener,noreferrer');
      term.writeln(`Opened: ${data.authorizeUrl}`);
      return;
    }

    if (action === 'callback') {
      const res = await fetch(joinUrl(config.apiBase, '/api/auth/sculk/config'));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        term.writeln(`HTTP ${res.status}: ${data.message || 'Failed to load callback URL'}`);
        return;
      }
      term.writeln(`Callback URL: ${data.callbackUrl || 'http://localhost:8787/api/auth/sculk/callback'}`);
      return;
    }

    if (action === 'auth') {
      const mode = String(params[2] || '').toLowerCase();
      const value = String(params[3] || '');
      if (!mode || !value || (mode !== 'token' && mode !== 'code')) {
        term.writeln('Usage: sculk auth token <token>');
        term.writeln('   or: sculk auth code <code>');
        return;
      }

      const body = { mode, [mode === 'token' ? 'token' : 'code']: value };
      const res = await fetch(joinUrl(config.apiBase, '/api/auth/sculk/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409 && data.code === 'SCULK_NOT_LINKED') {
          term.writeln('Sculk ID is not linked to .nedos Passport.');
          term.writeln('Use a linked account or register a new .nedos Passport in Store UI.');
          return;
        }
        term.writeln(`HTTP ${res.status}: ${data.message || 'Sculk auth failed'}`);
        return;
      }

      config.session = data.session || '';
      saveConfig(config);
      term.writeln(`Signed in as ${(data.account && (data.account.displayName || data.account.username)) || 'user'}`);
      return;
    }

    if (action === 'account') {
      if (!config.session) {
        term.writeln('Not signed in. Use: sculk auth token <token>');
        return;
      }
      const res = await fetch(joinUrl(config.apiBase, '/api/auth/session'), {
        headers: { 'x-nedos-session': config.session },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        term.writeln(`HTTP ${res.status}: ${data.message || 'Failed to load account'}`);
        return;
      }
      term.writeln(`User: ${data.account.displayName || data.account.username}`);
      term.writeln(`Roles: ${(data.account.roles || []).join(', ') || 'none'}`);
      return;
    }

    if (action === 'logout') {
      config.session = '';
      saveConfig(config);
      term.writeln('Signed out from Sculk/.nedos Passport session');
      return;
    }

    this.help(term);
  }
}
