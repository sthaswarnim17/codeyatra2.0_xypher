import React, { useEffect, useRef, useState } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

/**
 * Mathematics — Quadratic Function Graphing & Transformation.
 *
 * Uses the free Desmos Graphing Calculator API embedded via a
 * <script> tag in index.html.  Falls back to a pure-Canvas
 * mini-grapher when the global `Desmos` is not available.
 */

const TASKS = [
  {
    id: "open_downward",
    instruction: "Make the parabola open downward (a < 0)",
    check: (p) => p.a < 0,
  },
  {
    id: "shift_up_5",
    instruction: "Shift the graph up by 5 units (c = 5)",
    check: (p) => Math.abs(p.c - 5) < 0.5,
  },
  {
    id: "wider",
    instruction: "Make the parabola wider (0 < |a| < 1)",
    check: (p) => Math.abs(p.a) > 0.05 && Math.abs(p.a) < 1,
  },
];

export default function FunctionGraphing({ conceptId }) {
  const calcRef = useRef(null);
  const desmosRef = useRef(null);

  const [params, setParams] = useState({ a: 1, b: 0, c: 0 });
  const [tasksDone, setTasksDone] = useState(() => TASKS.map(() => false));
  const [feedback, setFeedback] = useState(null);
  const [useFallback, setUseFallback] = useState(false);
  const canvasRef = useRef(null);

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  // ── Desmos init ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window.Desmos === "undefined") {
      setUseFallback(true);
      return;
    }
    const el = calcRef.current;
    if (!el) return;
    const calc = window.Desmos.GraphingCalculator(el, {
      keypad: false,
      expressions: false,
      settingsMenu: false,
      zoomButtons: true,
      expressionsTopbar: false,
    });
    desmosRef.current = calc;
    calc.setMathBounds({ left: -10, right: 10, bottom: -10, top: 10 });
    updateDesmos(params, calc);
    return () => calc.destroy();
  }, []);

  // ── Sync params → Desmos ────────────────────────────────────────
  useEffect(() => {
    if (desmosRef.current) updateDesmos(params, desmosRef.current);
    if (useFallback) drawFallback();
    // check tasks
    setTasksDone(TASKS.map((t) => t.check(params)));
  }, [params, useFallback]);

  function updateDesmos(p, calc) {
    const { a, b, c } = p;
    calc.setExpression({ id: "fn", latex: `y=${a}x^{2}+${b}x+${c}`, color: "#2563eb", lineWidth: 3 });
    const vx = b !== 0 ? (-b / (2 * a)).toFixed(2) : "0";
    const vy = (a * Math.pow(-b / (2 * a), 2) + b * (-b / (2 * a)) + c).toFixed(2);
    calc.setExpression({ id: "vertex", latex: `(${vx},${vy})`, color: "#c74440", pointSize: 9, label: "Vertex", showLabel: true });
  }

  // ── Fallback Canvas grapher ─────────────────────────────────────
  function drawFallback() {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#060d1a");
    bg.addColorStop(1, "#0a1628");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2, scale = 28;

    // Grid (minor + major)
    for (let i = -Math.ceil(W / 2 / scale) - 1; i <= Math.ceil(W / 2 / scale) + 1; i++) {
      const px = cx + i * scale;
      const isMajor = i % 5 === 0;
      ctx.strokeStyle = isMajor ? "rgba(71,85,105,0.55)" : "rgba(30,41,59,0.9)";
      ctx.lineWidth = isMajor ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      if (isMajor && i !== 0) {
        ctx.fillStyle = "#475569"; ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "center"; ctx.fillText(i, px, cy + 15);
      }
    }
    for (let i = -Math.ceil(H / 2 / scale) - 1; i <= Math.ceil(H / 2 / scale) + 1; i++) {
      const py = cy + i * scale;
      const isMajor = i % 5 === 0;
      ctx.strokeStyle = isMajor ? "rgba(71,85,105,0.55)" : "rgba(30,41,59,0.9)";
      ctx.lineWidth = isMajor ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
      if (isMajor && i !== 0) {
        ctx.fillStyle = "#475569"; ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "right"; ctx.fillText(-i, cx - 7, py + 4);
      }
    }

    // Axes with arrowheads
    ctx.setLineDash([]);
    ctx.strokeStyle = "#64748b"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W - 12, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, H); ctx.lineTo(cx, 12); ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.beginPath(); ctx.moveTo(W, cy); ctx.lineTo(W - 14, cy - 4); ctx.lineTo(W - 14, cy + 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx - 4, 14); ctx.lineTo(cx + 4, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#94a3b8"; ctx.font = "bold 13px Inter, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("x", W - 10, cy - 9); ctx.fillText("y", cx + 9, 16);

    // Curve with glow
    const { a, b, c } = params;
    ctx.shadowBlur = 10; ctx.shadowColor = "#3b82f6";
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    let first = true;
    for (let px = 0; px <= W; px++) {
      const x = (px - cx) / scale;
      const y = a * x * x + b * x + c;
      const py = cy - y * scale;
      if (py < -H || py > 2 * H) { first = true; continue; }
      first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      first = false;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Vertex crosshair + dot
    const vx = -b / (2 * (a || 0.001));
    const vy = a * vx * vx + b * vx + c;
    const vpx = cx + vx * scale, vpy = cy - vy * scale;
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(239,68,68,0.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(vpx, 0); ctx.lineTo(vpx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, vpy); ctx.lineTo(W, vpy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 8; ctx.shadowColor = "#ef4444";
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(vpx, vpy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 11px Inter, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`(${vx.toFixed(1)}, ${vy.toFixed(1)})`, vpx + 9, vpy - 8);

    // Equation label on canvas
    ctx.fillStyle = "rgba(15,23,42,0.7)"; ctx.beginPath(); ctx.roundRect(10, 10, 230, 28, 6); ctx.fill();
    ctx.fillStyle = "#94a3b8"; ctx.font = "12px Inter, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`y = ${a.toFixed(1)}x² + ${b.toFixed(1)}x + ${c.toFixed(1)}`, 18, 29);
  }

  // ── Handlers ────────────────────────────────────────────────────
  const changeParam = (key, val) => {
    const next = { ...params, [key]: val };
    setParams(next);
    trackInteraction("parameter_changed", { parameter: key, value: val });
  };

  const checkAll = async () => {
    const done = TASKS.every((t) => t.check(params));
    if (done) {
      setFeedback({ type: "success", message: "All tasks completed! You understand function transformations." });
      await submitAnswer({ parameters: params, tasks: TASKS.map((t) => ({ id: t.id, instruction: t.instruction })) });
    } else {
      const remaining = TASKS.filter((t) => !t.check(params));
      setFeedback({ type: "error", message: `Complete ${remaining.length} more task(s): ${remaining.map((t) => t.instruction).join("; ")}` });
    }
  };

  const reset = () => {
    setParams({ a: 1, b: 0, c: 0 });
    setFeedback(null);
    trackInteraction("simulation_reset", {});
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <SimulationContainer title="Function Graphing & Transformation">
      {/* Desmos or Fallback Canvas */}
      {useFallback ? (
        <canvas ref={canvasRef} width={700} height={450} className="w-full rounded-xl border border-slate-700 bg-slate-950" />
      ) : (
        <div ref={calcRef} className="w-full rounded-xl border border-slate-700 overflow-hidden" style={{ height: 450 }} />
      )}

      {/* Equation display */}
      <p className="text-center text-white font-mono text-lg">
        y = <span className="text-blue-400">{params.a.toFixed(1)}</span>x² +{" "}
        <span className="text-emerald-400">{params.b.toFixed(1)}</span>x +{" "}
        <span className="text-amber-400">{params.c.toFixed(1)}</span>
      </p>

      {/* Sliders */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { key: "a", label: "a (stretch)", min: -3, max: 3, step: 0.1, color: "text-blue-400" },
          { key: "b", label: "b (linear)", min: -5, max: 5, step: 0.5, color: "text-emerald-400" },
          { key: "c", label: "c (shift)", min: -10, max: 10, step: 0.5, color: "text-amber-400" },
        ].map((s) => (
          <label key={s.key} className="flex flex-col gap-1 text-sm text-slate-400">
            {s.label}: <span className={`font-semibold ${s.color}`}>{params[s.key].toFixed(1)}</span>
            <input type="range" min={s.min} max={s.max} step={s.step} value={params[s.key]} onChange={(e) => changeParam(s.key, +e.target.value)} className="accent-indigo-500" />
          </label>
        ))}
      </div>

      {/* Tasks */}
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">
        <h4 className="text-sm font-semibold text-white mb-3">Tasks</h4>
        <ul className="flex flex-col gap-2">
          {TASKS.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 flex items-center justify-center rounded border text-xs font-bold ${tasksDone[i] ? "bg-emerald-600 border-emerald-500 text-white" : "border-slate-700 text-slate-600"}`}>
                {tasksDone[i] ? "✓" : ""}
              </span>
              <span className={tasksDone[i] ? "text-emerald-300 line-through" : "text-slate-300"}>{t.instruction}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={checkAll} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors">Check Answers</button>
        <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">Reset</button>
      </div>

      {feedback && <FeedbackOverlay type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* Tips */}
      <div className="text-xs text-slate-500 flex flex-col gap-1">
        <p><strong className="text-slate-400">a:</strong> Controls width & direction. Negative → opens down, |a| &lt; 1 → wider.</p>
        <p><strong className="text-slate-400">b:</strong> Shifts the vertex horizontally.</p>
        <p><strong className="text-slate-400">c:</strong> Shifts the entire graph up/down.</p>
      </div>
    </SimulationContainer>
  );
}
