-- ============================================================
-- DCA 相關資料表 — 在 Supabase SQL Editor 執行
-- ============================================================

-- ── dca_plans（定期定額設定）──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dca_plans (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol         TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  type           TEXT        NOT NULL DEFAULT 'stock' CHECK (type IN ('stock', 'etf')),
  day_of_month   INTEGER     NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  monthly_amount NUMERIC     NOT NULL CHECK (monthly_amount > 0),
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dca_plans_user_id_idx ON public.dca_plans(user_id);

-- ── dca_executions（每次執行紀錄）────────────────────────────
CREATE TABLE IF NOT EXISTS public.dca_executions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dca_plan_id    UUID        NOT NULL REFERENCES public.dca_plans(id) ON DELETE CASCADE,
  symbol         TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  execution_date DATE        NOT NULL,
  amount         NUMERIC     NOT NULL,   -- 投入金額
  price          NUMERIC     NOT NULL,   -- 執行時股價
  shares_bought  NUMERIC     NOT NULL,   -- 買入股數（允許小數）
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dca_plan_id, execution_date)   -- 同一計畫同一天只能執行一次
);

CREATE INDEX IF NOT EXISTS dca_executions_user_id_idx     ON public.dca_executions(user_id);
CREATE INDEX IF NOT EXISTS dca_executions_plan_id_idx     ON public.dca_executions(dca_plan_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.dca_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dca_executions  ENABLE ROW LEVEL SECURITY;

-- dca_plans
CREATE POLICY "dca_plans_select" ON public.dca_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dca_plans_insert" ON public.dca_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dca_plans_update" ON public.dca_plans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dca_plans_delete" ON public.dca_plans
  FOR DELETE USING (auth.uid() = user_id);

-- dca_executions
CREATE POLICY "dca_exec_select" ON public.dca_executions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dca_exec_insert" ON public.dca_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dca_exec_delete" ON public.dca_executions
  FOR DELETE USING (auth.uid() = user_id);

-- ── updated_at 自動更新觸發器 ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dca_plans_updated_at ON public.dca_plans;
CREATE TRIGGER dca_plans_updated_at
  BEFORE UPDATE ON public.dca_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
