import type { BriefingResult } from '@/core/types';
import { MAX_ANALYSIS_CHARS, MAX_USER_NAME_CHARS } from '@/core/limits';
import type { AnalyzeApiResponse, AnalyzeApiMetadata } from '@/api/analyzerProtocol';
import { AnalyzerClient } from '@/worker/analyzerClient';

export interface AnalysisOutcome {
  result: BriefingResult;
  metadata: AnalyzeApiMetadata & { requestId: string; execution: 'server' | 'local-fallback' };
}

export interface AnalyzeApiOptions {
  timeoutMs?: number;
}

export class AnalyzerApiError extends Error {
  constructor(message: string, readonly cancelled = false) {
    super(message);
    this.name = 'AnalyzerApiError';
  }
}

interface PendingRequest {
  requestId: string;
  controller: AbortController;
  timeout: ReturnType<typeof setTimeout>;
  reject: (error: AnalyzerApiError) => void;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function isAnalyzeApiResponse(value: unknown): value is AnalyzeApiResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Record<string, unknown>;
  if (response.type === 'error') {
    return typeof response.requestId === 'string' &&
      typeof response.error === 'object' &&
      response.error !== null &&
      typeof (response.error as Record<string, unknown>).message === 'string';
  }
  if (response.type !== 'result' || typeof response.requestId !== 'string') return false;
  if (typeof response.result !== 'object' || response.result === null ||
    typeof response.metadata !== 'object' || response.metadata === null) return false;
  const result = response.result as Record<string, unknown>;
  const metadata = response.metadata as Record<string, unknown>;
  return typeof result.summary === 'string' &&
    typeof result.participants === 'object' &&
    Array.isArray(result.participants) &&
    ['urgent', 'actions', 'decisions', 'dates', 'announcements', 'mentions'].every(
      (key) => Array.isArray(result[key])
    ) &&
    typeof metadata.engineVersion === 'string' &&
    typeof metadata.processingMs === 'number' &&
    Number.isFinite(metadata.processingMs) &&
    metadata.processingMs >= 0;
}

export class AnalyzerApiClient {
  private pending: PendingRequest | null = null;
  private disposed = false;
  private readonly localFallback: AnalyzerClient;

  constructor(
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
    workerFactory?: ConstructorParameters<typeof AnalyzerClient>[0]
  ) {
    this.localFallback = new AnalyzerClient(workerFactory);
  }

  analyze(raw: string, userName?: string, options: AnalyzeApiOptions = {}): Promise<AnalysisOutcome> {
    if (raw.length > MAX_ANALYSIS_CHARS) {
      return Promise.reject(new AnalyzerApiError(
        `This analysis is limited to ${MAX_ANALYSIS_CHARS.toLocaleString()} characters.`
      ));
    }
    if (userName && userName.length > MAX_USER_NAME_CHARS) {
      return Promise.reject(new AnalyzerApiError(
        `Your name must be no longer than ${MAX_USER_NAME_CHARS} characters.`
      ));
    }
    if (this.disposed) {
      return Promise.reject(new AnalyzerApiError('Unable to start analysis: The analyzer has been disposed.'));
    }
    this.cancel();

    const requestId = globalThis.crypto.randomUUID();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();

    return new Promise<AnalysisOutcome>((resolve, reject) => {
      let localFallbackStarted = false;
      const analyzeLocally = () => {
        localFallbackStarted = true;
        return this.analyzeLocally(raw, userName, requestId, resolve);
      };
      const timeout = setTimeout(() => {
        if (this.pending?.requestId !== requestId) return;
        this.finish(new AnalyzerApiError('Analysis timed out. Try a smaller input chunk and run it again.'));
        controller.abort();
        this.localFallback.cancel();
      }, timeoutMs);
      this.pending = { requestId, controller, timeout, reject };

      void Promise.resolve().then(() => this.fetcher('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ raw, userName }),
        signal: controller.signal,
      })).then(async (response) => {
        if (response.status === 404 || response.status >= 500) {
          return analyzeLocally();
        }
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          return analyzeLocally();
        }
        if (!isAnalyzeApiResponse(payload) || payload.requestId !== requestId) {
          return analyzeLocally();
        }
        if (!response.ok || payload.type === 'error') {
          const message = payload.type === 'error'
            ? payload.error.message
            : 'Analysis failed. Please try again.';
          throw new AnalyzerApiError(message);
        }

        if (this.pending?.requestId !== requestId) return;
        this.clearPending();
        resolve({
          result: payload.result,
          metadata: { ...payload.metadata, requestId, execution: 'server' },
        });
      }).catch((cause: unknown) => {
        if (this.pending?.requestId !== requestId) return;
        if (localFallbackStarted) {
          const message = cause instanceof Error ? cause.message : 'Local analysis failed. Please try again.';
          this.finish(new AnalyzerApiError(message));
          return;
        }
        if (!(cause instanceof AnalyzerApiError) && !controller.signal.aborted) {
          void analyzeLocally().catch((fallbackError: unknown) => {
            if (this.pending?.requestId !== requestId) return;
            const message = fallbackError instanceof Error
              ? fallbackError.message
              : 'Analysis failed. Please check your connection and try again.';
            this.finish(new AnalyzerApiError(message));
          });
          return;
        }
        const message = cause instanceof Error
          ? cause.message
          : 'Analysis failed. Please check your connection and try again.';
        this.finish(cause instanceof AnalyzerApiError ? cause : new AnalyzerApiError(message));
      });
    });
  }

  cancel(): void {
    if (!this.pending) return;
    const request = this.pending;
    this.finish(new AnalyzerApiError('Analysis cancelled.', true));
    request.controller.abort();
    this.localFallback.cancel();
  }

  dispose(): void {
    this.cancel();
    this.localFallback.dispose();
    this.disposed = true;
  }

  private async analyzeLocally(
    raw: string,
    userName: string | undefined,
    requestId: string,
    resolve: (outcome: AnalysisOutcome) => void
  ): Promise<void> {
    if (this.pending?.requestId !== requestId) return;
    const startedAt = performance.now();
    const result = await this.localFallback.analyze(raw, userName);
    if (this.pending?.requestId !== requestId) return;
    this.clearPending();
    resolve({
      result,
      metadata: {
        engineVersion: '1.0.0',
        processingMs: Math.max(0, Math.round(performance.now() - startedAt)),
        requestId,
        execution: 'local-fallback',
      },
    });
  }

  private finish(error: AnalyzerApiError): void {
    if (!this.pending) return;
    const request = this.pending;
    this.clearPending();
    request.reject(error);
  }

  private clearPending(): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timeout);
    this.pending = null;
  }
}
