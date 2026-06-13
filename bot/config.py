"""Load and validate the bot's configuration.

This module's whole purpose is to be paranoid. It reads config.yaml and the
.env secrets, then REFUSES to continue if anything is set in a way that could
lose you money by accident. If load_config() returns without raising, you can
trust that the settings are internally consistent and safe for the chosen mode.

Three safety rules live here:
  1. Paper-by-default. Live trading needs BOTH a config flag AND an env var.
  2. Fee awareness. Profit target must clear the round-trip fee with margin.
  3. Basic sanity. Bands, sizes, and limits must be positive and ordered.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

import yaml
from dotenv import load_dotenv

# --- The two Alpaca endpoints. Paper is hardcoded as the safe default. -------
PAPER_ENDPOINT = "https://paper-api.alpaca.markets"
LIVE_ENDPOINT = "https://api.alpaca.markets"

# Name of the environment variable that acts as the real-money safety latch.
LIVE_ENV_LATCH = "I_UNDERSTAND_THIS_IS_REAL_MONEY"

# A buy + a sell is two trades, so the round-trip fee is 2x the per-side fee.
# After subtracting that from your profit target, this is the smallest net
# margin (in percent) we consider "safely positive". Below it, we refuse.
MIN_SAFE_NET_MARGIN_PERCENT = 0.2

VALID_MODES = ("dry_run", "paper", "live")
VALID_ASSET_CLASSES = ("crypto", "stock")


class ConfigError(Exception):
    """Raised when the configuration is missing, malformed, or unsafe.

    The message is written in plain language so a beginner can fix the problem
    without reading the code.
    """


@dataclass
class Config:
    """Validated, ready-to-use settings. Built only by load_config()."""

    # Mode + market
    mode: str
    asset_class: str
    symbol: str

    # Secrets (loaded from .env, never from config.yaml)
    api_key_id: str
    api_secret_key: str
    api_endpoint: str

    # Fees + grid
    fee_percent_per_side: float
    slippage_percent_per_side: float
    band_low: float
    band_high: float
    grid_levels: int
    profit_target_percent: float
    order_size_usd: float

    # Risk limits
    max_position_usd: float
    max_deployed_usd: float
    max_open_orders: int
    daily_loss_limit_usd: float

    # Breakout guard
    breakout_guard_enabled: bool
    breakout_flatten: bool

    # Timing
    loop_interval_seconds: int

    # Alerts
    alerts_enabled: bool
    alert_webhook_url: str

    # Files
    log_dir: str
    state_file: str
    kill_switch_file: str

    # Derived / informational
    warnings: list[str] = field(default_factory=list)

    @property
    def is_live(self) -> bool:
        return self.mode == "live"

    @property
    def round_trip_fee_percent(self) -> float:
        """Total fee for one buy + one sell, as a percent."""
        return self.fee_percent_per_side * 2

    @property
    def round_trip_cost_percent(self) -> float:
        """Total realistic cost per cycle: fees AND slippage, both sides."""
        return (self.fee_percent_per_side + self.slippage_percent_per_side) * 2

    @property
    def net_margin_percent(self) -> float:
        """Profit target left over after fees AND slippage, as a percent."""
        return self.profit_target_percent - self.round_trip_cost_percent


def _require(cfg: dict, key: str):
    """Fetch a required key from the YAML config or raise a clear error."""
    if key not in cfg or cfg[key] is None:
        raise ConfigError(
            f"Missing required setting '{key}' in config.yaml. "
            f"Compare your file against the version shipped with the project."
        )
    return cfg[key]


def load_config(
    config_path: str = "config.yaml",
    env_path: str = ".env",
    allow_thin_margins: bool = False,
) -> Config:
    """Read, validate, and return the configuration.

    Args:
        config_path: path to the YAML settings file.
        env_path: path to the .env secrets file.
        allow_thin_margins: deliberate override. If True, the fee-margin check
            becomes a warning instead of a hard stop. Only set this on purpose.

    Raises:
        ConfigError: if anything is missing, malformed, or unsafe.
    """
    # 1) Load secrets from .env into the environment (does nothing if missing).
    load_dotenv(env_path)

    # 2) Load the YAML settings file.
    if not os.path.exists(config_path):
        raise ConfigError(
            f"Could not find '{config_path}'. Make sure you run the bot from "
            f"the project folder that contains config.yaml."
        )
    with open(config_path, "r", encoding="utf-8") as fh:
        try:
            raw = yaml.safe_load(fh) or {}
        except yaml.YAMLError as exc:
            raise ConfigError(
                f"config.yaml is not valid YAML. Indentation matters. "
                f"Underlying error: {exc}"
            ) from exc

    warnings: list[str] = []

    # 3) Mode + market basics.
    mode = str(_require(raw, "mode")).strip().lower()
    if mode not in VALID_MODES:
        raise ConfigError(
            f"'mode' is '{mode}', but it must be one of: {', '.join(VALID_MODES)}."
        )

    asset_class = str(_require(raw, "asset_class")).strip().lower()
    if asset_class not in VALID_ASSET_CLASSES:
        raise ConfigError(
            f"'asset_class' is '{asset_class}', but it must be one of: "
            f"{', '.join(VALID_ASSET_CLASSES)}."
        )

    symbol = str(_require(raw, "symbol")).strip()
    if not symbol:
        raise ConfigError("'symbol' must not be empty (e.g. 'BTC/USD').")

    # 4) Secrets from environment.
    api_key_id = os.getenv("ALPACA_API_KEY_ID", "").strip()
    api_secret_key = os.getenv("ALPACA_API_SECRET_KEY", "").strip()
    alert_webhook_url = os.getenv("ALERT_WEBHOOK_URL", "").strip()

    # In dry_run we don't talk to Alpaca, so keys are optional there.
    if mode in ("paper", "live") and (not api_key_id or not api_secret_key):
        raise ConfigError(
            "Missing Alpaca API keys. Copy .env.example to .env and paste your "
            "ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY. (Not needed for dry_run.)"
        )

    # 5) THE LIVE-MONEY LATCH. Two independent switches must both be set.
    config_wants_live = bool(raw.get("i_really_want_live_trading", False))
    env_latch = os.getenv(LIVE_ENV_LATCH, "").strip().lower() == "true"

    if mode == "live":
        if not config_wants_live:
            raise ConfigError(
                "mode is 'live' but 'i_really_want_live_trading' is not true in "
                "config.yaml. Refusing to trade real money. Set it on purpose."
            )
        if not env_latch:
            raise ConfigError(
                f"mode is 'live' but the environment variable {LIVE_ENV_LATCH} "
                f"is not set to 'true'. Refusing to trade real money. This is a "
                f"deliberate second switch. Set {LIVE_ENV_LATCH}=true to proceed."
            )
        api_endpoint = LIVE_ENDPOINT
        warnings.append("LIVE MODE: this bot will trade REAL money.")
    else:
        # dry_run and paper always use the safe paper endpoint.
        api_endpoint = PAPER_ENDPOINT
        if config_wants_live or env_latch:
            warnings.append(
                "A live-trading latch is set, but mode is not 'live'. Staying "
                "safely on paper. Set mode: \"live\" only when you truly mean it."
            )

    # 6) Numbers: read, type-check, and range-check everything.
    fee_per_side = _as_float(raw, "fee_percent_per_side")
    # Slippage is optional (defaults to a small, conservative 0.05%). It models
    # the gap between the price you wanted and the price you got. For
    # commission-free stocks this is the main cost, so do not set it to 0.
    try:
        slippage_per_side = float(raw.get("slippage_percent_per_side", 0.05))
    except (TypeError, ValueError):
        raise ConfigError("'slippage_percent_per_side' must be a number.") from None
    band_low = _as_float(raw, "band_low")
    band_high = _as_float(raw, "band_high")
    grid_levels = _as_int(raw, "grid_levels")
    profit_target = _as_float(raw, "profit_target_percent")
    order_size_usd = _as_float(raw, "order_size_usd")

    max_position_usd = _as_float(raw, "max_position_usd")
    max_deployed_usd = _as_float(raw, "max_deployed_usd")
    max_open_orders = _as_int(raw, "max_open_orders")
    daily_loss_limit_usd = _as_float(raw, "daily_loss_limit_usd")

    loop_interval_seconds = _as_int(raw, "loop_interval_seconds")

    if fee_per_side < 0:
        raise ConfigError("'fee_percent_per_side' cannot be negative.")
    if slippage_per_side < 0:
        raise ConfigError("'slippage_percent_per_side' cannot be negative.")
    if band_low <= 0 or band_high <= 0:
        raise ConfigError("'band_low' and 'band_high' must be positive prices.")
    if band_low >= band_high:
        raise ConfigError(
            f"'band_low' ({band_low}) must be LESS than 'band_high' ({band_high})."
        )
    if grid_levels < 2:
        raise ConfigError("'grid_levels' must be at least 2.")
    if profit_target <= 0:
        raise ConfigError("'profit_target_percent' must be greater than 0.")
    if order_size_usd <= 0:
        raise ConfigError("'order_size_usd' must be greater than 0.")
    for name, value in (
        ("max_position_usd", max_position_usd),
        ("max_deployed_usd", max_deployed_usd),
        ("daily_loss_limit_usd", daily_loss_limit_usd),
    ):
        if value <= 0:
            raise ConfigError(f"'{name}' must be greater than 0.")
    if max_open_orders < 1:
        raise ConfigError("'max_open_orders' must be at least 1.")
    if loop_interval_seconds < 1:
        raise ConfigError("'loop_interval_seconds' must be at least 1.")

    # A single order must not exceed your own deployment cap.
    if order_size_usd > max_deployed_usd:
        raise ConfigError(
            f"'order_size_usd' ({order_size_usd}) is larger than "
            f"'max_deployed_usd' ({max_deployed_usd}). One order can't exceed "
            f"your total deployment limit."
        )

    # 7) COST AWARENESS. Make sure each cycle can clear fees AND slippage.
    round_trip = (fee_per_side + slippage_per_side) * 2
    net_margin = profit_target - round_trip
    if net_margin < MIN_SAFE_NET_MARGIN_PERCENT:
        message = (
            f"Profit target {profit_target:.2f}% minus round-trip fee "
            f"{round_trip:.2f}% leaves only {net_margin:.2f}% net margin, "
            f"which is below the safe floor of {MIN_SAFE_NET_MARGIN_PERCENT:.2f}%. "
            f"At this spacing you can lose money on every trade while looking busy."
        )
        if allow_thin_margins:
            warnings.append("OVERRIDE: thin fee margin accepted on purpose. " + message)
        else:
            raise ConfigError(
                message
                + " Widen 'profit_target_percent' (a sensible start is ~1.0%), "
                + "or pass allow_thin_margins=True to override on purpose."
            )

    # Booleans + file paths + timing.
    breakout_guard_enabled = bool(raw.get("breakout_guard_enabled", True))
    breakout_flatten = bool(raw.get("breakout_flatten", False))
    alerts_enabled = bool(raw.get("alerts_enabled", False))

    if alerts_enabled and not alert_webhook_url:
        warnings.append(
            "alerts_enabled is true but ALERT_WEBHOOK_URL is empty in .env. "
            "Alerts will be logged only, not sent. Add a webhook URL to enable."
        )

    log_dir = str(raw.get("log_dir", "logs"))
    state_file = str(raw.get("state_file", "state/bot_state.json"))
    kill_switch_file = str(raw.get("kill_switch_file", "KILL"))

    return Config(
        mode=mode,
        asset_class=asset_class,
        symbol=symbol,
        api_key_id=api_key_id,
        api_secret_key=api_secret_key,
        api_endpoint=api_endpoint,
        fee_percent_per_side=fee_per_side,
        slippage_percent_per_side=slippage_per_side,
        band_low=band_low,
        band_high=band_high,
        grid_levels=grid_levels,
        profit_target_percent=profit_target,
        order_size_usd=order_size_usd,
        max_position_usd=max_position_usd,
        max_deployed_usd=max_deployed_usd,
        max_open_orders=max_open_orders,
        daily_loss_limit_usd=daily_loss_limit_usd,
        breakout_guard_enabled=breakout_guard_enabled,
        breakout_flatten=breakout_flatten,
        loop_interval_seconds=loop_interval_seconds,
        alerts_enabled=alerts_enabled,
        alert_webhook_url=alert_webhook_url,
        log_dir=log_dir,
        state_file=state_file,
        kill_switch_file=kill_switch_file,
        warnings=warnings,
    )


def _as_float(cfg: dict, key: str) -> float:
    value = _require(cfg, key)
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ConfigError(f"'{key}' must be a number, got: {value!r}.") from None


def _as_int(cfg: dict, key: str) -> int:
    value = _require(cfg, key)
    try:
        # Reject floats like 6.5 that aren't whole numbers.
        as_float = float(value)
        if as_float != int(as_float):
            raise ValueError
        return int(as_float)
    except (TypeError, ValueError):
        raise ConfigError(f"'{key}' must be a whole number, got: {value!r}.") from None
