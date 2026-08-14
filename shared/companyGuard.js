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
