const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const PluginManager = require("../../utils/PluginManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tracuu")
    .setDescription(
      "Tra cứu thông tin chi tiết của plugin (version, MC version, dependencies)",
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const allPlugins = PluginManager.getAll();
      // Filter only plugins (not starting with _)
      const plugins = allPlugins.filter((p) => !p.storageName.startsWith("_"));

      if (plugins.length === 0) {
        return interaction.editReply("⚠️ Chưa có plugin nào trong hệ thống.");
      }

      // Get unique categories
      const categories = new Set();
      plugins.forEach((p) => {
        const parts = p.storageName.split("/");
        if (parts.length > 1) {
          categories.add(parts[0]);
        } else {
          categories.add("Misc");
        }
      });

      const uniqueCats = Array.from(categories).sort();

      // Pagination - first 25
      const PAGE_SIZE = 25;
      const bucket = uniqueCats.slice(0, PAGE_SIZE);

      const options = bucket.map((cat) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat)
          .setDescription(
            `Có ${
              plugins.filter((p) =>
                cat === "Misc"
                  ? !p.storageName.includes("/")
                  : p.storageName.startsWith(cat + "/"),
              ).length
            } plugins`,
          )
          .setValue(`lookup_cat_${cat}`),
      );

      const select = new StringSelectMenuBuilder()
        .setCustomId("lookup_category_select")
        .setPlaceholder(
          `Chọn danh mục để tra cứu (Trang 1/${Math.ceil(
            uniqueCats.length / PAGE_SIZE,
          )})`,
        )
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      // Navigation buttons
      const totalPages = Math.ceil(uniqueCats.length / PAGE_SIZE);
      const btnPrev = new ButtonBuilder()
        .setCustomId("btn_lookup_cat_prev_0")
        .setLabel("Trước")
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true); // Page 0, no prev

      const btnNext = new ButtonBuilder()
        .setCustomId("btn_lookup_cat_next_0")
        .setLabel("Tiếp")
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalPages <= 1);

      const rowNav = new ActionRowBuilder().addComponents(btnPrev, btnNext);

      await interaction.editReply({
        content: `🔍 **Tra cứu Plugin**: Tìm thấy **${plugins.length}** plugins trong **${uniqueCats.length}** danh mục.\nTrang 1/${totalPages}`,
        components: [row, rowNav],
      });
    } catch (error) {
      console.error("Lookup command error:", error);
      await interaction.editReply("❌ Đã xảy ra lỗi khi tải danh sách.");
    }
  },
};
