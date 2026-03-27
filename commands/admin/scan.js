const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const PluginManager = require("../../utils/PluginManager");
const Logger = require("../../utils/Logger");
const FileScanner = require("../../utils/FileScanner");

function getAllFilesFlat(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFilesFlat(filePath));
      return;
    }
    if (file !== ".gitkeep") {
      results.push(filePath);
    }
  });

  return results;
}

function removeEmptyDirs(dir, rootDir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir);
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      removeEmptyDirs(fullPath, rootDir);
    }
  });

  if (dir !== rootDir && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

function reorganizeFiles(filesDir) {
  const filesToMove = getAllFilesFlat(filesDir);
  let movedCount = 0;
  let skippedCount = 0;

  for (const fullPath of filesToMove) {
    const relativePath = path.relative(filesDir, fullPath);

    if (relativePath.split(path.sep).some((part) => part.startsWith("_"))) {
      continue;
    }

    const fileName = path.basename(fullPath);
    const nameWithoutExt = path.parse(fullPath).name;
    const versionRegex = /(?:[-_.\s]+(?:v|V|R|r)?\d)|(?:\d+\.\d+)/;

    let pluginName = nameWithoutExt.split(versionRegex)[0];
    pluginName = pluginName.replace(/[-_.\s]+$/, "");
    if (!pluginName || pluginName.length < 2) {
      pluginName = "Misc";
    }

    const safeFolderName = pluginName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const targetFolder = path.join(filesDir, safeFolderName);
    const targetPath = path.join(targetFolder, fileName);

    if (fullPath === targetPath) {
      continue;
    }

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    if (fs.existsSync(targetPath)) {
      skippedCount++;
      continue;
    }

    try {
      fs.renameSync(fullPath, targetPath);
      movedCount++;
    } catch (err) {
      console.error(`[Scan] Move failed for ${fileName}:`, err.message);
      skippedCount++;
    }
  }

  removeEmptyDirs(filesDir, filesDir);
  return { movedCount, skippedCount };
}

function buildSummaryMessage(syncResult, moveResult) {
  let message = "✅ **Quét hoàn tất!** (Sync Database)\n";
  message += `- Tổng số file hiện tại: ${syncResult.allFiles.length}.\n`;
  message += `- Tái sắp xếp file: moved **${moveResult.movedCount}**, skipped **${moveResult.skippedCount}**.\n`;

  if (syncResult.addedCount > 0) {
    message += `- Đã thêm mới: **${syncResult.addedCount}** plugins.\n`;
  }
  if (syncResult.updatedCount > 0) {
    message += `- Đã cập nhật metadata: **${syncResult.updatedCount}** plugins.\n`;
  }
  if (syncResult.removedCount > 0) {
    message += `- Đã xóa bản ghi lỗi/cũ: **${syncResult.removedCount}**.\n`;
  }

  if (
    syncResult.addedCount === 0 &&
    syncResult.updatedCount === 0 &&
    syncResult.removedCount === 0
  ) {
    message += "- Dữ liệu đã đồng bộ, không có thay đổi.\n";
  }

  return message;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("scan")
    .setDescription("Quét toàn bộ thư mục data/files (bao gồm thư mục con)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (process.env.ADMIN_ID && interaction.user.id !== process.env.ADMIN_ID) {
      return interaction.reply({
        content: "🚫 Bạn không có quyền sử dụng lệnh này (Admin Only).",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const filesDir = FileScanner.FILES_DIR;
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    let moveResult = { movedCount: 0, skippedCount: 0 };
    try {
      moveResult = reorganizeFiles(filesDir);
    } catch (error) {
      console.error("[Scan] Error while reorganizing files:", error);
    }

    const syncResult = FileScanner.syncDatabase(PluginManager.getAll(), {
      descriptionForNew: "Tự động import",
      uploadedBy: "System Scan",
    });

    PluginManager.setAll(syncResult.plugins);

    try {
      const replyMsg = buildSummaryMessage(syncResult, moveResult);
      await interaction.editReply(replyMsg);

      try {
        const DashboardManager = require("../../utils/DashboardManager");
        await DashboardManager.updateAll(interaction.client);
        console.log("[Scan] Dashboards updated.");
      } catch (e) {
        console.error("[Scan] Failed to update dashboards:", e.message);
      }

      const notifyChannelId = process.env.NOTIFY_CHANNEL_ID;
      const hasChanges =
        syncResult.addedCount > 0 ||
        syncResult.updatedCount > 0 ||
        syncResult.removedCount > 0;

      if (notifyChannelId && hasChanges) {
        try {
          const { EmbedBuilder } = require("discord.js");
          const notifyChannel =
            await interaction.client.channels.fetch(notifyChannelId);

          if (notifyChannel) {
            const notifyEmbed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle("📢 Cập Nhật Kho Tài Nguyên!")
              .setDescription(
                `Admin **${interaction.user.username}** vừa cập nhật hệ thống.`,
              )
              .addFields({
                name: "📊 Thống kê",
                value:
                  `📦 Tổng tài nguyên: **${syncResult.allFiles.length}**\n` +
                  `➕ Thêm mới: **${syncResult.addedCount}**\n` +
                  `🛠️ Cập nhật metadata: **${syncResult.updatedCount}**\n` +
                  `➖ Đã xóa: **${syncResult.removedCount}**`,
                inline: false,
              });

            if (syncResult.addedPlugins.length > 0) {
              const fullList = syncResult.addedPlugins
                .map((p, i) => `${i + 1}. ${p.name}`)
                .join("\n");

              const chunks = [];
              let currentChunk = "";
              for (const line of fullList.split("\n")) {
                if (currentChunk.length + line.length + 1 > 1000) {
                  chunks.push(currentChunk);
                  currentChunk = "";
                }
                currentChunk += `${line}\n`;
              }
              if (currentChunk) chunks.push(currentChunk);

              chunks.slice(0, 5).forEach((chunk, index) => {
                notifyEmbed.addFields({
                  name: index === 0 ? "🆕 Plugin mới thêm" : "➡ Tiếp theo...",
                  value: chunk,
                  inline: false,
                });
              });

              if (chunks.length > 5) {
                notifyEmbed.addFields({
                  name: "⚠️",
                  value: "... danh sách quá dài, không thể hiển thị hết.",
                  inline: false,
                });
              }
            }

            notifyEmbed
              .setFooter({ text: "Sử dụng /menu để xem và tải về!" })
              .setTimestamp();

            await notifyChannel.send({ embeds: [notifyEmbed] });
            console.log("[Scan] Notification sent to channel.");
          }
        } catch (error) {
          console.error("[Scan] Failed to send notification:", error.message);
        }
      }

      Logger.log(
        interaction.user,
        "SCAN_SYSTEM",
        `Scan finished. Found: ${syncResult.allFiles.length}, Added: ${syncResult.addedCount}, Updated: ${syncResult.updatedCount}, Removed: ${syncResult.removedCount}`,
      );
    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Lỗi khi lưu cơ sở dữ liệu.");
    }
  },
};
