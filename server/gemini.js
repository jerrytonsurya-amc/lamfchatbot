import { generateText } from './claude.js';
import { retrieveRelevantChunks, buildContext } from './rag.js';
import {
  getActiveModel,
  withRetry,
  getCachedAnswer,
  setCachedAnswer,
  isRateLimitError,
  formatRateLimitError,
} from './retry.js';
import { config } from './config.js';
import { polishCustomerAnswer } from './formatMarkdown.js';
import { detectOutOfScopeQuestion, getOutOfScopeMessage } from '../shared/companyGuard.js';
import { COMPANY } from '../shared/company.js';

const SYSTEM_PROMPT = `You are the Shriram Credit LAMF AI Assistant for Shriram Credit Company Limited's LAMF (Loan Against Mutual Funds) program.

Answer the user's question using ONLY the provided CONTEXT. Write for customers and call-center agents.

Style (CRITICAL):
- Give a direct answer in natural, conversational prose.
- Use short paragraphs or simple bullet points when listing steps or options.
- Do NOT introduce yourself or greet the user unless they greeted you first in this message.
- Do NOT mention document names, file names, knowledge bases, or where information came from.
- Never write "According to...", "Based on the Program Document...", "As per the FAQs...", or similar.
- Never include a Sources section, source list, or filenames in your reply.
- Do NOT end with a follow-up question or prompt like "Would you like to know...?" — stop after the answer.

Tables:
- Use markdown tables ONLY when the user asks for rates, fees, or numeric comparisons across periods (e.g. FY20–FY26 revenue-style data).
- Do NOT use tables for general explanations, process steps, eligibility, or feature lists.
- Do NOT use FEATURE / DESCRIPTION table layouts unless the user explicitly asks for a comparison table.

Content rules:
1. Answer the user's actual question first.
2. If the answer is not in the context, say so briefly and suggest a related LAMF topic they can ask about — without a question mark at the end if possible.
3. Use the CURRENT DATE AND TIME to interpret "latest", "recent", or "current" when relevant.
4. Use UK English when mirroring voicebot phrasing from the context.
5. Read all context excerpts before answering; merge facts into one cohesive reply.

Greetings only (when the user says hi/hello):
- Reply warmly in one or two short sentences.
- Do not cite documents or use tables.`;

async function generateWithModel(modelName, prompt) {
  return generateText(prompt, { model: modelName });
}

const GREETING_PATTERN = /^(hi|hello|hey|howdy|good\s+(morning|afternoon|evening)|greetings)[!.?\s]*$/i;

function isGreeting(text) {
  return GREETING_PATTERN.test(text.trim());
}

function greetingReply(hasHistory) {
  if (hasHistory) {
    return 'Hello! How can I help you with LAMF today?';
  }
  return (
    "Hello! I'm the Shriram Credit LAMF AI Assistant. " +
    'I can help with LAMF eligibility, application process, disbursement, interest rates, pledging, and customer FAQs.'
  );
}

function resolveCurrentDateTime(currentDateTime) {
  if (currentDateTime && typeof currentDateTime === 'object') {
    if (typeof currentDateTime.local === 'string' && currentDateTime.local.trim()) {
      return currentDateTime.local.trim();
    }
    if (typeof currentDateTime.iso === 'string' && currentDateTime.iso.trim()) {
      return currentDateTime.iso.trim();
    }
  }
  if (typeof currentDateTime === 'string' && currentDateTime.trim()) {
    return currentDateTime.trim();
  }
  return new Date().toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

export async function generateAnswer(question, history = [], currentDateTime = null) {
  const trimmed = question.trim();
  const nowLabel = resolveCurrentDateTime(currentDateTime);
  const cacheKey = `v17:${COMPANY}:${nowLabel.slice(0, 10)}:${trimmed.toLowerCase()}`;
  const cached = getCachedAnswer(cacheKey);
  if (cached) return cached;

  const modelName = getActiveModel();

  if (isGreeting(trimmed)) {
    const result = {
      answer: greetingReply(history.length > 0),
      sources: [],
      model: modelName,
    };
    setCachedAnswer(cacheKey, result);
    return result;
  }

  if (detectOutOfScopeQuestion(trimmed)) {
    const result = { answer: getOutOfScopeMessage(), sources: [], model: modelName, guardrail: 'out_of_scope' };
    setCachedAnswer(cacheKey, result);
    return result;
  }

  const chunks = await retrieveRelevantChunks(question, config.maxContextChunks);
  const context = chunks._context || buildContext(chunks);
  const searchMeta = chunks._meta || {};

  const historyText = history
    .slice(-config.maxHistoryMessages)
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `${SYSTEM_PROMPT}

CURRENT DATE AND TIME: ${nowLabel}

CONTEXT:
${context}
${historyText ? `\nPRIOR MESSAGES:\n${historyText}\n` : ''}
QUESTION: ${question}

Answer:`;

  try {
    let answer = await withRetry(() => generateWithModel(modelName, prompt));
    answer = polishCustomerAnswer(answer);
    const result = {
      answer,
      sources: [],
      model: modelName,
      research: searchMeta.totalDocuments
        ? {
            documentsSearched: searchMeta.totalDocuments,
            documentsUsed: searchMeta.documentsSelected,
            chunksUsed: searchMeta.chunksUsed,
            selectionMethod: searchMeta.selectionMethod,
            fullResearch: searchMeta.fullResearch,
          }
        : undefined,
    };
    setCachedAnswer(cacheKey, result);
    return result;
  } catch (err) {
    if (isRateLimitError(err)) {
      throw new Error(formatRateLimitError());
    }
    throw err;
  }
}
