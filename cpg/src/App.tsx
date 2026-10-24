import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_INPUTS,
  DEFAULT_TACTICS,
  SCENARIOS,
  breakEvenWholesale,
  computePnL,
  evaluateAll,
  evaluateTactic,
  vcPerUnit,
  type BusinessModel,
  type Decision,
  type Inputs,
} from './model';
import { num0, pct1, usd0, usd2, x2 } from './format';

const STORE_KEY = 'cpg-inputs-v1';

function loadInputs(): Inputs {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...DEFAULT_INPUTS, ...JSON.parse(raw), cost: { ...DEFAULT_INPUTS.cost, ...JSON.parse(raw).cost } };
  } catch {
    /* fall through */
  }
  return DEFAULT_INPUTS;
}

const DEC_STYLE: Record<Decision, string> = {
  GO: 'bg-emerald-500 text-white',
  REVIEW: 'bg-amber-400 text-amber-950',
  STOP: 'bg-rose-500 text-white',
};
const DEC_SOFT: Record<Decision, string> = {
  GO: 'bg-emerald-100 text-emerald-700',
  REVIEW: 'bg-amber-100 text-amber-700',
  STOP: 'bg-rose-100 text-rose-700',
};

export default function App() {
  const [inputs, setInputs] = useState<Inputs>(loadInputs);
  const [scenarioKey, setScenarioKey] = useState('base');
  const [tab, setTab] = useState<'dashboard' | 'scenarios' | 'promotions'>('dashboard');

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(inputs));
    } catch {
      /* ignore */
    }
  }, [inputs]);

  const results = useMemo(() => evaluateAll(inputs), [inputs]);
  const base = results[0].pnl;
  const active = results.find((r) => r.def.key === scenarioKey) ?? results[0];
  const beWholesale = useMemo(() => breakEvenWholesale(inputs, active.def.m), [inputs, active.def.m]);

  const set = <K extends keyof Inputs>(key: K, value: Inputs[K]) => setInputs((p) => ({ ...p, [key]: value }));
  const setCost = (key: keyof Inputs['cost'], value: number) =>
    setInputs((p) => ({ ...p, cost: { ...p.cost, [key]: value } }));

  return (
    <div className="min-h-screen">
      <TopBar
        decision={active.decision}
        scenarioName={active.def.name}
        onReset={() => setInputs(DEFAULT_INPUTS)}
      />

      <div className="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[360px_1fr]">
        {/* -------- Inputs sidebar -------- */}
        <aside className="space-y-3">
          <InputsPanel inputs={inputs} set={set} setCost={setCost} />
        </aside>

        {/* -------- Main panel -------- */}
        <main className="space-y-4">
          {/* scenario selector + tabs */}
          <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Scenario</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold"
                value={scenarioKey}
                onChange={(e) => setScenarioKey(e.target.value)}
              >
                {SCENARIOS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {(['dashboard', 'scenarios', 'promotions'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`tab capitalize ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {tab === 'dashboard' && (
            <Dashboard inputs={inputs} pnl={active.pnl} decision={active.decision} beWholesale={beWholesale} roi={active.roi} isPromo={active.def.m.promo === 1} />
          )}
          {tab === 'scenarios' && (
            <ScenariosTab results={results} activeKey={scenarioKey} onPick={setScenarioKey} />
          )}
          {tab === 'promotions' && <PromotionsTab inputs={inputs} base={base} />}
        </main>
      </div>
      <footer className="mx-auto max-w-[1400px] px-4 pb-6 pt-2 text-center text-xs text-slate-400">
        CPG Commercial Decision System · one product × one customer path × one scenario · figures recalculate live · demo data, all
        assumptions editable
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ TopBar */
function TopBar({ decision, scenarioName, onReset }: { decision: Decision; scenarioName: string; onReset: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-lg font-black">₵</div>
          <div>
            <div className="text-sm font-black leading-tight">CPG Commercial Decision System</div>
            <div className="text-[11px] font-semibold text-slate-400">Pricing · Trade · Promotion · Customer P&amp;L</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recommendation · {scenarioName}</div>
            <div className="text-[11px] font-semibold text-slate-300">GO / REVIEW / STOP</div>
          </div>
          <span className={`chip !px-4 !py-1.5 !text-sm ${DEC_STYLE[decision]}`}>{decision}</span>
          <button onClick={onReset} className="btn bg-slate-700 text-slate-200 hover:bg-slate-600">
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ Inputs */
function Section({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        {title}
        <span className="text-slate-400">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="space-y-2 border-t border-slate-100 px-3 py-3">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  kind = 'num',
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  kind?: 'money' | 'pct' | 'num';
  step?: number;
  suffix?: string;
}) {
  const display = kind === 'pct' ? +(value * 100).toFixed(4) : value;
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="flex items-center gap-1">
        {kind === 'money' && <span className="text-xs text-slate-400">$</span>}
        <input
          type="number"
          className="field !w-24"
          value={Number.isFinite(display) ? display : 0}
          step={step ?? (kind === 'pct' ? 0.1 : kind === 'money' ? 0.01 : 1)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isNaN(v)) return onChange(0);
            onChange(kind === 'pct' ? v / 100 : v);
          }}
        />
        <span className="w-6 text-left text-xs text-slate-400">{suffix ?? (kind === 'pct' ? '%' : '')}</span>
      </span>
    </label>
  );
}

function InputsPanel({
  inputs,
  set,
  setCost,
}: {
  inputs: Inputs;
  set: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void;
  setCost: (k: keyof Inputs['cost'], v: number) => void;
}) {
  const vcpu = vcPerUnit(inputs);
  return (
    <>
      <div className="px-1 text-xs font-bold uppercase tracking-wide text-slate-400">Assumptions — edit anything</div>

      <Section title="Pricing &amp; Volume" defaultOpen>
        <Field label="Wholesale price / unit" kind="money" value={inputs.wholesalePrice} onChange={(v) => set('wholesalePrice', v)} />
        <Field label="Units per case" value={inputs.unitsPerCase} onChange={(v) => set('unitsPerCase', v)} />
        <Field label="Forecast units (yr)" value={inputs.forecastUnits} onChange={(v) => set('forecastUnits', v)} step={1000} />
        <Field label="Base (non-promo) units" value={inputs.baseUnits} onChange={(v) => set('baseUnits', v)} step={1000} />
        <Field label="Fill rate" kind="pct" value={inputs.fillRate} onChange={(v) => set('fillRate', v)} />
      </Section>

      <Section title="Cost stack (per unit)">
        {(
          [
            ['cogs', 'COGS'],
            ['packaging', 'Packaging'],
            ['coman', 'Co-manufacturing'],
            ['inbound', 'Inbound freight'],
            ['outbound', 'Outbound freight'],
            ['duty', 'Duty / tariffs'],
            ['warehousing', 'Warehousing'],
            ['compliance', 'Compliance'],
            ['returns', 'Returns / spoilage'],
            ['other', 'Other variable'],
          ] as [keyof Inputs['cost'], string][]
        ).map(([k, label]) => (
          <Field key={k} label={label} kind="money" value={inputs.cost[k]} onChange={(v) => setCost(k, v)} />
        ))}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs font-bold text-slate-700">
          <span>= Variable cost / unit</span>
          <span className="tabular-nums">{usd2(vcpu)}</span>
        </div>
        <Field label="Broker fee (% gross)" kind="pct" value={inputs.brokerPct} onChange={(v) => set('brokerPct', v)} />
        <Field label="Distributor fee (% gross)" kind="pct" value={inputs.distributorPct} onChange={(v) => set('distributorPct', v)} />
      </Section>

      <Section title="Trade &amp; deductions" defaultOpen>
        <Field label="Trade / unit (on-invoice)" kind="money" value={inputs.tradePerUnit} onChange={(v) => set('tradePerUnit', v)} />
        <Field label="Trade (% of gross)" kind="pct" value={inputs.tradePctGross} onChange={(v) => set('tradePctGross', v)} />
        <Field label="Trade fixed ($/yr)" kind="money" value={inputs.tradeFixed} onChange={(v) => set('tradeFixed', v)} step={500} />
        <Field label="Other GtN deductions (% gross)" kind="pct" value={inputs.otherDedPctGross} onChange={(v) => set('otherDedPctGross', v)} />
      </Section>

      <Section title="Fixed cost &amp; channel">
        <Field label="Fixed commercial ($/yr)" kind="money" value={inputs.fixedTotal} onChange={(v) => set('fixedTotal', v)} step={1000} />
        <label className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">Business model</span>
          <select
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold"
            value={inputs.businessModel}
            onChange={(e) => set('businessModel', e.target.value as BusinessModel)}
          >
            {['Distributor', 'Direct Retailer', 'Club', 'FDM', 'Hybrid'].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <Field label="Distributor margin" kind="pct" value={inputs.distributorMargin} onChange={(v) => set('distributorMargin', v)} />
        <Field label="Retailer margin" kind="pct" value={inputs.retailerMargin} onChange={(v) => set('retailerMargin', v)} />
      </Section>

      <Section title="Governance hurdles">
        <Field label="Target gross margin" kind="pct" value={inputs.targetGM} onChange={(v) => set('targetGM', v)} />
        <Field label="Target net margin" kind="pct" value={inputs.targetNM} onChange={(v) => set('targetNM', v)} />
        <Field label="Min gross margin" kind="pct" value={inputs.minGM} onChange={(v) => set('minGM', v)} />
        <Field label="Min net margin" kind="pct" value={inputs.minNM} onChange={(v) => set('minNM', v)} />
        <Field label="Max trade (% gross)" kind="pct" value={inputs.maxTradePct} onChange={(v) => set('maxTradePct', v)} />
        <Field label="Min contribution / unit" kind="money" value={inputs.minContribUnit} onChange={(v) => set('minContribUnit', v)} />
        <Field label="Target promo ROI" value={inputs.targetROI} onChange={(v) => set('targetROI', v)} step={0.1} suffix="x" />
      </Section>
    </>
  );
}

/* --------------------------------------------------------------- Dashboard */
function Kpi({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="card p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-xl font-black tabular-nums ${tone ?? 'text-slate-800'}`}>{value}</div>
      {sub && <div className="text-[11px] font-semibold text-slate-400">{sub}</div>}
    </div>
  );
}

function toneVs(value: number, hurdle: number, higherIsBetter = true) {
  const ok = higherIsBetter ? value >= hurdle : value <= hurdle;
  return ok ? 'text-emerald-600' : 'text-rose-600';
}

function Dashboard({
  inputs,
  pnl,
  decision,
  beWholesale,
  roi,
  isPromo,
}: {
  inputs: Inputs;
  pnl: ReturnType<typeof computePnL>;
  decision: Decision;
  beWholesale: number;
  roi: number;
  isPromo: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="Gross Sales" value={usd0(pnl.gross)} />
        <Kpi label="Net Sales" value={usd0(pnl.net)} />
        <Kpi label="Gross Margin" value={pct1(pnl.gm)} tone={toneVs(pnl.gm, inputs.minGM)} sub={`hurdle ${pct1(inputs.minGM)}`} />
        <Kpi label="Net Margin" value={pct1(pnl.nm)} tone={toneVs(pnl.nm, inputs.minNM)} sub={`hurdle ${pct1(inputs.minNM)}`} />
        <Kpi label="Contribution" value={usd0(pnl.contrib)} sub={pct1(pnl.cm) + ' of net'} />
        <Kpi label="Net Profit" value={usd0(pnl.np)} tone={pnl.np >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
        <Kpi label="Trade % of Gross" value={pct1(pnl.tradePctG)} tone={toneVs(pnl.tradePctG, inputs.maxTradePct, false)} sub={`max ${pct1(inputs.maxTradePct)}`} />
        <Kpi label="Profit / Unit" value={usd2(pnl.ppu)} />
        <Kpi label="Contribution / Unit" value={usd2(pnl.cpu)} tone={toneVs(pnl.cpu, inputs.minContribUnit)} />
        <Kpi label="Net Realized Price" value={usd2(pnl.nrpUnit)} sub="per unit" />
        <Kpi label="Break-even Units" value={pnl.beUnits == null ? 'n/a' : num0(pnl.beUnits)} />
        <Kpi label="Trade Efficiency" value={x2(pnl.tradeEff)} sub="$NP / $trade" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">Gross-to-Net Waterfall</h3>
          <Waterfall pnl={pnl} />
        </div>
        <div className="space-y-4">
          <DecisionRationale inputs={inputs} pnl={pnl} decision={decision} roi={roi} isPromo={isPromo} />
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-700">Targets &amp; Break-even</h3>
            <Row label="Break-even wholesale price (to hit target NM)" value={usd2(beWholesale)} note={`current ${usd2(pnl.price)}`} />
            <Row label="Wholesale price for target gross margin" value={usd2(vcPerUnit(inputs) / (1 - inputs.targetGM - inputs.brokerPct - inputs.distributorPct))} />
            <Row label="Retail shelf price (implied)" value={usd2(pnl.retailShelf)} note={`retailer ${pct1(pnl.retailerMarginPct)}`} />
            <Row label="Distributor margin" value={pct1(pnl.distributorMarginPct)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-50 py-1.5 last:border-0">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="flex items-baseline gap-2">
        {note && <span className="text-[11px] text-slate-400">{note}</span>}
        <span className="text-sm font-bold tabular-nums text-slate-800">{value}</span>
      </span>
    </div>
  );
}

function DecisionRationale({
  inputs,
  pnl,
  decision,
  roi,
  isPromo,
}: {
  inputs: Inputs;
  pnl: ReturnType<typeof computePnL>;
  decision: Decision;
  roi: number;
  isPromo: boolean;
}) {
  const checks: { label: string; ok: boolean; detail: string }[] = [
    { label: 'Gross margin ≥ minimum', ok: pnl.gm >= inputs.minGM, detail: `${pct1(pnl.gm)} vs ${pct1(inputs.minGM)}` },
    { label: 'Net margin ≥ minimum', ok: pnl.nm >= inputs.minNM, detail: `${pct1(pnl.nm)} vs ${pct1(inputs.minNM)}` },
    { label: 'Contribution / unit ≥ minimum', ok: pnl.cpu >= inputs.minContribUnit, detail: `${usd2(pnl.cpu)} vs ${usd2(inputs.minContribUnit)}` },
    { label: 'Trade % ≤ maximum', ok: pnl.tradePctG <= inputs.maxTradePct, detail: `${pct1(pnl.tradePctG)} vs ${pct1(inputs.maxTradePct)}` },
  ];
  if (isPromo) checks.push({ label: 'Promo ROI ≥ hurdle', ok: roi >= inputs.targetROI, detail: `${x2(roi)} vs ${x2(inputs.targetROI)}` });

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Recommendation</h3>
        <span className={`chip !px-3 !py-1 !text-sm ${DEC_STYLE[decision]}`}>{decision}</span>
      </div>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 font-semibold text-slate-600">
              <span className={c.ok ? 'text-emerald-500' : 'text-rose-500'}>{c.ok ? '✓' : '✕'}</span>
              {c.label}
            </span>
            <span className={`tabular-nums font-bold ${c.ok ? 'text-slate-500' : 'text-rose-600'}`}>{c.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- Waterfall */
function Waterfall({ pnl }: { pnl: ReturnType<typeof computePnL> }) {
  const steps: { label: string; amount: number; kind: 'start' | 'delta' | 'total' }[] = [
    { label: 'Gross', amount: pnl.gross, kind: 'start' },
    { label: 'Trade', amount: -pnl.trade, kind: 'delta' },
    { label: 'Other GtN', amount: -pnl.otherDed, kind: 'delta' },
    { label: 'Net Sales', amount: pnl.net, kind: 'total' },
    { label: 'Var. Cost', amount: -pnl.vcost, kind: 'delta' },
    { label: 'Contribution', amount: pnl.contrib, kind: 'total' },
    { label: 'Fixed', amount: -inputsFixed(pnl), kind: 'delta' },
    { label: 'Net Profit', amount: pnl.np, kind: 'total' },
  ];
  const W = 520;
  const H = 240;
  const padB = 44;
  const padT = 10;
  const max = Math.max(pnl.gross, 1);
  const bw = (W / steps.length) * 0.62;
  const gap = W / steps.length;
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  let running = 0;
  const bars = steps.map((s, i) => {
    let lo: number;
    let hi: number;
    if (s.kind === 'delta') {
      hi = running;
      running += s.amount;
      lo = running;
    } else {
      running = s.amount;
      lo = 0;
      hi = s.amount;
    }
    const top = Math.max(lo, hi);
    const bot = Math.min(lo, hi);
    const color =
      s.kind === 'delta' ? (s.amount < 0 ? '#f43f5e' : '#10b981') : s.label === 'Net Profit' ? (s.amount >= 0 ? '#4f46e5' : '#f43f5e') : '#64748b';
    return { s, i, x: gap * i + (gap - bw) / 2, yTop: y(top), h: Math.max(1, y(bot) - y(top)), color, mid: (top + bot) / 2 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {bars.map((b) => (
        <g key={b.i}>
          <rect x={b.x} y={b.yTop} width={bw} height={b.h} rx={2} fill={b.color} />
          <text x={b.x + bw / 2} y={b.yTop - 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">
            {shortUsd(b.s.amount)}
          </text>
          <text x={b.x + bw / 2} y={H - padB + 14} textAnchor="middle" fontSize="9" fontWeight="700" fill="#64748b">
            {b.s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
function inputsFixed(pnl: ReturnType<typeof computePnL>) {
  return pnl.contrib - pnl.np;
}
function shortUsd(n: number) {
  const a = Math.abs(n);
  const s = a >= 1000 ? '$' + (a / 1000).toFixed(0) + 'k' : '$' + a.toFixed(0);
  return (n < 0 ? '-' : '') + s;
}

/* --------------------------------------------------------------- Scenarios */
function ScenariosTab({
  results,
  activeKey,
  onPick,
}: {
  results: ReturnType<typeof evaluateAll>;
  activeKey: string;
  onPick: (k: string) => void;
}) {
  const npValues = results.map((r) => r.pnl.np);
  const best = Math.max(...npValues);
  const worst = Math.min(...npValues);
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2 font-bold">Scenario</th>
            <th className="px-3 py-2 text-right font-bold">Gross</th>
            <th className="px-3 py-2 text-right font-bold">Net</th>
            <th className="px-3 py-2 text-right font-bold">GM%</th>
            <th className="px-3 py-2 text-right font-bold">NM%</th>
            <th className="px-3 py-2 text-right font-bold">Trade%</th>
            <th className="px-3 py-2 text-right font-bold">Net Profit</th>
            <th className="px-3 py-2 text-right font-bold">ROI</th>
            <th className="px-3 py-2 text-center font-bold">Decision</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr
              key={r.def.key}
              onClick={() => onPick(r.def.key)}
              className={`cursor-pointer border-b border-slate-50 hover:bg-slate-50 ${r.def.key === activeKey ? 'bg-indigo-50' : ''}`}
            >
              <td className="px-3 py-2 font-bold text-slate-700">
                {r.def.name}
                {r.pnl.np === best && <span className="ml-1 text-emerald-500" title="best net profit">▲</span>}
                {r.pnl.np === worst && <span className="ml-1 text-rose-500" title="worst net profit">▼</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{usd0(r.pnl.gross)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{usd0(r.pnl.net)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{pct1(r.pnl.gm)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{pct1(r.pnl.nm)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{pct1(r.pnl.tradePctG)}</td>
              <td className={`px-3 py-2 text-right font-bold tabular-nums ${r.pnl.np >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{usd0(r.pnl.np)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.def.m.promo === 1 ? x2(r.roi) : '—'}</td>
              <td className="px-3 py-2 text-center">
                <span className={`chip ${DEC_SOFT[r.decision]}`}>{r.decision}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------- Promotions */
function PromotionsTab({ inputs, base }: { inputs: Inputs; base: ReturnType<typeof computePnL> }) {
  const rows = DEFAULT_TACTICS.map((t) => evaluateTactic(inputs, base, t));
  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalIncrNP = rows.reduce((s, r) => s + r.incrNP, 0);
  const stackRoi = totalSpend === 0 ? 0 : totalIncrNP / totalSpend;
  const stackVerdict: Decision = totalIncrNP < 0 ? 'STOP' : stackRoi >= inputs.targetROI ? 'GO' : 'REVIEW';
  return (
    <div className="space-y-3">
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2 font-bold">Tactic</th>
              <th className="px-3 py-2 text-right font-bold">Spend</th>
              <th className="px-3 py-2 text-right font-bold">Lift%</th>
              <th className="px-3 py-2 text-right font-bold">True incr. units</th>
              <th className="px-3 py-2 text-right font-bold">Incr. contribution</th>
              <th className="px-3 py-2 text-right font-bold">Incr. net profit</th>
              <th className="px-3 py-2 text-right font-bold">ROI</th>
              <th className="px-3 py-2 text-center font-bold">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-slate-50">
                <td className="px-3 py-2 font-bold text-slate-700">{r.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{usd0(r.spend)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{pct1(r.liftPct)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{num0(r.trueIncr)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{usd0(r.incrContrib)}</td>
                <td className={`px-3 py-2 text-right font-bold tabular-nums ${r.incrNP >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{usd0(r.incrNP)}</td>
                <td className={`px-3 py-2 text-right font-bold tabular-nums ${r.roi >= inputs.targetROI ? 'text-emerald-600' : 'text-rose-600'}`}>{x2(r.roi)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`chip ${DEC_SOFT[r.verdict]}`}>{r.verdict}</span>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold">
              <td className="px-3 py-2 text-slate-700">Combined stack</td>
              <td className="px-3 py-2 text-right tabular-nums">{usd0(totalSpend)}</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
              <td className={`px-3 py-2 text-right tabular-nums ${totalIncrNP >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{usd0(totalIncrNP)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{x2(stackRoi)}</td>
              <td className="px-3 py-2 text-center">
                <span className={`chip ${DEC_SOFT[stackVerdict]}`}>{stackVerdict}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="px-1 text-xs text-slate-400">
        Each tactic is judged on <strong>true incremental net profit</strong> (lift net of cannibalization × contribution/unit − spend), not
        gross sales lift. ROI below the {x2(inputs.targetROI)} hurdle or negative incremental profit is flagged.
      </p>
    </div>
  );
}
