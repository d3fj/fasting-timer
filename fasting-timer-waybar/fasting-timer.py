#!/usr/bin/env python3
"""
Fasting Timer Waybar Module
Queries backend API and displays current fasting state in waybar.

Installation via symlink:
  ln -s ~/Code/fasting-timer/fasting-timer-waybar/fasting-timer.py ~/.config/waybar/modules/fasting-timer.py

Configuration in waybar config:
  "exec": "python3 ~/.config/waybar/modules/fasting-timer.py",
  "exec-interval": 1,
  "return": exit,
  "signal": 8,
  "tooltip": true

Click actions:
  - Left click: Toggle fasting start/end
  - If fasting: end fast + log to CSV
  - If idle: start new fast
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
    """Format seconds as HH:MM:SS."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def get_tooltip():
    """Get stats for tooltip."""
    stats = http_get(API_STATS)
    if not stats or stats.get("total_sessions", 0) == 0:
        return "No sessions yet"

    total = stats.get("total_sessions", 0)
    weekly = stats.get("weekly_average_minutes", 0)
    monthly = stats.get("monthly_average_minutes", 0)

    return f"Total: {total} | Weekly: {weekly}min | Monthly: {monthly}min"


def handle_click():
    """Handle click action: start/end toggle."""
    state = http_get(API_STATE)

    if not state or state.get("status") == "idle":
        # No active fast - start new one
        http_post_json(API_START, {"interval": 9000})  # 2h30m default
        print(json.dumps({"text": "🥹 00:00:00"}))
    else:
        # Active fast - end and log to CSV
        elapsed = state.get("elapsed_seconds", 0)
        # Log to CSV using JSON body
        http_post_json(API_END, {"interval": elapsed})
        # Cancel the fast
        http_post(API_CANCEL)
        print(json.dumps({"text": "✓ 00:00:00"}))


def main():
    # Check for click signal (waybar sends "clicked" as argument)
    if len(sys.argv) > 1 and sys.argv[1] == "clicked":
        handle_click()
        return

    # Normal mode - query state
    state = http_get(API_STATE)

    if not state or state.get("status") == "idle":
        # Not fasting - show idle state
        print(json.dumps({"text": "○", "tooltip": get_tooltip()}))
        return

    # Calculate elapsed time
    elapsed = state.get("elapsed_seconds", 0)
    interval = state.get("interval", 0)

    # Determine if we're in fasting or completed phase
    emoji = "🥹"  # Fasting (red)
    if elapsed >= interval:
        emoji = "✓"  # Completed (green)

    # Format output for waybar
    output = {
        "text": f"{emoji} {format_time(elapsed)}",
        "tooltip": get_tooltip(),
        "class": "fasting" if elapsed < interval else "completed"
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()