export async function findUser(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export async function findUserAuth(db, identifier) {
  return db.prepare('SELECT * FROM user_auth WHERE identifier = ?').bind(identifier).first();
}

export async function createUser(db, user) {
  await db.prepare('INSERT INTO users (id, email, username, avatar, register_time) VALUES (?, ?, ?, ?, ?)')
    .bind(user.id, user.email, user.username, user.avatar, user.registerTime).run();
  return user;
}

export async function createUserAuth(db, auth) {
  await db.prepare('INSERT INTO user_auth (id, user_uuid, auth_type, identifier, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(auth.id, auth.userId, auth.authType, auth.identifier, auth.createdAt).run();
}

export async function insertApiKey(db, apiKey) {
  await db.prepare('INSERT INTO api_key (id, user_id, key, created_time) VALUES (?, ?, ?, ?)')
    .bind(apiKey.id, apiKey.userId, apiKey.key, apiKey.createdTime).run();
  return apiKey;
}

export async function latestApiKey(db, userId) {
  const row = await db.prepare('SELECT * FROM api_key WHERE user_id = ? ORDER BY created_time DESC LIMIT 1')
    .bind(userId).first();
  return row?.key ?? null;
}

export async function userIdForApiKey(db, key) {
  const row = await db.prepare('SELECT user_id FROM api_key WHERE key = ?').bind(key).first();
  return row?.user_id ?? null;
}
