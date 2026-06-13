# Getting REAL Amazon.ca data into the workbook

This environment can't reach Amazon (every request is blocked, HTTP 403 — there's no
browser here). These two paths get real, verified data in. Both feed the same intake:
fill **`capture_template.csv`**, then run **`ingest_captures.py`**, which writes a
**"Verified Listings (Live)"** tab with live formulas and "Verified live <date>" stamps.

---

## PATH 1 — Claude that actually has a browser (recommended)

Use **Claude in Chrome** (the browser extension) or the **Claude desktop app with
computer use**. Those drive a real Chrome session and CAN open amazon.ca. Paste the
prompt below into one of them. It outputs rows in the exact CSV schema — save them as a
`.csv`, drop it back to me (or into this repo's `captures/` folder) and I'll ingest it.

### Paste-ready prompt for browser-Claude
> You are on Amazon.ca with a live browser. Build a CSV of ready-to-drink beverage
> listings. Run these searches and open listings several pages deep each:
> `sparkling electrolyte drink`, `electrolyte drink`, `functional beverage`,
> `prebiotic soda`, `gut health drink`, `adaptogen drink`, `energy drink`,
> `caffeine drink`, `sparkling water`, `flavoured sparkling water`.
>
> Output ONE CSV (no prose) with EXACTLY this header row:
> `asin,url,brand,product_title,category,format_size,unit_ml,pack_count,price_cad,ss_offered,ss_pct,coupon_value_cad,promo_text,flavours,caffeine_mg,sodium_mg,potassium_mg,sugar_g,calories,sweetener,claims,star_rating,num_ratings,badge,bsr`
>
> Rules:
> - One row per ASIN (each flavour/pack listing is its own ASIN).
> - `category`: 1=sparkling electrolyte/functional sparkling, 2=electrolyte RTD,
>   3=functional (prebiotic/gut/adaptogen/vitamin/protein), 4=caffeine & energy,
>   5=sparkling water & soda.
> - `ss_pct`: the Subscribe & Save % as a number (5 means 5%). Blank if none.
> - `coupon_value_cad`: dollar value of any clippable coupon. Blank if none.
> - Read nutrition off the listing's nutrition image/label; per single serving.
> - Write `Not listed` for any field not shown. NEVER guess a number.
> - Ready-to-drink only — skip powders, drink-mix packets, and tablets.
> - Quote any field containing commas.

Aim for as many ASINs as you have patience for; even 50–100 real rows is gold.

---

## PATH 2 — You capture, I parse (no extensions needed)

On any listing you care about:
- **Save the page**: `Ctrl/Cmd-S` → "Webpage, Complete" (or just select-all → copy the page text), OR
- **Screenshot** the price box + nutrition panel.

Send the saved file(s)/text/images to me here. I'll read them and fill
`capture_template.csv` for you, then ingest. You don't need API keys for this.

---

## Ingest (either path)

```
# put filled CSV(s) in the repo (or ./captures/), then:
python3 ingest_captures.py
```
It rebuilds the "Verified Listings (Live)" tab from every `capture*.csv` and
`captures/*.csv`, de-duplicated by ASIN, with Price/Unit, Price/100mL, S&S price,
lowest-effective floor, caffeine/100mL, sugar/100mL, and Health/Functional scores all
computed automatically. Re-run any time you add more captures.
