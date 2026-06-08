-- ============================================================
-- trade_records：交易紀錄（試算套用）
-- 在 Supabase SQL Editor 執行此檔案，可安全重複執行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trade_records (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id      UUID        NULL,
  source        TEXT        NOT NULL DEFAULT 'SIMULATOR',
  type          TEXT        NOT NULL CHECK (type IN ('BUY', 'SELL')),
  symbol        TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  shares        NUMERIC     NOT NULL,
  price         NUMERIC     NOT NULL,
  amount        NUMERIC     NOT NULL,
  realized_pnl  NUMERIC     NULL,
  note          TEXT        NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trade_records_user_id_idx  ON public.trade_records(user_id);
CREATE INDEX IF NOT EXISTS trade_records_group_id_idx ON public.trade_records(group_id);
CREATE INDEX IF NOT EXISTS trade_records_symbol_idx   ON public.trade_records(symbol);

-- ════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.trade_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_records_select"
  ON public.trade_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "trade_records_insert"
  ON public.trade_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trade_records_update"
  ON public.trade_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trade_records_delete"
  ON public.trade_records FOR DELETE
  USING (auth.uid() = user_id);
