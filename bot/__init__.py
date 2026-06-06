"""Grid trading bot package.

Each module here does one job:
  config.py        - load + validate settings (refuses unsafe configs)
  fees.py          - fee and breakeven math
  grid.py          - calculate the buy/sell price levels
  guards.py        - safety guards: breakout, risk limits, kill switch
  broker.py        - all Alpaca API calls (retries, timeouts, idempotency)
  state.py         - save/reload state; reconcile with Alpaca on restart
  alerts.py        - optional webhook notifications
  logging_setup.py - structured, human-readable logging
  engine.py        - the main loop tying it all together
"""

__version__ = "0.1.0"
