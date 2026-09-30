import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Pre-closure charges are Nil at any time; part payments are not charged. */
export function patchForeclosureInText(text) {
  let next = text;

  const replacements = [
    [
      'Pre-closure Charges 3% of outstanding principal if pre-closed within 3 months of first withdrawal date. Nil after 3 months',
      'Pre-closure Charges Nil',
    ],
    [
      'Pre-closure Charges 3% on principal outstanding if pre-closed within 3 months from first withdrawal date. Nil after 3 months.',
      'Pre-closure Charges Nil.',
    ],
    [
      'Pre-closure Charges 3% of outstanding principal Applicable only within 3 months of first withdrawal date. Nil thereafter.',
      'Pre-closure Charges Nil No charges',
    ],
    [
      'Pre-closure within 3 months (3% charge applicable)',
      'Pre-closure within 3 months (no charges)',
    ],
    [
      'Closure Type Condition Charges Process Pre-closure (within 3 months) Pre-closed within 3 months from first withdrawal date. 3% of outstanding principal at time of pre-closure. Charge applied and collected. Pledge released proportionally or in full.',
      'Closure Type Condition Charges Process Pre-closure (within 3 months) Pre-closed within 3 months from first withdrawal date. Nil. No charges. Pledge released. Account closed.',
    ],
    [
      'Part Payment Partial repayment of principal before maturity. 3% on future principal paid if within 3 months. Nil after 3 months. EMI reduction applied. Tenure unchanged. Updated RPS generated and sent to customer via email. ',
      '',
    ],
    [
      'Part payment within 3 months from first withdrawal date attracts 3% charge on future principal outstanding paid. Charges not applicable after 3 months.',
      'No charges apply on part payment.',
    ],
    [
      '3% charge on future principal paid if within 3 months from first withdrawal.',
      'No charges apply on part payment.',
    ],
    [
      'Part payment & Pre-closure without charge within 3 months 3% charge within 3 months. Business Head Case-by-case documented. ',
      '',
    ],
    [
      'Can I repay the loan early? Early repayment may be allowed as per the loan terms. Please check the agreement for any process or charges.',
      'Can I repay the loan early? Yes. You can pre-close the loan at any time and there are no pre-closure charges. Please check your KFS and loan agreement.',
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
        const patched = patchForeclosureInText(chunk.text);
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
  console.log('Foreclosure knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
