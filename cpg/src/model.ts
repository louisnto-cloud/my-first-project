// CPG Commercial Decision System — model engine (ported from the verified
// Excel workbook). Pure, dependency-free functions so the UI can recompute the
// full gross-to-net P&L, scenarios, promotion ROI, break-even and the
// GO / REVIEW / STOP recommendation on every keystroke.

export type BusinessModel = 'Distributor' | 'Direct Retailer' | 'Club' | 'FDM' | 'Hybrid';

export interface CostStack {
  cogs: number;
  packaging: number;
  coman: number;
  inbound: number;
  outbound: number;
  duty: number;
  warehousing: number;
  compliance: number;
  returns: number;
  other: number;
}

export interface Inputs {
  // pricing & pack
  wholesalePrice: number; // $/unit the company realises before off-invoice
  unitsPerCase: number;
  // volume
  forecastUnits: number;
  baseUnits: number;
  fillRate: number; // 0..1
  promoLiftPct: number; // lift on base volume when promo runs
  cannibPct: number; // fraction of incremental that cannibalises base
  postDipPct: number; // fraction lost to post-promo dip
  // cost
  cost: CostStack; // per-unit variable cost lines
  brokerPct: number; // % of gross
  distributorPct: number; // % of gross
  // trade investment (three-basis buckets)
  tradePerUnit: number; // $/unit
  tradePctGross: number; // % of gross
  tradeFixed: number; // fixed $
  // other (non-trade) gross-to-net deductions
  otherDedPctGross: number; // accruals, EPD, chargebacks, claims …
  // fixed commercial cost (annual $)
  fixedTotal: number;
  // channel economics
  businessModel: BusinessModel;
  retailerMargin: number; // 0..1
  distributorMargin: number; // 0..1
  // governance thresholds
  targetGM: number;
  targetNM: number;
  targetROI: number;
  maxTradePct: number;
  minContribUnit: number;
  minGM: number;
  minNM: number;
}

export interface Multipliers {
  vol: number;
  price: number;
  vc: number;
  trade: number;
  fill: number;
  cannib: number;
  promo: number; // 1 = promo active, 0 = off
}

export const NEUTRAL: Multipliers = { vol: 1, price: 1, vc: 1, trade: 1, fill: 1, cannib: 1, promo: 0 };

export interface PnL {
  units: number;
  cases: number;
  price: number;
  gross: number;
  trade: number;
  otherDed: number;
  gtn: number;
  net: number;
  vcost: number;
  gp: number;
  gm: number;
  contrib: number;
  cm: number;
  np: number;
  nm: number;
  cpu: number; // contribution per unit
  ppu: number; // net profit per unit
  nrpUnit: number; // net realised price per unit
  nrpCase: number;
  tradePctG: number;
  tradePctN: number;
  tradeEff: number; // $ net profit per $ trade
  beUnits: number | null;
  onInvoice: number;
  offInvoice: number;
  // customer path
  distSell: number;
  retailShelf: number;
  retailerMarginPct: number;
  distributorMarginPct: number;
}

export function vcPerUnit(inp: Inputs): number {
  const c = inp.cost;
  return c.cogs + c.packaging + c.coman + c.inbound + c.outbound + c.duty + c.warehousing + c.compliance + c.returns + c.other;
}

const safe = (num: number, den: number) => (den === 0 ? 0 : num / den);

export function computePnL(inp: Inputs, m: Multipliers): PnL {
  const vcpu = vcPerUnit(inp) * m.vc;
  const vcPct = inp.brokerPct + inp.distributorPct;

  const effFill = Math.min(1, inp.fillRate * m.fill);
  const units = inp.forecastUnits * m.vol * effFill;
  const price = inp.wholesalePrice * m.price;
  const gross = units * price;

  const onInvoice = inp.tradePerUnit * units * m.trade;
  const offInvoice = (inp.tradePctGross * gross + inp.tradeFixed) * m.trade;
  const trade = onInvoice + offInvoice;
  const otherDed = inp.otherDedPctGross * gross * m.trade;
  const gtn = trade + otherDed;
  const net = gross - gtn;

  const vcost = vcpu * units + vcPct * gross;
  const gp = gross - vcost;
  const contrib = net - vcost;
  const np = contrib - inp.fixedTotal;
  const cpu = safe(contrib, units);

  const distSell = inp.businessModel === 'Distributor' ? safe(price, 1 - inp.distributorMargin) : price;
  const retailShelf = safe(distSell, 1 - inp.retailerMargin);

  return {
    units,
    cases: safe(units, inp.unitsPerCase),
    price,
    gross,
    trade,
    otherDed,
    gtn,
    net,
    vcost,
    gp,
    gm: safe(gp, gross),
    contrib,
    cm: safe(contrib, net),
    np,
    nm: safe(np, net),
    cpu,
    ppu: safe(np, units),
    nrpUnit: safe(net, units),
    nrpCase: safe(net, safe(units, inp.unitsPerCase)),
    tradePctG: safe(trade, gross),
    tradePctN: safe(trade, net),
    tradeEff: safe(np, trade),
    beUnits: cpu > 0 ? inp.fixedTotal / cpu : null,
    onInvoice,
    offInvoice,
    distSell,
    retailShelf,
    retailerMarginPct: safe(retailShelf - distSell, retailShelf),
    distributorMarginPct: safe(distSell - price, distSell),
  };
}

// Closed-form wholesale price that drives net margin to the target, holding
// volume and cost structure fixed (see Excel §8 break-even engine).
export function breakEvenWholesale(inp: Inputs, m: Multipliers): number {
  const a = (inp.tradePctGross + inp.otherDedPctGross) * m.trade;
  const b = inp.tradePerUnit * m.trade;
  const c = inp.tradeFixed * m.trade;
  const vc = vcPerUnit(inp) * m.vc;
  const f = inp.brokerPct + inp.distributorPct;
  const U = inp.forecastUnits * m.vol * Math.min(1, inp.fillRate * m.fill);
  const t = inp.targetNM;
  const denom = (1 - a - f - t * (1 - a)) * U;
  if (denom === 0 || U === 0) return 0;
  return ((b + vc) * U + c + inp.fixedTotal - t * (b * U + c)) / denom;
}

export type Decision = 'GO' | 'REVIEW' | 'STOP';

export function decide(p: PnL, inp: Inputs, isPromo: boolean, roi: number): Decision {
  if (p.np < 0 || p.cpu <= 0) return 'STOP';
  const passes =
    p.gm >= inp.minGM &&
    p.nm >= inp.minNM &&
    p.cpu >= inp.minContribUnit &&
    p.tradePctG <= inp.maxTradePct &&
    (!isPromo || roi >= inp.targetROI);
  return passes ? 'GO' : 'REVIEW';
}

export interface ScenarioDef {
  key: string;
  name: string;
  m: Multipliers;
}

export const SCENARIOS: ScenarioDef[] = [
  { key: 'base', name: 'Base Case', m: { vol: 1, price: 1, vc: 1, trade: 1, fill: 1, cannib: 1, promo: 0 } },
  { key: 'promo', name: 'Promo Case', m: { vol: 1.3, price: 0.95, vc: 1, trade: 1.35, fill: 1, cannib: 1.3, promo: 1 } },
  { key: 'hivol', name: 'High Volume', m: { vol: 1.2, price: 1, vc: 0.98, trade: 1.05, fill: 1, cannib: 1.1, promo: 0 } },
  { key: 'lovol', name: 'Low Volume', m: { vol: 0.8, price: 1, vc: 1.02, trade: 1, fill: 0.97, cannib: 0.9, promo: 0 } },
  { key: 'costinf', name: 'Cost Inflation', m: { vol: 1, price: 1, vc: 1.12, trade: 1, fill: 1, cannib: 1, promo: 0 } },
  { key: 'margrec', name: 'Margin Recovery', m: { vol: 0.95, price: 1.06, vc: 1, trade: 0.85, fill: 1, cannib: 1, promo: 0 } },
];

export interface ScenarioResult {
  def: ScenarioDef;
  pnl: PnL;
  roi: number;
  promoSpend: number;
  incrNP: number;
  decision: Decision;
}

export function evaluateScenario(inp: Inputs, def: ScenarioDef, base: PnL): ScenarioResult {
  const pnl = computePnL(inp, def.m);
  const promoSpend = Math.max(0, pnl.trade - base.trade);
  const incrNP = pnl.np - base.np;
  const roi = promoSpend === 0 ? 0 : incrNP / promoSpend;
  return { def, pnl, roi, promoSpend, incrNP, decision: decide(pnl, inp, def.m.promo === 1, roi) };
}

export function evaluateAll(inp: Inputs): ScenarioResult[] {
  const base = computePnL(inp, SCENARIOS[0].m);
  return SCENARIOS.map((def) => evaluateScenario(inp, def, base));
}

// Promotion tactics evaluated at base volume & active contribution/unit.
export interface Tactic {
  name: string;
  spend: number;
  liftPct: number; // lift on base volume
  cannibPct: number;
}

export const DEFAULT_TACTICS: Tactic[] = [
  { name: 'TPD', spend: 18000, liftPct: 0.18, cannibPct: 0.1 },
  { name: 'End Cap', spend: 10000, liftPct: 0.12, cannibPct: 0.15 },
  { name: 'Feature / Fence', spend: 12000, liftPct: 0.1, cannibPct: 0.12 },
  { name: 'Display Allowance', spend: 8000, liftPct: 0.14, cannibPct: 0.18 },
  { name: 'Advertising', spend: 6000, liftPct: 0.08, cannibPct: 0.05 },
  { name: 'Digital Support', spend: 5000, liftPct: 0.06, cannibPct: 0.04 },
];

export interface TacticResult extends Tactic {
  incrUnits: number;
  trueIncr: number;
  incrContrib: number;
  incrNP: number;
  roi: number;
  beLift: number;
  verdict: Decision;
}

export function evaluateTactic(inp: Inputs, base: PnL, t: Tactic): TacticResult {
  const baseVol = inp.baseUnits;
  const incrUnits = baseVol * t.liftPct;
  const trueIncr = incrUnits * (1 - t.cannibPct);
  const incrContrib = trueIncr * base.cpu;
  const incrNP = incrContrib - t.spend;
  const roi = t.spend === 0 ? 0 : incrNP / t.spend;
  const beLift = base.cpu <= 0 || baseVol === 0 ? NaN : t.spend / (base.cpu * baseVol);
  const verdict: Decision = incrNP < 0 ? 'STOP' : roi >= inp.targetROI ? 'GO' : 'REVIEW';
  return { ...t, incrUnits, trueIncr, incrContrib, incrNP, roi, beLift, verdict };
}

// A credible default SKU: a sparkling beverage 12-pack sold through a
// distributor into grocery. Calibrated so the Base Case is healthy
// (GM ~41.7%, trade ~16%, NM ~14.3%, +$84.5k → GO).
export const DEFAULT_INPUTS: Inputs = {
  wholesalePrice: 1.5,
  unitsPerCase: 12,
  forecastUnits: 500000,
  baseUnits: 380000,
  fillRate: 0.97,
  promoLiftPct: 0.35,
  cannibPct: 0.1,
  postDipPct: 0.07,
  cost: {
    cogs: 0.55,
    packaging: 0.09,
    coman: 0.04,
    inbound: 0.03,
    outbound: 0.05,
    duty: 0.01,
    warehousing: 0.02,
    compliance: 0.01,
    returns: 0.02,
    other: 0.01,
  },
  brokerPct: 0.03,
  distributorPct: 0.0,
  tradePerUnit: 0.04,
  tradePctGross: 0.072,
  tradeFixed: 44500,
  otherDedPctGross: 0.028,
  fixedTotal: 82000,
  businessModel: 'Distributor',
  retailerMargin: 0.3,
  distributorMargin: 0.12,
  targetGM: 0.42,
  targetNM: 0.12,
  targetROI: 1.0,
  maxTradePct: 0.22,
  minContribUnit: 0.15,
  minGM: 0.38,
  minNM: 0.08,
};
