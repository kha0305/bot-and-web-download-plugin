const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("request")
    .setDescription("Gửi yêu cầu thêm plugin mới"),
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("request_submission")
      .setTitle("Yêu cầu Plugin mới");

    const nameInput = new TextInputBuilder()
      .setCustomId("req_name")
      .setLabel("Tên Plugin")
      .setPlaceholder("VD: EssentialsX, MythicMobs...")
      .setStyle(TextInputStyle.Short);

    const reasonInput = new TextInputBuilder()
      .setCustomId("req_reason")
      .setLabel("Mô tả / Link (Nếu có)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(reasonInput)
    );

    // Show modal trực tiếp, không được defer trước đó
    await interaction.showModal(modal);
  },
};
