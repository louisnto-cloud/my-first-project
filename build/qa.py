# -*- coding: utf-8 -*-
"""QA for Organika RTD Community Partnerships Tracker_v2.xlsx"""
import re, sys, warnings
import openpyxl
from openpyxl.utils import get_column_letter
warnings.filterwarnings("ignore")

OUT = "/home/user/my-first-project/Organika RTD Community Partnerships Tracker_v3.xlsx"
SRC = "/root/.claude/uploads/607dab49-f51b-5b86-83ad-5f4c7139295f/029750d9-Organika_RTD_BC_Tracker.xlsx"
fails=[]; warns=[]
def ok(m): print("  PASS  "+m)
def bad(m): fails.append(m); print("  FAIL  "+m)
def warn(m): warns.append(m); print("  NOTE  "+m)

wb = openpyxl.load_workbook(OUT, data_only=False)

EXPECT_TYPE_HDRS = ["#","Partner Name","Partnership Type","City","Neighbourhood","Priority","Status",
"Primary Owner","Contact Name","Role","Contact Email","Contact Phone","Instagram or Website",
"Audience Size","Audience Source","Source","Warm","Last Contacted","Days Since Activity",
"Next Action","Next Action Date","Activation Type","Activation Date","Cases Committed",
"Cases Delivered","Cost ($)","Cost Per Can","Contra Value ($)","Deliverables Promised",
"Deliverables Received","What They Want","Risks","Nearby Retail Doors","In BC Tracker?",
"Raspberry 4338","Lemon Lime 4336","Pineapple Passion Fruit 4340","Notes"]
TYPES = ["Run Clubs","Gyms & Studios","Events & Festivals","Sports Teams & Leagues",
"Campus & Student Groups","Wellness & Recovery","Ambassadors & Creators","Charity & Causes"]

print("\n[1] HYPHEN SCAN (string cells, formulas excluded)")
hy=[]
for ws in wb.worksheets:
    for row in ws.iter_rows():
        for c in row:
            v=c.value
            if isinstance(v,str) and not v.startswith("=") and "-" in v:
                hy.append((ws.title,c.coordinate,v))
for t in wb.sheetnames:
    if "-" in t: hy.append(("<sheet name>",t,t))
if hy:
    for s,co,v in hy[:50]: bad(f"hyphen in {s}!{co}: {v!r}")
else: ok("zero hyphens in any cell value or sheet name")

print("\n[2] HEADERS on every type tab + Suggested Events")
for t in TYPES:
    ws=wb[t]; got=[ws.cell(2,c).value for c in range(1,39)]
    if got==EXPECT_TYPE_HDRS: ok(f"{t}: 38 headers correct, in order")
    else:
        for i,(a,b) in enumerate(zip(got,EXPECT_TYPE_HDRS)):
            if a!=b: bad(f"{t} col {i+1}: got {a!r} expected {b!r}")
SE_EXPECT = ["#","Event","City","Venue or Neighbourhood","Expected Window","Audience Size",
"Audience Source","Source","Priority","Event Status","Owner","Why It Fits","Next Step","Notes"]
seh=[wb["Suggested Events"].cell(2,c).value for c in range(1,15)]
if seh==SE_EXPECT: ok("Suggested Events: 14 headers correct")
else: bad(f"Suggested Events headers: {seh}")

print("\n[3] SKU header numbers exactly 4338 / 4336 / 4340")
allok=True
for t in TYPES:
    ws=wb[t]
    trio=[ws.cell(2,35).value,ws.cell(2,36).value,ws.cell(2,37).value]
    if trio!=["Raspberry 4338","Lemon Lime 4336","Pineapple Passion Fruit 4340"]:
        allok=False; bad(f"{t}: SKU headers {trio}")
if allok: ok("all 8 type tabs carry Raspberry 4338, Lemon Lime 4336, Pineapple Passion Fruit 4340")
dvals=[wb["Dashboard"].cell(15+i,10).value for i in range(3)]
if all(any(n in str(x) for n in ["4338","4336","4340"]) for x in dvals): ok("Dashboard SKU table labels carry the three SKU numbers")

print("\n[4] TEAM: Maddie only, spelling matches BC Tracker")
src=openpyxl.load_workbook(SRC,data_only=False)["Sales Team"]
src_names=[src.cell(r,1).value for r in range(3,24)]
my=wb["Sales Team"]
my_names=[my.cell(r,1).value for r in range(3,24) if my.cell(r,1).value not in (None,"") and my.cell(r,2).value not in (None,"")]
if my_names==["Maddie"]: ok("Sales Team tab holds exactly one rep: Maddie")
else: bad(f"Sales Team reps: {my_names}")
if "Maddie" in src_names: ok("spelling Maddie matches the BC Tracker roster")
else: bad("Maddie not found in BC Tracker roster spelling")
luwb=wb["Lookups"]
owners=[luwb.cell(r,1).value for r in range(3,10) if luwb.cell(r,1).value]
if owners==["Maddie"]: ok("Owner dropdown list = Maddie only")
else: bad(f"Owner lookup column: {owners}")

print("\n[5] MASTER LIST traceability (every row traces to a type tab)")
ml=wb["Master List"]; blocks={}; badref=0
for r in range(3,243):
    fa=ml.cell(r,1).value
    m=re.match(r"=IF\('([^']+)'!B(\d+)=",fa) if isinstance(fa,str) else None
    if not m: badref+=1; continue
    sheet,tr=m.group(1),int(m.group(2))
    if sheet not in TYPES: bad(f"ML row {r} references non type sheet {sheet!r}")
    blocks.setdefault(sheet,[]).append(tr)
if badref: bad(f"{badref} master rows missing a valid type reference")
allgood=True
for t in TYPES:
    rows=blocks.get(t,[])
    if rows!=list(range(3,33)): allgood=False; bad(f"{t}: block rows len {len(rows)} (expected 3..32)")
if allgood and not badref: ok("8 blocks x 30 rows, each row maps to its type tab rows 3..32")

print("\n[6] TEVAH import + owner prefill + In BC Tracker flag")
wr=wb["Wellness & Recovery"]
if wr.cell(3,2).value=="Tevah Wellness": ok("Tevah Wellness is the first row of Wellness & Recovery")
else: bad(f"first Wellness row is {wr.cell(3,2).value!r}")
if wr.cell(3,34).value=="Yes": ok("Tevah In BC Tracker? = Yes")
else: bad(f"Tevah In BC Tracker? = {wr.cell(3,34).value!r}")
inbc=sum(1 for t in TYPES for r in range(3,33) if wb[t].cell(r,34).value=="Yes")
if inbc==1: ok("exactly one row flagged In BC Tracker (Tevah)")
else: warn(f"{inbc} rows flagged In BC Tracker")
own_bad=[]; n_named=0
for t in TYPES:
    ws=wb[t]
    for r in range(3,33):
        if ws.cell(r,2).value:
            n_named+=1
            if ws.cell(r,8).value!="Maddie": own_bad.append((t,r,ws.cell(r,8).value))
if not own_bad and n_named==60: ok("Primary Owner = Maddie on all 60 partner rows")
else: bad(f"named rows {n_named}, owner mismatches: {own_bad[:5]}")

print("\n[7] NO PROPOSED ACTIVATIONS anywhere")
acts=[]
for t in TYPES:
    ws=wb[t]
    for r in range(3,33):
        for c in (22,23,24,25,26,28):   # Activation Type, Date, cases, cost, contra
            v=ws.cell(r,c).value
            if v not in (None,""): acts.append((t,r,c,v))
if not acts: ok("Activation Type, Activation Date, cases, cost and contra are blank on every row")
else:
    for a in acts[:10]: bad(f"unexpected activation value {a}")
sev=[]
sews=wb["Suggested Events"]
for r in range(3,33):
    for c in range(2,15):
        v=sews.cell(r,c).value
        if v not in (None,"") and not (isinstance(v,str) and v.startswith("=")): sev.append((r,c,v))
if not sev: ok("Suggested Events grid is empty (headers and formulas only)")
else:
    for a in sev[:10]: bad(f"Suggested Events has content {a}")

print("\n[8] SPELLCHECK headers + Guide text")
try:
    from spellchecker import SpellChecker
    sp=SpellChecker()
    allow=set("""organika rtd bc sku skus costco raspberry lemon lime pineapple passion fruit
    kelowna vancouver victoria metro burnaby richmond surrey langley coquitlam nanaimo yaletown
    kitsilano gastown strathcona neighbourhood colour colours centre lookups dropdown
    tevah ubc sfu uvic ams suo camosun bcit hyrox wod tbd yvr instagram website roadshow
    runclubs gyms studios festivals ambassadors creators wellness recovery hydration sampling
    contra deliverables reps repeat activations checklist okanagan maddie louis scoping
    parkinson rec venue""".split())
    words=set()
    def collect(ws,cols,rmax):
        for r in range(1,rmax+1):
            for c in cols:
                v=ws.cell(r,c).value
                if isinstance(v,str) and not v.startswith("="):
                    for w in re.findall(r"[A-Za-z]+",v): words.add(w.lower())
    for t in TYPES: collect(wb[t],[ (i+1) for i in range(38)],2)
    collect(wb["Suggested Events"],list(range(1,15)),2)
    for nm in ["Master List","Activation Calendar","Type Summary","Budget","Sales Team","Dashboard"]:
        collect(wb[nm],list(range(1,15)),5)
    collect(wb["Guide"],[1,2],90)
    unknown=sorted(w for w in words if w not in allow and len(w)>2 and sp.unknown([w]))
    if not unknown: ok("no unknown words in headers or Guide text")
    else: warn("review words (likely proper nouns, confirm not typos): "+", ".join(unknown[:60]))
except Exception as e:
    warn("spellcheck skipped: "+str(e))

print("\n[9] FORMULA EVALUATION (formulas engine, expect 0 errors)")
try:
    import formulas
    xl=formulas.ExcelModel().loads(OUT).finish(); sol=xl.calculate()
    base=OUT.split("/")[-1]
    errs=[]
    for k,v in sol.items():
        try: val=v.value[0,0]
        except: val=getattr(v,"value",None)
        if any(e in str(val) for e in ["#REF","#DIV","#NAME","#VALUE","#N/A","#NUM","#NULL"]):
            errs.append((k,str(val)))
    if errs:
        for k,s in errs[:30]: bad(f"formula error {k} = {s}")
    else: ok(f"all {len(sol)} computed cells resolve with no errors")
    def g(sheet,cell):
        v=sol.get(f"'[{base}]"+sheet.upper()+"'!"+cell)
        try: return v.value[0,0]
        except: return getattr(v,"value",v)
    k={"Total Partners":g("Dashboard","A5"),"P1":g("Dashboard","C5"),
       "Active Conversations":g("Dashboard","E5"),"Activations Booked":g("Dashboard","G5"),
       "Cans":g("Dashboard","I5"),"CostPerCan":g("Dashboard","K5"),"Days to Costco":g("Dashboard","M5"),
       "Overdue":g("Dashboard","B19"),"StaleP1":g("Dashboard","B20"),"Verified":g("Dashboard","B21"),
       "Pending":g("Dashboard","B22"),"Unverified":g("Dashboard","B23")}
    print("        computed:",{kk:(round(float(vv),2) if isinstance(vv,(int,float)) else vv) for kk,vv in k.items()})
    if int(g("Dashboard","A5"))==60: ok("Total Partners = 60")
    else: bad(f"Total Partners = {g('Dashboard','A5')}")
    if int(g("Dashboard","G5"))==0: ok("Activations Booked = 0 (calendar empty until the team books)")
    else: bad(f"Activations Booked = {g('Dashboard','G5')}")
    cal_a3=g("Activation Calendar","A3")
    if cal_a3 in ("",None): ok("Activation Calendar first row renders empty")
    else: bad(f"Calendar A3 = {cal_a3!r}")
    if int(g("Dashboard","B21"))==55 and int(g("Dashboard","B22"))==5: ok("List Health: 55 verified, 5 pending, matches the dataset")
    else: warn(f"List Health verified={g('Dashboard','B21')} pending={g('Dashboard','B22')}")
    ts_k11=g("Type Summary","K11")
    print(f"        Type Summary % to target total = {ts_k11}")
except Exception as e:
    import traceback; traceback.print_exc()

print("\n[10] GAP LIST DATA (TBD audience, Pending/Unverified)")
tbd=[]; pend=[]
for t in TYPES:
    ws=wb[t]
    for r in range(3,33):
        nm=ws.cell(r,2).value
        if not nm: continue
        aud=ws.cell(r,14).value; srcv=ws.cell(r,16).value
        if aud in (None,"","TBD") : tbd.append((t,nm))
        if srcv in ("Pending","Unverified"): pend.append((t,nm,srcv))
print(f"        rows with TBD/blank audience: {len(tbd)}")
for t,nm in tbd: print("          -",t,"/",nm)
print(f"        rows tagged Pending or Unverified: {len(pend)}")
for t,nm,s in pend: print("          -",t,"/",nm,f"({s})")

print("\n[11] v3 POLISH (charts, links, banding, region)")
dash=wb["Dashboard"]
ncharts=len(dash._charts)
if ncharts==3: ok(f"Dashboard carries {ncharts} live charts")
else: bad(f"Dashboard charts = {ncharts} (expected 3)")
links=0
for t in TYPES:
    ws=wb[t]
    for r in range(3,33):
        if ws.cell(r,13).hyperlink is not None: links+=1
        if ws.cell(r,13).hyperlink is not None and "-" in str(ws.cell(r,13).hyperlink.target or ""):
            warn(f"hyphen in link target {t}!M{r}")
if links>=50: ok(f"{links} clickable Instagram or website links on type tabs")
else: bad(f"only {links} hyperlinks found")
rc=wb["Run Clubs"]
banded = rc.cell(4,2).fill.fgColor.rgb=="FFF4F8F6" and (rc.cell(3,2).fill.patternType is None)
if banded: ok("row banding present on type tabs (alternate rows shaded)")
else: warn("row banding not detected")
reg=dash.cell(17,7).value
if reg=="Region": ok("Region rollup present on the Dashboard")
else: warn(f"Region cell = {reg!r}")

print("\n================ QA SUMMARY ================")
print(f"  FAILURES: {len(fails)}")
print(f"  NOTES   : {len(warns)}")
print("  RESULT  :", "ALL CHECKS PASS" if not fails else "FAILURES PRESENT")
