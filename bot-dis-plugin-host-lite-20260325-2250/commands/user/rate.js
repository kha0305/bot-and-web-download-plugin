const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const PluginManager = require("../../utils/PluginManager");
const UserDataManager = require("../../utils/UserDataManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rate")
    .setDescription("Đánh giá plugin (1-5 sao)")
    .addStringOption((option) =>
      option
        .setName("plugin")
        .setDescription("Tên plugin cần đánh giá")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("stars")
        .setDescription("Số sao đánh giá (1-5)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)
        .addChoices(
          { name: "⭐ 1 sao - Rất tệ", value: 1 },
          { name: "⭐⭐ 2 sao - Tệ", value: 2 },
          { name: "⭐⭐⭐ 3 sao - Trung bình", value: 3 },
          { name: "⭐⭐⭐⭐ 4 sao - Tốt", value: 4 },
          { name: "⭐⭐⭐⭐⭐ 5 sao - Tuyệt vời", value: 5 },
        ),
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const plugins = PluginManager.getAll().filter(
      (p) => !p.storageName.startsWith("_"),
    );

    // Filter and limit
    const filtered = plugins
      .filter((p) => p.name.toLowerCase().includes(focusedValue))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((p) => ({
        name: `${p.name} (${p.version || "?"})`,
        value: p.id,
      })),
    );
  },

  async execute(interaction) {
    const pluginInput = interaction.options.getString("plugin");
    const stars = interaction.options.getInteger("stars");
    const userId = interaction.user.id;

    // Ưu tiên theo ID từ autocomplete, fallback theo tên nếu user gõ tay.
    let plugin = PluginManager.getById(pluginInput);
    if (!plugin) {
      const normalized = pluginInput.toLowerCase().trim();
      const allPlugins = PluginManager.getAll().filter(
        (p) => !p.storageName.startsWith("_"),
      );
      plugin =
        allPlugins.find((p) => p.name.toLowerCase() === normalized) ||
        allPlugins.find((p) => p.name.toLowerCase().includes(normalized));
    }

    if (!plugin) {
      return interaction.reply({
        content: "❌ Không tìm thấy plugin này trong hệ thống.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const pluginId = plugin.id;

    // Lấy rating cũ (nếu có)
    const oldRating = UserDataManager.getRating(userId, pluginId);

    // Lưu rating mới
    UserDataManager.setRating(userId, pluginId, stars);

    // Lấy rating trung bình
    const avgRating = UserDataManager.getAverageRating(pluginId);

    // Tạo stars display
    const starsDisplay = "⭐".repeat(stars) + "☆".repeat(5 - stars);
    const avgStarsDisplay = avgRating.average
      ? "⭐".repeat(Math.round(parseFloat(avgRating.average))) +
        "☆".repeat(5 - Math.round(parseFloat(avgRating.average)))
      : "Chưa có đánh giá";

    const embed = new EmbedBuilder()
      .setColor(getColorByRating(stars))
      .setTitle("⭐ Đánh Giá Plugin")
      .setDescription(
        oldRating
          ? `✅ Đã cập nhật đánh giá của bạn từ **${oldRating} sao** thành **${stars} sao**!`
          : `✅ Đã đánh giá **${stars} sao** cho plugin này!`,
      )
      .addFields(
        { name: "📦 Plugin", value: plugin.name, inline: true },
        { name: "🎯 Đánh giá của bạn", value: starsDisplay, inline: true },
        {
          name: "📊 Đánh giá trung bình",
          value: `${avgStarsDisplay}\n(${avgRating.count} lượt)`,
          inline: true,
        },
      )
      .setFooter({ text: "Cảm ơn bạn đã đánh giá!" });

    // Quick action buttons
    const isFavorite = UserDataManager.isFavorite(userId, pluginId);

    const btnFavorite = new ButtonBuilder()
      .setCustomId(`toggle_favorite_${pluginId}`)
      .setLabel(isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích")
      .setEmoji(isFavorite ? "💔" : "⭐")
      .setStyle(isFavorite ? ButtonStyle.Secondary : ButtonStyle.Primary);

    const btnDownload = new ButtonBuilder()
      .setCustomId(`quick_download_${pluginId}`)
      .setLabel("Tải xuống")
      .setEmoji("📥")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(btnFavorite, btnDownload);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};

function getColorByRating(stars) {
  const colors = {
    1: 0xe74c3c, // Đỏ
    2: 0xe67e22, // Cam
    3: 0xf1c40f, // Vàng
    4: 0x2ecc71, // Xanh lá
    5: 0x9b59b6, // Tím
  };
  return colors[stars] || 0x3498db;
}
