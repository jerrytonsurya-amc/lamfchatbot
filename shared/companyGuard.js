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
  'Customer question: How can I do an additional pledge? ' +
  'Simple answer: Additional pledge is not available right now on Shriram Credit LAMF. You cannot add more mutual fund units to an existing loan through the journey at this time.';

export function getAdditionalPledgeInstruction() {
  return (
    'ADDITIONAL PLEDGE (required): The user is asking about additional pledge. ' +
    'Clearly state that additional pledge is NOT available right now. Do not provide steps to add more units via MF Central or the online journey.'
  );
}

export function getStocksClarificationInstruction() {
  return (
    'STOCKS/SHARES CLARIFICATION (required): The user mentioned stocks or equity shares. ' +
    'You MUST begin your answer by clearly stating that Shriram Credit LAMF provides loans only against eligible mutual fund units — not against individual stocks or equity shares. ' +
    'If they also asked about LTV, loan amount, or eligibility for mutual funds, answer that part after this clarification.'
  );
}
