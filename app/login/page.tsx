"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase";

function MagicLinkSent({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 size={32} className="text-emerald-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">確認信已寄出</h2>
        <p className="text-sm text-muted leading-relaxed">
          請檢查 <span className="font-semibold text-gray-800">{email}</span> 的信箱，
          點擊信中的連結即可登入。
        </p>
      </div>
      <button
        onClick={onBack}
        className="text-sm text-red-500 font-medium underline underline-offset-2"
      >
        重新輸入 Email
      </button>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(nextPath);
    });
  }, []);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("請輸入 Email");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (authError) throw authError;

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "發送失敗，請再試一次");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google 登入失敗");
      setGoogleLoading(false);
    }
  }

  if (sent) {
    return <MagicLinkSent email={email} onBack={() => { setSent(false); setEmail(""); }} />;
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-3">📈</div>
        <h1 className="text-2xl font-bold text-gray-900">股市損益</h1>
        <p className="text-sm text-muted mt-1">個人持股追蹤</p>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 flex items-center justify-center gap-3 text-sm font-semibold text-gray-700 shadow-sm active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {googleLoading ? <Loader2 size={18} className="animate-spin text-gray-400" /> : <GoogleIcon />}
        使用 Google 登入
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-muted">或</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-3" noValidate>
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="w-full bg-white rounded-2xl pl-10 pr-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full bg-red-500 text-white rounded-2xl py-3.5 font-semibold text-base shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "傳送中…" : "寄送登入連結"}
        </button>
      </form>

      <p className="text-center text-xs text-muted px-4 leading-relaxed">
        我們會寄一封 Magic Link 到您的信箱，點擊即可免密碼登入。
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-sm p-8">
          <Suspense fallback={
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}