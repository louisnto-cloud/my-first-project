"""Build Organika RTD weekly forecast workbook.

Takes the original monthly FY26-27 forecast as a baseline, rebuilds it on
a 52-week grain, and adds 5 new channels: On-Premise (restaurants),
Convenience, Gym & Fitness, Private Liquor, RAS (rural agency stores).
"""

from datetime import date, timedelta

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

# ---------------------------------------------------------------------------
# Constants / dimensions
# ---------------------------------------------------------------------------

SKUS = ["MUV Raspberry Lemon", "MUV Lime", "MUV PFP", "LCA Energy"]
SKU_BRAND = {
    "MUV Raspberry Lemon": "MUV",
    "MUV Lime": "MUV",
    "MUV PFP": "MUV",
    "LCA Energy": "LCA",
}

PROVINCES = ["BC", "AB", "SK", "MB", "ON", "QC", "NB", "NS", "PE", "NL"]

CHANNELS = [
    "Natural",
    "Specialty",
    "FDM",
    "Costco",
    "On-Premise",
    "Convenience",
    "Gym & Fitness",
    "Private Liquor",
    "RAS",
]

# 52 weeks starting Tue Sep 1 2026. Each label = "Wnn (MMM dd)".
START_DATE = date(2026, 9, 1)
N_WEEKS = 52
WEEK_DATES = [START_DATE + timedelta(days=7 * i) for i in range(N_WEEKS)]
WEEK_LABELS = [f"W{i + 1:02d} ({d.strftime('%b %d')})" for i, d in enumerate(WEEK_DATES)]
WEEK_MONTH = [d.strftime("%b %Y").replace(" 2026", " 2026").replace(" 2027", " 2027") for d in WEEK_DATES]
# Map: month name -> list of week column letters (1-based week indices)
MONTH_ORDER = [
    "Sep 2026", "Oct 2026", "Nov 2026", "Dec 2026",
    "Jan 2027", "Feb 2027", "Mar 2027", "Apr 2027",
    "May 2027", "Jun 2027", "Jul 2027", "Aug 2027",
]
WEEK_TO_MONTH = []  # 1-indexed list (length N_WEEKS) of month-name strings
for d in WEEK_DATES:
    m = d.month
    y = d.year
    name = date(y, m, 1).strftime("%b %Y")
    WEEK_TO_MONTH.append(name)

# Column where weekly data starts (E = 5). FY total goes in col D.
FIRST_WEEK_COL = 5
LAST_WEEK_COL = FIRST_WEEK_COL + N_WEEKS - 1  # 56 = BD


def week_col(i):
    """1-based week index -> column letter (W1 -> E, W52 -> BD)."""
    return get_column_letter(FIRST_WEEK_COL + i - 1)


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
HEADER_FONT = Font(bold=True)
SECTION_FONT = Font(bold=True, size=12)
TITLE_FONT = Font(bold=True, size=14)
INPUT_FONT = Font(color="1F4E79")  # blue = user input
CALC_FONT = Font(color="000000")  # black = calculated
LINK_FONT = Font(color="00703C")  # green = cross-tab link
YELLOW_FILL = PatternFill("solid", fgColor="FFF2CC")
HEADER_FILL = PatternFill("solid", fgColor="D9E1F2")
SUBTOTAL_FILL = PatternFill("solid", fgColor="E7E6E6")


def write_headers(ws, row, headers, fills=True):
    for col_idx, val in enumerate(headers, start=1):
        c = ws.cell(row=row, column=col_idx, value=val)
        c.font = HEADER_FONT
        if fills:
            c.fill = HEADER_FILL


def write_week_headers(ws, row, label_col=FIRST_WEEK_COL):
    for i, lbl in enumerate(WEEK_LABELS):
        c = ws.cell(row=row, column=label_col + i, value=lbl)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="center")


# ---------------------------------------------------------------------------
# Sheet builders
# ---------------------------------------------------------------------------


def build_readme(ws):
    ws.title = "README"
    ws["A1"] = "Organika RTD National Forecast - FY26 to FY27 (Weekly, 9-channel build)"
    ws["A1"].font = TITLE_FONT

    rows = [
        ("Fiscal year", "September 1 2026 through August 31 2027"),
        ("Grain", "Weekly. 52 weeks, W01 starts Sep 1 2026."),
        ("Portfolio", "MUV Sparkling (Raspberry Lemon, Lime, Passion Fruit Pineapple) and LCA Energy"),
        ("Currency", "CAD throughout"),
        ("Pack", "24 cans per case, 355ml format"),
        ("", ""),
        ("Channels", "9 total: Natural, Specialty, FDM, Costco, On-Premise (restaurants),"),
        ("", "Convenience, Gym & Fitness (gyms + yoga), Private Liquor, RAS (rural agency stores)."),
        ("", ""),
        ("Colour key", ""),
        ("Blue text", "User input. Edit these to flex the model."),
        ("Black text", "Calculated value. Do not edit."),
        ("Green text", "Cross tab link. Pulls from another sheet."),
        ("Yellow fill", "Key assumption that needs sign off before locking the model."),
        ("", ""),
        ("How sales is calculated", ""),
        ("Sales cases (per week)", "Doors Active x Blended Velocity / Units per Case x Scenario Multiplier"),
        ("Blended Velocity", "Class A share x Vel A + Class B share x Vel B + Class C share x Vel C"),
        ("", "Velocity is units per door per week, so no weeks-in-period factor is needed."),
        ("", ""),
        ("Production demand", ""),
        ("Total cases to produce", "Sales cases + Marketing and sampling cases"),
        ("Production with buffer", "Total cases to produce x (1 + Production buffer %)"),
        ("", ""),
        ("Scenario playbook", ""),
        ("Multiplier 1.00", "Base case."),
        ("Multiplier 0.85", "Conservative. Bakes in ramp slippage."),
        ("Multiplier 1.15", "Stretch. Assumes door plan lands early."),
        ("", "Set on the Assumptions tab, cell B6."),
        ("", ""),
        ("Tab guide", ""),
        ("Dashboard", "Headline metrics, monthly roll-ups, weekly totals. Read only."),
        ("Assumptions", "Workbook toggles: units per case, buffer, multiplier, week index."),
        ("Class Mix", "Channel by class share. Rows must sum to 100%."),
        ("Velocity", "Per SKU per channel velocity (units per door per week) for class A/B/C."),
        ("Doors", "Province by Channel by Brand active door counts. Weekly grain, 52 cols."),
        ("Pricing", "Per SKU net case price, landed cost, gross profit."),
        ("Marketing and Sampling", "Account sampling, events, rep samples, buffer. All in cases per week."),
        ("Forecast Weekly", "Calculation engine. 360 row grid (4 SKUs x 10 provinces x 9 channels)."),
        ("Production Plan", "Sales + marketing + buffer rolled to weekly production demand."),
        ("Revenue", "Weekly revenue and gross profit by SKU."),
        ("", ""),
        ("New-channel default values are placeholders.", ""),
        ("They are flagged yellow in Class Mix / Velocity / Doors / Marketing.", ""),
        ("Sign off with Aaron, Teresa, Rijo before locking.", ""),
    ]
    for i, (a, b) in enumerate(rows, start=3):
        ws.cell(row=i, column=1, value=a).font = HEADER_FONT if a and not b == "" and i in (10, 15, 19, 24, 30) else Font()
        ws.cell(row=i, column=2, value=b)
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 90


def build_assumptions(ws):
    ws.title = "Assumptions"
    ws["A1"] = "Assumptions and toggles"
    ws["A1"].font = TITLE_FONT

    ws["A3"] = "Workbook inputs"
    ws["A3"].font = SECTION_FONT
    ws["A4"] = "Units per case"; ws["B4"] = 24; ws["B4"].font = INPUT_FONT
    ws["A5"] = "Production buffer"; ws["B5"] = 0.10; ws["B5"].font = INPUT_FONT
    ws["B5"].number_format = "0%"
    ws["A6"] = "Scenario multiplier"; ws["B6"] = 1.0
    ws["B6"].font = INPUT_FONT; ws["B6"].fill = YELLOW_FILL
    ws["A7"] = "Fiscal year"; ws["B7"] = "FY26 to FY27"
    ws["A8"] = "Period start"; ws["B8"] = "September 1 2026"
    ws["A9"] = "Period end"; ws["B9"] = "August 31 2027"
    ws["A10"] = "Number of weeks"; ws["B10"] = N_WEEKS

    ws["A12"] = "Week index"
    ws["A12"].font = SECTION_FONT
    ws["A13"] = "Week"
    ws["B13"] = "Start date"
    ws["C13"] = "Month"
    for cell in (ws["A13"], ws["B13"], ws["C13"]):
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
    for i, (lbl, d, m) in enumerate(zip(WEEK_LABELS, WEEK_DATES, WEEK_TO_MONTH), start=14):
        ws.cell(row=i, column=1, value=lbl)
        ws.cell(row=i, column=2, value=d).number_format = "yyyy-mm-dd"
        ws.cell(row=i, column=3, value=m)

    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 12

    notes_row = 14 + N_WEEKS + 2
    ws.cell(row=notes_row, column=1, value="Notes").font = SECTION_FONT
    ws.cell(row=notes_row + 1, column=1,
            value="Edit blue cells. Other cells calculate. Scenario multiplier (yellow) is toggled most often.")
    ws.cell(row=notes_row + 2, column=1,
            value="Velocity is quoted per door per week, so the weekly grain doesn't need a weeks-in-period factor.")


def build_class_mix(ws):
    ws.title = "Class Mix"
    ws["A1"] = "Class mix by channel"
    ws["A1"].font = TITLE_FONT
    ws["A3"] = "Share of doors in each class, per channel. Rows must sum to 100%."

    headers = ["Channel", "Class A %", "Class B %", "Class C %", "Sum check"]
    write_headers(ws, 5, headers)

    # (channel, A, B, C)
    rows = [
        ("Natural",         0.20, 0.50, 0.30, False),
        ("Specialty",       0.30, 0.50, 0.20, False),
        ("FDM",             0.50, 0.35, 0.15, False),
        ("Costco",          0.80, 0.20, 0.00, False),
        ("On-Premise",      0.25, 0.50, 0.25, True),
        ("Convenience",     0.15, 0.50, 0.35, True),
        ("Gym & Fitness",   0.30, 0.50, 0.20, True),
        ("Private Liquor",  0.25, 0.55, 0.20, True),
        ("RAS",             0.10, 0.40, 0.50, True),
    ]
    for i, (ch, a, b, c, is_new) in enumerate(rows, start=6):
        ws.cell(row=i, column=1, value=ch)
        for col, val in zip((2, 3, 4), (a, b, c)):
            cell = ws.cell(row=i, column=col, value=val)
            cell.number_format = "0%"
            cell.font = INPUT_FONT
            if is_new:
                cell.fill = YELLOW_FILL
        sumc = ws.cell(row=i, column=5, value=f"=B{i}+C{i}+D{i}")
        sumc.number_format = "0%"

    # Class definitions
    ws["A17"] = "Class definitions"
    ws["A17"].font = SECTION_FONT
    defs = [
        ("Class A", "Top tier doors. Premium positioning, high foot traffic, strong velocity."),
        ("Class B", "Mid tier doors. Steady velocity. Most of the door base sits here."),
        ("Class C", "Lower tier doors. Velocity ramps slower. Often new accounts."),
    ]
    for i, (a, b) in enumerate(defs, start=18):
        ws.cell(row=i, column=1, value=a).font = HEADER_FONT
        ws.cell(row=i, column=2, value=b)

    for col, w in zip("ABCDE", (18, 12, 12, 12, 12)):
        ws.column_dimensions[col].width = w
    ws.column_dimensions["B"].width = 60  # for defs section row B values


def build_velocity(ws):
    ws.title = "Velocity"
    ws["A1"] = "Velocity by SKU, channel, and class"
    ws["A1"].font = TITLE_FONT
    ws["A3"] = "Units per door per week. Blended velocity flows into Forecast Weekly."

    headers = ["SKU", "Channel", "Vel A", "Vel B", "Vel C",
               "Class A %", "Class B %", "Class C %", "Blended"]
    write_headers(ws, 5, headers)

    # Velocity defaults: (SKU, Channel, A, B, C, is_new_channel)
    muv_defaults = {
        "Natural":         (12, 8, 5),
        "Specialty":       (10, 7, 4),
        "FDM":             (20, 12, 6),
        "Costco":          (200, 120, 60),
        "On-Premise":      (6, 4, 2),
        "Convenience":     (8, 5, 3),
        "Gym & Fitness":   (10, 7, 4),
        "Private Liquor":  (5, 3, 2),
        "RAS":             (4, 3, 2),
    }
    # Per-SKU adjustments
    muv_lime_factor = {"Natural": (10, 7, 4), "Specialty": (9, 6, 4),
                       "FDM": (18, 11, 5), "Costco": (180, 110, 55)}
    muv_pfp_factor = {"Natural": (14, 9, 5), "Specialty": (11, 7, 4),
                      "FDM": (22, 13, 6), "Costco": (220, 130, 65)}
    lca_factor = {"Natural": (8, 5, 3), "Specialty": (8, 5, 3),
                  "FDM": (15, 10, 5), "Costco": (180, 100, 50),
                  "On-Premise": (8, 5, 3), "Convenience": (12, 8, 4),
                  "Gym & Fitness": (12, 8, 5), "Private Liquor": (3, 2, 1),
                  "RAS": (3, 2, 1)}

    new_channels = {"On-Premise", "Convenience", "Gym & Fitness", "Private Liquor", "RAS"}

    row = 6
    for sku in SKUS:
        for ch in CHANNELS:
            if sku == "MUV Raspberry Lemon":
                a, b, c = muv_defaults[ch]
            elif sku == "MUV Lime":
                a, b, c = muv_lime_factor.get(ch, muv_defaults[ch])
            elif sku == "MUV PFP":
                a, b, c = muv_pfp_factor.get(ch, muv_defaults[ch])
            else:  # LCA Energy
                a, b, c = lca_factor[ch]

            ws.cell(row=row, column=1, value=sku)
            ws.cell(row=row, column=2, value=ch)
            for col_idx, val in zip((3, 4, 5), (a, b, c)):
                cell = ws.cell(row=row, column=col_idx, value=val)
                cell.font = INPUT_FONT
                if ch in new_channels:
                    cell.fill = YELLOW_FILL
            # Lookup class mix
            for col_idx, mix_col in zip((6, 7, 8), (2, 3, 4)):
                ws.cell(row=row, column=col_idx,
                        value=f"=VLOOKUP(B{row},'Class Mix'!$A$6:$D$14,{mix_col},FALSE)").font = LINK_FONT
                ws.cell(row=row, column=col_idx).number_format = "0%"
            ws.cell(row=row, column=9, value=f"=C{row}*F{row}+D{row}*G{row}+E{row}*H{row}")
            ws.cell(row=row, column=9).number_format = "0.00"
            row += 1

    for col, w in zip("ABCDEFGHI", (22, 16, 8, 8, 8, 10, 10, 10, 10)):
        ws.column_dimensions[col].width = w


def build_pricing(ws):
    ws.title = "Pricing"
    ws["A1"] = "Pricing and unit economics"
    ws["A1"].font = TITLE_FONT
    ws["A3"] = ("Net case price is what we invoice the retailer. "
                "Landed cost includes ingredients, co-man fees, freight to DC.")

    headers = ["SKU", "Net case price", "Landed case cost", "Gross profit", "GP %", "Notes"]
    write_headers(ws, 5, headers)

    rows = [
        ("MUV Raspberry Lemon", 28, 14.5, "Standard MUV price. Confirm with Rijo before locking."),
        ("MUV Lime",            28, 14.5, "Same as Raspberry Lemon. Co-man pricing parity."),
        ("MUV PFP",             28, 14.5, "Same as other MUV SKUs."),
        ("LCA Energy",          32, 16.0, "Energy positioning, higher price point. Cost is placeholder, refine with Rijo."),
    ]
    for i, (sku, price, cost, note) in enumerate(rows, start=6):
        ws.cell(row=i, column=1, value=sku)
        ws.cell(row=i, column=2, value=price).font = INPUT_FONT
        ws.cell(row=i, column=3, value=cost).font = INPUT_FONT
        ws.cell(row=i, column=4, value=f"=B{i}-C{i}")
        gp = ws.cell(row=i, column=5, value=f"=D{i}/B{i}")
        gp.number_format = "0%"
        ws.cell(row=i, column=6, value=note)
        for c in (2, 3, 4):
            ws.cell(row=i, column=c).number_format = "$#,##0.00"

    for col, w in zip("ABCDEF", (22, 16, 18, 14, 8, 60)):
        ws.column_dimensions[col].width = w


def build_doors(ws):
    ws.title = "Doors"
    ws["A1"] = "Active doors by brand, province, and channel"
    ws["A1"].font = TITLE_FONT
    ws["A3"] = ("Main planning canvas. Blue inputs only. New-channel rows are yellow placeholders "
                "and need owner sign-off. Costco rows still encode roadshow and listing timing.")

    headers = ["Brand", "Province", "Channel", "FY total"] + WEEK_LABELS
    for col_idx, val in enumerate(headers, start=1):
        c = ws.cell(row=5, column=col_idx, value=val)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        if col_idx >= FIRST_WEEK_COL:
            c.alignment = Alignment(horizontal="center")

    # Add a "month" reference row above week labels for visual orientation.
    for i, m in enumerate(WEEK_TO_MONTH, start=1):
        c = ws.cell(row=4, column=FIRST_WEEK_COL + i - 1, value=m)
        c.font = Font(italic=True, color="808080", size=9)
        c.alignment = Alignment(horizontal="center")

    # Monthly door plan baseline (from the original workbook).
    # Format: { (Brand, Province, Channel): {month: door_count} }
    monthly = {}

    def set_month(brand, prov, ch, values):
        """values is a 12-list aligned to MONTH_ORDER."""
        monthly[(brand, prov, ch)] = dict(zip(MONTH_ORDER, values))

    # --- MUV existing channels (from original Doors sheet) ---
    set_month("MUV", "BC", "Natural",   [80, 95, 110, 125, 140, 155, 170, 180, 190, 195, 200, 200])
    set_month("MUV", "BC", "Specialty", [10, 15, 20, 25, 30, 35, 42, 48, 52, 56, 58, 60])
    set_month("MUV", "BC", "FDM",       [0, 0, 8, 15, 20, 25, 28, 30, 33, 36, 38, 40])
    set_month("MUV", "BC", "Costco",    [0, 0, 0, 0, 0, 0, 60, 0, 0, 25, 25, 25])
    set_month("MUV", "AB", "Natural",   [5, 10, 18, 28, 38, 48, 58, 68, 75, 82, 87, 90])
    set_month("MUV", "AB", "Specialty", [3, 5, 8, 12, 16, 20, 24, 27, 30, 32, 33, 35])
    set_month("MUV", "AB", "FDM",       [0, 0, 0, 5, 10, 15, 18, 22, 25, 27, 28, 30])
    set_month("MUV", "AB", "Costco",    [0, 0, 0, 0, 0, 0, 40, 0, 0, 20, 22, 22])
    set_month("MUV", "SK", "Natural",   [0, 0, 2, 5, 8, 12, 15, 18, 20, 22, 24, 25])
    set_month("MUV", "SK", "Specialty", [0, 0, 1, 2, 4, 6, 8, 10, 12, 13, 14, 15])
    set_month("MUV", "SK", "FDM",       [0, 0, 0, 0, 2, 5, 7, 10, 12, 13, 14, 15])
    set_month("MUV", "SK", "Costco",    [0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7])
    set_month("MUV", "MB", "Natural",   [0, 0, 2, 4, 7, 10, 13, 15, 17, 19, 21, 22])
    set_month("MUV", "MB", "Specialty", [0, 0, 1, 2, 3, 5, 7, 8, 10, 11, 12, 13])
    set_month("MUV", "MB", "FDM",       [0, 0, 0, 0, 2, 4, 6, 8, 10, 12, 13, 14])
    set_month("MUV", "MB", "Costco",    [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 6])
    set_month("MUV", "ON", "Natural",   [10, 18, 28, 40, 55, 75, 95, 110, 125, 135, 145, 150])
    set_month("MUV", "ON", "Specialty", [5, 8, 12, 17, 23, 28, 33, 38, 42, 45, 48, 50])
    set_month("MUV", "ON", "FDM",       [0, 0, 5, 12, 20, 28, 35, 42, 48, 53, 57, 60])
    set_month("MUV", "ON", "Costco",    [0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 32, 35])
    set_month("MUV", "QC", "Natural",   [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75])
    set_month("MUV", "QC", "Specialty", [5, 8, 11, 14, 17, 20, 23, 25, 28, 30, 32, 32])
    set_month("MUV", "QC", "FDM",       [0, 0, 0, 5, 8, 12, 15, 18, 20, 22, 23, 25])
    set_month("MUV", "QC", "Costco",    [0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 22, 22])
    set_month("MUV", "NB", "Natural",   [0, 0, 1, 3, 5, 7, 9, 11, 13, 14, 15, 16])
    set_month("MUV", "NB", "Specialty", [0, 0, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10])
    set_month("MUV", "NB", "FDM",       [0, 0, 0, 0, 0, 2, 3, 5, 7, 8, 9, 10])
    set_month("MUV", "NB", "Costco",    [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 5])
    set_month("MUV", "NS", "Natural",   [0, 0, 1, 3, 5, 7, 9, 11, 13, 14, 15, 16])
    set_month("MUV", "NS", "Specialty", [0, 0, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10])
    set_month("MUV", "NS", "FDM",       [0, 0, 0, 0, 0, 2, 3, 5, 7, 8, 9, 10])
    set_month("MUV", "NS", "Costco",    [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 5])
    set_month("MUV", "PE", "Natural",   [0, 0, 0, 1, 2, 3, 4, 5, 6, 6, 7, 7])
    set_month("MUV", "PE", "Specialty", [0, 0, 0, 0, 1, 2, 2, 3, 3, 4, 4, 4])
    set_month("MUV", "PE", "FDM",       [0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3])
    set_month("MUV", "PE", "Costco",    [0] * 12)
    set_month("MUV", "NL", "Natural",   [0, 0, 0, 1, 2, 3, 4, 5, 6, 6, 7, 7])
    set_month("MUV", "NL", "Specialty", [0, 0, 0, 0, 1, 2, 2, 3, 3, 4, 4, 4])
    set_month("MUV", "NL", "FDM",       [0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3])
    set_month("MUV", "NL", "Costco",    [0] * 12)

    # --- New channel placeholders for MUV ---
    # (12 monthly values; ramp from start to end-of-FY)
    muv_new_channel_plan = {
        "On-Premise": {
            "BC": [30, 40, 55, 70, 80, 90, 100, 105, 110, 115, 118, 120],
            "AB": [20, 28, 38, 48, 56, 62, 68, 72, 75, 78, 80, 82],
            "SK": [5, 8, 12, 15, 18, 21, 24, 26, 28, 29, 30, 30],
            "MB": [5, 8, 12, 15, 18, 21, 24, 26, 28, 29, 30, 30],
            "ON": [40, 55, 75, 90, 105, 120, 130, 140, 145, 150, 152, 155],
            "QC": [30, 45, 60, 75, 85, 95, 105, 110, 115, 118, 120, 122],
            "NB": [3, 5, 7, 9, 10, 11, 12, 13, 14, 14, 15, 15],
            "NS": [3, 5, 7, 9, 10, 11, 12, 13, 14, 14, 15, 15],
            "PE": [1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5],
            "NL": [1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5],
        },
        "Convenience": {
            "BC": [20, 30, 45, 60, 70, 80, 88, 92, 95, 98, 100, 100],
            "AB": [15, 22, 32, 45, 55, 62, 68, 72, 75, 78, 80, 80],
            "SK": [5, 8, 12, 16, 20, 23, 25, 27, 28, 29, 30, 30],
            "MB": [5, 8, 12, 16, 20, 23, 25, 27, 28, 29, 30, 30],
            "ON": [50, 75, 105, 130, 150, 170, 180, 190, 195, 198, 200, 200],
            "QC": [30, 50, 70, 90, 105, 115, 122, 126, 128, 130, 130, 130],
            "NB": [3, 5, 7, 9, 11, 12, 13, 14, 14, 15, 15, 15],
            "NS": [3, 5, 7, 9, 11, 12, 13, 14, 14, 15, 15, 15],
            "PE": [1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5],
            "NL": [1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5],
        },
        "Gym & Fitness": {
            "BC": [15, 22, 30, 38, 44, 50, 54, 56, 58, 59, 60, 60],
            "AB": [10, 16, 24, 32, 38, 42, 45, 47, 49, 50, 50, 50],
            "SK": [3, 5, 7, 9, 11, 12, 13, 14, 14, 15, 15, 15],
            "MB": [3, 5, 7, 9, 11, 12, 13, 14, 14, 15, 15, 15],
            "ON": [25, 38, 55, 70, 82, 90, 95, 98, 99, 100, 100, 100],
            "QC": [15, 22, 32, 42, 50, 55, 58, 59, 60, 60, 60, 60],
            "NB": [2, 3, 4, 5, 6, 7, 7, 8, 8, 8, 8, 8],
            "NS": [2, 3, 4, 5, 6, 7, 7, 8, 8, 8, 8, 8],
            "PE": [0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3],
            "NL": [0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3],
        },
        # Private Liquor: only meaningful in BC, AB, SK, MB
        "Private Liquor": {
            "BC": [10, 15, 22, 28, 34, 40, 44, 47, 49, 50, 50, 50],
            "AB": [8, 12, 18, 24, 30, 34, 37, 39, 40, 40, 40, 40],
            "SK": [0, 0, 2, 4, 6, 8, 10, 12, 14, 15, 15, 15],
            "MB": [0, 0, 2, 4, 6, 8, 10, 11, 12, 13, 14, 15],
            "ON": [0] * 12, "QC": [0] * 12, "NB": [0] * 12,
            "NS": [0] * 12, "PE": [0] * 12, "NL": [0] * 12,
        },
        # RAS (rural agency stores): ON, NB, NS most relevant
        "RAS": {
            "BC": [0] * 12, "AB": [0] * 12, "SK": [0] * 12, "MB": [0] * 12,
            "ON": [5, 8, 12, 16, 20, 24, 26, 28, 29, 30, 30, 30],
            "QC": [0] * 12,
            "NB": [2, 3, 5, 6, 7, 8, 9, 10, 10, 10, 10, 10],
            "NS": [2, 3, 5, 6, 7, 8, 9, 10, 10, 10, 10, 10],
            "PE": [0] * 12, "NL": [0] * 12,
        },
    }

    for ch, prov_map in muv_new_channel_plan.items():
        for prov, vals in prov_map.items():
            set_month("MUV", prov, ch, vals)

    # --- LCA (only BC ramps in original; for new channels keep zero placeholders) ---
    set_month("LCA", "BC", "Natural",   [0, 0, 0, 0, 5, 10, 15, 20, 25, 28, 30, 32])
    set_month("LCA", "BC", "Specialty", [0, 0, 0, 0, 2, 5, 8, 12, 15, 17, 18, 20])
    set_month("LCA", "BC", "FDM",       [0] * 12)
    set_month("LCA", "BC", "Costco",    [0] * 12)
    # LCA - new channels for BC: small ramp from H2 (Jan onward) to recognise restaurants/gyms fit
    set_month("LCA", "BC", "On-Premise",     [0, 0, 0, 0, 3, 6, 10, 14, 18, 20, 22, 24])
    set_month("LCA", "BC", "Convenience",    [0, 0, 0, 0, 5, 10, 15, 20, 25, 28, 30, 32])
    set_month("LCA", "BC", "Gym & Fitness",  [0, 0, 0, 0, 3, 6, 10, 13, 16, 18, 20, 22])
    set_month("LCA", "BC", "Private Liquor", [0] * 12)
    set_month("LCA", "BC", "RAS",            [0] * 12)
    # All other LCA province/channel combos = zero
    for prov in PROVINCES:
        for ch in CHANNELS:
            if ("LCA", prov, ch) not in monthly:
                set_month("LCA", prov, ch, [0] * 12)

    # Determine which new-channel rows should be flagged yellow (new channels).
    new_channels = {"On-Premise", "Convenience", "Gym & Fitness", "Private Liquor", "RAS"}

    # Write rows: ordered Brand, Province, Channel (with channel as innermost).
    row = 6
    for brand in ("MUV", "LCA"):
        for prov in PROVINCES:
            for ch in CHANNELS:
                key = (brand, prov, ch)
                month_vals = monthly.get(key, {m: 0 for m in MONTH_ORDER})
                ws.cell(row=row, column=1, value=brand)
                ws.cell(row=row, column=2, value=prov)
                ws.cell(row=row, column=3, value=ch)
                fy_total_col = get_column_letter(4)
                first = week_col(1)
                last = week_col(N_WEEKS)
                ws.cell(row=row, column=4, value=f"=SUM({first}{row}:{last}{row})")
                # Populate each week with that week's month value
                for wi in range(1, N_WEEKS + 1):
                    month_name = WEEK_TO_MONTH[wi - 1]
                    val = month_vals.get(month_name, 0)
                    cell = ws.cell(row=row, column=FIRST_WEEK_COL + wi - 1, value=val)
                    cell.font = INPUT_FONT
                    if ch in new_channels:
                        cell.fill = YELLOW_FILL
                row += 1

    # National total row
    total_row = row
    ws.cell(row=total_row, column=1, value="National total").font = HEADER_FONT
    first = week_col(1)
    last = week_col(N_WEEKS)
    ws.cell(row=total_row, column=4,
            value=f"=SUM(D6:D{total_row - 1})").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        col_letter = get_column_letter(col)
        c = ws.cell(row=total_row, column=col,
                    value=f"=SUM({col_letter}6:{col_letter}{total_row - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    # Column widths
    ws.column_dimensions["A"].width = 8
    ws.column_dimensions["B"].width = 6
    ws.column_dimensions["C"].width = 15
    ws.column_dimensions["D"].width = 10
    for wi in range(1, N_WEEKS + 1):
        ws.column_dimensions[get_column_letter(FIRST_WEEK_COL + wi - 1)].width = 12

    # Freeze panes so brand/prov/channel columns and headers stay visible
    ws.freeze_panes = "E6"
    return total_row  # Final data row for downstream references


def build_marketing(ws):
    ws.title = "Marketing and Sampling"
    ws["A1"] = "Marketing and sampling cases"
    ws["A1"].font = TITLE_FONT
    ws["A3"] = ("All figures in cases per week. Feeds into the production demand calculation. "
                "New-channel sampling rates are yellow placeholders.")

    # Layout:
    # Row 5: header row for monthly summary  (we'll use weekly summary)
    # Rows 6-10: summary subtotals
    # Section 1: Account sampling (one row per channel)
    # Section 2: Events and activations
    # Section 3: Rep samples
    # Section 4: Buffer

    # Header row
    ws.cell(row=5, column=1, value="Bucket").font = HEADER_FONT
    write_week_headers(ws, 5)

    # Summary placeholders -- filled with formulas after sections built
    bucket_labels = [
        "Account sampling subtotal",
        "Events subtotal",
        "Rep samples subtotal",
        "Buffer subtotal",
        "Total marketing and sampling",
    ]
    for i, lbl in enumerate(bucket_labels, start=6):
        ws.cell(row=i, column=1, value=lbl).font = HEADER_FONT

    # --- Section 1: Account sampling ---
    sec1_header = 13
    ws.cell(row=sec1_header, column=1, value="Section 1: Account sampling").font = SECTION_FONT
    ws.cell(row=sec1_header + 1, column=1, value="Channel").font = HEADER_FONT
    ws.cell(row=sec1_header + 1, column=2, value="Cases per door per week").font = HEADER_FONT
    write_week_headers(ws, sec1_header + 1)

    # Sampling rate per channel per week
    sampling_rates = {
        "Natural":          0.025,
        "Specialty":        0.020,
        "FDM":              0.0125,
        "Costco":           0.050,
        "On-Premise":       0.040,
        "Convenience":      0.005,
        "Gym & Fitness":    0.050,
        "Private Liquor":   0.010,
        "RAS":              0.010,
    }
    new_channels = {"On-Premise", "Convenience", "Gym & Fitness", "Private Liquor", "RAS"}

    sec1_first_data = sec1_header + 2
    for i, ch in enumerate(CHANNELS):
        r = sec1_first_data + i
        ws.cell(row=r, column=1, value=ch)
        rate_cell = ws.cell(row=r, column=2, value=sampling_rates[ch])
        rate_cell.font = INPUT_FONT
        rate_cell.number_format = "0.0000"
        if ch in new_channels:
            rate_cell.fill = YELLOW_FILL
        for wi in range(1, N_WEEKS + 1):
            col = FIRST_WEEK_COL + wi - 1
            colL = get_column_letter(col)
            ws.cell(row=r, column=col,
                    value=(f"=$B{r}*SUMIFS(Doors!{colL}:{colL},"
                           f"Doors!$C:$C,$A{r})")).font = LINK_FONT
    sec1_last_data = sec1_first_data + len(CHANNELS) - 1
    sec1_total_row = sec1_last_data + 1
    ws.cell(row=sec1_total_row, column=1, value="Account sampling total").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=sec1_total_row, column=col,
                    value=f"=SUM({colL}{sec1_first_data}:{colL}{sec1_last_data})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    # --- Section 2: Events and activations (sparse, mapped to specific weeks) ---
    sec2_header = sec1_total_row + 2
    ws.cell(row=sec2_header, column=1, value="Section 2: Events and activations").font = SECTION_FONT
    ws.cell(row=sec2_header + 1, column=1, value="Event").font = HEADER_FONT
    ws.cell(row=sec2_header + 1, column=2, value="Notes").font = HEADER_FONT
    write_week_headers(ws, sec2_header + 1)

    # Events: (label, notes, {week_num: cases}). For monthly recurring events, distribute across the 4-5 weeks of each month.
    def evenly_in_month(month, total):
        """Spread `total` cases across all weeks in `month`."""
        wks = [i + 1 for i, m in enumerate(WEEK_TO_MONTH) if m == month]
        if not wks:
            return {}
        per = total / len(wks)
        return {w: per for w in wks}

    def recurring_each_month(total_per_month):
        out = {}
        for m in MONTH_ORDER:
            out.update(evenly_in_month(m, total_per_month))
        return out

    def first_week_of_month(month, total):
        wks = [i + 1 for i, m in enumerate(WEEK_TO_MONTH) if m == month]
        return {wks[0]: total} if wks else {}

    events = [
        ("CHFA West (Vancouver)", "Trade show, BC retailer engagement.",
            first_week_of_month("Sep 2026", 25)),
        ("Indie Alley demo days", "Recurring sampling at independents.",
            recurring_each_month(3)),
        ("Marche Tao launch event", "Quebec brand launch activation.",
            first_week_of_month("Sep 2026", 15)),
        ("Costco BC roadshow", "Roadshow sampling support.",
            first_week_of_month("Mar 2027", 60)),
        ("Costco AB roadshow", "Roadshow sampling support.",
            first_week_of_month("Mar 2027", 40)),
        ("CHFA East (Toronto)", "Trade show, ON retailer engagement.",
            first_week_of_month("Apr 2027", 25)),
        ("BCAA Wellness Tour", "Brand and sampling tour, BC.",
            {**first_week_of_month("Apr 2027", 15), **first_week_of_month("May 2027", 15)}),
        ("Toronto Vegfest", "Ontario consumer activation.",
            first_week_of_month("Jun 2027", 20)),
        ("Calgary Stampede", "AB consumer activation.",
            first_week_of_month("Jul 2027", 25)),
        ("Yoga and fitness partners", "Studio sampling, ongoing.",
            recurring_each_month(3)),
        ("Influencer seeding", "Content creator sampling, ongoing.",
            recurring_each_month(4)),
        # New-channel-specific events
        ("Restaurant launch dinners", "On-premise activation, MUV + LCA.",
            {**first_week_of_month("Oct 2026", 5), **first_week_of_month("Nov 2026", 5),
             **first_week_of_month("Feb 2027", 5), **first_week_of_month("May 2027", 5)}),
        ("Convenience sales blitz", "C-store rep ride-alongs, sampling.",
            recurring_each_month(2)),
    ]
    sec2_first_data = sec2_header + 2
    for i, (lbl, note, weekmap) in enumerate(events):
        r = sec2_first_data + i
        ws.cell(row=r, column=1, value=lbl)
        ws.cell(row=r, column=2, value=note)
        for wi in range(1, N_WEEKS + 1):
            col = FIRST_WEEK_COL + wi - 1
            val = weekmap.get(wi, 0)
            cell = ws.cell(row=r, column=col, value=val)
            cell.font = INPUT_FONT
    sec2_last_data = sec2_first_data + len(events) - 1
    sec2_total_row = sec2_last_data + 1
    ws.cell(row=sec2_total_row, column=1, value="Events total").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=sec2_total_row, column=col,
                    value=f"=SUM({colL}{sec2_first_data}:{colL}{sec2_last_data})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    # --- Section 3: Rep samples ---
    sec3_header = sec2_total_row + 2
    ws.cell(row=sec3_header, column=1, value="Section 3: Rep samples").font = SECTION_FONT
    ws.cell(row=sec3_header + 1, column=1, value="Cases per rep per week")
    ws.cell(row=sec3_header + 1, column=2, value=1.0).font = INPUT_FONT  # 4 cases/month -> ~1/week
    ws.cell(row=sec3_header + 2, column=1, value="Province").font = HEADER_FONT
    write_week_headers(ws, sec3_header + 2)

    # Rep counts by province by month (from original)
    rep_plan_monthly = {
        "BC": [2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3],
        "AB": [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2],
        "SK": [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
        "MB": [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
        "ON": [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2],
        "QC": [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
        "NB": [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
        "NS": [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
        "PE": [0] * 12,
        "NL": [0] * 12,
    }
    sec3_first_data = sec3_header + 3
    for i, prov in enumerate(PROVINCES):
        r = sec3_first_data + i
        ws.cell(row=r, column=1, value=prov)
        month_vals = dict(zip(MONTH_ORDER, rep_plan_monthly[prov]))
        for wi in range(1, N_WEEKS + 1):
            col = FIRST_WEEK_COL + wi - 1
            val = month_vals.get(WEEK_TO_MONTH[wi - 1], 0)
            cell = ws.cell(row=r, column=col, value=val)
            cell.font = INPUT_FONT
    sec3_total_reps_row = sec3_first_data + len(PROVINCES)
    sec3_sample_row = sec3_total_reps_row + 1
    ws.cell(row=sec3_total_reps_row, column=1, value="Total reps active").font = HEADER_FONT
    ws.cell(row=sec3_sample_row, column=1, value="Rep sample cases total").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        ws.cell(row=sec3_total_reps_row, column=col,
                value=f"=SUM({colL}{sec3_first_data}:{colL}{sec3_first_data + len(PROVINCES) - 1})").font = HEADER_FONT
        c = ws.cell(row=sec3_sample_row, column=col,
                    value=f"=$B${sec3_header + 1}*{colL}{sec3_total_reps_row}")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    # --- Section 4: Buffer ---
    sec4_header = sec3_sample_row + 2
    ws.cell(row=sec4_header, column=1,
            value="Section 4: Buffer (gifting, R&D, content, freight, unallocated)").font = SECTION_FONT
    ws.cell(row=sec4_header + 1, column=1, value="Line item").font = HEADER_FONT
    ws.cell(row=sec4_header + 1, column=2, value="Notes").font = HEADER_FONT
    write_week_headers(ws, sec4_header + 1)

    buffer_items = [
        ("Gifting", "Aaron and Teresa gifting allocation.", 0.5),
        ("R and D samples", "Formulation tests, internal taste panels.", 0.75),
        ("Photo and content", "Brand asset shoots, ongoing.", 0.5),
        ("Freight returns", "Damaged or returned cases.", 0.25),
        ("Unallocated", "Reserve for unplanned asks.", 0.75),
    ]
    sec4_first_data = sec4_header + 2
    for i, (lbl, note, per_week) in enumerate(buffer_items):
        r = sec4_first_data + i
        ws.cell(row=r, column=1, value=lbl)
        ws.cell(row=r, column=2, value=note)
        for wi in range(1, N_WEEKS + 1):
            col = FIRST_WEEK_COL + wi - 1
            cell = ws.cell(row=r, column=col, value=per_week)
            cell.font = INPUT_FONT
    sec4_total_row = sec4_first_data + len(buffer_items)
    ws.cell(row=sec4_total_row, column=1, value="Buffer total").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=sec4_total_row, column=col,
                    value=f"=SUM({colL}{sec4_first_data}:{colL}{sec4_total_row - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    # Now wire the summary at top
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        ws.cell(row=6, column=col, value=f"={colL}{sec1_total_row}").font = LINK_FONT
        ws.cell(row=7, column=col, value=f"={colL}{sec2_total_row}").font = LINK_FONT
        ws.cell(row=8, column=col, value=f"={colL}{sec3_sample_row}").font = LINK_FONT
        ws.cell(row=9, column=col, value=f"={colL}{sec4_total_row}").font = LINK_FONT
        c = ws.cell(row=10, column=col, value=f"=SUM({colL}6:{colL}9)")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 18
    for wi in range(1, N_WEEKS + 1):
        ws.column_dimensions[get_column_letter(FIRST_WEEK_COL + wi - 1)].width = 11

    ws.freeze_panes = "C6"

    return {
        "summary_acct": 6,
        "summary_events": 7,
        "summary_reps": 8,
        "summary_buffer": 9,
        "summary_total": 10,
    }


def build_forecast_weekly(ws, doors_total_row):
    ws.title = "Forecast Weekly"
    ws["A1"] = "Forecast weekly sales cases"
    ws["A1"].font = TITLE_FONT
    ws["A3"] = (f"Calculation engine. {len(SKUS) * len(PROVINCES) * len(CHANNELS)} row grid "
                f"({len(SKUS)} SKUs x {len(PROVINCES)} provinces x {len(CHANNELS)} channels). Do not edit.")

    headers = ["SKU", "Province", "Channel", "Brand"] + WEEK_LABELS
    for col_idx, val in enumerate(headers, start=1):
        c = ws.cell(row=5, column=col_idx, value=val)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        if col_idx >= FIRST_WEEK_COL:
            c.alignment = Alignment(horizontal="center")

    # Month reference row
    for i, m in enumerate(WEEK_TO_MONTH, start=1):
        c = ws.cell(row=4, column=FIRST_WEEK_COL + i - 1, value=m)
        c.font = Font(italic=True, color="808080", size=9)
        c.alignment = Alignment(horizontal="center")

    row = 6
    for sku in SKUS:
        brand = SKU_BRAND[sku]
        for prov in PROVINCES:
            for ch in CHANNELS:
                ws.cell(row=row, column=1, value=sku)
                ws.cell(row=row, column=2, value=prov)
                ws.cell(row=row, column=3, value=ch)
                ws.cell(row=row, column=4, value=brand)
                for wi in range(1, N_WEEKS + 1):
                    col = FIRST_WEEK_COL + wi - 1
                    colL = get_column_letter(col)
                    formula = (
                        f"=SUMIFS(Doors!{colL}:{colL},Doors!$A:$A,$D{row},"
                        f"Doors!$B:$B,$B{row},Doors!$C:$C,$C{row})"
                        f"*SUMIFS(Velocity!$I:$I,Velocity!$A:$A,$A{row},"
                        f"Velocity!$B:$B,$C{row})/Assumptions!$B$4*Assumptions!$B$6"
                    )
                    ws.cell(row=row, column=col, value=formula).font = LINK_FONT
                row += 1
    total_row = row
    ws.cell(row=total_row, column=1, value="National total").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=total_row, column=col,
                    value=f"=SUM({colL}6:{colL}{total_row - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 6
    ws.column_dimensions["C"].width = 15
    ws.column_dimensions["D"].width = 8
    for wi in range(1, N_WEEKS + 1):
        ws.column_dimensions[get_column_letter(FIRST_WEEK_COL + wi - 1)].width = 11

    ws.freeze_panes = "E6"
    return total_row


def build_production_plan(ws, forecast_total_row, marketing_summary_rows):
    ws.title = "Production Plan"
    ws["A1"] = "Production plan (cases)"
    ws["A1"].font = TITLE_FONT
    ws["A3"] = ("Sales cases + marketing and sampling = total cases to produce. "
                "Buffer applied at the end. Weekly grain.")

    ws["A5"] = "Sales by SKU"
    ws["A5"].font = SECTION_FONT
    headers = ["SKU"] + [""] * 3 + WEEK_LABELS + ["FY total"]
    for col_idx, val in enumerate(headers, start=1):
        c = ws.cell(row=6, column=col_idx, value=val)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        if val and col_idx >= FIRST_WEEK_COL:
            c.alignment = Alignment(horizontal="center")

    fy_col = FIRST_WEEK_COL + N_WEEKS  # column after last week
    fy_col_letter = get_column_letter(fy_col)

    # Sales rows
    for i, sku in enumerate(SKUS):
        r = 7 + i
        ws.cell(row=r, column=1, value=sku)
        for wi in range(1, N_WEEKS + 1):
            col = FIRST_WEEK_COL + wi - 1
            colL = get_column_letter(col)
            ws.cell(row=r, column=col,
                    value=(f"=SUMIFS('Forecast Weekly'!{colL}:{colL},"
                           f"'Forecast Weekly'!$A:$A,$A{r})")).font = LINK_FONT
        ws.cell(row=r, column=fy_col,
                value=f"=SUM({get_column_letter(FIRST_WEEK_COL)}{r}:{get_column_letter(LAST_WEEK_COL)}{r})")

    total_sales_row = 7 + len(SKUS)
    ws.cell(row=total_sales_row, column=1, value="Total sales cases").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=total_sales_row, column=col,
                    value=f"=SUM({colL}7:{colL}{total_sales_row - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL
    ws.cell(row=total_sales_row, column=fy_col,
            value=(f"=SUM({get_column_letter(FIRST_WEEK_COL)}{total_sales_row}:"
                   f"{get_column_letter(LAST_WEEK_COL)}{total_sales_row})")).font = HEADER_FONT

    # Marketing breakdown
    mk_header_row = total_sales_row + 2
    ws.cell(row=mk_header_row, column=1, value="Marketing and sampling breakdown").font = SECTION_FONT

    mk_rows = [
        ("Account sampling",      marketing_summary_rows["summary_acct"]),
        ("Events and activations", marketing_summary_rows["summary_events"]),
        ("Rep samples",            marketing_summary_rows["summary_reps"]),
        ("Buffer",                 marketing_summary_rows["summary_buffer"]),
    ]
    mk_first = mk_header_row + 1
    for i, (lbl, mk_row) in enumerate(mk_rows):
        r = mk_first + i
        ws.cell(row=r, column=1, value=lbl)
        for wi in range(1, N_WEEKS + 1):
            col = FIRST_WEEK_COL + wi - 1
            colL = get_column_letter(col)
            ws.cell(row=r, column=col,
                    value=f"='Marketing and Sampling'!{colL}{mk_row}").font = LINK_FONT
        ws.cell(row=r, column=fy_col,
                value=(f"=SUM({get_column_letter(FIRST_WEEK_COL)}{r}:"
                       f"{get_column_letter(LAST_WEEK_COL)}{r})"))

    mk_total_row = mk_first + len(mk_rows)
    ws.cell(row=mk_total_row, column=1, value="Total marketing and sampling").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=mk_total_row, column=col,
                    value=f"=SUM({colL}{mk_first}:{colL}{mk_total_row - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL
    ws.cell(row=mk_total_row, column=fy_col,
            value=(f"=SUM({get_column_letter(FIRST_WEEK_COL)}{mk_total_row}:"
                   f"{get_column_letter(LAST_WEEK_COL)}{mk_total_row})")).font = HEADER_FONT

    # Total production
    total_prod_row = mk_total_row + 2
    ws.cell(row=total_prod_row, column=1, value="Total cases to produce").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=total_prod_row, column=col,
                    value=f"={colL}{total_sales_row}+{colL}{mk_total_row}")
        c.font = HEADER_FONT
    ws.cell(row=total_prod_row, column=fy_col,
            value=(f"=SUM({get_column_letter(FIRST_WEEK_COL)}{total_prod_row}:"
                   f"{get_column_letter(LAST_WEEK_COL)}{total_prod_row})")).font = HEADER_FONT

    # Production with buffer
    buf_row = total_prod_row + 1
    ws.cell(row=buf_row, column=1, value="Production with buffer").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=buf_row, column=col,
                    value=f"={colL}{total_prod_row}*(1+Assumptions!$B$5)")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL
    ws.cell(row=buf_row, column=fy_col,
            value=(f"=SUM({get_column_letter(FIRST_WEEK_COL)}{buf_row}:"
                   f"{get_column_letter(LAST_WEEK_COL)}{buf_row})")).font = HEADER_FONT

    ws.column_dimensions["A"].width = 30
    for wi in range(1, N_WEEKS + 1):
        ws.column_dimensions[get_column_letter(FIRST_WEEK_COL + wi - 1)].width = 11
    ws.column_dimensions[fy_col_letter].width = 14

    ws.freeze_panes = "B7"

    return {
        "total_sales_row": total_sales_row,
        "mk_total_row": mk_total_row,
        "total_prod_row": total_prod_row,
        "buf_row": buf_row,
        "fy_col": fy_col,
    }


def build_revenue(ws):
    ws.title = "Revenue"
    ws["A1"] = "Revenue and gross profit"
    ws["A1"].font = TITLE_FONT
    ws["A3"] = ("Revenue = sales cases x net case price. "
                "Gross profit = sales cases x (price minus cost). All CAD. Weekly grain.")

    ws["A5"] = "Revenue (CAD)"
    ws["A5"].font = SECTION_FONT

    fy_col = FIRST_WEEK_COL + N_WEEKS
    fy_col_letter = get_column_letter(fy_col)

    headers = ["SKU"] + [""] * 3 + WEEK_LABELS + ["FY total"]
    for col_idx, val in enumerate(headers, start=1):
        c = ws.cell(row=6, column=col_idx, value=val)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL

    for i, sku in enumerate(SKUS):
        r = 7 + i
        ws.cell(row=r, column=1, value=sku)
        for wi in range(1, N_WEEKS + 1):
            col = FIRST_WEEK_COL + wi - 1
            colL = get_column_letter(col)
            ws.cell(row=r, column=col,
                    value=(f"=SUMIFS('Forecast Weekly'!{colL}:{colL},"
                           f"'Forecast Weekly'!$A:$A,$A{r})*"
                           f"VLOOKUP($A{r},Pricing!$A$6:$B$9,2,FALSE)")).font = LINK_FONT
            ws.cell(row=r, column=col).number_format = "$#,##0"
        ws.cell(row=r, column=fy_col,
                value=(f"=SUM({get_column_letter(FIRST_WEEK_COL)}{r}:"
                       f"{get_column_letter(LAST_WEEK_COL)}{r})")).number_format = "$#,##0"

    rev_total_row = 7 + len(SKUS)
    ws.cell(row=rev_total_row, column=1, value="Total revenue").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=rev_total_row, column=col,
                    value=f"=SUM({colL}7:{colL}{rev_total_row - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL
        c.number_format = "$#,##0"
    ws.cell(row=rev_total_row, column=fy_col,
            value=(f"=SUM({get_column_letter(FIRST_WEEK_COL)}{rev_total_row}:"
                   f"{get_column_letter(LAST_WEEK_COL)}{rev_total_row})")).number_format = "$#,##0"

    # Gross profit
    gp_header_row = rev_total_row + 2
    ws.cell(row=gp_header_row, column=1, value="Gross profit (CAD)").font = SECTION_FONT
    gp_hdr_row = gp_header_row + 1
    for col_idx, val in enumerate(headers, start=1):
        c = ws.cell(row=gp_hdr_row, column=col_idx, value=val)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
    for i, sku in enumerate(SKUS):
        r = gp_hdr_row + 1 + i
        ws.cell(row=r, column=1, value=sku)
        for wi in range(1, N_WEEKS + 1):
            col = FIRST_WEEK_COL + wi - 1
            colL = get_column_letter(col)
            ws.cell(row=r, column=col,
                    value=(f"=SUMIFS('Forecast Weekly'!{colL}:{colL},"
                           f"'Forecast Weekly'!$A:$A,$A{r})*"
                           f"VLOOKUP($A{r},Pricing!$A$6:$D$9,4,FALSE)")).font = LINK_FONT
            ws.cell(row=r, column=col).number_format = "$#,##0"
        ws.cell(row=r, column=fy_col,
                value=(f"=SUM({get_column_letter(FIRST_WEEK_COL)}{r}:"
                       f"{get_column_letter(LAST_WEEK_COL)}{r})")).number_format = "$#,##0"

    gp_total_row = gp_hdr_row + 1 + len(SKUS)
    ws.cell(row=gp_total_row, column=1, value="Total gross profit").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = FIRST_WEEK_COL + wi - 1
        colL = get_column_letter(col)
        c = ws.cell(row=gp_total_row, column=col,
                    value=f"=SUM({colL}{gp_hdr_row + 1}:{colL}{gp_total_row - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL
        c.number_format = "$#,##0"
    ws.cell(row=gp_total_row, column=fy_col,
            value=(f"=SUM({get_column_letter(FIRST_WEEK_COL)}{gp_total_row}:"
                   f"{get_column_letter(LAST_WEEK_COL)}{gp_total_row})")).number_format = "$#,##0"

    ws.column_dimensions["A"].width = 22
    for wi in range(1, N_WEEKS + 1):
        ws.column_dimensions[get_column_letter(FIRST_WEEK_COL + wi - 1)].width = 11
    ws.column_dimensions[fy_col_letter].width = 14

    ws.freeze_panes = "B7"

    return {
        "rev_total_row": rev_total_row,
        "gp_total_row": gp_total_row,
        "fy_col": fy_col,
    }


def build_dashboard(ws, prod_refs, rev_refs, doors_total_row, forecast_total_row):
    ws.title = "Dashboard"
    ws["A1"] = "Organika RTD national forecast dashboard - FY26 to FY27 (weekly)"
    ws["A1"].font = TITLE_FONT
    ws["A3"] = "All figures reconcile to underlying tabs. Edit on input tabs only."

    # Build a helper: month -> list of week columns
    month_to_cols = {m: [] for m in MONTH_ORDER}
    for wi, m in enumerate(WEEK_TO_MONTH, start=1):
        month_to_cols[m].append(week_col(wi))

    def sum_month(sheet, base_row, month):
        """Sum cells in `sheet`!<col>{base_row} for each week column in `month`."""
        cols = month_to_cols[month]
        terms = [f"'{sheet}'!{c}{base_row}" for c in cols]
        return "=" + "+".join(terms)

    # Headline metrics
    ws["A5"] = "Headline metrics"
    ws["A5"].font = SECTION_FONT
    ws["A6"] = "Metric"; ws["B6"] = "Value"; ws["C6"] = "Source"
    for cell in (ws["A6"], ws["B6"], ws["C6"]):
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL

    fy_col_prod = get_column_letter(prod_refs["fy_col"])
    fy_col_rev = get_column_letter(rev_refs["fy_col"])

    headline = [
        ("Total sales cases",                  f"='Production Plan'!{fy_col_prod}{prod_refs['total_sales_row']}", "Production Plan"),
        ("Total marketing and sampling cases", f"='Production Plan'!{fy_col_prod}{prod_refs['mk_total_row']}", "Production Plan"),
        ("Total cases to produce",             f"='Production Plan'!{fy_col_prod}{prod_refs['total_prod_row']}", "Production Plan"),
        ("Production with buffer",             f"='Production Plan'!{fy_col_prod}{prod_refs['buf_row']}", "Production Plan x (1 + buffer)"),
        ("Total revenue (CAD)",                f"=Revenue!{fy_col_rev}{rev_refs['rev_total_row']}", "Revenue tab"),
        ("Total gross profit (CAD)",           f"=Revenue!{fy_col_rev}{rev_refs['gp_total_row']}", "Revenue tab"),
        ("Gross profit %",                     f"=Revenue!{fy_col_rev}{rev_refs['gp_total_row']}/Revenue!{fy_col_rev}{rev_refs['rev_total_row']}", "Calculated"),
        ("Active doors at year end (W52)",     f"=Doors!{week_col(N_WEEKS)}{doors_total_row}", "Doors national total, W52"),
        ("Scenario multiplier in effect",      "=Assumptions!B6",                                  "Assumptions tab"),
    ]
    for i, (lbl, val, src) in enumerate(headline, start=7):
        ws.cell(row=i, column=1, value=lbl)
        ws.cell(row=i, column=2, value=val).font = LINK_FONT
        ws.cell(row=i, column=3, value=src)
    ws["B11"].number_format = "$#,##0"  # revenue
    ws["B12"].number_format = "$#,##0"  # GP
    ws["B13"].number_format = "0.0%"

    # Monthly sales cases by SKU
    base_row = 18
    ws.cell(row=base_row, column=1, value="Monthly sales cases by SKU").font = SECTION_FONT
    ws.cell(row=base_row + 1, column=1, value="SKU").font = HEADER_FONT
    for j, m in enumerate(MONTH_ORDER):
        c = ws.cell(row=base_row + 1, column=2 + j, value=m)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
    ws.cell(row=base_row + 1, column=2 + len(MONTH_ORDER), value="FY total").font = HEADER_FONT
    for i, sku in enumerate(SKUS):
        r = base_row + 2 + i
        ws.cell(row=r, column=1, value=sku)
        for j, m in enumerate(MONTH_ORDER):
            cols = month_to_cols[m]
            terms = [(f"SUMIFS('Forecast Weekly'!{c}:{c},'Forecast Weekly'!$A:$A,$A{r})") for c in cols]
            ws.cell(row=r, column=2 + j, value="=" + "+".join(terms)).font = LINK_FONT
        last_col = 2 + len(MONTH_ORDER) - 1
        ws.cell(row=r, column=2 + len(MONTH_ORDER),
                value=f"=SUM({get_column_letter(2)}{r}:{get_column_letter(last_col)}{r})")
    total_r = base_row + 2 + len(SKUS)
    ws.cell(row=total_r, column=1, value="Total").font = HEADER_FONT
    for j in range(len(MONTH_ORDER) + 1):
        col = 2 + j
        colL = get_column_letter(col)
        c = ws.cell(row=total_r, column=col,
                    value=f"=SUM({colL}{base_row + 2}:{colL}{total_r - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    # Monthly sales by channel
    chan_base = total_r + 3
    ws.cell(row=chan_base, column=1, value="Monthly sales cases by channel").font = SECTION_FONT
    ws.cell(row=chan_base + 1, column=1, value="Channel").font = HEADER_FONT
    for j, m in enumerate(MONTH_ORDER):
        c = ws.cell(row=chan_base + 1, column=2 + j, value=m)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
    ws.cell(row=chan_base + 1, column=2 + len(MONTH_ORDER), value="FY total").font = HEADER_FONT
    for i, ch in enumerate(CHANNELS):
        r = chan_base + 2 + i
        ws.cell(row=r, column=1, value=ch)
        for j, m in enumerate(MONTH_ORDER):
            cols = month_to_cols[m]
            terms = [(f"SUMIFS('Forecast Weekly'!{c}:{c},'Forecast Weekly'!$C:$C,$A{r})") for c in cols]
            ws.cell(row=r, column=2 + j, value="=" + "+".join(terms)).font = LINK_FONT
        ws.cell(row=r, column=2 + len(MONTH_ORDER),
                value=f"=SUM({get_column_letter(2)}{r}:{get_column_letter(2 + len(MONTH_ORDER) - 1)}{r})")
    chan_total_r = chan_base + 2 + len(CHANNELS)
    ws.cell(row=chan_total_r, column=1, value="Total").font = HEADER_FONT
    for j in range(len(MONTH_ORDER) + 1):
        col = 2 + j
        colL = get_column_letter(col)
        c = ws.cell(row=chan_total_r, column=col,
                    value=f"=SUM({colL}{chan_base + 2}:{colL}{chan_total_r - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    # Monthly sales by province
    prov_base = chan_total_r + 3
    ws.cell(row=prov_base, column=1, value="Monthly sales cases by province").font = SECTION_FONT
    ws.cell(row=prov_base + 1, column=1, value="Province").font = HEADER_FONT
    for j, m in enumerate(MONTH_ORDER):
        c = ws.cell(row=prov_base + 1, column=2 + j, value=m)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
    ws.cell(row=prov_base + 1, column=2 + len(MONTH_ORDER), value="FY total").font = HEADER_FONT
    for i, prov in enumerate(PROVINCES):
        r = prov_base + 2 + i
        ws.cell(row=r, column=1, value=prov)
        for j, m in enumerate(MONTH_ORDER):
            cols = month_to_cols[m]
            terms = [(f"SUMIFS('Forecast Weekly'!{c}:{c},'Forecast Weekly'!$B:$B,$A{r})") for c in cols]
            ws.cell(row=r, column=2 + j, value="=" + "+".join(terms)).font = LINK_FONT
        ws.cell(row=r, column=2 + len(MONTH_ORDER),
                value=f"=SUM({get_column_letter(2)}{r}:{get_column_letter(2 + len(MONTH_ORDER) - 1)}{r})")
    prov_total_r = prov_base + 2 + len(PROVINCES)
    ws.cell(row=prov_total_r, column=1, value="Total").font = HEADER_FONT
    for j in range(len(MONTH_ORDER) + 1):
        col = 2 + j
        colL = get_column_letter(col)
        c = ws.cell(row=prov_total_r, column=col,
                    value=f"=SUM({colL}{prov_base + 2}:{colL}{prov_total_r - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    # Active doors by channel and month (end-of-month snapshot = last week of that month)
    door_base = prov_total_r + 3
    ws.cell(row=door_base, column=1, value="Active doors by channel (end of month)").font = SECTION_FONT
    ws.cell(row=door_base + 1, column=1, value="Channel").font = HEADER_FONT
    for j, m in enumerate(MONTH_ORDER):
        c = ws.cell(row=door_base + 1, column=2 + j, value=m)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
    # Map month -> last week's column
    month_last_col = {m: month_to_cols[m][-1] for m in MONTH_ORDER}
    for i, ch in enumerate(CHANNELS):
        r = door_base + 2 + i
        ws.cell(row=r, column=1, value=ch)
        for j, m in enumerate(MONTH_ORDER):
            colL = month_last_col[m]
            ws.cell(row=r, column=2 + j,
                    value=f"=SUMIFS(Doors!{colL}:{colL},Doors!$C:$C,$A{r})").font = LINK_FONT
    door_total_r = door_base + 2 + len(CHANNELS)
    ws.cell(row=door_total_r, column=1, value="Total doors").font = HEADER_FONT
    for j in range(len(MONTH_ORDER)):
        col = 2 + j
        colL = get_column_letter(col)
        c = ws.cell(row=door_total_r, column=col,
                    value=f"=SUM({colL}{door_base + 2}:{colL}{door_total_r - 1})")
        c.font = HEADER_FONT
        c.fill = SUBTOTAL_FILL

    # Weekly totals strip
    wk_base = door_total_r + 3
    ws.cell(row=wk_base, column=1, value="Weekly totals (sales cases, all SKUs)").font = SECTION_FONT
    ws.cell(row=wk_base + 1, column=1, value="Week").font = HEADER_FONT
    ws.cell(row=wk_base + 2, column=1, value="Sales cases").font = HEADER_FONT
    ws.cell(row=wk_base + 3, column=1, value="Production w/ buffer").font = HEADER_FONT
    for wi in range(1, N_WEEKS + 1):
        col = 1 + wi
        ws.cell(row=wk_base + 1, column=col, value=WEEK_LABELS[wi - 1]).font = HEADER_FONT
        # Link from Forecast Weekly national total row
        colL = week_col(wi)
        ws.cell(row=wk_base + 2, column=col,
                value=f"='Forecast Weekly'!{colL}{forecast_total_row}").font = LINK_FONT
        ws.cell(row=wk_base + 3, column=col,
                value=f"='Production Plan'!{colL}{prod_refs['buf_row']}").font = LINK_FONT

    ws.column_dimensions["A"].width = 36
    for col in range(2, 2 + len(MONTH_ORDER) + 2):
        ws.column_dimensions[get_column_letter(col)].width = 12


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    wb = openpyxl.Workbook()

    # Build sheets in the order the dashboard will reference them.
    readme_ws = wb.active
    build_readme(readme_ws)

    dashboard_ws = wb.create_sheet("Dashboard")  # populate later
    assumptions_ws = wb.create_sheet("Assumptions")
    build_assumptions(assumptions_ws)

    class_mix_ws = wb.create_sheet("Class Mix")
    build_class_mix(class_mix_ws)

    velocity_ws = wb.create_sheet("Velocity")
    build_velocity(velocity_ws)

    doors_ws = wb.create_sheet("Doors")
    doors_total_row = build_doors(doors_ws)

    pricing_ws = wb.create_sheet("Pricing")
    build_pricing(pricing_ws)

    mk_ws = wb.create_sheet("Marketing and Sampling")
    marketing_summary = build_marketing(mk_ws)

    fw_ws = wb.create_sheet("Forecast Weekly")
    forecast_total_row = build_forecast_weekly(fw_ws, doors_total_row)

    pp_ws = wb.create_sheet("Production Plan")
    prod_refs = build_production_plan(pp_ws, forecast_total_row, marketing_summary)

    rev_ws = wb.create_sheet("Revenue")
    rev_refs = build_revenue(rev_ws)

    build_dashboard(dashboard_ws, prod_refs, rev_refs, doors_total_row, forecast_total_row)

    out_path = "/home/user/my-first-project/Organika_RTD_Forecast_FY26_27_Weekly.xlsx"
    wb.save(out_path)
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()
