export const APP_CONFIG = {
  title: 'Shriram Credit LAMF AI Assistant',
  welcome:
    "Hello! I'm the Shriram Credit LAMF AI Assistant. I answer your questions about Loan Against Mutual Funds — eligibility, process, disbursement, interest, pledging, and FAQs.",
  placeholder: 'Ask your LAMF question — eligibility, process, rates, disbursement...',
  hint: 'Shriram Credit LAMF AI Assistant · answers from FAQs, Voicebot KB, and Program Document',
  suggestions: [
    { title: 'What is LAMF?', desc: 'What is a Loan Against Mutual Funds and how does it work?' },
    { title: 'Eligibility', desc: 'Who is eligible for a LAMF loan and what mutual funds qualify?' },
    { title: 'Pledging', desc: 'Do I need to sell my mutual funds to take a LAMF loan?' },
    { title: 'Loan Amount', desc: 'How is the loan amount calculated against mutual fund units?' },
    { title: 'Interest & Charges', desc: 'What are the interest rates and charges for LAMF?' },
    { title: 'Disbursement', desc: 'How does LAMF disbursement and withdrawal work?' },
    { title: 'Repayment', desc: 'What are the repayment options for a LAMF loan?' },
    { title: 'Application Process', desc: 'What is the step-by-step LAMF application process?' },
    { title: 'Voicebot Scripts', desc: 'What should the voicebot say about offer and eligibility?' },
    { title: 'Program Rules', desc: 'What are the key rules in the LAMF program document?' },
  ],
};

export function getCompanyConfig() {
  return APP_CONFIG;
}
