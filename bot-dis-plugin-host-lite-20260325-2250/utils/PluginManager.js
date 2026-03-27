const fs = require("fs");
const path = require("path");
const { ensureDirForFile, ensureJsonFile } = require("./DataPath");

const DB_PATH = path.join(__dirname, "../data/plugins.json");
const BACKUP_PATH = path.join(__dirname, "../data/plugins.backup.json");

class PluginManager {
  constructor() {
    this.plugins = [];
    ensureJsonFile(DB_PATH, []);
    this.load();
  }

  load() {
    ensureDirForFile(DB_PATH);
    if (fs.existsSync(DB_PATH)) {
      try {
        const data = fs.readFileSync(DB_PATH, "utf8");
        const parsed = JSON.parse(data);

        // Validate that it's an array
        if (!Array.isArray(parsed)) {
          throw new Error("Database is not an array");
        }

        this.plugins = parsed;
        console.log(
          `[PluginManager] Loaded ${this.plugins.length} plugins from DB.`
        );
      } catch (e) {
        console.error("[PluginManager] Error loading DB:", e.message);

        // Try to restore from backup
        if (fs.existsSync(BACKUP_PATH)) {
          try {
            console.log("[PluginManager] Attempting to restore from backup...");
            const backupData = fs.readFileSync(BACKUP_PATH, "utf8");
            const parsedBackup = JSON.parse(backupData);
            if (!Array.isArray(parsedBackup)) {
              throw new Error("Backup database is not an array");
            }
            this.plugins = parsedBackup;
            console.log(
              `[PluginManager] Restored ${this.plugins.length} plugins from backup.`
            );
            // Save the restored data
            this.save();
          } catch (backupErr) {
            console.error(
              "[PluginManager] Backup also corrupted:",
              backupErr.message
            );
            this.plugins = [];
          }
        } else {
          this.plugins = [];
        }
      }
    } else {
      this.plugins = [];
    }
  }

  save() {
    try {
      ensureDirForFile(DB_PATH);

      // Create backup before saving
      if (fs.existsSync(DB_PATH)) {
        try {
          fs.copyFileSync(DB_PATH, BACKUP_PATH);
        } catch (backupErr) {
          console.warn(
            "[PluginManager] Could not create backup:",
            backupErr.message
          );
        }
      }

      fs.writeFileSync(DB_PATH, JSON.stringify(this.plugins, null, 2));
      console.log("[PluginManager] Database saved.");
    } catch (e) {
      console.error("[PluginManager] Error saving DB:", e);
    }
  }

  getAll() {
    return this.plugins;
  }

  getById(id) {
    return this.plugins.find((p) => p.id === id);
  }

  delete(id) {
    const index = this.plugins.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.plugins.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  add(plugin) {
    this.plugins.push(plugin);
    this.save();
  }

  // Dùng cho scan để update hàng loạt
  setAll(newPlugins) {
    this.plugins = newPlugins;
    this.save();
  }
}

module.exports = new PluginManager();
