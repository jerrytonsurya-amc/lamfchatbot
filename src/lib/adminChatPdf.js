import { jsPDF } from 'jspdf';

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

function wrapLines(doc, text, maxWidth) {
  return doc.splitTextToSize(text, maxWidth);
}

/**
 * @param {{ userNumber: number, lead: object, messages: object[], summary?: string, generatedAt?: string }} lead
 */
export function downloadAdminChatPdf(lead, summary = '') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LAMF Chat Transcript', margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const meta = [
    `User ${lead.userNumber}`,
    `Lead score: ${lead.lead?.score ?? '—'} (${lead.lead?.label ?? '—'})`,
    `Messages: ${lead.messageCount ?? lead.messages?.length ?? 0}`,
    `Exported: ${formatDateTime(new Date().toISOString())}`,
  ];
  for (const line of meta) {
    doc.text(line, margin, y);
    y += 14;
  }
  y += 8;

  if (summary?.trim()) {
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('AI summary', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const line of wrapLines(doc, stripMarkdown(summary), maxWidth)) {
      ensureSpace(14);
      doc.text(line, margin, y);
      y += 14;
    }
    y += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  ensureSpace(20);
  doc.text('Conversation', margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  for (const m of lead.messages || []) {
    const role = m.role === 'user' ? 'Customer' : 'Bot';
    const header = `${role} · ${formatDateTime(m.createdAt)}`;
    const body = stripMarkdown(m.content || '');
    ensureSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.text(header, margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    for (const line of wrapLines(doc, body, maxWidth)) {
      ensureSpace(14);
      doc.text(line, margin, y);
      y += 14;
    }
    y += 10;
  }

  const filename = `lamf-chat-user-${lead.userNumber}.pdf`;
  doc.save(filename);
}
