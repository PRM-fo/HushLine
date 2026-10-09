import type { BriefingResult } from '@/core/types';

export type AnalyzerRequest = {
  type: 'analyze';
  requestId: string;
  raw: string;
  userName?: string;
};

export type AnalyzerResponse =
  | { type: 'result'; requestId: string; result: BriefingResult }
  | { type: 'error'; requestId: string; message: string };
