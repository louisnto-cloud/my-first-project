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
  --c1:#bfff4d; --c2:#1fe0c0; --c3:#3aa0ff;
  --ink:#eaf1f6; --ink2:#94a4b6; --ink3:#62707f;
  --bg:#070b11;
  --glass:linear-gradient(180deg,rgba(255,255,255,.062),rgba(255,255,255,.022));
  --glass2:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.018));
  --line:rgba(255,255,255,.09); --line2:rgba(255,255,255,.16);
  --good:#5ff0a8; --warn:#ffd27a;
  --radius:24px;
  --shadow:0 30px 60px -30px rgba(0,0,0,.85);
  --disp:'Space Grotesk','Manrope',system-ui,sans-serif;
}
*{box-sizing:border-box} html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);min-height:100vh;
  font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;letter-spacing:-.011em;
  font-variant-numeric:tabular-nums}
body::before{content:"";position:fixed;inset:-25%;z-index:-2;
  background:
    radial-gradient(36% 32% at 80% 6%, rgba(191,255,77,.12), transparent 62%),
    radial-gradient(42% 38% at 6% 14%, rgba(31,224,192,.15), transparent 62%),
    radial-gradient(48% 46% at 64% 106%, rgba(58,160,255,.13), transparent 62%);
  animation:drift 28s ease-in-out infinite alternate}
body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.038;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")}
@keyframes drift{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(0,-3%,0) scale(1.07)}}
.wrap{max-width:1140px;margin:0 auto;padding:22px 22px 90px;position:relative}
.muted{color:var(--ink2)}
h2{font-family:var(--disp);font-size:21px;font-weight:600;letter-spacing:-.4px;margin:0}

/* header */
header.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 2px 26px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:13px}
.logo{font-family:var(--disp);font-weight:700;font-size:16px;color:#06140f;letter-spacing:-.5px;
  background:linear-gradient(135deg,var(--c1),var(--c2) 52%,var(--c3));
  width:46px;height:46px;border-radius:14px;display:grid;place-items:center;
  box-shadow:0 10px 26px -8px rgba(31,224,192,.6),inset 0 1px 0 rgba(255,255,255,.5)}
.brand strong{font-family:var(--disp);font-size:17px;font-weight:600;display:block;line-height:1.15;letter-spacing:-.2px}
.brand .bt span{font-size:12.5px;color:var(--ink2)}

/* segmented */
.seg{display:inline-flex;background:rgba(255,255,255,.045);border:1px solid var(--line);border-radius:13px;padding:4px;gap:3px;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.seg button{border:0;background:transparent;color:var(--ink2);font-weight:600;font-size:13px;padding:7px 15px;border-radius:9px;cursor:pointer;
  transition:.25s cubic-bezier(.2,.7,.2,1);font-family:inherit}
.seg button:hover{color:var(--ink)}
.seg button.on{color:#06140f;background:linear-gradient(180deg,var(--c1),var(--c2));
  box-shadow:0 8px 20px -8px rgba(31,224,192,.65),inset 0 1px 0 rgba(255,255,255,.45)}
.seg.small button{padding:6px 13px;font-size:12px}
.seg.wrap{display:flex;flex-wrap:wrap}
.hint{display:inline-grid;place-items:center;width:19px;height:19px;border-radius:50%;background:rgba(255,255,255,.1);
  border:1px solid var(--line);color:var(--ink2);font-size:11px;font-weight:700;margin-left:8px;cursor:help}

/* cards */
.card{background:var(--glass);border:1px solid var(--line);border-radius:var(--radius);padding:24px;position:relative;overflow:hidden;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),var(--shadow);
  backdrop-filter:blur(22px) saturate(1.3);-webkit-backdrop-filter:blur(22px) saturate(1.3);
  transition:border-color .35s,box-shadow .35s}
.card:hover{border-color:var(--line2)}
.block{margin-top:24px}
.blockHead{display:flex;align-items:baseline;justify-content:space-between;margin:0 4px 14px;gap:10px;flex-wrap:wrap}

/* hero */
.hero::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(70% 55% at 50% -12%,rgba(31,224,192,.12),transparent 62%)}
.hero .heroTop{display:grid;grid-template-columns:auto 1fr;gap:34px;align-items:center;position:relative}
.ring{position:relative;width:210px;height:210px;margin:auto;flex:none}
#ringArc{filter:drop-shadow(0 0 9px rgba(31,224,192,.55)) drop-shadow(0 0 24px rgba(31,224,192,.22))}
.ringCenter{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.ringNum{font-family:var(--disp);font-size:31px;font-weight:600;letter-spacing:-1px;
  background:linear-gradient(120deg,var(--c1),var(--c2) 55%,var(--c3));-webkit-background-clip:text;background-clip:text;color:transparent}
.ringSub{font-size:12px;color:var(--ink2);margin-top:4px}
.ringPct{font-size:12px;font-weight:700;margin-top:10px;padding:3px 11px;border-radius:999px}
.status{font-size:17.5px;font-weight:500;letter-spacing:-.3px;margin-bottom:18px;line-height:1.45;color:var(--ink)}
.status b{font-weight:700;font-family:var(--disp)}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}
.tile{background:rgba(255,255,255,.035);border:1px solid var(--line);border-radius:16px;padding:14px 16px;transition:.3s}
.tile:hover{border-color:var(--line2);background:rgba(255,255,255,.05)}
.tile .tl{font-size:11.5px;color:var(--ink2);font-weight:600}
.tile .tv{font-family:var(--disp);font-size:22px;font-weight:600;letter-spacing:-.6px;margin-top:4px}
.tile .tv.good{color:var(--good)} .tile .tv.warn{color:var(--warn)}
.tile .ts{font-size:11px;color:var(--ink2);margin-top:3px}
.heroChart{height:208px;margin-top:22px;position:relative}
.chip-good{background:rgba(95,240,168,.15);color:var(--good);border:1px solid rgba(95,240,168,.3)}
.chip-warn{background:rgba(255,210,122,.14);color:var(--warn);border:1px solid rgba(255,210,122,.3)}

/* gap closer */
.gapcard{margin-top:24px}
.gcHead{display:flex;align-items:center;justify-content:space-between}
.chips{display:flex;flex-wrap:wrap;gap:13px;margin-top:18px}
.chip{flex:1 1 230px;border:1px solid var(--line);border-radius:18px;padding:16px 18px;cursor:pointer;
  background:var(--glass2);transition:.28s cubic-bezier(.2,.7,.2,1);display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden}
.chip::after{content:"→";position:absolute;right:16px;top:15px;color:var(--ink3);font-weight:700;transition:.28s}
.chip:hover{transform:translateY(-3px);border-color:rgba(31,224,192,.5);box-shadow:0 20px 44px -20px rgba(0,0,0,.85),0 0 0 1px rgba(31,224,192,.25)}
.chip:hover::after{color:var(--c2);transform:translateX(4px)}
.chip .ca{font-size:11px;font-weight:700;color:var(--c2);text-transform:uppercase;letter-spacing:.8px}
.chip .cm{font-family:var(--disp);font-size:18px;font-weight:600;letter-spacing:-.3px}
.chip .cd{font-size:12px;color:var(--ink2)}
.link{background:none;border:0;color:var(--c2);font-weight:600;font-size:13.5px;cursor:pointer;padding:6px 2px}

/* scenarios */
.scen{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}
.scard{border:1px solid var(--line);border-radius:20px;padding:20px;cursor:pointer;background:var(--glass2);
  transition:.28s cubic-bezier(.2,.7,.2,1);position:relative;overflow:hidden}
.scard:hover{transform:translateY(-3px);box-shadow:0 24px 52px -24px rgba(0,0,0,.85);border-color:var(--line2)}
.scard.on{border-color:rgba(31,224,192,.55);box-shadow:0 0 0 1px rgba(31,224,192,.35),0 24px 52px -24px rgba(0,0,0,.85)}
.scard.on::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(70% 90% at 50% 0,rgba(31,224,192,.13),transparent 70%)}
.scard .sn{font-size:13px;font-weight:700;color:var(--ink2);display:flex;align-items:center;gap:8px;position:relative}
.scard .sv{font-family:var(--disp);font-size:30px;font-weight:600;letter-spacing:-1px;margin-top:10px;position:relative}
.scard .sp{font-size:12.5px;margin-top:5px;font-weight:600;position:relative}
.dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 8px currentColor}

/* explore */
.explore{margin-top:24px}
.exHead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
#viewSeg{margin-bottom:6px}
.exBody{display:grid;grid-template-columns:1.45fr 1fr;gap:26px;align-items:center}
.exChart{height:330px;position:relative}
.exList{display:flex;flex-direction:column;gap:10px;max-height:330px;overflow:auto;padding-right:4px}
.exRow{display:flex;align-items:center;gap:11px;font-size:13px;padding:2px 0}
.exRow .sw{width:10px;height:10px;border-radius:3px;flex:none;box-shadow:0 0 8px -1px currentColor}
.exRow .nm{flex:1;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.exRow .vl{font-family:var(--disp);font-weight:600}
.exRow .pc{color:var(--ink2);font-size:11.5px;width:46px;text-align:right}
.exList::-webkit-scrollbar{width:6px}.exList::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:99px}

/* advanced */
details.adv{margin-top:24px}
details.adv summary{cursor:pointer;font-family:var(--disp);font-weight:600;font-size:15px;list-style:none;display:flex;align-items:center;gap:9px}
details.adv summary::-webkit-details-marker{display:none}
details.adv summary::before{content:"›";font-size:20px;transition:.25s;color:var(--c2)}
details.adv[open] summary::before{transform:rotate(90deg)}
.sliders{display:grid;grid-template-columns:repeat(2,1fr);gap:20px 32px;margin-top:20px}
.slider .top{display:flex;justify-content:space-between;align-items:baseline}
.slider .name{font-weight:600;font-size:13.5px}
.slider .v{font-family:var(--disp);font-weight:600;font-size:13px;color:var(--c2)}
.slider .help{font-size:11.5px;color:var(--ink2);margin:3px 0 9px}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:999px;
  background:rgba(255,255,255,.13);outline:none}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;border-radius:50%;
  background:linear-gradient(180deg,#fff,#dceef0);cursor:pointer;
  box-shadow:0 0 0 5px rgba(31,224,192,.18),0 3px 8px rgba(0,0,0,.55)}
input[type=range]::-moz-range-thumb{width:17px;height:17px;border-radius:50%;background:#fff;border:0;cursor:pointer;
  box-shadow:0 0 0 5px rgba(31,224,192,.18)}
.advRow{display:flex;align-items:center;justify-content:space-between;margin-top:22px;gap:12px;flex-wrap:wrap}
select{font:inherit;padding:7px 11px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--ink)}

.legend{display:flex;gap:20px;flex-wrap:wrap;margin-top:14px;font-size:11.5px;color:var(--ink2)}
.legend i{display:inline-block;width:16px;height:0;border-top:3px solid;border-radius:2px;margin-right:7px;vertical-align:middle}
.cap{font-size:11.5px;color:var(--ink3);margin-top:7px}
.exNote{font-size:12.5px;color:var(--ink2);margin:0 0 16px}
.foot{color:var(--ink3);font-size:12px;line-height:1.7;margin-top:30px;padding:0 4px}
.foot b{color:var(--ink2)}

/* custom chart tooltip */
.charttip{position:fixed;left:0;top:0;pointer-events:none;z-index:80;padding:10px 13px;border-radius:14px;
  background:rgba(11,17,25,.84);border:1px solid var(--line2);color:var(--ink);
  font-family:'Manrope';font-weight:600;font-size:12px;white-space:nowrap;opacity:0;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  box-shadow:0 18px 44px -16px rgba(0,0,0,.85);transition:opacity .16s,transform .16s;transform:translate(-50%,-128%)}
.charttip .tt{color:var(--ink2);font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px}
.charttip .tr{display:flex;align-items:center;gap:8px}
.charttip .tr b{font-family:var(--disp);font-weight:600}
.charttip .tr i{width:8px;height:8px;border-radius:2px;display:inline-block}

/* editorial section kickers */
.kicker{display:flex;align-items:center;gap:9px;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--ink2);margin:0 2px 13px}
.kicker::before{content:"";width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:0 0 11px rgba(31,224,192,.9)}
/* gauge inner luminosity + hero divider */
.ringGlow{position:absolute;inset:22%;border-radius:50%;background:radial-gradient(closest-side,rgba(31,224,192,.20),transparent 72%);filter:blur(8px);pointer-events:none}
.heroRight{border-left:1px solid rgba(255,255,255,.07);padding-left:32px}
.seg button.on{box-shadow:0 8px 22px -8px rgba(31,224,192,.7),0 0 0 1px rgba(191,255,77,.4) inset,inset 0 1px 0 rgba(255,255,255,.5)}
:focus-visible{outline:2px solid rgba(31,224,192,.7);outline-offset:2px;border-radius:8px}

/* Canada tile map */
.mapWrap{display:flex;justify-content:center;margin-top:10px;overflow-x:auto}
.tilemap{display:grid;grid-template-columns:repeat(7,54px);grid-auto-rows:54px;gap:8px}
.ptile{border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
  border:1px solid rgba(255,255,255,.15);cursor:default;transition:transform .2s cubic-bezier(.2,.7,.2,1),box-shadow .2s;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22)}
.ptile:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 12px 26px -10px rgba(0,0,0,.85),0 0 0 1px rgba(191,255,77,.5)}
.ptile .pc{font-family:var(--disp);font-weight:600;font-size:14px;line-height:1}
.ptile .pv{font-size:9px;font-weight:700;opacity:.85}

@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.hero,.gapcard,.block,.explore,.adv{animation:rise .6s cubic-bezier(.2,.7,.2,1) both}
.gapcard{animation-delay:.06s}.block{animation-delay:.12s}.explore{animation-delay:.18s}.adv{animation-delay:.24s}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media(max-width:840px){
  .hero .heroTop{grid-template-columns:1fr;gap:24px}
  .heroRight{border-left:0;padding-left:0}
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
const PALETTE = ['#1fe0c0','#bfff4d','#3aa0ff','#a78bfa','#ffd27a','#ff7a9c','#5be3c0','#7cd34f','#62b0ff','#f08adf'];
const hexA = (h,a)=>{ const n=parseInt(h.slice(1),16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; };

const DEF = { gross_basis: CONFIG.settings.gross_basis, velocity_uplift:0, ramp_speed:1,
              price_index:0, season_amp:1, online_growth:0, n_weeks: CONFIG.settings.n_weeks };
let state = Object.assign({}, DEF);
let explore = { view:'channel', metric:'rev' };
const LEVERS = ['velocity_uplift','ramp_speed','price_index','season_amp','online_growth'];

Chart.defaults.font.family = "'Manrope',-apple-system,system-ui,sans-serif";
Chart.defaults.color = '#94a4b6';
Chart.defaults.font.size = 12;
const GRID = 'rgba(255,255,255,.06)';

// ---- glassy custom tooltip (shared across charts) ----
let _tip;
function ensureTip(){ if(!_tip){ _tip=document.createElement('div'); _tip.className='charttip'; document.body.appendChild(_tip);} return _tip; }
function externalTooltip(ctx){
  const t=ctx.tooltip, tip=ensureTip();
  if(!t || t.opacity===0){ tip.style.opacity='0'; return; }
  const fmt=ctx.chart.$fmt || (v=>v);
  let html='<div class="tt">'+((t.title&&t.title[0])||'')+'</div>';
  (t.dataPoints||[]).forEach(dp=>{
    let col=dp.element&&dp.element.options&&dp.element.options.backgroundColor; col=(dp.dataset.borderColor)||col;
    if(typeof col!=='string') col='#1fe0c0';
    const lbl=dp.dataset.label?'<span class="tk">'+dp.dataset.label+'</span> ':'';
    html+='<div class="tr"><i style="background:'+col+'"></i>'+lbl+'<b>'+fmt(dp.raw)+'</b></div>';
  });
  tip.innerHTML=html;
  const r=ctx.chart.canvas.getBoundingClientRect();
  tip.style.left=(r.left+t.caretX)+'px'; tip.style.top=(r.top+t.caretY)+'px'; tip.style.opacity='1';
}
// gradient helpers
function gradV(ctx,a,c0,c1){ const g=ctx.createLinearGradient(0,a.top,0,a.bottom); g.addColorStop(0,c0); g.addColorStop(1,c1); return g; }
function gradH(ctx,a,c0,c1){ const g=ctx.createLinearGradient(a.left,0,a.right,0); g.addColorStop(0,c0); g.addColorStop(1,c1); return g; }
// soft glow under the hero cumulative line
const glowLine={id:'glow',beforeDatasetDraw(c,a){ if(a.index===0){ c.ctx.save(); c.ctx.shadowColor='rgba(31,224,192,.5)'; c.ctx.shadowBlur=18; } },
  afterDatasetDraw(c,a){ if(a.index===0) c.ctx.restore(); }};
function roundRect(ctx,x,y,w,h,r){ r=Math.min(r,h/2,w/2); ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
// glowing dot at the live end of the cumulative line
const heroEndpoint={id:'endpt',afterDatasetsDraw(c){ try{ const m=c.getDatasetMeta(0);
  if(!m||!m.data||!m.data.length) return; const p=m.data[m.data.length-1], ctx=c.ctx;
  ctx.save(); ctx.shadowColor='rgba(31,224,192,.95)'; ctx.shadowBlur=15; ctx.fillStyle='#eafff7';
  ctx.beginPath(); ctx.arc(p.x,p.y,4.5,0,7); ctx.fill(); ctx.restore(); }catch(e){} }};
// small "$3M GOAL" tag riding the goal line
const goalTag={id:'goaltag',afterDraw(c){ try{ const ys=c.scales.y, xa=c.chartArea; if(!ys||!xa) return;
  const y=ys.getPixelForValue(TARGET); if(y<xa.top-2||y>xa.bottom+2) return;
  const ctx=c.ctx, txt='$3M GOAL'; ctx.save(); ctx.font='700 10px Manrope';
  const w=ctx.measureText(txt).width+16, x=xa.right-w-2;
  ctx.fillStyle='rgba(255,122,156,.16)'; ctx.strokeStyle='rgba(255,122,156,.5)'; ctx.lineWidth=1;
  roundRect(ctx,x,y-9,w,18,9); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#ff9bb2'; ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillText(txt,x+8,y+.5); ctx.restore(); }catch(e){} }};
// faint share-of-max track behind each explore bar
const barTrack={id:'bartrack',beforeDatasetsDraw(c){ try{ const xa=c.chartArea; if(!xa) return;
  const m=c.getDatasetMeta(0); if(!m||!m.data) return; const ctx=c.ctx;
  ctx.save(); ctx.fillStyle='rgba(255,255,255,.045)';
  m.data.forEach(b=>{ const h=(b.height||16); roundRect(ctx,xa.left,b.y-h/2,xa.right-xa.left,h,7); ctx.fill(); });
  ctx.restore(); }catch(e){} }};

// ---- signature goal gauge (arc sweep + glowing tip) ----
function updateGauge(p){
  p=Math.max(0,Math.min(1,p));
  const C=2*Math.PI*88;
  document.getElementById('ringArc').style.strokeDashoffset=C*(1-p);
  const tip=document.getElementById('ringTip'), ang=(-90+360*p)*Math.PI/180;
  tip.setAttribute('cx',(105+88*Math.cos(ang)).toFixed(2));
  tip.setAttribute('cy',(105+88*Math.sin(ang)).toFixed(2));
  tip.style.opacity = p>0.012 ? '1':'0';
}

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
  cumChart = new Chart(document.getElementById('c_cum'), {type:'line', data:{labels:[],datasets:[]}, plugins:[glowLine,heroEndpoint,goalTag],
    options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:'index'},
      animation:{duration:850,easing:'easeOutQuart'},
      plugins:{legend:{display:false},tooltip:{enabled:false,external:externalTooltip}},
      scales:{y:{ticks:{callback:v=>fmtM(v),maxTicksLimit:6},grid:{color:GRID},border:{display:false}},
              x:{grid:{display:false},ticks:{maxTicksLimit:9,autoSkip:true},border:{display:false}}}}});
  cumChart.$fmt=fmt$;
}
function renderCum(R){
  const labels=R.byWeek.map((_,i)=>'W'+(i+1)), ch=cumChart, a=ch.chartArea, ctx=ch.ctx;
  const stroke = a ? gradH(ctx,a,'#bfff4d','#3aa0ff') : '#1fe0c0';
  const fill   = a ? gradV(ctx,a,'rgba(31,224,192,.30)','rgba(31,224,192,0)') : 'rgba(31,224,192,.2)';
  ch.data.labels=labels;
  ch.data.datasets=[
    {label:'Cumulative',data:R.cumulative,borderColor:stroke,backgroundColor:fill,fill:true,tension:.35,
     pointRadius:0,borderWidth:3,pointHoverRadius:5,pointHoverBackgroundColor:'#eafff7',pointHoverBorderColor:'#1fe0c0',pointHoverBorderWidth:2},
    {label:'$3M goal',data:labels.map(()=>TARGET),borderColor:'rgba(255,122,156,.85)',borderDash:[5,5],pointRadius:0,borderWidth:1.5},
    {label:'On-pace',data:R.byWeek.map((_,i)=>TARGET*(i+1)/R.nWeeks),borderColor:'rgba(255,255,255,.24)',borderDash:[2,4],pointRadius:0,borderWidth:1.2}
  ];
  ch.update();
}

function render(){
  const R = compute(state);
  const win = R.gross >= TARGET;
  updateGauge(R.pctToGoal);                       // signature gauge sweep + glowing tip
  animateNum(document.getElementById('goalBig'), R.gross, fmt$);
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
  renderCum(R); renderGap(R); renderScenarios(); renderExplore(R); renderMap(R); syncControls();
}

// ---- Canada tile map (schematic grid; colour = revenue) ----
const MAPGRID={BC:[0,1],AB:[1,1],SK:[2,1],MB:[3,1],ON:[4,1],QC:[5,1],PE:[6,1],NL:[6,0],NB:[5,2],NS:[6,2]};
const _lerp=(a,b,t)=>a+(b-a)*t;
function mapColor(t){ const s=[[26,74,84],[31,224,192],[191,255,77]]; const i=t<.5?0:1, k=t<.5?t/.5:(t-.5)/.5;
  return 'rgb('+Math.round(_lerp(s[i][0],s[i+1][0],k))+','+Math.round(_lerp(s[i][1],s[i+1][1],k))+','+Math.round(_lerp(s[i][2],s[i+1][2],k))+')'; }
function showTileTip(e,html){ const tip=ensureTip(); tip.innerHTML=html; tip.style.left=e.clientX+'px'; tip.style.top=(e.clientY-12)+'px'; tip.style.opacity='1'; }
function renderMap(R){
  const host=document.getElementById('tilemap'); if(!host) return; host.innerHTML='';
  const vals=R.byProvince, keys=Object.keys(vals).filter(k=>MAPGRID[k]);
  const arr=keys.map(k=>vals[k]), max=Math.max(...arr), min=Math.min(...arr), tot=arr.reduce((a,b)=>a+b,0);
  const noteEl=document.getElementById('mapNote'); if(noteEl) noteEl.textContent=state.gross_basis+' basis · hover a province';
  keys.forEach(code=>{
    const g=MAPGRID[code], v=vals[code], t=max>min?(v-min)/(max-min):1, dark=t>0.45, ink=dark?'#06140f':'#dfeef2';
    const el=document.createElement('div'); el.className='ptile';
    el.style.gridColumn=(g[0]+1); el.style.gridRow=(g[1]+1); el.style.background=mapColor(t);
    el.innerHTML='<span class="pc" style="color:'+ink+'">'+code+'</span><span class="pv" style="color:'+ink+'">'+fmtM(v)+'</span>';
    el.addEventListener('mousemove',e=>showTileTip(e,'<div class="tt">'+code+'</div><div class="tr"><b>'+fmt$(v)+'</b> · '+pctS(v/tot)+' of gross</div>'));
    el.addEventListener('mouseleave',()=>{ ensureTip().style.opacity='0'; });
    host.appendChild(el);
  });
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
    const dot=win?'#5ff0a8':(nm==='Bear'?'#ff7a9c':'#ffd27a');
    const el=document.createElement('div'); el.className='scard'+(sel?' on':'');
    el.innerHTML='<div class="sn"><span class="dot" style="background:'+dot+';color:'+dot+'"></span>'+nm+(nm==='Base'?' · current plan':'')+'</div>'+
      '<div class="sv">'+fmtM(g)+'</div>'+
      '<div class="sp" style="color:'+(win?'#5ff0a8':'#ffd27a')+'">'+pctS(g/TARGET)+' of goal</div>';
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
    exChart.update(); return;
  }
  if(exChart) exChart.destroy(); exKey=key;
  const ctx=document.getElementById('c_explore');
  // per-bar gradient: category colour (translucent -> full) for dimensions; accent for sensitivity
  const barBg=(c)=>{ const ca=c.chart.chartArea; if(!ca) return '#1fe0c0';
    if(isFloat) return gradH(c.chart.ctx,ca,'rgba(31,224,192,.4)','rgba(58,160,255,.95)');
    const col=PALETTE[c.dataIndex%PALETTE.length]; return gradH(c.chart.ctx,ca,hexA(col,.45),col); };
  const opts={indexAxis:'y',responsive:true,maintainAspectRatio:false,
    animation:{duration:700,easing:'easeOutQuart'},
    plugins:{legend:{display:false},tooltip:{enabled:false,external:externalTooltip}},
    scales:{x:{grid:{color:GRID},border:{display:false},ticks:{callback:v=>isFloat?fmtM(v):(isVol?fmtN(v):fmtM(v))}},
            y:{grid:{display:false},border:{display:false},ticks:{color:'#c2cdd9',font:{weight:'600'}}}}};
  exChart=new Chart(ctx,{type:'bar',plugins:[barTrack],data:{labels:rows.map(r=>r.label),
    datasets:[{data:isFloat?rows.map(r=>[r.lo,r.hi]):rows.map(r=>r.value),backgroundColor:barBg,
      borderRadius:7,barThickness:isFloat?20:'flex',maxBarThickness:34}]},options:opts});
  exChart.$fmt = isFloat ? (r=>'swing '+fmtM(r[1]-r[0])+'  ('+fmtM(r[0])+' – '+fmtM(r[1])+')')
                          : (isVol?(v=>fmtN(v)+' cases'):fmt$);
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
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
__CHARTJS__
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
  <div class="kicker">Goal progress · FY2027</div>
  <div class="heroTop">
    <div class="ring">
      <div class="ringGlow"></div>
      <svg width="210" height="210" viewBox="0 0 210 210">
        <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#bfff4d"/><stop offset=".55" stop-color="#1fe0c0"/><stop offset="1" stop-color="#3aa0ff"/>
        </linearGradient></defs>
        <g transform="rotate(-90 105 105)">
          <circle cx="105" cy="105" r="88" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="13"/>
          <circle id="ringArc" cx="105" cy="105" r="88" fill="none" stroke="url(#ringGrad)" stroke-width="13"
            stroke-linecap="round" stroke-dasharray="552.92" stroke-dashoffset="552.92"
            style="transition:stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)"/>
        </g>
        <circle id="ringTip" cx="105" cy="17" r="6.5" fill="#eafff7" style="filter:drop-shadow(0 0 9px rgba(31,224,192,.95))"/>
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
    <span><i style="border-color:#1fe0c0"></i>Cumulative revenue</span>
    <span><i style="border-color:#ff7a9c;border-top-style:dashed"></i>$3M goal</span>
    <span><i style="border-color:rgba(255,255,255,.4);border-top-style:dashed"></i>On-pace line</span>
  </div>
  <div class="cap">Fiscal year: week 1 = 1 Sep 2027, running to the end of August 2028.</div>
</section>

<!-- CLOSE THE GAP -->
<section class="card gapcard">
  <div class="kicker">Recommended actions</div>
  <div class="gcHead"><h2 id="gapTitle">Close the gap</h2><button class="link" id="gcReset" style="display:none">Undo</button></div>
  <p class="muted" id="gapSub" style="margin:6px 0 0"></p>
  <div class="chips" id="gapChips"></div>
</section>

<!-- SCENARIOS -->
<section class="block">
  <div class="kicker">Planning cases</div>
  <div class="blockHead"><h2>Scenarios</h2><span class="muted">Tap a case to apply it</span></div>
  <div class="scen" id="scenCards"></div>
</section>

<!-- EXPLORE -->
<section class="card explore">
  <div class="kicker">Breakdown</div>
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

<!-- ACROSS CANADA -->
<section class="card">
  <div class="kicker">Across Canada</div>
  <div class="blockHead" style="margin:0 0 4px"><h2>Revenue by province</h2><span class="muted" id="mapNote"></span></div>
  <div class="mapWrap"><div class="tilemap" id="tilemap"></div></div>
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

# Inline Chart.js (vendored) so the dashboard is fully self-contained and works
# offline / behind any network policy — no CDN dependency. Markers let the test
# harness swap in a lightweight stub.
import os
_vendor = os.path.join(os.path.dirname(__file__), "vendor", "chart.umd.js")
with open(_vendor, encoding="utf-8") as fh:
    chartjs = fh.read().replace("</script>", "<\\/script>")
chart_tag = '<script id="chartjs">/*__CHARTJS_START__ Chart.js v4.4.1 (vendored, inlined for offline use)*/\n' + chartjs + '\n/*__CHARTJS_END__*/</script>'

html = (HTML.replace("__CSS__", CSS)
            .replace("__CHARTJS__", chart_tag)
            .replace("__ENGINE__", ENGINE_JS)
            .replace("__UI__", UI_JS))
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write(html)
print(f"SAVED {OUT}  ({len(html):,} bytes)")

# also emit the engine to a node-testable file for verification
with open("/tmp/muv_engine_test.mjs", "w", encoding="utf-8") as fh:
    fh.write(ENGINE_JS + "\nconsole.log(JSON.stringify(compute({})));\n")
print("wrote /tmp/muv_engine_test.mjs")
