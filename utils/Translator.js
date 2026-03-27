const axios = require("axios");
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { AttachmentBuilder } = require("discord.js");
const { ensureDirForFile, ensureJsonFile } = require("./DataPath");
const {
  TRANSLATE_ARCHIVE_EXTENSIONS,
  TRANSLATE_TEXT_EXTENSIONS,
  TRANSLATE_UPLOAD_EXTENSIONS,
  getExtension,
  isAllowedExtension,
  formatExtensionList,
} = require("./FileExtensionPolicy");
const {
  DEFAULT_TRANSLATION_SKILL,
  TRANSLATION_SKILLS,
} = require("./TranslationSkillProfiles");
const {
  DEFAULT_TARGET_LANGUAGE,
  TRANSLATION_LANGUAGES,
  TRANSLATION_LANGUAGE_ALIASES,
} = require("./TranslationLanguageProfiles");

const TRANSLATION_CACHE_PATH = path.join(
  __dirname,
  "../data/translation_cache.json",
);

const PROTECTED_PATTERNS = [
  /\/[a-z0-9:_-]+(?:\s+[a-z0-9:_<>\-]+)*/gi,
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
  "Warp",
  "Warps",
  "PWarp",
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

const ARCHIVE_POSITIVE_PATH_REGEX =
  /(?:^|\/)(?:lang|locale|locales|languages|i18n|message|messages|translation|translations|resource|resources|config|configs)(?:\/|$)/i;
const ARCHIVE_POSITIVE_FILE_REGEX =
  /(message|messages|lang|language|locale|translation|strings?|dictionary|config|default)/i;
const ARCHIVE_ENGLISH_HINT_REGEX =
  /(^|[._-])(en|en_us|en-gb|english|default)([._-]|$)/i;
const ARCHIVE_NON_ENGLISH_HINT_REGEX =
  /(^|[._-])(vi|vn|de|fr|es|ru|ja|jp|ko|zh|cn|th|id|pt|it|tr|pl|uk|cz|hu|ro|sk)([._-]|$)/i;
const ARCHIVE_NEGATIVE_HINT_REGEX = /(test|example|sample|demo|changelog|license|readme)/i;

function buildInputError(message) {
  const error = new Error(message);
  error.code = "INVALID_TRANSLATE_INPUT";
  return error;
}

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_AGENT_ROUTER_BASE_URL = "https://agentrouter.org/v1";
const CHATGPT_AUTH_CHECK_TTL_MS = 90 * 1000;
let chatgptAuthCheckCache = {
  cacheKey: "",
  checkedAt: 0,
  result: null,
  pending: null,
};
const DEFAULT_TRANSLATE_MODELS = Object.freeze([
  "gpt-5-nano",
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "deepseek-r1-0528",
  "deepseek-v3.1",
  "deepseek-v3.2",
  "glm-4.5",
  "glm-4.6",
]);
const DEFAULT_MODEL_PRICING_USD_PER_1M = Object.freeze({
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
  // Input rate uses non-cached input pricing for consistent estimation.
  "deepseek-r1-0528": { input: 0.55, output: 2.19 },
  "deepseek-v3.1": { input: 0.56, output: 1.68 },
  "deepseek-v3.2": { input: 0.28, output: 0.42 },
  "glm-4.5": { input: 0.6, output: 2.2 },
  "glm-4.6": { input: 0.6, output: 2.2 },
});

function clampInt(value, fallback, min, max) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function safeRound(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function parseCsvList(input) {
  return String(input || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class Translator {
  static getSupportedTranslateExtensions() {
    return TRANSLATE_UPLOAD_EXTENSIONS;
  }

  static getSupportedTranslateExtensionsText() {
    return formatExtensionList(TRANSLATE_UPLOAD_EXTENSIONS);
  }

  static isSupportedTranslateFile(fileName) {
    return isAllowedExtension(fileName, TRANSLATE_UPLOAD_EXTENSIONS);
  }

  static getOpenAIApiKey() {
    return String(process.env.OPENAI_API_KEY || "").trim();
  }

  static getAgentRouterToken() {
    return String(process.env.AGENT_ROUTER_TOKEN || "").trim();
  }

  static getChatgptApiKeyCandidates() {
    const openaiKey = Translator.getOpenAIApiKey();
    const agentRouterToken = Translator.getAgentRouterToken();
    const preferAgentRouter = Translator.isAgentRouterBase(
      Translator.getOpenAIBaseUrl(),
    );
    const ordered = preferAgentRouter
      ? [agentRouterToken, openaiKey]
      : [openaiKey, agentRouterToken];
    return Array.from(new Set(ordered.filter(Boolean)));
  }

  static getChatgptApiKey() {
    return Translator.getChatgptApiKeyCandidates()[0] || "";
  }

  static isAgentRouterBase(baseUrl = "") {
    return /agentrouter/i.test(String(baseUrl || ""));
  }

  static getOpenAIBaseUrl() {
    const configuredBase = String(process.env.OPENAI_API_BASE || "").trim();
    if (configuredBase) return configuredBase.replace(/\/+$/, "");

    const openaiKey = Translator.getOpenAIApiKey();
    const agentRouterToken = Translator.getAgentRouterToken();
    if (agentRouterToken && (!openaiKey || openaiKey === agentRouterToken)) {
      return DEFAULT_AGENT_ROUTER_BASE_URL;
    }

    return DEFAULT_OPENAI_BASE_URL;
  }

  static getProviderName() {
    return Translator.isAgentRouterBase(Translator.getOpenAIBaseUrl())
      ? "AgentRouter"
      : "OpenAI";
  }

  static async checkChatgptAvailability({ force = false } = {}) {
    const baseUrl = Translator.getOpenAIBaseUrl();
    const provider = Translator.getProviderName();
    const apiKey = Translator.getChatgptApiKey();
    if (!apiKey) {
      return {
        configured: false,
        available: false,
        status: null,
        provider,
        message:
          "Server chưa cấu hình OPENAI_API_KEY hoặc AGENT_ROUTER_TOKEN.",
      };
    }

    const cacheKey = `${baseUrl}|${apiKey.slice(0, 8)}|${apiKey.length}`;
    const now = Date.now();
    if (
      !force &&
      chatgptAuthCheckCache.result &&
      chatgptAuthCheckCache.cacheKey === cacheKey &&
      now - chatgptAuthCheckCache.checkedAt < CHATGPT_AUTH_CHECK_TTL_MS
    ) {
      return chatgptAuthCheckCache.result;
    }

    if (
      !force &&
      chatgptAuthCheckCache.pending &&
      chatgptAuthCheckCache.cacheKey === cacheKey
    ) {
      return chatgptAuthCheckCache.pending;
    }

    const request = (async () => {
      try {
        const response = await axios.get(`${baseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
          validateStatus: () => true,
        });
        const status = Number(response?.status || 0);
        const providerMessage =
          response?.data?.error?.message || response?.data?.message || "";
        let result;
        if (status >= 200 && status < 300) {
          result = {
            configured: true,
            available: true,
            status,
            provider,
            message: null,
          };
        } else {
          result = {
            configured: true,
            available: false,
            status,
            provider,
            message:
              providerMessage ||
              `Xác thực thất bại (${status}) tại ${baseUrl}.`,
          };
        }
        chatgptAuthCheckCache = {
          cacheKey,
          checkedAt: Date.now(),
          result,
          pending: null,
        };
        return result;
      } catch (error) {
        const status = Number(error?.response?.status || 0) || null;
        const providerMessage =
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          "Không thể xác thực provider.";
        const result = {
          configured: true,
          available: false,
          status,
          provider,
          message: providerMessage,
        };
        chatgptAuthCheckCache = {
          cacheKey,
          checkedAt: Date.now(),
          result,
          pending: null,
        };
        return result;
      }
    })();

    chatgptAuthCheckCache = {
      ...chatgptAuthCheckCache,
      cacheKey,
      pending: request,
    };
    return request;
  }

  static getDefaultModelId() {
    const configured = String(process.env.OPENAI_TRANSLATE_MODEL || "").trim();
    if (configured) return configured;
    return DEFAULT_TRANSLATE_MODELS[0];
  }

  static getConfiguredModelList() {
    const explicit = parseCsvList(process.env.OPENAI_TRANSLATE_MODELS);
    const fallback = parseCsvList(process.env.TRANSLATE_MODEL_LIST);
    const configured = explicit.length > 0 ? explicit : fallback;
    const merged = [
      Translator.getDefaultModelId(),
      ...configured,
      ...DEFAULT_TRANSLATE_MODELS,
    ].filter(Boolean);
    return Array.from(new Set(merged));
  }

  static normalizeModelId(modelInput) {
    const requested = String(modelInput || "").trim();
    if (requested) return requested;
    return Translator.getDefaultModelId();
  }

  static getChatgptModel(modelInput) {
    return Translator.normalizeModelId(modelInput);
  }

  static getModelPricingMap() {
    let pricingMap = { ...DEFAULT_MODEL_PRICING_USD_PER_1M };
    const raw = String(process.env.OPENAI_MODEL_PRICING_JSON || "").trim();
    if (!raw) return pricingMap;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return pricingMap;
      }

      Object.entries(parsed).forEach(([model, value]) => {
        if (!model || !value || typeof value !== "object") return;
        const input = clampNumber(value.input, NaN, 0, 1000000);
        const output = clampNumber(value.output, NaN, 0, 1000000);
        if (!Number.isFinite(input) || !Number.isFinite(output)) return;
        pricingMap[String(model).trim()] = {
          input: input,
          output: output,
        };
      });
    } catch (error) {
      console.warn(
        "[Translator] OPENAI_MODEL_PRICING_JSON parse error:",
        error.message,
      );
    }

    return pricingMap;
  }

  static getModelPricing(modelInput) {
    const model = Translator.normalizeModelId(modelInput);
    const pricingMap = Translator.getModelPricingMap();
    const price = pricingMap[model];
    if (!price) {
      return {
        model,
        pricingKnown: false,
        inputPer1M: null,
        outputPer1M: null,
      };
    }
    return {
      model,
      pricingKnown: true,
      inputPer1M: clampNumber(price.input, 0, 0, 1000000),
      outputPer1M: clampNumber(price.output, 0, 0, 1000000),
    };
  }

  static listModelMeta() {
    const list = Translator.getConfiguredModelList();
    const defaultModel = Translator.getDefaultModelId();
    return list.map((id) => {
      const pricing = Translator.getModelPricing(id);
      return {
        id,
        recommended: id === defaultModel,
        pricingKnown: pricing.pricingKnown,
        inputPer1M: pricing.inputPer1M,
        outputPer1M: pricing.outputPer1M,
      };
    });
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

  static getLanguageProfiles() {
    return TRANSLATION_LANGUAGES;
  }

  static getDefaultTargetLanguageId() {
    const configured = String(
      process.env.TRANSLATE_TARGET_LANG || process.env.TRANSLATE_TARGET_LANGUAGE || "",
    )
      .trim()
      .toLowerCase();
    if (!configured) return DEFAULT_TARGET_LANGUAGE;
    return Translator.normalizeTargetLanguageId(configured);
  }

  static normalizeTargetLanguageId(targetLanguageInput) {
    const requested = String(targetLanguageInput || "").trim();
    if (!requested) return DEFAULT_TARGET_LANGUAGE;

    const lower = requested.toLowerCase();
    const aliasTarget = TRANSLATION_LANGUAGE_ALIASES[lower];
    if (aliasTarget && TRANSLATION_LANGUAGES[aliasTarget]) {
      return aliasTarget;
    }

    const exact = Object.keys(TRANSLATION_LANGUAGES).find(
      (key) => key.toLowerCase() === lower,
    );
    if (exact) return TRANSLATION_LANGUAGES[exact].id;

    return DEFAULT_TARGET_LANGUAGE;
  }

  static getTargetLanguageProfile(targetLanguageInput) {
    const id = Translator.normalizeTargetLanguageId(targetLanguageInput);
    const profile = TRANSLATION_LANGUAGES[id];
    return {
      id: profile.id,
      name: profile.name,
      nativeName: profile.nativeName,
      promptName: profile.promptName,
      googleCode: profile.googleCode,
    };
  }

  static listLanguageMeta() {
    const defaultLanguage = Translator.getDefaultTargetLanguageId();
    return Object.values(TRANSLATION_LANGUAGES).map((language) => ({
      id: language.id,
      name: language.name,
      nativeName: language.nativeName,
      recommended: language.id === defaultLanguage,
    }));
  }

  static isVietnameseTarget(targetLanguageInput) {
    return Translator.normalizeTargetLanguageId(targetLanguageInput) === "vi";
  }

  static buildOutputPrefix(targetLanguageInput) {
    const language = Translator.getTargetLanguageProfile(targetLanguageInput);
    return String(language.id || "vi")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
  }

  static buildTranslatedFileName(baseName, targetLanguageInput) {
    const prefix = Translator.buildOutputPrefix(targetLanguageInput);
    return `${prefix}_${baseName}`;
  }

  static getEngineName(engine, modelUsed) {
    if (engine === "chatgpt") {
      const modelName = modelUsed || Translator.getDefaultModelId();
      return `ChatGPT (${modelName})`;
    }
    return "Google Translate";
  }

  static getEngineEmoji(engine) {
    return engine === "chatgpt" ? "⭐" : "🌐";
  }

  static getChatgptModelCandidates(modelInput) {
    const requestedModel = Translator.normalizeModelId(modelInput);
    return Array.from(
      new Set([
        requestedModel,
        ...Translator.getConfiguredModelList(),
        "gpt-4o-mini",
      ]),
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

  static estimateTokenCount(text, baseOverhead = 0) {
    const normalized = String(text || "");
    if (!normalized) return Math.max(0, baseOverhead);
    return Math.max(1, Math.ceil(normalized.length / 4) + baseOverhead);
  }

  static emptyUsage() {
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  static normalizeUsage(rawUsage) {
    if (!rawUsage || typeof rawUsage !== "object") return null;

    const inputTokens = safeRound(
      rawUsage.prompt_tokens ?? rawUsage.input_tokens ?? 0,
    );
    const outputTokens = safeRound(
      rawUsage.completion_tokens ?? rawUsage.output_tokens ?? 0,
    );
    const totalTokens =
      safeRound(rawUsage.total_tokens) || inputTokens + outputTokens;

    if (inputTokens <= 0 && outputTokens <= 0 && totalTokens <= 0) {
      return null;
    }

    return {
      inputTokens,
      outputTokens,
      totalTokens,
    };
  }

  static mergeUsage(target, nextUsage) {
    if (!nextUsage) return target;
    target.inputTokens += safeRound(nextUsage.inputTokens);
    target.outputTokens += safeRound(nextUsage.outputTokens);
    target.totalTokens +=
      safeRound(nextUsage.totalTokens) ||
      safeRound(nextUsage.inputTokens) + safeRound(nextUsage.outputTokens);
    return target;
  }

  static estimateUsageForTextBlock(textBlock, skillInput) {
    const skill = Translator.getSkillProfile(skillInput);
    const inputTokens = Translator.estimateTokenCount(textBlock, 120);
    const outputTokens = Math.min(
      skill.maxTokens,
      Math.max(skill.minTokens, Math.ceil(inputTokens * skill.outputRatio)),
    );
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  static calculateCostUsd(usage, modelInput) {
    const usageSafe = usage || Translator.emptyUsage();
    const pricing = Translator.getModelPricing(modelInput);
    if (!pricing.pricingKnown) {
      return {
        ...pricing,
        totalUsd: null,
        inputUsd: null,
        outputUsd: null,
      };
    }

    const inputUsd = (usageSafe.inputTokens / 1000000) * pricing.inputPer1M;
    const outputUsd = (usageSafe.outputTokens / 1000000) * pricing.outputPer1M;
    return {
      ...pricing,
      inputUsd,
      outputUsd,
      totalUsd: inputUsd + outputUsd,
    };
  }

  static buildCostSummary({
    engine,
    modelUsed,
    estimatedUsage,
    actualUsage,
    fromCache = false,
  }) {
    if (engine !== "chatgpt") {
      return {
        engine,
        model: null,
        fromCache,
        estimatedUsage: Translator.emptyUsage(),
        actualUsage: null,
        pricingKnown: false,
        estimatedUsd: null,
        actualUsd: null,
        inputPer1M: null,
        outputPer1M: null,
        provider: null,
      };
    }

    const model = Translator.normalizeModelId(modelUsed);
    const estimated = estimatedUsage || Translator.emptyUsage();
    const actual = actualUsage || null;
    const estimatedCost = Translator.calculateCostUsd(estimated, model);
    const actualCost = actual ? Translator.calculateCostUsd(actual, model) : null;

    return {
      engine,
      model,
      fromCache,
      estimatedUsage: estimated,
      actualUsage: actual,
      pricingKnown: estimatedCost.pricingKnown,
      estimatedUsd: estimatedCost.totalUsd,
      actualUsd: actualCost ? actualCost.totalUsd : null,
      inputPer1M: estimatedCost.inputPer1M,
      outputPer1M: estimatedCost.outputPer1M,
      provider: Translator.getProviderName(),
    };
  }

  static formatUsd(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "N/A";
    if (num === 0) return "$0.0000";
    if (num < 0.01) return `$${num.toFixed(4)}`;
    if (num < 1) return `$${num.toFixed(3)}`;
    return `$${num.toFixed(2)}`;
  }

  static buildCostLine(cost) {
    if (!cost || cost.engine !== "chatgpt") {
      return "💵 Chi phí ước lượng: $0.0000 (Google Translate)";
    }

    const usage = cost.actualUsage || cost.estimatedUsage || Translator.emptyUsage();
    const usedActual = !!cost.actualUsage;
    const usd = usedActual ? cost.actualUsd : cost.estimatedUsd;
    const usageLabel = usedActual ? "actual" : "estimated";
    if (!cost.pricingKnown) {
      return (
        `🧮 Token ${usageLabel}: ${usage.totalTokens} (in ${usage.inputTokens} / out ${usage.outputTokens})\n` +
        `💵 Chưa có bảng giá cho model \`${cost.model}\` (hãy cấu hình OPENAI_MODEL_PRICING_JSON).`
      );
    }
    return (
      `🧮 Token ${usageLabel}: ${usage.totalTokens} (in ${usage.inputTokens} / out ${usage.outputTokens})\n` +
      `💵 Chi phí ${usageLabel}: ${Translator.formatUsd(usd)} (model \`${cost.model}\`, provider ${cost.provider})`
    );
  }

  static scoreArchiveEntry(entryName, content, byteSize = 0) {
    const normalizedName = String(entryName || "")
      .replace(/\\/g, "/")
      .toLowerCase();
    const fileName = path.basename(normalizedName);
    const ext = getExtension(fileName);
    const preview = String(content || "").slice(0, 2500);
    const lineCount = preview.split(/\r?\n/).length;
    const lettersCount = (preview.match(/[A-Za-z]/g) || []).length;
    const printableRatio = preview.length
      ? (preview.match(/[ -~\r\n\t]/g) || []).length / preview.length
      : 0;

    let score = 0;

    if (ARCHIVE_POSITIVE_PATH_REGEX.test(normalizedName)) score += 42;
    if (ARCHIVE_POSITIVE_FILE_REGEX.test(fileName)) score += 35;
    if (ARCHIVE_ENGLISH_HINT_REGEX.test(fileName)) score += 36;
    if (ARCHIVE_NON_ENGLISH_HINT_REGEX.test(fileName)) score -= 38;
    if (ARCHIVE_NEGATIVE_HINT_REGEX.test(normalizedName)) score -= 18;

    if (ext === ".yml" || ext === ".yaml" || ext === ".ym") score += 16;
    else if (
      ext === ".properties" ||
      ext === ".lang" ||
      ext === ".conf" ||
      ext === ".ini" ||
      ext === ".toml"
    )
      score += 12;
    else if (ext === ".json") score += 10;
    else if (ext === ".txt") score += 8;
    else if (ext === ".md") score += 3;

    if (lineCount >= 6) score += 6;
    if (lettersCount >= 25) score += 8;
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(preview)) {
      score -= 10;
    }

    if (printableRatio < 0.9) score -= 25;
    if (byteSize > 0 && byteSize < 16) score -= 12;

    return score;
  }

  static resolveArchiveTranslationTarget(fileBuffer, originalName) {
    let zip;
    try {
      zip = new AdmZip(fileBuffer);
    } catch (error) {
      throw buildInputError(
        `Không thể mở file archive \`${originalName}\`. Đảm bảo file không bị lỗi.`,
      );
    }

    const entries = zip
      .getEntries()
      .filter(
        (entry) =>
          !entry.isDirectory &&
          isAllowedExtension(entry.entryName, TRANSLATE_TEXT_EXTENSIONS),
      );

    if (entries.length === 0) {
      throw buildInputError(
        "Không tìm thấy file text/config phù hợp trong archive để dịch.",
      );
    }

    const candidates = [];

    entries.forEach((entry) => {
      try {
        const entryName = String(entry.entryName || "").replace(/\\/g, "/");
        const content = zip.readAsText(entry, "utf8");
        if (!String(content || "").trim()) return;

        const score = Translator.scoreArchiveEntry(
          entryName,
          content,
          Number(entry.header?.size || 0),
        );

        candidates.push({
          entryName,
          content,
          score,
          byteSize: Number(entry.header?.size || 0),
        });
      } catch (error) {
        console.warn(
          `[Translator] Skip archive entry ${entry.entryName}: ${error.message}`,
        );
      }
    });

    if (candidates.length === 0) {
      throw buildInputError(
        "Không đọc được nội dung text hợp lệ từ archive đã upload.",
      );
    }

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.byteSize !== a.byteSize) return b.byteSize - a.byteSize;
      return a.entryName.localeCompare(b.entryName);
    });

    const best = candidates[0];

    return {
      sourceKind: "archive",
      sourceEntryPath: best.entryName,
      outputFileName: `VI_${path.basename(best.entryName)}`,
      content: best.content,
      candidateCount: candidates.length,
      selectedScore: best.score,
    };
  }

  static prepareInputForTranslation(fileBuffer, originalName, targetLanguageInput) {
    const safeName = path.basename(String(originalName || "config.yml"));
    const ext = getExtension(safeName);
    const targetLanguage = Translator.getTargetLanguageProfile(
      targetLanguageInput,
    );

    if (!Translator.isSupportedTranslateFile(safeName)) {
      throw buildInputError(
        `Định dạng file không được hỗ trợ. Hỗ trợ: ${Translator.getSupportedTranslateExtensionsText()}`,
      );
    }

    const normalizedBuffer = Buffer.isBuffer(fileBuffer)
      ? fileBuffer
      : Buffer.from(fileBuffer || "");

    if (TRANSLATE_ARCHIVE_EXTENSIONS.includes(ext)) {
      const resolved = Translator.resolveArchiveTranslationTarget(
        normalizedBuffer,
        safeName,
      );
      return {
        ...resolved,
        originalName: safeName,
        outputFileName: Translator.buildTranslatedFileName(
          path.basename(resolved.sourceEntryPath),
          targetLanguage.id,
        ),
        targetLanguageId: targetLanguage.id,
        targetLanguageName: targetLanguage.nativeName,
      };
    }

    return {
      sourceKind: "direct",
      sourceEntryPath: safeName,
      outputFileName: Translator.buildTranslatedFileName(
        safeName,
        targetLanguage.id,
      ),
      content: normalizedBuffer.toString("utf8"),
      candidateCount: 1,
      selectedScore: null,
      originalName: safeName,
      targetLanguageId: targetLanguage.id,
      targetLanguageName: targetLanguage.nativeName,
    };
  }

  static getSystemPrompt(skillInput, targetLanguageInput) {
    const skill = Translator.getSkillProfile(skillInput);
    const language = Translator.getTargetLanguageProfile(targetLanguageInput);
    return (
      `Translate English text to ${language.promptName} for Minecraft plugin configs. ` +
      "Keep placeholders/tokens unchanged: ZZVAR0ZZ, %name%, {value}, ${value}, color codes (&a, §a), <tags>, commands, permission nodes. " +
      "Keep plugin and platform names in English. Use consistent Minecraft terminology. " +
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

  static buildCacheKey(
    engine,
    text,
    skillInput,
    modelInput = null,
    targetLanguageInput = null,
  ) {
    const digest = crypto.createHash("sha1").update(String(text)).digest("hex");
    const skillId = Translator.normalizeSkillId(skillInput);
    const langId = Translator.normalizeTargetLanguageId(targetLanguageInput);
    if (String(engine || "").toLowerCase() === "chatgpt") {
      const modelId = Translator.normalizeModelId(modelInput);
      return `${engine}:${skillId}:${langId}:${modelId}:${digest}`;
    }
    return `${engine}:${skillId}:${langId}:${digest}`;
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

    const putPlaceholder = (value, prefix = "VAR") => {
      const placeholder = `ZZ${prefix}${index}ZZ`;
      index++;
      listeners.push({ ph: placeholder, val: value });
      return placeholder;
    };

    PROTECTED_PATTERNS.forEach((regex) => {
      text = text.replace(regex, (match) => putPlaceholder(match, "VAR"));
    });

    PROTECTED_TERMS.forEach((term) => {
      const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
      text = text.replace(regex, (match) => putPlaceholder(match, "TERM"));
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

  static hasVietnameseSignal(input) {
    return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      String(input || ""),
    );
  }

  static shouldApplyGlossary(sourceText, translatedText) {
    const source = String(sourceText || "").trim();
    const translated = String(translatedText || "").trim();
    if (!translated) return false;
    if (translated !== source) return true;
    return Translator.hasVietnameseSignal(translated);
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

  static async requestChatCompletion(textBlock, openaiApiKey, options = {}) {
    const skill = Translator.getSkillProfile(options.skill);
    const modelCandidates = Translator.getChatgptModelCandidates(options.model);
    const explicitApiKey = String(openaiApiKey || "").trim();
    const apiKeyCandidates = Array.from(
      new Set([
        explicitApiKey,
        ...Translator.getChatgptApiKeyCandidates(),
      ].filter(Boolean)),
    );
    if (apiKeyCandidates.length === 0) {
      throw new Error("Missing OPENAI_API_KEY or AGENT_ROUTER_TOKEN");
    }
    const baseUrl = Translator.getOpenAIBaseUrl();
    let lastError = null;

    for (const apiKey of apiKeyCandidates) {
      for (const model of modelCandidates) {
        try {
          const estimatedUsage = Translator.estimateUsageForTextBlock(
            textBlock,
            skill.id,
          );
          const maxTokens = Math.min(skill.maxTokens, estimatedUsage.outputTokens);

          const completion = await axios.post(
            `${baseUrl}/chat/completions`,
            {
              model,
              messages: [
                {
                  role: "system",
                  content: Translator.getSystemPrompt(
                    skill.id,
                    options.targetLanguage,
                  ),
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
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              timeout: 60000,
            },
          );

          const content = completion?.data?.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error("OpenAI response missing content");
          }

          return {
            content,
            modelUsed: model,
            usage: Translator.normalizeUsage(completion?.data?.usage),
            estimatedUsage,
          };
        } catch (error) {
          lastError = error;
          // A model may be restricted on a provider; continue trying other models.
          // If all models fail with 401/403, the last error is surfaced to caller.
          const status = error?.response?.status;
          if (status === 401 || status === 403) continue;
        }
      }
    }

    throw lastError || new Error("OpenAI request failed");
  }

  static async translateBatchWithChatgpt(batch, openaiApiKey, options = {}) {
    const textBlock = batch
      .map((item, idx) => `${idx + 1}. ${item.text}`)
      .join("\n");

    const {
      content,
      modelUsed,
      usage,
      estimatedUsage,
    } = await Translator.requestChatCompletion(
      textBlock,
      openaiApiKey,
      options,
    );
    const parsed = Translator.parseNumberedOutput(content, batch.length);
    return { parsed, modelUsed, usage, estimatedUsage };
  }

  static async translateText(textToTranslate, engine = "google", options = {}) {
    const skill = Translator.getSkillProfile(options.skill);
    const requestedModel = Translator.normalizeModelId(options.model);
    const targetLanguage = Translator.getTargetLanguageProfile(
      options.targetLanguage || options.targetLang || options.to,
    );
    const useVietnamesePostProcessing = Translator.isVietnameseTarget(
      targetLanguage.id,
    );
    const source = String(textToTranslate || "");
    if (!source.trim()) {
      const modelOnNoop = engine === "chatgpt" ? requestedModel : null;
      return {
        translatedText: source,
        engineName: Translator.getEngineName(engine, modelOnNoop),
        modelUsed: modelOnNoop,
        skillId: skill.id,
        skillName: skill.name,
        targetLanguageId: targetLanguage.id,
        targetLanguageName: targetLanguage.nativeName,
        cost: Translator.buildCostSummary({
          engine,
          modelUsed: requestedModel,
          estimatedUsage: Translator.emptyUsage(),
          actualUsage: null,
          fromCache: true,
        }),
      };
    }

    const protectedData = Translator.protectTokens(source);
    if (Translator.shouldSkipText(protectedData.text)) {
      const modelOnSkip = engine === "chatgpt" ? requestedModel : null;
      return {
        translatedText: source,
        engineName: Translator.getEngineName(engine, modelOnSkip),
        modelUsed: modelOnSkip,
        skillId: skill.id,
        skillName: skill.name,
        targetLanguageId: targetLanguage.id,
        targetLanguageName: targetLanguage.nativeName,
        cost: Translator.buildCostSummary({
          engine,
          modelUsed: requestedModel,
          estimatedUsage: Translator.emptyUsage(),
          actualUsage: null,
          fromCache: true,
        }),
      };
    }

    const cache = Translator.loadCache();
    const cacheKey = Translator.buildCacheKey(
      engine,
      protectedData.text,
      skill.id,
      requestedModel,
      targetLanguage.id,
    );
    const cached = cache[cacheKey];
    if (typeof cached === "string" && cached.trim().length > 0) {
      const restored = Translator.restorePlaceholders(cached, protectedData.listeners);
      const modelOnCache = engine === "chatgpt" ? requestedModel : null;
      return {
        translatedText: restored,
        engineName: Translator.getEngineName(engine, modelOnCache),
        modelUsed: modelOnCache,
        skillId: skill.id,
        skillName: skill.name,
        targetLanguageId: targetLanguage.id,
        targetLanguageName: targetLanguage.nativeName,
        cost: Translator.buildCostSummary({
          engine,
          modelUsed: requestedModel,
          estimatedUsage: Translator.emptyUsage(),
          actualUsage: null,
          fromCache: true,
        }),
      };
    }

    let translatedProtected = protectedData.text;
    let modelUsed = null;
    let estimatedUsage = Translator.emptyUsage();
    let actualUsage = null;

    if (engine === "chatgpt") {
      const openaiApiKey = Translator.getChatgptApiKey();
      if (!openaiApiKey) {
        throw new Error("Missing OPENAI_API_KEY or AGENT_ROUTER_TOKEN");
      }
      const {
        parsed,
        modelUsed: used,
        usage,
        estimatedUsage: estimatedFromBatch,
      } = await Translator.translateBatchWithChatgpt(
        [{ text: protectedData.text }],
        openaiApiKey,
        {
          skill: skill.id,
          model: requestedModel,
          targetLanguage: targetLanguage.id,
        },
      );
      translatedProtected = parsed.get(0) || protectedData.text;
      modelUsed = used;
      estimatedUsage = estimatedFromBatch || Translator.emptyUsage();
      actualUsage = usage || null;
    } else {
      const translate = require("google-translate-api-x");
      const result = await translate(protectedData.text, {
        to: targetLanguage.googleCode,
        forceBatch: false,
      });
      translatedProtected = result.text || protectedData.text;
    }

    if (
      useVietnamesePostProcessing &&
      Translator.shouldApplyGlossary(protectedData.text, translatedProtected)
    ) {
      translatedProtected = Translator.polishVietnameseText(
        Translator.applyLocalGlossary(translatedProtected),
      );
    }
    cache[cacheKey] = translatedProtected;
    if (engine === "chatgpt" && modelUsed && modelUsed !== requestedModel) {
      cache[
        Translator.buildCacheKey(
          "chatgpt",
          protectedData.text,
          skill.id,
          modelUsed,
          targetLanguage.id,
        )
      ] = translatedProtected;
    }
    Translator.saveCache(cache);

    const restored = Translator.restorePlaceholders(
      translatedProtected,
      protectedData.listeners,
    );
    const finalModel = engine === "chatgpt" ? modelUsed || requestedModel : null;
    return {
      translatedText: restored,
      engineName: Translator.getEngineName(engine, finalModel),
      modelUsed: finalModel,
      skillId: skill.id,
      skillName: skill.name,
      targetLanguageId: targetLanguage.id,
      targetLanguageName: targetLanguage.nativeName,
      cost: Translator.buildCostSummary({
        engine,
        modelUsed: finalModel,
        estimatedUsage,
        actualUsage,
        fromCache: false,
      }),
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
    const requestedModel = Translator.normalizeModelId(options.model);
    const targetLanguage = Translator.getTargetLanguageProfile(
      options.targetLanguage || options.targetLang || options.to,
    );
    const useVietnamesePostProcessing = Translator.isVietnameseTarget(
      targetLanguage.id,
    );
    const content = String(rawContent || "");
    const lines = content.split(/\r?\n/);
    const translatedLines = new Array(lines.length).fill("");

    const commentRegex = /^(\s*#\s*)(.+)$/;
    const keyValRegex = /^(\s*[\w\.\-\']+:?\s+)(['"]?)(.+?)(['"]?)$/;
    const listRegex = /^(\s*-\s+)(['"]?)(.+?)(['"]?)$/;
    const tasks = [];
    let displayEngineName = Translator.getEngineName(engine, requestedModel);

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
        modelUsed: engine === "chatgpt" ? requestedModel : null,
        totalLines: 0,
        uniqueToTranslate: 0,
        cacheHits: 0,
        skillId: skill.id,
        skillName: skill.name,
        targetLanguageId: targetLanguage.id,
        targetLanguageName: targetLanguage.nativeName,
        cost: Translator.buildCostSummary({
          engine,
          modelUsed: requestedModel,
          estimatedUsage: Translator.emptyUsage(),
          actualUsage: null,
          fromCache: true,
        }),
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
      const cacheKey = Translator.buildCacheKey(
        engine,
        task.text,
        skill.id,
        requestedModel,
        targetLanguage.id,
      );
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
        model: engine === "chatgpt" ? requestedModel : null,
        targetLanguageId: targetLanguage.id,
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
    const estimatedUsageTotal = Translator.emptyUsage();
    const actualUsageTotal = Translator.emptyUsage();
    let hasActualUsage = false;

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
          model: engine === "chatgpt" ? requestedModel : null,
          targetLanguageId: targetLanguage.id,
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
            const {
              parsed,
              modelUsed: used,
              usage,
              estimatedUsage,
            } =
              await Translator.translateBatchWithChatgpt(
                batch,
                openaiApiKey,
                {
                  skill: skill.id,
                  model: requestedModel,
                  targetLanguage: targetLanguage.id,
                },
              );
            Translator.mergeUsage(estimatedUsageTotal, estimatedUsage);
            if (usage) {
              Translator.mergeUsage(actualUsageTotal, usage);
              hasActualUsage = true;
            }
            modelUsed = modelUsed || used;
            if (used) {
              displayEngineName = Translator.getEngineName("chatgpt", used);
            }

            batch.forEach((item, idx) => {
              const translated = parsed.get(idx) || item.text;
              translatedByText.set(item.text, translated);
              const resolvedModel = used || requestedModel;
              cache[
                Translator.buildCacheKey(
                  "chatgpt",
                  item.text,
                  skill.id,
                  resolvedModel,
                  targetLanguage.id,
                )
              ] = translated;
              if (resolvedModel !== requestedModel) {
                cache[
                  Translator.buildCacheKey(
                    "chatgpt",
                    item.text,
                    skill.id,
                    requestedModel,
                    targetLanguage.id,
                  )
                ] = translated;
              }
            });
          } catch (e) {
            const status = e?.response?.status;
            if (status === 401 || status === 403) {
              throw e;
            }
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
              to: targetLanguage.googleCode,
              forceBatch: false,
            });
            const translated = result.text || item.text;
            translatedByText.set(item.text, translated);
            cache[
              Translator.buildCacheKey(
                "google",
                item.text,
                skill.id,
                null,
                targetLanguage.id,
              )
            ] =
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
      let polished = translatedProtected;
      if (
        useVietnamesePostProcessing &&
        Translator.shouldApplyGlossary(task.text, translatedProtected)
      ) {
        polished = Translator.applyLocalGlossary(polished);
      }
      if (useVietnamesePostProcessing) {
        polished = Translator.polishVietnameseText(polished);
      }
      const restored = Translator.restorePlaceholders(polished, task.listeners);
      let escaped = restored;
      if (task.prefix.endsWith("'") && task.suffix === "'") {
        escaped = escaped.replace(/'/g, "''");
      }
      translatedLines[task.index] = task.prefix + escaped + task.suffix;
    });

    for (let i = 0; i < lines.length; i++) {
      if (translatedLines[i] === "") translatedLines[i] = lines[i];
    }

    const finalModel =
      engine === "chatgpt" ? modelUsed || requestedModel : null;
    const estimatedUsage =
      engine === "chatgpt" ? estimatedUsageTotal : Translator.emptyUsage();
    const actualUsage =
      engine === "chatgpt" && hasActualUsage ? actualUsageTotal : null;

    return {
      outputContent: translatedLines.join("\n"),
      engineName: Translator.getEngineName(engine, finalModel),
      modelUsed: finalModel,
      totalLines: tasks.length,
      uniqueToTranslate: tasksToTranslate.length,
      cacheHits: uniqueTasks.length - tasksToTranslate.length,
      skillId: skill.id,
      skillName: skill.name,
      targetLanguageId: targetLanguage.id,
      targetLanguageName: targetLanguage.nativeName,
      cost: Translator.buildCostSummary({
        engine,
        modelUsed: finalModel || requestedModel,
        estimatedUsage,
        actualUsage,
        fromCache: tasksToTranslate.length === 0,
      }),
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
    const requestedModel = Translator.normalizeModelId(options.model);
    const targetLanguage = Translator.getTargetLanguageProfile(
      options.targetLanguage || options.targetLang || options.to,
    );
    const engineEmoji = Translator.getEngineEmoji(engine);

    try {
      await interaction.editReply(`${engineEmoji} Đang phân tích file đầu vào...`);
      const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
      const inputBuffer = Buffer.from(response.data || []);
      const preparedInput = Translator.prepareInputForTranslation(
        inputBuffer,
        fileName,
        targetLanguage.id,
      );

      const translated = await Translator.translateContent(
        preparedInput.content,
        engine,
        {
          skill: skill.id,
          targetLanguage: targetLanguage.id,
          onProgress: async (progress) => {
            if (progress.phase === "start") {
              await interaction.editReply(
                `${engineEmoji} **Đang xử lý ${progress.totalLines} dòng** (${progress.uniqueToTranslate} dòng unique cần gọi API, cache ${progress.cacheHits})\nSkill: **${progress.skillName}**` +
                  (engine === "chatgpt"
                    ? ` • Model: **${progress.model || requestedModel}**`
                    : "") +
                  ` • Ngôn ngữ: **${targetLanguage.nativeName}**.`,
              );
              return;
            }

            if (progress.phase === "progress") {
              await interaction.editReply(
                `${engineEmoji} Đang dịch... ${progress.percent}% (${progress.engineName} • ${progress.skillName}` +
                  (engine === "chatgpt"
                    ? ` • ${progress.model || requestedModel}`
                    : "") +
                  ` • ${targetLanguage.id})`,
              );
            }
          },
          model: requestedModel,
        },
      );

      const buffer = Buffer.from(translated.outputContent, "utf-8");
      const resultFile = new AttachmentBuilder(buffer, {
        name: preparedInput.outputFileName,
      });
      const sourceHint =
        preparedInput.sourceKind === "archive"
          ? `\n📂 Auto-detect trong archive: \`${preparedInput.sourceEntryPath}\``
          : "";
      const candidateHint =
        preparedInput.sourceKind === "archive"
          ? `\n🔎 Đã quét ${preparedInput.candidateCount} file hợp lệ, chọn file có điểm phù hợp cao nhất.`
          : "";
      const costLine = `\n${Translator.buildCostLine(translated.cost)}`;

      if (translated.totalLines === 0) {
        await interaction.editReply({
          content:
            "✅ Không có dòng phù hợp để dịch (đa số là kỹ thuật/placeholder)." +
            sourceHint +
            candidateHint +
            costLine,
          files: [resultFile],
        });
        return;
      }

      await interaction.editReply({
        content:
          `✅ **Hoàn tất!** Đã dịch file \`${preparedInput.originalName}\` bằng **${translated.engineName}**.\n` +
          `🌍 Ngôn ngữ đích: **${translated.targetLanguageName || targetLanguage.nativeName}**\n` +
          `🎯 Skill: **${translated.skillName}**\n` +
          `⚡ Tổng ${translated.totalLines} dòng, chỉ gọi API cho ${translated.uniqueToTranslate} dòng unique.` +
          sourceHint +
          candidateHint +
          costLine,
        files: [resultFile],
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Có lỗi xảy ra: " + error.message);
    }
  }
}

module.exports = Translator;
