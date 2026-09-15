import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Update processing fee minimum and separate charge treatment. */
export function patchProcessingFeesInText(text) {
  let next = text;

  const replacements = [
    [
      'Processing Fees* (Includes Stamp duty, Lien marking & Lien Removal charges)',
      'Processing Fees* (exclusive of stamp duty, lien marking, and lien removal charges)',
    ],
    [
      'Processing Fees (Includes Stamp duty, Lien marking & Lien Removal charges)',
      'Processing Fees (exclusive of stamp duty, lien marking, and lien removal charges)',
    ],
    [
      'Maximum 1% of Sanctioned Limit or 1500 whichever is higher',
      'Maximum 1% of Sanctioned Limit or Rs. 999 plus applicable GST, whichever is higher',
    ],
    [
      'Maximum 1% of Sanctioned Limit or 1500 whichev',
      'Maximum 1% of Sanctioned Limit or Rs. 999 plus applicable GST, whichev',
    ],
    [
      'Stamp Duty Rs. 200 plus applicable GST; e-stamped via DIGIO; Part of processing fee',
      'Stamp Duty Rs. 200 plus applicable GST; e-stamped via DIGIO; exclusive of processing fee',
    ],
    [
      'Lien Marking Charges Rs. 450 plus applicable GST; Part of processing fee',
      'Lien Marking Charges Rs. 450 plus GST; exclusive of processing fee',
    ],
    [
      'Lien Release / Removal Charges Rs. 100 plus applicable GST; Part of processing fee',
      'Lien Release / Removal Charges Rs. 100 plus GST; exclusive of processing fee',
    ],
    [
      'Lien Marking Charges Rs. 450 plus GST Included in processing fee Lien Release Charges Rs. 100 plus GST Included in processing fee',
      'Lien Marking Charges Rs. 450 plus GST; exclusive of processing fee. Lien Release Charges Rs. 100 plus GST; exclusive of processing fee',
    ],
    [
      'non-refundable and includes costs for stamp duty, lien marking, and lien removal charges',
      'non-refundable. Stamp duty, lien marking charges of Rs. 450 plus GST, and lien release charges of Rs. 100 plus GST are exclusive of the processing fee',
    ],
    [
      'includes costs for stamp duty, lien marking, and lien removal charges',
      'Stamp duty, lien marking charges of Rs. 450 plus GST, and lien release charges of Rs. 100 plus GST are exclusive of the processing fee',
    ],
    [
      'includes stamp duty, lien marking, and lien removal charges',
      'Stamp duty, lien marking charges of Rs. 450 plus GST, and lien release charges of Rs. 100 plus GST are exclusive of the processing fee',
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
