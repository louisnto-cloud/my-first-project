#!/usr/bin/env python3
"""Backtest the EXACT grid strategy against historical prices.

This is separate from the live bot but reuses the same fee and grid math, so a
profitable backtest is meaningful. It reports, after fees:
    * total profit/loss
    * number of completed trades and win rate
    * largest drawdown (worst peak-to-trough dip in equity)
    * return vs. simply buying and holding the asset over the same period

Data sources:
    --days N      pull the last N days of real bars from Alpaca (needs paper keys)
    --csv FILE    read a CSV with a 'close' column instead (fully offline)
    --simulate    generate synthetic choppy prices (for a quick offline demo/test)

Golden rule from the guide: if it loses in the backtest, it will lose live.
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass, field
from types import SimpleNamespace

from bot.config import load_config, ConfigError
from bot.grid import build_grid
from bot import fees, state as statemod


@dataclass
class BacktestReport:
    bars: int
    trades: int
    wins: int
    net_pnl: float
    max_drawdown: float
    buy_hold_return_pct: float
    strategy_return_pct: float
    start_price: float
    end_price: float
    equity_curve: list = field(default_factory=list)  # strategy equity per bar

    @property
    def win_rate(self) -> float:
        return (self.wins / self.trades * 100.0) if self.trades else 0.0

    def render(self) -> str:
        return (
            "\n===== BACKTEST RESULTS =====\n"
            f"Bars processed:        {self.bars}\n"
            f"Completed trades:      {self.trades}\n"
            f"Win rate:              {self.win_rate:.1f}%\n"
            f"Net P&L (after fees):  ${self.net_pnl:.2f}\n"
            f"Largest drawdown:      ${self.max_drawdown:.2f}\n"
            f"Strategy return:       {self.strategy_return_pct:.2f}%\n"
            f"Buy & hold return:     {self.buy_hold_return_pct:.2f}%\n"
            f"Price start -> end:    {self.start_price:.2f} -> {self.end_price:.2f}\n"
            "============================\n"
        )


def run_backtest(prices: list[float], cfg) -> BacktestReport:
    """Replay prices through the grid logic and measure the outcome."""
    if len(prices) < 2:
        raise ValueError("need at least 2 prices to backtest")

    grid = build_grid(cfg.band_low, cfg.band_high, cfg.grid_levels, cfg.profit_target_percent)
    levels = [
        statemod.LevelState(index=g.index, buy_price=g.buy_price, sell_price=g.sell_price)
        for g in grid
    ]

    realized = 0.0
    trades = 0
    wins = 0
    peak_equity = 0.0
    max_drawdown = 0.0
    capital_per_order = cfg.order_size_usd
    equity_curve: list = []

    # Slippage: you buy a touch higher and sell a touch lower than the rung.
    # Optional on the cfg (older/stub configs default to 0).
    slip = getattr(cfg, "slippage_percent_per_side", 0.0) / 100.0
    eff_buy: dict = {}  # effective (slippage-adjusted) buy price per level index

    for price in prices:
        # Breakout guard: if price leaves the band, stop opening new buys.
        in_band = cfg.band_low <= price <= cfg.band_high

        for level in levels:
            if level.status == statemod.EMPTY and in_band and price <= level.buy_price:
                fill = level.buy_price * (1.0 + slip)
                level.qty = capital_per_order / fill
                eff_buy[level.index] = fill
                level.status = statemod.HOLDING
            elif level.status == statemod.HOLDING and price >= level.sell_price:
                sell_fill = level.sell_price * (1.0 - slip)
                profit = fees.net_profit(
                    eff_buy.get(level.index, level.buy_price), sell_fill,
                    level.qty, cfg.fee_percent_per_side,
                )
                realized += profit
                trades += 1
                if profit > 0:
                    wins += 1
                level.qty = 0.0
                level.status = statemod.EMPTY

        # Track equity (realized + value of inventory still held) for drawdown.
        held_value = sum(
            l.qty * price - l.qty * eff_buy.get(l.index, l.buy_price)
            for l in levels if l.status == statemod.HOLDING
        )
        equity = realized + held_value
        peak_equity = max(peak_equity, equity)
        max_drawdown = max(max_drawdown, peak_equity - equity)
        equity_curve.append(equity)

    start_price, end_price = prices[0], prices[-1]
    buy_hold_pct = (end_price - start_price) / start_price * 100.0

    # Strategy return measured against the capital actually put to work.
    deployed = capital_per_order * cfg.grid_levels
    strat_pct = (realized / deployed * 100.0) if deployed else 0.0

    return BacktestReport(
        bars=len(prices), trades=trades, wins=wins, net_pnl=realized,
        max_drawdown=max_drawdown, buy_hold_return_pct=buy_hold_pct,
        strategy_return_pct=strat_pct, start_price=start_price, end_price=end_price,
        equity_curve=equity_curve,
    )


def _synthetic_prices(cfg, n: int = 2000) -> list[float]:
    """Choppy synthetic prices inside the band, for an offline demo/test."""
    mid = (cfg.band_low + cfg.band_high) / 2.0
    amp = (cfg.band_high - cfg.band_low) / 2.0 * 0.9
    return [mid + amp * math.sin(i / 15.0) * math.cos(i / 53.0) for i in range(n)]


def _csv_prices(path: str) -> list[float]:
    import csv

    out = []
    with open(path, newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            out.append(float(row["close"]))
    return out


def _alpaca_prices(cfg, days: int) -> list[float]:
    from datetime import datetime, timedelta
    from alpaca.data.timeframe import TimeFrame

    start = datetime.utcnow() - timedelta(days=days)
    if cfg.asset_class == "crypto":
        from alpaca.data.historical import CryptoHistoricalDataClient
        from alpaca.data.requests import CryptoBarsRequest

        client = CryptoHistoricalDataClient(cfg.api_key_id, cfg.api_secret_key)
        req = CryptoBarsRequest(symbol_or_symbols=cfg.symbol, timeframe=TimeFrame.Hour, start=start)
        bars = client.get_crypto_bars(req)
    else:
        from alpaca.data.historical import StockHistoricalDataClient
        from alpaca.data.requests import StockBarsRequest

        client = StockHistoricalDataClient(cfg.api_key_id, cfg.api_secret_key)
        req = StockBarsRequest(symbol_or_symbols=cfg.symbol, timeframe=TimeFrame.Hour, start=start)
        bars = client.get_stock_bars(req)
    return [bar.close for bar in bars[cfg.symbol]]


def _percentile(sorted_vals: list[float], pct: float) -> float:
    """Linear-interpolated percentile (no numpy needed)."""
    if not sorted_vals:
        raise ValueError("no values")
    k = (len(sorted_vals) - 1) * (pct / 100.0)
    lo = math.floor(k)
    hi = math.ceil(k)
    if lo == hi:
        return sorted_vals[int(k)]
    return sorted_vals[lo] * (hi - k) + sorted_vals[hi] * (k - lo)


def suggest_band(prices: list[float], low_pct: float = 10.0, high_pct: float = 90.0):
    """Suggest a band from the data: the low_pct and high_pct price percentiles.

    Using percentiles (not the absolute min/max) keeps the band inside the
    normal trading range so the breakout guard still has room to do its job.
    """
    s = sorted(prices)
    return _percentile(s, low_pct), _percentile(s, high_pct)


def _clone_cfg(cfg, **over):
    fields = dict(
        band_low=cfg.band_low, band_high=cfg.band_high, grid_levels=cfg.grid_levels,
        profit_target_percent=cfg.profit_target_percent,
        fee_percent_per_side=cfg.fee_percent_per_side,
        order_size_usd=cfg.order_size_usd,
        slippage_percent_per_side=getattr(cfg, "slippage_percent_per_side", 0.0),
    )
    fields.update(over)
    return SimpleNamespace(**fields)


def walk_forward(prices, cfg, split: float = 0.6, low_pct: float = 10.0, high_pct: float = 90.0):
    """Honest out-of-sample test: fit the band on the FIRST part of the data,
    then evaluate on the LATER part the band never saw.

    Returns (band, in_sample_report, out_of_sample_report). If the out-of-sample
    result is much worse than in-sample, the band was overfit — a red flag.
    """
    n = len(prices)
    if n < 20:
        raise ValueError("need at least 20 prices for a walk-forward test")
    cut = int(n * split)
    tune, test = prices[:cut], prices[cut:]
    low, high = suggest_band(tune, low_pct, high_pct)
    tuned = _clone_cfg(cfg, band_low=low, band_high=high)
    return (low, high), run_backtest(tune, tuned), run_backtest(test, tuned)


def _load_prices(cfg, args):
    if args.csv:
        return _csv_prices(args.csv)
    if args.simulate:
        return _synthetic_prices(cfg)
    if args.days:
        return _alpaca_prices(cfg, args.days)
    raise SystemExit("Choose a data source: --days N, --csv FILE, or --simulate")


def main():
    parser = argparse.ArgumentParser(description="Backtest the grid strategy")
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--days", type=int, default=None, help="pull N days of Alpaca bars")
    parser.add_argument("--csv", default=None, help="read prices from CSV (column 'close')")
    parser.add_argument("--simulate", action="store_true", help="use synthetic prices (offline)")
    parser.add_argument("--suggest-band", action="store_true",
                        help="print a band suggested from the data, then exit")
    parser.add_argument("--walkforward", action="store_true",
                        help="fit band on early data, test on later (out-of-sample) data")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
    except ConfigError as exc:
        raise SystemExit(f"Configuration refused (safety net working): {exc}")

    prices = _load_prices(cfg, args)

    if args.suggest_band:
        low, high = suggest_band(prices)
        print(f"\nSuggested band for {cfg.symbol} from {len(prices)} prices:")
        print(f"  band_low:  {low:.2f}")
        print(f"  band_high: {high:.2f}")
        print(f"  (price range seen: {min(prices):.2f} - {max(prices):.2f})")
        print("Copy these into your config, then re-run a backtest.\n")
        return

    if args.walkforward:
        (low, high), ins, out = walk_forward(prices, cfg)
        print(f"\n===== WALK-FORWARD (out-of-sample) TEST: {cfg.symbol} =====")
        print(f"Band fitted on first 60% of data: {low:.2f} - {high:.2f}")
        print(f"{'':<18}{'IN-SAMPLE':>14}{'OUT-OF-SAMPLE':>16}")
        print(f"{'Net P&L $':<18}{ins.net_pnl:>14.2f}{out.net_pnl:>16.2f}")
        print(f"{'Trades':<18}{ins.trades:>14}{out.trades:>16}")
        print(f"{'Strategy %':<18}{ins.strategy_return_pct:>14.2f}{out.strategy_return_pct:>16.2f}")
        print(f"{'Buy&Hold %':<18}{ins.buy_hold_return_pct:>14.2f}{out.buy_hold_return_pct:>16.2f}")
        verdict = ("LOOKS ROBUST" if out.net_pnl > 0 and out.strategy_return_pct > 0
                   else "FRAGILE / LIKELY OVERFIT - do not trust")
        print(f"Verdict: {verdict}")
        print("If out-of-sample is much worse than in-sample, the band was overfit.\n")
        return

    print(run_backtest(prices, cfg).render())


if __name__ == "__main__":
    main()
