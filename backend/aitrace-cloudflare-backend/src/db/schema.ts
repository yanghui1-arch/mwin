import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  username: text('username').notNull(),
  avatar: text('avatar'),
  registerTime: text('register_time').notNull(),
});

export const userAuth = sqliteTable('user_auth', {
  id: text('id').primaryKey(),
  userId: text('user_uuid').notNull().references(() => users.id, { onDelete: 'cascade' }),
  authType: text('auth_type').notNull(),
  identifier: text('identifier').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('user_auth_identifier_unique').on(table.identifier),
]);

export const apiKeys = sqliteTable('api_key', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  createdTime: text('created_time').notNull(),
}, (table) => [
  uniqueIndex('api_key_key_unique').on(table.key),
  index('idx_api_key_key').on(table.key),
]);

export const projects = sqliteTable('project', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_uuid').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  strategy: text('strategy'),
  averageDuration: integer('avg_duration').notNull(),
  cost: text('cost').notNull(),
  costUnits: integer('cost_units').notNull().default(0),
  createdTimestamp: text('created_timestamp').notNull(),
  lastUpdateTimestamp: text('last_update_timestamp').notNull(),
}, (table) => [
  uniqueIndex('project_user_name_unique').on(table.userId, table.name),
  index('idx_project_user').on(table.userId),
]);

export const s3CompatibleObjects = sqliteTable('s3_compatible_object', {
  objectKey: text('object_key').primaryKey(),
  contentType: text('content_type').notNull(),
  contentEncoding: text('content_encoding').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  rawSizeBytes: integer('raw_size_bytes').notNull(),
  storedSizeBytes: integer('stored_size_bytes').notNull(),
  sha256: text('sha256').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const traces = sqliteTable('trace', {
  id: text('id').primaryKey(),
  parentTraceId: text('parent_trace_id'),
  projectName: text('project_name').notNull(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  conversationId: text('conversation_id').notNull(),
  tags: text('tags').notNull(),
  payloadObjectKey: text('payload_object_key').notNull().references(() => s3CompatibleObjects.objectKey),
  errorInfo: text('error_info'),
  startTime: text('start_time').notNull(),
  lastUpdateTimestamp: text('last_update_timestamp').notNull(),
}, (table) => [
  index('idx_trace_project').on(table.projectId),
  index('idx_trace_parent').on(table.parentTraceId),
]);

export const steps = sqliteTable('step', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  traceId: text('trace_id'),
  parentStepId: text('parent_step_id'),
  type: text('type').notNull(),
  tags: text('tags').notNull(),
  payloadObjectKey: text('payload_object_key').notNull().references(() => s3CompatibleObjects.objectKey),
  errorInfo: text('error_info'),
  model: text('model'),
  usage: text('usage'),
  projectName: text('project_name').notNull(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
}, (table) => [
  index('idx_step_project_start').on(table.projectId, table.startTime),
  index('idx_step_trace').on(table.traceId),
]);

export const stepMeta = sqliteTable('step_meta', {
  id: text('id').primaryKey().references(() => steps.id, { onDelete: 'cascade' }),
  metadata: text('metadata'),
  cost: text('cost').notNull(),
  costUnits: integer('cost_units').notNull().default(0),
});

export const mediaAssets = sqliteTable('media_asset', {
  id: text('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdTime: text('created_time').notNull(),
});
