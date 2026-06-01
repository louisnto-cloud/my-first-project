"""The grid engine: the main loop that actually trades.

Every loop ("tick") it:
  1. Checks the kill switch and bails out instantly if it's set.
  2. Gets the current price and rolls the daily counter over at midnight.
  3. Detects fills on its resting orders (handling partial fills).
  4. Runs the guards: daily-loss limit, then breakout.
  5. Places buys at empty rungs below price (within all risk limits) and sells
     for rungs it's holding.
  6. Prints a status line and saves state to disk.

The same logic runs in dry-run (against a local SimulatedBroker) and paper/live
(against AlpacaBroker). Only the broker differs.
"""

from __future__ import annotations

import time
import uuid

from bot import fees, guards, state as statemod
from bot.alerts import send_alert


class GridEngine:
    def __init__(self, cfg, broker, logger, grid_state):
        self.cfg = cfg
        self.broker = broker
        self.log = logger
        self.state = grid_state
        self._halted = False  # set when a hard guard (daily loss) trips

    # -- helpers ------------------------------------------------------------
    def _new_client_id(self, level_index: int, side: str) -> str:
        # Unique per order, so retries reuse it (idempotent) but each new order
        # at a level is distinct. Alpaca client ids must be reasonably short.
        return f"L{level_index}-{side}-{uuid.uuid4().hex[:8]}"

    def _alert(self, message: str) -> None:
        send_alert(self.cfg.alerts_enabled, self.cfg.alert_webhook_url, message)

    def _open_buy_notional(self) -> float:
        return sum(
            l.qty * l.buy_price if l.qty else self.cfg.order_size_usd
            for l in self.state.levels
            if l.status == statemod.BUY_OPEN
        )

    def _open_order_count(self) -> int:
        return sum(
            1
            for l in self.state.levels
            if l.status in (statemod.BUY_OPEN, statemod.SELL_OPEN)
        )

    # -- fill detection -----------------------------------------------------
    def _process_fills(self, price: float) -> None:
        for level in self.state.levels:
            if level.status == statemod.BUY_OPEN and level.buy_client_id:
                order = self.broker.get_order(level.buy_client_id)
                if order is None:
                    continue
                level.filled_qty = order.filled_qty
                if order.status == "filled":
                    level.qty = order.filled_qty
                    level.status = statemod.HOLDING
                    level.filled_qty = 0.0
                    self.log.info(
                        "FILL: bought %.8f at level %d (~%.2f). Now holding.",
                        level.qty, level.index, level.buy_price,
                    )
            elif level.status == statemod.SELL_OPEN and level.sell_client_id:
                order = self.broker.get_order(level.sell_client_id)
                if order is None:
                    continue
                level.filled_qty = order.filled_qty
                if order.status == "filled":
                    profit = fees.net_profit(
                        level.buy_price, level.sell_price, level.qty,
                        self.cfg.fee_percent_per_side,
                    )
                    self.state.realized_pnl += profit
                    self.log.info(
                        "FILL: sold %.8f at level %d (~%.2f). Profit after fees: %.4f",
                        level.qty, level.index, level.sell_price, profit,
                    )
                    level.qty = 0.0
                    level.filled_qty = 0.0
                    level.status = statemod.EMPTY
                    level.buy_client_id = ""
                    level.sell_client_id = ""

    # -- order placement ----------------------------------------------------
    def _maybe_place_buys(self, price: float, buys_allowed: bool) -> None:
        if not buys_allowed:
            return
        position_usd = self.broker.get_position_qty() * price
        for level in self.state.levels:
            if level.status != statemod.EMPTY:
                continue
            # Only buy rungs at or below the current price (a dip to buy into).
            if level.buy_price > price:
                continue
            qty = self.cfg.order_size_usd / level.buy_price
            decision = guards.check_can_place_buy(
                position_usd=position_usd,
                deployed_usd=position_usd + self._open_buy_notional(),
                open_orders=self._open_order_count(),
                next_order_usd=self.cfg.order_size_usd,
                max_position_usd=self.cfg.max_position_usd,
                max_deployed_usd=self.cfg.max_deployed_usd,
                max_open_orders=self.cfg.max_open_orders,
            )
            if not decision.allow:
                self.log.info("SKIP buy at level %d: %s", level.index, decision.reason)
                continue
            cid = self._new_client_id(level.index, "buy")
            self.log.info(
                "PLACE buy %.8f @ %.2f (level %d) id=%s", qty, level.buy_price, level.index, cid
            )
            self.broker.submit_limit("buy", qty, level.buy_price, cid)
            level.buy_client_id = cid
            level.status = statemod.BUY_OPEN

    def _maybe_place_sells(self) -> None:
        for level in self.state.levels:
            if level.status != statemod.HOLDING:
                continue
            cid = self._new_client_id(level.index, "sell")
            self.log.info(
                "PLACE sell %.8f @ %.2f (level %d) id=%s",
                level.qty, level.sell_price, level.index, cid,
            )
            self.broker.submit_limit("sell", level.qty, level.sell_price, cid)
            level.sell_client_id = cid
            level.status = statemod.SELL_OPEN

    # -- one loop -----------------------------------------------------------
    def tick(self) -> None:
        price = self.broker.get_price()
        self.state.roll_day_if_needed()
        self._process_fills(price)

        # Guard 1: daily loss limit (hard halt).
        loss = guards.check_daily_loss(self.state.daily_pnl, self.cfg.daily_loss_limit_usd)
        if not loss.allow and not self._halted:
            self._halted = True
            self.log.error("HALT: %s", loss.reason)
            self._alert(f"Daily loss limit hit: {loss.reason}")
            self.broker.cancel_all()
        buys_allowed = loss.allow and not self._halted

        # Guard 2: breakout (block new buys, optionally flatten).
        bo = guards.check_breakout(
            price, self.cfg.band_low, self.cfg.band_high, self.cfg.breakout_guard_enabled
        )
        if not bo.allow:
            self.log.warning("BREAKOUT: %s", bo.reason)
            self._alert(f"Breakout guard: {bo.reason}")
            buys_allowed = False
            if self.cfg.breakout_flatten:
                self.log.warning("Flattening position due to breakout.")
                self.broker.cancel_all()

        self._maybe_place_buys(price, buys_allowed)
        self._maybe_place_sells()

        self._status_line(price)
        self.state.save(self.cfg.state_file)

    def _status_line(self, price: float) -> None:
        position_usd = self.broker.get_position_qty() * price
        headroom = self.cfg.daily_loss_limit_usd + self.state.daily_pnl
        self.log.info(
            "STATUS price=%.2f open_orders=%d position=$%.2f realized_pnl=$%.4f "
            "daily_pnl=$%.4f loss_headroom=$%.2f",
            price, self._open_order_count(), position_usd,
            self.state.realized_pnl, self.state.daily_pnl, headroom,
        )

    # -- main loop ----------------------------------------------------------
    def run(self, max_ticks: int | None = None) -> None:
        self.log.info(
            "Starting engine in %s mode for %s. Kill switch file: %s",
            self.cfg.mode, self.cfg.symbol, self.cfg.kill_switch_file,
        )
        ticks = 0
        try:
            while True:
                if guards.kill_switch_active(self.cfg.kill_switch_file):
                    self.log.error("KILL SWITCH active. Cancelling all orders and stopping.")
                    self._alert("Kill switch fired: cancelling all orders and stopping.")
                    self.broker.cancel_all()
                    break
                self.tick()
                ticks += 1
                if max_ticks is not None and ticks >= max_ticks:
                    self.log.info("Reached max_ticks=%d; stopping.", max_ticks)
                    break
                time.sleep(self.cfg.loop_interval_seconds)
        except KeyboardInterrupt:
            self.log.info("Interrupted by user. Saving state and exiting.")
            self.state.save(self.cfg.state_file)
