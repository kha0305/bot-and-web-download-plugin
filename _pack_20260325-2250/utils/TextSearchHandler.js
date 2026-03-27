const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const PluginManager = require("./PluginManager");
const Logger = require("./Logger");
const { ensureDirForFile, ensureJsonFile } = require("./DataPath");

const CONFIG_PATH = path.join(__dirname, "../data/text_search_config.json");
const DEFAULT_CONFIG = {
  enabled: true,
  allowedChannels: [],
  minQueryLength: 3,
  maxResults: 5,
  cooldown: 5000,
  autoDelete: true,
  autoDeleteDelay: 30000,
};

class TextSearchHandler {
  constructor() {
    this.cooldowns = new Map();
    ensureJsonFile(CONFIG_PATH, DEFAULT_CONFIG);
    this.config = this.loadConfig();
  }

  loadConfig() {
    ensureDirForFile(CONFIG_PATH);
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH, "utf8");
        return this.normalizeConfig(JSON.parse(data));
      }
    } catch (err) {
      console.error("[TextSearchHandler] Error loading config:", err.message);
    }
    return { ...DEFAULT_CONFIG };
  }

  normalizeConfig(rawConfig = {}) {
    const config = { ...DEFAULT_CONFIG, ...(rawConfig || {}) };
    if (!Array.isArray(config.allowedChannels)) {
      config.allowedChannels = [];
    }
    config.enabled = Boolean(config.enabled);
    config.minQueryLength = Math.min(
      Math.max(parseInt(config.minQueryLength, 10) || 3, 2),
      50,
    );
    config.maxResults = Math.min(
      Math.max(parseInt(config.maxResults, 10) || 5, 1),
      25,
    );
    config.cooldown = Math.min(
      Math.max(parseInt(config.cooldown, 10) || 5000, 0),
      300000,
    );
    config.autoDelete = Boolean(config.autoDelete);
    config.autoDeleteDelay = Math.min(
      Math.max(parseInt(config.autoDeleteDelay, 10) || 30000, 3000),
      300000,
    );
    return config;
  }

  saveConfig() {
    try {
      ensureDirForFile(CONFIG_PATH);
      this.config = this.normalizeConfig(this.config);
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error("[TextSearchHandler] Error saving config:", err.message);
    }
  }

  // Kiểm tra xem kênh có được phép tìm kiếm không
  isChannelAllowed(channelId) {
    // Bắt buộc phải có ít nhất 1 kênh được cấu hình
    // Nếu danh sách rỗng -> không cho phép bất kỳ kênh nào
    if (this.config.allowedChannels.length === 0) {
      return false;
    }
    return this.config.allowedChannels.includes(channelId);
  }

  // Kiểm tra cooldown
  isOnCooldown(userId) {
    const lastUse = this.cooldowns.get(userId);
    if (!lastUse) return false;
    return Date.now() - lastUse < this.config.cooldown;
  }

  setCooldown(userId) {
    this.cooldowns.set(userId, Date.now());
  }

  // Tìm kiếm danh mục plugin (folder) phù hợp với query
  searchCategories(query) {
    const plugins = PluginManager.getAll();
    const queryLower = query.toLowerCase().trim();

    // Lấy danh sách các danh mục (folder)
    const categories = new Map(); // Map<categoryName, plugins[]>

    plugins.forEach((plugin) => {
      if (!plugin.storageName || plugin.storageName.startsWith("_")) return;

      const parts = plugin.storageName.split("/");
      const category = parts.length > 1 ? parts[0] : "Misc";

      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(plugin);
    });

    // Tìm tất cả danh mục phù hợp với query
    const matchedCategories = [];

    categories.forEach((categoryPlugins, categoryName) => {
      const catLower = categoryName.toLowerCase();
      let score = 0;

      // Khớp chính xác
      if (catLower === queryLower) {
        score = 100;
      }
      // Danh mục bắt đầu bằng query
      else if (catLower.startsWith(queryLower)) {
        score = 50;
      }
      // Danh mục chứa query
      else if (catLower.includes(queryLower)) {
        score = 30;
      }
      // Query chứa trong danh mục
      else if (queryLower.includes(catLower)) {
        score = 20;
      }

      if (score > 0) {
        matchedCategories.push({
          category: categoryName,
          plugins: categoryPlugins,
          score,
        });
      }
    });

    // Sắp xếp theo điểm và trả về
    matchedCategories.sort((a, b) => b.score - a.score);

    return matchedCategories.slice(0, this.config.maxResults || 5);
  }

  // Lấy các phiên bản của 1 danh mục cụ thể
  getCategoryVersions(categoryName) {
    const plugins = PluginManager.getAll();

    const categoryPlugins = plugins.filter((p) => {
      if (!p.storageName) return false;
      const parts = p.storageName.split("/");
      const category = parts.length > 1 ? parts[0] : "Misc";
      return category === categoryName;
    });

    // Sắp xếp theo tên (version mới nhất lên trên)
    return categoryPlugins
      .sort((a, b) => b.originalName.localeCompare(a.originalName))
      .slice(0, 25);
  }

  // Xử lý tin nhắn
  async handle(message) {
    // Bỏ qua tin nhắn từ bot
    if (message.author.bot) return;

    // Kiểm tra tính năng có được bật không
    if (!this.config.enabled) return;

    // Kiểm tra kênh được phép
    if (!this.isChannelAllowed(message.channel.id)) return;

    const query = message.content.trim();

    // Bỏ qua tin nhắn quá ngắn hoặc là lệnh
    if (query.length < this.config.minQueryLength) return;
    if (query.startsWith("/") || query.startsWith("!")) return;

    // Bỏ qua nếu có nhiều dòng (có thể là đoạn chat bình thường)
    if (query.includes("\n")) return;

    // Tìm kiếm danh mục plugin
    const matchedCategories = this.searchCategories(query);

    // Nếu không có kết quả, không làm gì
    if (!matchedCategories || matchedCategories.length === 0) return;

    // Kiểm tra cooldown
    if (this.isOnCooldown(message.author.id)) {
      return; // Im lặng, không thông báo cooldown
    }

    // Đặt cooldown
    this.setCooldown(message.author.id);

    // LUÔN hiển thị dropdown chọn danh mục trước
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🔍 Tìm thấy ${matchedCategories.length} danh mục`)
      .setDescription(
        `Kết quả tìm kiếm cho: **${query}**\n\n` +
          `Chọn danh mục plugin bạn muốn:`,
      )
      .setFooter({
        text: `💡 Tự xóa sau ${this.config.autoDeleteDelay / 1000}s | Hôm nay lúc ${new Date().toLocaleTimeString("vi-VN")}`,
      });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("textsearch_category_select")
      .setPlaceholder(`📂 Chọn danh mục plugin...`)
      .addOptions(
        matchedCategories.map((cat, index) => {
          const icons = [
            "📁",
            "📁",
            "📁",
            "📁",
            "📁",
            "📁",
            "📁",
            "📁",
            "📁",
            "📁",
          ];
          return new StringSelectMenuOptionBuilder()
            .setLabel(cat.category)
            .setDescription(`${cat.plugins.length} phiên bản có sẵn`)
            .setValue(`textsearch_cat_${cat.category}`)
            .setEmoji(icons[index] || "📁");
        }),
      );

    const logMessage = `Searched for "${query}", found ${matchedCategories.length} categories`;

    const row = new ActionRowBuilder().addComponents(selectMenu);

    try {
      const reply = await message.reply({
        embeds: [embed],
        components: [row],
      });

      // Log
      Logger.log(message.author, "TEXT_SEARCH", logMessage);

      // Tự động xóa sau một khoảng thời gian
      if (this.config.autoDelete) {
        setTimeout(async () => {
          try {
            await reply.delete();
          } catch (err) {
            // Tin nhắn có thể đã bị xóa
          }
        }, this.config.autoDeleteDelay);
      }
    } catch (err) {
      console.error("[TextSearchHandler] Error sending reply:", err.message);
    }
  }

  // Các phương thức quản lý cấu hình
  addChannel(channelId) {
    if (!this.config.allowedChannels.includes(channelId)) {
      this.config.allowedChannels.push(channelId);
      this.saveConfig();
      return true;
    }
    return false;
  }

  removeChannel(channelId) {
    const index = this.config.allowedChannels.indexOf(channelId);
    if (index > -1) {
      this.config.allowedChannels.splice(index, 1);
      this.saveConfig();
      return true;
    }
    return false;
  }

  setEnabled(enabled) {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  getConfig() {
    return this.config;
  }

  setMaxResults(max) {
    this.config.maxResults = Math.min(Math.max(1, max), 25);
    this.saveConfig();
  }

  setMinQueryLength(min) {
    this.config.minQueryLength = Math.min(Math.max(2, min), 10);
    this.saveConfig();
  }
}

module.exports = new TextSearchHandler();
