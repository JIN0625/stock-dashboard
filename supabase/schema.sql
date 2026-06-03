-- ============================================================
-- 在 Supabase SQL Editor 執行此檔案
-- 所有 CREATE 皆用 IF NOT EXISTS，可安全重複執行
-- ============================================================

-- ── 持股資料 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.holdings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol      TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  shares      NUMERIC     NOT NULL CHECK (shares > 0),
  avg_cost    NUMERIC     NOT NULL CHECK (avg_cost > 0),
  type        TEXT        NOT NULL DEFAULT 'stock' CHECK (type IN ('stock', 'etf')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 若舊表沒有 user_id，新增欄位（已有就跳過）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'holdings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.holdings
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 加速 user_id 查詢
CREATE INDEX IF NOT EXISTS holdings_user_id_idx ON public.holdings(user_id);

-- ── 報價快取 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quote_cache (
  symbol      TEXT    PRIMARY KEY,
  price       NUMERIC NOT NULL,
  change      NUMERIC NOT NULL DEFAULT 0,
  change_pct  NUMERIC NOT NULL DEFAULT 0,
  trade_date  DATE    NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 股票基本資料快取 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_info_cache (
  symbol      TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'stock'
                          CHECK (type IN ('stock', 'etf')),
  market      TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.holdings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_cache      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_info_cache ENABLE ROW LEVEL SECURITY;

-- ── holdings RLS（依 user_id 隔離）───────────────────────────

-- 先刪舊的寬鬆 policy（若存在）
DROP POLICY IF EXISTS "Allow all for anon" ON public.holdings;

-- SELECT：只能看自己的持股
CREATE POLICY "holdings_select"
  ON public.holdings FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT：只能新增自己的持股（user_id 必須等於當前登入者）
CREATE POLICY "holdings_insert"
  ON public.holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE：只能更新自己的持股
CREATE POLICY "holdings_update"
  ON public.holdings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE：只能刪除自己的持股
CREATE POLICY "holdings_delete"
  ON public.holdings FOR DELETE
  USING (auth.uid() = user_id);

-- ── quote_cache & stock_info_cache（所有登入者可讀寫）────────
-- 這兩個是共用快取，不需要 user 隔離

DROP POLICY IF EXISTS "Allow all for anon" ON public.quote_cache;
DROP POLICY IF EXISTS "Allow all for anon" ON public.stock_info_cache;

CREATE POLICY "quote_cache_all"
  ON public.quote_cache FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "stock_info_cache_all"
  ON public.stock_info_cache FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);
