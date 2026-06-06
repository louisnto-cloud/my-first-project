"""Fee and breakeven math.

Alpaca charges a fee on BOTH the buy and the sell. So a full cycle
(buy then sell) pays the fee twice. These functions answer the only
question that matters: after fees, did this trade actually make money?

All percents are passed as human numbers, e.g. 0.25 means 0.25 percent,
not 0.0025. Internally we convert to a fraction once.
"""

from __future__ import annotations


def round_trip_fee_percent(fee_percent_per_side: float) -> float:
    """Total fee for one buy + one sell, as a percent.

    Example: 0.25 per side -> 0.50 round trip.
    """
    return fee_percent_per_side * 2.0


def breakeven_sell_price(buy_price: float, fee_percent_per_side: float) -> float:
    """The lowest sell price that exactly covers both fees (zero profit).

    You pay the fee buying (so your real cost is a bit above buy_price) and
    again selling (so your real proceeds are a bit below sell_price). Solving
    "proceeds == cost" gives:  sell = buy * (1 + f) / (1 - f).
    Sell ABOVE this to make a profit; below it you lose money.
    """
    if buy_price <= 0:
        raise ValueError("buy_price must be positive")
    f = fee_percent_per_side / 100.0
    if f >= 1.0:
        raise ValueError("fee per side of 100% or more makes no sense")
    return buy_price * (1.0 + f) / (1.0 - f)


def net_profit(
    buy_price: float,
    sell_price: float,
    quantity: float,
    fee_percent_per_side: float,
) -> float:
    """Dollars of profit (or loss) after fees for buying then selling quantity.

    Negative result means the trade lost money once fees are counted.
    """
    if quantity < 0:
        raise ValueError("quantity cannot be negative")
    f = fee_percent_per_side / 100.0
    buy_cost = buy_price * quantity * (1.0 + f)        # what leaves your wallet
    sell_proceeds = sell_price * quantity * (1.0 - f)  # what comes back
    return sell_proceeds - buy_cost


def net_margin_percent(
    buy_price: float,
    sell_price: float,
    fee_percent_per_side: float,
) -> float:
    """Profit after fees as a percent of the buy price (quantity-independent).

    This is the clean per-unit measure of "how good is this buy/sell pair".
    """
    if buy_price <= 0:
        raise ValueError("buy_price must be positive")
    f = fee_percent_per_side / 100.0
    per_unit = sell_price * (1.0 - f) - buy_price * (1.0 + f)
    return per_unit / buy_price * 100.0


def clears_fees(
    buy_price: float,
    sell_price: float,
    fee_percent_per_side: float,
    min_net_margin_percent: float = 0.0,
) -> bool:
    """True if selling at sell_price beats fees by at least the required margin.

    Use min_net_margin_percent > 0 to demand a safety cushion above breakeven.
    """
    return net_margin_percent(buy_price, sell_price, fee_percent_per_side) >= min_net_margin_percent
