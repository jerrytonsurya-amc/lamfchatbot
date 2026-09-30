import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Balloon-only repayment (currently), balloon day count 365, gap-day interest in first and last instalments. */
export function patchRepaymentInText(text) {
  let next = text;

  const replacements = [
    [
      'Repayment Types EMI (Equated Monthly Instalment) or Balloon. Selected at sanction; applies to all withdrawals under the limit',
      'Repayment Types Balloon',
    ],
    [
      'Day Count Convention EMI repayment: Actual / 365. Balloon repayment (Interest serving): 30 / 360',
      'Day Count Convention Balloon repayment (Interest serving): 365',
    ],
    ['EMI: Actual / 365. Balloon: 30 / 360.', 'Balloon: 365.'],
    [
      'The selected repayment type applies to all withdrawals under the limit and cannot be changed mid-tenure.',
      'The selected repayment type applies to all withdrawals under the limit and cannot be changed mid-tenure. Currently we have only balloon repayment.',
    ],
    [
      'EMI or Balloon: both operating within the Sanctioned Limit structure.',
      'EMI or Balloon: both operating within the Sanctioned Limit structure. Currently only Balloon repayment is offered.',
    ],
    ['Day count: 30/360.', 'Day count: 365.'],
    ['Gap Day Interest Collected during first instalment', 'Gap Day Interest Collected during the first and last instalments'],
    [
      'Interest for the period between disbursement date and first instalment due date. Collected in first instalment.',
      'Interest for the period between disbursement date and first instalment due date. Collected during the first and last instalments.',
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
