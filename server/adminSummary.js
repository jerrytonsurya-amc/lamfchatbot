import { generateText } from './claude.js';
import { getAdminLeads, isValidAdminPassword } from './admin.js';
import { isUserMessage } from '../shared/messageRole.js';

function buildTranscript(messages) {
  return messages
    .map((m) => {
      const who = isUserMessage(m.role) ? 'User' : 'Bot';
      return `${who}: ${(m.content || '').trim()}`;
    })
    .join('\n\n');
}

export async function summarizeThreadMessages(messages, userLabel = 'User') {
  if (!messages?.length) {
    return 'No messages in this conversation yet.';
  }

  const transcript = buildTranscript(messages);
  const prompt = `You are summarizing a Shriram Credit LAMF (Loan Against Mutual Funds) chatbot conversation for an internal admin dashboard.

Write a concise summary for a sales or support reviewer. Use UK English.
- 4–6 bullet points using markdown "-" bullets.
- Cover: main topics, customer intent, product interest (apply/eligibility/process), objections or confusion, and suggested follow-up.
- Do NOT include or guess phone numbers or personal identifiers. Refer to the customer as "${userLabel}" only.
- If the chat is very short, use fewer bullets.

Conversation:
${transcript}

Summary:`;

  return generateText(prompt, { maxTokens: 1024 });
}

/** Load thread by id from admin leads (messages only; no phone returned). */
export async function getThreadForSummary(threadId) {
  const leads = await getAdminLeads();
  const lead = leads.find((l) => l.threadId === threadId);
  if (!lead) return null;
  return lead;
}

export async function summarizeAdminThread(password, threadId) {
  if (!isValidAdminPassword(password)) {
    const err = new Error('Incorrect password');
    err.statusCode = 401;
    throw err;
  }
  if (!threadId || typeof threadId !== 'string') {
    const err = new Error('threadId is required');
    err.statusCode = 400;
    throw err;
  }

  const lead = await getThreadForSummary(threadId);
  if (!lead) {
    const err = new Error('Conversation not found');
    err.statusCode = 404;
    throw err;
  }

  const userLabel = `User ${lead.userNumber}`;
  const summary = await summarizeThreadMessages(lead.messages, userLabel);
  return { threadId, userNumber: lead.userNumber, summary, generatedAt: new Date().toISOString() };
}
