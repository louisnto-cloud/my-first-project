"""Optional alerting via a simple webhook (Discord, Slack, ntfy, phone push...).

Alerts are best-effort: if sending fails, we log the failure but never crash
the bot over a missed notification. Alerts are off unless enabled in config
AND a webhook URL is present in .env.
"""

from __future__ import annotations

import logging

import requests

logger = logging.getLogger("gridbot")


def send_alert(enabled: bool, webhook_url: str, message: str) -> None:
    """Send a one-line alert to the configured webhook, if enabled.

    Posts a JSON body of {"text": message, "content": message} which covers the
    common formats used by Slack ("text") and Discord ("content").
    """
    if not enabled or not webhook_url:
        logger.info("ALERT (not sent, alerts disabled): %s", message)
        return
    try:
        requests.post(
            webhook_url,
            json={"text": message, "content": message},
            timeout=10,
        )
        logger.info("ALERT sent: %s", message)
    except Exception as exc:  # never let a failed alert take down the bot
        logger.warning("ALERT failed to send (%s): %s", exc, message)
