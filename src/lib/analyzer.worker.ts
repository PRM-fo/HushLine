import { analyzeConversation, type BriefingResult } from './analyzer';

interface AnalyzerWorkerRequest {
  raw: string;
  userName?: string;
}

interface AnalyzerWorkerResponse {
  result: BriefingResult;
}

interface AnalyzerWorkerScope {
  onmessage: ((event: MessageEvent<AnalyzerWorkerRequest>) => void) | null;
  postMessage: (response: AnalyzerWorkerResponse) => void;
}

const workerScope = self as unknown as AnalyzerWorkerScope;

workerScope.onmessage = ({ data }) => {
  workerScope.postMessage({
    result: analyzeConversation(data.raw, data.userName),
  });
};
