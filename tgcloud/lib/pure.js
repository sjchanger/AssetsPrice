// Pure helpers: no SDK imports, safe to test anywhere.

export function parseNum(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/<[^>]*>/g, '').replace(/[,%\s]/g, '');
  const n = Number(s);
  return s !== '' && Number.isFinite(n) ? n : null;
}

// تومان با نقطه: 2950000 -> "2.950.000"
export function fmtToman(n) {
  if (n == null) return '—';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// دلار با کاما و اعشار: 65000.5 -> "65,000.50"
export function fmtUsd(n) {
  const [int, frac] = n.toFixed(n < 1 ? 4 : 2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
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

// Converts one raw value to toman. Metals end up per gram.
function toToman(item, raw, dollarToman) {
  if (raw == null) return null;
  switch (item.unit) {
    case 'rial':    return raw / 10;                                          // ریال → تومان
    case 'usd':     return dollarToman == null ? null : raw * dollarToman;     // دلار → تومان
    case 'usd_oz':  return dollarToman == null ? null : (raw / 31.1035) * dollarToman;  // دلار بر اونس → تومان بر گرم
    case 'usd_lb':  return dollarToman == null ? null : (raw / 453.592) * dollarToman;  // دلار بر پوند → تومان بر گرم
    case 'usd_ton': return dollarToman == null ? null : (raw / 1000000) * dollarToman;  // دلار بر تن → تومان بر گرم
    default:        return null;
  }
}

// current = TGJU "current" object: { [symbol]: { p, d, dp, dt, h, l, ts } }
// dt = 'low' means the change is negative.
export function priceItems(items, current) {
  const quote = (sym) => (sym && current && current[sym]) || null;

  const dollarQ = quote(items.find((i) => i.id === 'dollar')?.symbol);
  const dollarRial = dollarQ ? parseNum(dollarQ.p) : null;
  const dollarToman = dollarRial != null ? dollarRial / 10 : null;

  const out = items.map((item) => {
    const q = quote(item.symbol);
    const raw = q ? parseNum(q.p) : null;
    const toman = toToman(item, raw, dollarToman);
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

// ----- پست کانال: فقط ۴ آیتم، با فرمت ثابت -----
const CHANNEL_LINES = [
  { id: 'dollar', icon: '🟢', name: 'دلار', note: '' },
  { id: 'silver', icon: '⚪️', name: 'نقره', note: ' (گرم)' },
  { id: 'gold',   icon: '🟡', name: 'طلا',  note: ' (گرم)' },
  { id: 'copper', icon: '🟤', name: 'مس',   note: ' (گرم)' },
];

export function formatChannelPost(items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  return CHANNEL_LINES
    .filter((l) => byId.get(l.id)?.ok)
    .map((l) => {
      const price = fmtToman(byId.get(l.id).toman);
      return `${l.icon} قیمت لحظه ای <b>«${l.name}»</b>${l.note} : ${price} تومان`;
    })
    .join('\n');
}

// ----- پنل داخل ربات: همه‌ی آیتم‌ها + کوین‌ها -----
const BOARD_LIMIT = 3900; // سقف امن پیام تلگرام (۴۰۹۶)

export function formatBoard(priced, coins, time) {
  const head = [
    `💎 <b>پنل قیمت‌ها</b>  ·  ساعت ${time} (تهران)`,
    '',
    '<b>فلزات و ارز</b>',
  ];

  const main = priced.items.map((i) => {
    if (!i.ok) return `${i.label}  ⚠️ نامشخص`;
    const change = i.changePct != null ? `  ${trendIcon(i.changePct)} ${fmtPct(i.changePct)}` : '';
    const per = i.per ? ` / ${i.per}` : '';
    return `${i.label}\n    <b>${fmtToman(i.toman)}</b> تومان${per}${change}`;
  });

  const coinHead = ['', `<b>کوین‌ها (${coins ? coins.length : 0})</b>`];
  let coinLines = coins
    ? coins.map((c, idx) => {
        const toman = c.toman != null ? `  ≈ ${fmtToman(c.toman)} تومان` : '';
        return `${idx + 1}. <b>${c.symbol}</b>  ${fmtUsd(c.usd)}$  ${trendIcon(c.change24h)} ${fmtPct(c.change24h)}${toman}`;
      })
    : ['⚠️ در این لحظه در دسترس نیست'];

  const footer = ['', 'منابع: TGJU · CoinMarketCap'];
  const build = (lines) => [...head, ...main, ...coinHead, ...lines, ...footer].join('\n');

  let text = build(coinLines);
  while (text.length > BOARD_LIMIT && coinLines.length > 0) {
    coinLines = coinLines.slice(0, -1);
    text = build(coinLines);
  }
  return text;
}

export function cooldownText(waitSec) {
  return `⏳ لطفاً ${waitSec} ثانیه دیگر صبر کنید.`;
}
