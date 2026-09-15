// Same retrieval limits everywhere so localhost and production return consistent answers.
export const config = {
  chatModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2',
  embedBatchSize: 50,
  embedBatchDelayMs: 2000,
  maxContextChunks: 20,
  maxDocumentsToUse: 10,
  maxChunksPerSource: 4,
  maxChunksPerSourceFull: 3,
  maxDirectContextChars: 95000,
  vercelMaxDocuments: 10,
  fullResearchBatchSize: 6,
  useAiDocumentSelection: process.env.SKIP_AI_DOC_SELECT !== '1',
  maxHistoryMessages: 4,
  skipQueryEmbed: process.env.SKIP_QUERY_EMBED === '1',
};
