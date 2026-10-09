import type { BriefingResult } from '@/core/types';
import type { AnalyzerRequest, AnalyzerResponse } from './protocol';

export interface AnalyzerWorkerPort {
  onmessage: ((event: MessageEvent<AnalyzerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: AnalyzerRequest): void;
  terminate(): void;
}

export type AnalyzerWorkerFactory = () => AnalyzerWorkerPort;

export interface AnalyzeOptions {
  timeoutMs?: number;
}

export class AnalyzerClientError extends Error {
  constructor(message: string, readonly cancelled = false) {
    super(message);
    this.name = 'AnalyzerClientError';
  }
}

interface PendingAnalysis {
  requestId: string;
  resolve: (result: BriefingResult) => void;
  reject: (error: AnalyzerClientError) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function createBrowserWorker(): AnalyzerWorkerPort {
  return new Worker(new URL('./analyzer.worker.ts', import.meta.url), { type: 'module' });
}

export class AnalyzerClient {
  private worker: AnalyzerWorkerPort | null = null;
  private pending: PendingAnalysis | null = null;
  private requestCounter = 0;
  private disposed = false;

  constructor(private readonly workerFactory: AnalyzerWorkerFactory = createBrowserWorker) {}

  analyze(raw: string, userName?: string, options: AnalyzeOptions = {}): Promise<BriefingResult> {
    if (this.disposed) {
      return Promise.reject(new AnalyzerClientError('Unable to start analysis: The analyzer has been disposed.'));
    }
    this.cancel();
    const requestId = `analysis_${++this.requestCounter}`;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return new Promise<BriefingResult>((resolve, reject) => {
      let worker: AnalyzerWorkerPort;
      try {
        worker = this.getWorker();
      } catch (cause) {
        reject(new AnalyzerClientError(
          `Unable to start analysis: ${cause instanceof Error ? cause.message : 'Please try again.'}`
        ));
        return;
      }

      const timeout = setTimeout(() => {
        if (this.pending?.requestId !== requestId) return;
        this.finishPending(new AnalyzerClientError('Analysis timed out. Try a smaller input chunk and run it again.'));
        this.destroyWorker();
      }, timeoutMs);

      this.pending = { requestId, resolve, reject, timeout };
      try {
        worker.postMessage({ type: 'analyze', requestId, raw, userName });
      } catch (cause) {
        this.failWorker(new AnalyzerClientError(
          `Analysis failed${cause instanceof Error ? `: ${cause.message}` : '. Please try again.'}`
        ));
      }
    });
  }

  cancel(): void {
    if (!this.pending) return;
    this.finishPending(new AnalyzerClientError('Analysis cancelled.', true));
  }

  dispose(): void {
    this.cancel();
    this.destroyWorker();
    this.disposed = true;
  }

  private getWorker(): AnalyzerWorkerPort {
    if (this.worker) return this.worker;
    const worker = this.workerFactory();
    worker.onmessage = (event) => this.handleMessage(event.data);
    worker.onerror = (event) => {
      this.failWorker(new AnalyzerClientError(
        `Analysis failed${event.message ? `: ${event.message}` : '. Please try again.'}`
      ));
    };
    worker.onmessageerror = () => {
      this.failWorker(new AnalyzerClientError('Analysis returned data the page could not read. Please try again.'));
    };
    this.worker = worker;
    return worker;
  }

  private handleMessage(response: AnalyzerResponse): void {
    if (!this.pending || response.requestId !== this.pending.requestId) return;
    if (response.type === 'error') {
      this.failWorker(new AnalyzerClientError(`Analysis failed: ${response.message}`));
      return;
    }
    const pending = this.pending;
    clearTimeout(pending.timeout);
    this.pending = null;
    pending.resolve(response.result);
  }

  private failWorker(error: AnalyzerClientError): void {
    this.finishPending(error);
    this.destroyWorker();
  }

  private finishPending(error: AnalyzerClientError): void {
    if (!this.pending) return;
    const pending = this.pending;
    clearTimeout(pending.timeout);
    this.pending = null;
    pending.reject(error);
  }

  private destroyWorker(): void {
    if (!this.worker) return;
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.onmessageerror = null;
    this.worker.terminate();
    this.worker = null;
  }
}
