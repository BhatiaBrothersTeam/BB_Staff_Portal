"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { signInAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

const primaryButtonClassName =
  "rounded-[4px] bg-btn-bg px-4 py-3 text-center font-display font-bold tracking-wide text-btn-ink transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60";

function ErrorAlert({ message }: { message: string | null }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      hidden={!message}
      className="rounded-sm bg-err-soft px-3 py-2.5 text-sm text-err"
    >
      {message}
    </div>
  );
}

export function SignInForm({
  keycloakEnabled,
  demoEnabled,
  from,
  error,
}: {
  keycloakEnabled: boolean;
  demoEnabled: boolean;
  /** Where to land after signing in (already checked to be a portal path). */
  from: string;
  /** Message for a failed Keycloak sign-in, from the ?error= the callback sets. */
  error: string | null;
}) {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Coming Back from Keycloak's page restores this one from the browser's
    // back/forward cache with the button still disabled; re-enable it.
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setRedirecting(false);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
    <div className="grid place-items-center px-4 py-10 sm:px-6 md:py-10">
      <div className="grid w-full max-w-[380px] gap-5 rounded-sm border border-line bg-surface p-7 sm:p-8">
        <div>
          <h2 className="font-display text-2xl font-bold">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your Bhatia Brothers staff account.</p>
        </div>

        <ErrorAlert message={error} />

        {keycloakEnabled ? (
          // A plain link, not a fetch: the browser has to leave for Keycloak's
          // own login page and come back through /api/auth/callback.
          <a
            href={`/api/auth/login?from=${encodeURIComponent(from)}`}
            onClick={() => setRedirecting(true)}
            aria-disabled={redirecting}
            className={`${primaryButtonClassName} ${redirecting ? "pointer-events-none opacity-60" : ""}`}
          >
            {redirecting ? "Opening Keycloak…" : "Sign in with Keycloak"}
          </a>
        ) : null}

        {keycloakEnabled && demoEnabled ? (
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
            or demo login
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </div>
        ) : null}

        {demoEnabled ? <DemoSignInForm /> : null}

        {!keycloakEnabled && !demoEnabled ? (
          <p className="text-sm text-muted">
            No sign-in method is set up on this server. Set the KEYCLOAK_* variables (or DEMO_LOGIN=true for local
            testing) and restart.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DemoSignInForm() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const reduceMotion = useReducedMotion();
  const controls = useAnimation();
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      if (!reduceMotion) {
        controls.start({ x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.4 } });
      }
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error, reduceMotion, controls]);

  return (
    <motion.form action={formAction} animate={controls} noValidate className="grid gap-5">
      <ErrorAlert message={state.error} />

      <div className="grid gap-1.5">
        <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="e.g. Demo"
          required
          className="rounded-[4px] border border-line bg-bg px-3 py-2.5 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Password"
            required
            className="w-full rounded-[4px] border border-line bg-bg px-3 py-2.5 pr-16 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-controls="password"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button type="submit" disabled={isPending} className={primaryButtonClassName}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <div className="border-t border-dashed border-line pt-3.5 text-[13px] text-muted">
        Demo access: username{" "}
        <code className="rounded-[3px] bg-bg px-1.5 py-0.5 font-mono-brand text-[12px] text-ink">Demo</code>, password{" "}
        <code className="rounded-[3px] bg-bg px-1.5 py-0.5 font-mono-brand text-[12px] text-ink">Demo</code>
      </div>
    </motion.form>
  );
}
