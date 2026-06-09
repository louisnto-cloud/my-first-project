"""Independently recompute the Excel workbook's formulas with pycel and
compare against the pure-python reference in muv_config."""
import sys, time
# Shim: pycel 1.0b30 expects the pre-3.1 openpyxl API (defined_names.definedName).
from openpyxl.workbook.defined_name import DefinedNameDict
if not hasattr(DefinedNameDict, "definedName"):
    DefinedNameDict.definedName = property(lambda self: list(self.values()))
from pycel import ExcelCompiler
import muv_config as C
from muv_config import (CHANNELS, PROVINCES, FLAVOURS, SKUS, FORMATS, BASE_CP,
                        PROVINCE_SPLIT, SEASONALITY, ONLINE_UNITS, channel_doorvel,
                        _ramp_factor)

S = C.SETTINGS
calib = S["calib_scalar"]; nW = S["n_weeks"]

def blended_cogs(fmt):
    return sum(s["cogs_per_case"] * next(f["share"] for f in FLAVOURS if f["name"] == s["flavour"])
               for s in SKUS if s["format"] == fmt)
def blended_pidx(fmt):
    return sum(s["price_index"] * next(f["share"] for f in FLAVOURS if f["name"] == s["flavour"])
               for s in SKUS if s["format"] == fmt)

def ref_row(cname, pcode, week, basis="Wholesale"):
    c = next(cc for cc in CHANNELS if cc["name"] == cname)
    p = next(pp for pp in PROVINCES if pp["code"] == pcode)
    fmt = c["format"]
    active = 1 if week <= nW else 0
    season = 1 + (SEASONALITY[week - 1] - 1) * S["season_amp"]
    psplit = PROVINCE_SPLIT[cname][pcode] / 100.0
    if cname == "Online":
        units = ONLINE_UNITS[week - 1] * psplit * (1 + S["online_growth"]) * season * active * (1 if week >= c["launch"] else 0)
        cases = units * FORMATS["12-pack"]["cans_per_pack"] / 24.0
        wholesale = units * p["online_price"] * (1 + S["price_index"]) * blended_pidx(fmt)
        sellthru = wholesale
    else:
        ramp = _ramp_factor(week, c["launch"], c["weeks_to_full"], c["ramp"], S["ramp_speed"])
        doorvel = channel_doorvel(cname) * calib * (1 + S["velocity_uplift"])
        cases = doorvel * psplit * ramp * season * active
        cp = BASE_CP[cname] * (1 + p["modifier"]) * (1 + S["price_index"])
        wholesale = cases * cp * blended_pidx(fmt)
        consumer = cases * 24.0 / FORMATS[fmt]["cans_per_pack"]
        sellthru = consumer * p["srp_4pack"] * (1 + S["price_index"])
    cogs = cases * blended_cogs(fmt)
    gross = wholesale if basis == "Wholesale" else sellthru
    return {"cases": cases, "wholesale": wholesale, "sellthru": sellthru, "gross": gross, "cogs": cogs}

def row_of(cname, pcode, week):
    ci = [c["name"] for c in CHANNELS].index(cname)
    pi = [p["code"] for p in PROVINCES].index(pcode)
    return 2 + (ci * len(PROVINCES) + pi) * 53 + (week - 1)

print("Loading workbook into pycel ...")
t0 = time.time()
xl = ExcelCompiler("../MUV_RTD_Forecast_v1.xlsx")
print(f"  loaded in {time.time()-t0:.1f}s")

def approx(a, b, tol=1.0):
    return abs((a or 0) - (b or 0)) <= tol + 1e-6 * max(abs(a or 0), abs(b or 0))

fails = 0
# ---- spot-check individual Calc cells ----
spots = [("Convenience", "ON", 20), ("Convenience", "ON", 2),   # wk2 < launch(3) -> 0
         ("FDM", "QC", 30), ("Costco", "BC", 40), ("Online", "ON", 20), ("Online", "AB", 1)]
print("\nSpot-check Calc rows (col R=BrandCases, X=Gross$):")
for cname, pcode, wk in spots:
    r = row_of(cname, pcode, wk)
    cases = xl.evaluate(f"Calc!R{r}")
    gross = xl.evaluate(f"Calc!X{r}")
    ref = ref_row(cname, pcode, wk)
    ok = approx(cases, ref["cases"], 0.01) and approx(gross, ref["gross"], 0.02)
    fails += 0 if ok else 1
    print(f"  {cname:12s} {pcode} wk{wk:<2d} row{r}: cases xl={cases:10.3f} ref={ref['cases']:10.3f} | "
          f"gross xl={gross:10.2f} ref={ref['gross']:10.2f}  {'OK' if ok else 'FAIL'}")

# ---- aggregate totals vs reference compute() ----
print("\nAggregate checks (Excel vs python reference):")
refagg = C.compute()
checks = [
    ("Annual gross (B5)", "Summary!B5", refagg["gross"]),
    ("Total cases (B10)", "Summary!B10", refagg["cases"]),
    ("Total cans (B11)", "Summary!B11", refagg["cans"]),
    ("Wholesale tot (B16)", "Summary!B16", refagg["wholesale"]),
    ("Sellthru tot (B17)", "Summary!B17", refagg["sellthrough"]),
    ("Gap (B7)", "Summary!B7", refagg["gross"] - 3_000_000),
]
for label, cell, ref in checks:
    val = xl.evaluate(cell)
    ok = approx(val, ref, 2.0)
    fails += 0 if ok else 1
    print(f"  {label:22s} xl={val:14,.2f}  ref={ref:14,.2f}  {'OK' if ok else 'FAIL'}")

# by-channel
print("\nBy-channel (Summary col E) vs reference:")
for i, c in enumerate(CHANNELS):
    cell = f"Summary!E{5 + i}"   # breakdown data starts at row 5
    val = xl.evaluate(cell)
    ref = refagg["by_channel"][c["name"]]
    ok = approx(val, ref, 2.0)
    fails += 0 if ok else 1
    print(f"  {c['name']:12s} xl={val:12,.2f}  ref={ref:12,.2f}  {'OK' if ok else 'FAIL'}")

print(f"\n{'ALL CHECKS PASSED' if fails == 0 else str(fails)+' CHECK(S) FAILED'}")
sys.exit(1 if fails else 0)
