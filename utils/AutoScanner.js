const PluginManager = require("./PluginManager");
const FileScanner = require("./FileScanner");

class AutoScanner {
  constructor(client, intervalMinutes = 30) {
    this.client = client;
    this.intervalMinutes = intervalMinutes;
    this.intervalId = null;
    this.adminId = process.env.ADMIN_ID;
    this.knownFiles = new Set();
    this.isInitialized = false;
  }

  // Khởi động auto scan
  start() {
    console.log(
      `[AutoScanner] Starting auto scan every ${this.intervalMinutes} minutes...`
    );

    // Lần đầu: Load danh sách file hiện có (không thông báo)
    this.initializeKnownFiles();

    // Đặt interval
    this.intervalId = setInterval(() => {
      this.scan();
    }, this.intervalMinutes * 60 * 1000);

    console.log("[AutoScanner] Auto scan started successfully!");
  }

  // Dừng auto scan
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[AutoScanner] Auto scan stopped.");
    }
  }

  // Khởi tạo danh sách file đã biết
  initializeKnownFiles() {
    try {
      const allFiles = FileScanner.getAllFiles(FileScanner.FILES_DIR);
      this.knownFiles = new Set(allFiles.map((f) => f.storageName));
      this.isInitialized = true;
      console.log(
        `[AutoScanner] Initialized with ${this.knownFiles.size} known files.`
      );
    } catch (e) {
      console.error("[AutoScanner] Error initializing:", e);
    }
  }

  // Quét và phát hiện file mới
  async scan() {
    console.log("[AutoScanner] Running scheduled scan...");

    if (!this.isInitialized) {
      this.initializeKnownFiles();
      return;
    }

    try {
      const allFiles = FileScanner.getAllFiles(FileScanner.FILES_DIR);
      const currentFiles = new Set(allFiles.map((f) => f.storageName));
      const newFileStorageNames = new Set(
        allFiles
          .filter((f) => !this.knownFiles.has(f.storageName))
          .map((f) => f.storageName),
      );

      const syncResult = FileScanner.syncDatabase(PluginManager.getAll(), {
        descriptionForNew: "Tự động phát hiện bởi AutoScanner",
        uploadedBy: "AutoScanner",
        scannedFiles: allFiles,
      });

      const hasDbChange =
        syncResult.addedCount > 0 ||
        syncResult.updatedCount > 0 ||
        syncResult.removedCount > 0;

      if (hasDbChange) {
        PluginManager.setAll(syncResult.plugins);
      }

      const addedPlugins = syncResult.addedPlugins.filter((plugin) =>
        newFileStorageNames.has(plugin.storageName),
      );

      if (addedPlugins.length > 0) {
        console.log(`[AutoScanner] Found ${addedPlugins.length} new file(s)!`);

        // Thông báo admin
        await this.notifyAdmin(addedPlugins);

        // Cập nhật tất cả dashboard menus
        try {
          const DashboardManager = require("./DashboardManager");
          await DashboardManager.updateAll(this.client);
        } catch (e) {
          console.error(
            "[AutoScanner] Failed to update dashboards:",
            e.message
          );
        }
      } else if (hasDbChange) {
        console.log(
          `[AutoScanner] Synced DB (updated: ${syncResult.updatedCount}, removed: ${syncResult.removedCount}).`,
        );
      } else {
        console.log("[AutoScanner] No new files found.");
      }

      // Cập nhật known files (loại bỏ file đã xóa)
      this.knownFiles = currentFiles;
    } catch (e) {
      console.error("[AutoScanner] Error during scan:", e);
    }
  }

  // Thông báo admin về file mới
  async notifyAdmin(addedPlugins) {
    if (!this.adminId || addedPlugins.length === 0) return;

    try {
      const adminUser = await this.client.users.fetch(this.adminId);
      const { EmbedBuilder } = require("discord.js");

      // Chia thành các batch nhỏ (mỗi batch tối đa 10 file)
      const BATCH_SIZE = 10;
      const batches = [];

      for (let i = 0; i < addedPlugins.length; i += BATCH_SIZE) {
        batches.push(addedPlugins.slice(i, i + BATCH_SIZE));
      }

      // Gửi tin nhắn đầu tiên với tổng quan
      const summaryEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("📦 Phát Hiện File Mới!")
        .setDescription(
          `AutoScanner đã phát hiện **${addedPlugins.length}** file mới được upload vào hệ thống.\n\n` +
            `📊 Tổng số tin nhắn: ${batches.length}`
        )
        .setFooter({ text: "AutoScanner System" })
        .setTimestamp();

      await adminUser.send({ embeds: [summaryEmbed] });

      // Gửi từng batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const startNum = batchIndex * BATCH_SIZE + 1;

        const fileList = batch
          .map((p, i) => {
            const num = startNum + i;
            return `**${num}. ${p.name}**\n└ \`${p.originalName}\`\n└ Ver: ${p.version} | MC: ${p.supportedVersion}`;
          })
          .join("\n\n");

        const batchEmbed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📋 Danh sách file (${batchIndex + 1}/${batches.length})`)
          .setDescription(fileList)
          .setFooter({
            text: `File ${startNum}-${startNum + batch.length - 1} / ${
              addedPlugins.length
            }`,
          });

        await adminUser.send({ embeds: [batchEmbed] });

        // Delay nhẹ để tránh rate limit
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(
        `[AutoScanner] Admin notified with ${batches.length} message(s).`
      );
    } catch (e) {
      console.error("[AutoScanner] Failed to notify admin:", e.message);
    }
  }

  // Scan thủ công (có thể gọi từ command)
  async manualScan() {
    console.log("[AutoScanner] Manual scan triggered...");
    await this.scan();
  }

  // Đổi interval
  setInterval(minutes) {
    this.intervalMinutes = minutes;
    if (this.intervalId) {
      this.stop();
      this.start();
    }
    console.log(`[AutoScanner] Interval changed to ${minutes} minutes.`);
  }

  // Lấy trạng thái
  getStatus() {
    return {
      running: this.intervalId !== null,
      interval: this.intervalMinutes,
      knownFiles: this.knownFiles.size,
      lastCheck: new Date().toLocaleString("vi-VN"),
    };
  }
}

module.exports = AutoScanner;
