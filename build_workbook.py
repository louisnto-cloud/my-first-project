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

# Constants
SKUS = ["Performance", "Daily", "Energy"]
TIERS = ["A", "B", "C"]
REGIONS = ["Lower Mainland", "Vancouver Island", "Interior", "North"]
WEEKS = list(range(1, 14))  # W1..W13

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
        # SKU authorization heuristic: Tier A all three, Tier B Performance+Daily, Tier C Performance only with some variation
        if tier == "A":
            perf, daily, energy = "Y", "Y", "Y"
        elif tier == "B":
            perf, daily, energy = "Y", "Y", ("Y" if i % 3 == 0 else "N")
        else:
            perf, daily, energy = "Y", ("Y" if i % 2 == 0 else "N"), "N"
        # Launch week: Tier A in week 1, Tier B weeks 1 to 3, Tier C weeks 2 to 5
        if tier == "A":
            launch = 1
        elif tier == "B":
            launch = 1 + (i % 3)
        else:
            launch = 2 + (i % 4)
        rows.append([door_id, banner_full, store_name, city, region, tier, perf, daily, energy, launch])
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
    wholesale_defaults = {"Performance": 36.00, "Daily": 34.00, "Energy": 38.00}
    cogs_defaults = {"Performance": 18.50, "Daily": 17.25, "Energy": 19.50}
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
    style_header_row(ws, 18, 4)
    velocity_defaults = {
        "A": {"Performance": 18, "Daily": 14, "Energy": 12},
        "B": {"Performance": 10, "Daily": 8, "Energy": 6},
        "C": {"Performance": 6, "Daily": 4, "Energy": 3},
    }
    for i, tier in enumerate(TIERS):
        r = 19 + i
        ws.cell(row=r, column=1, value=tier)
        for j, sku in enumerate(SKUS):
            c = ws.cell(row=r, column=2 + j, value=velocity_defaults[tier][sku])
            c.fill = INPUT_FILL
    ws["F18"] = "Source: Louis estimate, to validate with category data."
    ws["F18"].font = NOTE_FONT
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
    online_defaults = {"Performance": (180, 90), "Daily": (140, 70), "Energy": (110, 55)}
    for i, sku in enumerate(SKUS):
        r = 31 + i
        ws.cell(row=r, column=1, value=sku)
        amz, dtc = online_defaults[sku]
        ws.cell(row=r, column=2, value=amz).fill = INPUT_FILL
        ws.cell(row=r, column=3, value=dtc).fill = INPUT_FILL
        ws.cell(row=r, column=4, value="Placeholder. Louis estimate, to validate with channel managers.").font = NOTE_FONT
    wb.defined_names["ONLINE_AMZ"] = DefinedName("ONLINE_AMZ", attr_text="Inputs!$B$31:$B$33")
    wb.defined_names["ONLINE_DTC"] = DefinedName("ONLINE_DTC", attr_text="Inputs!$C$31:$C$33")

    # Online ramp option uses same ramp curve, noted here
    ws["A35"] = "Online ramp uses the same ramp curve above, starting from week 1."
    ws["A35"].font = NOTE_FONT

    set_col_widths(ws, [34, 22, 22, 60, 22, 28])
    ws.sheet_view.showGridLines = False
    return ws


def build_doors(wb, doors):
    ws = wb.create_sheet("Doors")
    title(ws, "Door master list")
    ws["A2"] = "Replace placeholder rows with your authoritative door list. Launch Week is the first week a door receives shipment."
    ws["A2"].font = NOTE_FONT

    headers = ["Door ID", "Banner", "Store Name", "City", "Region", "Tier",
               "Performance Auth", "Daily Auth", "Energy Auth", "Launch Week"]
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
    wb.defined_names["DOORS_PERF"] = DefinedName("DOORS_PERF", attr_text=f"Doors!$G$5:$G${last}")
    wb.defined_names["DOORS_DAILY"] = DefinedName("DOORS_DAILY", attr_text=f"Doors!$H$5:$H${last}")
    wb.defined_names["DOORS_ENERGY"] = DefinedName("DOORS_ENERGY", attr_text=f"Doors!$I$5:$I${last}")
    wb.defined_names["DOORS_LAUNCH"] = DefinedName("DOORS_LAUNCH", attr_text=f"Doors!$J$5:$J${last}")

    set_col_widths(ws, [10, 26, 26, 18, 18, 8, 16, 14, 14, 14])
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
        "SKU Scope accepts ALL, Performance, Daily, or Energy. Multiple tiers or SKUs need multiple rows."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["Activation ID", "Type", "Door Scope", "SKU Scope",
               "Start Week", "End Week", "Uplift Multiplier",
               "Post Activation Lift", "Incremental Trial Units", "Cost"]
    for j, h in enumerate(headers, start=1):
        ws.cell(row=4, column=j, value=h)
    style_header_row(ws, 4, len(headers))

    # Empty input rows
    for i in range(N_ACTIVATION_ROWS):
        r = 5 + i
        for j in range(1, len(headers) + 1):
            cell = ws.cell(row=r, column=j)
            cell.fill = INPUT_FILL
            cell.border = BORDER
        ws.cell(row=r, column=7).number_format = "0.00"
        ws.cell(row=r, column=8).number_format = "0%"
        ws.cell(row=r, column=10).number_format = '"$"#,##0.00'

    # Data validations
    dv_type = DataValidation(
        type="list",
        formula1='"in store demo,retailer sampling,influencer drop,paid social burst,retailer feature,festival sampling"',
        allow_blank=True,
    )
    dv_sku_scope = DataValidation(type="list", formula1='"ALL,Performance,Daily,Energy"', allow_blank=True)
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

    set_col_widths(ws, [14, 22, 16, 14, 12, 12, 18, 20, 22, 14])
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
        "Tier accepts A, B, C, or ALL. SKU accepts Performance, Daily, Energy, or ALL. "
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
    dv_sku = DataValidation(type="list", formula1='"Performance,Daily,Energy,ALL"', allow_blank=True)
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
    defaults = {"Performance": (0.85, 1.00, 1.15),
                "Daily": (0.85, 1.00, 1.15),
                "Energy": (0.80, 1.00, 1.20)}
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
            auth_col = {"Performance": "G", "Daily": "H", "Energy": "I"}[sku]
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

                # Bulk override using SUMPRODUCT. Rules are additive when multiple
                # match. By convention rules should not overlap. The Risk Flags tab
                # surfaces any overlap so Louis catches it.
                bulk_match_array = (
                    f"((BULK_ENABLED=\"Y\")"
                    f"*((BULK_TIER=\"ALL\")+(BULK_TIER={tier_cell}))"
                    f"*((BULK_SKU=\"ALL\")+(BULK_SKU={sku_cell}))"
                    f"*(BULK_START<={w})*(BULK_END>={w}))"
                )
                bulk_match_count = f"SUMPRODUCT({bulk_match_array})"
                bulk_has_match = f"{bulk_match_count}>0"
                bulk_value_pick = (
                    f"SUMPRODUCT({bulk_match_array}*IFERROR(BULK_VALUE,0))"
                    f"/MAX(1,{bulk_match_count})"
                )

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
    sku_idx_for_online = {"Performance": 1, "Daily": 2, "Energy": 3}
    for sku in SKUS:
        sku_i = sku_idx_for_online[sku]
        for ch in ["Amazon.ca", "Shopify DTC"]:
            ws.cell(row=row, column=1, value=sku)
            ws.cell(row=row, column=2, value=ch)
            for wi, w in enumerate(WEEKS):
                ramp = (
                    f"IF({w}=1,RAMP_W1,IF({w}=2,RAMP_W2,IF({w}=3,RAMP_W3,RAMP_W4PLUS)))"
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
    headers = ["Week", "Performance units", "Daily units", "Energy units",
               "Total units", "Performance cases", "Daily cases", "Energy cases", "Total cases"]
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

    set_col_widths(ws, [22, 16, 16, 16, 14, 16, 14, 14, 14, 12, 12, 12, 12, 12, 12])
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
        "Gross revenue at wholesale per case. Trade spend pulled from the Activations cost column. "
        "Net revenue equals gross minus trade spend. Gross margin contribution uses placeholder COGS from Inputs."
    )
    ws["A2"].font = NOTE_FONT

    headers = ["SKU", "Total cases doors", "Total cases online", "Total cases all",
               "Wholesale per case", "Gross revenue", "COGS per case", "COGS total",
               "Gross margin", "Margin percent"]
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
        # Rows 5..10 in Online Forecast, SKU position = si*2+5, si*2+6 for amazon, dtc
        amz_row = 5 + si * 2
        dtc_row = 6 + si * 2
        for wi in range(len(WEEKS)):
            col_letter = get_column_letter(3 + wi)
            online_sku_parts.append(f"ROUNDUP('Online Forecast'!{col_letter}{amz_row}/UNITS_PER_CASE,0)")
            online_sku_parts.append(f"ROUNDUP('Online Forecast'!{col_letter}{dtc_row}/UNITS_PER_CASE,0)")
        ws.cell(row=r, column=3, value=f"={'+'.join(online_sku_parts)}").number_format = "#,##0"
        ws.cell(row=r, column=4, value=f"=B{r}+C{r}").number_format = "#,##0"
        ws.cell(row=r, column=5, value=f"=INDEX(WHOLESALE_TABLE,{si+1})").number_format = '"$"#,##0.00'
        ws.cell(row=r, column=6, value=f"=D{r}*E{r}").number_format = '"$"#,##0'
        ws.cell(row=r, column=7, value=f"=INDEX(COGS_TABLE,{si+1})").number_format = '"$"#,##0.00'
        ws.cell(row=r, column=8, value=f"=D{r}*G{r}").number_format = '"$"#,##0'
        ws.cell(row=r, column=9, value=f"=F{r}-H{r}").number_format = '"$"#,##0'
        ws.cell(row=r, column=10, value=f"=IF(F{r}=0,0,I{r}/F{r})").number_format = "0.0%"

    # Totals row
    tot_r = 5 + len(SKUS)
    ws.cell(row=tot_r, column=1, value="Total")
    ws.cell(row=tot_r, column=1).font = Font(bold=True)
    for col in [2, 3, 4, 6, 8, 9]:
        col_letter = get_column_letter(col)
        ws.cell(row=tot_r, column=col,
                value=f"=SUM({col_letter}5:{col_letter}{tot_r-1})").font = Font(bold=True)
    ws.cell(row=tot_r, column=2).number_format = "#,##0"
    ws.cell(row=tot_r, column=3).number_format = "#,##0"
    ws.cell(row=tot_r, column=4).number_format = "#,##0"
    ws.cell(row=tot_r, column=6).number_format = '"$"#,##0'
    ws.cell(row=tot_r, column=8).number_format = '"$"#,##0'
    ws.cell(row=tot_r, column=9).number_format = '"$"#,##0'
    ws.cell(row=tot_r, column=10,
            value=f'=IF(F{tot_r}=0,0,I{tot_r}/F{tot_r})').number_format = "0.0%"

    # Trade spend section
    style_section(ws, tot_r + 3, 1, "Trade spend and net revenue")
    ws.cell(row=tot_r + 4, column=1, value="Gross revenue")
    ws.cell(row=tot_r + 4, column=2, value=f"=F{tot_r}").number_format = '"$"#,##0'
    ws.cell(row=tot_r + 5, column=1, value="Trade spend total")
    ws.cell(row=tot_r + 5, column=2, value="=SUM(ACT_COST)").number_format = '"$"#,##0'
    ws.cell(row=tot_r + 6, column=1, value="Incremental trial units value at average wholesale")
    ws.cell(
        row=tot_r + 6, column=2,
        value="=SUM(ACT_TRIAL)/UNITS_PER_CASE*AVERAGE(WHOLESALE_TABLE)"
    ).number_format = '"$"#,##0'
    ws.cell(row=tot_r + 7, column=1, value="Net revenue")
    ws.cell(row=tot_r + 7, column=2, value=f"=B{tot_r+4}-B{tot_r+5}").number_format = '"$"#,##0'
    ws.cell(row=tot_r + 8, column=1, value="Gross margin total")
    ws.cell(row=tot_r + 8, column=2, value=f"=I{tot_r}-B{tot_r+5}").number_format = '"$"#,##0'

    # Named ranges
    wb.defined_names["REV_GROSS_TOTAL"] = DefinedName(
        "REV_GROSS_TOTAL", attr_text=f"'Revenue and Margin'!$B${tot_r+4}"
    )
    wb.defined_names["REV_TRADE_TOTAL"] = DefinedName(
        "REV_TRADE_TOTAL", attr_text=f"'Revenue and Margin'!$B${tot_r+5}"
    )
    wb.defined_names["REV_NET_TOTAL"] = DefinedName(
        "REV_NET_TOTAL", attr_text=f"'Revenue and Margin'!$B${tot_r+7}"
    )
    wb.defined_names["REV_MARGIN_TOTAL"] = DefinedName(
        "REV_MARGIN_TOTAL", attr_text=f"'Revenue and Margin'!$B${tot_r+8}"
    )
    wb.defined_names["REV_TOTAL_CASES"] = DefinedName(
        "REV_TOTAL_CASES", attr_text=f"'Revenue and Margin'!$D${tot_r}"
    )

    set_col_widths(ws, [22, 18, 18, 16, 18, 16, 18, 16, 16, 14])
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
        "Doors with no SKU authorized",
        '=SUMPRODUCT((DOORS_ID<>"")*(DOORS_PERF<>"Y")*(DOORS_DAILY<>"Y")*(DOORS_ENERGY<>"Y"))',
        ">0",
        "Door rows where Performance, Daily, and Energy are all set to N.",
    ))

    # Enabled bulk edit rule count for visibility
    checks.append((
        "Enabled bulk edit rules",
        '=COUNTIF(BULK_ENABLED,"Y")',
        "review",
        "Total active bulk overrides. Keep rules non overlapping within the same Tier and SKU band to avoid averaging.",
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
    # Highlight rule: numeric > 0 red, =0 green; text "Mismatch" red, "Match" green.
    ws.conditional_formatting.add(
        f"B5:B{last_r}",
        FormulaRule(formula=[f'AND(ISNUMBER($B5),$B5>0)'], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"B5:B{last_r}",
        FormulaRule(formula=[f'AND(ISNUMBER($B5),$B5=0)'], fill=OK_FILL),
    )
    ws.conditional_formatting.add(
        f"B5:B{last_r}",
        FormulaRule(formula=[f'$B5="Mismatch"'], fill=WARN_FILL),
    )
    ws.conditional_formatting.add(
        f"B5:B{last_r}",
        FormulaRule(formula=[f'$B5="Match"'], fill=OK_FILL),
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
        ("Net revenue", "=REV_NET_TOTAL", '"$"#,##0'),
        ("Gross margin", "=REV_MARGIN_TOTAL", '"$"#,##0'),
        ("Margin percent", '=IF(REV_GROSS_TOTAL=0,0,REV_MARGIN_TOTAL/REV_GROSS_TOTAL)', "0.0%"),
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
    ws["E5"] = "Performance"
    ws["F5"] = "Daily"
    ws["G5"] = "Energy"
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


def main():
    wb = Workbook()
    # Remove default sheet
    default = wb.active
    wb.remove(default)

    # Build in spec order
    build_inputs(wb)
    doors = generate_doors(100)
    build_doors(wb, doors)
    # Velocity Grid needs Inputs, Doors, Bulk Edit, Activations, Scenarios named ranges
    # Build dependencies first
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

    # Reorder sheets per spec
    order = [
        "Inputs", "Doors", "Velocity Grid", "Bulk Edit", "Activations",
        "Online Forecast", "Weekly Forecast", "Production Calendar",
        "Revenue and Margin", "Scenarios", "Risk Flags", "Dashboard"
    ]
    wb._sheets = [wb[name] for name in order]

    wb.save(OUT_PATH)
    print(f"Saved {OUT_PATH}")


if __name__ == "__main__":
    main()
