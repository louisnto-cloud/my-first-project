#!/usr/bin/env bash
# Build the full enterprise workbook from scratch by running the pipeline in order.
# Auto-discovers enhance*_workbook.py stages (enhance_=1, enhance2_=2, ...) so loop
# iterations that add new stages are picked up automatically.
set -euo pipefail
cd "$(dirname "$0")"
# Self-heal: the remote container recycles between sessions and pip packages vanish.
python3 -c "import openpyxl" 2>/dev/null || { echo "[build_all] installing openpyxl..."; pip install --quiet openpyxl; }
echo "[build_all] building base workbook..."
python3 build_enterprise_workbook.py >/dev/null
STAGES=$(python3 -c "import glob,re;fs=glob.glob('enhance*_workbook.py');print('\n'.join(sorted(fs,key=lambda f:int(re.sub(r'\D','',f) or 1))))")
for stage in $STAGES; do
  echo "[build_all] applying ${stage}..."
  python3 "$stage" >/dev/null
done
echo "[build_all] validating..."
python3 validate_workbook.py
echo "[build_all] done."
