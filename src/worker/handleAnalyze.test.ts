import { describe, expect, it } from 'vitest';
import { handleAnalyzeRequest } from './handleAnalyze';
import type { AnalyzerRequest } from './protocol';

const request: AnalyzerRequest = {
  type: 'analyze',
  requestId: 'request-1',
  raw: 'Sam: Meeting tomorrow at 11 AM.',
};

describe('worker request handler', () => {
  it('returns a result response carrying the request ID', () => {
    const response = handleAnalyzeRequest(request);
    expect(response.type).toBe('result');
    expect(response.requestId).toBe('request-1');
  });

  it('turns analyzer exceptions into typed error responses', () => {
    const response = handleAnalyzeRequest(request, () => {
      throw new Error('synthetic failure');
    });
    expect(response).toEqual({
      type: 'error',
      requestId: 'request-1',
      message: 'synthetic failure',
    });
  });

  it('uses the fallback for non-Error exceptions', () => {
    const response = handleAnalyzeRequest(request, () => {
      throw 'unexpected value';
    });
    expect(response).toEqual({
      type: 'error',
      requestId: 'request-1',
      message: 'Please try again.',
    });
  });
});
