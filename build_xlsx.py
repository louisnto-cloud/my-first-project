"""
Builds revenue-forecast.xlsx — a cases-sold revenue model with per-channel pricing.

Everything blue/yellow is an INPUT you can overwrite in Excel; grey cells are
live formulas that recalculate automatically. Run:  python3 build_xlsx.py
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, NamedStyle
from openpyxl.utils import get_column_letter

# ---------------------------------------------------------------- assumptions
TARGET          = 2_500_000      # annual gross revenue target ($)
UNITS_PER_CASE  = 12             # e.g. bottles per case

# Channel placeholders — OVERWRITE with your real channels, prices & mix.
# (name, price per case, volume mix weight)  weights are relative, auto-normalised.
CHANNELS = [
    ("Direct-to-Consumer (DTC)",  300, 20),
    ("On-Premise / Food Service", 216, 15),
    ("Off-Premise Retail",        180, 30),
    ("Wholesale / Distributor",   120, 30),
    ("Online Marketplace",        150,  5),
]
VOLUME_POINTS = [5_000, 10_000, 15_000, 20_000, 25_000, 30_000]
PRICE_LADDER  = list(range(100, 321, 20))
MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

# ---------------------------------------------------------------- styling
NAVY   = "1F3864"; BLUE = "2E5496"; LIGHT = "D9E1F2"; YELL = "FFF2CC"
GREY   = "F2F2F2"; GREEN = "E2EFDA"; WHITE = "FFFFFF"
CUR    = '"$"#,##0'; CUR2 = '"$"#,##0.00'; NUM = '#,##0'; PCT = '0.0%'

thin   = Side(style="thin", color="BFBFBF")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
title_f  = Font(bold=True, size=16, color=WHITE)
sub_f    = Font(italic=True, size=9, color="808080")
hdr_f    = Font(bold=True, size=11, color=WHITE)
sect_f   = Font(bold=True, size=12, color=NAVY)
lbl_f    = Font(bold=True, color="404040")
inp_f    = Font(bold=True, color="1F3864")
navy_fill  = PatternFill("solid", fgColor=NAVY)
blue_fill  = PatternFill("solid", fgColor=BLUE)
light_fill = PatternFill("solid", fgColor=LIGHT)
yell_fill  = PatternFill("solid", fgColor=YELL)
grey_fill  = PatternFill("solid", fgColor=GREY)
green_fill = PatternFill("solid", fgColor=GREEN)
center = Alignment(horizontal="center", vertical="center")
right  = Alignment(horizontal="right")
wrap_c = Alignment(horizontal="center", vertical="center", wrap_text=True)

def put(ws, ref, val, *, font=None, fill=None, fmt=None, align=None, bd=False):
    c = ws[ref]
    c.value = val
    if font:  c.font = font
    if fill:  c.fill = fill
    if fmt:   c.number_format = fmt
    if align: c.alignment = align
    if bd:    c.border = border
    return c

# ================================================================ MODEL sheet
wb = Workbook()
ws = wb.active
ws.title = "Model"
ws.sheet_view.showGridLines = False
widths = {"A":34,"B":16,"C":16,"D":12,"E":14,"F":16,"G":13}
for col,w in widths.items(): ws.column_dimensions[col].width = w

ws.merge_cells("A1:G1")
put(ws,"A1","Revenue Forecast  —  Cases-Sold Model", font=title_f, fill=navy_fill,
    align=Alignment(horizontal="left", vertical="center"))
ws.row_dimensions[1].height = 28
ws.merge_cells("A2:G2")
put(ws,"A2","Yellow cells are inputs — overwrite them. Grey cells are live formulas.", font=sub_f)

# --- assumptions block
put(ws,"A4","ASSUMPTIONS", font=sect_f)
rows = [
    ("A5","Annual gross revenue target", "B5", TARGET, CUR, True),
    ("A6","Units per case (e.g. bottles)", "B6", UNITS_PER_CASE, NUM, True),
    ("A7","Blended avg price / case", "B7", "=SUMPRODUCT(B16:B20,C16:C20)/SUM(C16:C20)", CUR, False),
    ("A8","TOTAL cases needed to hit target", "B8", "=B5/B7", NUM, False),
    ("A9","Implied price / unit", "B9", "=B7/B6", CUR2, False),
    ("A10","Cases / month (avg)", "B10", "=B8/12", NUM, False),
    ("A11","Cases / week (avg)", "B11", "=B8/52", NUM, False),
    ("A12","Cases / selling-day (260/yr)", "B12", "=B8/260", NUM, False),
]
for lab_ref,lab,val_ref,val,fmt,is_input in rows:
    put(ws,lab_ref,lab,font=lbl_f)
    put(ws,val_ref,val,
        font=inp_f if is_input else Font(bold=True,color="404040"),
        fill=yell_fill if is_input else grey_fill, fmt=fmt, bd=True)

# --- channel table
put(ws,"A14","CHANNEL MIX & PRICING", font=sect_f)
heads = ["Channel","Price / Case","Volume Mix\n(weight)","Mix %","Cases","Revenue","% of Rev"]
for i,h in enumerate(heads):
    c = put(ws, f"{get_column_letter(i+1)}15", h, font=hdr_f, fill=blue_fill, align=wrap_c, bd=True)
ws.row_dimensions[15].height = 30

first, last = 16, 16+len(CHANNELS)-1
for r,(name,price,mix) in enumerate(CHANNELS, start=first):
    put(ws,f"A{r}",name, bd=True)
    put(ws,f"B{r}",price, font=inp_f, fill=yell_fill, fmt=CUR, bd=True)
    put(ws,f"C{r}",mix,   font=inp_f, fill=yell_fill, fmt=NUM, bd=True)
    put(ws,f"D{r}",f"=C{r}/SUM($C${first}:$C${last})", fill=grey_fill, fmt=PCT, bd=True)
    put(ws,f"E{r}",f"=$B$8*D{r}", fill=grey_fill, fmt=NUM, bd=True)
    put(ws,f"F{r}",f"=E{r}*B{r}", fill=grey_fill, fmt=CUR, bd=True)
    put(ws,f"G{r}",f"=F{r}/$B$5", fill=grey_fill, fmt=PCT, bd=True)

tot = last+1
put(ws,f"A{tot}","TOTAL", font=Font(bold=True,color=WHITE), fill=navy_fill, bd=True)
put(ws,f"B{tot}","", fill=navy_fill, bd=True)
put(ws,f"C{tot}",f"=SUM(C{first}:C{last})", font=Font(bold=True,color=WHITE), fill=navy_fill, fmt=NUM, bd=True)
put(ws,f"D{tot}",f"=SUM(D{first}:D{last})", font=Font(bold=True,color=WHITE), fill=navy_fill, fmt=PCT, bd=True)
put(ws,f"E{tot}",f"=SUM(E{first}:E{last})", font=Font(bold=True,color=WHITE), fill=navy_fill, fmt=NUM, bd=True)
put(ws,f"F{tot}",f"=SUM(F{first}:F{last})", font=Font(bold=True,color=WHITE), fill=navy_fill, fmt=CUR, bd=True)
put(ws,f"G{tot}",f"=SUM(G{first}:G{last})", font=Font(bold=True,color=WHITE), fill=navy_fill, fmt=PCT, bd=True)

put(ws,f"A{tot+2}","Note: revenue always sums to the target — change the mix to see how the CASE COUNT shifts.", font=sub_f)
ws.freeze_panes = "A3"

# ====================================================== CHANNEL COMPARISON sheet
cs = wb.create_sheet("Channel Comparison")
cs.sheet_view.showGridLines = False
cs.column_dimensions["A"].width = 28
for col in ["B","C","D","E","F","G","H","I"]:
    cs.column_dimensions[col].width = 14
cs.merge_cells("A1:I1")
put(cs,"A1","Channel Comparison  —  “if I sold at this price, what does it look like?”",
    font=title_f, fill=navy_fill, align=Alignment(horizontal="left", vertical="center"))
cs.row_dimensions[1].height = 26
put(cs,"A3","Same product, very different economics per channel. Two views below.", font=sub_f)

# View 1: cases needed if ALL volume went through one channel
put(cs,"A5","A)  Cases to hit target if 100% sold through one channel", font=sect_f)
h2 = ["Channel","Price / Case","Cases needed","Units needed","Rev / 1,000 cases"]
for i,h in enumerate(h2):
    put(cs,f"{get_column_letter(i+1)}6",h, font=hdr_f, fill=blue_fill, align=wrap_c, bd=True)
cs.row_dimensions[6].height = 28
for r,(name,price,mix) in enumerate(CHANNELS, start=7):
    m = r-7+16
    put(cs,f"A{r}",f"=Model!A{m}", bd=True)
    put(cs,f"B{r}",f"=Model!B{m}", fmt=CUR, bd=True, fill=grey_fill)
    put(cs,f"C{r}",f"=Model!$B$5/B{r}", fmt=NUM, bd=True, fill=grey_fill)
    put(cs,f"D{r}",f"=C{r}*Model!$B$6", fmt=NUM, bd=True, fill=grey_fill)
    put(cs,f"E{r}",f"=1000*B{r}", fmt=CUR, bd=True, fill=grey_fill)

# View 2: revenue grid at chosen case volumes
start2 = 7+len(CHANNELS)+2
put(cs,f"A{start2-1}","B)  Gross revenue at a given number of cases sold", font=sect_f)
put(cs,f"A{start2}","Channel", font=hdr_f, fill=blue_fill, align=center, bd=True)
put(cs,f"B{start2}","Price / Case", font=hdr_f, fill=blue_fill, align=wrap_c, bd=True)
for j,v in enumerate(VOLUME_POINTS):
    cell = f"{get_column_letter(3+j)}{start2}"
    put(cs,cell,v, font=hdr_f, fill=blue_fill, align=center, fmt=NUM, bd=True)
for r,(name,price,mix) in enumerate(CHANNELS, start=start2+1):
    m = r-(start2+1)+16
    put(cs,f"A{r}",f"=Model!A{m}", bd=True)
    put(cs,f"B{r}",f"=Model!B{m}", fmt=CUR, bd=True, fill=grey_fill)
    for j in range(len(VOLUME_POINTS)):
        col = get_column_letter(3+j)
        put(cs,f"{col}{r}",f"={col}${start2}*$B{r}", fmt=CUR, bd=True,
            fill=green_fill if (r+j)%2==0 else grey_fill)
put(cs,f"A{start2+len(CHANNELS)+2}","Header row = case volumes (editable). Cells = volume × that channel's price.", font=sub_f)

# ============================================================= SENSITIVITY sheet
ss = wb.create_sheet("Sensitivity")
ss.sheet_view.showGridLines = False
for col,w in {"A":18,"B":18,"C":18,"E":18,"F":18}.items(): ss.column_dimensions[col].width = w
ss.merge_cells("A1:F1")
put(ss,"A1","Sensitivity  —  price vs. cases, and cases vs. revenue",
    font=title_f, fill=navy_fill, align=Alignment(horizontal="left", vertical="center"))
ss.row_dimensions[1].height = 26

put(ss,"A3","Price / Case → Cases needed", font=sect_f)
for i,h in enumerate(["Price / Case","Cases needed","Units needed"]):
    put(ss,f"{get_column_letter(i+1)}4",h, font=hdr_f, fill=blue_fill, align=wrap_c, bd=True)
for r,p in enumerate(PRICE_LADDER, start=5):
    put(ss,f"A{r}",p, font=inp_f, fill=yell_fill, fmt=CUR, bd=True)
    put(ss,f"B{r}",f"=Model!$B$5/A{r}", fill=grey_fill, fmt=NUM, bd=True)
    put(ss,f"C{r}",f"=B{r}*Model!$B$6", fill=grey_fill, fmt=NUM, bd=True)

put(ss,"E3","Cases sold → Revenue (@ blended price)", font=sect_f)
put(ss,"E4","Cases sold", font=hdr_f, fill=blue_fill, align=center, bd=True)
put(ss,"F4","Gross revenue", font=hdr_f, fill=blue_fill, align=center, bd=True)
for r,v in enumerate(range(5000, 40001, 5000), start=5):
    put(ss,f"E{r}",v, font=inp_f, fill=yell_fill, fmt=NUM, bd=True)
    put(ss,f"F{r}",f"=E{r}*Model!$B$7", fill=grey_fill, fmt=CUR, bd=True)
put(ss,"A13","Tip: change the price ladder or volumes (yellow) to fit your range.", font=sub_f)

# ============================================================= MONTHLY PLAN sheet
ms = wb.create_sheet("Monthly Plan")
ms.sheet_view.showGridLines = False
for col,w in {"A":10,"B":16,"C":12,"D":14,"E":16,"F":16,"G":18}.items(): ms.column_dimensions[col].width = w
ms.merge_cells("A1:G1")
put(ms,"A1","Monthly Plan  —  spread the annual target across the year",
    font=title_f, fill=navy_fill, align=Alignment(horizontal="left", vertical="center"))
ms.row_dimensions[1].height = 26
put(ms,"A2","Seasonality weights are inputs (default = 1 each = even split). Edit to model ramp/peaks.", font=sub_f)
for i,h in enumerate(["Month","Seasonality\n(weight)","Mix %","Cases","Revenue","Cumulative\ncases","Cumulative\nrevenue"]):
    put(ms,f"{get_column_letter(i+1)}4",h, font=hdr_f, fill=blue_fill, align=wrap_c, bd=True)
ms.row_dimensions[4].height = 30
for r,mo in enumerate(MONTHS, start=5):
    put(ms,f"A{r}",mo, font=lbl_f, bd=True)
    put(ms,f"B{r}",1, font=inp_f, fill=yell_fill, fmt='0.00', bd=True)
    put(ms,f"C{r}",f"=B{r}/SUM($B$5:$B$16)", fill=grey_fill, fmt=PCT, bd=True)
    put(ms,f"D{r}",f"=Model!$B$8*C{r}", fill=grey_fill, fmt=NUM, bd=True)
    put(ms,f"E{r}",f"=Model!$B$5*C{r}", fill=grey_fill, fmt=CUR, bd=True)
    put(ms,f"F{r}",f"=SUM($D$5:D{r})", fill=grey_fill, fmt=NUM, bd=True)
    put(ms,f"G{r}",f"=SUM($E$5:E{r})", fill=grey_fill, fmt=CUR, bd=True)
put(ms,"A17","TOTAL", font=Font(bold=True,color=WHITE), fill=navy_fill, bd=True)
put(ms,"B17","=SUM(B5:B16)", font=Font(bold=True,color=WHITE), fill=navy_fill, fmt='0.00', bd=True)
put(ms,"C17","=SUM(C5:C16)", font=Font(bold=True,color=WHITE), fill=navy_fill, fmt=PCT, bd=True)
put(ms,"D17","=SUM(D5:D16)", font=Font(bold=True,color=WHITE), fill=navy_fill, fmt=NUM, bd=True)
put(ms,"E17","=SUM(E5:E16)", font=Font(bold=True,color=WHITE), fill=navy_fill, fmt=CUR, bd=True)

wb.save("revenue-forecast.xlsx")
print("wrote revenue-forecast.xlsx with sheets:", wb.sheetnames)
