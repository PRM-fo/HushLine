import { analyzeConversation } from '@/core';
import type { BriefingResult } from '@/core/types';
import type { AnalyzerRequest, AnalyzerResponse } from './protocol';

export type ConversationAnalyzer = (raw: string, userName?: string) => BriefingResult;

export function handleAnalyzeRequest(
  request: AnalyzerRequest,
  analyze: ConversationAnalyzer = analyzeConversation
): AnalyzerResponse {
  try {
    return {
      type: 'result',
      requestId: request.requestId,
      result: analyze(request.raw, request.userName),
    };
  } catch (cause) {
    return {
      type: 'error',
      requestId: request.requestId,
      message: cause instanceof Error ? cause.message : 'Please try again.',
    };
  }
}
