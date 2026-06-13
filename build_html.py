"""
Builds revenue-forecast.html — a self-contained revenue & profit planning
dashboard. Inlines engine.js (the tested calculation core) so the output is a
single portable file you can double-click or email. Run: python3 build_html.py
"""
import pathlib

ENGINE = pathlib.Path("engine.js").read_text()

TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Revenue &amp; Profit Forecast — Cases-Sold Planner</title>
<style>
  :root{
    --navy:#16243d; --blue:#2e5496; --blue2:#3b6fb5; --light:#dbe4f3; --accent:#2e8b57;
    --green:#1e7d4f; --red:#c0392b; --amber:#e08a3c; --terra:#e07a5f;
    --ink:#172033; --mut:#65728a; --line:#e6eaf1; --yell:#fff8e1; --bg:#eef2f8; --card:#fff;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
       background:var(--bg);color:var(--ink);line-height:1.45;font-size:14px}
  .topbar{background:linear-gradient(120deg,var(--navy),var(--blue));color:#fff;padding:16px 22px;
          display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;
          position:sticky;top:0;z-index:30;box-shadow:0 2px 10px rgba(10,20,40,.18)}
  .topbar h1{margin:0;font-size:18px;letter-spacing:.2px}
  .topbar .sub{font-size:12px;opacity:.8;margin-top:2px}
  .tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .tools button,.tools select{font:inherit;font-size:13px;border:1px solid rgba(255,255,255,.4);
       background:rgba(255,255,255,.1);color:#fff;border-radius:8px;padding:6px 11px;cursor:pointer}
  .tools button:hover{background:rgba(255,255,255,.25)}
  .tools select{background:rgba(255,255,255,.12)}
  .tools select option{color:#000}
  .strip{position:sticky;top:60px;z-index:20;background:#fff;border-bottom:1px solid var(--line);
         display:grid;grid-template-columns:repeat(6,1fr);gap:0;box-shadow:0 1px 6px rgba(10,20,40,.06)}
  .strip .s{padding:10px 14px;border-right:1px solid var(--line)}
  .strip .s:last-child{border-right:none}
  .strip .v{font-size:19px;font-weight:800;color:var(--navy);letter-spacing:-.4px;line-height:1.1}
  .strip .v small{font-size:12px;font-weight:700;color:var(--mut)}
  .strip .l{font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.4px;margin-top:2px}
  .strip .v.pos{color:var(--green)} .strip .v.neg{color:var(--red)}
  main{max-width:1140px;margin:0 auto;padding:18px 16px 80px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:16px 0;
        box-shadow:0 1px 3px rgba(20,30,50,.05)}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.7px;color:var(--navy);margin:0 0 4px}
  h2 .hint{text-transform:none;letter-spacing:0;font-weight:500;color:var(--mut);font-size:12px}
  .sec-d{font-size:12.5px;color:var(--mut);margin:0 0 14px;border-bottom:1px solid var(--line);padding-bottom:10px}
  label{font-size:11.5px;color:var(--mut);display:block;margin-bottom:3px;font-weight:600}
  input[type=number],input[type=text],select{font:inherit;padding:7px 9px;border:1px solid #cdd5e0;border-radius:8px;width:100%;background:#fff}
  input.in{background:var(--yell)} input:focus,select:focus{outline:2px solid var(--blue);outline-offset:-1px}
  .grid{display:grid;gap:13px}
  .a4{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
  .two{grid-template-columns:1.3fr .9fr;gap:20px}
  @media(max-width:820px){.two{grid-template-columns:1fr}.strip{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:520px){.strip{grid-template-columns:repeat(2,1fr)}}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{padding:7px 9px;text-align:right;border-bottom:1px solid var(--line);white-space:nowrap}
  th{background:var(--navy);color:#fff;font-weight:600}
  th:first-child,td:first-child{text-align:left}
  th.grp{background:var(--blue)}
  tbody tr:hover{background:#f6f9fd}
  td input{background:var(--yell);text-align:right;padding:5px 7px;border:1px solid #d8dee8}
  td input.name{text-align:left}
  tfoot td{font-weight:700;background:#eef2f9;border-top:2px solid var(--navy)}
  .calc{color:var(--mut)}
  .kpi{background:linear-gradient(135deg,#fff,#f3f6fc);border:1px solid var(--line);border-radius:12px;padding:13px 15px}
  .kpi .v{font-size:21px;font-weight:800;color:var(--navy);letter-spacing:-.4px}
  .kpi .l{font-size:11px;color:var(--mut);margin-top:2px;text-transform:uppercase;letter-spacing:.3px}
  .kpi.hero{background:linear-gradient(135deg,var(--navy),var(--blue));border:none}
  .kpi.hero .v,.kpi.hero .l{color:#fff}
  .kpi .v.pos{color:var(--green)} .kpi .v.neg{color:var(--red)}
  .bars .b{display:flex;align-items:center;gap:9px;margin:6px 0}
  .bars .nm{width:150px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bars .track{flex:1;background:#eef1f6;border-radius:6px;height:16px;overflow:hidden}
  .bars .fill{height:100%;border-radius:6px}
  .bars .val{font-size:12px;color:var(--mut);width:96px;text-align:right}
  .legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
  .legend span{font-size:11.5px;color:var(--mut);display:flex;align-items:center;gap:5px}
  .legend i{width:11px;height:11px;border-radius:3px;display:inline-block}
  button.mini{font:inherit;border:1px solid var(--blue);background:#fff;color:var(--blue);border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:600;font-size:13px}
  button.mini:hover{background:var(--blue);color:#fff}
  button.del{border:1px solid #d98b8b;color:#b54a4a;border-radius:7px;padding:3px 8px;cursor:pointer;background:#fff;font-size:12px}
  button.del:hover{background:#b54a4a;color:#fff}
  .note{font-size:12px;color:var(--mut);font-style:italic;margin-top:10px}
  .pill{display:inline-block;background:var(--light);color:var(--navy);border-radius:20px;padding:2px 9px;font-size:10.5px;font-weight:700;margin-left:6px;vertical-align:middle}
  .scroll{overflow-x:auto}
  .scn{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
  @media(max-width:680px){.scn{grid-template-columns:1fr}}
  .scn .col{border:1px solid var(--line);border-radius:12px;overflow:hidden}
  .scn .col h3{margin:0;padding:10px 14px;font-size:13px;color:#fff;background:var(--mut)}
  .scn .col.base h3{background:var(--blue)} .scn .col.cons h3{background:#7f8aa0} .scn .col.aggr h3{background:var(--green)}
  .scn .row{display:flex;justify-content:space-between;padding:7px 14px;border-top:1px solid var(--line);font-size:13px}
  .scn .row b{font-weight:700}
  .scn .col input{width:120px}
  .heat td{color:#10306a;font-weight:600;text-align:center;border:1px solid #fff}
  .barline{position:relative;height:26px;background:#eef1f6;border-radius:6px;margin:8px 0}
  .barline .be{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--red)}
  .barline .fillt{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--blue),var(--accent));border-radius:6px}
  @media print{.topbar,.tools,.strip{position:static} .card{break-inside:avoid;box-shadow:none} body{background:#fff} .noprint{display:none}}
</style>
</head>
<body>
<div class="topbar">
  <div><h1>Revenue &amp; Profit Forecast</h1><div class="sub">Cases-sold planner with channel pricing, margin &amp; break-even</div></div>
  <div class="tools noprint">
    <label style="color:#fff;margin:0 4px 0 0;font-weight:600">Currency
      <select id="cur" style="margin-left:5px"></select></label>
    <button id="btnCsv">⬇ Export CSV</button>
    <button id="btnPrint">🖨 Print / PDF</button>
    <button id="btnReset">↺ Reset sample</button>
  </div>
</div>

<div class="strip" id="strip"></div>

<main>
  <section class="card">
    <h2>1 · Targets &amp; assumptions</h2>
    <p class="sec-d">Set the goal and the fixed economics. Yellow fields are inputs; everything below recalculates instantly and is saved in your browser.</p>
    <div class="grid a4">
      <div><label>Annual gross revenue target</label><input class="in" id="target" type="number" min="0" step="50000"></div>
      <div><label>Units per case</label><input class="in" id="upc" type="number" min="1" step="1"></div>
      <div><label>Selling days / year</label><input class="in" id="days" type="number" min="1" step="1"></div>
      <div><label>Annual fixed costs</label><input class="in" id="fixed" type="number" min="0" step="10000"></div>
      <div><label>YoY growth (projection)</label><input class="in" id="growth" type="number" step="1"></div>
      <div><label>Projection years</label><input class="in" id="years" type="number" min="1" max="10" step="1"></div>
    </div>
  </section>

  <section class="card">
    <h2>2 · Channels — pricing &amp; unit economics <span class="pill">edit freely</span></h2>
    <p class="sec-d">Each channel sells the same product at a different price and cost-to-serve. Net price = gross − trade discount; contribution = net − COGS − selling cost.</p>
    <div class="scroll">
      <table id="chTable">
        <thead>
          <tr>
            <th rowspan="2">Channel</th><th rowspan="2">Gross / case</th><th rowspan="2">Volume mix</th>
            <th rowspan="2">COGS / case</th><th rowspan="2">Trade disc. %</th><th rowspan="2">Selling %</th>
            <th class="grp" colspan="3">Per case (calc)</th><th class="grp" colspan="3">At target (calc)</th><th rowspan="2"></th>
          </tr>
          <tr><th class="grp">Net</th><th class="grp">Contrib.</th><th class="grp">Margin</th>
              <th class="grp">Cases</th><th class="grp">Gross $</th><th class="grp">Contrib $</th></tr>
        </thead>
        <tbody id="chBody"></tbody>
        <tfoot><tr>
          <td>Blended / Total</td><td id="fGross"></td><td id="fMix"></td><td id="fCogs"></td><td></td><td></td>
          <td id="fNet"></td><td id="fContrib"></td><td id="fMargin"></td>
          <td id="fCases"></td><td id="fGrossT"></td><td id="fContribT"></td><td></td>
        </tr></tfoot>
      </table>
    </div>
    <div style="margin-top:12px"><button class="mini" id="btnAdd">+ Add channel</button></div>
  </section>

  <section class="card">
    <h2>3 · From revenue to profit <span class="hint">— the money waterfall</span></h2>
    <p class="sec-d">How your gross revenue target turns into operating profit, after discounts, COGS, cost-to-serve and fixed costs.</p>
    <div class="two">
      <div id="waterfall"></div>
      <div class="grid" style="grid-template-columns:1fr 1fr;align-content:start" id="wfKpis"></div>
    </div>
  </section>

  <section class="card">
    <h2>4 · Where it comes from</h2>
    <div class="two">
      <div>
        <div class="note" style="margin:0 0 6px">Contribution $ by channel</div><div class="bars" id="contribBars"></div>
        <div class="note" style="margin:14px 0 6px">Cases by channel</div><div class="bars" id="casesBars"></div>
      </div>
      <div style="text-align:center">
        <div class="note" style="margin:0 0 6px">Gross revenue mix</div>
        <div id="donut"></div><div class="legend" id="donutLeg" style="justify-content:center"></div>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>5 · Break-even</h2>
    <p class="sec-d">The volume where contribution covers fixed costs. Below this you lose money; above it, each case adds profit.</p>
    <div id="beText"></div>
    <div class="barline" id="beBar"><div class="fillt" id="beFill"></div><div class="be" id="beMark"></div></div>
    <div class="legend"><span><i style="background:linear-gradient(90deg,var(--blue),var(--accent))"></i>Target volume</span><span><i style="background:var(--red)"></i>Break-even</span></div>
  </section>

  <section class="card">
    <h2>6 · Scenarios <span class="hint">— conservative · base · aggressive</span></h2>
    <p class="sec-d">Same channel economics, three revenue goals. Edit any target to compare the case counts and profit each implies.</p>
    <div class="scn" id="scenarios"></div>
  </section>

  <section class="card">
    <h2>7 · Multi-year projection</h2>
    <p class="sec-d">The base target grown at your YoY rate, holding price &amp; cost structure constant.</p>
    <div class="two">
      <div class="scroll"><table id="projTable"></table></div>
      <div><div class="note" style="margin:0 0 6px">Revenue trajectory</div><div class="bars" id="projBars"></div></div>
    </div>
  </section>

  <section class="card">
    <h2>8 · Monthly plan <span class="hint">— seasonality</span></h2>
    <p class="sec-d">Spread the annual total across the year. Seasonality weights are inputs (relative); set holiday peaks or ramp-ups.</p>
    <div id="monthChart" style="margin-bottom:10px"></div>
    <div class="scroll"><table id="monthTable"></table></div>
  </section>

  <section class="card">
    <h2>9 · &ldquo;If I sold at this price&rdquo; — one channel at a time</h2>
    <div class="scroll"><table id="pureTable"></table></div>
    <p class="note">Assumes 100% of volume through that single channel. Your real answer sits between these rows, set by the mix in section 2.</p>
  </section>

  <section class="card">
    <h2>10 · Profit grid <span class="hint">— price × volume → operating profit</span></h2>
    <p class="sec-d">Operating profit at combinations of price/case and cases sold (using your blended discount, selling &amp; COGS). Green = profit, red = loss.</p>
    <div class="scroll"><table class="heat" id="heatTable"></table></div>
  </section>

  <section class="card">
    <h2>11 · Two-way calculator</h2>
    <div class="grid a4">
      <div><label>Price / case to test</label><input class="in" id="wfPrice" type="number" min="0" step="5"></div>
      <div><label>Cases sold → revenue</label><input class="in" id="wfCases" type="number" min="0" step="100"></div>
      <div><label>Revenue target → cases</label><input class="in" id="wfRev" type="number" min="0" step="50000"></div>
    </div>
    <div class="grid a4" id="wfOut" style="margin-top:13px"></div>
    <p class="note">Profit here uses blended discount/selling/COGS from your channel mix.</p>
  </section>

  <p class="note">Planning aid only. Gross revenue = list price × cases (before discounts). Net, contribution and operating profit layer in discounts, COGS, cost-to-serve and fixed costs. Swap in your real numbers — the model is yours.</p>
</main>

<script>/*__ENGINE__*/</script>
<script>
"use strict";
const $=s=>document.getElementById(s), $$=s=>Array.from(document.querySelectorAll(s));
const KEY="rfm.v2";
const CUR=[["$","USD $"],["€","EUR €"],["£","GBP £"],["A$","AUD A$"],["C$","CAD C$"],["¥","JPY ¥"],["₹","INR ₹"]];
const PALETTE=["#2e5496","#2e8b57","#e08a3c","#7e57c2","#d9534f","#17a2b8","#c2185b","#5d6d7e"];
const DEFAULTS={
  currency:"$", revenueTarget:2500000, unitsPerCase:12, sellingDays:260,
  fixedCosts:600000, growthRate:0.15, projectionYears:3,
  channels:[
    {name:"Direct-to-Consumer (DTC)", grossPrice:300, mix:20, cogs:90, discountPct:0.05, sellingPct:0.18},
    {name:"On-Premise / Food Service", grossPrice:216, mix:15, cogs:90, discountPct:0.10, sellingPct:0.05},
    {name:"Off-Premise Retail",        grossPrice:180, mix:30, cogs:90, discountPct:0.12, sellingPct:0.04},
    {name:"Wholesale / Distributor",   grossPrice:120, mix:30, cogs:90, discountPct:0.00, sellingPct:0.03},
    {name:"Online Marketplace",        grossPrice:150, mix:5,  cogs:90, discountPct:0.08, sellingPct:0.15}
  ],
  seasonality:[0.7,0.7,0.9,1.0,1.1,1.2,1.2,1.1,1.0,1.0,1.3,1.8],
  scenarios:[{label:"Conservative",target:2000000},{label:"Base",target:2500000},{label:"Aggressive",target:3200000}]
};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const clone=o=>JSON.parse(JSON.stringify(o));
let state=load();
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.channels)&&s.channels.length)return Object.assign(clone(DEFAULTS),s);}catch(e){}return clone(DEFAULTS);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}

// formatters
const C=()=>state.currency||"$";
const fN=n=>!isFinite(n)?"∞":Math.round(n).toLocaleString();
const fM=n=>!isFinite(n)?"∞":C()+Math.round(n).toLocaleString();
const fM2=n=>C()+Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const fP=n=>(n*100).toFixed(1)+"%";
const sM=n=>{const a=Math.abs(n),s=n<0?"-":"";if(a>=1e6)return s+C()+(a/1e6).toFixed(a>=1e7?1:2)+"M";if(a>=1e3)return s+C()+(a/1e3).toFixed(0)+"k";return s+C()+Math.round(a);};
const esc=s=>(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

// ---------- SVG chart helpers ----------
function svgWaterfall(bars){
  const W=560,H=300,padX=10,padB=46,padT=24;
  let lo=0,hi=0; bars.forEach(b=>{lo=Math.min(lo,b.lo);hi=Math.max(hi,b.hi);});
  const span=(hi-lo)||1, y=v=>padT+(hi-v)/span*(H-padT-padB), bw=(W-2*padX)/bars.length*0.62, gap=(W-2*padX)/bars.length;
  const col={gross:"#3b6fb5",net:"#2e5496",contrib:"#2e8b57",profit:"#1e7d4f",loss:"#c0392b",sub:"#e07a5f"};
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">`;
  s+=`<line x1="${padX}" y1="${y(0)}" x2="${W-padX}" y2="${y(0)}" stroke="#c4cdd9"/>`;
  bars.forEach((b,i)=>{
    const x=padX+gap*i+(gap-bw)/2, yt=y(b.hi), h=Math.max(1,y(b.lo)-y(b.hi));
    s+=`<rect x="${x.toFixed(1)}" y="${yt.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${col[b.kind]||"#888"}"/>`;
    if(i<bars.length-1){const lvl=(b.kind==="sub")?b.lo+(b.val<0?0:b.val):b.hi*Math.sign(b.hi||1)===b.hi?b.hi:b.hi;}
    s+=`<text x="${(x+bw/2).toFixed(1)}" y="${(yt-5).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#16243d">${sM(b.kind==="sub"?b.val:b.val)}</text>`;
    s+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-padB+16}" text-anchor="middle" font-size="10.5" fill="#65728a">${b.label}</text>`;
  });
  return s+"</svg>";
}
function polar(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];}
function arcPath(cx,cy,r,a0,a1){const[x1,y1]=polar(cx,cy,r,a1),[x2,y2]=polar(cx,cy,r,a0),big=(a1-a0)<=180?0:1;return `M${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${big} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;}
function svgDonut(segs){
  const R=64,th=24,cx=78,cy=78,tot=segs.reduce((s,x)=>s+x.value,0)||1; let a=0,p="";
  segs.forEach(g=>{const sw=g.value/tot*360,a0=a,a1=a+sw;a=a1;
    if(sw>=359.99){p+=`<circle cx="${cx}" cy="${cy}" r="${R-th/2}" fill="none" stroke="${g.color}" stroke-width="${th}"/>`;}
    else if(sw>0.01){p+=`<path d="${arcPath(cx,cy,R-th/2,a0,a1)}" stroke="${g.color}" stroke-width="${th}" fill="none"/>`;}});
  return `<svg viewBox="0 0 156 156" width="156" height="156">${p}<text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="11" fill="#65728a">total</text><text x="${cx}" y="${cy+15}" text-anchor="middle" font-size="14" font-weight="800" fill="#16243d">${sM(tot)}</text></svg>`;
}
function svgMonthly(months){
  const W=560,H=200,padX=28,padB=24,padT=14; const n=months.length;
  const maxG=Math.max(...months.map(m=>m.gross),1), maxC=months[n-1].cumRev||1;
  const gap=(W-2*padX)/n, bw=gap*0.6, y=v=>H-padB-(v/maxG)*(H-padT-padB);
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">`;
  months.forEach((m,i)=>{const x=padX+gap*i+(gap-bw)/2,yt=y(m.gross);
    s+=`<rect x="${x.toFixed(1)}" y="${yt.toFixed(1)}" width="${bw.toFixed(1)}" height="${(H-padB-yt).toFixed(1)}" rx="2" fill="#3b6fb5"/>`;
    s+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="9.5" fill="#65728a">${MON[i]}</text>`;});
  const pts=months.map((m,i)=>[padX+gap*i+gap/2,H-padB-(m.cumRev/maxC)*(H-padT-padB)]);
  s+=`<polyline fill="none" stroke="#2e8b57" stroke-width="2" points="${pts.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")}"/>`;
  pts.forEach(p=>s+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" fill="#2e8b57"/>`);
  return s+"</svg>";
}

// ---------- input rendering ----------
function setVals(){
  $("target").value=state.revenueTarget; $("upc").value=state.unitsPerCase; $("days").value=state.sellingDays;
  $("fixed").value=state.fixedCosts; $("growth").value=+(state.growthRate*100).toFixed(2); $("years").value=state.projectionYears;
  const sel=$("cur"); sel.innerHTML=CUR.map(c=>`<option value="${c[0]}"${c[0]===state.currency?" selected":""}>${c[1]}</option>`).join("");
}
function renderChannels(){
  const tb=$("chBody"); tb.innerHTML="";
  state.channels.forEach((c,i)=>{
    const tr=document.createElement("tr"); tr.dataset.i=i;
    tr.innerHTML=`
      <td><input class="name" type="text" data-k="name" value="${esc(c.name)}"></td>
      <td><input type="number" min="0" step="5" data-k="grossPrice" value="${c.grossPrice}"></td>
      <td><input type="number" min="0" step="1" data-k="mix" value="${c.mix}"></td>
      <td><input type="number" min="0" step="5" data-k="cogs" value="${c.cogs}"></td>
      <td><input type="number" min="0" max="100" step="1" data-k="discountPct" value="${+(c.discountPct*100).toFixed(1)}"></td>
      <td><input type="number" min="0" max="100" step="1" data-k="sellingPct" value="${+(c.sellingPct*100).toFixed(1)}"></td>
      <td class="calc oNet"></td><td class="calc oContrib"></td><td class="calc oMargin"></td>
      <td class="calc oCases"></td><td class="calc oGross"></td><td class="calc oContribT"></td>
      <td><button class="del" title="remove">✕</button></td>`;
    tr.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",e=>{
      const k=e.target.dataset.k, v=e.target.value;
      state.channels[i][k]=(k==="name")?v:(k==="discountPct"||k==="sellingPct")?(parseFloat(v)||0)/100:(parseFloat(v)||0);
      save(); renderOutputs();
    }));
    tr.querySelector(".del").addEventListener("click",()=>{if(state.channels.length>1){state.channels.splice(i,1);save();renderChannels();renderOutputs();}});
    tb.appendChild(tr);
  });
}

// ---------- output rendering ----------
function renderOutputs(){
  const m=RevenueEngine.compute(state);
  // sticky strip
  $("strip").innerHTML=[
    [fN(m.totalCases),"cases to sell","Cases needed"],
    [fM(m.grossTot),"","Gross revenue"],
    [fM(m.netTot),"","Net revenue"],
    [fM(m.contribTot),fP(m.contribMargin),"Contribution"],
    [(m.opProfit>=0?fM(m.opProfit):"−"+fM(-m.opProfit)),fP(m.opMargin),"Operating profit"],
    [fN(m.breakEvenCases),"","Break-even cases"]
  ].map((s,idx)=>`<div class="s"><div class="v ${idx===4?(m.opProfit>=0?"pos":"neg"):""}">${s[0]}${s[1]?` <small>${s[1]}</small>`:""}</div><div class="l">${s[2]}</div></div>`).join("");

  // channel rows
  $$("#chBody tr").forEach(tr=>{const i=+tr.dataset.i,r=m.channels[i];
    tr.querySelector(".oNet").textContent=fM2(r.netPrice);
    tr.querySelector(".oContrib").textContent=fM2(r.contribution);
    tr.querySelector(".oMargin").textContent=fP(r.contribMarginPct);
    tr.querySelector(".oCases").textContent=fN(r.cases);
    tr.querySelector(".oGross").textContent=fM(r.gross);
    tr.querySelector(".oContribT").textContent=fM(r.contribTot);});
  $("fGross").textContent=fM2(m.blendedGross); $("fMix").textContent=fN(m.sumMix);
  $("fCogs").textContent=fM2(m.blendedCogs); $("fNet").textContent=fM2(m.blendedNet);
  $("fContrib").textContent=fM2(m.blendedContrib); $("fMargin").textContent=fP(m.contribMargin);
  $("fCases").textContent=fN(m.totalCases); $("fGrossT").textContent=fM(m.grossTot); $("fContribT").textContent=fM(m.contribTot);

  // waterfall + kpis
  $("waterfall").innerHTML=svgWaterfall(m.waterfall);
  $("wfKpis").innerHTML=[
    ["hero",fN(m.totalCases),"Cases to sell"],
    ["",fM2(m.blendedGross),"Blended price/case"],
    ["",fM2(m.blendedGross/state.unitsPerCase),"Price / unit"],
    ["",fN(m.totalCases/12),"Cases / month"],
    ["",fN(m.totalCases/52),"Cases / week"],
    [m.opProfit>=0?"pos":"neg",(m.opProfit>=0?fM(m.opProfit):"−"+fM(-m.opProfit)),"Operating profit"]
  ].map(k=>`<div class="kpi ${k[0]==='hero'?'hero':''}"><div class="v ${k[0]==='pos'?'pos':k[0]==='neg'?'neg':''}">${k[1]}</div><div class="l">${k[2]}</div></div>`).join("");

  // bars
  const maxContrib=Math.max(...m.channels.map(r=>Math.abs(r.contribTot)),1);
  const maxCases=Math.max(...m.channels.map(r=>r.cases),1);
  $("contribBars").innerHTML=m.channels.map((r,i)=>barRow(r.name,r.contribTot/maxContrib,fM(r.contribTot),PALETTE[i%PALETTE.length])).join("");
  $("casesBars").innerHTML=m.channels.map((r,i)=>barRow(r.name,r.cases/maxCases,fN(r.cases)+" cs",PALETTE[i%PALETTE.length])).join("");

  // donut
  const segs=m.channels.map((r,i)=>({label:r.name,value:r.gross,color:PALETTE[i%PALETTE.length]}));
  $("donut").innerHTML=svgDonut(segs);
  $("donutLeg").innerHTML=segs.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.label)} ${fP(s.value/(m.grossTot||1))}</span>`).join("");

  // break-even
  const be=m.breakEvenCases, beRevPctOfTarget=isFinite(be)?be/(m.totalCases||1):1;
  $("beText").innerHTML=isFinite(be)
    ? `Break-even at <b>${fN(be)}</b> cases (<b>${fM(m.breakEvenRev)}</b> gross) — that's <b>${fP(beRevPctOfTarget)}</b> of your target volume. Above it you keep <b>${fM2(m.blendedContrib)}</b> contribution per extra case.`
    : `Contribution per case is ≤ 0 at these prices — the model can't break even. Raise price, cut COGS or reduce discounts.`;
  const frac=Math.min(1,Math.max(0,beRevPctOfTarget));
  $("beFill").style.width="100%"; $("beMark").style.left=(frac*100)+"%";

  // scenarios
  $("scenarios").innerHTML=m.scenarios.map((s,i)=>{
    const cls=i===0?"cons":i===1?"base":"aggr";
    return `<div class="col ${cls}"><h3>${esc(s.label)}</h3>
      <div class="row"><span>Revenue target</span><input type="number" data-si="${i}" step="50000" value="${s.target}"></div>
      <div class="row"><span>Cases to sell</span><b>${fN(s.cases)}</b></div>
      <div class="row"><span>Net revenue</span><b>${fM(s.net)}</b></div>
      <div class="row"><span>Contribution</span><b>${fM(s.contribution)} <small class="calc">(${fP(s.margin)})</small></b></div>
      <div class="row"><span>Operating profit</span><b style="color:${s.opProfit>=0?'var(--green)':'var(--red)'}">${s.opProfit>=0?fM(s.opProfit):'−'+fM(-s.opProfit)}</b></div>
    </div>`;}).join("");
  $$('#scenarios input[data-si]').forEach(inp=>inp.addEventListener("input",e=>{state.scenarios[+e.target.dataset.si].target=parseFloat(e.target.value)||0;save();renderOutputs();}));

  // projection
  let pt=`<thead><tr><th>Year</th><th>Revenue</th><th>Cases</th><th>Contribution</th><th>Op. profit</th></tr></thead><tbody>`;
  pt+=m.years.map(y=>`<tr><td>Y${y.year}</td><td>${fM(y.revenue)}</td><td>${fN(y.cases)}</td><td>${fM(y.contribution)}</td><td style="color:${y.opProfit>=0?'var(--green)':'var(--red)'}">${y.opProfit>=0?fM(y.opProfit):'−'+fM(-y.opProfit)}</td></tr>`).join("");
  $("projTable").innerHTML=pt+"</tbody>";
  const maxRev=Math.max(...m.years.map(y=>y.revenue),1);
  $("projBars").innerHTML=m.years.map(y=>barRow("Y"+y.year,y.revenue/maxRev,fM(y.revenue),"#2e5496")).join("");

  // monthly
  $("monthChart").innerHTML=svgMonthly(m.months);
  let mt=`<thead><tr><th>Month</th><th>Weight</th><th>Mix %</th><th>Cases</th><th>Gross rev</th><th>Contribution</th><th>Cum. cases</th><th>Cum. rev</th></tr></thead><tbody>`;
  mt+=m.months.map((mm,i)=>`<tr><td>${MON[i]}</td>
     <td><input type="number" step="0.1" min="0" data-mi="${i}" value="${state.seasonality[i]}" style="width:64px"></td>
     <td>${fP(mm.frac)}</td><td>${fN(mm.cases)}</td><td>${fM(mm.gross)}</td><td>${fM(mm.contribution)}</td><td>${fN(mm.cumCases)}</td><td>${fM(mm.cumRev)}</td></tr>`).join("");
  $("monthTable").innerHTML=mt+"</tbody>";
  $$('#monthTable input[data-mi]').forEach(inp=>inp.addEventListener("input",e=>{state.seasonality[+e.target.dataset.mi]=parseFloat(e.target.value)||0;save();renderOutputs();}));

  // pure-play
  let pp=`<thead><tr><th>Channel</th><th>Gross/case</th><th>Cases to hit target</th><th>Units</th><th>Contribution at that volume</th></tr></thead><tbody>`;
  pp+=m.channels.map(r=>{const cs=r.grossPrice>0?state.revenueTarget/r.grossPrice:0;return `<tr><td>${esc(r.name)}</td><td>${fM(r.grossPrice)}</td><td><b>${fN(cs)}</b></td><td>${fN(cs*state.unitsPerCase)}</td><td>${fM(cs*r.contribution)}</td></tr>`;}).join("");
  $("pureTable").innerHTML=pp+"</tbody>";

  // profit heat grid (price × volume)
  const sumMix=m.sumMix; let disc=0,sell=0,cogs=0;
  state.channels.forEach((c,i)=>{const w=c.mix/sumMix;disc+=c.discountPct*w;sell+=c.sellingPct*w;cogs+=c.cogs*w;});
  const contribAt=p=>p*(1-disc)*(1-sell)-cogs;
  const prices=[0.6,0.8,1.0,1.2,1.4].map(f=>Math.round(m.blendedGross*f/5)*5);
  const vols=[0.5,0.75,1.0,1.25,1.5,1.75].map(f=>Math.round(m.totalCases*f/100)*100);
  const cells=[]; prices.forEach(p=>vols.forEach(v=>cells.push(v*contribAt(p)-state.fixedCosts)));
  const mn=Math.min(...cells,0), mx=Math.max(...cells,0);
  let ht=`<thead><tr><th>Price ╲ Cases</th>${vols.map(v=>`<th>${fN(v)}</th>`).join("")}</tr></thead><tbody>`;
  ht+=prices.map(p=>`<tr><td>${fM(p)}</td>${vols.map(v=>{const op=v*contribAt(p)-state.fixedCosts;return `<td style="background:${heat(op,mn,mx)}" title="${fM(op)}">${sM(op)}</td>`;}).join("")}</tr>`).join("");
  $("heatTable").innerHTML=ht+"</tbody>";

  // two-way calc
  whatif(disc,sell,cogs);
}
function whatif(disc,sell,cogs){
  const p=parseFloat($("wfPrice").value)||0, cs=parseFloat($("wfCases").value)||0, rev=parseFloat($("wfRev").value)||0;
  const contribCase=p*(1-disc)*(1-sell)-cogs, prof=cs*contribCase-state.fixedCosts;
  $("wfOut").innerHTML=[
    ["hero",fM(cs*p),`Revenue · ${fN(cs)} cs @ ${fM(p)}`],
    ["",p>0?fN(rev/p):"—",`Cases for ${fM(rev)} @ ${fM(p)}`],
    ["",fM2(contribCase),"Contribution / case"],
    [prof>=0?"pos":"neg",prof>=0?fM(prof):"−"+fM(-prof),"Operating profit"]
  ].map(k=>`<div class="kpi ${k[0]==='hero'?'hero':''}"><div class="v ${k[0]==='pos'?'pos':k[0]==='neg'?'neg':''}">${k[1]}</div><div class="l">${k[2]}</div></div>`).join("");
}
function barRow(name,frac,label,color){
  const w=Math.max(0,Math.min(100,frac*100));
  return `<div class="b"><div class="nm" title="${esc(name)}">${esc(name)}</div><div class="track"><div class="fill" style="width:${w}%;background:${color}"></div></div><div class="val">${label}</div></div>`;
}
function heat(v,mn,mx){
  if(v>=0){const t=mx>0?v/mx:0;return `hsl(145 55% ${92-t*42}%)`;}
  const t=mn<0?v/mn:0;return `hsl(5 70% ${92-t*40}%)`;
}

// ---------- export / wiring ----------
function exportCsv(){
  const m=RevenueEngine.compute(state); const rows=[];
  rows.push(["Revenue & Profit Forecast"]);
  rows.push(["Currency",state.currency,"Target",state.revenueTarget,"Fixed costs",state.fixedCosts]);
  rows.push([]);
  rows.push(["Channel","Gross/case","Mix","COGS","Discount%","Selling%","Net/case","Contrib/case","Margin%","Cases","Gross$","Contrib$"]);
  m.channels.forEach((r,i)=>{const c=state.channels[i];rows.push([r.name,r.grossPrice,c.mix,r.cogs,(c.discountPct*100).toFixed(1),(c.sellingPct*100).toFixed(1),r.netPrice.toFixed(2),r.contribution.toFixed(2),(r.contribMarginPct*100).toFixed(1),Math.round(r.cases),Math.round(r.gross),Math.round(r.contribTot)]);});
  rows.push([]);
  rows.push(["Totals","Blended gross",m.blendedGross.toFixed(2),"Cases",Math.round(m.totalCases),"Gross",Math.round(m.grossTot),"Net",Math.round(m.netTot),"Contribution",Math.round(m.contribTot),"Op profit",Math.round(m.opProfit)]);
  rows.push(["Break-even cases",Math.round(m.breakEvenCases),"Break-even revenue",Math.round(m.breakEvenRev)]);
  rows.push([]);
  rows.push(["Scenario","Target","Cases","Net","Contribution","Op profit"]);
  m.scenarios.forEach(s=>rows.push([s.label,s.target,Math.round(s.cases),Math.round(s.net),Math.round(s.contribution),Math.round(s.opProfit)]));
  const csv=rows.map(r=>r.map(x=>{const v=String(x??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="revenue-forecast.csv";a.click();
}
function bindAssumptions(){
  const map={target:"revenueTarget",upc:"unitsPerCase",days:"sellingDays",fixed:"fixedCosts",years:"projectionYears"};
  Object.keys(map).forEach(id=>$(id).addEventListener("input",()=>{state[map[id]]=parseFloat($(id).value)||0;save();renderOutputs();}));
  $("growth").addEventListener("input",()=>{state.growthRate=(parseFloat($("growth").value)||0)/100;save();renderOutputs();});
  $("cur").addEventListener("change",()=>{state.currency=$("cur").value;save();renderOutputs();});
  ["wfPrice","wfCases","wfRev"].forEach(id=>$(id).addEventListener("input",()=>renderOutputs()));
  $("btnAdd").addEventListener("click",()=>{state.channels.push({name:"New channel",grossPrice:150,mix:5,cogs:90,discountPct:0,sellingPct:0.05});save();renderChannels();renderOutputs();});
  $("btnReset").addEventListener("click",()=>{if(confirm("Reset all inputs to the sample model?")){state=clone(DEFAULTS);save();setVals();initWf();renderChannels();renderOutputs();}});
  $("btnCsv").addEventListener("click",exportCsv);
  $("btnPrint").addEventListener("click",()=>window.print());
}
function initWf(){$("wfPrice").value=190;$("wfCases").value=13165;$("wfRev").value=state.revenueTarget;}
setVals(); initWf(); bindAssumptions(); renderChannels(); renderOutputs();
</script>
</body>
</html>
"""

html = TEMPLATE.replace("/*__ENGINE__*/", ENGINE)
pathlib.Path("revenue-forecast.html").write_text(html)
print("wrote revenue-forecast.html (%d KB, engine inlined)" % (len(html) // 1024))
