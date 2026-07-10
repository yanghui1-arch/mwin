/** Drizzle D1 operations for users, GitHub identities, and API keys. */
import { desc, eq } from 'drizzle-orm';
import { apiKeys, userAuth, users } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';
import type { ApiKey, User, UserAuth } from '../domain/types.js';

export async function findUser(db: AppDatabase, id: string): Promise<User | null> {
  const row = await db.select().from(users).where(eq(users.id, id)).get();
  return row ? {
    id: row.id,
    email: row.email,
    username: row.username,
    avatar: row.avatar,
    registerTime: row.registerTime,
  } : null;
}

export async function findUserAuth(db: AppDatabase, identifier: string): Promise<{ user_uuid: string } | null> {
  const row = await db.select({ user_uuid: userAuth.userId }).from(userAuth)
    .where(eq(userAuth.identifier, identifier)).get();
  return row ?? null;
}

/** Creates the local account, identity binding, and initial API key as one D1 transaction. */
export async function createUserWithAuthAndApiKey(db: AppDatabase, user: User, auth: UserAuth, apiKey: ApiKey): Promise<void> {
  await db.batch([
    db.insert(users).values({
      id: user.id, email: user.email, username: user.username, avatar: user.avatar, registerTime: user.registerTime,
    }),
    db.insert(userAuth).values({
      id: auth.id, userId: auth.userId, authType: auth.authType, identifier: auth.identifier, createdAt: auth.createdAt,
    }),
    db.insert(apiKeys).values({
      id: apiKey.id, userId: apiKey.userId, key: apiKey.key, createdTime: apiKey.createdTime,
    }),
  ]);
}

/** Replaces every active telemetry key atomically, so failures cannot leave a user keyless. */
export async function rotateApiKey(db: AppDatabase, apiKey: ApiKey): Promise<ApiKey> {
  await db.batch([
    db.delete(apiKeys).where(eq(apiKeys.userId, apiKey.userId)),
    db.insert(apiKeys).values({
      id: apiKey.id, userId: apiKey.userId, key: apiKey.key, createdTime: apiKey.createdTime,
    }),
  ]);
  return apiKey;
}

export async function latestApiKey(db: AppDatabase, userId: string): Promise<string | null> {
  const row = await db.select({ key: apiKeys.key }).from(apiKeys)
    .where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdTime)).limit(1).get();
  return row?.key ?? null;
}

export async function userIdForApiKey(db: AppDatabase, key: string): Promise<string | null> {
  const row = await db.select({ userId: apiKeys.userId }).from(apiKeys).where(eq(apiKeys.key, key)).get();
  return row?.userId ?? null;
}
