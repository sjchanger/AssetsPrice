// handlers/callback_query.js — runs when a user taps an inline button. Payload is the CallbackQuery.
import { api } from 'sdk';
import { handleBoardCallback } from '../lib/bot.js';

export default async function (cq) {
  if (cq.data === 'prices' || cq.data === 'refresh') {
    return handleBoardCallback(cq);
  }
  return api.answerCallbackQuery({ callback_query_id: cq.id });
}
