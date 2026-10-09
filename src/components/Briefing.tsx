import { useState } from 'react';
import {
  AlertTriangle,
  AtSign,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Check,
  Megaphone,
  FileText,
  Filter,
  Cpu,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import type { BriefingResult } from '@/lib/analyzer';

interface BriefingProps {
  result: BriefingResult;
  userName: string;
  onReset: () => void;
}

type Category = 'all' | 'urgent' | 'actions' | 'decisions' | 'dates' | 'mentions' | 'announcements';
type Priority = 'all' | 'high' | 'medium' | 'low';

const CATEGORIES: { key: Category; label: string; icon: typeof AlertTriangle }[] = [
  { key: 'all', label: 'All', icon: Filter },
  { key: 'urgent', label: 'Urgent', icon: AlertTriangle },
  { key: 'actions', label: 'Your Actions', icon: ClipboardList },
  { key: 'decisions', label: 'Decisions', icon: CheckCircle2 },
  { key: 'dates', label: 'Important Dates', icon: Calendar },
  { key: 'mentions', label: 'Mentions', icon: AtSign },
  { key: 'announcements', label: 'What You Missed', icon: Megaphone },
];

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'all', label: 'All priorities' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low / Info' },
];

function PriorityBadge({ level, label }: { level: 'high' | 'medium' | 'explicit' | 'inferred' | 'low'; label: string }) {
  const styles: Record<string, string> = {
    high: 'bg-gradient-to-r from-primary-500/30 to-secondary-500/30 text-primary-200 border border-primary-500/40',
    explicit: 'bg-gradient-to-r from-primary-400/25 to-secondary-400/25 text-primary-200 border border-primary-400/35',
    medium: 'bg-gradient-to-r from-secondary-500/25 to-primary-500/25 text-secondary-200 border border-secondary-500/35',
    inferred: 'bg-gradient-to-r from-text-muted/20 to-primary-400/20 text-text-muted border border-text-muted/30',
    low: 'bg-gradient-to-r from-text-muted/15 to-midnight-500/15 text-text-muted border border-text-muted/25',
  };
  return <span className={`priority-badge ${styles[level] || styles.low}`}>{label}</span>;
}

function SnippetBlock({ snippet, sender, timestamp }: { snippet: string; sender: string; timestamp?: string }) {
  const parts = snippet.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="mt-3 p-3 rounded-lg bg-gradient-to-br from-midnight-900/60 to-midnight-950/60 border border-primary-500/10">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-mono text-primary-300/80">{sender}</span>
        {timestamp && (
          <span className="text-xs text-text-muted font-mono">{timestamp}</span>
        )}
      </div>
      <p className="text-sm text-text-muted font-mono leading-relaxed">
        {parts.map((part, i) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <mark key={i} className="bg-gradient-to-r from-primary-500/30 to-secondary-500/30 text-primary-100 rounded px-0.5">
              {part.slice(2, -2)}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    </div>
  );
}

function DateBadge({ type }: { type: DateItem['type'] }) {
  const config: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    deadline: { label: 'Deadline', icon: Clock, color: 'text-primary-200 bg-gradient-to-r from-primary-500/25 to-secondary-500/25 border border-primary-500/35' },
    meeting: { label: 'Meeting', icon: Calendar, color: 'text-secondary-200 bg-gradient-to-r from-secondary-500/25 to-primary-500/25 border border-secondary-500/35' },
    event: { label: 'Event', icon: Calendar, color: 'text-primary-200 bg-gradient-to-r from-primary-400/25 to-secondary-400/25 border border-primary-400/35' },
    reminder: { label: 'Reminder', icon: AlertTriangle, color: 'text-text-muted bg-gradient-to-r from-text-muted/20 to-primary-400/20 border border-text-muted/30' },
  };
  const c = config[type] || config.event;
  const Icon = c.icon;
  return (
    <span className={`priority-badge ${c.color}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

type DateItem = BriefingResult['dates'][0];

function StatPill({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-midnight-800/60 to-midnight-900/60 border border-primary-500/15">
      <Icon className="w-4 h-4 text-primary-300" />
      <div className="flex flex-col">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-sm font-medium text-text-main">{value}</span>
      </div>
    </div>
  );
}

function UrgentCard({ item, priorityFilter }: { item: BriefingResult['urgent'][0]; priorityFilter: Priority }) {
  const priority = item.confidence;
  if (priorityFilter !== 'all' && priorityFilter !== priority) return null;
  return (
    <div className="glass-panel glass-panel-hover p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-text-main font-medium leading-snug">{item.title}</p>
        <PriorityBadge level={priority} label={priority === 'high' ? 'High priority' : 'Medium'} />
      </div>
      <p className="text-sm text-text-muted">{item.reason}</p>
      <SnippetBlock snippet={item.snippet} sender={item.sender} timestamp={item.timestamp} />
    </div>
  );
}

function ActionCard({ item, priorityFilter }: { item: BriefingResult['actions'][0]; priorityFilter: Priority }) {
  const priority: 'high' | 'medium' | 'low' =
    item.confidence === 'explicit' && item.deadline ? 'high' :
    item.confidence === 'explicit' ? 'medium' : 'low';
  if (priorityFilter !== 'all' && priorityFilter !== priority) return null;
  return (
    <div className="glass-panel glass-panel-hover p-4 lg:p-5 border-l-2 border-l-primary-500/40">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-text-main font-medium leading-snug">{item.task}</p>
        <PriorityBadge level={item.confidence === 'explicit' ? 'explicit' : 'inferred'} label={item.confidence === 'explicit' ? 'Explicitly assigned' : 'Inferred'} />
      </div>
      {item.deadline && (
        <div className="flex items-center gap-1.5 text-sm text-primary-300 mb-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Deadline: {item.deadline}</span>
        </div>
      )}
      <SnippetBlock snippet={item.snippet} sender={item.sender} timestamp={item.timestamp} />
    </div>
  );
}

export function Briefing({ result, userName, onReset }: BriefingProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority>('all');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedActions, setCopiedActions] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const userActions = result.actions.filter((a) => a.assigneeIsUser);
  const otherActions = result.actions.filter((a) => !a.assigneeIsUser);
  const userMentions = result.mentions.filter((m) => m.isUser);
  const otherMentions = result.mentions.filter((m) => !m.isUser);

  const copySummary = async () => {
    const text = `HUSHLINE BRIEFING\n\nSummary: ${result.summary}\n\nUrgent:\n${result.urgent.map((u) => `- ${u.title}`).join('\n')}\n\nActions for ${userName || 'you'}:\n${userActions.map((a) => `- ${a.task}${a.deadline ? ` (due: ${a.deadline})` : ''}`).join('\n')}\n\nDecisions:\n${result.decisions.map((d) => `- ${d.decision}`).join('\n')}\n\nDates:\n${result.dates.map((d) => `- ${d.date}: ${d.event}`).join('\n')}\n\nMentions:\n${result.mentions.map((m) => `- @${m.mentionedUser}: ${m.context}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setCopyError(null);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      setCopyError('Unable to copy the briefing. Check clipboard permissions and try again.');
    }
  };

  const copyActions = async () => {
    const text = userActions.length > 0
      ? `Your action items:\n${userActions.map((a) => `- ${a.task}${a.deadline ? ` (due: ${a.deadline})` : ''}`).join('\n')}`
      : 'No tasks assigned to you in this conversation.';
    try {
      await navigator.clipboard.writeText(text);
      setCopiedActions(true);
      setCopyError(null);
      setTimeout(() => setCopiedActions(false), 2000);
    } catch {
      setCopyError('Unable to copy action items. Check clipboard permissions and try again.');
    }
  };

  const showCategory = (cat: Category) => activeCategory === 'all' || activeCategory === cat;
  const showPriorityControls = activeCategory === 'all' || activeCategory === 'urgent' || activeCategory === 'actions';

  return (
    <section id="briefing" className="relative py-12 lg:py-20 scroll-mt-16 animate-fade-in-up" aria-label="Briefing results">
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-px bg-primary-500/40" />
              <span className="section-label">Step 02 — The Briefing</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-600 text-text-main">
              Your signal, extracted.
            </h2>
          </div>
          <button onClick={onReset} className="btn-secondary text-sm self-start sm:self-auto" aria-label="Return to the conversation input">
            <RefreshCw className="w-4 h-4" />
            Edit conversation
          </button>
        </div>

        {/* On-device indicator */}
        <div className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/25" role="status">
          <Cpu className="w-4 h-4 text-primary-300" />
          <span className="text-sm text-primary-200">
            Analyzed in this browser using local pattern matching.
          </span>
          <span className="ml-auto text-xs font-mono text-text-muted">at {result.processedAt}</span>
        </div>
        {copyError && (
          <p className="mb-6 text-sm text-red-300" role="alert" aria-live="assertive">
            {copyError}
          </p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-3 mb-8" role="group" aria-label="Briefing statistics">
          <StatPill icon={FileText} label="Messages analyzed" value={result.messageCount} />
          <StatPill icon={AlertTriangle} label="Urgent items" value={result.urgent.length} />
          <StatPill icon={ClipboardList} label="Your tasks" value={userActions.length} />
          <StatPill icon={CheckCircle2} label="Decisions" value={result.decisions.length} />
          <StatPill icon={Calendar} label="Key dates" value={result.dates.length} />
          <StatPill icon={AtSign} label="Mentions" value={result.mentions.length} />
        </div>

        {/* THE SIGNAL — Summary */}
        <div className="glass-panel p-6 lg:p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-300" />
              <h3 className="font-display text-xl font-600 text-text-main">The Signal</h3>
            </div>
            <button
              onClick={copySummary}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary-300 transition-colors"
              aria-label="Copy full briefing to clipboard"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSummary ? 'Copied!' : 'Copy briefing'}
            </button>
          </div>
          <p className="text-text-muted leading-relaxed text-base">{result.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.participants.map((p) => (
              <span
                key={p}
                className="px-2.5 py-1 rounded-full bg-midnight-700/40 text-xs text-text-muted font-mono"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4 sticky top-16 z-30 py-3 -mx-2 px-2 bg-midnight-950/80 backdrop-blur-md rounded-xl" role="group" aria-label="Filter results by category">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-500/15 text-primary-200 border border-primary-500/20'
                    : 'text-text-muted hover:text-text-main hover:bg-midnight-700/40 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Priority filter */}
        {showPriorityControls && (
          <div className="flex flex-wrap items-center gap-2 mb-8" role="group" aria-label="Filter by priority">
            <span className="text-xs text-text-muted font-mono">Priority:</span>
            {PRIORITIES.map((p) => (
              <button
                key={p.key}
                onClick={() => setPriorityFilter(p.key)}
                aria-pressed={priorityFilter === p.key}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  priorityFilter === p.key
                    ? 'bg-midnight-700/60 text-text-main border border-text-muted/20'
                    : 'text-text-muted hover:text-text-main border border-transparent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* URGENT */}
        {showCategory('urgent') && (
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-primary-300" />
              <h3 className="font-display text-xl font-600 text-text-main">Urgent</h3>
              {result.urgent.length > 0 && (
                <span className="text-xs text-text-muted">— time-sensitive, handle first</span>
              )}
            </div>
            {result.urgent.length === 0 ? (
              <EmptyState text="No urgent items detected. You're in the clear." />
            ) : (
              <div className="space-y-3">
                {result.urgent.map((item) => (
                  <UrgentCard key={item.id} item={item} priorityFilter={priorityFilter} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* YOUR ACTIONS */}
        {showCategory('actions') && (
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary-300" />
                <h3 className="font-display text-xl font-600 text-text-main">Your Actions</h3>
                {userActions.length > 0 && (
                  <span className="text-xs text-text-muted">— tasks assigned to {userName || 'you'}</span>
                )}
              </div>
              {userActions.length > 0 && (
                <button
                  onClick={copyActions}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary-300 transition-colors"
                  aria-label="Copy action items to clipboard"
                >
                  {copiedActions ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedActions ? 'Copied!' : 'Copy tasks'}
                </button>
              )}
            </div>
            {userActions.length === 0 && otherActions.length === 0 ? (
              <EmptyState text="No tasks detected in this conversation." />
            ) : (
              <div className="space-y-3">
                {userActions.length === 0 && (
                  <p className="text-sm text-text-muted mb-3">
                    No tasks were explicitly assigned to {userName || 'you'}. Try adding your name in the input field above.
                  </p>
                )}
                {userActions.map((item) => (
                  <ActionCard key={item.id} item={item} priorityFilter={priorityFilter} />
                ))}
                {otherActions.length > 0 && (
                  <details className="mt-4 group">
                    <summary className="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-text-main transition-colors list-none">
                      <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                      Other tasks ({otherActions.length})
                    </summary>
                    <div className="mt-3 space-y-3">
                      {otherActions.map((item) => (
                        <div key={item.id} className="glass-panel p-4 opacity-70">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-text-main text-sm leading-snug">{item.task}</p>
                            <PriorityBadge level={item.confidence === 'explicit' ? 'explicit' : 'inferred'} label={item.confidence === 'explicit' ? 'Explicit' : 'Inferred'} />
                          </div>
                          <p className="text-xs text-text-muted mb-2">Assigned to: {item.assignee}</p>
                          {item.deadline && (
                            <div className="flex items-center gap-1.5 text-sm text-primary-300 mb-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Deadline: {item.deadline}</span>
                            </div>
                          )}
                          <SnippetBlock snippet={item.snippet} sender={item.sender} timestamp={item.timestamp} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* DECISIONS */}
        {showCategory('decisions') && (
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-primary-300" />
              <h3 className="font-display text-xl font-600 text-text-main">Decisions</h3>
              {result.decisions.length > 0 && (
                <span className="text-xs text-text-muted">— what the group agreed on</span>
              )}
            </div>
            {result.decisions.length === 0 ? (
              <EmptyState text="No explicit decisions detected in this conversation." />
            ) : (
              <div className="space-y-3">
                {result.decisions.map((item) => (
                  <div key={item.id} className="glass-panel glass-panel-hover p-4 lg:p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-text-main font-medium leading-snug">{item.decision}</p>
                        <SnippetBlock snippet={item.snippet} sender={item.sender} timestamp={item.timestamp} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* IMPORTANT DATES */}
        {showCategory('dates') && (
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary-300" />
              <h3 className="font-display text-xl font-600 text-text-main">Important Dates</h3>
              {result.dates.length > 0 && (
                <span className="text-xs text-text-muted">— deadlines, meetings, events</span>
              )}
            </div>
            {result.dates.length === 0 ? (
              <EmptyState text="No specific dates or deadlines detected." />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {result.dates.map((item) => (
                  <div key={item.id} className="glass-panel glass-panel-hover p-4 lg:p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <DateBadge type={item.type} />
                      <span className="text-sm font-mono text-primary-200 font-medium">{item.date}</span>
                    </div>
                    <p className="text-sm text-text-main leading-snug">{item.event}</p>
                    <SnippetBlock snippet={item.snippet} sender={item.sender} timestamp={item.timestamp} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MENTIONS */}
        {showCategory('mentions') && (
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <AtSign className="w-5 h-5 text-primary-300" />
              <h3 className="font-display text-xl font-600 text-text-main">Mentions</h3>
              {result.mentions.length > 0 && (
                <span className="text-xs text-text-muted">— messages that tag you or others</span>
              )}
            </div>
            {result.mentions.length === 0 ? (
              <EmptyState text="No @mentions detected in this conversation." />
            ) : (
              <div className="space-y-3">
                {userMentions.length > 0 && (
                  <p className="text-sm text-primary-200 mb-2">
                    {userMentions.length} message{userMentions.length > 1 ? 's' : ''} mention{userMentions.length > 1 ? '' : 's'} {userName || 'you'} directly.
                  </p>
                )}
                {userMentions.map((item) => (
                  <div key={item.id} className="glass-panel glass-panel-hover p-4 lg:p-5 border-l-2 border-l-primary-500/40">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-text-main font-medium leading-snug">{item.context}</p>
                      <PriorityBadge level="explicit" label={`@${item.mentionedUser}`} />
                    </div>
                    <SnippetBlock snippet={item.snippet} sender={item.sender} timestamp={item.timestamp} />
                  </div>
                ))}
                {otherMentions.length > 0 && (
                  <details className="mt-4 group">
                    <summary className="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-text-main transition-colors list-none">
                      <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                      Other mentions ({otherMentions.length})
                    </summary>
                    <div className="mt-3 space-y-3">
                      {otherMentions.map((item) => (
                        <div key={item.id} className="glass-panel p-4 opacity-70">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-text-main text-sm leading-snug">{item.context}</p>
                            <PriorityBadge level="inferred" label={`@${item.mentionedUser}`} />
                          </div>
                          <SnippetBlock snippet={item.snippet} sender={item.sender} timestamp={item.timestamp} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* WHAT YOU MISSED */}
        {showCategory('announcements') && (
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-primary-300" />
              <h3 className="font-display text-xl font-600 text-text-main">What You Missed</h3>
              {result.announcements.length > 0 && (
                <span className="text-xs text-text-muted">— buried announcements you'd scroll past</span>
              )}
            </div>
            {result.announcements.length === 0 ? (
              <EmptyState text="No buried announcements detected. Nothing hidden in the noise." />
            ) : (
              <div className="space-y-3">
                {result.announcements.map((item) => (
                  <div key={item.id} className="glass-panel glass-panel-hover p-4 lg:p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-secondary-500/15 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-3.5 h-3.5 text-secondary-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-text-main font-medium leading-snug">{item.title}</p>
                        <p className="text-xs text-secondary-300/70 mt-1 italic">{item.buriedReason}</p>
                        <SnippetBlock snippet={item.snippet} sender={item.sender} timestamp={item.timestamp} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass-panel p-6 text-center">
      <p className="text-text-muted text-sm">{text}</p>
    </div>
  );
}
