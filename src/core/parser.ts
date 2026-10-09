import type { ParsedMessage, ParseResult } from './types';

const SYSTEM_LINE_PATTERNS = [
  /^<media omitted>$/i,
  /^this message was deleted\.?$/i,
  /^messages and calls are end-to-end encrypted/i,
];

const MESSAGE_LINE_FORMATS = [
  {
    pattern: /^(\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s+-\s+([^:]{1,50}):\s+(.+)$/i,
    map: (match: RegExpMatchArray) => ({
      sender: match[2].trim(),
      timestamp: match[1].trim(),
      text: match[3].trim(),
    }),
  },
  {
    pattern: /^\[(\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]\s+([^:]{1,50}):\s+(.+)$/i,
    map: (match: RegExpMatchArray) => ({
      sender: match[2].trim(),
      timestamp: match[1].trim(),
      text: match[3].trim(),
    }),
  },
  {
    pattern: /^([^\s,][^,]{0,50}?),\s+(\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*[-–]\s+(.+)$/i,
    map: (match: RegExpMatchArray) => ({
      sender: match[1].trim(),
      timestamp: match[2].trim(),
      text: match[3].trim(),
    }),
  },
  {
    pattern: /^(.{1,50}?)(?:\s+\[(.*?)\]|\s+\((.*?)\))?:\s+(.+)$/,
    map: (match: RegExpMatchArray) => ({
      sender: match[1].trim(),
      timestamp: match[2] || match[3] || undefined,
      text: match[4].trim(),
    }),
  },
] satisfies Array<{
  pattern: RegExp;
  map: (match: RegExpMatchArray) => { sender: string; timestamp?: string; text: string };
}>;

const NAME_LABEL_PATTERN = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .#/'\u2019()-]{0,49}$/u;
const SYSTEM_TIMESTAMP_PATTERN =
  /^\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s+-\s+(.+)$/i;
const INLINE_TIMESTAMP_PATTERN =
  /^\[(?:\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+)?\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]\s*/i;
const MEDIA_MESSAGE_PATTERN = /^(?:<media omitted>|this message was deleted\.?)$/i;

export function parseConversation(raw: string): ParseResult {
  const lines = raw
    .split('\n')
    .map((line) => line.replace(/^[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]+/, '').trim())
    .filter(Boolean);
  const messages: ParsedMessage[] = [];
  const labelCounts = new Map<string, number>();
  const seenSenders = new Set<string>();
  for (const line of lines) {
    const match = line.match(/^(.{1,50}):\s*(.*)$/);
    if (match && NAME_LABEL_PATTERN.test(match[1].trim())) {
      const label = match[1].trim().toLocaleLowerCase();
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }
  }
  let currentSender = '';
  let currentTimestamp: string | undefined;
  let buffer: string[] = [];
  let rawBuffer: string[] = [];
  let ignoredSystemLineCount = 0;
  let unparsedLineCount = 0;
  let unsupportedFormatContext = false;

  const flushBuffer = () => {
    if (buffer.length > 0 && currentSender) {
      messages.push({
        id: messages.length + 1,
        messageIndex: messages.length + 1,
        sender: currentSender,
        text: buffer.join('\n'),
        timestamp: currentTimestamp,
        raw: rawBuffer.join('\n'),
      });
      buffer = [];
      rawBuffer = [];
    }
  };

  for (const line of lines) {
    const formatMatch = MESSAGE_LINE_FORMATS
      .map((format) => ({ format, match: line.match(format.pattern) }))
      .find((entry) => entry.match);
    const parsed = formatMatch?.match ? formatMatch.format.map(formatMatch.match) : null;
    const isTimestampedFormat = formatMatch !== undefined &&
      formatMatch.format !== MESSAGE_LINE_FORMATS[MESSAGE_LINE_FORMATS.length - 1];

    if (parsed && isSystemMessage(parsed.text)) {
      flushBuffer();
      currentSender = '';
      currentTimestamp = undefined;
      ignoredSystemLineCount += 1;
      continue;
    }

    if (isUnsupportedTimestampHeaderLine(line)) {
      flushBuffer();
      currentSender = '';
      currentTimestamp = undefined;
      unparsedLineCount += 1;
      unsupportedFormatContext = true;
      messages.push({
        id: messages.length + 1,
        messageIndex: messages.length + 1,
        sender: 'Unknown',
        text: line,
        raw: line,
        unsupportedFormatContext: true,
      });
      continue;
    }

    if (parsed) {
      const normalizedLabel = parsed.sender.toLocaleLowerCase();
      const startsLikeTimestamp = INLINE_TIMESTAMP_PATTERN.test(parsed.sender);
      const isPlausibleSender = NAME_LABEL_PATTERN.test(parsed.sender);
      const isKnownSender = seenSenders.has(normalizedLabel);
      const appearsRepeated = (labelCounts.get(normalizedLabel) ?? 0) >= 2;
      const hasDistinctiveNamePunctuation = /[().#/'\u2019]/.test(parsed.sender);
      const isSingleName = (isUncasedWord(parsed.sender) ||
        /^[\p{Lu}][\p{Ll}\p{M}'\u2019-]*$/u.test(parsed.sender)) &&
        !/^(?:\d{1,2}(?:st|nd|rd|th)?\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}(?:st|nd|rd|th)?)\b/i.test(parsed.text);

      if (!isTimestampedFormat && !startsLikeTimestamp &&
        (!isPlausibleSender || (!isKnownSender && !appearsRepeated && !isSingleName && !hasDistinctiveNamePunctuation))) {
        if (currentSender) {
          buffer.push(line);
          rawBuffer.push(line);
        } else {
          unparsedLineCount += 1;
          messages.push({
            id: messages.length + 1,
            messageIndex: messages.length + 1,
            sender: 'Unknown',
            text: line,
            raw: line,
            unsupportedFormatContext,
          });
        }
        continue;
      }

      if (MEDIA_MESSAGE_PATTERN.test(parsed.text)) {
        flushBuffer();
        currentSender = '';
        currentTimestamp = undefined;
        ignoredSystemLineCount += 1;
        continue;
      }

      flushBuffer();
      currentSender = parsed.sender;
      currentTimestamp = parsed.timestamp;
      unsupportedFormatContext = false;
      seenSenders.add(normalizedLabel);
      buffer = [parsed.text];
      rawBuffer = [line];
      continue;
    }

    const timestampSystemMatch = line.match(SYSTEM_TIMESTAMP_PATTERN);
    if (timestampSystemMatch && !/^[^:]{1,80}:\s+/.test(timestampSystemMatch[1])) {
      flushBuffer();
      currentSender = '';
      currentTimestamp = undefined;
      ignoredSystemLineCount += 1;
      continue;
    }

    if (isSystemMessage(line)) {
      flushBuffer();
      currentSender = '';
      currentTimestamp = undefined;
      ignoredSystemLineCount += 1;
      continue;
    }

    if (currentSender) {
      buffer.push(line);
      rawBuffer.push(line);
    } else {
      unparsedLineCount += 1;
      messages.push({
        id: messages.length + 1,
        messageIndex: messages.length + 1,
        sender: 'Unknown',
        text: line,
        raw: line,
        unsupportedFormatContext,
      });
    }
  }
  flushBuffer();

  return {
    messages,
    ignoredSystemLineCount,
    unparsedLineCount,
    totalLineCount: lines.length,
  };
}

function isSystemMessage(text: string): boolean {
  return SYSTEM_LINE_PATTERNS.some((pattern) => pattern.test(text));
}

function isUnsupportedTimestampHeaderLine(line: string): boolean {
  return /^[^,]{1,50},\s*\[\d{1,2}[./]\d{1,2}[./]\d{2,4}\s+\d{1,2}:\d{2}\]$/.test(line) ||
    /^[\p{L}\p{N}][\p{L}\p{N} .'-]{0,49}\s{2,}\d{1,2}:\d{2}\s*(?:AM|PM)?$/iu.test(line);
}

function isUncasedWord(value: string): boolean {
  return !/[\p{Lu}\p{Ll}]/u.test(value) && /^[\p{L}\p{M}'\u2019-]+$/u.test(value);
}

export function isUnsupportedTimestampHeader(message: ParsedMessage): boolean {
  return message.sender === 'Unknown' && isUnsupportedTimestampHeaderLine(message.text);
}

export function isUnattributedLabelLine(message: ParsedMessage): boolean {
  return message.sender === 'Unknown' &&
    /:\s/.test(message.text) &&
    !/^\s*TODO\s*:/i.test(message.text) &&
    !/^\s*please\b/i.test(message.text);
}

export function parseMessages(raw: string): ParsedMessage[] {
  return parseConversation(raw).messages;
}
