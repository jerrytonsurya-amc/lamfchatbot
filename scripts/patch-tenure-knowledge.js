import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Minimum and maximum loan tenure are both 12 months. */
export function patchTenureInText(text) {
  let next = text;

  const replacements = [
    [
      'Minimum Loan Tenure 6 months Maximum Loan Tenure 36 months (customer selects 6, 12, 18, or 24, 30, 36 months)',
      'Minimum Loan Tenure 12 months Maximum Loan Tenure 12 months',
    ],
    [
      'Customer selects tenure (6, 12, 18, 24, 30, 36 months) and repayment type (EMI or Balloon).',
      'Loan tenure is 12 months. Repayment type is Balloon (currently the only repayment type offered).',
    ],
    [
      'Then choose the loan period and repayment option.',
      'The loan tenure is 12 months, with Balloon repayment (monthly interest, principal at the end of the tenure).',
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
