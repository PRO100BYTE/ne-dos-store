const express = require('express');
const crypto = require('crypto');

function createAuthRouter(options) {
  const {
    usernameSafe,
    passwordHash,
    loadPassportAccounts,
    savePassportAccounts,
    safeAccount,
    createPassportSession,
    nowIso,
    requirePassport,
    validateSculkToken,
    exchangeSculkCode,
    sculkAuthorizeUrl,
    sculkCallbackUrl,
    sculkTokenUrl,
    sculkValidateUrl,
    sculkAllowCodeFallback,
    sculkAllowTokenFallback,
  } = options;

  const router = express.Router();

  function passwordIsStrong(password) {
    return password.length >= 8
      && /[a-z]/.test(password)
      && /[A-Z]/.test(password)
      && /[0-9]/.test(password);
  }

  function base64UrlEncode(value) {
    return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  router.get('/sculk/config', (_req, res) => {
    res.json({
      authorizeUrl: sculkAuthorizeUrl,
      callbackUrl: sculkCallbackUrl,
      authType: 'oauth-without-oidc',
      modes: ['token', 'code'],
      canExchangeCode: Boolean(sculkTokenUrl) || sculkAllowCodeFallback,
      canAcceptToken: Boolean(sculkValidateUrl) || sculkAllowTokenFallback,
      accountSystem: '.nedos Passport',
    });
  });

  router.get('/sculk/callback', (req, res) => {
    res.json({
      ok: true,
      message: 'Sculk callback accepted. Exchange the code using POST /api/auth/sculk/login with mode=code.',
      code: req.query.code ? String(req.query.code) : null,
    });
  });

  router.post('/passport/register', (req, res) => {
    const username = usernameSafe(req.body?.username);
    const password = String(req.body?.password || '');
    const passwordConfirm = String(req.body?.passwordConfirm || '');
    const displayName = String(req.body?.displayName || username || 'NE-DOS User').slice(0, 80);
    const linkedSculkId = req.body?.linkedSculkId ? String(req.body.linkedSculkId) : null;

    if (!username || !password || !passwordConfirm) {
      res.status(400).json({ message: 'username, password and passwordConfirm are required' });
      return;
    }

    if (password !== passwordConfirm) {
      res.status(400).json({ message: 'Пароли не совпадают' });
      return;
    }

    if (!passwordIsStrong(password)) {
      res.status(400).json({ message: 'Пароль должен быть не менее 8 символов и содержать строчные/заглавные буквы и цифры' });
      return;
    }

    const accounts = loadPassportAccounts();
    if (accounts.some((item) => item.username === username)) {
      res.status(409).json({ message: 'Такой .nedos Passport уже существует' });
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      username,
      displayName,
      passwordHash: passwordHash(password),
      roles: ['uploader'],
      linkedSculkIds: linkedSculkId ? [linkedSculkId] : [],
      status: 'active',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    accounts.push(entry);
    savePassportAccounts(accounts);

    const session = createPassportSession(entry, linkedSculkId ? 'sculk-linked-register' : 'local-register');
    res.status(201).json({ session, account: safeAccount(entry) });
  });

  router.post('/passport/login', (req, res) => {
    const username = usernameSafe(req.body?.username);
    const password = String(req.body?.password || '');

    if (!username || !password) {
      res.status(400).json({ message: 'username and password are required' });
      return;
    }

    const account = loadPassportAccounts().find((item) => item.username === username && item.status !== 'disabled');
    if (!account || account.passwordHash !== passwordHash(password)) {
      res.status(401).json({ message: 'Неверные данные .nedos Passport' });
      return;
    }

    const session = createPassportSession(account, 'local');
    res.json({ session, account: safeAccount(account) });
  });

  router.post('/passport/link-existing', (req, res) => {
    const username = usernameSafe(req.body?.username);
    const password = String(req.body?.password || '');
    const linkedSculkId = String(req.body?.linkedSculkId || '').trim();

    if (!username || !password || !linkedSculkId) {
      res.status(400).json({ message: 'username, password and linkedSculkId are required' });
      return;
    }

    const accounts = loadPassportAccounts();
    const idx = accounts.findIndex((item) => item.username === username && item.status !== 'disabled');
    if (idx === -1 || accounts[idx].passwordHash !== passwordHash(password)) {
      res.status(401).json({ message: 'Неверные данные .nedos Passport' });
      return;
    }

    const account = { ...accounts[idx] };
    account.linkedSculkIds = Array.from(new Set([...(account.linkedSculkIds || []), linkedSculkId]));
    account.updatedAt = nowIso();
    accounts[idx] = account;
    savePassportAccounts(accounts);

    const session = createPassportSession(account, 'sculk-linked-existing');
    res.json({ session, account: safeAccount(account) });
  });

  router.get('/session', requirePassport, (req, res) => {
    res.json({ account: safeAccount(req.passportAccount), session: req.passportSession });
  });

  router.get('/profile', requirePassport, (req, res) => {
    res.json({ account: safeAccount(req.passportAccount), session: req.passportSession });
  });

  router.patch('/profile', requirePassport, (req, res) => {
    const displayName = String(req.body?.displayName || '').trim().slice(0, 80);
    const linkedSculkIds = req.passportAccount.linkedSculkIds || [];
    const accounts = loadPassportAccounts();
    const idx = accounts.findIndex((item) => item.id === req.passportAccount.id);

    if (idx === -1) {
      res.status(404).json({ message: 'Аккаунт не найден' });
      return;
    }

    const next = {
      ...accounts[idx],
      displayName: displayName || accounts[idx].displayName || accounts[idx].username,
      linkedSculkIds,
      updatedAt: nowIso(),
    };
    accounts[idx] = next;
    savePassportAccounts(accounts);

    const session = createPassportSession(next, req.passportSession?.authMethod || 'local');
    res.json({ account: safeAccount(next), session });
  });

  router.post('/profile/password', requirePassport, (req, res) => {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'currentPassword и newPassword обязательны' });
      return;
    }

    if (!passwordIsStrong(newPassword)) {
      res.status(400).json({ message: 'Новый пароль должен быть не менее 8 символов и содержать строчные/заглавные буквы и цифры' });
      return;
    }

    const accounts = loadPassportAccounts();
    const idx = accounts.findIndex((item) => item.id === req.passportAccount.id);

    if (idx === -1) {
      res.status(404).json({ message: 'Аккаунт не найден' });
      return;
    }

    if (accounts[idx].passwordHash !== passwordHash(currentPassword)) {
      res.status(400).json({ message: 'Текущий пароль указан неверно' });
      return;
    }

    const next = {
      ...accounts[idx],
      passwordHash: passwordHash(newPassword),
      updatedAt: nowIso(),
    };
    accounts[idx] = next;
    savePassportAccounts(accounts);

    const session = createPassportSession(next, req.passportSession?.authMethod || 'local');
    res.json({ message: 'Пароль обновлен', account: safeAccount(next), session });
  });

  router.get('/sculk/authorize', (req, res) => {
    const clientId = process.env.SCULK_CLIENT_ID || '';
    if (!clientId) {
      res.status(503).json({ message: 'Sculk OAuth не настроен (отсутствует SCULK_CLIENT_ID)' });
      return;
    }

    const state = base64UrlEncode(JSON.stringify({ nonce: crypto.randomBytes(16).toString('hex'), iat: Date.now() }));
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: sculkCallbackUrl,
      response_type: 'code',
      scope: 'profile',
      state,
    });

    const redirectUrl = `${sculkAuthorizeUrl}?${params.toString()}`;
    res.json({ redirectUrl, state });
  });

  router.post('/sculk/login', async (req, res) => {
    const mode = String(req.body?.mode || '').toLowerCase();

    if (mode === 'token') {
      const token = String(req.body?.token || '').trim();
      const profile = await validateSculkToken(token);
      if (!profile) {
        res.status(401).json({ message: 'Invalid Sculk token' });
        return;
      }

      const sculkIdentity = {
        id: String(profile.id || profile.sub || profile.user_id || '').trim(),
        name: profile.name || profile.username || 'Sculk User',
        profile,
      };
      const account = loadPassportAccounts().find((item) => (item.linkedSculkIds || []).includes(sculkIdentity.id) && item.status !== 'disabled');
      if (!sculkIdentity.id || !account) {
        res.status(409).json({
          code: 'SCULK_NOT_LINKED',
          message: 'Sculk ID не связан с .nedos Passport. Укажите существующую учетную запись NE-DOS или зарегистрируйте новую.',
          sculkIdentity,
        });
        return;
      }

      const session = createPassportSession(account, 'sculk-token');
      res.json({ session, profile, account: safeAccount(account) });
      return;
    }

    if (mode === 'code') {
      const code = String(req.body?.code || '').trim();
      const exchange = await exchangeSculkCode(code);
      if (!exchange) {
        res.status(401).json({ message: 'Unable to exchange Sculk grant code' });
        return;
      }

      const accessToken = exchange.access_token || exchange.token || code;
      const profile = await validateSculkToken(accessToken);

      const sculkIdentity = {
        id: String(profile?.id || profile?.sub || profile?.user_id || '').trim(),
        name: profile?.name || profile?.username || 'Sculk User',
        profile: profile || { name: 'Sculk User' },
      };
      const account = loadPassportAccounts().find((item) => (item.linkedSculkIds || []).includes(sculkIdentity.id) && item.status !== 'disabled');
      if (!sculkIdentity.id || !account) {
        res.status(409).json({
          code: 'SCULK_NOT_LINKED',
          message: 'Sculk ID не связан с .nedos Passport. Укажите существующую учетную запись NE-DOS или зарегистрируйте новую.',
          sculkIdentity,
        });
        return;
      }

      const session = createPassportSession(account, 'sculk-code');
      res.json({ session, profile: profile || { name: 'Sculk User' }, exchange, account: safeAccount(account) });
      return;
    }

    res.status(400).json({ message: 'mode must be token or code' });
  });

  if (process.env.DEBUG_AUTH_ROUTES === 'true') {
    const registered = router.stack
      .filter((layer) => layer.route)
      .map((layer) => `${Object.keys(layer.route.methods).join(',')}:${layer.route.path}`);
    console.log('[auth] routes:', registered.join(' | '));
  }

  return router;
}

module.exports = {
  createAuthRouter,
};
