import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateAnswer } from './gemini.js';
import { appendPhoneChatMessage } from './phoneChatStore.js';
import { isValidIndianPhone } from '../shared/phone.js';
import { getIndexStats } from './rag.js';
import { getAdminLeads, isValidAdminPassword } from './admin.js';
import { summarizeAdminThread } from './adminSummary.js';

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
    const { message, history = [], currentDateTime = null, phoneNumber = null } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const { answer, sources } = await generateAnswer(message.trim(), history, currentDateTime);

    if (phoneNumber && isValidIndianPhone(phoneNumber)) {
      try {
        await appendPhoneChatMessage(phoneNumber, 'assistant', answer, sources);
      } catch (persistErr) {
        console.error('Failed to persist assistant message:', persistErr);
      }
    }

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

app.post('/api/admin/summary', async (req, res) => {
  try {
    const result = await summarizeAdminThread(req.body?.password, req.body?.threadId);
    res.set('Cache-Control', 'no-store');
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 401) return res.status(401).json({ error: 'Incorrect password' });
    if (status === 400) return res.status(400).json({ error: err.message });
    if (status === 404) return res.status(404).json({ error: err.message });
    console.error('Admin summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
