import { api, BotApiError } from 'sdk';
import { COOLDOWN_MS } from './config.js';
import { claimCooldown } from './kv.js';
import { getPricedItems, getTopCoins } from './sources.js';
import { formatBoard, tehranHHMM, cooldownText } from './pure.js';

export const BOARD_KEYBOARD = {
  inline_keyboard: [[{ text: '🔄 بروزرسانی', callback_data: 'refresh' }]],
};

const NO_PREVIEW = { is_disabled: true };

async function buildBoardText() {
  const priced = await getPricedItems();

  let coins = null;
  try {
    coins = await getTopCoins();
  } catch (e) {
    console.error('CMC unavailable', e);
  }
  if (coins && priced.dollarToman != null) {
    coins = coins.map((c) => ({ ...c, toman: c.usd * priced.dollarToman }));
  } else if (coins) {
    coins = coins.map((c) => ({ ...c, toman: null }));
  }

  return formatBoard(priced, coins, tehranHHMM());
}

// Shared by /start prices, /prices, the text "قیمت", and the inline buttons.
// Every request counts against the user's cooldown, so repeated taps cannot spam TGJU or CoinMarketCap.
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
      reply_markup: BOARD_KEYBOARD,
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
      // Telegram cannot grey out a button, so the press is answered with the remaining wait instead.
      return api.answerCallbackQuery({
        callback_query_id: cq.id,
        text: cooldownText(cd.waitSec),
        show_alert: true,
      });
    }

    // Acknowledge first so Telegram's spinner stops, then do the slower fetch.
    await api.answerCallbackQuery({ callback_query_id: cq.id });
    const text = await buildBoardText();

    if (cq.data === 'refresh' && messageId) {
      try {
        return await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'HTML',
          reply_markup: BOARD_KEYBOARD,
          link_preview_options: NO_PREVIEW,
        });
      } catch (e) {
        // "message is not modified" when the content is unchanged; nothing to do.
        if (e instanceof BotApiError && e.code === 400) return;
        throw e;
      }
    }

    return api.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: BOARD_KEYBOARD,
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
