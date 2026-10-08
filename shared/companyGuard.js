export const OUT_OF_SCOPE_HINTS = ['cifc', 'coforge', 'cholamandalam', 'annual report', 'investor presentation'];

export function detectOutOfScopeQuestion(query) {
  const lower = query.toLowerCase().replace(/\s+/g, ' ');
  return OUT_OF_SCOPE_HINTS.some((hint) => lower.includes(hint));
}

export function getOutOfScopeMessage() {
  return (
    'This assistant is for **Shriram Credit LAMF AI Assistant** (Loan Against Mutual Funds) only — customer FAQs, voicebot scripts, and the program document.\n\n' +
    'CIFC / Chola financial reports are not available here. Please ask about LAMF eligibility, process, disbursement, or FAQs.'
  );
}

/** User mentioned stocks/shares — LAMF is mutual-fund units only. */
export function detectStocksMention(query) {
  const lower = query.toLowerCase().replace(/\s+/g, ' ');

  if (/\b(stocks?|equity shares?)\b/.test(lower)) return true;
  if (/\bloan against shares?\b/.test(lower)) return true;
  if (/\bpledge shares?\b/.test(lower)) return true;
  if (/\bshares?\b/.test(lower) && /\b(ltv|loan|pledge|collateral)\b/.test(lower) && !/\bmutual fund\b/.test(lower)) {
    return true;
  }

  return false;
}

export const STOCKS_CLARIFICATION_CONTEXT =
  'Customer question: Can I get a LAMF loan against stocks or equity shares? ' +
  'Simple answer: No. Shriram Credit LAMF provides loans only against eligible mutual fund units — not against individual stocks or equity shares. ' +
  'This product does not offer Loan Against Shares. If you hold eligible mutual funds, LTV applies to those units (45% for equity mutual funds and 75% for debt mutual funds).';

export const APPLY_URL = 'https://lamf.shriramcredit.in/?source=chatbot';
export const APPLY_LINK_MARKDOWN = `[Apply for a Loan Against Mutual Funds](${APPLY_URL})`;

/** User wants to apply, start, or get a loan against mutual funds. */
export function detectApplyIntent(query) {
  const lower = query.toLowerCase().replace(/\s+/g, ' ');
  return (
    /\b(apply|applying|application|sign ?up|register|onboard\w*|get started|avail)\b/.test(lower) ||
    /\b(start|begin|open)\b.{0,20}\b(loan|journey|account|process)\b/.test(lower) ||
    /\b(how|where) (do|can|should) i (get|take|start|begin)\b/.test(lower) ||
    /\b(i )?(want|need|would like|looking for|interested in)\b.{0,25}\b(loan|lamf|credit|funds?)\b/.test(lower) ||
    /\b(am i eligible|check (my )?eligibility|interested|proceed)\b/.test(lower)
  );
}

export function getApplyInstruction() {
  return (
    'APPLY LINK (required): The user wants to apply or get started. ' +
    `After answering, invite them to apply online using this exact markdown link: ${APPLY_LINK_MARKDOWN}`
  );
}

export function detectAdditionalPledgeQuestion(query) {
  const lower = query.toLowerCase().replace(/\s+/g, ' ');
  return (
    /\badditional pledge\b/.test(lower) ||
    /\bextra pledge\b/.test(lower) ||
    /\bpledge more\b/.test(lower) ||
    /\badd more units\b/.test(lower) ||
    /\badd more mutual fund\b/.test(lower) ||
    /\bmore collateral\b/.test(lower) ||
    /\bpledge additional\b/.test(lower)
  );
}

export const ADDITIONAL_PLEDGE_CONTEXT =
  'Customer question: Can I pledge more mutual fund units? ' +
  'Simple answer: You cannot add units through the standard journey to increase your sanction limit after setup. If Collateral Comfort is Action Required or Critical, you may regularise by pledging additional eligible units through MF Central or by partial repayment. See Collateral Comfort levels and shortfall guidance.';

export function getAdditionalPledgeInstruction() {
  return (
    'ADDITIONAL PLEDGE / MORE UNITS (required): The user is asking about pledging more units or additional collateral. ' +
    'Explain Collateral Comfort: increasing sanction limit via the standard journey is not available; for Action Required or Critical LTV, they may pledge additional eligible units through MF Central or make a partial repayment to regularise.'
  );
}

export function getStocksClarificationInstruction() {
  return (
    'STOCKS/SHARES CLARIFICATION (required): The user mentioned stocks or equity shares. ' +
    'You MUST begin your answer by clearly stating that Shriram Credit LAMF provides loans only against eligible mutual fund units — not against individual stocks or equity shares. ' +
    'If they also asked about LTV, loan amount, or eligibility for mutual funds, answer that part after this clarification.'
  );
}

/** LTV breach, margin, or Collateral Comfort — ensure Critical level includes invocation wording. */
export function detectCollateralComfortQuestion(query) {
  const lower = query.toLowerCase().replace(/\s+/g, ' ');
  return (
    /\bltv\s*breach\b/.test(lower) ||
    /\bcollateral comfort\b/.test(lower) ||
    /\bmargin call\b/.test(lower) ||
    /\bshortfall amount\b/.test(lower) ||
    (/\bbreach\b/.test(lower) && /\b(ltv|collateral|pledge|mutual fund)\b/.test(lower)) ||
    (/\b(invocation|invoke)\b/.test(lower) && /\b(ltv|collateral|pledge|breach)\b/.test(lower)) ||
    /\b(critical|action required)\b/.test(lower) && /\b(ltv|collateral comfort)\b/.test(lower)
  );
}

export const COLLATERAL_COMFORT_LEVELS_CONTEXT =
  'Customer question: What is an LTV breach? ' +
  'Simple answer: Collateral Comfort levels — Comfortable: within limits, no action required. ' +
  'Monitor: Equity above 45% up to 48%; Debt above 75% up to 78%. ' +
  'Action Required: Equity above 48% up to 49%; Debt above 78% up to 83%; pledge via MF Central or partial repayment. ' +
  'Critical: Equity 49% or above; Debt 83% or above — immediate corrective action is required. ' +
  'If the required amount is not regularised immediately, your pledged units may be eligible for invocation as per the applicable terms and conditions.';

export function getCollateralComfortInstruction() {
  return (
    'COLLATERAL COMFORT / LTV BREACH (required): When you describe the Critical level (equity 49% or above, debt 83% or above), ' +
    'you MUST include this sentence immediately after stating that immediate corrective action is required: ' +
    '"If the required amount is not regularised immediately, your pledged units may be eligible for invocation as per the applicable terms and conditions." ' +
    'Do NOT mention T+5 or a fixed number of working days to cure an LTV breach.'
  );
}
