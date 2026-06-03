export interface Holding {
  id:         string;
  symbol:     string;           // e.g. "2330"
  name:       string;           // e.g. "台積電"
  shares:     number;
  avg_cost:   number;           // 平均成本（元）
  type:       "stock" | "etf";
  created_at?: string;
}

export interface Quote {
  symbol:     string;
  price:      number;
  change:     number;           // 今日漲跌（元）
  change_pct: number;           // 今日漲跌（%）
  date:       string;           // YYYY-MM-DD
}

// Holding enriched with live quote data
export interface HoldingWithQuote extends Holding {
  current_price: number;
  change:        number;
  change_pct:    number;
  market_value:  number;        // 目前市值
  cost_basis:    number;        // 投入成本
  total_pnl:     number;        // 總損益
  total_pnl_pct: number;        // 報酬率
  daily_pnl:     number;        // 今日損益
  quote_date?:   string;        // 最新報價日期
  market?:       string;        // e.g. "上市" | "上櫃" | "ETF"
  history?:      PricePoint[];  // 走勢歷史（sparkline）
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
