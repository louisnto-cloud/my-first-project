#!/usr/bin/env python3
"""Screen many symbols at once and rank which are actually worth grid-trading.

For each symbol it:
  1. fetches prices (real Alpaca data, your CSV, or a synthetic demo),
  2. fits a band on the FIRST 60% of the data (auto-suggested from percentiles),
  3. tests the grid on the LATER 40% the band never saw (out-of-sample),
  4. records the out-of-sample result.

It then RANKS symbols by honest out-of-sample strategy return, so you can see at
a glance which tickers chop in a grid-friendly way and which just trend (where
holding wins and the grid is not worth the risk).

Asset class is auto-detected: a "/" means crypto (e.g. BTC/USD), otherwise stock.

Usage:
    python screen_symbols.py --symbols AMD NVDA SPY --days 90        # real data (needs keys)
    python screen_symbols.py --symbols BTC/USD ETH/USD --days 60     # crypto, real data
    python screen_symbols.py --symbols AMD NVDA SPY --simulate       # offline demo (synthetic)
    python screen_symbols.py --symbols AMD --csv myprices.csv        # your own data, one symbol
"""

from __future__ import annotations

import argparse
import math

from bot.config import load_config, ConfigError
from backtest import _alpaca_prices, _csv_prices, walk_forward


def infer_asset_class(symbol: str) -> str:
    return "crypto" if "/" in symbol else "stock"


def _demo_prices(cfg, symbol: str, n: int = 600) -> list[float]:
    """Synthetic prices whose trend/chop depend on the symbol name, so the demo
    ranking actually differs across symbols (some trend, some chop)."""
    base = (cfg.band_low + cfg.band_high) / 2.0
    span = (cfg.band_high - cfg.band_low) / 2.0
    seed = sum(ord(c) for c in symbol)
    trend = ((seed % 7) - 3) / 3.0          # -1..+1 trend strength
    chop = 0.4 + (seed % 5) / 5.0            # 0.4..1.2 chop amount
    drift = base * 0.0006 * trend
    out = []
    for i in range(n):
        p = base + drift * i + span * chop * math.sin(i / 11.0) * math.cos(i / 29.0)
        out.append(max(p, base * 0.2))      # keep prices positive/sane
    return out


def screen(symbols, cfg, price_provider, split: float = 0.6) -> list[dict]:
    """Run the out-of-sample test for each symbol; return rows sorted best-first."""
    results = []
    for sym in symbols:
        cfg.symbol = sym
        cfg.asset_class = infer_asset_class(sym)
        # Stocks are commission-free on Alpaca; crypto pays 0.25% per side.
        cfg.fee_percent_per_side = 0.25 if cfg.asset_class == "crypto" else 0.0
        try:
            prices = price_provider(cfg, sym)
        except Exception as exc:  # noqa: BLE001
            results.append({"symbol": sym, "error": str(exc)})
            continue
        if len(prices) < 20:
            results.append({"symbol": sym, "error": "not enough data"})
            continue
        (low, high), ins, out = walk_forward(prices, cfg, split)
        worth = out.net_pnl > 0 and out.strategy_return_pct > out.buy_hold_return_pct
        results.append({
            "symbol": sym,
            "band_low": low, "band_high": high,
            "oos_trades": out.trades,
            "oos_pnl": out.net_pnl,
            "oos_strat": out.strategy_return_pct,
            "oos_bh": out.buy_hold_return_pct,
            "verdict": "WORTH IT" if worth else "skip (hold wins / loses)",
        })
    ok = [r for r in results if "error" not in r]
    bad = [r for r in results if "error" in r]
    ok.sort(key=lambda r: r["oos_strat"], reverse=True)
    return ok + bad


def main():
    parser = argparse.ArgumentParser(description="Screen and rank symbols for grid trading")
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--symbols", nargs="+", default=["AMD", "NVDA", "SPY"])
    parser.add_argument("--days", type=int, default=None, help="days of real Alpaca data")
    parser.add_argument("--csv", default=None, help="CSV price file (single symbol only)")
    parser.add_argument("--simulate", action="store_true", help="offline synthetic demo")
    parser.add_argument("--split", type=float, default=0.6, help="train fraction (rest is out-of-sample)")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
    except ConfigError as exc:
        raise SystemExit(f"Configuration refused (safety net working): {exc}")

    if args.csv and len(args.symbols) != 1:
        raise SystemExit("--csv works with exactly one --symbol (a CSV is one price series).")

    if args.csv:
        csv_prices = _csv_prices(args.csv)
        provider = lambda c, s: csv_prices
        source = f"CSV {args.csv}"
    elif args.simulate:
        provider = _demo_prices
        source = "SYNTHETIC demo (not real data)"
    elif args.days:
        provider = lambda c, s: _alpaca_prices(c, args.days)
        source = f"real Alpaca data, last {args.days} days"
    else:
        raise SystemExit("Choose a data source: --days N, --csv FILE, or --simulate")

    print(f"\nScreening {len(args.symbols)} symbols | data: {source} | "
          f"out-of-sample = last {int((1 - args.split) * 100)}% of each series")
    print("Bands are auto-fitted per symbol on the training portion.\n")

    rows = screen(args.symbols, cfg, provider, args.split)

    header = (f"{'rank':>4} | {'symbol':>8} | {'band (fitted)':>18} | {'trades':>6} | "
              f"{'OOS net$':>9} | {'OOS strat%':>10} | {'buy&hold%':>10} | verdict")
    print(header)
    print("-" * len(header))
    rank = 0
    for r in rows:
        if "error" in r:
            print(f"{'-':>4} | {r['symbol']:>8} | {'data error':>18} | {r['error']}")
            continue
        rank += 1
        band = f"{r['band_low']:.2f}-{r['band_high']:.2f}"
        print(f"{rank:>4} | {r['symbol']:>8} | {band:>18} | {r['oos_trades']:>6} | "
              f"{r['oos_pnl']:>9.2f} | {r['oos_strat']:>10.2f} | {r['oos_bh']:>10.2f} | {r['verdict']}")

    print("\nRanked by out-of-sample strategy return (the honest metric). 'WORTH IT' means the "
          "grid beat simply holding on data the band never saw. Everything else: don't deploy real "
          "money. Synthetic runs are illustrative only.\n")


if __name__ == "__main__":
    main()
