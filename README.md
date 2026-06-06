# Grid Trading Bot (Alpaca)

A safe-by-default **grid trading bot**. It buys small amounts as price dips
through a price band you choose, and sells a little higher to capture the
difference, over and over. It trades **fake money by default** and makes going
live a deliberate, two-step decision.

> ⚠️ **Read this first.** This is **not** passive income and it **can lose
> money**, especially when the market trends hard in one direction. A grid bot
> quietly assumes price keeps coming back; when it doesn't, that's where losses
> live. The whole point of the steps below — tests → backtest → dry run → paper
> → tiny live — is to find out *safely* whether this works before risking a
> cent. Alpaca charges **0.25% per trade (~0.5% round trip)**, so every cycle
> must clear more than ~0.5% just to break even.

---

## 1. What's in here

```
config.yaml        The ONE settings file. Every line is commented. Edit this.
.env               Your secret Alpaca keys (you create this; never shared).
.env.example       A template showing the format of .env.
run_bot.py         Launches the bot (dry-run / paper / live, from config).
backtest.py        Tests the strategy on historical data BEFORE risking money.
requirements.txt   Exact package versions to install.
bot/               The code: config, fees, grid, guards, broker, state, engine.
tests/             Unit tests proving the fee math and safety guards are correct.
logs/              Timestamped log files appear here when you run the bot.
state/             The bot's saved memory (so it survives restarts).
KILL               If this file exists, the bot stops immediately (kill switch).
```

## 2. Install (one time)

You need Python 3.10+.

```bash
pip install -r requirements.txt
```

## 3. Get your Alpaca PAPER keys (free, fake money)

1. Sign up at <https://alpaca.markets> with your email.
2. In the dashboard, switch to **Paper** (the fake-money mode).
3. Open **API Keys**, generate a key, and copy both the **Key ID** and the
   **Secret Key** (the secret is shown only once).
4. Copy the template and paste your keys in:
   ```bash
   cp .env.example .env       # Windows: copy .env.example .env
   ```
   Then open `.env` and fill in `ALPACA_API_KEY_ID` and `ALPACA_API_SECRET_KEY`.

You do **not** need keys for the tests or for a dry run.

## 4. Run the tests (proves the safety math)

```bash
python -m pytest -q
```
These check the fee/breakeven math, the grid level calculation, the risk
limits, the breakout guard, and the live-money safety latch. If they pass, the
dangerous parts are behaving as designed. (CI runs these automatically on every
push too.)

## 5. Run the backtest (proves the strategy, with no money)

```bash
python backtest.py --simulate          # quick offline demo on synthetic prices
python backtest.py --days 30           # real last-30-days BTC/USD bars (needs keys)
python backtest.py --csv myprices.csv  # your own data (CSV with a 'close' column)
```
It reports profit/loss **after fees**, number of trades, win rate, largest
drawdown, and how it compares to simply buying and holding. **If it loses in
the backtest, it will lose live.** Adjust `band_low`, `band_high`,
`grid_levels`, and `profit_target_percent` in `config.yaml` and rerun until the
numbers clear fees comfortably across more than one market period.

## 6. Dry run (watch the logic, zero risk, no keys)

In `config.yaml` set `mode: "dry_run"`, then:
```bash
python run_bot.py --ticks 30
```
Dry run uses a local price simulator and **sends nothing anywhere**. You'll see
it place buys, fill them, place sells, book profit after fees, and the breakout
guard fire when the simulated price leaves the band. `--ticks N` stops after N
loops; omit it to run continuously.

## 7. Paper trade (fake money, REAL live prices)

Set `mode: "paper"` in `config.yaml`, make sure your `.env` keys are filled in,
then:
```bash
python run_bot.py
```
Let it run for **at least 2–4 weeks**. Read the log file in `logs/`. Confirm
the paper balance trends **up after fees**, not down.

## 8. Reading the logs

Each run writes a timestamped file in `logs/`. Key lines:

- `PLACE buy/sell ...` — an order the bot placed (or, in dry run, would place).
- `FILL: ... Profit after fees: X` — a completed trade and its real profit.
- `BREAKOUT: ...` — price left your band; new buys are paused.
- `HALT: ...` — the daily loss limit was hit; trading stopped.
- `STATUS price=... open_orders=... position=$... realized_pnl=$... loss_headroom=$...`
  — printed every loop: a quick health snapshot.

**Good signs:** trades completing on both sides, realized P&L creeping up,
guards quiet. **Warning signs:** lots of buys and few sells (price trending
down — you're accumulating a bag), or realized P&L negative after fees (grid too
tight). Any of these is a reason to stop, not to add money.

## 9. The kill switch

To stop the bot immediately and cancel all its open orders, create the kill
file (its mere existence is the signal):
```bash
touch KILL          # Windows: type nul > KILL
```
Delete the file before starting again.

## 10. Go-live checklist (do NOT skip)

Only switch to real money when **every** box is true:

- [ ] The backtest is profitable after fees across more than one market period.
- [ ] Paper trading was profitable after fees for at least 2–4 weeks.
- [ ] You understand every trade in the logs and why the bot made it.
- [ ] Your risk limits and daily loss limit are set to small amounts.
- [ ] You are funding only money you'd be completely fine losing in full.

Going live requires **two independent switches** on purpose:

1. In `config.yaml`: set `mode: "live"` **and** `i_really_want_live_trading: true`.
2. In your environment: set `I_UNDERSTAND_THIS_IS_REAL_MONEY=true`, e.g.
   ```bash
   export I_UNDERSTAND_THIS_IS_REAL_MONEY=true   # Windows PowerShell: $env:I_UNDERSTAND_THIS_IS_REAL_MONEY="true"
   ```
3. Put your **live** (funded-account) keys in `.env`.

If either switch is missing, the bot refuses to trade real money and exits with
a clear message. Start tiny. Keep the daily loss limit small. Watch it closely
for the first week.

## 11. Legal & tax

Profits are taxable, and rules on running trading bots vary by where you live.
This software is information, not financial or legal advice. Check your local
position before going live with real money.
