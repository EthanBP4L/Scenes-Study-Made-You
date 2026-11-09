
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { scenesTheme } from "../../lib/scenesTheme";
import { useAuth } from "../../components/AuthProvider";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const isSignup = mode === "signup";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }


async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setMessage("");

  if (isSignup && !name.trim()) {
    setMessage("Please enter a username.");
    return;
  }

  if (!email.trim() || !password) {
    setMessage("Please fill in your email and password.");
    return;
  }

  if (isSignup) {
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(name.trim())) {
      setMessage(
        "Username must be 3–30 characters and contain only letters, numbers, or underscores."
      );
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setMessage("Password must be between 8 and 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Your passwords don't match.");
      return;
    }
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    setMessage("API URL is not configured.");
    return;
  }

  try {
    if (isSignup) {
      const registerResponse = await fetch(
        `${apiUrl}/api/v1/users/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            username: name.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        setMessage(
          typeof error.detail === "string"
            ? error.detail
            : "Registration failed."
        );
        return;
      }
    }

    const loginResponse = await fetch(
      `${apiUrl}/api/v1/users/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      }
    );

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      setMessage(
        typeof error.detail === "string"
          ? error.detail
          : "Login failed."
      );
      return;
    }

    await refreshUser();
    router.push("/home");
  } catch {
    setMessage(
      "Unable to connect to the server. Please check that FastAPI is running."
    );
  }
}


  const inputClass =
    "w-full rounded-2xl border border-[#e6c4ff]/30 bg-[#140e2a]/45 px-4 py-3.5 text-sm text-[#f4e9ff] outline-none transition placeholder:text-[#d5c4e9]/50 focus:border-[#e883cb] focus:ring-2 focus:ring-[#e883cb]/15";

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 text-[#f4e9ff]"
      style={{
        background: scenesTheme.surfaces.page,
        fontFamily: scenesTheme.typography.body,
      }}
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-[12%] h-80 w-80 rounded-full bg-[#e883cb]/10 blur-[100px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 bottom-[8%] h-96 w-96 rounded-full bg-[#8444e5]/20 blur-[110px]"
      />

      <div className="relative z-10 w-full max-w-[430px]">
        {/* SCENES branding - no navigation */}
        <div className="mb-9 text-center">
          <div className="text-[clamp(3.5rem,12vw,5rem)] font-extrabold tracking-[-0.075em] text-[#f4e9ff]">
            SCENES
          </div>

          <p className="mt-1 text-sm tracking-[0.35em] text-[#e883cb]">
            study made you
          </p>
        </div>

        {/* Login card */}
        <section className="rounded-[28px] border border-[#e6c4ff]/35 bg-[#211735]/65 p-6 shadow-[0_24px_90px_rgba(13,5,36,0.55)] backdrop-blur-2xl sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {isSignup ? "Create your space" : "Welcome back"}
            </h1>

            <p className="mt-2 text-sm text-[#d5c4e9]">
              {isSignup
                ? "Your little corner of SCENES starts here."
                : "Your space is waiting for you."}
            </p>
          </div>

          {/* Login / sign-up switch */}
          <div className="mb-7 flex rounded-2xl border border-white/10 bg-[#110c23]/55 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                !isSignup
                  ? "bg-[#8444e5]/70 text-white shadow-md"
                  : "text-[#d5c4e9] hover:text-white"
              }`}
            >
              Log in
            </button>

            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isSignup
                  ? "bg-[#8444e5]/70 text-white shadow-md"
                  : "text-[#d5c4e9] hover:text-white"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name - sign-up only */}
            {isSignup && (
              <div>
                <label
                  htmlFor="signup-name"
                  className="mb-2 block text-sm font-medium text-[#f7e9ff]"
                >
                  Your name
                </label>

                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="What should we call you?"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="auth-email"
                className="mb-2 block text-sm font-medium text-[#f4e9ff]"
              >
                Email
              </label>

              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="auth-password"
                  className="text-sm font-medium text-[#f4e9ff]"
                >
                  Password
                </label>

                {!isSignup && (
                  <button
                    type="button"
                    onClick={() =>
                      setMessage(
                        "Password reset will be available when authentication is connected."
                      )
                    }
                    className="text-xs text-[#e883cb] transition hover:text-[#f4e9ff]"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isSignup ? "new-password" : "current-password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  className={`${inputClass} pr-16`}
                  minLength={isSignup ? 8 : undefined}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  className="absolute inset-y-0 right-4 text-xs font-semibold text-[#e883cb] transition hover:text-white"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm password - sign-up only */}
            {isSignup && (
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-[#f4e9ff]"
                >
                  Confirm password
                </label>

                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  className={inputClass}
                  required
                />
              </div>
            )}

            {/* Validation / informational message */}
            {message && (
              <p
                role="status"
                aria-live="polite"
                className="rounded-xl border border-[#e6c4ff]/20 bg-[#8444e5]/15 px-4 py-3 text-sm text-[#f4e9ff]"
              >
                {message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#8444e5] to-[#bc65c9] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_rgba(132,68,229,0.3)] transition hover:brightness-110 active:scale-[0.99]"
            >
              {isSignup ? "Create account" : "Enter SCENES"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-[#d5c4e9]/70">
            A space to study, create, and make it yours.
          </p>
        </section>
      </div>
    </main>
  );
}
