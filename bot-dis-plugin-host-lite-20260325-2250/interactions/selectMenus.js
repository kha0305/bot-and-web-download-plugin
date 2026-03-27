const Logger = require("../utils/Logger");
const PluginManager = require("../utils/PluginManager");
const ModrinthAPI = require("../utils/ModrinthAPI");
const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const LoadBalancer = require("../utils/LoadBalancer");
const UserDataManager = require("../utils/UserDataManager");

module.exports = {
  async handle(interaction) {
    if (interaction.customId === "resource_type_select") {
      const selected = interaction.values[0];

      // 1. Search Modal
      if (selected === "action_search") {
        const modal = new ModalBuilder()
          .setCustomId("search_plugin_submission")
          .setTitle("Tìm kiếm Resource");
        const searchInput = new TextInputBuilder()
          .setCustomId("search_input")
          .setLabel("Nhập tên file cần tìm")
          .setStyle(TextInputStyle.Short);
        modal.addComponents(new ActionRowBuilder().addComponents(searchInput));
        await interaction.showModal(modal);
        return;
      }

      // 1b. Coming Soon
      if (
        selected === "type_Models" ||
        selected === "type_Setups" ||
        selected === "type_Configs"
      ) {
        return interaction.reply({
          content:
            "🚧 **Tính năng này đang phát triển!** (Coming Soon)\nVui lòng quay lại sau.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // 2. Filter & List
      try {
        const allData = PluginManager.getAll();
        let filtered = [];
        let label = "";

        if (selected === "type_Plugins") {
          filtered = allData.filter((p) => !p.storageName.startsWith("_"));
          label = "Plugins";
        } else {
          filtered = allData.filter((p) => p.storageName.startsWith("_Others"));
          label = "Others";
        }

        if (filtered.length === 0) {
          return interaction.reply({
            content: `⚠️ Chưa có dữ liệu cho mục **${label}**.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const categories = new Set();
        filtered.forEach((p) => {
          const parts = p.storageName.split("/");
          if (parts.length > 1) {
            categories.add(parts[0]);
          } else {
            categories.add("Misc");
          }
        });

        const uniqueCats = Array.from(categories).sort();

        // --- PAGINATION (Page 0) ---
        const PAGE_SIZE = 25;
        const bucket = uniqueCats.slice(0, PAGE_SIZE);

        const options = bucket.map((cat) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat.startsWith("_") ? cat.substring(1) : cat)
            .setDescription(
              `Có ${
                filtered.filter((p) =>
                  cat === "Misc"
                    ? !p.storageName.includes("/")
                    : p.storageName.startsWith(cat + "/"),
                ).length
              } files`,
            )
            .setValue(cat),
        );

        const select = new StringSelectMenuBuilder()
          .setCustomId("category_select")
          .setPlaceholder(`Chọn danh mục trong ${label} (Trang 1)`)
          .addOptions(options);

        // Buttons
        const btnPrev = new ButtonBuilder()
          .setCustomId(`btn_nav_cat_-1_${selected}`)
          .setLabel("Trước")
          .setEmoji("⬅️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const btnNext = new ButtonBuilder()
          .setCustomId(`btn_nav_cat_1_${selected}`)
          .setLabel("Tiếp")
          .setEmoji("➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(uniqueCats.length <= PAGE_SIZE);

        const row = new ActionRowBuilder().addComponents(select);
        const rowNav = new ActionRowBuilder().addComponents(btnPrev, btnNext);

        await interaction.reply({
          content: `📂 **${label}**: Tìm thấy **${filtered.length}** files trong **${uniqueCats.length}** danh mục (Trang 1).`,
          components: [row, rowNav],
          flags: MessageFlags.Ephemeral,
        });
      } catch (e) {
        console.error(e);
        const replyMethod =
          interaction.deferred || interaction.replied ? "followUp" : "reply";
        await interaction[replyMethod]({
          content: "Lỗi hệ thống.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.customId === "category_select") {
      const category = interaction.values[0];

      try {
        const plugins = PluginManager.getAll();
        const categoryPlugins = plugins.filter((p) => {
          if (category === "Misc") return !p.storageName.includes("/");
          return p.storageName.startsWith(category + "/");
        });

        if (categoryPlugins.length === 0) {
          await interaction.reply({
            content: "Không có plugin nào trong danh mục này.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        categoryPlugins.sort((a, b) =>
          a.originalName.localeCompare(b.originalName),
        );
        const slicedPlugins = categoryPlugins.slice(0, 25);

        const select = new StringSelectMenuBuilder()
          .setCustomId("download_plugin_select")
          .setPlaceholder(`Chọn phiên bản cho ${category}`)
          .addOptions(
            slicedPlugins.map((p) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(p.originalName)
                .setDescription(
                  p.uploadDate
                    ? `Upload: ${new Date(p.uploadDate).toLocaleDateString()}`
                    : "No date",
                )
                .setValue(p.id),
            ),
          );

        const row = new ActionRowBuilder().addComponents(select);
        await interaction.reply({
          content: `Các phiên bản có sẵn trong **${category}**:`,
          components: [row],
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "Lỗi khi lấy danh sách plugin.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.customId === "download_plugin_select") {
      const pluginId = interaction.values[0];

      // Load Balancer Check
      const workerId = LoadBalancer.startRequest();
      if (!workerId) {
        return interaction.reply({
          content:
            "⚠️ **Hệ thống đang quá tải!**\nTất cả các luồng tải xuống đều đầy. Vui lòng thử lại sau ít phút.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Defer reply để tránh timeout (Error 10062)
      await interaction.deferReply({ ephemeral: true });

      try {
        const plugin = PluginManager.getById(pluginId);
        if (!plugin) {
          LoadBalancer.endRequest(workerId);
          await interaction.editReply({
            content: "Plugin không tồn tại hoặc đã bị xóa.",
          });
          return;
        }

        const filePath = path.join(
          __dirname,
          "../data/files",
          plugin.storageName,
        );
        if (!fs.existsSync(filePath)) {
          LoadBalancer.endRequest(workerId);
          await interaction.editReply({
            content: "File plugin không tìm thấy trong hệ thống.",
          });
          return;
        }

        await interaction.editReply({
          content: `✅ **Download Success** (Line ${workerId})\nPlugin: **${
            plugin.name
          }**\n${LoadBalancer.getStatus()}`,
          files: [{ attachment: filePath, name: plugin.originalName }],
        });

        Logger.log(
          interaction.user,
          "DOWNLOAD",
          `Downloaded plugin: ${plugin.originalName} (${plugin.id})`,
        );

        // Lưu vào download history
        UserDataManager.addDownload(
          interaction.user.id,
          pluginId,
          plugin.originalName,
        );

        // Record global stats
        try {
          const { statsManager } = require("../dashboard/server");
          if (statsManager) {
            statsManager.addDownload(
              pluginId,
              plugin.name,
              interaction.user.id,
            );
          }
        } catch (e) {
          console.error("Failed to record global stats:", e.message);
        }

        LoadBalancer.endRequest(workerId);
      } catch (error) {
        console.error(error);
        LoadBalancer.endRequest(workerId);
        // Kiểm tra nếu interaction đã được defer/reply chưa để dùng hàm phù hợp
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "Lỗi khi xử lý yêu cầu.",
          });
        } else {
          await interaction.reply({
            content: "Lỗi khi xử lý yêu cầu.",
            ephemeral: true,
          });
        }
      }
    } else if (interaction.customId === "admin_confirm_delete_select") {
      if (process.env.ADMIN_ID && interaction.user.id !== process.env.ADMIN_ID)
        return;

      const pluginId = interaction.values[0];

      try {
        const plugin = PluginManager.getById(pluginId);
        if (!plugin) {
          await interaction.update({
            content: "❌ File không tồn tại trong DB.",
            components: [],
          });
          return;
        }

        const filePath = path.join(
          __dirname,
          "../data/files",
          plugin.storageName,
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        PluginManager.delete(pluginId);

        await interaction.update({
          content: `✅ **ĐÃ XÓA THÀNH CÔNG**: \`${plugin.originalName}\``,
          components: [],
        });

        Logger.log(
          interaction.user,
          "DELETE",
          `Deleted plugin: ${plugin.originalName} (${plugin.id})`,
        );
      } catch (e) {
        console.error(e);
        await interaction.reply({
          content: "Lỗi khi xóa file.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    // --- LOOKUP HANDLERS ---
    else if (interaction.customId === "lookup_category_select") {
      const value = interaction.values[0]; // lookup_cat_{category}
      const category = value.replace("lookup_cat_", "");

      try {
        const plugins = PluginManager.getAll();
        const categoryPlugins = plugins.filter((p) => {
          if (category === "Misc") return !p.storageName.includes("/");
          return p.storageName.startsWith(category + "/");
        });

        if (categoryPlugins.length === 0) {
          return interaction.reply({
            content: "Không có plugin nào trong danh mục này.",
            flags: MessageFlags.Ephemeral,
          });
        }

        categoryPlugins.sort((a, b) =>
          a.originalName.localeCompare(b.originalName),
        );
        const slicedPlugins = categoryPlugins.slice(0, 25);

        const options = slicedPlugins.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(p.originalName.substring(0, 100))
            .setDescription(
              `Ver: ${p.version || "?"} | MC: ${p.supportedVersion || "?"}`,
            )
            .setValue(`lookup_plugin_${p.id}`),
        );

        const select = new StringSelectMenuBuilder()
          .setCustomId("lookup_plugin_select")
          .setPlaceholder(`Chọn plugin trong ${category}`)
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.reply({
          content: `📂 **${category}**: Có **${categoryPlugins.length}** plugins. Chọn để xem chi tiết:`,
          components: [row],
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "Lỗi khi lấy danh sách plugin.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.customId === "lookup_plugin_select") {
      const value = interaction.values[0]; // lookup_plugin_{id}
      const pluginId = value.replace("lookup_plugin_", "");

      // Defer reply since API call may take time
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const plugin = PluginManager.getById(pluginId);
        if (!plugin) {
          return interaction.editReply({
            content: "Plugin không tồn tại hoặc đã bị xóa.",
          });
        }

        // Fetch MC versions from Modrinth if not cached
        let mcVersionDisplay = "Unknown";
        if (plugin.mcVersionRange && plugin.mcVersionRange !== "Unknown") {
          // Already have cached data
          mcVersionDisplay = plugin.mcVersionRange;
        } else {
          // Try to fetch from Modrinth
          try {
            const cleanName = plugin.name
              .replace(/\s+v?\d+.*$/i, "") // Remove version
              .replace(/[-_]/g, " ")
              .trim();

            const result = await ModrinthAPI.getPluginVersions(cleanName);

            if (result.found && result.minVersion) {
              mcVersionDisplay = ModrinthAPI.formatVersionRange(
                result.minVersion,
                result.maxVersion,
              );
              // Cache the result
              plugin.mcVersionRange = mcVersionDisplay;
              plugin.modrinthSlug = result.modrinthSlug;
              // Save to database (async, don't wait)
              PluginManager.save();
            } else if (
              plugin.supportedVersion &&
              plugin.supportedVersion !== "Unknown"
            ) {
              mcVersionDisplay = `${plugin.supportedVersion}+ (api-version)`;
            }
          } catch (apiError) {
            console.error("Modrinth API error:", apiError.message);
            // Fallback to api-version
            if (
              plugin.supportedVersion &&
              plugin.supportedVersion !== "Unknown"
            ) {
              mcVersionDisplay = `${plugin.supportedVersion}+ (api-version)`;
            }
          }
        }

        // Build detailed embed
        const { EmbedBuilder } = require("discord.js");

        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📋 ${plugin.name}`)
          .setDescription(plugin.description || "Không có mô tả.")
          .addFields(
            {
              name: "📦 Tên file",
              value: `\`${plugin.originalName}\``,
              inline: false,
            },
            {
              name: "🔢 Phiên bản Plugin",
              value: String(plugin.version || "Unknown"),
              inline: true,
            },
            {
              name: "🎮 Hỗ trợ MC",
              value: mcVersionDisplay,
              inline: true,
            },
            {
              name: "📅 Ngày upload",
              value: plugin.uploadDate
                ? new Date(plugin.uploadDate).toLocaleDateString("vi-VN")
                : "N/A",
              inline: true,
            },
          );

        // Dependencies (combined depend + softdepend)
        const deps = plugin.dependencies || [];
        if (deps.length > 0) {
          // Limit to first 20 to avoid embed size limit
          const displayDeps = deps.slice(0, 20);
          let depText = displayDeps.map((d) => `• ${d}`).join("\n");
          if (deps.length > 20) {
            depText += `\n... và ${deps.length - 20} plugin khác`;
          }
          embed.addFields({
            name: "🔗 Tương thích / Yêu cầu (Dependencies)",
            value: depText,
            inline: false,
          });
        } else {
          embed.addFields({
            name: "🔗 Dependencies",
            value: "Không yêu cầu plugin nào khác.",
            inline: false,
          });
        }

        embed.setFooter({ text: `ID: ${plugin.id}` });

        await interaction.editReply({
          embeds: [embed],
        });
      } catch (error) {
        console.error(error);
        await interaction.editReply({
          content: "Lỗi khi xử lý yêu cầu tra cứu.",
        });
      }
    }
    // ============ FAVORITES DOWNLOAD SELECT ============
    else if (interaction.customId === "favorites_download_select") {
      const value = interaction.values[0]; // fav_download_{pluginId}
      const pluginId = value.replace("fav_download_", "");
      const userId = interaction.user.id;

      // Load Balancer Check
      const workerId = LoadBalancer.startRequest();
      if (!workerId) {
        return interaction.reply({
          content: "⚠️ **Hệ thống đang quá tải!** Vui lòng thử lại sau.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Defer reply để tránh timeout
      await interaction.deferReply({ ephemeral: true });

      try {
        const plugin = PluginManager.getById(pluginId);
        if (!plugin) {
          LoadBalancer.endRequest(workerId);
          return interaction.editReply({
            content: "❌ Plugin không tồn tại hoặc đã bị xóa khỏi hệ thống.",
          });
        }

        const filePath = path.join(
          __dirname,
          "../data/files",
          plugin.storageName,
        );
        if (!fs.existsSync(filePath)) {
          LoadBalancer.endRequest(workerId);
          return interaction.editReply({
            content: "❌ File không tìm thấy trong hệ thống.",
          });
        }

        // Lưu vào download history
        UserDataManager.addDownload(userId, pluginId, plugin.originalName);

        // Record global stats
        try {
          const { statsManager } = require("../dashboard/server");
          if (statsManager) {
            statsManager.addDownload(pluginId, plugin.name, userId);
          }
        } catch (e) {
          console.error("Failed to record global stats:", e.message);
        }

        // Kiểm tra user đã rate chưa để hiển thị inline rating
        const userRating = UserDataManager.getRating(userId, pluginId);
        const avgRating = UserDataManager.getAverageRating(pluginId);

        let ratingInfo = "";
        if (avgRating.count > 0) {
          ratingInfo = `\n⭐ Rating: ${avgRating.average}/5 (${avgRating.count} lượt)`;
        }
        if (!userRating) {
          ratingInfo += "\n💡 Dùng `/rate` để đánh giá plugin này!";
        }

        await interaction.editReply({
          content: `✅ **Download Success** (Line ${workerId})\nPlugin: **${
            plugin.name
          }**${ratingInfo}\n${LoadBalancer.getStatus()}`,
          files: [{ attachment: filePath, name: plugin.originalName }],
        });

        Logger.log(
          interaction.user,
          "DOWNLOAD",
          `Downloaded from favorites: ${plugin.originalName} (${plugin.id})`,
        );

        LoadBalancer.endRequest(workerId);
      } catch (error) {
        console.error("Favorites download error:", error);
        LoadBalancer.endRequest(workerId);
        // Kiểm tra nếu interaction đã được defer/reply chưa
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "Lỗi khi tải file từ favorites.",
          });
        } else {
          await interaction.reply({
            content: "Lỗi khi tải file từ favorites.",
            ephemeral: true,
          });
        }
      }
    }
    // ============ TEXT SEARCH SELECT ============
    else if (interaction.customId === "textsearch_select") {
      const value = interaction.values[0]; // textsearch_dl_{pluginId}
      const pluginId = value.replace("textsearch_dl_", "");
      const userId = interaction.user.id;

      // Load Balancer Check
      const workerId = LoadBalancer.startRequest();
      if (!workerId) {
        return interaction.reply({
          content: "⚠️ **Hệ thống đang quá tải!** Vui lòng thử lại sau.",
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        const plugin = PluginManager.getById(pluginId);
        if (!plugin) {
          LoadBalancer.endRequest(workerId);
          return interaction.reply({
            content: "❌ Plugin không tồn tại hoặc đã bị xóa.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const filePath = path.join(
          __dirname,
          "../data/files",
          plugin.storageName,
        );
        if (!fs.existsSync(filePath)) {
          LoadBalancer.endRequest(workerId);
          return interaction.reply({
            content: "❌ File không tìm thấy trong hệ thống.",
            flags: MessageFlags.Ephemeral,
          });
        }

        // Lưu vào download history
        UserDataManager.addDownload(userId, pluginId, plugin.originalName);

        // Record global stats
        try {
          const { statsManager } = require("../dashboard/server");
          if (statsManager) {
            statsManager.addDownload(pluginId, plugin.name, userId);
          }
        } catch (e) {
          console.error("Failed to record global stats:", e.message);
        }

        // Gửi file công khai (không ephemeral) để người khác thấy
        await interaction.reply({
          content: `📦 **${plugin.name}**\n📥 Người tải: <@${userId}>`,
          files: [{ attachment: filePath, name: plugin.originalName }],
        });

        Logger.log(
          interaction.user,
          "TEXT_SEARCH_DOWNLOAD",
          `Downloaded via text search: ${plugin.originalName} (${plugin.id})`,
        );

        LoadBalancer.endRequest(workerId);
      } catch (error) {
        console.error("TextSearch download error:", error);
        LoadBalancer.endRequest(workerId);
        await interaction.reply({
          content: "❌ Lỗi khi tải file.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    // ============ TEXT SEARCH CATEGORY SELECT (Bước 2) ============
    else if (interaction.customId === "textsearch_category_select") {
      const value = interaction.values[0]; // textsearch_cat_{categoryName}
      const categoryName = value.replace("textsearch_cat_", "");

      try {
        const TextSearchHandler = require("../utils/TextSearchHandler");
        const plugins = TextSearchHandler.getCategoryVersions(categoryName);

        if (plugins.length === 0) {
          return interaction.reply({
            content: "❌ Không tìm thấy phiên bản nào trong danh mục này.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const { EmbedBuilder } = require("discord.js");

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`📁 ${categoryName}`)
          .setDescription(
            `Tìm thấy **${plugins.length}** phiên bản\n\n` +
              `Chọn phiên bản từ danh sách bên dưới để tải:`,
          );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("textsearch_select")
          .setPlaceholder(`📦 Chọn phiên bản ${categoryName} để tải...`)
          .addOptions(
            plugins.map((plugin, index) => {
              return new StringSelectMenuOptionBuilder()
                .setLabel(plugin.originalName.slice(0, 100))
                .setDescription(
                  plugin.uploadDate
                    ? `Upload: ${new Date(plugin.uploadDate).toLocaleDateString("vi-VN")}`
                    : "Plugin Minecraft",
                )
                .setValue(`textsearch_dl_${plugin.id}`)
                .setEmoji("📦");
            }),
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
          embeds: [embed],
          components: [row],
        });

        Logger.log(
          interaction.user,
          "TEXT_SEARCH",
          `Selected category "${categoryName}", showing ${plugins.length} versions`,
        );
      } catch (error) {
        console.error("TextSearch category select error:", error);
        await interaction.reply({
          content: "❌ Lỗi khi tải danh sách phiên bản.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
