import type { Extractor } from '../types';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const extractMentions: Extractor<string> = ({ message, participants }) => [
  ...[...message.text.matchAll(/@(\w+)/g)].map((match) => match[1]),
  ...participants
    .filter((name) => name.toLowerCase() !== message.sender.toLowerCase())
    .filter((name) => new RegExp(`\\b${escapeRegExp(name)}\\s*,`, 'iu').test(message.text))
    .filter((name) => !new RegExp(`@${escapeRegExp(name)}\\b`, 'iu').test(message.text)),
];
