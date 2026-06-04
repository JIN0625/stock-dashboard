-- ============================================================
-- 使用者設定資料表（可安全重複執行）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dividend_reinvest_enabled BOOLEAN     NOT NULL DEFAULT false,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
