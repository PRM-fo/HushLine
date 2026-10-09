import type { Extractor } from '../types';

const DATE_PATTERNS: RegExp[] = [
  /\bdeadline(?:\s+is)?(?:\s+by)?\s+(?:(?:this|next)\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight))?\b/gi,
  /\b(?:(?:by|before|until|till|after|on|due)\s+)?(?:this\s+|next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight))?\b/gi,
  /\b(?:by|before|on|due)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi,
  /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)(?:\s*,?\s*\d{4})?\b/gi,
  /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g,
  /\b(?:today|tomorrow|tonight)(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight))\b/gi,
  /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:today|tomorrow|tonight)\b/gi,
  /\b(?:today|tomorrow|tonight|this (?:morning|afternoon|evening|week|weekend))\b/gi,
  /\bnext week\b/gi,
  /\bend of (?:day|week|class|tomorrow)\b/gi,
  /\b(?:at\s+)?\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi,
  /\b\d{1,2}\s*(?:am|pm)\b/gi,
  /\b(?:by|before|until|till|after|on|at)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi,
];

function extractDateValues(text: string): string[] {
  const found: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = match[0]
        .trim()
        .replace(/[.,;!?]+$/, '')
        .replace(/^(?:deadline(?:\s+is)?(?:\s+by)?|due)\s+/i, '');
      if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(value)) {
        const [first, second, yearText] = value.split('/').map(Number);
        if (value === '24/7') continue;
        const day = first > 12 ? first : second;
        const month = first > 12 ? second : first;
        const year = yearText === undefined ? 2000 : yearText < 100 ? yearText + 2000 : yearText;
        if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) continue;
        const context = text.slice(Math.max(0, match.index - 24), match.index + value.length + 24);
        if (/\b(?:fraction|ratio|divided by|out of|recipe|cup|cups|portion|parts?)\b/i.test(context)) continue;
      }
      if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(value) && /\b(?:cup|cups|portion|parts?)\b/i.test(text.slice(match.index + value.length))) continue;
      found.push(value);
    }
  }
  const unique = [...new Set(found)];
  const nonContained = unique.filter((value) =>
    !unique.some((other) => other.length > value.length && other.toLowerCase().includes(value.toLowerCase()))
  );

  const change = text.match(
    /\b(?:moved|changed|pushed|shifted|rescheduled|postponed)\b[^.!?]*?\bfrom\b([\s\S]*?)\bto\b/i
  );
  if (change?.index !== undefined) {
    const oldDateStart = change.index + change[0].indexOf(change[1]);
    const newDateStart = change.index + change[0].length;
    return nonContained.filter((date) => {
      const dateIndex = text.toLowerCase().indexOf(date.toLowerCase(), change.index);
      return dateIndex < oldDateStart || dateIndex >= newDateStart;
    });
  }
  const nowDue = text.match(/\bnow\s+due\b[\s\S]*?\binstead of\b/i);
  if (nowDue?.index !== undefined) {
    const insteadIndex = nowDue.index + nowDue[0].length;
    return nonContained.filter((date) => {
      const dateIndex = text.toLowerCase().indexOf(date.toLowerCase(), nowDue.index);
      return dateIndex < 0 || dateIndex < insteadIndex;
    });
  }
  return nonContained;
}

export const extractDates: Extractor<string> = ({ message }) => extractDateValues(message.text);
