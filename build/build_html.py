"""Build MUV_RTD_Forecast_Dashboard_v1.html.

The dashboard's CONFIG is exported straight from muv_config (single source of truth),
and the JS engine mirrors muv_config.compute() line-for-line, so HTML totals match the
Excel totals within rounding. Charts via Chart.js (CDN); no backend, no storage APIs.
"""
import json
import muv_config as C

OUT = "../MUV_RTD_Forecast_Dashboard_v1.html"

export = {
    "settings": {
        "fiscal_start": C.SETTINGS["fiscal_start"].isoformat(),
        "n_weeks": C.SETTINGS["n_weeks"],
        "gross_basis": C.SETTINGS["gross_basis"],
        "target_revenue": C.SETTINGS["target_revenue"],
        "calib_scalar": C.SETTINGS["calib_scalar"],
        "velocity_uplift": C.SETTINGS["velocity_uplift"],
        "ramp_speed": C.SETTINGS["ramp_speed"],
        "price_index": C.SETTINGS["price_index"],
        "season_amp": C.SETTINGS["season_amp"],
        "online_growth": C.SETTINGS["online_growth"],
    },
    "flavours": C.FLAVOURS,
    "formats": C.FORMATS,
    "skus": C.SKUS,
    "channels": C.CHANNELS,
    "tiers": C.TIERS,
    "provinces": C.PROVINCES,
    "provinceSplit": C.PROVINCE_SPLIT,
    "baseCp": C.BASE_CP,
    "onlineUnits": C.ONLINE_UNITS,
    "seasonality": C.SEASONALITY,
    "scenarios": C.SCENARIOS,
}

ENGINE_JS = "const CONFIG = " + json.dumps(export, indent=2) + ";\n" + r"""
// ---- engine: mirrors muv_config.compute() exactly ----
function rampFactor(week, launch, weeksToFull, shape, rampSpeed){
  if(week < launch) return 0;
  let x = (week - launch + 1) * rampSpeed / weeksToFull;
  x = Math.min(1, Math.max(0, x));
  return shape === "S-curve" ? x*x*(3-2*x) : x;
}
function channelDoorvel(name){
  return CONFIG.tiers.filter(t => t.channel === name)
                     .reduce((s,t) => s + t.doors * t.velocity, 0);
}
function flavShare(name){ const f = CONFIG.flavours.find(f => f.name === name); return f ? f.share : 0; }
function cogsFor(flav,fmt){ const s = CONFIG.skus.find(s => s.flavour===flav && s.format===fmt); return s ? s.cogs_per_case : 0; }
function skuPriceIndex(flav,fmt){ const s = CONFIG.skus.find(s => s.flavour===flav && s.format===fmt); return s ? s.price_index : 1; }

function compute(o){
  o = o || {};
  const S = CONFIG.settings;
  const nW    = o.n_weeks        != null ? o.n_weeks        : S.n_weeks;
  const calib = o.calib_scalar   != null ? o.calib_scalar   : S.calib_scalar;
  const vup   = 1 + (o.velocity_uplift != null ? o.velocity_uplift : S.velocity_uplift);
  const pidx  = 1 + (o.price_index     != null ? o.price_index     : S.price_index);
  const samp  = o.season_amp     != null ? o.season_amp     : S.season_amp;
  const ogrow = 1 + (o.online_growth   != null ? o.online_growth   : S.online_growth);
  const rspd  = o.ramp_speed     != null ? o.ramp_speed     : S.ramp_speed;
  const basis = o.gross_basis    || S.gross_basis;
  const fstart = new Date(S.fiscal_start + "T00:00:00Z");

  const R = { gross:0, wholesale:0, sellthrough:0, cogs:0, cases:0, cans:0, consumerUnits:0,
              byChannel:{}, byProvince:{}, byFlavour:{}, byFlavourCases:{}, bySku:{},
              byChannelCases:{}, byProvinceCases:{}, bySkuCases:{}, byMonthCases:{},
              byWeek:new Array(nW).fill(0), byMonth:{}, byQuarter:{} };
  CONFIG.channels.forEach(c => { R.byChannel[c.name] = 0; R.byChannelCases[c.name] = 0; });
  CONFIG.provinces.forEach(p => { R.byProvince[p.code] = 0; R.byProvinceCases[p.code] = 0; });
  CONFIG.flavours.forEach(f => { R.byFlavour[f.name] = 0; R.byFlavourCases[f.name] = 0; });
  CONFIG.skus.forEach(s => { R.bySku[s.flavour + " " + s.format] = 0; R.bySkuCases[s.flavour + " " + s.format] = 0; });

  for(let w=1; w<=nW; w++){
    const d = new Date(fstart.getTime() + (w-1)*7*86400000);
    const month = d.toLocaleString('en-US',{month:'short', year:'numeric', timeZone:'UTC'});
    const qtr = "Q" + (Math.floor((w-1)/13) + 1);
    const season = 1 + (CONFIG.seasonality[w-1] - 1) * samp;
    for(const c of CONFIG.channels){
      const fmt = c.format;
      const ramp = rampFactor(w, c.launch, c.weeks_to_full, c.ramp, rspd);
      for(const p of CONFIG.provinces){
        const psplit = (CONFIG.provinceSplit[c.name][p.code] || 0) / 100;
        let cases;
        if(c.name === "Online"){
          let units = CONFIG.onlineUnits[w-1] * psplit * ogrow * season;
          if(w < c.launch) units = 0;
          cases = units * CONFIG.formats["12-pack"].cans_per_pack / 24;
        } else {
          const doorvel = channelDoorvel(c.name) * calib * vup;
          cases = doorvel * psplit * ramp * season;
        }
        if(cases <= 0) continue;
        const cans = cases * 24;
        const consumer = cans / CONFIG.formats[fmt].cans_per_pack;
        let rowWhole=0, rowSell=0, rowCogs=0;
        for(const f of CONFIG.flavours){
          const fcases = cases * f.share;
          let fWhole, fSell;
          if(c.name === "Online"){
            const funits = fcases * 24 / CONFIG.formats["12-pack"].cans_per_pack;
            const oprice = p.online_price * pidx * skuPriceIndex(f.name, fmt);
            fWhole = funits * oprice; fSell = fWhole;
          } else {
            const cp = CONFIG.baseCp[c.name] * (1 + p.modifier) * pidx * skuPriceIndex(f.name, fmt);
            fWhole = fcases * cp;
            const fconsumer = fcases * 24 / CONFIG.formats[fmt].cans_per_pack;
            fSell = fconsumer * p.srp_4pack * pidx;
          }
          const fcogs = fcases * cogsFor(f.name, fmt);
          rowWhole += fWhole; rowSell += fSell; rowCogs += fcogs;
          const fGross = basis === "Wholesale" ? fWhole : fSell;
          R.byFlavour[f.name] += fGross;
          R.byFlavourCases[f.name] += fcases;
          R.bySku[f.name + " " + fmt] += fGross;
          R.bySkuCases[f.name + " " + fmt] += fcases;
        }
        const gross = basis === "Wholesale" ? rowWhole : rowSell;
        R.gross += gross; R.wholesale += rowWhole; R.sellthrough += rowSell; R.cogs += rowCogs;
        R.cases += cases; R.cans += cans; R.consumerUnits += consumer;
        R.byChannel[c.name] += gross;
        R.byProvince[p.code] += gross;
        R.byChannelCases[c.name] += cases;
        R.byProvinceCases[p.code] += cases;
        R.byWeek[w-1] += gross;
        R.byMonth[month] = (R.byMonth[month] || 0) + gross;
        R.byMonthCases[month] = (R.byMonthCases[month] || 0) + cases;
        R.byQuarter[qtr] = (R.byQuarter[qtr] || 0) + gross;
      }
    }
  }
  R.margin = R.gross - R.cogs;
  R.marginPct = R.gross ? R.margin / R.gross : 0;
  R.avgWeekly = nW ? R.gross / nW : 0;
  R.nWeeks = nW;
  R.target = CONFIG.settings.target_revenue;
  R.gap = R.gross - R.target;
  R.pctToGoal = R.gross / R.target;
  // cumulative
  R.cumulative = []; let run = 0;
  for(let i=0;i<R.byWeek.length;i++){ run += R.byWeek[i]; R.cumulative.push(run); }
  return R;
}
// physical vs online split (selected basis) at the given settings
function components(o){ const R = compute(o); const on = R.byChannel["Online"]; return {gross:R.gross, online:on, physical:R.gross - on}; }
// the single value each lever must reach to hit `target`, holding the others
function requiredLever(target, o){
  o = o || {}; const c = components(o);
  const g = c.gross, on = c.online, ph = c.physical;
  const cur = k => (o[k] != null ? o[k] : CONFIG.settings[k]);
  return {
    price_index:     g  ? (target / g) * (1 + cur("price_index")) - 1        : null,
    velocity_uplift: ph ? (target - on) / ph * (1 + cur("velocity_uplift")) - 1 : null,
    online_growth:   on ? (target - ph) / on * (1 + cur("online_growth")) - 1 : null,
  };
}
if (typeof module !== 'undefined') { module.exports = { compute, components, requiredLever, CONFIG }; }
"""

CSS = r"""
:root{
  --bg:#f5f5f7; --card:#ffffff; --ink:#1d1d1f; --ink2:#6e6e73; --line:#e7e7ee;
  --teal:#0aa59a; --green:#34c759; --amber:#ff9f0a; --blue:#0a84ff;
  --rose:#ff6482; --accentA:#0bb3a3; --accentB:#34c759;
  --shadow:0 1px 2px rgba(0,0,0,.04),0 10px 28px rgba(20,20,40,.06);
  --radius:22px;
}
*{box-sizing:border-box} html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;letter-spacing:-.01em}
.wrap{max-width:1120px;margin:0 auto;padding:18px 20px 80px}
.muted{color:var(--ink2)}
h2{font-size:21px;font-weight:700;letter-spacing:-.5px;margin:0}

/* top bar */
header.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:6px 2px 22px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:12px}
.logo{font-weight:800;font-size:18px;color:#fff;background:linear-gradient(135deg,var(--accentA),var(--accentB));
  width:46px;height:46px;border-radius:13px;display:grid;place-items:center;box-shadow:var(--shadow);letter-spacing:-.5px}
.brand strong{font-size:17px;font-weight:700;display:block;line-height:1.15}
.brand .bt span{font-size:12.5px;color:var(--ink2)}

/* segmented control */
.seg{display:inline-flex;background:#e9e9ef;border-radius:11px;padding:3px;gap:2px}
.seg button{border:0;background:transparent;color:var(--ink2);font-weight:600;font-size:13px;padding:7px 14px;border-radius:9px;cursor:pointer;transition:.18s}
.seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.13)}
.seg.small button{padding:5px 12px;font-size:12px}
.seg.wrap{display:flex;flex-wrap:wrap}
.hint{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#c7c7d0;color:#fff;font-size:11px;font-weight:700;margin-left:8px;cursor:help}

/* cards */
.card{background:var(--card);border-radius:var(--radius);padding:22px;box-shadow:var(--shadow)}
.block{margin-top:22px}
.blockHead{display:flex;align-items:baseline;justify-content:space-between;margin:0 4px 12px;gap:10px;flex-wrap:wrap}

/* hero */
.hero .heroTop{display:grid;grid-template-columns:auto 1fr;gap:30px;align-items:center}
.ring{position:relative;width:188px;height:188px;margin:auto;flex:none}
.ringCenter{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.ringNum{font-size:29px;font-weight:800;letter-spacing:-1px}
.ringNum.good{color:var(--green)}
.ringSub{font-size:12px;color:var(--ink2);margin-top:2px}
.ringPct{font-size:12px;font-weight:700;margin-top:7px;padding:2px 10px;border-radius:999px}
.status{font-size:17px;font-weight:500;letter-spacing:-.3px;margin-bottom:16px;line-height:1.4}
.status b{font-weight:750}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.tile{background:#f6f6f9;border-radius:14px;padding:13px 15px}
.tile .tl{font-size:11.5px;color:var(--ink2);font-weight:600}
.tile .tv{font-size:21px;font-weight:750;letter-spacing:-.6px;margin-top:3px}
.tile .tv.good{color:var(--green)} .tile .tv.warn{color:var(--amber)}
.tile .ts{font-size:11px;color:var(--ink2);margin-top:2px}
.heroChart{height:198px;margin-top:20px;position:relative}
.chip-good{background:rgba(52,199,89,.15);color:#1f8f43}
.chip-warn{background:rgba(255,159,10,.17);color:#b26a00}

/* gap closer */
.gapcard{margin-top:22px}
.gcHead{display:flex;align-items:center;justify-content:space-between}
.chips{display:flex;flex-wrap:wrap;gap:12px;margin-top:16px}
.chip{flex:1 1 220px;border:1px solid var(--line);border-radius:16px;padding:14px 16px;cursor:pointer;background:#fff;transition:.18s;display:flex;flex-direction:column;gap:3px}
.chip:hover{border-color:var(--teal);transform:translateY(-2px);box-shadow:var(--shadow)}
.chip .ca{font-size:11px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.5px}
.chip .cm{font-size:17px;font-weight:750;letter-spacing:-.3px}
.chip .cd{font-size:12px;color:var(--ink2)}
.link{background:none;border:0;color:var(--blue);font-weight:600;font-size:13.5px;cursor:pointer;padding:6px 2px}

/* scenarios */
.scen{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.scard{border:1.5px solid var(--line);border-radius:18px;padding:18px;cursor:pointer;background:#fff;transition:.18s}
.scard:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.scard.on{border-color:var(--teal);box-shadow:0 0 0 3px rgba(10,165,154,.13)}
.scard .sn{font-size:13px;font-weight:700;color:var(--ink2);display:flex;align-items:center;gap:8px}
.scard .sv{font-size:27px;font-weight:800;letter-spacing:-1px;margin-top:8px}
.scard .sp{font-size:12.5px;margin-top:4px;font-weight:600}
.dot{width:9px;height:9px;border-radius:50%}

/* explore */
.explore{margin-top:22px}
.exHead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
#viewSeg{margin-bottom:18px}
.exBody{display:grid;grid-template-columns:1.45fr 1fr;gap:24px;align-items:center}
.exChart{height:322px;position:relative}
.exList{display:flex;flex-direction:column;gap:9px;max-height:322px;overflow:auto}
.exRow{display:flex;align-items:center;gap:10px;font-size:13px}
.exRow .sw{width:10px;height:10px;border-radius:3px;flex:none}
.exRow .nm{flex:1;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.exRow .vl{font-weight:700;font-variant-numeric:tabular-nums}
.exRow .pc{color:var(--ink2);font-size:11.5px;width:44px;text-align:right}

/* advanced */
details.adv{margin-top:22px}
details.adv summary{cursor:pointer;font-weight:700;font-size:15px;list-style:none;display:flex;align-items:center;gap:8px}
details.adv summary::-webkit-details-marker{display:none}
details.adv summary::before{content:"›";font-size:20px;transition:.2s;color:var(--ink2)}
details.adv[open] summary::before{transform:rotate(90deg)}
.sliders{display:grid;grid-template-columns:repeat(2,1fr);gap:18px 30px;margin-top:18px}
.slider .top{display:flex;justify-content:space-between;align-items:baseline}
.slider .name{font-weight:600;font-size:13.5px}
.slider .v{font-weight:700;font-size:13px;color:var(--teal);font-variant-numeric:tabular-nums}
.slider .help{font-size:11.5px;color:var(--ink2);margin:2px 0 8px}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:999px;background:#e2e2e8;outline:none}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;border:1px solid #d0d0d8;box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer}
input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#fff;border:1px solid #d0d0d8;cursor:pointer}
.advRow{display:flex;align-items:center;justify-content:space-between;margin-top:20px;gap:12px;flex-wrap:wrap}
select{font:inherit;padding:6px 10px;border-radius:9px;border:1px solid var(--line);background:#fff;color:var(--ink)}

.legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;font-size:11.5px;color:var(--ink2)}
.legend i{display:inline-block;width:16px;height:0;border-top:3px solid;border-radius:2px;margin-right:6px;vertical-align:middle}
.cap{font-size:11.5px;color:var(--ink2);margin-top:6px}
.exNote{font-size:12.5px;color:var(--ink2);margin:0 0 14px}
.foot{color:var(--ink2);font-size:12px;line-height:1.65;margin-top:28px;padding:0 4px}
.foot b{color:var(--ink)}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.hero,.gapcard,.block,.explore,.adv{animation:rise .55s cubic-bezier(.2,.7,.2,1) both}
.gapcard{animation-delay:.05s}.block{animation-delay:.1s}.explore{animation-delay:.15s}.adv{animation-delay:.2s}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media(max-width:840px){
  .hero .heroTop{grid-template-columns:1fr;gap:22px}
  .scen{grid-template-columns:1fr}
  .exBody{grid-template-columns:1fr}
  .sliders{grid-template-columns:1fr}
}
"""

UI_JS = r"""
const TARGET = CONFIG.settings.target_revenue;
const fmt$  = v => "$" + Math.round(v).toLocaleString('en-US');
const fmtM  = v => Math.abs(v)>=1e6 ? "$"+(v/1e6).toFixed(2)+"M" : Math.abs(v)>=1e3 ? "$"+Math.round(v/1e3)+"k" : "$"+Math.round(v);
const fmtN  = v => Math.round(v).toLocaleString('en-US');
const pctS  = v => (v*100).toFixed(1)+"%";
const sgnP  = v => (v>=0?"+":"")+(v*100).toFixed(1)+"%";
const PALETTE = ['#0a84ff','#0aa59a','#34c759','#7d6bff','#ff9f0a','#ff6482','#30c0c6','#a368ff','#5e9bff','#ffb340'];

const DEF = { gross_basis: CONFIG.settings.gross_basis, velocity_uplift:0, ramp_speed:1,
              price_index:0, season_amp:1, online_growth:0, n_weeks: CONFIG.settings.n_weeks };
let state = Object.assign({}, DEF);
let explore = { view:'channel', metric:'rev' };
const LEVERS = ['velocity_uplift','ramp_speed','price_index','season_amp','online_growth'];

Chart.defaults.font.family = "-apple-system,'SF Pro Text','Inter',system-ui,sans-serif";
Chart.defaults.color = '#6e6e73';
Chart.defaults.font.size = 12;

// ---- count-up animation (cancels any in-flight tween on the same element) ----
const _from = {}, _raf = {};
function animateNum(el, to, fmt){
  const id = el.id; const from = _from[id]!=null ? _from[id] : 0; _from[id]=to;
  if(_raf[id]) cancelAnimationFrame(_raf[id]);
  const t0 = performance.now(), dur=550;
  (function step(t){ const k=Math.min(1,(t-t0)/dur); const e=1-Math.pow(1-k,3);
    el.textContent = fmt(from+(to-from)*e);
    if(k<1) _raf[id]=requestAnimationFrame(step); })(t0);
}

// ---- hero cumulative chart (built once, updated live) ----
let cumChart=null, exChart=null, exKey='';
function buildCum(){
  cumChart = new Chart(document.getElementById('c_cum'), {type:'line', data:{labels:[],datasets:[]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:'index'},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmt$(c.raw)}}},
      scales:{y:{ticks:{callback:v=>fmtM(v)},grid:{color:'#eee'},border:{display:false}},
              x:{grid:{display:false},ticks:{maxTicksLimit:9,autoSkip:true},border:{display:false}}}}});
}
function renderCum(R){
  const labels = R.byWeek.map((_,i)=>'W'+(i+1));
  const ctx = document.getElementById('c_cum').getContext('2d');
  const grad = ctx.createLinearGradient(0,0,0,200);
  grad.addColorStop(0,'rgba(10,165,154,.22)'); grad.addColorStop(1,'rgba(10,165,154,0)');
  cumChart.data.labels = labels;
  cumChart.data.datasets = [
    {label:'Cumulative', data:R.cumulative, borderColor:'#0aa59a', backgroundColor:grad, fill:true, tension:.3, pointRadius:0, borderWidth:3},
    {label:'$3M goal', data:labels.map(()=>TARGET), borderColor:'#ff6482', borderDash:[5,5], pointRadius:0, borderWidth:1.5},
    {label:'On-pace line', data:R.byWeek.map((_,i)=>TARGET*(i+1)/R.nWeeks), borderColor:'#cfcfd6', borderDash:[2,4], pointRadius:0, borderWidth:1.2}
  ];
  cumChart.update();
}

function render(){
  const R = compute(state);
  const win = R.gross >= TARGET;
  // goal ring
  const arc = document.getElementById('ringArc'), C = 2*Math.PI*80;
  arc.style.strokeDashoffset = C * (1 - Math.max(0, Math.min(1, R.pctToGoal)));
  arc.style.stroke = win ? '#34c759' : 'url(#ringGrad)';
  const big = document.getElementById('goalBig'); big.className = 'ringNum'+(win?' good':'');
  animateNum(big, R.gross, fmt$);
  const pill = document.getElementById('goalPill'); pill.textContent = pctS(R.pctToGoal);
  pill.className = 'ringPct '+(win?'chip-good':'chip-warn');
  document.getElementById('statusLine').innerHTML = win
    ? `On pace to <b>beat the goal</b> — <b>${fmt$(R.gross)}</b>, ${fmt$(R.gap)} above $3M.`
    : `On pace for <b>${fmt$(R.gross)}</b> by end of August — <b>${pctS(R.pctToGoal)}</b> of the way to $3M.`;
  // tiles
  const gapEl = document.getElementById('k_gap'); gapEl.className = 'tv '+(win?'good':'warn');
  animateNum(gapEl, Math.abs(R.gap), v => (R.gap>=0?'+':'–')+fmt$(v));
  document.getElementById('k_gap_sub').textContent = win?'ahead of target':'left to reach $3M';
  animateNum(document.getElementById('k_vol'), R.cases, v=>fmtN(v)+' cases');
  document.getElementById('k_vol_sub').textContent = fmtN(R.cans)+' cans';
  animateNum(document.getElementById('k_avg'), R.avgWeekly, fmt$);
  document.getElementById('k_avg_sub').textContent = 'over '+R.nWeeks+' weeks';
  animateNum(document.getElementById('k_margin'), R.marginPct*100, v=>v.toFixed(1)+'%');
  document.getElementById('k_margin_sub').textContent = fmt$(R.margin)+' margin';
  renderCum(R); renderGap(R); renderScenarios(); renderExplore(R); syncControls();
}

// ---- close the gap ----
function renderGap(R){
  const title=document.getElementById('gapTitle'), sub=document.getElementById('gapSub'),
        host=document.getElementById('gapChips'), undo=document.getElementById('gcReset');
  undo.style.display = isCustom() ? '' : 'none';
  host.innerHTML='';
  if(R.gross>=TARGET){
    title.textContent='🎉 Goal reached';
    sub.textContent='You’re at '+pctS(R.pctToGoal)+' of $3M — '+fmt$(R.gap)+' of headroom. Try a tougher case below.';
    return;
  }
  title.textContent='Close the '+fmt$(-R.gap)+' gap';
  sub.textContent='Any one of these moves alone gets you to $3,000,000. Tap to apply it.';
  const req = requiredLever(TARGET, state);
  [{k:'price_index',ca:'Pricing',verb:'Raise price'},
   {k:'velocity_uplift',ca:'Velocity',verb:'Sell faster'},
   {k:'online_growth',ca:'Online',verb:'Grow online'}].forEach(o=>{
    if(req[o.k]==null) return;
    const el=document.createElement('div'); el.className='chip';
    el.innerHTML='<div class="ca">'+o.ca+'</div><div class="cm">'+o.verb+' '+sgnP(req[o.k]-state[o.k])+'</div>'+
                 '<div class="cd">sets the dial to '+sgnP(req[o.k])+'</div>';
    el.onclick=()=>{ state[o.k]=req[o.k]; render(); };
    host.appendChild(el);
  });
}

// ---- scenarios ----
function renderScenarios(){
  const host=document.getElementById('scenCards'); host.innerHTML='';
  Object.keys(CONFIG.scenarios).forEach(nm=>{
    const lev=CONFIG.scenarios[nm];
    const g=compute(Object.assign({gross_basis:state.gross_basis,n_weeks:state.n_weeks},lev)).gross;
    const win=g>=TARGET, sel=matchesScenario(lev);
    const dot=win?'#34c759':(nm==='Bear'?'#ff6482':'#ff9f0a');
    const el=document.createElement('div'); el.className='scard'+(sel?' on':'');
    el.innerHTML='<div class="sn"><span class="dot" style="background:'+dot+'"></span>'+nm+(nm==='Base'?' · current plan':'')+'</div>'+
      '<div class="sv">'+fmtM(g)+'</div>'+
      '<div class="sp" style="color:'+(win?'#1f8f43':'#b26a00')+'">'+pctS(g/TARGET)+' of goal</div>';
    el.onclick=()=>{ Object.assign(state,lev); render(); };
    host.appendChild(el);
  });
}

// ---- explore ----
const EX_NOTES={channel:'Annual gross by sales channel — toggle Revenue / Volume.',
  province:'Annual gross by province — toggle Revenue / Volume.',
  flavour:'Annual gross by flavour — toggle Revenue / Volume.',
  sku:'Annual gross by SKU (flavour × pack) — toggle Revenue / Volume.',
  month:'Annual gross by calendar month — toggle Revenue / Volume.',
  sensitivity:'How far annual gross swings if each driver moves ± its range. Longest bar = biggest lever.'};
function renderExplore(R){
  document.getElementById('metricSeg').style.visibility = explore.view==='sensitivity'?'hidden':'visible';
  document.getElementById('exNote').textContent = EX_NOTES[explore.view];
  const isVol = explore.metric==='vol' && explore.view!=='sensitivity';
  let rows, isFloat=false;
  if(explore.view==='sensitivity'){ rows=tornado(); isFloat=true; }
  else{
    const map={channel:isVol?R.byChannelCases:R.byChannel, province:isVol?R.byProvinceCases:R.byProvince,
      flavour:isVol?R.byFlavourCases:R.byFlavour, sku:isVol?R.bySkuCases:R.bySku, month:isVol?R.byMonthCases:R.byMonth};
    const obj=map[explore.view];
    rows=Object.keys(obj).map(k=>({label:k,value:obj[k]})).filter(r=>r.value>0);
    if(explore.view!=='month') rows.sort((a,b)=>b.value-a.value);
  }
  drawExplore(rows,isVol,isFloat); drawList(rows,isVol,isFloat);
}
function tornado(){
  const base=compute(state).gross;
  return [{k:'online_growth',n:'Online growth',d:0.40},{k:'velocity_uplift',n:'Velocity',d:0.15},
          {k:'price_index',n:'Price',d:0.05},{k:'ramp_speed',n:'Ramp speed',d:0.25},{k:'season_amp',n:'Seasonality',d:0.25}]
    .map(L=>{ const lo=compute(Object.assign({},state,{[L.k]:state[L.k]-L.d})).gross;
              const hi=compute(Object.assign({},state,{[L.k]:state[L.k]+L.d})).gross;
              return {label:L.n, lo:Math.min(lo,hi), hi:Math.max(lo,hi), value:Math.abs(hi-lo)}; })
    .sort((a,b)=>b.value-a.value);
}
function drawExplore(rows,isVol,isFloat){
  const key=explore.view+'|'+explore.metric;
  if(exChart && exKey===key){
    exChart.data.labels=rows.map(r=>r.label);
    exChart.data.datasets[0].data=isFloat?rows.map(r=>[r.lo,r.hi]):rows.map(r=>r.value);
    if(!isFloat) exChart.data.datasets[0].backgroundColor=rows.map((_,i)=>PALETTE[i%PALETTE.length]);
    exChart.update(); return;
  }
  if(exChart) exChart.destroy(); exKey=key;
  const ctx=document.getElementById('c_explore');
  const opts={indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
    scales:{x:{grid:{color:'#eee'},border:{display:false},ticks:{callback:v=>isVol?fmtN(v):fmtM(v)}},
            y:{grid:{display:false},border:{display:false}}}};
  if(isFloat){
    opts.scales.x.ticks={callback:v=>fmtM(v)};
    opts.plugins.tooltip={callbacks:{label:c=>'swing '+fmtM(c.raw[1]-c.raw[0])+'  ('+fmtM(c.raw[0])+' – '+fmtM(c.raw[1])+')'}};
    exChart=new Chart(ctx,{type:'bar',data:{labels:rows.map(r=>r.label),
      datasets:[{data:rows.map(r=>[r.lo,r.hi]),backgroundColor:'#0aa59a',borderRadius:6,barThickness:20}]},options:opts});
  }else{
    opts.plugins.tooltip={callbacks:{label:c=>isVol?fmtN(c.raw)+' cases':fmt$(c.raw)}};
    exChart=new Chart(ctx,{type:'bar',data:{labels:rows.map(r=>r.label),
      datasets:[{data:rows.map(r=>r.value),backgroundColor:rows.map((_,i)=>PALETTE[i%PALETTE.length]),borderRadius:6}]},options:opts});
  }
}
function drawList(rows,isVol,isFloat){
  const host=document.getElementById('exList'); host.innerHTML='';
  const tot=rows.reduce((a,r)=>a+r.value,0);
  rows.forEach((r,i)=>{
    const val=isFloat?'±'+fmtM(r.value/2):(isVol?fmtN(r.value)+' cs':fmt$(r.value));
    const pc=isFloat?'':pctS(r.value/tot);
    const el=document.createElement('div'); el.className='exRow';
    el.innerHTML='<span class="sw" style="background:'+PALETTE[i%PALETTE.length]+'"></span>'+
      '<span class="nm">'+r.label+'</span><span class="vl">'+val+'</span><span class="pc">'+pc+'</span>';
    host.appendChild(el);
  });
}

// ---- advanced sliders ----
const SLIDERS=[
  {id:'velocity_uplift',name:'Velocity uplift',help:'How fast each door sells',min:-20,max:50,step:1,unit:'%',scale:0.01},
  {id:'online_growth',name:'Online growth',help:'Direct 12-pack demand',min:-50,max:200,step:5,unit:'%',scale:0.01},
  {id:'price_index',name:'Price index',help:'Every price, all channels',min:-10,max:20,step:0.5,unit:'%',scale:0.01},
  {id:'ramp_speed',name:'Door ramp speed',help:'How quickly distribution builds',min:0.5,max:2,step:0.05,unit:'×',scale:1},
  {id:'season_amp',name:'Seasonality',help:'Strength of the summer peak',min:0,max:2,step:0.05,unit:'×',scale:1},
];
function fmtSliderVal(s){ return s.unit==='%' ? sgnP(state[s.id]) : state[s.id].toFixed(2)+'×'; }
function buildSliders(){
  const host=document.getElementById('sliders'); host.innerHTML='';
  SLIDERS.forEach(s=>{
    const wrap=document.createElement('div'); wrap.className='slider';
    wrap.innerHTML='<div class="top"><span class="name">'+s.name+'</span><span class="v" id="v_'+s.id+'"></span></div>'+
      '<div class="help">'+s.help+'</div><input type="range" id="r_'+s.id+'" min="'+s.min+'" max="'+s.max+'" step="'+s.step+'">';
    host.appendChild(wrap);
    wrap.querySelector('input').addEventListener('input',e=>{
      const raw=parseFloat(e.target.value); state[s.id]= s.scale===1?raw:raw*s.scale; render();
    });
  });
}
function syncControls(){
  SLIDERS.forEach(s=>{ const inp=document.getElementById('r_'+s.id);
    if(inp) inp.value = s.scale===1?state[s.id]:state[s.id]/s.scale;
    const v=document.getElementById('v_'+s.id); if(v) v.textContent=fmtSliderVal(s); });
  document.querySelectorAll('#basisSeg button').forEach(b=>b.classList.toggle('on',b.dataset.basis===state.gross_basis));
  const wk=document.getElementById('weeksSel'); if(wk) wk.value=String(state.n_weeks);
}
function isCustom(){ return LEVERS.some(k=>state[k]!==DEF[k]); }
function matchesScenario(lev){ return LEVERS.every(k=>Math.abs((state[k]||0)-(lev[k]!=null?lev[k]:DEF[k]))<1e-9); }

function wire(){
  document.querySelectorAll('#basisSeg button').forEach(b=>b.onclick=()=>{ state.gross_basis=b.dataset.basis; render(); });
  document.querySelectorAll('#metricSeg button').forEach(b=>b.onclick=()=>{ explore.metric=b.dataset.metric;
    document.querySelectorAll('#metricSeg button').forEach(x=>x.classList.toggle('on',x===b)); renderExplore(compute(state)); });
  document.querySelectorAll('#viewSeg button').forEach(b=>b.onclick=()=>{ explore.view=b.dataset.view;
    document.querySelectorAll('#viewSeg button').forEach(x=>x.classList.toggle('on',x===b)); renderExplore(compute(state)); });
  document.getElementById('weeksSel').onchange=e=>{ state.n_weeks=parseInt(e.target.value); render(); };
  document.getElementById('resetBtn').onclick=()=>{ state=Object.assign({},DEF,{gross_basis:state.gross_basis}); render(); };
  document.getElementById('gcReset').onclick=()=>{ state=Object.assign({},DEF,{gross_basis:state.gross_basis,n_weeks:state.n_weeks}); render(); };
}
window.addEventListener('DOMContentLoaded',()=>{ buildCum(); buildSliders(); wire(); render(); });
"""

HTML = """<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>MÜV — Path to $3M</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>__CSS__</style>
</head><body><div class="wrap">

<header class="top">
  <div class="brand">
    <span class="logo">MÜV</span>
    <div class="bt"><strong>Sales Forecast</strong><span>FY2027 · Canada launch · sparkling electrolyte RTD</span></div>
  </div>
  <div class="seg" id="basisSeg">
    <button data-basis="Wholesale" class="on">Wholesale</button>
    <button data-basis="Sell-through">Sell-through</button>
    <span class="hint" title="Wholesale = what retailers pay you (case price × cases) plus online direct sales. Sell-through = what shoppers pay at the shelf (retail price × units). This choice changes the goal math the most.">?</span>
  </div>
</header>

<!-- HERO -->
<section class="card hero">
  <div class="heroTop">
    <div class="ring">
      <svg width="188" height="188" viewBox="0 0 188 188" style="transform:rotate(-90deg)">
        <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0bb3a3"/><stop offset="1" stop-color="#34c759"/></linearGradient></defs>
        <circle cx="94" cy="94" r="80" fill="none" stroke="#ececf1" stroke-width="14"/>
        <circle id="ringArc" cx="94" cy="94" r="80" fill="none" stroke="url(#ringGrad)" stroke-width="14"
          stroke-linecap="round" stroke-dasharray="502.65" stroke-dashoffset="502.65"
          style="transition:stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)"/>
      </svg>
      <div class="ringCenter">
        <div class="ringNum" id="goalBig">$0</div>
        <div class="ringSub">of $3.0M goal</div>
        <div class="ringPct chip-warn" id="goalPill">0%</div>
      </div>
    </div>
    <div class="heroRight">
      <div class="status" id="statusLine"></div>
      <div class="tiles">
        <div class="tile"><div class="tl">Gap to $3M</div><div class="tv" id="k_gap">$0</div><div class="ts" id="k_gap_sub"></div></div>
        <div class="tile"><div class="tl">Volume</div><div class="tv" id="k_vol">0</div><div class="ts" id="k_vol_sub"></div></div>
        <div class="tile"><div class="tl">Avg weekly</div><div class="tv" id="k_avg">$0</div><div class="ts" id="k_avg_sub"></div></div>
        <div class="tile"><div class="tl">Gross margin</div><div class="tv" id="k_margin">0%</div><div class="ts" id="k_margin_sub"></div></div>
      </div>
    </div>
  </div>
  <div class="heroChart"><canvas id="c_cum"></canvas></div>
  <div class="legend">
    <span><i style="border-color:#0aa59a"></i>Cumulative revenue</span>
    <span><i style="border-color:#ff6482;border-top-style:dashed"></i>$3M goal</span>
    <span><i style="border-color:#cfcfd6;border-top-style:dashed"></i>On-pace line</span>
  </div>
  <div class="cap">Fiscal year: week 1 = 1 Sep 2027, running to the end of August 2028.</div>
</section>

<!-- CLOSE THE GAP -->
<section class="card gapcard">
  <div class="gcHead"><h2 id="gapTitle">Close the gap</h2><button class="link" id="gcReset" style="display:none">Undo</button></div>
  <p class="muted" id="gapSub" style="margin:6px 0 0"></p>
  <div class="chips" id="gapChips"></div>
</section>

<!-- SCENARIOS -->
<section class="block">
  <div class="blockHead"><h2>Scenarios</h2><span class="muted">Tap a planning case to apply it</span></div>
  <div class="scen" id="scenCards"></div>
</section>

<!-- EXPLORE -->
<section class="card explore">
  <div class="exHead">
    <h2>Explore the mix</h2>
    <div class="seg small" id="metricSeg"><button data-metric="rev" class="on">Revenue</button><button data-metric="vol">Volume</button></div>
  </div>
  <div class="seg wrap" id="viewSeg">
    <button data-view="channel" class="on">Channels</button>
    <button data-view="province">Provinces</button>
    <button data-view="flavour">Flavours</button>
    <button data-view="sku">SKUs</button>
    <button data-view="month">Monthly</button>
    <button data-view="sensitivity">What moves it</button>
  </div>
  <p class="exNote" id="exNote"></p>
  <div class="exBody">
    <div class="exChart"><canvas id="c_explore"></canvas></div>
    <div class="exList" id="exList"></div>
  </div>
</section>

<!-- ADVANCED -->
<details class="card adv">
  <summary>Advanced controls</summary>
  <p class="muted" style="margin:8px 0 0">Fine-tune the five big drivers — everything recomputes live, exactly like the Excel engine.</p>
  <div class="sliders" id="sliders"></div>
  <div class="advRow">
    <label class="muted" style="font-size:13px">Fiscal weeks
      <select id="weeksSel"><option value="52">52 weeks</option><option value="53">53 weeks</option></select></label>
    <button class="link" id="resetBtn">Reset all drivers</button>
  </div>
</details>

<footer class="foot">
  <b>Illustrative seed inputs</b> — replace with real numbers anytime. This dashboard runs the same engine as the Excel workbook
  (<b>MUV_RTD_Forecast_v1.xlsx</b>) and matches it to the cent. <b>Wholesale</b> = case price × cases + online direct;
  <b>Sell-through</b> = retail price × units. <b>Built to grow:</b> add a flavour, SKU, channel, province, or store tier by adding one
  entry to the config — the whole model and these visuals update automatically.
</footer>

</div>
<script>__ENGINE__</script>
<script>__UI__</script>
</body></html>
"""

html = (HTML.replace("__CSS__", CSS)
            .replace("__ENGINE__", ENGINE_JS)
            .replace("__UI__", UI_JS))
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write(html)
print(f"SAVED {OUT}  ({len(html):,} bytes)")

# also emit the engine to a node-testable file for verification
with open("/tmp/muv_engine_test.mjs", "w", encoding="utf-8") as fh:
    fh.write(ENGINE_JS + "\nconsole.log(JSON.stringify(compute({})));\n")
print("wrote /tmp/muv_engine_test.mjs")
