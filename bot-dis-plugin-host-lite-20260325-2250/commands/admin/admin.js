const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const PluginManager = require("../../utils/PluginManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Dashboard quản trị viên (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    // Check Admin ID
    if (process.env.ADMIN_ID && interaction.user.id !== process.env.ADMIN_ID) {
      return interaction.reply({
        content: "🚫 Bạn không có quyền truy cập Dashboard này.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Logic đếm chi tiết
    let stats = { plugins: 0, models: 0, setups: 0, configs: 0, total: 0 };
    try {
      const allData = PluginManager.getAll();
      stats.total = allData.length;
      allData.forEach((p) => {
        const sName = p.storageName || "";
        if (sName.startsWith("_Models")) stats.models++;
        else if (sName.startsWith("_Setups")) stats.setups++;
        else if (sName.startsWith("_Configs")) stats.configs++;
        else stats.plugins++;
      });
    } catch (e) {
      console.error(e);
    }

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🛡️ ADMIN CONTROL PANEL")
      .setDescription(
        `Chào sếp **${interaction.user.username}**! Hệ thống đã sẵn sàng.`,
      )
      .addFields(
        {
          name: "📊 Thống kê chi tiết",
          value: `🧩 Plugins: **${stats.plugins}** | 🎨 Models: **${stats.models}**\n🏗️ Setups: **${stats.setups}** | ⚙️ Configs: **${stats.configs}**\n------------- \n📌 **Tổng cộng: ${stats.total} files**`,
          inline: false,
        },
        {
          name: "⚙️ Chức năng nhanh",
          value: "Sử dụng các nút bên dưới để quản lý.",
          inline: false,
        },
      )
      .setTimestamp();

    const btnScan = new ButtonBuilder()
      .setCustomId("admin_scan_trigger")
      .setLabel("Scan System")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Primary);

    const btnDelete = new ButtonBuilder()
      .setCustomId("admin_delete_menu")
      .setLabel("Xóa Plugin")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger);

    const btnUploadInfo = new ButtonBuilder()
      .setCustomId("admin_upload_info")
      .setLabel("Info Upload")
      .setEmoji("ℹ️")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(
      btnScan,
      btnDelete,
      btnUploadInfo,
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
