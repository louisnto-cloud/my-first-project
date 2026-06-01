"""Logging setup: structured, timestamped, human-readable.

Writes everything to a timestamped file in the log folder AND echoes to the
screen, so you get a permanent record of every decision, order, fill, skip,
error, and guard trigger in plain language.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime


def setup_logger(log_dir: str, mode: str) -> logging.Logger:
    """Create a logger that writes to logs/<timestamp>_<mode>.log and the screen."""
    os.makedirs(log_dir, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = os.path.join(log_dir, f"{stamp}_{mode}.log")

    logger = logging.getLogger("gridbot")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()  # avoid duplicate handlers if called twice

    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)

    console = logging.StreamHandler()
    console.setFormatter(fmt)
    logger.addHandler(console)

    logger.info("Logging started. Writing to %s", log_path)
    return logger
