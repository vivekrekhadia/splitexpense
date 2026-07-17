"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RegisterSchema } from "@/lib/validations";
import { Eye, EyeOff } from "lucide-react";

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = RegisterSchema.safeParse({ name, email, password });
    if (!result.success) {
      const errs: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errs[field]) errs[field] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setServerError(data.error ?? "Registration failed");
      return;
    }

    // Auto-login after successful registration
    const signInRes = await signIn("credentials", {
      redirect: false,
      email: result.data.email,
      password: result.data.password,
    });

    setLoading(false);
    if (signInRes?.error) {
      setServerError("Account created. Please sign in.");
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-[#070a13] flex items-center justify-center relative overflow-hidden py-8 px-4">
      {/* Background ambient glows */}
      <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Glassmorphic card frame */}
      <div className="w-full max-w-[380px] glass-panel rounded-3xl border-white/[0.06] p-6 md:p-8 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="mb-6 text-center">
          <span className="text-2xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 text-glow-green">
            Splitwise
          </span>
        </div>
        <h1 className="text-[10px] uppercase font-bold text-slate-400 text-center tracking-wider mb-6">
          Create an account to begin
        </h1>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div>
            <label htmlFor="name" className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm bg-slate-900/60 border border-white/5 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
            />
            {fieldErrors.name && (
              <p id="name-error" className="text-xs text-rose-400 font-medium mt-1.5">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm bg-slate-900/60 border border-white/5 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-xs text-rose-400 font-medium mt-1.5">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm bg-slate-900/60 border border-white/5 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="text-xs text-rose-400 font-medium mt-1.5">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="text-xs text-rose-400 text-center font-medium mt-1">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-[0.98] text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-emerald-400 font-bold hover:underline hover:text-emerald-300">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
