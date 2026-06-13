"""Tests for the backtest engine's core accounting."""

import math

from types import SimpleNamespace

import pytest

from backtest import run_backtest, suggest_band, walk_forward


def _cfg(slippage=0.0):
    # A minimal stand-in for the real Config with just what run_backtest uses.
    return SimpleNamespace(
        band_low=90_000.0,
        band_high=110_000.0,
        grid_levels=6,
        profit_target_percent=1.0,
        fee_percent_per_side=0.25,
        order_size_usd=30.0,
        slippage_percent_per_side=slippage,
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


def test_slippage_reduces_profit():
    mid, amp = 100_000.0, 9_000.0
    prices = [mid + amp * math.sin(i / 10.0) for i in range(500)]
    no_slip = run_backtest(prices, _cfg(slippage=0.0)).net_pnl
    with_slip = run_backtest(prices, _cfg(slippage=0.1)).net_pnl
    # Same trades, but slippage must make the result strictly worse.
    assert with_slip < no_slip


def test_suggest_band_sits_inside_the_range():
    prices = [100.0 + i for i in range(101)]  # 100..200
    low, high = suggest_band(prices, low_pct=10, high_pct=90)
    assert min(prices) < low < high < max(prices)


def test_walk_forward_evaluates_on_unseen_data():
    mid, amp = 100_000.0, 9_000.0
    prices = [mid + amp * math.sin(i / 10.0) for i in range(400)]
    (low, high), ins, out = walk_forward(prices, _cfg(), split=0.6)
    assert low < high
    # In and out samples cover different parts, so bar counts differ.
    assert ins.bars + out.bars == len(prices)


def test_walk_forward_needs_enough_data():
    with pytest.raises(ValueError):
        walk_forward([100.0, 101.0], _cfg())
