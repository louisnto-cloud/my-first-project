"""Tests for the multi-symbol screener."""

from types import SimpleNamespace

from screen_symbols import screen, infer_asset_class


def _cfg():
    return SimpleNamespace(
        band_low=100.0, band_high=140.0, grid_levels=6, profit_target_percent=1.0,
        fee_percent_per_side=0.0, order_size_usd=50.0, slippage_percent_per_side=0.05,
        symbol="X", asset_class="stock",
    )


def test_asset_class_inferred_from_symbol():
    assert infer_asset_class("BTC/USD") == "crypto"
    assert infer_asset_class("AMD") == "stock"


def test_screen_returns_one_row_per_symbol_sorted():
    # A choppy symbol and a strongly trending one, via fixed provider data.
    import math

    def provider(cfg, sym):
        if sym == "CHOP":
            return [120 + 18 * math.sin(i / 8.0) for i in range(400)]
        return [100 + i * 0.3 for i in range(400)]  # steady uptrend, no chop

    rows = screen(["CHOP", "TREND"], _cfg(), provider)
    assert len(rows) == 2
    # Sorted best-first by out-of-sample strategy return.
    assert rows[0]["oos_strat"] >= rows[1]["oos_strat"]
    assert all("band_low" in r and r["band_low"] < r["band_high"] for r in rows)


def test_screen_reports_data_errors_without_crashing():
    def provider(cfg, sym):
        raise RuntimeError("no data")

    rows = screen(["AMD"], _cfg(), provider)
    assert rows[0]["error"] == "no data"
