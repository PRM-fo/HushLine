import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ConversationInput } from '@/components/ConversationInput';
import { Briefing } from '@/components/Briefing';
import { HowItWorks, Privacy } from '@/components/InfoSections';
import { Footer } from '@/components/Footer';
import type { BriefingResult } from '@/lib/analyzer';

export default function App() {
  const [conversation, setConversation] = useState('');
  const [userName, setUserName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisScope, setAnalysisScope] = useState<string | null>(null);

  const inputRef = useRef<HTMLDivElement>(null);
  const briefingRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopWorker = useCallback((worker = workerRef.current) => {
    worker?.terminate();
    if (workerRef.current === worker) workerRef.current = null;
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    analysisTimeoutRef.current = null;
  }, []);

  useEffect(() => () => stopWorker(), [stopWorker]);

  const scrollTo = useCallback((id: string) => {
    if (id === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToInput = useCallback(() => {
    if (result) {
      setResult(null);
      // Don't clear conversation or username - let user keep them
      setError(null);
    }
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [result]);

  const handleAnalyze = useCallback((input: string, scope?: string) => {
    if (input.trim().length < 20) {
      setError('Please paste at least 20 characters of conversation.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setAnalysisScope(scope ?? null);
    try {
      stopWorker();
      const worker = new Worker(new URL('./lib/analyzer.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<{ result: BriefingResult }>) => {
        stopWorker(worker);
        setResult(event.data.result);
        setIsProcessing(false);
        setTimeout(() => {
          briefingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      };
      worker.onerror = (event) => {
        stopWorker(worker);
        setError(`Analysis failed${event.message ? `: ${event.message}` : '. Please try again.'}`);
        setIsProcessing(false);
      };
      worker.onmessageerror = () => {
        stopWorker(worker);
        setError('Analysis returned data the page could not read. Please try again.');
        setIsProcessing(false);
      };
      analysisTimeoutRef.current = setTimeout(() => {
        if (workerRef.current !== worker) return;
        stopWorker(worker);
        setError('Analysis timed out. Try a smaller input chunk and run it again.');
        setIsProcessing(false);
      }, 30_000);
      worker.postMessage({ raw: input, userName: userName.trim() || undefined });
    } catch (cause) {
      stopWorker();
      setError(`Unable to start analysis: ${cause instanceof Error ? cause.message : 'Please try again.'}`);
      setIsProcessing(false);
    }
  }, [stopWorker, userName]);

  const handleCancelAnalysis = useCallback(() => {
    stopWorker();
    setIsProcessing(false);
    setError(null);
  }, [stopWorker]);

  const handleClear = useCallback(() => {
    setConversation('');
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setError(null);
    setResult(null);
    setAnalysisScope(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-midnight-950 overflow-x-hidden">
      <Header onNavigate={scrollTo} onFindSignal={scrollToInput} />

      <main>
        {!result && (
          <Hero onFindSignal={scrollToInput} />
        )}

        {!result && (
          <div ref={inputRef}>
            <ConversationInput
              value={conversation}
              onChange={setConversation}
              userName={userName}
              onUserNameChange={setUserName}
              onAnalyze={handleAnalyze}
              onCancelAnalysis={handleCancelAnalysis}
              onClear={handleClear}
              isProcessing={isProcessing}
              error={error}
            />
          </div>
        )}

        {result && (
          <div ref={briefingRef}>
            <Briefing result={result} userName={userName} onReset={handleReset} analysisScope={analysisScope} />
          </div>
        )}

        {!result && <HowItWorks />}
        {!result && <Privacy />}
      </main>

      <Footer />
    </div>
  );
}
