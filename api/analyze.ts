import { handleAnalyzePayload } from '../src/server/analyzeRequest';
import type { VercelRequest, VercelResponse } from '../src/server/vercel';

function getHeader(request: VercelRequest, name: string): string | undefined {
  const value = request.headers[name];
  return typeof value === 'string' ? value : undefined;
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};

function requestIdFrom(request: VercelRequest): string {
  const candidate = getHeader(request, 'x-request-id');
  return typeof candidate === 'string' && /^[a-f0-9-]{16,64}$/i.test(candidate)
    ? candidate
    : globalThis.crypto.randomUUID();
}

export default function handler(request: VercelRequest, response: VercelResponse) {
  const requestId = requestIdFrom(request);
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Request-ID', requestId);

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({
      type: 'error',
      requestId,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST to analyze a conversation.' },
    });
  }

  const contentType = (getHeader(request, 'content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return response.status(415).json({
      type: 'error',
      requestId,
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send the request as application/json.' },
    });
  }

  const origin = getHeader(request, 'origin');
  const host = getHeader(request, 'x-forwarded-host') ?? getHeader(request, 'host');
  if (origin && typeof host === 'string') {
    try {
      if (new URL(origin).host !== host) {
        return response.status(403).json({
          type: 'error',
          requestId,
          error: { code: 'CROSS_ORIGIN', message: 'Cross-origin analysis requests are not allowed.' },
        });
      }
    } catch {
      return response.status(403).json({
        type: 'error',
        requestId,
        error: { code: 'CROSS_ORIGIN', message: 'The request origin is invalid.' },
      });
    }
  }

  const outcome = handleAnalyzePayload(request.body, requestId);
  return response.status(outcome.status).json(outcome.body);
}
