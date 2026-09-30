import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Tiered processing fee (min Rs. 999 + GST); stamp duty and lien charges are levied separately. */
export function patchProcessingFeesInText(text) {
  let next = text;

  const replacements = [
    ['Processing Fees* (Includes Stamp duty, Lien marking & Lien Removal charges) ', 'Processing Fees '],
    ['Processing Fees (Includes Stamp duty, Lien marking & Lien Removal charges) ', 'Processing Fees '],
    ['Customer Support lassupport@shriramcredit.in * Dynamic pricing Processing fee ', 'Customer Support lassupport@shriramcredit.in '],
    ['e-stamped via DIGIO; Part of processing fee Lien Marking', 'e-stamped via DIGIO; Lien Marking'],
    ['Rs. 100 plus applicable GST; Part of processing fee ; Also applicable', 'Rs. 100 plus applicable GST; Also applicable'],
    [
      'Lien Marking Charges Rs. 450 plus GST Included in processing fee Lien Release Charges Rs. 100 plus GST Included in processing fee. In case of partial release, or invoke collected/adjusted at the backend ',
      '',
    ],
    ['Digio eStamping and eSign Fee Rs. 10 per agreement (Digio DDE service fee) Digio per-agreement fee', 'eStamping and eSign Fee Rs. 10 per agreement (Digio DDE service fee) per-agreement fee'],
    ['computed by state and loan amount; deducted upfront via Digio.', 'computed by state and loan amount; deducted upfront.'],
    [
      'Maximum 1% of Sanctioned Limit or 1500 whichever is higher',
      'Maximum 1% of Sanctioned Limit or Rs. 999 plus applicable GST, whichever is higher',
    ],
    [
      'Maximum 1% of Sanctioned Limit or 1500 whichev',
      'Maximum 1% of Sanctioned Limit or Rs. 999 plus applicable GST, whichev',
    ],
    [
      'Lien Marking Charges Rs. 450 plus applicable GST; Part of processing fee Lien Release',
      'Lien Marking Charges Rs. 450 plus applicable GST; Lien Release',
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
        const patched = patchProcessingFeesInText(chunk.text);
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
  console.log('Processing fee knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
