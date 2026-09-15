export const APP_CONFIG = {
  title: 'Shriram Credit LAMF AI Assistant',
  welcome:
    "Hello! I'm the Shriram Credit LAMF AI Assistant. I answer your questions about Loan Against Mutual Funds — eligibility, process, disbursement, interest, pledging, and FAQs.",
  placeholder: 'Ask your LAMF question — eligibility, process, rates, disbursement...',
  hint: 'Shriram Credit LAMF AI Assistant · answers from FAQs, Voicebot KB, and Program Document',
  suggestions: [
    { title: 'What is LAMF?', desc: 'What is a Loan Against Mutual Funds and how does it work?' },
    {
      title: 'Eligibility',
      desc: 'What is the minimum mutual fund holding needed for a LAMF loan?',
    },
    { title: 'Pledging', desc: 'Do I need to sell my mutual funds to take a LAMF loan?' },
    { title: 'Loan Amount', desc: 'How is the loan amount calculated against mutual fund units?' },
    {
      title: 'Interest & Charges',
      desc: 'How is the LAMF interest rate calculated using risk-based pricing?',
    },
    { title: 'Disbursement', desc: 'How does LAMF disbursement and withdrawal work?' },
    {
      title: 'Repayment',
      desc: 'What is the 12-month balloon repayment tenure for LAMF?',
    },
    {
      title: 'Application Process',
      desc: 'How does digital validation work — PAN, DigiLocker, and bank account verification?',
    },
  ],
};

export function getCompanyConfig() {
  return APP_CONFIG;
}
