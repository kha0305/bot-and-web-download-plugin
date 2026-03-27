const STORAGE_UPLOAD_EXTENSIONS = Object.freeze([
  ".jar",
  ".zip",
  ".yml",
  ".yaml",
  ".ym",
  ".txt",
  ".md",
  ".json",
  ".properties",
  ".conf",
  ".lang",
  ".toml",
  ".ini",
]);

const TRANSLATE_ARCHIVE_EXTENSIONS = Object.freeze([".jar", ".zip"]);

const TRANSLATE_TEXT_EXTENSIONS = Object.freeze([
  ".yml",
  ".yaml",
  ".ym",
  ".txt",
  ".md",
  ".json",
  ".properties",
  ".conf",
  ".lang",
  ".toml",
  ".ini",
]);

const TRANSLATE_UPLOAD_EXTENSIONS = Object.freeze(
  Array.from(
    new Set([...TRANSLATE_ARCHIVE_EXTENSIONS, ...TRANSLATE_TEXT_EXTENSIONS]),
  ),
);

function getExtension(fileName = "") {
  const normalized = String(fileName || "").trim().toLowerCase();
  const idx = normalized.lastIndexOf(".");
  if (idx < 0) return "";
  return normalized.slice(idx);
}

function isAllowedExtension(fileName, allowedExtensions = []) {
  const ext = getExtension(fileName);
  return allowedExtensions.includes(ext);
}

function formatExtensionList(extensions = []) {
  return extensions.map((ext) => `\`${ext}\``).join(", ");
}

module.exports = {
  STORAGE_UPLOAD_EXTENSIONS,
  TRANSLATE_ARCHIVE_EXTENSIONS,
  TRANSLATE_TEXT_EXTENSIONS,
  TRANSLATE_UPLOAD_EXTENSIONS,
  getExtension,
  isAllowedExtension,
  formatExtensionList,
};
