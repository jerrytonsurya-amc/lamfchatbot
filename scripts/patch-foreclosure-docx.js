import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';
import { patchForeclosureInText } from './patch-foreclosure-knowledge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DOCX = path.join(ROOT, 'SCCL_LAMF_Program_Document_V3.0 1.docx');

function patchDocx() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lamf-docx-'));
  execSync(`unzip -q "${DOCX}" -d "${tmpDir}"`);

  const xmlPath = path.join(tmpDir, 'word/document.xml');
  const original = fs.readFileSync(xmlPath, 'utf8');
  const patched = patchForeclosureInText(original);

  if (original === patched) {
    console.warn('No foreclosure changes applied — verify document.xml patterns.');
  } else {
    fs.writeFileSync(xmlPath, patched);
    execSync(`cd "${tmpDir}" && zip -q -r "${DOCX}" .`);
    console.log('Patched foreclosure charges in program document.');
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

patchDocx();
