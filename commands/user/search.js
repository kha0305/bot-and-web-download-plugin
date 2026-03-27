const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const PluginManager = require("../../utils/PluginManager");
const UserDataManager = require("../../utils/UserDataManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Tìm kiếm plugin với gợi ý thông minh")
    .addStringOption(
      (option) =>
        option
          .setName("query")
          .setDescription("Tên plugin cần tìm")
          .setRequired(true)
          .setAutocomplete(true), // Enable autocomplete
    ),

  // Autocomplete handler - gợi ý khi gõ
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const plugins = PluginManager.getAll().filter(
      (p) => !p.storageName.startsWith("_"),
    );

    if (!focusedValue) {
      // Nếu chưa gõ gì, hiển thị plugin phổ biến (có rating cao hoặc download nhiều)
      const popular = plugins.slice(0, 25);
      return interaction.respond(
        popular.map((p) => ({
          name: `🔥 ${p.name} ${p.version ? `(v${p.version})` : ""}`.substring(
            0,
            100,
          ),
          value: p.name,
        })),
      );
    }

    // Tìm kiếm theo tên, mô tả, và danh mục
    const filtered = plugins.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(focusedValue);
      const descMatch = p.description?.toLowerCase().includes(focusedValue);
      const catMatch = p.storageName.toLowerCase().includes(focusedValue);
      return nameMatch || descMatch || catMatch;
    });

    // Sắp xếp: ưu tiên khớp tên trước, sau đó theo rating
    filtered.sort((a, b) => {
      const aExact = a.name.toLowerCase().startsWith(focusedValue) ? 1 : 0;
      const bExact = b.name.toLowerCase().startsWith(focusedValue) ? 1 : 0;
      return bExact - aExact;
    });

    const limited = filtered.slice(0, 25);

    await interaction.respond(
      limited.map((p) => {
        const rating = UserDataManager.getAverageRating(p.id);
        const ratingStr = rating.average ? ` ⭐${rating.average}` : "";
        const cat = p.storageName.includes("/")
          ? p.storageName.split("/")[0]
          : "Misc";
        return {
          name: `${p.name}${ratingStr} [${cat}]`.substring(0, 100),
          value: p.name,
        };
      }),
    );
  },

  async execute(interaction) {
    const query = interaction.options.getString("query").toLowerCase();
    const userId = interaction.user.id;

    const plugins = PluginManager.getAll().filter(
      (p) => !p.storageName.startsWith("_"),
    );

    // Enhanced search: tên, mô tả, danh mục, tác giả
    const results = plugins.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.storageName.includes("/") &&
          p.storageName.split("/")[0].toLowerCase().includes(query)) ||
        (p.authors && p.authors.some((a) => a.toLowerCase().includes(query))),
    );

    if (results.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("🔍 Kết Quả Tìm Kiếm")
        .setDescription(`Không tìm thấy plugin nào với từ khóa **"${query}"**.`)
        .addFields({
          name: "💡 Gợi ý",
          value:
            "• Thử sử dụng từ khóa ngắn hơn\n• Kiểm tra chính tả\n• Dùng tên tiếng Anh của plugin",
        });

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Nếu chỉ có 1 kết quả, hiển thị chi tiết luôn
    if (results.length === 1) {
      const plugin = results[0];
      const isFavorite = UserDataManager.isFavorite(userId, plugin.id);
      const avgRating = UserDataManager.getAverageRating(plugin.id);
      const userRating = UserDataManager.getRating(userId, plugin.id);

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`📦 ${plugin.name}`)
        .setDescription(plugin.description || "Không có mô tả.")
        .addFields(
          {
            name: "📁 File",
            value: `\`${plugin.originalName}\``,
            inline: false,
          },
          { name: "🔢 Version", value: plugin.version || "?", inline: true },
          {
            name: "🎮 MC Version",
            value: plugin.supportedVersion || "?",
            inline: true,
          },
          {
            name: "⭐ Rating",
            value: avgRating.average
              ? `${avgRating.average}/5 (${avgRating.count} lượt)`
              : "Chưa có",
            inline: true,
          },
        )
        .setFooter({ text: `ID: ${plugin.id}` });

      // Action buttons
      const btnDownload = new ButtonBuilder()
        .setCustomId(`quick_download_${plugin.id}`)
        .setLabel("Tải xuống")
        .setEmoji("📥")
        .setStyle(ButtonStyle.Success);

      const btnFavorite = new ButtonBuilder()
        .setCustomId(`toggle_favorite_${plugin.id}`)
        .setLabel(isFavorite ? "Bỏ yêu thích" : "Yêu thích")
        .setEmoji(isFavorite ? "💔" : "⭐")
        .setStyle(isFavorite ? ButtonStyle.Secondary : ButtonStyle.Primary);

      // Inline rating buttons
      const ratingButtons = [];
      for (let i = 1; i <= 5; i++) {
        const isSelected = userRating === i;
        ratingButtons.push(
          new ButtonBuilder()
            .setCustomId(`rate_inline_${plugin.id}_${i}`)
            .setLabel(`${i}`)
            .setEmoji(isSelected ? "⭐" : "☆")
            .setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Secondary),
        );
      }

      const row1 = new ActionRowBuilder().addComponents(
        btnDownload,
        btnFavorite,
      );
      const row2 = new ActionRowBuilder().addComponents(...ratingButtons);

      return interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Nhiều kết quả: Group by Category
    const categories = new Set();
    results.forEach((p) => {
      if (p.storageName.includes("/")) {
        categories.add(p.storageName.split("/")[0]);
      } else {
        categories.add("Misc");
      }
    });

    const uniqueCategories = Array.from(categories).sort();

    // Pagination nếu cần
    const savedPage = UserDataManager.getPaginationState(
      userId,
      `search_${query}`,
    );
    const PAGE_SIZE = 25;
    const totalPages = Math.ceil(uniqueCategories.length / PAGE_SIZE);
    const currentPage = Math.min(savedPage, totalPages - 1);
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

    // Embed với thống kê
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`🔍 Kết Quả: "${query}"`)
      .setDescription(
        `Tìm thấy **${results.length}** plugin trong **${uniqueCategories.length}** danh mục.\n\n` +
          `Chọn danh mục để xem chi tiết:`,
      )
      .setFooter({
        text:
          totalPages > 1
            ? `Trang ${
                currentPage + 1
              }/${totalPages} • Dùng nút để chuyển trang`
            : `Tổng: ${results.length} kết quả`,
      });

    const components = [row];

    // Thêm navigation nếu cần
    if (totalPages > 1) {
      const btnPrev = new ButtonBuilder()
        .setCustomId(
          `search_page_${currentPage - 1}_${encodeURIComponent(query)}`,
        )
        .setLabel("Trước")
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 0);

      const btnNext = new ButtonBuilder()
        .setCustomId(
          `search_page_${currentPage + 1}_${encodeURIComponent(query)}`,
        )
        .setLabel("Tiếp")
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1);

      const navRow = new ActionRowBuilder().addComponents(btnPrev, btnNext);
      components.push(navRow);
    }

    await interaction.reply({
      embeds: [embed],
      components,
      flags: MessageFlags.Ephemeral,
    });
  },
};
