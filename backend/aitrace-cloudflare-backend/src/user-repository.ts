import type { ApiKey, User, UserAuth } from './types.js';

interface UserRow { id: string; email: string | null; username: string; avatar: string | null; register_time: string }
interface AuthRow { user_uuid: string }

export async function findUser(db: D1Database, id: string): Promise<User | null> {
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  return row && { id: row.id, email: row.email, username: row.username, avatar: row.avatar, registerTime: row.register_time };
}
export async function findUserAuth(db: D1Database, identifier: string): Promise<AuthRow | null> {
  return db.prepare('SELECT * FROM user_auth WHERE identifier = ?').bind(identifier).first<AuthRow>();
}
export async function createUser(db: D1Database, user: User): Promise<User> {
  await db.prepare('INSERT INTO users (id, email, username, avatar, register_time) VALUES (?, ?, ?, ?, ?)').bind(user.id, user.email, user.username, user.avatar, user.registerTime).run();
  return user;
}
export async function createUserAuth(db: D1Database, auth: UserAuth): Promise<void> {
  await db.prepare('INSERT INTO user_auth (id, user_uuid, auth_type, identifier, created_at) VALUES (?, ?, ?, ?, ?)').bind(auth.id, auth.userId, auth.authType, auth.identifier, auth.createdAt).run();
}
export async function insertApiKey(db: D1Database, apiKey: ApiKey): Promise<ApiKey> {
  await db.prepare('INSERT INTO api_key (id, user_id, key, created_time) VALUES (?, ?, ?, ?)').bind(apiKey.id, apiKey.userId, apiKey.key, apiKey.createdTime).run();
  return apiKey;
}
export async function latestApiKey(db: D1Database, userId: string): Promise<string | null> {
  return (await db.prepare('SELECT key FROM api_key WHERE user_id = ? ORDER BY created_time DESC LIMIT 1').bind(userId).first<{ key: string }>())?.key ?? null;
}
export async function userIdForApiKey(db: D1Database, key: string): Promise<string | null> {
  return (await db.prepare('SELECT user_id FROM api_key WHERE key = ?').bind(key).first<{ user_id: string }>())?.user_id ?? null;
}
