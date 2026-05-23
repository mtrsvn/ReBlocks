export const COUNTRIES = [
  { code: 'ph', name: 'Philippines', currency: 'PHP', flag: '🇵🇭' },
  { code: 'sg', name: 'Singapore', currency: 'SGD', flag: '🇸🇬' },
  { code: 'th', name: 'Thailand', currency: 'THB', flag: '🇹🇭' },
  { code: 'my', name: 'Malaysia', currency: 'MYR', flag: '🇲🇾' },
  { code: 'vn', name: 'Vietnam', currency: 'VND', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesia', currency: 'IDR', flag: '🇮🇩' },
];

export const PAYMENT_METHODS: { [countryCode: string]: string[] } = {
  ph: ['GCash', 'PayMaya', 'BPI', 'BDO', 'UnionBank', 'Metrobank'],
  sg: ['Bank Transfer', 'PayNow', 'GrabPay'],
  th: ['Bank Transfer', 'PromptPay', 'TrueMoney'],
  my: ['Bank Transfer', 'DuitNow', 'Touch n Go'],
  vn: ['Bank Transfer', 'MoMo', 'ViettelPay', 'ZaloPay'],
  id: ['Bank Transfer', 'GoPay', 'OVO', 'Dana'],
};

export function getCountryByCode(code: string) {
  if (!code) return undefined;
  const normalized = code.trim().toLowerCase();
  return COUNTRIES.find(c => c.code.toLowerCase() === normalized || c.name.toLowerCase() === normalized);
}

export function getCountryFlag(code: string): string {
  if (!code) return '🌍';
  const normalized = code.trim().toLowerCase();

  // direct lookup by code or name
  const byEntry = COUNTRIES.find(c => c.code.toLowerCase() === normalized || c.name.toLowerCase() === normalized);
  if (byEntry) return byEntry.flag;

  // if input is a 2-letter ISO code (e.g., 'PH' or 'ph'), construct regional indicator flag
  const alpha = code.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(alpha)) {
    const first = 0x1F1E6 + (alpha.charCodeAt(0) - 65);
    const second = 0x1F1E6 + (alpha.charCodeAt(1) - 65);
    try {
      return String.fromCodePoint(first, second);
    } catch (e) {
      // fallthrough
    }
  }

  return '🌍';
}

export function getCountryCurrency(code: string): string {
  if (!code) return 'USD';
  const normalized = code.trim().toLowerCase();
  const found = COUNTRIES.find(c => c.code.toLowerCase() === normalized || c.name.toLowerCase() === normalized);
  return found?.currency || 'USD';
}

export function getPaymentMethods(countryCode: string): string[] {
  return PAYMENT_METHODS[countryCode] || ['Bank Transfer'];
}
