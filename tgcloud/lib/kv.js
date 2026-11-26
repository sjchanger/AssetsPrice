import { db } from 'sdk';
import { eq } from 'sdk/db';
import { kv } from '../schema.js';

export async function getFresh(key) {
  const row = await db.select().from(kv).where(eq(kv.key, key)).get();
  if (!row || row.expiresAt <= Date.now()) return null;
  return JSON.parse(row.value);
}

export async function putWithTtl(key, value, ttlMs) {
  const json = JSON.stringify(value);
  const expiresAt = Date.now() + ttlMs;
  await db.insert(kv)
    .values({ key, value: json, expiresAt })
    .onConflictDoUpdate({ target: kv.key, set: { value: json, expiresAt } })
    .run();
}

// Returns { ok: true } and starts a cooldown, or { ok: false, waitSec } if still cooling down.
export async function claimCooldown(userId, ttlMs) {
  const key = `cd:${userId}`;
  const row = await db.select().from(kv).where(eq(kv.key, key)).get();
  const now = Date.now();
  if (row && row.expiresAt > now) {
    return { ok: false, waitSec: Math.ceil((row.expiresAt - now) / 1000) };
  }
  await putWithTtl(key, 1, ttlMs);
  return { ok: true, waitSec: 0 };
}
