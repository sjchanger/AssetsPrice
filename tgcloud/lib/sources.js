import { fetch } from 'sdk';
import { getFresh, putWithTtl } from './kv.js';
import {
  TGJU_LIVE_URL, TGJU_CACHE_MS, CMC_API_KEY, CMC_TOP_LIMIT, CMC_CACHE_MS, ITEMS,
} from './config.js';
import { priceItems } from './pure.js';

async function getTgjuCurrent() {
  const cached = await getFresh('tgju:live');
  if (cached) return cached;

  const res = await fetch(TGJU_LIVE_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`TGJU HTTP ${res.status}`);
  const body = await res.json();
  const current = body?.current ?? {};

  await putWithTtl('tgju:live', current, TGJU_CACHE_MS);
  return current;
}

export async function getPricedItems() {
  return priceItems(ITEMS, await getTgjuCurrent());
}

export async function getTopCoins() {
  const cached = await getFresh('cmc:top');
  if (cached) return cached;

  const url =
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest' +
    `?start=1&limit=${CMC_TOP_LIMIT}&convert=USD`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'X-CMC_PRO_API_KEY': CMC_API_KEY },
  });
  if (!res.ok) throw new Error(`CMC HTTP ${res.status}`);
  const body = await res.json();
  if (body?.status?.error_code) throw new Error(`CMC error ${body.status.error_code}`);

  const coins = (body.data ?? []).map((c) => ({
    symbol: c.symbol,
    usd: c.quote.USD.price,
    change24h: c.quote.USD.percent_change_24h,
  }));

  await putWithTtl('cmc:top', coins, CMC_CACHE_MS);
  return coins;
}
