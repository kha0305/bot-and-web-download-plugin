const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sukien")
    .setDescription("Tạo thông báo sự kiện (Chỉ dành cho Bot Sự Kiện)")
    .addStringOption((option) =>
      option
        .setName("noidung")
        .setDescription("Nội dung sự kiện")
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("kenh")
        .setDescription("Kênh để thông báo (Mặc định là kênh hiện tại)")
        .setRequired(false),
    ),

  async execute(interaction) {
    // 1. Kiểm tra xem có phải Bot Sự Kiện (Bot 2) không
    // Chúng ta kiểm tra thông qua biến môi trường DISCORD_TOKEN
    // Bot 2 sẽ có token khác hoặc có thể check ID nhưng cách đơn giản nhất là
    // xem bot này đang chạy với token nào.
    // Tuy nhiên, để đơn giản, ta cho phép cả 2 bot dùng, hoặc check role Admin.

    // Check quyền Admin
    const adminIds = (process.env.ADMIN_ID || "")
      .split(",")
      .map((id) => id.trim());
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: "🚫 Chỉ Admin mới được dùng lệnh này!",
        ephemeral: true,
      });
    }

    const noidung = interaction.options.getString("noidung");
    const targetChannel =
      interaction.options.getChannel("kenh") || interaction.channel;

    // Kiểm tra quyền gửi tin nhắn vào kênh đó
    if (!targetChannel.isTextBased()) {
      return interaction.reply({
        content: "❌ Phải chọn kênh chat văn bản!",
        ephemeral: true,
      });
    }

    try {
      // Tạo Embed đẹp
      const { EmbedBuilder } = require("discord.js");
      const eventEmbed = new EmbedBuilder()
        .setColor("#FF0000") // Màu đỏ nổi bật
        .setTitle("🎉 THÔNG BÁO SỰ KIỆN MỚI 🎉")
        .setDescription(noidung)
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .addFields(
          {
            name: "⏰ Thời gian",
            value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
            inline: true,
          },
          {
            name: "📢 Tổ chức bởi",
            value: `${interaction.user}`,
            inline: true,
          },
        )
        .setImage(
          "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z5eXF4a3BibHl4a3BibHl4a3BibHl4a3BibHl4a3BibHl4aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Lfpokj5uC2cNy/giphy.gif",
        ) // Ảnh động pháo hoa minh họa
        .setFooter({
          text: "Tham gia ngay để nhận quà!",
          iconURL: interaction.guild.iconURL(),
        })
        .setTimestamp();

      // Gửi thông báo
      await targetChannel.send({
        content: "@everyone 🔥 SỰ KIỆN NÓNG HỔI ĐÂY!",
        embeds: [eventEmbed],
      });

      // Phản hồi lại người dùng lệnh
      await interaction.reply({
        content: `✅ Đã gửi thông báo sự kiện đến kênh ${targetChannel}!`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "❌ Có lỗi khi gửi thông báo. Kiểm tra quyền của Bot!",
        ephemeral: true,
      });
    }
  },
};
