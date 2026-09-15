import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Additional pledge is not available at launch. */
export function patchAdditionalPledgeInText(text) {
  let next = text;

  const replacements = [
    [
      'If your mutual fund value falls, you may need to pledge more units or repay part of the loan to stay within the allowed limit.',
      'If your mutual fund value falls, you may need to repay part of the loan to stay within the allowed limit. Additional pledge is not available right now.',
    ],
    [
      'Three cure options available: (a) pledge additional eligible MF units via MF Central; (b) make partial repayment to reduce loan outstanding; (c) consent to partial liquidation of pledged collateral.',
      'Cure options available: (a) additional pledge is not available right now; (b) make partial repayment to reduce loan outstanding; (c) consent to partial liquidation of pledged collateral, as applicable.',
    ],
    [
      'Can I change the pledged mutual funds later? Any change will depend on the approved process and your account status. Please use the official support channel for help.',
      'Can I change the pledged mutual funds or add an additional pledge later? Additional pledge is not available right now. Please use the official Shriram Credit support channel for other account queries.',
    ],
    [
      'Margin Call Automated notification to borrower to cure LTV breach by pledging more, repaying, or consenting to liquidation.',
      'Margin Call Automated notification to borrower to cure LTV breach by repaying or consenting to liquidation. Additional pledge is not available right now.',
    ],
    [
      '* Require additional collateral or initiate liquidation if non-compliant.',
      '* Partial repayment or liquidation if non-compliant. Additional pledge is not available right now.',
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
        const patched = patchAdditionalPledgeInText(chunk.text);
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
  console.log('Additional pledge knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
