const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { AttachmentBuilder } = require("discord.js");
const { ensureDirForFile, ensureJsonFile } = require("./DataPath");

const TRANSLATION_CACHE_PATH = path.join(
  __dirname,
  "../data/translation_cache.json",
);

const PROTECTED_PATTERNS = [
  /%[\w-]+%/g,
  /\{[\w-]+\}/g,
  /\$\{[\w.\-]+\}/g,
  /&[0-9a-fk-or]/gi,
  /§[0-9a-fk-or]/gi,
  /<[\w:/\-#]+>/g,
  /\\\\n/g,
  /\\n/g,
  /\/[a-z0-9:_-]+/gi,
  /\b[a-z0-9_-]+(?:\.[a-z0-9_-]+){1,}\b/gi,
];

const PROTECTED_TERMS = [
  "Minecraft",
  "Spigot",
  "Paper",
  "Folia",
  "Bukkit",
  "PlaceholderAPI",
  "LuckPerms",
  "WorldGuard",
  "WorldEdit",
  "ItemsAdder",
  "Oraxen",
  "Vault",
  "MythicMobs",
  "MMOItems",
];

const LOCAL_GLOSSARY = [
  { pattern: /\bcooldown\b/gi, replacement: "hồi chiêu" },
  { pattern: /\benchantment(s)?\b/gi, replacement: "phù phép" },
  { pattern: /\binventory\b/gi, replacement: "túi đồ" },
  { pattern: /\bpermission(s)?\b/gi, replacement: "quyền" },
  { pattern: /\bcommand(s)?\b/gi, replacement: "lệnh" },
  { pattern: /\bitem(s)?\b/gi, replacement: "vật phẩm" },
  { pattern: /\bmob(s)?\b/gi, replacement: "quái" },
  { pattern: /\bplayer(s)?\b/gi, replacement: "người chơi" },
  { pattern: /\bserver\b/gi, replacement: "máy chủ" },
  { pattern: /\bdamage\b/gi, replacement: "sát thương" },
  { pattern: /\bhealth\b/gi, replacement: "máu" },
];

const DEFAULT_TRANSLATION_SKILL = "minecraft_smooth";

const TRANSLATION_SKILLS = {
  minecraft_smooth: {
    name: "Minecraft Smooth",
    description: "Mượt, tự nhiên, đúng ngữ cảnh plugin Minecraft.",
    outputRatio: 1.25,
    minTokens: 220,
    maxTokens: 1800,
    styleInstruction:
      "Use natural, player-friendly Vietnamese. Prefer smooth, idiomatic phrasing over word-by-word translation.",
  },
  minecraft_economy: {
    name: "Minecraft Economy",
    description: "Ngắn gọn, tiết kiệm token/quota tối đa.",
    outputRatio: 1.08,
    minTokens: 160,
    maxTokens: 1100,
    styleInstruction:
      "Use concise Vietnamese with shortest clear wording while preserving meaning.",
  },
  minecraft_strict: {
    name: "Minecraft Strict",
    description: "Bám sát câu gốc, hạn chế diễn giải.",
    outputRatio: 1.15,
    minTokens: 180,
    maxTokens: 1400,
    styleInstruction:
      "Keep structure close to source text. Avoid adding nuance not present in the original.",
  },
};

function clampInt(value, fallback, min, max) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class Translator {
  static getChatgptApiKey() {
    return String(
      process.env.OPENAI_API_KEY || process.env.AGENT_ROUTER_TOKEN || "",
    ).trim();
  }

  static getOpenAIBaseUrl() {
    return String(process.env.OPENAI_API_BASE || "https://api.openai.com/v1")
      .trim()
      .replace(/\/+$/, "");
  }

  static getChatgptModel() {
    return String(process.env.OPENAI_TRANSLATE_MODEL || "gpt-5-nano").trim();
  }

  static getSkillProfiles() {
    return TRANSLATION_SKILLS;
  }

  static getDefaultSkillId() {
    const configured = String(process.env.TRANSLATE_SKILL || "")
      .trim()
      .toLowerCase();
    if (configured && TRANSLATION_SKILLS[configured]) {
      return configured;
    }
    return DEFAULT_TRANSLATION_SKILL;
  }

  static normalizeSkillId(skillInput) {
    const requested = String(skillInput || "")
      .trim()
      .toLowerCase();
    if (requested && TRANSLATION_SKILLS[requested]) {
      return requested;
    }
    return Translator.getDefaultSkillId();
  }

  static getSkillProfile(skillInput) {
    const id = Translator.normalizeSkillId(skillInput);
    const profile = TRANSLATION_SKILLS[id];
    return {
      id,
      name: profile.name,
      description: profile.description,
      outputRatio: profile.outputRatio,
      minTokens: profile.minTokens,
      maxTokens: profile.maxTokens,
      styleInstruction: profile.styleInstruction,
    };
  }

  static listSkillMeta() {
    const defaultSkill = Translator.getDefaultSkillId();
    return Object.entries(TRANSLATION_SKILLS).map(([id, profile]) => ({
      id,
      name: profile.name,
      description: profile.description,
      recommended: id === defaultSkill,
    }));
  }

  static getEngineName(engine, modelUsed) {
    if (engine === "chatgpt") {
      const modelName = modelUsed || Translator.getChatgptModel();
      return `ChatGPT (${modelName})`;
    }
    return "Google Translate";
  }

  static getEngineEmoji(engine) {
    return engine === "chatgpt" ? "⭐" : "🌐";
  }

  static getChatgptModelCandidates() {
    return Array.from(
      new Set([Translator.getChatgptModel(), "gpt-4o-mini"].filter(Boolean)),
    );
  }

  static getCacheLimit() {
    return clampInt(process.env.TRANSLATE_CACHE_LIMIT, 8000, 200, 50000);
  }

  static getBatchSize() {
    return clampInt(process.env.TRANSLATE_BATCH_SIZE, 40, 1, 120);
  }

  static getBatchCharLimit() {
    return clampInt(process.env.TRANSLATE_BATCH_CHAR_LIMIT, 2200, 300, 6000);
  }

  static getSystemPrompt(skillInput) {
    const skill = Translator.getSkillProfile(skillInput);
    return (
      "Translate English text to Vietnamese for Minecraft plugin configs. " +
      "Keep placeholders/tokens unchanged: __VAR0__, %name%, {value}, ${value}, color codes (&a, §a), <tags>, commands, permission nodes. " +
      "Keep plugin and platform names in English. Use consistent Minecraft terms in Vietnamese. " +
      `${skill.styleInstruction} ` +
      "Do not add explanation or extra lines. " +
      "Return ONLY numbered lines in format '1. ...'."
    );
  }

  static loadCache() {
    ensureJsonFile(TRANSLATION_CACHE_PATH, {});
    try {
      const parsed = JSON.parse(fs.readFileSync(TRANSLATION_CACHE_PATH, "utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn("[Translator] Cache load error:", e.message);
    }
    return {};
  }

  static saveCache(cache) {
    try {
      const maxEntries = Translator.getCacheLimit();
      const keys = Object.keys(cache);
      if (keys.length > maxEntries) {
        const overflow = keys.length - maxEntries;
        keys.slice(0, overflow).forEach((key) => {
          delete cache[key];
        });
      }
      ensureDirForFile(TRANSLATION_CACHE_PATH);
      fs.writeFileSync(TRANSLATION_CACHE_PATH, JSON.stringify(cache, null, 2));
    } catch (e) {
      console.warn("[Translator] Cache save error:", e.message);
    }
  }

  static buildCacheKey(engine, text, skillInput) {
    const digest = crypto.createHash("sha1").update(String(text)).digest("hex");
    const skillId = Translator.normalizeSkillId(skillInput);
    return `${engine}:${skillId}:${digest}`;
  }

  static shouldSkipText(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return true;
    if (/^(true|false|null|none|on|off)$/i.test(trimmed)) return true;
    if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) return true;
    if (/^https?:\/\//i.test(trimmed)) return true;
    if (/^[A-Z0-9_.:-]+$/.test(trimmed)) return true;
    if (
      /^[a-z0-9_.:-]+$/i.test(trimmed) &&
      (trimmed.includes(".") ||
        trimmed.includes("_") ||
        trimmed.includes(":") ||
        trimmed.startsWith("/"))
    ) {
      return true;
    }
    if (/^[\[\]{}()<>0-9_\/\\|:;,.!@#$%^&*+=?-]+$/.test(trimmed)) return true;
    return false;
  }

  static protectTokens(input) {
    let text = String(input || "");
    const listeners = [];
    let index = 0;

    const putPlaceholder = (value, prefix = "__VAR") => {
      const placeholder = `${prefix}${index}__`;
      index++;
      listeners.push({ ph: placeholder, val: value });
      return placeholder;
    };

    PROTECTED_PATTERNS.forEach((regex) => {
      text = text.replace(regex, (match) => putPlaceholder(match, "__VAR"));
    });

    PROTECTED_TERMS.forEach((term) => {
      const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
      text = text.replace(regex, (match) => putPlaceholder(match, "__TERM"));
    });

    return { text, listeners };
  }

  static restorePlaceholders(input, listeners) {
    let text = String(input || "");
    (listeners || []).forEach((item) => {
      const regex = new RegExp(escapeRegExp(item.ph), "g");
      text = text.replace(regex, item.val);
    });
    return text;
  }

  static applyLocalGlossary(input) {
    let text = String(input || "");
    LOCAL_GLOSSARY.forEach((rule) => {
      text = text.replace(rule.pattern, rule.replacement);
    });
    return text;
  }

  static polishVietnameseText(input) {
    return String(input || "")
      .replace(/\s+([,.;!?])/g, "$1")
      .replace(/([(\[{])\s+/g, "$1")
      .replace(/\s+([)\]}])/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  static createBatches(items, sizeLimit, charLimit) {
    const batches = [];
    let current = [];
    let currentLen = 0;

    items.forEach((item) => {
      const itemLen = String(item.text || "").length + 8;
      if (
        current.length > 0 &&
        (current.length >= sizeLimit || currentLen + itemLen > charLimit)
      ) {
        batches.push(current);
        current = [];
        currentLen = 0;
      }

      current.push(item);
      currentLen += itemLen;
    });

    if (current.length > 0) batches.push(current);
    return batches;
  }

  static parseNumberedOutput(output, expectedCount) {
    const result = new Map();
    const text = String(output || "");
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
      const match = line.match(/^\s*(\d+)[\.\):-]\s*(.+)\s*$/);
      if (!match) return;
      const idx = parseInt(match[1], 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= expectedCount) return;
      result.set(idx, match[2]);
    });

    if (result.size === 0) {
      const fallback = lines.filter((line) => line.trim().length > 0);
      for (let i = 0; i < Math.min(fallback.length, expectedCount); i++) {
        result.set(i, fallback[i].replace(/^\s*[-*]\s*/, "").trim());
      }
    }

    return result;
  }

  static async requestChatCompletion(textBlock, openaiApiKey, skillInput) {
    const skill = Translator.getSkillProfile(skillInput);
    const modelCandidates = Translator.getChatgptModelCandidates();
    let lastError = null;

    for (const model of modelCandidates) {
      try {
        const approxInputTokens = Math.ceil(textBlock.length / 4) + 120;
        const maxTokens = Math.min(
          skill.maxTokens,
          Math.max(skill.minTokens, Math.ceil(approxInputTokens * skill.outputRatio)),
        );

        const completion = await axios.post(
          `${Translator.getOpenAIBaseUrl()}/chat/completions`,
          {
            model,
            messages: [
              {
                role: "system",
                content: Translator.getSystemPrompt(skill.id),
              },
              {
                role: "user",
                content: textBlock,
              },
            ],
            temperature: 0,
            max_tokens: maxTokens,
          },
          {
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 60000,
          },
        );

        const content = completion?.data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("OpenAI response missing content");
        }

        return { content, modelUsed: model };
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        if (status === 401) break;
      }
    }

    throw lastError || new Error("OpenAI request failed");
  }

  static async translateBatchWithChatgpt(batch, openaiApiKey, skillInput) {
    const textBlock = batch
      .map((item, idx) => `${idx + 1}. ${item.text}`)
      .join("\n");

    const { content, modelUsed } = await Translator.requestChatCompletion(
      textBlock,
      openaiApiKey,
      skillInput,
    );
    const parsed = Translator.parseNumberedOutput(content, batch.length);
    return { parsed, modelUsed };
  }

  static async translateText(textToTranslate, engine = "google", options = {}) {
    const skill = Translator.getSkillProfile(options.skill);
    const source = String(textToTranslate || "");
    if (!source.trim()) {
      return {
        translatedText: source,
        engineName: Translator.getEngineName(engine),
        modelUsed: null,
        skillId: skill.id,
        skillName: skill.name,
      };
    }

    const protectedData = Translator.protectTokens(source);
    if (Translator.shouldSkipText(protectedData.text)) {
      return {
        translatedText: source,
        engineName: Translator.getEngineName(engine),
        modelUsed: null,
        skillId: skill.id,
        skillName: skill.name,
      };
    }

    const cache = Translator.loadCache();
    const cacheKey = Translator.buildCacheKey(engine, protectedData.text, skill.id);
    const cached = cache[cacheKey];
    if (typeof cached === "string" && cached.trim().length > 0) {
      const restored = Translator.restorePlaceholders(cached, protectedData.listeners);
      return {
        translatedText: restored,
        engineName: Translator.getEngineName(engine),
        modelUsed: null,
        skillId: skill.id,
        skillName: skill.name,
      };
    }

    let translatedProtected = protectedData.text;
    let modelUsed = null;

    if (engine === "chatgpt") {
      const openaiApiKey = Translator.getChatgptApiKey();
      if (!openaiApiKey) {
        throw new Error("Missing OPENAI_API_KEY or AGENT_ROUTER_TOKEN");
      }
      const { parsed, modelUsed: used } = await Translator.translateBatchWithChatgpt(
        [{ text: protectedData.text }],
        openaiApiKey,
        skill.id,
      );
      translatedProtected = parsed.get(0) || protectedData.text;
      modelUsed = used;
    } else {
      const translate = require("google-translate-api-x");
      const result = await translate(protectedData.text, {
        to: "vi",
        forceBatch: false,
      });
      translatedProtected = result.text || protectedData.text;
    }

    translatedProtected = Translator.polishVietnameseText(
      Translator.applyLocalGlossary(translatedProtected),
    );
    cache[cacheKey] = translatedProtected;
    Translator.saveCache(cache);

    const restored = Translator.restorePlaceholders(
      translatedProtected,
      protectedData.listeners,
    );
    return {
      translatedText: restored,
      engineName: Translator.getEngineName(engine, modelUsed),
      modelUsed,
      skillId: skill.id,
      skillName: skill.name,
    };
  }

  static async translateContent(rawContent, engine = "google", optionsOrProgress) {
    let onProgress = null;
    let options = {};

    if (typeof optionsOrProgress === "function") {
      onProgress = optionsOrProgress;
    } else if (optionsOrProgress && typeof optionsOrProgress === "object") {
      options = optionsOrProgress;
      if (typeof optionsOrProgress.onProgress === "function") {
        onProgress = optionsOrProgress.onProgress;
      }
    }

    const skill = Translator.getSkillProfile(options.skill);
    const content = String(rawContent || "");
    const lines = content.split(/\r?\n/);
    const translatedLines = new Array(lines.length).fill("");

    const commentRegex = /^(\s*#\s*)(.+)$/;
    const keyValRegex = /^(\s*[\w\.\-\']+:?\s+)(['"]?)(.+?)(['"]?)$/;
    const listRegex = /^(\s*-\s+)(['"]?)(.+?)(['"]?)$/;
    const tasks = [];
    let displayEngineName = Translator.getEngineName(engine);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let textToTranslate = "";
      const context = {
        index: i,
        prefix: "",
        suffix: "",
        listeners: [],
        text: "",
      };

      if (commentRegex.test(line)) {
        const match = line.match(commentRegex);
        context.prefix = match[1];
        textToTranslate = match[2];
      } else if (keyValRegex.test(line)) {
        const match = line.match(keyValRegex);
        const valContent = match[3];
        const valPart = valContent.trim();
        const isTechKey = match[1]
          .trim()
          .match(/^(sound|particle|material|icon|type):/i);

        if (isTechKey || Translator.shouldSkipText(valPart)) {
          translatedLines[i] = line;
          continue;
        }

        context.prefix = match[1] + (match[2] || "");
        context.suffix = match[4] || "";
        textToTranslate = valContent;
      } else if (listRegex.test(line)) {
        const match = line.match(listRegex);
        const valContent = match[3];
        if (Translator.shouldSkipText(valContent)) {
          translatedLines[i] = line;
          continue;
        }

        context.prefix = match[1] + (match[2] || "");
        context.suffix = match[4] || "";
        textToTranslate = valContent;
      } else {
        translatedLines[i] = line;
        continue;
      }

      if (!textToTranslate.trim()) {
        translatedLines[i] = line;
        continue;
      }

      const protectedData = Translator.protectTokens(textToTranslate);
      if (Translator.shouldSkipText(protectedData.text)) {
        translatedLines[i] = line;
        continue;
      }

      context.text = protectedData.text;
      context.listeners = protectedData.listeners;
      tasks.push(context);
    }

    if (tasks.length === 0) {
      return {
        outputContent: lines.join("\n"),
        engineName: displayEngineName,
        modelUsed: null,
        totalLines: 0,
        uniqueToTranslate: 0,
        cacheHits: 0,
        skillId: skill.id,
        skillName: skill.name,
      };
    }

    const uniqueMap = new Map();
    tasks.forEach((task) => {
      if (!uniqueMap.has(task.text)) {
        uniqueMap.set(task.text, task);
      }
    });
    const uniqueTasks = Array.from(uniqueMap.values());

    const cache = Translator.loadCache();
    const translatedByText = new Map();
    const tasksToTranslate = [];

    uniqueTasks.forEach((task) => {
      const cacheKey = Translator.buildCacheKey(engine, task.text, skill.id);
      const cached = cache[cacheKey];
      if (typeof cached === "string" && cached.trim().length > 0) {
        translatedByText.set(task.text, cached);
      } else {
        tasksToTranslate.push(task);
      }
    });

    if (typeof onProgress === "function") {
      await onProgress({
        phase: "start",
        engineName: displayEngineName,
        skillId: skill.id,
        skillName: skill.name,
        totalLines: tasks.length,
        uniqueToTranslate: tasksToTranslate.length,
        cacheHits: uniqueTasks.length - tasksToTranslate.length,
      });
    }

    let processed = 0;
    let nextPercentMark = 20;
    let modelUsed = null;

    const updateProgress = async () => {
      if (tasksToTranslate.length === 0 || typeof onProgress !== "function") {
        return;
      }

      const percent = Math.floor((processed / tasksToTranslate.length) * 100);
      if (percent >= nextPercentMark) {
        while (percent >= nextPercentMark) {
          nextPercentMark += 20;
        }
        await onProgress({
          phase: "progress",
          percent: Math.min(percent, 100),
          engineName: displayEngineName,
          skillId: skill.id,
          skillName: skill.name,
          processed,
          total: tasksToTranslate.length,
        });
      }
    };

    if (tasksToTranslate.length > 0) {
      if (engine === "chatgpt") {
        const openaiApiKey = Translator.getChatgptApiKey();
        if (!openaiApiKey) {
          throw new Error("Missing OPENAI_API_KEY or AGENT_ROUTER_TOKEN");
        }

        const batches = Translator.createBatches(
          tasksToTranslate,
          Translator.getBatchSize(),
          Translator.getBatchCharLimit(),
        );

        for (const batch of batches) {
          try {
            const { parsed, modelUsed: used } =
              await Translator.translateBatchWithChatgpt(
                batch,
                openaiApiKey,
                skill.id,
              );
            modelUsed = modelUsed || used;
            if (used) {
              displayEngineName = Translator.getEngineName("chatgpt", used);
            }

            batch.forEach((item, idx) => {
              const translated = parsed.get(idx) || item.text;
              translatedByText.set(item.text, translated);
              cache[Translator.buildCacheKey("chatgpt", item.text, skill.id)] =
                translated;
            });
          } catch (e) {
            console.error("[Translator] ChatGPT batch error:", e.message);
            batch.forEach((item) => {
              translatedByText.set(item.text, item.text);
            });
          }

          processed += batch.length;
          await updateProgress();
        }
      } else {
        const translate = require("google-translate-api-x");
        for (const item of tasksToTranslate) {
          try {
            const result = await translate(item.text, {
              to: "vi",
              forceBatch: false,
            });
            const translated = result.text || item.text;
            translatedByText.set(item.text, translated);
            cache[Translator.buildCacheKey("google", item.text, skill.id)] =
              translated;
          } catch (e) {
            console.error("[Translator] Google translate error:", e.message);
            translatedByText.set(item.text, item.text);
          }

          processed++;
          await updateProgress();
        }
      }

      Translator.saveCache(cache);
    }

    tasks.forEach((task) => {
      const translatedProtected = translatedByText.get(task.text) || task.text || "";
      const glossarized = Translator.applyLocalGlossary(translatedProtected);
      const polished = Translator.polishVietnameseText(glossarized);
      const restored = Translator.restorePlaceholders(polished, task.listeners);
      translatedLines[task.index] = task.prefix + restored + task.suffix;
    });

    for (let i = 0; i < lines.length; i++) {
      if (translatedLines[i] === "") translatedLines[i] = lines[i];
    }

    return {
      outputContent: translatedLines.join("\n"),
      engineName: Translator.getEngineName(engine, modelUsed),
      modelUsed,
      totalLines: tasks.length,
      uniqueToTranslate: tasksToTranslate.length,
      cacheHits: uniqueTasks.length - tasksToTranslate.length,
      skillId: skill.id,
      skillName: skill.name,
    };
  }

  static async translateFile(
    fileUrl,
    fileName,
    engine,
    interaction,
    options = {},
  ) {
    const skill = Translator.getSkillProfile(options.skill);
    const engineEmoji = Translator.getEngineEmoji(engine);

    try {
      const response = await axios.get(fileUrl, { responseType: "text" });
      const content = String(response.data || "");

      const translated = await Translator.translateContent(
        content,
        engine,
        {
          skill: skill.id,
          onProgress: async (progress) => {
            if (progress.phase === "start") {
              await interaction.editReply(
                `${engineEmoji} **Đang xử lý ${progress.totalLines} dòng** (${progress.uniqueToTranslate} dòng unique cần gọi API, cache ${progress.cacheHits})\nSkill: **${progress.skillName}**.`,
              );
              return;
            }

            if (progress.phase === "progress") {
              await interaction.editReply(
                `${engineEmoji} Đang dịch... ${progress.percent}% (${progress.engineName} • ${progress.skillName})`,
              );
            }
          },
        },
      );

      const buffer = Buffer.from(translated.outputContent, "utf-8");
      const resultFile = new AttachmentBuilder(buffer, {
        name: `VI_${fileName}`,
      });

      if (translated.totalLines === 0) {
        await interaction.editReply({
          content:
            "✅ Không có dòng phù hợp để dịch (đa số là kỹ thuật/placeholder).",
          files: [resultFile],
        });
        return;
      }

      await interaction.editReply({
        content:
          `✅ **Hoàn tất!** Đã dịch file \`${fileName}\` bằng **${translated.engineName}**.\n` +
          `🎯 Skill: **${translated.skillName}**\n` +
          `⚡ Tổng ${translated.totalLines} dòng, chỉ gọi API cho ${translated.uniqueToTranslate} dòng unique.`,
        files: [resultFile],
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Có lỗi xảy ra: " + error.message);
    }
  }
}

module.exports = Translator;
