import 'dotenv/config';
import { summarizeAdminThread } from '../../server/adminSummary.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, threadId } = req.body || {};

  try {
    const result = await summarizeAdminThread(password, threadId);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 401) return res.status(401).json({ error: 'Incorrect password' });
    if (status === 400) return res.status(400).json({ error: err.message });
    if (status === 404) return res.status(404).json({ error: err.message });
    console.error('[admin] summary failed:', err);
    return res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
}
