import { api } from 'sdk';
import { COOLDOWN_MS } from './config.js';
import { claimCooldown } from './kv.js';
import { getPricedItems, getTopCoins } from './sources.js';
import {
  normalizeQuery, matchItem, matchCoin, formatItemLine, formatCoinLine,
  ASSET_LINES, escapeHtml,
} from './pure.js';

const NOT_FOUND = '❌ دارایی‌ای با این نام یا نماد پیدا نشد.\nمثال: دلار، طلا، نقره، مس، BTC';
const NO_PREVIEW = { is_disabled: true };
const READY_TEXT = '✅ حالا می‌توانید سرچ کنید.';

const send = (chatId, text) =>
  api.sendMessage({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: NO_PREVIEW });

const edit = (chatId, messageId, text) =>
  api.editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    link_preview_options: NO_PREVIEW,
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const countdownText = (s) => `⏳ لطفاً صبر کنید... <b>${s}</b>`;

// جداکننده‌ها: کاما، کاما‌ی فارسی، نقطه‌ویرگول و خط جدید
function splitQuery(raw) {
  return String(raw).split(/[,،;\n]+/).map((p) => p.trim()).filter(Boolean);
}

// هر قیمت را به‌صورت خط آماده برمی‌گرداند. ترتیب همان ترتیب پیام کاربر است.
async function resolveQuery(raw, priced) {
  let coins; // undefined = هنوز نگرفته‌ایم، null = گرفتن کوین‌ها ناموفق بوده

  const getCoins = async () => {
    if (coins === undefined) {
      try {
        coins = await getTopCoins();
      } catch (e) {
        console.error('CMC unavailable', e);
        coins = null;
      }
    }
    return coins;
  };

  const lookup = async (cands) => {
    const item = matchItem(cands, priced.items);
    if (item) return { type: 'item', item };
    const list = await getCoins();
    if (list) {
      const coin = matchCoin(cands, list);
      if (coin) return { type: 'coin', coin };
    }
    return null;
  };

  const lines = [];
  const seen = new Set();
  const add = (key, line) => {
    if (!seen.has(key)) {
      seen.add(key);
      lines.push(line);
    }
  };

  const show = (hit) => {
    if (hit.type === 'item') {
      const { item } = hit;
      if (!item.ok) return add(`item:${item.id}`, `⚠️ قیمت «${ASSET_LINES[item.id].name}» در این لحظه دریافت نشد.`);
      return add(`item:${item.id}`, formatItemLine(item));
    }
    const { coin } = hit;
    if (priced.dollarToman == null) return add(`coin:${coin.symbol}`, '⚠️ نرخ دلار در این لحظه دریافت نشد.');
    return add(`coin:${coin.symbol}`, formatCoinLine({ ...coin, toman: coin.usd * priced.dollarToman }));
  };

  for (const part of splitQuery(raw)) {
    const full = normalizeQuery(part);
    if (!full) continue;

    // اول کل عبارت، بعد هر کلمه‌ی آن. مثلاً «ETH دلار» هر دو را پیدا می‌کند.
    const whole = await lookup([full]);
    if (whole) {
      show(whole);
      continue;
    }

    let matched = false;
    for (const token of full.split(' ').filter(Boolean)) {
      const hit = await lookup([token]);
      if (hit) {
        matched = true;
        show(hit);
      }
    }

    if (!matched) {
      if (coins === null) {
        add(`missing:${full}`, `⚠️ «${escapeHtml(part)}»: قیمت کوین‌ها در این لحظه در دسترس نیست.`);
      } else {
        add(`missing:${full}`, `❌ «${escapeHtml(part)}» پیدا نشد.`);
      }
    }
  }

  if (lines.length === 0) lines.push(NOT_FOUND);
  return lines;
}

// کاربر زیر یک دقیقه درخواست داده: پیام صبر با شمارش معکوس هر ثانیه، و در پایان پیام آماده‌باش.
async function countdown(chatId, waitSec) {
  const sent = await send(chatId, countdownText(waitSec));
  const messageId = sent?.message_id;
  for (let s = waitSec - 1; s >= 0; s--) {
    await sleep(1000);
    if (!messageId) continue;
    const text = s > 0 ? countdownText(s) : READY_TEXT;
    await edit(chatId, messageId, text).catch(() => {});
  }
}

export async function searchAsset(chatId, userId, rawQuery) {
  try {
    const cd = await claimCooldown(userId, COOLDOWN_MS);
    if (!cd.ok) return countdown(chatId, cd.waitSec);

    const priced = await getPricedItems();
    const lines = await resolveQuery(rawQuery, priced);
    return send(chatId, lines.join('\n'));
  } catch (e) {
    console.error(e);
    return send(chatId, '❌ دریافت قیمت موقتاً انجام نشد. کمی بعد دوباره امتحان کنید.');
  }
}
