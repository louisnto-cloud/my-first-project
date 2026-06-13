# Amazon.ca Beverage — Competitor Intelligence

A reproducible, **integrity-first** competitor-intelligence workbook for the
ready-to-drink (RTD) beverage category on Amazon.ca: 124 product lines across
~101 brands, exploded into ~2,900 candidate SKUs, with nutrition and positioning
attributes verified against secondary sources and every commercial figure left
blank until it can be captured live.

## The honesty model (why this repo is unusual)

This project was built in an environment with **no live Amazon access** (every
request returns HTTP 403). Rather than guess, it splits every field into two layers:

| Layer | Fields | How they're handled |
|-------|--------|---------------------|
| **Stable attributes** | brand, size, flavours, caffeine/sodium/potassium/sugar/calories, sweetener, claims, positioning | Filled from manufacturer + secondary sources, **cited** in the Enrichment Log, flagged "approximate — verify on live label". |
| **Live commercial** | price, Subscribe & Save, coupon, promo, rating, #ratings, badge, BSR, URL | **Left blank and amber-highlighted.** Never fabricated. Live formulas auto-compute the moment real prices are entered. |

"Nothing is fabricated" is not just a promise — it is **machine-enforced** (see
Testing below).

## Files

| File | Purpose |
|------|---------|
| `build_competitor_intel.py` | Generator. Builds the 21-tab workbook with `openpyxl`; self-validates at the end. |
| `test_competitor_intel.py` | Integrity test suite (~12,400 assertions). Fails if any commercial cell is fabricated, a computed column isn't a formula, nutrition is out of range, SKU counts don't reconcile, a TOC link is broken, or an Enrichment Log row lacks a source. |
| `ingest_captures.py` | Ingests live-captured listing CSVs into a "Verified Listings (Live)" tab with computed columns. |
| `BROWSE_AND_CAPTURE.md` | Two paths for getting real Amazon.ca data into the workbook. |
| `capture_template.csv` | Column schema for captures. |
| `Amazon_ca_Beverage_Competitor_Intel_<date>.xlsx` | The generated workbook (current dated build). |

## Workbook tabs (21)

README & Methodology · Executive Dashboard · **Strategic Insights** · Data
Dictionary · 5 SKU-level Master tabs (one per category) · Brand Roll-up ·
Category Benchmarks · Nutrition Scoreboard · Pricing & Promo Analysis ·
Subscription Strategy · Why They Win · Velocity Estimate · Flavour Map ·
Live-Capture Protocol · QA & Integrity · Enrichment Log · Sources.

The in-workbook README has a **clickable table of contents** linking to every tab.

## Usage

```bash
pip install openpyxl

# Build the workbook (runs the integrity self-check at the end)
python build_competitor_intel.py

# Run the integrity suite on its own
python test_competitor_intel.py
```

CI (GitHub Actions, `.github/workflows/ci.yml`) runs both on every push and pull
request and uploads the generated workbook as a build artifact.

## Getting real prices in

The workbook ships decision-*ready* but not decision-*complete*: the commercial
columns await a live-capture pass. See **`BROWSE_AND_CAPTURE.md`** — capture
listings into a CSV (browser path or manual), then:

```bash
python3 ingest_captures.py            # rebuilds "Verified Listings (Live)"
```

All price/unit, price/100 mL, S&S price, effective-floor and health/functional
scores compute automatically from the captured rows.
