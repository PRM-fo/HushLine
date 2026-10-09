import type { Extractor } from '../types';

const DECISION_MARKERS = [
  /\blet'?s go with\b/i, /\bdecided\b/i, /\bwe'?l+ go with\b/i, /\bagreed?\b/i,
  /\bso we'?re doing\b/i, /\bfinal decision\b/i, /\bthat'?s settled\b/i, /\bconsensus\b/i,
  /\blocked in\b/i, /\bgoing with\b/i, /\bwe chose\b/i, /\bvoted?\b/i, /\b unanimous\b/i,
  /\bso we'?ll\b/i, /\bwe'?l+ use\b/i,
];

export const extractDecisions: Extractor<string> = ({ message }) => {
  const text = message.text;
  return DECISION_MARKERS.flatMap((pattern) => {
    const match = text.match(pattern);
    return match?.[0] ? [match[0].trim().toLocaleLowerCase()] : [];
  });
};
