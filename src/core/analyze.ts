import type { ActionItem, AnnouncementItem, BriefingResult, DateItem, DecisionItem, ItemStatus, MentionItem, ParsedMessage, UrgentItem } from './types';
import { parseConversation, isUnsupportedTimestampHeader, isUnattributedLabelLine } from './parser.js';
import { extractActions } from './extractors/actions.js';
import { extractAnnouncements } from './extractors/announcements.js';
import { extractDates } from './extractors/dates.js';
import { extractDecisions } from './extractors/decisions.js';
import { extractMentions } from './extractors/mentions.js';
import { extractUrgency } from './extractors/urgency.js';
import { createIdGenerator } from './id.js';

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
  /\bby (end of )?(today|tomorrow|tonight|eod)\b/i,
  /\bbefore (class|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday)\b/i,
];

const ACTION_VERBS = [
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
  /\b(?:only a suggestion|just an idea|not final|not confirmed|unconfirmed|yet to be confirmed|not decided)\b/i,
  /\b(?:don't|do not|didn't|did not)\s+agree\b/i,
  /\b(?:don't|do not|didn't|did not|won't|will not)\s+(?:go with|choose|use|select|adopt)\b/i,
  /\b(?:not|never)\s+(?:go(?:ing)?|choose|use|select|adopt)\s+(?:with\s+)?\w+/i,
  /\?\s*$/m, // Ends with question mark
];

const CASUAL_MARKERS = [
  /^\s*(?:haha|lol|lmao|omg|yeah|sure|ok|okay|cool|nice|dope|same|fr|no? cap|word|wow|ahhh?|yep|yup|no|yay|agreed|sounds good|got it|noted)\s*[!.?]*\s*$/i,
];

// Day/Date extraction patterns
const DATE_PATTERNS: RegExp[] = [
  /\bdeadline(?:\s+is)?(?:\s+by)?\s+(?:(?:this|next)\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight))?\b/gi,
  /\b(?:(?:by|before|until|till|after|on|due)\s+)?(?:this\s+|next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight))?\b/gi,
  /\b(?:by|before|on|due)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi,
  /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)(?:\s*,?\s*\d{4})?\b/gi,
  /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g,
  /\b(?:today|tomorrow|tonight)(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight))\b/gi,
  /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:today|tomorrow|tonight)\b/gi,
  /\b(?:today|tomorrow|tonight|this (?:morning|afternoon|evening|week|weekend))\b/gi,
  /\bnext week\b/gi,
  /\bend of (?:day|week|class|tomorrow)\b/gi,
  /\b(?:at\s+)?\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi,
  /\b\d{1,2}\s*(?:am|pm)\b/gi,
  /\b(?:by|before|until|till|after|on|at)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi,
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

const UNCONFIRMED_CUES = [
  /\b(?:only a suggestion|just an idea|not final|not confirmed|unconfirmed|yet to be confirmed|not decided|tbd)\b/i,
];

const EXPLICIT_ACTION_CUES = [
  /\bplease\b/i,
  /\bneed(?:s)?\s+(?:you\s+)?to\b/i,
  /\bassign(?:ed)?\b/i,
  /\bcan you\b/i,
  /\bcould you\b/i,
];

function getOwnershipTask(
  text: string,
  participants: string[]
): { kind: 'self'; task: string } | { kind: 'named'; assignee: string; task: string } | undefined {
  const cleanTask = (value: string) =>
    value.replace(/^[\s:,-]+/, '').replace(/^(?:the|a|an)\s+/i, '').replace(/[.!?]+\s*$/, '').trim();
  const selfMatch = text.match(
    /^\s*(?:I own|I(?:'m| am) responsible for|I(?:'m| am) taking|I'll handle|I will handle|I'll take care of|I will take care of)\s+(.+?)\s*[.!?]*$/i
  );
  if (selfMatch) return { kind: 'self', task: cleanTask(selfMatch[1]) };

  const namedMatch = text.match(
    /^\s*([\p{Lu}][\p{L}\p{M}'’.-]+)\s+(?:will|is responsible for)\s+(.+?)\s*[.!?]*$/u
  );
  if (namedMatch) {
    const name = namedMatch[1];
    const reserved = new Set(['everyone', 'we', 'they', 'it']);
    const isParticipant = participants.some((participant) =>
      participant.toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (!reserved.has(name.toLocaleLowerCase()) && (isParticipant || /^\p{Lu}/u.test(name))) {
      return { kind: 'named', assignee: name, task: cleanTask(namedMatch[2]) };
    }
  }
  return undefined;
}

function isTentative(text: string): boolean {
  return TENTATIVE_CUES.some((cue) => cue.test(text)) ||
    UNCONFIRMED_CUES.some((cue) => cue.test(text));
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
      decision: rejectedOptions.length === 1
        ? `Not going with ${rejectedOptions[0]}`
        : `Rejected: ${rejectedOptions.join(', ')}`,
      rejectedOptions,
      status: isTentative(text) ? 'tentative' : 'confirmed',
    });
  } else if (decisions.length === 0 && UNCONFIRMED_CUES.some((cue) => cue.test(text))) {
    decisions.push({
      decision: text.trim(),
      rejectedOptions: [],
      status: 'tentative',
    });
  }
  return decisions;
}

export function analyzeConversation(
  raw: string,
  userName?: string
): BriefingResult {
  const nextId = createIdGenerator();
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
    if (isUnsupportedTimestampHeader(msg) || isUnattributedLabelLine(msg) ||
      msg.unsupportedFormatContext) continue;

    // Skip pure casual messages for everything except explicit @mentions
    const casual = isCasual(text);
    const hasMention = /@(\w+)/i.test(text);

    // --- URGENT ---
    const extractorContext = { message: msg, participants, userName, nextId };
    if (!casual && extractUrgency(extractorContext).length > 0) {
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
    if (
      (msg.sender !== 'Unknown' ||
        isExplicitUnassignedInstruction(text) ||
        isExplicitNameDirectedRequest(text)) &&
      (!casual || hasMention)
    ) {
      const ownerTask = getOwnershipTask(text, participants);
      const actionMatch = extractActions(extractorContext)[0];
      if (actionMatch || ownerTask) {
        // Detect assignee - only assign when there's explicit evidence
        const mentionMatch = text.match(/@(\w+)/);
        let assignee = '';
        let assigneeIsUser = false;

        if (mentionMatch) {
          assignee = mentionMatch[1];
          assigneeIsUser = userLower ? assignee.toLowerCase() === userLower : false;
        } else if (ownerTask?.kind === 'self') {
          assignee = msg.sender;
          assigneeIsUser = userLower ? msg.sender.toLowerCase() === userLower : false;
        } else if (ownerTask?.kind === 'named') {
          assignee = ownerTask.assignee;
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

        const hasUnassignedInstruction = isExplicitUnassignedInstruction(text);
        const unnamedRequest = text.match(
          /^\s*([\p{Lu}][\p{L}\p{M}'\u2019-]*)\s*,\s*(?:can|could)\s+you\s+/u
        );
        if (!assignee && unnamedRequest) assignee = unnamedRequest[1];
        if (!assignee && hasUnassignedInstruction) assignee = 'Unassigned';

        if (assignee) {
          const dateMatches = extractDates(extractorContext);
          const deadline = dateMatches.length > 0 ? dateMatches[0] : undefined;

          const key = text.slice(0, 50) + assignee;
          if (!seenAction.has(key)) {
            seenAction.add(key);
            let task = ownerTask?.task ?? text
              .replace(/^\s*TODO\s*:\s*/i, '')
              .replace(/^\s*please\s+/i, '')
              .replace(/^\s*[\p{Lu}][\p{L}\p{M}'\u2019-]*\s*,\s*(?:can|could)\s+you\s+/iu, '');
            if (deadline) task = task.replace(deadline, '');
            task = task
              .replace(/\b(?:by|before|on|at|until|till|after)\s*$/i, '')
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
            matchedCues: extractDecisions(extractorContext),
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
      const extractedDates = extractDates(extractorContext);
      const hasRelativeDayCue = /\b(?:due|deadline|by|before|until|till|meeting|meet|call|event|appointment|submit|send|finish|complete|confirm|will|i'll|i am going to|we will)\b/i.test(text);
      for (const dateStr of extractedDates) {
        if (/^(?:today|tomorrow|tonight)$/i.test(dateStr) && !hasRelativeDayCue) continue;
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
    const mentionNames = extractMentions(extractorContext);
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
    const announcementCues = extractAnnouncements(extractorContext);
    if (!casual && announcementCues.length > 0) {
      // Don't duplicate items already in urgent
      const isAlreadyUrgent = urgentTexts.has(text);
      if (!isAlreadyUrgent) {
        announcements.push({
          id: nextId(),
          messageIndex: msg.messageIndex,
          title: text.length > 120 ? text.slice(0, 117) + '…' : text,
          matchedCues: announcementCues,
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

function isExplicitUnassignedInstruction(text: string): boolean {
  return /^\s*TODO\s*:/i.test(text) ||
    new RegExp(`^\\s*please\\s+${TASK_VERB_SOURCE}\\b`, 'i').test(text);
}

function isExplicitNameDirectedRequest(text: string): boolean {
  return new RegExp(
    `^\\s*[\\p{Lu}][\\p{L}\\p{M}'’\\-]*,\\s*(?:can|could)\\s+you\\s+${TASK_VERB_SOURCE}\\b`,
    'iu'
  ).test(text);
}
