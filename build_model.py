"""
Build the enterprise-grade Costco UK Bee Propolis ROI model.

Design principles:
  - Single source of truth: every assumption lives on the Inputs sheet (yellow cells).
  - Three scenarios (BEST / IDEAL / WORST) share the same formula structure;
    they only differ in the per-week promo activity & lift the user sets.
  - Every assumption has a Notes column so anyone can defend the number.
  - Summary sheet rolls everything up into KPIs (Revenue, GP, GP%, Promo Spend,
    Net Profit, ROI on Promo Spend) for a side-by-side comparison.
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.formatting.rule import CellIsRule, FormulaRule

# --- Styling ------------------------------------------------------------------
NAVY = "1F4E78"
BLUE = "2E75B6"
LIGHT_BLUE = "DDEBF7"
YELLOW = "FFF2CC"   # input cells
GREY = "F2F2F2"     # calc cells
WHITE = "FFFFFF"
GREEN = "C6EFCE"
RED = "FFC7CE"
DARK_GREY = "595959"

thin = Side(border_style="thin", color="BFBFBF")
medium = Side(border_style="medium", color=NAVY)
box = Border(left=thin, right=thin, top=thin, bottom=thin)
box_bottom = Border(bottom=medium)

f_title = Font(name="Calibri", size=18, bold=True, color=WHITE)
f_section = Font(name="Calibri", size=12, bold=True, color=WHITE)
f_subhead = Font(name="Calibri", size=11, bold=True, color=NAVY)
f_label = Font(name="Calibri", size=11, bold=True)
f_input = Font(name="Calibri", size=11, color="0070C0", bold=True)
f_calc = Font(name="Calibri", size=11)
f_note = Font(name="Calibri", size=10, italic=True, color=DARK_GREY)
f_kpi_val = Font(name="Calibri", size=14, bold=True, color=NAVY)
f_kpi_label = Font(name="Calibri", size=10, bold=True, color=DARK_GREY)

fill_title = PatternFill("solid", fgColor=NAVY)
fill_section = PatternFill("solid", fgColor=BLUE)
fill_input = PatternFill("solid", fgColor=YELLOW)
fill_calc = PatternFill("solid", fgColor=GREY)
fill_kpi = PatternFill("solid", fgColor=LIGHT_BLUE)
fill_white = PatternFill("solid", fgColor=WHITE)

center = Alignment(horizontal="center", vertical="center", wrap_text=True)
left = Alignment(horizontal="left", vertical="center", wrap_text=True)
right = Alignment(horizontal="right", vertical="center")
top_wrap = Alignment(horizontal="left", vertical="top", wrap_text=True)

FMT_GBP = '_-£* #,##0_-;[Red]-£* #,##0_-;_-£* "-"??_-;_-@_-'
FMT_GBP_DEC = '_-£* #,##0.00_-;[Red]-£* #,##0.00_-;_-£* "-"??_-;_-@_-'
FMT_INT = "#,##0"
FMT_PCT = "0.0%"
FMT_MULT = '0.0"x"'

WEEKS = 26  # Week 2 through Week 27 (matches original test horizon)
FIRST_WEEK_NUM = 2

SCENARIOS = [
    {
        "key": "BEST",
        "name": "BEST – x2 Demo (Wks 5-6) + TPD",
        "color": GREEN,
        "promo": {
            # promo type -> list of week numbers where active (using Week 2..27 numbering)
            "Demo":     [5, 6],
            "End Cap":  [],
            "Fence":    [],
            "TPD":      [5, 6],
            "Markdown": [],
            "Advert":   [],
        },
        # week_num -> lift multiplier vs base demand
        "lift_overrides": {5: 3.0, 6: 3.0},
        "justification": (
            "Two national demo weekends combined with a TPD price promo. "
            "Demo lifts unit velocity ~3x in-week (Costco benchmark for "
            "supplements). No end cap booked, no markdown needed."
        ),
    },
    {
        "key": "IDEAL",
        "name": "IDEAL – x2 Demo + End Cap (Wks 5-6) + TPD",
        "color": LIGHT_BLUE,
        "promo": {
            "Demo":     [5, 6],
            "End Cap":  [5, 6],
            "Fence":    [],
            "TPD":      [5, 6],
            "Markdown": [],
            "Advert":   [],
        },
        "lift_overrides": {5: 3.6, 6: 3.6},
        "justification": (
            "Full-court press: demo + end cap + TPD all running together for "
            "two weeks. Stacking end cap on demo weeks lifts velocity to "
            "~3.6x (incremental ~20% on top of demo-only)."
        ),
    },
    {
        "key": "WORST",
        "name": "WORST – Demo+EndCap+TPD then Markdown (Wks 18-20)",
        "color": RED,
        "promo": {
            "Demo":     [5, 6],
            "End Cap":  [5, 6],
            "Fence":    [],
            "TPD":      [5, 6],
            "Markdown": [18, 19, 20],
            "Advert":   [],
        },
        "lift_overrides": {5: 3.0, 6: 3.0, 18: 1.0, 19: 0.3, 20: 8.7},
        "justification": (
            "Same launch plan as IDEAL but sell-through stalls after the "
            "promo weeks. Residual inventory is cleared via three weeks of "
            "50% markdown (Wks 18-20). Wk 20 spike reflects clearance "
            "blow-out (~2,400 units in one week)."
        ),
    },
]

PROMO_TYPES = ["Demo", "End Cap", "Fence", "TPD", "Markdown", "Advert"]

# --- Workbook -----------------------------------------------------------------
wb = openpyxl.Workbook()
wb.remove(wb.active)

# =============================================================================
# 1. README SHEET
# =============================================================================
readme = wb.create_sheet("README")
readme.sheet_view.showGridLines = False

readme.column_dimensions["A"].width = 4
readme.column_dimensions["B"].width = 110

readme.merge_cells("B2:B2")
readme["B2"] = "Costco UK – Bee Propolis Spray 30ml x 2 Pack"
readme["B2"].font = Font(name="Calibri", size=20, bold=True, color=NAVY)

readme["B3"] = "Market Test ROI Model – v2.0"
readme["B3"].font = Font(name="Calibri", size=12, italic=True, color=DARK_GREY)

readme["B5"] = "HOW TO USE THIS MODEL"
readme["B5"].font = Font(name="Calibri", size=13, bold=True, color=WHITE)
readme["B5"].fill = fill_section
readme["B5"].alignment = left

instructions = [
    "",
    "1.  Open the 'Inputs' sheet. Only the YELLOW cells are editable – everything else is calculated.",
    "",
    "2.  Inputs are grouped into four blocks:",
    "      •  Product & Distribution – test horizon and number of warehouses.",
    "      •  Pricing & Cost – selling price, landed cost (gross margin recalculates automatically).",
    "      •  Base Demand – organic units sold per warehouse per week with no promo support.",
    "      •  Promo Economics – cost per warehouse for Demo / End Cap / Fence / Advertising, "
    "plus the TPD and Markdown discount %.",
    "",
    "3.  Each of the three scenarios (BEST / IDEAL / WORST) has its own activity grid on the Inputs sheet. "
    "For every week, tick (1) or leave blank (0) for each promo lever, and set the demand lift multiplier. "
    "Base demand is multiplied by the lift to get that week's units.",
    "",
    "4.  The 'Forecast' sheet shows the week-by-week P&L for each scenario, fully driven off Inputs. "
    "Do not edit this sheet – it will rebuild itself when Inputs change.",
    "",
    "5.  The 'Summary' sheet rolls everything up into the six numbers leadership cares about: "
    "Revenue, Gross Profit, Gross Margin %, Promo Spend, Net Profit, and ROI on Promo Spend.",
    "",
    "",
]

readme["B6"] = "INSTRUCTIONS"
readme["B6"].font = f_subhead

row = 7
for line in instructions:
    readme.cell(row=row, column=2, value=line).alignment = top_wrap
    row += 1

readme.cell(row=row, column=2, value="KEY CONCEPTS").font = f_subhead
row += 1
concepts = [
    ("Base Demand", "Organic Costco velocity with no promo support. Derived from the prior 30ml SKU run-rate: "
     "~500 units of life-time sales across 29 weeks of a similar test, scaled to 20 warehouses. "
     "Equivalent to ~13.8 units / warehouse / week."),
    ("Lift Multiplier", "How much faster the SKU sells in a given week with promo support. 1.0x = base, "
     "3.0x = demo, 3.6x = demo + end cap, 8.0x+ = clearance markdown."),
    ("TPD (Temporary Price Discount)", "Standard Costco mechanic: 20% off MSRP. Because Costco takes a "
     "20% retail margin, a 20% MSRP discount is equivalent to a 25% reduction on the net price the brand "
     "receives. Modelled as a per-unit deduction on TPD weeks."),
    ("Demo Cost", "£199 / warehouse / weekend (Costco standard), grossed up by 1.86x for staffing & "
     "POS materials. Total = £199 × WHs × 1.86."),
    ("End Cap Cost", "£850 / warehouse / 2-week cycle, same 1.86x cost factor. Per-week cost is half."),
    ("Markdown Cost", "Clearance price reduction modelled as % of revenue in the weeks markdown is active."),
    ("ROI on Promo Spend", "Net Profit ÷ Promo Spend. Tells you what every £1 of promo investment "
     "returned. Negative = the promo plan destroyed value."),
]
for label, desc in concepts:
    readme.cell(row=row, column=2, value=f"•  {label} — {desc}").alignment = top_wrap
    readme.row_dimensions[row].height = 38
    row += 1

row += 1
readme.cell(row=row, column=2, value="COLOUR KEY").font = f_subhead
row += 1
key_legend = [
    ("Yellow", YELLOW, "Editable input – change me"),
    ("Grey",   GREY,   "Calculated – do not edit"),
    ("Light Blue", LIGHT_BLUE, "Summary KPI"),
]
for label, color, desc in key_legend:
    c = readme.cell(row=row, column=2, value=f"   {label}: {desc}")
    c.fill = PatternFill("solid", fgColor=color)
    c.alignment = left
    row += 1


# =============================================================================
# 2. INPUTS SHEET
# =============================================================================
inp = wb.create_sheet("Inputs")
inp.sheet_view.showGridLines = False

# Column widths
inp.column_dimensions["A"].width = 2
inp.column_dimensions["B"].width = 38
inp.column_dimensions["C"].width = 16
inp.column_dimensions["D"].width = 4
inp.column_dimensions["E"].width = 70

# Title row
inp.merge_cells("B2:E2")
t = inp["B2"]
t.value = "INPUTS & ASSUMPTIONS — change yellow cells only"
t.font = f_title
t.fill = fill_title
t.alignment = center
inp.row_dimensions[2].height = 32


def section_header(ws, row, text, span=("B", "E")):
    ws.merge_cells(f"{span[0]}{row}:{span[1]}{row}")
    c = ws[f"{span[0]}{row}"]
    c.value = text
    c.font = f_section
    c.fill = fill_section
    c.alignment = left
    ws.row_dimensions[row].height = 22


def input_row(ws, row, label, value, note, fmt=None, formula=False):
    ws.cell(row=row, column=2, value=label).font = f_label
    ws.cell(row=row, column=2).alignment = left
    vc = ws.cell(row=row, column=3, value=value)
    if formula:
        vc.font = f_calc
        vc.fill = fill_calc
    else:
        vc.font = f_input
        vc.fill = fill_input
    vc.alignment = right
    vc.border = box
    if fmt:
        vc.number_format = fmt
    nc = ws.cell(row=row, column=5, value=note)
    nc.font = f_note
    nc.alignment = top_wrap
    ws.row_dimensions[row].height = 28
    return vc


# --- Section 1: Product & Distribution ---------------------------------------
section_header(inp, 4, "1.  Product & Distribution")
input_row(inp, 5, "SKU", "Bee Propolis Spray 30ml x 2",
          "Costco UK market test SKU.")
input_row(inp, 6, "Test Warehouses", 20,
          "Number of Costco UK warehouses included in the market test.", FMT_INT)
input_row(inp, 7, "Test Period (Weeks)", WEEKS,
          f"Forecast horizon. Model is built for {WEEKS} weeks (Week {FIRST_WEEK_NUM} through Week {FIRST_WEEK_NUM+WEEKS-1}).", FMT_INT)

# Named references
WH_CELL = "Inputs!$C$6"
PERIOD_CELL = "Inputs!$C$7"

# --- Section 2: Pricing & Cost ------------------------------------------------
section_header(inp, 9, "2.  Pricing & Cost (per unit, £)")
input_row(inp, 10, "Selling Price (MSRP)", 15.99, "Retail price to member per 30ml x 2 pack.", FMT_GBP_DEC)
input_row(inp, 11, "Cost Price (landed)", 7.29, "Brand's cost to Costco delivered to depot.", FMT_GBP_DEC)
input_row(inp, 12, "Gross Margin per unit", "=C10-C11",
          "Calculated. Selling price less landed cost.", FMT_GBP_DEC, formula=True)
input_row(inp, 13, "Gross Margin %", "=IFERROR((C10-C11)/C10,0)",
          "Calculated. Healthy supplements benchmark is 45-60%.", FMT_PCT, formula=True)

PRICE_CELL = "Inputs!$C$10"
COST_CELL = "Inputs!$C$11"

# --- Section 3: Base Demand ---------------------------------------------------
section_header(inp, 15, "3.  Base Demand (no promo support)")
input_row(inp, 16, "Units / Warehouse / Week", 13.79,
          "Equivalent to the original assumption '500 × 0.8 / 29' from the prior 30ml SKU test "
          "(500 lifetime units × 80% sell-through over a 29-week reference window).",
          FMT_INT)
input_row(inp, 17, "Base Units / Week (all warehouses)", f"=C16*{WH_CELL.split('!')[1]}",
          "Calculated. Per-warehouse rate × number of warehouses.", FMT_INT, formula=True)

BASE_UNITS_CELL = "Inputs!$C$17"

# --- Section 4: Promo Economics ----------------------------------------------
section_header(inp, 19, "4.  Promo Economics")
input_row(inp, 20, "Demo £ / warehouse / week", 199,
          "Costco UK standard demo rate per warehouse per weekend.", FMT_GBP)
input_row(inp, 21, "Demo cost factor (overhead × staffing)", 1.86,
          "Multiplier on raw demo fee to capture staffing, POS print & overhead.", FMT_MULT)
input_row(inp, 22, "Demo Total £ / week", f"=C20*{WH_CELL.split('!')[1]}*C21",
          "Calculated. Demo rate × warehouses × cost factor.", FMT_GBP, formula=True)
input_row(inp, 23, "End Cap £ / warehouse / 2-week cycle", 850,
          "Costco UK standard end cap rental per warehouse for a 2-week placement.", FMT_GBP)
input_row(inp, 24, "End Cap cost factor", 1.86,
          "Same overhead multiplier as demo.", FMT_MULT)
input_row(inp, 25, "End Cap Total £ / week", f"=C23*{WH_CELL.split('!')[1]}*C24/2",
          "Calculated. Rate × warehouses × factor ÷ 2 (booked over 2 weeks).", FMT_GBP, formula=True)
input_row(inp, 26, "Fence £ / week (when active)", 0,
          "Optional fence display. Currently not budgeted.", FMT_GBP)
input_row(inp, 27, "Advertising £ / week (when active)", 0,
          "External media / coupon insert support. Currently not budgeted.", FMT_GBP)
input_row(inp, 28, "TPD discount %", 0.25,
          "Standard TPD: 20% off MSRP. Grossed up by 0.8 retail margin → 25% deduction on net.", FMT_PCT)
input_row(inp, 29, "Markdown discount %", 0.50,
          "Clearance pricing in worst-case markdown weeks.", FMT_PCT)

DEMO_COST = "Inputs!$C$22"
ENDCAP_COST = "Inputs!$C$25"
FENCE_COST = "Inputs!$C$26"
AD_COST = "Inputs!$C$27"
TPD_PCT = "Inputs!$C$28"
MD_PCT = "Inputs!$C$29"

# --- Section 5: Scenario activity grids --------------------------------------
section_header(inp, 31, "5.  Scenario Activity & Demand Lift "
                       "(1 = promo active that week, 0 = off; Lift = demand multiplier vs base)")

# We need a grid for each scenario:
#   Row [scenario_top]   : scenario name (merged) + Justification
#   Row [scenario_top+1] : column headers (Week label)  - F (Demo) through F+25
#   Rows for each promo type + Lift
#
# Layout columns: B = label, F..AE = week 2..27 (26 cols)
WEEK_START_COL = 6   # column F
WEEK_END_COL = WEEK_START_COL + WEEKS - 1  # column AE

# Set widths for week columns
for col in range(WEEK_START_COL, WEEK_END_COL + 1):
    inp.column_dimensions[get_column_letter(col)].width = 7

scenario_grid_start = {}  # key -> top row of grid

current_row = 33
for sc in SCENARIOS:
    # Scenario title bar (full width)
    end_col_letter = get_column_letter(WEEK_END_COL)
    inp.merge_cells(start_row=current_row, start_column=2,
                    end_row=current_row, end_column=WEEK_END_COL)
    title_cell = inp.cell(row=current_row, column=2, value=sc["name"])
    title_cell.font = Font(name="Calibri", size=12, bold=True, color=WHITE)
    title_cell.fill = PatternFill("solid", fgColor=NAVY)
    title_cell.alignment = left
    inp.row_dimensions[current_row].height = 22
    current_row += 1

    # Justification line
    inp.merge_cells(start_row=current_row, start_column=2,
                    end_row=current_row, end_column=WEEK_END_COL)
    j_cell = inp.cell(row=current_row, column=2, value=f"Rationale: {sc['justification']}")
    j_cell.font = f_note
    j_cell.alignment = top_wrap
    inp.row_dimensions[current_row].height = 32
    current_row += 1

    # Week-number header row
    inp.cell(row=current_row, column=2, value="Week").font = f_label
    inp.cell(row=current_row, column=2).fill = fill_calc
    inp.cell(row=current_row, column=2).alignment = left
    for i in range(WEEKS):
        c = inp.cell(row=current_row, column=WEEK_START_COL + i, value=f"W{FIRST_WEEK_NUM + i}")
        c.font = Font(name="Calibri", size=10, bold=True, color=WHITE)
        c.fill = PatternFill("solid", fgColor=BLUE)
        c.alignment = center
        c.border = box
    current_row += 1

    scenario_grid_start[sc["key"]] = current_row

    # Promo activity rows
    for promo in PROMO_TYPES:
        inp.cell(row=current_row, column=2, value=promo).font = f_label
        active_weeks = set(sc["promo"].get(promo, []))
        for i in range(WEEKS):
            wknum = FIRST_WEEK_NUM + i
            val = 1 if wknum in active_weeks else 0
            c = inp.cell(row=current_row, column=WEEK_START_COL + i, value=val)
            c.fill = fill_input
            c.font = f_input
            c.alignment = center
            c.border = box
            c.number_format = "0;;;@"
        current_row += 1

    # Lift multiplier row
    inp.cell(row=current_row, column=2, value="Lift Multiplier (x base)").font = f_label
    for i in range(WEEKS):
        wknum = FIRST_WEEK_NUM + i
        val = sc["lift_overrides"].get(wknum, 1.0)
        c = inp.cell(row=current_row, column=WEEK_START_COL + i, value=val)
        c.fill = fill_input
        c.font = f_input
        c.alignment = center
        c.border = box
        c.number_format = FMT_MULT
    current_row += 1

    # Gap row
    current_row += 1

# Freeze panes on Inputs so users keep labels visible while scrolling
inp.freeze_panes = "F3"


# =============================================================================
# 3. FORECAST SHEET
# =============================================================================
fc = wb.create_sheet("Forecast")
fc.sheet_view.showGridLines = False

fc.column_dimensions["A"].width = 2
fc.column_dimensions["B"].width = 32
for col in range(WEEK_START_COL, WEEK_END_COL + 1):
    fc.column_dimensions[get_column_letter(col)].width = 11
TOTAL_COL = WEEK_END_COL + 1  # column after the last week
fc.column_dimensions[get_column_letter(TOTAL_COL)].width = 14

# Title
fc.merge_cells(start_row=2, start_column=2, end_row=2, end_column=TOTAL_COL)
t = fc.cell(row=2, column=2, value="FORECAST — Weekly P&L (all values calculated, do not edit)")
t.font = f_title
t.fill = fill_title
t.alignment = center
fc.row_dimensions[2].height = 32

# Build P&L for each scenario
PNL_ROWS = [
    ("POS Units",             "units"),
    ("Selling Price",         "price"),
    ("Revenue",               "rev"),
    ("Cost Price",            "cost"),
    ("Raw COGS",              "cogs"),
    ("— Demo Spend",          "demo"),
    ("— End Cap Spend",       "endcap"),
    ("— Fence Spend",         "fence"),
    ("— TPD Spend",           "tpd"),
    ("— Markdown Spend",      "markdown"),
    ("— Advertising Spend",   "advert"),
    ("Total Promo Spend",     "promo_total"),
    ("Gross Profit",          "gp"),
    ("Net Profit (after promo)", "net"),
]

# row in scenario_grid_start[key] is the first promo row (Demo). Subsequent rows
# follow the PROMO_TYPES order, then a Lift row.
PROMO_ROW_OFFSET = {p: i for i, p in enumerate(PROMO_TYPES)}
LIFT_OFFSET = len(PROMO_TYPES)

fc_row = 4
scenario_summary_rows = {}  # key -> dict of row indices for Summary sheet

for sc in SCENARIOS:
    # Scenario header
    fc.merge_cells(start_row=fc_row, start_column=2, end_row=fc_row, end_column=TOTAL_COL)
    h = fc.cell(row=fc_row, column=2, value=sc["name"])
    h.font = Font(name="Calibri", size=12, bold=True, color=WHITE)
    h.fill = PatternFill("solid", fgColor=NAVY)
    h.alignment = left
    fc.row_dimensions[fc_row].height = 22
    fc_row += 1

    # Week header row
    fc.cell(row=fc_row, column=2, value="Week").font = f_label
    for i in range(WEEKS):
        c = fc.cell(row=fc_row, column=WEEK_START_COL + i, value=f"W{FIRST_WEEK_NUM + i}")
        c.font = Font(name="Calibri", size=10, bold=True, color=WHITE)
        c.fill = PatternFill("solid", fgColor=BLUE)
        c.alignment = center
        c.border = box
    tc = fc.cell(row=fc_row, column=TOTAL_COL, value="TOTAL")
    tc.font = Font(name="Calibri", size=10, bold=True, color=WHITE)
    tc.fill = PatternFill("solid", fgColor=NAVY)
    tc.alignment = center
    tc.border = box
    fc_row += 1

    # Capture the row positions for this scenario's P&L lines
    scenario_pnl_rows = {}
    grid_top = scenario_grid_start[sc["key"]]
    promo_rows_on_inp = {p: grid_top + PROMO_ROW_OFFSET[p] for p in PROMO_TYPES}
    lift_row_on_inp = grid_top + LIFT_OFFSET

    for label, key in PNL_ROWS:
        scenario_pnl_rows[key] = fc_row
        lbl_cell = fc.cell(row=fc_row, column=2, value=label)
        lbl_cell.font = f_label if key in ("net", "gp", "promo_total", "units", "rev") else f_calc
        lbl_cell.alignment = left
        if key in ("net", "gp"):
            lbl_cell.font = Font(name="Calibri", size=11, bold=True, color=NAVY)

        for i in range(WEEKS):
            week_col = WEEK_START_COL + i
            wcol_letter = get_column_letter(week_col)

            if key == "units":
                formula = (f"=ROUND({BASE_UNITS_CELL}*Inputs!{wcol_letter}{lift_row_on_inp},0)")
            elif key == "price":
                formula = f"={PRICE_CELL}"
            elif key == "rev":
                formula = (f"={wcol_letter}{scenario_pnl_rows['units']}"
                           f"*{wcol_letter}{scenario_pnl_rows['price']}")
            elif key == "cost":
                formula = f"={COST_CELL}"
            elif key == "cogs":
                formula = (f"={wcol_letter}{scenario_pnl_rows['units']}"
                           f"*{wcol_letter}{scenario_pnl_rows['cost']}")
            elif key == "demo":
                formula = f"=Inputs!{wcol_letter}{promo_rows_on_inp['Demo']}*{DEMO_COST}"
            elif key == "endcap":
                formula = f"=Inputs!{wcol_letter}{promo_rows_on_inp['End Cap']}*{ENDCAP_COST}"
            elif key == "fence":
                formula = f"=Inputs!{wcol_letter}{promo_rows_on_inp['Fence']}*{FENCE_COST}"
            elif key == "tpd":
                # TPD = active flag × units × selling price × tpd%
                formula = (f"=Inputs!{wcol_letter}{promo_rows_on_inp['TPD']}"
                           f"*{wcol_letter}{scenario_pnl_rows['units']}"
                           f"*{wcol_letter}{scenario_pnl_rows['price']}*{TPD_PCT}")
            elif key == "markdown":
                formula = (f"=Inputs!{wcol_letter}{promo_rows_on_inp['Markdown']}"
                           f"*{wcol_letter}{scenario_pnl_rows['units']}"
                           f"*{wcol_letter}{scenario_pnl_rows['price']}*{MD_PCT}")
            elif key == "advert":
                formula = f"=Inputs!{wcol_letter}{promo_rows_on_inp['Advert']}*{AD_COST}"
            elif key == "promo_total":
                formula = (f"=SUM({wcol_letter}{scenario_pnl_rows['demo']}:"
                           f"{wcol_letter}{scenario_pnl_rows['advert']})")
            elif key == "gp":
                formula = (f"={wcol_letter}{scenario_pnl_rows['rev']}"
                           f"-{wcol_letter}{scenario_pnl_rows['cogs']}")
            elif key == "net":
                formula = (f"={wcol_letter}{scenario_pnl_rows['gp']}"
                           f"-{wcol_letter}{scenario_pnl_rows['promo_total']}")
            else:
                formula = ""

            c = fc.cell(row=fc_row, column=week_col, value=formula)
            c.font = f_calc
            c.alignment = right
            c.fill = fill_calc
            c.border = box
            if key == "units":
                c.number_format = FMT_INT
            elif key in ("price", "cost"):
                c.number_format = FMT_GBP_DEC
            else:
                c.number_format = FMT_GBP

        # Total column
        total_letter = get_column_letter(TOTAL_COL)
        first_w = get_column_letter(WEEK_START_COL)
        last_w = get_column_letter(WEEK_END_COL)
        if key in ("price", "cost"):
            total_formula = f"={PRICE_CELL}" if key == "price" else f"={COST_CELL}"
        else:
            total_formula = f"=SUM({first_w}{fc_row}:{last_w}{fc_row})"
        tc = fc.cell(row=fc_row, column=TOTAL_COL, value=total_formula)
        tc.font = Font(name="Calibri", size=11, bold=True, color=NAVY)
        tc.fill = PatternFill("solid", fgColor=LIGHT_BLUE)
        tc.alignment = right
        tc.border = box
        if key == "units":
            tc.number_format = FMT_INT
        elif key in ("price", "cost"):
            tc.number_format = FMT_GBP_DEC
        else:
            tc.number_format = FMT_GBP

        fc_row += 1

    # Save references for Summary
    scenario_summary_rows[sc["key"]] = scenario_pnl_rows

    # Spacer rows
    fc_row += 2

fc.freeze_panes = "C4"


# =============================================================================
# 4. SUMMARY SHEET
# =============================================================================
sm = wb.create_sheet("Summary")
sm.sheet_view.showGridLines = False

# Column widths
sm.column_dimensions["A"].width = 2
sm.column_dimensions["B"].width = 36
for i, _ in enumerate(SCENARIOS):
    sm.column_dimensions[get_column_letter(3 + i)].width = 22

# Title
end_col = 2 + len(SCENARIOS)
sm.merge_cells(start_row=2, start_column=2, end_row=2, end_column=end_col)
t = sm.cell(row=2, column=2, value="ROI SUMMARY — Scenario Comparison")
t.font = f_title
t.fill = fill_title
t.alignment = center
sm.row_dimensions[2].height = 32

# Header row with scenario names
hr = 4
sm.cell(row=hr, column=2, value="Metric").font = Font(name="Calibri", size=11, bold=True, color=WHITE)
sm.cell(row=hr, column=2).fill = fill_section
sm.cell(row=hr, column=2).alignment = left
for i, sc in enumerate(SCENARIOS):
    col = 3 + i
    c = sm.cell(row=hr, column=col, value=sc["key"])
    c.font = Font(name="Calibri", size=11, bold=True, color=WHITE)
    c.fill = fill_section
    c.alignment = center
sm.row_dimensions[hr].height = 24

# KPI rows
TOTAL_COL_LETTER = get_column_letter(TOTAL_COL)
kpi_rows = [
    ("Units Sold",          "units",       FMT_INT,    False),
    ("Revenue",             "rev",         FMT_GBP,    False),
    ("Raw COGS",            "cogs",        FMT_GBP,    False),
    ("Gross Profit",        "gp",          FMT_GBP,    True),
    ("Gross Margin %",      "gp_pct",      FMT_PCT,    True),
    ("Demo Spend",          "demo",        FMT_GBP,    False),
    ("End Cap Spend",       "endcap",      FMT_GBP,    False),
    ("Fence Spend",         "fence",       FMT_GBP,    False),
    ("TPD Spend",           "tpd",         FMT_GBP,    False),
    ("Markdown Spend",      "markdown",    FMT_GBP,    False),
    ("Advertising Spend",   "advert",      FMT_GBP,    False),
    ("Total Promo Spend",   "promo_total", FMT_GBP,    True),
    ("Net Profit",          "net",         FMT_GBP,    True),
    ("Net Margin %",        "net_pct",     FMT_PCT,    True),
    ("ROI on Promo Spend",  "roi",         FMT_PCT,    True),
    ("Avg Units / WH / Week", "uphpw",     FMT_INT,    False),
]

sr = hr + 1
for label, key, fmt, bold in kpi_rows:
    lc = sm.cell(row=sr, column=2, value=label)
    lc.font = Font(name="Calibri", size=11, bold=bold, color=NAVY if bold else "000000")
    lc.alignment = left
    lc.fill = fill_kpi if bold else fill_white
    lc.border = box

    for i, sc in enumerate(SCENARIOS):
        col = 3 + i
        rows = scenario_summary_rows[sc["key"]]
        if key in rows:
            formula = f"=Forecast!{TOTAL_COL_LETTER}{rows[key]}"
        elif key == "gp_pct":
            formula = (f"=IFERROR(Forecast!{TOTAL_COL_LETTER}{rows['gp']}"
                       f"/Forecast!{TOTAL_COL_LETTER}{rows['rev']},0)")
        elif key == "net_pct":
            formula = (f"=IFERROR(Forecast!{TOTAL_COL_LETTER}{rows['net']}"
                       f"/Forecast!{TOTAL_COL_LETTER}{rows['rev']},0)")
        elif key == "roi":
            formula = (f"=IFERROR(Forecast!{TOTAL_COL_LETTER}{rows['net']}"
                       f"/Forecast!{TOTAL_COL_LETTER}{rows['promo_total']},0)")
        elif key == "uphpw":
            formula = (f"=IFERROR(Forecast!{TOTAL_COL_LETTER}{rows['units']}"
                       f"/{WH_CELL}/{PERIOD_CELL},0)")
        else:
            formula = ""

        c = sm.cell(row=sr, column=col, value=formula)
        c.font = f_kpi_val if bold else f_calc
        c.alignment = right
        c.fill = fill_kpi if bold else fill_white
        c.border = box
        c.number_format = fmt

    sm.row_dimensions[sr].height = 22 if not bold else 26
    sr += 1

# Conditional formatting on Net Profit and ROI rows (color positive green, negative red)
net_row = hr + 1 + [k[1] for k in kpi_rows].index("net")
roi_row = hr + 1 + [k[1] for k in kpi_rows].index("roi")
last_col_letter = get_column_letter(2 + len(SCENARIOS))
for r in (net_row, roi_row):
    rng = f"C{r}:{last_col_letter}{r}"
    sm.conditional_formatting.add(rng,
        CellIsRule(operator="lessThan", formula=["0"],
                   fill=PatternFill("solid", fgColor=RED),
                   font=Font(bold=True, color="9C0006")))
    sm.conditional_formatting.add(rng,
        CellIsRule(operator="greaterThanOrEqual", formula=["0"],
                   fill=PatternFill("solid", fgColor=GREEN),
                   font=Font(bold=True, color="006100")))

# Justification block
sr += 2
sm.merge_cells(start_row=sr, start_column=2, end_row=sr, end_column=end_col)
h = sm.cell(row=sr, column=2, value="Why each scenario?")
h.font = f_section
h.fill = fill_section
h.alignment = left
sm.row_dimensions[sr].height = 22
sr += 1

for sc in SCENARIOS:
    lc = sm.cell(row=sr, column=2, value=sc["key"])
    lc.font = Font(name="Calibri", size=11, bold=True, color=NAVY)
    lc.alignment = top_wrap
    sm.merge_cells(start_row=sr, start_column=3, end_row=sr, end_column=end_col)
    rc = sm.cell(row=sr, column=3, value=sc["justification"])
    rc.font = f_note
    rc.alignment = top_wrap
    sm.row_dimensions[sr].height = 50
    sr += 1

sm.freeze_panes = "C5"


# =============================================================================
# Save
# =============================================================================
out = "/home/user/my-first-project/Costco_UK_Bee_Propolis_ROI_v2.xlsx"
wb.save(out)
print(f"Saved: {out}")
