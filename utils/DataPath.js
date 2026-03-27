const fs = require("fs");
const path = require("path");

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureJsonFile(filePath, defaultValue) {
  ensureDirForFile(filePath);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

module.exports = {
  ensureDirForFile,
  ensureJsonFile,
};
