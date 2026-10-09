import { Cpu, Eye, EyeOff, Lock, Search, ShieldCheck, Zap } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: 'Paste the conversation',
      desc: 'Copy any group chat — Discord, WhatsApp, Slack, iMessage. No accounts, no exports, no plugins.',
    },
    {
      icon: Cpu,
      title: 'Analyze on-device',
      desc: 'Hushline parses every message locally in your browser using a heuristic engine — no data leaves your device.',
    },
    {
      icon: Zap,
      title: 'Get the briefing',
      desc: 'A structured summary with urgent items, your tasks, group decisions, key dates, and buried announcements.',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 lg:py-28 scroll-mt-16">
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-primary-500/40" />
            <span className="section-label">How it works</span>
            <div className="w-8 h-px bg-primary-500/40" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-600 text-text-main text-balance">
            Three steps from noise to clarity.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="glass-panel glass-panel-hover p-6 lg:p-8 relative group"
              >
                {/* Step number */}
                <div className="absolute top-6 right-6 font-display text-5xl font-700 text-midnight-600/40 group-hover:text-primary-500/20 transition-colors duration-500">
                  {i + 1}
                </div>

                <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/15 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary-300" />
                </div>
                <h3 className="font-display text-lg font-600 text-text-main mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Privacy() {
  const principles = [
    {
      icon: Cpu,
      title: 'Processed on this device',
      desc: 'Your pasted conversations are analyzed entirely in your browser. No text is transmitted to servers, APIs, or cloud AI.',
    },
    {
      icon: Lock,
      title: 'No accounts, no tracking',
      desc: 'No sign-up, no login, no analytics. Hushline never requests access to your chat accounts or contact lists.',
    },
    {
      icon: EyeOff,
      title: 'Memory only, cleared on reset',
      desc: 'Pasted text stays in browser memory and is cleared the moment you start a new conversation or close the tab.',
    },
    {
      icon: ShieldCheck,
      title: 'Honest about what it is',
      desc: 'Hushline uses a transparent heuristic engine — not a black-box model. It shows evidence snippets so you can verify every extraction.',
    },
  ];

  return (
    <section id="privacy" className="relative py-20 lg:py-28 scroll-mt-16">
      {/* Background glow */}
      <div className="absolute inset-0 bg-radial-glow" />

      <div className="relative max-w-5xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-primary-500/40" />
            <span className="section-label">Privacy</span>
            <div className="w-8 h-px bg-primary-500/40" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-600 text-text-main text-balance mb-4">
            Your conversations stay yours.
          </h2>
          <p className="text-text-muted max-w-2xl mx-auto text-balance">
            Privacy isn't a feature we tacked on — it's the foundation. Everything happens in your browser. Nothing is sent, stored, or shared.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {principles.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={i}
                className="glass-panel glass-panel-hover p-6 flex gap-4"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/15 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-300" />
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-base font-600 text-text-main mb-1.5">{p.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
