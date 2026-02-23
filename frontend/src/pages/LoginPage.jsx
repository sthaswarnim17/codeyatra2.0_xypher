import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DOTS = [
  "top-[12%] left-[8%] w-3 h-3 opacity-30",
  "top-[20%] right-[10%] w-2 h-2 opacity-20",
  "top-[35%] left-[5%] w-2 h-2 opacity-15",
  "bottom-[25%] right-[8%] w-3 h-3 opacity-25",
  "bottom-[15%] left-[12%] w-1.5 h-1.5 opacity-20",
  "top-[55%] right-[5%] w-2.5 h-2.5 opacity-15",
  "top-[8%] right-[25%] w-1.5 h-1.5 opacity-30",
  "bottom-[35%] left-[20%] w-2 h-2 opacity-20",
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/questions";

  // Redirect already-logged-in users — must be in useEffect, not during render
  useEffect(() => {
    if (user) navigate(user.onboardingDone ? from : "/onboarding", { replace: true });
  }, [user, from, navigate]);

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login({ email: form.email, password: form.password });
      if (!result.ok) { setError(result.error); return; }
      navigate(result.user.onboardingDone ? from : "/onboarding", { replace: true });
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4 overflow-hidden relative">
      {/* Floating dots */}
      {DOTS.map((cls, i) => (
        <div key={i} className={`absolute rounded-full bg-amber-brand ${cls}`} />
      ))}

      <div className="relative w-full max-w-[420px]">
        {/* Mascot + Logo — stacked tight, equal visual weight */}
        <div className="flex flex-col items-center gap-0 mb-5">
          <img src="/before.png" alt="Aarvana mascot" className="h-36 w-auto drop-shadow-md" />
          <Link to="/"><img src="/logo.png" alt="Aarvana" className="h-24 w-auto -mt-2" /></Link>
        </div>

        <p className="text-center text-text-secondary text-sm mb-7">
          Welcome back, detective. Sign in to continue your mission.
        </p>

        {/* Card */}
        <div className="rounded-3xl border border-gray-200/80 bg-white shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Email</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-text-primary placeholder-gray-400 focus:border-amber-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-brand/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-11 py-3 text-sm text-text-primary placeholder-gray-400 focus:border-amber-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-brand/20 transition-all"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-brand transition-colors">
                  {showPassword
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-amber-brand hover:bg-amber-hover disabled:opacity-50 active:scale-[0.98] py-3.5 font-bold text-white transition-all shadow-lg shadow-amber-brand/20 flex items-center justify-center gap-2 mt-1">
              {loading
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
              }
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-text-muted font-medium">New here?</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Link to="/signup"
            className="block w-full text-center rounded-2xl border-2 border-gray-200 hover:border-amber-brand/40 bg-white py-3 font-semibold text-text-primary hover:text-amber-brand text-sm transition-all active:scale-[0.98]">
            Create an Account
          </Link>

          {/* keep old inline link hidden for compat — not shown */}
          <p className="hidden">
            Don&apos;t have an account?{" "}
            <Link to="/signup"
              className="text-amber-brand hover:text-amber-hover font-medium transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
