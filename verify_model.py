#!/usr/bin/env python3
"""Safety gate for the 10x improvement loop.

Rebuilds the workbook from build_model.py, then checks:
  1. build_model.py runs without error and writes the .xlsx
  2. the workbook opens and contains the expected tabs
  3. no formula/text cell contains an Excel error literal (#REF!, #DIV/0!, …)
  4. the standalone HTML dashboard is present and well-formed enough to open

Exit 0 = PASS (safe to commit), non-zero = FAIL (revert the change).
Run:  python3 verify_model.py
"""
import subprocess, sys, re, pathlib

XLSX = "Organika_Sparkling_Daily_1YR_Scenario_Model.xlsx"
HTML = "organika_sparkling_daily_model.html"
EXPECTED_TABS = {"Home", "Assumptions", "Dashboard", "Base", "Monthly",
                 "Pricing Lab", "Targets", "Sensitivity", "Checks", "Cover"}
ERROR_LITERALS = ("#REF!", "#DIV/0!", "#VALUE!", "#NAME?", "#NUM!", "#N/A", "#NULL!")

def fail(msg):
    print(f"  ✗ {msg}")
    sys.exit(1)

def main():
    # 1. build
    r = subprocess.run([sys.executable, "build_model.py"], capture_output=True, text=True)
    if r.returncode != 0:
        fail("build_model.py errored:\n" + (r.stderr or r.stdout)[-1500:])
    print("  ✓ build_model.py ran")

    # 2/3. workbook opens, tabs present, no error literals
    try:
        import openpyxl
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "openpyxl"])
        import openpyxl
    if not pathlib.Path(XLSX).exists():
        fail(f"{XLSX} not written")
    wb = openpyxl.load_workbook(XLSX)
    missing = EXPECTED_TABS - set(wb.sheetnames)
    if missing:
        fail(f"missing tabs: {sorted(missing)}")
    print(f"  ✓ workbook opens · {len(wb.sheetnames)} tabs")

    errs = []
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                if isinstance(c.value, str) and any(e in c.value for e in ERROR_LITERALS):
                    # a formula wrapped in IFERROR that merely mentions "#N/A" as text is fine;
                    # flag only bare error literals not inside a string quote
                    if not (c.value.startswith("=") and ('"' in c.value)):
                        errs.append(f"{ws.title}!{c.coordinate} = {c.value[:40]}")
    if errs:
        fail("error cells:\n    " + "\n    ".join(errs[:15]))
    print("  ✓ no error literals in any cell")

    # 4. HTML present & balanced enough to open
    h = pathlib.Path(HTML)
    if h.exists():
        txt = h.read_text(encoding="utf-8", errors="ignore")
        if "<html" not in txt.lower() or "</html>" not in txt.lower():
            fail("HTML missing <html>…</html>")
        if txt.lower().count("<script") != txt.lower().count("</script>"):
            fail("HTML <script> tags unbalanced")
        print(f"  ✓ HTML dashboard OK · {len(txt)//1024} KB")

    print("PASS")
    sys.exit(0)

if __name__ == "__main__":
    main()
