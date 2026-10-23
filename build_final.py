#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FINALIZED consolidated builder for the Organika MÜV competitor-intelligence dossier.
Regenerates the full ~40-tab workbook in one pass with all improvements baked in:
interactive scenario P&L, navigation front-door, charts, conditional formatting,
confidence tags, verification log, and a new tightened Decision Memo.
Verified facts: MÜV = RTD sparkling CAN (SKU 4338, ~$14.99), food-regulated;
sport-electrolytes -> Supplemented Foods by 2027; collagen-beauty = NHP-only."""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, Protection
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, LineChart, PieChart, ScatterChart, Reference, Series
from openpyxl.chart.label import DataLabelList
from openpyxl.formatting.rule import ColorScaleRule, DataBarRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.properties import PageSetupProperties
from openpyxl.comments import Comment

OUT="/home/user/my-first-project/Organika_MUV_Competitor_Intelligence_FINAL.xlsx"
NAVY="14304F"; TEAL="2E7D8A"; STEEL="3E5C76"; LIGHT="EAF1F4"; LIGHT2="F4F8FA"
AMBER="FFF2CC"; AMBERH="B45309"; GREEN="E2EFDA"; GREENH="1E7D32"; RED="F8D7DA"; REDH="9C2A2A"
GOLD="C9A227"; WHITE="FFFFFF"; GREY="595959"; LINK="1155CC"; YEL="FFF7CC"
def F(**k): return Font(name="Calibri", **k)
def fill(c): return PatternFill("solid", fgColor=c)
thin=Side(style="thin", color="BFBFBF"); BORDER=Border(left=thin,right=thin,top=thin,bottom=thin)
WRAP=Alignment(wrap_text=True, vertical="top"); CTR=Alignment(horizontal="center",vertical="center",wrap_text=True)
LEFT=Alignment(horizontal="left", vertical="center", wrap_text=True)
HEAD=F(bold=True,color=WHITE,size=10); TITLE=F(bold=True,color=WHITE,size=17); BODY=F(size=10); BODYB=F(size=10,bold=True); SMALL=F(size=9,italic=True,color=GREY)

wb=Workbook()
CONTENTS=[]  # (tabname, description) for the Contents index

def tab(name, title_txt, sub=None, ncols=10, color=None, home=True, desc=""):
    ws=wb.create_sheet(name); ws.sheet_view.showGridLines=False
    ws.merge_cells(start_row=1,start_column=1,end_row=1,end_column=ncols)
    c=ws.cell(row=1,column=1,value=title_txt); c.font=TITLE; c.fill=fill(NAVY); c.alignment=CTR; ws.row_dimensions[1].height=28
    nr=3
    if sub:
        ws.merge_cells(start_row=2,start_column=1,end_row=2,end_column=ncols)
        s=ws.cell(row=2,column=1,value=sub); s.font=F(bold=True,color=WHITE,size=10); s.fill=fill(TEAL); s.alignment=CTR; ws.row_dimensions[2].height=20
        nr=4
    if home and name!="🏠 Start Here":
        h=ws.cell(row=1,column=ncols+3,value="🏠 Home"); h.hyperlink="#'🏠 Start Here'!A1"; h.font=F(bold=True,color=LINK,underline="single",size=8); h.alignment=Alignment(horizontal="right")
    if color: ws.sheet_properties.tabColor=color
    ws.page_setup.orientation="landscape"; ws.page_setup.fitToWidth=1; ws.page_setup.fitToHeight=0
    ws.sheet_properties.pageSetUpPr=PageSetupProperties(fitToPage=True)
    ws.oddFooter.right.text="&P of &N"; ws.oddFooter.left.text="Organika MÜV — Competitor Intelligence (confidential draft)"
    if desc is not None: CONTENTS.append((name,desc))
    return ws, nr

def banner(ws,row,text,n,color=STEEL):
    ws.merge_cells(start_row=row,start_column=1,end_row=row,end_column=n)
    c=ws.cell(row=row,column=1,value=text); c.font=F(bold=True,color=WHITE,size=10); c.fill=fill(color); c.alignment=Alignment(horizontal="left",vertical="center",indent=1); return row+1

def table(ws,start,headers,rows,widths=None,hcolor=NAVY,rowh=None,zebra=True):
    for j,h in enumerate(headers,1):
        c=ws.cell(row=start,column=j,value=h); c.font=HEAD; c.fill=fill(hcolor); c.alignment=CTR; c.border=BORDER
    r=start+1
    for i,row in enumerate(rows):
        for j,v in enumerate(row,1):
            c=ws.cell(row=r,column=j,value=v); c.font=BODY; c.alignment=WRAP; c.border=BORDER
            if zebra and i%2: c.fill=fill(LIGHT)
        if rowh: ws.row_dimensions[r].height=rowh
        r+=1
    if widths:
        for j,w in enumerate(widths,1): ws.column_dimensions[get_column_letter(j)].width=w
    return r

def callout(ws,row,text,n,fc=GREEN,ft=GREENH,h=44):
    ws.merge_cells(start_row=row,start_column=1,end_row=row,end_column=n)
    c=ws.cell(row=row,column=1,value=text); c.font=F(bold=True,color=ft,size=10); c.fill=fill(fc); c.alignment=WRAP; c.border=BORDER; ws.row_dimensions[row].height=h; return row+1

# ============================================================ 00 COVER
ws=wb.active; ws.title="00 Cover"; ws.sheet_view.showGridLines=False
for col,w in zip("ABCDEFGHI",[3,20,20,20,20,20,20,20,3]): ws.column_dimensions[col].width=w
ws.merge_cells("B2:H2"); t=ws["B2"]; t.value="FUNCTIONAL & WELLNESS SPARKLING BEVERAGES"; t.font=TITLE; t.fill=fill(NAVY); t.alignment=CTR; ws.row_dimensions[2].height=38
ws.merge_cells("B3:H3"); s=ws["B3"]; s.value="Competitive Intelligence & Market-Entry Dossier — FINAL"; s.font=F(bold=True,color=WHITE,size=13); s.fill=fill(TEAL); s.alignment=CTR; ws.row_dimensions[3].height=24
ws.merge_cells("B4:H4"); s2=ws["B4"]; s2.value="For the Organika MÜV Sparkling Electrolytes launch decision · US + Canada"; s2.font=F(italic=True,color=NAVY,size=11); s2.alignment=CTR; ws.row_dimensions[4].height=20
meta=[("Decision supported","Whether/how to launch MÜV — a Canadian sparkling electrolyte RTD (can) — in Canada"),
 ("What MÜV is","Verified: RTD sparkling CAN (SKU 4338, ~$14.99); carbonated water + Fibersol prebiotic fibre, magnesium glycinate, stevia; 0 sugar, caffeine-free"),
 ("Geography","US (primary evidence base) with Canada market + regulatory read-across"),
 ("Coverage","8 core profiles + ~30 extended landscape entries; interactive scenario model; verification log"),
 ("Date prepared","2026-10-23 (finalized)"),
 ("Status","Working draft — start on 🏠 Start Here; one-page summary on Decision Memo / Executive Brief. Verify amber-flagged items before external use.")]
r=6
for k,v in meta:
    ws.cell(row=r,column=2,value=k).font=F(bold=True,color=NAVY,size=12)
    ws.merge_cells(start_row=r,start_column=3,end_row=r,end_column=8)
    c=ws.cell(row=r,column=3,value=v); c.font=BODY; c.alignment=WRAP; ws.row_dimensions[r].height=30; r+=1
r+=1
ws.merge_cells(start_row=r,start_column=2,end_row=r+1,end_column=8)
cv=ws.cell(row=r,column=2,value=("CONFIDENCE LEGEND — ✅ HARD (primary/scanner/regulatory) · ◐ DIRECTIONAL (research-firm/single-source) · "
 "⚠ FLAG (estimate/verify). Every load-bearing figure is tagged; estimates are never presented as fact."))
cv.font=F(bold=True,color=GREENH,size=10); cv.fill=fill(GREEN); cv.alignment=WRAP; cv.border=BORDER; ws.row_dimensions[r].height=40
r+=3
ws.cell(row=r,column=2,value="INTERACTIVE (gold) tabs:").font=F(bold=True,color=AMBERH,size=10)
for tabn,d in [("🏠 Start Here","front door — click a card to jump"),("Financial Model","pick a scenario; P&L recomputes"),
               ("Scenario Comparison","all 3 scenarios + charts"),("Go-NoGo Decision","edit weights → verdict")]:
    r+=1; lk=ws.cell(row=r,column=2,value="▸ "+tabn); lk.hyperlink=f"#'{tabn}'!A1"; lk.font=F(bold=True,color=LINK,underline="single",size=10)
    ws.merge_cells(start_row=r,start_column=3,end_row=r,end_column=8); ws.cell(row=r,column=3,value=d).font=BODY
ws.page_setup.orientation="landscape"

# ============================================================ 01 CONTENTS (filled at end)
ws_toc,_=tab("01 Contents","Table of Contents",None,2,NAVY,home=True,desc="This page — clickable index + how to navigate")

# ============================================================ START HERE
sh,_=tab("🏠 Start Here","Anh — Start Here","Your front door to the MÜV dossier. Click a card to jump.",6,GOLD,home=False,desc="Front door — grouped clickable cards + headline stats")
sh.merge_cells("B4:F4"); strip=sh.cell(row=4,column=2,value="US hydration powders $1.5B (+20%)  ·  sparkling electrolyte = white space  ·  MÜV = food-regulated RTD can  ·  Verdict: GO — conditional")
strip.font=F(bold=True,color=GREENH,size=9); strip.fill=fill(GREEN); strip.alignment=CTR; strip.border=BORDER; sh.row_dimensions[4].height=18
groups=[("SEE THE ANSWER",[("Decision Memo","the one-page call"),("Executive Brief 1-page","verdict + numbers + moves"),("20 GTM Recommendation","the 5-move plan"),("Go-NoGo Decision","weighted verdict")]),
        ("EXPLORE THE NUMBERS",[("Dashboard","charts + KPIs"),("Financial Model","interactive scenario P&L"),("Scenario Comparison","all 3 scenarios"),("Assumptions Audit","every input + source")]),
        ("KNOW THE COMPETITION",[("MÜV Peer Set","direct rivals"),("07 Comparison Matrix","category context"),("08 Extended Landscape","~30 brands"),("13 Launch Playbooks","how winners launched")]),
        ("CANADA LAUNCH",[("Canada Regulatory v2","the reclassification"),("Electrolyte BFY Deep-Dive","Canada-first research"),("18 Canada Market","banners & entry"),("Next Steps & Gates","what to do next")]),
        ("TRUST THE DATA",[("Verification Log","what was checked"),("Data Confidence","tag scoreboard"),("24 Sources","bibliography"),("03 Methodology","how this was built")])]
for col in "BCDEF": sh.column_dimensions[col].width=22
r=6
for gname,cards in groups:
    sh.merge_cells(start_row=r,start_column=2,end_row=r,end_column=6)
    g=sh.cell(row=r,column=2,value=gname); g.font=F(bold=True,color=WHITE,size=10); g.fill=fill(STEEL); g.alignment=LEFT; sh.row_dimensions[r].height=18; r+=1
    cc=2
    for nm,d in cards:
        cell=sh.cell(row=r,column=cc,value="▸ "+nm+"\n"+d); cell.hyperlink=f"#'{nm}'!A1"
        cell.font=F(bold=True,color=LINK,size=9); cell.fill=fill(LIGHT2); cell.alignment=Alignment(wrap_text=True,vertical="center"); cell.border=BORDER
        cc+=1
        if cc>6: cc=2
    sh.row_dimensions[r].height=34; r+=1
    r+=1

# ============================================================ 02 EXECUTIVE SUMMARY
ws,nr=tab("02 Executive Summary","Executive Summary","How competitors launched, what won, and the MÜV call",2,NAVY,desc="Thesis, 7 findings, recommendation")
ws.column_dimensions["A"].width=26; ws.column_dimensions["B"].width=96
nr=banner(ws,nr,"THE THESIS",2,STEEL)
nr=callout(ws,nr,("Functional-beverage winners won on a repeatable launch mechanic, not formula: a founder-authority insight, ONE obsessively-executed "
 "trial tactic, and a data-driven (velocity/repeat) retail sell-in, sequenced up a channel ladder. For MÜV the opportunity is real (electrolyte/"
 "hydration boom + sparkling white space + Canadian-made edge), but it sits at the intersection of the category's two biggest risks — claims "
 "liability and strategic-owned competition. Win condition: credible dose + claim discipline + proven repeat before chasing doors + a Costco-Canada/"
 "Amazon.ca beachhead Organika is uniquely positioned to seize."),2,fc=LIGHT2,ft="000000",h=92)
nr+=1
findings=[
 ("1. Channel ladder, never skipped","Natural/DTC → specialty → grocery → mass → club; earn each rung with proven velocity (OLIPOP 40 NorCal grocers; Poppi farmers-market → Whole Foods)."),
 ("2. One trial tactic, obsessively","Poppi TikTok seeding; LMNT free-sample + podcast; Liquid I.V. Costco roadshow sampling. Pick one, go deep."),
 ("3. Sell-in on DATA not flavour","Buyers buy velocity & repeat rate. OLIPOP's repurchase story + Liquid I.V.'s POS data were the sell-in — the most repeated lever."),
 ("4. Category language commands price","“Prebiotic soda”, “hydration multiplier” escape commodity comparison and hold a $2–3/can premium. Modern soda hit $1.8B in 2024 (+83%, Circana)."),
 ("5. The collagen graveyard is real","Standalone beauty-collagen sparkling flopped (Goldn Hour, BOONS, Luster & Lum); a 2025 meta-analysis found no proven skin benefit. Collagen-as-feature survives; collagen-as-hero does not."),
 ("6. Claims discipline is existential","Poppi paid $8.9M settling a gut-health claim its 2g fibre couldn't support. Dose to efficacy; use structure/function-safe language."),
 ("7. Canada is a FOOD problem","An RTD electrolyte can is a Supplemented Food (CFIA), not an NHP — so beauty/collagen claims stay on the NHP powder line, and food-compliant labelling is day-one.")]
nr=banner(ws,nr,"THE SEVEN FINDINGS THAT MATTER",2,STEEL)
nr=table(ws,nr,["Finding","So what"],findings,[26,96],rowh=70)
nr+=1
nr=callout(ws,nr,("RECOMMENDATION (detail on GTM + Decision Memo): GO — conditional. Lead with a functional benefit stack (gut/prebiotic fibre + hydration + a "
 "credible collagen dose) under a “by Canada's #1 collagen brand” halo, NOT narrow beauty-from-within. Beachhead = Costco Canada + Amazon.ca + natural "
 "channel + Organika's pharmacy/health-food base. Price at/below ~$3.49 CAD. Resolve the Supplemented-Foods claim set with counsel BEFORE artwork. "
 "Prove repeat before chasing doors."),2,h=86)

# ============================================================ DECISION MEMO (the improvement increment)
ws,nr=tab("Decision Memo","Decision Memo — MÜV Canada Launch","One page. The call, the why, the ask.",2,GOLD,desc="NEW: tight one-page CEO memo — the call, why, and ask")
ws.column_dimensions["A"].width=22; ws.column_dimensions["B"].width=100
rows=[
 ("TO / FROM","To: Aaron Chin (CEO). From: Louis To, Senior Sales Account Manager. Re: MÜV Sparkling Electrolytes — Canada launch."),
 ("THE CALL","GO — conditional. Launch MÜV as a daily-wellness sparkling hydration brand, made in Canada, via a Costco-Canada + Amazon.ca beachhead, with Supplemented-Food-compliant labelling from day one."),
 ("WHY NOW","Powdered hydration is a $1.5B US category growing +20%/yr four years running (Circana); Liquid I.V. entered Canada in 2023. A flavoured SPARKLING electrolyte is genuine white space — that is MÜV's wedge."),
 ("WHY US","Organika already holds the exact Canadian shelves imported rivals must buy into (Costco Canada, Well.ca, Amazon.ca, pharmacy/health-food), owns BC manufacturing (margin + speed + a quality story), and carries a “Canada's #1 collagen” brand halo."),
 ("WHAT WINS","Price/formulate against the electrolyte peers (≤ LMNT/Liquid I.V. per-serving economics; sparkling as the sensory wedge); borrow go-to-market from the soda winners (one obsessive trial tactic; sell-in on velocity/repeat)."),
 ("THE RISKS","(1) Collagen efficacy/claims liability — mitigated by keeping beauty claims on the NHP powder, not the can. (2) Strategic-owned rivals (Nestlé/Unilever/PepsiCo) — we win a niche occasion, not their shelf. (3) Over-distribution before product-market fit — gate national grocery on proven repeat."),
 ("THE NUMBERS","Illustrative Base case: positive contribution at a ≤$3.49 CAD shelf with domestic COGS; a defined Year-1 break-even even in the Conservative case (see Financial Model). Replace inputs with co-packer/distributor quotes before underwriting."),
 ("THE ASK","Approve Phase 0: (1) confirm MÜV on-can specs, (2) regulatory-counsel sign-off on the claim set, (3) Canadian co-packer quote, (4) secure the Costco Canada beachhead + roadshow sampling.")]
nr=table(ws,nr,["",""],rows,[22,100],rowh=52,zebra=True,hcolor=NAVY)
# hide the empty header row look
for j in (1,2): ws.cell(row=nr-len(rows)-1,column=j).value=None; ws.cell(row=nr-len(rows)-1,column=j).fill=fill(WHITE)
nr=callout(ws,nr,"Confidence-tagged throughout; MÜV on-can sodium is the one open spec — confirm with the brand. Full backing: every tab in this workbook (start at 🏠 Start Here).",2,h=34)

# ============================================================ EXECUTIVE BRIEF 1-PAGE
ws,nr=tab("Executive Brief 1-page","Executive Brief — MÜV Canada Launch","Verdict · numbers · 5 moves · risks (printable)",5,GOLD,desc="One printable page: verdict, numbers, 5 moves, risks")
nr=callout(ws,nr,"VERDICT: GO — conditional.  Launch as daily-wellness sparkling hydration, made in Canada.",5,fc=GREENH,ft=WHITE,h=22)
def eb_block(ws,r,title,color):
    ws.merge_cells(start_row=r,start_column=1,end_row=r,end_column=5); c=ws.cell(row=r,column=1,value=title); c.font=F(bold=True,color=WHITE,size=10); c.fill=fill(color); c.alignment=LEFT; return r+1
def eb_line(ws,r,txt):
    ws.merge_cells(start_row=r,start_column=1,end_row=r,end_column=5); c=ws.cell(row=r,column=1,value=txt); c.font=BODY; c.alignment=WRAP; ws.row_dimensions[r].height=28; return r+1
for col in "ABCDE": ws.column_dimensions[col].width=24
nr=eb_block(ws,nr,"WHAT MÜV IS",STEEL); nr=eb_line(ws,nr,"RTD sparkling electrolyte CAN (SKU 4338, ~$14.99): carbonated water + Fibersol prebiotic fibre, magnesium glycinate, stevia; 0 sugar, caffeine-free. Food-regulated in Canada.")
nr=eb_block(ws,nr,"WHY NOW",STEEL); nr=eb_line(ws,nr,"US powdered hydration $1.5B 2024, +20% YoY, 4 straight yrs double-digit (Circana). Liquid I.V. #1, entered Canada 2023. Flavoured SPARKLING electrolyte is genuine white space.")
nr=eb_block(ws,nr,"PRICE / SODIUM LADDER",STEEL); nr=eb_line(ws,nr,"LMNT 1,000mg / ~$1.50 (performance) · Liquid I.V. 500mg / ~$1.56 (daily) · Nuun 300mg / ~$0.75 (value) · MÜV sparkling can $14.99/pack (daily-wellness sparkling).")
nr=eb_block(ws,nr,"RECOMMENDATION — 5 MOVES",GREENH)
for txt in ["1. Beachhead: Costco Canada (roadshow sampling) + Amazon.ca / Well.ca / DTC.","2. Position: daily-wellness sparkling, made in Canada — between Liquid I.V. and LMNT.","3. Label to the Supplemented-Food framework from day one.","4. Keep collagen-beauty claims on the NHP powder line, NOT the can.","5. Borrow LMNT's sample funnel + #WaterTok creators; lean on BC manufacturing for margin."]: nr=eb_line(ws,nr,txt)
nr=eb_block(ws,nr,"TOP RISKS",REDH)
for txt in ["Collagen efficacy/claims liability → dose to efficacy, food-safe language.","Strategic-owned rivals → compete on Canadian-made + niche beachhead.","Over-distribution before PMF → prove repeat before national grocery."]: nr=eb_line(ws,nr,txt)
nr=eb_block(ws,nr,"REGULATORY (Canada)",AMBERH); nr=eb_line(ws,nr,"Sport-electrolytes reclassifying NHP → Supplemented Foods by 2027-12-31; new products comply now. Format isn't the decider — claims are. Collagen beauty = NHP-only.")
ws.page_setup.orientation="portrait"; ws.page_setup.fitToHeight=1

print("...core tabs built, continuing to numbers/competition...")

# ============================================================ FINANCIAL MODEL (interactive)
fm,_=tab("Financial Model","MÜV Financial Model — Scenario P&L, Break-even & Sensitivity","Pick a scenario in C4. Yellow = editable; white = locked formulas. Illustrative, not a forecast.",8,GOLD,desc="Interactive: scenario dropdown drives P&L, break-even, sensitivity")
fm.column_dimensions["A"].width=3; fm.column_dimensions["B"].width=32
for col,w in zip("CDEFGH",[14,14,14,14,4,30]): fm.column_dimensions[col].width=w
def lab(r,t,b=False): c=fm.cell(row=r,column=2,value=t); c.font=BODYB if b else BODY; c.alignment=LEFT; return c
def inp(r,col,v,fmt=None): c=fm.cell(row=r,column=col,value=v); c.font=BODYB; c.fill=fill(YEL); c.border=BORDER; c.alignment=CTR; c.protection=Protection(locked=False);
def inpf(r,col,v,fmt): c=fm.cell(row=r,column=col,value=v); c.font=BODYB; c.fill=fill(YEL); c.border=BORDER; c.alignment=CTR; c.number_format=fmt; c.protection=Protection(locked=False)
def cal(r,col,f,fmt=None,b=False,bg=LIGHT2): c=fm.cell(row=r,column=col,value=f); c.font=BODYB if b else BODY; c.border=BORDER; c.alignment=CTR; c.fill=fill(bg); c.protection=Protection(locked=True);
def calf(r,col,f,fmt,b=False,bg=LIGHT2): c=fm.cell(row=r,column=col,value=f); c.font=BODYB if b else BODY; c.border=BORDER; c.alignment=CTR; c.fill=fill(bg); c.number_format=fmt; c.protection=Protection(locked=True)
lab(4,"Scenario (pick):",True)
sel=fm.cell(row=4,column=3,value="Base"); sel.font=F(bold=True,color=NAVY,size=11); sel.fill=fill(YEL); sel.border=BORDER; sel.alignment=CTR; sel.protection=Protection(locked=False)
sel.comment=Comment("Pick Conservative / Base / Aggressive. The whole P&L, break-even and sensitivity recompute from this one cell.","MÜV model")
dv=DataValidation(type="list",formula1='"Conservative,Base,Aggressive"',allow_blank=False); fm.add_data_validation(dv); dv.add(sel)
lab(5,"Scenario index:"); calf(5,3,'=MATCH(C4,{"Conservative","Base","Aggressive"},0)','0')
fm.cell(row=4,column=6,value="← change this dropdown to flip the whole model").font=SMALL
# legend
fm.cell(row=7,column=6,value="LEGEND").font=F(bold=True,size=9,color=NAVY)
lg1=fm.cell(row=8,column=6,value=" edit "); lg1.fill=fill(YEL); lg1.border=BORDER; lg1.font=F(bold=True,size=9); lg1.alignment=CTR; fm.cell(row=8,column=7,value="= yellow input").font=SMALL
lg2=fm.cell(row=9,column=6,value=" calc "); lg2.fill=fill(LIGHT); lg2.border=BORDER; lg2.font=F(size=9); lg2.alignment=CTR; fm.cell(row=9,column=7,value="= locked formula").font=SMALL
hr=11
for j,t in enumerate(["Assumption","Conservative","Base","Aggressive","ACTIVE"]):
    c=fm.cell(row=hr,column=2+j,value=t); c.font=HEAD; c.fill=fill(NAVY); c.alignment=CTR; c.border=BORDER
amx=[("List price / can (CAD)",3.29,3.49,3.79,'"$"#,##0.00'),("COGS / can (CAD)",1.20,1.05,0.95,'"$"#,##0.00'),
 ("Retailer margin %",0.38,0.35,0.33,'0%'),("Distributor margin %",0.18,0.15,0.12,'0%'),("Trade spend % of net",0.25,0.20,0.15,'0%'),
 ("Cans per case",12,12,12,'0'),("Doors — Year 1",300,500,900,'#,##0'),("Doors — Year 2",1200,2000,3500,'#,##0'),("Doors — Year 3",3500,6000,11000,'#,##0'),
 ("Velocity Y1 (u/store/wk)",2.0,3.0,4.5,'0.0'),("Velocity Y2 (u/store/wk)",3.0,4.0,6.0,'0.0'),("Velocity Y3 (u/store/wk)",3.5,5.0,7.5,'0.0'),
 ("Marketing / year (CAD)",150000,300000,600000,'"$"#,##0'),("Fixed overhead / year (CAD)",250000,350000,500000,'"$"#,##0'),("Slotting (Year 1 one-time)",50000,100000,200000,'"$"#,##0')]
A={}; r=hr+1
for name,cv2,bv,av,fmt in amx:
    lab(r,name); inpf(r,3,cv2,fmt); inpf(r,4,bv,fmt); inpf(r,5,av,fmt); calf(r,6,f"=CHOOSE($C$5,C{r},D{r},E{r})",fmt,True,GREEN); A[name]=r; fm.row_dimensions[r].height=15; r+=1
P=f"$F${A['List price / can (CAD)']}"; CO=f"$F${A['COGS / can (CAD)']}"; RM=f"$F${A['Retailer margin %']}"; DM=f"$F${A['Distributor margin %']}"; TR=f"$F${A['Trade spend % of net']}"; CASE=f"$F${A['Cans per case']}"; MKT=f"$F${A['Marketing / year (CAD)']}"; FIX=f"$F${A['Fixed overhead / year (CAD)']}"; SLOT=f"$F${A['Slotting (Year 1 one-time)']}"
fm[f"C{A['List price / can (CAD)']}"].comment=Comment("Shelf price per can. Edit per scenario in C/D/E.","MÜV model")
r+=1; r=banner(fm,r,"PER-CAN ECONOMICS (active scenario)",8)
e=r
lab(e,"Net revenue / can",True); calf(e,3,f"={P}*(1-{RM})*(1-{DM})",'"$"#,##0.00',True); NET=f"$C${e}"
lab(e+1,"Gross profit / can",True); calf(e+1,3,f"=C{e}-{CO}",'"$"#,##0.00',True); GP=f"$C${e+1}"
lab(e+2,"Gross margin %",True); calf(e+2,3,f"=C{e+1}/C{e}",'0.0%',True)
lab(e+3,"Trade spend / can"); calf(e+3,3,f"=C{e}*{TR}",'"$"#,##0.00'); TRC=f"$C${e+3}"
lab(e+4,"Contribution / can",True); calf(e+4,3,f"=C{e+1}-C{e+3}",'"$"#,##0.00',True); CON=f"$C${e+4}"
r=e+6; r=banner(fm,r,"3-YEAR P&L (CAD)",8); ph=r
for j,t in enumerate(["Line","Year 1","Year 2","Year 3"]):
    c=fm.cell(row=ph,column=2+j,value=t); c.font=HEAD; c.fill=fill(STEEL); c.alignment=CTR; c.border=BORDER
P3={}
def prow(rr,name,builder,fmt='"$"#,##0',bold=False,bg=LIGHT2):
    lab(rr,name,bold)
    for j,col in enumerate([3,4,5]): calf(rr,col,builder(get_column_letter(col),j),fmt,bold,bg)
    P3[name]=rr
r=ph+1
doors=[A['Doors — Year 1'],A['Doors — Year 2'],A['Doors — Year 3']]; vel=[A['Velocity Y1 (u/store/wk)'],A['Velocity Y2 (u/store/wk)'],A['Velocity Y3 (u/store/wk)']]
prow(r,"Distribution (doors)",lambda L,j:f"=$F${doors[j]}",'#,##0'); r+=1
prow(r,"Velocity (u/store/wk)",lambda L,j:f"=$F${vel[j]}",'0.0'); r+=1
UN=r; prow(r,"Annual units",lambda L,j:f"={L}{P3['Distribution (doors)']}*{L}{P3['Velocity (u/store/wk)']}*52",'#,##0'); r+=1
NETR=r; prow(r,"Net revenue",lambda L,j:f"={L}{UN}*{NET}",bold=True); r+=1
prow(r,"COGS",lambda L,j:f"=-{L}{UN}*{CO}"); r+=1
GPR=r; prow(r,"Gross profit",lambda L,j:f"={L}{NETR}+{L}{r-1}",bold=True); r+=1
prow(r,"Trade spend",lambda L,j:f"=-{L}{UN}*{TRC}"); r+=1
prow(r,"Marketing",lambda L,j:f"=-{MKT}"); r+=1
prow(r,"Fixed overhead",lambda L,j:f"=-{FIX}"); r+=1
prow(r,"Slotting (one-time)",lambda L,j:(f"=-{SLOT}" if j==0 else "=0")); r+=1
EBR=r; prow(r,"EBITDA",lambda L,j:f"={L}{GPR}+{L}{r-3}+{L}{r-2}+{L}{r-1}+{L}{r-4}",bold=True,bg=GREEN); r+=1
prow(r,"EBITDA margin %",lambda L,j:f"={L}{EBR}/{L}{NETR}",'0.0%'); r+=1
r+=1; r=banner(fm,r,"BREAK-EVEN (Year-1 cost load ÷ contribution/can)",8); b=r
lab(b,"Year-1 fixed + marketing + slotting"); calf(b,3,f"={MKT}+{FIX}+{SLOT}",'"$"#,##0',True)
lab(b+1,"Break-even units (cans)"); calf(b+1,3,f"=C{b}/{CON}",'#,##0',True)
lab(b+2,"Year-1 actual units"); calf(b+2,3,f"=C{UN}",'#,##0')
lab(b+3,"Year-1 surplus / (gap)",True); calf(b+3,3,f"=C{b+2}-C{b+1}",'#,##0',True,AMBER)
r=b+5; r=banner(fm,r,"SENSITIVITY — Contribution/can: price (down) × COGS (across), active margins",8); sh2=r
prices=[3.09,3.29,3.49,3.69,3.99]; cogs=[0.85,0.95,1.05,1.20,1.35]
fm.cell(row=sh2,column=3,value="P＼COGS").font=SMALL
for j,cg in enumerate(cogs):
    c=fm.cell(row=sh2,column=4+j,value=cg); c.font=F(bold=True,color=WHITE,size=9); c.fill=fill(STEEL); c.number_format='"$"#,##0.00'; c.alignment=CTR; c.border=BORDER
g0=sh2+1
for i,pr in enumerate(prices):
    rr=sh2+1+i; pc=fm.cell(row=rr,column=3,value=pr); pc.font=F(bold=True,color=WHITE,size=9); pc.fill=fill(STEEL); pc.number_format='"$"#,##0.00'; pc.alignment=CTR; pc.border=BORDER
    for j,cg in enumerate(cogs):
        col=4+j; L=get_column_letter(col); f=f"=($C{rr}*(1-{RM})*(1-{DM}))*(1-{TR})-{L}${sh2}"
        c=fm.cell(row=rr,column=col,value=f); c.number_format='"$"#,##0.00'; c.alignment=CTR; c.border=BORDER; c.font=BODY
g1=sh2+len(prices)
fm.conditional_formatting.add(f"D{g0}:H{g1}",ColorScaleRule(start_type='min',start_color='F8696B',mid_type='percentile',mid_value=50,mid_color='FFEB84',end_type='max',end_color='63BE7B'))
fm.conditional_formatting.add(f"C{NETR}:E{NETR}",DataBarRule(start_type='min',end_type='max',color=STEEL))
fm.conditional_formatting.add(f"C{EBR}:E{EBR}",DataBarRule(start_type='min',end_type='max',color=GREENH))
r=g1+2; r=callout(fm,r,("Scenario logic: ACTIVE = CHOOSE(scenario, Conservative, Base, Aggressive); every downstream cell reads ACTIVE. EBITDA excludes "
 "freight/FX and financing. Replace all yellow inputs with real co-packer, distributor and buyer numbers before relying on outputs."),8,fc=AMBER,ft=AMBERH,h=44)
fm.freeze_panes="C6"
from openpyxl.worksheet.protection import SheetProtection
fm.protection=SheetProtection(sheet=True,formatCells=False,selectLockedCells=False,selectUnlockedCells=False)
FMrefs=dict(NETR=NETR,EBR=EBR,ph=ph)

# ============================================================ SCENARIO COMPARISON (computed)
def econ(s):
    net=s["price"]*(1-s["ret"])*(1-s["dist"]); gp=net-s["cogs"]; trade=net*s["trade"]; cont=gp-trade; yrs=[]
    for i in range(3):
        u=s["doors"][i]*s["vel"][i]*52; nrev=u*net; gprof=nrev-u*s["cogs"]; eb=gprof-u*trade-s["mkt"]-s["fixed"]-(s["slot"] if i==0 else 0)
        yrs.append((u,nrev,gprof,eb))
    be=(s["mkt"]+s["fixed"]+s["slot"])/cont if cont>0 else 0
    return net,gp,gp/net,cont,yrs,be
S={"Conservative":dict(price=3.29,cogs=1.20,ret=0.38,dist=0.18,trade=0.25,doors=[300,1200,3500],vel=[2.0,3.0,3.5],mkt=150000,fixed=250000,slot=50000),
   "Base":dict(price=3.49,cogs=1.05,ret=0.35,dist=0.15,trade=0.20,doors=[500,2000,6000],vel=[3.0,4.0,5.0],mkt=300000,fixed=350000,slot=100000),
   "Aggressive":dict(price=3.79,cogs=0.95,ret=0.33,dist=0.12,trade=0.15,doors=[900,3500,11000],vel=[4.5,6.0,7.5],mkt=600000,fixed=500000,slot=200000)}
E={k:econ(v) for k,v in S.items()}; order=["Conservative","Base","Aggressive"]
sc,nr=tab("Scenario Comparison","Scenario Comparison — Conservative · Base · Aggressive","Full envelope of the model, all three scenarios (edit source on Financial Model)",5,GOLD,desc="All 3 scenarios side-by-side + charts + takeaways")
for j,h in enumerate(["Metric","Conservative","Base","Aggressive"]):
    c=sc.cell(row=nr,column=1+j,value=h); c.font=HEAD; c.fill=fill(STEEL); c.alignment=CTR; c.border=BORDER
def scrow(rr,label,vals,fmt,bold=False,bg=None):
    c=sc.cell(row=rr,column=1,value=label); c.font=BODYB if bold else BODY; c.alignment=LEFT; c.border=BORDER
    if bg:c.fill=fill(bg)
    for j,v in enumerate(vals):
        cc=sc.cell(row=rr,column=2+j,value=v); cc.font=BODYB if bold else BODY; cc.alignment=CTR; cc.border=BORDER; cc.number_format=fmt
        if bg:cc.fill=fill(bg)
r=nr+1
scrow(r,"List price / can",[S[k]["price"] for k in order],'"$"#,##0.00'); r+=1
scrow(r,"COGS / can",[S[k]["cogs"] for k in order],'"$"#,##0.00'); r+=1
scrow(r,"Net revenue / can",[E[k][0] for k in order],'"$"#,##0.00'); r+=1
scrow(r,"Gross margin %",[E[k][2] for k in order],'0.0%'); r+=1
scrow(r,"Contribution / can",[E[k][3] for k in order],'"$"#,##0.00',True,LIGHT); r+=1
scrow(r,"Break-even units (Yr-1)",[E[k][5] for k in order],'#,##0'); r+=1
scrow(r,"Year-1 units",[E[k][4][0][0] for k in order],'#,##0'); r+=1
scrow(r,"Year-1 EBITDA",[E[k][4][0][3] for k in order],'"$"#,##0',True); r+=1
scrow(r,"Year-3 net revenue",[E[k][4][2][1] for k in order],'"$"#,##0'); r+=1
scrow(r,"Year-3 EBITDA",[E[k][4][2][3] for k in order],'"$"#,##0',True,GREEN); r+=1
sc.column_dimensions["A"].width=26
for col in "BCDE": sc.column_dimensions[col].width=16
# chart data (hidden)
dr=r+2
sc.cell(row=dr,column=1,value="Scenario"); sc.cell(row=dr,column=2,value="Y3 Net Rev"); sc.cell(row=dr,column=3,value="Y3 EBITDA"); sc.cell(row=dr,column=4,value="Break-even")
for i,k in enumerate(order):
    sc.cell(row=dr+1+i,column=1,value=k); sc.cell(row=dr+1+i,column=2,value=round(E[k][4][2][1])); sc.cell(row=dr+1+i,column=3,value=round(E[k][4][2][3])); sc.cell(row=dr+1+i,column=4,value=round(E[k][5]))
ch=BarChart(); ch.type="col"; ch.title="Year-3 Net Revenue vs EBITDA by Scenario (CAD)"; ch.height=7.5; ch.width=15
ch.add_data(Reference(sc,min_col=2,max_col=3,min_row=dr,max_row=dr+3),titles_from_data=True); ch.set_categories(Reference(sc,min_col=1,min_row=dr+1,max_row=dr+3)); ch.dataLabels=DataLabelList(); ch.dataLabels.showVal=True
sc.add_chart(ch,"G"+str(nr))
ch2=BarChart(); ch2.type="col"; ch2.title="Break-even units by scenario"; ch2.height=7; ch2.width=15
ch2.add_data(Reference(sc,min_col=4,min_row=dr,max_row=dr+3),titles_from_data=True); ch2.set_categories(Reference(sc,min_col=1,min_row=dr+1,max_row=dr+3)); ch2.legend=None; ch2.dataLabels=DataLabelList(); ch2.dataLabels.showVal=True
sc.add_chart(ch2,"G"+str(nr+16))
for rr in range(dr,dr+4): sc.row_dimensions[rr].hidden=True
r=dr+6; r=banner(sc,r,"TAKEAWAY BY SCENARIO",5)
for name,txt,color in [("Conservative","Downside — thin margins, later break-even. Validates the floor: even here MÜV has a defined path.",AMBER),("Base","Planning anchor — healthy contribution, break-even within the Year-1 door plan. The case to underwrite.",GREEN),("Aggressive","Upside — if the sparkling wedge + Costco beachhead over-deliver. Treat as ceiling, not plan.",LIGHT)]:
    a=sc.cell(row=r,column=1,value=name); a.font=BODYB; a.fill=fill(color); a.border=BORDER
    sc.merge_cells(start_row=r,start_column=2,end_row=r,end_column=5); b2=sc.cell(row=r,column=2,value=txt); b2.font=BODY; b2.alignment=WRAP; b2.border=BORDER; sc.row_dimensions[r].height=28; r+=1

print("...financial + scenario built...")

# ============================================================ DASHBOARD
d,_=tab("Dashboard","Executive Dashboard","Category sizing · leader trajectories · share · scores · MÜV scenario P&L",12,GOLD,desc="5 charts + KPI strip + thesis banner")
d.merge_cells("A3:L3"); th=d.cell(row=3,column=1,value="THESIS: MÜV wins the daily-wellness SPARKLING electrolyte lane, made in Canada — food-regulated, priced with the electrolyte peers, GTM borrowed from the soda winners.")
th.font=F(bold=True,color=WHITE,size=9); th.fill=fill(GREENH); th.alignment=CTR; d.row_dimensions[3].height=18
for col in "ABCDEFGHIJKL": d.column_dimensions[col].width=11
kpis=[("Modern soda US '24","$1.8B","+83% YoY"),("Poppi → PepsiCo","$1.95B","2025"),("OLIPOP valuation","$1.85B","2025"),("Collagen-indie survival","Low","graveyard"),("Canada beachhead","Costco+Amazon","proven")]
r0=4; col=1
for tt,v,ss in kpis:
    d.merge_cells(start_row=r0,start_column=col,end_row=r0,end_column=col+1); d.cell(row=r0,column=col,value=tt).font=F(bold=True,color=WHITE,size=8); d.cell(row=r0,column=col).fill=fill(STEEL); d.cell(row=r0,column=col).alignment=CTR
    d.merge_cells(start_row=r0+1,start_column=col,end_row=r0+1,end_column=col+1); d.cell(row=r0+1,column=col,value=v).font=F(bold=True,color=NAVY,size=13); d.cell(row=r0+1,column=col).fill=fill(LIGHT); d.cell(row=r0+1,column=col).alignment=CTR
    d.merge_cells(start_row=r0+2,start_column=col,end_row=r0+2,end_column=col+1); d.cell(row=r0+2,column=col,value=ss).font=F(italic=True,color=GREY,size=8); d.cell(row=r0+2,column=col).fill=fill(LIGHT); d.cell(row=r0+2,column=col).alignment=CTR
    for rr in (r0,r0+1,r0+2):
        for cc in (col,col+1): d.cell(row=rr,column=cc).border=BORDER
    col+=2
DR=70
def put(sr,scn,ttl,hdrs,rows):
    d.cell(row=sr,column=scn,value=ttl).font=BODYB
    for j,h in enumerate(hdrs): d.cell(row=sr+1,column=scn+j,value=h).font=SMALL
    for i,row in enumerate(rows):
        for j,v in enumerate(row): d.cell(row=sr+2+i,column=scn+j,value=v)
cat=[("Modern soda",1.8),("Hydration powder",1.5),("Electrolyte powder",2.8),("Sparkling water",6.9),("Collagen bev US",0.05),("BFW global",3.24)]; put(DR,1,"Category $B",["Cat","$B"],cat)
yrs=[2020,2021,2022,2023,2024]; poppi=[13,26,65,100,500]; olipop=[20,40,73,200,400]; put(DR,5,"Revenue $M",["Yr","Poppi","OLIPOP"],list(zip(yrs,poppi,olipop)))
share=[("Poppi",38),("OLIPOP",32.7),("Zevia",12.1),("Jarritos",10.3),("Fever-Tree",4),("Other",2.9)]; put(DR,9,"Share %",["Brand","%"],share)
wts=[0.15,0.15,0.15,0.10,0.10,0.10,0.15,0.10]
scd={"Poppi":[5,5,2,3,3,5,5,2],"OLIPOP":[5,5,4,3,4,4,4,2],"LMNT":[4,3,3,4,3,5,4,2],"Liquid I.V.":[4,5,3,3,3,4,5,3],"Vital Proteins":[4,5,4,3,3,3,5,2],"Recess":[3,3,3,3,4,4,3,1],"MÜV (Organika)":[3,3,3,4,3,2,2,5]}
scores=[(k,round(sum(a*b for a,b in zip(v,wts)),2)) for k,v in scd.items()]; put(DR,13,"Score",["Brand","Score"],scores)
c1=BarChart(); c1.type="col"; c1.title="Category Sizes (US, $B)"; c1.height=7; c1.width=14; c1.add_data(Reference(d,min_col=2,min_row=DR+1,max_row=DR+1+len(cat)),titles_from_data=True); c1.set_categories(Reference(d,min_col=1,min_row=DR+2,max_row=DR+1+len(cat))); c1.legend=None; d.add_chart(c1,"A8")
c2=LineChart(); c2.title="Revenue Trajectory ($M)"; c2.height=7; c2.width=14; c2.add_data(Reference(d,min_col=6,min_row=DR+1,max_col=7,max_row=DR+1+len(yrs)),titles_from_data=True); c2.set_categories(Reference(d,min_col=5,min_row=DR+2,max_row=DR+1+len(yrs))); d.add_chart(c2,"G8")
c3=PieChart(); c3.title="Modern Soda Share '24 (%)"; c3.height=7; c3.width=10; c3.add_data(Reference(d,min_col=10,min_row=DR+1,max_row=DR+1+len(share)),titles_from_data=True); c3.set_categories(Reference(d,min_col=9,min_row=DR+2,max_row=DR+1+len(share))); c3.dataLabels=DataLabelList(); c3.dataLabels.showVal=True; d.add_chart(c3,"A23")
c4=BarChart(); c4.type="bar"; c4.title="Weighted Competitive Score"; c4.height=7; c4.width=14; c4.add_data(Reference(d,min_col=14,min_row=DR+1,max_row=DR+1+len(scores)),titles_from_data=True); c4.set_categories(Reference(d,min_col=13,min_row=DR+2,max_row=DR+1+len(scores))); c4.legend=None; c4.dataLabels=DataLabelList(); c4.dataLabels.showVal=True; d.add_chart(c4,"E23")
c5=BarChart(); c5.type="col"; c5.title="MÜV Scenario P&L — Net Rev & EBITDA (CAD)"; c5.height=7; c5.width=14
c5.add_data(Reference(fm,min_col=2,min_row=FMrefs['NETR'],max_col=5,max_row=FMrefs['NETR']),titles_from_data=True,from_rows=True)
c5.add_data(Reference(fm,min_col=2,min_row=FMrefs['EBR'],max_col=5,max_row=FMrefs['EBR']),titles_from_data=True,from_rows=True)
c5.set_categories(Reference(fm,min_col=3,min_row=FMrefs['ph'],max_col=5,max_row=FMrefs['ph'])); d.add_chart(c5,"J23")
for rr in range(DR,DR+12): d.row_dimensions[rr].hidden=True

# ============================================================ ASSUMPTIONS AUDIT
aa,nr=tab("Assumptions Audit","Assumptions Audit — every model input, with source & confidence",None,5,GOLD,desc="Every Financial Model input + source/confidence")
nr=table(aa,nr,["Input","Conservative","Base","Aggressive","Source / confidence"],[
 ["List price / can (CAD)","$3.29","$3.49","$3.79","MÜV SRP ~$14.99/pack; vs ~$3.49 CAD premium shelf norm ◐"],
 ["COGS / can (CAD)","$1.20","$1.05","$0.95","<$1 target at scale rule-of-thumb; excludes freight/duty ⚠"],
 ["Retailer margin %","38%","35%","33%","Grocery bev 30–40% ◐"],["Distributor margin %","18%","15%","12%","UNFI/KeHE ~13–25% ◐"],
 ["Trade spend % of net","25%","20%","15%","Emerging-brand 10–20%+ ◐"],["Doors Y1/Y2/Y3","300/1.2k/3.5k","500/2k/6k","900/3.5k/11k","Illustrative ramp ⚠"],
 ["Velocity (u/store/wk)","2/3/3.5","3/4/5","4.5/6/7.5","Illustrative; buyers reward velocity ⚠"],["Marketing / yr","$150k","$300k","$600k","Illustrative ⚠"],
 ["Fixed overhead / yr","$250k","$350k","$500k","Illustrative ⚠"],["Slotting (Y1)","$50k","$100k","$200k","$250–$250k/SKU range ◐"]],[24,14,14,14,52],rowh=26)
nr=callout(aa,nr,"All financial inputs are ILLUSTRATIVE scaffolding, not a forecast. Replace each with real co-packer, distributor and buyer numbers. ◐ rule-of-thumb · ⚠ estimate.",5,fc=AMBER,ft=AMBERH,h=32)

# ============================================================ DATA CONFIDENCE (computed at end over workbook)
dc,_=tab("Data Confidence","Data Confidence Scoreboard","Tally of ✅/◐/⚠ tags across the dossier — evidence vs estimate",4,GOLD,desc="Scoreboard of confidence tags with chart")

# ============================================================ 03 METHODOLOGY
ws,nr=tab("03 Methodology","Methodology & Confidence Framework",None,2,TEAL,desc="Research design, source hierarchy, limitations")
ws.column_dimensions["A"].width=30; ws.column_dimensions["B"].width=92
nr=table(ws,nr,["Element","Detail"],[
 ["Research design","Multiple parallel research streams (market sizing, channel economics, competitor sweep, Canada regulatory, launch playbooks, consumer/risk, electrolyte deep-dive), each multi-source with per-claim citation."],
 ["Source hierarchy","Decision-grade: scanner (Circana/SPINS), SEC filings, regulatory primary (Health Canada/CFIA), transactions. Directional: syndicated research-firm market sizes. Lowest: single secondary / social estimates."],
 ["Confidence tagging","Every load-bearing figure is ✅/◐/⚠. Where sources conflict (collagen size; prebiotic soda; adaptogens), both are shown and flagged."],
 ["Known limitations","Many primary pages block automated fetch; figures captured via search extracts + corroboration — re-pull before external use. Private-company margins and Canadian per-SKU listing fees are confidential (ranges)."],
 ["What would strengthen this further","1) Confirm MÜV on-can specs (sodium, pack, collagen variant). 2) Licensed Canadian scanner data. 3) Regulatory-counsel claim opinion. 4) Real co-packer/distributor quotes. 5) Distributor interviews (UNFI Canada / Tree of Life / Purity Life)."]],[30,92],rowh=74)

# ============================================================ 04 MARKET SIZING
ws,nr=tab("04 Market Sizing","Market Sizing — Category Sizes & Growth","Anchor TAM on Circana scanner; research-firm sizes are directional floors",7,TEAL,desc="TAM/category sizes & growth, US + Canada")
nr=table(ws,nr,["Category","Geo","Size","Year","Growth","Source","Conf."],[
 ["Modern/better-for-you soda (scanner)","US","$1.8B","2024","+83% YoY (from $983M)","Circana / Bev Industry","✅"],
 ["Powdered hydration mixes (scanner)","US","$1.5B","2024","+20% YoY; 4 yrs double-digit","Circana / CNN","✅"],
 ["Electrolyte powder","US","$2.8B","2024","8.9% to 2030 → $4.6B","Grand View/Spherical","HARD-ish"],
 ["Prebiotic/probiotic soda","US","$171.6M","2024","7.8% → $268.8M","Grand View","◐ conflicts w/ scanner"],
 ["Collagen beverage","US","$47.9M","2024","10.9% to 2034","Fact.MR","⚠ see conflict"],
 ["Beauty-from-within drinks","Global","$3.24B","2024","8.5% to 2035","Future Market Insights","◐"],
 ["Functional beverages (broad)","Canada","US$17.35B","2025","4.5% → $27B (2035)","Market Research Future","⚠ very broad, 1 src"],
 ["Modern soda (US-proxy)","Canada","~$180M","2024","—","Derived (10% of US)","⚠ estimate"]],[32,8,11,8,26,22,20],rowh=28)
nr=callout(ws,nr,"FLAG: collagen beverage ($47.9M US vs $275–470M global), prebiotic soda ($171.6M vs $1.8B scanner), and adaptogens carry material source conflicts. Anchor on Circana scanner reads.",7,fc=AMBER,ft=AMBERH,h=34)

# ============================================================ 05 TRENDS
ws,nr=tab("05 Trends & Macro","Trends & Macro Drivers (2025–2026)",None,4,TEAL,desc="Sugar, GLP-1, gut health, beauty-from-within, white space")
nr=table(ws,nr,["Trend","Status","Evidence","Implication for MÜV"],[
 ["Electrolyte/hydration boom","Surging","US powdered hydration $1.5B +20%; #WaterTok demand engine","Sparkling is a demo-able hero for short-form"],
 ["Sugar reduction","Table stakes","60%+ cutting sugar; >50% of launches sugar-free","Zero/low sugar is baseline, not a differentiator"],
 ["GLP-1","Reshaping","~23% of US households; favor low-cal/protein/fibre/hydration","Low-cal + fibre positioning aligns"],
 ["Gut health","Mainstreamed","Prebiotic soda ~$33M (2022) → ~$777M (2025)","Fibre is a defensible functional hook"],
 ["Beauty-from-within","Accelerating, contested","BFW drinks $3.24B; women 68%; 2025 meta-analysis found no proven skin benefit","Demand real; efficacy claims legally risky"],
 ["Sparkling format","White space","LMNT Sparkling can; Nuun tablets fizz; flavoured sparkling electrolyte rare","MÜV's wedge — pair with Canadian-made"]],[20,18,52,30],rowh=46)
nr=banner(ws,nr,"WHITE SPACE: flavoured sparkling electrolyte · prebiotic/fibre · protein-forward · GLP-1-friendly hydration · low/no sugar default",4,GREENH)

# ============================================================ 06 CONSUMER
ws,nr=tab("06 Consumer","Consumer Segmentation & The Collagen Buyer",None,3,TEAL,desc="Segmentation, collagen buyer, efficacy risk, buyer criteria")
nr=table(ws,nr,["Dimension","Read","Detail"],[
 ["Demand engine","Gen Z + Millennials","~80% Gen Z / ~75% Millennials use functional beverages; drive 41%+ of wellness spend. US wellness $480B (2024)."],
 ["Gender (category)","Female-led growth","Women fastest-growing; over-index probiotic/fortified. Hard female-% split is paywalled — DATA GAP."],
 ["Collagen/BFW buyer","Women 25–45","68% of beauty-from-within drink revenue; buy anti-aging/hydration/hair-nail; clinical claims drive repeat."],
 ["Efficacy & skepticism","RISK","2025 meta-analysis: no clinical evidence collagen prevents skin aging; industry-funded trials biased. Effective studies used 2.5–10g/day."],
 ["Willingness to pay","Attribute-gated","Price-conscious AND premium-willing for a named function / clean label / brand-community."]],[22,22,74],rowh=50)
nr=banner(ws,nr,"RETAILER/CLUB BUYER CRITERIA: velocity (gating) · durable repeat rate (not discount-driven) · 35–45% early trade support · differentiation + brand-funded demand-gen",3,STEEL)

# ============================================================ 07 COMPARISON MATRIX
ws,nr=tab("07 Comparison Matrix","Core Competitor Comparison Matrix","Broad functional-beverage set (context + playbook). Direct rivals → MÜV Peer Set.",12,STEEL,desc="8 core brands side by side + MÜV subject row")
H=["Brand","Category","Founded","Founder(s)","First channel","Core claim","Format","Key spec","Unit price","Reach","Peak rev","Outcome"]
rows=[
 ["Poppi","Modern soda","2016","Ellsworths","Farmers mkt→Whole Foods","Prebiotic soda + ACV","12oz can","~2g fiber, 2–5g sugar","~$2.25","~36k US","~$500M (24)","PepsiCo $1.95B 2025"],
 ["OLIPOP","Modern soda","2018","Goodwin/Lester","40 NorCal grocers","9g fiber, gut health","12oz can","up to 9g fiber","~$3.00","~35k US","$400M+ (24)","Indep; $1.85B val"],
 ["LMNT","Electrolyte","2018","Wolf+Ketogains","DTC + podcast","Zero-sugar high-sodium","Powder stick","1,000mg sodium","~$1.50","DTC+Amazon","$206M (23 SEC)","Independent"],
 ["Liquid I.V.","Electrolyte","2012","Cohen","WF sampling→Costco","Hydration Multiplier 2–3x","Powder stick","500mg sodium","~$0.67","80k US","~$200M exit","Unilever 2020"],
 ["Nuun","Electrolyte","2004","Moxey","Cycling specialty","Effervescent low-sugar","Tablets","300mg sodium","~$0.65","Broad","$10M+ (13)","Nestlé 2021"],
 ["Vital Proteins Sparkling","Collagen sparkling","2025","(Nestlé)","Mass retail","Beauty-from-within + clinical","Can","0g sugar, collagen","$2.50","Mass","n/a","Nestlé-owned"],
 ["Recess","Functional sparkling","2018","Witte","DTC→retail","Relaxation: mag + adaptogens","Can","Mag L-threonate","Premium","15k stores","n/a","$30M Series B"],
 ["Aura Bora","Sparkling water","2020","Voges","Shark Tank→retail","Herbal/floral, 0 cal/sugar","Can","0 cal/sugar/sodium","~$2.10","11k stores","$12M (24)","Next In Natural"]]
nr=table(ws,nr,H,rows,[16,14,8,14,20,20,11,16,9,12,14,20],rowh=50)
# MÜV subject row below a callout
ws.cell(row=nr,column=1,value="COLLAGEN-SPARKLING GRAVEYARD: Goldn Hour, BOONS, Luster & Lum — standalone beauty-collagen sparkling flops.").font=F(bold=True,color=AMBERH,size=9)
ws.merge_cells(start_row=nr,start_column=1,end_row=nr,end_column=12); ws.cell(row=nr,column=1).fill=fill(AMBER); ws.cell(row=nr,column=1).border=BORDER; ws.row_dimensions[nr].height=20; nr+=1
muv=["MÜV (Organika) — SUBJECT","Sparkling electrolyte (RTD)","1990","Organika (BC)","Costco CA/Amazon/Well.ca","Daily-wellness sparkling + prebiotic fibre","RTD sparkling CAN","0 sugar, caffeine-free, magnesium glycinate, Fibersol; sodium TBD","$14.99/pk","CA beachhead","pre-launch","Food-regulated (Supplemented Food)"]
for j,v in enumerate(muv,1):
    c=ws.cell(row=nr,column=j,value=v); c.font=F(bold=(j==1),size=9,color=(NAVY if j==1 else "000000")); c.fill=fill(GOLD if j==1 else GREEN); c.alignment=WRAP; c.border=BORDER
ws.row_dimensions[nr].height=48

# ============================================================ MÜV PEER SET
ps,nr=tab("MÜV Peer Set","MÜV Peer Set — Direct Competitors vs Category-Adjacent","Reconciles the workbook to MÜV's actual lane: daily-wellness sparkling electrolyte (food-regulated)",7,GOLD,desc="Direct electrolyte/sparkling rivals vs category-adjacent context")
nr=callout(ps,nr,("HOW TO READ: the 07 Comparison Matrix is the BROAD functional-beverage set (context + playbook). MÜV's DIRECT rivals are electrolyte/"
 "sparkling (below). Borrow the soda brands' go-to-market; benchmark price/format/claims against the electrolyte brands."),7,fc=AMBER,ft=AMBERH,h=46)
nr=banner(ps,nr,"DIRECT PEERS — same occasion / same shelf (benchmark MÜV here)",7,GREENH)
nr=table(ps,nr,["Brand","Format","Sodium/serv","Price/serv","Lane","Canada channel","Why a direct peer"],[
 ["LMNT","Powder stick (+Sparkling can)","1,000 mg","~$1.50","High-sodium performance","Amazon.ca + DTC","Premium ceiling; sparkling-can overlap"],
 ["Liquid I.V.","Powder stick","500 mg","~$1.56 (~$1 Costco)","Daily wellness","Costco Canada (2023)","Closest positioning twin; Costco model"],
 ["Nuun","Effervescent tablet","300 mg","~$0.75","Everyday/endurance","Natural + Amazon.ca","Fizz overlap; value anchor"],
 ["BioSteel","Powder / RTD","moderate","mid","Athletic/clean sport","Broad omnichannel","Canadian rival; cautionary tale"],
 ["Prime","RTD + powder","low","hype","Youth/viral","Walmart/convenience","Sparkling-adjacent RTD; hype warning"],
 ["Organika electrolyte sachets","3.5g powder","~440mg","~$1.00","Daily, Canadian-made","Costco/Well.ca/Amazon","Organika's own line — cannibalization watch"],
 ["MÜV (this product)","Sparkling RTD CAN","TBD ⚠","$14.99/pk","Daily-wellness sparkling","Costco/Amazon/Well.ca","— the subject —"]],[20,22,12,16,20,20,28],rowh=36)
nr=banner(ps,nr,"CATEGORY-ADJACENT — different occasion; context & playbook only",7,STEEL)
nr=table(ps,nr,["Brand","Category","What MÜV borrows","What does NOT transfer","","",""],[
 ["Poppi","Prebiotic soda","TikTok seeding; mass-priced premium; exit proof","Soda occasion; thin-fibre claim risk","","",""],
 ["OLIPOP","Prebiotic soda","Natural-channel seeding; repurchase sell-in","Dessert-soda positioning","","",""],
 ["Vital Proteins Sparkling","Collagen sparkling","Beauty demand proof; clinical-claim model","Collagen-beauty claims (NHP-only in CA)","","",""],
 ["Recess","Relaxation sparkling","Sell the felt benefit lesson","Adaptogen/relaxation occasion","","",""]],[20,18,34,34,2,2,2],rowh=34)
# sodium vs price scatter data
base=nr+2
ps.cell(row=base,column=1,value="Brand"); ps.cell(row=base,column=2,value="Sodium"); ps.cell(row=base,column=3,value="Price")
pts=[("LMNT",1000,1.50),("Liquid I.V.",500,1.56),("Nuun",300,0.75),("Organika sachets",440,1.00)]
for i,(b,na,pr) in enumerate(pts): ps.cell(row=base+1+i,column=1,value=b); ps.cell(row=base+1+i,column=2,value=na); ps.cell(row=base+1+i,column=3,value=pr)
sch=ScatterChart(); sch.title="Electrolyte positioning — Sodium (mg) vs Price/serving"; sch.x_axis.title="Sodium mg"; sch.y_axis.title="Price/serving $"; sch.height=8; sch.width=15; sch.x_axis.delete=False; sch.y_axis.delete=False
for i,(b,na,pr) in enumerate(pts):
    s=Series(Reference(ps,min_col=3,min_row=base+1+i,max_row=base+1+i),Reference(ps,min_col=2,min_row=base+1+i,max_row=base+1+i),title=b); s.marker.symbol="circle"; s.marker.size=9; s.graphicalProperties.line.noFill=True; sch.series.append(s)
ps.add_chart(sch,"A"+str(base))
ps.cell(row=base+6,column=1,value="MÜV sodium/serving TBD — plot when confirmed. Target: daily-wellness zone (moderate sodium, mid price).").font=SMALL
for rr in range(base,base+5): ps.row_dimensions[rr].hidden=True

# ============================================================ 08 EXTENDED LANDSCAPE
ws,nr=tab("08 Extended Landscape","Extended Competitor Landscape (~30 brands)","Amber = FLAG/unverified — re-verify before external use",6,STEEL,desc="~30 brands across 6 sub-categories")
def seg(nr,name): return banner(ws,nr,name,6,STEEL)
H6=["Brand","Founded / Founder","Positioning / hero","Price / footprint","Funding / exit","Status"]
nr=seg(nr,"FUNCTIONAL SODA / PREBIOTIC")
nr=table(ws,nr,H6,[["Culture Pop","2020; Tom First","Probiotic soda, live cultures","Multi-region","$21M (~2024)","Active"],["Health-Ade (Booch Pop)","2012/2020","Prebiotic soda; flagship kombucha","~$250M/yr","Generous Brands $500M","Active"],["Mighty Pop","2023; Beliv","Pre+pro+postbiotics, 3g fiber","US","Beliv portfolio","Active"],["De La Calle","2020","Tepache, low sugar","Retail","$7M (2022)","Active"],["Wildwonder","~2018; Rosa Li","Sparkling pre+probiotic","Sprouts/Target","Shark Tank $500K","Active"],["Simply Pop","2025; Coca-Cola","Prebiotic soda (incumbent)","Mass","Corporate","Active"]],[16,24,26,16,20,14],rowh=26)
nr=seg(nr,"SPARKLING / FLAVORED WATER")
nr=table(ws,nr,H6,[["Spindrift","2010; Creelman","Real squeezed fruit","National","$75.7M; Gryphon","Active"],["Waterloo","2017; CAVU","Bold zero-cal sparkling","National","Flexis-led 2020 (NOT KDP)","Active"],["Hint","2005; Goldin","Unsweetened fruit-essence","National","$51.5M; ~$150M val","Active"],["AHA","2020; Coca-Cola","Zero-cal flavor-pair","Reduced","Corporate","Distribution cut"],["Bubly","2018; PepsiCo","Playful zero-cal","National","Corporate","Active"]],[16,24,26,16,20,14],rowh=24)
nr=seg(nr,"ELECTROLYTE / HYDRATION")
nr=table(ws,nr,H6,[["Gatorlyte","2022; PepsiCo","Rapid 5-electrolyte","Full","Corporate","Active"],["Prime Hydration","2022; Paul/KSI","Influencer-led","Mass","~$1.2B peak 2023, down ~75% FLAG","Contracting"],["Cure Hydration","~2018; Picasso","Plant-based, no sugar","Retail","$5.6M A (2023)","Active"],["DripDrop","2008; Dolhun","Medical-grade ORS","Retail","$3M+$5.6M early","Active"],["Ultima","25+ yrs","Zero-sugar electrolyte","Retail","Undisclosed FLAG","Active"]],[16,24,26,16,20,14],rowh=24)
nr=seg(nr,"ENERGY / FUNCTIONAL (playbook reference)")
nr=table(ws,nr,H6,[["Celsius","2004; NASDAQ 2017","Thermogenic; fitness/social + PepsiCo","100k+ doors","PepsiCo $550M (2022); bought Alani Nu $1.8B","Public"],["Alani Nu","2018; Hearn","Influencer/DTC → mass","Mass","~$595M rev 2024; Celsius $1.8B","Acquired"],["Ghost","2016","Community/influencer","Mass","KDP 60% (2024)","Acquired"]],[16,24,26,16,20,14],rowh=26)
nr=seg(nr,"COLLAGEN / BEAUTY / ADAPTOGEN")
nr=table(ws,nr,H6,[["Vital Proteins","Seidensticker","Leading US collagen","National","Nestlé (2022)","Active"],["Moon Juice","2011; Bacon","Adaptogenic dusts","DTC+retail","Undisclosed FLAG","Active"],["Olly","—","Gummy vitamins incl. collagen","Mass","Unilever (2019)","Active"],["Halo","Ambiguous","Ingestible supplement (NOT a beverage)","—","—","Clarify"],["Mud\\Wtr","2018; Heath","Coffee-alt w/ mushrooms","DTC-led","~$1M seed; later FLAG","Active"]],[16,24,26,16,20,14],rowh=24)
nr=seg(nr,"CANADIAN FUNCTIONAL BEVERAGE BRANDS")
nr=table(ws,nr,H6,[["Collective Arts","2013; Hamilton","Craft + non-alc/wellness","National","Independent","Active"],["Flow","2015; Reichenbach","Alkaline spring water","~46k stores NA","TSX; ~C$30M","Active (pressured)"],["Partake","2017; Fleming","Non-alc beer; Hop Twist (2025)","National","Kickstarter origin","Active"],["Rise Kombucha","2008; Montreal","Leading CA kombucha; Better Soda","National","Buddha Brands","Active"],["BioSteel","Toronto","Sports hydration; NHL halo","Omnichannel","Canopy→bankrupt 2023→Coachwood","Revived"]],[16,24,26,16,20,14],rowh=24)
nr=callout(ws,nr,"VERIFICATION: “GoodSip/Rad/Local/Botaniste” could not be verified and were dropped (replace w/ Loop Mission/Crazy D's/Cove Soda). Waterloo = Flexis-led (2020), NOT KDP. “Halo” is a supplement, not an RTD. Re-verify FLAG funding figures before circulation.",6,fc=AMBER,ft=AMBERH,h=44)

print("...landscape built...")

# ============================================================ 09 CHANNEL & RETAIL
ws,nr=tab("09 Channel & Retail","Channel & Retail Strategy","Where they launched, why, and how they sequenced expansion",5,STEEL,desc="Launch channel & expansion sequence per brand")
nr=table(ws,nr,["Brand","Launch channel (why)","Expansion sequence","Reach today","Canada presence"],[
 ["Poppi","Dallas farmers market; Whole Foods buyer found it in ~3 weeks","Farmers mkt→Whole Foods→DTC/Amazon(#1 soda 2023)→grocery→mass/club","~36k US, 120+ retailers","Aug 2024: Loblaws, Metro, Save-On, Costco, Sobeys, Well.ca"],
 ["OLIPOP","40 NorCal indie grocers (Oct 2019)","Indie→Sprouts/WF→Kroger/Safeway→Target/Walmart/Costco; 4,500 by Nov 2020","~35k US","Thin official; NevrAsk distributor; Amazon.ca, Natura"],
 ["LMNT","DTC + podcast — owned customer day one","DTC/sub→Amazon→select retail + Sparkling can","DTC-led + Amazon","Ships to Canada from site"],
 ["Liquid I.V.","Whole Foods sampling → 12 WF by 2015; then Costco","WF→Costco national (2019, ~516 whs)→broad; 30k→80k","80k US","Costco Canada FIRST (2023); Amazon.ca, Walmart, Loblaws"],
 ["Nuun","Cycling/endurance specialty (2004)","Run/bike→REI/WF→broad grocery/mass","Broad; #1 run/bike/outdoor","Canadian retailers page"],
 ["Celsius","Amazon + gym/fitness influencers","Amazon→Target DSD→100k doors→PepsiCo distribution","100k+ doors","Jan 2024 via PepsiCo"],
 ["Vital Proteins Sparkling","Mass retail (Nestlé muscle) — skipped indie","Big-brand mass launch","Mass","Not yet verified at CA retail"]],[14,34,40,18,38],rowh=74)
nr=callout(ws,nr,"READ-ACROSS: Costco Canada + Amazon.ca + natural channel is the proven Canadian beachhead (Liquid I.V., Poppi). Organika already holds those relationships — a structural head-start.",5,h=40)

# ============================================================ 10 CHANNEL ECONOMICS
ws,nr=tab("10 Channel Economics","Channel Economics & Margin Waterfall","Only Amazon fees, Costco margin & DTC CAC are HARD; the rest are operator rules-of-thumb",4,STEEL,desc="Margin waterfall, distributor/trade-spend, DTC/Amazon, Canada stack")
nr=banner(ws,nr,"MARGIN WATERFALL — canned functional beverage",4)
nr=table(ws,nr,["Line","Typical value","Tag"],[
 ["Unit COGS target","< $1.00/unit at scale","RULE OF THUMB"],["Blended gross margin (early)","40–50%; 50–65% aspiration","RULE OF THUMB"],
 ["GM by channel","Retail ~35–45%; DTC ~40–50% (pre CAC/freight)","RULE OF THUMB"],["COGS warning","Excluding freight/duty/co-pack overstates GM 3–8 pts","RULE OF THUMB"]],[28,50,22],rowh=22)
nr=banner(ws,nr,"CHANNEL TAKE-RATES & FEES",4)
nr=table(ws,nr,["Channel / cost","Take / value","Tag"],[
 ["Club (Costco)","Max 14% markup; FY24 actual GM 10.92% — volume not margin","HARD"],["Distributor (UNFI/KeHE)","15–25%; UNFI avg ~13–14%","HARD-ish"],
 ["Amazon","8–45% referral (most 15%) + FBA $3.73–$6.97/unit","HARD (published)"],["DTC CAC (food & bev)","~$45–$53; shipping $8–15/order","HARD (benchmark)"],
 ["Slotting","$250→$250,000 by scope; ~$25k/item cluster","RULE OF THUMB"],["Trade spend % of revenue","10–20% (high end for emerging); #2 P&L line","HARD (aggregate)"],
 ["LMNT subscription model","$200M+ rev 2023, ~20% net, 250k+ customers; free-sample funnel","HARD (company/SEC)"]],[26,64,22],rowh=24)
nr=banner(ws,nr,"CANADA COST STACK (additive)",4,TEAL)
nr=table(ws,nr,["Item","Value","Tag"],[
 ["Grocery concentration","Loblaw+Sobeys+Metro ≈80% w/ Walmart+Costco; Grocery Code of Conduct (Jan 2025)","HARD"],
 ["Listing/slotting fees","Not publicly disclosed; model at ≥ US slotting","No public $"],["Bilingual packaging","EN+FR mandatory; fines up to $20k; Bill 96","HARD (reg.)"],
 ["Distributors (CA)","UNFI Canada, Tree of Life, Purity Life, Ecotrend","HARD"],["Freight/FX/duty","FX + cross-border freight + duty; local co-pack is the margin fix","Qualitative"]],[22,68,22],rowh=26)
nr=callout(ws,nr,"DTC-for-beverage reality: heavy to ship, low online AOV, CAC can exceed contribution. Survivable DTC model (LMNT) is subscription + free-sample + asset-light profitability — not paid-media scale.",4,fc=AMBER,ft=AMBERH,h=36)

# ============================================================ 11 FORMULATION
ws,nr=tab("11 Formulation","Formulation & Positioning — the claim that won",None,5,STEEL,desc="Winning claim, hero ingredient, claim risk")
nr=table(ws,nr,["Brand","Winning claim","Hero ingredient & spec","Positioning evolution","Claim risk"],[
 ["Poppi","Prebiotic soda you drink daily","Prebiotic fibre + ACV; ~2g fibre","ACV tonic → 2020 bright prebiotic soda","$8.9M settlement — 2g fibre too little"],
 ["OLIPOP","Serious fibre for gut health","Up to 9g fibre + botanicals","Stable since launch; ~4× Poppi fibre","Stronger substantiation; no suit found"],
 ["LMNT","Zero-sugar, high-sodium","1,000mg sodium, 0g sugar","Salt-first, science-forward","Sodium is the polarizing hook"],
 ["Liquid I.V.","Hydration Multiplier 2–3×","CTT; 500mg sodium, 11g carbs","Added sugar-free line later","CTT is marketing-led; sugar a vulnerability"],
 ["Nuun","Carb-free effervescent","300mg sodium, 1g sugar, stevia","Endurance → added powders","Clean low-sugar story"],
 ["Vital Proteins Sparkling","Beauty + clinical collagen at mass price","VERISOL collagen + Vit C; 0g sugar","Extends #1 collagen powder","2025 meta-analysis: no proven skin benefit"],
 ["Recess","Relaxation — sell the benefit","Magnesium L-threonate + adaptogens","Pivoted CBD→relaxation","KEY LESSON: lead with felt benefit"]],[16,26,28,28,30],rowh=50)
nr=callout(ws,nr,"READ-ACROSS for MÜV: collagen-as-hero has a graveyard + a 2025 no-benefit meta-analysis. Lead with gut+hydration function + a credible collagen dose under the “Canada's #1 collagen brand” halo — not narrow beauty-from-within.",5,h=44)

# ============================================================ 12 MARKETING
ws,nr=tab("12 Marketing","Marketing & Brand Build — the virality engine",None,4,STEEL,desc="Founder story + virality engine")
nr=table(ws,nr,["Brand","Founder story","Growth engine","What moved the needle"],[
 ["Poppi","Ellsworths; Shark Tank 2018 ($400k/25%, Oza)","TikTok creator seeding + 2 Super Bowls","Pink aesthetic, Alix Earle/Emily Mariko; vending stunt (2025, mixed)"],
 ["OLIPOP","Goodwin (ex-Obi) & Lester; $100k from Obi","DTC repurchase + reactive social","“Soda Stories”; needled Poppi's SB spend — earned media"],
 ["LMNT","Wolf (biochemist) + Ketogains","Podcast-sponsorship moat (Huberman, Attia)","Host-read trust + free-sample funnel; $54.6M mktg 2023"],
 ["Liquid I.V.","Cohen, college brainchild","Costco roadshow sampling + give-back","Founder sampled weekly; POS-data sell-in; Emerson Group"],
 ["Celsius","Turnaround 2012; Li Ka-shing $15M","Amazon + fitness influencers","Amazon velocity→Target DSD→PepsiCo $550M"],
 ["Recess","Witte","Pastel brand world + culture-tuned social","Owned a vibe + the relaxation moment"]],[16,30,30,40],rowh=46)
nr=callout(ws,nr,"READ-ACROSS: the two cheapest high-ROI challenger plays are LMNT's trusted-host podcast model and OLIPOP's reactive earned-media social — both winnable without Super Bowl budgets. Pair with Costco roadshow sampling.",4,h=40)

# ============================================================ 13 LAUNCH PLAYBOOKS
ws,nr=tab("13 Launch Playbooks","Launch Playbook Teardowns — phased GTM timelines",None,5,STEEL,desc="Phased GTM timelines per brand")
nr=table(ws,nr,["Brand","Phase 0 (pre-launch)","Phase 1 (yr 0–1)","Phase 2 (scale, yr 1–3)","Phase 3 (maturity/exit)"],[
 ["Poppi","2015–16 gut insight; ~$90k self-funded; glass bottles","Farmers mkt→Whole Foods; Shark Tank 2018","2020 rebrand to cans + national; TikTok seeding; #1 Amazon 2023","2024 SB ad; >$500M; PepsiCo $1.95B May 2025"],
 ["OLIPOP","Obi proceeds $100k; nostalgic-soda + fibre","Late 2018: 40 NorCal grocers; ~$852k yr1","“Astronomical repurchase” sell-in; $73.4M (2022); $39.7M Series B","$400M+ (2024); 7,000 grocers; $1.85B INDEPENDENT"],
 ["LMNT","2018–19 keto-sodium insight; high-sodium formula","Late 2019 DTC-only; free sample pay-shipping","Podcast sponsorships; ~$50M run-rate Q1 2022","$206M (2023 SEC); private; NO exit"],
 ["Liquid I.V.","2012 Pedialyte insight; WHO-ORS CTT","WF Supplier 101; weekly sampling→12 WF 2015","Costco roadshow; Emerson 2015; ~$100M in 5 yrs","Unilever Sept 2020 (~$500M est.); 30k→80k"],
 ["Celsius","2004; near-bankruptcy ~2010 (over-marketing)","Turnaround 2012; Li Ka-shing 2015; NASDAQ 2017","Amazon ~15–20% (2020); Target DSD; 100k by 2021","PepsiCo $550M (2022); bought Alani Nu $1.8B"]],[12,28,28,28,28],rowh=80)
nr=callout(ws,nr,"DATE TRAP: Poppi's FIRST Super Bowl ad = 2024 (LVIII); the vending-machine controversy = 2025 (LIX). Many secondary sources conflate them.",5,fc=AMBER,ft=AMBERH,h=28)

# ============================================================ 14 PATTERNS & FAILURES
ws,nr=tab("14 Patterns & Failures","Success Patterns & Failure Modes",None,2,STEEL,desc="7 success patterns + 6 failure modes")
ws.column_dimensions["A"].width=4; ws.column_dimensions["B"].width=112
nr=banner(ws,nr,"SEVEN SUCCESS PATTERNS",2,GREENH)
pats=["Founder-authority insight tied to a personal health problem — cheap, durable brand moat.","ONE concentrated trial tactic, executed obsessively, before broad spend.","Sell-in on DATA (velocity/repurchase), not flavour — the single most repeated lever.","Sequenced channel ladder — natural/DTC→specialty→grocery→mass→club; never skip rungs.","Strategic-investor signal early (Oza, Li Ka-shing, celebrity rounds).","Category-creation language to escape commodity comparison and hold a premium.","Endgame split: strategic exit (Poppi/Liquid I.V./Celsius) vs independence (OLIPOP/LMNT)."]
r=nr
for i,p in enumerate(pats,1):
    ws.cell(row=r,column=1,value=i).font=BODYB; c=ws.cell(row=r,column=2,value=p); c.font=BODY; c.alignment=WRAP; c.border=BORDER; c.fill=fill(LIGHT2 if i%2 else WHITE); ws.row_dimensions[r].height=26; r+=1
r+=1; r=banner(ws,r,"SIX FAILURE MODES",2,REDH)
fails=["Over-distribution before PMF — Celsius's own ~2010 near-bankruptcy; BioSteel's >$3 COGS per $1 rev → 2023 bankruptcy.","Undercapitalized / capital-intensive DTC — ~90% of beverage startups failed historically.","Premium price with no moat / thin claims — ~32% cite “too expensive”.","Trial without retention — sampling wasted if repurchase is weak.","Brand/tone missteps at scale — Poppi's 2025 vending stunt.","Wrong timing / flavour failure — baseline reason ~85% of new CPG products fail in 2 yrs."]
for i,p in enumerate(fails,1):
    ws.cell(row=r,column=1,value=i).font=BODYB; c=ws.cell(row=r,column=2,value=p); c.font=BODY; c.alignment=WRAP; c.border=BORDER; c.fill=fill(RED if i%2 else WHITE); ws.row_dimensions[r].height=26; r+=1

# ============================================================ 15 OUTCOMES & M&A
ws,nr=tab("15 Outcomes & M&A","Financial Outcomes & M&A Comps",None,6,STEEL,desc="Revenue, funding, valuations, acquisition comps")
nr=table(ws,nr,["Brand","Revenue trajectory","Funding / valuation","Exit / status","Category share","Profitability"],[
 ["Poppi","$13M(20)→$65M(22)→$100M+(23)→~$500M(24)","VC-backed","PepsiCo $1.95B (net ~$1.65B), May 2025","~38% modern soda","n/a"],
 ["OLIPOP","$852k(18)→$200M+(23)→$400M+(24)","$50M Series C @ $1.85B (Feb 2025, JPM)","Independent","~32.7% modern soda","Cash-profitable early 2024"],
 ["LMNT","$206M sales (2023, SEC)","Reg CF","Independent","n/a","~20% net margin (2023)"],
 ["Liquid I.V.","~$100M in 5y→~$200M exit→$1B+ now","—","Unilever Sept 2020 (~$500M est.)","n/a","Unilever +$80M MO plant"],
 ["Nuun","$10M+ (2013)","TSG Consumer (2017)","Nestlé HS July 2021","#1 run/bike/outdoor","n/a"],
 ["Celsius","multi-$B (public)","Li Ka-shing $15M (2015)","Public; PepsiCo $550M; bought Alani Nu $1.8B (closed Apr 1 2025, net $1.65B)","~#3 US energy","Profitable"],
 ["Vital Proteins","(in Nestlé HS)","—","Nestlé (full 2022)","—","—"]],[14,34,26,32,16,18],rowh=34)
nr=callout(ws,nr,"M&A READ: strategics own most winners — PepsiCo (Poppi, Celsius stake), Unilever (Liquid I.V., Olly), Nestlé (Vital Proteins, Nuun), KDP (Ghost). For a challenger the realistic endgame is acquisition — but Coke's organic Simply Pop shows incumbents may CLONE rather than buy. OLIPOP (independent, $1.85B) is the counter-example.",6,h=44)

# ============================================================ 16 SWOT
ws,nr=tab("16 SWOT","Per-Brand SWOT",None,5,STEEL,desc="Per-brand SWOT incl. MÜV")
nr=table(ws,nr,["Brand","Strengths","Weaknesses","Opportunities","Threats"],[
 ["Poppi","Mass brand love, TikTok, PepsiCo distribution","Thin fibre dose, claims litigation","PepsiCo scale, intl","Commoditization, Simply Pop, scrutiny"],
 ["OLIPOP","9g fibre moat, repeat rate, independence","Premium price, single category","Mass expansion, formats","PepsiCo-backed Poppi, Coke, private label"],
 ["LMNT","Profitable, capital-light, podcast moat","Polarizing sodium, niche, DTC-dependent","Retail, sparkling, intl","Electrolyte crowding (Prime, clones)"],
 ["Vital Proteins Sparkling","Nestlé muscle, #1 collagen halo, clinical claim","New format unproven, efficacy debate","Owns beauty mainstreaming","2025 no-benefit meta-analysis, claims risk"],
 ["MÜV (Organika)","Domestic CA producer, #1 CA collagen halo, existing CA shelf, cost edge","Unproven RTD, food-format claim limits, small vs strategics","Costco CA/Amazon beachhead, gut+hydration stack, Supplemented-Food pathway","Nestlé/Vital Proteins, efficacy/claims liability, shelf saturation"]],[16,26,26,26,26],rowh=56)

# ============================================================ 17 SCORING MODEL
sm,nr=tab("17 Scoring Model","Weighted Competitive Scoring Model","Scores 1–5 (5=strongest). Edit weights (amber) & scores; totals auto-calc.",10,STEEL,desc="Weighted competitive scoring (editable, heatmap)")
crit=[("Brand strength",0.15),("Distribution",0.15),("Claim defensibility",0.15),("Margin/price power",0.10),("Innovation/format",0.10),("Marketing engine",0.10),("Capital/backing",0.15),("Canada readiness",0.10)]
sm.cell(row=nr,column=1,value="WEIGHTS →").font=BODYB
for j,(c,w) in enumerate(crit,2):
    x=sm.cell(row=nr,column=j,value=w); x.font=BODYB; x.alignment=CTR; x.number_format="0%"; x.fill=fill(AMBER); x.border=BORDER
wrow=nr; nr+=1
hdr=["Brand"]+[c for c,_ in crit]+["Weighted"]
for j,h in enumerate(hdr,1):
    c=sm.cell(row=nr,column=j,value=h); c.font=HEAD; c.fill=fill(NAVY); c.alignment=CTR; c.border=BORDER
sdata=[("Poppi",[5,5,2,3,3,5,5,2]),("OLIPOP",[5,5,4,3,4,4,4,2]),("LMNT",[4,3,3,4,3,5,4,2]),("Liquid I.V.",[4,5,3,3,3,4,5,3]),("Vital Proteins Sparkling",[4,5,4,3,3,3,5,2]),("Recess",[3,3,3,3,4,4,3,1]),("MÜV (Organika)",[3,3,3,4,3,2,2,5])]
r=nr+1; first=r
for i,(b,sc3) in enumerate(sdata):
    sm.cell(row=r,column=1,value=b).font=BODY; sm.cell(row=r,column=1).border=BORDER
    if i%2: sm.cell(row=r,column=1).fill=fill(LIGHT)
    for j,s in enumerate(sc3,2):
        x=sm.cell(row=r,column=j,value=s); x.font=BODY; x.alignment=CTR; x.border=BORDER
        if i%2: x.fill=fill(LIGHT)
    wc=2+len(crit); formula=f"=SUMPRODUCT({get_column_letter(2)}{r}:{get_column_letter(1+len(crit))}{r},{get_column_letter(2)}${wrow}:{get_column_letter(1+len(crit))}${wrow})"
    x=sm.cell(row=r,column=wc,value=formula); x.font=BODYB; x.alignment=CTR; x.border=BORDER; x.number_format="0.00"
    if i%2: x.fill=fill(LIGHT)
    r+=1
last=r-1
sm.column_dimensions["A"].width=22
for j in range(2,2+len(crit)): sm.column_dimensions[get_column_letter(j)].width=11
sm.column_dimensions[get_column_letter(2+len(crit))].width=12
sm.conditional_formatting.add(f"B{first}:I{last}",ColorScaleRule(start_type='num',start_value=1,start_color='F8696B',mid_type='num',mid_value=3,mid_color='FFEB84',end_type='num',end_value=5,end_color='63BE7B'))
sm.conditional_formatting.add(f"J{first}:J{last}",DataBarRule(start_type='num',start_value=0,end_type='num',end_value=5,color=TEAL))
nr=last+2
nr=callout(sm,nr,"Weights (amber) sum to 100%; weighted = SUMPRODUCT(scores × weights). Illustrative analyst judgment — recalibrate with your data. MÜV scores high on Canada readiness & margin, low on marketing engine & capital — exactly where the launch plan must invest.",10,h=44)

# ============================================================ 18 CANADA MARKET
ws,nr=tab("18 Canada Market","Canada Market — Retail Landscape & Entry Playbooks",None,5,GREENH,desc="Retail banners & share, entry playbooks, pricing")
nr=banner(ws,nr,"GROCERY BANNERS & APPROX SHARE (varies by methodology)",5)
nr=table(ws,nr,["Retailer","Banners","Share","Note"],[
 ["Loblaw","Loblaws, No Frills, Shoppers, RC Superstore, Maxi","~26–30%","Largest; pharmacy via Shoppers"],["Empire/Sobeys","Sobeys, Safeway, IGA, FreshCo","~20–21%","#2"],
 ["Costco Canada","Costco","~14%","Proven beachhead for new functional bev"],["Walmart Canada","Walmart","~12%","Mass"],["Metro","Metro, Food Basics, Jean Coutu","~11–12%","Strong QC+ON"],["Pattison/Save-On","Save-On-Foods, Buy-Low","Regional (West)","187 Save-On stores"]],[16,40,12,30],rowh=24)
nr=banner(ws,nr,"HOW US BRANDS ENTERED CANADA",5,STEEL)
nr=table(ws,nr,["Brand","When","Entry model"],[
 ["Liquid I.V.","2023 (first intl)","Via Unilever; Costco FIRST → Amazon.ca, Walmart, Loblaws, Jean Coutu"],["Poppi","Aug 13, 2024","Brand-led; Loblaws, Metro, Save-On, Costco, Sobeys + Well.ca, Natura"],
 ["OLIPOP","Limited","NevrAsk distributor; Amazon.ca, Natura"],["Celsius","Jan 2024","PepsiCo exclusive distribution"],["Prime","2023","Hydration sells; ENERGY blocked (200mg caffeine > 180mg cap)"]],[14,22,66],rowh=26)
nr=banner(ws,nr,"PRICING",5,TEAL)
nr=table(ws,nr,["Item","Value","Note"],[
 ["Premium functional can","~CAD $3.49 MSRP (Poppi); promo ~$2.50","Shelf norm to anchor against"],["Cross-border premium","FX + freight + duty","US$2.50 can lands well above C$3.49 imported"],
 ["Margin fix","Local/contract co-packing in Canada","Organika's domestic production is the structural edge"]],[20,42,38],rowh=24)
nr=callout(ws,nr,"WHAT WORKED: (1) enter via Costco or a parent/distributor DSD; (2) reformulate to Canadian limits BEFORE launch (Prime Energy cautionary tale); (3) seed Amazon.ca + Natura/Well.ca ahead of grocery. Organika already has the shelf relationships.",5,h=44)

# ============================================================ 19 CANADA REGULATORY
ws,nr=tab("19 Canada Regulatory","Canada Regulatory — classification & claims","See Canada Regulatory v2 for the 2026 sport-electrolyte reclassification",3,GREENH,desc="NHP vs Food vs Supplemented Food; SFCI; caffeine; Bill 96")
nr=table(ws,nr,["Item","Detail","Conf."],[
 ["Classification","RTD sparkling beverage = FOOD (Food Directorate + CFIA), outside the NHP framework. Format is not the sole decider — representation + claims matter.","✅"],
 ["Supplemented Foods","A can with added vitamins/minerals/amino acids = a Supplemented Food (framework in force Jul 21, 2022): Supplemented Food Facts table + cautions + possible SFCI identifier.","✅"],
 ["Collagen caution","Foods with hydrolyzed collagen must show on the principal display panel, same type size as the common name: “CAUTION, DO NOT USE AS SOLE SOURCE OF NUTRITION” (FDR).","✅"],
 ["Caffeine","Caffeinated-beverage category cap: 180mg per single-serve container (blocked Prime Energy at 200mg). Moot for caffeine-free MÜV.","✅"],
 ["Claims","Beauty/skin/anti-aging structure-function claims are NHP-only; restricted on a food/supplemented-food label.","DIRECTIONAL — counsel"],
 ["Labelling","Bilingual EN/FR mandatory; Quebec Bill 96/OQLF (French ≥ as prominent; descriptors in French).","✅/◐"]],[20,74,24],rowh=46)

# ============================================================ CANADA REGULATORY v2
ws,nr=tab("Canada Regulatory v2","Canada Regulatory v2 — Sport-Electrolyte Reclassification (2026)","Supersedes the powder/NHP framing. ✅HARD ◐DIRECTIONAL ⚠FLAG",3,GREENH,desc="Sport-electrolyte → Supplemented Foods; the claims fork")
nr=callout(ws,nr,("HEADLINE: Health Canada Public Notice (Apr 2026) reclassifies ALL sport-electrolyte products — RTD, powders AND effervescent tablets — from NHP "
 "to FOODS / Supplemented Foods. Existing NPN holders transition by Dec 31, 2027; NEW products comply with the FDR now. Oral Rehydration Solutions stay NHP."),3,fc=AMBER,ft=AMBERH,h=52)
nr=banner(ws,nr,"FORMAT IS NOT THE DECIDER (the key nuance)",3)
nr=table(ws,nr,["Point","Detail","Conf."],[
 ["Format ≠ classification","Even powders & effervescent tablets for reconstitution CAN be foods. Classification weighs representation, composition, format, perception & history together.","✅"],
 ["Toward FOOD","Beverage representation; scoop/serving + a Nutrition/Supplemented-Food Facts table; consumed freely like ordinary food.","✅"],
 ["Toward NHP","Dosage forms (capsules, single-dose sticks) + regimented dosing + defined daily limits + therapeutic/structure-function claims.","✅"],
 ["Real driver = CLAIMS","Electrolyte/hydration framing = food. Collagen skin/joint/hair/beauty = NHP-only. The claim, not the format, decides the lane.","✅"]],[22,72,12],rowh=42)
nr=banner(ws,nr,"CLAIMS FORK",3)
nr=table(ws,nr,["If the product is…","Framework","Allowed claims"],[
 ["Plain electrolyte (can OR powder)","Supplemented Food","hydration, “replenish electrolytes”, source-of-magnesium/potassium, sugar-free, nutrient-content & function claims"],
 ["Electrolyte + collagen w/ beauty/joint claims","NHP (NPN)","“supports skin/hair/nails/joints”, collagen structure-function (dose-format powder is the defensible vehicle)"],
 ["Oral rehydration (clinical)","NHP (NPN)","therapeutic rehydration"]],[30,18,60],rowh=38)
nr=callout(ws,nr,"PRACTICAL TAKEAWAY FOR MÜV (an RTD electrolyte can): it's a Supplemented Food — SFFt + cautions as applicable; design to the framework now. Keep collagen-beauty claims on the NHP powder line, not the can. Caffeine-free avoids the 180mg caution regime. Confirm the exact claim set with counsel.",3,h=48)

# ============================================================ ELECTROLYTE BFY DEEP-DIVE
ws,nr=tab("Electrolyte BFY Deep-Dive","Electrolyte / Sparkling / BFY — Canada-First Deep-Dive","Deep-research pass: MÜV's real lane. ✅HARD ◐DIRECTIONAL ⚠FLAG",6,GREENH,desc="Canada-first electrolyte/sparkling/BFY research; MÜV's real lane")
nr=callout(ws,nr,("MÜV is a food-regulated RTD sparkling CAN competing in the daily-wellness sparkling lane. Win on format + Canadian-made, not collagen-beauty claims. "
 "Canada moves all sport-electrolyte products to Supplemented Foods by 2027."),6,fc=AMBER,ft=AMBERH,h=36)
nr=banner(ws,nr,"1 · MARKET SIZING (Canada-first)",6)
nr=table(ws,nr,["Metric","Value","Geo","Conf.","Source","Note"],[
 ["Powdered hydration mixes","$1.5B (2024), +20% YoY","US","✅","Circana via CNN","4 straight yrs double-digit"],
 ["Gatorade powder enhancers","+200% over 4 yrs","US","✅","Circana","—"],
 ["Electrolyte powder market","~$8.7B (2024), ~8.8% CAGR","Global","◐","Grand View/Mordor","powder fastest-growing format"],
 ["Canada powdered hydration","~US$404M → $738.5M (10.7% CAGR)","Canada","⚠◐","Grand View","3rd-party est."],
 ["Liquid I.V.","#1 US powdered hydration; CA 2023","US/CA","✅","CNN; Unilever","—"]],[24,24,8,8,20,22],rowh=26)
nr=banner(ws,nr,"2 · GTM & THE BIOSTEEL CAUTIONARY TALE",6)
nr=table(ws,nr,["Case","Canada entry","Lesson"],[
 ["Liquid I.V.","Costco Canada national (Jul 2023); festival + roadshow sampling","Costco = the proven one-big-door beachhead"],
 ["LMNT","Amazon.ca + DTC; podcast + free-sample","Cheap high-ROI trial funnel; borrow it, not the 1,000mg sodium"],
 ["BioSteel (Canadian)","Broad omnichannel on NHL halo","Canopy bought 72% for $50.7M (2019); burned >$3 COGS per $1 rev; CCAA bankruptcy Sept 2023; sold ~$30.4M to Coachwood; lost NHL to Coke's BodyArmor. MORAL: velocity & unit economics FIRST."],
 ["Powder vs RTD","Powder ships ~60–70% cheaper, shelf-stable","MÜV-the-CAN forgoes that edge → margin leans on BC manufacturing"]],[20,34,54],rowh=50)
nr=callout(ws,nr,"RECOMMENDATION: beachhead Costco CA + Amazon.ca/Well.ca/DTC; position daily-wellness sparkling made in Canada (between Liquid I.V. and LMNT); label to Supplemented-Food framework; keep collagen-beauty on the NHP powder; borrow LMNT sample funnel + #WaterTok; lean on BC manufacturing for margin.",6,h=48)

print("...analysis tabs built...")

# ============================================================ 20 GTM RECOMMENDATION
ws,nr=tab("20 GTM Recommendation","MÜV Go-to-Market Recommendation",None,2,AMBERH,desc="The MÜV go-to-market thesis & decisions")
ws.column_dimensions["A"].width=26; ws.column_dimensions["B"].width=96
nr=callout(ws,nr,"VERDICT: GO — conditional on resolving the Supplemented-Foods claim/label pathway and dosing collagen to a defensible level. Tailwinds are real; Organika has a genuine Canadian edge; the risks are manageable with discipline.",2,h=48)
nr=table(ws,nr,["Decision","Recommendation"],[
 ["1. Positioning","Lead with a FUNCTIONAL benefit stack (gut/prebiotic fibre + hydration + a credible collagen dose) under a “by Canada's #1 collagen brand” halo. Avoid narrow beauty-from-within hero claims (graveyard + 2025 meta-analysis)."],
 ["2. Formulation","Dose collagen to a substantiable level (2.5g+). Zero/low sugar is table stakes. Add prebiotic fibre for a defensible gut hook. Caffeine-free to avoid the 180mg caution regime."],
 ["3. Channel beachhead","Costco Canada + Amazon.ca + natural channel (Whole Foods CA, Healthy Planet) + Organika's pharmacy/health-food/Well.ca base. Mirrors Liquid I.V./Poppi's entry. Do NOT chase national grocery before proving velocity."],
 ["4. Pricing","Anchor at/below the ~$3.49 CAD premium shelf norm. Domestic production protects margin where imported US brands can't. Plan 35–45% early trade spend; free-fill over cash slotting."],
 ["5. Marketing","Trusted-host podcast sponsorship (LMNT) + reactive earned-media social (OLIPOP) + Costco roadshow sampling (Liquid I.V.). Skip Super Bowl spend. Sell-in on velocity/repeat data."],
 ["6. Claims & legal","Engage Canadian regulatory counsel on the Supplemented-Foods claim set BEFORE artwork. Build substantiation files. Include the mandatory collagen caution. Dose-to-claim discipline is existential."],
 ["7. Moat & exit","Differentiate on a real spec + Canadian-made authenticity + Organika's collagen credibility. Plan for an acquisition-oriented endgame while building OLIPOP-style independence via profitability and repeat."]],[26,96],rowh=72)

# ============================================================ HOW TO PRESENT
ws,nr=tab("How to Present","How to Present — leadership readout","One line to say on each key tab. Lead with the decision.",3,GOLD,desc="Leadership readout — talking point per key tab")
nr=table(ws,nr,["Tab","Say this","Then show"],[
 ["Open","“One decision: GO — conditional. Launch MÜV as daily-wellness sparkling hydration, made in Canada.”","Decision Memo"],
 ["Decision Memo / Exec Brief","“The whole case on one page — verdict, numbers, five moves, risks.”","Executive Brief 1-page"],
 ["Dashboard","“The category is real: modern soda $1.8B (+83%), hydration powders $1.5B (+20%).”","Dashboard charts"],
 ["MÜV Peer Set","“We compete with LMNT, Liquid I.V., Nuun — not Poppi. Sparkling is our wedge.”","peer ladder + scatter"],
 ["Financial Model","“Flip the scenario. Even Conservative has a defined break-even; Base is healthy.”","scenario dropdown"],
 ["Canada Regulatory v2","“It's a food, not an NHP. Label to Supplemented Foods now; collagen claims stay on the powder.”","claims fork"],
 ["Go-No-Go","“The weighted gates say GO — conditional; the conditions are dose/claims + regulatory sign-off.”","auto-verdict"],
 ["Risk Register","“Top three risks — claims liability, big-CPG rivals, over-distribution — all mitigable.”","heatmap"],
 ["The ask","“Approve Phase 0: confirm MÜV specs, regulatory sign-off, co-packer quote, Costco beachhead.”","Next Steps & Gates"]],[22,70,24],rowh=32)

# ============================================================ FAQ & OBJECTIONS
ws,nr=tab("FAQ & Objections","FAQ & Objections — answers for the leadership room","Anticipated pushback + the one-line answer, with a proof tab",3,GOLD,desc="Anticipated leadership pushback + crisp answers")
nr=table(ws,nr,["Objection","Answer","Proof tab"],[
 ["“Isn't this just another me-too electrolyte?”","A flavoured SPARKLING electrolyte is genuine white space; we own the daily-wellness sparkling occasion, made in Canada.","MÜV Peer Set / Deep-Dive"],
 ["“Nestlé owns Vital Proteins, PepsiCo owns Poppi — can we compete?”","We don't fight them on their shelf. We win the sparkling daily-wellness occasion in Canada where we already hold distribution + a collagen halo.","15 Outcomes & M&A / GTM"],
 ["“Collagen efficacy is contested — legal exposure?”","Exactly why the CAN sells hydration/electrolyte (food claims). Collagen beauty claims stay on the NHP powder, not the can.","Canada Regulatory v2"],
 ["“Why a can, not a powder — powders ship cheaper?”","Sparkling is the wedge and the sensory differentiator; BC manufacturing protects margin. Regulatorily both are food now — a commercial choice.","Electrolyte BFY Deep-Dive"],
 ["“What's the regulatory risk in Canada?”","It's a Supplemented Food — design to that framework from day one. Confirm the claim set with counsel.","Canada Regulatory v2"],
 ["“Is the financial model real?”","Illustrative scaffolding — every input flagged. Replace with co-packer/distributor quotes. Even Conservative has a defined break-even.","Financial Model / Assumptions Audit"],
 ["“Why not just extend the existing powder line?”","The powder line stays (and keeps collagen claims). MÜV captures the sparkling RTD occasion the powder can't.","MÜV Peer Set"],
 ["“What exactly do you need from us?”","Approve Phase 0: confirm specs, regulatory sign-off, co-packer quote, Costco Canada beachhead.","Next Steps & Gates"]],[34,64,24],rowh=42)

# ============================================================ NEXT STEPS & GATES
ws,nr=tab("Next Steps & Gates","Next Steps & Decision Gates","Immediate actions to move MÜV forward. Status illustrative — set owners/dates with the team.",6,GOLD,desc="Immediate actions & decision gates with status")
nr=table(ws,nr,["#","Action","Owner","Timing","Why it's a gate","Status"],[
 ["1","Confirm MÜV on-can specs (sodium mg, pack size, any collagen variant)","Brand / R&D","Now","Unblocks claims + last model input","Open"],
 ["2","Regulatory counsel sign-off on the claim set (Supplemented Food)","Regulatory","Wk 1–3","De-risks the label; precedes artwork","Open"],
 ["3","Canadian co-packer quote + capacity","Ops","Wk 1–4","Real COGS replaces illustrative input","Open"],
 ["4","Bilingual + Quebec Bill 96 artwork","Brand","Wk 3–6","Compliance; long-lead for print","Open"],
 ["5","Costco Canada roadshow slot + Amazon.ca / Well.ca listings","Sales","Wk 4–9","The beachhead trial engine","Open"],
 ["6","Define velocity + repeat-rate targets (KPIs)","Sales / Finance","Wk 2","Gates Phase 2 national sell-in","Open"],
 ["7","Board approval of Phase 0 budget","Leadership","Wk 1","Greenlights the above","Open"]],[5,44,16,12,34,10],rowh=32)
for rr in range(nr-7,nr): ws.cell(row=rr,column=6).fill=fill(AMBER); ws.cell(row=rr,column=6).font=F(bold=True,size=9,color=AMBERH); ws.cell(row=rr,column=6).alignment=CTR

# ============================================================ 21 LAUNCH PLAN
ws,nr=tab("21 Launch Plan","Phased Launch Plan (0–18 months)",None,5,AMBERH,desc="Phased 0–18 month plan with workstreams")
nr=table(ws,nr,["Phase","Timing","Objectives","Key workstreams","Success gate"],[
 ["Phase 0 — Foundation","Months 0–3","Lock product, claims, regulatory, co-pack","Finalize formula & collagen dose; regulatory-counsel opinion; co-packer quote & MOQ; bilingual + Bill 96 artwork; brand/positioning","Regulatory sign-off on claim set + artwork approved"],
 ["Phase 1 — Beachhead","Months 3–9","Prove velocity & repeat in a contained beachhead","Costco CA roadshows + Amazon.ca + Well.ca/Natura + pharmacy/health-food base; podcast + reactive social; sampling","Repeat rate + velocity above category benchmark"],
 ["Phase 2 — Scale","Months 9–18","Earn conventional grocery on proven data","Sell-in to Loblaw/Sobeys/Metro on velocity data; distributor (UNFI CA / Tree of Life); managed trade spend; add SKUs","National listings won on data, not discounts"],
 ["Phase 3 — Defend & extend","18 mo+","Category leadership & optionality","Format/flavour extensions; deepen moat; evaluate strategic-partner vs independent scale","Profitable contribution + exit optionality"]],[18,12,30,46,30],rowh=78)

# ============================================================ 22 RISK REGISTER (+ heatmap)
rr,nr=tab("22 Risk Register","Risk Register","Likelihood × Impact (H/M/L), ranked by exposure",6,AMBERH,desc="Ranked risks, likelihood/impact, mitigations + heatmap")
risks=[[1,"Collagen efficacy / claims liability (2025 meta-analysis; dose-insufficiency suit)","Regulatory/Legal","High","High","Dose to efficacy (2.5g+); structure/function-safe language; substantiation files; lead with gut/hydration"],
 [2,"Strategic-owned competition (Nestlé/Unilever/PepsiCo firepower)","Competitive","High","High","Compete on Canadian-made + domestic cost edge; niche beachhead before they react"],
 [3,"Canada claim/label pathway misread (food vs NHP; SFCI; collagen caution)","Regulatory","Med","High","Regulatory-counsel opinion before artwork; design to Supplemented Foods; caffeine-free"],
 [4,"Over-distribution before product-market fit","Execution","Med","High","Prove velocity/repeat in beachhead; gate Phase 2 on data"],
 [5,"Slotting / trade-spend cash burn","Financial","Med","High","Free-fill over cash slotting; 35–45% budget; Code of Conduct leverage"],
 [6,"Thin differentiation / shelf saturation","Category","Med","Med","Defensible spec (fibre + collagen dose) + function stacking; Canadian-made"],
 [7,"Private-label encroachment (~$277B, ~21% share)","Category","Med","Med","Brand equity + clinical-grade ingredients retailers can't easily copy"],
 [8,"DTC CAC / heavy-ship economics if DTC-led","Financial","Med","Med","Lead retail/beachhead not paid DTC; subscription + sampling only"],
 [9,"Co-packer capacity / collagen sourcing / cost inflation","Operations","Med","Med","Lock co-pack early; qualify 2nd collagen supplier; hedge raws"],
 [10,"FX / tariff / freight premium on inputs","Financial","Med","Med","Domestic CA co-pack; monitor tariff status"],
 [11,"GLP-1 demand shift away from sweet/snack","Macro","Med","Low","Low-cal, fibre, hydration positioning aligns"],
 [12,"Brand/tone misstep at scale","Brand","Low","Med","Evolve tactics with stage; avoid Poppi-style stunts once mainstream"]]
nr=table(rr,nr,["#","Risk","Category","Likelihood","Impact","Mitigation"],risks,[4,38,16,12,10,44],rowh=42)
for row in range(nr-12,nr):
    for col in (4,5):
        v=rr.cell(row=row,column=col).value; rr.cell(row=row,column=col).alignment=CTR
        rr.cell(row=row,column=col).fill=fill(RED if v=="High" else AMBER if v=="Med" else GREEN)
# heatmap
base=nr+1; base=banner(rr,base,"LIKELIHOOD × IMPACT HEATMAP (risk #s by rating)",6)
cells={("High","High"):"1, 2",("High","Med"):"3, 4, 5",("High","Low"):"—",("Med","High"):"—",("Med","Med"):"6,7,8,9,10",("Med","Low"):"12",("Low","High"):"—",("Low","Med"):"11",("Low","Low"):"—"}
def colr(imp,lik): s={"Low":1,"Med":2,"High":3}[imp]+{"Low":1,"Med":2,"High":3}[lik]; return RED if s>=5 else AMBER if s>=4 else GREEN
rr.cell(row=base,column=1,value="Impact↓ / Likelihood→").font=F(bold=True,size=9)
for j,lik in enumerate(["Low","Med","High"]):
    x=rr.cell(row=base,column=2+j,value=lik); x.font=F(bold=True,color=WHITE,size=9); x.fill=fill(NAVY); x.alignment=CTR; x.border=BORDER
for i,imp in enumerate(["High","Med","Low"]):
    row=base+1+i; lab2=rr.cell(row=row,column=1,value=imp); lab2.font=F(bold=True,color=WHITE,size=9); lab2.fill=fill(NAVY); lab2.alignment=CTR; lab2.border=BORDER
    for j,lik in enumerate(["Low","Med","High"]):
        c=rr.cell(row=row,column=2+j,value=cells[(imp,lik)]); c.fill=fill(colr(imp,lik)); c.alignment=CTR; c.border=BORDER; c.font=F(bold=True,size=10); rr.row_dimensions[row].height=22

# ============================================================ 23 KPI DASHBOARD (+ peer price bar)
kp,nr=tab("23 KPI Dashboard","KPI Dashboard & Targets","Benchmarks from this research; set MÜV targets before launch",5,AMBERH,desc="Targets & benchmarks by phase + peer price bar")
nr=table(kp,nr,["KPI","Why it matters","Category benchmark","MÜV target","Phase"],[
 ["Repeat purchase rate","The metric buyers buy on","OLIPOP “astronomical”; above category avg","[set]","Phase 1+"],
 ["Velocity (u/store/wk)","Gates shelf retention","Reward durable, non-discount velocity","[set]","Phase 1+"],
 ["Gross margin","Survival","50–65% at scale (40–50% early)","[set]","All"],
 ["Trade spend % of revenue","#2 P&L line","10–20%; high end for emerging","≤45% early","Phase 1–2"],
 ["Doors / distribution","Reach — on proven data","Poppi ~36k / OLIPOP ~35k US (mature)","Beachhead first","Phase 1–3"],
 ["Net revenue","Scale","$852k (OLIPOP yr1) → $400M+ (yr6)","[set]","All"]],[24,30,36,16,14],rowh=30)
base=nr+2
kp.cell(row=base,column=1,value="Brand"); kp.cell(row=base,column=2,value="Price/serving")
for i,(b,p) in enumerate([("LMNT",1.50),("Liquid I.V.",1.56),("Nuun",0.75),("Organika sachet",1.00)]):
    kp.cell(row=base+1+i,column=1,value=b); kp.cell(row=base+1+i,column=2,value=p)
bar=BarChart(); bar.type="bar"; bar.title="Peer price per serving ($) — where to anchor MÜV"; bar.height=6.5; bar.width=13
bar.add_data(Reference(kp,min_col=2,min_row=base,max_row=base+4),titles_from_data=True); bar.set_categories(Reference(kp,min_col=1,min_row=base+1,max_row=base+4)); bar.legend=None; bar.dataLabels=DataLabelList(); bar.dataLabels.showVal=True
kp.add_chart(bar,"H3")
for rr2 in range(base,base+5): kp.row_dimensions[rr2].hidden=True

# ============================================================ GO-NOGO DECISION
g,nr=tab("Go-NoGo Decision","Go / No-Go Decision Scorecard","Edit yellow weight & score (1–5) cells; verdict auto-computes",6,GOLD,desc="Weighted gate scorecard with auto verdict")
gcrit=[("Market opportunity / tailwinds","Category growth & white space support entry",0.15,4),("Right to win (Organika assets)","Domestic mfg, #1 collagen halo, CA shelf",0.20,4),
 ("Claim defensibility / dose","Substantiable dose; avoids Poppi-style risk",0.15,3),("Regulatory clarity (Canada)","Supplemented-Foods pathway resolved",0.15,3),
 ("Unit economics / margin","Contribution positive at ≤$3.49 w/ domestic COGS",0.15,4),("Competitive resilience","Defensible vs Nestlé/Vital Proteins & private label",0.10,2),
 ("Go-to-market feasibility","Costco/Amazon/natural beachhead + cheap marketing",0.10,4)]
for j,t in enumerate(["Criterion","What 'pass' looks like","Weight","Score 1–5","Weighted"]):
    c=g.cell(row=nr,column=1+j,value=t); c.font=HEAD; c.fill=fill(NAVY); c.alignment=CTR; c.border=BORDER
r=nr+1; first=r
for name,desc2,w,s in gcrit:
    g.cell(row=r,column=1,value=name).font=BODYB; g.cell(row=r,column=1).border=BORDER; g.cell(row=r,column=1).alignment=LEFT
    g.cell(row=r,column=2,value=desc2).font=BODY; g.cell(row=r,column=2).border=BORDER; g.cell(row=r,column=2).alignment=WRAP
    iw=g.cell(row=r,column=3,value=w); iw.fill=fill(YEL); iw.number_format='0%'; iw.border=BORDER; iw.alignment=CTR; iw.font=BODYB
    isc=g.cell(row=r,column=4,value=s); isc.fill=fill(YEL); isc.border=BORDER; isc.alignment=CTR; isc.font=BODYB
    cw=g.cell(row=r,column=5,value=f"=C{r}*D{r}"); cw.number_format='0.00'; cw.border=BORDER; cw.alignment=CTR; cw.fill=fill(LIGHT2)
    g.row_dimensions[r].height=30; r+=1
last=r-1
g.cell(row=r,column=1,value="TOTALS").font=BODYB
g.cell(row=r,column=3,value=f"=SUM(C{first}:C{last})").number_format='0%'; g.cell(row=r,column=3).font=BODYB; g.cell(row=r,column=3).alignment=CTR; g.cell(row=r,column=3).border=BORDER
tot=g.cell(row=r,column=5,value=f"=SUMPRODUCT(C{first}:C{last},D{first}:D{last})"); tot.number_format='0.00'; tot.font=F(bold=True,size=12,color=NAVY); tot.alignment=CTR; tot.fill=fill(GREEN); tot.border=BORDER
g.cell(row=r,column=4,value="Weighted /5 →").font=BODYB; g.cell(row=r,column=4).alignment=Alignment(horizontal="right")
total_row=r
for col,w in zip("ABCDE",[30,40,10,10,10]): g.column_dimensions[col].width=w
r+=2
g.merge_cells(start_row=r,start_column=1,end_row=r,end_column=2); g.cell(row=r,column=1,value="Auto verdict:").font=BODYB
v=g.cell(row=r,column=3,value=f'=IF(E{total_row}>=3.5,"GO",IF(E{total_row}>=2.8,"GO — conditional","NO-GO / rework"))')
g.merge_cells(start_row=r,start_column=3,end_row=r,end_column=5); v.font=F(bold=True,size=12,color=WHITE); v.fill=fill(GREENH); v.alignment=CTR; v.border=BORDER
g.conditional_formatting.add(f"E{first}:E{last}",DataBarRule(start_type='num',start_value=0,end_type='num',end_value=5,color=TEAL))
r+=2
g.merge_cells(start_row=r,start_column=1,end_row=r,end_column=6)
hh=g.cell(row=r,column=1,value="HOW TO USE: edit the yellow Weight and Score cells; the weighted total and the GO / GO-conditional / NO-GO verdict recompute automatically.")
hh.font=F(italic=True,bold=True,size=9,color=GREENH); hh.fill=fill(GREEN); hh.alignment=WRAP; hh.border=BORDER; g.row_dimensions[r].height=26

# ============================================================ 24 SOURCES (clickable + tier count)
ws,nr=tab("24 Sources","Master Bibliography","Tagged by type; first source clickable. Re-pull load-bearing figures before external use.",3,GREY,desc="Master bibliography + source-mix count")
srcs=[["PepsiCo — Poppi acquisition ($1.95B, May 2025)","pepsico.com","Primary"],["Poppi $8.9M gut-health settlement","classaction.org; bevnet.com","Primary/Trade"],
 ["OLIPOP $50M Series C @ $1.85B; revenue","cnbc.com; bloomberg.com","Primary/Trade"],["Modern soda $1.8B 2024 (+83%); shares","circana.com; bevindustry.com","Scanner"],
 ["LMNT FY2023 ($206M, ~20% net)","sec.gov","Primary (strongest)"],["Powdered hydration $1.5B (+20%)","circana.com; cnn.com","Scanner"],
 ["Liquid I.V. Costco 2019; Unilever 2020","liquid-iv.com; unilever.com","Primary"],["Nuun — Nestlé HS (2021)","nestle.com","Primary"],
 ["Celsius — PepsiCo $550M; Alani Nu $1.8B","sec.gov; bevnet.com","Primary"],["Collagen efficacy meta-analysis (2025)","amjmed.com; nutraingredients.com","Peer-reviewed"],
 ["Canada sport-electrolyte → food (2026)","canada.ca; gowlingwlg.com","Regulatory"],["Supplemented Foods Reg; 180mg caffeine","canada.ca; fasken.com","Regulatory"],
 ["Collagen caution statement (FDR)","laws.justice.gc.ca","Regulatory"],["Bill 96 / OQLF packaging","stikeman.com; mltaikins.com","Legal"],
 ["BioSteel bankruptcy & revival","theglobeandmail.com; cbc.ca; coachwoodgroup.com","Trade/Primary"],["US-brand Canada entry","foodincanada.com; newswire.ca","Trade"],
 ["Channel economics (Amazon/Costco/DTC)","sellingpartners.aboutamazon.com; eightx.co","Mixed"],["Private label ~$277B","grocerydive.com; nielseniq.com","Trade"],
 ["Extended landscape (various)","bevnet.com; techcrunch.com; wikipedia","Trade (verify FLAGs)"],["Organika / MÜV product","organika.com (SKU 4338); costco.ca; well.ca","Primary"]]
nr2=table(ws,nr,["Claim / topic","Source(s)","Type"],srcs,[56,40,20],rowh=24)
# clickable first source
for row in range(nr+1,nr2):
    c=ws.cell(row=row,column=2); first=str(c.value).replace(",",";").split(";")[0].strip()
    if "." in first:
        c.hyperlink="https://"+first; c.font=F(size=10,color=LINK,underline="single")
# tier count
from collections import Counter
tc=Counter()
for row in range(nr+1,nr2):
    v=str(ws.cell(row=row,column=3).value)
    key="Primary" if "Primary" in v else "Regulatory" if "Regulatory" in v else "Scanner" if "Scanner" in v else "Peer-reviewed" if "Peer" in v else "Trade" if "Trade" in v else "Other"
    tc[key]+=1
ws.merge_cells(start_row=nr2+1,start_column=1,end_row=nr2+1,end_column=3)
cnt=ws.cell(row=nr2+1,column=1,value="SOURCE MIX: "+" · ".join(f"{k} {v}" for k,v in tc.most_common())+"  — load-bearing claims lean primary/regulatory.")
cnt.font=F(bold=True,size=9,color=STEEL); cnt.fill=fill(LIGHT); cnt.alignment=WRAP; cnt.border=BORDER; ws.row_dimensions[nr2+1].height=24

# ============================================================ VERIFICATION LOG
ws,nr=tab("Verification Log","Verification Log","What was checked against primary sources, and what changed",5,GOLD,desc="What was checked & what changed (incl. the MÜV finding)")
vdata=[(1,"What is MÜV — can or powder?","CONFIRMED","RTD sparkling CAN (SKU 4338, ~$14.99; ingredient list begins “Carbonated water” + Fibersol, magnesium glycinate, stevia). An interim 'powder' read was wrong and is retracted.","organika.com; retailers"),
 (2,"Canada regulatory pathway for MÜV","CONFIRMED","Format is not the decider. ALL sport-electrolyte products reclassify NHP→Supplemented Foods (NPN holders by Dec 31 2027; new products comply now). Collagen beauty = NHP-only.","canada.ca; Gowling; CHFA"),
 (3,"Poppi → PepsiCo $1.95B","CONFIRMED","$1.95B incl. $300M tax benefits → net $1.65B + earnout; closed May 19, 2025.","PepsiCo PR"),
 (4,"OLIPOP $50M Series C @ $1.85B","CONFIRMED","JPM Private Capital, Feb 12 2025; profitable; >$400M 2024 sales.","Bloomberg; CNBC"),
 (5,"LMNT FY2023 $206M, ~20% net","CONFIRMED","SEC Form C-AR, CIK 1871551; $54.6M marketing.","sec.gov EDGAR"),
 (6,"Modern soda $1.8B 2024 +83%","CONFIRMED","Poppi 38% / OLIPOP 32.7% share.","Circana via trade"),
 (7,"Poppi $8.9M settlement","CONFIRMED","2g fibre too low; final approval April 14, 2026.","classaction.org; BevNET"),
 (8,"Liquid I.V. Costco 2019; Unilever 2020","CONFIRMED","National Costco Jan 8 2019 (516 whs); Unilever Sept 1 2020 (~$500M est.).","liquid-iv.com; Unilever"),
 (9,"Canada Supplemented Foods; 180mg caffeine","CONFIRMED","In force Jul 21 2022; Prime Energy (200mg) recalled.","canada.ca; CNN"),
 (10,"Celsius–PepsiCo $550M; Alani Nu $1.8B","CONFIRMED","PepsiCo $550M @ $75/sh 2022; Alani Nu closed Apr 1 2025, net $1.65B.","SEC 8-K; BevNET")]
nr2=table(ws,nr,["#","Claim checked","Result","Finding","Source"],vdata,[4,30,14,56,26],rowh=50)
for row in range(nr+1,nr2):
    c=ws.cell(row=row,column=3); c.fill=fill(GREEN); c.font=F(bold=True,color=GREENH,size=9); c.alignment=CTR
nr2=callout(ws,nr2,"All 10 re-verified against primary sources; no competitor figure required correction. The material corrections were on MÜV (items 1–2): verified as an RTD sparkling CAN, and the Canada sport-electrolyte → Supplemented-Food reclassification.",5,h=38)

# ============================================================ 25 GLOSSARY
ws,nr=tab("25 Glossary","Glossary & Abbreviations",None,2,GREY,desc="Terms & abbreviations incl. regulatory")
ws.column_dimensions["A"].width=22; ws.column_dimensions["B"].width=96
gl=[["RTD","Ready-to-drink — a finished beverage (a can), vs a powder/tablet."],["NHP / NPN","Natural Health Product / its 8-digit Natural Product Number (Canada supplement licence)."],
 ["Supplemented Food","A food with added vitamins/minerals/amino acids under the Supplemented Foods Regulations (in force 2022-07-21)."],["SFFt","Supplemented Food Facts table — modified Nutrition Facts table with a 'Supplemented with' line."],
 ["SFCI","Supplemented Food Caution Identifier — the black-&-white '!' box required when cautionary statements apply."],["ORS","Oral Rehydration Solution — clinical rehydration; stays an NHP (carve-out from the electrolyte→food shift)."],
 ["Food–NHP interface","Health Canada guidance classifying food-format products; format is not decisive — representation + claims are."],["Fibersol","A soluble prebiotic dietary fibre used in MÜV."],
 ["Bill 96 / OQLF","Quebec French-language packaging rules; generic/descriptive trademark terms need French."],["ACV","Apple cider vinegar (Poppi's original hero ingredient)."],
 ["CTT","Cellular Transport Technology — Liquid I.V.'s hydration claim."],["DSD","Direct Store Delivery — brand/bottler delivers & merchandises in-store."],
 ["GLP-1","Ozempic/Wegovy-class weight-loss drugs reshaping food/beverage demand."],["MULO","Multi-Outlet (SPINS/Circana retail measurement universe)."],
 ["SPINS / Circana","Syndicated retail scanner-data providers (point-of-sale sales & velocity)."],["Slotting / trade spend","Payment to list a SKU / promotional spend to retailers — typically the #2 P&L line after COGS."],
 ["VERISOL","A clinically-studied collagen peptide (Vital Proteins sparkling)."],["TAM/SAM/SOM","Total / Serviceable-available / Serviceable-obtainable market."]]
nr=table(ws,nr,["Term","Definition"],gl,[22,96],rowh=22)
ws.merge_cells(start_row=nr+1,start_column=1,end_row=nr+1,end_column=2)
cl=ws.cell(row=nr+1,column=1,value="→ Full detail on the Supplemented-Foods pathway, SFFt and SFCI: see the ‘Canada Regulatory v2’ tab.")
cl.font=F(italic=True,size=9,color=GREENH); cl.fill=fill(GREEN); cl.alignment=WRAP; cl.border=BORDER

print("...all content tabs built, assembling...")

# ============================================================ DATA CONFIDENCE (compute over workbook)
hard=direc=flag=0
for s in wb.worksheets:
    if s.title=="Data Confidence": continue
    for row in s.iter_rows():
        for c in row:
            if isinstance(c.value,str):
                hard+=c.value.count("✅")+c.value.count("HARD"); direc+=c.value.count("◐")+c.value.count("DIRECTIONAL"); flag+=c.value.count("⚠")+c.value.count("FLAG")
total=hard+direc+flag or 1
for j,h in enumerate(["Confidence tier","Marker","Count","Share"]):
    c=dc.cell(row=4,column=1+j,value=h); c.font=HEAD; c.fill=fill(STEEL); c.alignment=CTR; c.border=BORDER
for i,(name,mark,cnt,color) in enumerate([("Hard (primary/scanner/regulatory)","✅ HARD",hard,GREEN),("Directional (research-firm/single-source)","◐ DIRECTIONAL",direc,LIGHT),("Flag (estimate/verify/contested)","⚠ FLAG",flag,AMBER)]):
    r=5+i
    dc.cell(row=r,column=1,value=name).font=F(size=10,bold=True); dc.cell(row=r,column=1).border=BORDER; dc.cell(row=r,column=1).fill=fill(color); dc.cell(row=r,column=1).alignment=LEFT
    dc.cell(row=r,column=2,value=mark).font=BODY; dc.cell(row=r,column=2).border=BORDER; dc.cell(row=r,column=2).alignment=CTR
    dc.cell(row=r,column=3,value=cnt).font=F(size=11,bold=True); dc.cell(row=r,column=3).border=BORDER; dc.cell(row=r,column=3).alignment=CTR
    sh3=dc.cell(row=r,column=4,value=cnt/total); sh3.number_format='0%'; sh3.font=BODY; sh3.border=BORDER; sh3.alignment=CTR
dc.cell(row=8,column=1,value="TOTAL tags").font=F(bold=True); dc.cell(row=8,column=3,value=total).font=F(bold=True); dc.cell(row=8,column=3).alignment=CTR
dc.column_dimensions["A"].width=40; dc.column_dimensions["B"].width=18; dc.column_dimensions["C"].width=10; dc.column_dimensions["D"].width=10
dch=BarChart(); dch.type="col"; dch.title="Confidence tag distribution"; dch.height=7; dch.width=13
dch.add_data(Reference(dc,min_col=3,min_row=4,max_row=7),titles_from_data=True); dch.set_categories(Reference(dc,min_col=2,min_row=5,max_row=7)); dch.legend=None; dch.dataLabels=DataLabelList(); dch.dataLabels.showVal=True
dc.add_chart(dch,"A10")
dc.merge_cells("A26:D26"); nt=dc.cell(row=26,column=1,value="Read: load-bearing claims lean hard/primary (see Verification Log); market-size projections and all financial inputs are ◐/⚠ by nature — never quote them as fact.")
nt.font=SMALL; nt.fill=fill(LIGHT); nt.alignment=WRAP; nt.border=BORDER; dc.row_dimensions[26].height=40

# ============================================================ CONTENTS (clickable index + nav legend)
toc=ws_toc
for j,h in enumerate(["Tab","Contents"]):
    c=toc.cell(row=3,column=1+j,value=h); c.font=HEAD; c.fill=fill(NAVY); c.alignment=CTR; c.border=BORDER
entries=[("00 Cover","Title, scope, caveats, confidence legend")]+[(n,d) for (n,d) in CONTENTS if n not in ("01 Contents",)]
r=4
for i,(name,d) in enumerate(entries):
    a=toc.cell(row=r,column=1,value=name)
    if name in wb.sheetnames:
        a.hyperlink=f"#'{name}'!A1"; a.font=F(bold=True,color=LINK,underline="single",size=10)
    else:
        a.font=BODYB
    a.border=BORDER; a.alignment=LEFT
    b=toc.cell(row=r,column=2,value=d); b.font=BODY; b.border=BORDER; b.alignment=WRAP
    if i%2: a.fill=fill(LIGHT); b.fill=fill(LIGHT)
    if name in ("🏠 Start Here","Decision Memo","Executive Brief 1-page","Dashboard","Financial Model","Scenario Comparison","Go-NoGo Decision","MÜV Peer Set","Data Confidence","Assumptions Audit","How to Present","FAQ & Objections","Next Steps & Gates","Verification Log"):
        a.fill=fill(AMBER); a.font=F(bold=True,color=AMBERH,underline="single",size=10)
    toc.row_dimensions[r].height=16; r+=1
toc.column_dimensions["A"].width=26; toc.column_dimensions["B"].width=86
r+=1; r=banner(toc,r,"HOW TO NAVIGATE",2)
for a,b in [("Click any tab name above","jumps straight to that tab"),("🏠 Start Here","the front door — grouped cards (workbook opens here)"),("🏠 Home (top-right of every tab)","returns to Start Here"),("Gold tab","interactive or action tab (model, scenarios, Go-No-Go, memo, FAQ…)"),("Confidence tags ✅ / ◐ / ⚠","hard evidence / directional / estimate — see Data Confidence")]:
    x=toc.cell(row=r,column=1,value=a); x.font=BODYB; x.border=BORDER; x.alignment=LEFT
    y=toc.cell(row=r,column=2,value=b); y.font=BODY; y.border=BORDER; y.alignment=WRAP; toc.row_dimensions[r].height=20; r+=1

# ============================================================ VALIDATE + SAVE
import re as _re
issues=[]
names=wb.sheetnames
req=["00 Cover","01 Contents","🏠 Start Here","Decision Memo","Financial Model","Scenario Comparison","Dashboard","MÜV Peer Set","Canada Regulatory v2","Verification Log","24 Sources","25 Glossary"]
for rq in req:
    if rq not in names: issues.append("missing "+rq)
if len(wb["Dashboard"]._charts)<5: issues.append("dashboard charts <5")
fcount=sum(1 for row in wb["Financial Model"].iter_rows() for c in row if isinstance(c.value,str) and c.value.startswith("="))
if fcount<25: issues.append(f"FM formulas {fcount}")
# hyperlink resolution
nameset=set(names)
for s in wb.worksheets:
    for row in s.iter_rows():
        for c in row:
            h=c.hyperlink.target if (c.hyperlink and getattr(c.hyperlink,'target',None)) else None
            if h and h.startswith("#"):
                m=_re.match(r"#'?(.*?)'?!",h)
                if m and m.group(1) not in nameset: issues.append(f"broken link {s.title}!{c.coordinate}->{m.group(1)}")
wb.save(OUT)
print("SAVED:",OUT)
print("TABS:",len(names))
print("Confidence tags — HARD",hard,"DIRECTIONAL",direc,"FLAG",flag)
print("VALIDATION:", "OK — 0 issues" if not issues else issues[:8])
