#!/usr/bin/env python3
"""
Build `beverage-margin-model.xlsx` — a fully formula-driven beverage
margin / markup / profit workbook that mirrors the web studio.

Every output is a live Excel formula, so changing an input recalculates
the whole model. Run:  python3 build_workbook.py
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import ColorScaleRule, CellIsRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.chart import BarChart, Reference
from openpyxl.comments import Comment

# ---------------------------------------------------------------- palette
NAVY   = "1B2435"
INK    = "0E1320"
TEAL   = "2BB3A3"
TEALBG = "E7F6F4"
AMBER  = "FFF3C4"
AMBERB = "E6C84B"
GREY   = "93A0BA"
LINE   = "C9D2E0"
WHITE  = "FFFFFF"
RED    = "F8696B"
YEL    = "FFEB84"
GRN    = "63BE7B"

MONEY  = '"$"#,##0.00'
MONEY0 = '"$"#,##0'
PCT    = '0.0%'
NUM    = '#,##0'

thin = Side(style="thin", color=LINE)
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

def font(sz=11, b=False, color="222222", italic=False):
    return Font(name="Calibri", size=sz, bold=b, color=color, italic=italic)

def fill(hex_):
    return PatternFill("solid", fgColor=hex_)

def style(cell, *, f=None, fl=None, nf=None, align=None, border=False, wrap=False):
    if f:  cell.font = f
    if fl: cell.fill = fl
    if nf: cell.number_format = nf
    if align: cell.alignment = Alignment(horizontal=align, vertical="center", wrap_text=wrap)
    elif wrap: cell.alignment = Alignment(vertical="center", wrap_text=True)
    if border: cell.border = BORDER

def title(ws, text, span, sub=None):
    ws.merge_cells(f"A1:{get_column_letter(span)}1")
    c = ws["A1"]; c.value = text
    style(c, f=font(17, True, WHITE), fl=fill(NAVY), align="left")
    ws.row_dimensions[1].height = 30
    if sub:
        ws.merge_cells(f"A2:{get_column_letter(span)}2")
        s = ws["A2"]; s.value = sub
        style(s, f=font(10, False, "FFFFFF"), fl=fill(NAVY), align="left")
        ws.row_dimensions[2].height = 18

def section(ws, row, text, span):
    ws.merge_cells(f"A{row}:{get_column_letter(span)}{row}")
    c = ws[f"A{row}"]; c.value = text.upper()
    style(c, f=font(10, True, TEAL), align="left")

def input_cell(ws, ref, value, nf=MONEY, comment=None):
    c = ws[ref]; c.value = value
    style(c, f=font(11, True, "1A1A1A"), fl=fill(AMBER), nf=nf, align="right", border=True)
    c.border = Border(left=Side(style="thin", color=AMBERB), right=Side(style="thin", color=AMBERB),
                      top=Side(style="thin", color=AMBERB), bottom=Side(style="thin", color=AMBERB))
    if comment:
        cm = Comment(comment, "Margin Studio"); cm.width = 240; cm.height = 110
        c.comment = cm
    return c

def out_cell(ws, ref, formula, nf=MONEY, bold=False, hl=False):
    c = ws[ref]; c.value = formula
    style(c, f=font(11, bold, "11302C" if hl else "1A1A1A"),
          fl=fill(TEALBG) if hl else None, nf=nf, align="right", border=True)
    return c

def label(ws, ref, text, bold=False, color="333333"):
    c = ws[ref]; c.value = text
    style(c, f=font(11, bold, color), align="left")
    return c

# ================================================================ workbook
wb = Workbook()

# ---------------------------------------------------------------- 1. CALCULATOR
ws = wb.active
ws.title = "Calculator"
ws.sheet_properties.tabColor = TEAL
ws.sheet_view.showGridLines = False
for col, w in {"A": 3, "B": 30, "C": 16, "D": 3, "E": 30, "F": 16}.items():
    ws.column_dimensions[col].width = w
title(ws, "Beverage Margin Studio — Calculator",
      6, "Yellow cells are inputs. Everything else is a live formula — edit MSRP, CP or Volume and watch it recalc.")

section(ws, 4, "Inputs", 3)
rows_in = [
    ("MSRP — selling price / unit", "C5", 3.50, MONEY, "Price the customer pays per unit, excluding sales tax."),
    ("CP — cost / unit (landed)",   "C6", 1.20, MONEY, "All-in cost to put one sellable unit on the shelf. Build it on the Cost Builder sheet."),
    ("Volume — units sold",         "C7", 10000, NUM,  "Sellable units over the period you are modeling."),
    ("Fixed / period costs",        "C8", 0,    MONEY, "Costs that don't change with volume (slotting, marketing, storage)."),
    ("Units / case",                "C9", 24,   NUM,   "Units per case, for case-level economics."),
    ("Target profit",               "C10", 0,   MONEY, "A profit goal; the model finds the units needed to reach it."),
]
r = 5
for lab, ref, val, nf, cm in rows_in:
    label(ws, f"B{r}", lab)
    input_cell(ws, ref, val, nf, cm)
    r += 1

section(ws, 12, "Results — per unit & per period", 6)
res = [
    ("B13", "Profit / unit",            "=C5-C6",                         MONEY, True,  "F13", "Margin & markup", None, None),
    ("B14", "Gross margin",             '=IF(C5>0,(C5-C6)/C5,"")',        PCT,   True,  None,  None, None, None),
    ("B15", "Markup",                   '=IF(C6>0,(C5-C6)/C6,"")',        PCT,   True,  None,  None, None, None),
    ("B16", "Revenue",                  "=C5*C7",                         MONEY0,False, None,  None, None, None),
    ("B17", "COGS",                     "=C6*C7",                         MONEY0,False, None,  None, None, None),
    ("B18", "Gross profit",             "=C16-C17",                       MONEY0,True,  None,  None, None, None),
    ("B19", "Net profit (after fixed)", "=C18-C8",                        MONEY0,True,  None,  None, None, None),
]
for ref_lab, lab, formula, nf, bold, *_ in res:
    cidx = ref_lab[0]; rr = ref_lab[1:]
    label(ws, ref_lab, lab, bold=bold)
    out_cell(ws, f"C{rr}", formula, nf, bold=bold, hl=bold)

# right column results
label(ws, "E13", "Break-even units", bold=True)
out_cell(ws, "F13", '=IF((C5-C6)>0,C8/(C5-C6),"n/a")', NUM, bold=True, hl=True)
label(ws, "E14", "Units to hit target profit", bold=True)
out_cell(ws, "F14", '=IF((C5-C6)>0,(C8+C10)/(C5-C6),"n/a")', NUM, bold=True, hl=True)
label(ws, "E15", "Cases sold")
out_cell(ws, "F15", '=IF(C9>0,C7/C9,"")', NUM)
label(ws, "E16", "Revenue / case")
out_cell(ws, "F16", "=C5*C9", MONEY)
label(ws, "E17", "Profit / case")
out_cell(ws, "F17", "=(C5-C6)*C9", MONEY)
label(ws, "E18", "Cost as % of price")
out_cell(ws, "F18", '=IF(C5>0,C6/C5,"")', PCT)

# margin health conditional formatting on C14
ws.conditional_formatting.add("C14", CellIsRule(operator="lessThan", formula=["0"], fill=fill(RED)))
ws.conditional_formatting.add("C14", CellIsRule(operator="between", formula=["0", "0.1"], fill=fill("FFC24B")))
ws.conditional_formatting.add("C14", CellIsRule(operator="between", formula=["0.1", "0.25"], fill=fill(YEL)))
ws.conditional_formatting.add("C14", CellIsRule(operator="greaterThanOrEqual", formula=["0.25"], fill=fill(GRN)))

label(ws, "B21", "Tip: build a defensible CP on the Cost Builder sheet, then paste it into C6.", color=GREY)
ws["B21"].font = font(10, False, GREY, italic=True)

# ---------------------------------------------------------------- 2. COST BUILDER
cb = wb.create_sheet("Cost Builder")
cb.sheet_properties.tabColor = "5B9DFF"
cb.sheet_view.showGridLines = False
for col, w in {"A": 3, "B": 30, "C": 16, "D": 3, "E": 28, "F": 16}.items():
    cb.column_dimensions[col].width = w
title(cb, "Cost Builder — your true landed cost (CP)", 6,
      "Add up everything it takes to land one sellable unit. The total is your CP.")
section(cb, 4, "Cost components / unit", 3)
comp = [
    ("Base unit cost (supplier)", "C5", 0.85, "Supplier's per-unit price before any other cost."),
    ("Freight / unit",            "C6", 0.12, "Inbound shipping & logistics per unit."),
    ("Duty / excise / unit",      "C7", 0.08, "Import duty or alcohol/sugar excise per unit."),
    ("Packaging / label / unit",  "C8", 0.10, "Secondary packaging, labels, rework."),
    ("Deposit / other / unit",    "C9", 0.05, "Container deposit or any other per-unit cost."),
]
r = 5
for lab, ref, val, cm in comp:
    label(cb, f"B{r}", lab); input_cell(cb, ref, val, MONEY, cm); r += 1
label(cb, "B10", "Spoilage / breakage allowance")
input_cell(cb, "C10", 0.03, PCT, "Share of units lost to breakage/shrink. Survivors carry the loss: cost ÷ (1 − spoilage%).")

style(label(cb, "B12", "LANDED COST"), f=font(10, True, TEAL))
style(label(cb, "E12", "QUICK MARGIN PREVIEW"), f=font(10, True, TEAL))
label(cb, "B13", "Subtotal (sum of components)")
out_cell(cb, "C13", "=SUM(C5:C9)", MONEY)
label(cb, "B14", "Landed cost / unit  (CP)", bold=True)
out_cell(cb, "C14", "=IF(C10<1,C13/(1-C10),C13)", MONEY, bold=True, hl=True)
label(cb, "B15", "Cost / case")
out_cell(cb, "C15", "=C14*Calculator!C9", MONEY)
label(cb, "B16", "Spoilage uplift")
out_cell(cb, "C16", "=C14-C13", MONEY)

label(cb, "E13", "If I sell at MSRP …")
input_cell(cb, "F13", 3.50, MONEY, "Try a selling price to preview margin & markup against the landed cost.")
label(cb, "E14", "Gross margin", bold=True)
out_cell(cb, "F14", '=IF(F13>0,(F13-C14)/F13,"")', PCT, bold=True, hl=True)
label(cb, "E15", "Markup", bold=True)
out_cell(cb, "F15", '=IF(C14>0,(F13-C14)/C14,"")', PCT, bold=True, hl=True)
label(cb, "E16", "Profit / unit")
out_cell(cb, "F16", "=F13-C14", MONEY)
label(cb, "B18", "To use this CP: copy C14 and paste-special (values) into Calculator!C6.", color=GREY)
cb["B18"].font = font(10, False, GREY, italic=True)

# ---------------------------------------------------------------- 3. PORTFOLIO
pf = wb.create_sheet("Portfolio")
pf.sheet_properties.tabColor = "23E0A0"
pf.sheet_view.showGridLines = False
headers = ["Product", "MSRP", "CP", "Units/case", "Volume",
           "Margin", "Markup", "Profit/unit", "Revenue", "COGS", "Gross profit"]
widths = [26, 11, 11, 11, 11, 10, 10, 12, 13, 13, 14]
for i, w in enumerate(widths):
    pf.column_dimensions[get_column_letter(i + 1)].width = w
title(pf, "Portfolio — every SKU side by side", 11,
      "Edit the yellow Product / MSRP / CP / Units / Volume cells. Margins, profit and blended totals are live formulas.")
HDR = 4
for i, h in enumerate(headers):
    c = pf.cell(row=HDR, column=i + 1, value=h)
    style(c, f=font(10, True, WHITE), fl=fill(NAVY),
          align="left" if i == 0 else "right", border=True)
pf.freeze_panes = "A5"

seed = [
    ("Sparkling Water 500ml", 1.80, 0.55, 24, 24000),
    ("Cold Brew Can 250ml",   3.50, 1.20, 12, 9000),
    ("Craft Soda 355ml",      2.25, 0.78, 24, 14000),
    ("Energy Drink 250ml",    2.99, 0.95, 24, 7000),
]
N = 14  # total product rows (seeded + blank)
first, last = HDR + 1, HDR + N
for k in range(N):
    rr = first + k
    data = seed[k] if k < len(seed) else ("", None, None, None, None)
    # inputs
    cn = pf.cell(row=rr, column=1, value=data[0]); style(cn, f=font(11), fl=fill(AMBER), align="left", border=True)
    for col, val, nf in [(2, data[1], MONEY), (3, data[2], MONEY), (4, data[3], NUM), (5, data[4], NUM)]:
        c = pf.cell(row=rr, column=col, value=val)
        style(c, f=font(11), fl=fill(AMBER), nf=nf, align="right", border=True)
    # formulas
    f = {
        6:  f'=IF(B{rr}>0,(B{rr}-C{rr})/B{rr},"")',
        7:  f'=IF(C{rr}>0,(B{rr}-C{rr})/C{rr},"")',
        8:  f'=IF(B{rr}<>"",B{rr}-C{rr},"")',
        9:  f'=IF(B{rr}<>"",B{rr}*E{rr},"")',
        10: f'=IF(B{rr}<>"",C{rr}*E{rr},"")',
        11: f'=IF(B{rr}<>"",I{rr}-J{rr},"")',
    }
    nfmt = {6: PCT, 7: PCT, 8: MONEY, 9: MONEY0, 10: MONEY0, 11: MONEY0}
    for col, formula in f.items():
        c = pf.cell(row=rr, column=col, value=formula)
        style(c, f=font(11), nf=nfmt[col], align="right", border=True)

# totals
tr = last + 1
tc = pf.cell(row=tr, column=1, value="Portfolio total")
style(tc, f=font(11, True, WHITE), fl=fill(NAVY), align="left", border=True)
for col in range(2, 12):
    c = pf.cell(row=tr, column=col); style(c, fl=fill(NAVY), border=True)
tot = {
    6:  (f'=IF(SUM(I{first}:I{last})>0,SUM(K{first}:K{last})/SUM(I{first}:I{last}),"")', PCT),
    7:  (f'=IF(SUM(J{first}:J{last})>0,SUM(K{first}:K{last})/SUM(J{first}:J{last}),"")', PCT),
    9:  (f"=SUM(I{first}:I{last})", MONEY0),
    10: (f"=SUM(J{first}:J{last})", MONEY0),
    11: (f"=SUM(K{first}:K{last})", MONEY0),
}
for col, (formula, nf) in tot.items():
    c = pf.cell(row=tr, column=col, value=formula)
    style(c, f=font(11, True, WHITE), fl=fill(NAVY), nf=nf, align="right", border=True)
pf.cell(row=tr, column=8, value="blended →").font = font(10, True, "FFFFFF")
pf.cell(row=tr, column=8).fill = fill(NAVY)
pf.cell(row=tr, column=8).alignment = Alignment(horizontal="right")

# heat the margin column
pf.conditional_formatting.add(
    f"F{first}:F{last}",
    ColorScaleRule(start_type="num", start_value=0, start_color=RED,
                   mid_type="num", mid_value=0.3, mid_color=YEL,
                   end_type="num", end_value=0.6, end_color=GRN))

# gross-profit bar chart
chart = BarChart(); chart.type = "bar"; chart.title = "Gross profit by product"
chart.height = 8; chart.width = 16; chart.legend = None
data = Reference(pf, min_col=11, min_row=HDR, max_row=last)
cats = Reference(pf, min_col=1, min_row=first, max_row=last)
chart.add_data(data, titles_from_data=True); chart.set_categories(cats)
pf.add_chart(chart, "A" + str(tr + 3))

# ---------------------------------------------------------------- 4. SENSITIVITY
sn = wb.create_sheet("Sensitivity")
sn.sheet_properties.tabColor = "FFC24B"
sn.sheet_view.showGridLines = False
for col in range(1, 9):
    sn.column_dimensions[get_column_letter(col)].width = 13
title(sn, "Sensitivity heatmap — margin (or markup) vs price × cost", 8,
      "Set centre price, centre cost and range. Each cell recalculates for a different MSRP × cost combo and colours itself.")
# controls
label(sn, "B3", "Centre MSRP"); input_cell(sn, "C3", 3.50, MONEY)
label(sn, "D3", "Centre cost"); input_cell(sn, "E3", 1.20, MONEY)
label(sn, "F3", "Range ±"); input_cell(sn, "G3", 0.30, PCT, "How far above/below centre to sweep, e.g. 30%.")
label(sn, "B4", "Metric");
mv = sn["C4"]; mv.value = "Margin"
style(mv, f=font(11, True, "1A1A1A"), fl=fill(AMBER), align="center", border=True)
dv = DataValidation(type="list", formula1='"Margin,Markup"', allow_blank=False)
sn.add_data_validation(dv); dv.add(mv)

GRID_TOP = 6          # row of column (cost) headers
GRID_LEFT_LBL = 7     # first data row (one below the headers)
# corner
corner = sn.cell(row=GRID_TOP, column=1, value="MSRP ↓ / Cost →")
style(corner, f=font(9, True, WHITE), fl=fill(NAVY), align="center", border=True)
# cost (column) headers B..H  (7 steps), j = 0..6
for j in range(7):
    col = 2 + j
    c = sn.cell(row=GRID_TOP, column=col,
                value=f"=$E$3*(1+$G$3*((2*{j}/6)-1))")
    style(c, f=font(10, True, WHITE), fl=fill(NAVY), nf=MONEY, align="center", border=True)
# price (row) headers A7..A13 (7 steps) and interior cells
for i in range(7):
    row = GRID_LEFT_LBL + i
    pc = sn.cell(row=row, column=1, value=f"=$C$3*(1+$G$3*((2*{i}/6)-1))")
    style(pc, f=font(10, True, WHITE), fl=fill(NAVY), nf=MONEY, align="center", border=True)
    for j in range(7):
        col = 2 + j
        cl = get_column_letter(col)
        # margin = (P - cost)/P ; markup = (P - cost)/cost  switchable on C4
        formula = (f'=IF($A{row}>0,'
                   f'IF($C$4="Markup",IF({cl}${GRID_TOP}>0,($A{row}-{cl}${GRID_TOP})/{cl}${GRID_TOP},""),'
                   f'($A{row}-{cl}${GRID_TOP})/$A{row}),"")')
        c = sn.cell(row=row, column=col, value=formula)
        style(c, f=font(10, False, "1A1A1A"), nf=PCT, align="center", border=True)
grid_range = f"B{GRID_LEFT_LBL}:H{GRID_LEFT_LBL+6}"
sn.conditional_formatting.add(
    grid_range,
    ColorScaleRule(start_type="min", start_color=RED,
                   mid_type="percentile", mid_value=50, mid_color=YEL,
                   end_type="max", end_color=GRN))
label(sn, "A15", "Green = stronger, red = weaker. Switch the Metric cell between Margin and Markup.", color=GREY)
sn["A15"].font = font(10, False, GREY, italic=True)

# ---------------------------------------------------------------- 5. REFERENCE
rf = wb.create_sheet("Reference")
rf.sheet_properties.tabColor = "A98BFF"
rf.sheet_view.showGridLines = False
for col, w in {"A": 3, "B": 22, "C": 18, "D": 3, "E": 22, "F": 16}.items():
    rf.column_dimensions[col].width = w
title(rf, "Reference — Margin ↔ Markup", 6, "They are linked but not equal. Convert either way below.")
section(rf, 4, "Live converter", 3)
label(rf, "B5", "Enter margin %"); input_cell(rf, "C5", 0.50, PCT)
label(rf, "B6", "→ equivalent markup", bold=True); out_cell(rf, "C6", '=IF(C5<1,C5/(1-C5),"")', PCT, bold=True, hl=True)
label(rf, "E5", "Enter markup %"); input_cell(rf, "F5", 1.00, PCT)
label(rf, "E6", "→ equivalent margin", bold=True); out_cell(rf, "F6", "=F5/(1+F5)", PCT, bold=True, hl=True)

section(rf, 8, "Reference table", 3)
rf.cell(row=9, column=2, value="Gross margin").font = font(10, True, WHITE)
rf.cell(row=9, column=2).fill = fill(NAVY); rf.cell(row=9, column=2).border = BORDER
rf.cell(row=9, column=3, value="Markup").font = font(10, True, WHITE)
rf.cell(row=9, column=3).fill = fill(NAVY); rf.cell(row=9, column=3).border = BORDER
margins = [0.10, 0.15, 0.20, 0.25, 0.30, 1/3, 0.40, 0.50, 0.60, 2/3, 0.75]
for i, m in enumerate(margins):
    rr = 10 + i
    a = rf.cell(row=rr, column=2, value=m); style(a, nf=PCT, align="right", border=True)
    b = rf.cell(row=rr, column=3, value=f"=B{rr}/(1-B{rr})"); style(b, nf=PCT, align="right", border=True)

# ---------------------------------------------------------------- 6. GUIDE
gd = wb.create_sheet("Guide")
gd.sheet_properties.tabColor = NAVY
gd.sheet_view.showGridLines = False
gd.column_dimensions["A"].width = 3
gd.column_dimensions["B"].width = 110
title(gd, "Guide — what every number means", 2)
guide_lines = [
    ("", ""),
    ("Margin vs Markup — the #1 confusion", "h"),
    ("Margin answers 'what share of the sale do I keep?'  →  (MSRP − CP) ÷ MSRP", ""),
    ("Markup answers 'how much did I add on top of cost?'  →  (MSRP − CP) ÷ CP", ""),
    ("For the same price and cost, markup is always the bigger number.", ""),
    ("Convert:  markup = margin ÷ (1 − margin)      margin = markup ÷ (1 + markup)", "m"),
    ("", ""),
    ("Core formulas", "h"),
    ("profit / unit   = MSRP − CP", "m"),
    ("revenue         = MSRP × volume", "m"),
    ("COGS            = CP × volume", "m"),
    ("gross profit    = revenue − COGS", "m"),
    ("net profit      = gross profit − fixed costs", "m"),
    ("break-even units = fixed costs ÷ (MSRP − CP)", "m"),
    ("", ""),
    ("Beverage-specific reality", "h"),
    ("• Landed cost ≠ supplier price. Freight, duty/excise, packaging, deposits and breakage all sit", ""),
    ("  between the invoice and the shelf — build the real CP on the Cost Builder sheet.", ""),
    ("• Three-tier (esp. alcohol): supplier → distributor → retailer each take a margin. Model each", ""),
    ("  tier as its own Portfolio row, using the prior tier's price as the next tier's cost.", ""),
    ("• Case packs: you buy in cases but sell in units — set Units/case for case-level economics.", ""),
    ("• Excise & deposits are per-unit costs that quietly crush thin margins; keep them visible.", ""),
    ("", ""),
    ("How to use the sheets", "h"),
    ("Calculator   – one product, live. Inputs are the yellow cells.", ""),
    ("Cost Builder – assemble a defensible CP, then paste it into Calculator!C6.", ""),
    ("Portfolio    – every SKU side by side with a profit-weighted blended margin and a chart.", ""),
    ("Sensitivity  – a heatmap of margin/markup across price × cost; switch the Metric cell.", ""),
    ("Reference    – margin ↔ markup converter and lookup table.", ""),
    ("", ""),
    ("Figures are estimates — validate against your own invoices, excise schedules and tax rules.", "i"),
]
r = 4
for text, kind in guide_lines:
    c = gd.cell(row=r, column=2, value=text)
    if kind == "h":
        style(c, f=font(12, True, TEAL))
    elif kind == "m":
        style(c, f=Font(name="Consolas", size=10, color="11302C"), fl=fill(TEALBG))
    elif kind == "i":
        style(c, f=font(10, False, GREY, italic=True))
    else:
        style(c, f=font(11, False, "333333"), wrap=True)
    r += 1

# ---------------------------------------------------------------- save
wb.active = 0
OUT = "beverage-margin-model.xlsx"
wb.save(OUT)
print(f"Wrote {OUT} with sheets: {', '.join(s.title for s in wb.worksheets)}")
