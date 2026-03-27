const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const PluginManager = require("../utils/PluginManager");
const LoadBalancer = require("../utils/LoadBalancer");
const UserDataManager = require("../utils/UserDataManager");
const Translator = require("../utils/Translator");

module.exports = {
  async handle(interaction) {
    if (interaction.customId === "btn_download_menu") {
      const subEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("📂 Kho Tài Nguyên")
        .setDescription("Bạn muốn tải tài nguyên loại nào?");

      const select = new StringSelectMenuBuilder()
        .setCustomId("resource_type_select")
        .setPlaceholder("Chọn loại tài nguyên...")
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Plugins Minecraft (.jar)")
            .setDescription("Plugin cho Spigot/Paper/Folia")
            .setValue("type_Plugins")
            .setEmoji("🧩"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Models & Packs")
            .setDescription("Resource Pack, Oraxen/ItemsAdder Models")
            .setValue("type_Models")
            .setEmoji("🎨"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Server Setups")
            .setDescription("Máy chủ cài đặt sẵn (Setup)")
            .setValue("type_Setups")
            .setEmoji("🏗️"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Configs (.yml)")
            .setDescription("File cấu hình mẫu")
            .setValue("type_Configs")
            .setEmoji("⚙️"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Tìm kiếm (Search)")
            .setDescription("Tìm file bất kỳ")
            .setValue("action_search")
            .setEmoji("🔎"),
        );

      const row = new ActionRowBuilder().addComponents(select);

      await interaction.reply({
        embeds: [subEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "open_search_modal") {
      const modal = new ModalBuilder()
        .setCustomId("search_plugin_submission")
        .setTitle("Tìm kiếm Plugin");

      const searchInput = new TextInputBuilder()
        .setCustomId("search_input")
        .setLabel("Nhập tên plugin cần tìm")
        .setStyle(TextInputStyle.Short);

      const firstActionRow = new ActionRowBuilder().addComponents(searchInput);
      modal.addComponents(firstActionRow);
      await interaction.showModal(modal);
    } else if (interaction.customId === "show_categories") {
      try {
        const plugins = PluginManager.getAll();
        const categories = new Set();
        plugins.forEach((p) => {
          if (!p.storageName.startsWith("_")) {
            if (p.storageName.includes("/")) {
              categories.add(p.storageName.split("/")[0]);
            } else {
              categories.add("Misc");
            }
          }
        });

        const uniqueCategories = Array.from(categories).sort().slice(0, 25);

        if (uniqueCategories.length === 0) {
          await interaction.reply({
            content: "Chưa có dữ liệu danh mục Plugin.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const select = new StringSelectMenuBuilder()
          .setCustomId("category_select")
          .setPlaceholder("Chọn danh mục plugin")
          .addOptions(
            uniqueCategories.map((cat) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(cat)
                .setDescription(`Xem các phiên bản của ${cat}`)
                .setValue(cat),
            ),
          );

        const row = new ActionRowBuilder().addComponents(select);
        await interaction.reply({
          content: `Tìm thấy ${categories.size} danh mục:`,
          components: [row],
          flags: MessageFlags.Ephemeral,
        });
      } catch (e) {
        await interaction.reply({
          content: "Lỗi đọc dữ liệu.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.customId === "btn_utilities") {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle("🛠️ Tiện ích")
        .setDescription("Chọn tiện ích bạn muốn sử dụng:");

      const btnTranslate = new ButtonBuilder()
        .setCustomId("btn_translate_menu")
        .setLabel("Dịch File/Text")
        .setEmoji("🌐")
        .setStyle(ButtonStyle.Secondary);

      const btnLookup = new ButtonBuilder()
        .setCustomId("btn_lookup_menu")
        .setLabel("Tra cứu Plugin")
        .setEmoji("🔍")
        .setStyle(ButtonStyle.Secondary);

      const btnSearchResource = new ButtonBuilder()
        .setCustomId("btn_search_resource")
        .setLabel("Tìm kiếm Tài nguyên")
        .setEmoji("📂")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(
        btnTranslate,
        btnLookup,
        btnSearchResource,
      );
      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "open_request_modal") {
      const modal = new ModalBuilder()
        .setCustomId("request_submission")
        .setTitle("Yêu cầu Plugin mới");

      const nameInput = new TextInputBuilder()
        .setCustomId("req_name")
        .setLabel("Tên Plugin")
        .setPlaceholder("VD: EssentialsX, MythicMobs...")
        .setStyle(TextInputStyle.Short);

      const reasonInput = new TextInputBuilder()
        .setCustomId("req_reason")
        .setLabel("Mô tả / Link (Nếu có)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(reasonInput),
      );
      await interaction.showModal(modal);
    } else if (interaction.customId === "open_report_modal") {
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
        new ActionRowBuilder().addComponents(issueInput),
      );
      await interaction.showModal(modal);
    } else if (interaction.customId === "open_translate_modal") {
      const modal = new ModalBuilder()
        .setCustomId("translate_submission")
        .setTitle("Đóng góp Việt hóa");

      const nameInput = new TextInputBuilder()
        .setCustomId("trans_name")
        .setLabel("Tên Plugin")
        .setPlaceholder("VD: AuthMe, CMI...")
        .setStyle(TextInputStyle.Short);

      const contentInput = new TextInputBuilder()
        .setCustomId("trans_content")
        .setLabel("Nội dung / Link Pastebin / Drive...")
        .setStyle(TextInputStyle.Paragraph);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(contentInput),
      );
      await interaction.showModal(modal);
    } else if (interaction.customId === "btn_guide") {
      const guideEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("📖 Hướng dẫn sử dụng")
        .addFields(
          { name: "/search <tên>", value: "Tìm kiếm plugin nhanh." },
          { name: "/menu", value: "Mở dashboard điều khiển chính." },
          { name: "/scan", value: "Admin: Quét và cập nhật plugin mới." },
          {
            name: "Upload",
            value: "Kéo thả file vào Discord và dùng lệnh /upload.",
          },
        );
      await interaction.reply({
        embeds: [guideEmbed],
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "btn_user_info") {
      const user = interaction.user;
      const member = interaction.member;

      // Lấy thống kê người dùng
      const stats = UserDataManager.getStats(user.id);

      const infoEmbed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle("👤 Thông tin người dùng")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Tên hiển thị", value: user.tag, inline: true },
          { name: "ID", value: user.id, inline: true },
          {
            name: "Ngày tham gia",
            value: member.joinedAt
              ? member.joinedAt.toLocaleDateString("vi-VN")
              : "N/A",
            inline: true,
          },
          {
            name: "📥 Lượt tải",
            value: `\`${stats.totalDownloads}\``,
            inline: true,
          },
          {
            name: "⭐ Yêu thích",
            value: `\`${stats.totalFavorites}\``,
            inline: true,
          },
          {
            name: "🌟 Đã đánh giá",
            value: `\`${stats.totalRatings}\` plugin`,
            inline: true,
          },
        )
        .setFooter({
          text: "Dùng /favorites để xem danh sách yêu thích, /history để xem lịch sử",
        });

      // Quick action buttons
      const btnFavorites = new ButtonBuilder()
        .setCustomId("btn_open_favorites")
        .setLabel("Yêu thích")
        .setEmoji("⭐")
        .setStyle(ButtonStyle.Primary);

      const btnHistory = new ButtonBuilder()
        .setCustomId("btn_open_history")
        .setLabel("Lịch sử")
        .setEmoji("📜")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(
        btnFavorites,
        btnHistory,
      );

      await interaction.reply({
        embeds: [infoEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "btn_status") {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;

      const statusEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("📊 Trạng thái hệ thống")
        .addFields(
          {
            name: "⏱️ Uptime",
            value: `${hours}h ${minutes}m ${seconds}s`,
            inline: true,
          },
          {
            name: "💾 RAM Usage",
            value: `${memUsage.toFixed(2)} MB`,
            inline: true,
          },
          {
            name: "📶 Ping",
            value: `${interaction.client.ws.ping}ms`,
            inline: true,
          },
          {
            name: "⚡ Download Lines",
            value: LoadBalancer.getStatus(),
            inline: false,
          },
        );
      await interaction.reply({
        embeds: [statusEmbed],
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "admin_scan_trigger") {
      await interaction.reply({
        content:
          "⚡ Vui lòng sử dụng lệnh `/scan` để xem chi tiết quá trình quét.",
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "admin_upload_info") {
      await interaction.reply({
        content:
          "ℹ️ **Upload Tài Nguyên**:\nKéo file vào chat và gõ lệnh:\n`/upload name:<tên> file:<file_đính_kèm>`\nHỗ trợ: `.jar`, `.zip`, `.yml/.yaml/.ym`, `.txt`, `.md`, `.json`, `.properties`, `.conf`, `.lang`, `.toml`, `.ini`.",
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "admin_delete_menu") {
      const modal = new ModalBuilder()
        .setCustomId("admin_delete_search_submission")
        .setTitle("Xóa Plugin");

      const searchInput = new TextInputBuilder()
        .setCustomId("delete_input")
        .setLabel("Nhập tên plugin cần XÓA")
        .setStyle(TextInputStyle.Short);

      const firstActionRow = new ActionRowBuilder().addComponents(searchInput);
      modal.addComponents(firstActionRow);
      await interaction.showModal(modal);
    }
    // --- TRANSLATE MENU ---
    else if (interaction.customId === "btn_translate_menu") {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle("🌐 Dịch File/Text sang Tiếng Việt")
        .setDescription(
          "Chọn phương thức dịch:\n\n" +
            "📁 **Upload File**: Dùng lệnh `/dich file:<file_đính_kèm>`\n" +
            "📝 **Nhập Text**: Dịch văn bản trực tiếp (chọn engine bên dưới)",
        );

      const btnUploadFile = new ButtonBuilder()
        .setCustomId("btn_translate_file")
        .setLabel("Hướng dẫn Upload File")
        .setEmoji("📁")
        .setStyle(ButtonStyle.Primary);

      const btnTextGoogle = new ButtonBuilder()
        .setCustomId("btn_translate_text_google")
        .setLabel("Text (Google - Miễn phí)")
        .setEmoji("🆓")
        .setStyle(ButtonStyle.Secondary);

      const btnTextChatGPT = new ButtonBuilder()
        .setCustomId("btn_translate_text_chatgpt")
        .setLabel("Text (ChatGPT - Minecraft)")
        .setEmoji("⭐")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(
        btnUploadFile,
        btnTextGoogle,
        btnTextChatGPT,
      );
      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    }
    // --- TRANSLATE FILE ENGINE SELECTION ---
    else if (
      interaction.customId === "trans_engine_google" ||
      interaction.customId === "trans_engine_chatgpt"
    ) {
      const engine =
        interaction.customId === "trans_engine_chatgpt" ? "chatgpt" : "google";

      // Lấy thông tin file từ cache
      const fileInfo = interaction.client.translateCache.get(
        interaction.user.id,
      );

      if (!fileInfo) {
        return interaction.reply({
          content:
            "❌ Không tìm thấy thông tin file hoặc phiên làm việc đã hết hạn. Vui lòng chạy lại lệnh `/dich`.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Xóa cache để tránh leak mem
      interaction.client.translateCache.delete(interaction.user.id);

      // Kiểm tra API key nếu dùng ChatGPT
      if (engine === "chatgpt" && !Translator.getChatgptApiKey()) {
        return interaction.reply({
          content:
            "❌ Chưa cấu hình API Key cho ChatGPT/AgentRouter. Vui lòng dùng Google Translate.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();
      // Gọi Translator xử lý
      await Translator.translateFile(
        fileInfo.fileUrl,
        fileInfo.fileName,
        engine,
        interaction,
        {
          skill: Translator.getDefaultSkillId(),
          model: fileInfo.requestedModel,
          targetLanguage: fileInfo.targetLanguageId,
        },
      );
    }
    // --- TRANSLATE FILE INSTRUCTION ---
    else if (interaction.customId === "btn_translate_file") {
      await interaction.reply({
        content:
          "📁 **Hướng dẫn dịch file:**\n\n" +
          "1. Kéo thả file `.jar`, `.zip`, `.yml`, `.yaml`, `.ym`, `.txt`, `.md`, `.json`, `.properties`, `.conf`, `.lang`, `.toml`, `.ini`\n" +
          "2. Sử dụng lệnh `/dich file:<file_đính_kèm> model:<tùy_chọn> lang:<mã_ngôn_ngữ>`\n" +
          "3. Nếu là `.jar/.zip`, bot sẽ tự quét và chọn file config/lang phù hợp nhất để dịch\n" +
          "4. Chọn engine dịch (Google/ChatGPT) khi bot hỏi.\n\n" +
          "⏳ Bot sẽ hiển thị **thanh tiến trình** trong quá trình dịch.",
        flags: MessageFlags.Ephemeral,
      });
    }
    // --- TRANSLATE TEXT (Google) ---
    else if (interaction.customId === "btn_translate_text_google") {
      const modal = new ModalBuilder()
        .setCustomId("translate_text_google")
        .setTitle("🆓 Dịch bằng Google Translate");

      const textInput = new TextInputBuilder()
        .setCustomId("translate_text_input")
        .setLabel("Nhập văn bản cần dịch (Tiếng Anh)")
        .setPlaceholder("Enter text to translate...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);
      const langInput = new TextInputBuilder()
        .setCustomId("translate_target_lang")
        .setLabel("Mã ngôn ngữ đích (vd: vi, en, ja, th)")
        .setPlaceholder("vi")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(20);

      modal.addComponents(
        new ActionRowBuilder().addComponents(textInput),
        new ActionRowBuilder().addComponents(langInput),
      );
      await interaction.showModal(modal);
    }
    // --- TRANSLATE TEXT (ChatGPT) ---
    else if (interaction.customId === "btn_translate_text_chatgpt") {
      if (!Translator.getChatgptApiKey()) {
        return interaction.reply({
          content:
            "❌ Chưa cấu hình API Key cho ChatGPT/AgentRouter. Vui lòng dùng Google Translate.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const defaultSkill = Translator.getSkillProfile(
        Translator.getDefaultSkillId(),
      );
      const modal = new ModalBuilder()
        .setCustomId("translate_text_chatgpt")
        .setTitle(
          `⭐ ${Translator.getEngineName("chatgpt")} • ${defaultSkill.name}`,
        );

      const textInput = new TextInputBuilder()
        .setCustomId("translate_text_input")
        .setLabel("Nhập văn bản cần dịch (Tiếng Anh)")
        .setPlaceholder("Enter text to translate...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);
      const langInput = new TextInputBuilder()
        .setCustomId("translate_target_lang")
        .setLabel("Mã ngôn ngữ đích (vd: vi, en, ja, th)")
        .setPlaceholder("vi")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(20);

      modal.addComponents(
        new ActionRowBuilder().addComponents(textInput),
        new ActionRowBuilder().addComponents(langInput),
      );
      await interaction.showModal(modal);
    }
    // --- LEGACY: TRANSLATE TEXT MODAL (backward compatible) ---
    else if (interaction.customId === "btn_translate_text") {
      const modal = new ModalBuilder()
        .setCustomId("translate_text_google")
        .setTitle("🆓 Dịch bằng Google Translate");

      const textInput = new TextInputBuilder()
        .setCustomId("translate_text_input")
        .setLabel("Nhập văn bản cần dịch (Tiếng Anh)")
        .setPlaceholder("Enter text to translate...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);
      const langInput = new TextInputBuilder()
        .setCustomId("translate_target_lang")
        .setLabel("Mã ngôn ngữ đích (vd: vi, en, ja, th)")
        .setPlaceholder("vi")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(20);

      modal.addComponents(
        new ActionRowBuilder().addComponents(textInput),
        new ActionRowBuilder().addComponents(langInput),
      );
      await interaction.showModal(modal);
    }
    // --- LOOKUP MENU (Tra cứu) ---
    else if (interaction.customId === "btn_lookup_menu") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Progress indicator
      await interaction.editReply("⏳ Đang tải danh sách plugin...");

      try {
        const allPlugins = PluginManager.getAll();
        const plugins = allPlugins.filter(
          (p) => !p.storageName.startsWith("_"),
        );

        if (plugins.length === 0) {
          return interaction.editReply("⚠️ Chưa có plugin nào trong hệ thống.");
        }

        // Get unique categories
        const categories = new Set();
        plugins.forEach((p) => {
          const parts = p.storageName.split("/");
          if (parts.length > 1) {
            categories.add(parts[0]);
          } else {
            categories.add("Misc");
          }
        });

        const uniqueCats = Array.from(categories).sort();
        const PAGE_SIZE = 25;
        const bucket = uniqueCats.slice(0, PAGE_SIZE);

        const options = bucket.map((cat) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat)
            .setDescription(
              `Có ${
                plugins.filter((p) =>
                  cat === "Misc"
                    ? !p.storageName.includes("/")
                    : p.storageName.startsWith(cat + "/"),
                ).length
              } plugins`,
            )
            .setValue(`lookup_cat_${cat}`),
        );

        const select = new StringSelectMenuBuilder()
          .setCustomId("lookup_category_select")
          .setPlaceholder(
            `Chọn danh mục (Trang 1/${Math.ceil(
              uniqueCats.length / PAGE_SIZE,
            )})`,
          )
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        // Navigation buttons
        const totalPages = Math.ceil(uniqueCats.length / PAGE_SIZE);
        const btnPrev = new ButtonBuilder()
          .setCustomId("btn_lookup_cat_prev_0")
          .setLabel("Trước")
          .setEmoji("⬅️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const btnNext = new ButtonBuilder()
          .setCustomId("btn_lookup_cat_next_0")
          .setLabel("Tiếp")
          .setEmoji("➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(totalPages <= 1);

        const rowNav = new ActionRowBuilder().addComponents(btnPrev, btnNext);

        await interaction.editReply({
          content: `🔍 **Tra cứu Plugin**: Tìm thấy **${plugins.length}** plugins trong **${uniqueCats.length}** danh mục.\nTrang 1/${totalPages}`,
          components: [row, rowNav],
        });
      } catch (error) {
        console.error("Lookup menu error:", error);
        await interaction.editReply("❌ Đã xảy ra lỗi khi tải danh sách.");
      }
    }
    // --- SEARCH RESOURCE (Tìm kiếm tài nguyên) ---
    else if (interaction.customId === "btn_search_resource") {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle("📂 Tìm kiếm Tài nguyên")
        .setDescription("Chọn loại tài nguyên bạn muốn tìm:");

      const select = new StringSelectMenuBuilder()
        .setCustomId("resource_type_select")
        .setPlaceholder("Chọn loại tài nguyên...")
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Plugins Minecraft (.jar)")
            .setDescription("Plugin cho Spigot/Paper/Folia")
            .setValue("type_Plugins")
            .setEmoji("🧩"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Models & Packs")
            .setDescription("Resource Pack, Oraxen/ItemsAdder Models")
            .setValue("type_Models")
            .setEmoji("🎨"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Server Setups")
            .setDescription("Máy chủ cài đặt sẵn (Setup)")
            .setValue("type_Setups")
            .setEmoji("🏗️"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Configs (.yml)")
            .setDescription("File cấu hình mẫu")
            .setValue("type_Configs")
            .setEmoji("⚙️"),
        );

      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    }
    // --- LOGIC PHÂN TRANG DANH MỤC (New) ---
    else if (interaction.customId.startsWith("btn_nav_cat_")) {
      console.log(`[ButtonNav] Triggered: ${interaction.customId}`);

      // Defer ngay lập tức để tránh timeout 3 giây
      await interaction.deferUpdate();

      // Format: btn_nav_cat_{page}_{type}
      const parts = interaction.customId.split("_");
      const page = parseInt(parts[3], 10);
      const type = parts.slice(4).join("_"); // type_Plugins, type_Models, etc.

      if (Number.isNaN(page)) {
        return interaction.editReply({
          content: "Lỗi: Thông tin trang không hợp lệ.",
        });
      }

      try {
        const allData = PluginManager.getAll();
        let filtered = [];
        let label = "";

        if (type === "type_Plugins") {
          filtered = allData.filter((p) => !p.storageName.startsWith("_"));
          label = "Plugins";
        } else {
          if (type === "type_Models") label = "Models";
          else if (type === "type_Setups") label = "Setups";
          else if (type === "type_Configs") label = "Configs";
          else label = "Others";

          if (label === "Others") {
            filtered = allData.filter((p) =>
              p.storageName.startsWith("_Others"),
            );
          } else {
            filtered = [];
          }
        }

        if (label === "Plugins") {
          const categories = new Set();
          filtered.forEach((p) => {
            const cat = p.storageName.split("/")[0] || "Misc";
            if (p.storageName.includes("/"))
              categories.add(p.storageName.split("/")[0]);
            else categories.add("Misc");
          });
          const uniqueCats = Array.from(categories).sort();

          const PAGE_SIZE = 25;
          const startIndex = page * PAGE_SIZE;

          if (startIndex < 0 || startIndex >= uniqueCats.length) {
            return interaction.editReply({
              content: "Lỗi: Không tìm thấy trang này.",
            });
          }

          const bucket = uniqueCats.slice(startIndex, startIndex + PAGE_SIZE);

          if (bucket.length === 0) {
            return interaction.editReply({
              content: "Lỗi: Danh sách rỗng.",
            });
          }

          const options = bucket.map((cat) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(cat.startsWith("_") ? cat.substring(1) : cat)
              .setDescription(
                `File: ${
                  filtered.filter((p) =>
                    cat === "Misc"
                      ? !p.storageName.includes("/")
                      : p.storageName.startsWith(cat + "/"),
                  ).length
                }`,
              )
              .setValue(cat),
          );

          const select = new StringSelectMenuBuilder()
            .setCustomId("category_select")
            .setPlaceholder(`Chọn danh mục (Trang ${page + 1})`)
            .addOptions(options);

          // Tạo Button Navigation
          const btnPrev = new ButtonBuilder()
            .setCustomId(`btn_nav_cat_${page - 1}_${type}`)
            .setLabel("Trước")
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0);

          const btnNext = new ButtonBuilder()
            .setCustomId(`btn_nav_cat_${page + 1}_${type}`)
            .setLabel("Tiếp")
            .setEmoji("➡️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(startIndex + PAGE_SIZE >= uniqueCats.length);

          const rowMenu = new ActionRowBuilder().addComponents(select);
          const rowNav = new ActionRowBuilder().addComponents(btnPrev, btnNext);

          await interaction.editReply({
            content: `📂 **${label}**: Trang ${page + 1}/${Math.ceil(
              uniqueCats.length / PAGE_SIZE,
            )}`,
            components: [rowMenu, rowNav],
          });
        } else {
          await interaction.editReply({
            content: "Danh mục này chưa được hỗ trợ phân trang.",
          });
        }
      } catch (e) {
        console.error("Error in Button Nav:", e);
        try {
          await interaction.editReply({
            content: "❌ Lỗi chuyển trang. Vui lòng thử lại.",
          });
        } catch (replyError) {
          console.error("Failed to send error message:", replyError.message);
        }
      }
    }
    // --- LOOKUP PAGINATION ---
    else if (
      interaction.customId.startsWith("btn_lookup_cat_prev_") ||
      interaction.customId.startsWith("btn_lookup_cat_next_")
    ) {
      // Defer ngay lập tức để tránh timeout 3 giây
      await interaction.deferUpdate();

      try {
        const parts = interaction.customId.split("_");
        const direction = parts[3]; // prev or next
        const currentPage = parseInt(parts[4], 10);
        if (Number.isNaN(currentPage)) {
          return interaction.editReply({
            content: "Lỗi: Không xác định được trang hiện tại.",
          });
        }
        const newPage =
          direction === "prev" ? currentPage - 1 : currentPage + 1;

        const allPlugins = PluginManager.getAll();
        const plugins = allPlugins.filter(
          (p) => !p.storageName.startsWith("_"),
        );

        // Get unique categories
        const categories = new Set();
        plugins.forEach((p) => {
          const catParts = p.storageName.split("/");
          if (catParts.length > 1) {
            categories.add(catParts[0]);
          } else {
            categories.add("Misc");
          }
        });

        const uniqueCats = Array.from(categories).sort();
        const PAGE_SIZE = 25;
        const totalPages = Math.ceil(uniqueCats.length / PAGE_SIZE);

        if (newPage < 0 || newPage >= totalPages) {
          return interaction.editReply({
            content: "Không có trang này.",
          });
        }

        const startIndex = newPage * PAGE_SIZE;
        const bucket = uniqueCats.slice(startIndex, startIndex + PAGE_SIZE);

        const options = bucket.map((cat) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat)
            .setDescription(
              `Có ${
                plugins.filter((p) =>
                  cat === "Misc"
                    ? !p.storageName.includes("/")
                    : p.storageName.startsWith(cat + "/"),
                ).length
              } plugins`,
            )
            .setValue(`lookup_cat_${cat}`),
        );

        const select = new StringSelectMenuBuilder()
          .setCustomId("lookup_category_select")
          .setPlaceholder(`Chọn danh mục (Trang ${newPage + 1}/${totalPages})`)
          .addOptions(options);

        const btnPrev = new ButtonBuilder()
          .setCustomId(`btn_lookup_cat_prev_${newPage}`)
          .setLabel("Trước")
          .setEmoji("⬅️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage <= 0);

        const btnNext = new ButtonBuilder()
          .setCustomId(`btn_lookup_cat_next_${newPage}`)
          .setLabel("Tiếp")
          .setEmoji("➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage >= totalPages - 1);

        const rowMenu = new ActionRowBuilder().addComponents(select);
        const rowNav = new ActionRowBuilder().addComponents(btnPrev, btnNext);

        await interaction.editReply({
          content: `🔍 **Tra cứu Plugin**: Tìm thấy **${
            plugins.length
          }** plugins trong **${uniqueCats.length}** danh mục.\nTrang ${
            newPage + 1
          }/${totalPages}`,
          components: [rowMenu, rowNav],
        });
      } catch (e) {
        console.error("Lookup pagination error:", e);
        try {
          await interaction.editReply({
            content: "❌ Lỗi chuyển trang tra cứu. Vui lòng thử lại.",
          });
        } catch (replyError) {
          console.error("Failed to send error message:", replyError.message);
        }
      }
    }
    // ============ FAVORITES HANDLERS ============
    // Pagination cho favorites
    else if (interaction.customId.startsWith("favorites_page_")) {
      // Defer ngay lập tức để tránh timeout 3 giây
      await interaction.deferUpdate();

      const newPage = parseInt(
        interaction.customId.replace("favorites_page_", ""),
        10,
      );
      if (Number.isNaN(newPage)) {
        return interaction.editReply({
          content: "❌ Trang yêu thích không hợp lệ.",
        });
      }
      const userId = interaction.user.id;

      try {
        const favoriteIds = UserDataManager.getFavorites(userId);
        const favoritePlugins = [];
        favoriteIds.forEach((id) => {
          const plugin = PluginManager.getById(id);
          if (plugin) favoritePlugins.push(plugin);
        });

        if (favoritePlugins.length === 0) {
          return interaction.editReply({
            content:
              "⭐ Danh sách yêu thích đang trống hoặc các plugin đã bị xóa.\nVui lòng chạy lại `/favorites` để làm mới.",
            embeds: [],
            components: [],
          });
        }

        const PAGE_SIZE = 10;
        const totalPages = Math.ceil(favoritePlugins.length / PAGE_SIZE);
        const page = Math.max(0, Math.min(newPage, totalPages - 1));

        // Save pagination state
        UserDataManager.setPaginationState(userId, "favorites", page);

        const startIndex = page * PAGE_SIZE;
        const pagePlugins = favoritePlugins.slice(
          startIndex,
          startIndex + PAGE_SIZE,
        );

        const embed = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("⭐ Plugin Yêu Thích")
          .setDescription(
            `Bạn có **${favoritePlugins.length}** plugin yêu thích:\n\n` +
              pagePlugins
                .map((p, i) => {
                  const rating = UserDataManager.getAverageRating(p.id);
                  const ratingStr = rating.average
                    ? `⭐ ${rating.average}`
                    : "";
                  return `**${startIndex + i + 1}.** ${
                    p.name
                  } ${ratingStr}\n└ \`${p.originalName}\``;
                })
                .join("\n\n"),
          )
          .setFooter({
            text: `Trang ${page + 1}/${totalPages} • Tổng: ${
              favoritePlugins.length
            } plugins`,
          });

        const selectOptions = pagePlugins.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(p.name.substring(0, 100))
            .setDescription(`Tải: ${p.originalName.substring(0, 100)}`)
            .setValue(`fav_download_${p.id}`)
            .setEmoji("📥"),
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("favorites_download_select")
          .setPlaceholder("📥 Chọn plugin để tải xuống...")
          .addOptions(selectOptions);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        const btnPrev = new ButtonBuilder()
          .setCustomId(`favorites_page_${page - 1}`)
          .setLabel("Trước")
          .setEmoji("⬅️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0);

        const btnNext = new ButtonBuilder()
          .setCustomId(`favorites_page_${page + 1}`)
          .setLabel("Tiếp")
          .setEmoji("➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1);

        const btnRefresh = new ButtonBuilder()
          .setCustomId("favorites_refresh")
          .setLabel("Làm mới")
          .setEmoji("🔄")
          .setStyle(ButtonStyle.Primary);

        const btnClearAll = new ButtonBuilder()
          .setCustomId("favorites_clear_confirm")
          .setLabel("Xóa tất cả")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger);

        const navRow = new ActionRowBuilder().addComponents(
          btnPrev,
          btnNext,
          btnRefresh,
          btnClearAll,
        );

        await interaction.editReply({
          embeds: [embed],
          components: [selectRow, navRow],
        });
      } catch (e) {
        console.error("Favorites pagination error:", e);
        try {
          await interaction.editReply({
            content: "❌ Lỗi chuyển trang. Vui lòng thử lại.",
          });
        } catch (replyError) {
          console.error("Failed to send error message:", replyError.message);
        }
      }
    }
    // Toggle favorite
    else if (interaction.customId.startsWith("toggle_favorite_")) {
      const pluginId = interaction.customId.replace("toggle_favorite_", "");
      const userId = interaction.user.id;

      const isFavorite = UserDataManager.isFavorite(userId, pluginId);

      if (isFavorite) {
        UserDataManager.removeFavorite(userId, pluginId);
        await interaction.reply({
          content: "💔 Đã xóa khỏi danh sách yêu thích!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        UserDataManager.addFavorite(userId, pluginId);
        await interaction.reply({
          content:
            "⭐ Đã thêm vào danh sách yêu thích!\nDùng `/favorites` để xem danh sách.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    // Quick download từ bất kỳ đâu
    else if (interaction.customId.startsWith("quick_download_")) {
      const pluginId = interaction.customId.replace("quick_download_", "");
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
            content: "❌ Plugin không tồn tại hoặc đã bị xóa.",
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

        await interaction.editReply({
          content: `✅ **Download Success** (Line ${workerId})\nPlugin: **${
            plugin.name
          }**\n${LoadBalancer.getStatus()}`,
          files: [{ attachment: filePath, name: plugin.originalName }],
        });

        LoadBalancer.endRequest(workerId);
      } catch (error) {
        console.error("Quick download error:", error);
        LoadBalancer.endRequest(workerId);
        // Check if deferred/replied
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "Lỗi khi tải file.",
          });
        } else {
          await interaction.reply({
            content: "Lỗi khi tải file.",
            ephemeral: true,
          });
        }
      }
    }
    // ============ TEXT SEARCH DOWNLOAD ============
    // Download từ tính năng tìm kiếm bằng text chat
    else if (interaction.customId.startsWith("textsearch_download_")) {
      const pluginId = interaction.customId.replace("textsearch_download_", "");
      const userId = interaction.user.id;

      // Load Balancer Check
      const workerId = LoadBalancer.startRequest();
      if (!workerId) {
        return interaction.reply({
          content: "⚠️ **Hệ thống đang quá tải!** Vui lòng thử lại sau.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Defer reply public (không ephemeral) vì lệnh này public
      await interaction.deferReply();

      try {
        const plugin = PluginManager.getById(pluginId);
        if (!plugin) {
          LoadBalancer.endRequest(workerId);
          return interaction.editReply({
            content: "❌ Plugin không tồn tại hoặc đã bị xóa.",
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

        await interaction.editReply({
          content: `📦 **${plugin.name}**\n📥 Người tải: <@${userId}>`,
          files: [{ attachment: filePath, name: plugin.originalName }],
        });

        LoadBalancer.endRequest(workerId);
      } catch (error) {
        console.error("TextSearch download error:", error);
        LoadBalancer.endRequest(workerId);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "❌ Lỗi khi tải file.",
          });
        } else {
          await interaction.reply({
            content: "❌ Lỗi khi tải file.",
          });
        }
      }
    }
    // Favorites refresh
    else if (interaction.customId === "favorites_refresh") {
      // Trigger lại command favorites
      await interaction.reply({
        content: "🔄 Vui lòng sử dụng `/favorites` để làm mới danh sách.",
        flags: MessageFlags.Ephemeral,
      });
    }
    // Favorites clear confirm
    else if (interaction.customId === "favorites_clear_confirm") {
      const btnConfirm = new ButtonBuilder()
        .setCustomId("favorites_clear_execute")
        .setLabel("Xác nhận xóa tất cả")
        .setEmoji("⚠️")
        .setStyle(ButtonStyle.Danger);

      const btnCancel = new ButtonBuilder()
        .setCustomId("favorites_clear_cancel")
        .setLabel("Hủy")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(btnConfirm, btnCancel);

      await interaction.reply({
        content:
          "⚠️ **Bạn có chắc muốn xóa TẤT CẢ plugin yêu thích?**\nHành động này không thể hoàn tác!",
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "favorites_clear_execute") {
      const userId = interaction.user.id;
      const user = UserDataManager.getUser(userId);
      const count = user.favorites.length;
      user.favorites = [];
      UserDataManager.save();

      await interaction.update({
        content: `✅ Đã xóa **${count}** plugin khỏi danh sách yêu thích.`,
        components: [],
      });
    } else if (interaction.customId === "favorites_clear_cancel") {
      await interaction.update({
        content: "❌ Đã hủy thao tác xóa.",
        components: [],
      });
    }
    // ============ HISTORY HANDLERS ============
    else if (interaction.customId === "btn_open_favorites") {
      await interaction.reply({
        content: "⭐ Vui lòng sử dụng `/favorites` để xem danh sách yêu thích.",
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "history_clear_confirm") {
      const btnConfirm = new ButtonBuilder()
        .setCustomId("history_clear_execute")
        .setLabel("Xác nhận xóa lịch sử")
        .setEmoji("⚠️")
        .setStyle(ButtonStyle.Danger);

      const btnCancel = new ButtonBuilder()
        .setCustomId("history_clear_cancel")
        .setLabel("Hủy")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(btnConfirm, btnCancel);

      await interaction.reply({
        content:
          "⚠️ **Bạn có chắc muốn xóa TOÀN BỘ lịch sử tải xuống?**\nHành động này không thể hoàn tác!",
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "history_clear_execute") {
      const userId = interaction.user.id;
      const user = UserDataManager.getUser(userId);
      const count = user.downloadHistory.length;
      user.downloadHistory = [];
      UserDataManager.save();

      await interaction.update({
        content: `✅ Đã xóa **${count}** bản ghi khỏi lịch sử tải xuống.`,
        components: [],
      });
    } else if (interaction.customId === "history_clear_cancel") {
      await interaction.update({
        content: "❌ Đã hủy thao tác xóa.",
        components: [],
      });
    } else if (interaction.customId === "history_export") {
      const userId = interaction.user.id;
      const history = UserDataManager.getDownloadHistory(userId, 100);

      if (history.length === 0) {
        return interaction.reply({
          content: "📄 Không có lịch sử để xuất.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Tạo nội dung text
      const lines = [
        "=== LỊCH SỬ TẢI XUỐNG ===",
        `User: ${interaction.user.tag}`,
        `Xuất lúc: ${new Date().toLocaleString("vi-VN")}`,
        `Tổng: ${history.length} bản ghi`,
        "",
        "STT | Tên Plugin | Thời gian",
        "-----------------------------------",
      ];

      history.forEach((entry, i) => {
        const date = new Date(entry.date).toLocaleString("vi-VN");
        lines.push(`${i + 1}. ${entry.pluginName} | ${date}`);
      });

      const content = lines.join("\n");

      // Gửi dưới dạng file text
      const buffer = Buffer.from(content, "utf-8");

      await interaction.reply({
        content: "📄 **Báo cáo lịch sử tải xuống:**",
        files: [
          {
            attachment: buffer,
            name: `download_history_${userId}.txt`,
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
    // ============ RATING INLINE BUTTONS ============
    else if (interaction.customId.startsWith("rate_inline_")) {
      // Format: rate_inline_{pluginId}_{stars}
      const parts = interaction.customId.split("_");
      const stars = parseInt(parts[parts.length - 1]);
      const pluginId = parts.slice(2, -1).join("_");
      const userId = interaction.user.id;

      const plugin = PluginManager.getById(pluginId);
      if (!plugin) {
        return interaction.reply({
          content: "❌ Plugin không tồn tại.",
          flags: MessageFlags.Ephemeral,
        });
      }

      UserDataManager.setRating(userId, pluginId, stars);
      const avgRating = UserDataManager.getAverageRating(pluginId);

      const starsDisplay = "⭐".repeat(stars) + "☆".repeat(5 - stars);

      await interaction.reply({
        content: `${starsDisplay}\n✅ Đã đánh giá **${stars} sao** cho **${
          plugin.name
        }**!\n📊 Trung bình: ${avgRating.average || "N/A"} (${
          avgRating.count
        } lượt)`,
        flags: MessageFlags.Ephemeral,
      });
    }
    // ============ OPEN HISTORY BUTTON ============
    else if (interaction.customId === "btn_open_history") {
      await interaction.reply({
        content: "📜 Vui lòng sử dụng `/history` để xem lịch sử tải xuống.",
        flags: MessageFlags.Ephemeral,
      });
    }
    // ============ SEARCH PAGINATION ============
    else if (interaction.customId.startsWith("search_page_")) {
      // Format: search_page_{page}_{encodedQuery}
      const parts = interaction.customId.split("_");
      const newPage = parseInt(parts[2], 10);
      if (Number.isNaN(newPage)) {
        return interaction.update({
          content: "⚠️ Trang tìm kiếm không hợp lệ.",
          embeds: [],
          components: [],
        });
      }
      const encodedQuery = parts.slice(3).join("_");
      const query = decodeURIComponent(encodedQuery).toLowerCase();
      const userId = interaction.user.id;

      try {
        const plugins = PluginManager.getAll().filter(
          (p) => !p.storageName.startsWith("_"),
        );

        const results = plugins.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.storageName.includes("/") &&
              p.storageName.split("/")[0].toLowerCase().includes(query)),
        );

        if (results.length === 0) {
          return interaction.update({
            content:
              "⚠️ Kết quả tìm kiếm không còn hợp lệ (dữ liệu đã thay đổi). Vui lòng chạy lại `/search`.",
            embeds: [],
            components: [],
          });
        }

        const categories = new Set();
        results.forEach((p) => {
          if (p.storageName.includes("/")) {
            categories.add(p.storageName.split("/")[0]);
          } else {
            categories.add("Misc");
          }
        });

        const uniqueCategories = Array.from(categories).sort();
        if (uniqueCategories.length === 0) {
          return interaction.update({
            content:
              "⚠️ Không còn danh mục phù hợp. Vui lòng chạy lại `/search`.",
            embeds: [],
            components: [],
          });
        }

        const PAGE_SIZE = 25;
        const totalPages = Math.ceil(uniqueCategories.length / PAGE_SIZE);
        const currentPage = Math.max(0, Math.min(newPage, totalPages - 1));

        // Save pagination state
        UserDataManager.setPaginationState(
          userId,
          `search_${query}`,
          currentPage,
        );

        const startIndex = currentPage * PAGE_SIZE;
        const pageCategories = uniqueCategories.slice(
          startIndex,
          startIndex + PAGE_SIZE,
        );

        const select = new StringSelectMenuBuilder()
          .setCustomId("category_select")
          .setPlaceholder("Chọn danh mục plugin")
          .addOptions(
            pageCategories.map((cat) => {
              const count = results.filter((p) =>
                cat === "Misc"
                  ? !p.storageName.includes("/")
                  : p.storageName.startsWith(cat + "/"),
              ).length;
              return new StringSelectMenuOptionBuilder()
                .setLabel(cat)
                .setDescription(`${count} phiên bản có sẵn`)
                .setValue(cat);
            }),
          );

        const row = new ActionRowBuilder().addComponents(select);

        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle(`🔍 Kết Quả: "${query}"`)
          .setDescription(
            `Tìm thấy **${results.length}** plugin trong **${uniqueCategories.length}** danh mục.\n\n` +
              `Chọn danh mục để xem chi tiết:`,
          )
          .setFooter({
            text: `Trang ${currentPage + 1}/${totalPages} • Tổng: ${
              results.length
            } kết quả`,
          });

        const btnPrev = new ButtonBuilder()
          .setCustomId(`search_page_${currentPage - 1}_${encodedQuery}`)
          .setLabel("Trước")
          .setEmoji("⬅️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage <= 0);

        const btnNext = new ButtonBuilder()
          .setCustomId(`search_page_${currentPage + 1}_${encodedQuery}`)
          .setLabel("Tiếp")
          .setEmoji("➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage >= totalPages - 1);

        const navRow = new ActionRowBuilder().addComponents(btnPrev, btnNext);

        await interaction.update({
          embeds: [embed],
          components: [row, navRow],
        });
      } catch (e) {
        console.error("Search pagination error:", e);
        const replyMethod =
          interaction.deferred || interaction.replied ? "followUp" : "reply";
        await interaction[replyMethod]({
          content: "Lỗi chuyển trang tìm kiếm.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
