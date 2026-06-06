"""Engine-level tests for the fixed safety behaviors.

We drive the real GridEngine with a SimulatedBroker fed a scripted price
sequence (one price consumed per tick), so the scenarios are deterministic.
"""

import logging

import yaml
import pytest

from bot.config import load_config
from bot.broker import SimulatedBroker
from bot.grid import build_grid
from bot.state import build_initial_state, EMPTY, HOLDING, SELL_OPEN
from bot.engine import GridEngine


def _quiet_logger():
    lg = logging.getLogger("gridbot.test")
    lg.addHandler(logging.NullHandler())
    return lg


def _make_cfg(tmp_path, monkeypatch, **overrides):
    monkeypatch.setenv("ALPACA_API_KEY_ID", "X")
    monkeypatch.setenv("ALPACA_API_SECRET_KEY", "Y")
    base = yaml.safe_load(open("config.yaml"))
    base.update(
        dict(
            mode="paper",  # paper so engine treats fills as real; broker is simulated
            band_low=100.0,
            band_high=200.0,
            grid_levels=2,         # rungs at exactly 100 and 200
            profit_target_percent=200.0,  # sell target far away so it won't pre-fill
            order_size_usd=100.0,
            max_position_usd=1000.0,
            max_deployed_usd=1000.0,
            daily_loss_limit_usd=10.0,
            state_file=str(tmp_path / "state.json"),
        )
    )
    base.update(overrides)
    path = tmp_path / "config.yaml"
    yaml.safe_dump(base, open(path, "w"))
    return load_config(str(path), env_path=str(tmp_path / "no.env"))


def _run(cfg, prices):
    it = iter(prices)
    broker = SimulatedBroker(lambda: next(it))
    grid = build_grid(cfg.band_low, cfg.band_high, cfg.grid_levels, cfg.profit_target_percent)
    state = build_initial_state(cfg.symbol, grid)
    engine = GridEngine(cfg, broker, _quiet_logger(), state)
    for _ in prices:
        engine.tick()
    return engine, broker, state


def test_unrealized_loss_trips_daily_halt(tmp_path, monkeypatch):
    # Buy at 200, then price falls to 150 -> a big unrealized loss that the OLD
    # code would have ignored. It must now trip the halt.
    cfg = _make_cfg(tmp_path, monkeypatch, breakout_guard_enabled=False)
    engine, broker, state = _run(cfg, [205.0, 200.0, 150.0])
    assert engine._halted is True


def test_breakout_flatten_actually_sells_to_cash(tmp_path, monkeypatch):
    # Buy at 100, then price rockets to 250 (above the band). With flatten on,
    # the position must be SOLD (booked) and every level returned to EMPTY.
    cfg = _make_cfg(
        tmp_path, monkeypatch, breakout_guard_enabled=True, breakout_flatten=True
    )
    engine, broker, state = _run(cfg, [150.0, 100.0, 250.0])
    assert broker.get_position_qty() == pytest.approx(0.0)
    assert all(l.status == EMPTY for l in state.levels)
    assert state.realized_pnl > 0  # we sold higher than we bought


def test_breakout_without_flatten_holds_but_stops_buying(tmp_path, monkeypatch):
    # Same path, flatten OFF: we keep the inventory (still HOLDING/SELL_OPEN)
    # but place no new buys. Position must remain non-zero.
    cfg = _make_cfg(
        tmp_path, monkeypatch, breakout_guard_enabled=True, breakout_flatten=False
    )
    engine, broker, state = _run(cfg, [150.0, 100.0, 250.0])
    assert broker.get_position_qty() > 0
    assert any(l.status in (HOLDING, SELL_OPEN) for l in state.levels)
