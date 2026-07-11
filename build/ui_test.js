// Headless UI smoke test for the dashboard: loads the built HTML in jsdom with a
// Chart.js stub, checks rendering + interactivity, and exits non-zero on any failure.
// Run: NODE_PATH=<repo>/node_modules node build/ui_test.js   (needs jsdom installed)
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const HTML=path.join(__dirname,'..','MUV_RTD_Forecast_Dashboard_v1.html');
let html=fs.readFileSync(HTML,'utf8');
const stub=`<script>
 window.Chart=function(ctx,cfg){this.data=cfg.data;this.options=cfg.options;this.update=function(){};this.destroy=function(){};};
 window.Chart.defaults={color:'',font:{family:'',size:12}};
</script>`;
html=html.replace(/<script id="chartjs">[\s\S]*?<\/script>/, stub);
const errors=[]; const vc=new VirtualConsole();
vc.on('jserror',e=>errors.push('jserror: '+(e&&e.message))); vc.on('error',e=>errors.push('error: '+e));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document;
w.HTMLCanvasElement.prototype.getContext=()=>({createLinearGradient:()=>({addColorStop(){}}),
  fillRect(){},clearRect(){},save(){},restore(){},beginPath(){},arc(){},fill(){},measureText:()=>({width:40}),
  moveTo(){},arcTo(){},closePath(){},stroke(){},fillText(){}});
const sleep=ms=>new Promise(r=>w.setTimeout(r,ms));
const T=(n,c)=>{console.log((c?'  ok   ':'  FAIL ')+n); if(!c) global._f=(global._f||0)+1;};
const gt=id=>d.getElementById(id).textContent.trim();
(async()=>{
  await sleep(900);
  console.log('JS errors on load:', errors.length?errors:'NONE'); if(errors.length) global._f=1;
  T('chartjs inlined & stripped', !/cdn\.jsdelivr/.test(html));
  T('goalBig = $2,960,558  ('+gt('goalBig')+')', gt('goalBig')==='$2,960,558');
  T('goalPill = 98.7%', gt('goalPill')==='98.7%');
  T('ring tip moved', d.getElementById('ringTip').getAttribute('cx')!=='105');
  T('scenario cards = 3', d.querySelectorAll('#scenCards .scard').length===3);
  T('gap chips = 3', d.querySelectorAll('#gapChips .chip').length===3);
  T('sliders = 5', d.querySelectorAll('#sliders input').length===5);
  T('explore list populated', d.querySelectorAll('#exList .exRow').length>=7);
  T('map tiles = 10', d.querySelectorAll('#tilemap .ptile').length===10);
  [...d.querySelectorAll('#scenCards .scard')].find(e=>/Bull/.test(e.textContent)).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await sleep(800);
  T('Bull -> $3,890,469', gt('goalBig')==='$3,890,469');
  T('Bull -> goal reached', /reached/i.test(gt('gapTitle')));
  d.getElementById('gcReset').dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await sleep(700);
  T('reset -> $2,960,558', gt('goalBig')==='$2,960,558');
  [...d.querySelectorAll('#gapChips .chip')].find(e=>/price/i.test(e.textContent)).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await sleep(800);
  T('price chip -> $3,000,000', gt('goalBig')==='$3,000,000');
  d.getElementById('resetBtn').dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await sleep(500);
  d.querySelector('#basisSeg button[data-basis="Sell-through"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await sleep(700);
  T('sell-through -> $6,466,472', gt('goalBig')==='$6,466,472');
  d.querySelector('#viewSeg button[data-view="sensitivity"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await sleep(300);
  T('sensitivity list = 5', d.querySelectorAll('#exList .exRow').length===5);
  console.log('\nUI TEST '+(global._f?'FAILED ('+global._f+')':'PASSED'));
  process.exit(global._f?1:0);
})();
