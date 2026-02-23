import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CLASSES = [
  {
    value: "11",
    label: "Class 11",
    sub: "First year of +2",
    desc: "Sets the foundation — algebra, motion, periodic table & more.",
    badge: "11",
  },
  {
    value: "12",
    label: "Class 12",
    sub: "Second year of +2",
    desc: "Build mastery — calculus, waves, organic chemistry & beyond.",
    badge: "12",
  },
];

const SUBJECTS = [
  {
    value: "physics",
    label: "Physics",
    available: true,
    tagline: "Forces, motion & energy",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    value: "maths",
    label: "Mathematics",
    available: false,
    tagline: "Numbers & patterns",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.522 4.5 4.52V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.519c0-.998-.807-1.82-1.907-1.947A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
  },
  {
    value: "chemistry",
    label: "Chemistry",
    available: false,
    tagline: "Atoms, bonds & reactions",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    value: "biology",
    label: "Biology",
    available: false,
    tagline: "Life, cells & ecosystems",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Mascot animation state machine: idle → exiting → entering → idle
  const [mascotSrc, setMascotSrc] = useState("/before.png");
  const [mascotPhase, setMascotPhase] = useState("idle"); // "idle" | "exiting" | "entering"
  const mascotLabel = mascotSrc === "/before.png" ? "Make a choice, I'm waiting!" : "Great pick! Let's go!";

  const changeMascot = useCallback((toAfter) => {
    const next = toAfter ? "/after.png" : "/before.png";
    setMascotPhase("exiting");
    setTimeout(() => {
      setMascotSrc(next);
      setMascotPhase("entering");
      setTimeout(() => setMascotPhase("idle"), 480);
    }, 160);
  }, []);

  function handleClassSelect(val) {
    setSelectedClass(val);
    changeMascot(true);
  }

  function handleSubjectSelect(val) {
    const next = selectedSubject === val ? null : val;
    setSelectedSubject(next);
    changeMascot(next !== null);
  }

  function handleFinish() {
    if (!selectedClass || !selectedSubject) return;
    completeOnboarding({ studentClass: selectedClass, subject: selectedSubject });
    navigate("/questions", { replace: true });
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col items-center justify-start px-4 py-10">

      {/* Mascot — drop-away + spring-back animation */}
      <div className="mb-8 flex flex-col items-center" style={{ overflow: "visible" }}>
        <div className="relative flex items-center justify-center">
          {/* Amber glow blob */}
          <div className="absolute w-40 h-40 rounded-full bg-amber-brand/10 blur-3xl" />
          <img
            key={mascotSrc}
            src={mascotSrc}
            alt="Aarvana mascot"
            className={`relative h-48 w-auto drop-shadow-2xl ${
              mascotPhase === "exiting" ? "mascot-exiting"
              : mascotPhase === "entering" ? "mascot-entering"
              : ""
            }`}
          />
        </div>
        <p className={`mt-3 text-xs font-semibold tracking-widest uppercase transition-colors duration-300 ${
          mascotSrc === "/before.png" ? "text-text-muted" : "text-amber-brand"
        }`}>
          {mascotLabel}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-10">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
              step >= s
                ? "bg-amber-brand text-white shadow-md shadow-amber-brand/30"
                : "bg-gray-200 text-text-muted"
            }`}>
              {s}
            </div>
            <span className={`text-xs font-semibold transition-colors ${step >= s ? "text-amber-brand" : "text-text-muted"}`}>
              {s === 1 ? "Your Class" : "Your Subject"}
            </span>
            {s < 2 && <div className={`w-10 h-0.5 rounded-full transition-all duration-500 ${step > s ? "bg-amber-brand" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg">

        {/* ── Step 1 — Class ── */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2 leading-tight">
                Which class are you in,{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">{firstName}?</span>
                  <span className="absolute left-0 bottom-1 w-full h-2.5 bg-amber-brand/25 rounded-sm -z-0" />
                </span>
              </h1>
              <p className="text-text-secondary text-sm">
                We'll personalise your NEB study plan from day one.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-8">
              {CLASSES.map((c) => {
                const active = selectedClass === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => handleClassSelect(c.value)}
                    className={`group relative rounded-2xl border-2 p-6 text-left transition-all duration-200 focus:outline-none ${
                      active
                        ? "border-amber-brand bg-amber-brand/8 shadow-xl shadow-amber-brand/20 scale-[1.02]"
                        : "border-gray-200 bg-white hover:border-amber-brand/50 hover:shadow-lg hover:scale-[1.01]"
                    }`}
                  >
                    {/* Checkmark badge */}
                    <div className={`absolute top-3.5 right-3.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                      active ? "bg-amber-brand opacity-100 scale-100" : "bg-gray-100 opacity-0 scale-75"
                    }`}>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    {/* Class badge number */}
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-2xl font-black mb-3 transition-all ${
                      active ? "bg-amber-brand text-white shadow-lg shadow-amber-brand/30" : "bg-gray-100 text-text-secondary group-hover:bg-amber-brand/10 group-hover:text-amber-brand"
                    }`}>
                      {c.badge}
                    </div>

                    <div className="font-bold text-lg text-text-primary mb-0.5">{c.label}</div>
                    <div className="text-xs text-text-muted mb-2">{c.sub}</div>
                    <div className="text-xs text-text-secondary leading-relaxed">{c.desc}</div>
                  </button>
                );
              })}
            </div>

            <button
              disabled={!selectedClass}
              onClick={() => setStep(2)}
              className="w-full rounded-2xl bg-amber-brand hover:bg-amber-hover disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] py-4 font-bold text-white text-base transition-all shadow-lg shadow-amber-brand/25 flex items-center justify-center gap-2"
            >
              Continue
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          </div>
        )}

        {/* ── Step 2 — Subject ── */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2 leading-tight">
                Choose Your Subject
              </h1>
              <p className="text-text-secondary text-sm">
                Start with one. More subjects are unlocking soon!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {SUBJECTS.map((s) => {
                const isSelected = selectedSubject === s.value;
                return (
                  <button
                    key={s.value}
                    disabled={!s.available}
                    onClick={() => s.available && handleSubjectSelect(s.value)}
                    className={`group relative rounded-2xl border-2 p-6 flex flex-col items-center gap-3 text-center transition-all duration-200 focus:outline-none ${
                      !s.available
                        ? "border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed"
                        : isSelected
                          ? "border-amber-brand bg-amber-brand/8 shadow-xl shadow-amber-brand/20 scale-[1.02]"
                          : "border-gray-200 bg-white hover:border-amber-brand/50 hover:shadow-lg hover:scale-[1.01]"
                    }`}
                  >
                    {!s.available && (
                      <span className="absolute top-3 right-3 text-[9px] font-semibold bg-gray-200 text-text-muted rounded-full px-2 py-0.5">
                        Soon
                      </span>
                    )}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-brand flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Icon circle */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? "bg-amber-brand text-white shadow-lg shadow-amber-brand/30"
                        : "bg-gray-100 text-gray-400 group-hover:bg-amber-brand/10 group-hover:text-amber-brand"
                    }`}>
                      {s.icon}
                    </div>

                    <span className="text-sm font-bold text-text-primary">{s.label}</span>
                    {s.available && (
                      <span className="text-[10px] text-text-muted leading-relaxed">{s.tagline}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Counter chip */}
            <div className={`flex items-center justify-center gap-1.5 mb-6 text-sm font-semibold transition-all ${selectedSubject ? "text-amber-brand" : "text-text-muted"}`}>
              {selectedSubject ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  1 subject selected — ready to roll!
                </>
              ) : "Select a subject to continue"}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(1); setSelectedSubject(null); changeMascot(!!selectedClass); }}
                className="flex-1 rounded-2xl border-2 border-gray-200 hover:border-gray-300 py-4 font-bold text-text-secondary hover:text-text-primary transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                Back
              </button>
              <button
                disabled={!selectedSubject}
                onClick={handleFinish}
                className="flex-[2] rounded-2xl bg-amber-brand hover:bg-amber-hover disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] py-4 font-bold text-white text-base transition-all shadow-lg shadow-amber-brand/25 flex items-center justify-center gap-2"
              >
                Start Learning
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
