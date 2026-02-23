import React, { useRef, useEffect, useState, useCallback } from "react";
import SimulationContainer from "../shared/SimulationContainer";
import FeedbackOverlay from "../shared/FeedbackOverlay";
import useSimulation from "../../../hooks/useSimulation";

/**
 * Physics Vector Decomposition Simulator.
 *
 * Draws a velocity vector on an HTML Canvas and lets the student
 * drag horizontal (Vx) and vertical (Vy) component arrows to the
 * correct magnitudes.  Uses plain Canvas 2D — no external libs
 * needed (p5 / matter-js are optional enhancements later).
 */
export default function VectorDecomposition({ conceptId }) {
  const canvasRef = useRef(null);
  const [velocity, setVelocity] = useState(25);
  const [angle, setAngle] = useState(35);
  const [studentVx, setStudentVx] = useState(10);
  const [studentVy, setStudentVy] = useState(10);
  const [showSolution, setShowSolution] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [dragging, setDragging] = useState(null); // "vx" | "vy" | null

  const { loading, trackInteraction, submitAnswer } = useSimulation(conceptId);

  const SCALE = 8; // px per m/s
  const origin = useRef({ x: 160, y: 340 });

  // Correct values
  const correctVx = velocity * Math.cos((angle * Math.PI) / 180);
  const correctVy = velocity * Math.sin((angle * Math.PI) / 180);

  // ── Draw ─────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width;
    const H = cvs.height;
    const O = origin.current;

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#060d1a");
    bg.addColorStop(1, "#0a1628");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Minor grid lines
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) {
      ctx.strokeStyle = x % 200 === 0 ? "rgba(71,85,105,0.5)" : "rgba(30,41,59,0.8)";
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.strokeStyle = y % 200 === 0 ? "rgba(71,85,105,0.5)" : "rgba(30,41,59,0.8)";
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Origin dot
    const gOrigin = ctx.createRadialGradient(O.x, O.y, 0, O.x, O.y, 7);
    gOrigin.addColorStop(0, "#cbd5e1");
    gOrigin.addColorStop(1, "rgba(203,213,225,0)");
    ctx.beginPath(); ctx.arc(O.x, O.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = gOrigin; ctx.fill();

    // Axes with arrowheads
    const axisColor = "rgba(148,163,184,0.7)";
    ctx.strokeStyle = axisColor; ctx.lineWidth = 1.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, O.y); ctx.lineTo(W - 12, O.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(O.x, H); ctx.lineTo(O.x, 12); ctx.stroke();
    ctx.fillStyle = axisColor;
    ctx.beginPath(); ctx.moveTo(W, O.y); ctx.lineTo(W - 15, O.y - 5); ctx.lineTo(W - 15, O.y + 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(O.x, 0); ctx.lineTo(O.x - 5, 15); ctx.lineTo(O.x + 5, 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#94a3b8"; ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillText("x", W - 10, O.y - 9);
    ctx.fillText("y", O.x + 9, 16);

    const drawArrow = (sx, sy, ex, ey, color, lw = 3, glow = false) => {
      if (glow) { ctx.shadowBlur = 14; ctx.shadowColor = color; }
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      const a = Math.atan2(ey - sy, ex - sx); const hs = 13;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hs * Math.cos(a - 0.35), ey - hs * Math.sin(a - 0.35));
      ctx.lineTo(ex - hs * Math.cos(a + 0.35), ey - hs * Math.sin(a + 0.35));
      ctx.closePath(); ctx.fill();
      if (glow) { ctx.shadowBlur = 0; ctx.shadowColor = "transparent"; }
    };

    // Main velocity vector (emerald with glow)
    const rad = (angle * Math.PI) / 180;
    const vEndX = O.x + velocity * SCALE * Math.cos(rad);
    const vEndY = O.y - velocity * SCALE * Math.sin(rad);
    drawArrow(O.x, O.y, vEndX, vEndY, "#10b981", 4, true);
    ctx.fillStyle = "#10b981"; ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillText(`V = ${velocity} m/s`, (O.x + vEndX) / 2 - 28, (O.y + vEndY) / 2 - 12);

    // Angle arc
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(O.x, O.y, 50, -rad, 0); ctx.stroke();
    ctx.fillStyle = "#fbbf24"; ctx.font = "bold 12px Inter, sans-serif";
    ctx.fillText(`${angle}°`, O.x + 54, O.y - 10);

    // Dashed projections
    const vxEnd = O.x + studentVx * SCALE;
    const vyEnd = O.y - studentVy * SCALE;
    if (studentVx > 0.5 && studentVy > 0.5) {
      ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(148,163,184,0.2)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(vxEnd, O.y); ctx.lineTo(vxEnd, vyEnd); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(O.x, vyEnd); ctx.lineTo(vxEnd, vyEnd); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Student Vx (blue)
    drawArrow(O.x, O.y, vxEnd, O.y, "#60a5fa", 3);
    ctx.fillStyle = "#60a5fa"; ctx.font = "bold 12px Inter, sans-serif";
    ctx.fillText(`Vx = ${studentVx.toFixed(1)}`, Math.min(vxEnd - 44, W - 100), O.y + 22);

    // Student Vy (red)
    drawArrow(O.x, O.y, O.x, vyEnd, "#f87171", 3);
    ctx.fillStyle = "#f87171"; ctx.font = "bold 12px Inter, sans-serif";
    ctx.fillText(`Vy = ${studentVy.toFixed(1)}`, O.x + 10, Math.max(vyEnd + 16, 20));

    // Ghost correct vectors
    if (showSolution) {
      const cxEnd = O.x + correctVx * SCALE;
      const cyEnd = O.y - correctVy * SCALE;
      drawArrow(O.x, O.y, cxEnd, O.y, "rgba(96,165,250,0.35)", 2);
      drawArrow(O.x, O.y, O.x, cyEnd, "rgba(248,113,113,0.35)", 2);
      ctx.fillStyle = "#94a3b8"; ctx.font = "11px Inter, sans-serif";
      ctx.fillText(`Correct Vx = ${correctVx.toFixed(1)}`, cxEnd - 60, O.y + 38);
      ctx.fillText(`Correct Vy = ${correctVy.toFixed(1)}`, O.x + 8, cyEnd - 12);
    }

    // Drag handles — gradient circles
    const drawHandle = (x, y, color) => {
      const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 10);
      g.addColorStop(0, color + "cc");
      g.addColorStop(1, color + "22");
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    };
    drawHandle(vxEnd, O.y, "#60a5fa");
    drawHandle(O.x, vyEnd, "#f87171");
  }, [velocity, angle, studentVx, studentVy, showSolution, correctVx, correctVy]);

  useEffect(() => { draw(); }, [draw]);

  // ── Pointer events ──────────────────────────────────────────────
  const getPointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  };

  const handlePointerDown = (e) => {
    const { x, y } = getPointerPos(e);
    const O = origin.current;
    const vxTip = { x: O.x + studentVx * SCALE, y: O.y };
    const vyTip = { x: O.x, y: O.y - studentVy * SCALE };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    if (dist({ x, y }, vxTip) < 20) setDragging("vx");
    else if (dist({ x, y }, vyTip) < 20) setDragging("vy");
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    const { x, y } = getPointerPos(e);
    const O = origin.current;
    if (dragging === "vx") {
      setStudentVx(Math.max(0, (x - O.x) / SCALE));
    } else {
      setStudentVy(Math.max(0, (O.y - y) / SCALE));
    }
  };

  const handlePointerUp = () => {
    if (dragging) {
      trackInteraction("vector_adjusted", { studentVx, studentVy });
      setDragging(null);
    }
  };

  // ── Check answer ────────────────────────────────────────────────
  const checkAnswer = async () => {
    const tol = 0.05;
    const vxErr = correctVx ? Math.abs(studentVx - correctVx) / correctVx : 0;
    const vyErr = correctVy ? Math.abs(studentVy - correctVy) / correctVy : 0;

    if (vxErr < tol && vyErr < tol) {
      setFeedback({ type: "success", message: "Perfect! You correctly decomposed the vector!" });
      await submitAnswer({ velocity, angle, student_vx: studentVx, student_vy: studentVy });
    } else {
      let msg = "";
      if (vxErr >= tol) msg += studentVx > correctVx ? "Horizontal component is too large. " : "Horizontal component is too small. ";
      if (vyErr >= tol) msg += studentVy > correctVy ? "Vertical component is too large. " : "Vertical component is too small. ";
      // sin/cos swap check
      const swapVx = velocity * Math.sin((angle * Math.PI) / 180);
      const swapVy = velocity * Math.cos((angle * Math.PI) / 180);
      if (Math.abs(studentVx - swapVx) < 1 && Math.abs(studentVy - swapVy) < 1) {
        msg = "You swapped sin and cos! Horizontal uses cos(θ), vertical uses sin(θ).";
      }
      setFeedback({ type: "error", message: msg.trim() });
    }
    trackInteraction("answer_checked", { studentVx, studentVy });
  };

  const reset = () => {
    setStudentVx(10);
    setStudentVy(10);
    setShowSolution(false);
    setFeedback(null);
    trackInteraction("simulation_reset", {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SimulationContainer title="Vector Decomposition Simulator">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={700}
        height={440}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 cursor-crosshair touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {/* Controls */}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Velocity: <span className="text-white font-semibold">{velocity} m/s</span>
          <input type="range" min={5} max={50} step={1} value={velocity} onChange={(e) => { setVelocity(+e.target.value); trackInteraction("velocity_changed", { value: +e.target.value }); }} className="accent-indigo-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Angle: <span className="text-white font-semibold">{angle}°</span>
          <input type="range" min={5} max={85} step={5} value={angle} onChange={(e) => { setAngle(+e.target.value); trackInteraction("angle_changed", { value: +e.target.value }); }} className="accent-indigo-500" />
        </label>
      </div>

      <p className="text-sm text-slate-400 border border-slate-800 rounded-xl px-4 py-3 bg-slate-900/50">
        <strong className="text-white">Task:</strong> Drag the{" "}
        <span className="text-blue-400 font-semibold">blue (Vx)</span> and{" "}
        <span className="text-red-400 font-semibold">red (Vy)</span> arrows to
        match the horizontal and vertical components of the{" "}
        <span className="text-emerald-400 font-semibold">green velocity vector</span>.
      </p>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={checkAnswer} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors">Check My Answer</button>
        <button onClick={() => { setShowSolution((p) => !p); trackInteraction("solution_toggled", {}); }} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">
          {showSolution ? "Hide Solution" : "Show Solution"}
        </button>
        <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold text-slate-300 hover:text-white transition-all">Reset</button>
      </div>

      {feedback && <FeedbackOverlay type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* Formulas */}
      <div className="text-xs text-slate-500 flex flex-wrap gap-4">
        <span>Vx = V · cos(θ) = {correctVx.toFixed(2)} m/s</span>
        <span>Vy = V · sin(θ) = {correctVy.toFixed(2)} m/s</span>
      </div>
    </SimulationContainer>
  );
}
