import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';
import { patchPricingInText } from './patch-pricing-knowledge.js';

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
  return patchPricingInText(xml);
}

function patchDocx() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lamf-docx-'));
  execSync(`unzip -q "${DOCX}" -d "${tmpDir}"`);

  const xmlPath = path.join(tmpDir, 'word/document.xml');
  const original = fs.readFileSync(xmlPath, 'utf8');
  const patched = patchDocumentXml(original);

  if (original === patched) {
    console.warn('No pricing changes applied — verify document.xml patterns.');
  } else {
    fs.writeFileSync(xmlPath, patched);
    execSync(`cd "${tmpDir}" && zip -q -r "${DOCX}" .`);
    console.log('Patched risk-based pricing in program document.');
  }

  const before = extractDocxTextFromXml(original);
  const after = extractDocxTextFromXml(patched);
  if (before.includes('dynamic pricing') && !after.includes('dynamic pricing')) {
    console.log('Verified: dynamic pricing removed from extracted text.');
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

patchDocx();
