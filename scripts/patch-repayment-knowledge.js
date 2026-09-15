import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Align customer-facing repayment text with balloon-only launch offering. */
export function patchRepaymentInText(text) {
  let next = text;

  const replacements = [
    [
      'It may include EMI or interest payments, depending on your loan terms.',
      'You pay monthly interest only during the loan tenure. The principal is repaid at the end of the tenure (balloon repayment).',
    ],
    [
      'What is an EMI? EMI is the fixed amount payable every month towards the loan, as per the repayment schedule.',
      'What is balloon repayment? You pay interest only each month during the loan period. The full principal is due at the end of the agreed tenure.',
    ],
    [
      'lets us auto-debit your EMI or interest payments from your bank account',
      'lets us auto-debit your monthly interest payments from your bank account',
    ],
    [
      'Repayment Types EMI (Equated Monthly Instalment) or Balloon. Selected at sanction; applies to all withdrawals under the limit',
      'Repayment Type Balloon (interest-only monthly payments; principal at end of tenure). At launch, balloon is the available repayment option. Selected at sanction; applies to all withdrawals under the limit',
    ],
    [
      'Customer selects tenure (6, 12, 18, 24, 30, 36 months) and repayment type (EMI or Balloon). Repayment type selected applies to all withdrawals under the limit',
      'Loan tenure is 12 months only at launch. Repayment is balloon (interest-only monthly payments; principal at end of tenure). The repayment type selected at sanction applies to all withdrawals under the limit',
    ],
    [
      'one of two configurations (EMI or Balloon) set at the time of sanction',
      'balloon repayment (interest-only monthly payments; principal at end of tenure) set at the time of sanction. At launch, balloon is the available repayment option',
    ],
    [
      'EMI or Balloon: both operating within the Sanctioned Limit',
      'Balloon repayment (interest-only; principal at end of tenure) operating within the Sanctioned Limit. At launch, balloon is the available repayment option',
    ],
    [
      'This mandate supports automated EMI or interest payments.',
      'This mandate supports automated monthly interest payments under balloon repayment.',
    ],
    [
      'The e-Mandate allows your EMI or interest payment to be collected automatically',
      'The e-Mandate allows your monthly interest payment to be collected automatically',
    ],
    [
      'It is needed to collect your EMI or interest automatically after you use the loan facility.',
      'It is needed to collect your monthly interest automatically under balloon repayment after you use the loan facility.',
    ],
    [
      'Then choose the loan period and repayment option.',
      'Then choose the loan period. At launch, repayment is balloon (interest-only) only.',
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
        const patched = patchRepaymentInText(chunk.text);
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
  console.log('Repayment knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
