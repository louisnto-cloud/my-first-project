"""
MUV RTD Forecast - Single source of truth for model inputs + reference engine.

This module holds every editable assumption as plain Python data and a pure-Python
implementation of the forecast math. The SAME numbers and the SAME math are used to:
  1. compute the reference base case and solve the calibration scalar,
  2. seed the Excel workbook (build_excel.py) whose live formulas reproduce this math,
  3. seed the HTML dashboard (build_html.py) whose JS reproduces this math.

Keep this file the canonical definition. Excel formulas and JS are written to MATCH it.
"""
from __future__ import annotations
import datetime as dt
import json

# ----------------------------------------------------------------------------
# 1. SETTINGS
# ----------------------------------------------------------------------------
SETTINGS = {
    "fiscal_start": dt.date(2027, 9, 1),   # Fiscal year ends end of August
    "n_weeks": 52,                          # 52 or 53
    "gross_basis": "Wholesale",             # "Wholesale" or "Sell-through"
    "target_revenue": 3_000_000.0,
    "calib_scalar": 0.36,                   # door-count calibration (solved ~0.366 to hit $3.0M;
                                            # set to 0.36 so base lands just under target, ~$2.96M,
                                            # leaving a real, closeable gap to demonstrate the levers)
    # Global levers (mirror the HTML sliders). Neutral defaults.
    "velocity_uplift": 0.0,                 # +x% on velocity
    "ramp_speed": 1.0,                      # multiplier on ramp progress (>1 faster)
    "price_index": 0.0,                     # +x% on all prices
    "season_amp": 1.0,                      # scales deviation of seasonality from 1.0
    "online_growth": 0.0,                   # +x% on online units/week
}

# ----------------------------------------------------------------------------
# 2. FLAVOURS  (add a flavour = add a row; shares must sum to 100%)
# ----------------------------------------------------------------------------
FLAVOURS = [
    {"name": "Lime",      "share": 0.40},
    {"name": "Lemon",     "share": 0.35},
    {"name": "Raspberry", "share": 0.25},
]

# ----------------------------------------------------------------------------
# 3. PACK FORMATS
# ----------------------------------------------------------------------------
FORMATS = {
    "4-pack":  {"cans_per_pack": 4,  "packs_per_case": 6, "cans_per_case": 24},
    "12-pack": {"cans_per_pack": 12, "packs_per_case": 2, "cans_per_case": 24},
}

# ----------------------------------------------------------------------------
# 4. SKUs = flavour x format  (cogs per 24-can case; price_index = per-SKU price multiplier)
# ----------------------------------------------------------------------------
def default_skus():
    skus = []
    for f in FLAVOURS:
        for fmt in ("4-pack", "12-pack"):
            skus.append({"flavour": f["name"], "format": fmt,
                         "cogs_per_case": 15.0, "price_index": 1.00})
    return skus
SKUS = default_skus()

# ----------------------------------------------------------------------------
# 5. CHANNELS  (add a channel = add a row; logic is generic)
#    format carried, launch week, weeks-to-full, ramp shape (Linear/S-curve)
# ----------------------------------------------------------------------------
CHANNELS = [
    {"name": "Convenience", "format": "4-pack",  "launch": 3, "weeks_to_full": 16, "ramp": "S-curve"},
    {"name": "On Premise",  "format": "4-pack",  "launch": 5, "weeks_to_full": 18, "ramp": "S-curve"},
    {"name": "Fitness",     "format": "4-pack",  "launch": 4, "weeks_to_full": 14, "ramp": "Linear"},
    {"name": "Costco",      "format": "4-pack",  "launch": 6, "weeks_to_full": 12, "ramp": "Linear"},
    {"name": "FDM",         "format": "4-pack",  "launch": 8, "weeks_to_full": 20, "ramp": "S-curve"},
    {"name": "Specialty",   "format": "4-pack",  "launch": 2, "weeks_to_full": 14, "ramp": "Linear"},
    {"name": "Online",      "format": "12-pack", "launch": 1, "weeks_to_full": 1,  "ramp": "Linear"},
]
PHYSICAL_CHANNELS = [c["name"] for c in CHANNELS if c["name"] != "Online"]

# ----------------------------------------------------------------------------
# 6. STORE TIERS per physical channel (doors at full distribution, velocity cases/door/week)
#    SEED PLACEHOLDERS - illustrative, replace with real numbers later.
# ----------------------------------------------------------------------------
TIERS = [
    {"channel": "Convenience", "tier": "A", "doors": 300,  "velocity": 1.5},
    {"channel": "Convenience", "tier": "B", "doors": 600,  "velocity": 0.8},
    {"channel": "Convenience", "tier": "C", "doors": 1100, "velocity": 0.4},
    {"channel": "FDM",         "tier": "A", "doors": 150,  "velocity": 4.0},
    {"channel": "FDM",         "tier": "B", "doors": 300,  "velocity": 2.0},
    {"channel": "FDM",         "tier": "C", "doors": 550,  "velocity": 1.0},
    {"channel": "Costco",      "tier": "A", "doors": 10,   "velocity": 60.0},
    {"channel": "Costco",      "tier": "B", "doors": 8,    "velocity": 40.0},
    {"channel": "Costco",      "tier": "C", "doors": 6,    "velocity": 25.0},
    {"channel": "On Premise",  "tier": "A", "doors": 120,  "velocity": 1.0},
    {"channel": "On Premise",  "tier": "B", "doors": 250,  "velocity": 0.6},
    {"channel": "On Premise",  "tier": "C", "doors": 400,  "velocity": 0.3},
    {"channel": "Fitness",     "tier": "A", "doors": 100,  "velocity": 1.2},
    {"channel": "Fitness",     "tier": "B", "doors": 200,  "velocity": 0.7},
    {"channel": "Fitness",     "tier": "C", "doors": 350,  "velocity": 0.35},
    {"channel": "Specialty",   "tier": "A", "doors": 150,  "velocity": 1.0},
    {"channel": "Specialty",   "tier": "B", "doors": 300,  "velocity": 0.6},
    {"channel": "Specialty",   "tier": "C", "doors": 500,  "velocity": 0.3},
]

# ----------------------------------------------------------------------------
# 7. PROVINCES (add a province/territory = add a row)
#    province modifier on price (+/- 5%); retail SRP per 4-pack; online price per 12-pack
# ----------------------------------------------------------------------------
PROVINCES = [
    {"code": "BC", "modifier": 0.03, "srp_4pack": 12.99, "online_price": 34.99},
    {"code": "AB", "modifier": 0.02, "srp_4pack": 11.99, "online_price": 34.99},
    {"code": "SK", "modifier": 0.00, "srp_4pack": 10.99, "online_price": 34.99},
    {"code": "MB", "modifier": 0.00, "srp_4pack": 10.99, "online_price": 34.99},
    {"code": "ON", "modifier": 0.02, "srp_4pack": 12.49, "online_price": 34.99},
    {"code": "QC", "modifier": 0.01, "srp_4pack": 11.99, "online_price": 34.99},
    {"code": "NB", "modifier": -0.02, "srp_4pack": 10.49, "online_price": 34.99},
    {"code": "NS", "modifier": -0.02, "srp_4pack": 10.49, "online_price": 34.99},
    {"code": "PE", "modifier": -0.03, "srp_4pack": 9.99,  "online_price": 34.99},
    {"code": "NL", "modifier": -0.01, "srp_4pack": 10.99, "online_price": 34.99},
]
PROV_CODES = [p["code"] for p in PROVINCES]

# ----------------------------------------------------------------------------
# 8. PROVINCE SPLIT per channel  (each channel's doors distributed across provinces, sums to 100%)
#    Stored as relative WEIGHTS then normalised to exactly 100% per channel.
# ----------------------------------------------------------------------------
_POP_WEIGHTS = {"BC": 13.0, "AB": 11.0, "SK": 3.0, "MB": 3.5, "ON": 38.0,
                "QC": 22.0, "NB": 2.4, "NS": 2.6, "PE": 0.4, "NL": 1.5}
_COSTCO_WEIGHTS = {"BC": 16.0, "AB": 16.0, "SK": 1.5, "MB": 2.0, "ON": 40.0,
                   "QC": 20.0, "NB": 1.0, "NS": 1.5, "PE": 0.0, "NL": 0.5}
_ONLINE_WEIGHTS = {"BC": 15.0, "AB": 12.0, "SK": 2.5, "MB": 3.0, "ON": 40.0,
                   "QC": 18.0, "NB": 2.5, "NS": 3.0, "PE": 1.0, "NL": 2.0}

def _normalise_to_100(weights: dict) -> dict:
    total = sum(weights.values())
    pct = {k: round(v / total * 100.0, 2) for k, v in weights.items()}
    # absorb rounding into the largest province so it sums to exactly 100.00
    drift = round(100.0 - sum(pct.values()), 2)
    biggest = max(pct, key=pct.get)
    pct[biggest] = round(pct[biggest] + drift, 2)
    return pct

def build_province_split():
    split = {}
    for c in CHANNELS:
        if c["name"] == "Costco":
            split[c["name"]] = _normalise_to_100(_COSTCO_WEIGHTS)
        elif c["name"] == "Online":
            split[c["name"]] = _normalise_to_100(_ONLINE_WEIGHTS)
        else:
            split[c["name"]] = _normalise_to_100(_POP_WEIGHTS)
    return split
PROVINCE_SPLIT = build_province_split()

# ----------------------------------------------------------------------------
# 9. PRICING - base wholesale case price (CP) per channel, before province modifier
# ----------------------------------------------------------------------------
BASE_CP = {
    "Convenience": 30.0, "FDM": 28.0, "Costco": 26.0,
    "On Premise": 32.0, "Fitness": 30.0, "Specialty": 30.0,
}

# ----------------------------------------------------------------------------
# 10. ONLINE units-per-week curve for the 12-pack (ramps 50 -> 600 across the year)
# ----------------------------------------------------------------------------
def build_online_curve(n=53):
    start, end, span = 50.0, 600.0, 52
    return [round(start + (end - start) * (w - 1) / (span - 1), 1) if w <= span else end
            for w in range(1, n + 1)]
ONLINE_UNITS = build_online_curve(53)

# ----------------------------------------------------------------------------
# 11. SEASONALITY - 53 weekly indices, peaked in summer, normalised to mean ~1.0
# ----------------------------------------------------------------------------
_MONTH_SEASON = {  # calendar month -> raw hydration index (summer high)
    9: 1.05, 10: 0.95, 11: 0.85, 12: 0.80, 1: 0.80, 2: 0.85,
    3: 0.95, 4: 1.05, 5: 1.15, 6: 1.25, 7: 1.30, 8: 1.25,
}

def build_seasonality(fiscal_start: dt.date, n=53):
    raw = []
    for w in range(1, n + 1):
        d = fiscal_start + dt.timedelta(days=7 * (w - 1))
        raw.append(_MONTH_SEASON[d.month])
    mean52 = sum(raw[:52]) / 52.0          # normalise on the 52-week base
    return [round(x / mean52, 4) for x in raw]
SEASONALITY = build_seasonality(SETTINGS["fiscal_start"], 53)

# ============================================================================
# REFERENCE ENGINE  (pure python; Excel formulas and JS mirror this exactly)
# ============================================================================
def _ramp_factor(week, launch, weeks_to_full, shape, ramp_speed):
    if week < launch:
        return 0.0
    x = (week - launch + 1) * ramp_speed / weeks_to_full
    x = min(1.0, max(0.0, x))
    if shape == "S-curve":
        return x * x * (3 - 2 * x)        # smoothstep, hits exactly 1.0 at x=1
    return x

def _channel(name):
    return next(c for c in CHANNELS if c["name"] == name)

def channel_doorvel(name):
    """Sum of doors*velocity across tiers for a channel (the tier roll-up)."""
    return sum(t["doors"] * t["velocity"] for t in TIERS if t["channel"] == name)

def cogs_for(flavour, fmt):
    return next(s["cogs_per_case"] for s in SKUS if s["flavour"] == flavour and s["format"] == fmt)

def sku_price_index(flavour, fmt):
    return next(s["price_index"] for s in SKUS if s["flavour"] == flavour and s["format"] == fmt)

def compute(settings=None):
    """Run the full weekly engine. Returns a dict of aggregated results."""
    s = dict(SETTINGS)
    if settings:
        s.update(settings)
    nW = int(s["n_weeks"])
    calib = s["calib_scalar"]
    vup = 1.0 + s["velocity_uplift"]
    pidx = 1.0 + s["price_index"]
    samp = s["season_amp"]
    ogrow = 1.0 + s["online_growth"]
    rspeed = s["ramp_speed"]
    basis = s["gross_basis"]

    res = {
        "gross": 0.0, "wholesale": 0.0, "sellthrough": 0.0, "cogs": 0.0,
        "cases": 0.0, "cans": 0.0, "consumer_units": 0.0,
        "by_channel": {}, "by_province": {p: 0.0 for p in PROV_CODES},
        "by_flavour": {f["name"]: 0.0 for f in FLAVOURS},
        "by_sku": {}, "by_week": [0.0] * nW, "by_month": {}, "by_quarter": {},
        "by_flavour_cases": {f["name"]: 0.0 for f in FLAVOURS},
        "by_channel_cases": {}, "by_province_cases": {p: 0.0 for p in PROV_CODES},
        "by_sku_cases": {}, "by_month_cases": {},
    }
    for c in CHANNELS:
        res["by_channel"][c["name"]] = 0.0
        res["by_channel_cases"][c["name"]] = 0.0
    for sku in SKUS:
        res["by_sku"][f'{sku["flavour"]} {sku["format"]}'] = 0.0
        res["by_sku_cases"][f'{sku["flavour"]} {sku["format"]}'] = 0.0

    fstart = s["fiscal_start"]
    for w in range(1, nW + 1):
        d = fstart + dt.timedelta(days=7 * (w - 1))
        month = d.strftime("%b %Y")
        qtr = f"Q{(w - 1) // 13 + 1}"
        season = 1.0 + (SEASONALITY[w - 1] - 1.0) * samp
        for c in CHANNELS:
            cname, fmt = c["name"], c["format"]
            ramp = _ramp_factor(w, c["launch"], c["weeks_to_full"], c["ramp"], rspeed)
            for p in PROVINCES:
                pcode = p["code"]
                psplit = PROVINCE_SPLIT[cname][pcode] / 100.0
                if cname == "Online":
                    units = ONLINE_UNITS[w - 1] * psplit * ogrow * season
                    if w < c["launch"]:
                        units = 0.0
                    cases = units * FORMATS["12-pack"]["cans_per_pack"] / 24.0  # 12/24
                else:
                    doorvel = channel_doorvel(cname) * calib * vup
                    cases = doorvel * psplit * ramp * season
                if cases <= 0:
                    continue
                cans = cases * 24.0
                consumer_units = cans / FORMATS[fmt]["cans_per_pack"]
                # per-flavour split
                row_wholesale = row_sellthrough = row_cogs = 0.0
                for f in FLAVOURS:
                    fcases = cases * f["share"]
                    if cname == "Online":
                        funits = fcases * 24.0 / FORMATS["12-pack"]["cans_per_pack"]  # cases->12packs
                        oprice = p["online_price"] * pidx * sku_price_index(f["name"], fmt)
                        f_wholesale = funits * oprice
                        f_sell = f_wholesale  # online direct == retail
                    else:
                        cp = BASE_CP[cname] * (1 + p["modifier"]) * pidx * sku_price_index(f["name"], fmt)
                        f_wholesale = fcases * cp
                        fconsumer = fcases * 24.0 / FORMATS[fmt]["cans_per_pack"]
                        f_sell = fconsumer * p["srp_4pack"] * pidx
                    f_cogs = fcases * cogs_for(f["name"], fmt)
                    row_wholesale += f_wholesale
                    row_sellthrough += f_sell
                    row_cogs += f_cogs
                    f_gross = f_wholesale if basis == "Wholesale" else f_sell
                    res["by_flavour"][f["name"]] += f_gross
                    res["by_flavour_cases"][f["name"]] += fcases
                    res["by_sku"][f'{f["name"]} {fmt}'] += f_gross
                    res["by_sku_cases"][f'{f["name"]} {fmt}'] += fcases
                gross = row_wholesale if basis == "Wholesale" else row_sellthrough
                res["gross"] += gross
                res["wholesale"] += row_wholesale
                res["sellthrough"] += row_sellthrough
                res["cogs"] += row_cogs
                res["cases"] += cases
                res["cans"] += cans
                res["consumer_units"] += consumer_units
                res["by_channel"][cname] += gross
                res["by_province"][pcode] += gross
                res["by_channel_cases"][cname] += cases
                res["by_province_cases"][pcode] += cases
                res["by_week"][w - 1] += gross
                res["by_month"][month] = res["by_month"].get(month, 0.0) + gross
                res["by_month_cases"][month] = res["by_month_cases"].get(month, 0.0) + cases
                res["by_quarter"][qtr] = res["by_quarter"].get(qtr, 0.0) + gross
    res["margin"] = res["gross"] - res["cogs"]
    res["margin_pct"] = res["margin"] / res["gross"] if res["gross"] else 0.0
    res["active_weeks"] = nW
    res["avg_weekly"] = res["gross"] / nW if nW else 0.0
    return res

def solve_calibration(target=3_000_000.0, basis="Wholesale"):
    """Physical revenue is linear in the door scalar; online is independent.
       scalar = (target - online) / physical_at_scalar_1."""
    base = dict(SETTINGS); base["calib_scalar"] = 1.0; base["gross_basis"] = basis
    full = compute(base)
    online = full["by_channel"]["Online"]
    physical = full["gross"] - online
    scalar = (target - online) / physical
    return round(scalar, 4), full, online, physical

# ----------------------------------------------------------------------------
# SCENARIOS (lever presets shared by the workbook and the dashboard)
# ----------------------------------------------------------------------------
# Scenarios vary the linear business levers (velocity, price, online); ramp speed
# and seasonality stay neutral so the workbook's closed-form scenario math is exact
# and matches the dashboard's full-engine result to the cent.
SCENARIOS = {
    "Bear":  {"velocity_uplift": -0.15, "ramp_speed": 1.0, "price_index": -0.03,
              "season_amp": 1.0, "online_growth": -0.25},
    "Base":  {"velocity_uplift": 0.0,  "ramp_speed": 1.0,  "price_index": 0.0,
              "season_amp": 1.0,  "online_growth": 0.0},
    "Bull":  {"velocity_uplift": 0.20, "ramp_speed": 1.0, "price_index": 0.04,
              "season_amp": 1.0, "online_growth": 0.50},
}

def components(settings=None):
    """Physical vs online gross (selected basis) at the given settings."""
    r = compute(settings)
    online = r["by_channel"]["Online"]
    return {"gross": r["gross"], "online": online, "physical": r["gross"] - online}

def required_single_lever(target=3_000_000.0, settings=None):
    """For each driver, the single value that lands gross exactly on `target`,
       holding the others at their current setting. Linear levers in closed form;
       ramp/seasonality solved numerically. Mirrors the dashboard + workbook."""
    s = dict(SETTINGS);  s.update(settings or {})
    c = components(s)
    g, online, phys = c["gross"], c["online"], c["physical"]
    out = {}
    out["price_index"]    = (target / g) * (1 + s["price_index"]) - 1 if g else None
    out["velocity_uplift"] = (target - online) / phys * (1 + s["velocity_uplift"]) - 1 if phys else None
    out["online_growth"]  = (target - phys) / online * (1 + s["online_growth"]) - 1 if online else None
    out["calib_scalar"]   = s["calib_scalar"] * (target - online) / phys if phys else None
    # ramp_speed and season_amp: numeric bisection over a sensible domain
    for lever, lo, hi in (("ramp_speed", 0.3, 4.0), ("season_amp", 0.0, 6.0)):
        f = lambda x: compute({**s, lever: x})["gross"] - target
        flo, fhi = f(lo), f(hi)
        if flo * fhi > 0:
            out[lever] = None  # target not reachable by this lever alone in range
            continue
        for _ in range(60):
            mid = (lo + hi) / 2
            if f(lo) * f(mid) <= 0: hi = mid
            else: lo = mid
        out[lever] = (lo + hi) / 2
    return out

if __name__ == "__main__":
    scalar, full, online, physical = solve_calibration()
    print(f"Uncalibrated gross (Wholesale): ${full['gross']:,.0f}")
    print(f"  physical: ${physical:,.0f}   online: ${online:,.0f}")
    print(f"Solved calibration scalar (doors): {scalar}")
    cal = compute()
    print(f"\nBase case gross (Wholesale, scalar={SETTINGS['calib_scalar']}): ${cal['gross']:,.0f}")
    print(f"  vs target $3,000,000  -> gap ${cal['gross']-3_000_000:,.0f}  ({cal['gross']/3e6*100:.1f}% to goal)")
    print(f"  cases: {cal['cases']:,.0f}  cans: {cal['cans']:,.0f}  margin%: {cal['margin_pct']*100:.1f}%")
    st = dict(SETTINGS); st["gross_basis"] = "Sell-through"
    print(f"\nSell-through basis gross: ${compute(st)['gross']:,.0f}")
    print("\nScenarios (Wholesale):")
    for nm, lev in SCENARIOS.items():
        r = compute(lev)
        print(f"  {nm:5s} ${r['gross']:>11,.0f}  ({r['gross']/3e6*100:5.1f}% to goal)")
    print("\nSingle-lever moves to hit $3.0M from Base:")
    for k, v in required_single_lever().items():
        if v is None: print(f"  {k:16s}: n/a"); continue
        disp = f"{v*100:+.2f}%" if k in ("price_index","velocity_uplift","online_growth") else f"{v:.3f}"
        print(f"  {k:16s}: {disp}")
    print("\nBy channel (wholesale basis):")
    for k, v in sorted(cal["by_channel"].items(), key=lambda kv: -kv[1]):
        print(f"  {k:14s} ${v:,.0f}  ({v/cal['gross']*100:4.1f}%)")

