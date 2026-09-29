import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const MIN_HOLDING_TEXT =
  'The minimum mutual fund holding required is between Rs. 22,000 and Rs. 16,000 depending on whether eligible funds are equity (approximately Rs. 22,000) or debt (approximately Rs. 16,000) mutual funds, based on applicable LTV (45% for equity, 75% for debt) and the minimum loan amount of Rs. 10,000.';

/** Add minimum MF holding guidance to indexed knowledge. */
export function patchMinimumHoldingInText(text) {
  let next = text;

  const replacements = [
    [
      "The minimum eligible portfolio value is as defined in SCCL's current credit policy.",
      MIN_HOLDING_TEXT,
    ],
    [
      'Who can apply for this loan? You can apply if you hold mutual fund units that qualify for this loan, and you meet our standard borrower checks, such as KYC verification.',
      'Who can apply for this loan? You can apply if you hold eligible mutual fund units that qualify for this loan (minimum holding typically Rs. 22,000 for equity or Rs. 16,000 for debt funds, depending on fund type), and you meet our standard borrower checks, such as KYC verification.',
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
        const patched = patchMinimumHoldingInText(chunk.text);
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
  console.log('Minimum holding knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
