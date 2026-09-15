import { getIndexStats } from '../server/rag.js';
import { config } from '../server/config.js';

export default function handler(req, res) {
  try {
    const stats = getIndexStats();
    return res.status(200).json({
      status: 'ok',
      runtime: process.env.VERCEL === '1' ? 'vercel' : 'local',
      limits: {
        maxDirectContextChars: config.maxDirectContextChars,
        maxChunksPerSourceFull: config.maxChunksPerSourceFull,
        maxHistoryMessages: config.maxHistoryMessages,
      },
      ...stats,
    });
  } catch (err) {
    return res.status(503).json({ status: 'error', message: err.message });
  }
}
