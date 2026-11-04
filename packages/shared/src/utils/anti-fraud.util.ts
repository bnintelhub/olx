const PROHIBITED_KEYWORDS = [
  'weapon',
  'gun',
  'pistol',
  'rifle',
  'ammunition',
  'drug',
  'narcotics',
  'counterfeit',
  'fake currency',
  'stolen',
  'escort',
  'lottery winner',
  'pay advance token',
  'send money before inspection',
  'western union',
  'cryptocurrency transfer',
];

const ADVANCE_FRAUD_PATTERNS = [
  /send\s+(?:advance|token|deposit)/i,
  /pay\s+before\s+(?:delivery|seeing|meeting)/i,
  /qr\s*code\s*scan\s*to\s*receive/i,
  /pin\s*number\s*required/i,
];

export interface FraudCheckResult {
  isFlagged: boolean;
  reasons: string[];
  sanitizedDescription: string;
}

export function checkContentForFraud(title: string, description: string): FraudCheckResult {
  const combined = `${title} ${description}`.toLowerCase();
  const reasons: string[] = [];

  for (const kw of PROHIBITED_KEYWORDS) {
    if (combined.includes(kw)) {
      reasons.push(`Contains prohibited keyword: "${kw}"`);
    }
  }

  for (const pattern of ADVANCE_FRAUD_PATTERNS) {
    if (pattern.test(combined)) {
      reasons.push('Detected potential advance payment / QR code phishing pattern');
      break;
    }
  }

  const sanitizedDescription = description.replace(
    /(?:\+91|91|0)?[6-9]\d{9}/g,
    '[Phone hidden for safety - Click Show Number]'
  );

  return {
    isFlagged: reasons.length > 0,
    reasons,
    sanitizedDescription,
  };
}
