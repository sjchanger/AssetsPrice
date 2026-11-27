import { api } from 'sdk';
import { COOLDOWN_MS } from './config.js';
import { claimCooldown } from './kv.js';
import { getPricedItems, getTopCoins } from './sources.js';
import {
  queryCandidates, matchItem, matchCoin, formatItemLine, formatCoinLine,
  cooldownText, ASSET_LINES,
} from './pure.js';

const NOT_FOUND = '❌ دارایی‌ای با این نام یا نماد پیدا نشد.\nمثال: دلار، طلا، نقره، مس، BTC';
const NO_PREVIEW = { is_disabled: true };

// هر جستجو یک‌دقیقه فاصله می‌خواهد. در این مدت هیچ جستجوی دیگری پذیرفته نمی‌شود.
export async function searchAsset(chatId, userId, rawQuery) {
  const send = (text) =>
    api.sendMessage({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: NO_PREVIEW });

  try {
    const cd = await claimCooldown(userId, COOLDOWN_MS);
    if (!cd.ok) return send(cooldownText(cd.waitSec));

    const candidates = queryCandidates(rawQuery);
    const priced = await getPricedItems();

    const item = matchItem(candidates, priced.items);
    if (item) {
      if (!item.ok) return send(`⚠️ قیمت «${ASSET_LINES[item.id].name}» در این لحظه دریافت نشد.`);
      return send(formatItemLine(item));
    }

    // کوین‌ها فقط وقتی گرفته می‌شوند که دارایی TGJU پیدا نشده باشد.
    let coins = null;
    try {
      coins = await getTopCoins();
    } catch (e) {
      console.error('CMC unavailable', e);
    }
    if (!coins) return send('⚠️ قیمت کوین‌ها در این لحظه در دسترس نیست. کمی بعد دوباره امتحان کنید.');

    const coin = matchCoin(candidates, coins);
    if (!coin) return send(NOT_FOUND);

    const toman = priced.dollarToman != null ? coin.usd * priced.dollarToman : null;
    if (toman == null) return send('⚠️ نرخ دلار در این لحظه دریافت نشد.');
    return send(formatCoinLine({ ...coin, toman }));
  } catch (e) {
    console.error(e);
    return send('❌ دریافت قیمت موقتاً انجام نشد. کمی بعد دوباره امتحان کنید.');
  }
}
