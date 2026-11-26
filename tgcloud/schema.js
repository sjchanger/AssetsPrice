import { table, integer, text } from 'sdk/db';

// Key-value store for short-lived caches and per-user cooldowns.
// Keys used: "tgju:live", "cmc:top", "cd:<userId>"
export const kv = table('kv', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
