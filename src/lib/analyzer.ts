export interface ParsedMessage {
  id: number;
  sender: string;
  text: string;
  timestamp?: string;
  raw: string;
}

export interface UrgentItem {
  id: string;
  title: string;
  reason: string;
  snippet: string;
  sender: string;
  timestamp?: string;
  confidence: 'high' | 'medium';
}

export interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  assigneeIsUser: boolean;
  deadline?: string;
  snippet: string;
  sender: string;
  timestamp?: string;
  confidence: 'explicit' | 'inferred';
}

export interface DecisionItem {
  id: string;
  decision: string;
  snippet: string;
  sender: string;
  timestamp?: string;
}

export interface DateItem {
  id: string;
  event: string;
  date: string;
  type: 'deadline' | 'meeting' | 'event' | 'reminder';
  snippet: string;
  sender: string;
  timestamp?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  snippet: string;
  sender: string;
  timestamp?: string;
  buriedReason: string;
}

export interface MentionItem {
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
  /\b(?:take care of|handle|prepare|finish|complete|submit|send|post|update|write|create|review|check|book|reserve|order)\b/i,
  /\b@(\w+)/i,
];

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
  /\bokay so\b/i,
  /\bso we'?ll\b/i,
  /\bwe'?l+ use\b/i,
  /\bthat works\b/i,
  /\bsounds good\b/i,
  /\bperfect\b/i,
  /\bgreat idea\b/i,
];

const ANNOUNCEMENT_MARKERS = [
  /\bFYI\b/i,
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
  /\bhaha\b/i,
  /\blol\b/i,
  /\blmao\b/i,
  /\bomg\b/i,
  /\byeah\b/i,
  /\bsure\b/i,
  /\bok\b/i,
  /\bcool\b/i,
  /\bnice\b/i,
  /\bdope\b/i,
  /\bsame\b/i,
  /\bfr\b/i,
  /\bno? cap\b/i,
  /\bword\b/i,
  /\bwow\b/i,
  /\bahhh?\b/i,
  /^\s*(?:ok|okay|sure|yeah|yep|yup|no|yay|nice|cool|lol|haha|same|fr|agreed|sounds good|got it|noted)\s*[!.?]*\s*$/i,
];

// Day/Date extraction patterns
const DATE_PATTERNS: RegExp[] = [
  /\b(?:by|before|on|due|deadline(?:\s+is)?(?:\s+by)?)\s+(?:this\s+|next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\b(?:by|before|on|due)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi,
  /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g,
  /\b(?:today|tomorrow|tonight|this (?:morning|afternoon|evening|week|weekend))\b/gi,
  /\bnext week\b/gi,
  /\bend of (?:day|week|class|tomorrow)\b/gi,
  /\b(?:at|@)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi,
  /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi,
  /\b(?:rescheduled|moved|changed)\s+to\b/gi,
];

const TIME_CHANGE_MARKERS = [
  /\bmoved\b/i,
  /\breschedul/i,
  /\bchanged\b/i,
  /\bnew time\b/i,
  /\binstead of\b/i,
  /\bnot at\b/i,
  /\bnow at\b/i,
  /\boriginally\b/i,
];

let idCounter = 0;
const nextId = () => `item_${++idCounter}`;

/**
 * Parse raw pasted text into individual messages.
 * Supports common chat export formats: "Name: text", "Name [time]: text",
 * "Name (time): text", WhatsApp-style "Name, time - text", and plain lines.
 */
export function parseMessages(raw: string): ParsedMessage[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const messages: ParsedMessage[] = [];
  let currentSender = '';
  let currentText = '';
  let currentTimestamp: string | undefined;
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length > 0 && currentSender) {
      messages.push({
        id: messages.length + 1,
        sender: currentSender,
        text: buffer.join(' '),
        timestamp: currentTimestamp,
        raw: `${currentSender}: ${buffer.join(' ')}`,
      });
      buffer = [];
    }
  };

  // Pattern: "Name: message" or "Name [timestamp]: message" or "Name (timestamp): message"
  const senderLinePattern = /^([A-Za-z][A-Za-z0-9_\-. ]{0,30}?)\s*(?:\[(.*?)\]|\((.*?)\))?\s*:\s+(.+)$/;
  // WhatsApp-style: "Name, 12/5/24, 3:45 PM - message" or "Name - message"
  const whatsappPattern = /^([A-Za-z][A-Za-z0-9_\-. ]{0,30}?),\s+\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–]\s+(.+)$/i;

  for (const line of lines) {
    const waMatch = line.match(whatsappPattern);
    const smMatch = !waMatch ? line.match(senderLinePattern) : null;

    if (waMatch) {
      flushBuffer();
      currentSender = waMatch[1].trim();
      currentText = waMatch[2].trim();
      currentTimestamp = undefined;
      messages.push({
        id: messages.length + 1,
        sender: currentSender,
        text: currentText,
        raw: line,
      });
      buffer = [];
    } else if (smMatch) {
      flushBuffer();
      currentSender = smMatch[1].trim();
      currentTimestamp = smMatch[2] || smMatch[3] || undefined;
      currentText = smMatch[4].trim();
      buffer = [currentText];
    } else if (currentSender) {
      // Continuation of previous message
      buffer.push(line);
    } else {
      // No sender detected — treat as anonymous
      messages.push({
        id: messages.length + 1,
        sender: 'Unknown',
        text: line,
        raw: line,
      });
    }
  }
  flushBuffer();

  return messages;
}

function extractDates(text: string): string[] {
  const found: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    const m = pattern.exec(text);
    if (m) {
      found.push(m[0].trim());
    }
  }
  return found;
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

function summarizeMessages(messages: ParsedMessage[], participants: string[]): string {
  const nonCasual = messages.filter((m) => !isCasual(m.text));
  const total = messages.length;
  const noiseCount = total - nonCasual.length;

  const topics: string[] = [];

  // Detect topic keywords from non-casual messages
  const topicWords = nonCasual
    .map((m) => m.text.toLowerCase())
    .join(' ');

  if (/\bpresent(?:ation)?\b/i.test(topicWords)) topics.push('a presentation');
  if (/\bmeeting\b/i.test(topicWords)) topics.push('an upcoming meeting');
  if (/\bdeadline\b/i.test(topicWords)) topics.push('a deadline');
  if (/\bsubmi(?:ssion|t)\b/i.test(topicWords)) topics.push('a submission');
  if (/\bproject\b/i.test(topicWords)) topics.push('the project');
  if (/\bexam\b|quiz|test\b/i.test(topicWords)) topics.push('an exam');
  if (/\bslide/i.test(topicWords)) topics.push('slides');
  if (/\breport\b/i.test(topicWords)) topics.push('a report');
  if (/\bcode|repo|github|git\b/i.test(topicWords)) topics.push('code/repository work');
  if (/\bgrade|grading|rubric/i.test(topicWords)) topics.push('grading details');

  const topicStr =
    topics.length > 0
      ? topics.slice(0, 4).join(', ')
      : 'the ongoing discussion';

  const participantStr =
    participants.length <= 3
      ? participants.join(', ')
      : `${participants.slice(0, 3).join(', ')} and ${participants.length - 3} other${participants.length - 3 > 1 ? 's' : ''}`;

  let summary = `This conversation involves ${participantStr} discussing ${topicStr}. `;

  if (noiseCount > total * 0.3) {
    summary += `About ${Math.round((noiseCount / total) * 100)}% of the ${total} messages are casual chatter — you didn't miss much by skipping them. `;
  } else {
    summary += `Out of ${total} messages, most contain substantive content. `;
  }

  // Add key highlights
  const highlights: string[] = [];
  if (nonCasual.some((m) => TIME_CHANGE_MARKERS.some((p) => p.test(m.text)))) {
    highlights.push('a schedule change');
  }
  if (nonCasual.some((m) => /\bdeadline\b/i.test(m.text))) {
    highlights.push('a deadline');
  }
  if (nonCasual.some((m) => DECISION_MARKERS.some((p) => p.test(m.text)))) {
    highlights.push('a group decision');
  }
  if (nonCasual.some((m) => /\bFYI\b|heads? up|announcement|professor/i.test(m.text))) {
    highlights.push('an important announcement');
  }

  if (highlights.length > 0) {
    summary += `The key things to know: ${highlights.join(', ')}. `;
  }

  summary += "Details are organized by category below — start with Urgent if you're short on time.";

  return summary;
}

export function analyzeConversation(
  raw: string,
  userName?: string
): BriefingResult {
  idCounter = 0;
  const messages = parseMessages(raw);
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

  for (const msg of messages) {
    const text = msg.text;

    // Skip pure casual messages for everything except explicit @mentions
    const casual = isCasual(text);
    const hasMention = /@(\w+)/i.test(text);

    // --- URGENT ---
    if (!casual && matchesAny(text, URGENCY_MARKERS)) {
      const key = text.slice(0, 60);
      if (!seenUrgent.has(key)) {
        seenUrgent.add(key);
        const marker = URGENCY_MARKERS.find((p) => p.test(text));
        const reason = marker
          ? `Flagged as urgent: "${marker.source.replace(/[\\b]|\\|\(\?:|\(|\)|\?|\+|\[|\]|\{|}/g, '').trim()}"`
          : 'Contains time-sensitive language';
        urgent.push({
          id: nextId(),
          title: text.length > 120 ? text.slice(0, 117) + '…' : text,
          reason: reason.charAt(0).toUpperCase() + reason.slice(1),
          snippet: highlightSnippet(msg),
          sender: msg.sender,
          timestamp: msg.timestamp,
          confidence: matchesAny(text, [/deadline/i, /due/i, /today/i, /tonight/i, /asap/i, /overdue/i])
            ? 'high'
            : 'medium',
        });
      }
    }

    // --- ACTIONS ---
    if (!casual || hasMention) {
      const actionMatch = ACTION_VERBS.find((p) => p.test(text));
      if (actionMatch) {
        // Detect assignee
        const mentionMatch = text.match(/@(\w+)/);
        let assignee = '';
        let assigneeIsUser = false;

        if (mentionMatch) {
          assignee = mentionMatch[1];
          assigneeIsUser = userLower ? assignee.toLowerCase() === userLower : true;
        } else if (userLower && new RegExp(`\\b${userLower}\\b`, 'i').test(text)) {
          assignee = userName!;
          assigneeIsUser = true;
        } else if (/\b(?:you|your)\b/i.test(text) && userLower) {
          assignee = userName!;
          assigneeIsUser = true;
        } else if (/(?:I'll|I will)/i.test(text)) {
          assignee = msg.sender;
          assigneeIsUser = userLower ? msg.sender.toLowerCase() === userLower : false;
        }

        // Extract deadline from the message
        const dateMatches = extractDates(text);
        const deadline = dateMatches.length > 0 ? dateMatches[0] : undefined;

        const key = text.slice(0, 50) + assignee;
        if (!seenAction.has(key) && (assigneeIsUser || !userLower || hasMention)) {
          seenAction.add(key);
          actions.push({
            id: nextId(),
            task: text.length > 150 ? text.slice(0, 147) + '…' : text,
            assignee: assignee || msg.sender,
            assigneeIsUser,
            deadline,
            snippet: highlightSnippet(msg),
            sender: msg.sender,
            timestamp: msg.timestamp,
            confidence: actionMatch.source.includes('please') || actionMatch.source.includes('need') || actionMatch.source.includes('assign')
              ? 'explicit'
              : 'inferred',
          });
        }
      }
    }

    // --- DECISIONS ---
    if (!casual && matchesAny(text, DECISION_MARKERS)) {
      const key = text.slice(0, 60);
      if (!seenDecision.has(key)) {
        seenDecision.add(key);
        // Try to extract the actual decision
        let decisionText = text;
        const goWithMatch = text.match(/(?:let'?s go with|we'?l+ go with|going with|we chose|decided (?:on|to))\s+(.+)/i);
        if (goWithMatch) {
          decisionText = goWithMatch[1];
        }
        decisions.push({
          id: nextId(),
          decision: decisionText.length > 150 ? decisionText.slice(0, 147) + '…' : decisionText,
          snippet: highlightSnippet(msg),
          sender: msg.sender,
          timestamp: msg.timestamp,
        });
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
        let event = text.length > 100 ? text.slice(0, 97) + '…' : text;

        dates.push({
          id: nextId(),
          event,
          date: dateStr,
          type,
          snippet: highlightSnippet(msg),
          sender: msg.sender,
          timestamp: msg.timestamp,
        });
      }
    }

    // --- MENTIONS ---
    if (hasMention) {
      const mentionMatches = text.matchAll(/@(\w+)/g);
      for (const m of mentionMatches) {
        const mentioned = m[1];
        const isUser = userLower ? mentioned.toLowerCase() === userLower : false;
        const key = mentioned + text.slice(0, 40);
        if (!seenMention.has(key)) {
          seenMention.add(key);
          mentions.push({
            id: nextId(),
            mentionedUser: mentioned,
            isUser,
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
      const isAlreadyUrgent = urgent.some((u) => u.snippet === highlightSnippet(msg));
      if (!isAlreadyUrgent) {
        announcements.push({
          id: nextId(),
          title: text.length > 120 ? text.slice(0, 117) + '…' : text,
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

  const summary = summarizeMessages(messages, participants);

  return {
    summary,
    messageCount: messages.length,
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
