// fasting-timer backend API Server - RESTful stateless API with CSV persistence layer
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { homedir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use XDG-compliant data directory (portable across users/systems)
const PRIMARY_DATA_DIR = process.env.XDG_DATA_HOME
  ? join(process.env.XDG_DATA_HOME, "fasting-timer")
  : join(homedir(), ".local", "share", "fasting-timer");
const PRIMARY_CSV_PATH = join(PRIMARY_DATA_DIR, "log.csv");

// Default configuration - can be overridden via query params
const DEFAULT_PORT = 3001;
const HOSTNAME = "localhost";
const DEFAULT_DURATION_SECONDS = 9000;

// Ensure primary data directory exists
if (!fs.existsSync(PRIMARY_DATA_DIR)) {
  try {
    fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
    console.log(`📁 Created primary data directory: ${PRIMARY_DATA_DIR}`);
  } catch (err) {
    throw new Error(`Cannot create data directory: ${PRIMARY_DATA_DIR}`);
  }
}

// CSV helpers
const DATA_COLUMNS = ["timestamp_iso", "elapsed_seconds"];

function parseCSVLine(line) {
  if (!line || !line.trim()) return null;

  // Skip header lines or lines that look like headers with 'timestamp_iso=' pattern
  const trimmedLine = line.trim();
  if (trimmedLine === DATA_COLUMNS.join(", ")) return null;
  if (
    trimmedLine.startsWith("timestamp_iso=") ||
    trimmedLine.includes("timestamp_iso=")
  )
    return null;

  // Split by comma and validate we have at least timestamp and seconds
  const parts = line.split(",");
  if (parts.length < 2) return null;

  try {
    const timestampStr = parts[0].trim();
    const elapsedStr = parts[1].trim().replace(/^"|"$/g, "");

    // Validate ISO-8601 timestamp format (YYYY-MM-DDTHH:mm:ss.SSS)
    if (!timestampStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)) {
      console.log(`Invalid timestamp, skipping: ${line}`);
      return null;
    }

    const timestamp = new Date(timestampStr);
    const elapsedSeconds = parseInt(elapsedStr) || 0;

    if (isNaN(timestamp.getTime()) || elapsedSeconds < 0) {
      console.log(`Invalid data, skipping: ${line}`);
      return null;
    }

    return {
      timestamp,
      elapsed_seconds: elapsedSeconds,
    };
  } catch (_) {
    console.log(`Error parsing line: ${line}`);
    return null;
  }
}

function serializeCSVRow(timestamp, elapsedSeconds) {
  const timestampString =
    timestamp instanceof Date
      ? timestamp.toISOString()
      : new Date().toISOString();
  return `${timestampString},${elapsedSeconds}`;
}

// Append click/timer data to CSV file (used by /api/end endpoint)
function appendClick(elapsedSeconds, timestamp = new Date()) {
  try {
    let currentContent = "";
    if (!fs.existsSync(PRIMARY_CSV_PATH)) {
      throw new Error(`File not exists: ${PRIMARY_CSV_PATH}`);
    }

    currentContent = fs.readFileSync(PRIMARY_CSV_PATH, "utf-8");

    const lines = currentContent.split("\n");
    if (!lines.some((line) => line.includes("timestamp_iso="))) {
      lines.unshift("timestamp_iso,elapsed_seconds");
    } else {
      // Remove any existing headers
      lines.splice(0, 1);
    }

    const newRow = serializeCSVRow(timestamp, elapsedSeconds);
    const updatedContent =
      [...lines.filter((l) => l.trim()), newRow].join("\n") + "\n";

    fs.writeFileSync(PRIMARY_CSV_PATH, updatedContent, "utf-8");
    return true;
  } catch (error) {
    console.error("CSV append error:", error.message);
    return false;
  }
}

// Read all CSV data from primary location (GNOME Shell extension user directory)
function readAllData() {
  const csvPath = PRIMARY_DATA_DIR + "/log.csv";

  if (!fs.existsSync(csvPath)) return [];

  try {
    const content = fs.readFileSync(csvPath, "utf-8");
    // Only process lines that look like actual data (not header/comments)
    const lines = content.split("\n").filter(
      (line) =>
        line.trim() &&
        !line.startsWith("#") && // Exclude comments
        !DATA_COLUMNS.includes(line.slice(0, 2)), // Skip header: "ti" from timestamp_iso or any other field names starting with same chars
    );

    const data = lines.map(parseCSVLine).filter(Boolean);
    console.log(`📊 Loaded ${data.length} valid sessions from fasting-timer CSV`);
    return data;
  } catch (error) {
    console.error("CSV read error:", error.message);
    return [];
  }
}

// Calculate statistics for rolling windows
function calculateRollingAverage(windowType, data) {
  try {
    if (!data || !data.length) return undefined;

    const now = new Date();

    let cutoffTime;

    if (windowType === "week") {
      // GNOME uses: midnight of today - 7 days (go back exactly 7 * 24h from current)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      cutoffTime = oneWeekAgo.getTime();
    } else if (windowType === "month") {
      // GNOME uses: midnight of first day of CURRENT month window from today back ~30 days
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth());
      cutoffTime = firstDayThisMonth.getTime();
    }

    const windowData = data.filter((row) => {
      return row.timestamp.getTime() >= cutoffTime;
    });

    if (!windowData || !windowData.length) return undefined;
    const totalSeconds = windowData.reduce(
      (acc, row) => acc + (row.elapsed_seconds || 0),
      0,
    );

    // Return the average even for partial time periods
    const daysInWindow = Math.max(
      1,
      (new Date().getTime() - cutoffTime) / (24 * 60 * 60 * 1000) + 1,
    );
    return {
      totalSeconds,
      count: windowData.length,
      averageMinutes: Math.round(totalSeconds / windowData.length) / 60,
      daysInWindow,
    };
  } catch (error) {
    console.error(
      "[calculateRollingAverage] Error in",
      windowType,
      "calculation:",
      error.message,
    );
    return undefined;
  }
}

// Helper for max function since JS doesn't have built-in min/max
function max(a, b) {
  return a > b ? a : b;
}

// Calculate statistics
function getStats(sinceDate) {
  let data = readAllData();

  if (sinceDate) {
    try {
      // CRITICAL FIX: Parse 'since' date as UTC to avoid timezone offset comparison issues
      const filterDate = new Date(sinceDate + "T00:00:00.000Z");

      // Convert all row timestamps to numeric millisecond values for comparison
      data = data.filter((row) => {
        try {
          const rowTimestampMs = row.timestamp.getTime();
          const filterTimestampMs = filterDate.getTime();
          return rowTimestampMs >= filterTimestampMs;
        } catch (e) {
          return false;
        }
      });
    } catch (err) {
      console.error("Invalid sinceDate in stats:", err.message);
      return null;
    }
  }

  // If no data exists, return empty object with minimal defaults
  if (!data || !data.length) {
    console.log(
      "⚠️ No sessions found in CSV. Make sure fasting-timer service is running.",
    );
    return null;
  }

  const totalSessions = data.length;
  const averageMinutes =
    Math.round(
      data.reduce((acc, row) => acc + row.elapsed_seconds, 0) / totalSessions,
    ) / 60 || null;

  // Rolling window calculations (7 days and 30 days from CURRENT TIME)
  const now = new Date();
  const cutoffWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const firstDayMonth = new Date(now.getFullYear(), now.getMonth());

  // Filter data for last 7 days
  const weeklyData = data.filter(
    (row) => row.timestamp.getTime() >= cutoffWeek.getTime(),
  );

  // Filter data for current month
  const monthlyData = data.filter((row) => {
    const d = new Date(row.timestamp);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });

  // Calculate rolling averages
  let weeklyAverageMinutes = null,
    monthlyAverageMinutes = null;

  if (weeklyData && weeklyData.length > 0) {
    const totalWeekSeconds = weeklyData.reduce(
      (acc, row) => acc + row.elapsed_seconds,
      0,
    );
    weeklyAverageMinutes =
      Math.round(totalWeekSeconds / weeklyData.length) / 60;
  }

  if (monthlyData && monthlyData.length > 0) {
    const totalMonthSeconds = monthlyData.reduce(
      (acc, row) => acc + row.elapsed_seconds,
      0,
    );
    monthlyAverageMinutes =
      Math.round(totalMonthSeconds / monthlyData.length) / 60;
  }

  // ✅ NUEVO CAMPO: duration_minutes para la extensión GNOME
  const duration_minutes = Math.round(DEFAULT_DURATION_SECONDS / 60);

  return {
    duration_minutes: duration_minutes, // ✅ Campo requerido por la extensión
    total_sessions: totalSessions,
    average_session_minutes: averageMinutes,
    weekly_average_minutes: weeklyAverageMinutes,
    monthly_average_minutes: monthlyAverageMinutes,
    latest_data:
      data.length > 0
        ? {
            timestamp: data[data.length - 1].timestamp.toISOString(),
            seconds: data[data.length - 1].elapsed_seconds,
          }
        : null,
  };
}

// Process endpoint click (log to CSV and respond with acknowledgment)
function endClick(data) {
  try {
    const elapsedSeconds = data.interval || 0;

    // Use timestamp from incoming data if provided, otherwise use current time
    let timestampStr = data.timestamp || new Date().toISOString();

    // Validate ISO-8601 format
    if (!timestampStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)) {
      console.warn("Invalid timestamp in end click, using current time");
      timestampStr = new Date().toISOString();
    }

    // Parse and validate the timestamp
    const timestampDate = new Date(timestampStr);
    if (isNaN(timestampDate.getTime())) {
      console.warn("Unparseable timestamp, using current time");
      timestampStr = new Date().toISOString();
    }

    // Append click to CSV with elapsed seconds and received timestamp
    appendClick(elapsedSeconds, new Date(timestampStr));

    console.log(
      `✅ Click logged: ${elapsedSeconds}s since start (${timestampStr})`,
    );
    return {
      success: true,
      message: "End action acknowledged",
      elapsed_seconds: elapsedSeconds,
      timestamp: timestampStr,
    };
  } catch (error) {
    console.error("[endClick] Error:", error.message);
    return { success: false, message: error.message };
  }
}

// HTTP server handler - supports both /api/stats and /api/end endpoints
import http from "http";
const server = http.createServer(async (req, res) => {
  // Parse endpoint using URL API (más robusto que split manual)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const endpoint = url.pathname.split("/").filter(Boolean).pop();

  if (endpoint === "stats") {
    // GET /api/stats - return statistics object
    try {
      const stats = getStats();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error(`Error in /api/stats:`, error.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (endpoint === "end") {
    // POST /api/end - process timed click event
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const elapsedSeconds = payload.interval || 0;

        // Use timestamp from incoming request if provided, otherwise use current time
        let timestampStr = payload.timestamp || new Date().toISOString();

        // Validate and parse timestamp if provided
        if (
          timestampStr &&
          !timestampStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
        ) {
          console.warn(
            "Invalid timestamp in POST /api/end, using current time",
          );
          timestampStr = new Date().toISOString();
        } else if (timestampStr) {
          const timestampDate = new Date(timestampStr);
          if (isNaN(timestampDate.getTime())) {
            console.warn("Unparseable timestamp, using current time");
            timestampStr = new Date().toISOString();
          } else {
            timestampStr = timestampDate.toISOString();
          }
        }

        // Append click to CSV with elapsed seconds and received timestamp
        appendClick(elapsedSeconds, new Date(timestampStr));

        console.log(
          `✅ Click logged: ${elapsedSeconds}s elapsed at ${timestampStr}`,
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify(
            {
              success: true,
              message: "End action acknowledged",
              elapsed_seconds: elapsedSeconds,
              timestamp: timestampStr,
            },
            null,
            2,
          ),
        );
      } catch (error) {
        console.error("[/api/end] Error processing click:", error.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    // Unknown endpoint or invalid method
    res.writeHead(404);
    res.end("Not Found");
  }
});

// Start listening to requests
server.listen(DEFAULT_PORT, HOSTNAME, () => {
  console.log(
    `🚀 Listening backend API server on http://${HOSTNAME}:${DEFAULT_PORT}`,
  );

  // Keep process alive until SIGINT/SIGTERM
  process.stdin.setEncoding("utf8");

  process.stdin.resume();
  process.stdin.on("data", (chunk) => {
    if (chunk === "q\n" || chunk === "quit\n") {
      console.log("\n🛑 Stopping server...");
      server.close(() => process.exit(0));
    }
  });
});

// Graceful shutdown handlers
process.on("SIGINT", () => {
  console.log("\n🛑 Server received SIGINT, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Server received SIGTERM, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

server.on("error", (err) => {
  console.error(`Error listening on socket:`, err.message);
  if (err.code === "EADDRINUSE") {
    console.error("Possible that port is already occupied by another server");
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

console.log(
  `✅ Server ready to serve stats and clicks on ports /api/stats and /api/end`,
);
