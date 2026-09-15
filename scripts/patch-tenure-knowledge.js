import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const TENURE_12_ONLY =
  'Loan Tenure 12 months only. At launch, the repayment tenure is fixed at 12 months.';

/** Limit indexed knowledge to 12-month repayment tenure at launch. */
export function patchTenureInText(text) {
  let next = text;

  const replacements = [
    [
      'Minimum Loan Tenure 6 months Maximum Loan Tenure 36 months (customer selects 6, 12, 18, or 24, 30, 36 months)',
      TENURE_12_ONLY,
    ],
    [
      'Customer selects tenure (6, 12, 18, 24, 30, 36 months). At launch, repayment is balloon (interest-only monthly payments; principal at end of tenure) only. The repayment type selected at sanction applies to all withdrawals under the limit',
      'Loan tenure is 12 months only at launch. Repayment is balloon (interest-only monthly payments; principal at end of tenure). The repayment type selected at sanction applies to all withdrawals under the limit',
    ],
    [
      'Customer selects tenure (6, 12, 18, 24, 30, 36 months) and repayment type (EMI or Balloon). Repayment type selected applies to all withdrawals under the limit',
      'Loan tenure is 12 months only at launch. Repayment is balloon (interest-only monthly payments; principal at end of tenure). The repayment type selected at sanction applies to all withdrawals under the limit',
    ],
    [
      '2.4 Customer selects tenure (6, 12, 18, 24, 30, 36 months). At launch, repayment is balloon (interest-only monthly payments; principal at end of tenure) only. The repayment type selected at sanction applies to all withdrawals under the limit',
      '2.4 Loan tenure is 12 months only at launch. Repayment is balloon (interest-only monthly payments; principal at end of tenure). The repayment type selected at sanction applies to all withdrawals under the limit',
    ],
    [
      'Then choose the loan period. At launch, repayment is balloon (interest-only) only.',
      'The loan tenure is 12 months at launch. Repayment is balloon (interest-only) only.',
    ],
    [
      'ranges from a minimum of 6 months to a maximum of 36 months',
      'is 12 months at launch',
    ],
    [
      '6, 12, 18, 24, 30, or 36 months',
      '12 months only',
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
        const patched = patchTenureInText(chunk.text);
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
  console.log('Tenure knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
