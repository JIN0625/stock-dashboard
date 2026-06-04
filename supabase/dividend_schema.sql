-- ============================================================
-- 配息紀錄資料表
-- 在 Supabase SQL Editor 執行此檔案
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dividend_records (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol           TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  ex_dividend_date DATE        NOT NULL,
  payment_date     DATE,
  cash_dividend    NUMERIC     NOT NULL DEFAULT 0,
  stock_dividend   NUMERIC     NOT NULL DEFAULT 0,
  shares_owned     NUMERIC     NOT NULL,
  cash_received    NUMERIC     NOT NULL DEFAULT 0,
  reinvested       BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dividend_records_user_id_idx
  ON public.dividend_records(user_id);

CREATE INDEX IF NOT EXISTS dividend_records_symbol_idx
  ON public.dividend_records(symbol);

CREATE UNIQUE INDEX IF NOT EXISTS dividend_records_unique_idx
  ON public.dividend_records(user_id, symbol, ex_dividend_date);

ALTER TABLE public.dividend_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dividend_records_select"
  ON public.dividend_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "dividend_records_insert"
  ON public.dividend_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dividend_records_update"
  ON public.dividend_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dividend_records_delete"
  ON public.dividend_records FOR DELETE
  USING (auth.uid() = user_id);
