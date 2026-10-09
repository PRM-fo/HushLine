import type { Extractor } from '../types';

const ACTION_MARKERS = [
  /\b(?:need|needs)\s+(?:you\s+)?to\b/i,
  /\b(?:can|could)\s+you\b/i,
  /\bwil+ you\b/i,
  /\bplease\b/i,
  /\b(?:I'll|I will)\b/i,
  /\b(?:I own|I'm responsible for|I am responsible for|I'm taking|I am taking)\b/i,
  /\b(?:own|responsible for|will)\b/i,
  /\bassign(?:ed)?\s+(?:to\s+)?(?:you|@?\w+)\b/i,
  /\b(?:you|@?\w+)\s+(?:should|need to|have to|must)\b/i,
  /\b(?:your|@?\w+'s)\s+(?:turn|responsibility|job|task)\b/i,
  /\b(?:take care of|handle|prepare|finish|complete|submit|send|post|update|write|create|review|check|book|reserve|order|confirm|fix)\b/i,
];

export const extractActions: Extractor<RegExp> = ({ message }) =>
  ACTION_MARKERS.filter((pattern) => pattern.test(message.text));
