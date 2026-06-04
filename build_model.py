"""
Build: Organika Sparkling Daily — One-Year Scenario Model
3 flavours x (Singles + 12-Pack) = 6 SKUs, on 4 scenario tabs (Low/Base/High/Stretch).
Driven by volume (Physical Cases) x CP (Gross Rev per case), discounts & costs per case.
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = "Organika_Sparkling_Daily_1YR_Scenario_Model.xlsx"
FY = "FY2026"
LINE = "Sparkling Daily"

# ---- editable placeholders for the three flavour names -------------------
FLAVOURS = ["Pineapple", "Passionfruit", "Lime Lemon"]
FORMATS = ["Singles", "12-Pack"]

# SKU columns: Singles (3 flavours) then 12-Pack (3 flavours)
SKU_COLS = ["C", "D", "E", "F", "G", "H"]   # 6 SKUs
TOTAL_COL = "I"
SKUS = [(fmt, fl) for fmt in FORMATS for fl in FLAVOURS]  # 6 tuples

# ---- baseline per-SKU assumptions (Base scenario), per case --------------
# index aligns with SKUS order: Singles F1/F2/F3, then 12-Pack F1/F2/F3
BASE = [
    # cp,  disc, cogs_d, cogs_i, ap_cons, ap_trade, ap_sales, volume
    dict(cp=28.00, disc=2.00, cogs_d=13.00, cogs_i=2.00, ap_c=0.75, ap_t=1.25, ap_s=0.50, vol=12000),  # Singles F1
    dict(cp=28.00, disc=2.00, cogs_d=13.00, cogs_i=2.00, ap_c=0.75, ap_t=1.25, ap_s=0.50, vol=9000),   # Singles F2
    dict(cp=26.00, disc=2.00, cogs_d=12.50, cogs_i=2.00, ap_c=0.75, ap_t=1.25, ap_s=0.50, vol=7000),   # Singles F3
    dict(cp=34.00, disc=2.50, cogs_d=16.00, cogs_i=2.25, ap_c=0.75, ap_t=1.50, ap_s=0.50, vol=5000),   # 12-Pack F1
    dict(cp=34.00, disc=2.50, cogs_d=16.00, cogs_i=2.25, ap_c=0.75, ap_t=1.50, ap_s=0.50, vol=4000),   # 12-Pack F2
    dict(cp=32.00, disc=2.50, cogs_d=15.50, cogs_i=2.25, ap_c=0.75, ap_t=1.50, ap_s=0.50, vol=3000),   # 12-Pack F3
]

# scenario levers: volume multiplier, CP (price) multiplier
SCENARIOS = {
    "Low":     dict(vol=0.70, cp=0.95),
    "Base":    dict(vol=1.00, cp=1.00),
    "High":    dict(vol=1.30, cp=1.00),
    "Stretch": dict(vol=1.60, cp=1.05),
}

# ---------------------------------------------------------------- styling
C_INK = "1F2A44"      # dark navy
C_BAND = "2E4374"     # header band
C_SECTION = "D7E3F4"  # section header fill
C_INPUT = "FFF7CC"    # yellow input fill
C_TOTAL = "EAF0FB"    # total column tint
C_WHITE = "FFFFFF"

f_title = Font(name="Calibri", size=15, bold=True, color=C_INK)
f_sub = Font(name="Calibri", size=10, italic=True, color="555555")
f_hdr = Font(name="Calibri", size=10, bold=True, color=C_WHITE)
f_sec = Font(name="Calibri", size=10, bold=True, color=C_INK)
f_lbl = Font(name="Calibri", size=10, color="222222")
f_lbl_b = Font(name="Calibri", size=10, bold=True, color=C_INK)
f_input = Font(name="Calibri", size=10, color="0033AA")  # blue = editable input
f_calc = Font(name="Calibri", size=10, color="222222")

fill_band = PatternFill("solid", fgColor=C_BAND)
fill_sec = PatternFill("solid", fgColor=C_SECTION)
fill_input = PatternFill("solid", fgColor=C_INPUT)
fill_total = PatternFill("solid", fgColor=C_TOTAL)

thin = Side(style="thin", color="C9D2E0")
med = Side(style="medium", color="9AA9C4")
border_all = Border(left=thin, right=thin, top=thin, bottom=thin)

center = Alignment(horizontal="center", vertical="center", wrap_text=True)
left = Alignment(horizontal="left", vertical="center")
right = Alignment(horizontal="right", vertical="center")

FMT_CASES = "#,##0"
FMT_MONEY = "#,##0.00"
FMT_MONEY0 = "$#,##0"
FMT_PCT = "0.0%"

# Row map (consistent across every scenario tab)
R = {
    "title": 1, "sub": 2, "units": 3,
    "grp": 5, "sku": 6,
    "vol_hdr": 7, "cases": 8,
    "in_hdr": 9, "cp": 10, "disc": 11, "cogs_d": 12, "cogs_i": 13,
    "ap_c": 14, "ap_t": 15, "ap_s": 16,
    "pl_hdr": 17, "grev": 18, "discount": 19, "nsales": 20,
    "cogsd": 21, "cogsi": 22, "cos": 23, "gp": 24, "gp_pct": 25,
    "ap": 26, "caap": 27, "caap_pct": 28,
    "chk_hdr": 29, "ns_case": 30, "gp_case": 31,
}


def style_input(cell):
    cell.font = f_input
    cell.fill = fill_input
    cell.border = border_all
    cell.alignment = right


def style_calc(cell, total=False):
    cell.font = f_lbl_b if total else f_calc
    cell.border = border_all
    cell.alignment = right
    if total:
        cell.fill = fill_total


def build_scenario(ws, scen_name):
    lev = SCENARIOS[scen_name]
    ws.sheet_view.showGridLines = False

    # Title block
    ws.merge_cells(f"B{R['title']}:{TOTAL_COL}{R['title']}")
    ws[f"B{R['title']}"] = f"{LINE} — One-Year Plan ({FY})"
    ws[f"B{R['title']}"].font = f_title
    ws.merge_cells(f"B{R['sub']}:{TOTAL_COL}{R['sub']}")
    ws[f"B{R['sub']}"] = f"Scenario: {scen_name.upper()}   •   Levers vs Base — Volume {lev['vol']:.0%}, Price (CP) {lev['cp']:.0%}"
    ws[f"B{R['sub']}"].font = f_sub
    ws.merge_cells(f"B{R['units']}:{TOTAL_COL}{R['units']}")
    ws[f"B{R['units']}"] = "All $ figures CDN. Yellow cells are inputs — change volume & CP per case to model scenarios. Everything else calculates."
    ws[f"B{R['units']}"].font = f_sub

    # Group header (Singles / 12-Pack) + Total
    ws.merge_cells(f"C{R['grp']}:E{R['grp']}")
    ws[f"C{R['grp']}"] = "SINGLES"
    ws.merge_cells(f"F{R['grp']}:H{R['grp']}")
    ws[f"F{R['grp']}"] = "12-PACK"
    ws.merge_cells(f"{TOTAL_COL}{R['grp']}:{TOTAL_COL}{R['sku']}")
    ws[f"{TOTAL_COL}{R['grp']}"] = "TOTAL\nDAILY"
    for coord in [f"C{R['grp']}", f"F{R['grp']}", f"{TOTAL_COL}{R['grp']}"]:
        ws[coord].fill = fill_band
        ws[coord].font = f_hdr
        ws[coord].alignment = center

    # SKU (flavour) header row
    ws[f"B{R['sku']}"] = "CDN $"
    ws[f"B{R['sku']}"].font = f_hdr
    ws[f"B{R['sku']}"].fill = fill_band
    ws[f"B{R['sku']}"].alignment = left
    for i, (fmt, fl) in enumerate(SKUS):
        col = SKU_COLS[i]
        c = ws[f"{col}{R['sku']}"]
        c.value = fl
        c.fill = fill_band
        c.font = f_hdr
        c.alignment = center
        c.border = border_all

    def section(row, text):
        ws.merge_cells(f"B{row}:{TOTAL_COL}{row}")
        c = ws[f"B{row}"]
        c.value = text
        c.font = f_sec
        c.fill = fill_sec
        c.alignment = left
        for cc in range(2, 10):
            ws.cell(row=row, column=cc).fill = fill_sec

    def label(row, text, bold=False):
        c = ws[f"B{row}"]
        c.value = "   " + text
        c.font = f_lbl_b if bold else f_lbl
        c.alignment = left

    # ---- VOLUME
    section(R["vol_hdr"], "VOLUME")
    label(R["cases"], "Physical Cases", bold=True)
    # ---- INPUTS per case
    section(R["in_hdr"], "PRICING & COST — PER CASE  (inputs)")
    label(R["cp"], "CP  •  Gross Rev / case", bold=True)
    label(R["disc"], "Discounts / case")
    label(R["cogs_d"], "COGS Direct / case")
    label(R["cogs_i"], "COGS Indirect / case")
    label(R["ap_c"], "A&P Consumer / case")
    label(R["ap_t"], "A&P Trade / case")
    label(R["ap_s"], "A&P Sales / case")
    # ---- P&L
    section(R["pl_hdr"], "P&L  ($)")
    label(R["grev"], "Gross Revenue")
    label(R["discount"], "Discounts")
    label(R["nsales"], "Net Sales", bold=True)
    label(R["cogsd"], "COGS Direct")
    label(R["cogsi"], "COGS Indirect")
    label(R["cos"], "Cost of Sales")
    label(R["gp"], "Gross Profit", bold=True)
    label(R["gp_pct"], "GP %")
    label(R["ap"], "A&P Total")
    label(R["caap"], "Contribution After A&P", bold=True)
    label(R["caap_pct"], "CAAP %")
    # ---- per case check
    section(R["chk_hdr"], "PER-CASE CHECK")
    label(R["ns_case"], "Net Sales / case")
    label(R["gp_case"], "Gross Profit / case")

    # ---- fill SKU columns
    for i, col in enumerate(SKU_COLS):
        b = BASE[i]
        vol = round(b["vol"] * lev["vol"])
        cp = round(b["cp"] * lev["cp"], 2)
        # inputs (seeded values, editable)
        ws[f"{col}{R['cases']}"] = vol
        ws[f"{col}{R['cp']}"] = cp
        ws[f"{col}{R['disc']}"] = b["disc"]
        ws[f"{col}{R['cogs_d']}"] = b["cogs_d"]
        ws[f"{col}{R['cogs_i']}"] = b["cogs_i"]
        ws[f"{col}{R['ap_c']}"] = b["ap_c"]
        ws[f"{col}{R['ap_t']}"] = b["ap_t"]
        ws[f"{col}{R['ap_s']}"] = b["ap_s"]
        for r in [R['cp'], R['disc'], R['cogs_d'], R['cogs_i'], R['ap_c'], R['ap_t'], R['ap_s']]:
            ws[f"{col}{r}"].number_format = FMT_MONEY
            style_input(ws[f"{col}{r}"])
        ws[f"{col}{R['cases']}"].number_format = FMT_CASES
        style_input(ws[f"{col}{R['cases']}"])

        # P&L formulas
        ws[f"{col}{R['grev']}"] = f"={col}{R['cases']}*{col}{R['cp']}"
        ws[f"{col}{R['discount']}"] = f"={col}{R['cases']}*{col}{R['disc']}"
        ws[f"{col}{R['nsales']}"] = f"={col}{R['grev']}-{col}{R['discount']}"
        ws[f"{col}{R['cogsd']}"] = f"={col}{R['cases']}*{col}{R['cogs_d']}"
        ws[f"{col}{R['cogsi']}"] = f"={col}{R['cases']}*{col}{R['cogs_i']}"
        ws[f"{col}{R['cos']}"] = f"={col}{R['cogsd']}+{col}{R['cogsi']}"
        ws[f"{col}{R['gp']}"] = f"={col}{R['nsales']}-{col}{R['cos']}"
        ws[f"{col}{R['gp_pct']}"] = f"=IFERROR({col}{R['gp']}/{col}{R['nsales']},0)"
        ws[f"{col}{R['ap']}"] = f"={col}{R['cases']}*({col}{R['ap_c']}+{col}{R['ap_t']}+{col}{R['ap_s']})"
        ws[f"{col}{R['caap']}"] = f"={col}{R['gp']}-{col}{R['ap']}"
        ws[f"{col}{R['caap_pct']}"] = f"=IFERROR({col}{R['caap']}/{col}{R['nsales']},0)"
        ws[f"{col}{R['ns_case']}"] = f"=IFERROR({col}{R['nsales']}/{col}{R['cases']},0)"
        ws[f"{col}{R['gp_case']}"] = f"=IFERROR({col}{R['gp']}/{col}{R['cases']},0)"

        money_rows = [R['grev'], R['discount'], R['nsales'], R['cogsd'], R['cogsi'], R['cos'], R['gp'], R['ap'], R['caap']]
        for r in money_rows:
            ws[f"{col}{r}"].number_format = FMT_MONEY0
            style_calc(ws[f"{col}{r}"])
        for r in [R['gp_pct'], R['caap_pct']]:
            ws[f"{col}{r}"].number_format = FMT_PCT
            style_calc(ws[f"{col}{r}"])
        for r in [R['ns_case'], R['gp_case']]:
            ws[f"{col}{r}"].number_format = FMT_MONEY
            style_calc(ws[f"{col}{r}"])

    # ---- TOTAL column
    T = TOTAL_COL
    rng = f"C{{0}}:H{{0}}"
    # cases
    ws[f"{T}{R['cases']}"] = f"=SUM(C{R['cases']}:H{R['cases']})"
    ws[f"{T}{R['cases']}"].number_format = FMT_CASES
    style_calc(ws[f"{T}{R['cases']}"], total=True)
    # blended per-case inputs (weighted by cases)
    for r in [R['cp'], R['disc'], R['cogs_d'], R['cogs_i'], R['ap_c'], R['ap_t'], R['ap_s']]:
        ws[f"{T}{r}"] = (f"=IFERROR(SUMPRODUCT(C{R['cases']}:H{R['cases']},"
                         f"C{r}:H{r})/{T}{R['cases']},0)")
        ws[f"{T}{r}"].number_format = FMT_MONEY
        style_calc(ws[f"{T}{r}"], total=True)
    # $ totals
    for r in [R['grev'], R['discount'], R['cogsd'], R['cogsi'], R['ap']]:
        ws[f"{T}{r}"] = f"=SUM(C{r}:H{r})"
    ws[f"{T}{R['nsales']}"] = f"={T}{R['grev']}-{T}{R['discount']}"
    ws[f"{T}{R['cos']}"] = f"={T}{R['cogsd']}+{T}{R['cogsi']}"
    ws[f"{T}{R['gp']}"] = f"={T}{R['nsales']}-{T}{R['cos']}"
    ws[f"{T}{R['gp_pct']}"] = f"=IFERROR({T}{R['gp']}/{T}{R['nsales']},0)"
    ws[f"{T}{R['caap']}"] = f"={T}{R['gp']}-{T}{R['ap']}"
    ws[f"{T}{R['caap_pct']}"] = f"=IFERROR({T}{R['caap']}/{T}{R['nsales']},0)"
    ws[f"{T}{R['ns_case']}"] = f"=IFERROR({T}{R['nsales']}/{T}{R['cases']},0)"
    ws[f"{T}{R['gp_case']}"] = f"=IFERROR({T}{R['gp']}/{T}{R['cases']},0)"
    for r in [R['grev'], R['discount'], R['nsales'], R['cogsd'], R['cogsi'], R['cos'], R['gp'], R['ap'], R['caap']]:
        ws[f"{T}{r}"].number_format = FMT_MONEY0
        style_calc(ws[f"{T}{r}"], total=True)
    for r in [R['gp_pct'], R['caap_pct']]:
        ws[f"{T}{r}"].number_format = FMT_PCT
        style_calc(ws[f"{T}{r}"], total=True)
    for r in [R['ns_case'], R['gp_case']]:
        ws[f"{T}{r}"].number_format = FMT_MONEY
        style_calc(ws[f"{T}{r}"], total=True)

    # column widths & freeze
    ws.column_dimensions["A"].width = 2
    ws.column_dimensions["B"].width = 26
    for col in SKU_COLS:
        ws.column_dimensions[col].width = 12
    ws.column_dimensions[TOTAL_COL].width = 14
    ws.freeze_panes = "C7"
    ws.row_dimensions[R['grp']].height = 18
    ws.row_dimensions[R['sku']].height = 26


def build_dashboard(ws):
    ws.sheet_view.showGridLines = False
    ws.merge_cells("B1:G1")
    ws["B1"] = f"{LINE} — Scenario Comparison ({FY})"
    ws["B1"].font = f_title
    ws.merge_cells("B2:G2")
    ws["B2"] = "Totals across all 6 SKUs. Edit inputs on each scenario tab; this view updates automatically."
    ws["B2"].font = f_sub

    scen_names = list(SCENARIOS.keys())
    # header
    hdr_row = 4
    ws[f"B{hdr_row}"] = "Metric"
    ws[f"B{hdr_row}"].font = f_hdr
    ws[f"B{hdr_row}"].fill = fill_band
    ws[f"B{hdr_row}"].alignment = left
    ws[f"B{hdr_row}"].border = border_all
    for j, s in enumerate(scen_names):
        col = get_column_letter(3 + j)
        c = ws[f"{col}{hdr_row}"]
        c.value = s
        c.font = f_hdr
        c.fill = fill_band
        c.alignment = center
        c.border = border_all

    metrics = [
        ("Physical Cases", R["cases"], FMT_CASES),
        ("Gross Revenue", R["grev"], FMT_MONEY0),
        ("Discounts", R["discount"], FMT_MONEY0),
        ("Net Sales", R["nsales"], FMT_MONEY0),
        ("Cost of Sales", R["cos"], FMT_MONEY0),
        ("Gross Profit", R["gp"], FMT_MONEY0),
        ("GP %", R["gp_pct"], FMT_PCT),
        ("A&P Total", R["ap"], FMT_MONEY0),
        ("Contribution After A&P", R["caap"], FMT_MONEY0),
        ("CAAP %", R["caap_pct"], FMT_PCT),
        ("Blended CP / case", R["cp"], FMT_MONEY),
        ("Net Sales / case", R["ns_case"], FMT_MONEY),
    ]
    for i, (name, src_row, fmt) in enumerate(metrics):
        row = hdr_row + 1 + i
        lab = ws[f"B{row}"]
        lab.value = name
        lab.font = f_lbl_b if name in ("Net Sales", "Gross Profit", "Contribution After A&P") else f_lbl
        lab.alignment = left
        lab.border = border_all
        for j, s in enumerate(scen_names):
            col = get_column_letter(3 + j)
            c = ws[f"{col}{row}"]
            c.value = f"='{s}'!{TOTAL_COL}{src_row}"
            c.number_format = fmt
            c.alignment = right
            c.border = border_all
            if s == "Base":
                c.fill = fill_total

    ws.column_dimensions["A"].width = 2
    ws.column_dimensions["B"].width = 24
    for j in range(len(scen_names)):
        ws.column_dimensions[get_column_letter(3 + j)].width = 14
    ws.freeze_panes = "C5"


def build_readme(ws):
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 2
    ws.column_dimensions["B"].width = 100
    lines = [
        (f"{LINE} — One-Year Scenario Model", f_title),
        ("", None),
        ("WHAT THIS IS", f_sec),
        ("A simple one-year P&L model for Sparkling Daily in 3 flavours, each sold as Singles and 12-Pack (6 SKUs).", f_lbl),
        ("Each scenario lives on its own tab so you can compare different wholesale prices (CP) and volumes side by side.", f_lbl),
        ("", None),
        ("TABS", f_sec),
        ("• Dashboard  — compares the totals of all four scenarios in one view.", f_lbl),
        ("• Low / Base / High / Stretch  — one scenario each. All 6 SKUs across the columns + a TOTAL column.", f_lbl),
        ("", None),
        ("HOW TO USE", f_sec),
        ("1. Flavours (Pineapple, Passionfruit, Lime Lemon) sit in row 6 of each scenario tab — edit there if names change.", f_lbl),
        ("2. The only things you normally edit are the YELLOW cells:", f_lbl),
        ("     - Physical Cases  (volume per SKU)", f_lbl),
        ("     - CP / Gross Rev per case  (your wholesale selling price per case)", f_lbl),
        ("     - Discounts, COGS Direct/Indirect and A&P, all expressed per case.", f_lbl),
        ("3. Everything else (Gross Revenue, Net Sales, Gross Profit, GP %, Contribution After A&P) calculates automatically.", f_lbl),
        ("4. To test a new scenario, just change the yellow inputs on a tab — the Dashboard updates instantly.", f_lbl),
        ("", None),
        ("THE MATH (per SKU)", f_sec),
        ("Gross Revenue = Cases x CP/case", f_lbl),
        ("Net Sales = Gross Revenue - Discounts", f_lbl),
        ("Cost of Sales = COGS Direct + COGS Indirect", f_lbl),
        ("Gross Profit = Net Sales - Cost of Sales        GP % = Gross Profit / Net Sales", f_lbl),
        ("Contribution After A&P (CAAP) = Gross Profit - A&P", f_lbl),
        ("", None),
        ("NOTE", f_sec),
        ("All numbers loaded now are placeholders to show the mechanics. Replace them with your real figures.", f_lbl),
        ("Scenario seed logic vs Base:  Low = vol 70% / price 95%,  High = vol 130%,  Stretch = vol 160% / price 105%.", f_lbl),
    ]
    r = 1
    for text, font in lines:
        c = ws[f"B{r}"]
        c.value = text
        if font:
            c.font = font
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=False)
        r += 1


wb = openpyxl.Workbook()
ws0 = wb.active
ws0.title = "Read Me"
build_readme(ws0)

ws_dash = wb.create_sheet("Dashboard")

for scen in SCENARIOS:
    ws = wb.create_sheet(scen)
    build_scenario(ws, scen)

build_dashboard(ws_dash)

wb.save(OUT)
print("Saved", OUT)
print("Tabs:", wb.sheetnames)
