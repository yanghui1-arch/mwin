import { signJwt, withUser } from './auth.js';
import { json, notFound, success } from './response.js';
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
  const url = new URL(request.url);
  const ghUser = await githubUser(env, url.searchParams.get('code'));
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
  return success({ userName: user.username, avatar: user.avatar, token: await signJwt({ userId: user.id }, env.JWT_SECRET) }, message);
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

export function authRoutes(request, env, svc, pathname) {
  if (request.method === 'GET' && pathname === '/api/auth/github/callback') return authenticate(request, env, svc);
  if (request.method === 'GET' && pathname === '/api/auth/me') return withUser(request, env, async (userId) => {
    const user = await svc.repositories.findUser(userId);
    return success({ userName: user.username, avatar: user.avatar, token: request.headers.get('AT-token') });
  });
  return null;
}

export function apiKeyRoutes(request, env, svc, pathname) {
  if (request.method === 'GET' && pathname === '/api/apikey/get') return withUser(request, env, async (userId) => {
    const key = await svc.getConcealedApiKey(userId);
    return key ? success(key) : notFound('Not found api key');
  });
  if (request.method === 'GET' && pathname === '/api/apikey/get_complete_apikey') return withUser(request, env, async (userId) => {
    const key = await svc.getCompleteApiKey(userId);
    return key ? success(key) : notFound('Not found api key');
  });
  if (request.method === 'POST' && pathname === '/api/apikey/change') return withUser(request, env, async (userId) => {
    return success(await svc.generateAndStoreApiKey(userId), 'Change another AITrace API key successfully.');
  });
  return null;
}

export function projectRoutes(request, env, svc, pathname) {
  if (request.method === 'GET' && pathname === '/api/v0/project/get_all_projects') return withUser(request, env, async (userId) => {
    const projects = await svc.listProjects(userId);
    return projects.length ? success(projects) : json({ code: 404, message: 'Not found projects', data: null });
  });
  if (request.method === 'POST' && pathname === '/api/v0/project/create_new_project') return withUser(request, env, async (userId) => {
    return success(await svc.createProject(userId, await requestJson(request)), `Create a new project successfully for user uuid: ${userId}`);
  });
  return null;
}
