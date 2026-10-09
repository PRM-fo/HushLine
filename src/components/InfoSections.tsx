import { Cpu, EyeOff, Lock, Search, ShieldCheck, Zap } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: 'Paste the conversation',
      desc: 'Paste a supported chat export or messages in Name: message format. WhatsApp Android and iOS export lines are supported.',
    },
    {
      icon: Cpu,
      title: 'Analyze on-device',
      desc: 'The analyzer is implemented in the browser and uses pattern matching; there is no server-side analysis endpoint in this app.',
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
      title: 'Browser-side heuristic analysis',
      desc: 'The analyzer runs in browser code, and this repository has no server-side analysis endpoint.',
    },
    {
      icon: Lock,
      title: 'No account integration',
      desc: 'This app has no sign-up, login, or analytics integration and does not request access to chat accounts or contacts.',
    },
    {
      icon: EyeOff,
      title: 'Input is not saved by the app',
      desc: 'The current page keeps pasted text in application memory. There is no feature to save or restore conversations.',
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
            How conversation analysis works.
          </h2>
          <p className="text-text-muted max-w-2xl mx-auto text-balance">
            Conversation analysis runs in the browser with a local heuristic engine. Hosting and browser-level network behavior are outside this app's analysis.
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
