import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeConversation } from '@/core';
import { AnalyzerApiClient } from './analyzerApiClient';
import type { AnalyzerRequest, AnalyzerResponse } from '@/worker/protocol';
import type { AnalyzerWorkerPort } from '@/worker/analyzerClient';

class FakeWorker implements AnalyzerWorkerPort {
  onmessage: ((event: MessageEvent<AnalyzerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  requests: AnalyzerRequest[] = [];
  terminated = false;

  postMessage(message: AnalyzerRequest): void {
    this.requests.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  respond(response: AnalyzerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<AnalyzerResponse>);
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('AnalyzerApiClient', () => {
  it('sends a typed same-origin request and returns server metadata', async () => {
    const result = analyzeConversation('');
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const requestId = new Headers(init?.headers).get('X-Request-ID');
      return new Response(JSON.stringify({
        type: 'result',
        requestId,
        result,
        metadata: { engineVersion: '1.0.0', processingMs: 4 },
      }), { status: 200 });
    });
    const client = new AnalyzerApiClient(fetcher);

    await expect(client.analyze('Sam: this is enough text for analysis', 'Sam')).resolves.toMatchObject({
      result,
      metadata: { engineVersion: '1.0.0', processingMs: 4, execution: 'server' },
    });
    expect(fetcher).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
    client.dispose();
  });

  it('surfaces validation errors from the API without a local retry', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
      new Response(JSON.stringify({
        type: 'error',
        requestId: new Headers(init?.headers).get('X-Request-ID'),
        error: { code: 'INPUT_TOO_LARGE', message: 'Input too large.' },
      }), { status: 413 })
    );
    const worker = new FakeWorker();
    const client = new AnalyzerApiClient(fetcher, () => worker);

    await expect(client.analyze('large input')).rejects.toMatchObject({ message: 'Input too large.' });
    expect(worker.requests).toHaveLength(0);
    client.dispose();
  });

  it('rejects over-limit text before making a network request', async () => {
    const fetcher = vi.fn();
    const client = new AnalyzerApiClient(fetcher);

    await expect(client.analyze('x'.repeat(100_001))).rejects.toThrow(/100,000 characters/);
    expect(fetcher).not.toHaveBeenCalled();
    client.dispose();
  });

  it('uses the Web Worker when the server endpoint is unavailable', async () => {
    const fetcher = vi.fn(async () => new Response('not found', { status: 404 }));
    const worker = new FakeWorker();
    const client = new AnalyzerApiClient(fetcher, () => worker);
    const pending = client.analyze('Sam: this is enough text for analysis');
    await vi.waitFor(() => expect(worker.requests).toHaveLength(1));
    const request = worker.requests[0];
    worker.respond({
      type: 'result',
      requestId: request.requestId,
      result: analyzeConversation('Sam: this is enough text for analysis'),
    });

    await expect(pending).resolves.toMatchObject({
      metadata: { execution: 'local-fallback' },
    });
    client.dispose();
  });

  it('cancels a request and ignores its stale server response', async () => {
    let completeFirstRequest: ((response: Response) => void) | undefined;
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      if (fetcher.mock.calls.length === 1) {
        return new Promise<Response>((resolve) => { completeFirstRequest = resolve; });
      }
      const requestId = new Headers(init?.headers).get('X-Request-ID');
      return Promise.resolve(new Response(JSON.stringify({
        type: 'result',
        requestId,
        result: analyzeConversation(''),
        metadata: { engineVersion: '1.0.0', processingMs: 1 },
      }), { status: 200 }));
    });
    const client = new AnalyzerApiClient(fetcher);
    const cancelled = client.analyze('Sam: this is enough text for analysis');
    const rejection = expect(cancelled).rejects.toMatchObject({ cancelled: true });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    client.cancel();
    await rejection;

    const current = client.analyze('Priya: this is another conversation');
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    const requestId = new Headers(fetcher.mock.calls[1][1]?.headers).get('X-Request-ID');
    completeFirstRequest?.(new Response(JSON.stringify({
      type: 'result',
      requestId: new Headers(fetcher.mock.calls[0][1]?.headers).get('X-Request-ID'),
      result: analyzeConversation('Sam: stale result'),
      metadata: { engineVersion: '1.0.0', processingMs: 1 },
    }), { status: 200 }));
    await expect(current).resolves.toMatchObject({
      metadata: { requestId, execution: 'server' },
    });
    client.dispose();
  });

  it('times out and aborts the pending request', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      })
    );
    const client = new AnalyzerApiClient(fetcher);
    const pending = client.analyze('Sam: this is enough text for analysis', undefined, { timeoutMs: 10 });
    const rejection = expect(pending).rejects.toMatchObject({ message: 'Analysis timed out. Try a smaller input chunk and run it again.' });
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    client.dispose();
  });
});
