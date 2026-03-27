const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Xem thông tin chi tiết của bạn trên server"),
  async execute(interaction) {
    const user = interaction.user;
    const member = interaction.member; // Lưu ý: Cần chạy trong Guild

    if (!member) {
      return interaction.reply({
        content: "Lệnh này chỉ dùng được trong Server!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const infoEmbed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle("👤 Thông tin người dùng")
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "Tên hiển thị", value: user.tag, inline: true },
        { name: "ID", value: user.id, inline: true },
        {
          name: "Ngày tham gia",
          value: member.joinedAt
            ? member.joinedAt.toLocaleDateString("vi-VN")
            : "N/A",
          inline: false,
        },
      );

    await interaction.reply({
      embeds: [infoEmbed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
