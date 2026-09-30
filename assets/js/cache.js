/**
 * Cache Manager using IndexedDB
 * Provides persistent caching for API requests to improve performance.
 * Uses separate object stores per data category for faster lookups.
 */

const DB_NAME = "PokedexCacheDB";
const DB_VERSION = 5;
/*
  =============================================================================
  SISTEMA DE CACHÉ
  Si haces cambios importantes en los datos o en la API y quieres que todos 
  los usuarios descarguen la nueva versión (borrando su caché local), 
  simplemente incrementa el número de APP_CACHE_VERSION (ej. de "2.3.0" a "2.3.1").
  =============================================================================
*/
const APP_CACHE_VERSION = "2.3.1"; // Increment to force clear

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
 * Normalizes any relative or absolute URL to a canonical absolute URL string.
 * This guarantees consistent cache keys across root and subpages.
 * @param {string} url
 * @returns {string} canonical URL
 */
function normalizeCacheKey(url) {
  try {
    return new URL(url, window.location.href).href;
  } catch (e) {
    return url;
  }
}

/**
 * Determine which object store a URL belongs to based on its API path.
 * @param {string} url
 * @returns {string} store name
 */
function getStoreForUrl(url) {
  try {
    const canonical = normalizeCacheKey(url);
    const path = new URL(canonical).pathname;

    if (/bulbapedia_proxy\.php/.test(canonical) || /bulbapedia_proxy\.php/.test(path)) {
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
    this._memoryCache = new Map(); // Fast L1 in-memory cache
    this._maxMemoryEntries = 2500;
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
    const key = normalizeCacheKey(url);
    // 1. Check ultra-fast in-memory L1 cache first
    const memItem = this._memoryCache.get(key);
    if (memItem) {
      if (memItem.expiry > Date.now()) {
        return memItem.data;
      }
      this._memoryCache.delete(key);
    }

    // 2. Check IndexedDB L2 cache
    await this.ready;
    const storeName = getStoreForUrl(key);
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.expiry > Date.now()) {
            // Populate L1 cache for subsequent instant access
            this._putInMemory(key, result.data, result.expiry);
            resolve(result.data);
          } else {
            if (result) this.delete(key); // Clean up expired
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  _putInMemory(url, data, expiry) {
    const key = normalizeCacheKey(url);
    if (this._memoryCache.size >= this._maxMemoryEntries) {
      // Evict oldest entry (first key in map)
      const firstKey = this._memoryCache.keys().next().value;
      if (firstKey) this._memoryCache.delete(firstKey);
    }
    this._memoryCache.set(key, { data, expiry });
  }

  async set(url, data, ttl = 24 * 60 * 60 * 1000) {
    const key = normalizeCacheKey(url);
    // Default TTL: 24 hours
    const expiry = Date.now() + ttl;
    // Always update L1 RAM immediately
    this._putInMemory(key, data, expiry);

    await this.ready;
    const storeName = getStoreForUrl(key);
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const item = {
          url: key,
          data,
          cachedAt: Date.now(),
          expiry,
        };
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve(); // Don't crash if transaction fails
      }
    });
  }

  async delete(url) {
    const key = normalizeCacheKey(url);
    this._memoryCache.delete(key);
    await this.ready;
    const storeName = getStoreForUrl(key);
    try {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      store.delete(key);
    } catch (e) {}
  }

  /**
   * Internal clearing logic that doesn't wait for 'ready' to avoid deadlocks.
   * @private
   */
  _clearInternal() {
    this._memoryCache.clear();
    if (!this.db) return;
    const existingStores = STORE_NAMES.filter(name => this.db.objectStoreNames.contains(name));
    if (existingStores.length === 0) return;
    
    try {
      const transaction = this.db.transaction(existingStores, "readwrite");
      for (const storeName of existingStores) {
        transaction.objectStore(storeName).clear();
      }
    } catch (e) {}
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

// In-flight request deduplication map
const _inFlightRequests = new Map();

/**
 * Fetches a URL, using the cache if available.
 * Includes retry logic for network stability and deduplicates concurrent in-flight requests.
 * @param {string} url The URL to fetch.
 * @param {number} ttl Time to live in milliseconds (default 24h).
 * @param {boolean} force If true, bypass cache and force a new fetch.
 * @param {number} retries Number of retry attempts.
 * @param {number} delayMs Initial backoff delay.
 * @returns {Promise<any>} The JSON response.
 */
async function fetchCached(url, ttl, force = false, retries = 3, delayMs = 1000, signal = null) {
  const combinedSignal = signal || (_activeSyncAbortController ? _activeSyncAbortController.signal : null);
  if (combinedSignal && combinedSignal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const key = normalizeCacheKey(url);
  if (!force) {
    try {
      const cached = await cacheManager.get(key);
      if (cached) {
        return cached;
      }
    } catch (e) {}
  }

  // If a request for this exact URL is already in progress, await its result
  if (!force && _inFlightRequests.has(key)) {
    return _inFlightRequests.get(key);
  }

  const fetchPromise = (async () => {
    for (let i = 0; i <= retries; i++) {
      if (combinedSignal && combinedSignal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      try {
        const res = await fetch(url, { signal: combinedSignal || undefined });
        
        if (!res.ok) {
          // Don't retry on 404 as it's a permanent failure for that resource
          if (res.status === 404) throw new Error(`HTTP 404`);
          
          if (i < retries && !(combinedSignal && combinedSignal.aborted)) {
            // Add random jitter to backoff to prevent thundering herds
            const backoff = delayMs * Math.pow(2, i) + Math.random() * 500;
            console.warn(`Fetch failed (HTTP ${res.status}) for ${url}. Retrying in ${Math.round(backoff)}ms... (${i + 1}/${retries})`);
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, backoff);
              if (combinedSignal) {
                combinedSignal.addEventListener("abort", () => {
                  clearTimeout(timer);
                  reject(new DOMException("Aborted", "AbortError"));
                }, { once: true });
              }
            });
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
          await cacheManager.set(key, data, ttl);
        } catch (e) {}

        return data;
      } catch (err) {
        const isAborted = err.name === "AbortError" || (combinedSignal && combinedSignal.aborted);
        if (i < retries && !isAborted) {
          // Add random jitter to error retry backoff
          const backoff = delayMs * Math.pow(2, i) + Math.random() * 500;
          console.warn(`Fetch error for ${url}: ${err.message}. Retrying in ${Math.round(backoff)}ms... (${i + 1}/${retries})`);
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, backoff);
            if (combinedSignal) {
              combinedSignal.addEventListener("abort", () => {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
              }, { once: true });
            }
          });
        } else {
          throw err;
        }
      }
    }
  })();

  if (!force) {
    _inFlightRequests.set(key, fetchPromise);
  }

  try {
    return await fetchPromise;
  } finally {
    if (!force) {
      _inFlightRequests.delete(key);
    }
  }
}

/**
 * Cross-tab synchronization management & reactive state
 */
const CURRENT_TAB_ID = "tab_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
let _activeSyncAbortController = null;
let _isSyncAborted = false;
let _localSyncRunning = false;
let _syncChannel = null;

try {
  if (typeof BroadcastChannel !== "undefined") {
    _syncChannel = new BroadcastChannel("pokedex_sync_channel");
    _syncChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === "STOP_SYNC") {
        if (_localSyncRunning) {
          stopCurrentSync();
        } else {
          renderFollowerStoppedUI(data.text);
        }
      } else if (data.type === "SYNC_PROGRESS") {
        handleIncomingSyncProgress(data);
      }
    };
  }
} catch (e) {
  // BroadcastChannel unavailable
}

window.addEventListener("storage", (e) => {
  if (e.key === "pokedex_sync_state" && e.newValue) {
    try {
      const state = JSON.parse(e.newValue);
      if (state.stopped) {
        if (_localSyncRunning) {
          stopCurrentSync();
        } else {
          renderFollowerStoppedUI(state.text);
        }
      } else if (state.active) {
        handleIncomingSyncProgress(state);
      }
    } catch (err) {}
  }
});

// Clean up state if this tab was running the sync when unloaded
window.addEventListener("beforeunload", () => {
  if (_localSyncRunning) {
    if (_activeSyncAbortController) {
      try { _activeSyncAbortController.abort(); } catch (e) {}
    }
    localStorage.removeItem("pokedex_deepsync_lock");
    const unloadState = {
      active: false,
      stopped: true,
      tabId: CURRENT_TAB_ID,
      lastHeartbeat: 0
    };
    localStorage.setItem("pokedex_sync_state", JSON.stringify(unloadState));
  }
});

function getUiElements() {
  return {
    deepSyncBtn: document.getElementById("deepSyncPokeApiBtn"),
    syncBtn: document.getElementById("syncPokeApiBtn"),
    stopSyncBtn: document.getElementById("stopSyncBtn"),
    progressRow: document.getElementById("syncProgressRow"),
    progressBar: document.getElementById("syncProgressBar"),
    progressText: document.getElementById("syncProgressText"),
  };
}

function updateUi(text, percent, isSyncing = true) {
  const ui = getUiElements();
  if (ui.progressRow) ui.progressRow.hidden = false;
  if (ui.deepSyncBtn) ui.deepSyncBtn.disabled = isSyncing;
  if (ui.syncBtn) ui.syncBtn.disabled = isSyncing;
  if (ui.stopSyncBtn) {
    ui.stopSyncBtn.style.display = isSyncing ? "inline-flex" : "none";
  }
  if (ui.progressText && text !== undefined) {
    ui.progressText.textContent = text;
  }
  if (ui.progressBar) {
    if (percent !== undefined) {
      ui.progressBar.style.width = `${percent}%`;
      ui.progressBar.setAttribute("aria-valuenow", percent);
    }
    if (!isSyncing && percent === 100) {
      ui.progressBar.style.backgroundColor = "";
    }
  }
}

function broadcastProgress(text, percent) {
  const state = {
    type: "SYNC_PROGRESS",
    active: true,
    stopped: false,
    text,
    percent,
    tabId: CURRENT_TAB_ID,
    lastHeartbeat: Date.now()
  };
  localStorage.setItem("pokedex_sync_state", JSON.stringify(state));
  if (_syncChannel) {
    try { _syncChannel.postMessage(state); } catch (e) {}
  }
}

function updateHeartbeatInStorage(timestamp) {
  try {
    const raw = localStorage.getItem("pokedex_sync_state");
    if (raw) {
      const state = JSON.parse(raw);
      state.lastHeartbeat = timestamp;
      localStorage.setItem("pokedex_sync_state", JSON.stringify(state));
    }
  } catch (e) {}
}

function handleIncomingSyncProgress(data) {
  if (!_localSyncRunning && data && data.active) {
    updateUi(data.text, data.percent, true);
  }
}

function renderFollowerStoppedUI(text) {
  const stoppedMsg = text || (window.I18n && I18n.t("footer.sync_stopped")) || "Sincronización detenida";
  const ui = getUiElements();
  if (ui.progressText) ui.progressText.textContent = stoppedMsg;
  if (ui.progressBar) {
    ui.progressBar.style.backgroundColor = "#ef4444";
  }
  if (ui.stopSyncBtn) ui.stopSyncBtn.style.display = "none";
  if (ui.deepSyncBtn) ui.deepSyncBtn.disabled = false;
  if (ui.syncBtn) ui.syncBtn.disabled = false;

  setTimeout(async () => {
    const freshUi = getUiElements();
    if (freshUi.progressRow) freshUi.progressRow.hidden = true;
    if (freshUi.progressBar) {
      freshUi.progressBar.style.backgroundColor = "";
      freshUi.progressBar.style.width = "0%";
    }
    await updateCacheStatusUI();
  }, 2500);
}

function stopCurrentSync() {
  console.log("Deteniendo sincronización...");
  _isSyncAborted = true;
  _localSyncRunning = false;
  
  if (_activeSyncAbortController) {
    try {
      _activeSyncAbortController.abort();
    } catch (e) {}
    _activeSyncAbortController = null;
  }

  localStorage.removeItem("pokedex_deepsync_lock");

  const stoppedMsg = (window.I18n && I18n.t("footer.sync_stopped")) || "Sincronización detenida";
  const stoppedState = {
    type: "STOP_SYNC",
    active: false,
    stopped: true,
    text: stoppedMsg,
    percent: 0,
    tabId: CURRENT_TAB_ID,
    lastHeartbeat: Date.now()
  };
  localStorage.setItem("pokedex_sync_state", JSON.stringify(stoppedState));
  if (_syncChannel) {
    try { _syncChannel.postMessage(stoppedState); } catch (e) {}
  }

  const ui = getUiElements();
  if (ui.progressText) ui.progressText.textContent = stoppedMsg;
  if (ui.progressBar) {
    ui.progressBar.style.backgroundColor = "#ef4444";
  }
  if (ui.stopSyncBtn) ui.stopSyncBtn.style.display = "none";
  if (ui.deepSyncBtn) ui.deepSyncBtn.disabled = false;
  if (ui.syncBtn) ui.syncBtn.disabled = false;

  setTimeout(async () => {
    const freshUi = getUiElements();
    if (freshUi.progressRow) freshUi.progressRow.hidden = true;
    if (freshUi.progressBar) {
      freshUi.progressBar.style.backgroundColor = "";
      freshUi.progressBar.style.width = "0%";
    }
    await updateCacheStatusUI();
  }, 2500);
}

function onStopBtnClick(e) {
  if (e) e.preventDefault();
  if (_localSyncRunning) {
    stopCurrentSync();
  } else {
    const stoppedMsg = (window.I18n && I18n.t("footer.sync_stopped")) || "Sincronización detenida";
    const stopMsg = {
      type: "STOP_SYNC",
      active: false,
      stopped: true,
      text: stoppedMsg,
      tabId: CURRENT_TAB_ID,
      lastHeartbeat: Date.now()
    };
    localStorage.setItem("pokedex_sync_state", JSON.stringify(stopMsg));
    localStorage.removeItem("pokedex_deepsync_lock");
    if (_syncChannel) {
      try { _syncChannel.postMessage(stopMsg); } catch (err) {}
    }
    renderFollowerStoppedUI(stoppedMsg);
  }
}

function checkAndSyncUIFromState() {
  const stateStr = localStorage.getItem("pokedex_sync_state");
  const activeLock = localStorage.getItem("pokedex_deepsync_lock");
  const now = Date.now();

  let state = null;
  if (stateStr) {
    try { state = JSON.parse(stateStr); } catch (e) {}
  }

  const isAlive = state && state.active && (now - (state.lastHeartbeat || 0) < 4500);

  if (isAlive) {
    updateUi(state.text || "Sincronizando...", state.percent || 0, true);
  } else {
    // Cleanup any orphaned/stale lock from previous page or closed tab
    if (activeLock && (now - parseInt(activeLock, 10) > 4500)) {
      localStorage.removeItem("pokedex_deepsync_lock");
    }
    if (state && state.active && (now - (state.lastHeartbeat || 0) >= 4500)) {
      localStorage.removeItem("pokedex_sync_state");
    }
    const ui = getUiElements();
    if (!_localSyncRunning) {
      if (ui.progressRow) ui.progressRow.hidden = true;
      if (ui.deepSyncBtn) ui.deepSyncBtn.disabled = false;
      if (ui.syncBtn) ui.syncBtn.disabled = false;
      if (ui.stopSyncBtn) ui.stopSyncBtn.style.display = "none";
    }
  }
}

/**
 * Bulk sync core PokeAPI data to pre-cache indices.
 * This fetches lists (indices) and caches them to avoid initial loading delays.
 */
async function syncAllPokeAPI() {
  if (_localSyncRunning) return;
  _localSyncRunning = true;
  _isSyncAborted = false;
  _activeSyncAbortController = new AbortController();

  const startMsg = (window.I18n && I18n.t("footer.syncing")) || "Sincronizando...";
  updateUi(startMsg, 0, true);
  broadcastProgress(startMsg, 0);

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

  try {
    for (const ep of endpoints) {
      if (_isSyncAborted) break;
      const progressText = `${(window.I18n && I18n.t("footer.syncing")) || "Sincronizando"} ${ep.key}...`;
      const currentPercent = Math.round((completed / total) * 100);
      updateUi(progressText, currentPercent, true);
      broadcastProgress(progressText, currentPercent);

      // Force a fresh download and update cache
      await fetchCached(ep.url, undefined, true, 3, 1000, _activeSyncAbortController.signal);
      if (_isSyncAborted) break;

      completed++;
      const updatedPercent = Math.round((completed / total) * 100);
      updateUi(progressText, updatedPercent, true);
      broadcastProgress(progressText, updatedPercent);
    }

    if (!_isSyncAborted) {
      const completeText = (window.I18n && I18n.t("footer.sync_complete")) || "Sincronización completa";
      updateUi(completeText, 100, false);
      broadcastProgress(completeText, 100);
    }
  } catch (e) {
    if (e.name !== "AbortError" && !_isSyncAborted) {
      console.error("Error in syncAllPokeAPI:", e);
    }
  } finally {
    _localSyncRunning = false;
    _activeSyncAbortController = null;
  }

  if (!_isSyncAborted) {
    setTimeout(async () => {
      const freshUi = getUiElements();
      if (freshUi.progressRow) freshUi.progressRow.hidden = true;
      if (freshUi.syncBtn) freshUi.syncBtn.disabled = false;
      if (freshUi.deepSyncBtn) freshUi.deepSyncBtn.disabled = false;
      if (freshUi.stopSyncBtn) freshUi.stopSyncBtn.style.display = "none";
      await updateCacheStatusUI();
    }, 2000);
  }
}

/**
 * Deep Sync: Download every single detail record for Pokémon, Moves, etc.
 * Uses batching to avoid overwhelming the API.
 */
async function deepSyncAllPokeAPI() {
  if (_localSyncRunning) return;
  _localSyncRunning = true;
  _isSyncAborted = false;
  _activeSyncAbortController = new AbortController();

  const startText = (window.I18n && I18n.t("footer.deep_sync_starting")) || "Iniciando sincronización profunda...";
  updateUi(startText, 0, true);

  // Heartbeat execution lock & state (refreshed every 1.5s) to broadcast liveness
  localStorage.setItem("pokedex_deepsync_lock", Date.now().toString());
  broadcastProgress(startText, 0);

  const heartbeatTimer = setInterval(() => {
    if (_localSyncRunning && !_isSyncAborted) {
      const now = Date.now();
      localStorage.setItem("pokedex_deepsync_lock", now.toString());
      updateHeartbeatInStorage(now);
    }
  }, 1500);

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
    const API_DELAY = 25;

    for (let c = 0; c < categories.length; c++) {
      if (_isSyncAborted) break;
      const cat = categories[c];
      
      const catMsg = `[${c + 1}/${categories.length}] Iniciando ${cat.label}...`;
      updateUi(catMsg, 0, true);
      broadcastProgress(catMsg, 0);

      const indexData = await fetchCached(cat.url, undefined, false, 3, 1000, _activeSyncAbortController.signal);
      if (_isSyncAborted) break;
      if (!indexData || !indexData.results) continue;

      const urls = indexData.results.map((r) => r.url);
      const catTotal = urls.length;
      let catCompleted = 0;

      const CONCURRENCY_LIMIT = 8;
      let currentIndex = 0;

      const processUrl = async (url) => {
        if (_isSyncAborted) return;
        if (syncedUrls.has(url)) return;
        syncedUrls.add(url);

        try {
          const d = await fetchCached(url, undefined, true, 2, 800, _activeSyncAbortController.signal);
          if (_isSyncAborted) return;

          if (url.includes("/pokemon/") && d) {
            if (d.species && d.species.url && !syncedUrls.has(d.species.url)) {
              syncedUrls.add(d.species.url);
              const spData = await fetchCached(d.species.url, undefined, true, 2, 800, _activeSyncAbortController.signal).catch(() => null);
              if (_isSyncAborted) return;
              if (spData && spData.evolution_chain?.url && !syncedUrls.has(spData.evolution_chain.url)) {
                syncedUrls.add(spData.evolution_chain.url);
                await fetchCached(spData.evolution_chain.url, undefined, true, 2, 800, _activeSyncAbortController.signal).catch(() => null);
              }
            }

            if (!_isSyncAborted && d.forms && d.forms.length > 0) {
              for (const f of d.forms) {
                if (_isSyncAborted) break;
                if (!syncedUrls.has(f.url)) {
                  syncedUrls.add(f.url);
                  await fetchCached(f.url, undefined, true, 2, 800, _activeSyncAbortController.signal).catch(() => null);
                }
              }
            }
          }
        } catch (err) {
          if (err.name !== "AbortError") {
            console.warn(`Error syncing detail: ${url}`, err);
          }
        }
      };

      let lastProgressUpdate = 0;

      const worker = async () => {
        while (currentIndex < urls.length && !_isSyncAborted) {
          const url = urls[currentIndex++];
          await processUrl(url);
          if (_isSyncAborted) break;
          catCompleted++;

          const now = Date.now();
          if (now - lastProgressUpdate > 80 || catCompleted === catTotal) {
            lastProgressUpdate = now;
            const percent = Math.round((catCompleted / catTotal) * 100);
            const progressMsg = `[${c + 1}/${categories.length}] ${cat.label}: ${catCompleted} / ${catTotal}`;
            updateUi(progressMsg, percent, true);
            broadcastProgress(progressMsg, percent);
          }
          
          if (API_DELAY > 0 && !_isSyncAborted) await delay(API_DELAY);
        }
      };

      const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, urls.length) }, () => worker());
      await Promise.all(workers);
      if (_isSyncAborted) break;
    }

    if (_isSyncAborted) {
      console.log("Deep sync fue detenido.");
    } else {
      const completeMsg = (window.I18n && I18n.t("footer.sync_complete")) || "Sincronización completa";
      updateUi(completeMsg, 100, false);
      broadcastProgress(completeMsg, 100);

      const completedAt = Date.now().toString();
      localStorage.setItem("pokedex_last_auto_deepsync", completedAt);
      localStorage.setItem("pokedex_last_auto_sync", completedAt);
    }
  } catch (e) {
    if (e.name !== "AbortError" && !_isSyncAborted) {
      console.error("Deep Sync failed:", e);
      const errorMsg = (window.I18n && window.I18n.t("common.error_loading", "Error en la sincronización")) || "Error en la sincronización";
      updateUi(errorMsg, undefined, false);
      broadcastProgress(errorMsg, 0);
    }
  } finally {
    clearInterval(heartbeatTimer);
    _localSyncRunning = false;
    _activeSyncAbortController = null;
    localStorage.removeItem("pokedex_deepsync_lock");
    if (!_isSyncAborted) {
      localStorage.removeItem("pokedex_sync_state");
    }
  }

  if (!_isSyncAborted) {
    setTimeout(async () => {
      const freshUi = getUiElements();
      if (freshUi.progressRow) freshUi.progressRow.hidden = true;
      if (freshUi.syncBtn) freshUi.syncBtn.disabled = false;
      if (freshUi.deepSyncBtn) freshUi.deepSyncBtn.disabled = false;
      if (freshUi.stopSyncBtn) freshUi.stopSyncBtn.style.display = "none";
      await updateCacheStatusUI();
    }, 3000);
  }
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
    if (window.CardStorage && typeof window.CardStorage.clear === "function") {
      try {
        await window.CardStorage.clear();
      } catch (e) {
        console.warn("Error clearing CardStorage:", e);
      }
    }
    location.reload();
  }
}

/**
 * Initialize footer-specific listeners and UI.
 * Can be called after dynamic footer loading.
 */
window.initFooterLogic = function () {
  updateCacheStatusUI();

  if (window._footerUpdateInterval) clearInterval(window._footerUpdateInterval);
  window._footerUpdateInterval = setInterval(updateCacheStatusUI, 60000);

  const syncBtn = document.getElementById("syncPokeApiBtn");
  if (syncBtn) {
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

  const stopBtn = document.getElementById("stopSyncBtn");
  if (stopBtn) {
    stopBtn.removeEventListener("click", onStopBtnClick);
    stopBtn.addEventListener("click", onStopBtnClick);
  }

  if (typeof lucide !== "undefined") {
    try {
      lucide.createIcons();
    } catch (e) {}
  }

  checkAndSyncUIFromState();
};

/**
 * Automatically trigger a deep sync if more than 24 hours have passed since the last cache.
 * @param {boolean} force If true, bypasses time checks and executes immediately.
 */
async function autoDeepSyncDaily(force = false) {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const DEEP_SYNC_LOCK_TTL = 5000; // 5 seconds since active worker updates heartbeat every 1.5s

  // 1. Prevent duplicate concurrent workers across multiple tabs or quick page reloads
  const activeLock = localStorage.getItem("pokedex_deepsync_lock");
  const stateStr = localStorage.getItem("pokedex_sync_state");
  if (activeLock) {
    const lockTime = parseInt(activeLock, 10);
    let state = null;
    try { state = JSON.parse(stateStr); } catch (e) {}
    const isReallyActive = (now - lockTime) < DEEP_SYNC_LOCK_TTL && (state?.active || (now - (state?.lastHeartbeat || 0)) < DEEP_SYNC_LOCK_TTL);
    
    if (isReallyActive) {
      console.log("Deep sync already active in another tab/process. Skipping duplicate.");
      return;
    } else {
      localStorage.removeItem("pokedex_deepsync_lock");
      localStorage.removeItem("pokedex_sync_state");
    }
  }

  // 2. Evaluate if 24 hours have passed since the last completed deep sync
  const lastSyncStr = localStorage.getItem("pokedex_last_auto_deepsync") || localStorage.getItem("pokedex_last_auto_sync");
  let shouldSync = Boolean(force);

  if (!shouldSync) {
    if (!lastSyncStr) {
      shouldSync = true;
    } else {
      const lastSyncTime = parseInt(lastSyncStr, 10);
      if (isNaN(lastSyncTime) || (now - lastSyncTime) >= TWENTY_FOUR_HOURS) {
        shouldSync = true;
      }
    }
  }

  // 3. Fallback: also verify database stats in case localStorage was cleared but DB is stale
  if (!shouldSync) {
    try {
      const stats = await cacheManager.getStats();
      if (!stats.newestTimestamp || (now - stats.newestTimestamp) >= TWENTY_FOUR_HOURS) {
        shouldSync = true;
      }
    } catch (e) {}
  }

  if (shouldSync) {
    console.log("Iniciando sincronización profunda automática (último caché > 24h)...");
    await new Promise(r => setTimeout(r, 1500));
    
    const recheckLock = localStorage.getItem("pokedex_deepsync_lock");
    if (recheckLock && (Date.now() - parseInt(recheckLock, 10)) < DEEP_SYNC_LOCK_TTL) {
      return;
    }
    await deepSyncAllPokeAPI();
  }
}

function startCacheAutoProcesses() {
  window.initFooterLogic();
  autoDeepSyncDaily();
}

// Run cache status update when DOM is ready (handles both loading and interactive/complete states)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCacheAutoProcesses);
} else {
  startCacheAutoProcesses();
}

// Export for use in other files
window.cacheManager = cacheManager;
window.fetchCached = fetchCached;
window.updateCacheStatusUI = updateCacheStatusUI;
window.syncAllPokeAPI = syncAllPokeAPI;
window.deepSyncAllPokeAPI = deepSyncAllPokeAPI;
window.stopCurrentSync = stopCurrentSync;
window.autoDeepSyncDaily = autoDeepSyncDaily;
window.clearCache = clearCache;
