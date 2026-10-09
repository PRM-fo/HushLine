import { describe, expect, it } from 'vitest';
import { MAX_ANALYSIS_CHARS, splitConversationIntoChunks } from './inputChunks';

describe('splitConversationIntoChunks', () => {
  it('keeps all original text while splitting at line boundaries where possible', () => {
    const text = 'Alice: one\nBob: two\nCara: three';
    const chunks = splitConversationIntoChunks(text, 12);

    expect(chunks.join('')).toBe(text);
    expect(chunks.every((chunk) => chunk.length <= 12)).toBe(true);
    expect(chunks[0]).toBe('Alice: one\n');
  });

  it('splits long individual lines without discarding characters', () => {
    const text = 'x'.repeat(31);
    const chunks = splitConversationIntoChunks(text, 10);

    expect(chunks).toEqual(['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(10), 'x']);
    expect(chunks.join('')).toBe(text);
  });

  it('keeps every analysis chunk at or below the application limit', () => {
    const text = 'x'.repeat(MAX_ANALYSIS_CHARS + 1);
    const chunks = splitConversationIntoChunks(text);

    expect(chunks).toHaveLength(2);
    expect(chunks.every((chunk) => chunk.length <= MAX_ANALYSIS_CHARS)).toBe(true);
    expect(chunks.join('')).toBe(text);
  });

  it('handles empty text and rejects invalid chunk sizes', () => {
    expect(splitConversationIntoChunks('')).toEqual([]);
    expect(() => splitConversationIntoChunks('text', 0)).toThrow(RangeError);
  });
});
