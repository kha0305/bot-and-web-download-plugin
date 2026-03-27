const fs = require("fs");
const path = require("path");
const { ensureDirForFile, ensureJsonFile } = require("./DataPath");

const DATA_PATH = path.join(__dirname, "../data/userdata.json");
const BACKUP_PATH = path.join(__dirname, "../data/userdata.backup.json");

/**
 * UserDataManager - Quản lý dữ liệu người dùng
 * - Favorites: Plugin yêu thích
 * - Download History: Lịch sử tải
 * - Ratings: Đánh giá plugin
 * - Pagination State: Vị trí trang hiện tại
 */
class UserDataManager {
  constructor() {
    this.users = {};
    this._lastActiveSaveAt = 0;
    ensureJsonFile(DATA_PATH, {});
    this.load();
  }

  load() {
    ensureDirForFile(DATA_PATH);
    if (fs.existsSync(DATA_PATH)) {
      try {
        const data = fs.readFileSync(DATA_PATH, "utf8");
        this.users = JSON.parse(data);
        console.log(
          `[UserDataManager] Loaded ${
            Object.keys(this.users).length
          } user records.`
        );
      } catch (e) {
        console.error("[UserDataManager] Error loading:", e.message);
        // Try backup
        if (fs.existsSync(BACKUP_PATH)) {
          try {
            const backupData = fs.readFileSync(BACKUP_PATH, "utf8");
            this.users = JSON.parse(backupData);
            console.log("[UserDataManager] Restored from backup.");
            this.save();
          } catch (backupErr) {
            this.users = {};
          }
        }
      }
    } else {
      this.users = {};
    }
  }

  save() {
    try {
      ensureDirForFile(DATA_PATH);
      // Backup trước khi lưu
      if (fs.existsSync(DATA_PATH)) {
        fs.copyFileSync(DATA_PATH, BACKUP_PATH);
      }
      fs.writeFileSync(DATA_PATH, JSON.stringify(this.users, null, 2));
    } catch (e) {
      console.error("[UserDataManager] Save error:", e.message);
    }
  }

  // Lấy hoặc tạo user data
  getUser(userId) {
    if (!this.users[userId]) {
      this.users[userId] = {
        favorites: [], // [pluginId, ...]
        downloadHistory: [], // [{pluginId, pluginName, date}, ...]
        ratings: {}, // {pluginId: rating, ...}
        paginationState: {}, // {context: page, ...}
        lastActive: new Date().toISOString(),
      };
    }
    return this.users[userId];
  }

  // ============ FAVORITES ============
  addFavorite(userId, pluginId) {
    const user = this.getUser(userId);
    if (!user.favorites.includes(pluginId)) {
      user.favorites.push(pluginId);
      this.save();
      return true;
    }
    return false;
  }

  removeFavorite(userId, pluginId) {
    const user = this.getUser(userId);
    const index = user.favorites.indexOf(pluginId);
    if (index !== -1) {
      user.favorites.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  getFavorites(userId) {
    return this.getUser(userId).favorites;
  }

  isFavorite(userId, pluginId) {
    return this.getUser(userId).favorites.includes(pluginId);
  }

  // ============ DOWNLOAD HISTORY ============
  addDownload(userId, pluginId, pluginName) {
    const user = this.getUser(userId);
    user.downloadHistory.unshift({
      pluginId,
      pluginName,
      date: new Date().toISOString(),
    });
    // Giữ tối đa 100 bản ghi
    if (user.downloadHistory.length > 100) {
      user.downloadHistory = user.downloadHistory.slice(0, 100);
    }
    this.save();
  }

  getDownloadHistory(userId, limit = 25) {
    const user = this.getUser(userId);
    return user.downloadHistory.slice(0, limit);
  }

  getDownloadCount(userId) {
    return this.getUser(userId).downloadHistory.length;
  }

  // ============ RATINGS ============
  setRating(userId, pluginId, rating) {
    if (rating < 1 || rating > 5) return false;
    const user = this.getUser(userId);
    user.ratings[pluginId] = rating;
    this.save();
    return true;
  }

  getRating(userId, pluginId) {
    return this.getUser(userId).ratings[pluginId] || null;
  }

  // Tính rating trung bình của plugin
  getAverageRating(pluginId) {
    let sum = 0;
    let count = 0;
    for (const userId in this.users) {
      const rating = this.users[userId].ratings?.[pluginId];
      if (rating) {
        sum += rating;
        count++;
      }
    }
    return count > 0
      ? { average: (sum / count).toFixed(1), count }
      : { average: null, count: 0 };
  }

  // ============ PAGINATION STATE ============
  setPaginationState(userId, context, page) {
    const user = this.getUser(userId);
    user.paginationState[context] = page;
    // Không save ngay vì thay đổi thường xuyên
  }

  getPaginationState(userId, context) {
    const user = this.getUser(userId);
    return user.paginationState[context] || 0;
  }

  // Save pagination states (gọi định kỳ hoặc khi cần)
  savePaginationStates() {
    this.save();
  }

  // ============ STATISTICS ============
  getStats(userId) {
    const user = this.getUser(userId);
    return {
      totalDownloads: user.downloadHistory.length,
      totalFavorites: user.favorites.length,
      totalRatings: Object.keys(user.ratings).length,
      lastActive: user.lastActive,
    };
  }

  updateLastActive(userId) {
    const user = this.getUser(userId);
    user.lastActive = new Date().toISOString();

    // Persist periodically to avoid sync write on every interaction.
    const now = Date.now();
    if (now - this._lastActiveSaveAt > 30000) {
      this._lastActiveSaveAt = now;
      this.save();
    }
  }
}

module.exports = new UserDataManager();
