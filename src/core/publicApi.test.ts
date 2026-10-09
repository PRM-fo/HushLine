import { describe, expect, it } from 'vitest';
import * as compatibilityApi from '@/lib/analyzer';
import * as coreApi from './index';

describe('analyzer compatibility API', () => {
  it('re-exports the same public functions as the core entry point', () => {
    expect(compatibilityApi.analyzeConversation).toBe(coreApi.analyzeConversation);
    expect(compatibilityApi.parseConversation).toBe(coreApi.parseConversation);
    expect(compatibilityApi.parseMessages).toBe(coreApi.parseMessages);
    expect(compatibilityApi.formatBriefingForClipboard).toBe(coreApi.formatBriefingForClipboard);
    expect(compatibilityApi.formatUnparsedLineWarning).toBe(coreApi.formatUnparsedLineWarning);
  });
});
