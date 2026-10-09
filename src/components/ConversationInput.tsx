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

const MAX_CHARS = 100000;
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
  const progressPct = Math.min((charCount / MAX_CHARS) * 100, 100);

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

        <h2 className="font-display text-3xl sm:text-4xl font-600 text-ice-50 mb-3">
          Your signal starts here.
        </h2>
        <p className="text-ice-300 mb-8 max-w-xl">
          Paste a real conversation to uncover important decisions, tasks, and deadlines.
          Your text never leaves this browser.
        </p>

        {/* Input card */}
        <div
          className={`glass-panel transition-all duration-300 ${
            isFocused ? 'border-teal-400/30 shadow-lg shadow-teal-400/5' : ''
          }`}
        >
          {/* Textarea */}
          <div className="p-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Paste your conversation here…&#10;&#10;Supported formats:&#10;Name: message text&#10;Name [timestamp]: message text&#10;WhatsApp export format"
              className="w-full h-56 sm:h-64 bg-transparent resize-none px-5 py-4 text-ice-50 placeholder-ice-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400/10 rounded-xl text-sm leading-relaxed font-mono"
              spellCheck={false}
              disabled={isProcessing}
              aria-label="Paste your conversation messages here"
              aria-describedby="char-count"
            />
          </div>

          {/* Footer bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3 border-t border-ice-500/10">
            {/* Left: char count + clear */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-ice-400" id="char-count">
                <FileText className="w-3.5 h-3.5" />
                <span className={charCount < MIN_CHARS && charCount > 0 ? 'text-amber-400' : ''}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
              {value.length > 0 && (
                <button
                  onClick={onClear}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-xs text-ice-400 hover:text-ice-200 transition-colors disabled:opacity-40"
                  aria-label="Clear input"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {charCount > 0 && (
            <div className="h-0.5 bg-midnight-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-300 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Username + Analyze */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {/* Username */}
          <div className="relative flex-1 sm:max-w-xs">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ice-500" />
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
        {charCount > 0 && charCount < MIN_CHARS && (
          <p className="mt-3 text-sm text-ice-400">
            Add at least {MIN_CHARS} characters to analyze ({MIN_CHARS - charCount} more to go).
          </p>
        )}

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
              <Loader2 className="w-5 h-5 text-teal-300 animate-spin" />
              <span className="text-sm text-ice-300 font-mono">Analyzing your conversation on this device…</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
