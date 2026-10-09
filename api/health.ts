import { ENGINE_VERSION } from '../src/server/analyzeRequest';
import type { VercelRequest, VercelResponse } from '../src/server/vercel';

export default function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ status: 'error', message: 'Use GET for the health check.' });
  }

  return response.status(200).json({ status: 'ok', engineVersion: ENGINE_VERSION });
}
