import { api } from 'sdk';
import { CHANNEL_ID, BOT_USERNAME } from './config.js';
import { getPricedItems } from './sources.js';
import { formatChannelPost, tehranHHMM } from './pure.js';

export async function publishChannelPrices() {
  if (CHANNEL_ID.startsWith('@PUT_') || BOT_USERNAME.startsWith('PUT_')) {
    throw new Error('CHANNEL_ID / BOT_USERNAME are not set in tgcloud/lib/config.js');
  }

  const priced = await getPricedItems();
  const ready = priced.items.filter((i) => i.ok);
  if (ready.length === 0) throw new Error('no prices available from TGJU');

  const msg = await api.sendMessage({
    chat_id: CHANNEL_ID,
    text: formatChannelPost(ready, tehranHHMM()),
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [[
        { text: '📊 مشاهده قیمت آیتم‌های دیگر', url: `https://t.me/${BOT_USERNAME}?start=prices` },
      ]],
    },
  });

  return { ok: true, message_id: msg.message_id, posted: ready.map((i) => i.id) };
}
