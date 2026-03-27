const axios = require("axios");

const MODRINTH_API = "https://api.modrinth.com/v2";
const USER_AGENT = "PluginBot/1.0 (Discord Bot)";

// Cache to avoid repeated API calls
const cache = new Map();

/**
 * Search for a plugin on Modrinth and get supported MC versions
 * @param {string} pluginName - Name of the plugin to search
 * @returns {Promise<{found: boolean, versions: string[], minVersion: string, maxVersion: string}>}
 */
async function getPluginVersions(pluginName) {
  // Check cache first
  const cacheKey = pluginName.toLowerCase();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    // Clean up plugin name for search
    const searchName = pluginName
      .replace(/[-_]/g, " ")
      .replace(/\s+v?\d+.*$/i, "") // Remove version numbers
      .trim();

    // Search for the plugin
    const searchUrl = `${MODRINTH_API}/search`;
    const response = await axios.get(searchUrl, {
      params: {
        query: searchName,
        facets: JSON.stringify([["project_type:plugin"]]),
        limit: 5,
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 10000,
    });

    if (!response.data.hits || response.data.hits.length === 0) {
      const result = {
        found: false,
        versions: [],
        minVersion: null,
        maxVersion: null,
      };
      cache.set(cacheKey, result);
      return result;
    }

    // Find best match (exact or partial name match)
    const hits = response.data.hits;
    let bestMatch = hits[0];

    for (const hit of hits) {
      if (hit.title.toLowerCase() === searchName.toLowerCase()) {
        bestMatch = hit;
        break;
      }
    }

    // Get project details for versions
    const projectUrl = `${MODRINTH_API}/project/${bestMatch.slug}`;
    const projectRes = await axios.get(projectUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000,
    });

    const gameVersions = projectRes.data.game_versions || [];

    // Filter only MC versions (1.x.x format)
    const mcVersions = gameVersions.filter((v) => /^1\.\d+(\.\d+)?$/.test(v));

    // Sort versions
    mcVersions.sort((a, b) => {
      const aParts = a.split(".").map(Number);
      const bParts = b.split(".").map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });

    const result = {
      found: true,
      versions: mcVersions,
      minVersion: mcVersions[0] || null,
      maxVersion: mcVersions[mcVersions.length - 1] || null,
      modrinthSlug: bestMatch.slug,
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`[Modrinth] Error fetching ${pluginName}:`, error.message);
    const result = {
      found: false,
      versions: [],
      minVersion: null,
      maxVersion: null,
    };
    cache.set(cacheKey, result);
    return result;
  }
}

/**
 * Format versions for display
 * @param {string} minVersion
 * @param {string} maxVersion
 * @returns {string}
 */
function formatVersionRange(minVersion, maxVersion) {
  if (!minVersion && !maxVersion) return "Unknown";
  if (minVersion === maxVersion) return minVersion;
  if (!maxVersion) return `${minVersion}+`;
  if (!minVersion) return `≤ ${maxVersion}`;
  return `${minVersion} - ${maxVersion}`;
}

// Clear cache (call periodically if needed)
function clearCache() {
  cache.clear();
}

module.exports = {
  getPluginVersions,
  formatVersionRange,
  clearCache,
};
