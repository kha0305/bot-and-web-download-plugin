const fs = require("fs");
const path = require("path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const PluginManager = require("./PluginManager");
const { ensureDirForFile, ensureJsonFile } = require("./DataPath");

const DASHBOARD_FILE = path.join(__dirname, "../data/dashboard.json");

function getPublicDownloadUrl() {
  const configuredBase = String(process.env.PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  if (configuredBase) {
    return `${configuredBase}/downloads`;
  }

  const port = process.env.DASHBOARD_PORT || 26012;
  return `http://localhost:${port}/downloads`;
}

class DashboardManager {
  constructor() {
    ensureJsonFile(DASHBOARD_FILE, []);
    this.dashboards = this.load();
  }

  // Load dashboards từ file
  load() {
    ensureDirForFile(DASHBOARD_FILE);
    try {
      if (fs.existsSync(DASHBOARD_FILE)) {
        const data = fs.readFileSync(DASHBOARD_FILE, "utf8");
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("[DashboardManager] Error loading:", e.message);
    }
    return [];
  }

  // Save dashboards
  save() {
    try {
      ensureDirForFile(DASHBOARD_FILE);
      fs.writeFileSync(
        DASHBOARD_FILE,
        JSON.stringify(this.dashboards, null, 2)
      );
    } catch (e) {
      console.error("[DashboardManager] Error saving:", e.message);
    }
  }

  // Thêm dashboard mới
  add(channelId, messageId) {
    // Xóa dashboard cũ trong cùng channel (nếu có)
    this.dashboards = this.dashboards.filter((d) => d.channelId !== channelId);

    this.dashboards.push({
      channelId,
      messageId,
      createdAt: new Date().toISOString(),
    });
    this.save();
    console.log(
      `[DashboardManager] Added dashboard: ${channelId}/${messageId}`
    );
  }

  // Xóa dashboard
  remove(channelId) {
    this.dashboards = this.dashboards.filter((d) => d.channelId !== channelId);
    this.save();
  }

  // Lấy tất cả dashboards
  getAll() {
    return this.dashboards;
  }

  // Tạo embed cho dashboard
  static createEmbed(client, username = "User") {
    let stats = {
      plugins: 0,
      models: 0,
      setups: 0,
      configs: 0,
      total: 0,
    };
    let lastUpdate = "Chưa có";

    try {
      const allData = PluginManager.getAll();
      stats.total = allData.length;

      allData.forEach((p) => {
        if (p.storageName.startsWith("_Models")) stats.models++;
        else if (p.storageName.startsWith("_Setups")) stats.setups++;
        else if (p.storageName.startsWith("_Configs")) stats.configs++;
        else stats.plugins++;
      });

      if (allData.length > 0) {
        const last = allData[allData.length - 1];
        lastUpdate = new Date(last.uploadDate).toLocaleDateString("vi-VN");
      }
    } catch (e) {
      console.error("[DashboardManager] Error getting stats:", e);
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🚀 DASHBOARD ĐIỀU KHIỂN")
      .setDescription(`Xin chào **${username}**! Hãy chọn chức năng bên dưới:`)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        {
          name: "📦 Kho Tài Nguyên",
          value: `🧩 Plugins: \`${stats.plugins}\`\n🎨 Models: \`${stats.models}\`\n🏗️ Setups: \`${stats.setups}\`\n⚙️ Configs: \`${stats.configs}\``,
          inline: true,
        },
        { name: "📡 Trạng thái", value: "🟢 Online", inline: true },
        { name: "🕒 Cập nhật cuối", value: lastUpdate, inline: true }
      )
      .setFooter({
        text: `Bot Plugin System v3.0 by AntiGravity | Cập nhật: ${new Date().toLocaleTimeString(
          "vi-VN"
        )}`,
      });

    return embed;
  }

  // Tạo buttons cho dashboard
  static createButtons() {
    const btnDownload = new ButtonBuilder()
      .setCustomId("btn_download_menu")
      .setLabel("Download")
      .setEmoji("📥")
      .setStyle(ButtonStyle.Success);

    const btnUtilities = new ButtonBuilder()
      .setCustomId("btn_utilities")
      .setLabel("Tiện ích")
      .setEmoji("🛠️")
      .setStyle(ButtonStyle.Primary);

    const btnWebDownload = new ButtonBuilder()
      .setLabel("Tải trên Web")
      .setEmoji("🌐")
      .setStyle(ButtonStyle.Link)
      .setURL(getPublicDownloadUrl());

    const btnUserInfo = new ButtonBuilder()
      .setCustomId("btn_user_info")
      .setLabel("Thông tin User")
      .setEmoji("👤")
      .setStyle(ButtonStyle.Secondary);

    const btnStatus = new ButtonBuilder()
      .setCustomId("btn_status")
      .setLabel("System Status")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary);

    const btnGuide = new ButtonBuilder()
      .setCustomId("btn_guide")
      .setLabel("Hướng dẫn")
      .setEmoji("📖")
      .setStyle(ButtonStyle.Secondary);

    const btnRequest = new ButtonBuilder()
      .setCustomId("open_request_modal")
      .setLabel("Gửi Yêu Cầu")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Success);

    const btnReport = new ButtonBuilder()
      .setCustomId("open_report_modal")
      .setLabel("Báo Lỗi")
      .setEmoji("⚠️")
      .setStyle(ButtonStyle.Danger);

    const row1 = new ActionRowBuilder().addComponents(
      btnDownload,
      btnWebDownload,
      btnUtilities
    );
    const row2 = new ActionRowBuilder().addComponents(
      btnUserInfo,
      btnStatus,
      btnGuide
    );
    const row3 = new ActionRowBuilder().addComponents(btnRequest, btnReport);

    return [row1, row2, row3];
  }

  // Cập nhật tất cả dashboards
  async updateAll(client) {
    console.log("[DashboardManager] Updating all dashboards...");

    const toRemove = [];

    for (const dash of this.dashboards) {
      try {
        const channel = await client.channels.fetch(dash.channelId);
        if (!channel) {
          toRemove.push(dash.channelId);
          continue;
        }

        const message = await channel.messages.fetch(dash.messageId);
        if (!message) {
          toRemove.push(dash.channelId);
          continue;
        }

        const embed = DashboardManager.createEmbed(client, "Bạn");
        const buttons = DashboardManager.createButtons();

        await message.edit({
          embeds: [embed],
          components: buttons,
        });

        console.log(
          `[DashboardManager] Updated dashboard in channel ${dash.channelId}`
        );
      } catch (e) {
        console.error(
          `[DashboardManager] Failed to update ${dash.channelId}:`,
          e.message
        );
        // Nếu message không tồn tại, xóa khỏi danh sách
        if (e.code === 10008) {
          // Unknown Message
          toRemove.push(dash.channelId);
        }
      }
    }

    // Xóa các dashboard không còn tồn tại
    if (toRemove.length > 0) {
      this.dashboards = this.dashboards.filter(
        (d) => !toRemove.includes(d.channelId)
      );
      this.save();
      console.log(
        `[DashboardManager] Removed ${toRemove.length} invalid dashboard(s).`
      );
    }
  }
}

// Singleton instance
const instance = new DashboardManager();
module.exports = instance;
