import type { ActionItem, BriefingResult, ItemStatus } from './types';

export function formatUnparsedLineWarning(lineCount: number): string {
  return `${lineCount} lines weren't recognized as messages. Supported: Name: message, WhatsApp Android, WhatsApp iOS.`;
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
        `${action.status === 'tentative' ? '[Tentative] ' : ''}${action.task}${action.deadline ? ` (due: ${action.deadline})` : ''}`
      ))}`
    )).join('\n')
    : 'Unassigned:\n- None';
  const decisions = (status: ItemStatus) => renderLines(
    result.decisions
      .filter((decision) => decision.status === status)
      .map((decision) => {
        const selected = decision.decision || 'No confirmed option selected';
        const text = decision.rejectedOptions.length > 0
          ? `${selected} (rejected: ${decision.rejectedOptions.join(', ')})`
          : selected;
        return `${status === 'tentative' ? '[Tentative] ' : ''}${text}`;
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
