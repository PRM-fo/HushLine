import { useRef, useState } from 'react';
import { Eraser, FileText, Loader2, User, Zap } from 'lucide-react';

interface ConversationInputProps {
  value: string;
  onChange: (value: string) => void;
  userName: string;
  onUserNameChange: (value: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  isProcessing: boolean;
  error: string | null;
}

const MIN_CHARS = 20;

export function ConversationInput({
  value,
  onChange,
  userName,
  onUserNameChange,
  onAnalyze,
  onClear,
  isProcessing,
  error,
}: ConversationInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const charCount = value.length;
  const canAnalyze = charCount >= MIN_CHARS && !isProcessing;

  const handleAnalyze = () => {
    if (canAnalyze) onAnalyze();
  };

  return (
    <section id="input" className="relative py-16 lg:py-24 scroll-mt-16">
      <div className="max-w-4xl mx-auto px-6 lg:px-10">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-px bg-teal-400/40" />
          <span className="section-label">Your signal starts here</span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl font-600 text-text-main mb-3">
          Your signal starts here.
        </h2>
        <p className="text-text-muted mb-8 max-w-xl">
          Paste a real conversation to uncover important decisions, tasks, and deadlines.
          Analysis uses local pattern matching in this browser.
        </p>

        {/* Input card */}
        <div
          className={`glass-panel transition-all duration-300 ${
            isFocused ? 'border-primary-500/50 shadow-xl shadow-primary-500/15' : ''
          }`}
        >
          {/* Textarea */}
          <div className="p-1">
            <label htmlFor="conversation-input" className="block px-5 pt-4 text-sm font-medium text-text-main">
              Conversation text
            </label>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Paste your conversation here…&#10;&#10;Supported formats:&#10;Name: message text&#10;WhatsApp Android and iOS exports"
              className="w-full h-56 sm:h-64 bg-transparent resize-none px-5 py-4 text-text-main placeholder-text-muted/80 focus:outline-none focus:ring-2 focus:ring-primary-300/80 focus:ring-offset-2 focus:ring-offset-midnight-950 rounded-xl text-sm leading-relaxed font-mono"
              spellCheck={false}
              disabled={isProcessing}
              id="conversation-input"
              aria-describedby="char-count input-hint"
            />
          </div>

          {/* Footer bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3 border-t border-text-muted/10">
            {/* Left: char count + clear */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-text-muted" id="char-count">
                <FileText className="w-3.5 h-3.5" />
                <span className={charCount < MIN_CHARS && charCount > 0 ? 'text-amber-400' : ''}>
                  {charCount.toLocaleString()} characters
                </span>
              </div>
              {value.length > 0 && (
                <button
                  onClick={onClear}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main transition-colors disabled:opacity-40"
                  aria-label="Clear input"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Username + Analyze */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {/* Username */}
          <div className="relative flex-1 sm:max-w-xs">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500/60" />
            <input
              type="text"
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder="Your name (optional — finds your tasks)"
              className="input-field pl-11 text-sm"
              disabled={isProcessing}
              aria-label="Your name or username (optional)"
            />
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`btn-primary flex-1 sm:flex-initial sm:min-w-[200px] group ${
              !canAnalyze ? 'opacity-40 cursor-not-allowed hover:shadow-none' : ''
            }`}
            aria-label="Analyze conversation"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-midnight-950" />
                Analyze conversation
              </>
            )}
          </button>
        </div>

        {/* Validation hint */}
        <p id="input-hint" className="mt-3 text-sm text-text-muted" aria-live="polite" aria-atomic="true">
          {charCount > 0 && charCount < MIN_CHARS
            ? `Add at least ${MIN_CHARS} characters to analyze (${MIN_CHARS - charCount} more to go).`
            : ''}
        </p>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in" role="alert">
            <span className="text-sm text-red-300">{error}</span>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-6 glass-panel p-6 animate-fade-in" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary-300 animate-spin" />
              <span className="text-sm text-text-muted font-mono">Analyzing your conversation on this device…</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
