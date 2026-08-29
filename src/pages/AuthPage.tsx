/**
 * AuthPage — sign in / sign up. First profile is auto-promoted to admin
 * by a DB trigger (schema.sql).
 * Includes the signature Persian support note (Telegram) and an animated
 * email-confirmation dialog after signup. Auth context = Halftone loader.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, X } from "lucide-react";
import { HalftoneLoader } from "@/components/ui/CircleLoaders";
import { Button, Input, FieldLabel } from "@/components/ui/primitives";
import { ErrorNote } from "@/components/ui/bits";
import { signIn, signUp } from "@/services/auth";
import { useAuthStore, useToast } from "@/store";
import { dbErrorMessage, isSupabaseConfigured } from "@/lib/supabase";
import { APP_VERSION, BRAND_TAGLINE } from "@/config/constants";

const TELEGRAM_URL = "https://t.me/Mamadov_Pv";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const navigate = useNavigate();
  const initialize = useAuthStore((s) => s.initialize);
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email.trim(), password);
        if (error) throw error;
        await initialize();
        navigate("/");
      } else {
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setSubmitting(false);
          return;
        }
        const { data, error } = await signUp(email.trim(), password, displayName.trim());
        if (error) throw error;
        if (data.session) {
          // email confirmation disabled → straight in
          await initialize();
          navigate("/");
        } else {
          // confirmation email sent → Persian dialog, stay on sign-in
          setConfirmOpen(true);
          setMode("signin");
          toast({
            title: "Account created",
            description: "Confirm your email to sign in — the first account is granted admin role.",
          });
        }
      }
    } catch (e) {
      setError(dbErrorMessage(e as never));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dot-grid relative grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
      {/* ambient scanline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="animate-scan h-2 w-full bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--txt)_25%,transparent)] to-transparent" />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="dot-grid-sm mb-5 flex size-14 items-center justify-center rounded-2xl border border-line">
            <span className="display text-2xl text-[var(--txt)]">M</span>
          </div>
          <h1 className="display text-3xl tracking-[0.35em] text-[var(--txt)]">MAMADO</h1>
          <p className="meta mt-2 normal-case tracking-normal">{BRAND_TAGLINE}</p>
        </div>

        <div className="card-surface p-5">
          {/* mode toggle */}
          <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-[10px] border border-line text-xs">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={
                  mode === m
                    ? "cursor-pointer bg-[var(--panel2)] py-2 text-[var(--txt)] transition-colors"
                    : "cursor-pointer py-2 text-[var(--txt-faint)] transition-colors hover:text-[var(--txt-dim)]"
                }
              >
                {m === "signin" ? "SIGN IN" : "SIGN UP"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {mode === "signup" ? (
              <div>
                <FieldLabel>Display name</FieldLabel>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
            ) : null}
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.com" autoCapitalize="none" />
            </div>
            <div>
              <FieldLabel>Password</FieldLabel>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void submit()} placeholder="••••••••" />
            </div>

            {error ? <ErrorNote message={error} /> : null}

            <Button variant="primary" className="mt-1 w-full" loading={submitting} disabled={!email || !password} onClick={() => void submit()}>
              {submitting ? null : mode === "signin" ? "Enter the system" : "Create account"}
            </Button>

            {submitting ? (
              <div className="mt-3 flex justify-center py-1">
                <HalftoneLoader size={44} label={mode === "signin" ? "AUTHENTICATING" : "CREATING"} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Persian support note — elegant, minimal, not an error */}
        <div className="mt-6 border-t border-dashed border-line pt-4">
          <p
            dir="rtl"
            className="text-center text-[12.5px] leading-7 text-[var(--txt-dim)] [font-family:'Vazirmatn','Segoe_UI',Tahoma,sans-serif]"
          >
            رمز عبورتان را فراموش نکنید؛ اما اگر روزی فراموشش کردید، به{" "}
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex translate-y-[2px] items-center gap-0.5 text-[var(--txt)] underline decoration-[var(--txt-faint)] decoration-dotted underline-offset-4 transition-colors hover:decoration-[var(--txt)]"
              dir="ltr"
            >
              @Mamadov_Pv
            </a>{" "}
            در تلگرام پیام دهید.
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <p className="meta mt-4 text-center normal-case tracking-normal text-[var(--color-caution)]">
            ⚠ Supabase not configured — copy .env.example → .env and set your project keys.
          </p>
        ) : null}

        <p className="meta mt-8 text-center">// designed by Mamadov — v{APP_VERSION}</p>
      </div>

      {/* ── Signup confirmation dialog ── */}
      <AnimatePresence>
        {confirmOpen ? (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={() => setConfirmOpen(false)} aria-hidden />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label="Confirmation email sent"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-xs overflow-hidden rounded-2xl border border-line bg-[var(--panel)] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            >
              <button
                onClick={() => setConfirmOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 cursor-pointer rounded-lg p-1.5 text-[var(--txt-faint)] transition-colors hover:bg-[var(--panel2)] hover:text-[var(--txt)]"
              >
                <X size={14} />
              </button>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-line"
              >
                <Mail size={20} className="text-[var(--txt)]" />
              </motion.div>
              <p
                dir="rtl"
                className="text-[15px] leading-8 text-[var(--txt)] [font-family:'Vazirmatn','Segoe_UI',Tahoma,sans-serif]"
              >
                ایمیل تأیید برای شما ارسال شد.
              </p>
              <p className="meta mt-2 leading-relaxed normal-case tracking-normal">
                check your inbox (and spam) to confirm your address before signing in
              </p>
              <Button variant="outline" className="mt-5 w-full" onClick={() => setConfirmOpen(false)}>
                Understood
              </Button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const initialized = useAuthStore((s) => s.initialized);
  if (!initialized) return null;
  if (!sessionUserId) return null;
  return <>{children}</>;
}
