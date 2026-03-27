const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require("discord.js");
const TextSearchHandler = require("../../utils/TextSearchHandler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("textsearch")
    .setDescription("⚙️ Quản lý tính năng tìm kiếm plugin bằng text")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Xem trạng thái tính năng tìm kiếm text"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("Bật/tắt tính năng tìm kiếm text")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Bật (true) hoặc tắt (false)")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("addchannel")
        .setDescription("Thêm kênh cho phép tìm kiếm")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Kênh muốn thêm")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("removechannel")
        .setDescription("Xóa kênh khỏi danh sách cho phép")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Kênh muốn xóa")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setchannel")
        .setDescription(
          "Đặt kênh hiện tại làm kênh tìm kiếm (xóa tất cả kênh cũ)",
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clearallchannels")
        .setDescription(
          "Xóa tất cả kênh đã cấu hình (tính năng sẽ không hoạt động)",
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("config")
        .setDescription("Cấu hình thêm cho tính năng")
        .addIntegerOption((option) =>
          option
            .setName("maxresults")
            .setDescription("Số kết quả tối đa (1-10)")
            .setMinValue(1)
            .setMaxValue(10),
        )
        .addIntegerOption((option) =>
          option
            .setName("minlength")
            .setDescription("Độ dài tối thiểu của query (2-10)")
            .setMinValue(2)
            .setMaxValue(10),
        )
        .addIntegerOption((option) =>
          option
            .setName("cooldown")
            .setDescription("Thời gian cooldown giữa các lần tìm (1-60 giây)")
            .setMinValue(1)
            .setMaxValue(60),
        )
        .addBooleanOption((option) =>
          option
            .setName("autodelete")
            .setDescription("Bật/tắt tự động xóa tin nhắn kết quả"),
        )
        .addIntegerOption((option) =>
          option
            .setName("deletedelay")
            .setDescription("Thời gian trước khi xóa (10-120 giây)")
            .setMinValue(10)
            .setMaxValue(120),
        ),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "status": {
        const config = TextSearchHandler.getConfig();
        const hasChannels = config.allowedChannels.length > 0;
        const channelList = hasChannels
          ? config.allowedChannels.map((id) => `<#${id}>`).join(", ")
          : "⚠️ **Chưa cấu hình** - Dùng `/textsearch setchannel` để thiết lập";

        // Xác định trạng thái thực tế
        const isActive = config.enabled && hasChannels;

        const embed = new EmbedBuilder()
          .setColor(isActive ? 0x57f287 : 0xed4245)
          .setTitle("⚙️ Cấu hình Text Search")
          .setDescription(
            !hasChannels
              ? "⚠️ **Chưa cấu hình kênh!** Tính năng sẽ không hoạt động.\nDùng `/textsearch setchannel` trong kênh muốn bật."
              : null,
          )
          .addFields(
            {
              name: "🔘 Trạng thái",
              value: config.enabled ? "✅ Đang bật" : "❌ Đang tắt",
              inline: true,
            },
            {
              name: "🔢 Kết quả tối đa",
              value: `${config.maxResults} plugin`,
              inline: true,
            },
            {
              name: "📏 Độ dài tối thiểu",
              value: `${config.minQueryLength} ký tự`,
              inline: true,
            },
            {
              name: "📺 Kênh cho phép",
              value: channelList,
              inline: false,
            },
            {
              name: "⏱️ Cooldown",
              value: `${config.cooldown / 1000} giây`,
              inline: true,
            },
            {
              name: "🗑️ Tự động xóa",
              value: config.autoDelete
                ? `✅ Sau ${config.autoDeleteDelay / 1000}s`
                : "❌ Không",
              inline: true,
            },
          )
          .setFooter({ text: "Sử dụng /textsearch để quản lý" })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      case "toggle": {
        const enabled = interaction.options.getBoolean("enabled");
        TextSearchHandler.setEnabled(enabled);

        const embed = new EmbedBuilder()
          .setColor(enabled ? 0x57f287 : 0xed4245)
          .setTitle(enabled ? "✅ Đã bật Text Search" : "❌ Đã tắt Text Search")
          .setDescription(
            enabled
              ? "Người dùng giờ có thể tìm kiếm plugin bằng cách chat tên plugin trong kênh cho phép."
              : "Tính năng tìm kiếm bằng text đã bị tắt.",
          )
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      case "addchannel": {
        const channel = interaction.options.getChannel("channel");
        const added = TextSearchHandler.addChannel(channel.id);

        if (added) {
          return interaction.reply({
            content: `✅ Đã thêm ${channel} vào danh sách kênh cho phép tìm kiếm!`,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          return interaction.reply({
            content: `⚠️ Kênh ${channel} đã có trong danh sách!`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      case "removechannel": {
        const channel = interaction.options.getChannel("channel");
        const removed = TextSearchHandler.removeChannel(channel.id);

        if (removed) {
          return interaction.reply({
            content: `✅ Đã xóa ${channel} khỏi danh sách!`,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          return interaction.reply({
            content: `⚠️ Kênh ${channel} không có trong danh sách!`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      case "setchannel": {
        // Xóa tất cả kênh cũ và thêm kênh hiện tại
        const config = TextSearchHandler.getConfig();
        config.allowedChannels = [interaction.channel.id];
        TextSearchHandler.saveConfig();

        return interaction.reply({
          content: `✅ Đã đặt kênh này (${interaction.channel}) làm kênh duy nhất cho phép tìm kiếm!`,
          flags: MessageFlags.Ephemeral,
        });
      }

      case "clearallchannels": {
        const config = TextSearchHandler.getConfig();
        const count = config.allowedChannels.length;
        config.allowedChannels = [];
        TextSearchHandler.saveConfig();

        return interaction.reply({
          content:
            `✅ Đã xóa **${count}** kênh khỏi danh sách.\n` +
            `⚠️ Tính năng tìm kiếm bằng text sẽ **không hoạt động** cho đến khi bạn thêm kênh mới.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      case "config": {
        const maxResults = interaction.options.getInteger("maxresults");
        const minLength = interaction.options.getInteger("minlength");
        const cooldown = interaction.options.getInteger("cooldown");
        const autoDelete = interaction.options.getBoolean("autodelete");
        const deleteDelay = interaction.options.getInteger("deletedelay");

        let changes = [];
        const config = TextSearchHandler.getConfig();

        if (maxResults !== null) {
          TextSearchHandler.setMaxResults(maxResults);
          changes.push(`📊 Số kết quả tối đa: **${maxResults}**`);
        }

        if (minLength !== null) {
          TextSearchHandler.setMinQueryLength(minLength);
          changes.push(`📏 Độ dài tối thiểu: **${minLength}** ký tự`);
        }

        if (cooldown !== null) {
          config.cooldown = cooldown * 1000; // Convert to ms
          TextSearchHandler.saveConfig();
          changes.push(`⏱️ Cooldown: **${cooldown}** giây`);
        }

        if (autoDelete !== null) {
          config.autoDelete = autoDelete;
          TextSearchHandler.saveConfig();
          changes.push(`🗑️ Tự động xóa: **${autoDelete ? "Bật" : "Tắt"}**`);
        }

        if (deleteDelay !== null) {
          config.autoDeleteDelay = deleteDelay * 1000; // Convert to ms
          TextSearchHandler.saveConfig();
          changes.push(`⏳ Xóa sau: **${deleteDelay}** giây`);
        }

        if (changes.length === 0) {
          return interaction.reply({
            content: "⚠️ Bạn chưa thay đổi cấu hình nào!",
            flags: MessageFlags.Ephemeral,
          });
        }

        return interaction.reply({
          content: `✅ Đã cập nhật cấu hình:\n${changes.join("\n")}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
