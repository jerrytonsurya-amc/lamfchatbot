import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Dynamic pricing (9.5%–15% p.a.) with a fixed 10.5% p.a. rate at launch. */
export function patchPricingInText(text) {
  let next = text;

  next = next.replace(
    /Interest Rate (?:Risk-based|Dynamic) pricing in range 9\.5%–15% per annum(?! Interest Rate \(Launch\))/g,
    'Interest Rate Dynamic pricing in range 9.5%–15% per annum Interest Rate (Launch) Fixed – 10.5% per annum'
  );
  next = next.replace(
    /Rate once sanctioned is fixed for the loan tenure and is not revised mid-tenure\.(?! At launch)/g,
    'Rate once sanctioned is fixed for the loan tenure and is not revised mid-tenure. At launch, a fixed interest rate of 10.5% per annum applies.'
  );

  const replacements = [
    ['* Risk-based pricing Processing fee', '* Dynamic pricing Processing fee'],
    [
      'SCCL is offering a risk-based pricing model for LAMF. Under risk-based pricing, the applicable interest rate',
      'SCCL is offering a dynamic pricing model for LAMF. Under the dynamic model, the applicable interest rate',
    ],
    [
      'SCCL uses a risk-based pricing model for LAMF. Under risk-based pricing, the applicable interest rate will fall within the range of 9.5% to 15% per annum, determined at origination based on the following risk parameters:',
      'SCCL is offering a dynamic pricing model for LAMF. Under the dynamic model, the applicable interest rate will fall within the range of 9.5% to 15% per annum, determined at origination based on the following three parameters:',
    ],
    [
      'Bureau score will be considered for Risk-based pricing – Refer Risk-based pricing policy document',
      'Bureau score will be considered for Dynamic pricing – Refer Dynamic pricing policy document',
    ],
    [
      'Under risk-based pricing, the spread may vary for lower-quality or higher-risk borrower profiles.',
      'As dynamic pricing is activated, the spread is expected to widen for lower-quality or higher-risk borrower profiles.',
    ],
    ['risk-based pricing', 'dynamic pricing'],
    ['Risk-based pricing', 'Dynamic pricing'],
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
