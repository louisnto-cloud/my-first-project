"""Tests for the config loader's safety behavior.

These use a temporary config file and fake keys so we can prove the live-money
latch and the fee check directly, without touching the real .env or Alpaca.
"""

import yaml
import pytest

from bot import config as cfgmod


def _write_cfg(tmp_path, **overrides):
    base = yaml.safe_load(open("config.yaml"))
    base.update(overrides)
    path = tmp_path / "config.yaml"
    with open(path, "w") as fh:
        yaml.safe_dump(base, fh)
    return str(path)


@pytest.fixture
def fake_keys(monkeypatch):
    """Pretend valid Alpaca keys exist, and clear the live env latch."""
    monkeypatch.setenv("ALPACA_API_KEY_ID", "TESTKEYID")
    monkeypatch.setenv("ALPACA_API_SECRET_KEY", "TESTSECRET")
    monkeypatch.delenv(cfgmod.LIVE_ENV_LATCH, raising=False)


def test_default_config_loads_in_paper_mode(tmp_path, fake_keys):
    path = _write_cfg(tmp_path, mode="paper")
    cfg = cfgmod.load_config(path, env_path=str(tmp_path / "nope.env"))
    assert cfg.mode == "paper"
    assert cfg.api_endpoint == cfgmod.PAPER_ENDPOINT  # paper endpoint, always


def test_tight_margin_is_refused(tmp_path, fake_keys):
    path = _write_cfg(tmp_path, mode="paper", profit_target_percent=0.2)
    with pytest.raises(cfgmod.ConfigError):
        cfgmod.load_config(path, env_path=str(tmp_path / "nope.env"))


def test_tight_margin_can_be_overridden_on_purpose(tmp_path, fake_keys):
    path = _write_cfg(tmp_path, mode="paper", profit_target_percent=0.2)
    cfg = cfgmod.load_config(
        path, env_path=str(tmp_path / "nope.env"), allow_thin_margins=True
    )
    assert any("OVERRIDE" in w for w in cfg.warnings)


def test_live_refused_without_env_latch(tmp_path, fake_keys):
    # Config flag on, but the environment latch is NOT set -> must refuse.
    path = _write_cfg(tmp_path, mode="live", i_really_want_live_trading=True)
    with pytest.raises(cfgmod.ConfigError, match=cfgmod.LIVE_ENV_LATCH):
        cfgmod.load_config(path, env_path=str(tmp_path / "nope.env"))


def test_live_refused_without_config_flag(tmp_path, fake_keys, monkeypatch):
    # Env latch on, but the config flag is off -> must still refuse.
    monkeypatch.setenv(cfgmod.LIVE_ENV_LATCH, "true")
    path = _write_cfg(tmp_path, mode="live", i_really_want_live_trading=False)
    with pytest.raises(cfgmod.ConfigError):
        cfgmod.load_config(path, env_path=str(tmp_path / "nope.env"))


def test_live_allowed_only_with_both_latches(tmp_path, fake_keys, monkeypatch):
    monkeypatch.setenv(cfgmod.LIVE_ENV_LATCH, "true")
    path = _write_cfg(tmp_path, mode="live", i_really_want_live_trading=True)
    cfg = cfgmod.load_config(path, env_path=str(tmp_path / "nope.env"))
    assert cfg.is_live
    assert cfg.api_endpoint == cfgmod.LIVE_ENDPOINT
