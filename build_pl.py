#!/usr/bin/env python3
"""Build the Organika RTD P&L workbook: 3 SKUs x 7 channels, single Aug 1 - Nov 1 2026 period."""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.comments import Comment
from openpyxl.utils import get_column_letter
from openpyxl.workbook.properties import CalcProperties
from openpyxl.formatting.rule import ColorScaleRule

# ---- palette / styles (matched to the original template) ----
NAVY   = "FF1F3864"
MIDBLU = "FF2E75B6"
LTBLU  = "FFEAF2FB"
BLUE   = "FF0000FF"   # input-cell font
BLACK  = "FF000000"   # formula-cell font
GREY   = "FF595959"
WHITE  = "FFFFFFFF"
INPUT_FILL = "FFFFF2CC"   # light amber highlight on every editable input

CUR2 = '\\$#,##0.00_);"($"#,##0.00\\);\\-'   # per-case currency
CUR0 = '\\$#,##0_);"($"#,##0\\);\\-'          # total currency
INT  = '#,##0_);(#,##0\\);\\-'                 # case counts
PCT  = '0.0%'

def font(sz=10, bold=False, color=BLACK):
    return Font(name="Arial", size=sz, bold=bold, color=color)
def fill(c):
    return PatternFill("solid", fgColor=c)

CHANNELS = ["Shopify", "Amazon", "On-premise", "Retail", "Distributor", "Corporate Office",
            "Purity Life", "Natural & Specialty Direct", "FDM Direct", "Convenience", "Fitness Centre"]
CH_COLS  = [get_column_letter(2 + i) for i in range(len(CHANNELS))]   # B..H
TOT_COL  = get_column_letter(2 + len(CHANNELS))                        # I
LAST_COL = TOT_COL
FIRST, LAST = CH_COLS[0], CH_COLS[-1]                                  # B, H

# row -> (label, kind) ; kind drives number format
ROWS = {
    9:  ("Physical Cases",            "int"),
    10: ("Gross Revenue",             "cur0"),
    11: ("Discounts",                 "cur0"),
    12: ("Net Sales",                 "cur0"),
    13: ("    COGS Direct",           "cur0"),
    14: ("    COGS Indirect",         "cur0"),
    15: ("Cost of Sales",             "cur0"),
    16: ("Gross Profit",              "cur0"),
    17: ("GP %",                      "pct"),
    19: ("    A&P Consumer",          "cur0"),
    20: ("    A&P Trade",             "cur0"),
    21: ("    A&P Sales",             "cur0"),
    22: ("A&P",                       "cur0"),
    24: ("Contrib After A&P (CAAP)",  "cur0"),
    26: ("Gross Rev - per case",      "cur2"),
    27: ("Discounts - per case",      "cur2"),
    28: ("Net Sales - per case",      "cur2"),
    29: ("    COGS Direct - per case","cur2"),
    30: ("    COGS Indirect - per case","cur2"),
    31: ("Cost of Sales - per case",  "cur2"),
    32: ("Gross Profit - per case",   "cur2"),
    33: ("GP %",                      "pct"),
    34: ("A&P - per case",            "cur2"),
    35: ("CAAP - per case",           "cur2"),
}
FMT = {"int": INT, "cur0": CUR0, "cur2": CUR2, "pct": PCT}
SPACERS = {3: 7.5, 5: 6.0, 7: 7.5, 18: 6.0, 23: 6.0, 25: 6.0}
PCT_ROWS = (17, 33)
# input rows (blue) on SKU tabs, for channel columns B..H
# (COGS rows 29/30 are NOT inputs — they pull from the Cost Build-up tab)
INPUT_ROWS = (9, 19, 20, 21, 26, 27)

# Cost Build-up tab — output cells the SKU P&Ls reference for COGS per case
COST_SHEET = "Cost Build-up"
R_DIRECT, R_INDIRECT = 44, 45
COST_DIRECT_REF   = f"='{COST_SHEET}'!$D${R_DIRECT}"
COST_INDIRECT_REF = f"='{COST_SHEET}'!$D${R_INDIRECT}"
COST_TOTAL_REF    = f"'{COST_SHEET}'!$D${R_INDIRECT+1}"   # COGS total / case (no leading =)


def build_sheet(ws, title, section, is_total, sku_sheets=None):
    # column widths
    ws.column_dimensions["A"].width = 30
    for col in CH_COLS + [TOT_COL]:
        ws.column_dimensions[col].width = 13

    # row 1 title
    ws.merge_cells(f"A1:{LAST_COL}1")
    c = ws["A1"]; c.value = title
    c.font = font(13, True, WHITE); c.fill = fill(NAVY); c.alignment = Alignment("left", "center")
    ws.row_dimensions[1].height = 27.75

    # row 2 subtitle
    ws.merge_cells(f"A2:{LAST_COL}2")
    c = ws["A2"]; c.value = "CDN $ | Per case of 24 cans (6×4×355 ml) | Period: Aug 1 – Nov 1, 2026"
    c.font = font(9, False, GREY); c.alignment = Alignment("left", "center")
    ws.row_dimensions[2].height = 15

    # row 4 column headers
    a = ws["A4"]; a.value = "CDN $"; a.font = font(10, True, WHITE); a.fill = fill(MIDBLU)
    a.alignment = Alignment("left", "center", wrap_text=True)
    for col, name in zip(CH_COLS, CHANNELS):
        c = ws[f"{col}4"]; c.value = name; c.font = font(10, True, WHITE); c.fill = fill(MIDBLU)
        c.alignment = Alignment("center", "center", wrap_text=True)
    c = ws[f"{TOT_COL}4"]; c.value = "Total"; c.font = font(10, True, WHITE); c.fill = fill(NAVY)
    c.alignment = Alignment("center", "center", wrap_text=True)
    ws.row_dimensions[4].height = 45

    # row 6 legend
    ws.merge_cells(f"A6:{LAST_COL}6")
    c = ws["A6"]; c.value = "\U0001F7E1 Yellow box = input (edit these)   ⚫ Black = formula   \U0001F535 Blue band = margin %"
    c.font = font(8, False, GREY); c.alignment = Alignment("left", "center")
    ws.row_dimensions[6].height = 13.5

    # row 8 section header
    ws.merge_cells(f"A8:{LAST_COL}8")
    c = ws["A8"]; c.value = section; c.font = font(11, True, WHITE); c.fill = fill(NAVY)
    c.alignment = Alignment("left", "center")
    ws.row_dimensions[8].height = 15

    # spacers
    for r, h in SPACERS.items():
        ws.row_dimensions[r].height = h

    # labels + values
    for row, (label, kind) in ROWS.items():
        ws.row_dimensions[row].height = 15
        la = ws[f"A{row}"]; la.value = label; la.font = font(10, False, BLACK)
        la.alignment = Alignment("left", "center")
        numfmt = FMT[kind]
        for col in CH_COLS + [TOT_COL]:
            cell = ws[f"{col}{row}"]
            cell.number_format = numfmt
            cell.alignment = Alignment("right", "center")
            is_input = (not is_total) and col != TOT_COL and row in INPUT_ROWS
            cell.font = font(10, False, BLUE if is_input else BLACK)
            if is_input:
                cell.fill = fill(INPUT_FILL)
            else:
                cell.value = formula(row, col, is_total, sku_sheets)
        # pct band fill across the whole row
        if row in PCT_ROWS:
            for col in ["A"] + CH_COLS + [TOT_COL]:
                ws[f"{col}{row}"].fill = fill(LTBLU)

    # target-volume note on the Total cell
    tgt = "Should total 1,500 cases (500 × 3 flavours)" if is_total else "Should total 500 cases for this flavour"
    ws[f"{TOT_COL}9"].comment = Comment(tgt, "Model")

    ws.freeze_panes = "B9"
    ws.sheet_view.showGridLines = False


def formula(row, col, is_total, sku_sheets):
    """Return the formula/value for a computed cell (col is a channel col B..H or the Total col)."""
    is_tot_col = (col == TOT_COL)

    if is_total:
        # ----- TTL roll-up sheet -----
        sumsheets = "+".join(f"'{s}'!{col}{row}" for s in sku_sheets)
        if is_tot_col:
            # Total column: $ rows = sum across channels; per-case = blended; pct = ratio
            if row in (17, 33):
                num, den = (16, 12) if row == 17 else (32, 28)
                return f'=IFERROR({TOT_COL}{num}/{TOT_COL}{den},"-")'
            if row in PC_BLENDED:                       # per-case blended from totals
                return PC_BLENDED[row](TOT_COL)
            return f"=SUM({FIRST}{row}:{LAST}{row})"
        else:
            # channel column on TTL: $/case rows = cross-sheet sum; pct & per-case = derived here
            if row in (17, 33):
                num, den = (16, 12) if row == 17 else (32, 28)
                return f'=IFERROR({col}{num}/{col}{den},"-")'
            if row in PC_BLENDED:
                return PC_BLENDED[row](col)
            return f"={sumsheets}"

    # ----- SKU sheet -----
    if is_tot_col:
        if row == 9:
            return f"=SUM({FIRST}9:{LAST}9)"
        if row in (10, 11, 13, 14, 19, 20, 21):
            return f"=SUM({FIRST}{row}:{LAST}{row})"
        if row == 12: return f"={TOT_COL}10-{TOT_COL}11"
        if row == 15: return f"={TOT_COL}13+{TOT_COL}14"
        if row == 16: return f"={TOT_COL}12-{TOT_COL}15"
        if row == 17: return f'=IFERROR({TOT_COL}16/{TOT_COL}12,"-")'
        if row == 22: return f"={TOT_COL}19+{TOT_COL}20+{TOT_COL}21"
        if row == 24: return f"={TOT_COL}16-{TOT_COL}22"
        if row in PC_BLENDED: return PC_BLENDED[row](TOT_COL)
        if row == 33: return f'=IFERROR({TOT_COL}32/{TOT_COL}28,"-")'
        if row == 35: return f"={TOT_COL}32-{TOT_COL}34"
    else:
        # channel columns on a SKU sheet
        if row == 29: return COST_DIRECT_REF     # COGS direct / case  ← Cost Build-up
        if row == 30: return COST_INDIRECT_REF   # COGS indirect / case ← Cost Build-up
        if row == 10: return f"={col}26*{col}9"
        if row == 11: return f"={col}27*{col}9"
        if row == 12: return f"={col}10-{col}11"
        if row == 13: return f"={col}29*{col}9"
        if row == 14: return f"={col}30*{col}9"
        if row == 15: return f"={col}13+{col}14"
        if row == 16: return f"={col}12-{col}15"
        if row == 17: return f'=IFERROR({col}16/{col}12,"-")'
        if row == 22: return f"={col}19+{col}20+{col}21"
        if row == 24: return f"={col}16-{col}22"
        if row == 28: return f"={col}26-{col}27"
        if row == 31: return f"={col}29+{col}30"
        if row == 32: return f"={col}28-{col}31"
        if row == 33: return f'=IFERROR({col}32/{col}28,"-")'
        if row == 34: return f'=IFERROR({col}22/{col}9,"-")'
        if row == 35: return f"={col}32-{col}34"
    return None


# per-case rows that are blended weighted-averages (total$/cases) on Total cols & TTL sheet
PC_BLENDED = {
    26: lambda c: f'=IFERROR({c}10/{c}9,"-")',
    27: lambda c: f'=IFERROR({c}11/{c}9,"-")',
    28: lambda c: f'=IFERROR({c}12/{c}9,"-")',
    29: lambda c: f'=IFERROR({c}13/{c}9,"-")',
    30: lambda c: f'=IFERROR({c}14/{c}9,"-")',
    31: lambda c: f'=IFERROR({c}15/{c}9,"-")',
    32: lambda c: f'=IFERROR({c}16/{c}9,"-")',
    34: lambda c: f'=IFERROR({c}22/{c}9,"-")',
    35: lambda c: f'=IFERROR({c}32-{c}34,0)',
}

def build_dashboard(ws, sku_sheets):
    """Front-page dashboard: total P&L, blended per-case, by-SKU and by-channel matrices."""
    ttl = "TTL ORGANIKA RTD"
    widths = {"A": 26, "B": 15, "C": 15, "D": 16, "E": 13, "F": 14, "G": 14}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    def band(coord_range, text):
        first = coord_range.split(":")[0]
        ws.merge_cells(coord_range)
        c = ws[first]; c.value = text; c.font = font(10, True, WHITE); c.fill = fill(NAVY)
        c.alignment = Alignment("left", "center")

    def kpi(r, lab_col, lab, val_col, ref, kind):
        ws[f"{lab_col}{r}"].value = lab
        ws[f"{lab_col}{r}"].font = font(10, False, BLACK)
        ws[f"{lab_col}{r}"].alignment = Alignment("left", "center")
        v = ws[f"{val_col}{r}"]; v.value = ref; v.font = font(10, False, BLACK)
        v.number_format = FMT[kind]; v.alignment = Alignment("right", "center")

    # title + subtitle
    ws.merge_cells("A1:G1")
    c = ws["A1"]; c.value = "ORGANIKA RTD — DASHBOARD"
    c.font = font(13, True, WHITE); c.fill = fill(NAVY); c.alignment = Alignment("left", "center")
    ws.row_dimensions[1].height = 27.75
    ws.merge_cells("A2:G2")
    c = ws["A2"]; c.value = ("CDN $ | 6×4×355 ml (24 cans/case) | Aug 1 – Nov 1, 2026 | "
                             f"{len(sku_sheets)} SKUs × {len(CHANNELS)} channels")
    c.font = font(9, False, GREY); c.alignment = Alignment("left", "center")
    ws.row_dimensions[3].height = 6

    # ---- block headers ----
    band("A4:B4", "TOTAL P&L — ALL SKUs × ALL CHANNELS")
    band("D4:E4", "BLENDED — PER CASE")

    left = [("Physical Cases", 9, "int"), ("Gross Revenue", 10, "cur0"), ("Discounts", 11, "cur0"),
            ("Net Sales", 12, "cur0"), ("Cost of Sales", 15, "cur0"), ("Gross Profit", 16, "cur0"),
            ("GP %", 17, "pct"), ("A&P", 22, "cur0"), ("CAAP", 24, "cur0")]
    right = [("Gross Rev / case", 26, "cur2"), ("Discounts / case", 27, "cur2"),
             ("Net Sales / case", 28, "cur2"), ("COGS / case", 31, "cur2"),
             ("Gross Profit / case", 32, "cur2"), ("GP %", 33, "pct"),
             ("A&P / case", 34, "cur2"), ("CAAP / case", 35, "cur2")]
    for i, (lab, r, kind) in enumerate(left):
        kpi(5 + i, "A", lab, "B", f"='{ttl}'!{TOT_COL}{r}", kind)
    for i, (lab, r, kind) in enumerate(right):
        kpi(5 + i, "D", lab, "E", f"='{ttl}'!{TOT_COL}{r}", kind)
    for r in (11, 17):  # GP% bands
        for col in ("A", "B"):
            if r == 11: ws[f"{col}{r}"].fill = fill(LTBLU)
    ws["A11"].fill = fill(LTBLU); ws["B11"].fill = fill(LTBLU)   # left GP%
    ws["D10"].fill = fill(LTBLU); ws["E10"].fill = fill(LTBLU)   # right GP%

    # ---- BY SKU matrix ----
    hdr = ["", "Cases", "Net Sales", "Gross Profit", "GP %", "A&P", "CAAP"]
    metrics = [("int", 9), ("cur0", 12), ("cur0", 16), ("pct", 17), ("cur0", 22), ("cur0", 24)]
    band("A15:G15", "BY SKU")
    ws["A16"].value = "SKU"
    for j, h in enumerate(hdr[1:], start=1):
        cc = ws.cell(row=16, column=1 + j, value=h)
        cc.font = font(10, True, WHITE); cc.fill = fill(MIDBLU)
        cc.alignment = Alignment("center", "center")
    ws["A16"].font = font(10, True, WHITE); ws["A16"].fill = fill(MIDBLU)
    ws["A16"].alignment = Alignment("left", "center")
    for i, s in enumerate(sku_sheets):
        r = 17 + i
        ws[f"A{r}"].value = s; ws[f"A{r}"].font = font(10, False, BLACK)
        for j, (kind, src) in enumerate(metrics, start=1):
            cell = ws.cell(row=r, column=1 + j, value=f"='{s}'!{TOT_COL}{src}")
            cell.number_format = FMT[kind]; cell.font = font(10, False, BLACK)
            cell.alignment = Alignment("right", "center")
    rt = 17 + len(sku_sheets)
    ws[f"A{rt}"].value = "TOTAL"; ws[f"A{rt}"].font = font(10, True, BLACK)
    for j, (kind, src) in enumerate(metrics, start=1):
        cell = ws.cell(row=rt, column=1 + j, value=f"='{ttl}'!{TOT_COL}{src}")
        cell.number_format = FMT[kind]; cell.font = font(10, True, BLACK)
        cell.alignment = Alignment("right", "center")

    # ---- BY CHANNEL matrix ----
    base = rt + 2
    band(f"A{base}:G{base}", "BY CHANNEL")
    hrow = base + 1
    ws[f"A{hrow}"].value = "Channel"; ws[f"A{hrow}"].font = font(10, True, WHITE)
    ws[f"A{hrow}"].fill = fill(MIDBLU); ws[f"A{hrow}"].alignment = Alignment("left", "center")
    for j, h in enumerate(hdr[1:], start=1):
        cc = ws.cell(row=hrow, column=1 + j, value=h)
        cc.font = font(10, True, WHITE); cc.fill = fill(MIDBLU)
        cc.alignment = Alignment("center", "center")
    for i, (name, col) in enumerate(zip(CHANNELS, CH_COLS)):
        r = hrow + 1 + i
        ws[f"A{r}"].value = name; ws[f"A{r}"].font = font(10, False, BLACK)
        ws[f"A{r}"].alignment = Alignment("left", "center")
        for j, (kind, src) in enumerate(metrics, start=1):
            cell = ws.cell(row=r, column=1 + j, value=f"='{ttl}'!{col}{src}")
            cell.number_format = FMT[kind]; cell.font = font(10, False, BLACK)
            cell.alignment = Alignment("right", "center")
    rc = hrow + 1 + len(CHANNELS)
    ws[f"A{rc}"].value = "TOTAL"; ws[f"A{rc}"].font = font(10, True, BLACK)
    for j, (kind, src) in enumerate(metrics, start=1):
        cell = ws.cell(row=rc, column=1 + j, value=f"='{ttl}'!{TOT_COL}{src}")
        cell.number_format = FMT[kind]; cell.font = font(10, True, BLACK)
        cell.alignment = Alignment("right", "center")

    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "A3"


def build_cost_buildup(ws):
    """Bottom-up COGS from the Bevmax co-packing quote. Outputs feed the SKU P&Ls."""
    for col, w in {"A": 34, "B": 12, "C": 12, "D": 13, "E": 11}.items():
        ws.column_dimensions[col].width = w
    BL, BK = font(10, False, BLUE), font(10, False, BLACK)

    def band(rng, text):
        first = rng.split(":")[0]; ws.merge_cells(rng)
        c = ws[first]; c.value = text; c.font = font(10, True, WHITE); c.fill = fill(NAVY)
        c.alignment = Alignment("left", "center")

    def put(cell, val, *, inp=False, fmt=None, bold=False, align="right"):
        c = ws[cell]; c.value = val
        c.font = Font(name="Arial", size=10, bold=bold, color=(BLUE if inp else BLACK))
        if inp: c.fill = fill(INPUT_FILL)
        if fmt: c.number_format = fmt
        c.alignment = Alignment(align, "center")

    def label(row, text, bold=False, indent=False):
        c = ws[f"A{row}"]; c.value = ("    " + text) if indent else text
        c.font = font(10, bold, BLACK); c.alignment = Alignment("left", "center")

    ws.merge_cells("A1:E1")
    t = ws["A1"]; t.value = "ORGANIKA RTD — BOTTOM-UP COST (Bevmax quote)"
    t.font = font(13, True, WHITE); t.fill = fill(NAVY); t.alignment = Alignment("left", "center")
    ws.row_dimensions[1].height = 27.75
    ws.merge_cells("A2:E2")
    s = ws["A2"]; s.value = ("CDN $ | Quote OG2026-05-21 v15 (4-pk w/ sleeves) | Pack Summer 2026 | "
                             "FOB Airdrie AB | excl. GST")
    s.font = font(9, False, GREY); s.alignment = Alignment("left", "center")

    # run parameters
    band("A4:E4", "RUN PARAMETERS")
    label(6, "Total run size");      put("D6", 40500, inp=True, fmt=INT);  ws["B6"]="cans"
    label(7, "Number of SKUs");      put("D7", 3,     inp=True, fmt=INT);  ws["B7"]="SKUs"
    label(8, "Cans per SKU");        put("D8", "=D6/D7", fmt=INT);          ws["B8"]="cans"
    label(9, "Cans per case");       put("D9", 24,    inp=True, fmt=INT);  ws["B9"]="cans"
    label(10, "Cans per 4-pack");    put("D10", 4,    inp=True, fmt=INT);  ws["B10"]="cans"
    label(11, "Cases per run");      put("D11", "=D6/D9", fmt='#,##0.0');   ws["B11"]="cases"
    for r in (6,7,8,9,10,11):
        ws[f"B{r}"].font = font(9, False, GREY)

    # cost lines (Total $ per quote; $/can = Total / run cans)
    band("A13:E13", "BEVMAX QUOTE — COST LINES")
    for col, h in zip("ABCDE", ["Cost line","UofM","Rate $","Total $","$/can"]):
        c = ws[f"{col}14"]; c.value = h; c.font = font(9, True, WHITE); c.fill = fill(MIDBLU)
        c.alignment = Alignment("left" if col=="A" else "center", "center")
    lines = [  # label, uom, rate, total (from quote)
        ("Tolling (blend/fill/pasteurize/carbonate)", "per can", 0.300, 12150.00),
        ("4-packing", "per can", 0.050, 2025.00),
        ("Skid packing", "per run", None, 439.45),
        ("Ingredients", "per can", 0.160, 6480.00),
        ("Brite can + 202 LOE end", "per can", 0.320, 12960.00),
        ("Sleeves + application", "per label", 0.163, 6601.50),
        ("Sleeve-perforation setup (one-time)", "per setup", None, 489.00),
        ("4-pk printed carton", "per carton", 0.411, 6165.00),
        ("24-pk white tray", "per tray", 0.860, 1451.25),
        ("Grip sheets", "per tray", 1.250, 175.78),
        ("Tray labels", "per tray", 0.050, 168.75),
    ]
    r = 15
    for lab, uom, rate, total in lines:
        label(r, lab, indent=True)
        ws[f"B{r}"].value = uom; ws[f"B{r}"].font = font(9, False, GREY)
        ws[f"B{r}"].alignment = Alignment("center", "center")
        if rate is not None: put(f"C{r}", rate, inp=True, fmt=CUR2)
        else: put(f"C{r}", "—", fmt='General', align="center")
        put(f"D{r}", total, inp=True, fmt=CUR2)
        put(f"E{r}", f"=D{r}/$D$6", fmt=CUR2)
        r += 1
    sub = r
    label(sub, "Subtotal — Bevmax (FOB Airdrie)", bold=True)
    put(f"D{sub}", f"=SUM(D15:D{sub-1})", fmt=CUR2, bold=True)
    put(f"E{sub}", f"=D{sub}/$D$6", fmt=CUR2, bold=True)

    # per-unit from Bevmax
    label(sub+2, "Bevmax cost / can");      put(f"D{sub+2}", f"=D{sub}/$D$6", fmt=CUR2)
    label(sub+3, "Bevmax cost / 4-pack");   put(f"D{sub+3}", f"=D{sub+2}*D10", fmt=CUR2)
    label(sub+4, "Bevmax cost / case (24)");put(f"D{sub+4}", f"=D{sub+2}*D9", fmt=CUR2, bold=True)
    bev_case = f"D{sub+4}"

    # adders -> landed direct
    band(f"A{sub+6}:E{sub+6}", "ADDERS TO LANDED COST (per case)")
    label(sub+7, "Allergen handling (amortized)")
    put(f"D{sub+7}", f"=167.5/D11", fmt=CUR2)
    label(sub+8, "Inbound freight to DC");  put(f"D{sub+8}", 0, inp=True, fmt=CUR2)
    label(sub+9, "Testing / misc");         put(f"D{sub+9}", 0, inp=True, fmt=CUR2)
    rdir = R_DIRECT  # 44
    # overhead
    band(f"A{sub+11}:E{sub+11}", "OVERHEAD (% of landed direct)")
    label(sub+12, "OH cost %");     put(f"C{sub+12}", 0.05, inp=True, fmt=PCT)
    label(sub+13, "Other COGS %");  put(f"C{sub+13}", 0.05, inp=True, fmt=PCT)

    # outputs to P&L  (D44 direct, D45 indirect)
    band(f"A{R_DIRECT-1}:E{R_DIRECT-1}", "→ COGS TO P&L (per case)")
    label(R_DIRECT, "COGS Direct / case", bold=True)
    put(f"D{R_DIRECT}", f"={bev_case}+D{sub+7}+D{sub+8}+D{sub+9}", fmt=CUR2, bold=True)
    label(R_INDIRECT, "COGS Indirect / case", bold=True)
    put(f"D{R_INDIRECT}", f"=(C{sub+12}+C{sub+13})*D{R_DIRECT}", fmt=CUR2, bold=True)
    label(R_INDIRECT+1, "COGS Total / case", bold=True)
    put(f"D{R_INDIRECT+1}", f"=D{R_DIRECT}+D{R_INDIRECT}", fmt=CUR2, bold=True)
    label(R_INDIRECT+2, "COGS / 4-pack");  put(f"D{R_INDIRECT+2}", f"=D{R_INDIRECT+1}/D9*D10", fmt=CUR2)
    label(R_INDIRECT+3, "COGS / can");     put(f"D{R_INDIRECT+3}", f"=D{R_INDIRECT+1}/D9", fmt=CUR2)
    for rr in (R_DIRECT, R_INDIRECT, R_INDIRECT+1):
        for cc in "ABCDE": ws[f"{cc}{rr}"].fill = fill(LTBLU)

    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "A3"


def build_blended(ws, sku_sheets):
    """Volume-weighted blended P&L across all channels — per SKU and total."""
    ttl = "TTL ORGANIKA RTD"
    ws.column_dimensions["A"].width = 30
    for col in "BCDE": ws.column_dimensions[col].width = 16

    ws.merge_cells("A1:E1")
    t = ws["A1"]; t.value = "ORGANIKA RTD — BLENDED (all channels)"
    t.font = font(13, True, WHITE); t.fill = fill(NAVY); t.alignment = Alignment("left", "center")
    ws.row_dimensions[1].height = 27.75
    ws.merge_cells("A2:E2")
    s = ws["A2"]; s.value = ("CDN $ | Volume-weighted average across all 11 channels | "
                             "per case = 24 cans | Aug 1 – Nov 1, 2026")
    s.font = font(9, False, GREY); s.alignment = Alignment("left", "center")

    # header
    cols = ["B","C","D","E"]
    names = sku_sheets + ["TOTAL"]
    for col, nm in zip(cols, names):
        c = ws[f"{col}4"]; c.value = nm; c.font = font(10, True, WHITE)
        c.fill = fill(NAVY if nm == "TOTAL" else MIDBLU)
        c.alignment = Alignment("center", "center", wrap_text=True)
    ws["A4"].value = "CDN $"; ws["A4"].font = font(10, True, WHITE); ws["A4"].fill = fill(MIDBLU)
    ws["A4"].alignment = Alignment("left", "center"); ws.row_dimensions[4].height = 28

    def section(row, text):
        ws.merge_cells(f"A{row}:E{row}")
        c = ws[f"A{row}"]; c.value = text; c.font = font(11, True, WHITE); c.fill = fill(NAVY)
        c.alignment = Alignment("left", "center")

    def line(row, lab, src, kind, indent=False, band=False):
        a = ws[f"A{row}"]; a.value = ("    " + lab) if indent else lab
        a.font = font(10, False, BLACK); a.alignment = Alignment("left", "center")
        refs = [f"='{s}'!{TOT_COL}{src}" for s in sku_sheets] + [f"='{ttl}'!{TOT_COL}{src}"]
        for col, ref in zip(cols, refs):
            c = ws[f"{col}{row}"]; c.value = ref; c.font = font(10, False, BLACK)
            c.number_format = FMT[kind]; c.alignment = Alignment("right", "center")
        if band:
            for col in ["A"]+cols: ws[f"{col}{row}"].fill = fill(LTBLU)

    section(6, "PERIOD TOTALS (Aug 1 – Nov 1)")
    rows_tot = [("Physical Cases",9,"int"),("Gross Revenue",10,"cur0"),("Discounts",11,"cur0"),
                ("Net Sales",12,"cur0"),("COGS Direct",13,"cur0",True),("COGS Indirect",14,"cur0",True),
                ("Cost of Sales",15,"cur0"),("Gross Profit",16,"cur0"),("GP %",17,"pct",False,True),
                ("A&P",22,"cur0"),("Contrib After A&P (CAAP)",24,"cur0")]
    r = 7
    for spec in rows_tot:
        lab,src,kind = spec[0],spec[1],spec[2]
        indent = len(spec)>3 and spec[3]; band = len(spec)>4 and spec[4]
        line(r, lab, src, kind, indent=indent, band=band); r += 1

    r += 1
    section(r, "BLENDED PER CASE (avg across channels)"); r += 1
    rows_pc = [("Gross Rev / case",26,"cur2"),("Discounts / case",27,"cur2"),
               ("Net Sales / case",28,"cur2"),("COGS / case",31,"cur2"),
               ("Gross Profit / case",32,"cur2"),("GP %",33,"pct",False,True),
               ("A&P / case",34,"cur2"),("CAAP / case",35,"cur2")]
    for spec in rows_pc:
        lab,src,kind = spec[0],spec[1],spec[2]
        band = len(spec)>4 and spec[4]
        line(r, lab, src, kind, band=band); r += 1

    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "B5"


def build_scenarios(ws):
    """What-if sandbox: trial CP (wholesale) & MSRP points; compare scenarios; sensitivity grids."""
    cogs = COST_TOTAL_REF   # COGS total / case, from Cost Build-up
    ws.column_dimensions["A"].width = 30
    for col in "BCDEFGH": ws.column_dimensions[col].width = 13
    SCN = ["B","C","D","E","F"]

    def band(rng, text):
        first = rng.split(":")[0]; ws.merge_cells(rng)
        c = ws[first]; c.value = text; c.font = font(11, True, WHITE); c.fill = fill(NAVY)
        c.alignment = Alignment("left", "center")
    def lab(r, text, bold=False):
        c = ws[f"A{r}"]; c.value = text; c.font = font(10, bold, BLACK)
        c.alignment = Alignment("left", "center")
    def put(cell, val, *, inp=False, fmt=None, bold=False, band_fill=False):
        c = ws[cell]; c.value = val
        c.font = Font(name="Arial", size=10, bold=bold, color=(BLUE if inp else BLACK))
        if inp: c.fill = fill(INPUT_FILL)
        elif band_fill: c.fill = fill(LTBLU)
        if fmt: c.number_format = fmt
        c.alignment = Alignment("right", "center")

    # title
    ws.merge_cells("A1:H1")
    t = ws["A1"]; t.value = "ORGANIKA RTD — SCENARIOS & PRICE SENSITIVITY"
    t.font = font(13, True, WHITE); t.fill = fill(NAVY); t.alignment = Alignment("left", "center")
    ws.row_dimensions[1].height = 27.75
    ws.merge_cells("A2:H2")
    s = ws["A2"]; s.value = ("CDN $ per case (24 cans = 6 × 4-pack) | 🟡 yellow = edit | "
                             f"COGS pulled live from Cost Build-up ({cogs.split('!')[1]})")
    s.font = font(9, False, GREY); s.alignment = Alignment("left", "center")

    # ---------- Section 1: scenario comparison ----------
    band("A4:F4", "SCENARIO COMPARISON  (CP = wholesale price, MSRP = shelf price)")
    names = ["Conservative", "Base", "Stretch", "Scenario 4", "Scenario 5"]
    lab(5, "Scenario")
    for col, nm in zip(SCN, names):
        c = ws[f"{col}5"]; c.value = nm; c.font = font(10, True, BLUE); c.fill = fill(INPUT_FILL)
        c.alignment = Alignment("center", "center")
    seed = {  # col -> (CP, MSRP, promo, volume, A&P/case)
        "B": (54, 84, 0, 500, 0), "C": (60, 96, 0, 500, 0), "D": (66, 108, 0, 500, 0)}
    inputs = [(6,"CP — wholesale ($/case)",CUR2,0),(7,"MSRP — retail ($/case)",CUR2,1),
              (8,"Promo / discount (% off CP)",PCT,2),(9,"Volume (cases)",INT,3),
              (10,"A&P ($/case)",CUR2,4)]
    for r, text, fmt, idx in inputs:
        lab(r, text)
        for col in SCN:
            v = seed.get(col, (None,)*5)[idx]
            put(f"{col}{r}", v, inp=True, fmt=fmt)
    calcs = [
        (11, "Net price ($/case)",   lambda c: f"={c}6*(1-{c}8)", CUR2, False),
        (12, "COGS ($/case)",        lambda c: f"={cogs}",        CUR2, False),
        (13, "Organika GP ($/case)", lambda c: f"={c}11-{c}12",   CUR2, False),
        (14, "Organika GP %",        lambda c: f'=IFERROR({c}13/{c}11,"-")', PCT, True),
        (15, "Customer margin %",    lambda c: f'=IFERROR(({c}7-{c}6)/{c}7,"-")', PCT, True),
        (16, "CAAP ($/case)",        lambda c: f"={c}13-{c}10",   CUR2, False),
        (18, "CP / 4-pack",          lambda c: f"={c}6/6",        CUR2, False),
        (19, "MSRP / 4-pack",        lambda c: f"={c}7/6",        CUR2, False),
        (20, "Net sales — period ($)",lambda c: f"={c}11*{c}9",   CUR0, False),
        (21, "Gross profit — period ($)",lambda c: f"={c}13*{c}9",CUR0, False),
        (22, "CAAP — period ($)",    lambda c: f"={c}16*{c}9",    CUR0, False),
    ]
    for r, text, fn, fmt, bandf in calcs:
        lab(r, text, bold=(r in (14,15)))
        if bandf: ws[f"A{r}"].fill = fill(LTBLU)
        for col in SCN:
            put(f"{col}{r}", fn(col), fmt=fmt, band_fill=bandf)
    ws["A17"].value = "— per-pack & period —"; ws["A17"].font = font(8, False, GREY)
    # heatmap on the two margin rows
    for rng in ("B14:F14", "B15:F15"):
        ws.conditional_formatting.add(rng, ColorScaleRule(
            start_type='num', start_value=0, start_color='F8696B',
            mid_type='num', mid_value=0.35, mid_color='FFEB84',
            end_type='num', end_value=0.7, end_color='63BE7B'))

    # ---------- Section 2: CP sensitivity ----------
    band("A24:G24", "PRICE SENSITIVITY — Organika margin as CP varies")
    for a, t1, b, val, fmt in [("A25","CP start ($/case)","B25",48,CUR2),
                               ("C25","step ($)","D25",4,CUR2),
                               ("E25","ref MSRP ($/case)","F25",96,CUR2),
                               ("G25","promo %","H25",0,PCT)]:
        ws[a].value = t1; ws[a].font = font(9, False, GREY); ws[a].alignment = Alignment("right","center")
        put(b, val, inp=True, fmt=fmt)
    hdr2 = ["CP /case","CP /4-pack","Net /case","COGS /case","GP /case","GP %","Cust margin %"]
    for col, h in zip("ABCDEFG", hdr2):
        c = ws[f"{col}26"]; c.value = h; c.font = font(9, True, WHITE); c.fill = fill(MIDBLU)
        c.alignment = Alignment("center", "center", wrap_text=True)
    for i in range(10):
        r = 27 + i
        put(f"A{r}", f"=$B$25+{i}*$D$25", fmt=CUR2)
        put(f"B{r}", f"=A{r}/6", fmt=CUR2)
        put(f"C{r}", f"=A{r}*(1-$H$25)", fmt=CUR2)
        put(f"D{r}", f"={cogs}", fmt=CUR2)
        put(f"E{r}", f"=C{r}-D{r}", fmt=CUR2)
        put(f"F{r}", f'=IFERROR(E{r}/C{r},"-")', fmt=PCT)
        put(f"G{r}", f'=IFERROR(($F$25-A{r})/$F$25,"-")', fmt=PCT)
    for rng in ("F27:F36", "G27:G36"):
        ws.conditional_formatting.add(rng, ColorScaleRule(
            start_type='num', start_value=0, start_color='F8696B',
            mid_type='num', mid_value=0.35, mid_color='FFEB84',
            end_type='num', end_value=0.7, end_color='63BE7B'))

    # ---------- Section 3: CP x MSRP customer-margin grid ----------
    band("A39:H39", "CUSTOMER (RETAILER) MARGIN %  —  CP (down) × MSRP (across)")
    ws["A40"].value = "CP ↓  /  MSRP →"; ws["A40"].font = font(9, True, BLACK)
    ws["A40"].alignment = Alignment("left", "center")
    msrp_cols = "BCDEFGH"
    for j, col in enumerate(msrp_cols):
        put(f"{col}40", 84 + j*6, inp=True, fmt=CUR2)   # MSRP header points (editable)
    for i in range(8):
        r = 41 + i
        put(f"A{r}", f"=$B$25+{i}*$D$25", fmt=CUR2)      # CP ladder (synced to sensitivity)
        for col in msrp_cols:
            put(f"{col}{r}", f'=IFERROR(({col}$40-$A{r})/{col}$40,"-")', fmt=PCT)
    ws.conditional_formatting.add("B41:H48", ColorScaleRule(
        start_type='num', start_value=0, start_color='F8696B',
        mid_type='num', mid_value=0.3, mid_color='FFEB84',
        end_type='num', end_value=0.5, end_color='63BE7B'))

    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "B5"


# ---- build workbook ----
SKUS = ["Lime Lemon", "Passion Fruit Pineapple", "Raspberry"]
TAB_COLORS = {"Lime Lemon": "FF92D050", "Passion Fruit Pineapple": "FFFFC000", "Raspberry": "FFC00000"}

wb = openpyxl.Workbook()
ttl = wb.active
ttl.title = "TTL ORGANIKA RTD"
ttl.sheet_properties.tabColor = NAVY
build_sheet(ttl, "ORGANIKA RTD — TOTAL (3 SKUs)", "Organika RTD — All SKUs (Lime Lemon + Passion Fruit Pineapple + Raspberry)",
            is_total=True, sku_sheets=SKUS)

for sku in SKUS:
    ws = wb.create_sheet(sku)
    ws.sheet_properties.tabColor = TAB_COLORS[sku]
    build_sheet(ws, f"ORGANIKA RTD — {sku.upper()}", f"Organika RTD — {sku} (6×4×355 ml)", is_total=False)

# cost build-up (feeds COGS into the SKU P&Ls)
cost = wb.create_sheet(COST_SHEET)
cost.sheet_properties.tabColor = "FF548235"
build_cost_buildup(cost)

# blended (volume-weighted across channels)
blend = wb.create_sheet("Blended")
blend.sheet_properties.tabColor = "FF7030A0"
build_blended(blend, SKUS)

# scenarios / price sensitivity sandbox
scen = wb.create_sheet("Scenarios")
scen.sheet_properties.tabColor = "FFED7D31"
build_scenarios(scen)

# dashboard
dash = wb.create_sheet("Dashboard")
dash.sheet_properties.tabColor = "FF7030A0"
build_dashboard(dash, SKUS)

# final tab order: Dashboard, Scenarios, Blended, TTL, SKUs…, Cost Build-up
order = ["Dashboard", "Scenarios", "Blended", "TTL ORGANIKA RTD"] + SKUS + [COST_SHEET]
wb._sheets = [wb[name] for name in order]

# force recalculation when opened in Excel / Google Sheets / LibreOffice
wb.calculation = CalcProperties(fullCalcOnLoad=True)

out = "/home/user/my-first-project/Organika_RTD_PL_Aug-Nov2026.xlsx"
wb.save(out)
print("Saved:", out)
print("Sheets:", wb.sheetnames)
