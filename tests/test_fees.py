"""Tests for the fee math. If these pass, the breakeven logic is trustworthy."""

import pytest

from bot import fees


def test_round_trip_is_double_the_side_fee():
    assert fees.round_trip_fee_percent(0.25) == 0.50


def test_breakeven_sell_price_is_above_buy_price():
    # You must sell higher than you bought just to cover both fees.
    be = fees.breakeven_sell_price(100.0, 0.25)
    assert be > 100.0
    # Selling exactly at breakeven yields ~zero profit.
    assert fees.net_profit(100.0, be, 1.0, 0.25) == pytest.approx(0.0, abs=1e-9)


def test_selling_below_breakeven_loses_money():
    be = fees.breakeven_sell_price(100.0, 0.25)
    assert fees.net_profit(100.0, be - 0.01, 1.0, 0.25) < 0


def test_net_profit_after_fees_for_a_one_percent_move():
    # Buy 0.001 BTC at 100,000; sell at 101,000 (a 1% rise), 0.25% per side.
    profit = fees.net_profit(100_000, 101_000, 0.001, 0.25)
    # Round-trip fee is ~0.5% of ~$100 notional (~$0.50). Gross gain is $1.00.
    # So net should be clearly positive but less than the $1.00 gross.
    assert 0 < profit < 1.0
    assert profit == pytest.approx(0.4975, abs=1e-3)


def test_net_margin_percent_matches_clears_fees():
    # A 1% target on a 0.25%/side fee leaves about 0.5% net margin.
    margin = fees.net_margin_percent(100.0, 101.0, 0.25)
    assert margin == pytest.approx(0.4975, abs=1e-3)
    assert fees.clears_fees(100.0, 101.0, 0.25, min_net_margin_percent=0.2)
    assert not fees.clears_fees(100.0, 101.0, 0.25, min_net_margin_percent=0.6)


def test_too_tight_spacing_does_not_clear_fees():
    # A 0.2% move cannot cover a 0.5% round trip: it must fail.
    assert not fees.clears_fees(100.0, 100.20, 0.25, min_net_margin_percent=0.0)


def test_invalid_inputs_raise():
    with pytest.raises(ValueError):
        fees.breakeven_sell_price(0, 0.25)
    with pytest.raises(ValueError):
        fees.net_profit(100, 101, -1, 0.25)
