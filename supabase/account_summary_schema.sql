-- ============================================================
-- account_summary：帳戶餘額 & 今日已實現損益
-- 在 Supabase SQL Editor 執行此檔案，可安全重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.account_summary (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cash_balance        NUMERIC     NOT NULL DEFAULT 0,
  realized_pnl_today  NUMERIC     NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS account_summary_user_id_idx ON public.account_summary(user_id);

-- ════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.account_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_summary_select"
  ON public.account_summary FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "account_summary_insert"
  ON public.account_summary FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "account_summary_update"
  ON public.account_summary FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "account_summary_delete"
  ON public.account_summary FOR DELETE
  USING (auth.uid() = user_id);
