"""Safety guards.

These are the bot's brakes. Each guard is a small pure function that looks at
the current situation and returns a clear yes/no with a plain-language reason.
The engine calls them every loop and obeys them. Keeping them pure (just
numbers in, decision out) makes them trivial to test, which is exactly what
you want for the code that protects your money.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class GuardDecision:
    """Result of a guard check.

    allow=True  -> the action is permitted.
    allow=False -> blocked; `reason` explains why in plain language.
    """

    allow: bool
    reason: str


def check_breakout(
    price: float,
    band_low: float,
    band_high: float,
    enabled: bool = True,
) -> GuardDecision:
    """Block new buys if price has left the band (a possible runaway trend).

    This is the guard that stops a falling market from making the bot buy all
    the way down into a worthless bag.
    """
    if not enabled:
        return GuardDecision(True, "breakout guard disabled in config")
    if price < band_low:
        return GuardDecision(
            False, f"price {price:.2f} is BELOW band low {band_low:.2f} (breakout)"
        )
    if price > band_high:
        return GuardDecision(
            False, f"price {price:.2f} is ABOVE band high {band_high:.2f} (breakout)"
        )
    return GuardDecision(True, f"price {price:.2f} is inside the band")


def check_daily_loss(daily_pnl_usd: float, daily_loss_limit_usd: float) -> GuardDecision:
    """Halt trading when the day's loss reaches the limit.

    daily_pnl_usd is signed: negative means a loss. The limit is given as a
    positive number of dollars; we compare against its negative.
    """
    limit = -abs(daily_loss_limit_usd)
    if daily_pnl_usd <= limit:
        return GuardDecision(
            False,
            f"daily loss {daily_pnl_usd:.2f} hit limit {limit:.2f}; halting all trading",
        )
    headroom = daily_pnl_usd - limit
    return GuardDecision(True, f"daily loss limit OK ({headroom:.2f} headroom)")


def check_can_place_buy(
    position_usd: float,
    deployed_usd: float,
    open_orders: int,
    next_order_usd: float,
    max_position_usd: float,
    max_deployed_usd: float,
    max_open_orders: int,
) -> GuardDecision:
    """Decide whether one more buy of next_order_usd is within all risk limits.

    Checks, in order: open-order count, total deployed dollars, and total
    position value. Any single breach blocks the buy.
    """
    if open_orders >= max_open_orders:
        return GuardDecision(
            False, f"already at max_open_orders ({open_orders}/{max_open_orders})"
        )
    if deployed_usd + next_order_usd > max_deployed_usd:
        return GuardDecision(
            False,
            f"buy would deploy {deployed_usd + next_order_usd:.2f} > "
            f"max_deployed_usd {max_deployed_usd:.2f}",
        )
    if position_usd + next_order_usd > max_position_usd:
        return GuardDecision(
            False,
            f"buy would grow position to {position_usd + next_order_usd:.2f} > "
            f"max_position_usd {max_position_usd:.2f}",
        )
    return GuardDecision(True, "buy is within all risk limits")


def kill_switch_active(kill_switch_file: str) -> bool:
    """True if the kill-switch file exists. Its mere presence stops the bot.

    Create it any time with:  touch KILL   (Mac/Linux)  or  type nul > KILL (Win)
    """
    return os.path.exists(kill_switch_file)
