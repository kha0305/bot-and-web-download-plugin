const PluginManager = require("../utils/PluginManager");
const Logger = require("../utils/Logger");
const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const Translator = require("../utils/Translator");

module.exports = {
  async handle(interaction) {
    // ...
    if (interaction.customId === "search_plugin_submission") {
      const query = interaction.fields
        .getTextInputValue("search_input")
        .toLowerCase();

      try {
        const plugins = PluginManager.getAll();
        // ...
        const results = plugins.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.storageName.includes("/") &&
              p.storageName.split("/")[0].toLowerCase().includes(query)),
        );

        if (results.length === 0) {
          return interaction.reply({
            content: `Không tìm thấy plugin nào với từ khóa "${query}".`,
            flags: MessageFlags.Ephemeral,
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

        const uniqueCategories = Array.from(categories).slice(0, 25);
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
          content: `Kết quả tìm kiếm cho "**${query}**" (${categories.size} danh mục):`,
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        Logger.log(
          interaction.user,
          "SEARCH",
          `Query: "${query}" - Found ${results.length} results.`,
        );
      } catch (e) {
        console.error(e);
        await interaction.reply({
          content: "Có lỗi khi tìm kiếm.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.customId === "admin_delete_search_submission") {
      if (process.env.ADMIN_ID && interaction.user.id !== process.env.ADMIN_ID)
        return;

      const query = interaction.fields
        .getTextInputValue("delete_input")
        .toLowerCase();

      try {
        const plugins = PluginManager.getAll();
        const results = plugins.filter(
          (p) =>
            p.originalName.toLowerCase().includes(query) ||
            p.name.toLowerCase().includes(query),
        );

        if (results.length === 0) {
          await interaction.reply({
            content: "❌ Không tìm thấy file nào để xóa.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const slicedResults = results.slice(0, 25);
        const select = new StringSelectMenuBuilder()
          .setCustomId("admin_confirm_delete_select")
          .setPlaceholder("Chọn FILE để xóa vĩnh viễn")
          .addOptions(
            slicedResults.map((p) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(p.originalName.substring(0, 100))
                .setDescription(`Upload: ${p.uploadedBy} | ${p.uploadDate}`)
                .setValue(p.id),
            ),
          );

        const row = new ActionRowBuilder().addComponents(select);
        await interaction.reply({
          content: `⚠️ **CẢNH BÁO**: Bạn đang ở chế độ XÓA. Chọn file bên dưới để **XÓA VĨNH VIỄN**:`,
          components: [row],
          flags: MessageFlags.Ephemeral,
        });
      } catch (e) {
        console.error(e);
      }
    } else if (interaction.customId === "request_submission") {
      const name = interaction.fields.getTextInputValue("req_name");
      const reason = interaction.fields.getTextInputValue("req_reason");
      const adminId = process.env.ADMIN_ID;

      // Log
      Logger.log(
        interaction.user,
        "REQUEST_PLUGIN",
        `Requested: ${name} - ${reason}`,
      );

      // Notify Admin
      if (adminId) {
        try {
          const adminUser = await interaction.client.users.fetch(adminId);
          const reqEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle("📩 YÊU CẦU PLUGIN MỚI")
            .addFields(
              {
                name: "Người yêu cầu",
                value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
                inline: false,
              },
              { name: "Tên Plugin", value: name, inline: true },
              {
                name: "Mô tả / Link",
                value: reason || "Không có",
                inline: false,
              },
            )
            .setTimestamp();

          await adminUser.send({ embeds: [reqEmbed] });
        } catch (e) {
          console.error("Failed to DM Admin:", e);
        }
      }

      await interaction.reply({
        content: "✅ Yêu cầu của bạn đã được gửi đến Admin!",
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "report_submission") {
      const name = interaction.fields.getTextInputValue("rep_name");
      const issue = interaction.fields.getTextInputValue("rep_issue");
      const adminId = process.env.ADMIN_ID;

      // Log
      Logger.log(
        interaction.user,
        "REPORT_BUG",
        `Reported: ${name} - ${issue}`,
      );

      // Notify Admin
      if (adminId) {
        try {
          const adminUser = await interaction.client.users.fetch(adminId);
          const repEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle("⚠️ BÁO LỖI PLUGIN")
            .addFields(
              {
                name: "Người báo cáo",
                value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
                inline: false,
              },
              { name: "Plugin gặp lỗi", value: name, inline: true },
              { name: "Chi tiết lỗi", value: issue, inline: false },
            )
            .setTimestamp();

          await adminUser.send({ embeds: [repEmbed] });
        } catch (e) {
          console.error("Failed to DM Admin:", e);
        }
      }

      await interaction.reply({
        content: "🚨 Cảm ơn bạn đã báo lỗi! Admin sẽ kiểm tra sớm nhất.",
        flags: MessageFlags.Ephemeral,
      });
    } else if (interaction.customId === "translate_submission") {
      const name = interaction.fields.getTextInputValue("trans_name");
      const content = interaction.fields.getTextInputValue("trans_content");
      const adminId = process.env.ADMIN_ID;

      // Log
      Logger.log(
        interaction.user,
        "TRANSLATE_CONTRIB",
        `Translate Contribution: ${name} - ${content}`,
      );

      // Notify Admin
      if (adminId) {
        try {
          const adminUser = await interaction.client.users.fetch(adminId);
          const transEmbed = new EmbedBuilder()
            .setColor(0x00ffff) // Cyan color
            .setTitle("🌐 ĐÓNG GÓP VIỆT HÓA")
            .addFields(
              {
                name: "Người gửi",
                value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
                inline: false,
              },
              { name: "Tên Plugin", value: name, inline: true },
              { name: "Nội dung / Link", value: content, inline: false },
            )
            .setTimestamp();

          await adminUser.send({ embeds: [transEmbed] });
        } catch (e) {
          console.error("Failed to DM Admin:", e);
        }
      }

      await interaction.reply({
        content:
          "✅ Cảm ơn bạn đã đóng góp bản Việt hóa! Admin sẽ xem xét và cập nhật.",
        flags: MessageFlags.Ephemeral,
      });
    }
    // --- TRANSLATE TEXT DIRECTLY ---
    else if (
      interaction.customId === "translate_text_submission" ||
      interaction.customId === "translate_text_google" ||
      interaction.customId === "translate_text_chatgpt"
    ) {
      const textToTranslate = interaction.fields.getTextInputValue(
        "translate_text_input",
      );
      let requestedTargetLanguage = "";
      try {
        requestedTargetLanguage = interaction.fields.getTextInputValue(
          "translate_target_lang",
        );
      } catch (_ignore) {
        requestedTargetLanguage = "";
      }

      // Xác định engine dựa trên customId
      const engine =
        interaction.customId === "translate_text_chatgpt"
          ? "chatgpt"
          : "google";
      const skillId = Translator.getDefaultSkillId();
      const requestedModel = Translator.getChatgptModel();
      const targetLanguage = Translator.getTargetLanguageProfile(
        requestedTargetLanguage,
      );
      let engineName = Translator.getEngineName(engine, requestedModel);

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await interaction.editReply(
        `⏳ Đang dịch văn bản bằng **${engineName}**...` +
          (engine === "chatgpt" ? `\nModel: \`${requestedModel}\`` : "") +
          `\nNgôn ngữ đích: ${targetLanguage.nativeName} (\`${targetLanguage.id}\`)`,
      );

      try {
        if (engine === "chatgpt" && !Translator.getChatgptApiKey()) {
          throw new Error("Missing OPENAI_API_KEY or AGENT_ROUTER_TOKEN");
        }

        const result = await Translator.translateText(textToTranslate, engine, {
          skill: skillId,
          model: requestedModel,
          targetLanguage: targetLanguage.id,
        });
        const translatedText = result.translatedText;
        engineName = result.engineName || engineName;
        const cost = result.cost || null;
        const tokenUsage = cost?.actualUsage || cost?.estimatedUsage || null;
        const costText =
          engine === "chatgpt"
            ? cost?.pricingKnown
              ? `Token: ${tokenUsage?.totalTokens || 0} • Cost: ${Translator.formatUsd(cost.actualUsd ?? cost.estimatedUsd)}`
              : `Token: ${tokenUsage?.totalTokens || 0} • Cost: chưa có bảng giá`
            : "Token/Cost: miễn phí (Google)";

        // Create embed with result
        const { EmbedBuilder } = require("discord.js");
        const resultEmbed = new EmbedBuilder()
          .setColor(engine === "chatgpt" ? 0x10a37f : 0x4285f4) // Green for OpenAI, Blue for Google
          .setTitle("🌐 Kết quả dịch")
          .addFields(
            {
              name: "📝 Văn bản gốc (English)",
              value:
                textToTranslate.length > 1000
                  ? textToTranslate.substring(0, 1000) + "..."
                  : textToTranslate,
              inline: false,
            },
            {
              name: "🌍 Bản dịch",
              value:
                translatedText.length > 1000
                  ? translatedText.substring(0, 1000) + "..."
                  : translatedText,
              inline: false,
            },
          )
          .setFooter({
            text:
              `Powered by ${engineName} • Skill: ${result.skillName || skillId}` +
              ` • ${costText}`,
          });

        await interaction.editReply({
          content: "✅ **Hoàn tất!**",
          embeds: [resultEmbed],
        });

        Logger.log(
          interaction.user,
          "TRANSLATE_TEXT",
          `Translated ${textToTranslate.length} chars via ${engineName}`,
        );
      } catch (error) {
        console.error("Translation error:", error);
        await interaction.editReply(
          `❌ Có lỗi xảy ra khi dịch văn bản: ${error.message}`,
        );
      }
    }
  },
};
