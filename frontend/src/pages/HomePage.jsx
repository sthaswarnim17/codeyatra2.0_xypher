import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "🎯",
    title: "Targeted Diagnosis",
    body: "Pinpoints the exact prerequisite concept holding you back — not just a score.",
  },
  {
    icon: "⚡",
    title: "Instant Results",
    body: "100% rule-based engine. No API calls, no hallucinations, no waiting.",
  },
  {
    icon: "🗺️",
    title: "Prerequisite Map",
    body: "See a visual map of which fundamentals you need to revisit before solving harder problems.",
  },
  {
    icon: "📚",
    title: "Bridge Lessons",
    body: "Short, focused explainers delivered exactly when a gap is detected.",
  },
  {
    icon: "📈",
    title: "Progress Tracking",
    body: "Every attempt is stored locally — watch your weak spots shrink over time.",
  },
  {
    icon: "🔒",
    title: "Fully Offline",
    body: "Works without internet. All data stays on your machine.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Pick a Problem",
    desc: "Choose any NEB +2 Physics problem from the library.",
  },
  {
    n: "02",
    title: "Answer Checkpoints",
    desc: "Work through 3 sequential concept-check MCQs.",
  },
  {
    n: "03",
    title: "Get Your Bridge",
    desc: "Receive a targeted lesson on exactly what you missed.",
  },
];

const STATS = [
  { value: "20+", label: "Physics Problems" },
  { value: "3", label: "Prerequisite Nodes" },
  { value: "100%", label: "Offline & Free" },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Gradient background blob */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-indigo-700/20 blur-[120px]" />
      </div>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-20 pb-16">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-700/50 bg-indigo-900/30 px-4 py-1.5 text-xs font-semibold text-indigo-300 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          NEB +2 Physics · Diagnostic Engine
        </span>

        <h1 className="max-w-3xl text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Stop Guessing{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            What You Don&apos;t Know.
          </span>
        </h1>

        <p className="max-w-xl text-slate-400 text-lg leading-relaxed mb-10">
          SikshyaMap AI runs you through checkpoint MCQs on any physics problem,
          detects your exact prerequisite gap, and hands you a focused bridge
          lesson — in under 60 seconds.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            to="/questions"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-8 py-3 font-semibold text-white transition-all shadow-lg shadow-indigo-900/50"
          >
            Start Diagnosis →
          </Link>
          <a
            href="#how-it-works"
            className="rounded-xl border border-slate-700 hover:border-slate-500 px-8 py-3 font-semibold text-slate-300 hover:text-white transition-all"
          >
            How it works
          </a>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap justify-center gap-px rounded-2xl border border-slate-800 bg-slate-800/40 overflow-hidden">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center px-10 py-5 bg-slate-900/60 backdrop-blur"
            >
              <span className="text-3xl font-extrabold text-white">
                {s.value}
              </span>
              <span className="text-xs text-slate-500 mt-1 uppercase tracking-wide">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-center text-3xl font-bold mb-2">
          Everything you need to fix your gaps
        </h2>
        <p className="text-center text-slate-500 mb-12 text-sm">
          Built for NEB students. No account, no subscription.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-slate-800 bg-slate-900 hover:border-indigo-700/60 hover:bg-slate-800/60 p-6 transition-all"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold text-white mb-1">{f.title}</div>
              <div className="text-slate-400 text-sm leading-relaxed">
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className="relative px-6 py-20 bg-slate-900/50"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-3xl font-bold mb-2">How it works</h2>
          <p className="text-center text-slate-500 mb-14 text-sm">
            Three steps. Under a minute.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="relative flex flex-col items-center text-center"
              >
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[calc(50%+2rem)] right-[-50%] h-px bg-slate-800" />
                )}
                <div className="w-12 h-12 rounded-full border-2 border-indigo-600 bg-indigo-950 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm mb-4 z-10">
                  {step.n}
                </div>
                <div className="font-semibold text-white mb-1">
                  {step.title}
                </div>
                <div className="text-slate-400 text-sm">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative px-6 py-20">
        <div className="max-w-2xl mx-auto rounded-2xl border border-indigo-800/50 bg-indigo-950/40 p-10 text-center">
          <h2 className="text-3xl font-bold mb-3">Ready to find your gap?</h2>
          <p className="text-slate-400 mb-8 text-sm">
            Pick a problem, answer 3 checkpoints, get your bridge lesson.
          </p>
          <Link
            to="/questions"
            className="inline-block rounded-xl bg-indigo-600 hover:bg-indigo-500 px-10 py-3 font-semibold text-white transition-all shadow-lg shadow-indigo-900/50"
          >
            View All Problems →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-xs text-slate-600">
        SikshyaMap AI · Built for CodeYatra 2.0 · NEB +2 Physics Diagnostic
        Engine
      </footer>
    </div>
  );
}
