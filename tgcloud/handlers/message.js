// handlers/message.js — runs on each incoming message. The payload is the Message object.
import { api } from 'sdk';
import { sendBoard } from '../lib/bot.js';

const WELCOME = '👋 سلام! برای دیدن قیمت دلار، طلا، نقره، مس و کوین‌ها، دکمه‌ی زیر را بزنید.';
const START_KEYBOARD = {
  inline_keyboard: [[{ text: '📊 مشاهده قیمت‌ها', callback_data: 'prices' }]],
};

export default async function (message) {
  const chatId = message.chat.id;
  const userId = message.from?.id ?? chatId;
  const text = (message.text ?? '').trim();

  const [rawCmd, arg] = text.split(/\s+/);
  const cmd = (rawCmd ?? '').split('@')[0]; // handles /start@YourBot

  if (cmd === '/prices' || text === 'قیمت' || (cmd === '/start' && arg === 'prices')) {
    return sendBoard(chatId, userId);
  }

  if (cmd === '/start') {
    return api.sendMessage({ chat_id: chatId, text: WELCOME, reply_markup: START_KEYBOARD });
  }
}
