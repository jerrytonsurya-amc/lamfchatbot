function parseNumericListItem(line) {
  const cleaned = line.replace(/^[\s>*\-•]+/, '').trim();
  const match = cleaned.match(
    /^\*{0,2}(FY\d{2,4}|Q[1-4]\s*FY\d{2,4}|FY\s*\d{2,4}|H[1-2]\s*FY\d{2,4})\*{0,2}:?\s*(.+)$/i
  );
  if (!match) return null;

  return {
    period: match[1].replace(/\s+/g, ' ').trim(),
    value: match[2].replace(/\*{1,2}/g, '').trim(),
  };
}

function isNumericListBlock(lines) {
  if (lines.length < 2) return false;
  const parsed = lines.map(parseNumericListItem).filter(Boolean);
  return parsed.length >= 2 && parsed.length >= lines.length * 0.6;
}

function listBlockToTable(lines, heading) {
  const rows = lines.map(parseNumericListItem).filter(Boolean);
  if (rows.length < 2) return lines.join('\n');

  const table = [
    '| Period | Value |',
    '|--------|-------|',
    ...rows.map((r) => `| ${r.period} | ${r.value} |`),
  ].join('\n');

  return heading ? `${heading}\n\n${table}` : table;
}

export function ensureNumericTables(markdown) {
  if (!markdown) return markdown;

  const lines = markdown.split('\n');
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const isListLine = /^[\s>*\-•]/.test(line) && parseNumericListItem(line);

    if (isListLine) {
      const block = [];
      let heading = null;

      if (output.length > 0) {
        const prev = output[output.length - 1].trim();
        if (prev && !prev.startsWith('|') && !prev.startsWith('#')) {
          heading = prev;
          output.pop();
        }
      }

      while (i < lines.length) {
        const current = lines[i];
        if (parseNumericListItem(current)) {
          block.push(current);
          i += 1;
          continue;
        }
        if (current.trim() === '') {
          i += 1;
          break;
        }
        break;
      }

      if (isNumericListBlock(block)) {
        output.push(listBlockToTable(block, heading));
      } else {
        if (heading) output.push(heading);
        output.push(...block);
      }
      continue;
    }

    output.push(line);
    i += 1;
  }

  return output.join('\n');
}

function stripTrailingFollowUpQuestion(text) {
  const parts = text.split(/\n\n+/);
  if (parts.length < 2) return text;

  const last = parts[parts.length - 1].trim();
  const isShortQuestion =
    last.endsWith('?') &&
    last.length < 220 &&
    !last.includes('|') &&
    !/^\|/.test(last);

  if (isShortQuestion) {
    return parts.slice(0, -1).join('\n\n').trim();
  }

  return text;
}

export function polishCustomerAnswer(text) {
  if (!text) return text;

  let answer = text.trim();

  answer = answer.replace(/\n+#{1,3}\s*sources?\s*\n[\s\S]*$/i, '');
  answer = answer.replace(/\n+\*{0,2}sources?\*{0,2}\s*:?\s*\n[\s\S]*$/i, '');
  answer = answer.replace(/\n+sources?\s*:\s*\n[\s\S]*$/i, '');

  answer = answer.replace(
    /\b(according to|as per|based on|from|refer to|see) (the )?(LAMF|SCCL)[^\n.]*[.\n]?/gi,
    ''
  );
  answer = answer.replace(/\bLAMF_[A-Za-z0-9_ .]+\.docx\b/gi, '');
  answer = answer.replace(/\bSCCL_LAMF[^\n.]*/gi, '');
  answer = answer.replace(/\bLAMF (Customer FAQs|Voicebot[^.]*|Program Document[^.]*)[.]?/gi, '');

  answer = answer.replace(
    /^(hello|hi)!?\s+i(?:'m| am) the shriram credit lamf ai assistant[^\n]*\n+/i,
    ''
  );
  answer = answer.replace(
    /^i(?:'m| am) the shriram credit lamf ai assistant[^\n]*\n+/i,
    ''
  );
  answer = answer.replace(/shriram credit lamf ai assistant[^\n]*full library[^\n]*\n?/gi, '');

  answer = answer.replace(/\n*\*{0,2}Follow[- ]?up questions?\*{0,2}\s*:?\s*\n*/gi, '\n\n');
  answer = answer.replace(/\n*Follow[- ]?up questions?\s*:?\s*\n*/gi, '\n\n');

  answer = stripTrailingFollowUpQuestion(answer);

  answer = answer.replace(/\n{3,}/g, '\n\n').trim();

  return answer;
}
