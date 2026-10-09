import { analyzeConversation } from '../core/analyze.js';
import { MAX_ANALYSIS_CHARS, MAX_USER_NAME_CHARS } from '../core/limits.js';
import type { AnalyzeApiResponse } from '../api/analyzerProtocol';
import type { BriefingResult } from '../core/types';

export const ENGINE_VERSION = '1.0.0';

export type AnalysisHandlerResult = {
  status: number;
  body: AnalyzeApiResponse;
};

type Analyzer = (raw: string, userName?: string) => BriefingResult;

function errorResponse(
  status: number,
  requestId: string,
  code: string,
  message: string
): AnalysisHandlerResult {
  return {
    status,
    body: { type: 'error', requestId, error: { code, message } },
  };
}

export function handleAnalyzePayload(
  payload: unknown,
  requestId: string,
  now: () => number = () => performance.now(),
  analyzer: Analyzer = analyzeConversation
): AnalysisHandlerResult {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return errorResponse(400, requestId, 'INVALID_REQUEST', 'Expected a JSON object.');
  }

  const { raw, userName } = payload as Record<string, unknown>;
  if (typeof raw !== 'string') {
    return errorResponse(400, requestId, 'INVALID_REQUEST', 'Conversation text must be a string.');
  }
  if (raw.length < 20) {
    return errorResponse(400, requestId, 'INPUT_TOO_SHORT', 'Please paste at least 20 characters of conversation.');
  }
  if (raw.length > MAX_ANALYSIS_CHARS) {
    return errorResponse(
      413,
      requestId,
      'INPUT_TOO_LARGE',
      `This analysis is limited to ${MAX_ANALYSIS_CHARS.toLocaleString()} characters.`
    );
  }
  if (userName !== undefined && (typeof userName !== 'string' || userName.length > MAX_USER_NAME_CHARS)) {
    return errorResponse(
      400,
      requestId,
      'INVALID_USER_NAME',
      `Your name must be text no longer than ${MAX_USER_NAME_CHARS} characters.`
    );
  }

  const startedAt = now();
  try {
    const result = analyzer(raw, typeof userName === 'string' ? userName : undefined);
    return {
      status: 200,
      body: {
        type: 'result',
        requestId,
        result,
        metadata: {
          engineVersion: ENGINE_VERSION,
          processingMs: Math.max(0, Math.round(now() - startedAt)),
        },
      },
    };
  } catch (cause) {
    console.error('Hushline analysis failed', {
      requestId,
      errorName: cause instanceof Error ? cause.name : 'UnknownError',
    });
    return errorResponse(500, requestId, 'ANALYSIS_FAILED', 'Analysis failed. Please try again.');
  }
}
