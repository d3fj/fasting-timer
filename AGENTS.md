# Fasting Timer - Developer Notes

## Project Structure

```
fasting-timer/
├── fasting-timer-backend/    # Node.js REST API server
├── fasting-timer@def/        # GNOME Shell extension (Shell 46-49)
├── fasting-timer-chrome-extension/  # Chrome dev/testing version
├── fasting-timer-gnome-extension/   # Legacy GNOME extension (Shell 43-44)
└── fasting-timer-log/        # Data directory (gitignored)
```

## Running the Backend

```bash
cd fasting-timer-backend
node server.js   # Starts on localhost:3001
```

Or as systemd service:
```bash
sudo systemctl start fasting-timer-backend.service
```

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Returns stats (total_sessions, weekly/monthly avg) |
| `/api/end` | POST | Log a completed fast (`{interval: seconds}`) |

Test the API:
```bash
curl http://localhost:3001/api/stats
curl -X POST "http://localhost:3001/api/end?interval=9000"
```

## Data Storage

- **Location**: `~/.local/share/fasting-timer/log.csv` (XDG-compliant)
- **Format**: `timestamp_iso,elapsed_seconds` (ISO-8601)
- **Note**: Backend creates the data directory automatically if it doesn't exist

## Development Workflow

1. Start backend first: `node server.js` (port 3001)
2. For GNOME extension: Install to `~/.local/share/gnome-shell/extensions/fasting-timer@def/`
3. For Chrome testing: Load unpacked extension from `fasting-timer-chrome-extension/`

Chrome extension mirrors GNOME logic - useful for debugging with browser devtools.

## Quick Commands

```bash
# Restart backend after editing
sudo systemctl restart fasting-timer-backend.service

# Check backend status
systemctl status fasting-timer-backend.service
```

## Relevant Documentation

- Backend install: `fasting-timer-backend/INSTALL.md`
- Chrome testing: `fasting-timer-chrome-extension/README_TESTING.md`