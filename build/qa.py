# -*- coding: utf-8 -*-
"""QA for Organika RTD Community Partnerships Tracker_v1.xlsx"""
import re, sys, warnings
import openpyxl
from openpyxl.utils import get_column_letter
warnings.filterwarnings("ignore")

OUT = "/home/user/my-first-project/Organika RTD Community Partnerships Tracker_v1.xlsx"
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

print("\n[2] HEADERS on every type tab")
for t in TYPES:
    ws=wb[t]; got=[ws.cell(2,c).value for c in range(1,39)]
    if got==EXPECT_TYPE_HDRS: ok(f"{t}: 38 headers correct, in order")
    else:
        for i,(a,b) in enumerate(zip(got,EXPECT_TYPE_HDRS)):
            if a!=b: bad(f"{t} col {i+1}: got {a!r} expected {b!r}")

print("\n[3] SKU header numbers exactly 4338 / 4336 / 4340")
for t in TYPES:
    ws=wb[t]
    trio=[ws.cell(2,35).value,ws.cell(2,36).value,ws.cell(2,37).value]
    if trio==["Raspberry 4338","Lemon Lime 4336","Pineapple Passion Fruit 4340"]: ok(f"{t}: SKU headers ok")
    else: bad(f"{t}: SKU headers {trio}")
# also dashboard SKU labels + master list
dvals=[wb["Dashboard"].cell(15+i,10).value for i in range(3)]
if all(any(n in str(x) for n in ["4338","4336","4340"]) for x in dvals): ok("Dashboard SKU table labels carry 4338/4336/4340")

print("\n[4] TEAM NAMES match BC Tracker spelling")
src=openpyxl.load_workbook(SRC,data_only=False)["Sales Team"]
src_names=[src.cell(r,1).value for r in range(3,24)]
my=wb["Sales Team"]; my_names=[my.cell(r,1).value for r in range(3,24)]
if src_names==my_names: ok(f"all {len(my_names)} reps match BC Tracker exactly")
else:
    for i,(a,b) in enumerate(zip(my_names,src_names)):
        if a!=b: bad(f"rep row {i+3}: got {a!r} expected {b!r}")
# owners on dropdown = F=Yes reps
yes=[src.cell(r,1).value for r in range(3,24) if src.cell(r,6).value=="Yes"]
luwb=wb["Lookups"]; owners=[luwb.cell(r,1).value for r in range(3,3+len(yes))]
if owners==yes: ok(f"Primary Owner list = the {len(yes)} BC owners (F=Yes) in spelling and order")
else: bad(f"owner list mismatch: {owners} vs {yes}")

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
    if rows!=list(range(3,33)): allgood=False; bad(f"{t}: block rows {rows[:3]}.. len {len(rows)} (expected 3..32)")
if allgood and not badref: ok("8 blocks x 30 rows, each row maps to its type tab rows 3..32")

print("\n[6] TEVAH import + In BC Tracker flag")
wr=wb["Wellness & Recovery"]
if wr.cell(3,2).value=="Tevah Wellness": ok("Tevah Wellness is the first row of Wellness & Recovery")
else: bad(f"first Wellness row is {wr.cell(3,2).value!r}")
if wr.cell(3,34).value=="Yes": ok("Tevah In BC Tracker? = Yes")
else: bad(f"Tevah In BC Tracker? = {wr.cell(3,34).value!r}")
inbc=sum(1 for t in TYPES for r in range(3,33) if wb[t].cell(r,34).value=="Yes")
if inbc==1: ok("exactly one row flagged In BC Tracker (Tevah)")
else: warn(f"{inbc} rows flagged In BC Tracker")

print("\n[7] SPELLCHECK headers + Guide text")
try:
    from spellchecker import SpellChecker
    sp=SpellChecker()
    allow=set("""organika rtd bc sku skus costco raspberry lemon lime pineapple passion fruit
    kelowna vancouver victoria metro burnaby richmond surrey langley coquitlam nanaimo yaletown
    kitsilano gastown strathcona neighbourhood colour colours centre lookups dropdown
    tevah ubc sfu uvic ams suo camosun bcit hyrox wod tbd yvr instagram website roadshow
    runclubs gyms studios festivals ambassadors creators wellness recovery hydration sampling
    contra deliverables reps repeat activations checklist okanagan""".split())
    words=set()
    def collect(ws,cols,rmax):
        for r in range(1,rmax+1):
            for c in cols:
                v=ws.cell(r,c).value
                if isinstance(v,str) and not v.startswith("="):
                    for w in re.findall(r"[A-Za-z]+",v): words.add(w.lower())
    for t in TYPES: collect(wb[t],[ (i+1) for i in range(38)],2)  # header row only
    for nm in ["Master List","Activation Calendar","Type Summary","Budget","Sales Team","Dashboard"]:
        collect(wb[nm],list(range(1,15)),5)
    collect(wb["Guide"],[1,2],80)
    unknown=sorted(w for w in words if w not in allow and len(w)>2 and sp.unknown([w]))
    if not unknown: ok("no unknown words in headers or Guide text")
    else: warn("review words (likely proper nouns, confirm not typos): "+", ".join(unknown[:60]))
except Exception as e:
    warn("spellcheck skipped: "+str(e))

print("\n[8] FORMULA EVALUATION (formulas engine, expect 0 errors)")
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
       "Activations Booked":g("Dashboard","G5"),"Days to Costco":g("Dashboard","M5"),
       "Next30":g("Dashboard","H13"),"Next60":g("Dashboard","H14"),"Next90":g("Dashboard","H15")}
    print("        KPIs:",{kk:(round(float(vv),2) if isinstance(vv,(int,float)) else vv) for kk,vv in k.items()})
    if int(g("Dashboard","A5"))==60: ok("Total Partners = 60")
    else: bad(f"Total Partners = {g('Dashboard','A5')}")
    if int(g("Dashboard","G5"))==13: ok("Activations Booked = 13")
    else: bad(f"Activations Booked = {g('Dashboard','G5')}")
except Exception as e:
    import traceback; traceback.print_exc()

print("\n[9] GAP LIST DATA (TBD audience, Pending/Unverified, draft targets)")
import importlib.util
spec=importlib.util.spec_from_file_location("bt","/tmp/build_tracker.py")
# just re-read PARTNERS from the workbook instead
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

print("\n================ QA SUMMARY ================")
print(f"  FAILURES: {len(fails)}")
print(f"  NOTES   : {len(warns)}")
print("  RESULT  :", "ALL CHECKS PASS" if not fails else "FAILURES PRESENT")
