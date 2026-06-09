#!/usr/bin/env python3
"""Build the Organika RTD P&L workbook: 3 SKUs x 7 channels, single Aug 1 - Nov 1 2026 period."""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.comments import Comment
from openpyxl.utils import get_column_letter
from openpyxl.workbook.properties import CalcProperties

# ---- palette / styles (matched to the original template) ----
NAVY   = "FF1F3864"
MIDBLU = "FF2E75B6"
LTBLU  = "FFEAF2FB"
BLUE   = "FF0000FF"   # input-cell font
BLACK  = "FF000000"   # formula-cell font
GREY   = "FF595959"
WHITE  = "FFFFFFFF"

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
INPUT_ROWS = (9, 19, 20, 21, 26, 27, 29, 30)


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
    c = ws["A6"]; c.value = "\U0001F535 Blue = input cell (hardcoded)   ⚫ Black = formula   \U0001F535 Light-blue band = margin %"
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
            if not is_input:
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

# dashboard as the front (leftmost) tab
dash = wb.create_sheet("Dashboard")
dash.sheet_properties.tabColor = "FF7030A0"
build_dashboard(dash, SKUS)
wb.move_sheet("Dashboard", -(len(wb.sheetnames) - 1))

# force recalculation when opened in Excel / Google Sheets / LibreOffice
wb.calculation = CalcProperties(fullCalcOnLoad=True)

out = "/home/user/my-first-project/Organika_RTD_PL_Aug-Nov2026.xlsx"
wb.save(out)
print("Saved:", out)
print("Sheets:", wb.sheetnames)
