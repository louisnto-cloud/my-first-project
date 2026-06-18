"""
Build the enterprise-grade Costco UK Bee Propolis ROI model (v3).

v3 changes vs v2:
  - Weeks renumbered W1..W26 (was W2..W27).
  - New "Test Start Date (Week 1)" input drives a calendar-date sub-header
    on every week header (Inputs grids and Forecast).
  - Every calculated input cell now has an Override (col D) next to it.
    Calc cell uses IF(override blank, formula, override) so users can
    hand-set Gross Margin/unit, GM%, Base Units/Week, Demo Total £/Week,
    End Cap Total £/Week without breaking the model.
"""

import openpyxl
from datetime import date
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import CellIsRule

# --- Styling ------------------------------------------------------------------
NAVY = "1F4E78"
BLUE = "2E75B6"
LIGHT_BLUE = "DDEBF7"
YELLOW = "FFF2CC"
GREY = "F2F2F2"
WHITE = "FFFFFF"
GREEN = "C6EFCE"
RED = "FFC7CE"
DARK_GREY = "595959"

thin = Side(border_style="thin", color="BFBFBF")
medium = Side(border_style="medium", color=NAVY)
box = Border(left=thin, right=thin, top=thin, bottom=thin)

f_title = Font(name="Calibri", size=18, bold=True, color=WHITE)
f_section = Font(name="Calibri", size=12, bold=True, color=WHITE)
f_subhead = Font(name="Calibri", size=11, bold=True, color=NAVY)
f_label = Font(name="Calibri", size=11, bold=True)
f_input = Font(name="Calibri", size=11, color="0070C0", bold=True)
f_calc = Font(name="Calibri", size=11)
f_note = Font(name="Calibri", size=10, italic=True, color=DARK_GREY)
f_kpi_val = Font(name="Calibri", size=14, bold=True, color=NAVY)
f_kpi_label = Font(name="Calibri", size=10, bold=True, color=DARK_GREY)
f_col_hdr = Font(name="Calibri", size=10, bold=True, color=DARK_GREY)

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
FMT_DATE = "dd-mmm"
FMT_DATE_LONG = "dd-mmm-yyyy"

WEEKS = 26
FIRST_WEEK_NUM = 1
DEFAULT_START_DATE = date(2026, 1, 12)  # Monday

SCENARIOS = [
    {
        "key": "BEST",
        "name": "BEST – x2 Demo (Wks 5-6) + TPD",
        "promo": {
            "Demo": [5, 6], "End Cap": [], "Fence": [],
            "TPD": [5, 6], "Markdown": [], "Advert": [],
        },
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
        "promo": {
            "Demo": [5, 6], "End Cap": [5, 6], "Fence": [],
            "TPD": [5, 6], "Markdown": [], "Advert": [],
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
        "promo": {
            "Demo": [5, 6], "End Cap": [5, 6], "Fence": [],
            "TPD": [5, 6], "Markdown": [18, 19, 20], "Advert": [],
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

readme["B2"] = "Costco UK – Bee Propolis Spray 30ml x 2 Pack"
readme["B2"].font = Font(name="Calibri", size=20, bold=True, color=NAVY)
readme["B3"] = "Market Test ROI Model – v3.0"
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
    "      •  Product & Distribution – SKU, Test Start Date (Week 1), warehouses, test horizon.",
    "      •  Pricing & Cost – selling price, landed cost (gross margin recalculates automatically).",
    "      •  Base Demand – organic units sold per warehouse per week with no promo support.",
    "      •  Promo Economics – cost per warehouse for Demo / End Cap / Fence / Advertising, "
    "plus the TPD and Markdown discount %.",
    "",
    "3.  OVERRIDES (column D). Any cell with a yellow 'Override (opt.)' next to it can be hand-set: "
    "leave blank to use the calculated value, or type a number to force a specific value. "
    "This applies to Gross Margin/unit, GM %, Base Units/Week, Demo Total £/Week, and End Cap Total £/Week.",
    "",
    "4.  DATES. Set the 'Test Start Date (Week 1)' on Inputs and every week column on every sheet "
    "shows the week-commencing date automatically. Change one cell, everything updates.",
    "",
    "5.  Each of the three scenarios (BEST / IDEAL / WORST) has its own activity grid on the Inputs sheet. "
    "For every week, tick (1) or leave blank (0) for each promo lever, and set the demand lift multiplier. "
    "Base demand is multiplied by the lift to get that week's units.",
    "",
    "6.  The 'Forecast' sheet shows the week-by-week P&L for each scenario, fully driven off Inputs. "
    "Do not edit this sheet – it will rebuild itself when Inputs change.",
    "",
    "7.  The 'Summary' sheet rolls everything up into the six numbers leadership cares about: "
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
    ("Override (col D)", "Optional manual value next to any calculated cell. Type a number to force the "
     "model to use that figure instead of the formula result. Leave blank to use the formula. "
     "Note: overrides on Gross Margin/unit and GM % are display-only (Forecast uses Selling Price "
     "and Cost Price directly). Overrides on Base Units/Week, Demo Total, and End Cap Total flow into Forecast."),
]
for label, desc in concepts:
    readme.cell(row=row, column=2, value=f"•  {label} — {desc}").alignment = top_wrap
    readme.row_dimensions[row].height = 42
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

inp.column_dimensions["A"].width = 2
inp.column_dimensions["B"].width = 38
inp.column_dimensions["C"].width = 16
inp.column_dimensions["D"].width = 16   # Override column
inp.column_dimensions["E"].width = 70   # Notes

inp.merge_cells("B2:E2")
t = inp["B2"]
t.value = "INPUTS & ASSUMPTIONS — change yellow cells only"
t.font = f_title
t.fill = fill_title
t.alignment = center
inp.row_dimensions[2].height = 32

# Sub-header explaining columns
inp["B3"] = "Field"
inp["C3"] = "Value"
inp["D3"] = "Override (opt.)"
inp["E3"] = "Notes / justification"
for col in ("B3", "C3", "D3", "E3"):
    inp[col].font = f_col_hdr
    inp[col].alignment = left if col == "B3" or col == "E3" else center
    inp[col].fill = fill_calc
    inp[col].border = box


def section_header(ws, row, text, span_start="B", span_end="E"):
    ws.merge_cells(f"{span_start}{row}:{span_end}{row}")
    c = ws[f"{span_start}{row}"]
    c.value = text
    c.font = f_section
    c.fill = fill_section
    c.alignment = left
    ws.row_dimensions[row].height = 22


def input_row(ws, row, label, value, note, fmt=None, is_input=True, override=False):
    """
    is_input=True  : col C is a direct yellow input (no formula, no override col)
    is_input=False : col C is a formula (calc, grey); if override=True, col D
                     is a yellow override input and col C wraps with IF(D="",..,D)
                     -- caller should pass the FORMULA fragment as `value` (no leading =)
    """
    ws.cell(row=row, column=2, value=label).font = f_label
    ws.cell(row=row, column=2).alignment = left

    vc = ws.cell(row=row, column=3)
    if is_input:
        vc.value = value
        vc.font = f_input
        vc.fill = fill_input
    elif override:
        d_letter = get_column_letter(4)
        vc.value = f'=IF({d_letter}{row}="",{value},{d_letter}{row})'
        vc.font = f_calc
        vc.fill = fill_calc
        # Override cell
        oc = ws.cell(row=row, column=4, value=None)
        oc.font = f_input
        oc.fill = fill_input
        oc.alignment = right
        oc.border = box
        if fmt:
            oc.number_format = fmt
    else:
        vc.value = f"={value}"
        vc.font = f_calc
        vc.fill = fill_calc

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
section_header(inp, 5, "1.  Product & Distribution")
input_row(inp, 6, "SKU", "Bee Propolis Spray 30ml x 2",
          "Costco UK market test SKU.", is_input=True)
input_row(inp, 7, "Test Start Date (Week 1)", DEFAULT_START_DATE,
          "Week-commencing date of W1. Every week header on every sheet uses this as the anchor.",
          fmt=FMT_DATE_LONG, is_input=True)
input_row(inp, 8, "Test Warehouses", 20,
          "Number of Costco UK warehouses included in the market test.", fmt=FMT_INT, is_input=True)
input_row(inp, 9, "Test Period (Weeks)", WEEKS,
          f"Forecast horizon. Model is built for {WEEKS} weeks (W1 through W{WEEKS}).",
          fmt=FMT_INT, is_input=True)

START_DATE_CELL = "Inputs!$C$7"
WH_CELL = "Inputs!$C$8"
PERIOD_CELL = "Inputs!$C$9"

# --- Section 2: Pricing & Cost ------------------------------------------------
section_header(inp, 11, "2.  Pricing & Cost (per unit, £)")
input_row(inp, 12, "Selling Price (MSRP)", 15.99,
          "Retail price to member per 30ml x 2 pack.", fmt=FMT_GBP_DEC, is_input=True)
input_row(inp, 13, "Cost Price (landed)", 7.29,
          "Brand's cost to Costco delivered to depot.", fmt=FMT_GBP_DEC, is_input=True)
input_row(inp, 14, "Gross Margin per unit", "C12-C13",
          "Calculated: Selling Price - Cost Price. Override is display-only "
          "(Forecast uses SP and Cost directly).",
          fmt=FMT_GBP_DEC, is_input=False, override=True)
input_row(inp, 15, "Gross Margin %", "IFERROR((C12-C13)/C12,0)",
          "Calculated: GP/SP. Healthy supplements benchmark 45-60%. "
          "Override is display-only.",
          fmt=FMT_PCT, is_input=False, override=True)

PRICE_CELL = "Inputs!$C$12"
COST_CELL = "Inputs!$C$13"

# --- Section 3: Base Demand ---------------------------------------------------
section_header(inp, 17, "3.  Base Demand (no promo support)")
input_row(inp, 18, "Units / Warehouse / Week", 13.79,
          "Equivalent to original '500 × 0.8 / 29' from prior 30ml SKU test "
          "(500 lifetime units × 80% sell-through over a 29-week reference window).",
          fmt="#,##0.00", is_input=True)
input_row(inp, 19, "Base Units / Week (all warehouses)", f"C18*{WH_CELL.split('!')[1]}",
          "Calculated: Per-warehouse rate × number of warehouses. "
          "OVERRIDE to set the all-warehouse weekly base directly (flows into Forecast).",
          fmt=FMT_INT, is_input=False, override=True)

BASE_UNITS_CELL = "Inputs!$C$19"

# --- Section 4: Promo Economics ----------------------------------------------
section_header(inp, 21, "4.  Promo Economics")
input_row(inp, 22, "Demo £ / warehouse / week", 199,
          "Costco UK standard demo rate per warehouse per weekend.", fmt=FMT_GBP, is_input=True)
input_row(inp, 23, "Demo cost factor (overhead × staffing)", 1.86,
          "Multiplier on raw demo fee to capture staffing, POS print & overhead.",
          fmt=FMT_MULT, is_input=True)
input_row(inp, 24, "Demo Total £ / week", f"C22*{WH_CELL.split('!')[1]}*C23",
          "Calculated: rate × warehouses × cost factor. "
          "OVERRIDE to set the all-warehouse demo £/week directly.",
          fmt=FMT_GBP, is_input=False, override=True)
input_row(inp, 25, "End Cap £ / warehouse / 2-week cycle", 850,
          "Costco UK standard end cap rental per warehouse for a 2-week placement.",
          fmt=FMT_GBP, is_input=True)
input_row(inp, 26, "End Cap cost factor", 1.86,
          "Same overhead multiplier as demo.", fmt=FMT_MULT, is_input=True)
input_row(inp, 27, "End Cap Total £ / week", f"C25*{WH_CELL.split('!')[1]}*C26/2",
          "Calculated: rate × warehouses × factor ÷ 2 (booked over 2 weeks). "
          "OVERRIDE to set the all-warehouse end-cap £/week directly.",
          fmt=FMT_GBP, is_input=False, override=True)
input_row(inp, 28, "Fence £ / week (when active)", 0,
          "Optional fence display. Currently not budgeted.", fmt=FMT_GBP, is_input=True)
input_row(inp, 29, "Advertising £ / week (when active)", 0,
          "External media / coupon insert support. Currently not budgeted.",
          fmt=FMT_GBP, is_input=True)
input_row(inp, 30, "TPD discount %", 0.25,
          "Standard TPD: 20% off MSRP. Grossed up by 0.8 retail margin → 25% deduction on net.",
          fmt=FMT_PCT, is_input=True)
input_row(inp, 31, "Markdown discount %", 0.50,
          "Clearance pricing in worst-case markdown weeks.", fmt=FMT_PCT, is_input=True)

DEMO_COST = "Inputs!$C$24"
ENDCAP_COST = "Inputs!$C$27"
FENCE_COST = "Inputs!$C$28"
AD_COST = "Inputs!$C$29"
TPD_PCT = "Inputs!$C$30"
MD_PCT = "Inputs!$C$31"

# --- Section 5: Scenario activity grids --------------------------------------
section_header(inp, 33, "5.  Scenario Activity & Demand Lift "
                       "(1 = promo active, 0 = off; Lift = demand multiplier vs base; Dates auto-fill)")

WEEK_START_COL = 6   # column F (note: column D is Override, E is Notes — week grid starts later)
WEEK_END_COL = WEEK_START_COL + WEEKS - 1  # column AE

for col in range(WEEK_START_COL, WEEK_END_COL + 1):
    inp.column_dimensions[get_column_letter(col)].width = 9

scenario_grid_start = {}
current_row = 35
for sc in SCENARIOS:
    # Title bar
    inp.merge_cells(start_row=current_row, start_column=2,
                    end_row=current_row, end_column=WEEK_END_COL)
    title_cell = inp.cell(row=current_row, column=2, value=sc["name"])
    title_cell.font = Font(name="Calibri", size=12, bold=True, color=WHITE)
    title_cell.fill = PatternFill("solid", fgColor=NAVY)
    title_cell.alignment = left
    inp.row_dimensions[current_row].height = 22
    current_row += 1

    # Justification
    inp.merge_cells(start_row=current_row, start_column=2,
                    end_row=current_row, end_column=WEEK_END_COL)
    j_cell = inp.cell(row=current_row, column=2, value=f"Rationale: {sc['justification']}")
    j_cell.font = f_note
    j_cell.alignment = top_wrap
    inp.row_dimensions[current_row].height = 32
    current_row += 1

    # Week header
    inp.cell(row=current_row, column=2, value="Week").font = f_label
    inp.cell(row=current_row, column=2).fill = fill_calc
    inp.cell(row=current_row, column=2).alignment = left
    for i in range(WEEKS):
        c = inp.cell(row=current_row, column=WEEK_START_COL + i,
                     value=f"W{FIRST_WEEK_NUM + i}")
        c.font = Font(name="Calibri", size=10, bold=True, color=WHITE)
        c.fill = PatternFill("solid", fgColor=BLUE)
        c.alignment = center
        c.border = box
    current_row += 1

    # Date sub-header (calculated from Start Date)
    inp.cell(row=current_row, column=2, value="Wk-commencing").font = f_label
    inp.cell(row=current_row, column=2).fill = fill_calc
    inp.cell(row=current_row, column=2).alignment = left
    for i in range(WEEKS):
        c = inp.cell(row=current_row, column=WEEK_START_COL + i,
                     value=f"={START_DATE_CELL}+7*{i}")
        c.font = Font(name="Calibri", size=9, color=DARK_GREY)
        c.fill = fill_calc
        c.alignment = center
        c.border = box
        c.number_format = FMT_DATE
    current_row += 1

    scenario_grid_start[sc["key"]] = current_row

    # Promo rows
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

    # Lift row
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

    current_row += 1  # gap

inp.freeze_panes = "F5"


# =============================================================================
# 3. FORECAST SHEET
# =============================================================================
fc = wb.create_sheet("Forecast")
fc.sheet_view.showGridLines = False

fc.column_dimensions["A"].width = 2
fc.column_dimensions["B"].width = 32
for col in range(WEEK_START_COL, WEEK_END_COL + 1):
    fc.column_dimensions[get_column_letter(col)].width = 11
TOTAL_COL = WEEK_END_COL + 1
fc.column_dimensions[get_column_letter(TOTAL_COL)].width = 14

fc.merge_cells(start_row=2, start_column=2, end_row=2, end_column=TOTAL_COL)
t = fc.cell(row=2, column=2, value="FORECAST — Weekly P&L (all values calculated, do not edit)")
t.font = f_title
t.fill = fill_title
t.alignment = center
fc.row_dimensions[2].height = 32

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

PROMO_ROW_OFFSET = {p: i for i, p in enumerate(PROMO_TYPES)}
LIFT_OFFSET = len(PROMO_TYPES)

fc_row = 4
scenario_summary_rows = {}

for sc in SCENARIOS:
    # Scenario title
    fc.merge_cells(start_row=fc_row, start_column=2, end_row=fc_row, end_column=TOTAL_COL)
    h = fc.cell(row=fc_row, column=2, value=sc["name"])
    h.font = Font(name="Calibri", size=12, bold=True, color=WHITE)
    h.fill = PatternFill("solid", fgColor=NAVY)
    h.alignment = left
    fc.row_dimensions[fc_row].height = 22
    fc_row += 1

    # Week header
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

    # Date sub-header
    fc.cell(row=fc_row, column=2, value="Wk-commencing").font = f_label
    for i in range(WEEKS):
        c = fc.cell(row=fc_row, column=WEEK_START_COL + i,
                    value=f"={START_DATE_CELL}+7*{i}")
        c.font = Font(name="Calibri", size=9, color=DARK_GREY)
        c.fill = fill_calc
        c.alignment = center
        c.border = box
        c.number_format = FMT_DATE
    # Total col blank date
    fc.cell(row=fc_row, column=TOTAL_COL, value="").fill = fill_calc
    fc_row += 1

    # Body
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
            wcol = get_column_letter(week_col)

            if key == "units":
                formula = f"=ROUND({BASE_UNITS_CELL}*Inputs!{wcol}{lift_row_on_inp},0)"
            elif key == "price":
                formula = f"={PRICE_CELL}"
            elif key == "rev":
                formula = f"={wcol}{scenario_pnl_rows['units']}*{wcol}{scenario_pnl_rows['price']}"
            elif key == "cost":
                formula = f"={COST_CELL}"
            elif key == "cogs":
                formula = f"={wcol}{scenario_pnl_rows['units']}*{wcol}{scenario_pnl_rows['cost']}"
            elif key == "demo":
                formula = f"=Inputs!{wcol}{promo_rows_on_inp['Demo']}*{DEMO_COST}"
            elif key == "endcap":
                formula = f"=Inputs!{wcol}{promo_rows_on_inp['End Cap']}*{ENDCAP_COST}"
            elif key == "fence":
                formula = f"=Inputs!{wcol}{promo_rows_on_inp['Fence']}*{FENCE_COST}"
            elif key == "tpd":
                formula = (f"=Inputs!{wcol}{promo_rows_on_inp['TPD']}"
                           f"*{wcol}{scenario_pnl_rows['units']}"
                           f"*{wcol}{scenario_pnl_rows['price']}*{TPD_PCT}")
            elif key == "markdown":
                formula = (f"=Inputs!{wcol}{promo_rows_on_inp['Markdown']}"
                           f"*{wcol}{scenario_pnl_rows['units']}"
                           f"*{wcol}{scenario_pnl_rows['price']}*{MD_PCT}")
            elif key == "advert":
                formula = f"=Inputs!{wcol}{promo_rows_on_inp['Advert']}*{AD_COST}"
            elif key == "promo_total":
                formula = (f"=SUM({wcol}{scenario_pnl_rows['demo']}:"
                           f"{wcol}{scenario_pnl_rows['advert']})")
            elif key == "gp":
                formula = f"={wcol}{scenario_pnl_rows['rev']}-{wcol}{scenario_pnl_rows['cogs']}"
            elif key == "net":
                formula = f"={wcol}{scenario_pnl_rows['gp']}-{wcol}{scenario_pnl_rows['promo_total']}"
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

    scenario_summary_rows[sc["key"]] = scenario_pnl_rows
    fc_row += 2

fc.freeze_panes = "C4"


# =============================================================================
# 4. SUMMARY SHEET
# =============================================================================
sm = wb.create_sheet("Summary")
sm.sheet_view.showGridLines = False

sm.column_dimensions["A"].width = 2
sm.column_dimensions["B"].width = 36
for i, _ in enumerate(SCENARIOS):
    sm.column_dimensions[get_column_letter(3 + i)].width = 22

end_col = 2 + len(SCENARIOS)
sm.merge_cells(start_row=2, start_column=2, end_row=2, end_column=end_col)
t = sm.cell(row=2, column=2, value="ROI SUMMARY — Scenario Comparison")
t.font = f_title
t.fill = fill_title
t.alignment = center
sm.row_dimensions[2].height = 32

# Test window sub-header (shows date range from Start Date)
sm.merge_cells(start_row=3, start_column=2, end_row=3, end_column=end_col)
sw = sm.cell(row=3, column=2,
             value=f'="Test window: W1 ("&TEXT({START_DATE_CELL},"dd-mmm-yyyy")&")  →  W"&{PERIOD_CELL}&" ("&TEXT({START_DATE_CELL}+7*({PERIOD_CELL}-1),"dd-mmm-yyyy")&")"')
sw.font = Font(name="Calibri", size=11, italic=True, color=DARK_GREY)
sw.alignment = center
sw.fill = fill_calc

hr = 5
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

# Conditional formatting
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

sm.freeze_panes = "C6"


# =============================================================================
out = "/home/user/my-first-project/Costco_UK_Bee_Propolis_ROI_v3.xlsx"
wb.save(out)
print(f"Saved: {out}")
