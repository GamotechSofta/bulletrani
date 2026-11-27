const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  BDT: '৳',
  NPR: 'रू',
  PKR: 'Rs ',
  LKR: 'Rs ',
  JPY: '¥',
  TRY: '₺',
  RUB: '₽',
  BRL: 'R$'
};

const STRINGS = {
  en: {
    startingSession: 'Starting session…',
    bet: 'BET',
    auto: 'Auto',
    tabBet: 'Bet',
    tabAuto: 'Auto',
    cashOut: 'Cash Out',
    cancel: 'Cancel',
    won: 'Won',
    exitLobby: 'Exit to Lobby',
    exitShort: 'Exit',
    wallet: 'My Wallet'
  },
  hi: {
    startingSession: 'सेशन शुरू हो रहा है…',
    bet: 'बेट',
    auto: 'ऑटो',
    tabBet: 'बेट',
    tabAuto: 'ऑटो',
    cashOut: 'कैश आउट',
    cancel: 'रद्द करें',
    won: 'जीत',
    exitLobby: 'लॉबी पर जाएं',
    exitShort: 'बाहर',
    wallet: 'मेरा वॉलेट'
  }
};

export function currencyPrefix(currency = 'INR') {
  const code = String(currency || 'INR').trim().toUpperCase();
  return CURRENCY_SYMBOLS[code] || `${code} `;
}

export function formatAmount(amount, lang = 'en', currency = 'INR') {
  const code = String(currency || 'INR').trim().toUpperCase();
  const locale = code === 'INR' ? 'en-IN' : (lang || 'en');
  try {
    return Number(amount || 0).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch {
    return Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

export function formatMoney(amount, currency = 'INR', lang = 'en') {
  return `${currencyPrefix(currency)}${formatAmount(amount, lang, currency)}`;
}

export function getUiStrings(lang = 'en') {
  const code = String(lang || 'en').trim().toLowerCase().split('-')[0];
  return STRINGS[code] || STRINGS.en;
}
