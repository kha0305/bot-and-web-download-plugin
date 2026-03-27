const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const yaml = require("js-yaml");

const FILES_DIR = path.join(__dirname, "../data/files");

function getAllFiles(dirPath = FILES_DIR, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
      return;
    }

    if (file === ".gitkeep") return;

    const relativePath = path.relative(FILES_DIR, fullPath);
    const normalizedPath = relativePath.split(path.sep).join("/");

    arrayOfFiles.push({
      fullPath,
      storageName: normalizedPath,
      fileName: file,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      fileSignature: `${stat.size}:${Math.trunc(stat.mtimeMs)}`,
    });
  });

  return arrayOfFiles;
}

function extractJarMetadata(fileObj) {
  const meta = {
    version: null,
    supportedVersion: null,
    dependencies: [],
  };

  if (!fileObj.fileName.toLowerCase().endsWith(".jar")) {
    return meta;
  }

  try {
    const zip = new AdmZip(fileObj.fullPath);
    const zipEntries = zip.getEntries();
    const pluginYmlEntry = zipEntries.find(
      (entry) =>
        entry.entryName === "plugin.yml" ||
        entry.entryName === "paper-plugin.yml" ||
        entry.entryName === "bungee.yml",
    );

    if (!pluginYmlEntry) return meta;

    const rawData = zip.readAsText(pluginYmlEntry);
    const data = yaml.load(rawData);
    if (!data) return meta;

    if (data.version) meta.version = String(data.version);
    if (data["api-version"]) {
      meta.supportedVersion = String(data["api-version"]);
    }

    const hard = data.depend
      ? Array.isArray(data.depend)
        ? data.depend
        : [data.depend]
      : [];
    const soft = data.softdepend
      ? Array.isArray(data.softdepend)
        ? data.softdepend
        : [data.softdepend]
      : [];

    const merged = [...hard, ...soft]
      .map((d) => String(d).trim())
      .filter(Boolean);
    meta.dependencies = Array.from(new Set(merged));

    return meta;
  } catch (error) {
    console.error(
      `[FileScanner] Error analyzing JAR ${fileObj.fileName}:`,
      error.message,
    );
    return meta;
  }
}

function deriveDisplayName(fileObj) {
  const parts = fileObj.storageName.split("/");
  if (parts.length >= 2) {
    if (parts[0].startsWith("_") && parts[1]) {
      return parts[1];
    }
    return parts[0];
  }

  const nameWithoutExt = path.parse(fileObj.fileName).name;
  return nameWithoutExt.replace(/[-_]/g, " ");
}

function dedupeExistingPlugins(existingPlugins = []) {
  const seen = new Set();
  const deduped = [];
  let removedDuplicates = 0;

  for (let i = existingPlugins.length - 1; i >= 0; i--) {
    const plugin = existingPlugins[i];
    if (!plugin || !plugin.storageName) {
      removedDuplicates++;
      continue;
    }
    if (seen.has(plugin.storageName)) {
      removedDuplicates++;
      continue;
    }
    seen.add(plugin.storageName);
    deduped.push(plugin);
  }

  deduped.reverse();
  return { deduped, removedDuplicates };
}

function shouldAnalyzePlugin(plugin, fileObj) {
  if (!plugin) return true;
  if (!plugin.fileSignature || plugin.fileSignature !== fileObj.fileSignature) {
    return true;
  }
  if (plugin.metadataScanned !== true) return true;
  if (!Array.isArray(plugin.dependencies)) return true;
  return false;
}

function syncDatabase(existingPlugins = [], options = {}) {
  const {
    descriptionForNew = "Tự động import",
    uploadedBy = "System Scan",
    setUnknownForMissingMeta = true,
    scannedFiles = null,
  } = options;

  const allFiles = Array.isArray(scannedFiles)
    ? scannedFiles
    : getAllFiles(FILES_DIR);
  const scannedStorageNames = new Set(allFiles.map((f) => f.storageName));

  const { deduped, removedDuplicates } = dedupeExistingPlugins(existingPlugins);
  const validPlugins = deduped.filter((p) => scannedStorageNames.has(p.storageName));
  const removedMissingFiles = deduped.length - validPlugins.length;

  const pluginMap = new Map(validPlugins.map((p) => [p.storageName, p]));

  let currentTimestamp = Date.now();
  let addedCount = 0;
  let updatedCount = 0;
  const addedPlugins = [];

  for (const fileObj of allFiles) {
    const existing = pluginMap.get(fileObj.storageName);
    const isNew = !existing;

    if (!isNew && !shouldAnalyzePlugin(existing, fileObj)) {
      continue;
    }

    const meta = extractJarMetadata(fileObj);
    const nextVersion =
      meta.version || (setUnknownForMissingMeta ? "Unknown" : undefined);
    const nextSupportedVersion =
      meta.supportedVersion || (setUnknownForMissingMeta ? "Unknown" : undefined);

    if (isNew) {
      const newPlugin = {
        id: (currentTimestamp++).toString(),
        name: deriveDisplayName(fileObj),
        description: descriptionForNew,
        originalName: fileObj.fileName,
        storageName: fileObj.storageName,
        uploadDate: new Date().toISOString(),
        uploadedBy,
        version: nextVersion || "Unknown",
        supportedVersion: nextSupportedVersion || "Unknown",
        dependencies: meta.dependencies,
        metadataScanned: true,
        fileSignature: fileObj.fileSignature,
      };
      validPlugins.push(newPlugin);
      pluginMap.set(newPlugin.storageName, newPlugin);
      addedCount++;
      addedPlugins.push(newPlugin);
      continue;
    }

    const versionChanged =
      meta.version && String(existing.version || "") !== String(meta.version);
    const supportedChanged =
      meta.supportedVersion &&
      String(existing.supportedVersion || "") !== String(meta.supportedVersion);
    const depsChanged = JSON.stringify(existing.dependencies || []) !== JSON.stringify(meta.dependencies);

    if (versionChanged) existing.version = String(meta.version);
    if (supportedChanged) existing.supportedVersion = String(meta.supportedVersion);
    if (!Array.isArray(existing.dependencies) || depsChanged) {
      existing.dependencies = meta.dependencies;
    }

    if (setUnknownForMissingMeta) {
      if (!existing.version) existing.version = "Unknown";
      if (!existing.supportedVersion) existing.supportedVersion = "Unknown";
    }

    const metadataFlagChanged = existing.metadataScanned !== true;
    const signatureChanged = existing.fileSignature !== fileObj.fileSignature;
    if (metadataFlagChanged) existing.metadataScanned = true;
    if (signatureChanged) existing.fileSignature = fileObj.fileSignature;

    if (
      versionChanged ||
      supportedChanged ||
      depsChanged ||
      metadataFlagChanged ||
      signatureChanged
    ) {
      updatedCount++;
    }
  }

  return {
    allFiles,
    plugins: validPlugins,
    addedPlugins,
    addedCount,
    updatedCount,
    removedCount: removedMissingFiles + removedDuplicates,
    removedMissingFiles,
    removedDuplicates,
  };
}

module.exports = {
  FILES_DIR,
  getAllFiles,
  syncDatabase,
  deriveDisplayName,
};
