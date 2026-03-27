const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const Translator = require("../../utils/Translator");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dich")
    .setDescription(
      "Dịch file Config/Lang (.yml) sang Tiếng Việt (Giữ nguyên code)",
    )
    .addAttachmentOption((option) =>
      option
        .setName("file")
        .setDescription("Upload file .yml cần dịch")
        .setRequired(true),
    ),
  async execute(interaction) {
    // Không dùng deferReply ở đây vì mình sẽ gửi message có button luôn

    const attachment = interaction.options.getAttachment("file");
    const fileUrl = attachment.url;
    const fileName = attachment.name;

    // 1. Kiểm tra định dạng file
    const supportedExtensions = [".yml", ".yaml", ".txt"];
    const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf("."));

    if (!supportedExtensions.includes(fileExt)) {
      return interaction.reply({
        content: "❌ Chỉ hỗ trợ dịch file `.yml`, `.yaml` hoặc `.txt`.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // 2. Lưu thông tin file vào cache tạm thời
    // Key: interaction.user.id (để user chỉ có 1 session dịch active tại 1 thời điểm là đủ)
    // Hoặc tốt hơn là dùng ID của interaction để unique, nhưng button không lấy được interaction ID cũ dễ dàng.
    // Mình sẽ lưu vào user.id cho đơn giản.
    interaction.client.translateCache.set(interaction.user.id, {
      fileUrl: fileUrl,
      fileName: fileName,
      timestamp: Date.now(),
    });

    // 3. Hiển thị Menu chọn Engine
    const chatgptEngineName = Translator.getEngineName("chatgpt");
    const defaultSkill = Translator.getSkillProfile(Translator.getDefaultSkillId());
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🌐 Chọn công cụ dịch thuật")
      .setDescription(
        `Bạn đã upload file: **${fileName}**\n\nVui lòng chọn công cụ dịch bên dưới:`,
      )
      .addFields(
        {
          name: "🆓 Google Translate (Miễn phí)",
          value: "Dịch nhanh, chất lượng cơ bản. Không tốn phí.",
          inline: true,
        },
        {
          name: `⭐ ${chatgptEngineName}`,
          value:
            "Tối ưu ngữ cảnh Minecraft + cache tiết kiệm quota. (Yêu cầu API Key)",
          inline: true,
        },
      )
      .setFooter({
        text: `Skill mặc định: ${defaultSkill.name}`,
      });

    const btnGoogle = new ButtonBuilder()
      .setCustomId("trans_engine_google")
      .setLabel("Dịch bằng Google")
      .setEmoji("🌐")
      .setStyle(ButtonStyle.Primary);

    const btnChatGPT = new ButtonBuilder()
      .setCustomId("trans_engine_chatgpt")
      .setLabel("Dịch bằng ChatGPT")
      .setEmoji("⭐")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(btnGoogle, btnChatGPT);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral, // Chỉ người dùng thấy
    });
  },
};
