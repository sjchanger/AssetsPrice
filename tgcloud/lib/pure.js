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

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Converts one raw value to toman. Metals end up per gram.
function toToman(item, raw, dollarToman) {
  if (raw == null) return null;
  switch (item.unit) {
    case 'rial':    return raw / 10;
    case 'usd':     return dollarToman == null ? null : raw * dollarToman;
    case 'usd_oz':  return dollarToman == null ? null : (raw / 31.1035) * dollarToman;
    case 'usd_lb':  return dollarToman == null ? null : (raw / 453.592) * dollarToman;
    case 'usd_ton': return dollarToman == null ? null : (raw / 1000000) * dollarToman;
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

// ----- فرمت ثابت دارایی‌های TGJU (هم کانال و هم جستجوی ربات) -----
export const ASSET_LINES = {
  dollar: { icon: '🟢', name: 'دلار', note: '' },
  silver: { icon: '⚪️', name: 'نقره', note: ' (گرم)' },
  gold:   { icon: '🟡', name: 'طلا',  note: ' (گرم)' },
  copper: { icon: '🟤', name: 'مس',   note: ' (گرم)' },
};

const CHANNEL_ORDER = ['dollar', 'silver', 'gold', 'copper'];

export function formatItemLine(item) {
  const line = ASSET_LINES[item.id];
  return `${line.icon} قیمت لحظه ای <b>«${line.name}»</b>${line.note} : ${fmtToman(item.toman)} تومان`;
}

// پست کانال: فقط دلار، نقره، طلا و مس
export function formatChannelPost(items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  return CHANNEL_ORDER
    .map((id) => byId.get(id))
    .filter((i) => i && i.ok)
    .map(formatItemLine)
    .join('\n');
}

// ----- فرمت کوین‌ها در جستجو -----
export function formatCoinLine(coin) {
  return `🔸 قیمت لحظه ای <b>«${escapeHtml(coin.name)}»</b> (${escapeHtml(coin.symbol)}) : ${fmtToman(coin.toman)} تومان`;
}

// ----- جستجو: نام یا نماد، بدون حساسیت به بزرگی حروف -----
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeQuery(s) {
  let out = String(s).normalize('NFKC');
  for (let d = 0; d < 10; d++) {
    out = out.split(PERSIAN_DIGITS[d]).join(String(d)).split(ARABIC_DIGITS[d]).join(String(d));
  }
  return out
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200e\u200f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const ITEM_ALIASES = {
  dollar: ['دلار', 'دلار آزاد', 'dollar', 'usd', '$'],
  gold:   ['طلا', 'طلای', 'طلای ۱۸ عیار', 'gold', 'xau'],
  silver: ['نقره', 'silver', 'xag'],
  copper: ['مس', 'copper', 'cu'],
};

// اول کل متن، بعد هر کلمه‌ی آن. مثلاً «قیمت دلار» هم پیدا می‌شود.
export function queryCandidates(raw) {
  const full = normalizeQuery(raw);
  if (!full) return [];
  const tokens = full.split(' ').filter(Boolean);
  return [full, ...tokens.filter((t) => t !== full)];
}

export function matchItem(candidates, items) {
  for (const c of candidates) {
    for (const item of items) {
      const aliases = (ITEM_ALIASES[item.id] || []).map(normalizeQuery);
      if (aliases.includes(c)) return item;
    }
  }
  return null;
}

export function matchCoin(candidates, coins) {
  for (const c of candidates) {
    const hit = coins.find((k) => normalizeQuery(k.symbol) === c || normalizeQuery(k.name) === c);
    if (hit) return hit;
  }
  return null;
}

export function cooldownText(waitSec) {
  return `⏳ لطفاً ${waitSec} ثانیه دیگر صبر کنید.`;
}
