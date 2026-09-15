import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Replace dynamic pricing references with risk-based pricing. */
export function patchPricingInText(text) {
  let next = text;

  const replacements = [
    ['Interest Rate Dynamic pricing in range 9.5%–15% per annum', 'Interest Rate Risk-based pricing in range 9.5%–15% per annum'],
    ['Interest Rate Dynamic pricing in range 9.5% to 15% per annum', 'Interest Rate Risk-based pricing in range 9.5% to 15% per annum'],
    ['* Dynamic pricing Processing fee', '* Risk-based pricing Processing fee'],
    [
      'SCCL is offering a dynamic pricing model for LAMF. Under the dynamic model, the applicable interest rate will fall within the range of 9.5% to 15% per annum, determined at origination based on the following three parameters:',
      'SCCL uses a risk-based pricing model for LAMF. Under risk-based pricing, the applicable interest rate will fall within the range of 9.5% to 15% per annum, determined at origination based on the following risk parameters:',
    ],
    [
      'Bureau score will be considered for Dynamic pricing – Refer Dynamic pricing policy document',
      'Bureau score will be considered for risk-based pricing – Refer risk-based pricing policy document',
    ],
    [
      'As dynamic pricing is activated, the spread is expected to widen for lower-quality or higher-risk borrower profiles.',
      'Under risk-based pricing, the spread may vary for lower-quality or higher-risk borrower profiles.',
    ],
    ['dynamic pricing model', 'risk-based pricing model'],
    ['Dynamic pricing model', 'Risk-based pricing model'],
    ['dynamic pricing', 'risk-based pricing'],
    ['Dynamic pricing', 'Risk-based pricing'],
    ['Under the dynamic model', 'Under risk-based pricing'],
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
        const patched = patchPricingInText(chunk.text);
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
  console.log('Pricing knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
