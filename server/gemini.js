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
import { ensureNumericTables } from './formatMarkdown.js';
import { detectOutOfScopeQuestion, getOutOfScopeMessage } from '../shared/companyGuard.js';
import { COMPANY } from '../shared/company.js';

const SYSTEM_PROMPT = `You are the Shriram Credit LAMF AI Assistant — a chatbot for Shriram Credit Company Limited's LAMF (Loan Against Mutual Funds) program.

Your job is to answer the user's question directly in the chat using ONLY the provided context from LAMF Customer FAQs, the Voicebot Knowledge Base, and the LAMF Program Document.

Rules:
1. Always answer the user's actual question first — be clear, structured, and easy to understand for customers and call-center agents.
2. If the answer is not in the context, say so clearly and suggest what they could ask instead.
3. Cite source document names when stating facts, rates, or process steps.
4. Use the CURRENT DATE AND TIME provided in each request to interpret "latest", "recent", or "current" policy references.
5. Use UK English spelling and tone when quoting or mirroring voicebot scripts.
6. Never refuse to answer a LAMF-related question when the context contains relevant information.

Multi-source synthesis (CRITICAL):
- The CONTEXT contains excerpts from multiple LAMF documents — FAQs, Voicebot scripts, and the Program Document.
- The full LAMF document library was searched for every question; excerpts from every file in that library are included below.
- Read ALL document sections in the context before answering. Do NOT answer from a single file when other sources also contain relevant information.
- Merge and consolidate facts from every applicable source into one cohesive, unified answer.
- Draw on FAQs for customer-facing answers, voicebot scripts for call flows, and the program document for policy and rules.

Numeric data formatting (CRITICAL — never use bullet lists for numbers):
- NEVER present numeric data as bullet points or plain text lists.
- ALWAYS use markdown tables for any numeric values, rates, limits, or comparisons.
- For trends or fee schedules, use a table with clear column headers.
- Use a short paragraph before each table to explain context.
- After the table, add 1–2 sentences summarizing the key point.

Follow-up (REQUIRED for substantive answers):
- End with one short, casual question tied to what you just answered — as a natural next step, not a labeled section.
- NEVER write headings or labels like "Follow-up question", "Follow up:", or similar.
- Weave the question into the last sentence or add it as a final line on its own.
- Ask exactly one question; keep it conversational.

Greetings (hi, hello, hey, good morning, etc.):
- Reply warmly and briefly as the Shriram Credit LAMF AI Assistant. Do not pull from documents or cite sources.
- Invite them to ask any LAMF question — eligibility, process, rates, or FAQs.
- Skip tables and document citations for pure greetings.`;

async function generateWithModel(modelName, prompt) {
  return generateText(prompt, { model: modelName });
}

const GREETING_PATTERN = /^(hi|hello|hey|howdy|good\s+(morning|afternoon|evening)|greetings)[!.?\s]*$/i;

function isGreeting(text) {
  return GREETING_PATTERN.test(text.trim());
}

function greetingReply() {
  return (
    "Hello! I'm the Shriram Credit LAMF AI Assistant. Ask me anything about Loan Against Mutual Funds — " +
    'eligibility, application process, disbursement, interest rates, pledging, or customer FAQs.\n\n' +
    'What would you like to know?'
  );
}

function polishAnswer(text) {
  let answer = ensureNumericTables(text);
  answer = answer.replace(/\n*\*{0,2}Follow[- ]?up questions?\*{0,2}\s*:?\s*\n*/gi, '\n\n');
  answer = answer.replace(/\n*Follow[- ]?up questions?\s*:?\s*\n*/gi, '\n\n');
  return answer.trim();
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
  const cacheKey = `v16:${COMPANY}:${nowLabel.slice(0, 10)}:${trimmed.toLowerCase()}`;
  const cached = getCachedAnswer(cacheKey);
  if (cached) return cached;

  const modelName = getActiveModel();

  if (isGreeting(trimmed) && history.length === 0) {
    const result = { answer: greetingReply(), sources: [], model: modelName };
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
  const searchedNote = searchMeta.totalDocuments
    ? `Full library research for Shriram Credit LAMF: all ${searchMeta.totalDocuments} documents were analyzed (${searchMeta.documentsSelected} files included, ${searchMeta.chunksUsed} excerpts). Method: ${searchMeta.selectionMethod || 'full_library'}.`
    : '';

  const historyText = history
    .slice(-config.maxHistoryMessages)
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `${SYSTEM_PROMPT}

CURRENT DATE AND TIME: ${nowLabel}
${searchedNote ? `\nRESEARCH NOTE: ${searchedNote}\n` : ''}
CONTEXT:
${context}
${historyText ? `\nPRIOR MESSAGES:\n${historyText}\n` : ''}
QUESTION: ${question}

Answer:`;

  try {
    let answer = await withRetry(() => generateWithModel(modelName, prompt));
    answer = polishAnswer(answer);
    const sources = searchMeta.selectedSources?.length
      ? searchMeta.selectedSources
      : [...new Set(chunks.map((c) => `${c.source} (${c.category})`))];
    const result = {
      answer,
      sources,
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
