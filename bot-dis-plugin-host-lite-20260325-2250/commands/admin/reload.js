const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reloads all commands (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (process.env.ADMIN_ID && interaction.user.id !== process.env.ADMIN_ID) {
      return interaction.reply({
        content: "🚫 Admin only.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const foldersPath = path.join(__dirname, "../../commands");
    const commandFolders = fs.readdirSync(foldersPath);
    let reloadedCount = 0;

    try {
      for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        if (!fs.statSync(commandsPath).isDirectory()) continue;

        const commandFiles = fs
          .readdirSync(commandsPath)
          .filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
          const filePath = path.join(commandsPath, file);

          // Delete from cache
          delete require.cache[require.resolve(filePath)];

          // Re-load
          try {
            const newCommand = require(filePath);
            interaction.client.commands.set(newCommand.data.name, newCommand);
            reloadedCount++;
          } catch (error) {
            console.error(`Error reloading ${file}:`, error);
          }
        }
      }
      await interaction.editReply(
        `✅ Đã reload **${reloadedCount}** lệnh!\n⚠️ Lưu ý: Các thay đổi trong \`index.js\` vẫn cần khởi động lại bot.`,
      );
    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Có lỗi khi reload commands.");
    }
  },
};
