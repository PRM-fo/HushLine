import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleAnalyzePayload } from './analyzeRequest';
import { MAX_ANALYSIS_CHARS } from '../core/limits';

describe('handleAnalyzePayload', () => {
  afterEach(() => vi.restoreAllMocks());

  it('validates and analyzes a request with bounded timing metadata', () => {
    let time = 100;
    const response = handleAnalyzePayload(
      { raw: 'Sam: The deadline is Friday at 5 PM.' },
      'request-1234567890',
      () => (time += 3)
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      type: 'result',
      requestId: 'request-1234567890',
      metadata: { engineVersion: '1.0.0', processingMs: 3 },
    });
    expect(response.body.type === 'result' && response.body.result.participantCount).toBe(1);
  });

  it('rejects malformed, short, oversized, and invalid username payloads', () => {
    expect(handleAnalyzePayload(null, 'request-1234567890').status).toBe(400);
    expect(handleAnalyzePayload({ raw: 'too short' }, 'request-1234567890').status).toBe(400);
    expect(handleAnalyzePayload(
      { raw: 'x'.repeat(MAX_ANALYSIS_CHARS + 1) },
      'request-1234567890'
    )).toMatchObject({
      status: 413,
      body: { type: 'error', error: { code: 'INPUT_TOO_LARGE' } },
    });
    expect(handleAnalyzePayload(
      { raw: 'Sam: this is enough text for analysis', userName: 42 },
      'request-1234567890'
    )).toMatchObject({
      status: 400,
      body: { type: 'error', error: { code: 'INVALID_USER_NAME' } },
    });
  });

  it('returns an explicit internal error and logs only request metadata on failure', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = handleAnalyzePayload(
      { raw: 'Sam: this is enough text for analysis' },
      'request-1234567890',
      () => 1,
      () => { throw new Error('private conversation text must not be logged'); }
    );

    expect(response).toMatchObject({
      status: 500,
      body: { type: 'error', error: { code: 'ANALYSIS_FAILED' } },
    });
    expect(log).toHaveBeenCalledWith('Hushline analysis failed', {
      requestId: 'request-1234567890',
      errorName: 'Error',
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private conversation text');
  });
});
