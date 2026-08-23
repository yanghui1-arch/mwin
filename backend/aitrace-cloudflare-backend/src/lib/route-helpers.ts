import { signJwt } from './auth.js';
import { success } from './response.js';
import type { Services } from '../services/index.js';
import type { Bindings, JsonObject } from '../domain/types.js';
import { extractApiKey, newApiKey, newId, nowIso } from './utils.js';

interface GitHubUser { id: number; name: string | null; login: string; email: string | null; avatar_url: string | null }
interface GitHubToken { access_token: string }

/** Parses JSON request bodies and treats non-JSON bodies as empty objects. */
export async function requestJson<T extends JsonObject = JsonObject>(
  request: Request,
  maxBytes?: number,
): Promise<T> {
  if (!request.headers.get('content-type')?.includes('application/json')) return {} as T;
  if (maxBytes === undefined) return request.json<T>();

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`JSON request exceeds the configured limit of ${maxBytes} bytes`);
  }
  const raw = await readBodyLimited(request.body, maxBytes);
  return JSON.parse(new TextDecoder().decode(raw)) as T;
}

async function readBodyLimited(
  stream: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<Uint8Array> {
  if (!stream) throw new Error('Missing JSON request body');
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error(`JSON request exceeds the configured limit of ${limit} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/** Parses an identifier list with a D1-safe bound-parameter limit. */
export async function requestIdList(request: Request, maxItems = 50): Promise<string[]> {
  const value: unknown = await request.json();
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !id)) {
    throw new Error('Expected a non-empty string identifier list');
  }
  if (value.length > maxItems) throw new Error(`A maximum of ${maxItems} identifiers may be processed at once`);
  return value;
}

/** Validates a telemetry API key and returns its owning user. */
export async function requireApiUser(request: Request, svc: Services): Promise<string> {
  const userId = await svc.userIdForApiKey(extractApiKey(request.headers.get('authorization')));
  if (!userId) throw new Error('Invalid AITrace API key. Please ensure your API Key is valid and not expired.');
  return userId;
}

/** Exchanges a GitHub OAuth code and atomically creates first-time users with an API key. */
export async function authenticate(request: Request, env: Bindings, svc: Services): Promise<Response> {
  const ghUser = await githubUser(env, new URL(request.url).searchParams.get('code'));
  const auth = await svc.repositories.findUserAuth(String(ghUser.id));
  let user = auth ? await svc.repositories.findUser(auth.user_uuid) : null;
  let message = 'GitHub authenticate successfully.';

  if (!user) {
    const timestamp = nowIso();
    user = {
      id: newId(),
      username: ghUser.name ?? ghUser.login,
      email: ghUser.email,
      avatar: ghUser.avatar_url,
      registerTime: timestamp,
    };
    await svc.repositories.createUserWithAuthAndApiKey(
      user,
      { id: newId(), userId: user.id, authType: 'GitHub', identifier: String(ghUser.id), createdAt: timestamp },
      { id: newId(), userId: user.id, key: newApiKey(), createdTime: timestamp },
    );
    message = 'New user with using GitHub authentication is registered successfully.';
  }
  return success({ userName: user.username, avatar: user.avatar, token: await signJwt({ userId: user.id }, env.JWT_SECRET) }, message);
}

async function githubUser(env: Bindings, code: string | null): Promise<GitHubUser> {
  const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
  });
  const token = await tokenResp.json<GitHubToken>();
  const userResp = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${token.access_token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'aitrace-cloudflare-backend',
    },
  });
  return userResp.json<GitHubUser>();
}
