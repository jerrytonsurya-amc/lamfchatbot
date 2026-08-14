import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { COMPANY } from '../shared/company.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'data', 'knowledge-index.json');

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

const LAMF_DOCUMENTS = [
  {
    path: path.join(ROOT, 'LAMF_General_Customer_FAQs.docx'),
    category: 'LAMF Customer FAQs',
  },
  {
    path: path.join(ROOT, 'LAMF_Voicebot_Consolidated_Calling_Knowledge_Base1.docx'),
    category: 'LAMF Voicebot Knowledge Base',
  },
  {
    path: path.join(ROOT, 'SCCL_LAMF_Program_Document_V3.0 1.docx'),
    category: 'LAMF Program Document',
  },
];

function chunkText(text, source, category, company = COMPANY) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    let slice = cleaned.slice(start, end);

    if (end < cleaned.length) {
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > CHUNK_SIZE * 0.6) {
        slice = slice.slice(0, lastSpace);
      }
    }

    chunks.push({
      id: `${source}-${chunks.length}`,
      source,
      category,
      company,
      text: slice.trim(),
    });

    if (end >= cleaned.length) break;
    start += slice.length - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }

  return chunks;
}

function extractDocxText(docxPath) {
  if (!fs.existsSync(docxPath)) {
    throw new Error(`Missing ${docxPath}`);
  }

  const xml = execSync(`unzip -p "${docxPath}" word/document.xml`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });

  let text = xml
    .replace(/<w:tab[^/>]*\/>/g, '\t')
    .replace(/<w:br[^/>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

  return text.replace(/\s+/g, ' ').trim();
}

async function ingestDocx(filePath, category) {
  const source = path.basename(filePath);
  console.log(`Processing: ${filePath}`);
  const text = extractDocxText(filePath);
  const chunks = chunkText(text, source, category, COMPANY);
  console.log(`  -> ${chunks.length} chunks (${text.length} chars)`);
  return chunks;
}

async function ingest() {
  console.log('Starting LAMF document ingestion...\n');

  const allChunks = [];

  for (const { path: docPath, category } of LAMF_DOCUMENTS) {
    console.log(`\nCategory: ${category}`);
    try {
      const chunks = await ingestDocx(docPath, category);
      allChunks.push(...chunks);
    } catch (err) {
      console.warn(`  Skipped ${docPath}: ${err.message}`);
    }
  }

  const index = {
    createdAt: new Date().toISOString(),
    company: COMPANY,
    totalChunks: allChunks.length,
    categories: [...new Set(allChunks.map((c) => c.category))],
    chunks: allChunks,
  };

  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  console.log(`\nDone! Indexed ${allChunks.length} LAMF chunks -> ${INDEX_PATH}`);

  console.log('\nBuilding LAMF catalog...');
  execSync('node server/build-catalogs.js', { cwd: ROOT, stdio: 'inherit' });

  if (process.env.SKIP_EMBED === '1') {
    console.log('Skipping embeddings (SKIP_EMBED=1)');
    return;
  }

  const { generateChunkEmbeddings, saveEmbeddings } = await import('./embeddings.js');
  console.log('\nGenerating embeddings with gemini-embedding-2...');
  const embeddingData = await generateChunkEmbeddings(allChunks, (batch, total, done, all) => {
    console.log(`  Batch ${batch}/${total} (${done}/${all} chunks)`);
  });
  saveEmbeddings(embeddingData);
  console.log('Embeddings complete.');
}

ingest().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
