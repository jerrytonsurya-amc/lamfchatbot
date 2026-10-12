function stripMarkdown(text) {
  return (text || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`/g, '')
    .trim();
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Plain-text chat log for email / clipboard (no phone numbers). */
export function buildAdminChatEmailBody(lead, summary = '') {
  const lines = [
    'LAMF Chat Transcript',
    '====================',
    `User ${lead.userNumber}`,
    `Lead score: ${lead.lead?.score ?? '—'} (${lead.lead?.label ?? '—'})`,
    `First chat: ${formatDateTime(lead.createdAt)}`,
    `Last active: ${formatDateTime(lead.lastActivity)}`,
    `Messages: ${lead.messageCount ?? lead.messages?.length ?? 0}`,
    '',
  ];

  if (summary?.trim()) {
    lines.push('AI summary', '----------', stripMarkdown(summary), '', '');
  }

  lines.push('Conversation', '--------------', '');

  for (const m of lead.messages || []) {
    const role = m.role === 'user' ? 'Customer' : 'Bot';
    lines.push(`${role} · ${formatDateTime(m.createdAt)}`);
    lines.push(stripMarkdown(m.content || ''));
    lines.push('');
  }

  return lines.join('\n').trim();
}

const OUTLOOK_COMPOSE_URL = 'https://outlook.office.com/mail/deeplink/compose';

const COMPOSE_HINT =
  'The full LAMF chat log is in your clipboard. Click in this message and press Ctrl+V (Cmd+V on Mac) to paste the transcript.';

/**
 * Opens Outlook compose with a short URL (Microsoft rejects long query strings — AADSTS90015).
 * Full chat is always copied to the clipboard for paste into the email body.
 */
export async function openOutlookChatEmail(lead, summary = '') {
  const subject = `LAMF chat log — User ${lead.userNumber}`;
  const body = buildAdminChatEmailBody(lead, summary);

  try {
    await navigator.clipboard.writeText(body);
  } catch {
    return {
      ok: false,
      message: 'Could not copy the chat to your clipboard. Allow clipboard access for this site, or use Download PDF.',
    };
  }

  const url = `${OUTLOOK_COMPOSE_URL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(COMPOSE_HINT)}`;
  window.open(url, '_blank', 'noopener,noreferrer');

  return {
    ok: true,
    message: 'Outlook opened. Full chat copied — paste it into the email body (Ctrl+V / Cmd+V).',
  };
}
