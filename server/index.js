import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateAnswer } from './gemini.js';
import { getIndexStats } from './rag.js';
import { getAdminLeads, isValidAdminPassword } from './admin.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  try {
    const stats = getIndexStats();
    res.json({ status: 'ok', ...stats });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], currentDateTime = null } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const { answer, sources } = await generateAnswer(message.trim(), history, currentDateTime);

    res.json({ answer, sources });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      error: 'Failed to generate response',
      details: err.message,
    });
  }
});

app.post('/api/admin/leads', async (req, res) => {
  if (!isValidAdminPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  try {
    const leads = await getAdminLeads();
    res.set('Cache-Control', 'no-store');
    res.json({ leads, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Admin leads error:', err);
    res.status(500).json({ error: 'Failed to load leads', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
