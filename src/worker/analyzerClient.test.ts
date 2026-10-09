import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeConversation } from '@/core';
import {
  AnalyzerClient,
  type AnalyzerWorkerPort,
} from './analyzerClient';
import type { AnalyzerRequest, AnalyzerResponse } from './protocol';

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

  fail(message: string): void {
    this.onerror?.({ message } as ErrorEvent);
  }
}

function makeFactory() {
  const workers: FakeWorker[] = [];
  const factory = () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  };
  return { factory, workers };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('AnalyzerClient', () => {
  it('resolves a result and reuses the worker for later analyses', async () => {
    const { factory, workers } = makeFactory();
    const client = new AnalyzerClient(factory);
    const firstPromise = client.analyze('first', undefined, { timeoutMs: 1000 });
    const firstRequest = workers[0].requests[0];
    workers[0].respond({
      type: 'result',
      requestId: firstRequest.requestId,
      result: analyzeConversation(''),
    });
    expect(await firstPromise).toEqual(analyzeConversation(''));

    const secondPromise = client.analyze('second', undefined, { timeoutMs: 1000 });
    expect(workers).toHaveLength(1);
    expect(workers[0].requests[1].raw).toBe('second');
    workers[0].respond({
      type: 'result',
      requestId: workers[0].requests[1].requestId,
      result: analyzeConversation(''),
    });
    await secondPromise;
    client.dispose();
  });

  it('rejects protocol errors and recreates the failed worker', async () => {
    const { factory, workers } = makeFactory();
    const client = new AnalyzerClient(factory);
    const firstPromise = client.analyze('first', undefined, { timeoutMs: 1000 });
    workers[0].respond({
      type: 'error',
      requestId: workers[0].requests[0].requestId,
      message: 'boom',
    });
    await expect(firstPromise).rejects.toMatchObject({ message: 'Analysis failed: boom' });
    expect(workers[0].terminated).toBe(true);

    const secondPromise = client.analyze('second', undefined, { timeoutMs: 1000 });
    expect(workers).toHaveLength(2);
    workers[1].respond({
      type: 'result',
      requestId: workers[1].requests[0].requestId,
      result: analyzeConversation(''),
    });
    await secondPromise;
    client.dispose();
  });

  it('rejects worker errors and recreates the worker', async () => {
    const { factory, workers } = makeFactory();
    const client = new AnalyzerClient(factory);
    const failed = client.analyze('first', undefined, { timeoutMs: 1000 });
    workers[0].fail('worker crashed');
    await expect(failed).rejects.toMatchObject({ message: 'Analysis failed: worker crashed' });
    const next = client.analyze('second', undefined, { timeoutMs: 1000 });
    expect(workers).toHaveLength(2);
    workers[1].respond({
      type: 'result',
      requestId: workers[1].requests[0].requestId,
      result: analyzeConversation(''),
    });
    await next;
    client.dispose();
  });

  it('times out and recreates the worker', async () => {
    vi.useFakeTimers();
    const { factory, workers } = makeFactory();
    const client = new AnalyzerClient(factory);
    const timedOut = client.analyze('slow', undefined, { timeoutMs: 20 });
    const rejection = expect(timedOut).rejects.toMatchObject({
      message: 'Analysis timed out. Try a smaller input chunk and run it again.',
    });
    await vi.advanceTimersByTimeAsync(20);
    await rejection;
    expect(workers[0].terminated).toBe(true);
    const next = client.analyze('next', undefined, { timeoutMs: 1000 });
    expect(workers).toHaveLength(2);
    workers[1].respond({
      type: 'result',
      requestId: workers[1].requests[0].requestId,
      result: analyzeConversation(''),
    });
    await next;
    client.dispose();
  });

  it('cancels pending work and ignores its stale response', async () => {
    const { factory, workers } = makeFactory();
    const client = new AnalyzerClient(factory);
    const cancelled = client.analyze('old input', undefined, { timeoutMs: 1000 });
    const oldRequestId = workers[0].requests[0].requestId;
    const cancelledAssertion = expect(cancelled).rejects.toMatchObject({ cancelled: true });
    client.cancel();
    await cancelledAssertion;

    const current = client.analyze('new input', undefined, { timeoutMs: 1000 });
    const currentRequestId = workers[0].requests[1].requestId;
    workers[0].respond({
      type: 'result',
      requestId: oldRequestId,
      result: analyzeConversation('Sam: stale result'),
    });
    expect(workers).toHaveLength(1);
    workers[0].respond({
      type: 'result',
      requestId: currentRequestId,
      result: analyzeConversation(''),
    });
    expect(await current).toEqual(analyzeConversation(''));
    client.dispose();
  });
});
