const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Báo lỗi plugin hư hỏng hoặc sai phiên bản"),
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("report_submission")
      .setTitle("Báo lỗi Plugin");

    const nameInput = new TextInputBuilder()
      .setCustomId("rep_name")
      .setLabel("Tên Plugin bị lỗi")
      .setStyle(TextInputStyle.Short);

    const issueInput = new TextInputBuilder()
      .setCustomId("rep_issue")
      .setLabel("Mô tả lỗi")
      .setPlaceholder("VD: Không tải được, sai version...")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(issueInput)
    );

    await interaction.showModal(modal);
  },
};
