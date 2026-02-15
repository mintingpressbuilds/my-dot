import { pgTable, text, real, integer, timestamp, unique, index } from 'drizzle-orm/pg-core';

// users
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  dotId: text('dot_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('users_email_idx').on(t.email),
]);

// dots
export const dots = pgTable('dots', {
  id: text('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  line: text('line').notNull().default(''),
  vibe: text('vibe').notNull().default('serene'),
  link: text('link'),
  posX: real('pos_x').notNull().default(0),
  posY: real('pos_y').notNull().default(0),
  posZ: real('pos_z').notNull().default(0),
  sparkCount: integer('spark_count').notNull().default(0),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('dots_slug_idx').on(t.slug),
  index('dots_owner_id_idx').on(t.ownerId),
  index('dots_created_at_idx').on(t.createdAt),
]);

// connections
export const connections = pgTable('connections', {
  id: text('id').primaryKey(),
  fromDotId: text('from_dot_id').notNull().references(() => dots.id, { onDelete: 'cascade' }),
  toDotId: text('to_dot_id').notNull().references(() => dots.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique('connections_unique').on(t.fromDotId, t.toDotId),
  index('connections_from_idx').on(t.fromDotId),
  index('connections_to_idx').on(t.toDotId),
]);

// sparks
export const sparks = pgTable('sparks', {
  id: text('id').primaryKey(),
  dotId: text('dot_id').notNull().references(() => dots.id, { onDelete: 'cascade' }),
  sessionHash: text('session_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('sparks_dot_id_idx').on(t.dotId),
  index('sparks_session_idx').on(t.sessionHash),
]);

// magic_links
export const magicLinks = pgTable('magic_links', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
}, (t) => [
  index('magic_links_token_idx').on(t.token),
  index('magic_links_email_idx').on(t.email),
]);
