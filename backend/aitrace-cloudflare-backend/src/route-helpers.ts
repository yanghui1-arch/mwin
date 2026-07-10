import { signJwt } from './auth.js';
import { success } from './response.js';
import { extractApiKey, newId, nowIso } from './utils.js';

export async function requestJson(request) {
  return request.headers.get('content-type')?.includes('application/json') ? request.json() : {};
}

export async function requireApiUser(request, svc) {
  const apiKey = extractApiKey(request.headers.get('authorization'));
  const userId = await svc.userIdForApiKey(apiKey);
  if (!userId) throw new Error('Invalid AITrace API key. Please ensure your API Key is valid and not expired.');
  return userId;
}

export async function authenticate(request, env, svc) {
  const ghUser = await githubUser(env, new URL(request.url).searchParams.get('code'));
  const auth = await svc.repositories.findUserAuth(String(ghUser.id));
  let user;
  let message;
  if (auth) {
    user = await svc.repositories.findUser(auth.user_uuid);
    message = 'GitHub authenticate successfully.';
  } else {
    user = { id: newId(), username: ghUser.name ?? ghUser.login, email: ghUser.email, avatar: ghUser.avatar_url, registerTime: nowIso() };
    await svc.repositories.createUser(user);
    await svc.repositories.createUserAuth({ id: newId(), userId: user.id, authType: 'GitHub', identifier: String(ghUser.id), createdAt: nowIso() });
    await svc.generateAndStoreApiKey(user.id);
    message = 'New user with using GitHub authentication is registered successfully.';
  }
  const token = await signJwt({ userId: user.id }, env.JWT_SECRET);
  return success({ userName: user.username, avatar: user.avatar, token }, message);
}

async function githubUser(env, code) {
  const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
  });
  const token = await tokenResp.json();
  const userResp = await fetch('https://api.github.com/user', {
    headers: { authorization: `Bearer ${token.access_token}`, accept: 'application/vnd.github+json', 'user-agent': 'aitrace-cloudflare-backend' },
  });
  return userResp.json();
}
