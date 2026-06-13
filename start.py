#!/usr/bin/env python3
"""start.py — the friendly front door to your trading bot.

Run it with no arguments for a simple, guided menu:

    python start.py

Or jump straight to one action:

    python start.py health     # check everything works
    python start.py backtest   # see the strategy on past data
    python start.py dryrun     # watch it think (zero risk)
    python start.py screen     # find which symbols are worth trading
    python start.py keys       # set up your Alpaca keys
    python start.py explain    # plain-language explanation

Everything advanced lives in the other files. This is just the easy way in.
"""

from __future__ import annotations

import os
import subprocess
import sys

# --- styling (graceful: no colour when not a real terminal) -----------------
_TTY = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None


def _c(code: str) -> str:
    return code if _TTY else ""


RESET = _c("\033[0m")
BOLD = _c("\033[1m")
DIM = _c("\033[2m")
CYAN = _c("\033[36m")
GREEN = _c("\033[32m")
YELLOW = _c("\033[33m")
RED = _c("\033[31m")
BLUE = _c("\033[34m")
MAGENTA = _c("\033[35m")

W = 62  # box width


def box(lines, color=CYAN, title=None):
    top = f"{color}╭{'─' * (W - 2)}╮{RESET}"
    bot = f"{color}╰{'─' * (W - 2)}╯{RESET}"
    print(top)
    if title:
        pad = W - 4 - _len(title)
        print(f"{color}│{RESET} {BOLD}{title}{RESET}{' ' * max(pad, 0)} {color}│{RESET}")
        print(f"{color}│{' ' * (W - 2)}│{RESET}")
    for ln in lines:
        pad = W - 4 - _len(ln)
        print(f"{color}│{RESET} {ln}{' ' * max(pad, 0)} {color}│{RESET}")
    print(bot)


def _len(s: str) -> int:
    """Visible *display* width: ignores ANSI codes and counts emoji/wide
    characters as 2 columns, so box borders line up in real terminals."""
    import re
    import unicodedata

    s = re.sub(r"\033\[[0-9;]*m", "", s)
    width = 0
    for ch in s:
        if ch == "️":  # emoji variation selector: zero width itself
            continue
        cp = ord(ch)
        wide = (
            unicodedata.east_asian_width(ch) in ("W", "F")
            or 0x1F300 <= cp <= 0x1FAFF   # most emoji
            or 0x2600 <= cp <= 0x27BF     # symbols/dingbats (e.g. ❓)
            or 0x2B00 <= cp <= 0x2BFF     # arrows/shapes (e.g. 🟢⬇)
            or 0x2300 <= cp <= 0x23FF     # technical symbols
        )
        width += 2 if wide else 1
    return width


def banner():
    print()
    box(
        [
            f"{DIM}A safe, simple grid trading bot for Alpaca{RESET}",
            f"{DIM}Fake money by default · real money never by accident{RESET}",
        ],
        color=CYAN,
        title="🟢  GRID BOT  ·  Welcome",
    )


def _run(cmd, intro=None):
    """Run a child command, streaming its output, with a tidy frame."""
    if intro:
        print(f"\n{BOLD}{intro}{RESET}\n")
    try:
        subprocess.run([sys.executable, *cmd], check=False)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Stopped.{RESET}")


def _pause():
    if sys.stdin.isatty():
        input(f"\n{DIM}Press Enter to return to the menu…{RESET}")


# --- actions ----------------------------------------------------------------
def action_health():
    box([f"Running the safety tests. {DIM}This proves the fee math and",
         f"every safety brake are working correctly.{RESET}"],
        color=BLUE, title="✅  Health check")
    result = subprocess.run([sys.executable, "-m", "pytest", "-q"])
    if result.returncode == 0:
        print(f"\n{GREEN}{BOLD}All good — every safety test passed.{RESET}")
    else:
        print(f"\n{RED}Some tests failed. Did you run option 6 (install) first?{RESET}")


def action_backtest():
    box([f"Replaying the strategy on past prices, fees + slippage",
         f"included. Compare {BOLD}Strategy{RESET} vs {BOLD}Buy & hold{RESET} at the end.",
         f"{DIM}Offline demo data unless your keys are set up.{RESET}"],
        color=BLUE, title="📈  Backtest")
    if _have_keys():
        _run(["backtest.py", "--days", "90"], "Using your REAL last-90-days data:")
    else:
        _run(["backtest.py", "--simulate"], "Using offline demo data (no keys yet):")


def action_dryrun():
    box([f"Watching the bot make decisions for 30 loops.",
         f"{GREEN}Zero risk: no keys, no money, nothing is sent anywhere.{RESET}",
         f"Look for PLACE, FILL, BREAKOUT and STATUS lines."],
        color=BLUE, title="👀  Dry run")
    _run(["run_bot.py", "--ticks", "30"])


def action_screen():
    box([f"Ranking symbols by an HONEST out-of-sample test, so you",
         f"see which are worth trading and which to skip.",
         f"{DIM}Offline demo unless your keys are set up.{RESET}"],
        color=BLUE, title="🔎  Find the best symbol")
    syms = ["AMD", "NVDA", "SPY"]
    if _have_keys():
        _run(["screen_symbols.py", "--symbols", *syms, "--days", "90"],
             "Screening real data (last 90 days):")
    else:
        _run(["screen_symbols.py", "--symbols", *syms, "--simulate"],
             "Screening offline demo data:")


def action_keys():
    box([f"You need a FREE Alpaca paper account (fake money).",
         f"1. Go to https://alpaca.markets and sign up.",
         f"2. Switch to {BOLD}Paper{RESET}, open API Keys, Generate.",
         f"3. Copy the Key ID and Secret (Secret shows ONCE)."],
        color=MAGENTA, title="🔑  Set up your keys")
    if not os.path.exists(".env"):
        if os.path.exists(".env.example"):
            import shutil
            shutil.copy(".env.example", ".env")
            print(f"{GREEN}Created a fresh .env for you.{RESET}")
    else:
        print(f"{DIM}.env already exists — leaving it as is.{RESET}")
    print(f"\nNow open {BOLD}.env{RESET} and paste your two keys, then save.")
    print(f"{DIM}Tip: in a Codespace, type  code .env  to open it.{RESET}")
    print(f"{YELLOW}Never share .env or paste keys into a chat.{RESET}")


def action_guide():
    box([f"A 19-tab Excel workbook and a word-for-word guide are",
         f"in the {BOLD}docs/{RESET} folder of this project:",
         f"  • docs/Trading_Bot_Setup.xlsx",
         f"  • docs/SETUP_GUIDE.md"],
        color=MAGENTA, title="📊  Guides & workbook")


def action_explain():
    box([
        f"You pick a price BAND (a low and a high).",
        f"The bot BUYS small amounts as price dips through it,",
        f"and SELLS a little higher — capturing the difference.",
        f"",
        f"{BOLD}It earns in choppy, sideways markets.{RESET}",
        f"{YELLOW}It can lose if the price trends hard one way.{RESET}",
        f"",
        f"Guards protect you: a breakout halt, a daily-loss stop,",
        f"and a kill switch. It uses FAKE money until you take two",
        f"deliberate steps to go live.",
    ], color=CYAN, title="❓  How this works (in plain words)")


def action_killhelp():
    box([f"To STOP the bot instantly and cancel its orders, run:",
         f"   {BOLD}touch KILL{RESET}   {DIM}(Windows: type nul > KILL){RESET}",
         f"To let it run again later, delete that file:",
         f"   {BOLD}rm KILL{RESET}   {DIM}(Windows: del KILL){RESET}"],
        color=RED, title="🛑  Emergency stop")


def action_install():
    box([f"Installing the packages the bot needs. Do this once."],
        color=BLUE, title="⬇️  Install")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])


def _have_keys() -> bool:
    """True if a .env with non-placeholder keys seems present."""
    if not os.path.exists(".env"):
        return False
    try:
        text = open(".env").read()
    except OSError:
        return False
    return "ALPACA_API_KEY_ID=" in text and "your_paper_key_id_here" not in text \
        and "PK_your_key_id_here" not in text


# --- menu -------------------------------------------------------------------
MENU = [
    ("1", "Check everything works (safety tests)", action_health),
    ("2", "See the strategy on past data (backtest)", action_backtest),
    ("3", "Watch it think — zero risk (dry run)", action_dryrun),
    ("4", "Find the best symbol to trade (screen)", action_screen),
    ("5", "Set up my Alpaca keys", action_keys),
    ("6", "Install the bot (run once)", action_install),
    ("7", "Open the guides & workbook", action_guide),
    ("8", "Explain how this works", action_explain),
    ("9", "Emergency stop (kill switch) help", action_killhelp),
    ("0", "Quit", None),
]


def show_menu():
    keys_ok = _have_keys()
    status = f"{GREEN}keys set ✓{RESET}" if keys_ok else f"{YELLOW}no keys yet (demo mode){RESET}"
    print(f"\n{BOLD}What would you like to do?{RESET}   {DIM}status:{RESET} {status}")
    print(f"{DIM}{'─' * W}{RESET}")
    for key, label, _ in MENU:
        print(f"  {BOLD}{CYAN}{key}{RESET}  {label}")
    print(f"{DIM}{'─' * W}{RESET}")


def interactive():
    banner()
    actions = {k: fn for k, _, fn in MENU}
    while True:
        show_menu()
        try:
            choice = input(f"{BOLD}Type a number and press Enter ▸ {RESET}").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if choice == "0":
            print(f"\n{CYAN}Bye! Nothing was risked. Run  python start.py  any time.{RESET}\n")
            break
        fn = actions.get(choice)
        if fn is None:
            print(f"{RED}Please type one of the numbers shown.{RESET}")
            continue
        print()
        fn()
        _pause()


CLI = {
    "health": action_health, "backtest": action_backtest, "dryrun": action_dryrun,
    "screen": action_screen, "keys": action_keys, "install": action_install,
    "guide": action_guide, "explain": action_explain, "kill": action_killhelp,
}


def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ("-h", "--help", "help"):
            banner()
            show_menu()
            print(f"\n{DIM}Run with no arguments for the interactive menu, "
                  f"or: python start.py <action>{RESET}")
            return
        fn = CLI.get(arg)
        if fn is None:
            print(f"{RED}Unknown action '{arg}'.{RESET} Try: {', '.join(CLI)}")
            sys.exit(1)
        fn()
        return
    interactive()


if __name__ == "__main__":
    main()
