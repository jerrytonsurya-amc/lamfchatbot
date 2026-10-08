import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Remove Risk Comfort and Derived Risk Comfort metrics from indexed text (customer-facing KB). */
export function patchRemoveRiskComfortInText(text) {
  let next = text;

  const replacements = [
    [
      'Risk Comfort % (Total Loan Outstanding / Latest Collateral Value) x 100. Derived Risk Comfort % (Qualified Loan Amount / Total Loan Outstanding) x 100. Buckets: < 90%, 85–90%, 80–85%, 75–80%, < 75%. ',
      '',
    ],
    ['11.2 Risk Comfort Metrics PAGEREF _Toc233400847 \\h 19 ', ''],
    ['LTV, Drawing Power, Risk Comfort, margin call', 'LTV, Drawing Power, margin call'],
    [
      '11.2 Risk Comfort Metrics SCCL tracks the following collateral coverage metrics in LMS for each active LAMF account: Risk Comfort % = (Total Loan Outstanding / Latest Collateral Value) x 100. Measures current exposure against market value of pledged collateral. Qualified Loan Amount = Sum of (LTV x Current Market Value) across all lien-marked schemes. Equity: 45%. Debt: 75%. Derived Risk Comfort % = (Qualified Loan Amount / Total Loan Outstanding) x 100. Amount of Breach = Total Loan Outstanding Minus Qualified Loan Amount. Displayed as 0 if positive (no breach). Displayed as absolute value if negative (breach exists). Days Past Breach Count begins from the date Risk Comfort Breach is first set to \'Yes\'. Resets if breach is cured and then reoccurs. Derived Risk Comfort % is monitored across five buckets in LMS: below 90%; 85%–90%; 80%–85%; 75%–80%; below 75%. Accounts in the below 75% bucket require immediate review and margin call action. ',
      '',
    ],
    [
      'When the Risk Comfort breach flag is set to \'Yes\' (Amount of Breach is negative)',
      'When an LTV breach is identified (Amount of Breach is negative)',
    ],
    [
      '* Invocation will be triggered at Derived Risk Comfort of 75%. *',
      '* Invocation may be triggered on uncured LTV breach. *',
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
        const patched = patchRemoveRiskComfortInText(chunk.text);
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
  console.log('Risk comfort removal patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
