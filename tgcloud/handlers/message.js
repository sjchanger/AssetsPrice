// handlers/message.js — هر پیام کاربر. /start راهنماست، بقیه‌ی متن‌ها جستجوی دارایی هستند.
import { api } from 'sdk';
import { searchAsset } from '../lib/bot.js';

const WELCOME =
  '👋 سلام!\n' +
  'نام یا نماد هر دارایی را بفرستید تا قیمتش را ببینید.\n' +
  'مثال: ETH، طلا، نقره، مس، BTC\n\n';

export default async function (message) {
  const chatId = message.chat.id;
  const userId = message.from?.id ?? chatId;
  const text = (message.text ?? '').trim();
  if (!text) return;

  const cmd = text.split(/\s+/)[0].split('@')[0];
  if (cmd === '/start') {
    return api.sendMessage({ chat_id: chatId, text: WELCOME });
  }
  if (cmd.startsWith('/')) return; // سایر دستورها نادیده گرفته می‌شوند

  return searchAsset(chatId, userId, text);
}
