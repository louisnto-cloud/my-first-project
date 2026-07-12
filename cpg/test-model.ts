// Verify the web model reproduces the Excel-verified numbers. Run: npx tsx cpg/test-model.ts
import { DEFAULT_INPUTS, computePnL, evaluateAll, breakEvenWholesale, NEUTRAL } from './src/model';

const fail: string[] = [];
const near = (a: number, b: number, tol: number, msg: string) => {
  if (Math.abs(a - b) > tol) fail.push(`${msg}: got ${a.toFixed(4)}, expected ~${b} (±${tol})`);
};
const eq = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg);
};

const base = computePnL(DEFAULT_INPUTS, NEUTRAL);
near(base.gross, 727500, 1, 'base gross');
near(base.gm, 0.417, 0.003, 'base gross margin');
near(base.tradePctG, 0.16, 0.005, 'base trade % of gross');
near(base.nm, 0.143, 0.004, 'base net margin');
near(base.np, 84475, 200, 'base net profit');
eq(base.beUnits != null && base.beUnits > 0, 'base break-even units positive');
near(breakEvenWholesale(DEFAULT_INPUTS, NEUTRAL), 1.4633, 0.01, 'break-even wholesale @ target NM');

const all = evaluateAll(DEFAULT_INPUTS);
const byKey = Object.fromEntries(all.map((r) => [r.def.key, r]));
eq(byKey.base.decision === 'GO', `base decision GO (got ${byKey.base.decision})`);
eq(byKey.promo.decision === 'REVIEW', `promo decision REVIEW (got ${byKey.promo.decision})`);
eq(byKey.promo.roi < 0, `promo ROI should be dilutive (got ${byKey.promo.roi.toFixed(2)})`);
eq(byKey.margrec.decision === 'GO', `margin recovery GO (got ${byKey.margrec.decision})`);
eq(byKey.costinf.pnl.gm < DEFAULT_INPUTS.minGM, 'cost inflation compresses GM below hurdle');

if (fail.length) {
  console.error('MODEL TEST FAILED:\n' + fail.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('MODEL OK — base: gross $%s, GM %s%%, trade %s%%, NM %s%%, NP $%s → %s',
  Math.round(base.gross).toLocaleString(),
  (base.gm * 100).toFixed(1),
  (base.tradePctG * 100).toFixed(1),
  (base.nm * 100).toFixed(1),
  Math.round(base.np).toLocaleString(),
  byKey.base.decision);
console.log('scenarios:', all.map((r) => `${r.def.name}=${r.decision}`).join(', '));
