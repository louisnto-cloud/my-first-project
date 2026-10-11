# BC hunter success by Management Unit (2026-10-04)

## Finding
Official MU-level numbers exist. The BC government publishes **Big Game Harvest Statistics 1976 to 2024** on the BC Data Catalogue, with hunters, days and kills by species, year and Wildlife Management Unit (WMU = MU). The resources were last updated 2026-09-14. Licence: Open Government Licence, British Columbia.

- Dataset: https://catalogue.data.gov.bc.ca/dataset/big-game-harvest-statistics-1976-to-2024
- WMU CSV: https://catalogue.data.gov.bc.ca/dataset/f2303645-5952-4766-bd5c-3b9b50dda1ca/resource/ea1505f6-77ab-4838-b4a9-309ec55a3c20/download/big-game-harvest-statistics-1976-to-2024-wmu.csv
- Region CSV (region totals, WMU code R99): .../resource/f9faaa13-7ef3-4b78-8754-923769ceb6d3/download/big-game-harvest-statistics-1976-to-2024-region.csv
- Background & Interpretation PDF (read): .../resource/a3f98bb1-85e3-415d-aa34-5b87deae9ac7/download/background-interpretation-big-game-harvest-statistics.pdf

## What Hunt Mentor extracted
`data/harvest/bc-harvest.json`: hunt years 2020 to 2024 (April 1 to March 31), **all BC regions** (1, 2, 3, 4, 5, 6, 7A, 7B, 8), every MU listed for those regions (1: 15 MUs, 2: 19, 3: 29, 4: 36, 5: 15, 6: 30, 7A: 31, 7B: 27, 8: 21). That gives 10,423 MU rows plus 813 region total rows, about 2.1 MB. Every region has rows in all five years. Species: mule deer, white tailed deer, moose, elk, black bear, cougar, wolf, mountain goat, mountain sheep, bobcat, lynx, caribou. Grizzly has no rows for 2020 to 2024 in any region (BC closed the grizzly hunt in December 2017), so none appear.

MU rows per region: 1: 479, 2: 391, 3: 1,282, 4: 2,091, 5: 640, 6: 1,281, 7A: 1,612, 7B: 1,474, 8: 1,173. Regions 7A and 7B MUs are both numbered 7-xx (no MU appears in both). Region 7A and 7B totals are published under WMU code `7A` / `7B` instead of `x99`; the converter keeps that code in `wmuCode`.

### How to rebuild
```
cd <scratch folder>
UA="Mozilla/5.0 (HuntMentor data refresh)"
curl -sSL -A "$UA" -O https://catalogue.data.gov.bc.ca/dataset/f2303645-5952-4766-bd5c-3b9b50dda1ca/resource/ea1505f6-77ab-4838-b4a9-309ec55a3c20/download/big-game-harvest-statistics-1976-to-2024-wmu.csv
curl -sSL -A "$UA" -O https://catalogue.data.gov.bc.ca/dataset/f2303645-5952-4766-bd5c-3b9b50dda1ca/resource/f9faaa13-7ef3-4b78-8754-923769ceb6d3/download/big-game-harvest-statistics-1976-to-2024-region.csv
python3 <hunt-mentor>/scripts/harvest-convert.py all <hunt-mentor>/data/harvest/bc-harvest.json
```
The first argument is the region list: `all` (default) or a comma list such as `2,3,4,5,8`. The second is the output path (default `data/harvest/bc-harvest.json`). The script prints row counts per region. Check: MU 3-27 moose 2024 resident = 16 kills of 187 hunters (8.6%).

Row fields: hunters, days, kills (as published), `successPct` (computed), `resident` (true = resident hunters, false = non-resident or guided), `killsFromCI`, `lowConfidence`.

`successPct = kills / hunters * 100`, rounded to 0.1. The dataset publishes no success rate, so every percentage is computed by Hunt Mentor from the published counts. Nothing is invented. When hunters are blank the value is null.

## Caveats (show these in the app)
1. **Resident numbers are estimates.** They come from the Hunter Sample survey (a mailed or online questionnaire sent to a sample of licence holders), not a census. A sister dataset, Hunter Sample Survey Estimates (licence "Access Only"), publishes 95% confidence limits. These are often wide at MU level. Example: one 1976 MU row gives 7 hunters with a range of 2 to 15.
2. **General season and LEH are combined.** Resident numbers mix general open season and Limited Entry Hunting. An MU where moose is mostly LEH (a draw) can show a high success rate that a general season hunter will not get. For success by LEH zone, use the separate **Limited Entry Hunting Survey Estimates 1984 to 2024** dataset (https://catalogue.data.gov.bc.ca/dataset/limited-entry-hunting-survey-estimates-1984-to-2024). It is not extracted yet.
3. **Small samples are unreliable.** Rows with fewer than 20 hunters, or with hunters not published, are flagged `lowConfidence: true` (5,727 of 10,423 rows, mostly non-resident and minor species rows). The app should not show a percentage for these. It can say "too few hunters reported" instead.
4. **Non-resident rows** (`resident:false`) come from guide outfitter declarations and permits to accompany, not the survey. Guided success is not comparable with resident success. A resident app should use `resident:true`.
5. **Compulsory inspection (CI) kills.** For grizzly, caribou, cougar, goat and sheep, kills are replaced with CI counts while hunters still come from the survey (`killsFromCI:true`). The ratio mixes two sources. Some rows have kills but no hunters.
6. **Hunters do not add up.** MU hunter counts cannot be summed to a region total, because one hunter can hunt several MUs. Use `regionTotals` for region figures.
7. Success is "kills / hunters who hunted that species in that MU in that year". It is a per season figure, not per day. Days are included if the app wants kills per 100 days.
8. One year can jump around (for example 3-20 moose kills: 8, 18, 13, 0, 9 for 2020 to 2024). Show a 3 to 5 year view or average rather than one year.
9. Unassigned rows (WMU R00, 770, 780, 900, and region 0 or blank) are excluded.

## Example rows (2024, residents)
| MU | Species | Hunters | Days | Kills | Success |
|---|---|---|---|---|---|
| 3-20 | moose | 261 | 1226 | 9 | 3.4% |
| 3-27 | moose | 187 | 1152 | 16 | 8.6% |
| 3-28 | moose | 163 | 905 | 34 | 20.9% |
| 3-27 | mule deer | 1026 | 6468 | 418 | 40.7% |
| 3-28 | mule deer | 712 | 4641 | 199 | 27.9% |
| Region 3 total | moose | 4301 | 25718 | 341 | 7.9% |

## Not done
- LEH zone success (separate dataset, see caveat 2).
- 95% confidence limits from the Hunter Sample dataset (its licence is "Access Only", so check terms before republishing).
