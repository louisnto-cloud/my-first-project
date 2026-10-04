# BC hunter success by Management Unit (2026-10-04)

## Finding
Official MU-level numbers exist. The BC government publishes **Big Game Harvest Statistics 1976 to 2024** on the BC Data Catalogue, with hunters, days and kills by species, year and Wildlife Management Unit (WMU = MU). The resources were last updated 2026-09-14. Licence: Open Government Licence, British Columbia.

- Dataset: https://catalogue.data.gov.bc.ca/dataset/big-game-harvest-statistics-1976-to-2024
- WMU CSV: https://catalogue.data.gov.bc.ca/dataset/f2303645-5952-4766-bd5c-3b9b50dda1ca/resource/ea1505f6-77ab-4838-b4a9-309ec55a3c20/download/big-game-harvest-statistics-1976-to-2024-wmu.csv
- Region CSV (region totals, WMU code R99): .../resource/f9faaa13-7ef3-4b78-8754-923769ceb6d3/download/big-game-harvest-statistics-1976-to-2024-region.csv
- Background & Interpretation PDF (read): .../resource/a3f98bb1-85e3-415d-aa34-5b87deae9ac7/download/background-interpretation-big-game-harvest-statistics.pdf

## What Hunt Mentor extracted
`data/harvest/bc-harvest.json`: hunt years 2020 to 2024 (April 1 to March 31), Regions 2, 3, 4, 5 and 8, every MU listed for those regions (2: 19 MUs, 3: 29, 4: 36, 5: 15, 8: 21). That gives 5,577 MU rows plus 446 region total rows. Species: mule deer, white tailed deer, moose, elk, black bear, cougar, wolf, mountain goat, mountain sheep, bobcat, lynx, caribou. Grizzly is not included because it has no rows for these regions and years.

Row fields: hunters, days, kills (as published), `successPct` (computed), `resident` (true = resident hunters, false = non-resident or guided), `killsFromCI`, `lowConfidence`.

`successPct = kills / hunters * 100`, rounded to 0.1. The dataset publishes no success rate, so every percentage is computed by Hunt Mentor from the published counts. Nothing is invented. When hunters are blank the value is null.

## Caveats (show these in the app)
1. **Resident numbers are estimates.** They come from the Hunter Sample survey (a mailed or online questionnaire sent to a sample of licence holders), not a census. A sister dataset, Hunter Sample Survey Estimates (licence "Access Only"), publishes 95% confidence limits. These are often wide at MU level. Example: one 1976 MU row gives 7 hunters with a range of 2 to 15.
2. **General season and LEH are combined.** Resident numbers mix general open season and Limited Entry Hunting. An MU where moose is mostly LEH (a draw) can show a high success rate that a general season hunter will not get. For success by LEH zone, use the separate **Limited Entry Hunting Survey Estimates 1984 to 2024** dataset (https://catalogue.data.gov.bc.ca/dataset/limited-entry-hunting-survey-estimates-1984-to-2024). It is not extracted yet.
3. **Small samples are unreliable.** Rows with fewer than 20 hunters, or with hunters not published, are flagged `lowConfidence: true` (3,006 of 5,577 rows, mostly non-resident and minor species rows). The app should not show a percentage for these. It can say "too few hunters reported" instead.
4. **Non-resident rows** (`resident:false`) come from guide outfitter declarations and permits to accompany, not the survey. Guided success is not comparable with resident success. A resident app should use `resident:true`.
5. **Compulsory inspection (CI) kills.** For grizzly, caribou, cougar, goat and sheep, kills are replaced with CI counts while hunters still come from the survey (`killsFromCI:true`). The ratio mixes two sources. Some rows have kills but no hunters.
6. **Hunters do not add up.** MU hunter counts cannot be summed to a region total, because one hunter can hunt several MUs. Use `regionTotals` for region figures.
7. Success is "kills / hunters who hunted that species in that MU in that year". It is a per season figure, not per day. Days are included if the app wants kills per 100 days.
8. One year can jump around (for example 3-20 moose kills: 8, 18, 13, 0, 9 for 2020 to 2024). Show a 3 to 5 year view or average rather than one year.
9. Unassigned rows (WMU R00, 770, 780, 900) are excluded.

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
- Regions 1, 6, 7A and 7B: the same script can include them (about 1.9 MB of JSON for all regions).
- 95% confidence limits from the Hunter Sample dataset (its licence is "Access Only", so check terms before republishing).
