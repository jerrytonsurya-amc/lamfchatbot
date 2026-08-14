const isVercel = process.env.VERCEL === '1';

export const config = {
  chatModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2',
  embedBatchSize: 50,
  embedBatchDelayMs: 2000,
  maxContextChunks: isVercel ? 12 : 20,
  maxDocumentsToUse: isVercel ? 3 : 10,
  maxChunksPerSource: isVercel ? 2 : 4,
  maxChunksPerSourceFull: isVercel ? 2 : 3,
  maxDirectContextChars: isVercel ? 45000 : 95000,
  vercelMaxDocuments: 3,
  fullResearchBatchSize: 6,
  useAiDocumentSelection: !isVercel && process.env.SKIP_AI_DOC_SELECT !== '1',
  maxHistoryMessages: isVercel ? 2 : 4,
  skipQueryEmbed: process.env.SKIP_QUERY_EMBED === '1' || isVercel,
};
