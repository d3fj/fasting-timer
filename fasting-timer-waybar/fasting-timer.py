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
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Backend configuration
BACKEND_URL = os.environ.get("FASTING_BACKEND_URL", "http://localhost:3001")
API_STATE  = f"{BACKEND_URL}/api/state"
API_STATS  = f"{BACKEND_URL}/api/stats"
API_START  = f"{BACKEND_URL}/api/start"
API_END    = f"{BACKEND_URL}/api/end"
API_CANCEL = f"{BACKEND_URL}/api/cancel"

DEFAULT_INTERVAL = 10800  # 3h00m in seconds


def http_get(url):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=2) as response:
            return json.loads(response.read().decode())
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
        return None


def http_post_json(url, data):
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode())
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=2) as response:
            return json.loads(response.read().decode())
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
        return None


def http_post(url):
    try:
        req = urllib.request.Request(url, method="POST")
        with urllib.request.urlopen(req, timeout=2) as response:
            return json.loads(response.read().decode())
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
        return None


def format_time(seconds):
    """Format seconds as XhYYm, Ym or Xs."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h{minutes:02d}m"
    elif minutes > 0:
        return f"{minutes}m"
    else:
        return f"{seconds}s"


def get_tooltip():
    stats = http_get(API_STATS)
    if not stats or stats.get("total_sessions", 0) == 0:
        return "No sessions yet"
    total   = stats.get("total_sessions", 0)
    weekly_minutes  = stats.get("weekly_average_minutes") or 0
    monthly_minutes = stats.get("monthly_average_minutes") or 0

    weekly = format_time(int(weekly_minutes * 60))
    monthly = format_time(int(monthly_minutes * 60))

    return f"Total: {total} | Weekly: {weekly} | Monthly: {monthly}"


def get_elapsed_from_last_log():
    """
    Returns how many seconds have passed since the last session ended.
    = last session's elapsed_seconds + seconds since that timestamp.
    Returns None if no log exists.
    """
    stats = http_get(API_STATS)
    if not stats or not stats.get("latest_data"):
        return None

    latest = stats["latest_data"]
    try:
        last_ts = datetime.fromisoformat(latest["timestamp"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        seconds_since_end = int((now - last_ts).total_seconds())
        last_session_seconds = latest.get("seconds", 0)
        return last_session_seconds + seconds_since_end
    except (KeyError, ValueError):
        return None


def build_output(elapsed, interval):
    """Build waybar JSON output."""
    if elapsed >= interval:
        overtime = elapsed - interval
        text      = f"✓ +{format_time(overtime)}"
        css_class = "completed"
    else:
        remaining = interval - elapsed
        text      = f"🥹 {format_time(remaining)}"
        css_class = "fasting"

    return json.dumps({
        "text":    text,
        "tooltip": get_tooltip(),
        "class":   css_class,
    })


def handle_click():
    """Log current session to CSV, cancel it, and restart from 0."""
    state = http_get(API_STATE)

    if state and state.get("status") != "idle":
        elapsed = state.get("elapsed_seconds", 0)
        http_post_json(API_END, {"interval": elapsed})
        http_post(API_CANCEL)
    else:
        # No active session — log the display time so CSV stays consistent
        elapsed_log = get_elapsed_from_last_log()
        if elapsed_log is not None:
            http_post_json(API_END, {"interval": elapsed_log})

    # Start fresh session from 0
    http_post_json(API_START, {"interval": DEFAULT_INTERVAL})
    print(build_output(0, DEFAULT_INTERVAL))


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "clicked":
        handle_click()
        return

    state = http_get(API_STATE)

    if state and state.get("status") != "idle":
        # Active session — show live countdown
        elapsed  = state.get("elapsed_seconds", 0)
        interval = state.get("interval", DEFAULT_INTERVAL)
        print(build_output(elapsed, interval))
        return

    # No active session — calculate from last log entry, display only
    elapsed = get_elapsed_from_last_log()

    if elapsed is None:
        # No log at all — start fresh automatically
        http_post_json(API_START, {"interval": DEFAULT_INTERVAL})
        print(build_output(0, DEFAULT_INTERVAL))
        return

    # Show time based on log without touching backend state
    print(build_output(elapsed, DEFAULT_INTERVAL))


if __name__ == "__main__":
    main()
