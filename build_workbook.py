"""Build the MUV Sparkling Electrolyte RTD 13 week launch forecasting workbook.

Constraints from spec:
- No hyphens anywhere in any cell, header, or tab name.
- UNITS_PER_CASE = 24, named range, referenced everywhere.
- Bottom up from Velocity Grid. All outputs are live formulas.
- Round cases at door level, never at total.
- Manually overridden cells visually flag via conditional formatting.
- Cross check: Weekly Forecast unit sum equals Velocity Grid unit sum.
"""

from openpyxl import Workbook
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, NamedStyle
)
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.formatting.rule import (
    CellIsRule, FormulaRule, ColorScaleRule
)
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.chart import LineChart, BarChart, Reference

OUT_PATH = "/home/user/my-first-project/MUV_BC_Launch_Forecast_13wk.xlsx"

# Versioning
VERSION = "2.0.0"
BUILD_DATE = "June 5 2026"
LAUNCH_START_LABEL = "June 1 2026"  # Monday, anchor of W1

# Constants
SKUS = ["Lime Lemon", "Pineapple Passion Fruit", "Raspberry"]
TIERS = ["A", "B", "C"]
REGIONS = ["Lower Mainland", "Vancouver Island", "Interior", "North"]
WEEKS = list(range(1, 14))  # W1..W13

# Calendar dates per week (Monday week start)
from datetime import date, timedelta
_anchor = date(2026, 6, 1)
WEEK_START_DATES = [_anchor + timedelta(weeks=w - 1) for w in WEEKS]
WEEK_END_DATES = [d + timedelta(days=6) for d in WEEK_START_DATES]

# Style palette
HDR_FILL = PatternFill("solid", fgColor="1F3A5F")
HDR_FONT = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
SECTION_FILL = PatternFill("solid", fgColor="DCE6F1")
SECTION_FONT = Font(name="Calibri", size=11, bold=True, color="1F3A5F")
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")
NOTE_FONT = Font(name="Calibri", size=9, italic=True, color="595959")
FORMULA_FONT = Font(name="Calibri", size=10, color="1F3A5F")
WARN_FILL = PatternFill("solid", fgColor="FFC7CE")
OK_FILL = PatternFill("solid", fgColor="C6EFCE")
OVERRIDE_FILL = PatternFill("solid", fgColor="FFE699")
DEFAULT_FONT = Font(name="Calibri", size=10)
TITLE_FONT = Font(name="Calibri", size=14, bold=True, color="1F3A5F")

THIN = Side(border_style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def style_header_row(ws, row, n_cols, start_col=1):
    for c in range(start_col, start_col + n_cols):
        cell = ws.cell(row=row, column=c)
        cell.fill = HDR_FILL
        cell.font = HDR_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER


def style_section(ws, row, col, text):
    cell = ws.cell(row=row, column=col, value=text)
    cell.fill = SECTION_FILL
    cell.font = SECTION_FONT


def title(ws, text):
    ws["A1"] = text
    ws["A1"].font = TITLE_FONT


def set_col_widths(ws, widths):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


# Door placeholder generation
BANNERS = [
    ("Choices Markets", "Choices"),
    ("Nature's Fare Markets", "NatFare"),
    ("Whole Foods Market", "WFM"),
    ("Pomme Natural Market", "Pomme"),
    ("IGA Marketplace", "IGA"),
    ("Save On Foods", "SOF"),
    ("Urban Fare", "Urban"),
    ("Independent Grocer", "Indie"),
    ("Stong's Market", "Stongs"),
    ("Fresh St Market", "FreshSt"),
]
CITIES_BY_REGION = {
    "Lower Mainland": ["Vancouver", "Burnaby", "Richmond", "Surrey", "Coquitlam", "North Vancouver", "West Vancouver", "Langley", "New Westminster"],
    "Vancouver Island": ["Victoria", "Nanaimo", "Courtenay", "Duncan", "Sidney"],
    "Interior": ["Kelowna", "Vernon", "Kamloops", "Penticton", "Nelson"],
    "North": ["Prince George", "Terrace", "Smithers"],
}


def generate_doors(n=100):
    rows = []
    region_cycle = (
        ["Lower Mainland"] * 55
        + ["Vancouver Island"] * 22
        + ["Interior"] * 17
        + ["North"] * 6
    )
    tier_cycle = (["A"] * 22 + ["B"] * 48 + ["C"] * 30)
    for i in range(n):
        door_id = f"D{i+1:03d}"
        banner_full, banner_short = BANNERS[i % len(BANNERS)]
        region = region_cycle[i]
        cities = CITIES_BY_REGION[region]
        city = cities[i % len(cities)]
        tier = tier_cycle[i]
        store_name = f"{banner_short} {city} {(i % 9) + 1:02d}"
        # Flavor authorization heuristic: Tier A all three, Tier B Lime Lemon and Pineapple,
        # Tier C Lime Lemon plus rotation of one of the other two.
        if tier == "A":
            lime, pineapple, raspberry = "Y", "Y", "Y"
        elif tier == "B":
            lime, pineapple, raspberry = "Y", "Y", ("Y" if i % 3 == 0 else "N")
        else:
            lime, pineapple, raspberry = "Y", ("Y" if i % 2 == 0 else "N"), ("Y" if i % 3 == 0 else "N")
        # Launch week: Tier A in week 1, Tier B weeks 1 to 3, Tier C weeks 2 to 5
        if tier == "A":
            launch = 1
        elif tier == "B":
            launch = 1 + (i % 3)
        else:
            launch = 2 + (i % 4)
        rows.append([door_id, banner_full, store_name, city, region, tier, lime, pineapple, raspberry, launch])
    return rows


# Building blocks
def build_inputs(wb):
    ws = wb.create_sheet("Inputs")
    title(ws, "Inputs and assumptions")
    ws["A2"] = "All yellow cells are editable. Source notes in column D."
    ws["A2"].font = NOTE_FONT

    # Case math
    style_section(ws, 4, 1, "Case math")
    ws["A5"] = "Units per case"
    ws["B5"] = 24
    ws["B5"].fill = INPUT_FILL
    ws["B5"].font = Font(bold=True)
    ws["D5"] = "Six four packs per case. Locked structural constant."
    ws["D5"].font = NOTE_FONT
    # Named range
    wb.defined_names["UNITS_PER_CASE"] = DefinedName("UNITS_PER_CASE", attr_text="Inputs!$B$5")

    # Wholesale pricing per SKU per case
    style_section(ws, 7, 1, "Wholesale pricing per case")
    ws["A8"] = "SKU"
    ws["B8"] = "Wholesale per case"
    ws["C8"] = "COGS per case"
    ws["D8"] = "Source note"
    style_header_row(ws, 8, 4)
    wholesale_defaults = {"Lime Lemon": 36.00, "Pineapple Passion Fruit": 36.00, "Raspberry": 36.00}
    cogs_defaults = {"Lime Lemon": 18.50, "Pineapple Passion Fruit": 18.50, "Raspberry": 18.50}
    for i, sku in enumerate(SKUS):
        r = 9 + i
        ws.cell(row=r, column=1, value=sku)
        ws.cell(row=r, column=2, value=wholesale_defaults[sku]).fill = INPUT_FILL
        ws.cell(row=r, column=3, value=cogs_defaults[sku]).fill = INPUT_FILL
        ws.cell(row=r, column=4, value="Louis estimate, to validate with finance.").font = NOTE_FONT
        ws.cell(row=r, column=2).number_format = '"$"#,##0.00'
        ws.cell(row=r, column=3).number_format = '"$"#,##0.00'
    # Named ranges for pricing
    wb.defined_names["SKU_LIST"] = DefinedName("SKU_LIST", attr_text="Inputs!$A$9:$A$11")
    wb.defined_names["WHOLESALE_TABLE"] = DefinedName("WHOLESALE_TABLE", attr_text="Inputs!$B$9:$B$11")
    wb.defined_names["COGS_TABLE"] = DefinedName("COGS_TABLE", attr_text="Inputs!$C$9:$C$11")

    # Bevmax production
    style_section(ws, 13, 1, "Bevmax co manufacturer")
    ws["A14"] = "Lead time in weeks"
    ws["B14"] = 6
    ws["B14"].fill = INPUT_FILL
    ws["D14"] = "Weeks from PO release to delivery. Louis estimate, to validate."
    ws["D14"].font = NOTE_FONT
    ws["A15"] = "Weekly run capacity in cases"
    ws["B15"] = 2500
    ws["B15"].fill = INPUT_FILL
    ws["D15"] = "Max cases per production week. Louis estimate, to validate."
    ws["D15"].font = NOTE_FONT
    wb.defined_names["BEVMAX_LEAD"] = DefinedName("BEVMAX_LEAD", attr_text="Inputs!$B$14")
    wb.defined_names["BEVMAX_CAP"] = DefinedName("BEVMAX_CAP", attr_text="Inputs!$B$15")

    # Default velocity table by tier x SKU (units per week at steady state)
    style_section(ws, 17, 1, "Default velocity by tier and SKU, units per week at steady state")
    ws["A18"] = "Tier"
    for j, sku in enumerate(SKUS):
        ws.cell(row=18, column=2 + j, value=sku)
    ws.cell(row=18, column=5, value="Confidence")
    style_header_row(ws, 18, 5)
    velocity_defaults = {
        "A": {"Lime Lemon": 16, "Pineapple Passion Fruit": 14, "Raspberry": 12},
        "B": {"Lime Lemon": 10, "Pineapple Passion Fruit": 8, "Raspberry": 7},
        "C": {"Lime Lemon": 5, "Pineapple Passion Fruit": 4, "Raspberry": 3},
    }
    confidence_defaults = {"A": "Medium", "B": "Low", "C": "Low"}
    for i, tier in enumerate(TIERS):
        r = 19 + i
        ws.cell(row=r, column=1, value=tier)
        for j, sku in enumerate(SKUS):
            c = ws.cell(row=r, column=2 + j, value=velocity_defaults[tier][sku])
            c.fill = INPUT_FILL
        cc = ws.cell(row=r, column=5, value=confidence_defaults[tier])
        cc.fill = INPUT_FILL
    ws["F18"] = "Source: Louis estimate. Validate Tier A with similar functional beverage launches in BC banners. Tier B and C need primary research."
    ws["F18"].font = NOTE_FONT
    dv_conf = DataValidation(type="list", formula1='"High,Medium,Low"', allow_blank=False)
    ws.add_data_validation(dv_conf)
    dv_conf.add("E19:E21")
    wb.defined_names["TIER_LIST"] = DefinedName("TIER_LIST", attr_text="Inputs!$A$19:$A$21")
    wb.defined_names["VELOCITY_TABLE"] = DefinedName("VELOCITY_TABLE", attr_text="Inputs!$B$19:$D$21")

    # Ramp curve
    style_section(ws, 23, 1, "Ramp curve, percent of steady state")
    ws["A24"] = "Week 1"
    ws["A25"] = "Week 2"
    ws["A26"] = "Week 3"
    ws["A27"] = "Week 4 onward"
    for i, val in enumerate([0.40, 0.60, 0.80, 1.00]):
        c = ws.cell(row=24 + i, column=2, value=val)
        c.fill = INPUT_FILL
        c.number_format = "0%"
    ws["D24"] = "Editable. Louis estimate based on launch heuristic."
    ws["D24"].font = NOTE_FONT
    wb.defined_names["RAMP_W1"] = DefinedName("RAMP_W1", attr_text="Inputs!$B$24")
    wb.defined_names["RAMP_W2"] = DefinedName("RAMP_W2", attr_text="Inputs!$B$25")
    wb.defined_names["RAMP_W3"] = DefinedName("RAMP_W3", attr_text="Inputs!$B$26")
    wb.defined_names["RAMP_W4PLUS"] = DefinedName("RAMP_W4PLUS", attr_text="Inputs!$B$27")

    # Online baseline
    style_section(ws, 29, 1, "Online baseline, units per week at steady state")
    ws["A30"] = "SKU"
    ws["B30"] = "Amazon.ca"
    ws["C30"] = "Shopify DTC"
    ws["D30"] = "Source note"
    style_header_row(ws, 30, 4)
    online_defaults = {"Lime Lemon": (160, 80), "Pineapple Passion Fruit": (140, 70), "Raspberry": (120, 60)}
    for i, sku in enumerate(SKUS):
        r = 31 + i
        ws.cell(row=r, column=1, value=sku)
        amz, dtc = online_defaults[sku]
        ws.cell(row=r, column=2, value=amz).fill = INPUT_FILL
        ws.cell(row=r, column=3, value=dtc).fill = INPUT_FILL
        ws.cell(row=r, column=4, value="Placeholder. Louis estimate, to validate with channel managers.").font = NOTE_FONT
    wb.defined_names["ONLINE_AMZ"] = DefinedName("ONLINE_AMZ", attr_text="Inputs!$B$31:$B$33")
    wb.defined_names["ONLINE_DTC"] = DefinedName("ONLINE_DTC", attr_text="Inputs!$C$31:$C$33")

    # Online ramp curve, separate from door ramp
    style_section(ws, 35, 1, "Online ramp curve, percent of steady state")
    ws["A36"] = "Week 1"
    ws["A37"] = "Week 2"
    ws["A38"] = "Week 3"
    ws["A39"] = "Week 4 onward"
    for i, val in enumerate([0.30, 0.55, 0.80, 1.00]):
        c = ws.cell(row=36 + i, column=2, value=val)
        c.fill = INPUT_FILL
        c.number_format = "0%"
    ws["D36"] = "Online tends to ramp slightly slower than retail due to listing optimization and review accumulation."
    ws["D36"].font = NOTE_FONT
    wb.defined_names["ONLINE_RAMP_W1"] = DefinedName("ONLINE_RAMP_W1", attr_text="Inputs!$B$36")
    wb.defined_names["ONLINE_RAMP_W2"] = DefinedName("ONLINE_RAMP_W2", attr_text="Inputs!$B$37")
    wb.defined_names["ONLINE_RAMP_W3"] = DefinedName("ONLINE_RAMP_W3", attr_text="Inputs!$B$38")
    wb.defined_names["ONLINE_RAMP_W4PLUS"] = DefinedName("ONLINE_RAMP_W4PLUS", attr_text="Inputs!$B$39")

    # Operations economics
    style_section(ws, 41, 1, "Operations economics")
    ops = [
        ("Fill rate", 0.97, "0%", "Fraction of forecasted units that actually ship. Reflects production and DC accuracy."),
        ("Freight per case", 1.85, '"$"#,##0.00', "Loaded freight cost from Bevmax DC to retailer DC or DSD route, per case."),
        ("Slotting fee per door, one time", 250.00, '"$"#,##0.00', "One time slotting paid per authorized door. Treated as a launch investment, amortized below."),
        ("Slotting amortization months", 12, "0", "Months over which slotting is amortized. The launch quarter absorbs only its share."),
        ("Launch window months", 3, "0", "Months in the launch window. June through August is 3."),
        ("Distributor margin percent", 0.00, "0%", "Distributor markup if shipping through third party. Set zero for direct shipment to retailer. Default zero assumes direct."),
        ("Bevmax MOQ in cases", 500, "#,##0", "Minimum order quantity per production run. PO releases below MOQ flag in Production Calendar."),
        ("Safety stock weeks", 1, "0", "Number of weeks of forward demand to keep at the DC."),
    ]
    for i, (label, val, fmt, note) in enumerate(ops):
        r = 42 + i
        ws.cell(row=r, column=1, value=label)
        c = ws.cell(row=r, column=2, value=val)
        c.fill = INPUT_FILL
        c.number_format = fmt
        ws.cell(row=r, column=4, value=note).font = NOTE_FONT
    wb.defined_names["FILL_RATE"] = DefinedName("FILL_RATE", attr_text="Inputs!$B$42")
    wb.defined_names["FREIGHT_PER_CASE"] = DefinedName("FREIGHT_PER_CASE", attr_text="Inputs!$B$43")
    wb.defined_names["SLOTTING_PER_DOOR"] = DefinedName("SLOTTING_PER_DOOR", attr_text="Inputs!$B$44")
    wb.defined_names["SLOTTING_AMORT_MONTHS"] = DefinedName("SLOTTING_AMORT_MONTHS", attr_text="Inputs!$B$45")
    wb.defined_names["LAUNCH_MONTHS"] = DefinedName("LAUNCH_MONTHS", attr_text="Inputs!$B$46")
    wb.defined_names["DIST_MARGIN_PCT"] = DefinedName("DIST_MARGIN_PCT", attr_text="Inputs!$B$47")
    wb.defined_names["BEVMAX_MOQ"] = DefinedName("BEVMAX_MOQ", attr_text="Inputs!$B$48")
    wb.defined_names["SAFETY_STOCK_WEEKS"] = DefinedName("SAFETY_STOCK_WEEKS", attr_text="Inputs!$B$49")

    # Targets for dashboard rollup. Placeholders reconciled to the Base model output.
    style_section(ws, 51, 1, "13 week targets, editable placeholders")
    targets = [
        ("Target total cases", 3200, "#,##0", "Placeholder near Base model output. Replace with the CEO ask."),
        ("Target gross revenue", 115000, '"$"#,##0', "Placeholder near Base model output at current wholesale."),
        ("Target net margin percent", 0.10, "0%", "Net contribution margin floor after amortized slotting. Placeholder."),
    ]
    for i, (label, val, fmt, note) in enumerate(targets):
        r = 52 + i
        ws.cell(row=r, column=1, value=label)
        c = ws.cell(row=r, column=2, value=val)
        c.fill = INPUT_FILL
        c.number_format = fmt
        ws.cell(row=r, column=4, value=note).font = NOTE_FONT
    wb.defined_names["TARGET_CASES"] = DefinedName("TARGET_CASES", attr_text="Inputs!$B$52")
    wb.defined_names["TARGET_REVENUE"] = DefinedName("TARGET_REVENUE", attr_text="Inputs!$B$53")
    wb.defined_names["TARGET_MARGIN_PCT"] = DefinedName("TARGET_MARGIN_PCT", attr_text="Inputs!$B$54")

    set_col_widths(ws, [40, 22, 22, 70, 22, 28])
    ws.sheet_view.showGridLines = False
    return ws


def build_doors(wb, doors):
    ws = wb.create_sheet("Doors")
    title(ws, "Door master list")
    ws["A2"] = "Replace placeholder rows with your authoritative door list. Launch Week is the first week a door receives shipment."
    ws["A2"].font = NOTE_FONT

    headers = ["Door ID", "Banner", "Store Name", "City", "Region", "Tier",
               "Lime Lemon Auth", "Pineapple Passion Fruit Auth", "Raspberry Auth", "Launch Week"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for i, row in enumerate(doors):
        for j, val in enumerate(row, start=1):
            cell = ws.cell(row=5 + i, column=j, value=val)
            cell.fill = INPUT_FILL
            cell.font = DEFAULT_FONT
            cell.border = BORDER

    # Data validations
    dv_region = DataValidation(type="list", formula1='"Lower Mainland,Vancouver Island,Interior,North"', allow_blank=False)
    dv_tier = DataValidation(type="list", formula1='"A,B,C"', allow_blank=False)
    dv_yn = DataValidation(type="list", formula1='"Y,N"', allow_blank=False)
    dv_week = DataValidation(type="whole", operator="between", formula1=1, formula2=13, allow_blank=False)
    for dv in [dv_region, dv_tier, dv_yn, dv_week]:
        ws.add_data_validation(dv)
    last = 5 + len(doors) - 1
    dv_region.add(f"E5:E{last}")
    dv_tier.add(f"F5:F{last}")
    dv_yn.add(f"G5:I{last}")
    dv_week.add(f"J5:J{last}")

    # Named range covering door rows for use elsewhere
    wb.defined_names["DOORS_ID"] = DefinedName("DOORS_ID", attr_text=f"Doors!$A$5:$A${last}")
    wb.defined_names["DOORS_BANNER"] = DefinedName("DOORS_BANNER", attr_text=f"Doors!$B$5:$B${last}")
    wb.defined_names["DOORS_NAME"] = DefinedName("DOORS_NAME", attr_text=f"Doors!$C$5:$C${last}")
    wb.defined_names["DOORS_REGION"] = DefinedName("DOORS_REGION", attr_text=f"Doors!$E$5:$E${last}")
    wb.defined_names["DOORS_TIER"] = DefinedName("DOORS_TIER", attr_text=f"Doors!$F$5:$F${last}")
    wb.defined_names["DOORS_LIMELEMON"] = DefinedName("DOORS_LIMELEMON", attr_text=f"Doors!$G$5:$G${last}")
    wb.defined_names["DOORS_PINEAPPLE"] = DefinedName("DOORS_PINEAPPLE", attr_text=f"Doors!$H$5:$H${last}")
    wb.defined_names["DOORS_RASPBERRY"] = DefinedName("DOORS_RASPBERRY", attr_text=f"Doors!$I$5:$I${last}")
    wb.defined_names["DOORS_LAUNCH"] = DefinedName("DOORS_LAUNCH", attr_text=f"Doors!$J$5:$J${last}")

    set_col_widths(ws, [10, 26, 26, 18, 18, 8, 16, 28, 14, 14])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False
    return ws


# Activations rows count
N_ACTIVATION_ROWS = 30


def build_activations(wb):
    ws = wb.create_sheet("Activations")
    title(ws, "Activation calendar")
    ws["A2"] = (
        "One row per event. Door Scope accepts ALL, TIER_A, TIER_B, TIER_C, or a specific Door ID. "
        "SKU Scope accepts ALL, Lime Lemon, Pineapple Passion Fruit, or Raspberry. "
        "Multiple tiers or flavors need multiple rows."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Activation ID", "Type", "Door Scope", "SKU Scope",
               "Start Week", "End Week", "Uplift Multiplier",
               "Post Activation Lift", "Incremental Trial Units", "Cost",
               "Incremental Units Modeled", "Incremental Cases Modeled", "ROI Cases per Dollar"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    # Empty input rows for cols A..J, computed for K..M
    for i in range(N_ACTIVATION_ROWS):
        r = 5 + i
        for j in range(1, 11):
            cell = ws.cell(row=r, column=j)
            cell.fill = INPUT_FILL
            cell.border = BORDER
        ws.cell(row=r, column=7).number_format = "0.00"
        ws.cell(row=r, column=8).number_format = "0%"
        ws.cell(row=r, column=10).number_format = '"$"#,##0.00'

        # Incremental Units Modeled: SUMPRODUCT over door rows where scope matches
        # multiplied by sum of velocity grid units in the active weeks, times (uplift - 1).
        # Plus trial units. Empty rows return zero.
        door_match = (
            f'(($C{r}="ALL")+(($C{r}="TIER_A")*(VG_TIER="A"))'
            f'+(($C{r}="TIER_B")*(VG_TIER="B"))+(($C{r}="TIER_C")*(VG_TIER="C"))'
            f'+($C{r}=VG_DOOR_ID))'
        )
        sku_match = f'(($D{r}="ALL")+($D{r}=VG_SKU))'
        weeks_units = "+".join([
            f'(($E{r}<={w})*($F{r}>={w})*VG_W{w})' for w in WEEKS
        ])
        inc_units = (
            f'=IF($A{r}="",0,'
            f'SUMPRODUCT(SIGN({door_match})*SIGN({sku_match})*({weeks_units}))'
            f'*IFERROR(MAX($G{r}-1,0),0)+IFERROR($I{r},0))'
        )
        ws.cell(row=r, column=11, value=inc_units).number_format = "#,##0"
        ws.cell(row=r, column=12,
                value=f'=IFERROR(ROUNDUP($K{r}/UNITS_PER_CASE,0),0)').number_format = "#,##0"
        ws.cell(row=r, column=13,
                value=f'=IFERROR(IF($J{r}=0,0,$L{r}/$J{r}),0)').number_format = "0.00"

    # Data validations
    dv_type = DataValidation(
        type="list",
        formula1='"in store demo,retailer sampling,influencer drop,paid social burst,retailer feature,festival sampling"',
        allow_blank=True,
    )
    dv_sku_scope = DataValidation(type="list", formula1='"ALL,Lime Lemon,Pineapple Passion Fruit,Raspberry"', allow_blank=True)
    dv_week_range = DataValidation(type="whole", operator="between", formula1=1, formula2=13, allow_blank=True)
    for dv in [dv_type, dv_sku_scope, dv_week_range]:
        ws.add_data_validation(dv)
    last = 5 + N_ACTIVATION_ROWS - 1
    dv_type.add(f"B5:B{last}")
    dv_sku_scope.add(f"D5:D{last}")
    dv_week_range.add(f"E5:F{last}")

    # Named ranges
    wb.defined_names["ACT_ID"] = DefinedName("ACT_ID", attr_text=f"Activations!$A$5:$A${last}")
    wb.defined_names["ACT_TYPE"] = DefinedName("ACT_TYPE", attr_text=f"Activations!$B$5:$B${last}")
    wb.defined_names["ACT_DOOR_SCOPE"] = DefinedName("ACT_DOOR_SCOPE", attr_text=f"Activations!$C$5:$C${last}")
    wb.defined_names["ACT_SKU_SCOPE"] = DefinedName("ACT_SKU_SCOPE", attr_text=f"Activations!$D$5:$D${last}")
    wb.defined_names["ACT_START"] = DefinedName("ACT_START", attr_text=f"Activations!$E$5:$E${last}")
    wb.defined_names["ACT_END"] = DefinedName("ACT_END", attr_text=f"Activations!$F$5:$F${last}")
    wb.defined_names["ACT_UPLIFT"] = DefinedName("ACT_UPLIFT", attr_text=f"Activations!$G$5:$G${last}")
    wb.defined_names["ACT_POSTLIFT"] = DefinedName("ACT_POSTLIFT", attr_text=f"Activations!$H$5:$H${last}")
    wb.defined_names["ACT_TRIAL"] = DefinedName("ACT_TRIAL", attr_text=f"Activations!$I$5:$I${last}")
    wb.defined_names["ACT_COST"] = DefinedName("ACT_COST", attr_text=f"Activations!$J$5:$J${last}")
    wb.defined_names["ACT_INC_UNITS"] = DefinedName("ACT_INC_UNITS", attr_text=f"Activations!$K$5:$K${last}")
    wb.defined_names["ACT_INC_CASES"] = DefinedName("ACT_INC_CASES", attr_text=f"Activations!$L$5:$L${last}")
    wb.defined_names["ACT_ROI"] = DefinedName("ACT_ROI", attr_text=f"Activations!$M$5:$M${last}")

    set_col_widths(ws, [14, 22, 16, 14, 12, 12, 18, 20, 22, 14, 20, 22, 20])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False
    return ws


# Bulk Edit rows
N_BULK_ROWS = 20


def build_bulk_edit(wb):
    ws = wb.create_sheet("Bulk Edit")
    title(ws, "Bulk velocity overrides")
    ws["A2"] = (
        "Each enabled row overrides matching Velocity Grid cells. Last matching enabled row wins. "
        "Tier accepts A, B, C, or ALL. SKU accepts Lime Lemon, Pineapple Passion Fruit, Raspberry, or ALL. "
        "Use to push a flat value into many cells without hand editing the grid."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Rule ID", "Enabled", "Tier", "SKU", "Start Week", "End Week", "New Units Value"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for i in range(N_BULK_ROWS):
        r = 5 + i
        ws.cell(row=r, column=1, value=f"B{i+1:02d}")
        for j in range(2, len(headers) + 1):
            cell = ws.cell(row=r, column=j)
            cell.fill = INPUT_FILL
            cell.border = BORDER

    # Validations
    dv_yn = DataValidation(type="list", formula1='"Y,N"', allow_blank=True)
    dv_tier = DataValidation(type="list", formula1='"A,B,C,ALL"', allow_blank=True)
    dv_sku = DataValidation(type="list", formula1='"Lime Lemon,Pineapple Passion Fruit,Raspberry,ALL"', allow_blank=True)
    dv_week = DataValidation(type="whole", operator="between", formula1=1, formula2=13, allow_blank=True)
    for dv in [dv_yn, dv_tier, dv_sku, dv_week]:
        ws.add_data_validation(dv)
    last = 5 + N_BULK_ROWS - 1
    dv_yn.add(f"B5:B{last}")
    dv_tier.add(f"C5:C{last}")
    dv_sku.add(f"D5:D{last}")
    dv_week.add(f"E5:F{last}")

    wb.defined_names["BULK_ENABLED"] = DefinedName("BULK_ENABLED", attr_text=f"'Bulk Edit'!$B$5:$B${last}")
    wb.defined_names["BULK_TIER"] = DefinedName("BULK_TIER", attr_text=f"'Bulk Edit'!$C$5:$C${last}")
    wb.defined_names["BULK_SKU"] = DefinedName("BULK_SKU", attr_text=f"'Bulk Edit'!$D$5:$D${last}")
    wb.defined_names["BULK_START"] = DefinedName("BULK_START", attr_text=f"'Bulk Edit'!$E$5:$E${last}")
    wb.defined_names["BULK_END"] = DefinedName("BULK_END", attr_text=f"'Bulk Edit'!$F$5:$F${last}")
    wb.defined_names["BULK_VALUE"] = DefinedName("BULK_VALUE", attr_text=f"'Bulk Edit'!$G$5:$G${last}")

    set_col_widths(ws, [10, 12, 10, 16, 12, 12, 18])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False
    return ws


def build_scenarios(wb):
    ws = wb.create_sheet("Scenarios")
    title(ws, "Scenarios")
    ws["A2"] = (
        "Active scenario applies a multiplier to the entire Velocity Grid baseline. "
        "Edit per SKU multipliers below for each scenario. "
        "To save the current grid as a literal snapshot, copy the Velocity Grid units block and paste values into the snapshot section below."
    )
    ws["A2"].font = NOTE_FONT

    style_section(ws, 4, 1, "Active scenario")
    ws["A5"] = "Selected scenario"
    ws["B5"] = "Base"
    ws["B5"].fill = INPUT_FILL
    ws["B5"].font = Font(bold=True)
    dv = DataValidation(type="list", formula1='"Conservative,Base,Stretch"', allow_blank=False)
    ws.add_data_validation(dv)
    dv.add("B5")
    wb.defined_names["ACTIVE_SCENARIO"] = DefinedName("ACTIVE_SCENARIO", attr_text="Scenarios!$B$5")

    style_section(ws, 7, 1, "Scenario multipliers by SKU")
    headers = ["SKU", "Conservative", "Base", "Stretch"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=8, column=j, value=h)
    style_header_row(ws, 8, len(headers))
    defaults = {"Lime Lemon": (0.85, 1.00, 1.15),
                "Pineapple Passion Fruit": (0.85, 1.00, 1.15),
                "Raspberry": (0.80, 1.00, 1.20)}
    for i, sku in enumerate(SKUS):
        r = 9 + i
        ws.cell(row=r, column=1, value=sku)
        for j, v in enumerate(defaults[sku]):
            c = ws.cell(row=r, column=2 + j, value=v)
            c.fill = INPUT_FILL
            c.number_format = "0.00"
    wb.defined_names["SCEN_MULT_TABLE"] = DefinedName("SCEN_MULT_TABLE", attr_text="Scenarios!$B$9:$D$11")
    wb.defined_names["SCEN_NAMES"] = DefinedName("SCEN_NAMES", attr_text="Scenarios!$B$8:$D$8")

    # Active multiplier lookup per SKU
    ws["A13"] = "Active multiplier resolved per SKU"
    ws["A13"].font = SECTION_FONT
    for i, sku in enumerate(SKUS):
        r = 14 + i
        ws.cell(row=r, column=1, value=sku)
        ws.cell(row=r, column=2,
                value=f'=INDEX(SCEN_MULT_TABLE,{i+1},MATCH(ACTIVE_SCENARIO,SCEN_NAMES,0))').number_format = "0.00"
    wb.defined_names["ACTIVE_MULT_TABLE"] = DefinedName("ACTIVE_MULT_TABLE", attr_text="Scenarios!$B$14:$B$16")

    # Snapshot sections (paste values area)
    style_section(ws, 19, 1, "Snapshot store. Paste values from Velocity Grid units block here when freezing a scenario.")
    ws["A20"] = "Conservative snapshot saved on"
    ws["B20"] = ""
    ws["B20"].fill = INPUT_FILL
    ws["A21"] = "Base snapshot saved on"
    ws["B21"] = ""
    ws["B21"].fill = INPUT_FILL
    ws["A22"] = "Stretch snapshot saved on"
    ws["B22"] = ""
    ws["B22"].fill = INPUT_FILL
    ws["A24"] = (
        "Process: 1) select all units cells in Velocity Grid. 2) copy. 3) paste values into the matching section below. "
        "4) update the saved on date above. Three snapshot blocks reserved below."
    )
    ws["A24"].font = NOTE_FONT
    for s_idx, name in enumerate(["Conservative", "Base", "Stretch"]):
        start_row = 27 + s_idx * 310
        ws.cell(row=start_row, column=1, value=f"{name} snapshot block")
        ws.cell(row=start_row, column=1).font = SECTION_FONT
        ws.cell(row=start_row, column=1).fill = SECTION_FILL
        # Block headers
        for j, h in enumerate(["Door ID", "SKU"] + [f"W{w}" for w in WEEKS], start=1):
            ws.cell(row=start_row + 1, column=j, value=h)
        style_header_row(ws, start_row + 1, 2 + len(WEEKS))

    set_col_widths(ws, [32, 18, 18, 18, 18])
    ws.sheet_view.showGridLines = False
    return ws


def build_velocity_grid(wb, doors):
    """Velocity Grid. One row per Door x SKU. W1..W13 columns hold units.
    Each cell is a formula that combines: scenario multiplier, bulk override,
    ramp by weeks since launch, tier+SKU default velocity, activation uplift,
    post activation lift. Activation trial units add as flat units at door
    weighted basis (handled in Weekly Forecast aggregation, not per door cell).
    """
    ws = wb.create_sheet("Velocity Grid")
    title(ws, "Velocity Grid")
    ws["A2"] = (
        "Heart of the model. Each row is one SKU at one door. W1 through W13 hold units per week. "
        "Formulas reflow when Inputs, Activations, Bulk Edit, or Scenarios change. "
        "Overtype a cell to apply a hard override. Overridden cells highlight in amber automatically."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Row ID", "Door ID", "Door Name", "Banner", "Region", "Tier", "SKU",
               "Authorized", "Launch Week"] + [f"W{w}" for w in WEEKS]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    # 100 doors x 3 SKUs = 300 rows
    n_doors = len(doors)
    n_rows = n_doors * len(SKUS)

    week_col_offset = 10  # W1 starts at column J (10)

    for di, door in enumerate(doors):
        door_id, banner, store_name, city, region, tier, perf, daily, energy, launch = door
        for si, sku in enumerate(SKUS):
            row_idx = 5 + di * 3 + si
            row_id = f"R{di * 3 + si + 1:04d}"
            doors_row = 5 + di  # row in Doors tab

            ws.cell(row=row_idx, column=1, value=row_id)
            ws.cell(row=row_idx, column=2, value=f"=Doors!$A${doors_row}")
            ws.cell(row=row_idx, column=3, value=f"=Doors!$C${doors_row}")
            ws.cell(row=row_idx, column=4, value=f"=Doors!$B${doors_row}")
            ws.cell(row=row_idx, column=5, value=f"=Doors!$E${doors_row}")
            ws.cell(row=row_idx, column=6, value=f"=Doors!$F${doors_row}")
            ws.cell(row=row_idx, column=7, value=sku)
            # Authorized lookup
            auth_col = {"Lime Lemon": "G", "Pineapple Passion Fruit": "H", "Raspberry": "I"}[sku]
            ws.cell(row=row_idx, column=8, value=f"=Doors!${auth_col}${doors_row}")
            ws.cell(row=row_idx, column=9, value=f"=Doors!$J${doors_row}")

            # SKU index for scenario lookup and velocity table column
            sku_idx = si + 1  # 1..3

            # Build the W1..W13 formulas
            for wi, w in enumerate(WEEKS):
                col = week_col_offset + wi
                col_letter = get_column_letter(col)
                cell_ref = f"{col_letter}{row_idx}"

                # References
                auth_cell = f"$H{row_idx}"
                launch_cell = f"$I{row_idx}"
                tier_cell = f"$F{row_idx}"
                sku_cell = f"$G{row_idx}"
                door_id_cell = f"$B{row_idx}"

                # weeks since launch
                wsl = f"({w}-{launch_cell}+1)"
                # ramp pct
                ramp = (
                    f"IF({wsl}<=0,0,"
                    f"IF({wsl}=1,RAMP_W1,"
                    f"IF({wsl}=2,RAMP_W2,"
                    f"IF({wsl}=3,RAMP_W3,RAMP_W4PLUS))))"
                )
                # base tier sku velocity
                base_vel = f"INDEX(VELOCITY_TABLE,MATCH({tier_cell},TIER_LIST,0),{sku_idx})"
                # scenario multiplier
                scen_mult = f"INDEX(ACTIVE_MULT_TABLE,{sku_idx},1)"

                # Bulk override resolution. Last matching enabled rule wins.
                # We compute the row position of the last match via
                # SUMPRODUCT(MAX(matches * relative_row)) which forces array context
                # so this works in legacy Excel without CSE.
                bulk_match_array = (
                    f"((BULK_ENABLED=\"Y\")"
                    f"*((BULK_TIER=\"ALL\")+(BULK_TIER={tier_cell}))"
                    f"*((BULK_SKU=\"ALL\")+(BULK_SKU={sku_cell}))"
                    f"*(BULK_START<={w})*(BULK_END>={w}))"
                )
                bulk_match_count = f"SUMPRODUCT({bulk_match_array})"
                bulk_has_match = f"{bulk_match_count}>0"
                bulk_last_rel = (
                    f"SUMPRODUCT(MAX({bulk_match_array}*(ROW(BULK_VALUE)-MIN(ROW(BULK_VALUE))+1)))"
                )
                bulk_value_pick = f"IFERROR(INDEX(BULK_VALUE,{bulk_last_rel}),0)"

                # Activation uplift sum (additive on multiplier minus 1)
                act_door_match = (
                    f"((ACT_DOOR_SCOPE=\"ALL\")"
                    f"+(ACT_DOOR_SCOPE=\"TIER_\"&{tier_cell})"
                    f"+(ACT_DOOR_SCOPE={door_id_cell}))"
                )
                act_sku_match = (
                    f"((ACT_SKU_SCOPE=\"ALL\")+(ACT_SKU_SCOPE={sku_cell}))"
                )
                act_active = f"(ACT_START<={w})*(ACT_END>={w})"
                act_post = f"({w}>ACT_END)*(ACT_END>0)"

                uplift_add = (
                    f"SUMPRODUCT(SIGN({act_door_match})*SIGN({act_sku_match})*"
                    f"{act_active}*IFERROR(ACT_UPLIFT-1,0))"
                )
                postlift_add = (
                    f"SUMPRODUCT(SIGN({act_door_match})*SIGN({act_sku_match})*"
                    f"{act_post}*IFERROR(ACT_POSTLIFT,0))"
                )

                base_formula = (
                    f"({base_vel})*({ramp})*({scen_mult})"
                    f"*(1+{uplift_add})*(1+{postlift_add})"
                )

                full = (
                    f"=IF(OR({auth_cell}<>\"Y\",{w}<{launch_cell}),0,"
                    f"IF({bulk_has_match},IFERROR({bulk_value_pick},0),"
                    f"ROUND({base_formula},0)))"
                )

                c = ws.cell(row=row_idx, column=col, value=full)
                c.number_format = "0"
                c.alignment = Alignment(horizontal="center")

    last_row = 4 + n_rows
    # Named ranges for downstream tabs
    wb.defined_names["VG_DOOR_ID"] = DefinedName("VG_DOOR_ID", attr_text=f"'Velocity Grid'!$B$5:$B${last_row}")
    wb.defined_names["VG_BANNER"] = DefinedName("VG_BANNER", attr_text=f"'Velocity Grid'!$D$5:$D${last_row}")
    wb.defined_names["VG_REGION"] = DefinedName("VG_REGION", attr_text=f"'Velocity Grid'!$E$5:$E${last_row}")
    wb.defined_names["VG_TIER"] = DefinedName("VG_TIER", attr_text=f"'Velocity Grid'!$F$5:$F${last_row}")
    wb.defined_names["VG_SKU"] = DefinedName("VG_SKU", attr_text=f"'Velocity Grid'!$G$5:$G${last_row}")
    wb.defined_names["VG_AUTH"] = DefinedName("VG_AUTH", attr_text=f"'Velocity Grid'!$H$5:$H${last_row}")
    wb.defined_names["VG_LAUNCH"] = DefinedName("VG_LAUNCH", attr_text=f"'Velocity Grid'!$I$5:$I${last_row}")
    for wi, w in enumerate(WEEKS):
        col_letter = get_column_letter(week_col_offset + wi)
        wb.defined_names[f"VG_W{w}"] = DefinedName(
            f"VG_W{w}", attr_text=f"'Velocity Grid'!${col_letter}$5:${col_letter}${last_row}"
        )
    wb.defined_names["VG_UNITS_BLOCK"] = DefinedName(
        "VG_UNITS_BLOCK",
        attr_text=f"'Velocity Grid'!$J$5:$V${last_row}",
    )

    # Conditional formatting on override detection
    # Compute default value by mirroring formula in a hidden helper? Too expensive.
    # Instead: highlight any cell where value is not numeric formula result. We use a different signal:
    # if a cell has no formula (literal number), it is an override. openpyxl can use FormulaRule
    # with ISFORMULA inverse via the function ISFORMULA. Excel function ISFORMULA returns TRUE/FALSE.
    cf_range = f"J5:V{last_row}"
    rule = FormulaRule(formula=[f"AND(ISNUMBER(J5),NOT(ISFORMULA(J5)))"], fill=OVERRIDE_FILL)
    ws.conditional_formatting.add(cf_range, rule)

    # Freeze panes and widths
    set_col_widths(ws, [10, 10, 22, 22, 16, 6, 12, 12, 12] + [8] * len(WEEKS))
    ws.freeze_panes = "J5"
    ws.sheet_view.showGridLines = False
    return ws, last_row


def build_online_forecast(wb):
    ws = wb.create_sheet("Online Forecast")
    title(ws, "Online Forecast")
    ws["A2"] = (
        "Units per week by SKU and channel. Ramp uses the same curve as door velocity, starting from week 1. "
        "Online volume sums into total at the case math stage and is not blended into door volume."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["SKU", "Channel"] + [f"W{w}" for w in WEEKS] + ["Total Units", "Total Cases"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    row = 5
    sku_idx_for_online = {"Lime Lemon": 1, "Pineapple Passion Fruit": 2, "Raspberry": 3}
    for sku in SKUS:
        sku_i = sku_idx_for_online[sku]
        for ch in ["Amazon.ca", "Shopify DTC"]:
            ws.cell(row=row, column=1, value=sku)
            ws.cell(row=row, column=2, value=ch)
            for wi, w in enumerate(WEEKS):
                ramp = (
                    f"IF({w}=1,ONLINE_RAMP_W1,IF({w}=2,ONLINE_RAMP_W2,"
                    f"IF({w}=3,ONLINE_RAMP_W3,ONLINE_RAMP_W4PLUS)))"
                )
                if ch == "Amazon.ca":
                    base = f"INDEX(ONLINE_AMZ,{sku_i})"
                else:
                    base = f"INDEX(ONLINE_DTC,{sku_i})"
                scen_mult = f"INDEX(ACTIVE_MULT_TABLE,{sku_i},1)"
                col = 3 + wi
                ws.cell(
                    row=row, column=col,
                    value=f"=ROUND({base}*({ramp})*({scen_mult}),0)"
                ).number_format = "0"
            total_col = 3 + len(WEEKS)
            ws.cell(row=row, column=total_col,
                    value=f"=SUM(C{row}:O{row})").number_format = "#,##0"
            ws.cell(row=row, column=total_col + 1,
                    value=f"=ROUNDUP(P{row}/UNITS_PER_CASE,0)").number_format = "#,##0"
            row += 1

    # Channel totals per week
    ws.cell(row=row, column=1, value="Channel total units")
    ws.cell(row=row, column=1).font = Font(bold=True)
    for wi in range(len(WEEKS)):
        col = 3 + wi
        col_letter = get_column_letter(col)
        ws.cell(row=row, column=col,
                value=f"=SUM({col_letter}5:{col_letter}{row-1})").font = Font(bold=True)
        ws.cell(row=row, column=col).number_format = "#,##0"

    ws.cell(row=row, column=3 + len(WEEKS),
            value=f"=SUM(P5:P{row-1})").font = Font(bold=True)
    ws.cell(row=row, column=3 + len(WEEKS)).number_format = "#,##0"
    ws.cell(row=row, column=4 + len(WEEKS),
            value=f"=SUM(Q5:Q{row-1})").font = Font(bold=True)
    ws.cell(row=row, column=4 + len(WEEKS)).number_format = "#,##0"

    # Named ranges
    wb.defined_names["ONLINE_UNITS_TOTAL_ROW"] = DefinedName(
        "ONLINE_UNITS_TOTAL_ROW", attr_text=f"'Online Forecast'!$C${row}:$O${row}"
    )
    wb.defined_names["ONLINE_TOTAL_UNITS"] = DefinedName(
        "ONLINE_TOTAL_UNITS", attr_text=f"'Online Forecast'!$P${row}"
    )
    wb.defined_names["ONLINE_TOTAL_CASES"] = DefinedName(
        "ONLINE_TOTAL_CASES", attr_text=f"'Online Forecast'!$Q${row}"
    )

    set_col_widths(ws, [16, 14] + [8] * len(WEEKS) + [14, 14])
    ws.freeze_panes = "C5"
    ws.sheet_view.showGridLines = False
    return ws


def build_weekly_forecast(wb, vg_last_row):
    ws = wb.create_sheet("Weekly Forecast")
    title(ws, "Weekly Forecast")
    ws["A2"] = (
        "Aggregates Velocity Grid by week, SKU, region, banner, and tier. "
        "Units sum directly. Cases round up at the door level then sum. "
        "Cross check cell compares total units against the Velocity Grid sum and flags any mismatch."
    )
    ws["A2"].font = NOTE_FONT

    # Section A: by Week
    style_section(ws, 4, 1, "By week")
    headers = ["Week",
               f"{SKUS[0]} units", f"{SKUS[1]} units", f"{SKUS[2]} units", "Total units",
               f"{SKUS[0]} cases", f"{SKUS[1]} cases", f"{SKUS[2]} cases", "Total cases"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=5, column=j, value=h)
    style_header_row(ws, 5, len(headers))

    for wi, w in enumerate(WEEKS):
        r = 6 + wi
        ws.cell(row=r, column=1, value=f"W{w}")
        for si, sku in enumerate(SKUS):
            unit_col = 2 + si
            ws.cell(
                row=r, column=unit_col,
                value=f'=SUMPRODUCT((VG_SKU="{sku}")*VG_W{w})'
            ).number_format = "#,##0"
        ws.cell(row=r, column=5, value=f"=SUM(B{r}:D{r})").number_format = "#,##0"
        for si, sku in enumerate(SKUS):
            case_col = 6 + si
            ws.cell(
                row=r, column=case_col,
                value=(
                    f'=SUMPRODUCT((VG_SKU="{sku}")*(VG_W{w}>0)'
                    f'*(CEILING(VG_W{w},UNITS_PER_CASE)/UNITS_PER_CASE))'
                ),
            ).number_format = "#,##0"
        ws.cell(row=r, column=9, value=f"=SUM(F{r}:H{r})").number_format = "#,##0"

    # Totals row
    tot_r = 6 + len(WEEKS)
    ws.cell(row=tot_r, column=1, value="Total")
    ws.cell(row=tot_r, column=1).font = Font(bold=True)
    for col in range(2, 10):
        col_letter = get_column_letter(col)
        ws.cell(row=tot_r, column=col,
                value=f"=SUM({col_letter}6:{col_letter}{tot_r-1})").font = Font(bold=True)
        ws.cell(row=tot_r, column=col).number_format = "#,##0"

    # Cross check
    ws.cell(row=tot_r + 2, column=1, value="Cross check units")
    ws.cell(row=tot_r + 2, column=1).font = Font(bold=True)
    ws.cell(row=tot_r + 2, column=2,
            value=f"=E{tot_r}-SUM(VG_UNITS_BLOCK)").number_format = "#,##0"
    ws.cell(row=tot_r + 2, column=3,
            value=f'=IF(B{tot_r+2}=0,"Match","Mismatch")')
    # CF for mismatch
    rng = f"B{tot_r+2}:C{tot_r+2}"
    ws.conditional_formatting.add(
        rng,
        FormulaRule(formula=[f'$C${tot_r+2}<>"Match"'], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        rng,
        FormulaRule(formula=[f'$C${tot_r+2}="Match"'], fill=OK_FILL),
    )

    # Section B: by SKU across weeks
    sb_start = tot_r + 5
    style_section(ws, sb_start, 1, "By SKU across weeks, units")
    ws.cell(row=sb_start + 1, column=1, value="SKU")
    for wi, w in enumerate(WEEKS):
        ws.cell(row=sb_start + 1, column=2 + wi, value=f"W{w}")
    ws.cell(row=sb_start + 1, column=2 + len(WEEKS), value="Total")
    style_header_row(ws, sb_start + 1, 2 + len(WEEKS))

    for si, sku in enumerate(SKUS):
        r = sb_start + 2 + si
        ws.cell(row=r, column=1, value=sku)
        for wi, w in enumerate(WEEKS):
            ws.cell(row=r, column=2 + wi,
                    value=f'=SUMPRODUCT((VG_SKU="{sku}")*VG_W{w})').number_format = "#,##0"
        first_col_letter = get_column_letter(2)
        last_col_letter = get_column_letter(1 + len(WEEKS))
        ws.cell(row=r, column=2 + len(WEEKS),
                value=f"=SUM({first_col_letter}{r}:{last_col_letter}{r})").number_format = "#,##0"

    # Section C: by Region
    sc_start = sb_start + 2 + len(SKUS) + 2
    style_section(ws, sc_start, 1, "By region, totals")
    ws.cell(row=sc_start + 1, column=1, value="Region")
    ws.cell(row=sc_start + 1, column=2, value="Total units")
    ws.cell(row=sc_start + 1, column=3, value="Total cases")
    style_header_row(ws, sc_start + 1, 3)
    for ri, region in enumerate(REGIONS):
        r = sc_start + 2 + ri
        ws.cell(row=r, column=1, value=region)
        # Units total = sum across all weeks where region matches
        parts = "+".join([f"SUMPRODUCT((VG_REGION=$A${r})*VG_W{w})" for w in WEEKS])
        ws.cell(row=r, column=2, value=f"={parts}").number_format = "#,##0"
        # Cases total = sum across all weeks of door level rounded cases
        case_parts = "+".join([
            f'SUMPRODUCT((VG_REGION=$A${r})*(VG_W{w}>0)'
            f'*(CEILING(VG_W{w},UNITS_PER_CASE)/UNITS_PER_CASE))' for w in WEEKS
        ])
        ws.cell(row=r, column=3, value=f"={case_parts}").number_format = "#,##0"

    # Section D: by Tier
    sd_start = sc_start + 2 + len(REGIONS) + 2
    style_section(ws, sd_start, 1, "By tier, totals")
    ws.cell(row=sd_start + 1, column=1, value="Tier")
    ws.cell(row=sd_start + 1, column=2, value="Total units")
    ws.cell(row=sd_start + 1, column=3, value="Total cases")
    style_header_row(ws, sd_start + 1, 3)
    for ti, tier in enumerate(TIERS):
        r = sd_start + 2 + ti
        ws.cell(row=r, column=1, value=tier)
        parts = "+".join([f"SUMPRODUCT((VG_TIER=$A${r})*VG_W{w})" for w in WEEKS])
        ws.cell(row=r, column=2, value=f"={parts}").number_format = "#,##0"
        case_parts = "+".join([
            f'SUMPRODUCT((VG_TIER=$A${r})*(VG_W{w}>0)'
            f'*(CEILING(VG_W{w},UNITS_PER_CASE)/UNITS_PER_CASE))' for w in WEEKS
        ])
        ws.cell(row=r, column=3, value=f"={case_parts}").number_format = "#,##0"

    # Section E: by Banner (unique list)
    se_start = sd_start + 2 + len(TIERS) + 2
    style_section(ws, se_start, 1, "By banner, totals")
    ws.cell(row=se_start + 1, column=1, value="Banner")
    ws.cell(row=se_start + 1, column=2, value="Total units")
    ws.cell(row=se_start + 1, column=3, value="Total cases")
    style_header_row(ws, se_start + 1, 3)
    banners_unique = sorted({b[1] for b in [
        (None, "Choices Markets"), (None, "Nature's Fare Markets"), (None, "Whole Foods Market"),
        (None, "Pomme Natural Market"), (None, "IGA Marketplace"), (None, "Save On Foods"),
        (None, "Urban Fare"), (None, "Independent Grocer"), (None, "Stong's Market"), (None, "Fresh St Market")
    ]})
    for bi, banner in enumerate(banners_unique):
        r = se_start + 2 + bi
        ws.cell(row=r, column=1, value=banner)
        parts = "+".join([f"SUMPRODUCT((VG_BANNER=$A${r})*VG_W{w})" for w in WEEKS])
        ws.cell(row=r, column=2, value=f"={parts}").number_format = "#,##0"
        case_parts = "+".join([
            f'SUMPRODUCT((VG_BANNER=$A${r})*(VG_W{w}>0)'
            f'*(CEILING(VG_W{w},UNITS_PER_CASE)/UNITS_PER_CASE))' for w in WEEKS
        ])
        ws.cell(row=r, column=3, value=f"={case_parts}").number_format = "#,##0"

    # Named ranges for downstream
    wb.defined_names["WF_WEEK_UNITS"] = DefinedName(
        "WF_WEEK_UNITS", attr_text=f"'Weekly Forecast'!$E$6:$E${5+len(WEEKS)}"
    )
    wb.defined_names["WF_WEEK_CASES"] = DefinedName(
        "WF_WEEK_CASES", attr_text=f"'Weekly Forecast'!$I$6:$I${5+len(WEEKS)}"
    )
    wb.defined_names["WF_SKU_UNITS_TOTAL_BY_SKU"] = DefinedName(
        "WF_SKU_UNITS_TOTAL_BY_SKU",
        attr_text=f"'Weekly Forecast'!${get_column_letter(2+len(WEEKS))}${sb_start+2}:${get_column_letter(2+len(WEEKS))}${sb_start+1+len(SKUS)}"
    )

    set_col_widths(ws, [22, 18, 26, 16, 14, 18, 26, 16, 14, 12, 12, 12, 12, 12, 12])
    ws.sheet_view.showGridLines = False
    return ws, tot_r


def build_production_calendar(wb, wf_total_row):
    ws = wb.create_sheet("Production Calendar")
    title(ws, "Production Calendar")
    ws["A2"] = (
        "Back schedules co manufacturer PO release weeks from each delivery week using the Bevmax lead time. "
        "Required cases per week pull from the Weekly Forecast total cases line. "
        "Any week where required cases exceed weekly run capacity highlights in red."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Delivery Week", "Required cases doors", "Required cases online",
               "Required cases total", "Capacity", "Headroom", "PO release week", "Status"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for wi, w in enumerate(WEEKS):
        r = 5 + wi
        ws.cell(row=r, column=1, value=f"W{w}")
        # Door cases for this week = Weekly Forecast I column row 6+wi
        ws.cell(row=r, column=2,
                value=f"='Weekly Forecast'!I{6+wi}").number_format = "#,##0"
        # Online cases for this week = sum of ROUNDUP per SKU per channel for that week.
        # We approximate at week level: ROUNDUP(week online units / 24, 0) by SKU and channel.
        # The Online Forecast tab has 6 rows (3 SKU x 2 channel) in rows 5..10.
        online_parts = []
        for orow in range(5, 11):
            cell_ref = f"{get_column_letter(3+wi)}{orow}"  # C..O are W1..W13
            online_parts.append(f"ROUNDUP('Online Forecast'!{cell_ref}/UNITS_PER_CASE,0)")
        ws.cell(row=r, column=3, value=f"={'+'.join(online_parts)}").number_format = "#,##0"
        ws.cell(row=r, column=4, value=f"=B{r}+C{r}").number_format = "#,##0"
        ws.cell(row=r, column=5, value="=BEVMAX_CAP").number_format = "#,##0"
        ws.cell(row=r, column=6, value=f"=E{r}-D{r}").number_format = "#,##0"
        ws.cell(row=r, column=7, value=f"={w}-BEVMAX_LEAD")
        ws.cell(row=r, column=8, value=f'=IF(D{r}>E{r},"Over capacity","OK")')

    # CF
    last_r = 4 + len(WEEKS)
    ws.conditional_formatting.add(
        f"D5:F{last_r}",
        FormulaRule(formula=[f"$D5>$E5"], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"H5:H{last_r}",
        FormulaRule(formula=[f'$H5="Over capacity"'], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"H5:H{last_r}",
        FormulaRule(formula=[f'$H5="OK"'], fill=OK_FILL),
    )

    set_col_widths(ws, [16, 22, 22, 22, 14, 14, 18, 18])
    ws.sheet_view.showGridLines = False
    return ws


def build_revenue_margin(wb):
    ws = wb.create_sheet("Revenue and Margin")
    title(ws, "Revenue and Margin")
    ws["A2"] = (
        "Per SKU operating economics. Wholesale less COGS, freight, distributor margin, and allocated trade spend "
        "yields operating contribution. Slotting is a one time launch investment and is shown separately below, "
        "amortized into the launch quarter, so per unit margin is not distorted by a one time fee. "
        "Fill rate adjusts shipped cases versus forecast."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["SKU", "Total cases doors", "Total cases online", "Total cases all",
               "Cases shipped", "Wholesale per case", "Gross revenue",
               "COGS per case", "COGS total", "Freight total",
               "Distributor margin", "Direct trade spend", "Allocated ALL scope trade",
               "Operating contribution", "Operating margin percent"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for si, sku in enumerate(SKUS):
        r = 5 + si
        ws.cell(row=r, column=1, value=sku)
        # Total cases doors for this SKU summed across weeks
        case_parts = "+".join([
            f'SUMPRODUCT((VG_SKU="{sku}")*(VG_W{w}>0)'
            f'*(CEILING(VG_W{w},UNITS_PER_CASE)/UNITS_PER_CASE))' for w in WEEKS
        ])
        ws.cell(row=r, column=2, value=f"={case_parts}").number_format = "#,##0"
        # Total cases online for this SKU = sum of ROUNDUP for 2 channels x 13 weeks
        online_sku_parts = []
        amz_row = 5 + si * 2
        dtc_row = 6 + si * 2
        for wi in range(len(WEEKS)):
            col_letter = get_column_letter(3 + wi)
            online_sku_parts.append(f"ROUNDUP('Online Forecast'!{col_letter}{amz_row}/UNITS_PER_CASE,0)")
            online_sku_parts.append(f"ROUNDUP('Online Forecast'!{col_letter}{dtc_row}/UNITS_PER_CASE,0)")
        ws.cell(row=r, column=3, value=f"={'+'.join(online_sku_parts)}").number_format = "#,##0"
        ws.cell(row=r, column=4, value=f"=B{r}+C{r}").number_format = "#,##0"
        ws.cell(row=r, column=5, value=f"=ROUND(D{r}*FILL_RATE,0)").number_format = "#,##0"
        ws.cell(row=r, column=6, value=f"=INDEX(WHOLESALE_TABLE,{si+1})").number_format = '"$"#,##0.00'
        ws.cell(row=r, column=7, value=f"=E{r}*F{r}").number_format = '"$"#,##0'
        ws.cell(row=r, column=8, value=f"=INDEX(COGS_TABLE,{si+1})").number_format = '"$"#,##0.00'
        ws.cell(row=r, column=9, value=f"=E{r}*H{r}").number_format = '"$"#,##0'
        ws.cell(row=r, column=10, value=f"=E{r}*FREIGHT_PER_CASE").number_format = '"$"#,##0'
        ws.cell(row=r, column=11,
                value=f"=G{r}*DIST_MARGIN_PCT").number_format = '"$"#,##0'
        # Direct trade spend = SUMIF over activations where SKU Scope = this SKU
        ws.cell(row=r, column=12,
                value=f'=SUMIF(ACT_SKU_SCOPE,"{sku}",ACT_COST)').number_format = '"$"#,##0'
        # ALL scope trade allocated by revenue share
        ws.cell(row=r, column=13,
                value=f'=IFERROR(SUMIF(ACT_SKU_SCOPE,"ALL",ACT_COST)*G{r}/SUM($G$5:$G$7),0)').number_format = '"$"#,##0'
        # Operating contribution = Gross - COGS - Freight - Distributor margin - Direct trade - Allocated trade
        ws.cell(row=r, column=14,
                value=f"=G{r}-I{r}-J{r}-K{r}-L{r}-M{r}").number_format = '"$"#,##0'
        ws.cell(row=r, column=15, value=f"=IF(G{r}=0,0,N{r}/G{r})").number_format = "0.0%"

    # Totals row
    tot_r = 5 + len(SKUS)
    ws.cell(row=tot_r, column=1, value="Total")
    ws.cell(row=tot_r, column=1).font = Font(bold=True)
    for col in [2, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14]:
        col_letter = get_column_letter(col)
        ws.cell(row=tot_r, column=col,
                value=f"=SUM({col_letter}5:{col_letter}{tot_r-1})").font = Font(bold=True)
    ws.cell(row=tot_r, column=2).number_format = "#,##0"
    ws.cell(row=tot_r, column=3).number_format = "#,##0"
    ws.cell(row=tot_r, column=4).number_format = "#,##0"
    ws.cell(row=tot_r, column=5).number_format = "#,##0"
    for col in [7, 9, 10, 11, 12, 13, 14]:
        ws.cell(row=tot_r, column=col).number_format = '"$"#,##0'
    ws.cell(row=tot_r, column=15,
            value=f'=IF(G{tot_r}=0,0,N{tot_r}/G{tot_r})').number_format = "0.0%"

    # Launch investment block. Slotting is one time, amortized into the quarter.
    li_r = tot_r + 3
    style_section(ws, li_r, 1, "Launch investment, slotting treated separately from per unit margin")
    li = [
        ("Authorized doors all flavors",
            '=COUNTIF(DOORS_LIMELEMON,"Y")+COUNTIF(DOORS_PINEAPPLE,"Y")+COUNTIF(DOORS_RASPBERRY,"Y")', "#,##0"),
        ("Total slotting one time",
            '=(COUNTIF(DOORS_LIMELEMON,"Y")+COUNTIF(DOORS_PINEAPPLE,"Y")+COUNTIF(DOORS_RASPBERRY,"Y"))*SLOTTING_PER_DOOR',
            '"$"#,##0'),
        ("Amortized slotting this quarter",
            f"=B{li_r+2}*LAUNCH_MONTHS/SLOTTING_AMORT_MONTHS", '"$"#,##0'),
    ]
    for i, (label, formula, fmt) in enumerate(li):
        r = li_r + 1 + i
        ws.cell(row=r, column=1, value=label)
        ws.cell(row=r, column=2, value=formula).number_format = fmt

    # Summary section
    sum_r = li_r + 5
    style_section(ws, sum_r, 1, "Rollup")
    rollup = [
        ("Gross revenue", f"=G{tot_r}", '"$"#,##0'),
        ("Total COGS", f"=I{tot_r}", '"$"#,##0'),
        ("Total freight", f"=J{tot_r}", '"$"#,##0'),
        ("Total distributor margin", f"=K{tot_r}", '"$"#,##0'),
        ("Total trade spend", f"=SUM(ACT_COST)", '"$"#,##0'),
        ("Operating contribution before launch investment", f"=N{tot_r}", '"$"#,##0'),
        ("Operating margin percent", f"=IF(G{tot_r}=0,0,N{tot_r}/G{tot_r})", "0.0%"),
        ("Less amortized slotting this quarter", f"=-B{li_r+3}", '"$"#,##0'),
        ("Net contribution after amortized slotting", f"=N{tot_r}-B{li_r+3}", '"$"#,##0'),
        ("Net margin after amortized slotting", f"=IF(G{tot_r}=0,0,(N{tot_r}-B{li_r+3})/G{tot_r})", "0.0%"),
        ("Memo, fully loaded contribution if all slotting in quarter", f"=N{tot_r}-B{li_r+2}", '"$"#,##0'),
        ("Effective trade percent of gross revenue", f"=IF(G{tot_r}=0,0,SUM(ACT_COST)/G{tot_r})", "0.0%"),
    ]
    rollup_rowmap = {}
    for i, (label, formula, fmt) in enumerate(rollup):
        r = sum_r + 1 + i
        ws.cell(row=r, column=1, value=label)
        ws.cell(row=r, column=2, value=formula).number_format = fmt
        rollup_rowmap[label] = r

    # Named ranges
    wb.defined_names["REV_GROSS_TOTAL"] = DefinedName(
        "REV_GROSS_TOTAL", attr_text=f"'Revenue and Margin'!$G${tot_r}"
    )
    wb.defined_names["REV_OPERATING_CONTRIB"] = DefinedName(
        "REV_OPERATING_CONTRIB", attr_text=f"'Revenue and Margin'!$N${tot_r}"
    )
    wb.defined_names["REV_SLOTTING_TOTAL"] = DefinedName(
        "REV_SLOTTING_TOTAL", attr_text=f"'Revenue and Margin'!$B${li_r+2}"
    )
    wb.defined_names["REV_SLOTTING_AMORT"] = DefinedName(
        "REV_SLOTTING_AMORT", attr_text=f"'Revenue and Margin'!$B${li_r+3}"
    )
    wb.defined_names["REV_TRADE_TOTAL"] = DefinedName(
        "REV_TRADE_TOTAL", attr_text=f"'Revenue and Margin'!$B${rollup_rowmap['Total trade spend']}"
    )
    wb.defined_names["REV_NET_TOTAL"] = DefinedName(
        "REV_NET_TOTAL", attr_text=f"'Revenue and Margin'!$B${rollup_rowmap['Net contribution after amortized slotting']}"
    )
    wb.defined_names["REV_MARGIN_PCT"] = DefinedName(
        "REV_MARGIN_PCT", attr_text=f"'Revenue and Margin'!$B${rollup_rowmap['Net margin after amortized slotting']}"
    )
    wb.defined_names["REV_TOTAL_CASES"] = DefinedName(
        "REV_TOTAL_CASES", attr_text=f"'Revenue and Margin'!$D${tot_r}"
    )
    wb.defined_names["REV_CASES_SHIPPED"] = DefinedName(
        "REV_CASES_SHIPPED", attr_text=f"'Revenue and Margin'!$E${tot_r}"
    )

    set_col_widths(ws, [44, 14, 14, 14, 14, 16, 16, 14, 14, 14, 16, 18, 20, 22, 18])
    ws.sheet_view.showGridLines = False
    return ws


def build_risk_flags(wb, vg_last_row, n_doors):
    ws = wb.create_sheet("Risk Flags")
    title(ws, "Risk Flags")
    ws["A2"] = (
        "Automated checks. Any row showing a count above zero needs review. "
        "Red highlights mean a hard issue. Green means clean."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Check", "Count or status", "Threshold", "Notes"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    checks = []

    # Doors with zero forecasted volume across all weeks
    # For each row in VG, sum W1..W13. If 0 and authorized = Y, flag.
    sum_terms = "+".join([f"VG_W{w}" for w in WEEKS])
    checks.append((
        "Authorized rows with zero total units",
        f'=SUMPRODUCT((VG_AUTH="Y")*(({sum_terms})=0))',
        ">0",
        "Door SKU rows with authorization but zero forecast. Often a launch week issue or velocity default missing.",
    ))

    # Weeks where production exceeds capacity
    checks.append((
        "Weeks over Bevmax capacity",
        f"=COUNTIF('Production Calendar'!D5:D{4+len(WEEKS)},\">\"&BEVMAX_CAP)",
        ">0",
        "Required cases exceed weekly run capacity. Smooth across weeks or expand capacity.",
    ))

    # SKUs trending down after week six. Per SKU compare week 13 vs week 7.
    for sku in SKUS:
        checks.append((
            f"{sku} week 13 below week 7",
            f'=IF(SUMIF(VG_SKU,"{sku}",VG_W13)<SUMIF(VG_SKU,"{sku}",VG_W7),"Down","OK")',
            "OK",
            f"{sku} forecast declining late in the launch window. Check activation decay assumptions.",
        ))

    # Activations missing uplift
    checks.append((
        "Activation rows missing uplift",
        '=COUNTIFS(ACT_ID,"<>",ACT_UPLIFT,"")+COUNTIFS(ACT_ID,"<>",ACT_UPLIFT,0)',
        ">0",
        "Activation entries with ID set but uplift multiplier blank or zero. Add an assumption before locking the forecast.",
    ))

    # Doors missing launch week or authorization
    checks.append((
        "Doors with blank launch week",
        '=COUNTIFS(DOORS_ID,"<>",DOORS_LAUNCH,"")',
        ">0",
        "Door rows exist but launch week is blank. Velocity Grid treats blanks as week zero and forecasts zero.",
    ))
    checks.append((
        "Doors with no flavor authorized",
        '=SUMPRODUCT((DOORS_ID<>"")*(DOORS_LIMELEMON<>"Y")*(DOORS_PINEAPPLE<>"Y")*(DOORS_RASPBERRY<>"Y"))',
        ">0",
        "Door rows where Lime Lemon, Pineapple Passion Fruit, and Raspberry are all set to N.",
    ))

    # Enabled bulk edit rule count for visibility
    checks.append((
        "Enabled bulk edit rules",
        '=COUNTIF(BULK_ENABLED,"Y")',
        "review",
        "Total active bulk overrides. With last match wins, ordering within the Bulk Edit tab matters when rules overlap.",
    ))

    # Inputs sanity
    checks.append((
        "Wholesale below COGS for any flavor",
        '=SUMPRODUCT((WHOLESALE_TABLE<COGS_TABLE)*1)',
        "0",
        "Wholesale price is below COGS for one or more flavors. Update pricing in Inputs.",
    ))
    checks.append((
        "Fill rate outside reasonable range",
        '=IF(OR(FILL_RATE<0.8,FILL_RATE>1),"Out of range","OK")',
        "OK",
        "Fill rate should be between 80 percent and 100 percent. Anything outside that signals an input error.",
    ))
    checks.append((
        "Production PO release in negative week",
        '=COUNTIF(\'Production Calendar\'!G5:G17,"<1")',
        ">0 expected",
        "PO release week before week 1 means orders must be placed before launch. This is normal for early weeks. Confirm Bevmax can accept pre launch POs.",
    ))
    checks.append((
        "Activation cost without uplift or trial",
        '=SUMPRODUCT((ACT_COST>0)*((ACT_UPLIFT<=1)+(ACT_UPLIFT=""))*((ACT_TRIAL=0)+(ACT_TRIAL="")))',
        "0",
        "Activation has cost recorded but no uplift and no trial units. ROI cannot be calculated.",
    ))
    checks.append((
        "Pricing missing for any flavor",
        '=COUNTIF(WHOLESALE_TABLE,"")+COUNTIF(WHOLESALE_TABLE,0)',
        "0",
        "Wholesale price blank or zero for at least one flavor.",
    ))
    checks.append((
        "COGS missing for any flavor",
        '=COUNTIF(COGS_TABLE,"")+COUNTIF(COGS_TABLE,0)',
        "0",
        "COGS blank or zero for at least one flavor.",
    ))
    checks.append((
        "Target gross revenue versus model",
        '=IF(REV_GROSS_TOTAL>=TARGET_REVENUE,"On track","Behind")',
        "On track",
        "Model gross revenue compared to the CEO target on the Inputs tab.",
    ))
    checks.append((
        "Target gross margin versus model",
        '=IF(REV_MARGIN_PCT>=TARGET_MARGIN_PCT,"On track","Behind")',
        "On track",
        "Net contribution margin percent compared to the target on the Inputs tab.",
    ))
    checks.append((
        "Target total cases versus model",
        '=IF(REV_TOTAL_CASES>=TARGET_CASES,"On track","Behind")',
        "On track",
        "Total cases versus CEO target.",
    ))

    # Velocity Grid cross check
    checks.append((
        "Weekly Forecast units versus Velocity Grid units",
        '=IF(SUM(WF_WEEK_UNITS)=SUM(VG_UNITS_BLOCK),"Match","Mismatch")',
        "Match",
        "Weekly Forecast total must equal Velocity Grid total exactly. Mismatch indicates a broken aggregation.",
    ))

    for i, (label, formula, threshold, note) in enumerate(checks):
        r = 5 + i
        ws.cell(row=r, column=1, value=label)
        ws.cell(row=r, column=2, value=formula)
        ws.cell(row=r, column=3, value=threshold)
        ws.cell(row=r, column=4, value=note)

    last_r = 4 + len(checks)
    # Highlight rules.
    ws.conditional_formatting.add(
        f"B5:B{last_r}",
        FormulaRule(formula=[f'AND(ISNUMBER($B5),$B5>0)'], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"B5:B{last_r}",
        FormulaRule(formula=[f'AND(ISNUMBER($B5),$B5=0)'], fill=OK_FILL),
    )
    for bad in ["Mismatch", "Behind", "Out of range", "Down"]:
        ws.conditional_formatting.add(
            f"B5:B{last_r}",
            FormulaRule(formula=[f'$B5="{bad}"'], fill=WARN_FILL),
        )
    for good in ["Match", "On track", "OK"]:
        ws.conditional_formatting.add(
            f"B5:B{last_r}",
            FormulaRule(formula=[f'$B5="{good}"'], fill=OK_FILL),
        )

    set_col_widths(ws, [52, 22, 14, 80])
    ws.sheet_view.showGridLines = False
    return ws


def build_dashboard(wb):
    ws = wb.create_sheet("Dashboard")
    title(ws, "CEO Dashboard")
    ws["A2"] = "13 week launch overview. Numbers live off the Velocity Grid via the Weekly Forecast and Revenue tabs."
    ws["A2"].font = NOTE_FONT

    # KPI tiles
    kpis = [
        ("Active scenario", "=ACTIVE_SCENARIO", ""),
        ("Total cases all channels", "=REV_TOTAL_CASES", "#,##0"),
        ("Gross revenue", "=REV_GROSS_TOTAL", '"$"#,##0'),
        ("Trade spend", "=REV_TRADE_TOTAL", '"$"#,##0'),
        ("Operating contribution", "=REV_OPERATING_CONTRIB", '"$"#,##0'),
        ("Net contribution after amortized slotting", "=REV_NET_TOTAL", '"$"#,##0'),
        ("Net margin percent", "=REV_MARGIN_PCT", "0.0%"),
        ("Online share of cases", '=IF(REV_TOTAL_CASES=0,0,ONLINE_TOTAL_CASES/REV_TOTAL_CASES)', "0.0%"),
    ]
    style_section(ws, 4, 1, "KPI summary")
    for i, (label, formula, fmt) in enumerate(kpis):
        r = 5 + i
        ws.cell(row=r, column=1, value=label).font = Font(bold=True)
        c = ws.cell(row=r, column=2, value=formula)
        if fmt:
            c.number_format = fmt
        c.font = Font(bold=True, color="1F3A5F")

    # Scenario multiplier panel
    style_section(ws, 4, 4, "Scenario multipliers")
    ws["D5"] = "Scenario"
    ws["E5"] = "Lime Lemon"
    ws["F5"] = "Pineapple"
    ws["G5"] = "Raspberry"
    style_header_row(ws, 5, 4, start_col=4)
    for i, scen in enumerate(["Conservative", "Base", "Stretch"]):
        r = 6 + i
        ws.cell(row=r, column=4, value=scen)
        for si in range(3):
            col = 5 + si
            ws.cell(row=r, column=col,
                    value=f'=INDEX(SCEN_MULT_TABLE,{si+1},MATCH("{scen}",SCEN_NAMES,0))').number_format = "0.00"

    # Top 10 doors by total volume
    style_section(ws, 15, 1, "Top 10 doors by total units")
    headers = ["Rank", "Door ID", "Door Name", "Total units"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=16, column=j, value=h)
    style_header_row(ws, 16, len(headers))
    # Build top 10 via LARGE on per door total. Per door total = sum across 3 SKU rows in VG.
    # We rely on formulas: rows 17..26.
    # Per door totals computed in a helper area to keep dashboard clean.
    helper_start_row = 60
    ws.cell(row=helper_start_row - 1, column=1, value="Helper, per door totals (do not edit)")
    ws.cell(row=helper_start_row - 1, column=1).font = NOTE_FONT
    # We will compute per door total by referencing Velocity Grid rows directly. 100 doors x 3 SKUs = 300 rows starting at row 5 of VG.
    for i in range(100):
        helper_r = helper_start_row + i
        ws.cell(row=helper_r, column=1, value=f"=Doors!A{5+i}")
        ws.cell(row=helper_r, column=2, value=f"=Doors!C{5+i}")
        # Sum 3 SKU rows in VG for this door across W1..W13
        vg_first = 5 + i * 3
        vg_last = 7 + i * 3
        sum_expr = "+".join([
            f"SUM('Velocity Grid'!{get_column_letter(10+wi)}{vg_first}:{get_column_letter(10+wi)}{vg_last})"
            for wi in range(len(WEEKS))
        ])
        ws.cell(row=helper_r, column=3, value=f"={sum_expr}").number_format = "#,##0"

    # Top 10 ranking via LARGE
    for k in range(10):
        r = 17 + k
        ws.cell(row=r, column=1, value=k + 1)
        ws.cell(row=r, column=4,
                value=f"=LARGE(C{helper_start_row}:C{helper_start_row+99},{k+1})").number_format = "#,##0"
        ws.cell(row=r, column=2,
                value=f"=INDEX(A{helper_start_row}:A{helper_start_row+99},MATCH(D{r},C{helper_start_row}:C{helper_start_row+99},0))")
        ws.cell(row=r, column=3,
                value=f"=INDEX(B{helper_start_row}:B{helper_start_row+99},MATCH(D{r},C{helper_start_row}:C{helper_start_row+99},0))")

    # Activation ROI
    style_section(ws, 29, 1, "Activation ROI")
    headers2 = ["Activation ID", "Type", "Cost", "Incremental cases (proxy)", "ROI cases per dollar"]
    for j, h in enumerate(headers2, start=1):
        ws.cell(row=30, column=j, value=h)
    style_header_row(ws, 30, len(headers2))
    # Use first 10 activation rows
    for i in range(10):
        r = 31 + i
        act_row = 5 + i  # Activations sheet
        ws.cell(row=r, column=1, value=f"=Activations!A{act_row}")
        ws.cell(row=r, column=2, value=f"=Activations!B{act_row}")
        ws.cell(row=r, column=3, value=f"=Activations!J{act_row}").number_format = '"$"#,##0'
        # Incremental cases proxy: (uplift - 1) * average affected SKU baseline cases per week * weeks active * doors affected count
        # Simplified placeholder formula: just use ACT_TRIAL converted to cases as a floor.
        ws.cell(row=r, column=4,
                value=f"=IFERROR(ROUNDUP(Activations!I{act_row}/UNITS_PER_CASE,0),0)").number_format = "#,##0"
        ws.cell(row=r, column=5,
                value=f"=IFERROR(IF(Activations!J{act_row}=0,0,D{r}/Activations!J{act_row}),0)").number_format = "0.00"

    # Trend line data
    style_section(ws, 44, 1, "13 week trend, total units and cases by week")
    ws.cell(row=45, column=1, value="Week")
    ws.cell(row=45, column=2, value="Door units")
    ws.cell(row=45, column=3, value="Online units")
    ws.cell(row=45, column=4, value="Total units")
    ws.cell(row=45, column=5, value="Total cases")
    style_header_row(ws, 45, 5)
    for wi, w in enumerate(WEEKS):
        r = 46 + wi
        ws.cell(row=r, column=1, value=f"W{w}")
        ws.cell(row=r, column=2, value=f"='Weekly Forecast'!E{6+wi}").number_format = "#,##0"
        # Online units per week sum
        online_col = get_column_letter(3 + wi)
        ws.cell(row=r, column=3,
                value=f"=SUM('Online Forecast'!{online_col}5:{online_col}10)").number_format = "#,##0"
        ws.cell(row=r, column=4, value=f"=B{r}+C{r}").number_format = "#,##0"
        ws.cell(row=r, column=5,
                value=f"='Weekly Forecast'!I{6+wi}+'Production Calendar'!C{5+wi}").number_format = "#,##0"

    # Add line chart
    chart = LineChart()
    chart.title = "Weekly total units"
    chart.y_axis.title = "Units"
    chart.x_axis.title = "Week"
    data = Reference(ws, min_col=4, min_row=45, max_col=4, max_row=45 + len(WEEKS))
    cats = Reference(ws, min_col=1, min_row=46, max_row=45 + len(WEEKS))
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.height = 8
    chart.width = 18
    ws.add_chart(chart, "I15")

    # Bar chart for cases
    bar = BarChart()
    bar.title = "Weekly total cases"
    bar.y_axis.title = "Cases"
    bar.x_axis.title = "Week"
    data2 = Reference(ws, min_col=5, min_row=45, max_col=5, max_row=45 + len(WEEKS))
    bar.add_data(data2, titles_from_data=True)
    bar.set_categories(cats)
    bar.height = 8
    bar.width = 18
    ws.add_chart(bar, "I35")

    # Hide helper area
    ws.row_dimensions[helper_start_row - 1].hidden = False
    # We will hide helper rows 60..159
    for r in range(helper_start_row, helper_start_row + 100):
        ws.row_dimensions[r].hidden = True

    set_col_widths(ws, [28, 18, 26, 18, 14, 14, 14, 4, 18, 18, 18])
    ws.sheet_view.showGridLines = False
    return ws


def build_cover(wb):
    ws = wb.create_sheet("Cover")
    title(ws, "MUV Sparkling Electrolyte RTD")
    ws["A2"] = "British Columbia launch forecasting model, 13 weeks, June through August 2026"
    ws["A2"].font = SECTION_FONT

    style_section(ws, 4, 1, "File identity")
    info = [
        ("Brand", "MUV"),
        ("Product", "Sparkling Electrolyte RTD"),
        ("Channels", "100 BC physical doors plus Amazon.ca plus Shopify DTC"),
        ("Horizon", "13 weeks, June 1 2026 through August 30 2026"),
        ("Owner", "Louis Nto, Organika Health Products"),
        ("Reporting cadence", "Weekly to CEO Aaron"),
        ("Model version", VERSION),
        ("Built on", BUILD_DATE),
    ]
    for i, (k, v) in enumerate(info):
        r = 5 + i
        ws.cell(row=r, column=1, value=k).font = Font(bold=True)
        ws.cell(row=r, column=2, value=v)

    style_section(ws, 15, 1, "Navigation")
    nav = [
        ("Inputs", "All editable assumptions live here"),
        ("Doors", "Master door list, 100 placeholder BC stores"),
        ("Velocity Grid", "Heart of the model, units per week per Door per SKU"),
        ("Bulk Edit", "Push values across many cells, last match wins"),
        ("Activations", "Activation calendar with modeled incremental units and ROI"),
        ("Online Forecast", "Amazon.ca and Shopify DTC weekly forecast"),
        ("Weekly Forecast", "Aggregations by week, SKU, region, banner, tier"),
        ("Production Calendar", "Back schedules POs to Bevmax using lead time"),
        ("Revenue and Margin", "Per SKU economics with full landed cost"),
        ("Trade Spend Allocation", "Per activation per SKU trade dollar mapping"),
        ("Sensitivity", "What if levers move by plus or minus 10 or 20 percent"),
        ("Scenarios", "Conservative Base Stretch multiplier toggle and snapshot blocks"),
        ("Risk Flags", "Automated checks, red on hard issues"),
        ("Dashboard", "CEO ready KPIs, trend, top doors, activation ROI"),
        ("Methodology", "How the math works and how to use the model"),
        ("Data Dictionary", "Every named range and what it means"),
        ("Calendar", "Week to date mapping for the 13 week horizon"),
        ("Probabilistic Forecast", "Monte Carlo P10 P50 P90 distribution and target probabilities"),
        ("Model Validation", "Independent recomputation audit with live comparison"),
        ("Executive Summary", "One screen narrative with cumulative trend"),
        ("DC Inventory", "Weekly inventory position with stockout flags"),
        ("Cohort Analysis", "Doors grouped by launch week with ramp matrix"),
        ("Cash Flow Timing", "Revenue and payment timing by week"),
        ("Promo PnL", "Per activation profit and loss with ROI multiple"),
        ("What If", "Interactive levers with implied outcome deltas"),
        ("Quarterly Rollup", "Month and quarter view for the board"),
        ("Action Items", "Launch readiness task tracker"),
        ("Pre Launch Checklist", "Go live readiness with completion percent"),
    ]
    ws.cell(row=16, column=1, value="Tab").font = Font(bold=True)
    ws.cell(row=16, column=2, value="What it contains").font = Font(bold=True)
    style_header_row(ws, 16, 2)
    for i, (tab, desc) in enumerate(nav):
        r = 17 + i
        ws.cell(row=r, column=1, value=tab)
        ws.cell(row=r, column=2, value=desc)

    # Version log
    vlog_hdr = 17 + len(nav) + 2
    style_section(ws, vlog_hdr, 1, "Version log")
    ws.cell(row=vlog_hdr + 1, column=1, value="Version").font = Font(bold=True)
    ws.cell(row=vlog_hdr + 1, column=2, value="Date").font = Font(bold=True)
    ws.cell(row=vlog_hdr + 1, column=3, value="Notes").font = Font(bold=True)
    style_header_row(ws, vlog_hdr + 1, 3)
    history = [
        ("1.0.0", "June 5 2026", "Initial 12 tab model with first generation functional SKU labels."),
        ("1.1.0", "June 5 2026", "SKUs switched to flavor names Lime Lemon, Pineapple Passion Fruit, Raspberry."),
        ("2.0.0", BUILD_DATE,
            "Enterprise rebuild. Added Cover, Methodology, Data Dictionary, Calendar, Sensitivity, Trade Spend Allocation tabs. "
            "Fixed bulk override to last match wins. Added fill rate, freight, slotting, distributor margin, MOQ, safety stock to Inputs. "
            "Added confidence ratings on velocity defaults. Activation ROI now modeled from uplift, not just trial units. "
            "Per SKU trade spend allocation. Online ramp curve separated from door ramp. Risk Flags expanded to 17 checks."),
        ("3.0.0", BUILD_DATE,
            "Operational and narrative layer. Added Executive Summary, DC Inventory, Cohort Analysis, Activation Gantt, "
            "Cash Flow Timing, Banner Performance, Regional Breakdown, Promo PnL, What If, Quarterly Rollup, "
            "Variance Tracker, Weekly Review, Action Items, Glossary, Pre Launch Checklist, Stakeholder Map."),
        ("4.0.0", BUILD_DATE,
            "Validation and probabilistic layer. Restructured slotting as an amortized launch investment so per unit margin "
            "is not distorted. Reconciled targets to Base output. Added independent recomputation in verify_model.py and a "
            "Model Validation tab. Confirmed the live formulas with a second method that evaluates the actual Excel formulas, "
            "both agree to the unit. Added a Monte Carlo Probabilistic Forecast with P10 P50 P90 and target probabilities. "
            "Swept all formula cells for evaluation errors and cleared the one internal reference warning."),
    ]
    for i, (v, d, n) in enumerate(history):
        r = vlog_hdr + 2 + i
        ws.cell(row=r, column=1, value=v).alignment = Alignment(vertical="top")
        ws.cell(row=r, column=2, value=d).alignment = Alignment(vertical="top")
        ws.cell(row=r, column=3, value=n).alignment = Alignment(vertical="top", wrap_text=True)
        ws.row_dimensions[r].height = 64

    set_col_widths(ws, [26, 60, 80])
    ws.sheet_view.showGridLines = False
    return ws


def build_methodology(wb):
    ws = wb.create_sheet("Methodology")
    title(ws, "Methodology and instructions")

    sections = [
        ("How the model is built", [
            "The Velocity Grid is the only source of truth for door volume. Every aggregation, every revenue number, every production schedule reads from it.",
            "Each cell starts as a formula that combines: tier and SKU default velocity, ramp curve based on weeks since launch, scenario multiplier, bulk edit override, and activation uplift.",
            "Overtyping a cell replaces the formula with a hard value. The cell highlights amber automatically via ISFORMULA conditional formatting.",
        ]),
        ("Edit precedence from highest to lowest", [
            "1. Manual override. Type a number into the Velocity Grid cell. This wins over everything.",
            "2. Bulk Edit. Last matching enabled rule wins, evaluated by row position.",
            "3. Activation uplift and post lift. Multiplicative against base.",
            "4. Scenario multiplier. Applied to base velocity.",
            "5. Ramp curve. Applied based on weeks since the door launch week.",
            "6. Default velocity by tier and SKU.",
        ]),
        ("Case math, locked", [
            "UNITS_PER_CASE is set to 24 on the Inputs tab. One case equals six four packs equals 24 cans.",
            "Cases round up at the door week SKU level before any summation. Partial cases do not ship.",
            "All case math uses CEILING or ROUNDUP at the cell level, never on aggregated totals.",
        ]),
        ("Economics and slotting treatment", [
            "Per unit margin on the Revenue and Margin tab covers COGS, freight, distributor margin, and trade spend. These scale with volume.",
            "Slotting is a one time fee per door, not a per unit cost. Charging all of it against a 13 week window understates true unit economics.",
            "The model shows operating contribution before slotting, then subtracts only the amortized share of slotting for the launch quarter. A memo line shows the fully loaded view if all slotting lands in the quarter.",
            "Read operating margin for unit economics health. Read net margin after amortized slotting for the quarter P and L. Read the fully loaded memo for the worst case cash view.",
        ]),
        ("Workflow for Louis", [
            "1. Replace the 100 placeholder rows on the Doors tab with the real door list.",
            "2. Validate wholesale pricing, COGS, freight, slotting on the Inputs tab against finance.",
            "3. Enter the activation calendar on the Activations tab. Use Door Scope = ALL, TIER_A, TIER_B, TIER_C, or a specific Door ID. SKU Scope = ALL or a specific flavor.",
            "4. Open Risk Flags. Resolve any red rows before sharing the file.",
            "5. Review the Dashboard with Aaron. Use Scenarios to flex Conservative versus Base versus Stretch.",
        ]),
        ("Color legend", [
            "Yellow fill: editable input cell. Change freely.",
            "Amber fill on Velocity Grid: manually overridden cell. Delete the cell to restore the formula.",
            "Red fill: failing risk check or capacity breach.",
            "Green fill: passing risk check.",
            "Dark blue fill with white text: section header.",
        ]),
        ("Resetting overrides", [
            "To restore a single cell to its formula, select the cell and press Delete. The formula needs to be re entered. The simplest way is to copy any adjacent formula cell and paste it into the cleared cell.",
            "To restore all overrides at once, rerun the build script. This is the cleanest reset.",
        ]),
        ("Known limitations", [
            "Scenario snapshot blocks on the Scenarios tab are paste only. Without macros, the workbook cannot programmatically copy values from the Velocity Grid into a snapshot block.",
            "Bulk Edit overlap resolution uses last match wins, which depends on row order. Keep rules sorted by intent.",
            "Activations Door Scope accepts only one value per row. To target two tiers, create two activation rows.",
        ]),
    ]
    r = 4
    for header, lines in sections:
        style_section(ws, r, 1, header)
        r += 1
        for line in lines:
            ws.cell(row=r, column=1, value=line).alignment = Alignment(wrap_text=True, vertical="top")
            ws.row_dimensions[r].height = 30
            r += 1
        r += 1

    set_col_widths(ws, [140])
    ws.sheet_view.showGridLines = False
    return ws


def build_data_dictionary(wb):
    ws = wb.create_sheet("Data Dictionary")
    title(ws, "Data dictionary")
    ws["A2"] = "Every named range in the workbook. Use these in formulas instead of cell references for stability."
    ws["A2"].font = NOTE_FONT

    headers = ["Named range", "Scope", "Type", "Definition"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    defs = [
        ("UNITS_PER_CASE", "Inputs!B5", "Scalar", "Locked at 24. Six four packs per case."),
        ("WHOLESALE_TABLE", "Inputs!B9:B11", "Range, 3 rows", "Wholesale price per case by flavor, in dollars."),
        ("COGS_TABLE", "Inputs!C9:C11", "Range, 3 rows", "COGS per case by flavor, in dollars."),
        ("BEVMAX_LEAD", "Inputs!B14", "Scalar", "Weeks from PO release to delivery."),
        ("BEVMAX_CAP", "Inputs!B15", "Scalar", "Maximum cases Bevmax can produce per week."),
        ("BEVMAX_MOQ", "Inputs!B46", "Scalar", "Minimum order quantity per Bevmax production run."),
        ("VELOCITY_TABLE", "Inputs!B19:D21", "Range, 3x3", "Steady state units per week by tier by flavor."),
        ("TIER_LIST", "Inputs!A19:A21", "Range, 3 rows", "Tier identifiers A, B, C in row order matching VELOCITY_TABLE."),
        ("SKU_LIST", "Inputs!A9:A11", "Range, 3 rows", "Flavor names in row order matching WHOLESALE_TABLE."),
        ("RAMP_W1", "Inputs!B24", "Scalar percent", "Door ramp percent of steady state in launch week 1."),
        ("RAMP_W2", "Inputs!B25", "Scalar percent", "Door ramp percent in launch week 2."),
        ("RAMP_W3", "Inputs!B26", "Scalar percent", "Door ramp percent in launch week 3."),
        ("RAMP_W4PLUS", "Inputs!B27", "Scalar percent", "Door ramp percent in launch week 4 and beyond."),
        ("ONLINE_RAMP_W1", "Inputs!B36", "Scalar percent", "Online ramp percent in week 1."),
        ("ONLINE_RAMP_W2", "Inputs!B37", "Scalar percent", "Online ramp percent in week 2."),
        ("ONLINE_RAMP_W3", "Inputs!B38", "Scalar percent", "Online ramp percent in week 3."),
        ("ONLINE_RAMP_W4PLUS", "Inputs!B39", "Scalar percent", "Online ramp percent in week 4 and beyond."),
        ("ONLINE_AMZ", "Inputs!B31:B33", "Range, 3 rows", "Amazon.ca steady state units per week by flavor."),
        ("ONLINE_DTC", "Inputs!C31:C33", "Range, 3 rows", "Shopify DTC steady state units per week by flavor."),
        ("FILL_RATE", "Inputs!B42", "Scalar percent", "Fraction of forecast units that actually ship."),
        ("FREIGHT_PER_CASE", "Inputs!B43", "Scalar dollars", "Freight cost per shipped case."),
        ("SLOTTING_PER_DOOR", "Inputs!B44", "Scalar dollars", "Slotting fee per authorized door, amortized."),
        ("DIST_MARGIN_PCT", "Inputs!B45", "Scalar percent", "Distributor margin percent, applied to gross revenue."),
        ("SAFETY_STOCK_WEEKS", "Inputs!B47", "Scalar", "Weeks of forward demand to hold at DC."),
        ("TARGET_CASES", "Inputs!B50", "Scalar", "13 week total cases target."),
        ("TARGET_REVENUE", "Inputs!B51", "Scalar dollars", "13 week gross revenue target."),
        ("TARGET_MARGIN_PCT", "Inputs!B52", "Scalar percent", "Required net contribution margin floor."),
        ("DOORS_ID", "Doors!A5:A104", "Range, 100 rows", "Door identifiers."),
        ("DOORS_BANNER", "Doors!B5:B104", "Range, 100 rows", "Banner name per door."),
        ("DOORS_NAME", "Doors!C5:C104", "Range, 100 rows", "Store name per door."),
        ("DOORS_REGION", "Doors!E5:E104", "Range, 100 rows", "Region per door."),
        ("DOORS_TIER", "Doors!F5:F104", "Range, 100 rows", "Tier A B or C per door."),
        ("DOORS_LIMELEMON", "Doors!G5:G104", "Range, 100 rows", "Lime Lemon authorization Y or N."),
        ("DOORS_PINEAPPLE", "Doors!H5:H104", "Range, 100 rows", "Pineapple Passion Fruit authorization Y or N."),
        ("DOORS_RASPBERRY", "Doors!I5:I104", "Range, 100 rows", "Raspberry authorization Y or N."),
        ("DOORS_LAUNCH", "Doors!J5:J104", "Range, 100 rows", "Launch week number for each door."),
        ("VG_UNITS_BLOCK", "Velocity Grid!J5:V304", "Range, 300x13", "Full units block for Velocity Grid."),
        ("VG_DOOR_ID", "Velocity Grid!B5:B304", "Range, 300 rows", "Door ID per Velocity Grid row."),
        ("VG_TIER", "Velocity Grid!F5:F304", "Range, 300 rows", "Tier per Velocity Grid row."),
        ("VG_SKU", "Velocity Grid!G5:G304", "Range, 300 rows", "Flavor per Velocity Grid row."),
        ("VG_AUTH", "Velocity Grid!H5:H304", "Range, 300 rows", "Authorization Y or N per Velocity Grid row."),
        ("VG_LAUNCH", "Velocity Grid!I5:I304", "Range, 300 rows", "Launch week per Velocity Grid row."),
        ("VG_W1 through VG_W13", "Velocity Grid columns J through V", "Range, 300 rows each", "Units per week column slices."),
        ("ACT_ID", "Activations!A5:A34", "Range, 30 rows", "Activation identifiers."),
        ("ACT_DOOR_SCOPE", "Activations!C5:C34", "Range, 30 rows", "Activation door scope value."),
        ("ACT_SKU_SCOPE", "Activations!D5:D34", "Range, 30 rows", "Activation SKU scope value."),
        ("ACT_START", "Activations!E5:E34", "Range, 30 rows", "Activation start week."),
        ("ACT_END", "Activations!F5:F34", "Range, 30 rows", "Activation end week."),
        ("ACT_UPLIFT", "Activations!G5:G34", "Range, 30 rows", "Activation uplift multiplier."),
        ("ACT_POSTLIFT", "Activations!H5:H34", "Range, 30 rows", "Permanent post activation lift percent."),
        ("ACT_TRIAL", "Activations!I5:I34", "Range, 30 rows", "Incremental trial units, flat add."),
        ("ACT_COST", "Activations!J5:J34", "Range, 30 rows", "Activation cost in dollars."),
        ("ACT_INC_UNITS", "Activations!K5:K34", "Range, 30 rows", "Modeled incremental units per activation."),
        ("ACT_INC_CASES", "Activations!L5:L34", "Range, 30 rows", "Modeled incremental cases per activation."),
        ("ACT_ROI", "Activations!M5:M34", "Range, 30 rows", "Incremental cases per dollar of activation spend."),
        ("BULK_ENABLED", "Bulk Edit!B5:B24", "Range, 20 rows", "Bulk rule enabled flag."),
        ("BULK_TIER", "Bulk Edit!C5:C24", "Range, 20 rows", "Bulk rule tier filter."),
        ("BULK_SKU", "Bulk Edit!D5:D24", "Range, 20 rows", "Bulk rule SKU filter."),
        ("BULK_START", "Bulk Edit!E5:E24", "Range, 20 rows", "Bulk rule start week."),
        ("BULK_END", "Bulk Edit!F5:F24", "Range, 20 rows", "Bulk rule end week."),
        ("BULK_VALUE", "Bulk Edit!G5:G24", "Range, 20 rows", "Bulk rule new units value."),
        ("ACTIVE_SCENARIO", "Scenarios!B5", "Scalar text", "Active scenario name."),
        ("SCEN_MULT_TABLE", "Scenarios!B9:D11", "Range, 3x3", "Scenario multipliers by SKU by scenario."),
        ("SCEN_NAMES", "Scenarios!B8:D8", "Range, 1x3", "Scenario name headers."),
        ("ACTIVE_MULT_TABLE", "Scenarios!B14:B16", "Range, 3 rows", "Resolved active scenario multiplier per SKU."),
        ("WF_WEEK_UNITS", "Weekly Forecast!E6:E18", "Range, 13 rows", "Weekly total units."),
        ("WF_WEEK_CASES", "Weekly Forecast!I6:I18", "Range, 13 rows", "Weekly total cases."),
        ("REV_GROSS_TOTAL", "Revenue and Margin", "Scalar", "Total gross revenue."),
        ("REV_TRADE_TOTAL", "Revenue and Margin", "Scalar", "Total trade spend pulled from Activations."),
        ("REV_NET_TOTAL", "Revenue and Margin", "Scalar", "Net contribution before brand and overhead."),
        ("REV_MARGIN_PCT", "Revenue and Margin", "Scalar percent", "Net contribution margin percent."),
        ("REV_TOTAL_CASES", "Revenue and Margin", "Scalar", "Total forecast cases all channels."),
        ("REV_CASES_SHIPPED", "Revenue and Margin", "Scalar", "Total shipped cases after fill rate."),
        ("WEEK_DATES", "Calendar!B5:B17", "Range, 13 rows", "Calendar Monday date for each week."),
    ]
    for i, (n, scope, typ, desc) in enumerate(defs):
        r = 5 + i
        ws.cell(row=r, column=1, value=n).font = Font(bold=True)
        ws.cell(row=r, column=2, value=scope)
        ws.cell(row=r, column=3, value=typ)
        ws.cell(row=r, column=4, value=desc).alignment = Alignment(wrap_text=True)
        ws.row_dimensions[r].height = 20

    set_col_widths(ws, [30, 30, 22, 80])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False
    return ws


def build_calendar(wb):
    ws = wb.create_sheet("Calendar")
    title(ws, "Calendar")
    ws["A2"] = (
        f"Week to date mapping. Week 1 starts {LAUNCH_START_LABEL}. Each week is Monday through Sunday. "
        "Edit the Week 1 anchor date below to shift the whole horizon."
    )
    ws["A2"].font = NOTE_FONT

    style_section(ws, 4, 1, "Week mapping")
    headers = ["Week", "Week start", "Week end", "Month", "Notes"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    # Anchor date for week 1
    ws.cell(row=5, column=1, value="W1")
    anchor = ws.cell(row=5, column=2, value=_anchor)
    anchor.fill = INPUT_FILL
    anchor.number_format = "yyyy-mm-dd"
    ws.cell(row=5, column=3, value="=B5+6").number_format = "yyyy-mm-dd"
    ws.cell(row=5, column=4, value="=TEXT(B5,\"mmmm yyyy\")")
    ws.cell(row=5, column=5, value="Launch week. Anchor cell.")
    for wi in range(1, len(WEEKS)):
        r = 5 + wi
        ws.cell(row=r, column=1, value=f"W{wi+1}")
        ws.cell(row=r, column=2, value=f"=B{r-1}+7").number_format = "yyyy-mm-dd"
        ws.cell(row=r, column=3, value=f"=B{r}+6").number_format = "yyyy-mm-dd"
        ws.cell(row=r, column=4, value=f'=TEXT(B{r},"mmmm yyyy")')
        if wi == 6:
            ws.cell(row=r, column=5, value="Mid horizon checkpoint.")

    wb.defined_names["WEEK_DATES"] = DefinedName("WEEK_DATES", attr_text="Calendar!$B$5:$B$17")
    wb.defined_names["WEEK_END_DATES"] = DefinedName("WEEK_END_DATES", attr_text="Calendar!$C$5:$C$17")

    # Quarter and month aggregations
    style_section(ws, 20, 1, "Month rollups, calendar cases")
    months = ["June 2026", "July 2026", "August 2026"]
    ws.cell(row=21, column=1, value="Month")
    ws.cell(row=21, column=2, value="Weeks")
    ws.cell(row=21, column=3, value="Cases doors")
    ws.cell(row=21, column=4, value="Cases online")
    ws.cell(row=21, column=5, value="Cases total")
    style_header_row(ws, 21, 5)
    # Month assignment: W1..W4 mostly June, W5..W9 July, W10..W13 August
    month_weeks = {
        "June 2026": [1, 2, 3, 4],
        "July 2026": [5, 6, 7, 8, 9],
        "August 2026": [10, 11, 12, 13],
    }
    for i, m in enumerate(months):
        r = 22 + i
        weeks_str = ", ".join([f"W{w}" for w in month_weeks[m]])
        ws.cell(row=r, column=1, value=m)
        ws.cell(row=r, column=2, value=weeks_str)
        # Cases from Weekly Forecast I column row 6 + (w-1)
        case_rows = [f"'Weekly Forecast'!I{6+w-1}" for w in month_weeks[m]]
        ws.cell(row=r, column=3, value=f"={'+'.join(case_rows)}").number_format = "#,##0"
        online_rows = []
        for w in month_weeks[m]:
            online_col = get_column_letter(3 + w - 1)
            for row in range(5, 11):
                online_rows.append(f"ROUNDUP('Online Forecast'!{online_col}{row}/UNITS_PER_CASE,0)")
        ws.cell(row=r, column=4, value=f"={'+'.join(online_rows)}").number_format = "#,##0"
        ws.cell(row=r, column=5, value=f"=C{r}+D{r}").number_format = "#,##0"

    set_col_widths(ws, [10, 16, 16, 18, 14, 40])
    ws.sheet_view.showGridLines = False
    return ws


def build_trade_spend_allocation(wb):
    ws = wb.create_sheet("Trade Spend Allocation")
    title(ws, "Trade spend allocation by activation by SKU")
    ws["A2"] = (
        "Per activation breakdown. Direct cost lands on the scoped SKU. ALL scope cost apportions across "
        "Lime Lemon, Pineapple Passion Fruit, and Raspberry by gross revenue share."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Activation ID", "Type", "SKU Scope", "Cost", "Lime Lemon", "Pineapple Passion Fruit", "Raspberry"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for i in range(N_ACTIVATION_ROWS):
        r = 5 + i
        act_row = 5 + i
        ws.cell(row=r, column=1, value=f"=Activations!A{act_row}")
        ws.cell(row=r, column=2, value=f"=Activations!B{act_row}")
        ws.cell(row=r, column=3, value=f"=Activations!D{act_row}")
        ws.cell(row=r, column=4, value=f"=IFERROR(Activations!J{act_row},0)").number_format = '"$"#,##0'
        for si, sku in enumerate(SKUS):
            col = 5 + si
            ws.cell(row=r, column=col,
                    value=f'=IFERROR(IF(C{r}="{sku}",D{r},'
                          f'IF(C{r}="ALL",D{r}*INDEX(WHOLESALE_TABLE,{si+1})/SUM(WHOLESALE_TABLE),0)),0)'
                    ).number_format = '"$"#,##0'

    # Totals
    tot_r = 5 + N_ACTIVATION_ROWS
    ws.cell(row=tot_r, column=1, value="Total")
    ws.cell(row=tot_r, column=1).font = Font(bold=True)
    for col in range(4, 8):
        col_letter = get_column_letter(col)
        ws.cell(row=tot_r, column=col,
                value=f"=SUM({col_letter}5:{col_letter}{tot_r-1})").number_format = '"$"#,##0'
        ws.cell(row=tot_r, column=col).font = Font(bold=True)

    set_col_widths(ws, [14, 22, 18, 14, 18, 26, 18])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False
    return ws


def build_sensitivity(wb):
    ws = wb.create_sheet("Sensitivity")
    title(ws, "Sensitivity analysis")
    ws["A2"] = (
        "Lever sensitivity on total cases, revenue, and net contribution. "
        "Each row shows the effect of moving one input by the indicated delta while holding everything else flat. "
        "Use these to size where a forecast miss would come from."
    )
    ws["A2"].font = NOTE_FONT

    style_section(ws, 4, 1, "One variable sensitivity")
    headers = ["Lever", "Base value", "Delta", "Modeled cases impact", "Modeled revenue impact", "Modeled margin impact"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=5, column=j, value=h)
    style_header_row(ws, 5, len(headers))

    # Rows: each lever, three delta points (minus 10, minus 5, plus 5, plus 10)
    # Compute impact analytically using ratios where possible.
    # Impact on cases: if a lever scales velocity linearly, percent delta * total cases.
    # Average wholesale across SKUs for revenue impact.
    sens_rows = [
        ("Tier A velocity", "Average of Tier A velocities", "VELOCITY_TABLE row 1", [-0.10, -0.05, 0.05, 0.10],
            "tier_a_share_of_total"),
        ("Tier B velocity", "Average of Tier B velocities", "VELOCITY_TABLE row 2", [-0.10, -0.05, 0.05, 0.10],
            "tier_b_share_of_total"),
        ("Tier C velocity", "Average of Tier C velocities", "VELOCITY_TABLE row 3", [-0.10, -0.05, 0.05, 0.10],
            "tier_c_share_of_total"),
        ("Online Amazon baseline", "Average across SKUs", "ONLINE_AMZ", [-0.20, -0.10, 0.10, 0.20], "online_share"),
        ("Online Shopify baseline", "Average across SKUs", "ONLINE_DTC", [-0.20, -0.10, 0.10, 0.20], "online_share"),
        ("Ramp curve W1", "Door ramp week 1", "RAMP_W1", [-0.20, -0.10, 0.10, 0.20], "ramp1"),
        ("Fill rate", "Fraction shipped", "FILL_RATE", [-0.05, -0.02, 0.02, 0.05], "fill"),
        ("Wholesale price", "Average price per case", "WHOLESALE_TABLE", [-0.05, 0.05, 0.10, 0.15], "wholesale"),
        ("COGS per case", "Average COGS per case", "COGS_TABLE", [-0.05, 0.05, 0.10, 0.15], "cogs"),
    ]

    # Helper: precompute "shares" using SUMIF on VG_TIER and VG_UNITS_BLOCK.
    # Tier share of total units:
    tier_share_formulas = {
        "tier_a_share_of_total": f'IFERROR(SUMPRODUCT((VG_TIER="A")*({"+".join(["VG_W"+str(w) for w in WEEKS])}))/SUM(VG_UNITS_BLOCK),0)',
        "tier_b_share_of_total": f'IFERROR(SUMPRODUCT((VG_TIER="B")*({"+".join(["VG_W"+str(w) for w in WEEKS])}))/SUM(VG_UNITS_BLOCK),0)',
        "tier_c_share_of_total": f'IFERROR(SUMPRODUCT((VG_TIER="C")*({"+".join(["VG_W"+str(w) for w in WEEKS])}))/SUM(VG_UNITS_BLOCK),0)',
        "online_share": "0.20",  # placeholder, refined below
        "ramp1": "0.10",  # rough
        "fill": "1",
        "wholesale": "1",
        "cogs": "1",
    }

    r = 6
    for label, base_desc, base_ref, deltas, share_key in sens_rows:
        for d in deltas:
            ws.cell(row=r, column=1, value=label)
            ws.cell(row=r, column=2, value=base_desc)
            ws.cell(row=r, column=3, value=d).number_format = "+0%;-0%;0%"
            if share_key in ("tier_a_share_of_total", "tier_b_share_of_total", "tier_c_share_of_total"):
                # Cases impact = delta * tier share * total cases
                ws.cell(row=r, column=4,
                        value=f"=ROUND({d}*{tier_share_formulas[share_key]}*REV_TOTAL_CASES,0)").number_format = "+#,##0;-#,##0;0"
                ws.cell(row=r, column=5,
                        value=f"=D{r}*AVERAGE(WHOLESALE_TABLE)").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
                ws.cell(row=r, column=6,
                        value=f"=D{r}*(AVERAGE(WHOLESALE_TABLE)-AVERAGE(COGS_TABLE)-FREIGHT_PER_CASE)").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
            elif label.startswith("Online"):
                # Cases impact = delta * live online share * total cases
                ws.cell(row=r, column=4,
                        value=f"=ROUND({d}*IFERROR(ONLINE_TOTAL_CASES/REV_TOTAL_CASES,0)*REV_TOTAL_CASES,0)").number_format = "+#,##0;-#,##0;0"
                ws.cell(row=r, column=5,
                        value=f"=D{r}*AVERAGE(WHOLESALE_TABLE)").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
                ws.cell(row=r, column=6,
                        value=f"=D{r}*(AVERAGE(WHOLESALE_TABLE)-AVERAGE(COGS_TABLE)-FREIGHT_PER_CASE)").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
            elif share_key == "ramp1":
                # Cases impact = delta * RAMP_W1 / sum of all ramp weeks * total cases approximation
                ws.cell(row=r, column=4,
                        value=f"=ROUND({d}*RAMP_W1/(RAMP_W1+RAMP_W2+RAMP_W3+10*RAMP_W4PLUS)*REV_TOTAL_CASES,0)").number_format = "+#,##0;-#,##0;0"
                ws.cell(row=r, column=5,
                        value=f"=D{r}*AVERAGE(WHOLESALE_TABLE)").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
                ws.cell(row=r, column=6,
                        value=f"=D{r}*(AVERAGE(WHOLESALE_TABLE)-AVERAGE(COGS_TABLE)-FREIGHT_PER_CASE)").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
            elif share_key == "fill":
                # Cases impact: shipped cases scales linearly with fill rate
                ws.cell(row=r, column=4,
                        value=f"=ROUND({d}*REV_TOTAL_CASES,0)").number_format = "+#,##0;-#,##0;0"
                ws.cell(row=r, column=5,
                        value=f"=D{r}*AVERAGE(WHOLESALE_TABLE)").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
                ws.cell(row=r, column=6,
                        value=f"=D{r}*(AVERAGE(WHOLESALE_TABLE)-AVERAGE(COGS_TABLE)-FREIGHT_PER_CASE)").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
            elif share_key == "wholesale":
                # No cases impact, only revenue and margin
                ws.cell(row=r, column=4, value=0).number_format = "+#,##0;-#,##0;0"
                ws.cell(row=r, column=5,
                        value=f"=REV_CASES_SHIPPED*AVERAGE(WHOLESALE_TABLE)*{d}").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
                ws.cell(row=r, column=6,
                        value=f"=REV_CASES_SHIPPED*AVERAGE(WHOLESALE_TABLE)*{d}").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
            elif share_key == "cogs":
                ws.cell(row=r, column=4, value=0).number_format = "+#,##0;-#,##0;0"
                ws.cell(row=r, column=5, value=0).number_format = '"$"+#,##0;"$"-#,##0;"$"0'
                ws.cell(row=r, column=6,
                        value=f"=-REV_CASES_SHIPPED*AVERAGE(COGS_TABLE)*{d}").number_format = '"$"+#,##0;"$"-#,##0;"$"0'
            r += 1
        r += 1  # blank separator

    # Note
    note_r = r + 1
    ws.cell(row=note_r, column=1, value=(
        "These are first order linear approximations. They do not capture interaction effects across activations, "
        "scenario multipliers, or banner mix shifts. For full nonlinear analysis, run multiple scenarios and compare."
    )).font = NOTE_FONT

    set_col_widths(ws, [28, 32, 12, 22, 22, 22])
    ws.sheet_view.showGridLines = False
    return ws


def build_production_smoothing(wb):
    ws = wb.create_sheet("Production Smoothing")
    title(ws, "Production smoothing recommendations")
    ws["A2"] = (
        "Identifies weeks where required cases exceed Bevmax capacity and suggests pull forward quantities "
        "from prior weeks that have headroom. Aim for capacity utilization below 100 percent every week."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Week", "Calendar date", "Required cases", "Capacity",
               "Utilization percent", "Headroom", "Pull forward suggested", "Status"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for wi, w in enumerate(WEEKS):
        r = 5 + wi
        ws.cell(row=r, column=1, value=f"W{w}")
        ws.cell(row=r, column=2, value=f"=Calendar!B{5+wi}").number_format = "yyyy-mm-dd"
        ws.cell(row=r, column=3, value=f"='Production Calendar'!D{5+wi}").number_format = "#,##0"
        ws.cell(row=r, column=4, value="=BEVMAX_CAP").number_format = "#,##0"
        ws.cell(row=r, column=5, value=f"=IFERROR(C{r}/D{r},0)").number_format = "0%"
        ws.cell(row=r, column=6, value=f"=D{r}-C{r}").number_format = "#,##0"
        ws.cell(row=r, column=7, value=f"=MAX(0,C{r}-D{r})").number_format = "#,##0"
        ws.cell(row=r, column=8,
                value=f'=IF(C{r}>D{r},"Over capacity",IF(C{r}/D{r}>=0.9,"Watch","OK"))')

    last_r = 4 + len(WEEKS)
    ws.conditional_formatting.add(
        f"E5:E{last_r}",
        CellIsRule(operator="greaterThan", formula=["1"], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"E5:E{last_r}",
        CellIsRule(operator="between", formula=["0.9", "1"], fill=PatternFill("solid", fgColor="FFEB9C")),
    )
    ws.conditional_formatting.add(
        f"H5:H{last_r}",
        FormulaRule(formula=[f'$H5="Over capacity"'], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"H5:H{last_r}",
        FormulaRule(formula=[f'$H5="Watch"'], fill=PatternFill("solid", fgColor="FFEB9C")),
    )
    ws.conditional_formatting.add(
        f"H5:H{last_r}",
        FormulaRule(formula=[f'$H5="OK"'], fill=OK_FILL),
    )

    set_col_widths(ws, [10, 16, 18, 14, 18, 14, 22, 18])
    ws.sheet_view.showGridLines = False
    return ws


def build_executive_summary(wb):
    ws = wb.create_sheet("Executive Summary")
    title(ws, "Executive Summary")
    ws["A2"] = "One screen narrative for Aaron. Updates live from every other tab."
    ws["A2"].font = NOTE_FONT

    # Headline metrics
    style_section(ws, 4, 1, "Headline")
    metrics = [
        ("Active scenario", "=ACTIVE_SCENARIO", ""),
        ("Total forecast cases all channels", "=REV_TOTAL_CASES", "#,##0"),
        ("Versus target cases",
            "=IFERROR(REV_TOTAL_CASES/TARGET_CASES,0)", "0%"),
        ("Forecast gross revenue", "=REV_GROSS_TOTAL", '"$"#,##0'),
        ("Versus target revenue",
            "=IFERROR(REV_GROSS_TOTAL/TARGET_REVENUE,0)", "0%"),
        ("Operating contribution before slotting", "=REV_OPERATING_CONTRIB", '"$"#,##0'),
        ("Slotting one time launch investment", "=REV_SLOTTING_TOTAL", '"$"#,##0'),
        ("Net contribution after amortized slotting", "=REV_NET_TOTAL", '"$"#,##0'),
        ("Net contribution margin percent", "=REV_MARGIN_PCT", "0.0%"),
        ("Versus target margin",
            "=IFERROR(REV_MARGIN_PCT/TARGET_MARGIN_PCT,0)", "0%"),
        ("Total trade spend",
            "=SUM(ACT_COST)", '"$"#,##0'),
        ("Effective trade percent",
            "=IFERROR(SUM(ACT_COST)/REV_GROSS_TOTAL,0)", "0.0%"),
        ("Modeled incremental cases from activations",
            "=SUM(ACT_INC_CASES)", "#,##0"),
        ("Blended activation ROI cases per dollar",
            '=IFERROR(SUM(ACT_INC_CASES)/SUM(ACT_COST),0)', "0.00"),
        ("Online share of total cases",
            "=IFERROR(ONLINE_TOTAL_CASES/REV_TOTAL_CASES,0)", "0%"),
        ("Authorized rows with zero forecast",
            f'=SUMPRODUCT((VG_AUTH="Y")*(({"+".join(["VG_W"+str(w) for w in WEEKS])})=0))',
            "#,##0"),
        ("Production weeks over Bevmax capacity",
            f"=COUNTIF('Production Calendar'!D5:D{4+len(WEEKS)},\">\"&BEVMAX_CAP)", "#,##0"),
    ]
    for i, (label, formula, fmt) in enumerate(metrics):
        r = 5 + i
        ws.cell(row=r, column=1, value=label).font = Font(bold=True)
        c = ws.cell(row=r, column=2, value=formula)
        if fmt:
            c.number_format = fmt
        c.font = Font(bold=True, color="1F3A5F", size=12)

    # Headline call out text
    style_section(ws, 4, 4, "Status")
    ws.cell(row=5, column=4,
            value='=IF(REV_TOTAL_CASES>=TARGET_CASES,"Cases on track","Cases behind target")').font = Font(bold=True)
    ws.cell(row=6, column=4,
            value='=IF(REV_GROSS_TOTAL>=TARGET_REVENUE,"Revenue on track","Revenue behind target")').font = Font(bold=True)
    ws.cell(row=7, column=4,
            value='=IF(REV_MARGIN_PCT>=TARGET_MARGIN_PCT,"Margin on floor","Margin below floor")').font = Font(bold=True)
    ws.cell(row=8, column=4,
            value=f'=IF(COUNTIF(\'Production Calendar\'!D5:D{4+len(WEEKS)},">"&BEVMAX_CAP)=0,"Capacity clean","Capacity breach detected")').font = Font(bold=True)
    ws.conditional_formatting.add("D5:D8", FormulaRule(formula=['ISNUMBER(SEARCH("track",D5))+ISNUMBER(SEARCH("floor",D5))+ISNUMBER(SEARCH("clean",D5))>0'], fill=OK_FILL))
    ws.conditional_formatting.add("D5:D8", FormulaRule(formula=['ISNUMBER(SEARCH("behind",D5))+ISNUMBER(SEARCH("below",D5))+ISNUMBER(SEARCH("breach",D5))>0'], fill=WARN_FILL))

    # Cumulative weekly trend
    style_section(ws, 22, 1, "Cumulative cases by week")
    ws.cell(row=23, column=1, value="Week")
    ws.cell(row=23, column=2, value="Calendar date")
    ws.cell(row=23, column=3, value="Weekly cases")
    ws.cell(row=23, column=4, value="Cumulative cases")
    ws.cell(row=23, column=5, value="Versus paced target")
    style_header_row(ws, 23, 5)
    for wi, w in enumerate(WEEKS):
        r = 24 + wi
        ws.cell(row=r, column=1, value=f"W{w}")
        ws.cell(row=r, column=2, value=f"=Calendar!B{5+wi}").number_format = "yyyy-mm-dd"
        # Weekly total cases from Weekly Forecast + Online
        online_col = get_column_letter(3 + wi)
        ws.cell(row=r, column=3,
                value=(
                    f"='Weekly Forecast'!I{6+wi}+"
                    + "+".join([f"ROUNDUP('Online Forecast'!{online_col}{rr}/UNITS_PER_CASE,0)" for rr in range(5,11)])
                )).number_format = "#,##0"
        if wi == 0:
            ws.cell(row=r, column=4, value=f"=C{r}").number_format = "#,##0"
        else:
            ws.cell(row=r, column=4, value=f"=D{r-1}+C{r}").number_format = "#,##0"
        paced = (w / 13)
        ws.cell(row=r, column=5, value=f"=IFERROR(D{r}/(TARGET_CASES*{paced}),0)").number_format = "0%"

    # Chart cumulative
    line = LineChart()
    line.title = "Cumulative cases versus paced target"
    line.y_axis.title = "Cases"
    line.x_axis.title = "Week"
    cum_data = Reference(ws, min_col=4, min_row=23, max_col=4, max_row=23 + len(WEEKS))
    cats = Reference(ws, min_col=1, min_row=24, max_row=23 + len(WEEKS))
    line.add_data(cum_data, titles_from_data=True)
    line.set_categories(cats)
    line.height = 8
    line.width = 18
    ws.add_chart(line, "G22")

    # Key risks
    style_section(ws, 40, 1, "Top watch items")
    risks = [
        "Slotting timing. Slotting is a one time launch investment. The launch quarter absorbs only its amortized share on the Revenue and Margin tab. On a fully loaded basis where all slotting hits the quarter, contribution can turn negative. This is an investment timing effect, not a unit economics problem. Operating margin before slotting is healthy.",
        "Bevmax capacity utilization. Confirm Production Smoothing tab shows no week over 100 percent before locking the plan.",
        "Activation ROI assumptions. Every activation should have a non blank uplift and modeled incremental cases on the Activations tab.",
        "Door list completeness. The Doors tab still contains placeholder rows. Replace with authoritative banner data before going to CEO.",
        "Targets are editable placeholders reconciled to the Base model output. Replace with the real CEO ask on the Inputs tab.",
    ]
    for i, r in enumerate(risks):
        ws.cell(row=41 + i, column=1, value=f"{i+1}. {r}").alignment = Alignment(wrap_text=True, vertical="top")
        ws.row_dimensions[41 + i].height = 44

    set_col_widths(ws, [44, 22, 4, 32, 4, 22, 22, 22, 22])
    ws.sheet_view.showGridLines = False
    return ws


def build_dc_inventory(wb):
    ws = wb.create_sheet("DC Inventory")
    title(ws, "DC inventory simulation")
    ws["A2"] = (
        "Weekly inventory position at the distribution center. Inflow is production delivery from Bevmax. "
        "Outflow is shipped cases to retailers and online. Safety stock floor pulls from Inputs. "
        "Stockout weeks flag in red. Opening inventory is editable to reflect actual on hand."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Week", "Calendar date", "Opening inventory", "Production inflow",
               "Demand outflow", "Closing inventory", "Safety stock floor",
               "Headroom versus safety", "Status"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    # Opening inventory in W1 is an editable input
    ws.cell(row=5, column=1, value="W1")
    ws.cell(row=5, column=2, value=f"=Calendar!B5").number_format = "yyyy-mm-dd"
    opening = ws.cell(row=5, column=3, value=2000)
    opening.fill = INPUT_FILL
    opening.number_format = "#,##0"

    # Production inflow: scheduled delivery for that week, equal to required cases (lead-time-shifted PO delivery)
    # We approximate inflow = Production Calendar required cases for that week.
    for wi, w in enumerate(WEEKS):
        r = 5 + wi
        if wi > 0:
            ws.cell(row=r, column=1, value=f"W{w}")
            ws.cell(row=r, column=2, value=f"=Calendar!B{5+wi}").number_format = "yyyy-mm-dd"
            ws.cell(row=r, column=3, value=f"=F{r-1}").number_format = "#,##0"
        ws.cell(row=r, column=4, value=f"='Production Calendar'!D{5+wi}").number_format = "#,##0"
        # Demand outflow = required cases shipped (same week assumption, fill rate applied)
        ws.cell(row=r, column=5, value=f"=ROUND('Production Calendar'!D{5+wi}*FILL_RATE,0)").number_format = "#,##0"
        ws.cell(row=r, column=6, value=f"=MAX(0,C{r}+D{r}-E{r})").number_format = "#,##0"
        # Safety stock floor = SAFETY_STOCK_WEEKS times next week demand where it
        # exists, else this week demand. Avoids OFFSET so no internal reference error.
        if wi < len(WEEKS) - 1:
            ws.cell(row=r, column=7,
                    value=f"='Production Calendar'!D{5+wi+1}*SAFETY_STOCK_WEEKS").number_format = "#,##0"
        else:
            ws.cell(row=r, column=7,
                    value=f"='Production Calendar'!D{5+wi}*SAFETY_STOCK_WEEKS").number_format = "#,##0"
        ws.cell(row=r, column=8, value=f"=F{r}-G{r}").number_format = "#,##0"
        ws.cell(row=r, column=9,
                value=f'=IF(F{r}=0,"Stockout",IF(F{r}<G{r},"Below safety","OK"))')

    last_r = 4 + len(WEEKS)
    ws.conditional_formatting.add(
        f"I5:I{last_r}",
        FormulaRule(formula=[f'$I5="Stockout"'], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"I5:I{last_r}",
        FormulaRule(formula=[f'$I5="Below safety"'], fill=PatternFill("solid", fgColor="FFEB9C")),
    )
    ws.conditional_formatting.add(
        f"I5:I{last_r}",
        FormulaRule(formula=[f'$I5="OK"'], fill=OK_FILL),
    )

    set_col_widths(ws, [10, 16, 18, 18, 18, 18, 18, 22, 18])
    ws.sheet_view.showGridLines = False
    return ws


def build_cohort_analysis(wb):
    ws = wb.create_sheet("Cohort Analysis")
    title(ws, "Cohort analysis")
    ws["A2"] = (
        "Doors grouped by launch week. Each cohort row shows how that cohort ramps over its first 13 weeks since launch. "
        "Use this to spot if early cohorts behave differently than later ones."
    )
    ws["A2"].font = NOTE_FONT

    style_section(ws, 4, 1, "Cohorts by launch week")
    ws.cell(row=5, column=1, value="Launch week")
    ws.cell(row=5, column=2, value="Doors in cohort")
    ws.cell(row=5, column=3, value="Total cohort cases")
    ws.cell(row=5, column=4, value="Average cases per door")
    style_header_row(ws, 5, 4)

    for wi, w in enumerate(WEEKS):
        r = 6 + wi
        ws.cell(row=r, column=1, value=f"W{w}")
        ws.cell(row=r, column=2, value=f'=COUNTIF(DOORS_LAUNCH,{w})').number_format = "#,##0"
        # Total cohort cases = SUM across VG rows where launch matches, of ROUNDUP per week
        case_parts = "+".join([
            f'SUMPRODUCT((VG_LAUNCH={w})*(VG_W{ww}>0)'
            f'*(CEILING(VG_W{ww},UNITS_PER_CASE)/UNITS_PER_CASE))' for ww in WEEKS
        ])
        ws.cell(row=r, column=3, value=f"={case_parts}").number_format = "#,##0"
        ws.cell(row=r, column=4,
                value=f"=IFERROR(C{r}/(B{r}*3),0)").number_format = "0.0"

    # Cohort ramp matrix: row per cohort, column per weeks since launch
    style_section(ws, 22, 1, "Cohort ramp matrix, units per door per weeks since launch")
    ws.cell(row=23, column=1, value="Cohort launch week")
    for wi in range(13):
        ws.cell(row=23, column=2 + wi, value=f"L+{wi}")
    style_header_row(ws, 23, 14)
    for wi, w in enumerate(WEEKS):
        r = 24 + wi
        ws.cell(row=r, column=1, value=f"W{w}")
        n_doors_formula = f'COUNTIF(DOORS_LAUNCH,{w})'
        for lwsl in range(13):
            target_week = w + lwsl
            if target_week > 13:
                ws.cell(row=r, column=2 + lwsl, value="").alignment = Alignment(horizontal="center")
            else:
                ws.cell(row=r, column=2 + lwsl,
                        value=f"=IFERROR(SUMPRODUCT((VG_LAUNCH={w})*VG_W{target_week})/MAX(1,{n_doors_formula}*3),0)").number_format = "0.0"

    set_col_widths(ws, [22, 18, 22, 22] + [10] * 10)
    ws.freeze_panes = "B6"
    ws.sheet_view.showGridLines = False
    return ws


def build_activation_gantt(wb):
    ws = wb.create_sheet("Activation Gantt")
    title(ws, "Activation Gantt")
    ws["A2"] = "Visual timeline of activation events across the 13 week horizon. Filled cell means active in that week."
    ws["A2"].font = NOTE_FONT

    headers = ["Activation ID", "Type", "Door Scope", "SKU Scope", "Uplift",
               "Trial Units", "Cost"] + [f"W{w}" for w in WEEKS]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for i in range(N_ACTIVATION_ROWS):
        r = 5 + i
        act_row = 5 + i
        ws.cell(row=r, column=1, value=f"=Activations!A{act_row}")
        ws.cell(row=r, column=2, value=f"=Activations!B{act_row}")
        ws.cell(row=r, column=3, value=f"=Activations!C{act_row}")
        ws.cell(row=r, column=4, value=f"=Activations!D{act_row}")
        ws.cell(row=r, column=5, value=f"=Activations!G{act_row}").number_format = "0.00"
        ws.cell(row=r, column=6, value=f"=Activations!I{act_row}").number_format = "#,##0"
        ws.cell(row=r, column=7, value=f"=Activations!J{act_row}").number_format = '"$"#,##0'
        for wi, w in enumerate(WEEKS):
            col = 8 + wi
            ws.cell(row=r, column=col,
                    value=f'=IF(AND(Activations!$E{act_row}<={w},Activations!$F{act_row}>={w},Activations!$E{act_row}>0),"X","")').alignment = Alignment(horizontal="center")

    # Conditional formatting on weeks columns
    week_start_col = get_column_letter(8)
    week_end_col = get_column_letter(7 + len(WEEKS))
    rng = f"{week_start_col}5:{week_end_col}{4+N_ACTIVATION_ROWS}"
    ws.conditional_formatting.add(
        rng,
        FormulaRule(formula=[f'{week_start_col}5="X"'], fill=PatternFill("solid", fgColor="A9D08E")),
    )

    set_col_widths(ws, [14, 22, 16, 22, 12, 14, 14] + [6] * len(WEEKS))
    ws.freeze_panes = "H5"
    ws.sheet_view.showGridLines = False
    return ws


def build_cash_flow(wb):
    ws = wb.create_sheet("Cash Flow Timing")
    title(ws, "Cash flow timing")
    ws["A2"] = (
        "Maps revenue and supplier payments to weeks based on retailer payment terms and Bevmax payment terms. "
        "Use to see when cash hits and when cash goes out. Editable terms in the input cells below."
    )
    ws["A2"].font = NOTE_FONT

    # Inputs
    style_section(ws, 4, 1, "Payment terms")
    ws["A5"] = "Retailer net days"
    ws["B5"] = 45
    ws["B5"].fill = INPUT_FILL
    ws["B5"].number_format = "0"
    ws["D5"] = "Average days from invoice to payment from retailer. Common BC grocery is net 30 to 60."
    ws["D5"].font = NOTE_FONT
    ws["A6"] = "Online net days"
    ws["B6"] = 7
    ws["B6"].fill = INPUT_FILL
    ws["B6"].number_format = "0"
    ws["D6"] = "Amazon and Shopify cycles, weekly to biweekly."
    ws["D6"].font = NOTE_FONT
    ws["A7"] = "Bevmax payment days"
    ws["B7"] = 30
    ws["B7"].fill = INPUT_FILL
    ws["B7"].number_format = "0"
    ws["D7"] = "Days after invoice from Bevmax that we pay them."
    ws["D7"].font = NOTE_FONT
    wb.defined_names["RETAIL_TERMS"] = DefinedName("RETAIL_TERMS", attr_text="'Cash Flow Timing'!$B$5")
    wb.defined_names["ONLINE_TERMS"] = DefinedName("ONLINE_TERMS", attr_text="'Cash Flow Timing'!$B$6")
    wb.defined_names["BEVMAX_TERMS"] = DefinedName("BEVMAX_TERMS", attr_text="'Cash Flow Timing'!$B$7")

    # Weekly cash flow table
    style_section(ws, 9, 1, "Weekly cash flow")
    headers = ["Week", "Calendar date", "Cash in from doors", "Cash in from online",
               "Cash out for Bevmax", "Cash out for trade", "Net cash", "Cumulative cash"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=10, column=j, value=h)
    style_header_row(ws, 10, len(headers))

    for wi, w in enumerate(WEEKS):
        r = 11 + wi
        ws.cell(row=r, column=1, value=f"W{w}")
        ws.cell(row=r, column=2, value=f"=Calendar!B{5+wi}").number_format = "yyyy-mm-dd"
        # Cash in from doors: revenue from shipments W weeks ago where lag matches retail terms / 7
        # Simplified: shipments_week = w - ROUND(retail_terms/7, 0)
        ship_week_door = f"{w}-ROUND(RETAIL_TERMS/7,0)"
        ws.cell(row=r, column=3,
                value=(
                    f'=IFERROR(IF({ship_week_door}<1,0,'
                    f'(IFERROR(INDEX(\'Weekly Forecast\'!$I$6:$I${5+len(WEEKS)},{ship_week_door}),0))'
                    f'*AVERAGE(WHOLESALE_TABLE)*FILL_RATE),0)'
                )).number_format = '"$"#,##0'
        # Cash in from online: lag online weekly cases by online terms
        ship_week_online = f"{w}-ROUND(ONLINE_TERMS/7,0)"
        # Online weekly cases per week is sum over 6 channel rows of ROUNDUP of online units / 24
        online_cases_formula_parts = []
        for ow in WEEKS:
            ow_col = get_column_letter(3 + ow - 1)
            part = "+".join([f"ROUNDUP('Online Forecast'!{ow_col}{rr}/UNITS_PER_CASE,0)" for rr in range(5,11)])
            online_cases_formula_parts.append(part)
        # Use CHOOSE on ship_week to pick the right week's online cases
        choose_args = ",".join([f"({p})" for p in online_cases_formula_parts])
        ws.cell(row=r, column=4,
                value=(
                    f'=IFERROR(IF({ship_week_online}<1,0,'
                    f'CHOOSE({ship_week_online},{choose_args})*AVERAGE(WHOLESALE_TABLE)),0)'
                )).number_format = '"$"#,##0'
        # Cash out for Bevmax: production cases this week * COGS_avg, paid after BEVMAX_TERMS days
        pay_week = f"{w}-ROUND(BEVMAX_TERMS/7,0)"
        ws.cell(row=r, column=5,
                value=(
                    f'=IFERROR(IF({pay_week}<1,0,'
                    f'(IFERROR(INDEX(\'Production Calendar\'!$D$5:$D${4+len(WEEKS)},{pay_week}),0))'
                    f'*AVERAGE(COGS_TABLE)),0)'
                )).number_format = '"$"#,##0'
        # Cash out for trade: activations whose start week equals this week
        ws.cell(row=r, column=6,
                value=f'=SUMPRODUCT((ACT_START={w})*ACT_COST)').number_format = '"$"#,##0'
        ws.cell(row=r, column=7, value=f"=C{r}+D{r}-E{r}-F{r}").number_format = '"$"#,##0'
        if wi == 0:
            ws.cell(row=r, column=8, value=f"=G{r}").number_format = '"$"#,##0'
        else:
            ws.cell(row=r, column=8, value=f"=H{r-1}+G{r}").number_format = '"$"#,##0'

    set_col_widths(ws, [10, 16, 22, 22, 22, 22, 18, 22, 4, 40])
    ws.sheet_view.showGridLines = False
    return ws


def build_banner_performance(wb):
    ws = wb.create_sheet("Banner Performance")
    title(ws, "Banner performance")
    ws["A2"] = "Forecast cases, revenue, and door count per banner. Adjust banner level targets in the yellow column."
    ws["A2"].font = NOTE_FONT

    headers = ["Banner", "Doors", "Authorized SKU rows", "Total cases",
               "Avg cases per door", "Gross revenue", "Banner target cases", "Versus target"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    banners_unique = sorted({b[1] for b in [
        (None, "Choices Markets"), (None, "Nature's Fare Markets"), (None, "Whole Foods Market"),
        (None, "Pomme Natural Market"), (None, "IGA Marketplace"), (None, "Save On Foods"),
        (None, "Urban Fare"), (None, "Independent Grocer"), (None, "Stong's Market"), (None, "Fresh St Market")
    ]})
    default_targets = [800, 600, 1500, 400, 700, 1800, 500, 900, 350, 450]
    for bi, banner in enumerate(banners_unique):
        r = 5 + bi
        ws.cell(row=r, column=1, value=banner)
        ws.cell(row=r, column=2,
                value=f'=COUNTIF(DOORS_BANNER,$A{r})').number_format = "#,##0"
        ws.cell(row=r, column=3,
                value=f'=SUMPRODUCT((VG_BANNER=$A{r})*(VG_AUTH="Y"))').number_format = "#,##0"
        case_parts = "+".join([
            f'SUMPRODUCT((VG_BANNER=$A{r})*(VG_W{ww}>0)*(CEILING(VG_W{ww},UNITS_PER_CASE)/UNITS_PER_CASE))'
            for ww in WEEKS
        ])
        ws.cell(row=r, column=4, value=f"={case_parts}").number_format = "#,##0"
        ws.cell(row=r, column=5, value=f'=IFERROR(D{r}/B{r},0)').number_format = "#,##0"
        ws.cell(row=r, column=6, value=f"=D{r}*AVERAGE(WHOLESALE_TABLE)").number_format = '"$"#,##0'
        tgt = ws.cell(row=r, column=7, value=default_targets[bi % len(default_targets)])
        tgt.fill = INPUT_FILL
        tgt.number_format = "#,##0"
        ws.cell(row=r, column=8, value=f"=IFERROR(D{r}/G{r},0)").number_format = "0%"

    # Total row
    tot_r = 5 + len(banners_unique)
    ws.cell(row=tot_r, column=1, value="Total").font = Font(bold=True)
    for col in [2, 3, 4, 6, 7]:
        col_letter = get_column_letter(col)
        ws.cell(row=tot_r, column=col,
                value=f"=SUM({col_letter}5:{col_letter}{tot_r-1})").font = Font(bold=True)
    ws.cell(row=tot_r, column=2).number_format = "#,##0"
    ws.cell(row=tot_r, column=3).number_format = "#,##0"
    ws.cell(row=tot_r, column=4).number_format = "#,##0"
    ws.cell(row=tot_r, column=6).number_format = '"$"#,##0'
    ws.cell(row=tot_r, column=7).number_format = "#,##0"
    ws.cell(row=tot_r, column=8,
            value=f"=IFERROR(D{tot_r}/G{tot_r},0)").number_format = "0%"

    set_col_widths(ws, [26, 10, 20, 14, 18, 16, 18, 14])
    ws.sheet_view.showGridLines = False
    return ws


def build_variance_tracker(wb):
    ws = wb.create_sheet("Variance Tracker")
    title(ws, "Plan versus actual tracker")
    ws["A2"] = (
        "Weekly variance template. Enter actual shipped cases in the Actual column as the launch progresses. "
        "Variance columns compute automatically. Use this for the weekly CEO review."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Week", "Calendar date", "Plan cases", "Actual cases", "Variance cases",
               "Variance percent", "Plan revenue", "Actual revenue", "Variance revenue",
               "Variance revenue percent", "Notes"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for wi, w in enumerate(WEEKS):
        r = 5 + wi
        ws.cell(row=r, column=1, value=f"W{w}")
        ws.cell(row=r, column=2, value=f"=Calendar!B{5+wi}").number_format = "yyyy-mm-dd"
        # Plan cases = week cases from Weekly Forecast + Online
        online_col = get_column_letter(3 + wi)
        ws.cell(row=r, column=3,
                value=(
                    f"='Weekly Forecast'!I{6+wi}+"
                    + "+".join([f"ROUNDUP('Online Forecast'!{online_col}{rr}/UNITS_PER_CASE,0)" for rr in range(5,11)])
                )).number_format = "#,##0"
        actual = ws.cell(row=r, column=4)
        actual.fill = INPUT_FILL
        actual.number_format = "#,##0"
        ws.cell(row=r, column=5, value=f"=IFERROR(D{r}-C{r},\"\")").number_format = "#,##0"
        ws.cell(row=r, column=6, value=f'=IFERROR(IF(C{r}=0,"",E{r}/C{r}),"")').number_format = "0.0%"
        ws.cell(row=r, column=7,
                value=f'=C{r}*AVERAGE(WHOLESALE_TABLE)').number_format = '"$"#,##0'
        ws.cell(row=r, column=8,
                value=f'=IFERROR(D{r}*AVERAGE(WHOLESALE_TABLE),"")').number_format = '"$"#,##0'
        ws.cell(row=r, column=9, value=f'=IFERROR(H{r}-G{r},"")').number_format = '"$"#,##0'
        ws.cell(row=r, column=10,
                value=f'=IFERROR(IF(G{r}=0,"",I{r}/G{r}),"")').number_format = "0.0%"
        notes = ws.cell(row=r, column=11)
        notes.fill = INPUT_FILL

    last_r = 4 + len(WEEKS)
    # Color: red if variance under minus 10 percent, green if over plus 5 percent, yellow in between
    ws.conditional_formatting.add(
        f"F5:F{last_r}",
        FormulaRule(formula=["AND(ISNUMBER($F5),$F5<-0.1)"], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"F5:F{last_r}",
        FormulaRule(formula=["AND(ISNUMBER($F5),$F5>=0.05)"], fill=OK_FILL),
    )
    ws.conditional_formatting.add(
        f"F5:F{last_r}",
        FormulaRule(formula=["AND(ISNUMBER($F5),$F5>=-0.1,$F5<0.05)"], fill=PatternFill("solid", fgColor="FFEB9C")),
    )

    set_col_widths(ws, [10, 16, 16, 16, 16, 18, 18, 18, 18, 22, 30])
    ws.sheet_view.showGridLines = False
    return ws


def build_weekly_review(wb):
    ws = wb.create_sheet("Weekly Review")
    title(ws, "Weekly review template")
    ws["A2"] = (
        "Printable one page template for the weekly CEO check in. Pulls live numbers from every tab. "
        "Print landscape to fit one page."
    )
    ws["A2"].font = NOTE_FONT

    style_section(ws, 4, 1, "This week")
    ws["A5"] = "Week of review"
    week_input = ws["B5"]
    week_input.value = 1
    week_input.fill = INPUT_FILL
    week_input.number_format = "0"
    ws["D5"] = "Set to the most recent completed week."
    ws["D5"].font = NOTE_FONT

    style_section(ws, 7, 1, "Status snapshot")
    snapshot = [
        ("Active scenario", "=ACTIVE_SCENARIO", ""),
        ("Plan cases this week",
            f"=INDEX('Variance Tracker'!C5:C{4+len(WEEKS)},$B$5)", "#,##0"),
        ("Actual cases this week",
            f"=IFERROR(INDEX('Variance Tracker'!D5:D{4+len(WEEKS)},$B$5),0)", "#,##0"),
        ("Variance percent",
            f'=IFERROR(INDEX(\'Variance Tracker\'!F5:F{4+len(WEEKS)},$B$5),"")', "0.0%"),
        ("Cumulative plan cases",
            f"=SUMPRODUCT((ROW('Variance Tracker'!C5:C{4+len(WEEKS)})-ROW('Variance Tracker'!C5)+1<=$B$5)"
            f"*'Variance Tracker'!C5:C{4+len(WEEKS)})", "#,##0"),
        ("Cumulative actual cases",
            f"=SUMPRODUCT((ROW('Variance Tracker'!D5:D{4+len(WEEKS)})-ROW('Variance Tracker'!D5)+1<=$B$5)"
            f"*IFERROR('Variance Tracker'!D5:D{4+len(WEEKS)},0))", "#,##0"),
        ("Bevmax weeks at or over capacity to date",
            f'=IFERROR(SUMPRODUCT((\'Production Calendar\'!A5:A{4+len(WEEKS)}<>"")*('
            f'\'Production Calendar\'!D5:D{4+len(WEEKS)}>=BEVMAX_CAP)*'
            f'(ROW(\'Production Calendar\'!A5:A{4+len(WEEKS)})-ROW(\'Production Calendar\'!A5)+1<=$B$5)),0)',
            "#,##0"),
    ]
    for i, (label, formula, fmt) in enumerate(snapshot):
        r = 8 + i
        ws.cell(row=r, column=1, value=label).font = Font(bold=True)
        c = ws.cell(row=r, column=2, value=formula)
        if fmt:
            c.number_format = fmt

    style_section(ws, 17, 1, "Discussion points")
    ws["A18"] = "What went well"
    ws["A18"].font = Font(bold=True)
    ws["A19"].fill = INPUT_FILL
    ws.row_dimensions[19].height = 60
    ws["A20"] = "Where we missed"
    ws["A20"].font = Font(bold=True)
    ws["A21"].fill = INPUT_FILL
    ws.row_dimensions[21].height = 60
    ws["A22"] = "Adjustments for next week"
    ws["A22"].font = Font(bold=True)
    ws["A23"].fill = INPUT_FILL
    ws.row_dimensions[23].height = 60

    style_section(ws, 25, 1, "Decisions and owners")
    ws.cell(row=26, column=1, value="Decision").font = Font(bold=True)
    ws.cell(row=26, column=2, value="Owner").font = Font(bold=True)
    ws.cell(row=26, column=3, value="Due").font = Font(bold=True)
    style_header_row(ws, 26, 3)
    for i in range(5):
        r = 27 + i
        for c in range(1, 4):
            ws.cell(row=r, column=c).fill = INPUT_FILL

    ws.page_setup.orientation = ws.ORIENTATION_LANDSCAPE
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1

    set_col_widths(ws, [40, 26, 16, 30])
    ws.sheet_view.showGridLines = False
    return ws


def build_regional_breakdown(wb):
    ws = wb.create_sheet("Regional Breakdown")
    title(ws, "Regional breakdown")
    ws["A2"] = "Forecast cases, revenue, and door count by BC region. Spot regional gaps and over indexing."
    ws["A2"].font = NOTE_FONT

    headers = ["Region", "Doors", "Authorized SKU rows", "Total cases",
               "Avg cases per door", "Share of total cases", "Gross revenue"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for ri, region in enumerate(REGIONS):
        r = 5 + ri
        ws.cell(row=r, column=1, value=region)
        ws.cell(row=r, column=2, value=f'=COUNTIF(DOORS_REGION,$A{r})').number_format = "#,##0"
        ws.cell(row=r, column=3,
                value=f'=SUMPRODUCT((VG_REGION=$A{r})*(VG_AUTH="Y"))').number_format = "#,##0"
        case_parts = "+".join([
            f'SUMPRODUCT((VG_REGION=$A{r})*(VG_W{ww}>0)*(CEILING(VG_W{ww},UNITS_PER_CASE)/UNITS_PER_CASE))'
            for ww in WEEKS
        ])
        ws.cell(row=r, column=4, value=f"={case_parts}").number_format = "#,##0"
        ws.cell(row=r, column=5, value=f'=IFERROR(D{r}/B{r},0)').number_format = "#,##0"
        ws.cell(row=r, column=6, value=f'=IFERROR(D{r}/SUM($D$5:$D$8),0)').number_format = "0.0%"
        ws.cell(row=r, column=7, value=f"=D{r}*AVERAGE(WHOLESALE_TABLE)").number_format = '"$"#,##0'

    tot_r = 5 + len(REGIONS)
    ws.cell(row=tot_r, column=1, value="Total").font = Font(bold=True)
    for col in [2, 3, 4, 7]:
        col_letter = get_column_letter(col)
        ws.cell(row=tot_r, column=col,
                value=f"=SUM({col_letter}5:{col_letter}{tot_r-1})").font = Font(bold=True)
    ws.cell(row=tot_r, column=2).number_format = "#,##0"
    ws.cell(row=tot_r, column=3).number_format = "#,##0"
    ws.cell(row=tot_r, column=4).number_format = "#,##0"
    ws.cell(row=tot_r, column=7).number_format = '"$"#,##0'
    ws.cell(row=tot_r, column=6, value=1).number_format = "0.0%"

    # SKU split per region
    style_section(ws, tot_r + 3, 1, "SKU split per region, total cases")
    ws.cell(row=tot_r + 4, column=1, value="Region")
    for si, sku in enumerate(SKUS):
        ws.cell(row=tot_r + 4, column=2 + si, value=sku)
    style_header_row(ws, tot_r + 4, 1 + len(SKUS))
    for ri, region in enumerate(REGIONS):
        r = tot_r + 5 + ri
        ws.cell(row=r, column=1, value=region)
        for si, sku in enumerate(SKUS):
            case_parts = "+".join([
                f'SUMPRODUCT((VG_REGION=$A{r})*(VG_SKU="{sku}")*(VG_W{ww}>0)*(CEILING(VG_W{ww},UNITS_PER_CASE)/UNITS_PER_CASE))'
                for ww in WEEKS
            ])
            ws.cell(row=r, column=2 + si, value=f"={case_parts}").number_format = "#,##0"

    set_col_widths(ws, [22, 10, 22, 14, 18, 18, 18])
    ws.sheet_view.showGridLines = False
    return ws


def build_promo_pnl(wb):
    ws = wb.create_sheet("Promo PnL")
    title(ws, "Promo P and L per activation")
    ws["A2"] = (
        "Per activation P and L. Incremental revenue assumes wholesale on modeled incremental cases. "
        "COGS on incremental cases. Activation cost subtracted. Net contribution and ROI surfaced."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Activation ID", "Type", "SKU Scope", "Cost", "Incremental cases",
               "Incremental revenue", "Incremental COGS", "Incremental freight",
               "Net contribution", "ROI multiple"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    for i in range(N_ACTIVATION_ROWS):
        r = 5 + i
        ar = 5 + i
        ws.cell(row=r, column=1, value=f"=Activations!A{ar}")
        ws.cell(row=r, column=2, value=f"=Activations!B{ar}")
        ws.cell(row=r, column=3, value=f"=Activations!D{ar}")
        ws.cell(row=r, column=4, value=f"=IFERROR(Activations!J{ar},0)").number_format = '"$"#,##0'
        ws.cell(row=r, column=5, value=f"=IFERROR(Activations!L{ar},0)").number_format = "#,##0"
        ws.cell(row=r, column=6,
                value=(
                    f'=IFERROR(IF(C{r}="ALL",E{r}*AVERAGE(WHOLESALE_TABLE),'
                    f'E{r}*IFERROR(VLOOKUP(C{r},Inputs!$A$9:$B$11,2,FALSE),AVERAGE(WHOLESALE_TABLE))),0)'
                )).number_format = '"$"#,##0'
        ws.cell(row=r, column=7,
                value=(
                    f'=IFERROR(IF(C{r}="ALL",E{r}*AVERAGE(COGS_TABLE),'
                    f'E{r}*IFERROR(VLOOKUP(C{r},Inputs!$A$9:$C$11,3,FALSE),AVERAGE(COGS_TABLE))),0)'
                )).number_format = '"$"#,##0'
        ws.cell(row=r, column=8, value=f"=E{r}*FREIGHT_PER_CASE").number_format = '"$"#,##0'
        ws.cell(row=r, column=9, value=f"=F{r}-G{r}-H{r}-D{r}").number_format = '"$"#,##0'
        ws.cell(row=r, column=10,
                value=f"=IFERROR(IF(D{r}=0,0,I{r}/D{r}),0)").number_format = "0.00"

    tot_r = 5 + N_ACTIVATION_ROWS
    ws.cell(row=tot_r, column=1, value="Total").font = Font(bold=True)
    for col in [4, 5, 6, 7, 8, 9]:
        col_letter = get_column_letter(col)
        ws.cell(row=tot_r, column=col,
                value=f"=SUM({col_letter}5:{col_letter}{tot_r-1})").font = Font(bold=True)
    for col in [4, 6, 7, 8, 9]:
        ws.cell(row=tot_r, column=col).number_format = '"$"#,##0'
    ws.cell(row=tot_r, column=5).number_format = "#,##0"
    ws.cell(row=tot_r, column=10,
            value=f"=IFERROR(I{tot_r}/D{tot_r},0)").number_format = "0.00"

    last_r = 4 + N_ACTIVATION_ROWS
    ws.conditional_formatting.add(
        f"I5:I{last_r}",
        CellIsRule(operator="lessThan", formula=["0"], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"I5:I{last_r}",
        CellIsRule(operator="greaterThanOrEqual", formula=["0"], fill=OK_FILL),
    )

    set_col_widths(ws, [14, 22, 18, 14, 18, 18, 18, 18, 18, 14])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False
    return ws


def build_what_if(wb):
    ws = wb.create_sheet("What If")
    title(ws, "What if interactive levers")
    ws["A2"] = (
        "Editable levers. Each lever scales a piece of the model. Set to 100 percent for base case. "
        "Output cells show the implied delta to total cases, revenue, and net contribution."
    )
    ws["A2"].font = NOTE_FONT

    style_section(ws, 4, 1, "Levers")
    levers = [
        ("Velocity lever", 1.00, "All Velocity Grid units scale by this factor."),
        ("Online lever", 1.00, "All online units scale by this factor."),
        ("Ramp aggressiveness lever", 1.00, "Multiplies ramp percent for weeks 1 through 3."),
        ("Activation effectiveness lever", 1.00, "Multiplies activation uplift minus 1."),
        ("Pricing lever", 1.00, "Wholesale price scaling factor."),
        ("Cost lever", 1.00, "COGS and freight scaling factor."),
    ]
    for i, (label, val, note) in enumerate(levers):
        r = 5 + i
        ws.cell(row=r, column=1, value=label).font = Font(bold=True)
        c = ws.cell(row=r, column=2, value=val)
        c.fill = INPUT_FILL
        c.number_format = "0%"
        ws.cell(row=r, column=4, value=note).font = NOTE_FONT
    wb.defined_names["WHATIF_VELOCITY"] = DefinedName("WHATIF_VELOCITY", attr_text="'What If'!$B$5")
    wb.defined_names["WHATIF_ONLINE"] = DefinedName("WHATIF_ONLINE", attr_text="'What If'!$B$6")
    wb.defined_names["WHATIF_RAMP"] = DefinedName("WHATIF_RAMP", attr_text="'What If'!$B$7")
    wb.defined_names["WHATIF_ACTIVATION"] = DefinedName("WHATIF_ACTIVATION", attr_text="'What If'!$B$8")
    wb.defined_names["WHATIF_PRICING"] = DefinedName("WHATIF_PRICING", attr_text="'What If'!$B$9")
    wb.defined_names["WHATIF_COST"] = DefinedName("WHATIF_COST", attr_text="'What If'!$B$10")

    style_section(ws, 13, 1, "Implied outputs")
    outputs = [
        ("Implied total cases",
            "=REV_TOTAL_CASES*WHATIF_VELOCITY*((1-IFERROR(ONLINE_TOTAL_CASES/REV_TOTAL_CASES,0))+IFERROR(ONLINE_TOTAL_CASES/REV_TOTAL_CASES,0)*WHATIF_ONLINE/WHATIF_VELOCITY)",
            "#,##0"),
        ("Implied gross revenue",
            "=B14*AVERAGE(WHOLESALE_TABLE)*WHATIF_PRICING", '"$"#,##0'),
        ("Implied total COGS",
            "=B14*AVERAGE(COGS_TABLE)*WHATIF_COST", '"$"#,##0'),
        ("Implied freight",
            "=B14*FREIGHT_PER_CASE*WHATIF_COST", '"$"#,##0'),
        ("Implied trade spend",
            "=SUM(ACT_COST)+SUM(ACT_INC_UNITS)/UNITS_PER_CASE*AVERAGE(WHOLESALE_TABLE)*(WHATIF_ACTIVATION-1)",
            '"$"#,##0'),
        ("Implied net contribution",
            "=B15-B16-B17-B18", '"$"#,##0'),
        ("Implied margin percent",
            "=IFERROR(B19/B15,0)", "0.0%"),
        ("Delta versus base, cases",
            "=B14-REV_TOTAL_CASES", "+#,##0;-#,##0;0"),
        ("Delta versus base, revenue",
            "=B15-REV_GROSS_TOTAL", '"$"+#,##0;"$"-#,##0;"$"0'),
        ("Delta versus base, net",
            "=B19-REV_NET_TOTAL", '"$"+#,##0;"$"-#,##0;"$"0'),
    ]
    for i, (label, formula, fmt) in enumerate(outputs):
        r = 14 + i
        ws.cell(row=r, column=1, value=label).font = Font(bold=True)
        c = ws.cell(row=r, column=2, value=formula)
        c.number_format = fmt
        c.font = Font(bold=True, color="1F3A5F", size=12)

    set_col_widths(ws, [34, 22, 4, 60])
    ws.sheet_view.showGridLines = False
    return ws


def build_quarterly_rollup(wb):
    ws = wb.create_sheet("Quarterly Rollup")
    title(ws, "Quarterly rollup, Q3 2026")
    ws["A2"] = (
        "Aggregates the 13 week horizon by month and quarter. June through August is the launch quarter. "
        "Use this to brief the board."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Period", "Weeks", "Cases", "Gross revenue", "Trade spend",
               "Net contribution", "Net margin percent"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    months = {
        "June 2026": [1, 2, 3, 4],
        "July 2026": [5, 6, 7, 8, 9],
        "August 2026": [10, 11, 12, 13],
        "Q3 2026 total": list(WEEKS),
    }
    for i, (name, weeks) in enumerate(months.items()):
        r = 5 + i
        ws.cell(row=r, column=1, value=name).font = Font(bold=(name.startswith("Q")))
        ws.cell(row=r, column=2, value=", ".join([f"W{w}" for w in weeks]))
        case_parts = "+".join([f"'Weekly Forecast'!I{6+w-1}" for w in weeks])
        online_parts = []
        for w in weeks:
            col_letter = get_column_letter(3 + w - 1)
            for row in range(5, 11):
                online_parts.append(f"ROUNDUP('Online Forecast'!{col_letter}{row}/UNITS_PER_CASE,0)")
        ws.cell(row=r, column=3,
                value=f"=({case_parts})+({'+'.join(online_parts)})").number_format = "#,##0"
        ws.cell(row=r, column=4,
                value=f"=C{r}*AVERAGE(WHOLESALE_TABLE)").number_format = '"$"#,##0'
        # Trade for this month: activations whose start week falls in this month
        trade_parts = [f"SUMPRODUCT((ACT_START={w})*ACT_COST)" for w in weeks]
        ws.cell(row=r, column=5, value=f"={'+'.join(trade_parts)}").number_format = '"$"#,##0'
        # Net contribution: revenue - cogs - freight - trade
        ws.cell(row=r, column=6,
                value=f"=D{r}-C{r}*AVERAGE(COGS_TABLE)-C{r}*FREIGHT_PER_CASE-E{r}").number_format = '"$"#,##0'
        ws.cell(row=r, column=7,
                value=f"=IFERROR(F{r}/D{r},0)").number_format = "0.0%"

    set_col_widths(ws, [22, 28, 14, 18, 18, 20, 18])
    ws.sheet_view.showGridLines = False
    return ws


def build_action_items(wb):
    ws = wb.create_sheet("Action Items")
    title(ws, "Action items")
    ws["A2"] = "Open items, owners, due dates, and status. Use as the master list for weekly check ins."
    ws["A2"].font = NOTE_FONT

    headers = ["ID", "Item", "Owner", "Due", "Status", "Priority", "Linked tab", "Notes"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    starter_items = [
        ("A001", "Replace placeholder doors with real 100 door list", "Louis", "June 8 2026", "Open", "P0", "Doors", "Blocking. Pricing and revenue rollups depend on this."),
        ("A002", "Validate Bevmax lead time and weekly capacity", "Louis", "June 8 2026", "Open", "P0", "Inputs", "Confirm with Bevmax production planner."),
        ("A003", "Lock activation calendar for launch quarter", "Louis", "June 12 2026", "Open", "P0", "Activations", "Demos, sampling, paid social, festivals."),
        ("A004", "Confirm wholesale and COGS per flavor with finance", "Finance", "June 12 2026", "Open", "P1", "Inputs", "Currently placeholder $36 wholesale and $18.50 COGS."),
        ("A005", "Set channel managers on Amazon and Shopify ramp targets", "Channel team", "June 15 2026", "Open", "P1", "Inputs", "Online baselines are placeholder."),
        ("A006", "Audit fill rate assumption against historical shrink", "Operations", "June 19 2026", "Open", "P2", "Inputs", "97 percent placeholder. May be optimistic on a launch."),
        ("A007", "Confirm slotting fees with each banner", "Sales", "June 19 2026", "Open", "P2", "Inputs", "Currently flat $250 per door amortized."),
        ("A008", "Draft Aaron weekly review deck template", "Louis", "June 22 2026", "Open", "P2", "Weekly Review", "Use the printable tab."),
    ]
    for i, item in enumerate(starter_items):
        r = 5 + i
        for j, val in enumerate(item, start=1):
            cell = ws.cell(row=r, column=j, value=val)
            cell.fill = INPUT_FILL

    # Extra blank rows
    for i in range(40):
        r = 5 + len(starter_items) + i
        for j in range(1, len(headers) + 1):
            ws.cell(row=r, column=j).fill = INPUT_FILL

    dv_status = DataValidation(type="list", formula1='"Open,In progress,Blocked,Done,Cancelled"', allow_blank=True)
    dv_priority = DataValidation(type="list", formula1='"P0,P1,P2,P3"', allow_blank=True)
    ws.add_data_validation(dv_status)
    ws.add_data_validation(dv_priority)
    last_r = 5 + len(starter_items) + 40 - 1
    dv_status.add(f"E5:E{last_r}")
    dv_priority.add(f"F5:F{last_r}")

    ws.conditional_formatting.add(
        f"E5:E{last_r}",
        FormulaRule(formula=['$E5="Blocked"'], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"E5:E{last_r}",
        FormulaRule(formula=['$E5="Done"'], fill=OK_FILL),
    )
    ws.conditional_formatting.add(
        f"F5:F{last_r}",
        FormulaRule(formula=['$F5="P0"'], fill=WARN_FILL),
    )

    set_col_widths(ws, [10, 50, 14, 14, 16, 12, 18, 40])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False
    return ws


def build_glossary(wb):
    ws = wb.create_sheet("Glossary")
    title(ws, "Glossary")
    ws["A2"] = "Plain language definitions for every term used in the workbook."
    ws["A2"].font = NOTE_FONT

    headers = ["Term", "Definition"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    terms = [
        ("Activation", "Any planned event meant to lift baseline sales. Demos, sampling, paid social, retailer features, festivals."),
        ("Banner", "Retail chain or grouping under which doors operate. Choices, Save On Foods, IGA Marketplace, etc."),
        ("Bevmax", "Co manufacturer that produces the RTD. Bevmax lead time and capacity drive production planning."),
        ("Bulk Edit", "Tab that applies a flat units value to many Velocity Grid cells at once via rule rows."),
        ("Case", "Six four packs of cans. Equals 24 cans. Defined by UNITS_PER_CASE constant."),
        ("Cohort", "Group of doors that share the same launch week. Used to compare ramp behavior over time."),
        ("Distributor margin", "Markup retained by a distributor between Organika and the retailer. Set zero for direct shipment."),
        ("DC", "Distribution center. The point of inventory between Bevmax production and retailer or online delivery."),
        ("Door", "An individual store location. The model tracks 100 doors plus online."),
        ("DSD", "Direct store delivery, shipping from Organika DC or distributor straight to the store."),
        ("Fill rate", "Percent of forecast units that actually ship. Reflects production, DC, and shrink accuracy."),
        ("Gross margin", "Wholesale revenue minus COGS, before trade spend and overhead."),
        ("Launch week", "First week a door receives the product. Determines when the door starts contributing to forecast."),
        ("Lead time", "Weeks from Bevmax PO release to delivery at our DC."),
        ("MOQ", "Minimum order quantity Bevmax accepts per production run, in cases."),
        ("Net contribution", "Gross revenue less COGS, freight, slotting, distributor margin, and allocated trade spend."),
        ("PO release week", "Calendar week when the purchase order goes to Bevmax. Delivery happens after the lead time."),
        ("Post activation lift", "Permanent baseline lift that persists after an activation ends."),
        ("Ramp", "Schedule of how fast a door reaches steady state velocity. Week 1 typically below steady state."),
        ("Risk Flag", "Automated check that surfaces inputs or outputs needing attention."),
        ("Scenario", "Conservative, Base, or Stretch view. Applies multipliers to base velocity."),
        ("Slotting", "One time fee paid to a retailer for shelf placement on a new product. Treated as a launch investment and amortized over its life, so it does not distort per unit margin in a single quarter."),
        ("Steady state velocity", "Units per week per door per SKU after ramp completes. Tier and SKU specific."),
        ("Tier", "Door classification A, B, or C indicating expected volume and authorization."),
        ("Trade spend", "Sales and marketing dollars spent on activations, demos, and retailer programs."),
        ("Uplift multiplier", "Factor applied to base velocity during an activation. 1.25 means 25 percent lift."),
        ("Velocity", "Units per week per door per SKU."),
    ]
    for i, (t, d) in enumerate(terms):
        r = 5 + i
        ws.cell(row=r, column=1, value=t).font = Font(bold=True)
        ws.cell(row=r, column=2, value=d).alignment = Alignment(wrap_text=True)
        ws.row_dimensions[r].height = 32

    set_col_widths(ws, [24, 100])
    ws.freeze_panes = "A5"
    ws.sheet_view.showGridLines = False
    return ws


def build_pre_launch_checklist(wb):
    ws = wb.create_sheet("Pre Launch Checklist")
    title(ws, "Pre launch readiness checklist")
    ws["A2"] = "Everything that must be true before week 1 ships. Mark complete and date as items close."
    ws["A2"].font = NOTE_FONT

    headers = ["Category", "Item", "Owner", "Status", "Date closed", "Notes"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    checklist = [
        ("Production", "Bevmax PO released for week 1 delivery", "Operations"),
        ("Production", "Week 1 inventory positioned at DC", "Operations"),
        ("Production", "Cases packed and ready for DSD", "Operations"),
        ("Production", "Safety stock for week 2 in production", "Operations"),
        ("Pricing", "Wholesale per flavor signed off by finance", "Finance"),
        ("Pricing", "Distributor margin negotiated and recorded", "Finance"),
        ("Sales", "All 100 doors confirmed and entered", "Sales"),
        ("Sales", "Authorization Y or N confirmed per door per flavor", "Sales"),
        ("Sales", "Slotting fees paid or waived for each banner", "Sales"),
        ("Marketing", "Activation calendar signed off and budgeted", "Marketing"),
        ("Marketing", "Demo schedules booked with retailers", "Marketing"),
        ("Marketing", "Influencer drops scheduled", "Marketing"),
        ("Marketing", "Paid social creative approved", "Marketing"),
        ("Online", "Amazon.ca listing live and indexed", "Channel team"),
        ("Online", "Shopify DTC product page live", "Channel team"),
        ("Online", "Inventory feeds connected for both channels", "Channel team"),
        ("Online", "First wave paid social budget allocated", "Channel team"),
        ("Reporting", "Weekly Review template populated with W1 plan", "Louis"),
        ("Reporting", "Variance Tracker shared with finance for weekly fill", "Louis"),
        ("Reporting", "Dashboard reviewed with Aaron", "Louis"),
        ("Risk", "All Risk Flags green or acknowledged with action plan", "Louis"),
        ("Risk", "Production Smoothing shows no week over capacity", "Operations"),
        ("Risk", "DC Inventory shows no stockout weeks", "Operations"),
    ]
    for i, (cat, item, owner) in enumerate(checklist):
        r = 5 + i
        ws.cell(row=r, column=1, value=cat)
        ws.cell(row=r, column=2, value=item)
        ws.cell(row=r, column=3, value=owner)
        ws.cell(row=r, column=4).fill = INPUT_FILL
        ws.cell(row=r, column=5).fill = INPUT_FILL
        ws.cell(row=r, column=6).fill = INPUT_FILL

    dv_status = DataValidation(type="list", formula1='"Open,In progress,Done,Blocked"', allow_blank=True)
    ws.add_data_validation(dv_status)
    last_r = 4 + len(checklist)
    dv_status.add(f"D5:D{last_r}")

    ws.conditional_formatting.add(
        f"D5:D{last_r}",
        FormulaRule(formula=['$D5="Done"'], fill=OK_FILL),
    )
    ws.conditional_formatting.add(
        f"D5:D{last_r}",
        FormulaRule(formula=['$D5="Blocked"'], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"D5:D{last_r}",
        FormulaRule(formula=['$D5="Open"'], fill=PatternFill("solid", fgColor="FFEB9C")),
    )

    # Completion percent
    ws.cell(row=last_r + 2, column=1, value="Completion percent").font = Font(bold=True)
    ws.cell(row=last_r + 2, column=2,
            value=f'=COUNTIF(D5:D{last_r},"Done")/COUNTA(B5:B{last_r})').number_format = "0%"

    set_col_widths(ws, [18, 60, 18, 14, 16, 32])
    ws.sheet_view.showGridLines = False
    return ws


def build_stakeholder_map(wb):
    ws = wb.create_sheet("Stakeholder Map")
    title(ws, "Stakeholder map")
    ws["A2"] = "Who needs to be in the loop, who decides, who executes. Edit freely."
    ws["A2"].font = NOTE_FONT

    headers = ["Role", "Name", "Email", "Decision rights", "Information needs", "Cadence"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    rows = [
        ("CEO", "Aaron", "", "Final go or no go on launch, target setting", "Weekly KPI snapshot, scenario view", "Weekly"),
        ("Demand planner", "Louis", "louisnto@gmail.com", "Forecast assumptions, weekly variance, activation calendar approval", "Full model, all tabs", "Daily"),
        ("Finance lead", "TBD", "", "Pricing, margin floor, trade spend budget", "Revenue and Margin, Promo PnL, Quarterly Rollup", "Weekly"),
        ("Operations", "TBD", "", "Bevmax PO release, DC inventory, fill rate", "Production Calendar, Production Smoothing, DC Inventory", "Weekly"),
        ("Sales", "TBD", "", "Door list, authorizations, slotting", "Doors, Banner Performance, Regional Breakdown", "Weekly"),
        ("Marketing", "TBD", "", "Activation calendar, creative, retailer programs", "Activations, Activation Gantt, Trade Spend Allocation", "Weekly"),
        ("Amazon channel manager", "TBD", "", "Listing, ads, ramp", "Online Forecast Amazon row", "Weekly"),
        ("Shopify channel manager", "TBD", "", "DTC site, paid social, conversion", "Online Forecast Shopify row", "Weekly"),
        ("Bevmax production planner", "TBD", "", "Lead time, capacity, MOQ confirmation", "Inputs Bevmax section, Production Calendar", "Biweekly"),
    ]
    for i, row in enumerate(rows):
        r = 5 + i
        for j, v in enumerate(row, start=1):
            cell = ws.cell(row=r, column=j, value=v)
            cell.fill = INPUT_FILL
            cell.alignment = Alignment(wrap_text=True, vertical="top")
        ws.row_dimensions[r].height = 32

    set_col_widths(ws, [22, 16, 26, 40, 40, 14])
    ws.sheet_view.showGridLines = False
    return ws


def build_probabilistic_forecast(wb, mc):
    """Embed a precomputed Monte Carlo distribution.

    mc is the dict from verify_model.monte_carlo. Excel cannot run the simulation
    live without macros, so this is a reproducible snapshot keyed to the Base case
    with the stated uncertainty assumptions and random seed.
    """
    ws = wb.create_sheet("Probabilistic Forecast")
    title(ws, "Probabilistic forecast")
    ws["A2"] = (
        f"Monte Carlo over velocity, ramp, and online uncertainty. {mc['n_trials']:,} trials, seed {mc['seed']}. "
        "Velocity spread scales with door tier confidence. This is a precomputed snapshot of the Base case. "
        "Rerun verify_model.py monte_carlo to refresh after changing assumptions or the door list."
    )
    ws["A2"].font = NOTE_FONT
    ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[2].height = 44

    # Uncertainty assumptions
    style_section(ws, 4, 1, "Uncertainty assumptions, one sigma relative spread")
    assum = [
        ("Tier A velocity spread", mc["conf_sigma"]["A"], "0%"),
        ("Tier B velocity spread", mc["conf_sigma"]["B"], "0%"),
        ("Tier C velocity spread", mc["conf_sigma"]["C"], "0%"),
        ("Online baseline spread", mc["online_sigma"], "0%"),
        ("Ramp spread", mc["ramp_sigma"], "0%"),
    ]
    for i, (label, val, fmt) in enumerate(assum):
        r = 5 + i
        ws.cell(row=r, column=1, value=label)
        ws.cell(row=r, column=2, value=val).number_format = fmt

    # Distribution table
    style_section(ws, 11, 1, "Outcome distribution")
    headers = ["Metric", "P10", "P50 median", "P90", "Mean", "Min", "Max"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=12, column=j, value=h)
    style_header_row(ws, 12, len(headers))

    def stat_row(r, label, d, money=False):
        ws.cell(row=r, column=1, value=label)
        fmt = '"$"#,##0' if money else "#,##0"
        for j, key in enumerate(["p10", "p50", "p90", "mean", "min", "max"], start=2):
            ws.cell(row=r, column=j, value=round(d[key], 0)).number_format = fmt

    stat_row(13, "Total cases", mc["cases"])
    stat_row(14, "Gross revenue", mc["revenue"], money=True)
    stat_row(15, "Operating contribution", mc["operating"], money=True)
    stat_row(16, "Net contribution after amortized slotting", mc["net"], money=True)

    # Target probabilities
    style_section(ws, 18, 1, "Probability of hitting targets")
    ws.cell(row=19, column=1, value=f"Probability total cases at or above {mc['target_cases']:,}")
    ws.cell(row=19, column=2, value=round(mc["p_cases_hit"], 3)).number_format = "0.0%"
    ws.cell(row=20, column=1, value=f"Probability gross revenue at or above {mc['target_revenue']:,}")
    ws.cell(row=20, column=2, value=round(mc["p_rev_hit"], 3)).number_format = "0.0%"

    # Interpretation
    style_section(ws, 22, 1, "Read this")
    interp = [
        f"Median forecast is {round(mc['cases']['p50']):,} cases. The P10 to P90 band is {round(mc['cases']['p10']):,} to {round(mc['cases']['p90']):,}.",
        "The band is tight relative to the velocity uncertainty. Whole case rounding at the door level absorbs much of the per cell velocity variation, so the case forecast is more robust than the underlying unit forecast.",
        "Use P10 for conservative production commitments and P90 for upside capacity checks against Bevmax.",
    ]
    for i, t in enumerate(interp):
        ws.cell(row=23 + i, column=1, value=t).alignment = Alignment(wrap_text=True, vertical="top")
        ws.row_dimensions[23 + i].height = 30

    # Histogram
    style_section(ws, 28, 1, "Total cases distribution")
    ws.cell(row=29, column=1, value="Bin lower")
    ws.cell(row=29, column=2, value="Bin upper")
    ws.cell(row=29, column=3, value="Trials")
    style_header_row(ws, 29, 3)
    for i, (lo, hi, cnt) in enumerate(mc["hist"]):
        r = 30 + i
        ws.cell(row=r, column=1, value=round(lo)).number_format = "#,##0"
        ws.cell(row=r, column=2, value=round(hi)).number_format = "#,##0"
        ws.cell(row=r, column=3, value=cnt).number_format = "#,##0"

    chart = BarChart()
    chart.title = "Total cases distribution"
    chart.y_axis.title = "Trials"
    chart.x_axis.title = "Cases"
    data = Reference(ws, min_col=3, min_row=29, max_col=3, max_row=29 + len(mc["hist"]))
    cats = Reference(ws, min_col=1, min_row=30, max_row=29 + len(mc["hist"]))
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.height = 8
    chart.width = 18
    ws.add_chart(chart, "E29")

    set_col_widths(ws, [44, 16, 16, 16, 16, 14, 14])
    ws.sheet_view.showGridLines = False
    return ws


def build_model_validation(wb, expected):
    """Embed an independent recomputation of the Base case for audit.

    expected is the dict from verify_model.compute(). The live formulas should
    reproduce these numbers when the workbook is opened with default inputs,
    no activations, no overrides, Base scenario. The right column pulls the live
    figure so any divergence is visible at a glance.
    """
    ws = wb.create_sheet("Model Validation")
    title(ws, "Model validation")
    ws["A2"] = (
        "Independent audit. The expected column was computed by a separate Python implementation of the model logic, "
        "not by reading these formulas. With default inputs, no activations, no overrides, and Base scenario, the live "
        "figures should match the expected figures. Any row that does not match needs investigation. "
        "Once Louis enters real doors, activations, or overrides, the live figures will move away from these Base expectations, "
        "which is correct. Rerun verify_model.py to regenerate expectations for a new baseline."
    )
    ws["A2"].font = NOTE_FONT
    ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[2].height = 60

    headers = ["Check", "Expected, independent Python", "Live, this workbook", "Match", "Tolerance"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    rows = [
        ("Doors", expected["doors"], "=COUNTA(DOORS_ID)", "#,##0", 0),
        ("Authorized SKU rows", expected["auth_rows"],
            '=SUMPRODUCT((VG_AUTH="Y")*1)', "#,##0", 0),
        ("Velocity Grid total units", expected["total_vg_units"],
            "=SUM(VG_UNITS_BLOCK)", "#,##0", 0),
        ("Weekly Forecast total units", expected["wf_total_units"],
            "=SUM(WF_WEEK_UNITS)", "#,##0", 0),
        ("Cross check, units tie", "Match",
            '=IF(SUM(WF_WEEK_UNITS)=SUM(VG_UNITS_BLOCK),"Match","Mismatch")', "", 0),
        ("Door cases total", expected["door_cases_total"],
            f"=SUM(WF_WEEK_CASES)", "#,##0", 0),
        ("Online cases total", expected["online_cases_total"],
            "=ONLINE_TOTAL_CASES", "#,##0", 0),
        ("Total cases all channels", expected["total_cases_all"],
            "=REV_TOTAL_CASES", "#,##0", 1),
        ("Cases shipped after fill rate", expected["cases_shipped"],
            "=REV_CASES_SHIPPED", "#,##0", 2),
        ("Gross revenue", round(expected["gross_rev"], 0),
            "=REV_GROSS_TOTAL", '"$"#,##0', 50),
        ("Operating contribution", None,
            "=REV_OPERATING_CONTRIB", '"$"#,##0', None),
        ("Total slotting one time", round(expected["slotting_total"], 0),
            "=REV_SLOTTING_TOTAL", '"$"#,##0', 1),
        ("Authorized rows with zero forecast", expected["zero_auth"],
            f'=SUMPRODUCT((VG_AUTH="Y")*(({"+".join(["VG_W"+str(w) for w in WEEKS])})=0))', "#,##0", 0),
    ]
    for i, row in enumerate(rows):
        label, exp, live, fmt, tol = row
        r = 5 + i
        ws.cell(row=r, column=1, value=label)
        if exp is not None:
            ec = ws.cell(row=r, column=2, value=exp)
            if fmt:
                ec.number_format = fmt
        else:
            ws.cell(row=r, column=2, value="see note")
        lc = ws.cell(row=r, column=3, value=live)
        if fmt:
            lc.number_format = fmt
        if exp is None:
            ws.cell(row=r, column=4, value="reference only")
        elif isinstance(exp, str):
            ws.cell(row=r, column=4, value=f'=IF(C{r}=B{r},"Match","Mismatch")')
        else:
            ws.cell(row=r, column=4,
                    value=f'=IF(ABS(C{r}-B{r})<=E{r},"Match","Mismatch")')
        if tol is not None:
            ws.cell(row=r, column=5, value=tol)

    last_r = 4 + len(rows)
    ws.conditional_formatting.add(
        f"D5:D{last_r}",
        FormulaRule(formula=['$D5="Match"'], fill=OK_FILL),
    )
    ws.conditional_formatting.add(
        f"D5:D{last_r}",
        FormulaRule(formula=['$D5="Mismatch"'], fill=WARN_FILL),
    )

    # Audit metadata
    style_section(ws, last_r + 2, 1, "Audit metadata")
    meta = [
        ("Validation method", "Independent Python recomputation in verify_model.py"),
        ("Baseline assumptions", "Default inputs, placeholder doors, no activations, no overrides, Base scenario"),
        ("Excel rounding model", "Half away from zero, matching Excel ROUND"),
        ("Generated for version", VERSION),
        ("Note", "Tolerances allow for case rounding differences that accumulate across 300 rows."),
    ]
    for i, (k, v) in enumerate(meta):
        r = last_r + 3 + i
        ws.cell(row=r, column=1, value=k).font = Font(bold=True)
        ws.cell(row=r, column=2, value=v).alignment = Alignment(wrap_text=True)

    set_col_widths(ws, [38, 30, 22, 16, 14])
    ws.sheet_view.showGridLines = False
    return ws


def main():
    wb = Workbook()
    # Remove default sheet
    default = wb.active
    wb.remove(default)

    # Build in dependency order, then reorder.
    build_inputs(wb)
    doors = generate_doors(100)
    build_doors(wb, doors)
    build_bulk_edit(wb)
    build_activations(wb)
    build_scenarios(wb)
    vg_ws, vg_last_row = build_velocity_grid(wb, doors)
    build_online_forecast(wb)
    wf_ws, wf_total_row = build_weekly_forecast(wb, vg_last_row)
    build_production_calendar(wb, wf_total_row)
    build_revenue_margin(wb)
    build_risk_flags(wb, vg_last_row, len(doors))
    build_dashboard(wb)

    # Enterprise wrapper tabs
    build_cover(wb)
    build_methodology(wb)
    build_data_dictionary(wb)
    build_calendar(wb)
    build_trade_spend_allocation(wb)
    build_sensitivity(wb)
    build_production_smoothing(wb)

    # 10x layer
    build_executive_summary(wb)
    build_dc_inventory(wb)
    build_cohort_analysis(wb)
    build_activation_gantt(wb)
    build_cash_flow(wb)
    build_banner_performance(wb)
    build_variance_tracker(wb)
    build_weekly_review(wb)

    # Second 10x layer
    build_regional_breakdown(wb)
    build_promo_pnl(wb)
    build_what_if(wb)
    build_quarterly_rollup(wb)
    build_action_items(wb)
    build_glossary(wb)
    build_pre_launch_checklist(wb)
    build_stakeholder_map(wb)

    # Independent validation tab and probabilistic forecast
    try:
        from verify_model import compute as _compute_expected, monte_carlo as _mc
        expected = _compute_expected()
        build_model_validation(wb, expected)
        has_validation = True
    except Exception as e:
        print(f"Validation tab skipped: {e}")
        has_validation = False
    try:
        from verify_model import monte_carlo as _mc
        mc = _mc(10000)
        build_probabilistic_forecast(wb, mc)
        has_prob = True
    except Exception as e:
        print(f"Probabilistic forecast skipped: {e}")
        has_prob = False

    # Reorder sheets
    order = [
        "Cover", "Executive Summary", "Dashboard",
        "Methodology", "Data Dictionary", "Glossary", "Calendar", "Stakeholder Map",
        "Inputs", "Doors", "Velocity Grid", "Bulk Edit",
        "Activations", "Activation Gantt", "Promo PnL", "Trade Spend Allocation",
        "Online Forecast",
        "Weekly Forecast", "Cohort Analysis", "Regional Breakdown", "Banner Performance",
        "Production Calendar", "Production Smoothing", "DC Inventory",
        "Revenue and Margin", "Cash Flow Timing", "Quarterly Rollup",
        "Sensitivity", "What If", "Scenarios", "Probabilistic Forecast",
        "Pre Launch Checklist", "Variance Tracker", "Weekly Review",
        "Action Items", "Model Validation", "Risk Flags",
    ]
    if not has_validation and "Model Validation" in order:
        order.remove("Model Validation")
    if not has_prob and "Probabilistic Forecast" in order:
        order.remove("Probabilistic Forecast")
    wb._sheets = [wb[name] for name in order]

    wb.save(OUT_PATH)
    print(f"Saved {OUT_PATH}")


if __name__ == "__main__":
    main()
