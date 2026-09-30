import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const EQUITY_LTV = '45%';
const DEBT_LTV = '75%';

/** Update LTV caps in indexed knowledge text (equity 45%, debt 75%). */
export function patchLtvInText(text) {
  let next = text;

  const legacyFromDocx = [
    ['LTV: Equity MF Units 70% of current market value', `LTV: Equity MF Units ${EQUITY_LTV} of current market value`],
    ['LTV: Debt MF Units 80% of current market value', `LTV: Debt MF Units ${DEBT_LTV} of current market value`],
    ['on SCCL ASL Up to 70% Eligible Debt', `on SCCL ASL Up to ${EQUITY_LTV} Eligible Debt`],
    ['on SCCL ASL Up to 80% Ineligible ELSS', `on SCCL ASL Up to ${DEBT_LTV} Ineligible ELSS`],
    ['Debt funds: 80% LTV. All other fund types (equity): 70% LTV', `Debt funds: ${DEBT_LTV} LTV. All other fund types (equity): ${EQUITY_LTV} LTV`],
    ['All other fund types (equity): 70% LTV', `All other fund types (equity): ${EQUITY_LTV} LTV`],
    ['fund types (equity): 70% LTV', `fund types (equity): ${EQUITY_LTV} LTV`],
    ['(equity): 70% LTV', `(equity): ${EQUITY_LTV} LTV`],
    ['Debt funds: 80% LTV', `Debt funds: ${DEBT_LTV} LTV`],
    ['LTV Grid Debt funds: 80%. Equity fund: 70%.', `LTV Grid Debt funds: ${DEBT_LTV}. Equity fund: ${EQUITY_LTV}.`],
    ['Equity fund: 70%. ELSS outside lock-in:', `Equity fund: ${EQUITY_LTV}. ELSS outside lock-in:`],
    ['equity (70%) and debt (80%) schemes', `equity (${EQUITY_LTV}) and debt (${DEBT_LTV}) schemes`],
    [
      'Loan LTV Cap (lending limit) 70% of collateral market value 80% of collateral market value',
      `Loan LTV Cap (lending limit) ${EQUITY_LTV} of collateral market value ${DEBT_LTV} of collateral market value`,
    ],
    ['Maintain LTV limits: 65% for equity, 80% for debt', `Maintain LTV limits: ${EQUITY_LTV} for equity, ${DEBT_LTV} for debt`],
    ['SCCL: 65% equity, 80% debt', `SCCL: ${EQUITY_LTV} equity, ${DEBT_LTV} debt`],
    [
      'Portfolio LTV Utilisation: Equity Average LTV across accounts with equity collateral. 70% LTV Portfolio LTV Utilisation: Debt Average LTV across accounts with debt collateral. 80% LTV',
      `Portfolio LTV Utilisation: Equity Average LTV across accounts with equity collateral. ${EQUITY_LTV} LTV Portfolio LTV Utilisation: Debt Average LTV across accounts with debt collateral. ${DEBT_LTV} LTV`,
    ],
  ];

  const from65Equity = [
    ['LTV: Equity MF Units 65% of current market value', `LTV: Equity MF Units ${EQUITY_LTV} of current market value`],
    ['on SCCL ASL Up to 65% Eligible Debt', `on SCCL ASL Up to ${EQUITY_LTV} Eligible Debt`],
    ['Debt funds: 75% LTV. All other fund types (equity): 65% LTV', `Debt funds: ${DEBT_LTV} LTV. All other fund types (equity): ${EQUITY_LTV} LTV`],
    ['All other fund types (equity): 65% LTV', `All other fund types (equity): ${EQUITY_LTV} LTV`],
    ['fund types (equity): 65% LTV', `fund types (equity): ${EQUITY_LTV} LTV`],
    ['(equity): 65% LTV', `(equity): ${EQUITY_LTV} LTV`],
    ['LTV Grid Debt funds: 75%. Equity fund: 65%.', `LTV Grid Debt funds: ${DEBT_LTV}. Equity fund: ${EQUITY_LTV}.`],
    ['Equity fund: 65%. ELSS outside lock-in: 65%.', `Equity fund: ${EQUITY_LTV}. ELSS outside lock-in: ${EQUITY_LTV}.`],
    ['ELSS outside lock-in: 65%.', `ELSS outside lock-in: ${EQUITY_LTV}.`],
    ['Equity fund: 45%. ELSS outside lock-in: 65%.', `Equity fund: ${EQUITY_LTV}. ELSS outside lock-in: ${EQUITY_LTV}.`],
    ['equity (65%) and debt (75%) schemes', `equity (${EQUITY_LTV}) and debt (${DEBT_LTV}) schemes`],
    [
      'Loan LTV Cap (lending limit) 65% of collateral market value 75% of collateral market value',
      `Loan LTV Cap (lending limit) ${EQUITY_LTV} of collateral market value ${DEBT_LTV} of collateral market value`,
    ],
    ['Maintain LTV limits: 65% for equity, 75% for debt', `Maintain LTV limits: ${EQUITY_LTV} for equity, ${DEBT_LTV} for debt`],
    ['SCCL: 65% equity, 75% debt', `SCCL: ${EQUITY_LTV} equity, ${DEBT_LTV} debt`],
    [
      'Portfolio LTV Utilisation: Equity Average LTV across accounts with equity collateral. 65% LTV Portfolio LTV Utilisation: Debt Average LTV across accounts with debt collateral. 75% LTV',
      `Portfolio LTV Utilisation: Equity Average LTV across accounts with equity collateral. ${EQUITY_LTV} LTV Portfolio LTV Utilisation: Debt Average LTV across accounts with debt collateral. ${DEBT_LTV} LTV`,
    ],
    ['Equity: 65% LTV. Debt: 75% LTV.', `Equity: ${EQUITY_LTV} LTV. Debt: ${DEBT_LTV} LTV.`],
    ['Equity: 65%. Debt: 75%.', `Equity: ${EQUITY_LTV}. Debt: ${DEBT_LTV}.`],
    ['Equity: 65%.', `Equity: ${EQUITY_LTV}.`],
    ['Equity: 65%', `Equity: ${EQUITY_LTV}`],
    ['65% for equity', `${EQUITY_LTV} for equity`],
    ['65% equity', `${EQUITY_LTV} equity`],
    ['70% for equity', `${EQUITY_LTV} for equity`],
    ['70% equity', `${EQUITY_LTV} equity`],
  ];

  for (const [from, to] of [...legacyFromDocx, ...from65Equity]) {
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
        const patched = patchLtvInText(chunk.text);
        if (patched !== chunk.text) {
          chunk.text = patched;
          changed = true;
        }
      }
    }
  };

  if (Array.isArray(data)) {
    for (const doc of data) {
      patchChunks(doc.chunks);
    }
  } else if (Array.isArray(data.chunks)) {
    patchChunks(data.chunks);
  } else if (Array.isArray(data)) {
    for (const chunk of data) {
      if (chunk.text) {
        const patched = patchLtvInText(chunk.text);
        if (patched !== chunk.text) {
          chunk.text = patched;
          changed = true;
        }
      }
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
  console.log('LTV knowledge patch complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchAllKnowledgeFiles();
}
