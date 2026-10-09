import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ConversationInput } from '@/components/ConversationInput';
import { Briefing } from '@/components/Briefing';
import { HowItWorks, Privacy } from '@/components/InfoSections';
import { Footer } from '@/components/Footer';
import { useAnalyzer } from '@/hooks/useAnalyzer';

export default function App() {
  const [conversation, setConversation] = useState('');
  const [userName, setUserName] = useState('');
  const [serverConsent, setServerConsent] = useState(false);
  const [analysisScope, setAnalysisScope] = useState<string | null>(null);
  const { analysisMetadata, analyze, cancel, clearError, error, isProcessing, reset, result } = useAnalyzer(userName);

  const inputRef = useRef<HTMLDivElement>(null);
  const briefingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result) return;
    const timeout = setTimeout(() => {
      briefingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => clearTimeout(timeout);
  }, [result]);

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
      reset();
      // Don't clear conversation or username - let user keep them
    }
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [result, reset]);

  const handleAnalyze = useCallback((input: string, scope?: string) => {
    if (!serverConsent) return;
    setServerConsent(false);
    analyze(input, () => setAnalysisScope(scope ?? null));
  }, [analyze, serverConsent]);

  const handleClear = useCallback(() => {
    setConversation('');
    clearError();
  }, [clearError]);

  const handleReset = useCallback(() => {
    reset();
    setAnalysisScope(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [reset]);

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
              onCancelAnalysis={cancel}
              onClear={handleClear}
              serverConsent={serverConsent}
              onServerConsentChange={setServerConsent}
              isProcessing={isProcessing}
              error={error}
            />
          </div>
        )}

        {result && (
          <div ref={briefingRef}>
            <Briefing
              result={result}
              userName={userName}
              onReset={handleReset}
              analysisScope={analysisScope}
              analysisMetadata={analysisMetadata}
            />
          </div>
        )}

        {!result && <HowItWorks />}
        {!result && <Privacy />}
      </main>

      <Footer />
    </div>
  );
}
