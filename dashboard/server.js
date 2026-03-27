const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.DASHBOARD_PORT || 26012;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/giveaway", express.static(path.join(__dirname, "../giveaway-web")));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "bot-dashboard-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }),
);

// Import managers
const PluginManager = require("../utils/PluginManager");
const UserDataManager = require("../utils/UserDataManager");
const Translator = require("../utils/Translator");
const {
  STORAGE_UPLOAD_EXTENSIONS,
  TRANSLATE_UPLOAD_EXTENSIONS,
  isAllowedExtension,
  formatExtensionList,
} = require("../utils/FileExtensionPolicy");

// Paths
const DATA_DIR = path.join(__dirname, "../data");
const FILES_DIR = path.join(DATA_DIR, "files");
const STATS_PATH = path.join(DATA_DIR, "dashboard_stats.json");
const FILES_ROOT = path.resolve(FILES_DIR);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(FILES_ROOT)) {
  fs.mkdirSync(FILES_ROOT, { recursive: true });
}

if (!fs.existsSync(STATS_PATH)) {
  fs.writeFileSync(
    STATS_PATH,
    JSON.stringify({ downloads: [], searches: [] }, null, 2),
  );
}

function normalizeRelativePath(input = "") {
  return String(input)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .trim();
}

function resolveInFilesDir(relativePath = "") {
  const normalized = normalizeRelativePath(relativePath);
  const absolute = path.resolve(FILES_ROOT, normalized || ".");
  if (absolute === FILES_ROOT || absolute.startsWith(FILES_ROOT + path.sep)) {
    return absolute;
  }
  return null;
}

function toStoragePath(absolutePath) {
  return path.relative(FILES_ROOT, absolutePath).replace(/\\/g, "/");
}

function isValidNodeName(name) {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") return false;
  return !trimmed.includes("/") && !trimmed.includes("\\");
}

function removePluginsByStoragePath(storagePath, isDirectory = false) {
  const normalized = normalizeRelativePath(storagePath);
  const prefix = `${normalized}/`;
  const plugins = PluginManager.getAll();
  const updated = plugins.filter((p) => {
    if (!p.storageName) return true;
    if (p.storageName === normalized) return false;
    if (isDirectory && p.storageName.startsWith(prefix)) return false;
    return true;
  });
  const removed = plugins.length - updated.length;
  if (removed > 0) {
    PluginManager.setAll(updated);
  }
  return removed;
}

function remapPluginsByStoragePath(oldPath, newPath, isDirectory = false) {
  const oldNormalized = normalizeRelativePath(oldPath);
  const newNormalized = normalizeRelativePath(newPath);
  const oldPrefix = `${oldNormalized}/`;
  const plugins = PluginManager.getAll();
  let changed = 0;

  plugins.forEach((plugin) => {
    if (!plugin.storageName) return;
    if (plugin.storageName === oldNormalized) {
      plugin.storageName = newNormalized;
      if (!isDirectory) {
        plugin.originalName = path.basename(newNormalized);
      }
      changed++;
      return;
    }

    if (isDirectory && plugin.storageName.startsWith(oldPrefix)) {
      const suffix = plugin.storageName.slice(oldPrefix.length);
      plugin.storageName = suffix
        ? `${newNormalized}/${suffix}`
        : newNormalized;
      changed++;
    }
  });

  if (changed > 0) {
    PluginManager.save();
  }
  return changed;
}

function getPublicPlugins() {
  return PluginManager.getAll().filter(
    (plugin) =>
      plugin &&
      typeof plugin.storageName === "string" &&
      !plugin.storageName.startsWith("_"),
  );
}

function getPluginCategory(plugin) {
  if (!plugin || typeof plugin.storageName !== "string") return "Misc";
  const parts = plugin.storageName.split("/");
  return parts.length > 1 ? parts[0] : "Misc";
}

function parsePositiveInt(value, fallback, min = 1, max = 100) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

const WEB_TRANSLATE_FILE_MAX_MB = parsePositiveInt(
  process.env.WEB_TRANSLATE_FILE_MAX_MB,
  30,
  1,
  200,
);
const WEB_TRANSLATE_FILE_MAX_BYTES = WEB_TRANSLATE_FILE_MAX_MB * 1024 * 1024;
const STORAGE_ALLOWED_EXT_TEXT = formatExtensionList(STORAGE_UPLOAD_EXTENSIONS);
const TRANSLATE_ALLOWED_EXT_TEXT = formatExtensionList(TRANSLATE_UPLOAD_EXTENSIONS);

function normalizeTranslateEngine(engineInput) {
  return String(engineInput || "").toLowerCase() === "chatgpt"
    ? "chatgpt"
    : "google";
}

function normalizeTranslateSkill(skillInput) {
  return Translator.normalizeSkillId(skillInput);
}

function normalizeTranslateModel(modelInput) {
  return Translator.normalizeModelId(modelInput);
}

function normalizeTranslateTargetLanguage(targetLanguageInput) {
  return Translator.normalizeTargetLanguageId(targetLanguageInput);
}

function buildTranslateApiError(error) {
  const status = error?.response?.status;
  const providerMessage =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    "";
  const baseUrl = Translator.getOpenAIBaseUrl();
  const provider = Translator.getProviderName();

  if (String(error?.message || "").includes("Missing OPENAI_API_KEY")) {
    return {
      status: 503,
      message:
        "Server chưa cấu hình API key cho ChatGPT/AgentRouter (OPENAI_API_KEY hoặc AGENT_ROUTER_TOKEN).",
    };
  }

  if (status === 401 || status === 403) {
    const errorType =
      String(error?.response?.data?.type || "").toLowerCase() ||
      String(error?.response?.data?.error?.type || "").toLowerCase();
    const messageLower = String(providerMessage || "").toLowerCase();
    if (
      errorType.includes("unauthorized_client") ||
      messageLower.includes("unauthorized client detected")
    ) {
      return {
        status: 502,
        message:
          `${provider} từ chối client ở cấp tài khoản (${status}) tại ${baseUrl}. ` +
          "Lỗi này ảnh hưởng toàn bộ model, không phải lỗi riêng từng model. " +
          "Hãy tạo token API mới hoặc liên hệ support provider để mở quyền client.",
      };
    }

    const hint =
      providerMessage ||
      "API key/token không hợp lệ hoặc tài khoản chưa được cấp quyền.";
    return {
      status: 502,
      message: `${provider} từ chối xác thực (${status}) tại ${baseUrl}: ${hint}`,
    };
  }

  return {
    status: 500,
    message: error?.message || "Lỗi dịch thuật không xác định",
  };
}

// Stats Manager
class StatsManager {
  constructor() {
    this.stats = {
      downloads: [], // [{pluginId, pluginName, date, userId}, ...]
      searches: [], // [{query, date, userId}, ...]
    };
    this.load();
  }

  load() {
    if (fs.existsSync(STATS_PATH)) {
      try {
        this.stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8"));
      } catch (e) {
        console.error("[StatsManager] Load error:", e.message);
      }
    }
  }

  save() {
    fs.writeFileSync(STATS_PATH, JSON.stringify(this.stats, null, 2));
  }

  addDownload(pluginId, pluginName, userId) {
    this.stats.downloads.unshift({
      pluginId,
      pluginName,
      date: new Date().toISOString(),
      userId: userId || "anonymous",
    });
    // Giu toi da 10000 ban ghi
    if (this.stats.downloads.length > 10000) {
      this.stats.downloads = this.stats.downloads.slice(0, 10000);
    }
    this.save();
  }

  addSearch(query, userId) {
    this.stats.searches.unshift({
      query,
      date: new Date().toISOString(),
      userId: userId || "anonymous",
    });
    if (this.stats.searches.length > 5000) {
      this.stats.searches = this.stats.searches.slice(0, 5000);
    }
    this.save();
  }

  getDownloadsByPeriod(period = "day") {
    const now = new Date();
    let startDate;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    return this.stats.downloads.filter((d) => new Date(d.date) >= startDate);
  }

  getChartData(period = "week") {
    const downloads = this.getDownloadsByPeriod(period);
    const grouped = {};

    downloads.forEach((d) => {
      const date = new Date(d.date);
      let key;

      if (period === "day") {
        key = `${date.getHours()}:00`;
      } else if (period === "week" || period === "month") {
        key = `${date.getDate()}/${date.getMonth() + 1}`;
      } else {
        key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    return grouped;
  }

  getTopPlugins(limit = 10, period = "month") {
    const downloads = this.getDownloadsByPeriod(period);
    const counts = {};

    downloads.forEach((d) => {
      const name = d.pluginName || d.pluginId;
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  getCategoryStats() {
    const plugins = PluginManager.getAll();
    const categories = {};

    plugins.forEach((p) => {
      const category = p.storageName?.split("/")[0] || "Khac";
      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }
}

const statsManager = new StatsManager();

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.adminId) {
    next();
  } else {
    if (req.path.startsWith("/api/")) {
      res.status(401).json({ error: "Unauthorized" });
    } else {
      res.redirect("/");
    }
  }
};

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || "Uploads";
    const targetDir = resolveInFilesDir(folder);
    if (!targetDir) {
      cb(new Error("Duong dan folder khong hop le"));
      return;
    }
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const folder = req.body.folder || "Uploads";
    const targetDir = resolveInFilesDir(folder);
    if (!targetDir) {
      cb(new Error("Duong dan folder khong hop le"));
      return;
    }

    const baseName = path.basename(file.originalname);
    const parsed = path.parse(baseName);
    let candidate = baseName;
    let idx = 1;
    while (fs.existsSync(path.join(targetDir, candidate))) {
      candidate = `${parsed.name}_${idx}${parsed.ext}`;
      idx++;
    }
    cb(null, candidate);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (isAllowedExtension(file.originalname, STORAGE_UPLOAD_EXTENSIONS)) {
      cb(null, true);
    } else {
      cb(
        new Error(`Chi chap nhan cac dinh dang: ${STORAGE_ALLOWED_EXT_TEXT}`),
        false,
      );
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

const translationUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (isAllowedExtension(file.originalname, TRANSLATE_UPLOAD_EXTENSIONS)) {
      cb(null, true);
    } else {
      cb(
        new Error(`Chi ho tro cac dinh dang: ${TRANSLATE_ALLOWED_EXT_TEXT}`),
        false,
      );
    }
  },
  limits: {
    fileSize: WEB_TRANSLATE_FILE_MAX_BYTES,
  },
});

// ============ AUTH ROUTES ============
app.post("/api/login", (req, res) => {
  const { discordId } = req.body;

  if (!discordId) {
    return res.status(400).json({ error: "Discord ID la bat buoc" });
  }

  const adminIds = (process.env.ADMIN_ID || "")
    .split(",")
    .map((id) => id.trim());

  if (adminIds.includes(discordId)) {
    req.session.adminId = discordId;
    res.json({ success: true, message: "Dang nhap thanh cong" });
  } else {
    res.status(403).json({ error: "Ban khong co quyen truy cap" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ authenticated: !!req.session.adminId });
});

// ============ PUBLIC DOWNLOAD API ============
app.get("/api/public/categories", (req, res) => {
  try {
    const categoriesMap = new Map();
    getPublicPlugins().forEach((plugin) => {
      const category = getPluginCategory(plugin);
      categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
    });

    const categories = Array.from(categoriesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));

    res.json({ categories });
  } catch (e) {
    const translatedError = buildTranslateApiError(e);
    res.status(translatedError.status).json({ error: translatedError.message });
  }
});

app.get("/api/public/plugins", (req, res) => {
  try {
    const search = String(req.query.search || "")
      .trim()
      .toLowerCase();
    const category = String(req.query.category || "").trim();
    const page = parsePositiveInt(req.query.page, 1, 1, 1000000);
    const limit = parsePositiveInt(req.query.limit, 24, 1, 100);

    let filtered = getPublicPlugins();

    if (category) {
      filtered = filtered.filter((plugin) => getPluginCategory(plugin) === category);
    }

    if (search) {
      filtered = filtered.filter((plugin) => {
        const name = String(plugin.name || "").toLowerCase();
        const originalName = String(plugin.originalName || "").toLowerCase();
        const description = String(plugin.description || "").toLowerCase();
        return (
          name.includes(search) ||
          originalName.includes(search) ||
          description.includes(search)
        );
      });
    }

    filtered.sort((a, b) => {
      const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
      const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
      return dateB - dateA;
    });

    const total = filtered.length;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * limit;
    const items = filtered.slice(start, start + limit).map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      originalName: plugin.originalName,
      description: plugin.description,
      uploadDate: plugin.uploadDate,
      category: getPluginCategory(plugin),
    }));

    res.json({
      items,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (e) {
    const translatedError = buildTranslateApiError(e);
    res.status(translatedError.status).json({ error: translatedError.message });
  }
});

app.get("/api/public/download/:pluginId", (req, res) => {
  try {
    const { pluginId } = req.params;
    const plugin = getPublicPlugins().find((item) => String(item.id) === String(pluginId));

    if (!plugin) {
      return res.status(404).json({ error: "Plugin khong ton tai" });
    }

    const normalizedStorage = normalizeRelativePath(plugin.storageName);
    const filePath = resolveInFilesDir(normalizedStorage);

    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).json({ error: "File khong ton tai" });
    }

    return res.download(
      filePath,
      plugin.originalName || path.basename(filePath),
      (err) => {
        if (err) return;
        try {
          statsManager.addDownload(
            plugin.id,
            plugin.name || plugin.originalName || plugin.id,
            "web_public",
          );
        } catch (statsError) {
          console.error("[Public Download Stats Error]", statsError.message);
        }
      },
    );
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/public/translate/meta", async (req, res) => {
  const auth = await Translator.checkChatgptAvailability();
  res.json({
    chatgptConfigured: !!auth.configured,
    chatgptAvailable: !!auth.available,
    chatgptAuthStatus: auth.status,
    chatgptAuthError: auth.message || null,
    chatgptModel: Translator.getChatgptModel(),
    chatgptModels: Translator.listModelMeta(),
    defaultTargetLanguage: Translator.getDefaultTargetLanguageId(),
    languages: Translator.listLanguageMeta(),
    defaultSkill: Translator.getDefaultSkillId(),
    skills: Translator.listSkillMeta(),
    maxFileSizeBytes: WEB_TRANSLATE_FILE_MAX_BYTES,
    supportedFileExtensions: Translator.getSupportedTranslateExtensions(),
    provider: auth.provider || Translator.getProviderName(),
  });
});

app.post("/api/public/translate/text", async (req, res) => {
  try {
    const engine = normalizeTranslateEngine(req.body?.engine);
    const skill = normalizeTranslateSkill(req.body?.skill);
    const model = normalizeTranslateModel(req.body?.model);
    const targetLanguage = normalizeTranslateTargetLanguage(
      req.body?.targetLanguage || req.body?.targetLang || req.body?.to || req.body?.lang,
    );
    const text = String(req.body?.text || "");
    const trimmed = text.trim();
    const maxLength = parsePositiveInt(
      process.env.WEB_TRANSLATE_TEXT_LIMIT,
      6000,
      200,
      20000,
    );

    if (!trimmed) {
      return res.status(400).json({ error: "Noi dung can dich dang trong" });
    }

    if (trimmed.length > maxLength) {
      return res.status(400).json({
        error: `Noi dung qua dai. Gioi han ${maxLength} ky tu`,
      });
    }

    if (engine === "chatgpt" && !Translator.getChatgptApiKey()) {
      return res
        .status(503)
        .json({ error: "Server chua cau hinh OPENAI_API_KEY/AGENT_ROUTER_TOKEN" });
    }

    const translated = await Translator.translateText(trimmed, engine, {
      skill,
      model,
      targetLanguage,
    });

    res.json({
      translatedText: translated.translatedText,
      engineName: translated.engineName,
      modelUsed: translated.modelUsed,
      skillId: translated.skillId,
      skillName: translated.skillName,
      targetLanguageId: translated.targetLanguageId,
      targetLanguageName: translated.targetLanguageName,
      cost: translated.cost || null,
    });
  } catch (e) {
    const translatedError = buildTranslateApiError(e);
    res.status(translatedError.status).json({ error: translatedError.message });
  }
});

app.post(
  "/api/public/translate/file",
  translationUpload.single("file"),
  async (req, res) => {
    try {
      const engine = normalizeTranslateEngine(req.body?.engine);
      const skill = normalizeTranslateSkill(req.body?.skill);
      const model = normalizeTranslateModel(req.body?.model);
      const targetLanguage = normalizeTranslateTargetLanguage(
        req.body?.targetLanguage || req.body?.targetLang || req.body?.to || req.body?.lang,
      );
      const uploaded = req.file;

      if (!uploaded) {
        return res.status(400).json({ error: "Khong co file duoc gui len" });
      }

      if (engine === "chatgpt" && !Translator.getChatgptApiKey()) {
        return res
          .status(503)
          .json({ error: "Server chua cau hinh OPENAI_API_KEY/AGENT_ROUTER_TOKEN" });
      }

      const originalName = path.basename(uploaded.originalname || "config.yml");
      const preparedInput = Translator.prepareInputForTranslation(
        uploaded.buffer,
        originalName,
        targetLanguage,
      );
      const translated = await Translator.translateContent(
        preparedInput.content,
        engine,
        {
          skill,
          model,
          targetLanguage,
        },
      );

      res.json({
        fileName: preparedInput.outputFileName,
        translatedContent: translated.outputContent,
        engineName: translated.engineName,
        modelUsed: translated.modelUsed,
        skillId: translated.skillId,
        skillName: translated.skillName,
        targetLanguageId: translated.targetLanguageId,
        targetLanguageName: translated.targetLanguageName,
        sourceKind: preparedInput.sourceKind,
        sourcePath: preparedInput.sourceEntryPath,
        autoDetected: preparedInput.sourceKind === "archive",
        candidatesFound: preparedInput.candidateCount,
        cost: translated.cost || null,
        stats: {
          totalLines: translated.totalLines,
          uniqueToTranslate: translated.uniqueToTranslate,
          cacheHits: translated.cacheHits,
        },
      });
    } catch (e) {
      if (e?.code === "INVALID_TRANSLATE_INPUT") {
        return res.status(400).json({ error: e.message });
      }
      const translatedError = buildTranslateApiError(e);
      res.status(translatedError.status).json({ error: translatedError.message });
    }
  },
);

// ============ STATS ROUTES ============
app.get("/api/stats/overview", requireAuth, (req, res) => {
  const plugins = PluginManager.getAll();
  const users = Object.keys(UserDataManager.users);
  const downloads = statsManager.stats.downloads;

  res.json({
    totalPlugins: plugins.length,
    totalDownloads: downloads.length,
    totalUsers: users.length,
    todayDownloads: statsManager.getDownloadsByPeriod("day").length,
  });
});

app.get("/api/stats/chart", requireAuth, (req, res) => {
  const period = req.query.period || "week";
  const chartData = statsManager.getChartData(period);
  res.json(chartData);
});

app.get("/api/stats/top-plugins", requireAuth, (req, res) => {
  const period = req.query.period || "month";
  const limit = parseInt(req.query.limit) || 10;
  const topPlugins = statsManager.getTopPlugins(limit, period);
  res.json(topPlugins);
});

app.get("/api/stats/categories", requireAuth, (req, res) => {
  const categories = statsManager.getCategoryStats();
  res.json(categories);
});

app.get("/api/stats/downloads", requireAuth, (req, res) => {
  const period = req.query.period || "all";
  const limit = parseInt(req.query.limit) || 100;

  let downloads;
  if (period === "all") {
    downloads = statsManager.stats.downloads.slice(0, limit);
  } else {
    downloads = statsManager.getDownloadsByPeriod(period).slice(0, limit);
  }

  res.json(downloads);
});

// ============ STORAGE ROUTES ============
app.get("/api/storage/folders", requireAuth, (req, res) => {
  try {
    const items = fs.existsSync(FILES_ROOT) ? fs.readdirSync(FILES_ROOT) : [];
    const folders = items
      .filter((item) => {
        const itemPath = resolveInFilesDir(item);
        if (!itemPath) return false;
        const stat = fs.statSync(itemPath);
        return stat.isDirectory();
      })
      .map((folder) => {
        const folderPath = resolveInFilesDir(folder);
        if (!folderPath) {
          return { name: folder, fileCount: 0 };
        }
        const files = fs.readdirSync(folderPath).filter((f) => {
          const fPath = path.join(folderPath, f);
          return fs.statSync(fPath).isFile();
        });
        return {
          name: folder,
          fileCount: files.length,
        };
      });

    res.json(folders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/storage/files", requireAuth, (req, res) => {
  const folder = req.query.folder || "";

  try {
    const targetDir = resolveInFilesDir(folder);
    if (!targetDir) {
      return res.status(403).json({ error: "Truy cap bi tu choi" });
    }

    if (!fs.existsSync(targetDir)) {
      return res.json([]);
    }

    const items = fs.readdirSync(targetDir);
    const files = items.map((item) => {
      const itemPath = path.join(targetDir, item);
      const stat = fs.statSync(itemPath);

      return {
        name: item,
        path: normalizeRelativePath(folder)
          ? `${normalizeRelativePath(folder)}/${item}`
          : item,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        modified: stat.mtime,
      };
    });

    res.json(files);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post(
  "/api/storage/upload",
  requireAuth,
  upload.array("files"),
  (req, res) => {
    try {
      const folder = normalizeRelativePath(req.body.folder || "Uploads");
      const targetDir = resolveInFilesDir(folder);
      if (!targetDir) {
        return res.status(403).json({ error: "Truy cap bi tu choi" });
      }

      if (!Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "Khong co file nao duoc upload" });
      }

      const uploadedFiles = req.files.map((f) => ({
        name: f.originalname,
        path: normalizeRelativePath(path.join(folder, f.filename)),
        size: f.size,
      }));

      // Tu dong them vao database plugins
      req.files.forEach((f) => {
        const pluginName = path.parse(f.originalname).name;
        const plugin = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: pluginName,
          description: "Upload tu Dashboard",
          originalName: f.originalname,
          storageName: toStoragePath(path.join(targetDir, f.filename)),
          uploadDate: new Date().toISOString(),
          uploadedBy: `Dashboard (Admin: ${req.session.adminId})`,
        };

        PluginManager.add(plugin);
      });

      res.json({
        success: true,
        files: uploadedFiles,
        message: `Da upload ${uploadedFiles.length} file`,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.use((err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  if (
    typeof err.message === "string" &&
    (err.message.includes("Chi chap nhan") ||
      err.message.includes("Chi ho tro") ||
      err.message.includes("Duong dan folder khong hop le"))
  ) {
    return res.status(400).json({ error: err.message });
  }

  return next(err);
});

app.delete("/api/storage/file", requireAuth, (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: "File path la bat buoc" });
  }

  try {
    const normalizedPath = normalizeRelativePath(filePath);
    const fullPath = resolveInFilesDir(normalizedPath);
    if (!fullPath) {
      return res.status(403).json({ error: "Truy cap bi tu choi" });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File khong ton tai" });
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    // Xoa khoi database (ca folder con neu la directory)
    const removedCount = removePluginsByStoragePath(
      normalizedPath,
      stat.isDirectory(),
    );

    res.json({
      success: true,
      message: "Da xoa file",
      removedPlugins: removedCount,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/storage/rename", requireAuth, (req, res) => {
  const { oldPath, newName } = req.body;

  if (!oldPath || !newName) {
    return res.status(400).json({ error: "Thong tin khong day du" });
  }

  try {
    if (!isValidNodeName(newName)) {
      return res.status(400).json({ error: "Ten moi khong hop le" });
    }

    const normalizedOldPath = normalizeRelativePath(oldPath);
    const fullOldPath = resolveInFilesDir(normalizedOldPath);
    if (!fullOldPath) {
      return res.status(403).json({ error: "Truy cap bi tu choi" });
    }

    if (!fs.existsSync(fullOldPath)) {
      return res.status(404).json({ error: "File khong ton tai" });
    }

    const directory = path.dirname(fullOldPath);
    const fullNewPath = path.join(directory, newName);
    const resolvedNewPath = resolveInFilesDir(
      toStoragePath(fullNewPath).replace(/^\.\/?/, ""),
    );
    if (!resolvedNewPath) {
      return res.status(403).json({ error: "Truy cap bi tu choi" });
    }

    if (fs.existsSync(resolvedNewPath)) {
      return res.status(409).json({ error: "Ten moi da ton tai" });
    }

    const isDirectory = fs.statSync(fullOldPath).isDirectory();
    fs.renameSync(fullOldPath, resolvedNewPath);

    // Update database (file hoac folder)
    const newStorageName = toStoragePath(resolvedNewPath);
    remapPluginsByStoragePath(normalizedOldPath, newStorageName, isDirectory);

    res.json({ success: true, newPath: newStorageName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/storage/move", requireAuth, (req, res) => {
  const { filePath, targetFolder } = req.body;

  if (!filePath || typeof targetFolder !== "string") {
    return res.status(400).json({ error: "Thong tin khong day du" });
  }

  try {
    const normalizedSource = normalizeRelativePath(filePath);
    const normalizedTargetFolder = normalizeRelativePath(targetFolder);
    const fullOldPath = resolveInFilesDir(normalizedSource);
    const targetDir = resolveInFilesDir(normalizedTargetFolder);

    if (!fullOldPath || !targetDir) {
      return res.status(403).json({ error: "Truy cap bi tu choi" });
    }

    if (!fs.existsSync(fullOldPath)) {
      return res.status(404).json({ error: "File khong ton tai" });
    }

    const fileName = path.basename(fullOldPath);
    const fullNewPath = path.join(targetDir, fileName);

    // Tao thu muc neu chua ton tai
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (fs.existsSync(fullNewPath)) {
      return res.status(409).json({ error: "File dich da ton tai" });
    }

    const isDirectory = fs.statSync(fullOldPath).isDirectory();
    if (
      isDirectory &&
      (fullNewPath === fullOldPath ||
        fullNewPath.startsWith(fullOldPath + path.sep))
    ) {
      return res
        .status(400)
        .json({ error: "Khong the di chuyen thu muc vao chinh no" });
    }

    fs.renameSync(fullOldPath, fullNewPath);

    // Update database (file hoac folder)
    const newStorageName = toStoragePath(fullNewPath);
    remapPluginsByStoragePath(normalizedSource, newStorageName, isDirectory);

    res.json({ success: true, newPath: newStorageName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/storage/download/:folder/:file", requireAuth, (req, res) => {
  const { folder, file } = req.params;
  const relativePath = normalizeRelativePath(path.posix.join(folder, file));
  const filePath = resolveInFilesDir(relativePath);

  if (!filePath) {
    return res.status(403).json({ error: "Truy cap bi tu choi" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File khong ton tai" });
  }

  // Record stats
  try {
    const allPlugins = PluginManager.getAll();
    const plugin = allPlugins.find(
      (p) => p.storageName === relativePath || p.originalName === file,
    );

    const pluginId = plugin ? plugin.id : file;
    const pluginName = plugin ? plugin.name : file;
    const userId = req.session.adminId || "admin"; // Admin dashboard

    statsManager.addDownload(pluginId, pluginName, userId);
  } catch (e) {
    console.error("[Download Stats Error]", e);
  }

  res.download(filePath);
});

app.post("/api/storage/create-folder", requireAuth, (req, res) => {
  const { folderName } = req.body;

  if (!folderName) {
    return res.status(400).json({ error: "Ten thu muc la bat buoc" });
  }

  try {
    if (!isValidNodeName(folderName)) {
      return res.status(400).json({ error: "Ten thu muc khong hop le" });
    }

    const folderPath = resolveInFilesDir(folderName);
    if (!folderPath) {
      return res.status(403).json({ error: "Truy cap bi tu choi" });
    }

    if (fs.existsSync(folderPath)) {
      return res.status(400).json({ error: "Thu muc da ton tai" });
    }

    fs.mkdirSync(folderPath, { recursive: true });
    res.json({ success: true, message: "Da tao thu muc" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ EXPORT ROUTES ============
app.get("/api/export/json", requireAuth, (req, res) => {
  const period = req.query.period || "all";
  let downloads;

  if (period === "all") {
    downloads = statsManager.stats.downloads;
  } else {
    downloads = statsManager.getDownloadsByPeriod(period);
  }

  const plugins = PluginManager.getAll();
  const exportData = {
    exportDate: new Date().toISOString(),
    period,
    summary: {
      totalPlugins: plugins.length,
      totalDownloads: downloads.length,
      categories: statsManager.getCategoryStats(),
      topPlugins: statsManager.getTopPlugins(20, period),
    },
    downloads,
    plugins,
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=plugin_stats_${period}_${Date.now()}.json`,
  );
  res.send(JSON.stringify(exportData, null, 2));
});

app.get("/api/export/csv", requireAuth, (req, res) => {
  const period = req.query.period || "all";
  let downloads;

  if (period === "all") {
    downloads = statsManager.stats.downloads;
  } else {
    downloads = statsManager.getDownloadsByPeriod(period);
  }

  // Tao CSV
  let csv = "Plugin Name,Plugin ID,Date,User ID\n";
  downloads.forEach((d) => {
    csv += `"${d.pluginName || ""}","${d.pluginId}","${d.date}","${
      d.userId
    }"\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=downloads_${period}_${Date.now()}.csv`,
  );
  res.send(csv);
});

// ============ DOCS API ============
const DOCS_DIR = path.join(__dirname, "../docs");

app.get("/api/docs", requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      return res.json([]);
    }

    const files = fs.readdirSync(DOCS_DIR).filter((f) => {
      return f.endsWith(".md") || f.endsWith(".txt");
    });

    const docs = files.map((filename) => {
      const filePath = path.join(DOCS_DIR, filename);
      const content = fs.readFileSync(filePath, "utf8");
      const title = filename
        .replace(".md", "")
        .replace(".txt", "")
        .replace(/_/g, " ");

      return {
        filename,
        title,
        content,
      };
    });

    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ PLUGINS API (for mobile/external) ============
app.get("/api/plugins", requireAuth, (req, res) => {
  const plugins = PluginManager.getAll();
  const search = req.query.search?.toLowerCase() || "";
  const category = req.query.category || "";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  let filtered = plugins;

  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name?.toLowerCase().includes(search) ||
        p.originalName?.toLowerCase().includes(search),
    );
  }

  if (category) {
    filtered = filtered.filter((p) =>
      p.storageName?.startsWith(category + "/"),
    );
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  res.json({
    plugins: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

app.put("/api/plugins/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const plugin = PluginManager.getById(id);
  if (!plugin) {
    return res.status(404).json({ error: "Plugin khong ton tai" });
  }

  if (name) plugin.name = name;
  if (description) plugin.description = description;
  plugin.lastModified = new Date().toISOString();

  PluginManager.save();
  res.json({ success: true, plugin });
});

// ============ SERVE STATIC PAGES ============
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/downloads", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "downloads.html"));
});

app.get("/home", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/storage", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "storage.html"));
});

app.get("/statistics", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "statistics.html"));
});

app.get("/guide", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "guide.html"));
});

// ============ GIVEAWAY API (Public) ============
const GIVEAWAY_DATA_FILE = path.join(DATA_DIR, "giveaway_data.json");

app.get("/api/giveaway/data", (req, res) => {
  if (fs.existsSync(GIVEAWAY_DATA_FILE)) {
    // Đọc file và trả về, tránh cache
    const data = fs.readFileSync(GIVEAWAY_DATA_FILE, "utf8");
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  } else {
    res.json({}); // Default empty
  }
});

app.post("/api/giveaway/data", (req, res) => {
  try {
    const data = req.body;
    fs.writeFileSync(GIVEAWAY_DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (e) {
    console.error("[Giveaway] Save error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Export for use in bot
let dashboardServer = null;

function startDashboard() {
  if (dashboardServer) return dashboardServer;

  dashboardServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Dashboard] Running at http://localhost:${PORT}`);
  });

  dashboardServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[Dashboard] Port ${PORT} is already in use. Skipping dashboard startup for this process.`,
      );
    } else {
      console.error("[Dashboard] Server error:", err.message);
    }
    dashboardServer = null;
  });

  return dashboardServer;
}

module.exports = {
  app,
  startDashboard,
  statsManager,
};
