export interface ParsedMessage {
  id: number;
  messageIndex: number;
  sender: string;
  text: string;
  timestamp?: string;
  raw: string;
}

export type ItemStatus = 'confirmed' | 'tentative';

interface EvidenceFields {
  messageIndex: number;
  matchedCues: string[];
  status: ItemStatus;
}

export interface UrgentItem {
  id: string;
  messageIndex: number;
  title: string;
  reason: string;
  matchedCues: string[];
  status: ItemStatus;
  snippet: string;
  sender: string;
  timestamp?: string;
  confidence: 'high' | 'medium';
}

export interface ActionItem {
  id: string;
  messageIndex: number;
  task: string;
  assignee: string;
  assigneeIsUser: boolean;
  deadline?: string;
  snippet: string;
  sender: string;
  timestamp?: string;
  confidence: 'explicit' | 'inferred';
  matchedCues: string[];
  status: ItemStatus;
}

export interface DecisionItem extends EvidenceFields {
  id: string;
  decision: string;
  rejectedOptions: string[];
  snippet: string;
  sender: string;
  timestamp?: string;
}

export interface DateItem extends EvidenceFields {
  id: string;
  event: string;
  date: string;
  type: 'deadline' | 'meeting' | 'event' | 'reminder';
  snippet: string;
  sender: string;
  timestamp?: string;
  note?: string;
}

export interface AnnouncementItem extends EvidenceFields {
  id: string;
  title: string;
  snippet: string;
  sender: string;
  timestamp?: string;
  buriedReason: string;
}

export interface MentionItem extends EvidenceFields {
  id: string;
  mentionedUser: string;
  isUser: boolean;
  context: string;
  snippet: string;
  sender: string;
  timestamp?: string;
}

export interface BriefingResult {
  summary: string;
  messageCount: number;
  totalLineCount: number;
  ignoredSystemLineCount: number;
  unparsedLineCount: number;
  participantCount: number;
  participants: string[];
  urgent: UrgentItem[];
  actions: ActionItem[];
  decisions: DecisionItem[];
  dates: DateItem[];
  announcements: AnnouncementItem[];
  mentions: MentionItem[];
  processedAt: string;
}

export interface ParseResult {
  messages: ParsedMessage[];
  ignoredSystemLineCount: number;
  unparsedLineCount: number;
  totalLineCount: number;
}

const URGENCY_MARKERS = [
  /\burgent\b/i,
  /\basap\b/i,
  /\bimmediately\b/i,
  /\bright now\b/i,
  /\bdeadline\b/i,
  /\bdue\b/i,
  /\boverdue\b/i,
  /\bcritical\b/i,
  /\bimportant\b/i,
  /\bemergency\b/i,
  /\bneeds? (to be )?done\b/i,
  /\bmust\b/i,
  /\bnot optional\b/i,
  /\bfinal (call|chance|reminder)\b/i,
  /\blast (call|chance|reminder)\b/i,
  /\btonight\b/i,
  /\btoday\b/i,
  /\bby (end of )?(today|tomorrow|tonight|eod)\b/i,
  /\bbefore (class|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday)\b/i,
];

const ACTION_VERBS = [
  /\b(?:need|needs)\s+(?:you\s+)?to\b/i,
  /\b(?:can|could)\s+you\b/i,
  /\bwil+ you\b/i,
  /\bplease\b/i,
  /\b(?:I'll|I will)\b/i,
  /\bassign(?:ed)?\s+(?:to\s+)?(?:you|@?\w+)\b/i,
  /\b(?:you|@?\w+)\s+(?:should|need to|have to|must)\b/i,
  /\b(?:your|@?\w+'s)\s+(?:turn|responsibility|job|task)\b/i,
  /\b(?:take care of|handle|prepare|finish|complete|submit|send|post|update|write|create|review|check|book|reserve|order|fix)\b/i,
];

const TASK_VERB_SOURCE =
  String.raw`(?:take care of|handle|prepare|finish|complete|submit|send|post|update|write|create|review|check|book|reserve|order|confirm|share|upload)`;

const DECISION_MARKERS = [
  /\blet'?s go with\b/i,
  /\bdecided\b/i,
  /\bwe'?l+ go with\b/i,
  /\bagreed?\b/i,
  /\bso we'?re doing\b/i,
  /\bfinal decision\b/i,
  /\bthat'?s settled\b/i,
  /\bconsensus\b/i,
  /\blocked in\b/i,
  /\bgoing with\b/i,
  /\bwe chose\b/i,
  /\bvoted?\b/i,
  /\b unanimous\b/i,
  /\bso we'?ll\b/i,
  /\bwe'?l+ use\b/i,
];

// Tentative/question phrases that should NOT be treated as decisions
const NON_DECISION_MARKERS = [
  /\bshould we\b/i,
  /\bdo you want\b/i,
  /\bwhat if\b/i,
  /\bmaybe\b/i,
  /\bpossibly\b/i,
  /\bconsider\b/i,
  /\bthink about\b/i,
  /\bnot sure\b/i,
  /\buncertain\b/i,
  /\bdecided\s+against\b/i,
  /\b(?:reject(?:ed|ing)?|ruled out|vetoed)\b/i,
  /\b(?:don't|do not|didn't|did not)\s+agree\b/i,
  /\b(?:don't|do not|didn't|did not|won't|will not)\s+(?:go with|choose|use|select|adopt)\b/i,
  /\b(?:not|never)\s+(?:go(?:ing)?|choose|use|select|adopt)\s+(?:with\s+)?\w+/i,
  /\?\s*$/m, // Ends with question mark
];

const ANNOUNCEMENT_MARKERS = [
  /\bFYI\b/i,
  /\bplease note\b/i,
  /\bheads? up\b/i,
  /\bannouncement\b/i,
  /\bnote? (that|for)\b/i,
  /\bjust so (everyone|you all|you guys) know/i,
  /\breminder\b/i,
  /\beveryone (needs? to|should|must)\b/i,
  /\bprofessor\b/i,
  /\bgrading\b/i,
  /\bsyllabus\b/i,
  /\brubric\b/i,
  /\battendance\b/i,
];

const CASUAL_MARKERS = [
  /^\s*(?:haha|lol|lmao|omg|yeah|sure|ok|okay|cool|nice|dope|same|fr|no? cap|word|wow|ahhh?|yep|yup|no|yay|agreed|sounds good|got it|noted)\s*[!.?]*\s*$/i,
];

// Day/Date extraction patterns
const DATE_PATTERNS: RegExp[] = [
  /\bdeadline(?:\s+is)?(?:\s+by)?\s+(?:(?:this|next)\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight))?\b/gi,
  /\b(?:(?:by|before|on|due)\s+)?(?:this\s+|next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight))?\b/gi,
  /\b(?:by|before|on|due)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi,
  /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)(?:\s*,?\s*\d{4})?\b/gi,
  /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g,
  /\b(?:today|tomorrow|tonight)(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight))\b/gi,
  /\b(?:today|tomorrow|tonight|this (?:morning|afternoon|evening|week|weekend))\b/gi,
  /\bnext week\b/gi,
  /\bend of (?:day|week|class|tomorrow)\b/gi,
  /\b(?:at\s+)?\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi,
  /\b\d{1,2}\s*(?:am|pm)\b/gi,
];

const TENTATIVE_CUES = [
  /\bmaybe\b/i,
  /\bmight\b/i,
  /\bperhaps\b/i,
  /\bprobably\b/i,
  /\bi think\b/i,
  /\bnot sure\b/i,
  /\btbd\b/i,
  /\bif\b/i,
  /\bshould we\b/i,
  /\?/,
];

const EXPLICIT_ACTION_CUES = [
  /\bplease\b/i,
  /\bneed(?:s)?\s+(?:you\s+)?to\b/i,
  /\bassign(?:ed)?\b/i,
  /\bcan you\b/i,
  /\bcould you\b/i,
];

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

let idCounter = 0;
const nextId = () => `item_${++idCounter}`;

/**
 * Parse raw pasted text into individual messages.
 * Supports "Name: text", "Name [time]: text", "Name (time): text",
 * WhatsApp Android timestamp-first and legacy lines, iOS bracketed lines,
 * and plain lines.
 * Supports Unicode sender names.
 */
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
      messages.push({
        id: messages.length + 1,
        messageIndex: messages.length + 1,
        sender: 'Unknown',
        text: line,
        raw: line,
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

function isUnsupportedTimestampHeader(message: ParsedMessage): boolean {
  return message.sender === 'Unknown' && isUnsupportedTimestampHeaderLine(message.text);
}

function isUnattributedLabelLine(message: ParsedMessage): boolean {
  return message.sender === 'Unknown' &&
    /:\s/.test(message.text) &&
    !/^\s*TODO\s*:/i.test(message.text) &&
    !/^\s*please\b/i.test(message.text);
}

export function parseMessages(raw: string): ParsedMessage[] {
  return parseConversation(raw).messages;
}

export function formatUnparsedLineWarning(lineCount: number): string {
  return `${lineCount} lines weren't recognized as messages. Supported: Name: message, WhatsApp Android, WhatsApp iOS.`;
}

function extractDates(text: string): string[] {
  const found: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = match[0]
        .trim()
        .replace(/[.,;!?]+$/, '')
        .replace(/^deadline(?:\s+is)?(?:\s+by)?\s+/i, '');
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
  return unique.filter(
    (value) =>
      !unique.some(
        (other) =>
          other.length > value.length &&
          other.toLowerCase().includes(value.toLowerCase())
      )
  );
}

function isTentative(text: string): boolean {
  return TENTATIVE_CUES.some((cue) => cue.test(text));
}

function matchedCues(text: string, patterns: RegExp[]): string[] {
  return patterns.flatMap((pattern) => {
    const match = text.match(pattern);
    return match?.[0] ? [match[0].trim().toLocaleLowerCase()] : [];
  });
}

function isCasual(text: string): boolean {
  return CASUAL_MARKERS.some((p) => p.test(text));
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function highlightSnippet(message: ParsedMessage, keyword?: string): string {
  if (keyword && keyword.length > 0) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = message.text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts
      .map((p) =>
        p.toLowerCase() === keyword.toLowerCase()
          ? `**${p}**`
          : p
      )
      .join('');
  }
  return message.text;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findNameDirectedAssignee(text: string, names: string[]): string | undefined {
  const reservedNames = new Set(['please', 'can', 'could', 'would', 'will', 'should', 'someone']);
  const candidates = [...new Set(names)]
    .filter((name) => name && !reservedNames.has(name.toLowerCase()))
    .sort((a, b) => b.length - a.length);

  for (const name of candidates) {
    const pattern = new RegExp(
      `^\\s*(?:@?${escapeRegExp(name)}(?:\\s*,\\s*|\\s+)(?:(?:can|could)\\s+you\\s+|please\\s+)?|please\\s*,\\s*@?${escapeRegExp(name)}\\s*,\\s*)(?:please\\s+)?${TASK_VERB_SOURCE}\\b`,
      'iu'
    );
    if (pattern.test(text)) return name;
  }
  return undefined;
}

function getDecisionClauses(text: string): Array<{ decision: string; rejectedOptions: string[]; status: ItemStatus }> {
  const clauses = text.split(/[,;.]|\bbut\b/i).map((clause) => clause.trim()).filter(Boolean);
  const rejectedOptions = [...text.matchAll(
    /\b(?:not going with|not to go with|let'?s not go with|decided against|rejected|ruled out|vetoed)\s+([^,.;!?]+)/gi
  )].map((match) => match[1].trim());
  const decisions: Array<{ decision: string; rejectedOptions: string[]; status: ItemStatus }> = [];
  for (const clause of clauses) {
    const affirmativeMatch = clause.match(/\b(?:we are|we're)\s+going with\s+([^,.!?]+?)(?:\s+instead)?$/i);
    const rejected = NON_DECISION_MARKERS.some((pattern) => pattern.test(clause)) ||
      /\b(?:not|never)\s+(?:going|go|choose|use|select|adopt)\b/i.test(clause);
    if (rejected || (!matchesAny(clause, DECISION_MARKERS) && !affirmativeMatch)) continue;

    const decision = affirmativeMatch ? `Going with ${affirmativeMatch[1].trim()}` : clause;
    decisions.push({
      decision,
      rejectedOptions: [...rejectedOptions],
      status: isTentative(clause) ? 'tentative' : 'confirmed',
    });
  }
  if (decisions.length === 0 && rejectedOptions.length > 0) {
    decisions.push({
      decision: '',
      rejectedOptions,
      status: isTentative(text) ? 'tentative' : 'confirmed',
    });
  }
  return decisions;
}

export function analyzeConversation(
  raw: string,
  userName?: string
): BriefingResult {
  idCounter = 0;
  const parsedConversation = parseConversation(raw);
  const messages = parsedConversation.messages;
  const participants = [...new Set(messages.map((m) => m.sender))];
  const userLower = userName?.trim().toLowerCase();

  const urgent: UrgentItem[] = [];
  const actions: ActionItem[] = [];
  const decisions: DecisionItem[] = [];
  const dates: DateItem[] = [];
  const announcements: AnnouncementItem[] = [];
  const mentions: MentionItem[] = [];

  const seenUrgent = new Set<string>();
  const seenDecision = new Set<string>();
  const seenAction = new Set<string>();
  const seenMention = new Set<string>();
  const urgentTexts = new Set<string>();

  for (const msg of messages) {
    const text = msg.text;
    if (isUnsupportedTimestampHeader(msg) || isUnattributedLabelLine(msg)) continue;

    // Skip pure casual messages for everything except explicit @mentions
    const casual = isCasual(text);
    const hasMention = /@(\w+)/i.test(text);

    // --- URGENT ---
    if (!casual && matchesAny(text, URGENCY_MARKERS)) {
      const key = text.slice(0, 60);
      if (!seenUrgent.has(key)) {
        seenUrgent.add(key);
        urgent.push({
          id: nextId(),
          messageIndex: msg.messageIndex,
          title: text.length > 120 ? text.slice(0, 117) + '…' : text,
          reason: 'Contains time-sensitive or urgent language',
          matchedCues: matchedCues(text, URGENCY_MARKERS),
          status: isTentative(text) ? 'tentative' : 'confirmed',
          snippet: highlightSnippet(msg),
          sender: msg.sender,
          timestamp: msg.timestamp,
          confidence: matchesAny(text, [/deadline/i, /due/i, /today/i, /tonight/i, /asap/i, /overdue/i])
            ? 'high'
            : 'medium',
        });
        urgentTexts.add(text);
      }
    }

    // --- ACTIONS ---
    if (!casual || hasMention) {
      const actionMatch = ACTION_VERBS.find((p) => p.test(text));
      if (actionMatch) {
        // Detect assignee - only assign when there's explicit evidence
        const mentionMatch = text.match(/@(\w+)/);
        let assignee = '';
        let assigneeIsUser = false;

        if (mentionMatch) {
          assignee = mentionMatch[1];
          assigneeIsUser = userLower ? assignee.toLowerCase() === userLower : false;
        } else if (/(?:I'll|I will)\b/i.test(text)) {
          assignee = msg.sender;
          assigneeIsUser = userLower ? msg.sender.toLowerCase() === userLower : false;
        } else {
          const nameDirectedAssignee = findNameDirectedAssignee(text, [...participants, userName ?? '']);
          const senderTaskMatch = new RegExp(`^\\s*(?:(?:please|maybe)\\s+)?${TASK_VERB_SOURCE}\\b`, 'i').test(text);
          if (nameDirectedAssignee) {
            assignee = nameDirectedAssignee;
            assigneeIsUser = userLower ? assignee.toLowerCase() === userLower : false;
          } else if (senderTaskMatch && userLower === msg.sender.toLowerCase()) {
            assignee = msg.sender;
            assigneeIsUser = true;
          }
        }

        const hasUnassignedInstruction =
          /^\s*TODO\s*:/i.test(text) ||
          /^\s*please\s+send\b/i.test(text);
        const unnamedRequest = text.match(
          /^\s*([\p{Lu}][\p{L}\p{M}'\u2019-]*)\s*,\s*(?:can|could)\s+you\s+/u
        );
        if (!assignee && unnamedRequest) assignee = unnamedRequest[1];
        if (!assignee && hasUnassignedInstruction) assignee = 'Unassigned';

        if (assignee) {
          const dateMatches = extractDates(text);
          const deadline = dateMatches.length > 0 ? dateMatches[0] : undefined;

          const key = text.slice(0, 50) + assignee;
          if (!seenAction.has(key)) {
            seenAction.add(key);
            let task = text
              .replace(/^\s*TODO\s*:\s*/i, '')
              .replace(/^\s*please\s+/i, '')
              .replace(/^\s*[\p{Lu}][\p{L}\p{M}'\u2019-]*\s*,\s*(?:can|could)\s+you\s+/iu, '');
            if (deadline) task = task.replace(deadline, '');
            task = task
              .replace(/[.!?]+\s*$/, '')
              .trim();
            actions.push({
              id: nextId(),
              messageIndex: msg.messageIndex,
              task: task.length > 150 ? task.slice(0, 147) + '…' : task,
              assignee,
              assigneeIsUser,
              deadline,
              snippet: highlightSnippet(msg),
              sender: msg.sender,
              timestamp: msg.timestamp,
              confidence: EXPLICIT_ACTION_CUES.some((cue) => cue.test(text))
                ? 'explicit'
                : 'inferred',
              matchedCues: matchedCues(text, ACTION_VERBS),
              status: isTentative(text) ? 'tentative' : 'confirmed',
            });
          }
        }
      }
    }

    // --- DECISIONS ---
    const decisionClauses = getDecisionClauses(text);
    if (!casual && decisionClauses.length > 0) {
      const key = text.slice(0, 60);
      if (!seenDecision.has(key)) {
        seenDecision.add(key);
        for (const clause of decisionClauses) {
          decisions.push({
            id: nextId(),
            messageIndex: msg.messageIndex,
            decision: clause.decision.length > 150 ? clause.decision.slice(0, 147) + '…' : clause.decision,
            rejectedOptions: clause.rejectedOptions,
            matchedCues: matchedCues(text, DECISION_MARKERS),
            status: clause.status,
            snippet: highlightSnippet(msg),
            sender: msg.sender,
            timestamp: msg.timestamp,
          });
        }
      }
    }

    // --- DATES ---
    if (!casual) {
      const extractedDates = extractDates(text);
      for (const dateStr of extractedDates) {
        let type: DateItem['type'] = 'event';
        if (/deadline|due/i.test(text)) type = 'deadline';
        else if (/meeting|meet|zoom|call|catch up|standup/i.test(text)) type = 'meeting';
        else if (/reminder|don't forget|remember/i.test(text)) type = 'reminder';

        // Build event description
        const event = text.length > 100 ? text.slice(0, 97) + '…' : text;

        dates.push({
          id: nextId(),
          messageIndex: msg.messageIndex,
          matchedCues: matchedCues(text, DATE_PATTERNS),
          status: isTentative(text) ? 'tentative' : 'confirmed',
          event,
          date: dateStr,
          type,
          snippet: highlightSnippet(msg),
          sender: msg.sender,
          timestamp: msg.timestamp,
          note: /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(dateStr) &&
            Number(dateStr.split('/')[0]) <= 12 &&
            Number(dateStr.split('/')[1]) <= 12
            ? 'Ambiguous DD/MM or MM/DD'
            : undefined,
        });
      }
    }

    // --- MENTIONS ---
    const mentionNames = [
      ...[...text.matchAll(/@(\w+)/g)].map((match) => match[1]),
      ...participants
        .filter((name) => name.toLowerCase() !== msg.sender.toLowerCase())
        .filter((name) => new RegExp(`\\b${escapeRegExp(name)}\\s*,`, 'iu').test(text))
        .filter((name) => !new RegExp(`@${escapeRegExp(name)}\\b`, 'iu').test(text)),
    ];
    if (mentionNames.length > 0) {
      for (const mentioned of new Set(mentionNames)) {
        const isUser = userLower ? mentioned.toLowerCase() === userLower : false;
        const key = mentioned + text.slice(0, 40);
        if (!seenMention.has(key)) {
          seenMention.add(key);
          mentions.push({
            id: nextId(),
            messageIndex: msg.messageIndex,
            mentionedUser: mentioned,
            isUser,
            matchedCues: [`${mentioned},`],
            status: isTentative(text) ? 'tentative' : 'confirmed',
            context: text.length > 120 ? text.slice(0, 117) + '…' : text,
            snippet: highlightSnippet(msg, mentioned),
            sender: msg.sender,
            timestamp: msg.timestamp,
          });
        }
      }
    }

    // --- ANNOUNCEMENTS (buried important info) ---
    if (!casual && matchesAny(text, ANNOUNCEMENT_MARKERS)) {
      // Don't duplicate items already in urgent
      const isAlreadyUrgent = urgentTexts.has(text);
      if (!isAlreadyUrgent) {
        announcements.push({
          id: nextId(),
          messageIndex: msg.messageIndex,
          title: text.length > 120 ? text.slice(0, 117) + '…' : text,
          matchedCues: matchedCues(text, ANNOUNCEMENT_MARKERS),
          status: isTentative(text) ? 'tentative' : 'confirmed',
          snippet: highlightSnippet(msg),
          sender: msg.sender,
          timestamp: msg.timestamp,
          buriedReason: 'Surrounded by casual messages — easy to miss while scrolling.',
        });
      }
    }
  }

  // Sort urgent by confidence (high first)
  urgent.sort((a, b) => (a.confidence === 'high' ? -1 : 1) - (b.confidence === 'high' ? -1 : 1));

  // Put user's actions first
  actions.sort((a, b) => (a.assigneeIsUser === b.assigneeIsUser ? 0 : a.assigneeIsUser ? -1 : 1));

  // Put mentions of the user first
  mentions.sort((a, b) => (a.isUser === b.isUser ? 0 : a.isUser ? -1 : 1));

  const summary =
    `Analyzed ${messages.length} messages from ${participants.length} people (${participants.join(', ')}). ` +
    `Found ${urgent.length} urgent items, ${actions.length} tasks, ${decisions.length} decisions, ` +
    `${dates.length} dates, ${mentions.length} mentions and ${announcements.length} announcements.`;

  return {
    summary,
    messageCount: messages.length,
    totalLineCount: parsedConversation.totalLineCount,
    ignoredSystemLineCount: parsedConversation.ignoredSystemLineCount,
    unparsedLineCount: parsedConversation.unparsedLineCount,
    participantCount: participants.length,
    participants,
    urgent,
    actions,
    decisions,
    dates,
    announcements,
    mentions,
    processedAt: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}

export function formatBriefingForClipboard(result: BriefingResult, userName: string): string {
  const groups = new Map<string, ActionItem[]>();
  for (const action of result.actions) {
    const assignee = action.assignee || 'Unassigned';
    groups.set(assignee, [...(groups.get(assignee) ?? []), action]);
  }
  const orderedAssignees = [...groups.keys()].sort((left, right) => {
    const leftIsUser = Boolean(userName) && left.toLocaleLowerCase() === userName.trim().toLocaleLowerCase();
    const rightIsUser = Boolean(userName) && right.toLocaleLowerCase() === userName.trim().toLocaleLowerCase();
    return Number(rightIsUser) - Number(leftIsUser);
  });
  const renderLines = (items: string[]) => items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None';
  const renderActions = orderedAssignees.length > 0
    ? orderedAssignees.map((assignee) => (
      `${assignee}:\n${renderLines((groups.get(assignee) ?? []).map((action) =>
        `${action.task}${action.deadline ? ` (due: ${action.deadline})` : ''}`
      ))}`
    )).join('\n')
    : 'Unassigned:\n- None';
  const decisions = (status: ItemStatus) => renderLines(
    result.decisions
      .filter((decision) => decision.status === status)
      .map((decision) => {
        const selected = decision.decision || 'No confirmed option selected';
        return decision.rejectedOptions.length > 0
          ? `${selected} (rejected: ${decision.rejectedOptions.join(', ')})`
          : selected;
      })
  );

  return [
    'HUSHLINE BRIEFING',
    '',
    `Summary:\n${result.summary}`,
    `Urgent:\n${renderLines(result.urgent.map((item) => item.title))}`,
    `Actions grouped by assignee:\n${renderActions}`,
    `Decisions (confirmed):\n${decisions('confirmed')}`,
    `Decisions (tentative):\n${decisions('tentative')}`,
    `Dates:\n${renderLines(result.dates.map((item) => `${item.date}: ${item.event} (${item.status})`))}`,
    `Announcements:\n${renderLines(result.announcements.map((item) => item.title))}`,
    `Mentions:\n${renderLines(result.mentions.map((item) => `@${item.mentionedUser}: ${item.context}`))}`,
  ].join('\n\n');
}
