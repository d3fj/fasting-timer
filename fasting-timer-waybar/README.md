# Fasting Timer Waybar Module

Waybar module that displays and controls fasting state via the fasting-timer backend.

## Installation

1. Symlink the Python script to your waybar modules directory:
```bash
ln -s ~/Code/fasting-timer/fasting-timer-waybar/fasting-timer.py ~/.config/waybar/modules/fasting-timer.py
```

2. Add the module to your waybar config (`~/.config/waybar/config`):
```json
"fasting-timer": {
  "exec": "python3 ~/.config/waybar/modules/fasting-timer.py",
  "exec-interval": 1,
  "return": "exit",
  "signal": 8,
  "tooltip": true
}
```

3. Restart waybar.

## Usage

- **Display**: Shows current fasting state (○ idle, 🥹 fasting, ✓ completed)
- **Left click**: Toggle fasting start/end
- **Tooltip**: Shows statistics (total sessions, weekly/monthly averages)

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `FASTING_BACKEND_URL` | `http://localhost:3001` | Backend API URL |
| `FASTING_INTERVAL` | `9000` | Default fast duration (seconds) |

## Dependencies

- Python 3
- fasting-timer-backend running on localhost:3001

## Files

- `fasting-timer.py` - Main waybar module script