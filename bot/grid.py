"""Grid level calculation.

A grid bot slices your price band into a ladder of evenly spaced "rungs".
At each rung it wants to BUY when price dips to that rung, then SELL a bit
higher to capture your profit target. This module just does that arithmetic.
It is pure: no network, no Alpaca, no surprises. Easy to test and trust.
"""

from __future__ import annotations

from dataclasses import dataclass

from bot.fees import net_margin_percent


@dataclass(frozen=True)
class GridLevel:
    """One rung of the ladder."""

    index: int          # 0 at the bottom of the band
    buy_price: float     # place a buy here when price dips to it
    sell_price: float    # sell here to capture the profit target


def compute_level_prices(band_low: float, band_high: float, grid_levels: int) -> list[float]:
    """Evenly spaced prices from band_low to band_high (inclusive of both ends).

    grid_levels is the number of rungs. With grid_levels=6 you get 6 prices,
    which means 5 equal gaps between band_low and band_high.
    """
    if band_low <= 0 or band_high <= 0:
        raise ValueError("band prices must be positive")
    if band_low >= band_high:
        raise ValueError("band_low must be less than band_high")
    if grid_levels < 2:
        raise ValueError("grid_levels must be at least 2")
    step = (band_high - band_low) / (grid_levels - 1)
    return [band_low + i * step for i in range(grid_levels)]


def build_grid(
    band_low: float,
    band_high: float,
    grid_levels: int,
    profit_target_percent: float,
) -> list[GridLevel]:
    """Build the full ladder of buy/sell rungs.

    Each rung sells at buy_price * (1 + profit_target_percent/100).
    """
    if profit_target_percent <= 0:
        raise ValueError("profit_target_percent must be positive")
    prices = compute_level_prices(band_low, band_high, grid_levels)
    multiplier = 1.0 + profit_target_percent / 100.0
    return [
        GridLevel(index=i, buy_price=p, sell_price=p * multiplier)
        for i, p in enumerate(prices)
    ]


def spacing_percent(band_low: float, band_high: float, grid_levels: int) -> float:
    """The gap between two adjacent rungs, as a percent of the lower rung.

    Useful sanity figure: if this is smaller than the round-trip fee, the grid
    is too tight to be worth running.
    """
    prices = compute_level_prices(band_low, band_high, grid_levels)
    step = prices[1] - prices[0]
    return step / prices[0] * 100.0


def grid_clears_fees(
    grid: list[GridLevel],
    fee_percent_per_side: float,
    min_net_margin_percent: float = 0.0,
) -> bool:
    """True only if EVERY rung's buy->sell pair beats fees by the margin.

    The bottom rung is the worst case (largest percentage move needed), so in
    practice they either all pass or all fail, but we check each to be safe.
    """
    return all(
        net_margin_percent(level.buy_price, level.sell_price, fee_percent_per_side)
        >= min_net_margin_percent
        for level in grid
    )
