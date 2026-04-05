(function () {
  const DB_NAME = "PokedexTCG_DB";
  const DB_VERSION = 5; // Incremented for zh-tw support
  const CARDS_STORE = "cards"; // Legacy/Default store
  const SETS_STORE = "sets"; // Legacy/Default store
  const META_STORE = "metadata";
  const IMAGES_STORE = "card_images";

  const SUPPORTED_LANGS = ["en", "es", "fr", "de", "it", "pt", "ja", "zh-tw"];

  const CardStorage = {
    db: null,
    _initPromise: null,
    _setsMetaCache: null, // { lang, setDateMap, setSeriesMap }
    _queryCache: null, // { key, allMatching (sorted), allIds }
    _allCardsCache_en: null, // In-memory cache for all english cards
    _locMapCache: null, // { lang: Map } In-memory cache for localized translations

    /**
     * Initialize the database
     */
    init: function () {
      if (this._initPromise) return this._initPromise;

      this._initPromise = new Promise((resolve, reject) => {
        if (this.db) {
          return resolve(this.db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (e) => {
          this._initPromise = null;
          reject(e);
        };

        request.onblocked = () => {
          console.warn("IndexedDB open blocked");
        };

        request.onsuccess = (e) => {
          this.db = e.target.result;
          this.db.onversionchange = () => {
            this.db.close();
            this.db = null;
            this._initPromise = null;
            alert("Base de datos actualizada. Recargando página...");
            location.reload();
          };
          this.db.onabort = () => {
            this.db = null;
            this._initPromise = null;
          };
          this.db.onerror = () => {
            this.db = null;
            this._initPromise = null;
          };
          resolve(this.db);
        };

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          // Legacy stores
          if (!db.objectStoreNames.contains(CARDS_STORE)) {
            db.createObjectStore(CARDS_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(SETS_STORE)) {
            db.createObjectStore(SETS_STORE, { keyPath: "id" });
          }

          // Localized stores
          SUPPORTED_LANGS.forEach((lang) => {
            const cardsStoreName = `cards_${lang}`;
            const setsStoreName = `sets_${lang}`;
            if (!db.objectStoreNames.contains(cardsStoreName)) {
              db.createObjectStore(cardsStoreName, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(setsStoreName)) {
              db.createObjectStore(setsStoreName, { keyPath: "id" });
            }
          });

          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE, { keyPath: "key" });
          }
          if (!db.objectStoreNames.contains(IMAGES_STORE)) {
            db.createObjectStore(IMAGES_STORE); // Key will be the card ID
          }
        };
      });
      return this._initPromise;
    },

    /**
     * Build a cache key from filter values (excluding page).
     */
    _buildFilterKey: function (filters, lang) {
      return JSON.stringify({
        name: filters.name || "",
        series: filters.series || "",
        set: filters.set || "",
        rarity: filters.rarity || "",
        supertype: filters.supertype || "",
        subtype: filters.subtype || "",
        type: filters.type || "",
        hp: filters.hp || "",
        stage: filters.stage || "",
        sort: filters.sort || "name_asc",
        pocket: filters.pocket,
        lang,
      });
    },

    /**
     * Get or build cached set metadata maps.
     */
    _getSetsMetadata: async function (lang) {
      if (this._setsMetaCache && this._setsMetaCache.lang === lang) {
        return this._setsMetaCache;
      }
      const setDateMap = new Map();
      const setSeriesMap = new Map();
      try {
        const sets = await this.getAllSets(lang);
        sets.forEach((s) => {
          if (s.id) {
            if (s.releaseDate) setDateMap.set(s.id, s.releaseDate);
            if (s.serie || s.series) {
              const sName =
                s.serie?.name ||
                s.series ||
                (typeof s.serie === "string" ? s.serie : null);
              if (sName) setSeriesMap.set(s.id, sName);
            }
          }
        });
      } catch (e) {}
      this._setsMetaCache = { lang, setDateMap, setSeriesMap };
      return this._setsMetaCache;
    },

    getCards: async function (filters, lang = "en", page = 1, pageSize = 50) {
      await this.init();

      if (!this.db.objectStoreNames.contains("cards_en")) {
        return { cards: [], total: 0, allIds: [] };
      }

      const offset = (page - 1) * pageSize;
      const limit = pageSize;

      // 1. Cached set metadata (avoids re-reading sets on every query)
      const { setDateMap, setSeriesMap } = await this._getSetsMetadata(lang);

      // 2. Check query cache — if filters haven't changed, reuse sorted results
      const filterKey = this._buildFilterKey(filters, lang);
      if (this._queryCache && this._queryCache.key === filterKey) {
        const cached = this._queryCache;
        const paginated = cached.allMatching.slice(offset, offset + limit);
        return {
          cards: paginated,
          total: cached.allMatching.length,
          allIds: cached.allIds,
        };
      }

      // 3. Bulk load all cards (Use in-memory cache if available)
      let enCards = this._allCardsCache_en;
      if (!enCards) {
        enCards = await this._getAllFromStore("cards_en");
        this._allCardsCache_en = enCards; // save to RAM
      }

      // 4. Build localized lookup map if needed (Use in-memory cache)
      let locMap = null;
      if (lang !== "en") {
        if (!this._locMapCache) this._locMapCache = {};
        
        if (this._locMapCache[lang]) {
            locMap = this._locMapCache[lang];
        } else {
            const locStoreName = `cards_${lang}`;
            if (this.db.objectStoreNames.contains(locStoreName)) {
                const locCards = await this._getAllFromStore(locStoreName);
                locMap = new Map();
                for (let i = 0; i < locCards.length; i++) {
                    locMap.set(locCards[i].id, locCards[i]);
                }
                this._locMapCache[lang] = locMap; // save to RAM
            }
        }
      }

      // 5. Filter in memory
      const searchName = filters.name ? filters.name.toLowerCase().trim() : "";
      const minHp = filters.hp ? parseInt(filters.hp, 10) : 0;
      const allMatching = [];

      for (let i = 0; i < enCards.length; i++) {
        const enCard = enCards[i];
        let finalCard = enCard;

        if (locMap) {
          const locCard = locMap.get(enCard.id);
          if (locCard) {
            finalCard = {
              ...enCard,
              name: locCard.name || enCard.name,
              name_en: enCard.name,
              stage: locCard.stage || enCard.stage,
              suffix: locCard.suffix || enCard.suffix,
            };
          }
        }

        if (
          this._matchesFilters(
            finalCard,
            filters,
            searchName,
            minHp,
            setSeriesMap,
            enCard.name,
          )
        ) {
          allMatching.push(finalCard);
        }
      }

      // 6. Sort and paginate
      const sortedData = this._sortAndPaginate(
        allMatching,
        filters,
        offset,
        limit,
        setDateMap,
      );

      // 7. Cache the result for page changes with same filters
      this._queryCache = {
        key: filterKey,
        allMatching: allMatching, // already sorted in-place by _sortAndPaginate
        allIds: sortedData.allIds,
      };

      return sortedData;
    },

    /**
     * Helper: bulk load all records from a store using getAll().
     */
    _getAllFromStore: function (storeName) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e);
      });
    },

    /**
     * Internal filter matching logic
     */
    _matchesFilters: function (
      card,
      filters,
      searchName,
      minHp,
      setSeriesMap,
      enName = null,
    ) {
      if (searchName) {
        const cardNameNorm = I18n.normalize(card.name);
        const enNameNorm = enName ? I18n.normalize(enName) : null;
        const searchNorm = I18n.normalize(searchName);

        if (
          !cardNameNorm.includes(searchNorm) &&
          (!enNameNorm || !enNameNorm.includes(searchNorm))
        ) {
          return false;
        }
      }

      if (filters.series) {
        const cardSetId = card.set?.id;
        const cardSeriesName =
          setSeriesMap.get(cardSetId) ||
          card.set?.serie?.name ||
          card.set?.series ||
          (typeof card.set?.serie === "string" ? card.set.serie : null);
        if (cardSeriesName?.toLowerCase() !== filters.series?.toLowerCase())
          return false;
      }

      if (filters.pocket === false) {
        const cardSetId = card.set?.id;
        const cardSeriesName =
          setSeriesMap.get(cardSetId) ||
          card.set?.serie?.name ||
          card.set?.series ||
          (typeof card.set?.serie === "string" ? card.set.serie : null);
        if (cardSeriesName?.toLowerCase() === "pokémon tcg pocket")
          return false;
      }

      if (filters.set && card.set?.id !== filters.set) return false;
      if (filters.rarity && card.rarity !== filters.rarity) return false;
      if (filters.supertype) {
        const cat = card.supertype || card.category;
        if (cat !== filters.supertype) return false;
      }
      if (filters.subtype) {
        const hasSubtype =
          card.suffix === filters.subtype ||
          (card.subtypes && card.subtypes.includes(filters.subtype));
        if (!hasSubtype) return false;
      }
      if (filters.type && (!card.types || !card.types.includes(filters.type)))
        return false;
      if (minHp > 0 && (!card.hp || parseInt(card.hp, 10) < minHp))
        return false;
      if (
        filters.stage &&
        (!card.stage ||
          card.stage.toLowerCase() !== filters.stage.toLowerCase())
      )
        return false;

      return true;
    },

    /**
     * Internal sorting and pagination logic
     */
    _sortAndPaginate: function (
      allMatching,
      filters,
      offset,
      limit,
      setDateMap,
    ) {
      const sortKey = filters.sort || "name_asc";

      const getPrice = (card) => {
        const pricing = card.pricing || {};
        const cm = pricing.cardmarket || card.cardmarket?.prices || {};
        const cmPrice =
          cm.avg || cm.averageSellPrice || cm.trend || cm.trendPrice;
        if (cmPrice) return parseFloat(cmPrice);
        const tcg = pricing.tcgplayer || card.tcgplayer?.prices || {};
        let tcgData = tcg;
        if (!tcg.market && !tcg.low) {
          const types = Object.keys(tcg);
          if (types.length > 0) tcgData = tcg[types[0]] || {};
        }
        const tcgPrice = tcgData.market || tcgData.mid || tcgData.low;
        return tcgPrice ? parseFloat(tcgPrice) : 0;
      };

      const compareByLocalId = (a, b) => {
        const localA = parseInt(a.localId, 10) || 0;
        const localB = parseInt(b.localId, 10) || 0;
        return localA - localB;
      };

      allMatching.sort((a, b) => {
        let res = 0;
        switch (sortKey) {
          case "name_asc":
            res = (a.name || "").localeCompare(b.name || "");
            break;
          case "name_desc":
            res = (b.name || "").localeCompare(a.name || "");
            break;
          case "set_newest":
            const dateA =
              setDateMap.get(a.set?.id) || a.set?.releaseDate || "1900-01-01";
            const dateB =
              setDateMap.get(b.set?.id) || b.set?.releaseDate || "1900-01-01";
            res = dateB.localeCompare(dateA);
            break;
          case "set_oldest":
            const dateA2 =
              setDateMap.get(a.set?.id) || a.set?.releaseDate || "9999-12-31";
            const dateB2 =
              setDateMap.get(b.set?.id) || b.set?.releaseDate || "9999-12-31";
            res = dateA2.localeCompare(dateB2);
            break;
          case "hp_desc":
            res = (parseInt(b.hp, 10) || 0) - (parseInt(a.hp, 10) || 0);
            break;
          case "hp_asc":
            res = (parseInt(a.hp, 10) || 0) - (parseInt(b.hp, 10) || 0);
            break;
          case "price_desc":
            res = getPrice(b) - getPrice(a);
            break;
          case "price_asc":
            res = getPrice(a) - getPrice(b);
            break;
        }
        return res === 0 ? compareByLocalId(a, b) : res;
      });

      const paginated = allMatching.slice(offset, offset + limit);
      return {
        cards: paginated,
        total: allMatching.length,
        allIds: allMatching.map((c) => c.id),
      };
    },

    /**
     * Save a batch of cards for a specific language
     * @param {Array} cards
     * @param {string} lang
     */
    saveCardsBatch: async function (cards, lang = "en") {
      await this.init();
      this._queryCache = null; // Invalidate query cache
      
      // Invalidate memory cache to force fresh DB read on next request
      if (lang === "en") this._allCardsCache_en = null;
      if (this._locMapCache && this._locMapCache[lang]) {
          delete this._locMapCache[lang];
      }

      const storeName = `cards_${lang}`;
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);

        cards.forEach((card) => {
          // Only keep essential fields if memory becomes an issue,
          // but for now we keep the whole object as requested.
          store.put(card);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject(e);
      });
    },

    /**
     * Save metadata (total count, last updated)
     * @param {Object} metadata
     */
    saveMetadata: async function (metadata) {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([META_STORE], "readwrite");
        const store = transaction.objectStore(META_STORE);

        const data = {
          key: "current_meta",
          ...metadata,
          lastUpdated: new Date().toISOString(),
        };

        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
      });
    },

    /**
     * Load all cards for a language
     * @param {string} lang
     * @returns {Promise<Array>}
     */
    getAllCards: async function (lang = "en") {
      await this.init();
      const storeName = `cards_${lang}`;
      if (!this.db.objectStoreNames.contains(storeName)) return [];
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
      });
    },

    /**
     * Load metadata
     * @returns {Promise<Object|null>}
     */
    loadMetadata: async function () {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([META_STORE], "readonly");
        const store = transaction.objectStore(META_STORE);
        const request = store.get("current_meta");

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e);
      });
    },

    /**
     * Check if data exists in a language
     * @param {string} lang
     * @returns {Promise<boolean>}
     */
    hasSavedData: async function (lang = "en") {
      await this.init();
      const storeName = `cards_${lang}`;
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = (e) => reject(e);
      });
    },

    /**
     * Save a batch of sets for a specific language
     * @param {Array} sets
     * @param {string} lang
     */
    saveSetsBatch: async function (sets, lang = "en") {
      await this.init();
      this._setsMetaCache = null; // Invalidate sets meta cache
      this._queryCache = null; // Invalidate query cache
      const storeName = `sets_${lang}`;
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);

        sets.forEach((set) => {
          store.put(set);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject(e);
      });
    },

    /**
     * Get a single set by ID
     * @param {string} id Set ID
     * @param {string} lang
     * @returns {Promise<Object|null>}
     */
    getSetById: async function (id, lang = "en") {
      await this.init();
      const storeName = `sets_${lang}`;
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e);
      });
    },

    /**
     * Get all sets for a language
     * @param {string} lang
     * @returns {Promise<Array>}
     */
    getAllSets: async function (lang = "en") {
      await this.init();
      const sets = new Map();

      const loadFromStore = (storeName) => {
        return new Promise((resolve, reject) => {
          if (!this.db.objectStoreNames.contains(storeName)) {
            return resolve([]);
          }
          const transaction = this.db.transaction([storeName], "readonly");
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = (e) => reject(e);
        });
      };

      try {
        // Always load English sets as base
        const enSets = await loadFromStore("sets_en");
        enSets.forEach((s) => sets.set(s.id, s));

        // If not English, load localized sets and merge
        if (lang !== "en") {
          const locSets = await loadFromStore(`sets_${lang}`);
          locSets.forEach((s) => {
            const base = sets.get(s.id);
            if (base) {
              // Merge carefully: only overwrite with truthy localized values
              const merged = { ...base };
              Object.keys(s).forEach((key) => {
                if (s[key] !== null && s[key] !== undefined && s[key] !== "") {
                  merged[key] = s[key];
                }
              });
              sets.set(s.id, merged);
            } else {
              sets.set(s.id, s);
            }
          });
        }
      } catch (e) {
        console.error("Error loading sets:", e);
      }

      return Array.from(sets.values());
    },

    /**
     * Clear all saved data (all languages)
     */
    clear: async function () {
      await this.init();
      this._allCardsCache_en = null;
      this._locMapCache = null;
      this._queryCache = null;
      this._setsMetaCache = null;

      return new Promise((resolve, reject) => {
        const storesToClear = [
          CARDS_STORE,
          SETS_STORE,
          META_STORE,
          IMAGES_STORE,
        ];
        SUPPORTED_LANGS.forEach((lang) => {
          storesToClear.push(`cards_${lang}`);
          storesToClear.push(`sets_${lang}`);
        });

        // Filter out non-existent stores (safety)
        const existingStores = storesToClear.filter((s) =>
          this.db.objectStoreNames.contains(s),
        );

        const transaction = this.db.transaction(existingStores, "readwrite");
        existingStores.forEach((s) => {
          transaction.objectStore(s).clear();
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject(e);
      });
    },

    /**
     * Save a card image Blob
     * @param {string} id Card ID
     * @param {Blob} blob
     */
    saveCardImage: async function (id, blob) {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([IMAGES_STORE], "readwrite");
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.put(blob, id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
      });
    },

    getCardById: async function (id, lang = "en") {
      await this.init();

      const fetchFromStore = (storeName, cardId) => {
        return new Promise((resolve, reject) => {
          try {
            const transaction = this.db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get(cardId);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (e) => reject(e);
          } catch (e) {
            resolve(null);
          }
        });
      };

      // Always get English as base
      const enCard = await fetchFromStore("cards_en", id);

      if (lang === "en") return enCard;

      // Get localized version
      const locCard = await fetchFromStore(`cards_${lang}`, id);

      if (!enCard) return locCard;
      if (!locCard) return enCard;

      // Deep Merge logic: Localized fields take priority
      // We merge specific fields to avoid overwriting updated English metadata (prices, legalities usually better in EN)
      const merged = {
        ...enCard,
        name: locCard.name || enCard.name,
        name_en: enCard.name, // Preserve English name for links
        description: locCard.description || enCard.description,
        flavorText: locCard.flavorText || enCard.flavorText,
        rules: locCard.rules || enCard.rules,
        category: locCard.category || enCard.category,
        stage: locCard.stage || enCard.stage,
        suffix: locCard.suffix || enCard.suffix,
      };

      // Merge attacks if available
      if (locCard.attacks && enCard.attacks) {
        merged.attacks = enCard.attacks.map((enAtk, idx) => {
          const locAtk = locCard.attacks[idx];
          if (!locAtk) return enAtk;
          return {
            ...enAtk,
            name: locAtk.name || enAtk.name,
            effect: locAtk.effect || enAtk.effect,
            description: locAtk.description || enAtk.description,
          };
        });
      } else if (locCard.attacks) {
        merged.attacks = locCard.attacks;
      }

      // Merge abilities
      if (locCard.abilities && enCard.abilities) {
        merged.abilities = enCard.abilities.map((enAb, idx) => {
          const locAb = locCard.abilities[idx];
          if (!locAb) return enAb;
          return {
            ...enAb,
            name: locAb.name || enAb.name,
            effect: locAb.effect || enAb.effect,
          };
        });
      } else if (locCard.abilities) {
        merged.abilities = locCard.abilities;
      }

      return merged;
    },

    /**
     * Get a card image Blob
     * @param {string} id Card ID
     * @returns {Promise<Blob|null>}
     */
    getCardImage: async function (id) {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([IMAGES_STORE], "readonly");
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e);
      });
    },
  };

  // Global export
  window.CardStorage = CardStorage;
})();
