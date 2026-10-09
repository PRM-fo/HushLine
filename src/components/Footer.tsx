import { Radio } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative py-12 border-t border-text-muted/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-primary-500/10" />
              <Radio className="w-4 h-4 text-primary-300" />
            </div>
            <span className="font-display text-lg font-600 tracking-tight text-text-main">
              Hush<span className="text-primary-300">line</span>
            </span>
          </div>

          <p className="text-sm text-text-muted">
            Silence the noise. Keep the signal.
          </p>

          <p className="text-xs text-text-dim font-mono">
            Built for the unread problem · 100% on-device
          </p>
        </div>
      </div>
    </footer>
  );
}
