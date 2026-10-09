import type { AnalyzerRequest, AnalyzerResponse } from './protocol';
import { handleAnalyzeRequest } from './handleAnalyze';

interface AnalyzerWorkerScope {
  onmessage: ((event: MessageEvent<AnalyzerRequest>) => void) | null;
  postMessage(response: AnalyzerResponse): void;
}

const workerScope = self as unknown as AnalyzerWorkerScope;

workerScope.onmessage = ({ data }) => {
  workerScope.postMessage(handleAnalyzeRequest(data));
};
