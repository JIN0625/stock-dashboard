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
  symbol:      string;
  price:       number;
  change:      number;
  change_pct:  number;
  date:        string;
  source?:     "Yahoo" | "FinMind";
  isRealtime?: boolean;
}

export interface DividendInfo {
  symbol:          string;
  exDividendDate:  string | null;
  paymentDate:     string | null;
  cashDividend:    number;
  stockDividend:   number;
  dividendYield:   number | null;
  source:          string;
}

export interface DividendRecord {
  id:               string;
  user_id:          string;
  symbol:           string;
  name:             string;
  ex_dividend_date: string;
  payment_date:     string | null;
  cash_dividend:    number;
  stock_dividend:   number;
  shares_owned:     number;
  cash_received:    number;
  reinvested:       boolean;
  shares_bought:    number | null;
  reinvest_price:   number | null;
  created_at:       string;
}

export interface UserSettings {
  dividend_reinvest_enabled: boolean;
}

export type DivSyncStatus =
  | "recorded"
  | "reinvested"
  | "already_recorded"
  | "not_yet_payable";

export interface DivSyncItem {
  symbol:           string;
  name:             string;
  ex_dividend_date: string;
  payment_date:     string | null;
  cash_dividend:    number;
  cash_received:    number;
  status:           DivSyncStatus;
  message:          string;
  shares_bought?:   number;
  reinvest_price?:  number;
  new_shares?:      number;
  new_avg_cost?:    number;
}

export interface DivSyncResponse {
  synced:      number;
  total_cash:  number;
  results:     DivSyncItem[];
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
  dividend?:       DividendInfo | null;
  dividendRecord?: DividendRecord | null;
}

export interface PricePoint {
  date:  string;
  close: number;
}

export interface PortfolioSummary {
  total_assets:          number;
  total_cost:            number;
  total_pnl:             number;
  total_pnl_pct:         number;
  daily_pnl:             number;
  daily_pnl_pct:         number;
  ytd_dividends?:        number;
  estimated_dividends?:  number;
  cash_balance?:         number;
  realized_pnl_today?:   number;
}

// ── ETF 成分股 ───────────────────────────────────────────────

export interface TopHolding {
  rank:     number;
  name:     string;
  symbol?:  string;   // 股票代號（可能缺失）
  weight:   number;   // 百分比，例如 8.97
}
export interface WeightItem {
  name:   string;
  weight: number;
}
export interface ConstituentData {
  symbol:            string;
  source:            string;   // "Yahoo股市"
  holdingDate:       string;   // "2026/04/01"
  industryDate:      string;
  assetDate:         string;
  topHoldings:       TopHolding[];
  industries:        WeightItem[];
  assets:            WeightItem[];
  topHoldingsWeight: number;   // 前十大持股比重加總
  otherWeight:       number;   // 100 - topHoldingsWeight
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
