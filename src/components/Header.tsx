import { Radio, Shield } from 'lucide-react';

interface HeaderProps {
  onNavigate: (section: string) => void;
  onFindSignal: () => void;
}

export function Header({ onNavigate, onFindSignal }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-ice-500/5 backdrop-blur-xl bg-midnight-950/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <button
          onClick={() => onNavigate('hero')}
          className="flex items-center gap-2.5 group"
          aria-label="Hushline home"
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-teal-400/10 group-hover:bg-teal-400/20 transition-colors duration-300" />
            <Radio className="w-5 h-5 text-teal-300 group-hover:text-teal-200 transition-colors duration-300" strokeWidth={2} />
          </div>
          <span className="font-display text-xl font-600 tracking-tight text-ice-50">
            Hush<span className="text-teal-300">line</span>
          </span>
        </button>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          <button
            onClick={() => onNavigate('how-it-works')}
            className="btn-ghost"
          >
            How it works
          </button>
          <button
            onClick={() => onNavigate('privacy')}
            className="btn-ghost"
          >
            Privacy
          </button>
        </nav>

        {/* CTA + privacy badge */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight-800/50 border border-ice-500/10">
            <Shield className="w-3.5 h-3.5 text-teal-300" strokeWidth={2} />
            <span className="text-xs font-medium text-ice-300">On-device</span>
          </div>
          <button onClick={onFindSignal} className="btn-primary text-sm px-5 py-2.5">
            Analyze conversation
          </button>
        </div>
      </div>
    </header>
  );
}
