import { analyzeConversation } from '@/core';
import type { AnalyzerRequest, AnalyzerResponse } from './protocol';

interface AnalyzerWorkerScope {
  onmessage: ((event: MessageEvent<AnalyzerRequest>) => void) | null;
  postMessage(response: AnalyzerResponse): void;
}

const workerScope = self as unknown as AnalyzerWorkerScope;

workerScope.onmessage = ({ data }) => {
  try {
    workerScope.postMessage({
      type: 'result',
      requestId: data.requestId,
      result: analyzeConversation(data.raw, data.userName),
    });
  } catch (cause) {
    workerScope.postMessage({
      type: 'error',
      requestId: data.requestId,
      message: cause instanceof Error ? cause.message : 'Please try again.',
    });
  }
};
