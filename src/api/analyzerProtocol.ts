import type { BriefingResult } from '@/core/types';

export interface AnalyzeApiRequest {
  raw: string;
  userName?: string;
}

export interface AnalyzeApiMetadata {
  engineVersion: string;
  processingMs: number;
}

export type AnalyzeApiResponse =
  | {
      type: 'result';
      requestId: string;
      result: BriefingResult;
      metadata: AnalyzeApiMetadata;
    }
  | {
      type: 'error';
      requestId: string;
      error: {
        code: string;
        message: string;
      };
    };

export interface HealthApiResponse {
  status: 'ok';
  engineVersion: string;
}
