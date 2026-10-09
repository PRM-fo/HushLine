import { useCallback, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ConversationInput } from '@/components/ConversationInput';
import { Briefing } from '@/components/Briefing';
import { HowItWorks, Privacy } from '@/components/InfoSections';
import { Footer } from '@/components/Footer';
import { analyzeConversation } from '@/lib/analyzer';
import type { BriefingResult } from '@/lib/analyzer';

export default function App() {
  const [conversation, setConversation] = useState('');
  const [userName, setUserName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLDivElement>(null);
  const briefingRef = useRef<HTMLDivElement>(null);

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
      setConversation('');
      setError(null);
    }
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [result]);

  const handleAnalyze = useCallback(() => {
    if (conversation.trim().length < 20) {
      setError('Please paste at least 20 characters of conversation.');
      return;
    }

    setError(null);
    setIsProcessing(true);

    // Brief delay for UX clarity — actual analysis is synchronous
    setTimeout(() => {
      try {
        const analysis = analyzeConversation(conversation, userName.trim() || undefined);
        setResult(analysis);
        setIsProcessing(false);
        setTimeout(() => {
          briefingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch {
        setError('Something went wrong while analyzing. Please try again.');
        setIsProcessing(false);
      }
    }, 600);
  }, [conversation, userName]);

  const handleClear = useCallback(() => {
    setConversation('');
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setConversation('');
    setUserName('');
    setError(null);
    setResult(null);
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
              onClear={handleClear}
              isProcessing={isProcessing}
              error={error}
            />
          </div>
        )}

        {result && (
          <div ref={briefingRef}>
            <Briefing result={result} userName={userName} onReset={handleReset} />
          </div>
        )}

        {!result && <HowItWorks />}
        {!result && <Privacy />}
      </main>

      <Footer />
    </div>
  );
}
