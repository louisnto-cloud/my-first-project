"""Tests for the backtest engine's core accounting."""

import math

from types import SimpleNamespace

from backtest import run_backtest


def _cfg():
    # A minimal stand-in for the real Config with just what run_backtest uses.
    return SimpleNamespace(
        band_low=90_000.0,
        band_high=110_000.0,
        grid_levels=6,
        profit_target_percent=1.0,
        fee_percent_per_side=0.25,
        order_size_usd=30.0,
    )


def test_choppy_market_books_profitable_trades():
    cfg = _cfg()
    mid = 100_000.0
    amp = 9_000.0
    prices = [mid + amp * math.sin(i / 10.0) for i in range(500)]
    report = run_backtest(prices, cfg)
    assert report.trades > 0
    assert report.net_pnl > 0          # chop should make the grid money
    assert report.win_rate == 100.0    # every completed cycle clears the 1% target


def test_no_trades_when_price_never_moves():
    cfg = _cfg()
    prices = [100_000.0] * 100
    report = run_backtest(prices, cfg)
    assert report.trades == 0
    assert report.net_pnl == 0.0


def test_breakout_below_band_is_not_bought():
    cfg = _cfg()
    # Price crashes far below the band and stays there; grid must NOT buy.
    prices = [50_000.0] * 100
    report = run_backtest(prices, cfg)
    assert report.trades == 0
