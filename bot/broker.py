"""Broker layer: how the bot places and tracks orders.

Two implementations behind one common interface:
  * SimulatedBroker - runs entirely on your machine with NO keys and NO network.
    Used for dry-run. It mimics fills locally so you can watch the strategy
    work with zero risk.
  * AlpacaBroker - the real thing, talking to Alpaca's paper or live API.

All real network calls go through with_retries() so a dropped connection
retries with exponential backoff instead of crashing. Every order carries a
client order id, so a retried request can never create two real orders.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

logger = logging.getLogger("gridbot")

# Order status strings the engine understands (kept simple on purpose).
NEW = "new"
PARTIAL = "partially_filled"
FILLED = "filled"
CANCELED = "canceled"


@dataclass
class Order:
    """A snapshot of one order, normalized across brokers."""

    client_order_id: str
    side: str            # "buy" or "sell"
    qty: float
    limit_price: float
    status: str = NEW
    filled_qty: float = 0.0


def with_retries(fn, *args, attempts: int = 4, base_delay: float = 2.0, **kwargs):
    """Call fn, retrying on any exception with exponential backoff (2s,4s,8s...).

    Raises the last exception if every attempt fails.
    """
    last_exc = None
    for attempt in range(1, attempts + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001 - we genuinely retry on anything
            last_exc = exc
            delay = base_delay * (2 ** (attempt - 1))
            logger.warning(
                "API call %s failed (attempt %d/%d): %s. Retrying in %.0fs",
                getattr(fn, "__name__", "call"), attempt, attempts, exc, delay,
            )
            if attempt < attempts:
                time.sleep(delay)
    raise last_exc


# ---------------------------------------------------------------------------
#  Simulated broker (dry-run): no keys, no network, local fills.
# ---------------------------------------------------------------------------
class SimulatedBroker:
    """A toy exchange in memory. Fills a limit buy when price <= its limit, and
    a limit sell when price >= its limit. Lets dry-run show real grid cycles.
    """

    def __init__(self, price_feed):
        # price_feed is a callable returning the next price each time it's read.
        self._price_feed = price_feed
        self._orders: dict[str, Order] = {}
        self._position_qty = 0.0
        self._last_price = None

    def get_price(self) -> float:
        self._last_price = float(self._price_feed())
        self._match_orders(self._last_price)
        return self._last_price

    def _match_orders(self, price: float) -> None:
        for order in self._orders.values():
            if order.status in (FILLED, CANCELED):
                continue
            crossed = (order.side == "buy" and price <= order.limit_price) or (
                order.side == "sell" and price >= order.limit_price
            )
            if crossed:
                order.status = FILLED
                order.filled_qty = order.qty
                self._position_qty += order.qty if order.side == "buy" else -order.qty

    def get_position_qty(self) -> float:
        return self._position_qty

    def submit_limit(self, side, qty, limit_price, client_order_id) -> Order:
        # Idempotency: never create a second order for the same client id.
        if client_order_id in self._orders:
            return self._orders[client_order_id]
        order = Order(client_order_id, side, qty, limit_price)
        self._orders[client_order_id] = order
        return order

    def get_order(self, client_order_id) -> Order | None:
        return self._orders.get(client_order_id)

    def list_open_orders(self) -> list[Order]:
        return [o for o in self._orders.values() if o.status in (NEW, PARTIAL)]

    def cancel_order(self, client_order_id) -> None:
        o = self._orders.get(client_order_id)
        if o and o.status in (NEW, PARTIAL):
            o.status = CANCELED

    def cancel_all(self) -> None:
        for o in self._orders.values():
            if o.status in (NEW, PARTIAL):
                o.status = CANCELED


# ---------------------------------------------------------------------------
#  Real Alpaca broker (paper or live).
# ---------------------------------------------------------------------------
class AlpacaBroker:
    """Thin wrapper over alpaca-py's TradingClient + data client.

    Imported lazily so dry-run works even if alpaca-py isn't installed.
    """

    def __init__(self, cfg):
        from alpaca.trading.client import TradingClient

        self.cfg = cfg
        self.symbol = cfg.symbol
        # paper=True keeps us on the paper endpoint unless mode is live.
        self._client = TradingClient(
            cfg.api_key_id, cfg.api_secret_key, paper=not cfg.is_live
        )
        self._data = self._make_data_client(cfg)

    @staticmethod
    def _make_data_client(cfg):
        if cfg.asset_class == "crypto":
            from alpaca.data.historical import CryptoHistoricalDataClient

            return CryptoHistoricalDataClient(cfg.api_key_id, cfg.api_secret_key)
        from alpaca.data.historical import StockHistoricalDataClient

        return StockHistoricalDataClient(cfg.api_key_id, cfg.api_secret_key)

    def get_price(self) -> float:
        def _fetch():
            if self.cfg.asset_class == "crypto":
                from alpaca.data.requests import CryptoLatestQuoteRequest

                req = CryptoLatestQuoteRequest(symbol_or_symbols=self.symbol)
                quote = self._data.get_crypto_latest_quote(req)[self.symbol]
            else:
                from alpaca.data.requests import StockLatestQuoteRequest

                req = StockLatestQuoteRequest(symbol_or_symbols=self.symbol)
                quote = self._data.get_stock_latest_quote(req)[self.symbol]
            # Mid price between bid and ask.
            return (quote.bid_price + quote.ask_price) / 2.0

        return float(with_retries(_fetch))

    def get_position_qty(self) -> float:
        def _fetch():
            try:
                pos = self._client.get_open_position(self.symbol.replace("/", ""))
                return float(pos.qty)
            except Exception:
                return 0.0  # no position is a normal, non-error state

        return float(with_retries(_fetch))

    def submit_limit(self, side, qty, limit_price, client_order_id) -> Order:
        from alpaca.trading.enums import OrderSide, TimeInForce
        from alpaca.trading.requests import LimitOrderRequest

        def _submit():
            req = LimitOrderRequest(
                symbol=self.symbol,
                qty=round(qty, 9),
                side=OrderSide.BUY if side == "buy" else OrderSide.SELL,
                time_in_force=TimeInForce.GTC,
                limit_price=round(limit_price, 2),
                client_order_id=client_order_id,  # idempotency key
            )
            o = self._client.submit_order(req)
            return Order(
                client_order_id=client_order_id,
                side=side,
                qty=qty,
                limit_price=limit_price,
                status=str(o.status).lower(),
                filled_qty=float(o.filled_qty or 0),
            )

        return with_retries(_submit)

    def get_order(self, client_order_id) -> Order | None:
        def _fetch():
            try:
                o = self._client.get_order_by_client_id(client_order_id)
            except Exception:
                return None
            return Order(
                client_order_id=client_order_id,
                side=str(o.side).lower(),
                qty=float(o.qty),
                limit_price=float(o.limit_price or 0),
                status=str(o.status).lower(),
                filled_qty=float(o.filled_qty or 0),
            )

        return with_retries(_fetch)

    def list_open_orders(self) -> list[Order]:
        def _fetch():
            from alpaca.trading.requests import GetOrdersRequest
            from alpaca.trading.enums import QueryOrderStatus

            req = GetOrdersRequest(status=QueryOrderStatus.OPEN)
            out = []
            for o in self._client.get_orders(req):
                out.append(
                    Order(
                        client_order_id=o.client_order_id,
                        side=str(o.side).lower(),
                        qty=float(o.qty),
                        limit_price=float(o.limit_price or 0),
                        status=str(o.status).lower(),
                        filled_qty=float(o.filled_qty or 0),
                    )
                )
            return out

        return with_retries(_fetch)

    def cancel_order(self, client_order_id) -> None:
        o = self.get_order(client_order_id)
        if o is None:
            return

        def _cancel():
            real = self._client.get_order_by_client_id(client_order_id)
            self._client.cancel_order_by_id(real.id)

        with_retries(_cancel)

    def cancel_all(self) -> None:
        with_retries(self._client.cancel_orders)
