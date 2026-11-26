// ============================================================
//  تنظیمات — ساخته‌شده توسط setup_prices_bot.py
// ============================================================

export const BOT_USERNAME = 'AssetsPriceBot';
export const CHANNEL_ID = '@AssetsPrice';
export const ADMIN_ID = 8653856378;
export const CMC_API_KEY = '73e1b61b04d548edafc9174a6bdad484';
export const CMC_TOP_LIMIT = 20;
export const TGJU_LIVE_URL = 'https://call4.tgju.org/ajax.json';

// unit: 'rial' = ریال (÷۱۰ تومان) | 'usd' = دلار (× نرخ دلار آزاد به تومان)
export const ITEMS = [
  { id: 'dollar', label: '💵 دلار آزاد',    symbol: 'price_dollar_rl', unit: 'rial', per: 'دلار' },
  { id: 'gold',   label: '🥇 طلای ۱۸ عیار', symbol: 'geram18',         unit: 'rial', per: 'گرم' },
  { id: 'silver', label: '🥈 نقره ۹۹۹',    symbol: 'silver_999',  unit: 'rial', per: 'گرم' },
  { id: 'copper', label: '🟤 مس',          symbol: 'basemetal-london-copper',  unit: 'usd', per: 'تن' },
];

export const COOLDOWN_MS = 60_000;     // هر کاربر: ۱ دقیقه بین دو درخواست
export const TGJU_CACHE_MS = 60_000;   // کش مشترک قیمت‌های TGJU
export const CMC_CACHE_MS = 120_000;   // کش مشترک کوین‌ها
