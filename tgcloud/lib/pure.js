// Pure helpers: no SDK imports, so they can be tested anywhere.

export function parseNum(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/<[^>]*>/g, '').replace(/[,%\s]/g, '');
  const n = Number(s);
  return s !== '' && Number.isFinite(n) ? n : null;
}

export function groupDigits(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmtToman(n) {
  return n == null ? '—' : groupDigits(Math.round(n));
}

export function fmtUsd(n) {
  const [int, frac] = n.toFixed(n < 1 ? 4 : 2).split('.');
  return frac ? `${groupDigits(int)}.${frac}` : groupDigits(int);
}

export function fmtPct(v) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export function trendIcon(v) {
  return v >= 0 ? '🟢' : '🔴';
}

// Tehran is UTC+3:30 with no DST.
export function tehranHHMM(nowMs = Date.now()) {
  const d = new Date(nowMs + 3.5 * 3600 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// current = TGJU "current" object: { [symbol]: { p, d, dp, dt, h, l, ts } }
// dt = 'low' means the change is negative (site marks falls with class "low").
export function priceItems(items, current) {
  const quote = (sym) => (sym && current && current[sym]) || null;

  const dollarQ = quote(items.find((i) => i.id === 'dollar')?.symbol);
  const dollarRial = dollarQ ? parseNum(dollarQ.p) : null;
  const dollarToman = dollarRial != null ? dollarRial / 10 : null;

  const out = items.map((item) => {
    const q = quote(item.symbol);
    const raw = q ? parseNum(q.p) : null;
    let toman = null;
    if (raw != null) {
      if (item.unit === 'rial') toman = raw / 10;
      else if (item.unit === 'usd' && dollarToman != null) toman = raw * dollarToman;
    }
    const sign = q && q.dt === 'low' ? -1 : 1;
    const dp = q ? parseNum(q.dp) : null;
    return {
      id: item.id,
      label: item.label,
      per: item.per,
      toman,
      changePct: dp == null ? null : sign * dp,
      ok: toman != null,
    };
  });

  return { items: out, dollarToman };
}

export function formatChannelPost(items, time) {
  const lines = items.map((i) => {
    const change = i.changePct != null ? ` (${trendIcon(i.changePct)} ${fmtPct(i.changePct)})` : '';
    return `${i.label}: <b>${fmtToman(i.toman)}</b> تومان / ${i.per}${change}`;
  });
  return [
    `📊 <b>قیمت لحظه‌ای بازار</b> — ساعت ${time} (تهران)`,
    '',
    ...lines,
    '',
    'منبع: TGJU',
  ].join('\n');
}

export function formatBoard(priced, coins, time) {
  const main = priced.items.map((i) => {
    if (!i.ok) return `${i.label}: ⚠️ دریافت نشد`;
    const change = i.changePct != null ? ` (${trendIcon(i.changePct)} ${fmtPct(i.changePct)})` : '';
    return `${i.label}: <b>${fmtToman(i.toman)}</b> تومان / ${i.per}${change}`;
  });

  const coinLines = coins
    ? coins.map((c) => {
        const toman = c.toman != null ? ` ≈ ${fmtToman(c.toman)} تومان` : '';
        return `• <b>${c.symbol}</b>: ${fmtUsd(c.usd)}$${toman}`;
      })
    : ['⚠️ قیمت کوین‌ها در این لحظه در دسترس نیست'];

  return [
    `📊 <b>قیمت‌ها</b> — ساعت ${time} (تهران)`,
    '',
    ...main,
    '',
    coins ? `🪙 <b>کوین‌ها (${coins.length} کوین برتر)</b>` : '🪙 <b>کوین‌ها</b>',
    ...coinLines,
    '',
    'منابع: TGJU · CoinMarketCap',
  ].join('\n');
}

export function cooldownText(waitSec) {
  return `⏳ لطفاً ${waitSec} ثانیه دیگر صبر کنید.`;
}
