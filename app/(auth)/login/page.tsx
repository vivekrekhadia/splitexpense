"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LoginSchema } from "@/lib/validations";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = LoginSchema.safeParse({ email, password });
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

    const res = await signIn("credentials", {
      redirect: false,
      email: result.data.email,
      password: result.data.password,
    });

    setLoading(false);
    if (res?.error) {
      setServerError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-gray-200 flex items-start justify-center md:items-center md:py-8">
      <div className="w-full md:w-[430px] bg-[#F7F8FA] min-h-screen md:min-h-0 md:rounded-[2.5rem] md:shadow-2xl md:overflow-hidden flex flex-col justify-center px-6 py-12">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-[#5BC5A7]">Splitwise</span>
        </div>
        <h1 className="text-2xl font-semibold text-[#1A1A2E] mb-6 text-center">Sign in</h1>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1A1A2E] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-xs text-red-500 mt-1">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1A1A2E] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            {fieldErrors.password && (
              <p id="password-error" className="text-xs text-red-500 mt-1">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-red-500 text-center">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5BC5A7] hover:bg-[#4aaf93] text-white font-medium rounded-lg py-2 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-[#5BC5A7] font-medium hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
