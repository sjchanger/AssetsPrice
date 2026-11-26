// endpoints/publishPrices.js — posts the 4-item price snapshot to the channel.
// Triggered every 30 minutes by GitHub Actions via `npx tgcloud run` (see .github/workflows).
// Only the admin's init data (or the admin id passed in --ctx by the CI job) is accepted.
import { EndpointError } from 'sdk';
import { ADMIN_ID } from '../lib/config.js';
import { publishChannelPrices } from '../lib/publish.js';

export default async function (input, ctx) {
  const caller = ctx?.initData?.user?.id;
  if (!caller || String(caller) !== String(ADMIN_ID)) {
    throw new EndpointError('Forbidden', { code: 'FORBIDDEN' });
  }
  return publishChannelPrices();
}
