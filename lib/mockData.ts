import type { Holding, HoldingWithQuote, PricePoint, PortfolioSummary } from "@/types";

export const mockHoldings: Holding[] = [
  { id: "1", symbol: "2330", name: "台積電", shares: 1000, avg_cost: 680, type: "stock" },
  { id: "2", symbol: "0050", name: "元大台灣50", shares: 3000, avg_cost: 145, type: "etf" },
  { id: "3", symbol: "2317", name: "鴻海", shares: 5000, avg_cost: 105, type: "stock" },
  { id: "4", symbol: "2308", name: "台達電", shares: 800, avg_cost: 310, type: "stock" },
  { id: "5", symbol: "00878", name: "國泰永續高股息", shares: 10000, avg_cost: 20.5, type: "etf" },
];

function generateHistory(basePrice: number, days = 30): PricePoint[] {
  const points: PricePoint[] = [];
  let price = basePrice * 0.92;
  const today = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    price = price * (1 + (Math.random() - 0.47) * 0.02);
    points.push({
      date: d.toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
    });
  }
  // last point = current price
  if (points.length > 0) {
    points[points.length - 1].close = basePrice;
  }
  return points;
}

const mockPrices: Record<string, { price: number; change: number; change_pct: number }> = {
  "2330": { price: 940,  change: 15,    change_pct: 1.62  },
  "0050": { price: 168,  change: -1.2,  change_pct: -0.71 },
  "2317": { price: 182,  change: 3.5,   change_pct: 1.96  },
  "2308": { price: 295,  change: -8,    change_pct: -2.64 },
  "00878": { price: 22.8, change: 0.15, change_pct: 0.66  },
};

export function getMockHoldingsWithQuotes(): HoldingWithQuote[] {
  return mockHoldings.map((h) => {
    const q = mockPrices[h.symbol] ?? { price: h.avg_cost, change: 0, change_pct: 0 };
    const market_value = q.price * h.shares;
    const cost_basis = h.avg_cost * h.shares;
    const total_pnl = market_value - cost_basis;
    const total_pnl_pct = (total_pnl / cost_basis) * 100;
    const daily_pnl = q.change * h.shares;
    return {
      ...h,
      current_price: q.price,
      change: q.change,
      change_pct: q.change_pct,
      market_value,
      cost_basis,
      total_pnl,
      total_pnl_pct,
      daily_pnl,
      history: generateHistory(q.price),
    };
  });
}

export function getMockSummary(): PortfolioSummary {
  const holdings = getMockHoldingsWithQuotes();
  const total_assets = holdings.reduce((s, h) => s + h.market_value, 0);
  const total_cost = holdings.reduce((s, h) => s + h.cost_basis, 0);
  const total_pnl = total_assets - total_cost;
  const total_pnl_pct = (total_pnl / total_cost) * 100;
  const daily_pnl = holdings.reduce((s, h) => s + h.daily_pnl, 0);
  const daily_pnl_pct = (daily_pnl / (total_assets - daily_pnl)) * 100;
  return { total_assets, total_cost, total_pnl, total_pnl_pct, daily_pnl, daily_pnl_pct };
}
