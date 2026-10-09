import { describe, expect, it } from 'vitest';
import analyzeHandler from '../../api/analyze';
import healthHandler from '../../api/health';
import type { VercelRequest, VercelResponse } from './vercel';

class FakeResponse implements VercelResponse {
  statusCode = 200;
  headers = new Map<string, string>();
  body: unknown;

  setHeader(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(body: unknown): this {
    this.body = body;
    return this;
  }
}

function request(
  method: string,
  headers: VercelRequest['headers'] = {},
  body: unknown = undefined
): VercelRequest {
  return { method, headers, body };
}

describe('analysis API route', () => {
  it('rejects non-POST and cross-origin requests with explicit status codes', () => {
    const methodResponse = new FakeResponse();
    analyzeHandler(request('GET'), methodResponse);
    expect(methodResponse.statusCode).toBe(405);
    expect(methodResponse.headers.get('allow')).toBe('POST');

    const originResponse = new FakeResponse();
    analyzeHandler(request('POST', {
      origin: 'https://attacker.example',
      host: 'hushhline.vercel.app',
      'content-type': 'application/json',
    }, {}), originResponse);
    expect(originResponse.statusCode).toBe(403);
    expect(originResponse.body).toMatchObject({
      type: 'error',
      error: { code: 'CROSS_ORIGIN' },
    });

    const mediaTypeResponse = new FakeResponse();
    analyzeHandler(request('POST', { 'content-type': 'application/jsonp' }, {}), mediaTypeResponse);
    expect(mediaTypeResponse.statusCode).toBe(415);
  });

  it('returns non-cacheable server results with a correlated request ID', () => {
    const response = new FakeResponse();
    analyzeHandler(request('POST', {
      origin: 'https://hushhline.vercel.app',
      host: 'hushhline.vercel.app',
      'content-type': 'application/json',
      'x-request-id': '123e4567-e89b-12d3-a456-426614174000',
    }, { raw: 'Sam: the deadline is Friday at 5 PM.' }), response);

    expect(response.statusCode).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('x-request-id')).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(response.body).toMatchObject({
      type: 'result',
      requestId: '123e4567-e89b-12d3-a456-426614174000',
      metadata: { engineVersion: '1.0.0' },
    });
  });
});

describe('health API route', () => {
  it('reports the analyzer version and rejects other methods', () => {
    const healthy = new FakeResponse();
    healthHandler(request('GET'), healthy);
    expect(healthy.statusCode).toBe(200);
    expect(healthy.body).toEqual({ status: 'ok', engineVersion: '1.0.0' });
    expect(healthy.headers.get('cache-control')).toBe('no-store, max-age=0');

    const invalidMethod = new FakeResponse();
    healthHandler(request('POST'), invalidMethod);
    expect(invalidMethod.statusCode).toBe(405);
  });
});
