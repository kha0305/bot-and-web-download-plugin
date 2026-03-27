const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const UserDataManager = require("../../utils/UserDataManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription("Xem lịch sử tải xuống của bạn")
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Số lượng bản ghi hiển thị (mặc định: 15)")
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false),
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const limit = interaction.options.getInteger("limit") || 15;

    const history = UserDataManager.getDownloadHistory(userId, limit);
    const totalDownloads = UserDataManager.getDownloadCount(userId);
    const stats = UserDataManager.getStats(userId);

    if (history.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("📜 Lịch Sử Tải Xuống")
        .setDescription(
          "Bạn chưa tải plugin nào!\n\n" +
            "**Bắt đầu bằng cách:**\n" +
            "• Sử dụng `/menu` để mở Dashboard\n" +
            "• Hoặc `/search <tên>` để tìm plugin",
        )
        .setFooter({ text: "Powered by Bot Plugin System v3.0" });

      return interaction.reply({
        embeds: [emptyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Format history entries
    const historyLines = history.map((entry, i) => {
      const date = new Date(entry.date);
      const timeAgo = getTimeAgo(date);
      return `**${i + 1}.** ${entry.pluginName}\n└ 📅 ${timeAgo}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("📜 Lịch Sử Tải Xuống")
      .setDescription(historyLines.join("\n\n"))
      .addFields(
        {
          name: "📊 Tổng lượt tải",
          value: `\`${totalDownloads}\` lần`,
          inline: true,
        },
        {
          name: "⭐ Yêu thích",
          value: `\`${stats.totalFavorites}\` plugins`,
          inline: true,
        },
        {
          name: "⭐ Đã đánh giá",
          value: `\`${stats.totalRatings}\` plugins`,
          inline: true,
        },
      )
      .setFooter({
        text: `Hiển thị ${history.length}/${totalDownloads} bản ghi • /history limit:50 để xem thêm`,
      });

    // Buttons
    const btnFavorites = new ButtonBuilder()
      .setCustomId("btn_open_favorites")
      .setLabel("Xem Yêu Thích")
      .setEmoji("⭐")
      .setStyle(ButtonStyle.Primary);

    const btnClearHistory = new ButtonBuilder()
      .setCustomId("history_clear_confirm")
      .setLabel("Xóa lịch sử")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger);

    const btnExport = new ButtonBuilder()
      .setCustomId("history_export")
      .setLabel("Xuất báo cáo")
      .setEmoji("📄")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(
      btnFavorites,
      btnExport,
      btnClearHistory,
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};

// Helper: Tính thời gian đã qua
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN");
}
