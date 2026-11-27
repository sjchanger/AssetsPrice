// handlers/callback_query.js — در این نسخه دکمه‌ای وجود ندارد؛ فقط جواب خالی می‌دهیم.
import { api } from 'sdk';

export default async function (cq) {
  return api.answerCallbackQuery({ callback_query_id: cq.id });
}
