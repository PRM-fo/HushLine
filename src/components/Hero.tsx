import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroProps {
  onFindSignal: () => void;
}

/**
 * Animated signal-wave visual: scattered noise dots converge into
 * a clean vertical signal wave — representing noise becoming clarity.
 * No fabricated message content — purely abstract motion.
 */
function SignalVisual() {
  const scatterDots = [
    { x: 8, y: 15, delay: '0s', size: 4 },
    { x: 18, y: 45, delay: '0.3s', size: 3 },
    { x: 12, y: 70, delay: '0.1s', size: 5 },
    { x: 85, y: 20, delay: '0.4s', size: 3 },
    { x: 90, y: 55, delay: '0.2s', size: 4 },
    { x: 82, y: 80, delay: '0.5s', size: 3 },
    { x: 25, y: 30, delay: '0.6s', size: 3 },
    { x: 75, y: 35, delay: '0.15s', size: 4 },
    { x: 30, y: 85, delay: '0.35s', size: 3 },
    { x: 70, y: 90, delay: '0.55s', size: 3 },
  ];

  const waveBars = [15, 25, 40, 55, 70, 85, 100, 85, 70, 55, 40, 25, 15];

  return (
    <div className="relative w-full h-[320px] sm:h-[400px] flex items-center justify-center">
      {/* Background glow - Midnight Aurora */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-secondary-500/5 to-primary-400/10 rounded-3xl" />

      {/* Scattered noise dots - Aurora colors */}
      <div className="absolute inset-0">
        {scatterDots.map((dot, i) => (
          <div
            key={i}
            className={`absolute rounded-full animate-float ${
              i % 3 === 0 ? 'bg-primary-500/40' : i % 3 === 1 ? 'bg-secondary-500/40' : 'bg-primary-400/40'
            }`}
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              animationDelay: dot.delay,
              animationDuration: `${5 + i}s`,
            }}
          />
        ))}
      </div>

      {/* Central signal wave - Aurora gradient */}
      <div className="relative flex items-end justify-center gap-1 h-48">
        {/* Glow behind wave - violet-blue glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-40 h-40 bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-primary-400/20 rounded-full blur-3xl animate-glow-pulse" />
        </div>

        {waveBars.map((h, i) => (
          <div
            key={i}
            className={`w-1.5 sm:w-2 rounded-full animate-wave-pulse ${
              i % 4 === 0
                ? 'bg-gradient-to-t from-primary-500/60 via-primary-400 to-primary-200'
                : i % 4 === 1
                ? 'bg-gradient-to-t from-secondary-500/60 via-secondary-400 to-secondary-200'
                : i % 4 === 2
                ? 'bg-gradient-to-t from-primary-600/60 via-primary-500/80 to-primary-400/40'
                : 'bg-gradient-to-t from-secondary-600/60 via-secondary-500/80 to-secondary-400/40'
            }`}
            style={{
              height: `${h}%`,
              animationDelay: `${i * 0.12}s`,
              animationDuration: `${2 + (i % 3) * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Clarity label - Aurora style */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-500/15 to-secondary-500/15 border border-primary-500/30">
        <Sparkles className="w-3.5 h-3.5 text-primary-300" />
        <span className="text-xs font-mono text-primary-200 tracking-wide">your signal, extracted</span>
      </div>
    </div>
  );
}

export function Hero({ onFindSignal }: HeroProps) {
  return (
    <section id="hero" className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid mask-fade-b" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-primary-500/15 to-secondary-500/15 border border-primary-500/30 mb-8 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-[0.15em] text-primary-200/90">
                Opt-in server analysis · Heuristic engine
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-600 leading-[1.1] tracking-tight text-balance text-text-main animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              500 messages.
              <br />
              <span className="gradient-text">One clear signal.</span>
            </h1>

            {/* Supporting text */}
            <p className="mt-6 text-lg text-text-muted leading-relaxed max-w-md mx-auto lg:mx-0 text-balance animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Cut through the noise. Find what matters. Catch up in seconds.
            </p>

            {/* CTA */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <button onClick={onFindSignal} className="btn-primary w-full sm:w-auto group" aria-label="Find my signal — scroll to conversation input">
                Find my signal
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Right: Animated visual */}
          <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
            <SignalVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
