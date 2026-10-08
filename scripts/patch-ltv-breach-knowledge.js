import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Remove T+5 / 5-working-day cure wording from LTV breach and invocation (not NACH bounce T+5). */
export function patchLtvBreachInText(text) {
  let next = text;

  const replacements = [
    [
      'uncured LTV breach (Customer has not paid the breach amount in t+5 working days)',
      'uncured LTV breach',
    ],
    [
      'uncured LTV breach (Customer has not paid the breach amount in T+5 working days)',
      'uncured LTV breach',
    ],
    ['LTV breach is uncured for more than 5 working days from the day of breach', 'LTV breach is uncured'],
    [
      'LTV breach is uncured for more than 5 working days from the day of the breach',
      'LTV breach is uncured',
    ],
    [
      'an LTV breach is not cured for more than 5 working days from the day of the breach',
      'an LTV breach is not regularised',
    ],
    [
      'if an LTV breach has not been regularised within T+5 working days',
      'if an LTV breach has not been regularised immediately',
    ],
    [
      'If the required amount is not regularised within the applicable timeline, your pledged units may be eligible for invocation as per the applicable terms and conditions.',
      'If the required amount is not regularised immediately, your pledged units may be eligible for invocation as per the applicable terms and conditions.',
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
        const patched = patchLtvBreachInText(chunk.text);
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
  console.log('LTV breach knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
