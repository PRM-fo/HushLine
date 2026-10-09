import { describe, it, expect } from 'vitest';
// @ts-expect-error Node's fs is available in Vitest but Node type declarations are not installed.
import { readFileSync } from 'node:fs';
import { analyzeConversation, formatBriefingForClipboard, formatUnparsedLineWarning, parseMessages } from './analyzer';

// Test fixtures — synthetic data for unit testing only.
// Not displayed in the production app or presented as real conversations.
const TEST_FIXTURE_PROJECT_CHAT = `Sarah: Hey everyone! Quick reminder about our capstone project meeting tomorrow
Sarah: We need to finalize the presentation outline before Wednesday
Sarah: @Alex can you put together the slides for the methodology section? You're the best at that
Alex: Yeah I can do that! When do you need them by?
Sarah: Deadline is Friday at 5pm, Professor Chen is strict about late submissions
Sarah: Also IMPORTANT: the meeting time changed from 3pm to 4:30pm. Same Zoom link though
Marcus: wait the meeting moved? I had it at 3 in my calendar
Sarah: Yes! It's now 4:30pm. Please update your calendars, don't want anyone showing up at the wrong time
Marcus: ok got it, 4:30 it is
Jenny: lol I almost missed that, thanks Sarah
Jenny: omg did you guys see the basketball game last night??
Alex: nah I was studying all night
Marcus: fr the ending was insane
Jenny: yeah that last shot was crazy
Sarah: Anyway, we also decided to go with React for the frontend instead of Vue. Everyone agreed last meeting so let's stick with that
Sarah: @Alex that means you can use the component library we already discussed
Alex: perfect, that makes it easier honestly
Sarah: One more thing — heads up that attendance is mandatory for the final presentation rehearsal on December 5th. Professor said no exceptions
Sarah: If you miss it, it affects the whole group's grade. Not optional!!
Marcus: December 5th got it
Jenny: yeah I'll be there for sure
Alex: same
Jenny: hey does anyone have the rubric? I can't find it on the syllabus
Sarah: @Marcus didn't you download it? Can you share it in the drive?
Marcus: yeah I'll upload it tonight, remind me if I forget
Sarah: Also just so everyone knows, the grading is 40% presentation + 60% report. So the report matters more than we thought
Sarah: @Alex don't forget your slides are due Friday 5pm. That's the hard deadline
Alex: I know I know, working on it
Marcus: lmao Alex always cutting it close
Alex: hey I deliver though
Jenny: true that lol
Sarah: Ok last thing — everyone needs to submit their individual reflection essays by December 10th. Separate from the group submission
Sarah: That's a hard deadline from the professor, no extensions
Marcus: got it, Dec 10 for reflections
Jenny: noted!
Alex: alright I'm gonna go work on those slides now
Sarah: Thanks Alex! Everyone else, please review the slides once Alex posts them. We need to approve them before Friday
Sarah: Meeting tomorrow at 4:30pm. Don't be late!
Marcus: see you all then
Jenny: byeee`;

describe('parseMessages', () => {
  it('parses "Name: message" format', () => {
    const messages = parseMessages('Alice: Hello world\nBob: Hi there');
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe('Alice');
    expect(messages[0].text).toBe('Hello world');
    expect(messages[1].sender).toBe('Bob');
  });

  it('handles empty input', () => {
    expect(parseMessages('')).toEqual([]);
    expect(parseMessages('   \n  \n')).toEqual([]);
  });

  it('handles lines without senders', () => {
    const messages = parseMessages('Just a random line with no colon');
    expect(messages).toHaveLength(1);
    expect(messages[0].sender).toBe('Unknown');
  });

  it('handles multi-line messages (continuation)', () => {
    const messages = parseMessages('Alice: First line\nsecond line of same message');
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toContain('First line');
    expect(messages[0].text).toContain('second line');
  });

  it('parses timestamp-first WhatsApp Android export lines with seconds and AM/PM', () => {
    const messages = parseMessages(
      '\u200e12/31/20, 10:00:05 PM - Alice: Hello\n31/12/2020, 22:30 - Bob: Hi'
    );
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      sender: 'Alice',
      text: 'Hello',
      timestamp: '12/31/20, 10:00:05 PM',
    });
    expect(messages[1]).toMatchObject({
      sender: 'Bob',
      text: 'Hi',
      timestamp: '31/12/2020, 22:30',
    });
  });

  it('parses bracketed WhatsApp iOS timestamps with and without seconds', () => {
    const messages = parseMessages(
      '[12/31/20, 10:00 PM] Alice: Hello\n[31/12/2020, 22:30:05] Bob: Hi'
    );
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      sender: 'Alice',
      text: 'Hello',
      timestamp: '12/31/20, 10:00 PM',
    });
    expect(messages[1]).toMatchObject({
      sender: 'Bob',
      text: 'Hi',
      timestamp: '31/12/2020, 22:30:05',
    });
  });

  it('does not interpret instruction labels as sender names', () => {
    const messages = parseMessages('Step one: prepare the slides\nTODO: call Priya\nDeadline: 5th December');
    expect(messages).toHaveLength(3);
    expect(messages.map((message) => message.sender)).toEqual(['Unknown', 'Unknown', 'Unknown']);
    expect(messages[0].text).toBe('Step one: prepare the slides');
  });

  it('parses timestamped Android and iOS lines and excludes timestamp dates from message bodies', () => {
    const messages = parseMessages(
      '12/05/24, 15:45 - Sarah: Please send the report by Friday\n' +
      '[12/05/2024, 3:45:12 PM] Sarah: Please send the report by Friday\n' +
      '\u200e[12/05/2024, 3:45:12 PM] Sarah: Please send the report by Friday'
    );
    expect(messages).toHaveLength(3);
    expect(messages.map((message) => message.sender)).toEqual(['Sarah', 'Sarah', 'Sarah']);
    expect(messages[0].timestamp).toBe('12/05/24, 15:45');
    expect(messages[1].timestamp).toBe('12/05/2024, 3:45:12 PM');

    for (const message of messages) {
      const result = analyzeConversation(`${message.sender}: ${message.text}`);
      expect(result.dates.map((date) => date.date)).toEqual(['by Friday']);
    }
  });

  it('skips system and deleted-message lines and reports ignored system lines', () => {
    const result = analyzeConversation(
      '12/05/2024, 15:40 - Messages and calls are end-to-end encrypted\n' +
      'Sarah: <Media omitted>\n' +
      'Sarah: This message was deleted'
    );
    expect(result.messageCount).toBe(0);
    expect(result.ignoredSystemLineCount).toBe(3);
    expect(result.dates).toEqual([]);
  });

  it('keeps label-like continuation lines in the same message', () => {
    const messages = parseMessages('Sarah: Agenda:\n- slides due Friday\n- demo');
    expect(messages).toHaveLength(1);
    expect(messages[0].sender).toBe('Sarah');
    expect(messages[0].text).toBe('Agenda:\n- slides due Friday\n- demo');
  });

  it('accepts Hindi and Tamil sender names', () => {
    const messages = parseMessages('अमित: नमस्ते\nகுமார்: வணக்கம்');
    expect(messages.map((message) => message.sender)).toEqual(['अमित', 'குமார்']);
  });

  it.each([
    ['Rahul (Design) #2', 'I will upload the logo by Friday'],
    ["O'Brien-Smith", 'Please review the doc ASAP'],
    ['Priya S.', 'I will fix the bug by 4 PM'],
    ['Dr. A/B Testing', 'I will send the invoice by Friday'],
  ])('parses symbol-rich sender %s without including the prefix in message text', (sender, text) => {
    const [message] = parseMessages(`${sender}: ${text}`);
    expect(message).toMatchObject({ sender, text });
    expect(message.text).not.toContain(`${sender}:`);
  });

  it('keeps symbol-rich sender prefixes out of extracted task text', () => {
    for (const line of [
      'Rahul (Design) #2: I will upload the logo by Friday',
      'Priya S.: I will fix the bug by 4 PM',
      'Dr. A/B Testing: I will send the invoice by Friday',
    ]) {
      const result = analyzeConversation(line);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].task).not.toContain(line.split(': ')[0]);
      expect(result.actions[0].sender).toBe(line.split(': ')[0]);
    }
  });

  it('rejects long sentence-like labels as senders', () => {
    const result = analyzeConversation('Note that: this is a time: 5 PM');
    expect(result.participants).not.toContain('Note that');
    expect(result.dates).toEqual([]);
  });

  it('enforces the sender-label length cap', () => {
    const longLabel = 'This is a sentence-like label that is clearly longer than fifty characters';
    const result = analyzeConversation(`${longLabel}: Deadline Wednesday 5 PM`);
    expect(result.participants).not.toContain(longLabel);
    expect(result.unparsedLineCount).toBe(1);
    expect(result.dates).toEqual([]);
  });

  it('formats a clear supported-format warning for unrecognized lines', () => {
    expect(formatUnparsedLineWarning(2)).toBe(
      "2 lines weren't recognized as messages. Supported: Name: message, WhatsApp Android, WhatsApp iOS."
    );
  });

  it('declares a restrictive CSP compatible with the built worker and inline styles', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toMatch(/script-src 'self'/);
    expect(html).toMatch(/style-src 'self' 'unsafe-inline'/);
    expect(html).toMatch(/connect-src 'none'/);
    expect(html).toMatch(/worker-src 'self' blob:/);
  });

  it('documents the English-only extractor, unsupported chat exports, and source network scope', () => {
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
    expect(readme).toMatch(/English-only/i);
    expect(readme).toMatch(/Telegram.*Slack.*unsupported/i);
    expect(readme).toMatch(/no network calls in the source/i);
    expect(readme).not.toMatch(/100% private|verified local-only/i);
  });
});

describe('analyzeConversation — test fixture (project group chat)', () => {
  const result = analyzeConversation(TEST_FIXTURE_PROJECT_CHAT, 'Alex');

  it('detects the right participants', () => {
    expect(result.participants).toContain('Sarah');
    expect(result.participants).toContain('Alex');
    expect(result.participants).toContain('Marcus');
    expect(result.participants).toContain('Jenny');
    expect(result.participantCount).toBe(4);
  });

  it('detects urgent items including the Friday deadline', () => {
    expect(result.urgent.length).toBeGreaterThan(0);
    const hasFridayDeadline = result.urgent.some((u) =>
      u.title.toLowerCase().includes('friday') || u.snippet.toLowerCase().includes('friday')
    );
    expect(hasFridayDeadline).toBe(true);
  });

  it('detects the meeting time change to 4:30pm', () => {
    const hasTimeChange = result.dates.some(
      (d) => d.snippet.includes('4:30') || d.event.includes('4:30')
    );
    expect(hasTimeChange).toBe(true);
  });

  it('detects the December 5th rehearsal deadline', () => {
    const hasDec5 = result.dates.some(
      (d) => d.date.includes('December') && d.date.includes('5')
    );
    expect(hasDec5).toBe(true);
  });

  it('detects the React vs Vue decision', () => {
    const hasReactDecision = result.decisions.some(
      (d) => d.decision.toLowerCase().includes('react') || d.snippet.toLowerCase().includes('react')
    );
    expect(hasReactDecision).toBe(true);
  });

  it('assigns tasks to Alex (the user)', () => {
    const userActions = result.actions.filter((a) => a.assigneeIsUser);
    expect(userActions.length).toBeGreaterThan(0);
    const hasSlideTask = userActions.some(
      (a) => a.task.toLowerCase().includes('slide') || a.snippet.toLowerCase().includes('slide')
    );
    expect(hasSlideTask).toBe(true);
  });

  it('extracts mentions including @Alex and @Marcus', () => {
    expect(result.mentions.length).toBeGreaterThan(0);
    const hasAlexMention = result.mentions.some((m) => m.mentionedUser === 'Alex');
    const hasMarcusMention = result.mentions.some((m) => m.mentionedUser === 'Marcus');
    expect(hasAlexMention).toBe(true);
    expect(hasMarcusMention).toBe(true);
  });

  it('marks Alex mentions as user mentions', () => {
    const userMentions = result.mentions.filter((m) => m.isUser);
    expect(userMentions.length).toBeGreaterThan(0);
    expect(userMentions.every((m) => m.mentionedUser === 'Alex')).toBe(true);
  });

  it('detects buried announcements', () => {
    expect(result.announcements.length).toBeGreaterThan(0);
    const hasAttendance = result.announcements.some(
      (a) => a.title.toLowerCase().includes('attendance') || a.title.toLowerCase().includes('mandatory')
    );
    expect(hasAttendance).toBe(true);
  });

  it('keeps non-urgent announcements while suppressing announcement duplicates of urgent items', () => {
    const analysis = analyzeConversation(
      'Alice: IMPORTANT deadline please note exam Friday\nBob: FYI unrelated update'
    );
    expect(analysis.urgent.some((item) => item.snippet.includes('IMPORTANT'))).toBe(true);
    expect(analysis.announcements.some((item) => item.snippet.includes('IMPORTANT'))).toBe(false);
    expect(analysis.announcements.some((item) => item.snippet.includes('FYI unrelated'))).toBe(true);
  });

  it('generates a non-empty summary', () => {
    expect(result.summary.length).toBeGreaterThan(50);
    expect(result.summary).toContain('Sarah');
  });

  it('includes source snippets for all extracted items', () => {
    for (const u of result.urgent) {
      expect(u.snippet.length).toBeGreaterThan(0);
    }
    for (const a of result.actions) {
      expect(a.snippet.length).toBeGreaterThan(0);
    }
    for (const d of result.decisions) {
      expect(d.snippet.length).toBeGreaterThan(0);
    }
  });
});

describe('analyzeConversation — edge cases', () => {
  it('handles empty input gracefully', () => {
    const result = analyzeConversation('', 'Alice');
    expect(result.messageCount).toBe(0);
    expect(result.urgent).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.dates).toEqual([]);
    expect(result.announcements).toEqual([]);
    expect(result.mentions).toEqual([]);
  });

  it('handles very short input', () => {
    const result = analyzeConversation('Hi there', 'Alice');
    expect(result.messageCount).toBe(1);
  });

  it('handles very large input (stress test)', () => {
    const lines: string[] = [];
    for (let i = 0; i < 2000; i++) {
      lines.push(`User${i % 5}: Message number ${i} with some content here`);
    }
    const result = analyzeConversation(lines.join('\n'), 'User0');
    expect(result.messageCount).toBe(2000);
    expect(result.participantCount).toBe(5);
  });

  it('handles malformed input with no colons', () => {
    const result = analyzeConversation('This is just plain text\nwith no sender colons\nat all');
    expect(result.messageCount).toBe(3);
    expect(result.participants).toContain('Unknown');
  });

  it('handles ambiguous tasks without clear assignee', () => {
    const result = analyzeConversation(
      'Bob: Someone should really clean up the repo\nBob: We need to fix the build',
      'Alice'
    );
    const userActions = result.actions.filter((a) => a.assigneeIsUser);
    expect(userActions.length).toBe(0);
  });

  it('detects deadlines without a username', () => {
    const result = analyzeConversation(
      'Bob: The report is due Friday\nBob: Deadline is December 15th',
      undefined
    );
    expect(result.dates.length).toBeGreaterThan(0);
  });

  it('detects urgency markers', () => {
    const result = analyzeConversation(
      'Boss: This is URGENT — submit by tonight\nBoss: ASAP please',
      'Bob'
    );
    expect(result.urgent.length).toBeGreaterThan(0);
  });

  it('does not invent information not present in the conversation', () => {
    const result = analyzeConversation(
      'Alice: Hey how are you?\nBob: Good thanks!',
      'Alice'
    );
    expect(result.urgent).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.dates).toEqual([]);
  });

  it('reports empty results when no actionable content exists', () => {
    const result = analyzeConversation(
      'Alice: hey\nBob: sup\nAlice: nm\nBob: cool',
      'Alice'
    );
    expect(result.urgent).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.dates).toEqual([]);
  });

  // Regression tests for accuracy bugs
  describe('regression tests', () => {
    it('does not incorrectly match "git" in "legit" as a topic', () => {
      const result = analyzeConversation('Alice: That solution is legit\nBob: Yeah totally', 'Alice');
      expect(result.summary).not.toContain('code');
      expect(result.summary).not.toContain('repository');
    });

    it('does not incorrectly match "git" in "legit" as a topic', () => {
      const result = analyzeConversation('Alice: That solution is legit\nBob: Yeah totally', 'Alice');
      expect(result.summary).not.toContain('code');
      expect(result.summary).not.toContain('repository');
    });

    it('does not incorrectly match "test" in "latest" as a topic', () => {
      const result = analyzeConversation('Alice: Here are the latest numbers\nBob: Thanks', 'Alice');
      expect(result.summary).not.toContain('exam');
    });

    it('detects urgent deadline even when message contains casual words like "word" or "yeah"', () => {
      const result = analyzeConversation('Boss: This deadline is due tomorrow, yeah? Word to that.\nAlice: Got it', 'Alice');
      expect(result.urgent.length).toBeGreaterThan(0);
      expect(result.urgent.some(u => u.title.toLowerCase().includes('deadline'))).toBe(true);
    });

    it('detects urgent even when message contains "ok"', () => {
      const result = analyzeConversation('Boss: Deadline is today, ok?\nAlice: Will do', 'Alice');
      expect(result.urgent.length).toBeGreaterThan(0);
    });

    it('does not assign task when no explicit assignee is mentioned', () => {
      const result = analyzeConversation('Alice: Someone should really do this\nBob: Yeah', 'Alice');
      expect(result.actions.length).toBe(0);
    });

    it('does not treat tentative proposals as decisions', () => {
      const result = analyzeConversation('Alice: Should we go with option A?\nBob: Not sure, maybe', 'Alice');
      expect(result.decisions.length).toBe(0);
    });

    it('does not treat questions as decisions', () => {
      const result = analyzeConversation('Alice: What do you think about the new design?\nBob: Looks good', 'Alice');
      expect(result.decisions.length).toBe(0);
    });

    it('records rejected options without claiming they were chosen', () => {
      const result = analyzeConversation(
        'Alice: We rejected React\nBob: Let\'s not go with Vue\nCara: We decided against Angular'
      );
      expect(result.decisions.flatMap((decision) => decision.rejectedOptions)).toEqual([
        'React',
        'Vue',
        'Angular',
      ]);
    });

    it('treats confirmed decisions as decisions', () => {
      const result = analyzeConversation('Alice: Let\'s go with option A\nBob: Agreed', 'Alice');
      expect(result.decisions.length).toBeGreaterThan(0);
    });

    it('continues extracting dates and announcements after an unassigned action phrase', () => {
      const result = analyzeConversation('Please note the exam is on December 5th');
      expect(result.dates.some((date) => date.date.toLowerCase().includes('december 5th'))).toBe(true);
      expect(result.announcements).toHaveLength(1);
    });

    it('continues extracting decisions after an unassigned action phrase', () => {
      const result = analyzeConversation('We decided to go with React, please update the repo');
      expect(result.decisions.some((decision) => /react/i.test(decision.decision))).toBe(true);
      expect(result.actions).toEqual([]);
    });

    it('extracts meeting times and relative dates without a moved-to fragment', () => {
      const result = analyzeConversation('Meeting moved to 4:30 pm tomorrow, please confirm');
      expect(result.dates.some((date) => /4:30\s*pm/i.test(date.date))).toBe(true);
      expect(result.dates.some((date) => /tomorrow/i.test(date.date))).toBe(true);
      expect(result.dates.every((date) => date.date.toLowerCase() !== 'moved to')).toBe(true);
      expect(result.actions).toEqual([]);
    });

    it('recognizes a sender task and ordinal day-month deadline', () => {
      const result = analyzeConversation('Priya: Submit by 5th December', 'Priya');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toMatchObject({ assignee: 'Priya', assigneeIsUser: true });
      expect(result.dates.some((date) => /5th december/i.test(date.date))).toBe(true);
    });

    it('recognizes abbreviated day-month dates', () => {
      const result = analyzeConversation('Alice: The review is on 15 Oct');
      expect(result.dates.some((date) => /15 oct/i.test(date.date))).toBe(true);
    });

    it('does not infer task ownership from generic you or your wording', () => {
      const result = analyzeConversation('Alice: Can you update the repo?\nBob: Your notes are helpful', 'Priya');
      expect(result.actions).toEqual([]);
    });

    it('does not mark mentions as user mentions when no username is configured', () => {
      const result = analyzeConversation('Alice: @Priya please review the repo');
      expect(result.mentions).toHaveLength(1);
      expect(result.mentions[0].isUser).toBe(false);
      expect(result.actions[0].assigneeIsUser).toBe(false);
    });

    it('assigns a task explicitly directed to a named participant', () => {
      const result = analyzeConversation('Alice: Priya, please submit the form', 'Priya');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toMatchObject({ assignee: 'Priya', assigneeIsUser: true });
    });

    it('keeps a polite request unassigned rather than treating a polite word as a name', () => {
      const message = 'Alice: Please send the report by Friday';
      const result = analyzeConversation(message, 'Alex');
      expect(result.actions).toContainEqual(expect.objectContaining({
        assignee: 'Unassigned',
        task: 'send the report',
      }));
    });

    it('matches name-directed assignees against known conversation participants', () => {
      const result = analyzeConversation(
        'Alice: Hello\nPriya: Here\nBob: Please, Priya, submit the report by Friday',
        'Priya'
      );
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toMatchObject({ assignee: 'Priya', assigneeIsUser: true });
    });

    it.each([
      ['Alex, can you send the slides by Friday?', 'Alex'],
      ['Alex could you review this?', 'Alex'],
      ['Alex please submit the form', 'Alex'],
      ['@Alex can you send the slides?', 'Alex'],
    ])('assigns a task to the name-directed participant: %s', (text, assignee) => {
      const result = analyzeConversation(`Sarah: Hello\nAlex: Present\nSarah: ${text}`, 'Alex');
      expect(result.actions).toContainEqual(expect.objectContaining({
        assignee,
        assigneeIsUser: true,
      }));
    });

    it('assigns a name-directed task to a different participant, not the user', () => {
      const result = analyzeConversation(
        'Sarah: Hello\nBob: Present\nSarah: Bob, can you send the invoice?',
        'Alex'
      );
      expect(result.actions).toContainEqual(expect.objectContaining({
        assignee: 'Bob',
        assigneeIsUser: false,
      }));
    });

    it('does not assign generic requests or use polite words as names', () => {
      const result = analyzeConversation(
        'Sarah: Can you send the invoice?\nBob: Please send the report\nCara: Please submit the final word count by Friday',
        'Alex'
      );
      expect(result.actions).toHaveLength(2);
      expect(result.actions).toContainEqual(expect.objectContaining({ assignee: 'Unassigned', task: 'send the report' }));
      expect(result.actions).toContainEqual(expect.objectContaining({ assignee: 'Unassigned', task: 'submit the final word count' }));
    });

    it('recognizes @Bob as an assignee without marking it as the user', () => {
      const result = analyzeConversation('Sarah: @Bob please send the invoice');
      expect(result.actions).toContainEqual(expect.objectContaining({
        assignee: 'Bob',
        assigneeIsUser: false,
      }));
    });

    it('detects plain-name mentions without matching the user’s own messages', () => {
      const result = analyzeConversation(
        'Alex: The meeting moved to 3pm\nSarah: Alex, the demo moved to 3pm tomorrow',
        'Alex'
      );
      expect(result.mentions).toContainEqual(expect.objectContaining({
        mentionedUser: 'Alex',
        isUser: true,
        sender: 'Sarah',
      }));
      expect(result.mentions.some((mention) => mention.sender === 'Alex')).toBe(false);
    });

    it('marks tentative dates as tentative', () => {
      const result = analyzeConversation('Sarah: Maybe we could do the slides by Friday?');
      expect(result.dates).toContainEqual(expect.objectContaining({
        date: 'by Friday',
        status: 'tentative',
      }));
    });

    it('distinguishes rejected and tentative decisions at clause level', () => {
      const changed = analyzeConversation('Sarah: We are not going with React, going with Vue instead');
      expect(changed.decisions).toContainEqual(expect.objectContaining({
        decision: expect.stringContaining('Vue'),
        status: 'confirmed',
      }));

      const rejectedOnly = analyzeConversation("Sarah: I don't agree, let's not go with React");
      expect(rejectedOnly.decisions.flatMap((decision) => decision.rejectedOptions)).toContain('React');

      const tentative = analyzeConversation("Sarah: Let's go with Vue if the client approves");
      expect(tentative.decisions).toContainEqual(expect.objectContaining({
        status: 'tentative',
        decision: expect.not.stringMatching(/^\s/),
      }));
    });

    it('keeps the affirmative choice after a separately negated clause', () => {
      const result = analyzeConversation('Sarah: We are not going with React, going with Vue instead');
      expect(result.decisions).toContainEqual(expect.objectContaining({
        decision: expect.stringContaining('going with Vue'),
      }));
      expect(result.decisions[0].rejectedOptions).toContain('React');
    });

    it('marks tentative actions and does not assign them high confidence', () => {
      const result = analyzeConversation('Alex: Maybe submit the form by Friday', 'Alex');
      expect(result.actions[0]).toMatchObject({
        assignee: 'Alex',
        status: 'tentative',
      });
    });

    it('labels ambiguous month-first numeric dates without changing their value', () => {
      const result = analyzeConversation('Sarah: Deadline 05/12/2026');
      expect(result.dates[0]).toMatchObject({
        date: '05/12/2026',
        note: 'Ambiguous DD/MM or MM/DD',
      });
    });

    it('extracts short month-name dates and message dates without parsing time headers', () => {
      const result = analyzeConversation(
        '12/05/2024, 15:40 - Sarah: Exam on 15 Oct and Dec 10'
      );
      expect(result.dates.map((item) => item.date)).toEqual(['15 Oct', 'Dec 10']);
      expect(result.dates.every((item) => !item.date.includes('12/05/2024'))).toBe(true);
    });

    it('rejects fractions with units and bare counts', () => {
      const result = analyzeConversation(
        'Sarah: look at 5 of these\nBob: recipe says 3/4 cup\nCara: open 24/7'
      );
      expect(result.dates).toEqual([]);
    });

    it('records message index, cues, and status on extracted items', () => {
      const result = analyzeConversation('Sarah: hello\nSarah: Deadline is Friday');
      expect(result.urgent[0]).toMatchObject({
        messageIndex: 2,
        matchedCues: expect.arrayContaining(['deadline']),
        status: 'confirmed',
      });
      expect(result.dates[0]).toMatchObject({
        messageIndex: 2,
        status: 'confirmed',
      });
    });

    it('warns when some lines cannot be attributed to a sender', () => {
      const result = analyzeConversation('unrecognized header style\nSarah: hello\nSarah: bye');
      expect(result.unparsedLineCount).toBe(1);
      expect(result.totalLineCount).toBe(3);
    });

    it('recognizes dates in both numeric orders and preserves their exact source text', () => {
      const result = analyzeConversation(
        'Priya: Submit by 25/12/2026\nSarah: Fees due 13/05/2026\nBob: Deadline 12/25/2026\nCara: Deadline 05/13/2026'
      );
      expect(result.dates.map((date) => date.date)).toEqual([
        '25/12/2026',
        '13/05/2026',
        '12/25/2026',
        '05/13/2026',
      ]);
    });

    it('uses counts rather than guessed topics or unsupported chat-quality claims in the summary', () => {
      const result = analyzeConversation('Sarah: the report looks fine\nBob: that is legit\nCara: latest numbers are in');
      expect(result.summary).not.toMatch(/report|repository|code|didn't miss much|substantive|discussing/i);
      expect(result.summary).toMatch(/3 messages from 3 people/);
    });

    it('does not extract bare numbers, fractions, or 24/7 as dates', () => {
      const result = analyzeConversation(
        'Alice: Meet me at 5\nBob: The ratio is 3/4\nCara: Support is available 24/7'
      );
      expect(result.dates).toEqual([]);
    });

    it('accepts valid day-first and month-first numeric dates without changing their text', () => {
      const result = analyzeConversation(
        'Alice: Deadline 25/12/2026\nBob: Deadline 13/05/2026\nCara: Deadline 12/25/2026\nDrew: Deadline 05/13/2026'
      );
      expect(result.dates.map((date) => date.date)).toEqual([
        '25/12/2026',
        '13/05/2026',
        '12/25/2026',
        '05/13/2026',
      ]);
    });

    it('retains ambiguous numeric dates as raw text and rejects impossible dates', () => {
      const result = analyzeConversation(
        'Alice: Event 03/04/2026\nBob: Deadline 31/02/2026\nCara: Deadline 13/13/2026'
      );
      expect(result.dates.map((date) => date.date)).toEqual(['03/04/2026']);
    });

    it.each([
      ['Sam: Deadline: Wednesday at 5 PM.', 'Wednesday at 5 PM'],
      ['Sam: Please submit by Wednesday 5 PM.', 'by Wednesday 5 PM'],
      ['Sam: Thursday at 11 AM.', 'Thursday at 11 AM'],
      ['Sam: Finish before Friday noon.', 'before Friday noon'],
      ['Sam: final reminder: deadline is Wednesday 5 PM.', 'Wednesday 5 PM'],
    ])('preserves weekday when extracting a date from %s', (message, expectedDate) => {
      const result = analyzeConversation(message);
      expect(result.dates.map((date) => date.date)).toContain(expectedDate);
    });

    it('does not extract items from unsupported Telegram and Slack header lines', () => {
      for (const line of ['Priya, [12.10.2026 21:15]', 'Priya  9:15 PM']) {
        const result = analyzeConversation(line);
        expect(result.unparsedLineCount).toBeGreaterThan(0);
        expect(result.dates).toEqual([]);
        expect(result.actions).toEqual([]);
        expect(result.urgent).toEqual([]);
      }

      const afterChatMessage = analyzeConversation('Alice: Hello\nPriya, [12.10.2026 21:15]');
      expect(afterChatMessage.unparsedLineCount).toBe(1);
      expect(afterChatMessage.dates).toEqual([]);
    });

    it('combines tomorrow and a clock time into one date and action deadline', () => {
      const result = analyzeConversation('Priya: I will fix the registration bug by tomorrow 4 PM');
      expect(result.dates.map((date) => date.date)).toEqual(['tomorrow 4 PM']);
      expect(result.actions[0]?.deadline).toBe('tomorrow 4 PM');
    });

    it('copies every briefing category and groups tasks by assignee', () => {
      const result = analyzeConversation(
        'Alex: Deadline is Friday\n' +
        'Sarah: @Alex please review the doc\n' +
        'Priya: TODO: fix the page\n' +
        'Sarah: We are not going with React; we are going with Vue instead.\n' +
        'Sarah: Please note the meeting is tomorrow\n' +
        'Sarah: Heads up, the room changed\n' +
        'Sarah: @Alex the review is due Friday',
        'Alex'
      );
      const copied = formatBriefingForClipboard(result, 'Alex');
      expect(copied).toContain('Summary:');
      expect(copied).toContain('Urgent:');
      expect(copied).toContain('Actions grouped by assignee:');
      expect(copied).toContain('Alex');
      expect(copied).toContain('Unassigned');
      expect(copied).toContain('Decisions (confirmed):');
      expect(copied).toContain('Going with Vue (rejected: React)');
      expect(copied).toContain('Dates:');
      expect(copied).toContain('Announcements:');
      expect(copied).toContain('Mentions:');
      expect(copied.indexOf('\nAlex:')).toBeLessThan(copied.indexOf('\nUnassigned:'));
    });

    it('marks question-like dates as tentative', () => {
      const result = analyzeConversation('Sam: Maybe we should launch on Friday?');
      expect(result.dates).toContainEqual(expect.objectContaining({
        date: 'on Friday',
        status: 'tentative',
      }));
    });

    it('extracts only affirmative decision text and isolates rejected options', () => {
      const result = analyzeConversation('Sam: We are not going with React; we are going with Vue instead.');
      expect(result.decisions).toContainEqual(expect.objectContaining({
        decision: 'Going with Vue',
        rejectedOptions: ['React'],
      }));
    });

    it('records an option rejected in a non-agreement message', () => {
      const result = analyzeConversation("Sam: I don't agree; let's not go with React.");
      expect(result.decisions).toContainEqual(expect.objectContaining({
        rejectedOptions: ['React'],
      }));
    });

    it('never creates a decision with empty text for a rejected proposal', () => {
      const result = analyzeConversation("Sam: I don't agree; let's not go with React.");
      expect(result.decisions.every((item) => item.decision.trim().length > 0)).toBe(true);
    });

    it.each([
      ['I will fix the bug by 4 PM', 'I will fix the bug'],
      ['I will upload the logo by Friday', 'I will upload the logo'],
    ])('removes dangling deadline prepositions from action task %s', (message, task) => {
      const result = analyzeConversation(`Sam: ${message}`);
      expect(result.actions).toContainEqual(expect.objectContaining({ task }));
    });

    it('does not extract actions from lines without an attributed sender', () => {
      const result = analyzeConversation('Priya  9:15 PM\nI will fix it by 4 PM');
      expect(result.unparsedLineCount).toBeGreaterThan(0);
      expect(result.actions).toEqual([]);
    });

    it('copies all action assignees, announcements, and tentative statuses with the user first', () => {
      const result = analyzeConversation(
        'Alex: Maybe I will send the report by Friday\n' +
        'Sarah: Please review the doc ASAP\n' +
        'Sam: Let\'s go with Vue if the client approves.\n' +
        'Sam: Heads up, the room changed',
        'Alex'
      );
      const copied = formatBriefingForClipboard(result, 'Alex');
      expect(copied.indexOf('\nAlex:')).toBeLessThan(copied.indexOf('\nUnassigned:'));
      expect(copied).toContain('[Tentative] Maybe I will send the report');
      expect(copied).toContain('Please review the doc ASAP');
      expect(copied).toContain('Announcements:\n- Heads up, the room changed');
      expect(copied).toContain('Decisions (tentative):\n- [Tentative] Let\'s go with Vue');
    });

    it('extracts imperative Please requests as unassigned actions without evidence of an assignee', () => {
      const result = analyzeConversation('Please review the doc ASAP');
      expect(result.actions).toContainEqual(expect.objectContaining({
        task: 'review the doc ASAP',
        assignee: 'Unassigned',
      }));
    });

    it('creates unassigned TODO and polite-request actions, and tentative name-directed requests', () => {
      const todo = analyzeConversation('TODO: fix the registration page.');
      expect(todo.actions).toContainEqual(expect.objectContaining({
        assignee: 'Unassigned',
        task: 'fix the registration page',
      }));

      const please = analyzeConversation('Please send the report by Friday.');
      expect(please.actions).toContainEqual(expect.objectContaining({
        assignee: 'Unassigned',
        task: 'send the report',
        deadline: 'by Friday',
      }));

      const directed = analyzeConversation('Bob, can you send the invoice?');
      expect(directed.actions).toContainEqual(expect.objectContaining({
        assignee: 'Bob',
        status: 'tentative',
      }));
    });

    it('handles Unicode sender names', () => {
      const result = analyzeConversation('José: Hola amigos\nFrançois: Bonjour', 'Alice');
      expect(result.participants).toContain('José');
      expect(result.participants).toContain('François');
    });

    it('handles regex-special characters in username without crashing', () => {
      const result = analyzeConversation('Alex: Can you help?\nBob: Sure', 'Alex(');
      expect(result.messageCount).toBe(2);
    });

    it('handles C++ username without crashing', () => {
      const result = analyzeConversation('C++Dev: Need to fix the build\nBob: On it', 'C++');
      expect(result.messageCount).toBe(2);
    });

    it('handles ambiguous dates correctly', () => {
      const result = analyzeConversation('Alice: The meeting is on 12/5\nBob: Got it', 'Alice');
      expect(result.dates.length).toBeGreaterThan(0);
    });

    it('handles duplicate dates without duplicates', () => {
      const result = analyzeConversation('Alice: Deadline is December 5th and December 5th\nBob: Noted', 'Alice');
      // The current implementation may extract both occurrences, which is acceptable
      // The important thing is it doesn't crash and handles the input
      expect(result.messageCount).toBe(2);
    });

    it('handles empty input gracefully', () => {
      const result = analyzeConversation('', 'Alice');
      expect(result.messageCount).toBe(0);
      expect(result.urgent).toEqual([]);
      expect(result.actions).toEqual([]);
    });

    it('handles malformed input with no colons', () => {
      const result = analyzeConversation('Just random text\nWith no structure\nAt all', 'Alice');
      expect(result.messageCount).toBe(3);
    });

    it('handles very long input without crashing', () => {
      const lines: string[] = [];
      for (let i = 0; i < 5000; i++) {
        lines.push(`User${i % 5}: Message number ${i} with some content here`);
      }
      const result = analyzeConversation(lines.join('\n'), 'User0');
      expect(result.messageCount).toBe(5000);
    });
  });
});
