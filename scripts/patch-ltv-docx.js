import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';
import { patchLtvInText } from './patch-ltv-knowledge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DOCX = path.join(ROOT, 'SCCL_LAMF_Program_Document_V3.0 1.docx');

function extractDocxTextFromXml(xml) {
  return xml
    .replace(/<w:tab[^/>]*\/>/g, '\t')
    .replace(/<w:br[^/>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function patchDocumentXml(xml) {
  let next = xml;

  const replacements = [
    ['70% of current market value of pledged equity MF units', '65% of current market value of pledged equity MF units'],
    ['80% of current market value of pledged debt MF units', '75% of current market value of pledged debt MF units'],
    ['Debt funds: 80%. Equity fund: 70%.', 'Debt funds: 75%. Equity fund: 65%.'],
    ['Equity fund: 70%. ELSS outside lock-in: 70%.', 'Equity fund: 65%. ELSS outside lock-in: 65%.'],
    ['70% LTV', '65% LTV'],
    ['Equity: 70%.', 'Equity: 65%.'],
    ['Equity: 70%', 'Equity: 65%'],
    ['70% for equity', '65% for equity'],
    ['70% equity', '65% equity'],
    ['equity (70%) and debt (80%)', 'equity (65%) and debt (75%)'],
    ['Up to 70%', 'Up to 65%'],
    ['Up to 80%', 'Up to 75%'],
    ['80% for debt', '75% for debt'],
    ['80% debt', '75% debt'],
    ['80% of collateral market value', '75% of collateral market value'],
    ['70% of collateral market value', '65% of collateral market value'],
  ];

  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }

  // Word splits percentages across runs, e.g. "Debt funds: 8" + "0%."
  next = next.replace(
    /Debt funds: 8(<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t[^>]*>)0%/g,
    'Debt funds: 75%$1'
  );
  next = next.replace(
    /Debt funds: (<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t[^>]*>)8(<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t[^>]*>)0%/g,
    'Debt funds: 75%$1$2'
  );
  next = next.replace(
    /Equity fund: 7(<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t[^>]*>)0%/g,
    'Equity fund: 65%$1'
  );
  next = next.replace(
    /All other fund types \(equity\): 7(<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t[^>]*>)0%/g,
    'All other fund types (equity): 65%$1'
  );
  next = next.replace(
    /Up to 7(<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t[^>]*>)0%/g,
    'Up to 65%$1'
  );
  next = next.replace(
    /Up to 8(<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t[^>]*>)0%/g,
    'Up to 75%$1'
  );

  return next;
}

function patchDocx() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lamf-docx-'));
  execSync(`unzip -q "${DOCX}" -d "${tmpDir}"`);

  const xmlPath = path.join(tmpDir, 'word/document.xml');
  const original = fs.readFileSync(xmlPath, 'utf8');
  const patched = patchDocumentXml(original);

  const before = extractDocxTextFromXml(original);
  const after = patchLtvInText(extractDocxTextFromXml(patched));

  if (before === after && original === patched) {
    console.warn('No LTV changes applied — verify document.xml patterns.');
  } else {
    fs.writeFileSync(xmlPath, patched);
    execSync(`cd "${tmpDir}" && zip -q -r "${DOCX}" .`);
    console.log('Patched LTV values in program document.');
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

patchDocx();
