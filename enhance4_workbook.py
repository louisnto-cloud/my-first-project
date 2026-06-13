#!/usr/bin/env python3
"""Verification revision pass: corrects the central caveat (MÜV is a real Organika
product — a sparkling POWDER, not a verified RTD can), adds the powder-vs-RTD
regulatory nuance, and adds a Verification Log tab."""
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
PATH="/home/user/my-first-project/Organika_Sparkling_Competitor_Intelligence_ENTERPRISE.xlsx"
wb=load_workbook(PATH)
NAVY="14304F"; TEAL="2E7D8A"; STEEL="3E5C76"; LIGHT="EAF1F4"; LIGHT2="F4F8FA"
AMBER="FFF2CC"; AMBERHEAD="B45309"; GREEN="E2EFDA"; GREENHEAD="1E7D32"; GOLD="C9A227"; WHITE="FFFFFF"; GREY="595959"
def F(**k): return Font(name="Calibri",**k)
def fill(c): return PatternFill("solid",fgColor=c)
thin=Side(style="thin",color="BFBFBF"); BORDER=Border(left=thin,right=thin,top=thin,bottom=thin)
WRAP=Alignment(wrap_text=True,vertical="top"); CTR=Alignment(horizontal="center",vertical="center",wrap_text=True)
LEFT=Alignment(horizontal="left",vertical="center",wrap_text=True)
HEAD=F(bold=True,color=WHITE,size=10); BODY=F(size=10); BODYB=F(size=10,bold=True); TITLE=F(bold=True,color=WHITE,size=18)

# --- 1) Correct the Cover caveat (A15, merged A15:G15) ---
cov=wb["00 Cover"]
cov["A15"]=("RESOLVED (verified Jun 2026): “MÜV” IS a real Organika product — “MÜV Sparkling Electrolytes”, a SPARKLING/effervescent "
 "POWDER drink mix (not a verified canned RTD): zero sugar, caffeine-free, electrolytes + magnesium bisglycinate + Fibersol® prebiotic "
 "fibre. It sits in Organika's hydration family alongside “Electrolytes + Enhanced Collagen” (5g collagen). IMPORTANT: because MÜV is a "
 "POWDER, the Canadian NHP/NPN claim pathway likely applies (see ‘19 Canada Regulatory’) — the earlier RTD-can/food assumption is the "
 "downside case, not the base case. Confirm MÜV's exact label, dose, collagen content and price with the brand.")
cov["A15"].font=F(bold=True,color=GREENHEAD,size=10); cov["A15"].fill=fill(GREEN); cov["A15"].alignment=WRAP; cov["A15"].border=BORDER
cov.row_dimensions[15].height=96

# --- 2) Add powder-vs-RTD nuance to Canada Regulatory ---
reg=wb["19 Canada Regulatory"]
r=reg.max_row+2
reg.merge_cells(start_row=r,start_column=1,end_row=r,end_column=3)
c=reg.cell(row=r,column=1,value="POWDER vs RTD — FORMAT DETERMINES THE PATHWAY (key revision)")
c.font=F(bold=True,color=WHITE,size=10); c.fill=fill(GREENHEAD); c.alignment=LEFT; reg.row_dimensions[r].height=18
r+=1
rows=[
 ("MÜV today = sparkling POWDER","Powders/effervescent mixes for reconstitution are generally licensed as Natural Health Products (NHPs) with an NPN — NOT food-format. Organika's existing electrolyte/collagen powders are almost certainly NHPs.","HARD-ish / confirm NPN"),
 ("Claims latitude (powder/NHP)","On an NHP, monograph-based structure-function claims (incl. certain collagen/joint/skin and electrolyte/hydration claims) are permissible — so Organika's collagen claims CAN largely transfer to a powder. This is a claims ADVANTAGE of staying powder.","DIRECTIONAL – per NHP monographs"),
 ("If MÜV ever becomes an RTD can","It flips to FOOD / Supplemented Food (CFIA): no NPN, restricted claims, Supplemented Food Facts table, possible SFCI box, mandatory collagen caution. Treat this as the downside scenario for a future canned line extension.","HARD"),
 ("Interface caveat","Health Canada reviews products at the food–NHP interface case-by-case; a “drink mix” marketed/consumed like a food could still be deemed food-format. Confirm classification of MÜV's exact SKU with regulatory counsel.","FLAG – verify"),
]
for name,detail,conf in rows:
    reg.cell(row=r,column=1,value=name).font=BODYB; reg.cell(row=r,column=1).alignment=LEFT; reg.cell(row=r,column=1).border=BORDER
    reg.cell(row=r,column=2,value=detail).font=BODY; reg.cell(row=r,column=2).alignment=WRAP; reg.cell(row=r,column=2).border=BORDER
    reg.cell(row=r,column=3,value=conf).font=BODY; reg.cell(row=r,column=3).alignment=WRAP; reg.cell(row=r,column=3).border=BORDER
    reg.row_dimensions[r].height=44; r+=1

# --- 3) Verification Log tab ---
vl=wb.create_sheet("Verification Log")
vl.sheet_view.showGridLines=False
vl.merge_cells("A1:E1"); t=vl["A1"]; t.value="Verification Log"; t.font=TITLE; t.fill=fill(NAVY); t.alignment=CTR; vl.row_dimensions[1].height=30
vl.merge_cells("A2:E2"); s=vl["A2"]; s.value="What was checked against sources on 2026-06-13, and what changed. Honesty over false precision."
s.font=F(bold=True,color=WHITE,size=10); s.fill=fill(TEAL); s.alignment=CTR; vl.row_dimensions[2].height=18
hdr=["#","Claim checked","Result","Finding / corrected value","Source"]
for j,h in enumerate(hdr):
    c=vl.cell(row=4,column=1+j,value=h); c.font=HEAD; c.fill=fill(NAVY); c.alignment=CTR; c.border=BORDER
data=[
 (1,"Does a “MÜV” / Organika sparkling product exist?","CONFIRMED + CORRECTED","“MÜV Sparkling Electrolytes” is a real Organika SKU — a sparkling/effervescent POWDER (not a verified RTD can): 0 sugar, caffeine-free, electrolytes + magnesium bisglycinate + Fibersol prebiotic fibre. Sibling SKU “Electrolytes + Enhanced Collagen” adds 5g collagen. Earlier dossier assumed an unverified RTD can — now downgraded to the downside scenario.","organika.com/products/muv-sparkling-electrolytes; Save-On-Foods; Amazon; iHerb"),
 (2,"Regulatory pathway for MÜV","CORRECTED","Powder format likely = NHP with NPN (claims latitude PRESERVED), not the food/Supplemented-Food RTD pathway previously emphasized. Material correction — see Tab 19.","Health Canada NHP guidance; format analysis"),
 (3,"Poppi → PepsiCo $1.95B (closed May 2025)","Carried forward","Multi-source corroborated in research (PepsiCo PR + trade). Fresh primary re-pull recommended before external use.","pepsico.com newsroom"),
 (4,"OLIPOP $50M Series C @ $1.85B (Feb 2025)","Carried forward","Multi-source corroborated (CNBC/Food Dive/BevIndustry).","cnbc.com; fooddive.com"),
 (5,"LMNT FY2023 $206M sales, ~20% net","Carried forward (high conf.)","From LMNT's own SEC Reg CF filing, CIK 1871551 — strongest figure in the set.","sec.gov EDGAR"),
 (6,"Modern soda $1.8B 2024, +83% YoY","Carried forward","Circana scanner via Beverage Industry / CSNews; anchor TAM figure.","Circana; bevindustry.com"),
 (7,"Poppi $8.9M gut-health settlement","Carried forward","classaction.org + BevNET; final approval ~Apr 2026.","classaction.org; bevnet.com"),
 (8,"Liquid I.V. Costco 2019 (~516 whs); Unilever Sept 2020","Carried forward","liquid-iv.com + Unilever PR + BevNET.","unilever.com; bevnet.com"),
 (9,"Canada Supplemented Foods Reg (Jul 2022); caffeine 180mg cap","Carried forward (high conf.)","Health Canada + Fasken; 180mg cap blocked Prime Energy (stack3d).","canada.ca; fasken.com"),
 (10,"Poppi entered Canada Aug 2024; Celsius $550M / Alani Nu $1.8B","Carried forward","newswire.ca; Bloomberg/BusinessWire.","newswire.ca; bloomberg.com"),
]
r=5
for row in data:
    for j,v in enumerate(row):
        c=vl.cell(row=r,column=1+j,value=v); c.font=BODY if j else BODYB; c.alignment=WRAP if j else CTR; c.border=BORDER
        if (r%2)==0: c.fill=fill(LIGHT)
        if j==2:
            c.alignment=CTR
            if "CONFIRM" in str(v) or "CORRECT" in str(v): c.fill=fill(GREEN); c.font=F(bold=True,color=GREENHEAD,size=9)
            elif "Carried" in str(v): c.fill=fill(AMBER); c.font=F(bold=True,color=AMBERHEAD,size=9)
    vl.row_dimensions[r].height=58; r+=1
for col,w in zip("ABCDE",[4,30,16,60,30]): vl.column_dimensions[col].width=w
r+=1
vl.merge_cells(start_row=r,start_column=1,end_row=r,end_column=5)
n=vl.cell(row=r,column=1,value=("Method note: Item 1–2 were re-verified live against Organika's site and Canadian retailer listings on 2026-06-13 (storefront blocks "
 "automated fetch, so confirmed via search-indexed product/retailer pages). Items 3–10 were multi-source corroborated during the research phase but "
 "were NOT individually re-pulled from primary sources this round (a verification agent was rate-limited); they are labelled “carried forward”. "
 "Re-pull these from the cited primary URLs before any external/board circulation."))
n.font=F(size=9,italic=True,color=GREY); n.fill=fill(AMBER); n.alignment=WRAP; n.border=BORDER; vl.row_dimensions[r].height=52
vl.sheet_properties.tabColor=GOLD
vl.page_setup.orientation="landscape"
c=vl.cell(row=1,column=14,value="↩ Contents"); c.hyperlink="#'01 Contents'!A1"; c.font=F(bold=True,color="1155CC",underline="single",size=8); c.alignment=Alignment(horizontal="right")

# --- 4) Add Verification Log to Contents + reorder after 24 Sources ---
toc=wb["01 Contents"]
r=toc.max_row+1
a=toc.cell(row=r,column=1,value="Verification Log"); a.hyperlink="#'Verification Log'!A1"
a.font=F(bold=True,color="1155CC",underline="single",size=10); a.fill=fill(AMBER); a.border=BORDER; a.alignment=LEFT
b=toc.cell(row=r,column=2,value="What was checked against sources, what changed (incl. the MÜV finding)"); b.font=BODY; b.border=BORDER; b.alignment=WRAP
toc.row_dimensions[r].height=18

s=wb["Verification Log"]; wb._sheets.remove(s)
idx=wb.sheetnames.index("24 Sources")+1; wb._sheets.insert(idx,s)

wb.properties.description="30+ tab analyst dossier with interactive scenario P&L, dashboard, Go/No-Go, battlecards and a verification log. MÜV confirmed as a real Organika sparkling powder."
wb.save(PATH)
print("verification revision saved. sheets:",len(wb.sheetnames))
PY=None
