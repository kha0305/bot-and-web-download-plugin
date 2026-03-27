const fs = require("fs");
const path = require("path");

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, "../data/logs");
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.logFile = path.join(this.logDir, "activity.txt");
  }

  log(user, action, details = "") {
    const timestamp = new Date().toLocaleString("vi-VN");
    const userTag = user.tag || user.username;
    const userId = user.id;

    const logEntry = `[${timestamp}] [${userId}] ${userTag} | ${action.toUpperCase()} | ${details}\n`;

    // Console log for realtime monitoring
    console.log(logEntry.trim());

    // Append to file
    try {
      fs.appendFileSync(this.logFile, logEntry);
    } catch (err) {
      console.error("Failed to write log:", err);
    }
  }
}

module.exports = new Logger();
