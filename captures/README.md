# captures/ — drop live Amazon.ca data here

1. Start from **`../capture_seed.csv`** (124 product lines, stable attributes
   already filled). For each product, open its Amazon.ca listing and fill the
   blank columns: `asin`, `url`, `price_cad`, `ss_offered`, `ss_pct`,
   `coupon_value_cad`, `promo_text`, `star_rating`, `num_ratings`, `badge`, `bsr`.
   Correct any nutrition that differs from the live label. **Never guess a number —
   leave it blank or write `Not listed`.**
2. Save your filled file(s) here as `captures/<anything>.csv` (any name).
3. Run:  `python3 ingest_captures.py`
   It rebuilds the **"Verified Listings (Live)"** tab from every `captures/*.csv`
   (and any `capture*.csv` in the repo root), de-duplicated by ASIN, with all
   price/unit, price/100 mL, S&S price, floor and scores computed automatically.

Rows whose `asin` is blank are skipped, so a partially-filled file is safe to drop.
