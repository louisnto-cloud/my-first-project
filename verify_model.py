"""Independent recomputation of the MUV model.

This deliberately does NOT read the spreadsheet formulas. It recomputes the
entire model from the same default inputs using plain Python, so that if the
spreadsheet and this module agree, the spreadsheet logic is validated by an
independent implementation. Any disagreement is a real bug.

It reuses generate_doors from build_workbook so the door set is identical.
"""

import math
from build_workbook import generate_doors, SKUS, WEEKS, TIERS

UNITS_PER_CASE = 24

WHOLESALE = {"Lime Lemon": 36.00, "Pineapple Passion Fruit": 36.00, "Raspberry": 36.00}
COGS = {"Lime Lemon": 18.50, "Pineapple Passion Fruit": 18.50, "Raspberry": 18.50}

VELOCITY = {
    "A": {"Lime Lemon": 16, "Pineapple Passion Fruit": 14, "Raspberry": 12},
    "B": {"Lime Lemon": 10, "Pineapple Passion Fruit": 8, "Raspberry": 7},
    "C": {"Lime Lemon": 5, "Pineapple Passion Fruit": 4, "Raspberry": 3},
}
RAMP = {1: 0.40, 2: 0.60, 3: 0.80}  # else 1.00
ONLINE_AMZ = {"Lime Lemon": 160, "Pineapple Passion Fruit": 140, "Raspberry": 120}
ONLINE_DTC = {"Lime Lemon": 80, "Pineapple Passion Fruit": 70, "Raspberry": 60}
ONLINE_RAMP = {1: 0.30, 2: 0.55, 3: 0.80}  # else 1.00
FILL_RATE = 0.97
FREIGHT = 1.85
SLOTTING = 250.00
SLOTTING_AMORT_MONTHS = 12
LAUNCH_MONTHS = 3
DIST_MARGIN = 0.00  # default assumes direct shipment, matches Inputs default
SCEN_MULT = 1.00  # Base

AUTH_INDEX = {"Lime Lemon": 6, "Pineapple Passion Fruit": 7, "Raspberry": 8}  # cols in door row
# door row layout: [id,banner,name,city,region,tier,lime,pineapple,raspberry,launch]


def ramp_pct(wsl):
    if wsl <= 0:
        return 0.0
    return RAMP.get(wsl, 1.00)


def online_ramp_pct(w):
    return ONLINE_RAMP.get(w, 1.00)


def vg_cell(door, sku, w):
    tier = door[5]
    launch = door[9]
    auth = door[AUTH_INDEX[sku]]
    if auth != "Y" or w < launch:
        return 0
    wsl = w - launch + 1
    base = VELOCITY[tier][sku]
    val = base * ramp_pct(wsl) * SCEN_MULT
    return round(val)  # banker's? Excel ROUND is half away from zero


def excel_round(x, digits=0):
    # Excel rounds half away from zero
    factor = 10 ** digits
    return math.floor(abs(x) * factor + 0.5) / factor * (1 if x >= 0 else -1)


def vg_cell_excel(door, sku, w):
    tier = door[5]
    launch = door[9]
    auth = door[AUTH_INDEX[sku]]
    if auth != "Y" or w < launch:
        return 0
    wsl = w - launch + 1
    base = VELOCITY[tier][sku]
    val = base * ramp_pct(wsl) * SCEN_MULT
    return int(excel_round(val))


def compute():
    doors = generate_doors(100)
    # Build velocity grid
    grid = {}  # (door_idx, sku, w) -> units
    for di, door in enumerate(doors):
        for sku in SKUS:
            for w in WEEKS:
                grid[(di, sku, w)] = vg_cell_excel(door, sku, w)

    total_vg_units = sum(grid.values())

    # Weekly forecast units per week
    week_units = {w: sum(grid[(di, sku, w)] for di in range(len(doors)) for sku in SKUS) for w in WEEKS}
    wf_total_units = sum(week_units.values())

    # Cases per week (door level rounding: CEIL each cell to case, /24, sum)
    def cases_for_cells(cells):
        total = 0.0
        for u in cells:
            if u > 0:
                total += math.ceil(u / UNITS_PER_CASE)
        return total

    week_cases = {}
    for w in WEEKS:
        cells = [grid[(di, sku, w)] for di in range(len(doors)) for sku in SKUS]
        week_cases[w] = cases_for_cells(cells)
    door_cases_total = sum(week_cases.values())

    # Door cases by SKU
    sku_door_cases = {}
    for sku in SKUS:
        tot = 0.0
        for w in WEEKS:
            cells = [grid[(di, sku, w)] for di in range(len(doors))]
            tot += cases_for_cells(cells)
        sku_door_cases[sku] = tot

    # Online forecast
    online_units = {}  # (sku, channel, w)
    for sku in SKUS:
        for w in WEEKS:
            online_units[(sku, "amz", w)] = int(excel_round(ONLINE_AMZ[sku] * online_ramp_pct(w) * SCEN_MULT))
            online_units[(sku, "dtc", w)] = int(excel_round(ONLINE_DTC[sku] * online_ramp_pct(w) * SCEN_MULT))

    online_total_units = sum(online_units.values())
    # Online cases: ROUNDUP each channel-week to case
    online_cases_total = 0
    sku_online_cases = {s: 0 for s in SKUS}
    for (sku, ch, w), u in online_units.items():
        c = math.ceil(u / UNITS_PER_CASE)
        online_cases_total += c
        sku_online_cases[sku] += c

    # Revenue (base scenario, no activations -> no trade)
    total_cases_all = door_cases_total + online_cases_total
    cases_shipped = 0
    gross_rev = 0.0
    cogs_total = 0.0
    freight_total = 0.0
    for sku in SKUS:
        cases_all = sku_door_cases[sku] + sku_online_cases[sku]
        shipped = excel_round(cases_all * FILL_RATE)
        cases_shipped += shipped
        gross_rev += shipped * WHOLESALE[sku]
        cogs_total += shipped * COGS[sku]
        freight_total += shipped * FREIGHT

    # Slotting: per SKU = count of doors with auth Y for that SKU * SLOTTING
    slotting_total = 0.0
    for sku in SKUS:
        cnt = sum(1 for d in doors if d[AUTH_INDEX[sku]] == "Y")
        slotting_total += cnt * SLOTTING
    dist_margin_total = gross_rev * DIST_MARGIN
    trade_total = 0.0  # no activations
    operating_contrib = gross_rev - cogs_total - freight_total - dist_margin_total - trade_total
    slotting_amort = slotting_total * LAUNCH_MONTHS / SLOTTING_AMORT_MONTHS
    net_contrib = operating_contrib - slotting_amort
    fully_loaded = operating_contrib - slotting_total
    net_margin_pct = net_contrib / gross_rev if gross_rev else 0

    # Authorized rows count
    auth_rows = sum(1 for d in doors for sku in SKUS if d[AUTH_INDEX[sku]] == "Y")
    # Authorized rows with zero forecast (auth Y but all weeks 0 -> only if launch > 13, impossible here, or auth Y but...)
    zero_auth = 0
    for di, door in enumerate(doors):
        for sku in SKUS:
            if door[AUTH_INDEX[sku]] == "Y":
                s = sum(grid[(di, sku, w)] for w in WEEKS)
                if s == 0:
                    zero_auth += 1

    return {
        "doors": len(doors),
        "auth_rows": auth_rows,
        "total_vg_units": total_vg_units,
        "wf_total_units": wf_total_units,
        "crosscheck_match": total_vg_units == wf_total_units,
        "week_units": week_units,
        "week_cases": week_cases,
        "door_cases_total": door_cases_total,
        "sku_door_cases": sku_door_cases,
        "online_total_units": online_total_units,
        "online_cases_total": online_cases_total,
        "sku_online_cases": sku_online_cases,
        "total_cases_all": total_cases_all,
        "cases_shipped": cases_shipped,
        "gross_rev": gross_rev,
        "cogs_total": cogs_total,
        "freight_total": freight_total,
        "slotting_total": slotting_total,
        "dist_margin_total": dist_margin_total,
        "net_contrib": net_contrib,
        "net_margin_pct": net_margin_pct,
        "zero_auth": zero_auth,
    }


def monte_carlo(n_trials=10000, seed=42):
    """Probabilistic forecast over velocity, ramp, and online uncertainty.

    Uncertainty is keyed off the confidence ratings used for default velocity.
    High confidence implies a tight spread, Low implies a wide spread. This is a
    precomputed simulation. It cannot run live in Excel without macros, so the
    workbook embeds this snapshot with its assumptions and seed for reproducibility.
    """
    import random
    rng = random.Random(seed)
    doors = generate_doors(100)

    # Confidence to one sigma relative spread on velocity
    conf_sigma = {"A": 0.10, "B": 0.20, "C": 0.35}  # tier confidence proxy
    online_sigma = 0.25
    ramp_sigma = 0.10

    base = compute()
    slotting_total = base["slotting_total"]
    slotting_amort = slotting_total * LAUNCH_MONTHS / SLOTTING_AMORT_MONTHS

    cases_dist = []
    rev_dist = []
    op_dist = []
    net_dist = []

    # Precompute per door per sku base steady velocity and launch
    door_sku = []
    for door in doors:
        tier = door[5]
        launch = door[9]
        for sku in SKUS:
            if door[AUTH_INDEX[sku]] == "Y":
                door_sku.append((tier, launch, sku, VELOCITY[tier][sku]))

    online_base_total_units = sum(
        ONLINE_AMZ[s] + ONLINE_DTC[s] for s in SKUS
    )

    # Precompute online base per channel per week (units before mult)
    online_cells = []  # (base_units, ramp_pct)
    for sku in SKUS:
        for w in WEEKS:
            rp = online_ramp_pct(w)
            online_cells.append((ONLINE_AMZ[sku], rp))
            online_cells.append((ONLINE_DTC[sku], rp))

    for _ in range(n_trials):
        # Draw multipliers
        vel_mult = {t: max(0.0, rng.gauss(1.0, conf_sigma[t])) for t in TIERS}
        ramp_mult = max(0.0, rng.gauss(1.0, ramp_sigma))
        online_mult = max(0.0, rng.gauss(1.0, online_sigma))

        # Door cases, replicating the spreadsheet exactly: round each cell to
        # integer units, then CEILING up to a whole case per door week SKU.
        door_cases = 0
        for tier, launch, sku, sv in door_sku:
            v = sv * vel_mult[tier]
            for w in WEEKS:
                if w < launch:
                    continue
                wsl = w - launch + 1
                rp = ramp_pct(wsl)
                rp = min(1.0, rp * ramp_mult) if rp < 1.0 else rp
                u = int(excel_round(v * rp))
                if u > 0:
                    door_cases += math.ceil(u / UNITS_PER_CASE)

        # Online cases, round each channel week up to a whole case
        online_cases = 0
        for base_units, rp in online_cells:
            u = int(excel_round(base_units * rp * online_mult))
            if u > 0:
                online_cases += math.ceil(u / UNITS_PER_CASE)

        total_cases = door_cases + online_cases
        shipped = total_cases * FILL_RATE
        gross = shipped * sum(WHOLESALE.values()) / len(WHOLESALE)
        cogs = shipped * sum(COGS.values()) / len(COGS)
        freight = shipped * FREIGHT
        op = gross - cogs - freight
        net = op - slotting_amort

        cases_dist.append(total_cases)
        rev_dist.append(gross)
        op_dist.append(op)
        net_dist.append(net)

    def pct(data, p):
        s = sorted(data)
        idx = int(round((p / 100) * (len(s) - 1)))
        return s[idx]

    def summarize(data):
        return {
            "p10": pct(data, 10), "p50": pct(data, 50), "p90": pct(data, 90),
            "mean": sum(data) / len(data),
            "min": min(data), "max": max(data),
        }

    # Target hit probabilities, targets reconciled placeholders
    target_cases = 3200
    target_revenue = 115000
    p_cases = sum(1 for x in cases_dist if x >= target_cases) / n_trials
    p_rev = sum(1 for x in rev_dist if x >= target_revenue) / n_trials

    # Histogram of cases into 12 bins
    lo, hi = min(cases_dist), max(cases_dist)
    nbins = 12
    width = (hi - lo) / nbins if hi > lo else 1
    bins = [0] * nbins
    for x in cases_dist:
        b = min(nbins - 1, int((x - lo) / width))
        bins[b] += 1
    hist = [(lo + i * width, lo + (i + 1) * width, bins[i]) for i in range(nbins)]

    return {
        "n_trials": n_trials, "seed": seed,
        "cases": summarize(cases_dist),
        "revenue": summarize(rev_dist),
        "operating": summarize(op_dist),
        "net": summarize(net_dist),
        "p_cases_hit": p_cases, "p_rev_hit": p_rev,
        "target_cases": target_cases, "target_revenue": target_revenue,
        "hist": hist,
        "conf_sigma": conf_sigma, "online_sigma": online_sigma, "ramp_sigma": ramp_sigma,
    }


if __name__ == "__main__":
    import json
    r = compute()
    printable = {k: v for k, v in r.items() if not isinstance(v, dict)}
    print(json.dumps(printable, indent=2, default=str))
    print("\nWeek units:", r["week_units"])
    print("Week cases:", r["week_cases"])
    print("SKU door cases:", r["sku_door_cases"])
    print("SKU online cases:", r["sku_online_cases"])
