import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PREREQ_LABELS = {
  vectors_components: "Vectors & Components",
  trigonometry: "Trigonometry",
  angular_kinematics: "Angular Kinematics",
  newtons_laws: "Newton's Laws",
  energy_work: "Energy & Work",
  calculus_basics: "Calculus Basics",
};

const CLASS_COLORS = {
  11: "text-emerald-600 bg-emerald-100 border-emerald-200",
  12: "text-violet-400 bg-violet-900/30 border-violet-800",
};

export default function QuestionsPage() {
  const { authFetch } = useAuth();
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "11" | "12"
  const navigate = useNavigate();

  useEffect(() => {
    authFetch("/api/concepts")
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setConcepts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered =
    filter === "all"
      ? concepts
      : concepts.filter((c) => String(c.class) === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-brand border-t-transparent animate-spin" />
          <p className="text-text-secondary text-sm">Loading concepts…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center text-2xl">
          ⚠
        </div>
        <p className="text-red-500 font-medium">Could not load concepts</p>
        <p className="text-text-muted text-sm">{error}</p>
        <p className="text-text-muted text-sm">
          Make sure the backend is running on{" "}
          <span className="text-amber-brand font-mono">localhost:5000</span>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-text-primary mb-1">
            Physics Concepts
          </h2>
          <p className="text-text-secondary text-sm">
            {concepts.length} topic{concepts.length !== 1 ? "s" : ""} available
            — click Diagnose to find your prerequisite gaps
          </p>
        </div>

        {/* Class filter */}
        <div className="flex gap-2">
          {["all", "11", "12"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                filter === f
                  ? "bg-amber-brand border-amber-brand text-text-primary"
                  : "bg-gray-50 border-gray-300 text-text-secondary hover:text-text-primary"
              }`}
            >
              {f === "all" ? "All Classes" : `Class ${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* Concepts grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          No concepts found for this filter.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((concept) => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              onDiagnose={() => navigate("/diagnose")}
            />
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-2xl bg-gradient-to-r from-amber-brand/10 to-cream-200 border border-amber-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-text-primary">Not sure where to start?</p>
          <p className="text-text-secondary text-sm mt-0.5">
            Let Aarvana detect which prerequisites you're missing.
          </p>
        </div>
        <button
          onClick={() => navigate("/diagnose")}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-brand hover:bg-amber-hover font-semibold text-sm transition-colors"
        >
          Run Full Diagnosis →
        </button>
      </div>
    </main>
  );
}

function ConceptCard({ concept, onDiagnose }) {
  const classStyle =
    CLASS_COLORS[concept.class] ||
    "text-text-secondary bg-gray-100 border-gray-300";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3 hover:border-gray-300 transition-colors">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-text-primary leading-snug">{concept.name}</h3>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${classStyle}`}
        >
          Class {concept.class}
        </span>
      </div>

      {/* Description */}
      {concept.description && (
        <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">
          {concept.description}
        </p>
      )}

      {/* Prerequisites */}
      {concept.prerequisites && concept.prerequisites.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-1.5 uppercase tracking-wide">
            Prerequisites
          </p>
          <div className="flex flex-wrap gap-1.5">
            {concept.prerequisites.map((p) => (
              <span
                key={p}
                className="text-xs px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-text-secondary"
              >
                {PREREQ_LABELS[p] || p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Diagnose button */}
      <button
        onClick={onDiagnose}
        className="mt-auto w-full rounded-xl bg-amber-brand/10 hover:bg-amber-brand border border-amber-brand hover:border-amber-brand text-amber-brand hover:text-text-primary py-2 text-sm font-semibold transition-all"
      >
        Diagnose this concept →
      </button>
    </div>
  );
}
