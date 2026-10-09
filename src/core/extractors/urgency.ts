import type { Extractor } from '../types';

const URGENCY_MARKERS = [
  /\burgent\b/i, /\basap\b/i, /\bimmediately\b/i, /\bright now\b/i, /\bdeadline\b/i,
  /\bdue\b/i, /\boverdue\b/i, /\bcritical\b/i, /\bimportant\b/i, /\bemergency\b/i,
  /\bneeds? (to be )?done\b/i, /\bmust\b/i, /\bnot optional\b/i,
  /\bfinal (call|chance|reminder)\b/i, /\blast (call|chance|reminder)\b/i,
  /\bby (end of )?(today|tomorrow|tonight|eod)\b/i,
  /\bbefore (class|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday)\b/i,
];

export const extractUrgency: Extractor<string> = ({ message }) => {
  return URGENCY_MARKERS.flatMap((pattern) => {
    const match = message.text.match(pattern);
    return match?.[0] ? [match[0].trim().toLocaleLowerCase()] : [];
  });
};
