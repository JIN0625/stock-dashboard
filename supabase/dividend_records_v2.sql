-- ============================================================
-- dividend_records 欄位補充（可安全重複執行）
-- ============================================================

ALTER TABLE public.dividend_records
  ADD COLUMN IF NOT EXISTS shares_bought  NUMERIC,
  ADD COLUMN IF NOT EXISTS reinvest_price NUMERIC;
