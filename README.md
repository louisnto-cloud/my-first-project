# my-first-project

## Revenue Forecast — Cases-Sold Model

Work out **how many cases you need to sell to hit a gross-revenue target**, and
how that number changes by **price** and **sales channel**.

| File | What it is |
|---|---|
| `revenue-forecast.html` | Interactive model — open in any browser, no install. Edit the yellow fields, everything recalculates live. |
| `revenue-forecast.xlsx` | The same model as a real Excel workbook with live formulas (4 sheets: Model, Channel Comparison, Sensitivity, Monthly Plan). |
| `PROMPT.md` | A reusable prompt to (re)generate or extend the model in any AI tool / Excel Copilot. |
| `build_xlsx.py` | Script that generates the `.xlsx` (`python3 build_xlsx.py`). |

### The core idea

> **Cases needed = revenue target ÷ price per case.**

Example — to hit **$2.5M** next year with the sample channel mix, you need
**≈ 13,165 cases** at a blended **$189.90/case**. But it swings hard by channel:
**8,333 cases** if all sold Direct-to-Consumer ($300) vs **20,833 cases** through
Wholesale ($120). Swap in your real channels, prices and mix to make it yours.

*Gross revenue only — before discounts, returns, taxes and COGS.*
