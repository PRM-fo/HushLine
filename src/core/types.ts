export interface ParsedMessage {
  id: number;
  messageIndex: number;
  sender: string;
  text: string;
  timestamp?: string;
  raw: string;
  unsupportedFormatContext?: boolean;
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

export type IdGenerator = () => string;

export interface ExtractorContext {
  message: ParsedMessage;
  participants: string[];
  userName?: string;
  nextId: IdGenerator;
}

export type Extractor<T> = (context: ExtractorContext) => T[];
