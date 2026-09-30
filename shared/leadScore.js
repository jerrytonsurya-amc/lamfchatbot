const INTENT_SIGNALS = [
  {
    id: 'apply',
    label: 'Wants to apply',
    points: 25,
    pattern: /\b(apply|application|how (do|can) i (get|start|take)|start (the )?(loan|journey)|proceed|interested|i want (a |the )?loan|need (a |the )?loan|avail|sign ?up)\b/,
  },
  {
    id: 'amount',
    label: 'Mentioned an amount',
    points: 15,
    pattern: /(\b\d[\d,.]*\s*(lakh|lakhs|lac|lacs|crore|crores|cr|k|thousand)\b)|((rs\.?|inr|₹)\s*\d)|\b\d{5,}\b/,
  },
  {
    id: 'eligibility',
    label: 'Asked about eligibility / loan amount',
    points: 15,
    pattern: /\b(eligib\w*|how much (loan|can i)|loan amount|ltv|loan to value|limit|maximum|minimum)\b/,
  },
  {
    id: 'pricing',
    label: 'Asked about interest / charges',
    points: 10,
    pattern: /\b(interest|rate|roi|processing fee|fees?|charges?|cost|penal|bounce|stamp duty|renewal)\b/,
  },
  {
    id: 'process',
    label: 'Asked about process / documents',
    points: 10,
    pattern: /\b(kyc|document|pan|aadhaar|aadhar|pledge|mandate|nach|e-?sign|disburs\w*|withdraw\w*|sanction|bank account|steps?|process)\b/,
  },
  {
    id: 'holdings',
    label: 'Mentioned their mutual funds',
    points: 10,
    pattern: /\b(my (mutual funds?|mf|funds?|portfolio|units|folio)|i (have|hold) .{0,30}(mutual funds?|mf|funds?|units))\b/,
  },
  {
    id: 'repayment',
    label: 'Asked about repayment',
    points: 5,
    pattern: /\b(repay\w*|emi|balloon|tenure|pre-?clos\w*|foreclos\w*)\b/,
  },
];

const NEGATIVE_PATTERN =
  /\b(not interested|no longer interested|don'?t want (a |the |this )?loan|do not want (a |the |this )?loan|no thanks|not now|just (browsing|checking))\b/;

const DAY_MS = 24 * 60 * 60 * 1000;

function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Heuristic lead score (0–100) from a customer's chat messages.
 * Messages: [{ role: 'user' | 'assistant', content, createdAt }].
 */
export function computeLeadScore(messages = [], lastActivity = null, now = Date.now()) {
  const userTexts = messages
    .filter((m) => m.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content.toLowerCase());

  if (userTexts.length === 0) {
    return { score: 0, label: 'Cold', reasons: ['No questions asked yet'] };
  }

  const combined = userTexts.join(' \n ');
  const reasons = [];
  let score = 0;

  const engagement = Math.min(userTexts.length * 4, 20);
  score += engagement;
  reasons.push(`${userTexts.length} question${userTexts.length === 1 ? '' : 's'} asked`);

  for (const signal of INTENT_SIGNALS) {
    if (signal.pattern.test(combined)) {
      score += signal.points;
      reasons.push(signal.label);
    }
  }

  const lastMs = toMillis(lastActivity);
  if (lastMs) {
    const age = now - lastMs;
    if (age <= DAY_MS) {
      score += 10;
      reasons.push('Active in last 24 hours');
    } else if (age <= 7 * DAY_MS) {
      score += 5;
      reasons.push('Active in last 7 days');
    }
  }

  if (NEGATIVE_PATTERN.test(combined)) {
    score -= 25;
    reasons.push('Said not interested');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';

  return { score, label, reasons };
}
