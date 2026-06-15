/**
 * Cache Manager using IndexedDB
 * Provides persistent caching for API requests to improve performance.
 * Uses separate object stores per data category for faster lookups.
 */

const DB_NAME = "PokedexCacheDB";
const DB_VERSION = 4;
/*
  =============================================================================
  SISTEMA DE CACHÉ
  Si haces cambios importantes en los datos o en la API y quieres que todos 
  los usuarios descarguen la nueva versión (borrando su caché local), 
  simplemente incrementa el número de APP_CACHE_VERSION (ej. de "2.3.0" a "2.3.1").
  =============================================================================
*/
const APP_CACHE_VERSION = "2.3.0"; // Increment to force clear

// Category-specific object stores
const STORE_NAMES = [
  "cache_pokemon",
  "cache_moves",
  "cache_items",
  "cache_abilities",
  "cache_natures",
  "cache_types",
  "cache_generations",
  "cache_regions",
  "cache_games",
  "cache_misc",
  "cache_bulbapedia",
];

/**
 * Determine which object store a URL belongs to based on its API path.
 * @param {string} url
 * @returns {string} store name
 */
function getStoreForUrl(url) {
  try {
    const path = new URL(url, window.location.origin).pathname;

    if (/bulbapedia_proxy\.php/.test(url) || /bulbapedia_proxy\.php/.test(path)) {
      return "cache_bulbapedia";
    }

    if (
      /\/pokemon\//.test(path) ||
      /\/pokemon-species\//.test(path) ||
      /\/evolution-chain\//.test(path) ||
      /\/pokemon-form\//.test(path) ||
      /\/pokemon\?/.test(url)
    ) {
      return "cache_pokemon";
    }
    if (/\/move\//.test(path) || /\/move\?/.test(url)) {
      return "cache_moves";
    }
    if (
      /\/item\//.test(path) ||
      /\/item-category\//.test(path) ||
      /\/item-pocket/.test(path) ||
      /\/item\?/.test(url)
    ) {
      return "cache_items";
    }
    if (/\/ability\//.test(path) || /\/ability\?/.test(url)) {
      return "cache_abilities";
    }
    if (/\/nature\//.test(path) || /\/nature\?/.test(url)) {
      return "cache_natures";
    }
    if (/\/type\//.test(path) || /\/type\?/.test(url)) {
      return "cache_types";
    }
    if (/\/generation\//.test(path) || /\/generation\?/.test(url)) {
      return "cache_generations";
    }
    if (
      /\/region\//.test(path) ||
      /\/location\//.test(path) ||
      /\/location-area\//.test(path) ||
      /\/region\?/.test(url)
    ) {
      return "cache_regions";
    }
    if (
      /\/version\//.test(path) ||
      /\/version-group\//.test(path) ||
      /\/version\?/.test(url) ||
      /\/version-group\?/.test(url)
    ) {
      return "cache_games";
    }
  } catch (e) {
    // If URL parsing fails, fall back to misc
  }
  return "cache_misc";
}

class CacheManager {
  constructor() {
    this.db = null;
    this.ready = this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        reject(event.target.error);
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        
        // Phase 3.1: Check APP_CACHE_VERSION to force clear if needed
        const savedVersion = localStorage.getItem("pokedex_app_cache_version");
        if (savedVersion !== APP_CACHE_VERSION) {
          console.log(`Cache Version mismatch (${savedVersion} vs ${APP_CACHE_VERSION}). Clearing cache...`);
          try {
            this._clearInternal();
          } catch (e) {
            console.error("Error clearing cache:", e);
          }
          localStorage.setItem("pokedex_app_cache_version", APP_CACHE_VERSION);
        }
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Remove old single store if it exists (migration from v1)
        if (db.objectStoreNames.contains("api_cache")) {
          db.deleteObjectStore("api_cache");
        }

        // Create category-specific stores
        for (const storeName of STORE_NAMES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "url" });
          }
        }
      };
    });
  }

  async get(url) {
    await this.ready;
    const storeName = getStoreForUrl(url);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiry > Date.now()) {
          resolve(result.data);
        } else {
          if (result) this.delete(url); // Clean up expired
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  async set(url, data, ttl = 24 * 60 * 60 * 1000) {
    // Default TTL: 24 hours
    await this.ready;
    const storeName = getStoreForUrl(url);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const item = {
        url,
        data,
        cachedAt: Date.now(),
        expiry: Date.now() + ttl,
      };
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(url) {
    await this.ready;
    const storeName = getStoreForUrl(url);
    const transaction = this.db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    store.delete(url);
  }

  /**
   * Internal clearing logic that doesn't wait for 'ready' to avoid deadlocks.
   * @private
   */
  _clearInternal() {
    if (!this.db) return;
    const existingStores = STORE_NAMES.filter(name => this.db.objectStoreNames.contains(name));
    if (existingStores.length === 0) return;
    
    const transaction = this.db.transaction(existingStores, "readwrite");
    for (const storeName of existingStores) {
      transaction.objectStore(storeName).clear();
    }
    console.log("All cache stores cleared.");
  }

  async clear() {
    await this.ready;
    this._clearInternal();
  }

  /**
   * Get cache statistics: total, valid, expired entries and timestamps.
   * Aggregates across all stores.
   * @returns {Promise<{total: number, valid: number, expired: number, newestTimestamp: number|null, oldestTimestamp: number|null}>}
   */
  async getStats() {
    await this.ready;
    const now = Date.now();
    const DEFAULT_TTL = 24 * 60 * 60 * 1000;
    let total = 0,
      valid = 0,
      expired = 0;
    let newestTimestamp = null;
    let oldestTimestamp = null;

    // Iterate through all stores
    for (const storeName of STORE_NAMES) {
      await new Promise((resolve) => {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();

        request.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            total++;
            const entry = cursor.value;
            if (entry.expiry > now) {
              valid++;
            } else {
              expired++;
            }
            // Ensure we don't return a future timestamp if cachedAt is missing
            const cachedAt = entry.cachedAt || Math.min(now, (entry.expiry - DEFAULT_TTL));
            if (newestTimestamp === null || cachedAt > newestTimestamp) {
              newestTimestamp = cachedAt;
            }
            if (oldestTimestamp === null || cachedAt < oldestTimestamp) {
              oldestTimestamp = cachedAt;
            }
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => resolve();
      });
    }

    return { total, valid, expired, newestTimestamp, oldestTimestamp };
  }
}

const cacheManager = new CacheManager();

/**
 * Fetches a URL, using the cache if available.
 * Includes retry logic for network stability.
 * @param {string} url The URL to fetch.
 * @param {number} ttl Time to live in milliseconds (default 24h).
 * @param {boolean} force If true, bypass cache and force a new fetch.
 * @param {number} retries Number of retry attempts.
 * @param {number} delayMs Initial backoff delay.
 * @returns {Promise<any>} The JSON response.
 */
async function fetchCached(url, ttl, force = false, retries = 3, delayMs = 1000) {
  if (!force) {
    try {
      const cached = await cacheManager.get(url);
      if (cached) {
        return cached;
      }
    } catch (e) {}
  }

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      
      if (!res.ok) {
        // Don't retry on 404 as it's a permanent failure for that resource
        if (res.status === 404) throw new Error(`HTTP 404`);
        
        if (i < retries) {
          // Add random jitter to backoff to prevent thundering herds
          const backoff = delayMs * Math.pow(2, i) + Math.random() * 1000;
          console.warn(`Fetch failed (HTTP ${res.status}) for ${url}. Retrying in ${Math.round(backoff)}ms... (${i + 1}/${retries})`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      // Check content type or try/catch json
      const contentType = res.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        throw new Error("Invalid API response format (not JSON)");
      }

      const data = await res.json();

      try {
        await cacheManager.set(url, data, ttl);
      } catch (e) {}

      return data;
    } catch (err) {
      if (i < retries && err.name !== "AbortError") {
        // Add random jitter to error retry backoff
        const backoff = delayMs * Math.pow(2, i) + Math.random() * 1000;
        console.warn(`Fetch error for ${url}: ${err.message}. Retrying in ${Math.round(backoff)}ms... (${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, backoff));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Bulk sync core PokeAPI data to pre-cache indices.
 * This fetches lists (indices) and caches them to avoid initial loading delays.
 */
async function syncAllPokeAPI() {
  const syncBtn = document.getElementById("syncPokeApiBtn");
  const progressRow = document.getElementById("syncProgressRow");
  const ProgressBar = document.getElementById("syncProgressBar");
  const progressText = document.getElementById("syncProgressText");

  if (syncBtn) syncBtn.disabled = true;
  if (progressRow) progressRow.hidden = false;

  const endpoints = [
    {
      url: "https://pokeapi.co/api/v2/pokemon?limit=2000",
      key: (window.I18n && window.I18n.t("nav.pokemon")) || "Pokémon",
    },
    {
      url: "https://pokeapi.co/api/v2/type?limit=100",
      key: (window.I18n && window.I18n.t("nav.types")) || "Tipos",
    },
    {
      url: "https://pokeapi.co/api/v2/generation?limit=20",
      key: (window.I18n && window.I18n.t("nav.generations")) || "Generaciones",
    },
    {
      url: "https://pokeapi.co/api/v2/region?limit=20",
      key: (window.I18n && window.I18n.t("nav.regions")) || "Regiones",
    },
    {
      url: "https://pokeapi.co/api/v2/move?limit=2000",
      key: (window.I18n && window.I18n.t("nav.moves")) || "Movimientos",
    },
    {
      url: "https://pokeapi.co/api/v2/ability?limit=1000",
      key: (window.I18n && window.I18n.t("nav.abilities")) || "Habilidades",
    },
    {
      url: "https://pokeapi.co/api/v2/item?limit=2000",
      key: (window.I18n && window.I18n.t("nav.items")) || "Objetos",
    },
    {
      url: "https://pokeapi.co/api/v2/nature?limit=50",
      key: (window.I18n && window.I18n.t("nav.natures")) || "Naturalezas",
    },
    {
      url: "https://pokeapi.co/api/v2/version-group?limit=100",
      key: (window.I18n && window.I18n.t("nav.games")) || "Juegos",
    },
  ];

  let completed = 0;
  const total = endpoints.length;

  for (const ep of endpoints) {
    try {
      if (progressText) {
        progressText.textContent = `${(window.I18n && I18n.t("footer.syncing")) || "Sincronizando"} ${ep.key}...`;
      }

      // We pass 'true' to force a fresh download and update the cache
      await fetchCached(ep.url, undefined, true);

      completed++;
      if (ProgressBar) {
        const percent = Math.round((completed / total) * 100);
        ProgressBar.style.width = `${percent}%`;
        ProgressBar.setAttribute("aria-valuenow", percent);
      }
    } catch (e) {
      console.error(`Error syncing ${ep.key}:`, e);
    }
  }

  if (progressText) {
    progressText.textContent =
      (window.I18n && I18n.t("footer.sync_complete")) ||
      "Sincronización completa";
  }

  setTimeout(async () => {
    if (progressRow) progressRow.hidden = true;
    if (syncBtn) syncBtn.disabled = false;
    await updateCacheStatusUI();
  }, 2000);
}

/**
 * Deep Sync: Download every single detail record for Pokémon, Moves, etc.
 * Uses batching to avoid overwhelming the API.
 */
async function deepSyncAllPokeAPI() {
  const deepSyncBtn = document.getElementById("deepSyncPokeApiBtn");
  const syncBtn = document.getElementById("syncPokeApiBtn");
  const progressRow = document.getElementById("syncProgressRow");
  const ProgressBar = document.getElementById("syncProgressBar");
  const progressText = document.getElementById("syncProgressText");

  if (deepSyncBtn) deepSyncBtn.disabled = true;
  if (syncBtn) syncBtn.disabled = true;
  if (progressRow) progressRow.hidden = false;

  const categories = [
    // --- Pokemon Core ---
    { url: "https://pokeapi.co/api/v2/pokemon?limit=2000", label: "Pokémon" },
    { url: "https://pokeapi.co/api/v2/pokemon-form?limit=2500", label: "Formas" },
    { url: "https://pokeapi.co/api/v2/pokemon-species?limit=1500", label: "Especies" },
    { url: "https://pokeapi.co/api/v2/ability?limit=1000", label: "Habilidades" },
    { url: "https://pokeapi.co/api/v2/type?limit=30", label: "Tipos" },
    { url: "https://pokeapi.co/api/v2/stat?limit=20", label: "Estadísticas" },
    // --- Move System ---
    { url: "https://pokeapi.co/api/v2/move?limit=2500", label: "Movimientos" },
    { url: "https://pokeapi.co/api/v2/move-category?limit=20", label: "Categorías de Movimiento" },
    { url: "https://pokeapi.co/api/v2/move-damage-class?limit=5", label: "Clases de Daño" },
    { url: "https://pokeapi.co/api/v2/move-learn-method?limit=30", label: "Métodos de Aprendizaje" },
    { url: "https://pokeapi.co/api/v2/move-target?limit=20", label: "Objetivos de Movimiento" },
    // --- Item System ---
    { url: "https://pokeapi.co/api/v2/item?limit=2500", label: "Objetos" },
    { url: "https://pokeapi.co/api/v2/item-category?limit=100", label: "Categorías de Objetos" },
    { url: "https://pokeapi.co/api/v2/item-pocket?limit=20", label: "Bolsillos de Objetos" },
    // --- Berries ---
    { url: "https://pokeapi.co/api/v2/berry?limit=100", label: "Bayas" },
    { url: "https://pokeapi.co/api/v2/berry-flavor?limit=10", label: "Sabores de Bayas" },
    // --- Locations & Encounters ---
    { url: "https://pokeapi.co/api/v2/region?limit=20", label: "Regiones" },
    { url: "https://pokeapi.co/api/v2/pokedex?limit=50", label: "Pokédexes" },
    { url: "https://pokeapi.co/api/v2/location?limit=1000", label: "Ubicaciones" },
    { url: "https://pokeapi.co/api/v2/location-area?limit=1000", label: "Áreas de Ubicación" },
    { url: "https://pokeapi.co/api/v2/encounter-method?limit=30", label: "Métodos de Encuentro" },
    // --- Evolutionary Context ---
    { url: "https://pokeapi.co/api/v2/evolution-chain?limit=1000", label: "Cadenas Evolutivas" },
    { url: "https://pokeapi.co/api/v2/evolution-trigger?limit=10", label: "Disparadores Evolutivos" },
    // --- Games & Versions ---
    { url: "https://pokeapi.co/api/v2/generation?limit=20", label: "Generaciones" },
    { url: "https://pokeapi.co/api/v2/version?limit=100", label: "Versiones" },
    { url: "https://pokeapi.co/api/v2/version-group?limit=100", label: "Grupos de Versiones" },
    // --- Social & Biology ---
    { url: "https://pokeapi.co/api/v2/egg-group?limit=20", label: "Grupos Huevo" },
    { url: "https://pokeapi.co/api/v2/nature?limit=50", label: "Naturalezas" },
    { url: "https://pokeapi.co/api/v2/growth-rate?limit=10", label: "Tasas de Crecimiento" },
    { url: "https://pokeapi.co/api/v2/characteristic?limit=50", label: "Características" },
    { url: "https://pokeapi.co/api/v2/pokemon-color?limit=20", label: "Colores" },
    { url: "https://pokeapi.co/api/v2/pokemon-habitat?limit=20", label: "Hábitats" },
    { url: "https://pokeapi.co/api/v2/pokemon-shape?limit=20", label: "Formas Corporales" },
    // --- Contests ---
    { url: "https://pokeapi.co/api/v2/contest-type?limit=10", label: "Tipos de Concurso" },
    { url: "https://pokeapi.co/api/v2/contest-effect?limit=50", label: "Efectos de Concurso" }
  ];

  try {
    const syncedUrls = new Set();
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const API_DELAY = 150; // Stable delay between linear requests

    // Process each category sequentially for "table separation" progress
    for (let c = 0; c < categories.length; c++) {
      const cat = categories[c];
      
      if (progressText) {
        progressText.textContent = `[${c + 1}/${categories.length}] Iniciando ${cat.label}...`;
      }
      if (ProgressBar) ProgressBar.style.width = "0%";

      const indexData = await fetchCached(cat.url);
      if (!indexData || !indexData.results) continue;

      const urls = indexData.results.map((r) => r.url);
      const catTotal = urls.length;
      let catCompleted = 0;

      // Concurrency limit to speed up sync without getting IP banned or 504 errors
      const CONCURRENCY_LIMIT = 5;
      let currentIndex = 0;

      const processUrl = async (url) => {
        if (syncedUrls.has(url)) return;
        syncedUrls.add(url);

        try {
          // 1. Fetch Detail
          const d = await fetchCached(url, undefined, true);

          // 2. Special Logic for Pokemon: fetch species, forms, evolution chains
          if (url.includes("/pokemon/")) {
            if (d.species && d.species.url && !syncedUrls.has(d.species.url)) {
              syncedUrls.add(d.species.url);
              const spData = await fetchCached(d.species.url, undefined, true).catch(() => null);
              
              if (spData && spData.evolution_chain?.url && !syncedUrls.has(spData.evolution_chain.url)) {
                syncedUrls.add(spData.evolution_chain.url);
                await fetchCached(spData.evolution_chain.url, undefined, true).catch(() => null);
              }
            }

            if (d.forms && d.forms.length > 0) {
              for (const f of d.forms) {
                if (!syncedUrls.has(f.url)) {
                  syncedUrls.add(f.url);
                  await fetchCached(f.url, undefined, true).catch(() => null);
                }
              }
            }
          }
        } catch (err) {
          console.warn(`Error syncing detail: ${url}`, err);
        }
      };

      const worker = async () => {
        while (currentIndex < urls.length) {
          const url = urls[currentIndex++];
          await processUrl(url);
          catCompleted++;

          if (progressText) {
            progressText.textContent = `[${c + 1}/${categories.length}] ${cat.label}: ${catCompleted} / ${catTotal}`;
          }
          if (ProgressBar) {
            const percent = Math.round((catCompleted / catTotal) * 100);
            ProgressBar.style.width = `${percent}%`;
          }
          
          // Wait briefly between requests to ensure server stability
          await delay(API_DELAY);
        }
      };

      const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());
      await Promise.all(workers);
    }

    if (progressText)
      progressText.textContent =
        (window.I18n && I18n.t("footer.sync_complete")) ||
        "Sincronización completa";
  } catch (e) {
    console.error("Deep Sync failed:", e);
    if (progressText)
      progressText.textContent =
        (window.I18n &&
          window.I18n.t(
            "common.error_loading",
            "Error en la sincronización",
          )) ||
        "Error en la sincronización";
  }

  setTimeout(async () => {
    if (progressRow) progressRow.hidden = true;
    if (syncBtn) syncBtn.disabled = false;
    if (deepSyncBtn) deepSyncBtn.disabled = false;
    await updateCacheStatusUI();
  }, 3000);
}

/**
 * Update footer cache status UI if elements exist.
 * Shows last sync time and cached data counts.
 */
async function updateCacheStatusUI() {
  const lastSyncEl = document.getElementById("cacheLastSync");
  const totalCountEl = document.getElementById("cacheTotalCount");
  if (!lastSyncEl && !totalCountEl) return;

  try {
    const stats = await cacheManager.getStats();

    if (lastSyncEl) {
      if (stats.newestTimestamp) {
        const date = new Date(stats.newestTimestamp);
        // Relative time display
        const diff = Date.now() - stats.newestTimestamp;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        let relativeTime;
        if (diff < 0 || mins < 1) {
          relativeTime =
            (window.I18n && I18n.t("footer.just_now")) || "Ahora mismo";
        } else if (mins < 60) {
          relativeTime = `${mins}min`;
        } else if (hours < 24) {
          relativeTime = `${hours}h`;
        } else {
          relativeTime = `${days}d`;
        }

        lastSyncEl.textContent = `${relativeTime} (${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
      } else {
        lastSyncEl.textContent =
          (window.I18n && I18n.t("footer.never_synced")) || "Nunca";
      }
    }

    if (totalCountEl) {
      if (stats.total > 0) {
        const validLabel =
          (window.I18n && I18n.t("footer.valid_count")) || "vigentes";
        totalCountEl.textContent = `${stats.total} (${stats.valid} ${validLabel})`;
      } else {
        totalCountEl.textContent = "0";
      }
    }
  } catch (e) {
    if (lastSyncEl) lastSyncEl.textContent = "-";
    if (totalCountEl) totalCountEl.textContent = "-";
  }
}

async function clearCache() {
  if (
    confirm(
      (window.I18n && I18n.t("footer.confirm_clear_cache")) ||
        "¿Estás seguro de que quieres borrar todos los datos guardados?",
    )
  ) {
    await cacheManager.clear();
    location.reload();
  }
}

/**
 * Initialize footer-specific listeners and UI.
 * Can be called after dynamic footer loading.
 */
window.initFooterLogic = function () {
  updateCacheStatusUI();

  // Periodically update relative time display (every minute)
  if (window._footerUpdateInterval) clearInterval(window._footerUpdateInterval);
  window._footerUpdateInterval = setInterval(updateCacheStatusUI, 60000);

  const syncBtn = document.getElementById("syncPokeApiBtn");
  if (syncBtn) {
    // Remove old listener if any to avoid duplicates
    syncBtn.removeEventListener("click", syncAllPokeAPI);
    syncBtn.addEventListener("click", syncAllPokeAPI);
  }

  const clearBtn = document.getElementById("clearCacheBtn");
  if (clearBtn) {
    clearBtn.removeEventListener("click", clearCache);
    clearBtn.addEventListener("click", clearCache);
  }

  const deepSyncBtn = document.getElementById("deepSyncPokeApiBtn");
  if (deepSyncBtn) {
    deepSyncBtn.removeEventListener("click", deepSyncAllPokeAPI);
    deepSyncBtn.addEventListener("click", deepSyncAllPokeAPI);
  }
};

/**
 * Automatically trigger a deep sync once per day.
 */
async function autoDeepSyncDaily() {
  const lastSyncStr = localStorage.getItem("pokedex_last_auto_deepsync");
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // If there's no previous sync, or it's been 24+ hours (also handles old YYYY-MM-DD format gracefully)
  if (!lastSyncStr || (now - parseInt(lastSyncStr, 10)) >= TWENTY_FOUR_HOURS) {
    console.log("Iniciando sincronización profunda automática (pasaron > 24h)...");
    try {
      // Wait a moment before starting to allow the UI to finish rendering
      await new Promise(r => setTimeout(r, 5000));
      await deepSyncAllPokeAPI();
      localStorage.setItem("pokedex_last_auto_deepsync", now.toString());
    } catch (e) {
      console.error("Error en sincronización automática:", e);
    }
  }
}

// Run cache status update when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.initFooterLogic();
  
  // Attempt daily auto-sync
  autoDeepSyncDaily();
});

// Export for use in other files
window.cacheManager = cacheManager;
window.fetchCached = fetchCached;
window.updateCacheStatusUI = updateCacheStatusUI;
window.syncAllPokeAPI = syncAllPokeAPI;
window.deepSyncAllPokeAPI = deepSyncAllPokeAPI;
window.clearCache = clearCache;
