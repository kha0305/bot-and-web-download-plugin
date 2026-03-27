const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoscan")
    .setDescription("Quản lý tự động quét file (Admin only)")
    .addIntegerOption((option) =>
      option
        .setName("phut")
        .setDescription(
          "Thời gian giữa mỗi lần quét (phút). Để trống = xem status",
        )
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(1440),
    )
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Hành động")
        .setRequired(false)
        .addChoices(
          { name: "🔄 Quét ngay", value: "now" },
          { name: "⏹️ Dừng", value: "stop" },
          { name: "▶️ Bắt đầu", value: "start" },
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Check admin
    if (process.env.ADMIN_ID && interaction.user.id !== process.env.ADMIN_ID) {
      return interaction.reply({
        content: "🚫 Bạn không có quyền sử dụng lệnh này (Admin Only).",
        flags: MessageFlags.Ephemeral,
      });
    }

    const autoScanner = interaction.client.autoScanner;

    if (!autoScanner) {
      return interaction.reply({
        content: "❌ AutoScanner chưa được khởi tạo. Vui lòng restart bot.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const minutes = interaction.options.getInteger("phut");
    const action = interaction.options.getString("action");

    // Nếu có action
    if (action) {
      switch (action) {
        case "now":
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          await interaction.editReply("⏳ Đang quét...");
          await autoScanner.manualScan();
          await interaction.editReply(
            "✅ Đã hoàn thành quét! Nếu có file mới, bạn sẽ nhận được DM.",
          );
          return;

        case "stop":
          autoScanner.stop();
          await interaction.reply({
            content: "⏹️ Đã **dừng** AutoScanner.",
            flags: MessageFlags.Ephemeral,
          });
          return;

        case "start":
          if (autoScanner.intervalId) {
            return interaction.reply({
              content: "⚠️ AutoScanner đã đang chạy rồi!",
              flags: MessageFlags.Ephemeral,
            });
          }
          autoScanner.start();
          await interaction.reply({
            content: `▶️ Đã **khởi động** AutoScanner (mỗi ${autoScanner.intervalMinutes} phút).`,
            flags: MessageFlags.Ephemeral,
          });
          return;
      }
    }

    // Nếu có số phút → đổi interval
    if (minutes) {
      autoScanner.setInterval(minutes);
      await interaction.reply({
        content: `✅ Đã đổi thời gian quét thành **${minutes} phút**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Mặc định: Hiển thị status
    const status = autoScanner.getStatus();
    const embed = new EmbedBuilder()
      .setColor(status.running ? 0x00ff00 : 0xff0000)
      .setTitle("📡 AutoScanner Status")
      .setDescription(
        "Tự động quét folder `data/files` và thông báo khi có file mới.",
      )
      .addFields(
        {
          name: "🔄 Trạng thái",
          value: status.running ? "✅ Đang chạy" : "❌ Đã dừng",
          inline: true,
        },
        {
          name: "⏱️ Quét mỗi",
          value: `${status.interval} phút`,
          inline: true,
        },
        {
          name: "📁 Files đã biết",
          value: `${status.knownFiles} files`,
          inline: true,
        },
      )
      .addFields({
        name: "📋 Hướng dẫn",
        value:
          "`/autoscan 30` - Đổi thời gian quét thành 30 phút\n" +
          "`/autoscan action:Quét ngay` - Quét ngay lập tức\n" +
          "`/autoscan action:Dừng` - Dừng tự động quét\n" +
          "`/autoscan action:Bắt đầu` - Khởi động lại",
        inline: false,
      })
      .setFooter({ text: `Kiểm tra lúc: ${status.lastCheck}` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
