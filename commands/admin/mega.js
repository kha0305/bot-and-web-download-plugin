const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const { File } = require("megajs"); // Giữ require để không lỗi code khác nếu có reference
const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mega")
    .setDescription("Import plugin từ link Mega.nz (Admin Only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // Giữ option để không lỗi đăng ký commands, dù không dùng đến
    .addStringOption((option) =>
      option
        .setName("urls")
        .setDescription(
          "Dán link Mega vào đây (Nhiều link cách nhau bằng dấu cách)",
        )
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName("file_list")
        .setDescription("Hoặc upload file .txt chứa danh sách link")
        .setRequired(false),
    ),
  async execute(interaction) {
    if (process.env.ADMIN_ID && interaction.user.id !== process.env.ADMIN_ID) {
      return interaction.reply({
        content: "🚫 Admin only.",
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content:
        "🚧 **Tính năng Import Mega đang bảo trì!** (Coming Soon)\nVui lòng sử dụng cách upload thủ công (Kéo thả file vào Discord và dùng `/upload`).",
      flags: MessageFlags.Ephemeral,
    });
  },
};
