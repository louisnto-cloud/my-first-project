#!/usr/bin/env python3
"""Compare the grid strategy across several look-back windows, side by side.

For each window (default 30/60/90 days) it runs the EXACT same backtest and
prints one row: trades, win rate, net P&L after costs, strategy return, and
buy-and-hold return over that window. This is the honest "is it worth it?" view:
a strategy that only wins in one cherry-picked window is not a strategy.

Usage:
    python compare_windows.py --config config.amd.yaml --days 30 60 90   # real Alpaca data (needs keys)
    python compare_windows.py --config config.amd.yaml --simulate        # offline mechanics demo (synthetic)

Note: real data needs your Alpaca paper keys in .env. --simulate uses synthetic
prices and proves only that the machinery runs; it is NOT real AMD data.
"""

from __future__ import annotations

import argparse

from bot.config import load_config, ConfigError
from backtest import run_backtest, _alpaca_prices, _synthetic_prices, _csv_prices


def _row(label, rep):
    verdict = "grid wins" if rep.strategy_return_pct > rep.buy_hold_return_pct else "hold wins"
    return (
        f"{label:>10} | {rep.trades:>6} | {rep.win_rate:>7.1f}% | "
        f"${rep.net_pnl:>9.2f} | {rep.strategy_return_pct:>8.2f}% | "
        f"{rep.buy_hold_return_pct:>9.2f}% | {verdict}"
    )


def main():
    parser = argparse.ArgumentParser(description="Compare the grid across look-back windows")
    parser.add_argument("--config", default="config.amd.yaml")
    parser.add_argument("--days", type=int, nargs="+", default=[30, 60, 90],
                        help="look-back windows in days (real Alpaca data)")
    parser.add_argument("--simulate", action="store_true",
                        help="use synthetic prices instead of real data (offline demo)")
    parser.add_argument("--csv", default=None,
                        help="read prices from a CSV (column 'close') and run windows as tail slices")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
    except ConfigError as exc:
        raise SystemExit(f"Configuration refused (safety net working): {exc}")

    print(f"\nComparing strategy for {cfg.symbol} ({cfg.asset_class}) "
          f"across windows: {', '.join(str(d) for d in args.days)} days")
    print("Band: %.2f - %.2f | levels: %d | target: %.2f%% | order $%.0f\n"
          % (cfg.band_low, cfg.band_high, cfg.grid_levels,
             cfg.profit_target_percent, cfg.order_size_usd))

    header = (f"{'window':>10} | {'trades':>6} | {'win%':>8} | "
              f"{'net P&L':>10} | {'strategy':>9} | {'buy&hold':>10} | who won")
    print(header)
    print("-" * len(header))

    csv_all = _csv_prices(args.csv) if args.csv else None

    for d in args.days:
        if args.csv:
            # Use the last (d*24) bars as a stand-in window from your CSV.
            window = min(len(csv_all), max(50, d * 24))
            prices = csv_all[-window:]
            label = f"{d}d (csv)"
        elif args.simulate:
            # ~24 synthetic bars per day so longer windows have more data.
            prices = _synthetic_prices(cfg, n=max(50, d * 24))
            label = f"{d}d (sim)"
        else:
            try:
                prices = _alpaca_prices(cfg, d)
            except Exception as exc:  # noqa: BLE001
                print(f"{d:>10}d | could not fetch data: {exc}")
                continue
            label = f"{d}d"
        if len(prices) < 2:
            print(f"{label:>10} | not enough data returned")
            continue
        rep = run_backtest(prices, cfg)
        print(_row(label, rep))

    print("\nHow to read: 'strategy' is the grid's return on deployed capital after costs; "
          "'buy&hold' is simply holding over the same window. If 'hold wins' in most windows, "
          "the grid is not earning its risk for this symbol/band.\n")


if __name__ == "__main__":
    main()
