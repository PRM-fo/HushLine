import { useCallback, useEffect, useRef, useState } from 'react';
import type { BriefingResult } from '@/core/types';
import { AnalyzerClient, AnalyzerClientError } from '@/worker/analyzerClient';

export function useAnalyzer(userName: string) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<AnalyzerClient | null>(null);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const client = new AnalyzerClient();
    clientRef.current = client;
    return () => {
      requestVersionRef.current += 1;
      client.dispose();
      if (clientRef.current === client) clientRef.current = null;
    };
  }, []);

  const analyze = useCallback((input: string, onStarted?: () => void) => {
    if (input.trim().length < 20) {
      setError('Please paste at least 20 characters of conversation.');
      return;
    }

    const client = clientRef.current ?? new AnalyzerClient();
    clientRef.current = client;
    const requestVersion = ++requestVersionRef.current;
    onStarted?.();
    setError(null);
    setIsProcessing(true);

    void client.analyze(input, userName.trim() || undefined).then((analysisResult) => {
      if (requestVersion !== requestVersionRef.current) return;
      setResult(analysisResult);
      setIsProcessing(false);
    }).catch((cause: unknown) => {
      if (requestVersion !== requestVersionRef.current) return;
      if (cause instanceof AnalyzerClientError && cause.cancelled) return;
      setError(cause instanceof Error ? cause.message : 'Analysis failed. Please try again.');
      setIsProcessing(false);
    });
  }, [userName]);

  const cancel = useCallback(() => {
    requestVersionRef.current += 1;
    clientRef.current?.cancel();
    setIsProcessing(false);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    analyze,
    cancel,
    clearError,
    error,
    isProcessing,
    reset,
    result,
  };
}
