const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require("discord.js");
const PluginManager = require("../../utils/PluginManager");
const UserDataManager = require("../../utils/UserDataManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("favorites")
    .setDescription("Xem danh sách plugin yêu thích của bạn"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const favoriteIds = UserDataManager.getFavorites(userId);

    if (favoriteIds.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("⭐ Plugin Yêu Thích")
        .setDescription(
          "Bạn chưa có plugin yêu thích nào!\n\n" +
            "**Cách thêm plugin yêu thích:**\n" +
            "• Sử dụng `/search <tên>` để tìm plugin\n" +
            "• Nhấn nút ⭐ để thêm vào yêu thích",
        )
        .setFooter({ text: "Powered by Bot Plugin System v3.0" });

      return interaction.reply({
        embeds: [emptyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Lấy thông tin plugin từ ID
    const favoritePlugins = [];
    favoriteIds.forEach((id) => {
      const plugin = PluginManager.getById(id);
      if (plugin) {
        favoritePlugins.push(plugin);
      }
    });

    if (favoritePlugins.length === 0) {
      return interaction.reply({
        content:
          "⚠️ Các plugin yêu thích của bạn không còn tồn tại trong hệ thống.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Pagination
    const PAGE_SIZE = 10;
    const currentPage = UserDataManager.getPaginationState(userId, "favorites");
    const totalPages = Math.ceil(favoritePlugins.length / PAGE_SIZE);
    const page = Math.min(currentPage, totalPages - 1);

    const startIndex = page * PAGE_SIZE;
    const pagePlugins = favoritePlugins.slice(
      startIndex,
      startIndex + PAGE_SIZE,
    );

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("⭐ Plugin Yêu Thích")
      .setDescription(
        `Bạn có **${favoritePlugins.length}** plugin yêu thích:\n\n` +
          pagePlugins
            .map((p, i) => {
              const rating = UserDataManager.getAverageRating(p.id);
              const ratingStr = rating.average ? `⭐ ${rating.average}` : "";
              return `**${startIndex + i + 1}.** ${p.name} ${ratingStr}\n└ \`${
                p.originalName
              }\``;
            })
            .join("\n\n"),
      )
      .setFooter({
        text: `Trang ${page + 1}/${totalPages} • Tổng: ${
          favoritePlugins.length
        } plugins`,
      });

    // Select menu for quick download
    const selectOptions = pagePlugins.map((p) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(p.name.substring(0, 100))
        .setDescription(`Tải: ${p.originalName.substring(0, 100)}`)
        .setValue(`fav_download_${p.id}`)
        .setEmoji("📥"),
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("favorites_download_select")
      .setPlaceholder("📥 Chọn plugin để tải xuống...")
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    // Navigation buttons
    const btnPrev = new ButtonBuilder()
      .setCustomId(`favorites_page_${page - 1}`)
      .setLabel("Trước")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0);

    const btnNext = new ButtonBuilder()
      .setCustomId(`favorites_page_${page + 1}`)
      .setLabel("Tiếp")
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1);

    const btnRefresh = new ButtonBuilder()
      .setCustomId("favorites_refresh")
      .setLabel("Làm mới")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Primary);

    const btnClearAll = new ButtonBuilder()
      .setCustomId("favorites_clear_confirm")
      .setLabel("Xóa tất cả")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger);

    const navRow = new ActionRowBuilder().addComponents(
      btnPrev,
      btnNext,
      btnRefresh,
      btnClearAll,
    );

    await interaction.reply({
      embeds: [embed],
      components: [selectRow, navRow],
      flags: MessageFlags.Ephemeral,
    });
  },
};
