import { api } from 'sdk';
import { CHANNEL_ID, BOT_USERNAME } from './config.js';
import { getPricedItems } from './sources.js';
import { formatChannelPost } from './pure.js';

// شروع ارسال خودکار: ۲۸ نوامبر ۲۰۲۶ ساعت ۰۰:۰۰ به وقت تهران
export const POST_START_MS = Date.parse('2026-11-28T00:00:00+03:30');

// scheduled = true فقط از cron می‌آید و قبل از زمان شروع ارسال نمی‌کند.
// اجرای دستی همیشه پست می‌گذارد.
export async function publishChannelPrices({ scheduled = false } = {}) {
  if (scheduled && Date.now() < POST_START_MS) {
    return { ok: true, skipped: true, reason: 'before start time' };
  }

  if (CHANNEL_ID.startsWith('@PUT_') || BOT_USERNAME.startsWith('PUT_')) {
    throw new Error('CHANNEL_ID / BOT_USERNAME are not set in tgcloud/lib/config.js');
  }

  const priced = await getPricedItems();
  const text = formatChannelPost(priced.items);
  if (!text) throw new Error('no prices available from TGJU');

  const msg = await api.sendMessage({
    chat_id: CHANNEL_ID,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [[
        { text: '🔎 جستجوی دارایی', url: `https://t.me/${BOT_USERNAME}` },
      ]],
    },
  });

  return { ok: true, message_id: msg.message_id };
}
