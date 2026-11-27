import { api, BotApiError } from 'sdk';
import { COOLDOWN_MS, CHANNEL_ID } from './config.js';
import { claimCooldown } from './kv.js';
import { getPricedItems, getTopCoins } from './sources.js';
import { formatBoard, tehranHHMM, cooldownText } from './pure.js';

const NO_PREVIEW = { is_disabled: true };

// دکمه‌های شیشه‌ای زیر پنل: بروزرسانی + لینک کانال (اگر کانال عمومی باشد)
function boardKeyboard() {
  const row = [{ text: '🔄 بروزرسانی', callback_data: 'refresh' }];
  if (CHANNEL_ID.startsWith('@') && !CHANNEL_ID.startsWith('@PUT_')) {
    row.push({ text: '📢 کانال قیمت‌ها', url: `https://t.me/${CHANNEL_ID.slice(1)}` });
  }
  return { inline_keyboard: [row] };
}

async function buildBoardText() {
  const priced = await getPricedItems();

  let coins = null;
  try {
    coins = await getTopCoins();
  } catch (e) {
    console.error('CMC unavailable', e);
  }
  if (coins) {
    coins = coins.map((c) => ({
      ...c,
      toman: priced.dollarToman != null ? c.usd * priced.dollarToman : null,
    }));
  }

  return formatBoard(priced, coins, tehranHHMM());
}

// /start prices, /prices, متن «قیمت» و دکمه‌ها. هر درخواست کول‌داون یک‌دقیقه‌ای دارد.
export async function sendBoard(chatId, userId) {
  try {
    const cd = await claimCooldown(userId, COOLDOWN_MS);
    if (!cd.ok) {
      return api.sendMessage({ chat_id: chatId, text: cooldownText(cd.waitSec) });
    }
    const text = await buildBoardText();
    return api.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: boardKeyboard(),
      link_preview_options: NO_PREVIEW,
    });
  } catch (e) {
    console.error(e);
    return api.sendMessage({
      chat_id: chatId,
      text: '❌ دریافت قیمت‌ها موقتاً انجام نشد. کمی بعد دوباره امتحان کنید.',
    });
  }
}

export async function handleBoardCallback(cq) {
  const userId = cq.from.id;
  const chatId = cq.message?.chat?.id ?? userId;
  const messageId = cq.message?.message_id;

  try {
    const cd = await claimCooldown(userId, COOLDOWN_MS);
    if (!cd.ok) {
      // تلگرام نمی‌تواند دکمه را خاکستری کند، پس زمان باقی‌مانده را به‌صورت پاپ‌آپ نشان می‌دهیم.
      return api.answerCallbackQuery({
        callback_query_id: cq.id,
        text: cooldownText(cd.waitSec),
        show_alert: true,
      });
    }

    await api.answerCallbackQuery({ callback_query_id: cq.id });
    const text = await buildBoardText();

    if (cq.data === 'refresh' && messageId) {
      try {
        return await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'HTML',
          reply_markup: boardKeyboard(),
          link_preview_options: NO_PREVIEW,
        });
      } catch (e) {
        // "message is not modified": محتوا تغییری نکرده، کاری لازم نیست.
        if (e instanceof BotApiError && e.code === 400) return;
        throw e;
      }
    }

    return api.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: boardKeyboard(),
      link_preview_options: NO_PREVIEW,
    });
  } catch (e) {
    console.error(e);
    await api
      .answerCallbackQuery({
        callback_query_id: cq.id,
        text: '❌ خطا در دریافت قیمت‌ها',
        show_alert: true,
      })
      .catch(() => {});
  }
      }
