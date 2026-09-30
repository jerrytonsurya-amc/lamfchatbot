import 'dotenv/config';
import { getAdminLeads, isValidAdminPassword } from '../../server/admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isValidAdminPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  try {
    const leads = await getAdminLeads();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ leads, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[admin] failed to load leads:', err);
    return res.status(500).json({ error: 'Failed to load leads', details: err.message });
  }
}
