#!/usr/bin/env python3
"""
Fasting Timer Waybar Module
Queries backend API and displays current fasting state in waybar.

Installation via symlink:
  ln -s ~/Code/fasting-timer/fasting-timer-waybar/fasting-timer.py ~/.config/waybar/modules/fasting-timer.py

Configuration in waybar config:
  "custom/fasting-timer": {
    "exec": "python3 ~/.config/waybar/modules/fasting-timer.py",
    "interval": 1,
    "return-type": "json",
    "format": "{}",
    "tooltip": true,
    "on-click": "python3 ~/.config/waybar/modules/fasting-timer.py clicked"
  }

Click actions:
  - Left click: Log current session to CSV and restart timer from 0
"""

import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Backend configuration
BACKEND_URL = os.environ.get("FASTING_BACKEND_URL", "http://localhost:3001")
API_STATE = f"{BACKEND_URL}/api/state"
API_STATS = f"{BACKEND_URL}/api/stats"
API_START = f"{BACKEND_URL}/api/start"
API_END = f"{BACKEND_URL}/api/end"
API_CANCEL = f"{BACKEND_URL}/api/cancel"

DEFAULT_INTERVAL = 9000  # 2h30m in seconds


def http_get(url):
    """Make GET request to backend."""
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=2) as response:
            return json.loads(response.read().decode())
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
        return None


def http_post_json(url, data):
    """Make POST request with JSON body to backend."""
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode())
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=2) as response:
            return json.loads(response.read().decode())
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
        return None


def http_post(url):
    """Make POST request to backend (no body)."""
    try:
        req = urllib.request.Request(url, method="POST")
        with urllib.request.urlopen(req, timeout=2) as response:
            return json.loads(response.read().decode())
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
        return None


def format_time(seconds):
    """Format seconds as XhYYm or Ym or Xs."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60

    if hours > 0:
        return f"{hours}h{minutes:02d}m"
    elif minutes > 0:
        return f"{minutes}m"
    else:
        return f"{seconds}s"


def get_tooltip():
    """Get stats for tooltip."""
    stats = http_get(API_STATS)
    if not stats or stats.get("total_sessions", 0) == 0:
        return "No sessions yet"

    total = stats.get("total_sessions", 0)
    weekly = stats.get("weekly_average_minutes", 0)
    monthly = stats.get("monthly_average_minutes", 0)

    return f"Total: {total} | Weekly: {weekly}min | Monthly: {monthly}min"


def get_elapsed_from_last_log():
    """
    Calculate how many seconds have elapsed since the last logged session ended.
    Returns elapsed_since_last_log in seconds, or None if no log exists.
    """
    stats = http_get(API_STATS)
    if not stats or not stats.get("latest_data"):
        return None

    latest = stats["latest_data"]
    try:
        last_timestamp = datetime.fromisoformat(latest["timestamp"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        seconds_since_last = int((now - last_timestamp).total_seconds())
        last_session_seconds = latest.get("seconds", 0)

        # Total elapsed = time of last session + time since it ended
        return last_session_seconds + seconds_since_last
    except (KeyError, ValueError):
        return None


def build_output(elapsed, interval):
    """Build waybar JSON output based on elapsed time and interval."""
    remaining = interval - elapsed

    if elapsed >= interval:
        # Past the target — count upward, show completed emoji
        overtime = elapsed - interval
        text = f"✓ +{format_time(overtime)}"
        css_class = "completed"
    else:
        # Counting down
        text = f"🥹 {format_time(remaining)}"
        css_class = "fasting"

    return json.dumps({
        "text": text,
        "tooltip": get_tooltip(),
        "class": css_class,
    })


def handle_click():
    """Log current session to CSV, cancel it, and restart from 0."""
    state = http_get(API_STATE)

    if state and state.get("status") != "idle":
        elapsed = state.get("elapsed_seconds", 0)
        http_post_json(API_END, {"interval": elapsed})
        http_post(API_CANCEL)

    # Always restart from 0
    http_post_json(API_START, {"interval": DEFAULT_INTERVAL})

    # Output fresh state
    print(build_output(0, DEFAULT_INTERVAL))


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "clicked":
        handle_click()
        return

    state = http_get(API_STATE)

    if state and state.get("status") != "idle":
        # Active session — continue from current elapsed
        elapsed = state.get("elapsed_seconds", 0)
        interval = state.get("interval", DEFAULT_INTERVAL)
        print(build_output(elapsed, interval))
        return

    # No active session — check last log entry and resume from there
    elapsed = get_elapsed_from_last_log()

    if elapsed is None:
        # No log at all — start fresh
        http_post_json(API_START, {"interval": DEFAULT_INTERVAL})
        print(build_output(0, DEFAULT_INTERVAL))
        return

    if elapsed < DEFAULT_INTERVAL:
        # Still within the window — resume active session with remaining time
        # Start a new session but pretend it started (elapsed) seconds ago
        start_time = datetime.now(timezone.utc)
        import datetime as dt
        adjusted_start = start_time - dt.timedelta(seconds=elapsed)
        http_post_json(API_START, {
            "interval": DEFAULT_INTERVAL,
            "start": adjusted_start.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        })
        new_state = http_get(API_STATE)
        actual_elapsed = new_state.get("elapsed_seconds", elapsed) if new_state else elapsed
        print(build_output(actual_elapsed, DEFAULT_INTERVAL))
    else:
        # Past the window — show overtime, no active session needed
        print(build_output(elapsed, DEFAULT_INTERVAL))


if __name__ == "__main__":
    main()
