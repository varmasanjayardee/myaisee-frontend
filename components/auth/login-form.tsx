"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { EyeIcon, EyeOffIcon, Loader2Icon, LockIcon, MailIcon } from "lucide-react";
import { zodRule } from "@/lib/form";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginInput } from "@/schemas/auth.schema";
import { useLogin } from "@/services/auth.service";

// Styled after Keyed-frontend src/components/auth/LoginForm.tsx (explicit light colours)
const input =
  "h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 disabled:opacity-38 aria-invalid:border-red-400";
const icon = "pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400";

/** One login for every user type; /me/ decides which dashboard they land on */
export function LoginForm() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    defaultValues: { email: "", password: "" },
  });
  const { errors } = formState;
  // The first problem to show: a field rule, else what the server said
  const problem = errors.email?.message ?? errors.password?.message ?? login.error?.message;

  const field = (name: keyof LoginInput) =>
    register(name, {
      validate: zodRule(loginSchema[name]),
      // Typing again clears the last server error, as in Keyed
      onChange: () => login.error && login.reset(),
    });

  const onSubmit = handleSubmit((values) =>
    login.mutate({ email: values.email.trim().toLowerCase(), password: values.password })
  );

  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg md:p-8">
      <h2 className="mb-8 text-xl font-bold text-gray-900 md:text-3xl">Login to MyAISee</h2>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {problem && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-[#dc2626]">{problem}</p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="relative">
            <MailIcon className={icon} />
            <input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder="you@company.com"
              disabled={login.isPending}
              aria-invalid={!!errors.email}
              className={input}
              {...field("email")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <LockIcon className={icon} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter a secure password"
              disabled={login.isPending}
              aria-invalid={!!errors.password}
              className={cn(input, "pr-10")}
              {...field("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded text-gray-400 transition-colors outline-none hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={login.isPending}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-indigo-600 font-medium text-white transition-colors outline-none hover:bg-indigo-700 focus-visible:ring-3 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-38"
        >
          {login.isPending ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </button>
      </form>
    </div>
  );
}
