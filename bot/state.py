"""Grid state: what the bot remembers between loops and across restarts.

Each grid level moves through these statuses:
    EMPTY    -> nothing here; we want to place a buy when price reaches it
    BUY_OPEN -> a buy order is resting at this level
    HOLDING  -> the buy filled; we hold inventory and want to sell it higher
    SELL_OPEN-> a sell order is resting; when it fills we book profit -> EMPTY

The whole state is saved to a JSON file every loop. On startup we reload it and
reconcile against the broker so we never duplicate or lose an order.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict, field
from datetime import date

EMPTY = "EMPTY"
BUY_OPEN = "BUY_OPEN"
HOLDING = "HOLDING"
SELL_OPEN = "SELL_OPEN"


@dataclass
class LevelState:
    index: int
    buy_price: float
    sell_price: float
    status: str = EMPTY
    qty: float = 0.0           # quantity currently held at this level
    filled_qty: float = 0.0    # quantity filled so far on the resting order
    buy_client_id: str = ""
    sell_client_id: str = ""


@dataclass
class GridState:
    symbol: str
    levels: list[LevelState] = field(default_factory=list)
    realized_pnl: float = 0.0       # booked profit after fees, all-time
    day: str = ""                   # ISO date the day's counters belong to
    day_start_pnl: float = 0.0      # realized_pnl at the start of today

    # --- persistence ---
    def save(self, path: str) -> None:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        data = {
            "symbol": self.symbol,
            "levels": [asdict(l) for l in self.levels],
            "realized_pnl": self.realized_pnl,
            "day": self.day,
            "day_start_pnl": self.day_start_pnl,
        }
        # Write to a temp file then rename, so a crash mid-write can't corrupt it.
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        os.replace(tmp, path)

    @classmethod
    def load(cls, path: str) -> "GridState | None":
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        state = cls(
            symbol=data["symbol"],
            realized_pnl=data.get("realized_pnl", 0.0),
            day=data.get("day", ""),
            day_start_pnl=data.get("day_start_pnl", 0.0),
        )
        state.levels = [LevelState(**l) for l in data.get("levels", [])]
        return state

    # --- daily counter rollover ---
    def roll_day_if_needed(self) -> None:
        """Reset the day's loss counter at the start of a new calendar day."""
        today = date.today().isoformat()
        if self.day != today:
            self.day = today
            self.day_start_pnl = self.realized_pnl

    @property
    def daily_pnl(self) -> float:
        """Realized profit/loss booked so far today (signed)."""
        return self.realized_pnl - self.day_start_pnl


def build_initial_state(symbol: str, grid_levels_list) -> GridState:
    """Create a fresh state from a list of GridLevel objects."""
    state = GridState(symbol=symbol)
    state.levels = [
        LevelState(index=g.index, buy_price=g.buy_price, sell_price=g.sell_price)
        for g in grid_levels_list
    ]
    state.roll_day_if_needed()
    return state


def reconcile_with_broker(state: GridState, broker, logger) -> None:
    """Sync saved state against the broker's real open orders before trading.

    For every level that thinks it has a resting order, confirm the order still
    exists and is open. If the broker has no record of it (e.g. it filled or was
    canceled while we were offline), update the level accordingly so we don't
    place a duplicate or wait forever on a ghost order.
    """
    open_ids = {o.client_order_id for o in _safe_open_orders(broker, logger)}
    for level in state.levels:
        if level.status == BUY_OPEN and level.buy_client_id:
            order = broker.get_order(level.buy_client_id)
            if order is None or level.buy_client_id not in open_ids:
                if order is not None and order.filled_qty > 0:
                    level.status = HOLDING
                    level.qty = order.filled_qty
                    logger.info("Reconcile: level %d buy filled while offline", level.index)
                else:
                    level.status = EMPTY
                    logger.info("Reconcile: level %d buy no longer open; reset", level.index)
        elif level.status == SELL_OPEN and level.sell_client_id:
            order = broker.get_order(level.sell_client_id)
            if order is None or level.sell_client_id not in open_ids:
                if order is not None and order.filled_qty > 0:
                    level.status = EMPTY  # sold while offline
                    logger.info("Reconcile: level %d sell filled while offline", level.index)
                else:
                    level.status = HOLDING  # sell vanished; still holding inventory
                    logger.info("Reconcile: level %d sell no longer open; back to holding", level.index)


def _safe_open_orders(broker, logger):
    try:
        return broker.list_open_orders()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not list open orders during reconcile: %s", exc)
        return []
