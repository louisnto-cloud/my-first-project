"""Tests for the safety guards: breakout, daily loss, risk limits, kill switch."""

from bot import guards


# --- Breakout guard ---------------------------------------------------------

def test_breakout_allows_price_inside_band():
    d = guards.check_breakout(100.0, band_low=90.0, band_high=110.0)
    assert d.allow


def test_breakout_blocks_price_below_band():
    d = guards.check_breakout(80.0, band_low=90.0, band_high=110.0)
    assert not d.allow
    assert "BELOW" in d.reason


def test_breakout_blocks_price_above_band():
    d = guards.check_breakout(120.0, band_low=90.0, band_high=110.0)
    assert not d.allow
    assert "ABOVE" in d.reason


def test_breakout_can_be_disabled():
    d = guards.check_breakout(1.0, band_low=90.0, band_high=110.0, enabled=False)
    assert d.allow


# --- Daily loss limit -------------------------------------------------------

def test_daily_loss_within_limit_is_allowed():
    d = guards.check_daily_loss(daily_pnl_usd=-5.0, daily_loss_limit_usd=20.0)
    assert d.allow


def test_daily_loss_at_limit_halts():
    d = guards.check_daily_loss(daily_pnl_usd=-20.0, daily_loss_limit_usd=20.0)
    assert not d.allow


def test_daily_profit_is_always_allowed():
    d = guards.check_daily_loss(daily_pnl_usd=15.0, daily_loss_limit_usd=20.0)
    assert d.allow


# --- Risk limits on placing a buy ------------------------------------------

def _limits(**over):
    base = dict(
        position_usd=0.0,
        deployed_usd=0.0,
        open_orders=0,
        next_order_usd=30.0,
        max_position_usd=200.0,
        max_deployed_usd=200.0,
        max_open_orders=12,
    )
    base.update(over)
    return base


def test_buy_allowed_when_under_all_limits():
    assert guards.check_can_place_buy(**_limits()).allow


def test_buy_blocked_at_max_open_orders():
    d = guards.check_can_place_buy(**_limits(open_orders=12))
    assert not d.allow
    assert "max_open_orders" in d.reason


def test_buy_blocked_when_exceeding_deployed_cap():
    d = guards.check_can_place_buy(**_limits(deployed_usd=190.0, next_order_usd=30.0))
    assert not d.allow
    assert "max_deployed_usd" in d.reason


def test_buy_blocked_when_exceeding_position_cap():
    # Deployed has room, but position value would exceed its cap.
    d = guards.check_can_place_buy(
        **_limits(position_usd=190.0, deployed_usd=0.0, next_order_usd=30.0)
    )
    assert not d.allow
    assert "max_position_usd" in d.reason


# --- Kill switch ------------------------------------------------------------

def test_kill_switch_detects_file(tmp_path):
    kill = tmp_path / "KILL"
    assert not guards.kill_switch_active(str(kill))
    kill.write_text("stop")
    assert guards.kill_switch_active(str(kill))
