import type { Extractor } from '../types';

const ANNOUNCEMENT_MARKERS = [
  /\bFYI\b/i, /\bplease note\b/i, /\bheads? up\b/i, /\bannouncement\b/i,
  /\bnote? (that|for)\b/i, /\bjust so (everyone|you all|you guys) know/i,
  /\breminder\b/i, /\beveryone (needs? to|should|must)\b/i,
  /\bprofessor\b/i, /\bgrading\b/i, /\bsyllabus\b/i, /\brubric\b/i, /\battendance\b/i,
];

export const extractAnnouncements: Extractor<string> = ({ message }) =>
  ANNOUNCEMENT_MARKERS.flatMap((pattern) => {
    const match = message.text.match(pattern);
    return match?.[0] ? [match[0].trim().toLocaleLowerCase()] : [];
  });
