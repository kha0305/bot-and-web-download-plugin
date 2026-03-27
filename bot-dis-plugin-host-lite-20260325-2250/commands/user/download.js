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
    .setName("download")
    .setDescription("Mở menu tải tài nguyên")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Chọn nhanh loại tài nguyên muốn tải")
        .setRequired(false)
        .addChoices(
          { name: "Plugins", value: "type_Plugins" },
          { name: "Models & Packs", value: "type_Models" },
          { name: "Setups", value: "type_Setups" },
          { name: "Configs", value: "type_Configs" },
        ),
    ),
  async execute(interaction) {
    const selectedType = interaction.options.getString("type");

    // CASE 1: Người dùng KHÔNG chọn type -> Hiện Menu chọn Type
    if (!selectedType) {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("📂 Kho Tài Nguyên")
        .setDescription("Bạn muốn tải tài nguyên loại nào?");

      const select = new StringSelectMenuBuilder()
        .setCustomId("resource_type_select")
        .setPlaceholder("Chọn loại tài nguyên...")
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Plugins Minecraft (.jar)")
            .setDescription("Plugin cho Spigot/Paper/Folia")
            .setValue("type_Plugins")
            .setEmoji("🧩"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Models & Packs")
            .setDescription("Resource Pack, Oraxen/ItemsAdder Models")
            .setValue("type_Models")
            .setEmoji("🎨"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Server Setups")
            .setDescription("Máy chủ cài đặt sẵn (Setup)")
            .setValue("type_Setups")
            .setEmoji("🏗️"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Configs (.yml)")
            .setDescription("File cấu hình mẫu")
            .setValue("type_Configs")
            .setEmoji("⚙️"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Tìm kiếm (Search)")
            .setDescription("Tìm file bất kỳ")
            .setValue("action_search")
            .setEmoji("🔎"),
        );

      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // CASE 2: Người dùng ĐÃ chọn type
    try {
      if (
        selectedType === "type_Models" ||
        selectedType === "type_Setups" ||
        selectedType === "type_Configs"
      ) {
        return interaction.reply({
          content:
            "🚧 **Tính năng này đang phát triển!** (Coming Soon)\nVui lòng quay lại sau.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const allData = PluginManager.getAll();
      let filtered = [];
      let label = "";

      if (selectedType === "type_Plugins") {
        filtered = allData.filter((p) => !p.storageName.startsWith("_"));
        label = "Plugins";
      }

      if (filtered.length === 0) {
        return interaction.reply({
          content: `⚠️ Chưa có dữ liệu cho mục **${label}**.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const categories = new Set();
      filtered.forEach((p) => {
        const parts = p.storageName.split("/");
        if (parts.length > 1) {
          categories.add(parts[0]);
        } else {
          categories.add("Misc");
        }
      });

      const uniqueCats = Array.from(categories).sort();

      // --- PAGINATION (Page 0) ---
      const PAGE_SIZE = 25;
      const bucket = uniqueCats.slice(0, PAGE_SIZE);

      const options = bucket.map((cat) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.startsWith("_") ? cat.substring(1) : cat)
          .setDescription(
            `Có ${
              filtered.filter((p) =>
                cat === "Misc"
                  ? !p.storageName.includes("/")
                  : p.storageName.startsWith(cat + "/"),
              ).length
            } files`,
          )
          .setValue(cat),
      );

      const select = new StringSelectMenuBuilder()
        .setCustomId("category_select")
        .setPlaceholder(`Chọn danh mục trong ${label} (Trang 1)`)
        .addOptions(options);

      // Button Nav
      const btnPrev = new ButtonBuilder()
        .setCustomId(`btn_nav_cat_-1_${selectedType}`)
        .setLabel("Trước")
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const btnNext = new ButtonBuilder()
        .setCustomId(`btn_nav_cat_1_${selectedType}`)
        .setLabel("Tiếp")
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(uniqueCats.length <= PAGE_SIZE);

      const row = new ActionRowBuilder().addComponents(select);
      const rowNav = new ActionRowBuilder().addComponents(btnPrev, btnNext);

      await interaction.reply({
        content: `📂 **${label}**: Tìm thấy **${filtered.length}** files trong **${uniqueCats.length}** danh mục (Trang 1).`,
        components: [row, rowNav],
        flags: MessageFlags.Ephemeral,
      });
    } catch (e) {
      console.error(e);
      interaction.reply({
        content: "Lỗi hệ thống.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
