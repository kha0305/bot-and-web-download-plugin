const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const PluginManager = require("../../utils/PluginManager");
const Logger = require("../../utils/Logger");
const {
  STORAGE_UPLOAD_EXTENSIONS,
  isAllowedExtension,
  formatExtensionList,
} = require("../../utils/FileExtensionPolicy");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("upload")
    .setDescription("Upload a plugin (Admin only)")
    .addStringOption((option) =>
      option.setName("name").setDescription("Tên plugin").setRequired(true),
    )
    .addAttachmentOption((option) =>
      option.setName("file").setDescription("File plugin").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Mô tả plugin")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (process.env.ADMIN_ID && interaction.user.id !== process.env.ADMIN_ID) {
      return interaction.reply({
        content: "🚫 Bạn không có quyền sử dụng lệnh này (Admin Only).",
        flags: MessageFlags.Ephemeral,
      });
    }
    const name = interaction.options.getString("name");
    const file = interaction.options.getAttachment("file");
    const description =
      interaction.options.getString("description") || "Không có mô tả";

    if (!file) return interaction.reply("Vui lòng đính kèm file.");

    if (!isAllowedExtension(file.name, STORAGE_UPLOAD_EXTENSIONS)) {
      return interaction.reply({
        content: `❌ Chỉ hỗ trợ upload: ${formatExtensionList(STORAGE_UPLOAD_EXTENSIONS)}.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const timestamp = Date.now();
    const originalName = file.name;
    // Basic sanitization
    const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Create folder from plugin name
    const safePluginFolderName = name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const folderPath = path.join(
      __dirname,
      "../../data/files",
      safePluginFolderName,
    );
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fileName = `${timestamp}_${safeOriginalName}`;
    const filePath = path.join(folderPath, fileName);

    const fileUrl = file.url;

    try {
      // Using fetch to download
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      fs.writeFileSync(filePath, buffer);

      // Add to Manager (Handling DB update)
      const newPlugin = {
        id: timestamp.toString(),
        name: name,
        description: description,
        originalName: originalName,
        storageName: `${safePluginFolderName}/${fileName}`,
        uploadDate: new Date().toISOString(),
        uploadedBy: interaction.user.tag,
      };

      PluginManager.add(newPlugin);

      await interaction.editReply(
        `✅ Đã upload thành công plugin: **${name}**\nFile: ${originalName}`,
      );

      Logger.log(
        interaction.user,
        "UPLOAD_FILE",
        `Uploaded: ${originalName} as ${name}`,
      );
    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Có lỗi xảy ra khi upload file.");
    }
  },
};
