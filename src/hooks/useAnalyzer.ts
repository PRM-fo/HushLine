import { useCallback, useEffect, useRef, useState } from 'react';
import type { BriefingResult } from '@/core/types';
import { AnalyzerApiClient, AnalyzerApiError, type AnalysisOutcome } from '@/services/analyzerApiClient';

export function useAnalyzer(userName: string) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [analysisMetadata, setAnalysisMetadata] = useState<AnalysisOutcome['metadata'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<AnalyzerApiClient | null>(null);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const client = new AnalyzerApiClient();
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

    const client = clientRef.current ?? new AnalyzerApiClient();
    clientRef.current = client;
    const requestVersion = ++requestVersionRef.current;
    onStarted?.();
    setError(null);
    setResult(null);
    setAnalysisMetadata(null);
    setIsProcessing(true);

    void client.analyze(input, userName.trim() || undefined).then((outcome: AnalysisOutcome) => {
      if (requestVersion !== requestVersionRef.current) return;
      setResult(outcome.result);
      setAnalysisMetadata(outcome.metadata);
      setIsProcessing(false);
    }).catch((cause: unknown) => {
      if (requestVersion !== requestVersionRef.current) return;
      if (cause instanceof AnalyzerApiError && cause.cancelled) return;
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
    setAnalysisMetadata(null);
  }, []);

  return {
    analysisMetadata,
    analyze,
    cancel,
    clearError,
    error,
    isProcessing,
    reset,
    result,
  };
}
