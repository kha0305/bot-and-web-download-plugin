const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const PluginManager = require("../../utils/PluginManager");
const fs = require("fs");
const path = require("path");

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("menu")
    .setDescription("Hiển thị menu chính của bot"),
  async execute(interaction) {
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
        else stats.plugins++; // Mặc định còn lại là Plugin
      });

      if (allData.length > 0) {
        const last = allData[allData.length - 1];
        lastUpdate = new Date(last.uploadDate).toLocaleDateString("vi-VN");
      }
    } catch (e) {
      console.error(e);
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🚀 DASHBOARD ĐIỀU KHIỂN")
      .setDescription(
        `Xin chào **${interaction.user.username}**! Hãy chọn chức năng bên dưới:`
      )
      .setThumbnail(interaction.client.user.displayAvatarURL())
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
        text: "Bot Plugin System v3.0 by AntiGravity",
        iconURL: interaction.user.displayAvatarURL(),
      });

    // Row 1 - Chức năng chính
    const btnDownload = new ButtonBuilder()
      .setCustomId("btn_download_menu")
      .setLabel("Download")
      .setEmoji("📥")
      .setStyle(ButtonStyle.Success);

    const btnWebDownload = new ButtonBuilder()
      .setLabel("Tải trên Web")
      .setEmoji("🌐")
      .setStyle(ButtonStyle.Link)
      .setURL(getPublicDownloadUrl());

    const btnUtilities = new ButtonBuilder()
      .setCustomId("btn_utilities")
      .setLabel("Tiện ích")
      .setEmoji("🛠️")
      .setStyle(ButtonStyle.Primary);

    // Row 2 - Thông tin
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

    // Row 3 - Hỗ trợ (Yêu cầu & Báo lỗi)
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

    const reply = await interaction.reply({
      embeds: [embed],
      components: [row1, row2, row3],
      fetchReply: true, // Lấy message để lưu ID
    });

    // Lưu dashboard để tự động cập nhật sau này
    try {
      const DashboardManager = require("../../utils/DashboardManager");
      DashboardManager.add(interaction.channelId, reply.id);
    } catch (e) {
      console.error("[Menu] Failed to save dashboard:", e.message);
    }
  },
};
