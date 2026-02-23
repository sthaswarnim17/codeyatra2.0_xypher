/**
 * LearnPage — integrated concept learning with simulation + problem solving.
 *
 * Route: /learn/:conceptId
 *
 * Layout:
 *  Left  — interactive simulation panel (if a simulation exists for this concept)
 *  Right — problem list → checkpoint-by-checkpoint solver
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Simulation components
import VectorDecomposition from "../components/simulations/physics/VectorDecomposition";
import FunctionGraphing from "../components/simulations/mathematics/FunctionGraphing";
import MolecularStructure from "../components/simulations/chemistry/MolecularStructure";

const SIM_COMPONENT = {
  vector_decomposition: VectorDecomposition,
  function_graphing: FunctionGraphing,
  molecular_structure: MolecularStructure,
};

const DIFFICULTY_LABEL = { 1: "Beginner", 2: "Explorer", 3: "Master" };
const DIFFICULTY_COLOR = {
  1: "bg-emerald-100 text-emerald-700 border-emerald-200",
  2: "bg-amber-100 text-amber-700 border-amber-200",
  3: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function LearnPage() {
  const { conceptId } = useParams();
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();

  const [concept, setConcept] = useState(null);
  const [problems, setProblems] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active session
  const [session, setSession] = useState(null); // { session_id, checkpoints, problem }
  const [cpIndex, setCpIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checkResult, setCheckResult] = useState(null); // { correct, feedback, backtrack, ... }
  const [submitting, setSubmitting] = useState(false);

  // Load concept, problems, simulation
  useEffect(() => {
    if (!conceptId) return;
    (async () => {
      try {
        const [conR, probR, simR] = await Promise.all([
          authFetch(`/api/concepts/${conceptId}`),
          authFetch(`/api/problems?concept_id=${conceptId}`),
          authFetch(`/api/simulations/${conceptId}`),
        ]);
        const [conD, probD, simD] = await Promise.all([
          conR.json(), probR.json(), simR.json(),
        ]);

        setConcept(conD?.data ?? conD);
        setProblems(probD?.data?.problems ?? []);
        // simulation may 404 → ignore
        if (simR.ok) {
          setSimulation(simD?.data?.simulation ?? null);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [conceptId, authFetch]);

  // Start a problem-solving session
  const startProblem = useCallback(async (problem) => {
    if (!user?.id) return;
    try {
      // Fetch full problem (with all checkpoints) and start session in parallel
      const [probRes, sessRes] = await Promise.all([
        authFetch(`/api/problems/${problem.id}`),
        authFetch("/api/sessions/start", {
          method: "POST",
          body: JSON.stringify({ problem_id: problem.id, student_id: user.id }),
        }),
      ]);
      const [probData, sessData] = await Promise.all([probRes.json(), sessRes.json()]);
      if (!sessRes.ok) throw new Error(sessData.error?.message ?? "Could not start session.");

      const fullProblem = probData?.data ?? probData;
      const sessionData = sessData?.data ?? sessData;

      setSession({
        session_id: sessionData.session_id,
        checkpoints: fullProblem.checkpoints ?? [],
        problem,
        completed: false,
      });
      setCpIndex(0);
      setAnswer("");
      setCheckResult(null);
    } catch (e) {
      alert(e.message);
    }
  }, [authFetch, user?.id]);

  // Submit answer for current checkpoint
  const submitCheckpoint = async () => {
    if (!answer || !session) return;
    setSubmitting(true);
    const cp = session.checkpoints[cpIndex];
    try {
      const res = await authFetch(`/api/sessions/${session.session_id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          checkpoint_id: cp.id,
          selected_value: answer,
        }),
      });
      const data = await res.json();
      const result = data?.data ?? data;
      setCheckResult(result);
    } catch (e) {
      setCheckResult({ correct: false, feedback: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const nextCheckpoint = () => {
    const nextIdx = cpIndex + 1;
    if (nextIdx >= session.checkpoints.length) {
      setSession((s) => ({ ...s, completed: true }));
    } else {
      setCpIndex(nextIdx);
      setAnswer("");
      setCheckResult(null);
    }
  };

  const closeSession = () => {
    setSession(null);
    setAnswer("");
    setCheckResult(null);
    setCpIndex(0);
  };

  // ─── render helpers ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-brand border-t-transparent animate-spin" />
          <p className="text-text-secondary text-sm">Loading mission…</p>
        </div>
      </div>
    );
  }

  if (error || !concept) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <p className="text-red-600 font-semibold">{error || "Concept not found."}</p>
        <button onClick={() => navigate("/questions")}
          className="px-5 py-2.5 rounded-xl bg-amber-brand text-white font-bold text-sm">
          Back to Missions
        </button>
      </div>
    );
  }

  const SimComp = simulation ? SIM_COMPONENT[simulation.simulation_type] : null;
  const activeCp = session?.checkpoints?.[cpIndex];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 gap-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/questions")}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Missions
        </button>
        <span className="text-text-muted">/</span>
        <h1 className="text-xl font-extrabold text-text-primary truncate">{concept.name}</h1>
        {concept.neb_class && (
          <span className="text-xs font-semibold bg-amber-brand/10 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full">
            Class {concept.neb_class}
          </span>
        )}
      </div>

      {/* Two-column layout when simulation exists */}
      <div className={`flex flex-col ${SimComp ? "lg:flex-row" : ""} gap-6`}>

        {/* ── LEFT: Simulation ── */}
        {SimComp && (
          <div className="lg:w-1/2 flex-shrink-0">
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{simulation.title}</p>
                  <p className="text-xs text-text-muted">Interactive simulation</p>
                </div>
              </div>
              <div className="p-4">
                <SimComp conceptId={Number(conceptId)} />
              </div>
            </div>
          </div>
        )}

        {/* ── RIGHT: Problem Solver ── */}
        <div className="flex-1 min-w-0">
          {/* Active session */}
          {session ? (
            <div className="rounded-2xl border border-gray-200 bg-white">
              {/* Session header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-text-primary text-sm">{session.problem.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {session.completed
                      ? "All checkpoints completed!"
                      : `Checkpoint ${cpIndex + 1} of ${session.checkpoints.length}`}
                  </p>
                </div>
                <button onClick={closeSession}
                  className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                  Exit
                </button>
              </div>

              {session.completed ? (
                /* Completion screen */
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-text-primary mb-2">Problem Complete!</h3>
                  <p className="text-text-secondary text-sm mb-6">
                    You finished all checkpoints for this problem.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={closeSession}
                      className="px-6 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-sm font-semibold text-text-secondary transition-all">
                      Back to Problems
                    </button>
                    <button onClick={() => navigate("/diagnose")}
                      className="px-6 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover text-sm font-bold text-white transition-all">
                      Run Diagnostic
                    </button>
                  </div>
                </div>
              ) : (
                /* Active checkpoint */
                <div className="p-5">
                  {/* Progress bar */}
                  <div className="flex gap-1 mb-6">
                    {session.checkpoints.map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                        i < cpIndex ? "bg-emerald-400" : i === cpIndex ? "bg-amber-brand" : "bg-gray-200"
                      }`} />
                    ))}
                  </div>

                  {/* Instruction */}
                  {activeCp?.instruction && (
                    <div className="rounded-xl bg-cream-100 border border-cream-300 px-4 py-3 text-sm text-text-secondary mb-4">
                      {activeCp.instruction}
                    </div>
                  )}

                  {/* Question */}
                  <h3 className="text-base font-bold text-text-primary leading-snug mb-5">
                    {activeCp?.question}
                  </h3>

                  {/* Choices or text input */}
                  {activeCp?.choices?.length > 0 ? (
                    <div className="flex flex-col gap-2.5 mb-5">
                      {activeCp.choices.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => { setAnswer(String(ch.value)); setCheckResult(null); }}
                          className={`rounded-xl border-2 px-4 py-3.5 text-sm text-left transition-all flex items-center gap-3 ${
                            answer === String(ch.value)
                              ? "border-amber-brand bg-amber-brand/10"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className={`w-4.5 h-4.5 rounded-full border-2 flex-shrink-0 transition-all ${
                            answer === String(ch.value) ? "border-amber-brand bg-amber-brand" : "border-gray-300"
                          }`} />
                          <span className={answer === String(ch.value) ? "text-text-primary font-medium" : "text-text-secondary"}>
                            {ch.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-5">
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">
                        Your Answer{activeCp?.unit ? ` (${activeCp.unit})` : ""}
                      </label>
                      <input
                        type="text"
                        value={answer}
                        onChange={(e) => { setAnswer(e.target.value); setCheckResult(null); }}
                        placeholder="Enter your answer…"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-text-primary placeholder-gray-400 focus:border-amber-brand focus:outline-none focus:ring-2 focus:ring-amber-brand/20 transition"
                      />
                    </div>
                  )}

                  {/* Feedback banner */}
                  {checkResult && (
                    <div className={`rounded-xl px-4 py-3 mb-4 text-sm flex items-start gap-3 ${
                      checkResult.correct
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-red-50 border border-red-200 text-red-800"
                    }`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        checkResult.correct ? "bg-emerald-400" : "bg-red-400"
                      }`}>
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          {checkResult.correct
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          }
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{checkResult.correct ? "Correct!" : "Not quite."}</p>
                        {checkResult.feedback && (
                          <p className="text-xs mt-0.5 opacity-80">{checkResult.feedback}</p>
                        )}
                        {checkResult.backtrack && checkResult.backtrack_path && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold mb-1">Review prerequisite first:</p>
                            <div className="flex flex-wrap gap-1">
                              {checkResult.backtrack_path.map((node) => (
                                <span key={node.concept.id}
                                  className="text-[11px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 font-medium">
                                  {node.concept.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  {checkResult?.correct ? (
                    <button onClick={nextCheckpoint}
                      className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-sm py-3 transition-all">
                      {cpIndex < session.checkpoints.length - 1 ? "Next Checkpoint →" : "Finish Problem ✓"}
                    </button>
                  ) : (
                    <button
                      onClick={submitCheckpoint}
                      disabled={!answer || submitting}
                      className="w-full rounded-xl bg-amber-brand hover:bg-amber-hover disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-sm py-3 transition-all"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                          Checking…
                        </span>
                      ) : "Check Answer"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Problem list */
            <div>
              <h2 className="text-base font-bold text-text-primary mb-3">
                Practice Problems
                <span className="ml-2 text-xs font-normal text-text-muted">
                  ({problems.length} available)
                </span>
              </h2>

              {problems.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-gray-300 bg-cream-50">
                  <p className="text-text-muted text-sm">No problems available for this concept yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {problems.map((prob) => (
                    <div key={prob.id}
                      className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center gap-4 hover:border-amber-brand/40 hover:shadow-md hover:shadow-amber-brand/5 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-amber-brand/10 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        P{prob.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary text-sm truncate">{prob.title}</p>
                        {prob.description && (
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{prob.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            DIFFICULTY_COLOR[prob.difficulty] ?? DIFFICULTY_COLOR[2]
                          }`}>
                            {DIFFICULTY_LABEL[prob.difficulty] ?? "Explorer"}
                          </span>
                          {prob.checkpoint_count > 0 && (
                            <span className="text-[11px] text-text-muted">
                              {prob.checkpoint_count} step{prob.checkpoint_count !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => startProblem(prob)}
                        className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover text-white font-bold text-sm transition-all active:scale-95 shadow-sm shadow-amber-brand/20">
                        Solve
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Simulation hint */}
              {SimComp && (
                <div className="mt-4 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center gap-3">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-xs text-indigo-700 font-medium">
                    Use the simulation on the left to explore the concept before solving problems.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
