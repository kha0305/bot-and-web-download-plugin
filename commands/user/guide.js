const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("guide")
    .setDescription("Hướng dẫn sử dụng Bot Plugin"),
  async execute(interaction) {
    const guideEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("📖 Hướng dẫn sử dụng")
      .addFields(
        { name: "/search <tên>", value: "Tìm kiếm plugin nhanh." },
        { name: "/menu", value: "Mở dashboard điều khiển chính." },
        { name: "/scan", value: "Admin: Quét và cập nhật plugin mới." },
        { name: "/request", value: "Gửi yêu cầu thêm plugin mới." },
        { name: "/report", value: "Báo lỗi plugin hỏng." },
        {
          name: "/upload",
          value: "Kéo thả file vào Discord và dùng lệnh để upload.",
        },
      );
    await interaction.reply({
      embeds: [guideEmbed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
