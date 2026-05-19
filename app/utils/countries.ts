export const COUNTRIES = [
  { code: 'ph', name: 'Philippines', currency: 'PHP', flag: '🇵🇭' },
  { code: 'us', name: 'United States', currency: 'USD', flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  { code: 'jp', name: 'Japan', currency: 'JPY', flag: '🇯🇵' },
  { code: 'ca', name: 'Canada', currency: 'CAD', flag: '🇨🇦' },
  { code: 'au', name: 'Australia', currency: 'AUD', flag: '🇦🇺' },
  { code: 'sg', name: 'Singapore', currency: 'SGD', flag: '🇸🇬' },
  { code: 'hk', name: 'Hong Kong', currency: 'HKD', flag: '🇭🇰' },
  { code: 'kr', name: 'South Korea', currency: 'KRW', flag: '🇰🇷' },
  { code: 'th', name: 'Thailand', currency: 'THB', flag: '🇹🇭' },
  { code: 'my', name: 'Malaysia', currency: 'MYR', flag: '🇲🇾' },
  { code: 'in', name: 'India', currency: 'INR', flag: '🇮🇳' },
  { code: 'cn', name: 'China', currency: 'CNY', flag: '🇨🇳' },
  { code: 'eu', name: 'Eurozone', currency: 'EUR', flag: '🇪🇺' },
];

export const PAYMENT_METHODS: { [countryCode: string]: string[] } = {
  ph: ['GCash', 'PayMaya', 'BPI', 'BDO', 'UnionBank', 'Metrobank'],
  us: ['Bank Transfer', 'Zelle', 'Venmo', 'Cash App'],
  gb: ['Bank Transfer', 'PayPal'],
  jp: ['Bank Transfer', 'PayPay'],
  ca: ['Bank Transfer', 'Interac'],
  au: ['Bank Transfer', 'PayID'],
  sg: ['Bank Transfer', 'PayNow'],
  hk: ['Bank Transfer', 'FPS'],
  kr: ['Bank Transfer', 'KakaoPay'],
  th: ['Bank Transfer', 'PromptPay'],
  my: ['Bank Transfer', 'DuitNow'],
  in: ['Bank Transfer', 'UPI', 'Paytm'],
  cn: ['Bank Transfer', 'Alipay', 'WeChat Pay'],
  eu: ['Bank Transfer', 'SEPA'],
};

export function getCountryByCode(code: string) {
  return COUNTRIES.find(c => c.code === code);
}

export function getCountryFlag(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.flag || '🌍';
}

export function getCountryCurrency(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.currency || 'USD';
}

export function getPaymentMethods(countryCode: string): string[] {
  return PAYMENT_METHODS[countryCode] || ['Bank Transfer'];
}
