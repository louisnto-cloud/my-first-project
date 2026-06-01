#!/usr/bin/env python3
"""Launch the grid bot.

Usage:
    python run_bot.py                # uses config.yaml as-is
    python run_bot.py --ticks 20     # run only 20 loops then stop (handy for dry-run)

The MODE comes from config.yaml:
    dry_run -> local simulator, no keys, no network, zero risk
    paper   -> real Alpaca paper account (fake money, real prices)
    live    -> real money (requires both safety latches; see README)
"""

from __future__ import annotations

import argparse
import math

from bot.config import load_config, ConfigError
from bot.logging_setup import setup_logger
from bot.grid import build_grid
from bot.state import GridState, build_initial_state, reconcile_with_broker
from bot.engine import GridEngine
from bot.broker import SimulatedBroker, AlpacaBroker


def _simulated_price_feed(cfg):
    """A gentle sine wave that sweeps through the band, so dry-run shows cycles.

    It dips below band_low and rises above band_high occasionally so you can
    even watch the breakout guard fire. Purely local; nothing is sent anywhere.
    """
    mid = (cfg.band_low + cfg.band_high) / 2.0
    half = (cfg.band_high - cfg.band_low) / 2.0 * 1.15  # 1.15 -> occasional breakout
    step = {"t": 0}

    def feed():
        price = mid + half * math.sin(step["t"] / 6.0)
        step["t"] += 1
        return price

    return feed


def build_broker(cfg, logger):
    if cfg.mode == "dry_run":
        logger.info("DRY RUN: using local simulator. No orders are sent anywhere.")
        return SimulatedBroker(_simulated_price_feed(cfg))
    logger.info("Connecting to Alpaca (%s endpoint).", cfg.api_endpoint)
    return AlpacaBroker(cfg)


def main():
    parser = argparse.ArgumentParser(description="Grid trading bot")
    parser.add_argument("--ticks", type=int, default=None, help="stop after N loops")
    parser.add_argument("--config", default="config.yaml")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
    except ConfigError as exc:
        raise SystemExit(f"\nConfiguration refused (this is the safety net working):\n  {exc}\n")

    logger = setup_logger(cfg.log_dir, cfg.mode)
    for w in cfg.warnings:
        logger.warning("CONFIG: %s", w)

    grid = build_grid(cfg.band_low, cfg.band_high, cfg.grid_levels, cfg.profit_target_percent)
    logger.info(
        "Grid: %d levels from %.2f to %.2f, target %.2f%% per cycle (round-trip fee %.2f%%).",
        cfg.grid_levels, cfg.band_low, cfg.band_high,
        cfg.profit_target_percent, cfg.round_trip_fee_percent,
    )

    broker = build_broker(cfg, logger)

    # Load saved state and reconcile, or start fresh. Dry-run always starts
    # fresh: its simulator is in-memory only, so resuming old orders is wrong.
    saved = None if cfg.mode == "dry_run" else GridState.load(cfg.state_file)
    if saved and saved.symbol == cfg.symbol and len(saved.levels) == cfg.grid_levels:
        logger.info("Resuming from saved state at %s.", cfg.state_file)
        state = saved
        if cfg.mode != "dry_run":
            reconcile_with_broker(state, broker, logger)
    else:
        if saved:
            logger.info("Saved state doesn't match current config; starting fresh.")
        state = build_initial_state(cfg.symbol, grid)

    engine = GridEngine(cfg, broker, logger, state)
    engine.run(max_ticks=args.ticks)


if __name__ == "__main__":
    main()
