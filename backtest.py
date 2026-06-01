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
from dataclasses import dataclass

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

    for price in prices:
        # Breakout guard: if price leaves the band, stop opening new buys.
        in_band = cfg.band_low <= price <= cfg.band_high

        for level in levels:
            if level.status == statemod.EMPTY and in_band and price <= level.buy_price:
                level.qty = capital_per_order / level.buy_price
                level.status = statemod.HOLDING
            elif level.status == statemod.HOLDING and price >= level.sell_price:
                profit = fees.net_profit(
                    level.buy_price, level.sell_price, level.qty, cfg.fee_percent_per_side
                )
                realized += profit
                trades += 1
                if profit > 0:
                    wins += 1
                level.qty = 0.0
                level.status = statemod.EMPTY

        # Track equity (realized + value of inventory still held) for drawdown.
        held_value = sum(
            l.qty * price - l.qty * l.buy_price for l in levels if l.status == statemod.HOLDING
        )
        equity = realized + held_value
        peak_equity = max(peak_equity, equity)
        max_drawdown = max(max_drawdown, peak_equity - equity)

    start_price, end_price = prices[0], prices[-1]
    buy_hold_pct = (end_price - start_price) / start_price * 100.0

    # Strategy return measured against the capital actually put to work.
    deployed = capital_per_order * cfg.grid_levels
    strat_pct = (realized / deployed * 100.0) if deployed else 0.0

    return BacktestReport(
        bars=len(prices), trades=trades, wins=wins, net_pnl=realized,
        max_drawdown=max_drawdown, buy_hold_return_pct=buy_hold_pct,
        strategy_return_pct=strat_pct, start_price=start_price, end_price=end_price,
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


def main():
    parser = argparse.ArgumentParser(description="Backtest the grid strategy")
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--days", type=int, default=None, help="pull N days of Alpaca bars")
    parser.add_argument("--csv", default=None, help="read prices from CSV (column 'close')")
    parser.add_argument("--simulate", action="store_true", help="use synthetic prices (offline)")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
    except ConfigError as exc:
        raise SystemExit(f"Configuration refused (safety net working): {exc}")

    if args.csv:
        prices = _csv_prices(args.csv)
    elif args.simulate:
        prices = _synthetic_prices(cfg)
    elif args.days:
        prices = _alpaca_prices(cfg, args.days)
    else:
        raise SystemExit("Choose a data source: --days N, --csv FILE, or --simulate")

    report = run_backtest(prices, cfg)
    print(report.render())


if __name__ == "__main__":
    main()
