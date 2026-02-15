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
  theme: text('theme').notNull().default('default'),
  link: text('link'),
  posX: real('pos_x').notNull().default(0),
  posY: real('pos_y').notNull().default(0),
  posZ: real('pos_z').notNull().default(0),
  sparkCount: integer('spark_count').notNull().default(0),
  ownerId: text('owner_id').references(() => users.id),
  sessionToken: text('session_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('dots_slug_idx').on(t.slug),
  index('dots_owner_id_idx').on(t.ownerId),
  index('dots_created_at_idx').on(t.createdAt),
  index('dots_session_token_idx').on(t.sessionToken),
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

// maps
export const maps = pgTable('maps', {
  id: text('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').notNull(),
  type: text('type').notNull().default('custom'),
  visibility: text('visibility').notNull().default('public'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('maps_slug_idx').on(t.slug),
  index('maps_owner_id_idx').on(t.ownerId),
]);

// map_dots (join table — existing dots added to a map)
export const mapDots = pgTable('map_dots', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  dotId: text('dot_id').notNull().references(() => dots.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (t) => [
  unique('map_dots_unique').on(t.mapId, t.dotId),
  index('map_dots_map_id_idx').on(t.mapId),
  index('map_dots_dot_id_idx').on(t.dotId),
]);

// map_items (non-user items: songs, places, ideas)
export const mapItems = pgTable('map_items', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  line: text('line'),
  link: text('link'),
  posX: real('pos_x').notNull().default(0),
  posY: real('pos_y').notNull().default(0),
  posZ: real('pos_z').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('map_items_map_id_idx').on(t.mapId),
]);

// map_connections (connections between items within a map)
export const mapConnections = pgTable('map_connections', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  fromItemId: text('from_item_id').notNull(),
  toItemId: text('to_item_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique('map_connections_unique').on(t.mapId, t.fromItemId, t.toItemId),
  index('map_connections_map_id_idx').on(t.mapId),
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
