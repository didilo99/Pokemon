// --- Global Image Fallback ---
(function () {
  const isSubPage = window.location.pathname.includes("/pages/");
  const basePath = isSubPage ? "../" : "";
  const FALLBACK = basePath + "assets/img/fallback/fallback.png";
  window.addEventListener(
    "error",
    function (e) {
      const t = e.target;
      if (t && t.tagName === "IMG") {
        // Prevent infinite loops
        if (
          t.dataset.fallbackApplied ||
          (t.src && t.src.indexOf(FALLBACK) !== -1)
        )
          return;

        // --- NEW: TCGDex English Fallback Logic ---
        // If it's a TCGDex asset and NOT already an English one
        if (
          t.src &&
          t.src.includes("assets.tcgdex.net") &&
          !t.src.includes("/en/") &&
          !t.dataset.tcgFallbackTried
        ) {
          t.dataset.tcgFallbackTried = "true";
          // Try replacing the current language code with /en/
          // Typical URL: https://assets.tcgdex.net/es/set/swsh1/logo.png
          // Supporting all TCGDex languages: en, es, fr, de, it, pt, ja, zh, zh-tw
          const newSrc = t.src.replace(
            /\/(zh-tw|es|fr|de|it|pt|ja|zh)\//,
            "/en/",
          );
          if (newSrc !== t.src) {
            console.log(`TCG Fallback: ${t.src} -> ${newSrc}`);
            t.src = newSrc;
            return; // Don't apply generic fallback yet
          }
        }

        t.dataset.fallbackApplied = "true";
        t.removeAttribute("onerror"); // Remove attribute if it exists
        t.onerror = null; // Clear property if it exists
        t.classList.remove("skeleton"); // Ensure no stuck loading states
        t.src = FALLBACK;
      }
    },
    true,
  );
})();

const I18n = {
  isSubPage: window.location.pathname.includes("/pages/"),
  getBasePath() {
    return this.isSubPage ? "../" : "";
  },
  translations: {},
  currentModalTitle: null,
  basePageTitle: "",
  fallbackImage:
    (window.location.pathname.includes("/pages/") ? "../" : "") +
    "assets/img/fallback/fallback.png",

  updateBrowserTitle() {
    const titleEl = document.querySelector("title");
    if (!titleEl) return;

    if (!this.basePageTitle) {
      const key = titleEl.getAttribute("data-i18n");
      if (key) {
        this.basePageTitle = this.t(key);
      } else {
        this.basePageTitle = titleEl.textContent;
      }
    }

    if (this.currentModalTitle) {
      document.title = `${this.basePageTitle} - ${this.currentModalTitle}`;
    } else {
      document.title = this.basePageTitle;
    }
  },

  setModalTitle(title) {
    this.currentModalTitle = title;
    this.updateBrowserTitle();
  },

  clearModalTitle() {
    this.currentModalTitle = null;
    this.updateBrowserTitle();
  },

  currentLang: (function () {
    let lang = localStorage.getItem("pokedex_lang") || "es";
    if (lang === "zh") lang = "zh-tw"; // Normalize to zh-tw
    return lang;
  })(),

  async init() {
    const bp = this.getBasePath();
    // Load all translations
    try {
      const [es, en, fr, de, it, pt, ja, zhtw] = await Promise.all([
        fetch(`${bp}assets/i18n/es.json`).then((r) => r.json()),
        fetch(`${bp}assets/i18n/en.json`).then((r) => r.json()),
        fetch(`${bp}assets/i18n/fr.json`).then((r) => r.json()),
        fetch(`${bp}assets/i18n/de.json`).then((r) => r.json()),
        fetch(`${bp}assets/i18n/it.json`).then((r) => r.json()),
        fetch(`${bp}assets/i18n/pt.json`).then((r) => r.json()),
        fetch(`${bp}assets/i18n/ja.json`).then((r) => r.json()),
        fetch(`${bp}assets/i18n/zh.json`).then((r) => r.json()),
      ]);

      this.translations = { es, en, fr, de, it, pt, ja, "zh-tw": zhtw };

      // Initialize dropdown logic
      document.querySelectorAll("[data-lang]").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          const lang = e.currentTarget.getAttribute("data-lang");
          this.setLanguage(lang);
        });
      });

      this.applyTranslations();
      this.updateDropdownUI();

      // Load footer dynamically
      await this.loadFooter();

      // Dispatch event for other components
      window.dispatchEvent(
        new CustomEvent("languageChanged", { detail: this.currentLang }),
      );
    } catch (error) {}
  },

  async loadFooter() {
    const footerPlaceholder = document.getElementById("footer-placeholder");
    if (!footerPlaceholder) return;

    try {
      const bp = this.getBasePath();
      const response = await fetch(`${bp}includes/footer_snippet.html`);
      if (!response.ok) throw new Error("Failed to load footer snippet");
      let html = await response.text();

      // Fix links dynamically based on current location
      if (this.isSubPage) {
        // If on subpage, prefix "pages/" links with "../" and handle index.html
        html = html.replace(/href="pages\//g, 'href="');
        html = html.replace(/href="index\.html"/g, 'href="../index.html"');
      } else {
        // If on index.html, "pages/" links are already correct, but index.html should remain index.html
        // (No changes needed as they are now root-relative in footer_snippet.html)
      }

      footerPlaceholder.innerHTML = html;

      // Special case: cards.html and tcg-sets.html don't need the DB sync section
      if (
        window.location.pathname.includes("cards.html") ||
        window.location.pathname.includes("tcg-sets.html")
      ) {
        const statsSection = footerPlaceholder.querySelector(".footer-stats");
        if (statsSection) statsSection.remove();
      }

      // Re-apply translations for the newly loaded footer
      this.applyTranslations();

      // Initialize footer logic (sync buttons, etc.) from cache.js
      if (window.initFooterLogic) {
        window.initFooterLogic();
      }

      // Render Lucide icons in the newly loaded footer
      if (typeof lucide !== "undefined") lucide.createIcons();
    } catch (error) {
      console.error("Error loading footer:", error);
    }
  },

  setLanguage(lang) {
    if (lang === "zh") lang = "zh-tw";
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    localStorage.setItem("pokedex_lang", lang);
    this.applyTranslations();
    this.updateDropdownUI();
    window.dispatchEvent(new CustomEvent("languageChanged", { detail: lang }));
  },

  updateDropdownUI() {
    const flagImg = document.getElementById("currentFlag");
    const langLabel = document.getElementById("currentLangLabel");

    // Map lang code to file name and label
    const map = {
      es: { file: "espana.png", label: "ES" },
      en: { file: "reino-unido.png", label: "EN" },
      fr: { file: "francia.png", label: "FR" },
      de: { file: "alemania.png", label: "DE" },
      it: { file: "italia.png", label: "IT" },
      pt: { file: "portugal.png", label: "PT" },
      ja: { file: "japon.png", label: "JA" },
      "zh-tw": { file: "china.png", label: "ZH" },
    };

    if (flagImg && langLabel && map[this.currentLang]) {
      const bp = this.getBasePath();
      flagImg.src = `${bp}assets/img/flags/${map[this.currentLang].file}`;
      flagImg.alt = map[this.currentLang].label;
      langLabel.textContent = map[this.currentLang].label;
    }
  },

  t(key, ...args) {
    const keys = key.split(".");
    let value = this.translations[this.currentLang];

    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Fallback to key if not found
      }
    }

    // Replace placeholders {0}, {1}, etc.
    if (typeof value === "string") {
      // Auto-replace {year} if present
      if (value.includes("{year}")) {
        const currentYear = new Date().getFullYear();
        value = value.replace(/{year}/g, currentYear);
      }

      if (args.length > 0) {
        args.forEach((arg, i) => {
          value = value.replace(new RegExp(`\\{${i}\\}`, "g"), arg);
        });
      }
    }

    return value;
  },

  getName(obj) {
    if (!obj || !obj.names)
      return obj && obj.name ? this.toTitle(obj.name) : "???";

    // 1. Try exact match
    let entry = obj.names.find((n) => n.language.name === this.currentLang);
    if (entry) return entry.name;

    // 2. Try partial match (e.g. "zh" matches "zh-Hans")
    entry = obj.names.find((n) => n.language.name.startsWith(this.currentLang));
    if (entry) return entry.name;

    // 3. Fallback to English
    entry = obj.names.find((n) => n.language.name === "en");
    if (entry) return entry.name;

    return this.toTitle(obj.name);
  },

  toTitle(s) {
    return s.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  },

  applyTranslations() {
    // 1. TEXT CONTENT (data-i18n)
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const translation = this.t(key);
      if (translation === key) {
      }

      // If it's an input/textarea with a placeholder, we might want to translate that instead of textContent
      // BUT we now have data-i18n-placeholder below. So let's keep data-i18n strictly for text content
      // UNLESS it's an input/textarea, where textContent doesn't make sense.
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        // If user used data-i18n on an input, assume they meant placeholder if no explicit data-i18n-placeholder is present
        if (!el.hasAttribute("data-i18n-placeholder")) {
          el.placeholder = translation;
        }
      } else {
        el.textContent = translation;
      }
    });

    // 2. ATTRIBUTES (data-i18n-attr="key")
    // Helper to apply translation to specific attribute
    const applyAttr = (attrName, dataAttr) => {
      document.querySelectorAll(`[${dataAttr}]`).forEach((el) => {
        const key = el.getAttribute(dataAttr);
        const translation = this.t(key);
        if (translation === key) {
        }
        el.setAttribute(attrName, translation);
      });
    };

    applyAttr("title", "data-i18n-title");
    applyAttr("alt", "data-i18n-alt");
    applyAttr("placeholder", "data-i18n-placeholder");
    applyAttr("aria-label", "data-i18n-aria-label");
    applyAttr("label", "data-i18n-label"); // For optgroups

    // Update HTML lang attribute
    document.documentElement.lang = this.currentLang;

    // Update browser title
    this.basePageTitle = ""; // Reset to force re-evaluation
    this.updateBrowserTitle();
  },
  
  /**
   * Translates a specific element and its children.
   */
  translateElement(root = document) {
    if (!root) return;

    // 1. TEXT CONTENT
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = this.t(key);
    });
    
    // Also check the root itself
    if (root.hasAttribute && root.hasAttribute("data-i18n")) {
      root.textContent = this.t(root.getAttribute("data-i18n"));
    }

    // 2. ATTRIBUTES
    const attrs = [
      { attr: "title", data: "data-i18n-title" },
      { attr: "alt", data: "data-i18n-alt" },
      { attr: "placeholder", data: "data-i18n-placeholder" },
      { attr: "aria-label", data: "data-i18n-aria-label" },
      { attr: "label", data: "data-i18n-label" }
    ];

    attrs.forEach(({ attr, data }) => {
      root.querySelectorAll(`[${data}]`).forEach((el) => {
        el.setAttribute(attr, this.t(el.getAttribute(data)));
      });
      if (root.hasAttribute && root.hasAttribute(data)) {
        root.setAttribute(attr, this.t(root.getAttribute(data)));
      }
    });

    if (root === document) {
       document.documentElement.lang = this.currentLang;
       this.basePageTitle = ""; 
       this.updateBrowserTitle();
    }
  },

  /**
   * Normalizes a string for searching (removes accents, lowercase)
   */
  normalize(str) {
    if (typeof str !== "string") return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  /**
   * Filters a list based on a query using smart weighting.
   * @param {Array} list - List of items to filter
   * @param {string} query - The search query
   * @param {Function} getSearchableFields - Function that returns an array of strings to search for an item
   * @returns {Array} - Filtered and sorted list
   */
  smartSearch(list, query, getSearchableFields) {
    const q = this.normalize(query);
    const qUnspaced = q.replace(/\s/g, "");
    if (!q) return list;

    const results = [];

    for (const item of list) {
      const fields = getSearchableFields(item);
      let maxWeight = 0;

      for (const field of fields) {
        const norm = this.normalize(field);
        const normUnspaced = norm.replace(/\s/g, "");

        // Try matching against original normalized and unspaced version
        const weight = Math.max(
          this.getSearchWeight(norm, q),
          this.getSearchWeight(normUnspaced, qUnspaced) * 0.9, // Slight penalty for unspaced match
        );

        if (weight > maxWeight) maxWeight = weight;
      }

      if (maxWeight > 0) {
        results.push({ item, weight: maxWeight });
      }
    }

    // Sort by weight (descending)
    return results.sort((a, b) => b.weight - a.weight).map((r) => r.item);
  },

  /**
   * Calculates a weight for a match.
   * Exact: 100
   * Starts with: 80
   * Contains: 50
   * Word starts with: 70
   */
  getSearchWeight(text, query) {
    if (text === query) return 100;
    if (text.startsWith(query)) return 80;

    const index = text.indexOf(query);
    if (index === -1) return 0;

    // Check if it starts a new word
    if (index > 0 && (text[index - 1] === " " || text[index - 1] === "-")) {
      return 70;
    }

    return 50;
  },
};

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  I18n.init();

  // Auto-scroll navigation to active link on mobile
  const nav = document.querySelector(".dex-nav");
  const activeLink = nav?.querySelector(".nav-link.active");
  if (nav && activeLink) {
    // Use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      // Calculate scroll position to center the active link
      const scrollLeft =
        activeLink.offsetLeft - navRect.width / 2 + linkRect.width / 2;
      nav.scrollTo({ left: Math.max(0, scrollLeft), behavior: "instant" });
    });
  }
});

// Expose globally
// --- Local Dictionary Caching ---
let localDictsI18n = {
  item: null,
  move: null,
  ability: null,
};

async function fetchI18nDictLocal(type) {
  if (localDictsI18n[type]) return localDictsI18n[type];
  try {
    const bp = I18n.getBasePath();
    const res = await fetch(`${bp}assets/i18n/${type}_names.json`);
    if (res.ok) {
      localDictsI18n[type] = await res.json();
      return localDictsI18n[type];
    }
  } catch (e) {
    console.warn(`Failed to load ${type} dictionary:`, e);
  }
  return null;
}

// --- Global Helper: Get Localized Name from PokeAPI Resource ---
async function getLocalizedName(urlOrResource, resourceType = "ability") {
  try {
    // Determine the resource name
    let resourceName = "";
    if (typeof urlOrResource === "string") {
      const parts = urlOrResource.split("/").filter(Boolean);
      resourceName = parts[parts.length - 1];
    } else if (urlOrResource && urlOrResource.name) {
      resourceName = urlOrResource.name;
    }

    // Try dictionary lookup first for item, move, and ability
    if (
      resourceName &&
      (resourceType === "item" ||
        resourceType === "move" ||
        resourceType === "ability")
    ) {
      const dict = await fetchI18nDictLocal(resourceType);
      if (dict && dict[resourceName]) {
        const langCode = I18n.currentLang || "es";
        if (dict[resourceName][langCode]) {
          return dict[resourceName][langCode];
        }
        if (dict[resourceName]["en"]) {
          return dict[resourceName]["en"];
        }
      }
    }

    // If it's a URL string, fetch the resource
    const resource =
      typeof urlOrResource === "string"
        ? await window.fetchCached(urlOrResource)
        : urlOrResource;

    if (!resource || (!resource.names && !resource.name)) {
      // Fallback: extract name from URL or use resource.name
      if (typeof urlOrResource === "string") {
        const parts = urlOrResource.split("/");
        return I18n.toTitle(parts[parts.length - 2] || "unknown");
      }
      return I18n.toTitle(resource?.name || "unknown");
    }

    // If it's a pokemon, species or form, just use the API name as requested by user
    if (
      resourceType === "pokemon" ||
      resourceType === "pokemon-form" ||
      resourceType === "species"
    ) {
      return I18n.toTitle(resource.name);
    }

    // Try to find translation in current language
    const langCode = I18n.currentLang || "es";

    // Check form_names first if available (specific to forms)
    if (resource.form_names) {
      const localFormName = resource.form_names.find(
        (n) => n.language.name === langCode,
      );
      if (localFormName) return localFormName.name;
    }

    // Check names
    if (resource.names) {
      const localName = resource.names.find(
        (n) => n.language.name === langCode,
      );
      if (localName) return localName.name;
    }

    // Fallback to English
    if (resource.form_names) {
      const enFormName = resource.form_names.find(
        (n) => n.language.name === "en",
      );
      if (enFormName) return enFormName.name;
    }

    if (resource.names) {
      const enName = resource.names.find((n) => n.language.name === "en");
      if (enName) return enName.name;
    }

    // Ultimate fallback to resource name
    return I18n.toTitle(resource.name || "unknown");
  } catch (error) {
    // Extract name from URL as last resort
    if (typeof urlOrResource === "string") {
      const parts = urlOrResource.split("/");
      return I18n.toTitle(parts[parts.length - 2] || "unknown");
    }
    return "Unknown";
  }
}
window.getLocalizedName = getLocalizedName;

// Expose globally
window.I18n = I18n;
