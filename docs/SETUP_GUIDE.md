# 🟢 Total-Beginner Setup Guide — Word for Word

This guide assumes you know **nothing**. Do each step in order. Don't skip.
Every command you need is in a grey box — copy the whole box and paste it.

---

## ⛏️ Before you start (read these 4 lines)

- **Device:** Use a **desktop or laptop** with the **Chrome** browser. **Not a phone.**
- **Time:** About 30 minutes for the safe part. No money needed for any of it.
- **Cost:** $0. Everything here uses fake money.
- **Golden rule:** If a step says "zero risk," it truly sends nothing anywhere.

---

## PART 1 — Open the code in your browser (GitHub Codespaces)

A "Codespace" is a free computer that runs inside your browser tab. Nothing to install.

1. In Chrome, go to: **https://github.com** and **sign in** (or click *Sign up* — it's free).
2. Go to your project page: **https://github.com/louisnto-cloud/my-first-project**
3. Find the green **`< > Code`** button (top-right of the file list). Click it.
4. In the little box that opens, click the **`Codespaces`** tab (next to "Local").
5. Click **`Create codespace on claude/cool-sagan-TEXoS`**.
   - 🪤 **TRAP:** Make sure it says the branch **`claude/cool-sagan-TEXoS`**, NOT `main`. If it says `main`, click the branch-name dropdown near the top of the page first and pick `claude/cool-sagan-TEXoS`, then redo steps 3–5.
6. Wait about 1 minute. A code editor opens in your browser.
7. Look at the **bottom panel** — that's the **Terminal** (a place to type commands).
   - 🪤 **TRAP:** No terminal showing? Click the top menu **`Terminal` → `New Terminal`**.

📷 *Official picture of the Code/Codespaces button & flow:* https://docs.github.com/en/codespaces/getting-started/quickstart

---

## PART 2 — Install the bot (zero risk)

Click inside the terminal (bottom panel), then paste this whole box and press **Enter**:

```bash
pip install -r requirements.txt
```

- ✅ **What should happen:** lots of lines, ending with no red `ERROR`.
- 🪤 **TRAP:** If you see `command not found: pip`, type `pip3` instead of `pip` (use `python3`/`pip3` everywhere below).

---

## PART 3 — Prove the safety code works (zero risk)

Paste this and press Enter:

```bash
python -m pytest -q
```

- ✅ **What should happen:** the last line says **`45 passed`**.
- 🧠 **What it means:** the fee math and all the safety brakes were just tested and are correct.
- 🪤 **TRAP:** `No module named pytest`? You skipped Part 2 — run it again.

---

## PART 4 — See the strategy on past data (zero risk)

```bash
python backtest.py --simulate
```

- ✅ **What you'll see:** a "BACKTEST RESULTS" box with trades, win rate, and Net P&L.
- 🧠 **How to read it:** compare **Strategy return** vs **Buy & hold return**. If holding wins, the market was trending — grids prefer choppy markets. This is normal and honest.

---

## PART 5 — Watch the bot think (zero risk, nothing sent)

```bash
python run_bot.py --ticks 30
```

- ✅ **What you'll see:** lines like `PLACE buy ...`, then `FILL ...`, then `BREAKOUT ...`, and a `STATUS` line each loop.
- 🧠 **What it means:** it's simulating decisions locally. `--ticks 30` makes it stop after 30 loops. **No keys, no money, nothing leaves the computer.**

🎉 **If you got here, the machine works.** Everything above was risk-free. The next parts add fake-money trading and need free keys.

---

## PART 6 — Get your free Alpaca paper keys (fake money)

"Keys" are like a username + password the bot uses to talk to Alpaca. Paper keys control only **fake** money.

1. New browser tab → **https://alpaca.markets** → click **Sign up**. Use your email.
2. After signing in, find the **Live / Paper** switch (top-left area) and set it to **`Paper`**.
   - 🪤 **TRAP:** If it says **Live**, you're on the real-money side. Switch it to **Paper** now.
3. Find **`API Keys`** (often under *Home*, or a key icon in the menu).
4. Click **`Generate New Key`** (or *Regenerate*).
5. Two values appear: a **Key ID** and a **Secret Key**.
6. **Copy BOTH into a notes file right now.**
   - 🪤 **BIGGEST TRAP:** The **Secret Key is shown only once.** If you close the box without copying it, you must regenerate and start over. Copy it before clicking away.

📷 *Official walkthrough with current screenshots:* https://alpaca.markets/learn/connect-to-alpaca-api
📷 *Paper trading overview:* https://alpaca.markets/learn/start-paper-trading

---

## PART 7 — Put your keys into the bot

Back in the **Codespace terminal**, paste this to create your secrets file:

```bash
cp .env.example .env
```

Now open `.env` to edit it:
1. In the left file list of the Codespace, click the file named **`.env`**.
   - 🪤 **TRAP:** Hidden? Files starting with a dot can be hard to spot — it's at the top of the list. Or paste `code .env` in the terminal to open it.
2. Replace the placeholder text so it looks like this (paste **your** real values):

```bash
ALPACA_API_KEY_ID=PKxxxxxxxxxxxxxxxx
ALPACA_API_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. Save the file: **`Ctrl+S`** (Mac: **`Cmd+S`**).
   - 🪤 **TRAP:** Never share `.env` or paste your keys into a chat. The project already hides `.env` from GitHub for you.

---

## PART 8 — Switch from "pretend" to "paper" mode

1. In the file list, click **`config.yaml`**.
2. Find the line near the top that says:

```yaml
mode: "dry_run"
```

3. Change it to:

```yaml
mode: "paper"
```

4. Save (**`Ctrl+S`** / **`Cmd+S`**).
   - 🪤 **TRAP:** Keep the quotes and the spacing exactly. Don't change `i_really_want_live_trading` — leave it `false`. That keeps you on fake money.

---

## PART 9 — Backtest on real data, then paper trade

Real last-30-days Bitcoin backtest (uses your keys, still no trading):

```bash
python backtest.py --days 30
```

Start paper trading (fake money, **real live prices**):

```bash
python run_bot.py
```

- ✅ **What happens:** it runs continuously, printing a `STATUS` line every loop. Leave it running and read the log.
- 🧠 **Let it run 2–4 weeks.** Check that profit after fees trends **up**, not down.
- 🪤 **TRAP — Codespaces sleeps:** a Codespace pauses when you close the tab or go idle, so it's perfect for *testing* but **not** for a multi-week run. For that, run Part 9 on **your own laptop/desktop** (see "Local" note below) or a small always-on cloud server.

---

## PART 10 — The emergency stop (kill switch)

To stop the bot instantly and cancel its orders, open a terminal and paste:

```bash
touch KILL
```

To let it run again later, remove that file:

```bash
rm KILL
```

---

## PART 11 — Going live with REAL money (do NOT rush here)

Only after the **Go-Live Checklist** (in the Excel workbook) is 100% true:
1. In `config.yaml`: set `mode: "live"` **and** `i_really_want_live_trading: true`.
2. In the terminal, set the safety latch:
   ```bash
   export I_UNDERSTAND_THIS_IS_REAL_MONEY=true
   ```
3. Put your **live** (funded-account) keys in `.env`. Start with tiny amounts. Watch closely.
- 🧠 If any one of those is missing, the bot refuses to trade real money — on purpose.

---

## 🪤 The 7 traps, all in one place
1. Wrong branch — must be `claude/cool-sagan-TEXoS`, not `main`.
2. `pip`/`python` not found — use `pip3`/`python3`.
3. Skipping Part 2 — then tests/backtest fail with "No module".
4. Alpaca on **Live** instead of **Paper**.
5. Not copying the **Secret Key** (shown only once).
6. Editing `config.yaml` quotes/spacing wrong.
7. Expecting a Codespace to run for weeks — it sleeps; use a real machine for long runs.

---

## 💻 If you'd rather run on your own computer (for long paper runs)
```bash
git clone https://github.com/louisnto-cloud/my-first-project.git
cd my-first-project
git checkout claude/cool-sagan-TEXoS
pip install -r requirements.txt
```
Then continue from **Part 3**. (Needs Python 3.10+ from https://www.python.org/downloads/ — on Windows, tick "Add Python to PATH" during install.)
