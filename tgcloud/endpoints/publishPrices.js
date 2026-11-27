// endpoints/publishPrices.js — پست قیمت‌ها به کانال.
// زمان‌بندی هر ۳۰ دقیقه از GitHub Actions می‌آید (scheduled: true) و از زمان شروع به بعد ارسال می‌کند.
import { EndpointError } from 'sdk';
import { ADMIN_ID } from '../lib/config.js';
import { publishChannelPrices } from '../lib/publish.js';

export default async function (input, ctx) {
  const caller = ctx?.initData?.user?.id;
  if (!caller || String(caller) !== String(ADMIN_ID)) {
    throw new EndpointError('Forbidden', { code: 'FORBIDDEN' });
  }
  return publishChannelPrices({ scheduled: input?.scheduled === true });
}
