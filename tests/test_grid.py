"""Tests for grid level calculation."""

import pytest

from bot import grid


def test_levels_span_the_band_inclusively():
    prices = grid.compute_level_prices(90_000, 110_000, 5)
    assert prices[0] == 90_000      # bottom rung is band_low
    assert prices[-1] == 110_000    # top rung is band_high
    assert len(prices) == 5


def test_levels_are_evenly_spaced():
    prices = grid.compute_level_prices(100, 110, 6)
    gaps = [round(prices[i + 1] - prices[i], 9) for i in range(len(prices) - 1)]
    assert all(g == gaps[0] for g in gaps)   # every gap identical
    assert gaps[0] == pytest.approx(2.0)     # (110-100)/5


def test_build_grid_sets_sell_above_buy_by_target():
    g = grid.build_grid(100, 110, 6, profit_target_percent=1.0)
    assert len(g) == 6
    for level in g:
        assert level.sell_price == pytest.approx(level.buy_price * 1.01)
        assert level.sell_price > level.buy_price


def test_grid_with_healthy_target_clears_fees():
    g = grid.build_grid(90_000, 110_000, 6, profit_target_percent=1.0)
    # 1% target vs 0.5% round trip -> clears with a 0.2% cushion.
    assert grid.grid_clears_fees(g, fee_percent_per_side=0.25, min_net_margin_percent=0.2)


def test_grid_with_tight_target_fails_fee_check():
    g = grid.build_grid(90_000, 110_000, 6, profit_target_percent=0.3)
    # 0.3% target cannot beat a 0.5% round trip.
    assert not grid.grid_clears_fees(g, fee_percent_per_side=0.25)


def test_spacing_percent_is_reasonable():
    pct = grid.spacing_percent(100_000, 110_000, 6)  # 5 gaps of 2000 over 100k
    assert pct == pytest.approx(2.0)


def test_bad_band_raises():
    with pytest.raises(ValueError):
        grid.compute_level_prices(110, 100, 5)     # low above high
    with pytest.raises(ValueError):
        grid.compute_level_prices(100, 110, 1)     # need at least 2 levels
    with pytest.raises(ValueError):
        grid.build_grid(100, 110, 5, profit_target_percent=0)
