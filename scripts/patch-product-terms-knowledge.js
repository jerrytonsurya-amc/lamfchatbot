import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const NACH_AMOUNT = '2 times the sanctioned amount or Rs. 1 crore, whichever is higher';

/** Bounce Rs. 100 + GST on each presentation, penal charges, NACH, eligibility/KYC, LOS config, renewal charge. */
export function patchProductTermsInText(text) {
  let next = text;

  const replacements = [
    [
      'No charge if first presentation (1.a) bounces but second presentation at T+5 (1.b) is realised. Charge applied only if second presentation (1.b) also bounces.',
      'Charged on each bounce, at both the first presentation (1.a) and the second presentation at T+5 (1.b).',
    ],
    [
      'Bounce charge of Rs. 1,000 plus applicable GST is applied only if the second presentation (1.b) also bounces. No charge is applied if the first presentation bounces but the second presentation at T+5 is realised.',
      'Bounce charge of Rs. 100 plus applicable GST is applied on each bounce, at both the first presentation (1.a) and the second presentation (1.b).',
    ],
    [
      'Bounce Charges Rs. 1,000 plus GST per qualifying bounce Applicable on second presentation bounce only.',
      'Bounce Charges Rs. 100 plus GST per bounce Applicable on both the first and second presentation bounce.',
    ],
    [
      'Bounce Charges Rs. 1,000 plus applicable GST per qualifying bounce Applied only when second NACH presentation (T+5) also bounces. No charge if first bounce and second presentation realised.',
      'Bounce Charges Rs. 100 plus applicable GST per bounce Applied on both the presentations (first presentation and second presentation at T+5).',
    ],
    ['Bounce Charges Rs. 1,000 plus applicable GST', 'Bounce Charges Rs. 100 plus applicable GST'],
    ['Bounce charge of Rs. 1,000 plus applicable GST', 'Bounce charge of Rs. 100 plus applicable GST'],
    ['Bounce Charges Rs. 1,000 plus GST', 'Bounce Charges Rs. 100 plus GST'],
    ['Bounce charge of 1000 + GST per bounce', 'Bounce charge of Rs. 100 + GST per bounce'],

    ['Penal Charges 36% per annum on overdue interest (ODI)', 'Penal Charges 36% per annum on unpaid interest'],

    ['Disbursement Type Single or Multiple Disbursement with Charges', 'Disbursement Type Single or Multiple Disbursement'],
    ['Digio NACH Auto-Debit Automated monthly debit', 'NACH Auto-Debit Automated monthly debit'],

    [
      'NACH Registration Amount 2 times the sanctioned amount NACH Registration Period Actual sanctioned tenure plus 12 months',
      `NACH Registration Amount ${NACH_AMOUNT} NACH Registration Period Entire tenure`,
    ],
    [
      'Amount = 2x sanctioned amount. Period = tenure + 12 months.',
      'Amount = 2x sanctioned amount or Rs. 1 crore, whichever is higher. Period = Entire tenure.',
    ],
    [
      'NACH registration amount = 2x sanctioned amount. NACH registration period = actual sanctioned tenure + 12 months.',
      'NACH registration amount = 2x sanctioned amount or Rs. 1 crore, whichever is higher. NACH registration period = entire tenure.',
    ],
    [
      'Mandate amount = 2x sanctioned amount.',
      'Mandate amount = 2x sanctioned amount or Rs. 1 crore, whichever is higher.',
    ],
    [
      'The maximum mandate amount is set at twice the sanctioned amount.',
      'The maximum mandate amount is set at twice the sanctioned amount or Rs. 1 crore, whichever is higher.',
    ],

    [
      "PAN validated via Digio/NSDL API (status code 'E' required).",
      "PAN validated via PAN verification service API (status code 'E' required).",
    ],
    [
      'KYC Aadhaar OTP-based eKYC via Digio (Digilocker API) mandatory at onboarding.',
      'KYC Aadhaar OTP-based eKYC via Digilocker API and CKYC.',
    ],
    [
      "Bank Account Active savings account in borrower's name. Verified via Digio/Cashfree penny drop. Name match >= 60% required across PAN, Aadhaar, and bank account.",
      'Bank Account Bank account is validated through penny drop.',
    ],
    [
      'Bureau Credit Score Validity Bureau report valid and reused for T+15 days from trigger date.',
      'Bureau Credit Score Validity Bureau report valid and reused for T+7 days from trigger date.',
    ],

    ['KYC Component Method / Provider Validation Logic', 'KYC Component Method Validation Logic'],
    ['PAN Verification NSDL/Digio PAN API (POST, HTTPS)', 'PAN Verification PAN API (POST, HTTPS)'],
    [
      'eKYC: Identity and Address Digio via Digilocker API (Aadhaar OTP)',
      'eKYC: Identity and Address Digilocker API (Aadhaar OTP)',
    ],
    ['Bureau / Credit Check Experian API', 'Bureau / Credit Check API'],
    ['Bank Account Verification Digio/Cashfree penny drop', 'Bank Account Verification Penny Drop'],
    ['eNACH / eMandate Digio: NPCI NACH', 'eNACH / eMandate NPCI NACH'],

    [
      'Minimum Bureau Score No minimum Bureau score LTV Grid',
      'Minimum Bureau Score No minimum Bureau score. Applicable only for Dynamic pricing LTV Grid',
    ],
    [
      'LTV Grid Debt funds: 75%. Equity fund: 45%. ELSS outside lock-in: 45%. Configurable.',
      'LTV Grid Debt funds: 75%. Equity fund: 45%.',
    ],
    [
      'Cooling-Off Closure Nil No interest, no closure charges. Upfront charges already collected are not refunded.',
      'Cooling-Off Closure Nil No interest, no closure charges. Upfront charges already collected are not refunded. Annual Renewal Charges Rs. 999 Charged in case the user opts to renew the loan.',
    ],
  ];

  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }

  return next;
}

function patchJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let changed = false;

  const patchChunks = (chunks) => {
    if (!Array.isArray(chunks)) return;
    for (const chunk of chunks) {
      if (chunk.text) {
        const patched = patchProductTermsInText(chunk.text);
        if (patched !== chunk.text) {
          chunk.text = patched;
          changed = true;
        }
      }
    }
  };

  if (Array.isArray(data.chunks)) {
    patchChunks(data.chunks);
  } else if (Array.isArray(data)) {
    for (const doc of data) {
      patchChunks(doc.chunks);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`Patched ${filePath}`);
  }

  return changed;
}

function walkAndPatch(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndPatch(full);
    } else if (entry.name.endsWith('.json')) {
      patchJsonFile(full);
    }
  }
}

function patchAllKnowledgeFiles() {
  patchJsonFile(path.join(ROOT, 'data', 'knowledge-index.json'));
  walkAndPatch(path.join(ROOT, 'data', 'catalogs'));
  patchJsonFile(path.join(ROOT, 'data', 'catalogs', 'lamf.json'));
  console.log('Product terms knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
