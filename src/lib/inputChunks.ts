import { MAX_ANALYSIS_CHARS } from '@/core/limits';

export { MAX_ANALYSIS_CHARS };

export function splitConversationIntoChunks(
  text: string,
  maxChars = MAX_ANALYSIS_CHARS
): string[] {
  if (!text) return [];
  if (!Number.isInteger(maxChars) || maxChars < 1) {
    throw new RangeError('Chunk size must be a positive integer.');
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const lineBreak = text.lastIndexOf('\n', end - 1);
      if (lineBreak >= start) end = lineBreak + 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
