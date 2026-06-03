export interface Holding {
  id:         string;
  symbol:     string;
  name:       string;
  shares:     number;
  avg_cost:   number;
  type:       "stock" | "etf";
  created_at?: string;
}

export interface Quote {
  symbol:     string;
  price:      number;
  change:     number;
  change_pct: number;
  date:       string;
}

export interface HoldingWithQuote extends Holding {
  current_price: number;
  change:        number;
  change_pct:    number;
  market_value:  number;
  cost_basis:    number;
  total_pnl:     number;
  total_pnl_pct: number;
  daily_pnl:     number;
  quote_date?:   string;
  market?:       string;
  history?:      PricePoint[];
}

export interface PricePoint {
  date:  string;
  close: number;
}

export interface PortfolioSummary {
  total_assets:   number;
  total_cost:     number;
  total_pnl:      number;
  total_pnl_pct:  number;
  daily_pnl:      number;
  daily_pnl_pct:  number;
}

// ── DCA ─────────────────────────────────────────────────────

export interface DcaPlan {
  id:             string;
  user_id:        string;
  symbol:         string;
  name:           string;
  type:           "stock" | "etf";
  day_of_month:   number;
  monthly_amount: number;
  is_active:      boolean;
  created_at:     string;
  updated_at:     string;
}

export interface DcaExecution {
  id:             string;
  user_id:        string;
  dca_plan_id:    string;
  symbol:         string;
  name:           string;
  execution_date: string;
  amount:         number;
  price:          number;
  shares_bought:  number;
  created_at:     string;
}

export type DcaRunStatus =
  | "executed"
  | "already_executed"
  | "not_today"
  | "no_price"
  | "error";

export interface DcaRunResult {
  plan_id:  string;
  symbol:   string;
  name:     string;
  status:   DcaRunStatus;
  message:  string;
  execution?: {
    price:         number;
    shares_bought: number;
    amount:        number;
    new_shares:    number;
    new_avg_cost:  number;
  };
}
