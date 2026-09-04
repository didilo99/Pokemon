/**
 * Pokémon TCG Section Logic
 */

/*
  =============================================================================
  CARTAS TCG (TRADING CARD GAME)
  Si necesitas modificar cuántas cartas por página se muestran por defecto, 
  puedes cambiar la variable CARDS_PER_PAGE.
  =============================================================================
*/
const PROXY_URL = (window.I18n ? I18n.getBasePath() : "") + "proxy.php";
let CARDS_PER_PAGE = 60;

let currentPage = 1;
let totalCards = 0;

const TCG_STORAGE_KEY = "tcg_filters_v1";

let currentCardsList = [];
let allSyncedCards = []; // Cache for all cards from DB
let allFilteredIds = []; // NEW: Cache for all matching IDs across pages
let currentCardIndex = -1;
let isFetching = false;

// Filter Data Cache
let allSets = [];

// TCG Type Configuration (Icons & Colors)
const TCG_TYPE_CONFIG = {
  fire: { color: "#ef5350", icon: "fire" },
  water: { color: "#42a5f5", icon: "water" },
  grass: { color: "#66bb6a", icon: "grass" },
  lightning: { color: "#ffeb3b", icon: "electric" },
  psychic: { color: "#ab47bc", icon: "psychic" },
  fighting: { color: "#ffa726", icon: "fighting" },
  darkness: { color: "#5c6bc0", icon: "dark" },
  metal: { color: "#78909c", icon: "steel" },
  dragon: { color: "#d4af37", icon: "dragon" },
  fairy: { color: "#ec407a", icon: "fairy" },
  colorless: { color: "#e0e0e4", icon: "normal" },
  stellar: { color: "#ffffff", icon: "stellar" },
};

// DOM Elements
const cardGrid = document.getElementById("cardGrid");
const pageInfo = document.getElementById("pageInfo");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const perPageSelect = document.getElementById("perPage");

// Filter DOM Elements
const filterName = document.getElementById("filterName");
const filterSeries = document.getElementById("filterSeries");
const filterSet = document.getElementById("filterSet");
const filterRarity = document.getElementById("filterRarity");
const filterSupertype = document.getElementById("filterSupertype");
const filterSubtype = document.getElementById("filterSubtype");
const filterType = document.getElementById("filterType");
const filterHp = document.getElementById("filterHp");
const filterStage = document.getElementById("filterStage");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const filterSort = document.getElementById("filterSort");
const filterPocket = document.getElementById("filterPocket");

const zoomOverlay = document.getElementById("zoomOverlay");
const zoomedImage = document.getElementById("zoomedImage");
const modalCardImage = document.getElementById("modalCardImage");

const cardModal = document.getElementById("cardModal");
const closeCardModal = document.getElementById("closeCardModal");
const prevCardBtn = document.getElementById("prevCard");
const nextCardBtn = document.getElementById("nextCard");

/**
 * Initialize the page
 */
async function init() {
  if (
    !window.I18n ||
    !I18n.translations ||
    !I18n.translations[I18n.currentLang]
  ) {
    await new Promise((resolve) => {
      window.addEventListener("languageChanged", resolve, { once: true });
      // Fallback in case event already fired or never fires
      setTimeout(() => {
        if (
          window.I18n &&
          I18n.translations &&
          I18n.translations[I18n.currentLang]
        )
          resolve();
      }, 500);
    });
  }

  setupEventListeners();

  // Initialize Filters first, then fetch cards
  await initFilters();

  // Initial fetch
  fetchAndRenderCards().then(() => {
    checkUrlForCard();
  });
}

/**
 * Initialize Filters (Fetch Metadata)
 */
async function initFilters() {
  try {
    // 2. Fetch Rarities
    let rarities = await window.fetchCached(`${PROXY_URL}?endpoint=rarities&lang=en`);
    if (rarities) {
      // Sort alphabetically by localized name
      rarities.sort((a, b) => {
        const nameA = I18n.t(`tcg.rarities.${a.toLowerCase()}`) || a;
        const nameB = I18n.t(`tcg.rarities.${b.toLowerCase()}`) || b;
        return nameA.localeCompare(nameB);
      });
      populateDropdownSimple(
        filterRarity,
        rarities,
        "tcg.all_rarities",
        "tcg.rarities.",
      );
    }

    // 2.5 Fetch Categories (Supertypes) and Suffixes (Subtypes)
    try {
      let cat = await window.fetchCached(`${PROXY_URL}?endpoint=categories&lang=en`);
      if (cat) {
        cat.sort((a, b) => a.localeCompare(b));
        populateDropdownSimple(filterSupertype, cat, "tcg.all_supertypes", "");
      }

      let suf = await window.fetchCached(`${PROXY_URL}?endpoint=suffixes&lang=en`);
      if (suf) {
        suf.sort((a, b) => a.localeCompare(b));
        populateDropdownSimple(filterSubtype, suf, "tcg.all_subtypes", "");
      }
    } catch (e) {}

    // 3. Fetch Types (Always in English for internal ID consistency)
    let types = await window.fetchCached(`${PROXY_URL}?endpoint=types&lang=en`);
    if (types) {
      // Sort alphabetically by localized name (using current lang for sort order)
      types.sort((a, b) => {
        const nameA = I18n.t(`tcg.types.${a.toLowerCase()}`) || a;
        const nameB = I18n.t(`tcg.types.${b.toLowerCase()}`) || b;
        return nameA.localeCompare(nameB);
      });
      populateTypeChips(types);
      updateTypeChipsUI(filterType.value);
    }

    // 4. Fetch All Sets (Try DB First)
    if (allSets.length === 0) {
      try {
        // Try local storage first
        const localSets = await CardStorage.getAllSets(I18n.currentLang);
        if (localSets && localSets.length > 0) {
          allSets = localSets;
        } else {
          // Fallback to API if sync never ran
          let setsRes = await window.fetchCached(
            `${PROXY_URL}?endpoint=sets&lang=${I18n.currentLang}`,
          );
          if (setsRes) {
            allSets = setsRes;
          }
        }
      } catch (e) {}

      // Sort sets by releaseDate (newest first)
      allSets.sort((a, b) => {
        const dateA = a.releaseDate || "1900-01-01";
        const dateB = b.releaseDate || "1900-01-01";
        return dateB.localeCompare(dateA);
      });
    }

    // Define function to update dropdowns based on pocket filter
    window.updateSeriesAndSetsDropdowns = () => {
      const showPocket = filterPocket.checked;
      
      // Filter sets based on pocket status
      const filteredSets = allSets.filter(s => {
        const sId = s.id || "";
        const rawSeries = s.serie?.name || s.series || (typeof s.serie === "string" ? s.serie : "");
        const sLower = rawSeries.toLowerCase();
        const isPocket = sLower.includes("tcg pocket") || 
                         sLower.includes("pokémon pocket") || 
                         sId.startsWith("a1") || sId.startsWith("a2") || sId.startsWith("p1");
        
        return showPocket ? true : !isPocket;
      });

      // Get unique series from filtered sets
      const uniqueSeries = [
        ...new Set(
          filteredSets
            .map((s) => {
              const raw = s.serie?.name || s.series || (typeof s.serie === "string" ? s.serie : null);
              if (!raw) return null;
              return raw.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            })
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b));

      // Populate Series Dropdown
      const currentSeries = filterSeries.value;
      populateDropdownSimple(filterSeries, uniqueSeries, "tcg.all_series", "");
      if (uniqueSeries.includes(currentSeries)) {
        filterSeries.value = currentSeries;
      } else if (currentSeries) {
        filterSeries.value = ""; // Reset if it was a pocket series and now hidden
      }

      // Populate Set Dropdown
      const currentSet = filterSet.value;
      const seriesValue = filterSeries.value;
      let finalSetsForDropdown = filteredSets;
      if (seriesValue) {
        finalSetsForDropdown = filteredSets.filter((s) => {
          const sName = s.serie?.name || s.series || (typeof s.serie === "string" ? s.serie : null);
          return sName && sName.toLowerCase() === seriesValue.toLowerCase();
        });
      }
      
      filterSet.disabled = false;
      populateSetDropdown(filterSet, finalSetsForDropdown, "tcg.all_sets");
      
      const opt = filterSet.querySelector(`option[value="${currentSet}"]`);
      if (opt) filterSet.value = currentSet;
      else if (currentSet) filterSet.value = "";
    };

    updateSeriesAndSetsDropdowns();

    // 5. Restore Filters (URL -> LocalStorage -> Groups)
    const params = new URLSearchParams(window.location.search);
    const storedFilters = loadSavedFilters();

    // Helper to determine value: URL > Storage > Default ""
    // Helper to determine value: URL > Storage > Default ""
    const getValue = (key) => {
      if (params.has(key)) return params.get(key);
      if (storedFilters && storedFilters[key] !== undefined)
        return storedFilters[key];
      return "";
    };

    const pocketVal = getValue("pocket");
    if (pocketVal !== "" && pocketVal !== null) {
      filterPocket.checked = pocketVal === "true" || pocketVal === true;
    } else {
      filterPocket.checked = true; // Default
    }

    // Now populate dropdowns based on pocket setting
    if (window.updateSeriesAndSetsDropdowns) updateSeriesAndSetsDropdowns();

    filterName.value = getValue("name");
    filterSeries.value = getValue("series");

    // Re-update dropdowns if a series was selected to show correct sets
    if (filterSeries.value && window.updateSeriesAndSetsDropdowns) updateSeriesAndSetsDropdowns();

    const setValue = getValue("set");
    if (setValue) {
      const opt = filterSet.querySelector(`option[value="${setValue}"]`);
      if (opt) filterSet.value = setValue;
    }

    filterRarity.value = getValue("rarity");
    filterSupertype.value = getValue("supertype");
    filterSubtype.value = getValue("subtype");
    filterType.value = getValue("type");
    updateTypeChipsUI(filterType.value);

    filterHp.value = getValue("hp");
    filterStage.value = getValue("stage");
    filterSort.value = getValue("sort") || "name_asc";

    currentPage = Number(getValue("page")) || 1;

    if (getValue("perPage")) {
      perPageSelect.value = getValue("perPage");
      CARDS_PER_PAGE = parseInt(perPageSelect.value);
    }

    saveFilters();
  } catch (e) {}
}

function loadSavedFilters() {
  try {
    const raw = localStorage.getItem(TCG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveFilters() {
  const filters = {
    series: filterSeries.value,
    set: filterSet.value,
    rarity: filterRarity.value,
    supertype: filterSupertype.value,
    subtype: filterSubtype.value,
    type: filterType.value,
    hp: filterHp.value,
    stage: filterStage.value,
    sort: filterSort.value,
    pocket: filterPocket.checked,
    perPage: perPageSelect.value,
    page: currentPage,
  };
  localStorage.setItem(TCG_STORAGE_KEY, JSON.stringify(filters));
  updateFiltersCount();
}

/**
 * Count active filters and update the badge
 */
function updateFiltersCount() {
  let count = 0;
  if (filterName && filterName.value.trim()) count++;
  if (filterSeries && filterSeries.value) count++;
  if (filterSet && filterSet.value) count++;
  if (filterRarity && filterRarity.value) count++;
  if (filterSupertype && filterSupertype.value) count++;
  if (filterSubtype && filterSubtype.value) count++;
  if (filterType && filterType.value) count++;
  if (filterHp && filterHp.value) count++;
  if (filterStage && filterStage.value) count++;
  // Note: sort is not counted as a filter

  const badge = document.getElementById("filtersCount");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

function populateDropdown(select, items, textKey, valueKey, defaultLabelI18n) {
  const label = I18n.t(defaultLabelI18n) || "All";
  select.innerHTML = `<option value="">${label}</option>`;
  if (!items) return;

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = item[textKey];
    select.appendChild(option);
  });
}

/**
 * Populate set dropdown with release year
 */
function populateSetDropdown(select, sets, defaultLabelI18n) {
  const label = I18n.t(defaultLabelI18n) || "All";
  select.innerHTML = `<option value="">${label}</option>`;
  if (!sets) return;

  // Sets should already be sorted (newest first)
  sets.forEach((set) => {
    const option = document.createElement("option");
    option.value = set.id;
    // Extract year from releaseDate (format: YYYY-MM-DD)
    const year = set.releaseDate ? set.releaseDate.substring(0, 4) : "";
    option.textContent = year ? `${set.name} (${year})` : set.name;
    select.appendChild(option);
  });
}

function populateDropdownSimple(
  select,
  items,
  defaultLabelI18n,
  prefix = "tcg.types.",
) {
  const label = I18n.t(defaultLabelI18n) || "All";
  select.innerHTML = `<option value="">${label}</option>`;
  if (!items) return;

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    const cleanItem = item.trim().toLowerCase();
    const translationKey = `${prefix}${cleanItem}`;
    const translated = I18n.t(translationKey);
    // If translation key is returned (meaning translation not found), use original item
    option.textContent = translated !== translationKey ? translated : item;
    select.appendChild(option);
  });
}

function populateTypeChips(types) {
  const container = document.getElementById("typeChips");
  const input = document.getElementById("filterType");
  if (!container) return;

  container.innerHTML = "";

  types.forEach((type) => {
    const cleanType = type.trim().toLowerCase();
    const config = TCG_TYPE_CONFIG[cleanType] || {
      color: "var(--c-text-muted)",
      icon: "normal",
    };
    const localizedKey = `tcg.types.${cleanType}`;
    const localizedName = I18n.t(localizedKey);
    const displayName = localizedName !== localizedKey ? localizedName : type;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `type-chip type-${config.icon}`;
    btn.dataset.value = type;

    // Use svgType for consistency (uses gen8 pokesprite icons internally)
    btn.innerHTML = `${svgType(config.icon)}<span>${displayName}</span><span class="type-chip-count">-</span>`;

    if (window.CardStorage) {
      window.CardStorage.getCards({ type: type, pocket: true }, "en", 1, 1).then(res => {
         const countEl = btn.querySelector('.type-chip-count');
         if (countEl) countEl.textContent = res.total;
      }).catch(() => {});
    }

    btn.onclick = () => {
      const currentVal = input.value;
      if (currentVal === type) {
        input.value = ""; // Deselect if already selected
      } else {
        input.value = type;
      }
      updateTypeChipsUI(input.value);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    container.appendChild(btn);
  });
}

function updateTypeChipsUI(val) {
  const container = document.getElementById("typeChips");
  if (!container) return;

  container.querySelectorAll(".type-chip").forEach((btn) => {
    if (btn.dataset.value === val) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

async function checkUrlForCard() {
  const params = new URLSearchParams(window.location.search);
  const cardId = params.get("card");

  if (cardId) {
    // 1. Try to find in loaded synced list (fastest)
    let card = currentCardsList.find((c) => c.id === cardId);

    // 2. If not found, fetch from API
    if (!card) {
      try {
        const url = `${PROXY_URL}?endpoint=cardDetail&id=${encodeURIComponent(cardId)}`;
        const response = await fetch(url);
        if (response.ok) {
          card = await response.json();
        }
      } catch (e) {}
    }

    if (card) {
      if (!currentCardsList.some((c) => c.id === card.id)) {
        currentCardsList.push(card);
      }
      showCardDetail(card);
    } else {
    }
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Pagination
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      // Update URL for persistence
      const params = new URLSearchParams(window.location.search);
      params.set("page", currentPage);
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${params.toString()}`,
      );
      saveFilters();
      fetchAndRenderCards();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  nextBtn.addEventListener("click", () => {
    currentPage++;
    // Update URL for persistence
    const params = new URLSearchParams(window.location.search);
    params.set("page", currentPage);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
    saveFilters();
    fetchAndRenderCards();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  perPageSelect.addEventListener("change", () => {
    CARDS_PER_PAGE = parseInt(perPageSelect.value);
    currentPage = 1;
    saveFilters();
    fetchAndRenderCards();
  });

  window.addEventListener("languageChanged", async () => {
    // Re-translate static UI elements (search placeholder, sort options, etc.)
    I18n.applyTranslations();

    // Preserve current page
    const oldPage = currentPage;

    // Clear cached sets to force re-fetch of localized names/series
    allSets = [];

    // Re-populate static dropdowns and refetch data
    await initFilters();

    // Refresh Grid (preserving page if possible)
    await fetchAndRenderCards();

    // 3. If modal is open, re-render it to update localized text
    if (cardModal && cardModal.open) {
      if (currentCardsList && currentCardIndex >= 0) {
        const card = currentCardsList[currentCardIndex];
        if (card) showCardDetail(card);
      }
    }

    updatePaginationUI();
  });

  // Filter Event Listeners
  const handleFilterChange = () => {
    currentPage = 1;

    // Update URL for persistence
    const params = new URLSearchParams(window.location.search);

    // Set or delete params based on values
    if (filterName.value) params.set("name", filterName.value);
    else params.delete("name");
    if (filterSeries.value) params.set("series", filterSeries.value);
    else params.delete("series");
    if (filterSet.value) params.set("set", filterSet.value);
    else params.delete("set");
    if (filterRarity.value) params.set("rarity", filterRarity.value);
    else params.delete("rarity");

    if (filterSupertype.value) params.set("supertype", filterSupertype.value);
    else params.delete("supertype");

    if (filterSubtype.value) params.set("subtype", filterSubtype.value);
    else params.delete("subtype");

    if (filterType.value) params.set("type", filterType.value);
    else params.delete("type");
    if (filterHp.value) params.set("hp", filterHp.value);
    else params.delete("hp");
    if (filterSort.value) params.set("sort", filterSort.value);
    else params.delete("sort");

    params.set("pocket", filterPocket.checked);
    params.set("page", currentPage);

    // Update URL without reloading
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`,
    );

    saveFilters(); // Save to localStorage

    fetchAndRenderCards();
  };

  filterName.addEventListener("input", debounce(handleFilterChange, 500));
  filterSeries.addEventListener("change", () => {
    if (window.updateSeriesAndSetsDropdowns) updateSeriesAndSetsDropdowns();
    handleFilterChange();
  });

  filterPocket.addEventListener("change", () => {
    if (window.updateSeriesAndSetsDropdowns) updateSeriesAndSetsDropdowns();
    handleFilterChange();
  });
  filterSet.addEventListener("change", handleFilterChange);
  filterRarity.addEventListener("change", handleFilterChange);
  filterSupertype.addEventListener("change", handleFilterChange);
  filterSubtype.addEventListener("change", handleFilterChange);
  filterType.addEventListener("change", handleFilterChange);
  filterHp.addEventListener("input", debounce(handleFilterChange, 500));
  filterStage.addEventListener("change", handleFilterChange);
  filterSort.addEventListener("change", handleFilterChange);

  clearFiltersBtn.addEventListener("click", () => {
    filterName.value = "";
    filterSeries.value = "";
    filterSet.value = "";
    filterRarity.value = "";
    filterSupertype.value = "";
    filterSubtype.value = "";
    filterType.value = "";
    filterHp.value = "";
    filterStage.value = "";
    if (filterSort) filterSort.value = "name_asc";
    if (filterPocket) filterPocket.checked = true; // Reset pocket to default

    // Reset dropdowns based on pocket default (true)
    if (window.updateSeriesAndSetsDropdowns) updateSeriesAndSetsDropdowns();

    // Reset type chips
    updateTypeChipsUI("");

    saveFilters(); // Save empty state

    currentPage = 1;
    fetchAndRenderCards();
  });

  // Modal Navigation
  prevCardBtn.addEventListener("click", () => navigateCard(-1));
  nextCardBtn.addEventListener("click", () => navigateCard(1));

  // Modal Closures
  if (closeCardModal) {
    closeCardModal.addEventListener("click", () => {
      cardModal.close();
      const url = new URL(window.location);
      url.searchParams.delete("card");
      window.history.pushState({}, "", url);
    });
  }
  if (cardModal) {
    cardModal.addEventListener("click", (e) => {
      if (e.target === cardModal) {
        cardModal.close();
        const url = new URL(window.location);
        url.searchParams.delete("card");
        window.history.pushState({}, "", url);
      }
    });
    cardModal.addEventListener("close", () => I18n.clearModalTitle());
  }

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (!cardModal.open) return;
    if (e.key === "ArrowLeft") navigateCard(-1);
    if (e.key === "ArrowRight") navigateCard(1);
    if (e.key === "Escape") cardModal.close();
  });

  // Swipe navigation for card modal
  if (window.SwipeDetector && cardModal) {
    new SwipeDetector(cardModal, {
      left: () => navigateCard(1),
      right: () => navigateCard(-1),
    });
  }
  cardModal.addEventListener("click", (e) => {
    if (e.target === cardModal) cardModal.close();
  });

  // Card Zoom logic
  if (modalCardImage) {
    modalCardImage.addEventListener("click", () => {
      const largeSrc =
        modalCardImage.getAttribute("data-large") || modalCardImage.src;

      // Update Zoom Image
      zoomedImage.src = largeSrc;
      delete zoomedImage.dataset.fallbackApplied;
      zoomedImage.onerror = null;

      // Sync Classes (Fall back to default if no modal classes found)
      const modalContainer = document.querySelector(
        ".card-hero .card-holo-container",
      );
      const rarityClasses = modalContainer
        ? modalContainer.getAttribute("data-rarity-classes")
        : "rarify-satin";

      const zoomContainer = zoomOverlay.querySelector(".card-holo-container");
      if (zoomContainer) {
        zoomContainer.className = `card-holo-container ${rarityClasses}`;
        zoomContainer.style.transform = "";
        zoomContainer.classList.add("card-idle-tilt");
      }

      zoomOverlay.showModal();
    });
  }

  if (zoomOverlay) {
    zoomOverlay.addEventListener("click", (e) => {
      if (e.target === zoomOverlay) zoomOverlay.close();
    });

    // Unified 3D Tilt Logic for Zoom Overlay
    zoomOverlay.addEventListener("mousemove", (e) => {
      // Re-fetch/Sync rarity classes from modal container
      const modalContainer = document.querySelector(
        ".card-hero .card-holo-container",
      );
      const rarityClasses = modalContainer
        ? modalContainer.getAttribute("data-rarity-classes")
        : "rarify-satin";

      const zoomContainer = zoomOverlay.querySelector(".card-holo-container");
      if (zoomContainer) {
        zoomContainer.className = `card-holo-container ${rarityClasses}`;
        zoomContainer.classList.remove("card-idle-tilt");

        const rect = zoomOverlay.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // More aggressive rotation for impact
        const rotateX = ((centerY - y) / centerY) * 15;
        const rotateY = ((x - centerX) / centerX) * 15;

        zoomContainer.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        const holoEffect = zoomContainer.querySelector(".holo-effect");
        if (holoEffect) {
          // Precise relative calculation for the shine
          const relX = (x / rect.width) * 100;
          const relY = (y / rect.height) * 100;
          holoEffect.style.setProperty("--mx", `${relX}%`);
          holoEffect.style.setProperty("--my", `${relY}%`);
        }

        // Handle reset to idle if mouse stops moving
        clearTimeout(zoomOverlay.tiltTimeout);
        zoomOverlay.tiltTimeout = setTimeout(() => {
          zoomContainer.classList.add("card-idle-tilt");
          zoomContainer.style.transform = "";
        }, 3000);
      }
    });

    zoomOverlay.addEventListener("mouseleave", () => {
      const zoomContainer = zoomOverlay.querySelector(".card-holo-container");
      if (zoomContainer) {
        zoomContainer.classList.add("card-idle-tilt");
        zoomContainer.style.transform = "";
        const holo = zoomContainer.querySelector(".holo-effect");
        if (holo) {
          holo.style.setProperty("--mx", "50%");
          holo.style.setProperty("--my", "50%");
        }
      }
    });
  }

  // Escape key for zoom overlay
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && zoomOverlay.open) {
      zoomOverlay.close();
      e.stopPropagation();
    }
  });

  // Card Interaction logic (Container-Level Delegation)
  const heroContainer = document.querySelector(".card-hero");
  if (heroContainer) {
    heroContainer.addEventListener("mousemove", (e) => {
      const holoContainer = heroContainer.querySelector(".card-holo-container");
      const parallaxImg = heroContainer.querySelector(".card-parallax-img");
      const holoEffect = heroContainer.querySelector(".holo-effect");

      if (!holoContainer) return;

      holoContainer.classList.remove("card-idle-tilt");
      const rect = heroContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((centerY - y) / centerY) * 10; 
      const rotateY = ((x - centerX) / centerX) * 10;
      const shadowX = (centerX - x) / 10;
      const shadowY = (centerY - y) / 10;
      const pxX = ((x - centerX) / centerX) * 5; 
      const pxY = ((y - centerY) / centerY) * 5;

      holoContainer.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      holoContainer.style.setProperty(
        "--card-shadow",
        `${shadowX}px ${shadowY}px 40px rgba(0,0,0,0.6)`,
      );

      if (parallaxImg) {
        parallaxImg.style.transform = `translateZ(1px) translateX(${pxX}px) translateY(${pxY}px)`;
      }

      if (holoEffect) {
        const cardRect = holoContainer.getBoundingClientRect();
        const relX = ((e.clientX - cardRect.left) / cardRect.width) * 100;
        const relY = ((e.clientY - cardRect.top) / cardRect.height) * 100;
        holoEffect.style.setProperty("--mx", `${relX}%`);
        holoEffect.style.setProperty("--my", `${relY}%`);
      }

      clearTimeout(heroContainer.tiltTimeout);
      heroContainer.tiltTimeout = setTimeout(() => {
        holoContainer.classList.add("card-idle-tilt");
        holoContainer.style.transform = "";
        if (parallaxImg) parallaxImg.style.transform = "translateZ(1px)";
      }, 3000);
    });

    heroContainer.addEventListener("mouseleave", () => {
      const holoContainer = heroContainer.querySelector(".card-holo-container");
      if (holoContainer) {
        holoContainer.classList.add("card-idle-tilt");
        holoContainer.style.transform = "";
        const holo = holoContainer.querySelector(".holo-effect");
        const parallaxImg = holoContainer.querySelector(".card-parallax-img");
        if (holo) {
          holo.style.setProperty("--mx", "50%");
          holo.style.setProperty("--my", "50%");
        }
        if (parallaxImg) parallaxImg.style.transform = "translateZ(1px)";
      }
    });
  }

  // Sync API Button
  const syncBtn = document.getElementById("syncApiBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      // Disable button
      syncBtn.disabled = true;
      syncCards(syncBtn);
    });
  } else {
  }
}

/**
 * Sync all cards from API to IndexedDB
 */
/**
 * Sync all cards from API to IndexedDB
 */
async function syncCards(btnElement) {
  const statusEl = document.getElementById("syncStatus");
  const originalText = btnElement.innerText;

  // Progress bar elements
  const progressContainer = document.getElementById("syncProgressContainer");
  const progressBar = document.getElementById("syncProgressBar");
  const progressLabel = document.getElementById("syncProgressLabel");
  const progressPercent = document.getElementById("syncProgressPercent");

  // Show progress bar
  if (progressContainer) progressContainer.style.display = "block";

  const SUPPORTED_LANGS = ["en", "es", "fr", "de", "it", "pt", "ja", "zh-tw"];
  const LANG_NAMES = {
    en: "English",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    it: "Italiano",
    pt: "Português",
    ja: "日本語",
    "zh-tw": "中文",
  };

  let totalLangs = SUPPORTED_LANGS.length;
  let currentLangIdx = 0;

  // Initialize progress
  if (progressBar) progressBar.style.width = "0%";
  if (progressPercent) progressPercent.textContent = "0%";

  for (const lang of SUPPORTED_LANGS) {
    currentLangIdx++;
    const langName = LANG_NAMES[lang] || lang.toUpperCase();
    const langProgressPrefix = I18n.t(
      "tcg.errors.sync_lang_progress",
      langName,
      currentLangIdx,
      totalLangs,
    );

    // Helper to update global progress
    const updateGlobalProgress = (internalStepPercent) => {
      const globalPercent = Math.round(
        ((currentLangIdx - 1) / totalLangs) * 100 +
          internalStepPercent / totalLangs,
      );
      if (progressBar) progressBar.style.width = `${globalPercent}%`;
      if (progressPercent) progressPercent.textContent = `${globalPercent}%`;
    };

    let syncDetailedSets = [];

    const updateStatus = (msgKey, ...args) => {
      let msg = I18n.t(msgKey, ...args);
      // Fallback for new keys if not yet loaded in current session I18n
      if (msg === msgKey) {
        const fallbacks = {
          "tcg.errors.sync_sets": "Analizando Expansiones...",
          "tcg.errors.sync_list": "Obteniendo lista de cartas...",
          "tcg.errors.sync_details": "Sincronizando detalles: {0}/{1}",
        };
        msg = fallbacks[msgKey] || msgKey;
        if (args.length > 0) {
          args.forEach((arg, i) => (msg = msg.replace(`{${i}}`, arg)));
        }
      }
      const fullMsg = `${langProgressPrefix} ${msg}`;
      if (progressLabel) progressLabel.textContent = fullMsg;
    };

    if (statusEl) statusEl.textContent = I18n.t("missing.sincronizando") || "Sincronizando...";
    updateStatus("tcg.sync_initializing");
    updateGlobalProgress(0);

    try {
      // PHASE 0: Fetch Full Details for Sets
      updateStatus("tcg.errors.sync_sets");
      const setsResp = await fetch(`${PROXY_URL}?endpoint=sets&lang=${lang}`);
      if (setsResp.ok) {
        const setsList = await setsResp.json();
        const totalSets = setsList.length;
        let setsSynced = 0;
        const SET_BATCH_SIZE = 15;

        for (let i = 0; i < totalSets; i += SET_BATCH_SIZE) {
          const batch = setsList.slice(i, i + SET_BATCH_SIZE);
          const promises = batch.map(async (s) => {
            try {
              const detailResp = await fetch(
                `${PROXY_URL}?endpoint=set&id=${encodeURIComponent(s.id)}&lang=${lang}`,
              );
              if (detailResp.ok) return await detailResp.json();
            } catch (e) {}
            return s;
          });

          const results = await Promise.all(promises);
          syncDetailedSets = syncDetailedSets.concat(results);
          setsSynced += results.length;

          const internalPercent = Math.round((setsSynced / totalSets) * 10); // Phase 0 is 10% of lang sync
          updateGlobalProgress(internalPercent);
        }
        await CardStorage.saveSetsBatch(syncDetailedSets, lang);
      }

    // PHASE 1: Fetch all card summaries
      let page = 1;
      let keepFetching = true;
      let allCardSummaries = [];
      const syncPageSize = 100; // Reduced from 250 to 100 to prevent API timeouts during Phase 1

      updateStatus("tcg.errors.sync_list");

      while (keepFetching) {
        const url = `${PROXY_URL}?endpoint=cards&page=${page}&pageSize=${syncPageSize}&lang=${lang}`;
        let response = null;
        let fetchSuccess = false;
        let retries = 3;
        
        while (retries > 0 && !fetchSuccess) {
            try {
                response = await fetch(url);
                if (!response.ok) throw new Error(`Status ${response.status}`);
                fetchSuccess = true;
            } catch (rErr) {
                retries--;
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    throw new Error(`Sync Fetch Error for ${lang} at page ${page}: ` + rErr.message);
                }
            }
        }
        
        const cards = await response.json();
        if (cards && cards.length > 0) {
          allCardSummaries = allCardSummaries.concat(cards);
          page++;
          if (cards.length < syncPageSize) keepFetching = false;
        } else {
          keepFetching = false;
        }
        updateGlobalProgress(15); // Phase 1 is up to 15% of lang sync
      }

      // PHASE 2: Fetch full details
      const totalCardsLang = allCardSummaries.length;
      let synced = 0;
      const BATCH_SIZE = 500;

      const setDateMap = new Map();
      const setSeriesMap = new Map();
      syncDetailedSets.forEach((s) => {
        if (s.id) {
          if (s.releaseDate) setDateMap.set(s.id, s.releaseDate);
          const sName =
            s.serie?.name ||
            s.series ||
            (typeof s.serie === "string" ? s.serie : null);
          if (sName) setSeriesMap.set(s.id, sName);
        }
      });

      for (let i = 0; i < allCardSummaries.length; i += BATCH_SIZE) {
        const batch = allCardSummaries.slice(i, i + BATCH_SIZE);
        const detailPromises = batch.map(async (summary) => {
          try {
            const detailUrl = `${PROXY_URL}?endpoint=cardDetail&id=${encodeURIComponent(summary.id)}&lang=${lang}`;
            const resp = await fetch(detailUrl);
            if (resp.ok) {
              const card = await resp.json();
              if (card.set && card.set.id) {
                if (!card.set.releaseDate) {
                  const rDate = setDateMap.get(card.set.id);
                  if (rDate) card.set.releaseDate = rDate;
                }
                if (!card.set.series) {
                  const seriesObj = setSeriesMap.get(card.set.id);
                  if (seriesObj) card.set.series = seriesObj;
                }
              }
              return card;
            }
          } catch (e) {}
          return summary;
        });

        const detailedCards = await Promise.all(detailPromises);
        await CardStorage.saveCardsBatch(detailedCards, lang);
        synced += detailedCards.length;

        updateStatus("tcg.errors.sync_details", synced, totalCardsLang);

        // Phase 2 is 15% to 100% of lang sync
        const internalPercent = 15 + Math.round((synced / totalCardsLang) * 85);
        updateGlobalProgress(internalPercent);

        // Add a small delay between batches to be polite to the local server
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch (e) {
      console.error(`Sync error for ${lang}:`, e);
    }
  }

  try {
    await CardStorage.saveMetadata({
      lastSync: new Date().toISOString(),
    });

    const completeMsg = I18n.t("tcg.sync_complete") || "¡Completado!";
    if (progressLabel) progressLabel.textContent = completeMsg;
    if (statusEl) statusEl.textContent = completeMsg;
    btnElement.textContent = completeMsg;
    if (progressBar) progressBar.style.width = "100%";
    if (progressPercent) progressPercent.textContent = "100%";

    fetchAndRenderCards();
  } catch (e) {
    if (statusEl) statusEl.textContent = I18n.t("tcg.sync_error");
  } finally {
    btnElement.disabled = false;
    setTimeout(() => {
      if (progressContainer) progressContainer.style.display = "none";
      btnElement.innerText = originalText;
    }, 3000);
  }
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Fetch Cards (Local DB Only)
 */
async function fetchAndRenderCards() {
  if (isFetching) return;
  isFetching = true;

  showLoading();
  if (cardGrid) cardGrid.classList.add("pager-transitioning");
  cardGrid.innerHTML = "";
  pageInfo.textContent = "";

  try {
    // 1. Check if DB has data for CURRENT language
    const hasData = await CardStorage.hasSavedData(I18n.currentLang);
    if (!hasData) {
      cardGrid.innerHTML = `
            <div class="col-12 text-center mt-5">
                <h3 class="text-warning">${I18n.t("tcg.empty_db_title")}</h3>
                <p>${I18n.t("tcg.empty_db_message")}</p>
            </div>
        `;
      pageInfo.textContent = "- / -";
      prevBtn.disabled = true;
      nextBtn.disabled = true;

      // Check Metadata for last sync time
      const meta = await CardStorage.loadMetadata();
      const lastSync =
        meta && meta.lastSync
          ? new Date(meta.lastSync).toLocaleString()
          : I18n.t("tcg.time_never");
      const syncStatus = document.getElementById("syncStatus");
      if (syncStatus)
        syncStatus.textContent = I18n.t("tcg.last_updated", lastSync);

      return;
    }

    // 2. Build Filters
    const filters = {
      name: filterName.value,
      series: filterSeries.value,
      set: filterSet.value,
      rarity: filterRarity.value,
      type: filterType.value,
      supertype: filterSupertype.value,
      subtype: filterSubtype.value,
      hp: filterHp.value,
      stage: filterStage.value,
      sort: filterSort ? filterSort.value : "name_asc",
      pocket: filterPocket.checked,
    };

    // 3. Query DB
    const { cards, total, allIds } = await CardStorage.getCards(
      filters,
      I18n.currentLang,
      currentPage,
      CARDS_PER_PAGE,
    );

    totalCards = total;
    allFilteredIds = allIds || []; // Cache the full list for modal navigation
    const totalPages = Math.ceil(totalCards / CARDS_PER_PAGE);

    // 4. Render
    if (cards.length === 0) {
      cardGrid.innerHTML = `<div class="col-12 text-center text-muted p-5">
        <h4>${I18n.t("filters.no_results_title") || "No results"}</h4>
        <p>${I18n.t("filters.no_results_desc") || "Try clearing filters."}</p>
      </div>`;
      pageInfo.textContent = `Page ${currentPage} / ${totalPages || 1}`;
    } else {
      currentCardsList = cards; // Cache for modal navigation
      const fragment = document.createDocumentFragment();
      cards.forEach((card, index) => {
        const cardEl = createCardElement(card);
        // Add click event for modal
        cardEl.addEventListener("click", () => {
          // Find global index in allFilteredIds
          const globalIdx = allFilteredIds.indexOf(card.id);
          showCardDetail(card, globalIdx);
        });
        fragment.appendChild(cardEl);
      });
      cardGrid.appendChild(fragment);

      setTimeout(() => {
        if (cardGrid) cardGrid.classList.remove("pager-transitioning");
      }, 200);

      pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;

      // Update Sync Status Text with Last Updated time
      const meta = await CardStorage.loadMetadata();
      const lastSync =
        meta && meta.lastSync
          ? new Date(meta.lastSync).toLocaleString()
          : I18n.t("tcg.time_never");
      const syncStatus = document.getElementById("syncStatus");
      if (syncStatus && !syncStatus.textContent.includes("...")) {
        syncStatus.textContent = I18n.t("tcg.last_updated", lastSync);
      }
    }

    // 5. Update Pagination Buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
    if (cardGrid) cardGrid.classList.remove("pager-transitioning");
  } catch (error) {
    cardGrid.innerHTML = `<div class="col-12 text-danger text-center">Error loading cards from database.</div>`;
  } finally {
    isFetching = false;
  }
}

function showGenericError() {
  cardGrid.innerHTML = `
    <div class="error-container w-100">
      <div class="error-title">${I18n.t("tcg.errors.connection")}</div>
      <div class="error-text">${I18n.t("tcg.errors.fetch_failed")}</div>
    </div>
  `;
}

/**
 * Render card list to the grid
 */
function renderCards(cards) {
  cardGrid.innerHTML = "";
  currentCardsList = cards;

  cards.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = "tcg-card";

    // Add type class for border color
    if (card.types && card.types.length > 0) {
      const typeKey = card.types[0].toLowerCase();
      cardEl.classList.add(`type-${typeKey}`);
    }

    let displayName = I18n.toTitle(card.name);
    // REST API image construction
    const smallImage = card.image
      ? `${card.image}/low.png`
      : (window.I18n ? I18n.getBasePath() : "") +
        "assets/img/fallback/fallback.png";

    cardEl.innerHTML = `
      <img src="${smallImage}" alt="${displayName}" loading="lazy" onerror="this.onerror=null; this.src=(window.I18n ? window.I18n.getBasePath() : '') + 'assets/img/fallback/fallback.png';">
      <div class="card-name">${displayName}</div>
      <div class="card-meta">${card.id}</div>
    `;

    cardEl.addEventListener("click", () => {
      currentCardIndex = currentCardsList.indexOf(card);
      showCardDetail(card);
    });
    cardGrid.appendChild(cardEl);
  });
}

/**
 * Create DOM Element for a Card
 * @param {Object} card
 * @returns {HTMLElement}
 */
function createCardElement(card) {
  const cardEl = document.createElement("div");
  cardEl.className = "tcg-card grid-item-enter";

  // Add type class for border color
  if (card.types && card.types.length > 0) {
    const typeKey = card.types[0].toLowerCase();
    cardEl.classList.add(`type-${typeKey}`);
  }

  // Rarity Glow in Grid
  const rarity = (card.rarity || "").toLowerCase();
  const subtypes = (card.subtypes || []).map((s) => s.toLowerCase());
  if (
    rarity.includes("rare") ||
    rarity.includes("holo") ||
    rarity.includes("secret") ||
    rarity.includes("promo") ||
    rarity.includes("hyper") ||
    subtypes.includes("v") ||
    subtypes.includes("ex") ||
    subtypes.includes("gx") ||
    subtypes.includes("vmax") ||
    subtypes.includes("vstar")
  ) {
    cardEl.classList.add("rare-glow");
  }

  let displayName = I18n.toTitle(card.name);
  // REST API image construction
  // Check if image exists and if it's a string
  // If card.image is just base path (e.g. ".../1"), append /low.png
  // If it already ends in .png, don't append.
  let smallImage =
    (window.I18n ? I18n.getBasePath() : "") +
    "assets/img/fallback/fallback.png";

  if (card.image) {
    if (card.image.endsWith(".png") || card.image.endsWith(".jpg")) {
      smallImage = card.image;
    } else {
      smallImage = `${card.image}/low.png`;
    }
  }

  cardEl.innerHTML = `
    <img src="${smallImage}" alt="${displayName}" loading="lazy" onerror="this.onerror=null; this.src=(window.I18n ? window.I18n.getBasePath() : '') + 'assets/img/fallback/fallback.png';">
    <div class="card-name">${displayName}</div>
    <div class="card-meta">${card.id}</div>
  `;

  return cardEl;
}

/**
 * Navigate to another card within the modal
 */
function navigateCard(direction) {
  const newIndex = currentCardIndex + direction;
  if (newIndex >= 0 && newIndex < allFilteredIds.length) {
    const nextId = allFilteredIds[newIndex];
    currentCardIndex = newIndex;
    showCardDetail(nextId);
  }
}

/**
 * Show loading state in grid
 */
function showLoading() {
  cardGrid.innerHTML = `<div class="col-12 text-center p-5"><div class="spinner"></div></div>`;
  for (let i = 0; i < 12; i++) {
    const shimmer = document.createElement("div");
    shimmer.className = "tcg-card skeleton";
    shimmer.style.height = "320px";
    cardGrid.appendChild(shimmer);
  }
}

/**
 * Get the type icon URL from Pokesprite
 * @param {string} name
 */
function getPokespriteTypeIcon(name) {
  let type = name.toLowerCase();

  // TCG to Pokesprite mapping
  if (type === "colorless") type = "normal";
  if (type === "lightning") type = "electric";
  if (type === "darkness") type = "dark";
  if (type === "metal") type = "steel";

  // Return the icon URL (same as app.js)
  return `https://raw.githubusercontent.com/msikma/pokesprite/master/misc/types/gen8/${type}.png`;
}

/**
 * Get CSS class and translated name for TCG types
 */
function getTcgTypeInfo(tcgType) {
  const mapping = {
    Colorless: { class: "normal" },
    Darkness: { class: "dark" },
    Dragon: { class: "dragon" },
    Fairy: { class: "fairy" },
    Fighting: { class: "fighting" },
    Fire: { class: "fire" },
    Grass: { class: "grass" },
    Lightning: { class: "electric" },
    Metal: { class: "steel" },
    Psychic: { class: "psychic" },
    Water: { class: "water" },
    Stellar: { class: "stellar" },
  };
  const info = mapping[tcgType] || { class: "normal" };
  return {
    ...info,
    name: I18n.t("tcg.types." + tcgType.toLowerCase()) || tcgType,
  };
}

/**
 * Render an SVG/IMG type icon
 */
function svgType(name) {
  const url = getPokespriteTypeIcon(name);
  return `<img src="${url}" alt="${name}" class="type-icon-inline" width="20" height="20" title="${name}">`;
}

/**
 * Update pagination UI state
 */
function updatePaginationUI(itemsOnPage) {
  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) {
    if (itemsOnPage === 0) {
      pageInfo.textContent = "0 / 0";
    } else {
      pageInfo.textContent = `Página ${currentPage}`;
    }
  }

  prevBtn.disabled = currentPage === 1;
  // If we have less items than PAGE_SIZE, we are at the end
  nextBtn.disabled = itemsOnPage < CARDS_PER_PAGE || itemsOnPage === undefined;
}

/**
 * Show card details in modal
 */
async function showCardDetail(cardOrId) {
  let card = typeof cardOrId === "string" ? null : cardOrId;
  const cardId = typeof cardOrId === "string" ? cardOrId : cardOrId.id;

  // 1. Try to find in local storage FIRST (Language-aware)
  try {
    const localCard = await CardStorage.getCardById(cardId, I18n.currentLang);
    if (localCard) {
      card = localCard;
    }
  } catch (e) {}

  // 2. If not in local storage, fetch from network
  if (!card) {
    try {
      cardModal.showModal();
      // Show spinner or something could go here
      const response = await fetch(
        `${PROXY_URL}?endpoint=cardDetail&id=${encodeURIComponent(cardId)}&lang=${I18n.currentLang}`,
      );
      if (response.ok) {
        card = await response.json();
        // Save to cache for next time
        await CardStorage.saveCardsBatch([card], I18n.currentLang);
      }
    } catch (e) {}
  }

  if (!card) return;

  // Update URL
  const url = new URL(window.location);
  url.searchParams.set("card", card.id);
  window.history.pushState({}, "", url);

  // Update currentCardIndex if not set or mismatched
  if (typeof index === "number") {
    currentCardIndex = index;
  } else {
    // Try to find index in the global list
    currentCardIndex = allFilteredIds.indexOf(card.id);
  }

  // Apply Theme to Modal
  const modalContainer = cardModal.querySelector(".poke-modal");
  // Reset existing themes
  modalContainer.className = "poke-modal";

  // Get type logo container (may not exist if removed from HTML)
  const typeLogoContainer = document.getElementById("modalCardTypeLogo");

  if (card.supertype === "Trainer") {
    modalContainer.classList.add("modal-theme-trainer");
    if (typeLogoContainer) typeLogoContainer.innerHTML = "";
  } else if (card.supertype === "Energy") {
    modalContainer.classList.add("modal-theme-energy");
    if (typeLogoContainer) typeLogoContainer.innerHTML = "";
  } else if (card.types && card.types.length > 0) {
    const primaryType = card.types[0];
    const typeKey = primaryType.toLowerCase();
    modalContainer.classList.add(`modal-theme-${typeKey}`);

    // Inject Large Type Logo below card image (if container exists)
    if (typeLogoContainer) {
      typeLogoContainer.innerHTML = `<img src="${getPokespriteTypeIcon(typeKey)}" alt="${primaryType}" width="64" height="64">`;
    }

    // Inject accent colors directly for shadow/border backup
    try {
      const typeInfo = getTcgTypeInfo(primaryType);
      modalContainer.style.setProperty(
        "--modal-accent",
        `var(--tc-${typeInfo.class})`,
      );
    } catch (e) {}
  }

  // Handle navigation button visibility
  prevCardBtn.style.visibility = currentCardIndex > 0 ? "visible" : "hidden";
  nextCardBtn.style.visibility =
    currentCardIndex < allFilteredIds.length - 1 ? "visible" : "hidden";

  // Clear previous content (with null checks)
  const abilitiesList = document.querySelector(
    "#modalCardAbilities .abilities-list",
  );
  const attacksList = document.querySelector("#modalCardAttacks .attacks-list");
  const rulesList = document.querySelector("#modalCardRules .rules-list");
  const pricesBody = document.getElementById("pricesBody");

  if (abilitiesList) abilitiesList.innerHTML = "";
  if (attacksList) attacksList.innerHTML = "";
  if (rulesList) rulesList.innerHTML = "";
  if (pricesBody) pricesBody.innerHTML = "";

  // 2. Clear previous details to avoid flickering or old data
  document.getElementById("modalCardSet").textContent = "...";
  document.getElementById("modalCardRarity").textContent = "...";
  document.getElementById("modalCardArtist").textContent = "...";

  // Clear lists (with null checks)
  const abilitiesList2 = document.querySelector(
    "#modalCardAbilities .abilities-list",
  );
  const attacksList2 = document.querySelector(
    "#modalCardAttacks .attacks-list",
  );
  const rulesList2 = document.querySelector("#modalCardRules .rules-list");
  const pricesBody2 = document.getElementById("pricesBody");

  if (abilitiesList2) abilitiesList2.innerHTML = "";
  if (attacksList2) attacksList2.innerHTML = "";
  if (rulesList2) rulesList2.innerHTML = "";
  if (pricesBody2) pricesBody2.innerHTML = "";

  // Show Modal
  if (cardModal) cardModal.showModal();

  // 3. Lazy Load Check
  // If card is Pokemon and has no attacks/abilities/weaknesses, it's likely a summary.
  // Trainer/Energy might naturally lack these, so check supertype.
  const isPokemon = card.supertype === "Pokémon" || card.category === "Pokemon";
  const needsFetch =
    isPokemon && !card.attacks && !card.abilities && !card.weaknesses;

  let fullCard = card;

  if (needsFetch) {
    // Show loading in Rules section
    const rulesSection = document.getElementById("modalCardRules");
    rulesSection.style.display = "block";
    rulesSection.querySelector(".rules-list").innerHTML =
      `<div class="text-center p-3"><div class="spinner-border text-primary"></div><div class="small mt-2">${I18n.t("tcg.loading_details") || "Cargando detalles..."}</div></div>`;

    try {
      const fetchedCard = await fetchCardDetail(card.id);
      if (fetchedCard) {
        fullCard = fetchedCard;
        // Save to DB
        await CardStorage.saveCardsBatch([fullCard], I18n.currentLang);
        // Update local cache
        currentCardsList[index] = fullCard;
      }
    } catch (e) {}
  }

  // 4. Render Full Details
  renderCardDetailsToModal(fullCard);

  // 5. Update Visibility of Sections based on content
  const attacksSection = document.getElementById("modalCardAttacks");
  const abilitiesSection = document.getElementById("modalCardAbilities");
  const rulesSection = document.getElementById("modalCardRules");

  if (attacksSection) {
    // Show if there are attacks OR if it's a Trainer/Energy with an effect
    const hasAttacks = fullCard.attacks && fullCard.attacks.length > 0;
    const hasEffect = !!fullCard.effect;
    const hasAbilitiesInAttacks =
      fullCard.abilities && fullCard.abilities.length > 0;

    if (hasAttacks || hasEffect || hasAbilitiesInAttacks) {
      attacksSection.style.display = "block";
    } else {
      attacksSection.style.display = "none";
    }
  }

  if (abilitiesSection) {
    // Note: Our renderAttacksAndRules currently puts abilities in the attacks list
    // so we might not need this section separately unless structure changes.
    // For now, keep it hidden if we use the integrated list.
    abilitiesSection.style.display = "none";
  }

  if (rulesSection) {
    const hasRules = fullCard.rules && fullCard.rules.length > 0;
    rulesSection.style.display = hasRules ? "block" : "none";
  }
}

/**
 * Fetch one card detail from Proxy
 */
async function fetchCardDetail(id, lang = I18n.currentLang) {
  try {
    const response = await fetch(
      `${PROXY_URL}?endpoint=cardDetail&id=${id}&lang=${lang}`,
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
}

/**
 * Render inner details to modal (after data is ready)
 */
function renderCardDetailsToModal(card) {
  // Build image URLs: low for display, high for zoom
  let lowImage =
    (window.I18n ? I18n.getBasePath() : "") +
    "assets/img/fallback/fallback.png";
  let highImage =
    (window.I18n ? I18n.getBasePath() : "") +
    "assets/img/fallback/fallback.png";

  if (card.image) {
    if (card.image.endsWith(".png") || card.image.endsWith(".jpg")) {
      lowImage = card.image;
      highImage = card.image;
    } else {
      lowImage = `${card.image}/low.png`;
      highImage = `${card.image}/high.png`;
    }
  } else if (card.localImage) {
    lowImage = card.localImage;
    highImage = card.localImage;
  } else {
    lowImage =
      (window.I18n ? I18n.getBasePath() : "") + "assets/img/card_back.png";
    highImage =
      (window.I18n ? I18n.getBasePath() : "") + "assets/img/card_back.png";
  }

  // 5. Render Data
  // Image with Holo Effect wrapper
  // Multi-Trait Rarity Detection (29 Tier Hybrid System)
  const rarity = (card.rarity || "").toLowerCase();
  const subtypes = (card.subtypes || []).map((s) => s.toLowerCase());
  const name = (card.name || "").toLowerCase();

  let rarityClasses = [];

  // Group 1: 👑 Rarezas Supremas (Precedence 1)
  if (rarity.includes("classic collection")) {
    rarityClasses.push("rarify-classic-collection");
  } else if (rarity.includes("crown")) {
    rarityClasses.push("rarify-crown");
  } else if (rarity.includes("ace spec")) {
    rarityClasses.push("rarify-ace-spec");
  } else if (rarity.includes("hyper") && (rarity.includes("mega") || subtypes.includes("mega"))) {
    rarityClasses.push("rarify-mega-hyper");
  } else if (rarity.includes("hyper") || rarity.includes("rainbow")) {
    rarityClasses.push("rarify-hyper-rainbow");
  } else if (rarity.includes("secret") && (rarity.includes("gold") || name.includes("gold"))) {
    rarityClasses.push("rarify-secret-gold");
  } else if (rarity.includes("secret")) {
    rarityClasses.push("rarify-secret-gold");
  } 
  // Group 2: ✨ Rarezas de Coleccionista (Precedence 2)
  else if (rarity.includes("amazing") || subtypes.includes("amazing")) {
    rarityClasses.push("rarify-amazing");
  } else if (rarity.includes("special illustration")) {
    rarityClasses.push("rarify-special-illustration");
  } else if (rarity.includes("illustration") || rarity.includes("full art")) {
    rarityClasses.push("rarify-illustration");
  } else if (rarity.includes("ultra rare") && rarity.includes("shiny")) {
    rarityClasses.push("rarify-ultra-rare"); // Mapping to ultra-rare effect
  } else if (rarity.includes("ultra rare")) {
    rarityClasses.push("rarify-ultra-rare");
  } else if (rarity.includes("shiny") && (subtypes.includes("v") || subtypes.includes("vmax") || subtypes.includes("vstar"))) {
    rarityClasses.push("rarify-shiny-v");
  } else if (rarity.includes("shiny") && rarity.includes("double")) {
    rarityClasses.push("rarify-diamond-2-shiny");
  } else if (rarity.includes("shiny")) {
    rarityClasses.push("rarify-shiny");
  } else if (rarity.includes("radiant") || subtypes.includes("radiant")) {
    rarityClasses.push("rarify-radiant");
  }
  // Group 3: ⚔️ Rarezas de Combate (Precedence 3)
  else if (rarity.includes("lv.x") || subtypes.includes("level-up")) {
    rarityClasses.push("rarify-lvx");
  } else if (rarity.includes("bw") || rarity.includes("black & white")) {
    rarityClasses.push("rarify-bw");
  } else if (rarity.includes("prime") || rarity.includes("legend") || subtypes.includes("prime") || subtypes.includes("legend")) {
    rarityClasses.push("rarify-prime-legend");
  } else if (subtypes.includes("vstar")) {
    rarityClasses.push("rarify-rare-holo-vstar");
  } else if (subtypes.includes("vmax")) {
    rarityClasses.push("rarify-rare-holo-vmax");
  } else if (subtypes.includes("v")) {
    rarityClasses.push("rarify-rare-holo-v");
  } else if (rarity.includes("rare holo")) {
    rarityClasses.push("rarify-rare-holo");
  } else if (rarity === "rare") {
    rarityClasses.push("rarify-rare");
  }
  // Group 4: 💎 Rarezas de Rombos y Estrellas Básicas (Precedence 4)
  else if (rarity.includes("three star") || rarity.includes("3 star")) {
    rarityClasses.push("rarify-star-3");
  } else if (rarity.includes("two star") || rarity.includes("2 star")) {
    rarityClasses.push("rarify-star-2");
  } else if (rarity.includes("one star") || rarity.includes("1 star")) {
    rarityClasses.push("rarify-star-1");
  } else if (rarity.includes("four diamond") || rarity.includes("4 diamond")) {
    rarityClasses.push("rarify-diamond-4");
  } else if (rarity.includes("three diamond") || rarity.includes("3 diamond")) {
    rarityClasses.push("rarify-diamond-3");
  } else if (rarity.includes("two diamond") || rarity.includes("2 diamond")) {
    rarityClasses.push("rarify-diamond-2");
  } else if (rarity.includes("one diamond") || rarity.includes("1 diamond") || rarity.includes("uncommon")) {
    rarityClasses.push("rarify-diamond-1");
  } else {
    rarityClasses.push("rarify-satin");
  }

  const rarityClassString = rarityClasses.join(" ");

  const heroContainer = document.querySelector(".card-hero");
  // Apply all trait classes and the common 3D container with inner clipping
  heroContainer.innerHTML = `
      <div class="card-holo-container ${rarityClassString}" data-rarity-classes="${rarityClassString}">
          <div class="card-inner">
              <div class="parallax-wrapper">
                  <img id="modalCardImage" class="card-large-image card-parallax-img" src="${highImage}" alt="${card.name}" data-large="${highImage}">
              </div>
              <div class="holo-effect"></div>
          </div>
      </div>
    `;

  // Set Accent Color based on Type
  if (card.supertype === "Trainer") {
    document
      .querySelector(".poke-modal")
      .style.setProperty("--modal-accent", "var(--tcg-trainer)");
  } else if (card.supertype === "Energy") {
    document
      .querySelector(".poke-modal")
      .style.setProperty("--modal-accent", "var(--tcg-energy)");
  } else if (card.types && card.types.length > 0) {
    const primaryType = card.types[0];
    const typeKey = primaryType.toLowerCase();

    // Set accent
    let colorVar = `var(--tcg-${typeKey})`;
    if (typeKey === "colorless") colorVar = "var(--tcg-colorless)";
    if (typeKey === "darkness") colorVar = "var(--tcg-darkness)";
    if (typeKey === "lightning") colorVar = "var(--tcg-lightning)";
    document
      .querySelector(".poke-modal")
      .style.setProperty("--modal-accent", colorVar);
  } else {
    document
      .querySelector(".poke-modal")
      .style.setProperty("--modal-accent", "#fff");
  }

  document.getElementById("modalCardName").textContent = card.name;
  I18n.setModalTitle(card.name);
  // Set / Number / Rarity
  const setInfo = card.set ? card.set.name || card.set.id : "-";
  document.getElementById("modalCardSet").textContent = setInfo;
  document.getElementById("modalCardSetInfo").textContent =
    `${setInfo} (${card.localId || card.number || "?"}/${card.set?.cardCount?.official || "?"})`;

  document.getElementById("modalCardNumber").textContent =
    `${card.localId}/${card.set ? card.set.cardCount?.official || "?" : "?"}`;

  const rarityTitle = card.rarity || "-";
  const rKey = rarityTitle.trim().toLowerCase();
  document.getElementById("modalCardRarity").textContent =
    I18n.t(`tcg.rarities.${rKey}`) || rarityTitle;

  document.getElementById("modalCardArtist").textContent =
    card.illustrator || "-";

  // Set Icon using set logic
  const setIconImg = document.getElementById("modalCardSetIcon");
  if (card.set && card.set.symbol) {
    setIconImg.src = `${card.set.symbol}.png`;
    setIconImg.style.display = "inline-block";
  } else if (card.set && card.set.logo) {
    setIconImg.src = `${card.set.logo}.png`;
    setIconImg.style.display = "inline-block";
  } else {
    setIconImg.style.display = "none";
  }

  // Holo Badge
  const holoBadge = document.getElementById("modalCardHolo");
  if (card.rarity && card.rarity.toLowerCase().includes("holo")) {
    holoBadge.style.display = "inline-block";
  } else {
    holoBadge.style.display = "none";
  }

  // Types Badges
  const badges = document.getElementById("modalCardBadges");
  badges.innerHTML = "";
  if (card.types) {
    card.types.forEach((type) => {
      const info = getTcgTypeInfo(type);
      const span = document.createElement("span");
      span.className = `type-badge type-${info.class}`;
      span.textContent = info.name;
      badges.appendChild(span);
    });
  }

  // HP Badge (next to name)
  const nameEl = document.getElementById("modalCardName");
  let displayNameHtml = I18n.toTitle(card.name);
  if (card.hp) {
    displayNameHtml += ` <span class="badge bg-danger ms-2" style="color: #fff; -webkit-text-fill-color: #fff; background-clip: border-box; -webkit-background-clip: border-box; box-shadow: 0 0 10px rgba(220, 53, 69, 0.4)">HP ${card.hp}</span>`;
  }
  nameEl.innerHTML = displayNameHtml;

  // Evolution/Stage info
  if (card.evolvesFrom) {
    const stageRow = document.getElementById("modalCardStageRow");
    if (stageRow) {
      stageRow.innerHTML = `
        <span data-i18n="tcg.evolves_from">${I18n.t("tcg.evolves_from")}:</span>
        <span class="fw-bold text-info ms-1">${I18n.toTitle(card.evolvesFrom)}</span>
      `;
    }
  }

  // Render Attacks & Rules normally first
  renderAttacksAndRules(card);

  // --- POPULATE EXISTING HTML ELEMENTS (NO MORE DUPLICATE INJECTION) ---

  // Release Date - Try multiple paths from TCGDex set object
  // Note: card.set only has id, name, logo, symbol, cardCount
  // Full set data (with releaseDate, serie) is in allSets cache
  const setId = card.set?.id;
  const fullSetData = setId ? allSets.find((s) => s.id === setId) : null;

  const releaseEl = document.getElementById("modalCardRelease");
  if (releaseEl) {
    const releaseDate =
      fullSetData?.releaseDate || card.set?.releaseDate || null;
    if (releaseDate) {
      try {
        const date = new Date(releaseDate);
        releaseEl.textContent = date.toLocaleDateString();
      } catch (e) {
        releaseEl.textContent = releaseDate;
      }
    } else {
      releaseEl.textContent = "-";
    }
  }

  // Series - Standardized extraction
  const seriesEl = document.getElementById("modalCardSeries");
  if (seriesEl) {
    const seriesName =
      fullSetData?.serie?.name ||
      fullSetData?.series ||
      (typeof fullSetData?.serie === "string" ? fullSetData.serie : null);
    seriesEl.textContent = seriesName || "-";
  }

  // Stage
  const stageEl = document.getElementById("modalCardStageInfo");
  if (stageEl) {
    stageEl.textContent = card.stage || card.subtypes?.join(", ") || "-";
  }

  // Regulation Mark & Legality
  const regMarkEl = document.getElementById("modalCardRegMark");
  const legalEl = document.getElementById("modalCardLegal");
  if (regMarkEl) {
    regMarkEl.textContent = card.regulationMark || "-";
  }
  if (legalEl) {
    if (card.legal?.standard) {
      legalEl.textContent = I18n.t("tcg.legal_standard") || "Standard";
      legalEl.classList.remove("bg-danger");
      legalEl.classList.add("bg-success");
    } else if (card.legal?.expanded) {
      legalEl.textContent = I18n.t("tcg.legal_expanded") || "Expanded";
      legalEl.classList.remove("bg-success");
      legalEl.classList.add("bg-warning");
    } else {
      legalEl.textContent = "-";
      legalEl.classList.remove("bg-success", "bg-warning");
      legalEl.classList.add("bg-secondary");
    }
  }

  // Battle Stats - Populate existing elements
  const weaknessEl = document.getElementById("modalCardWeakness");
  const resistanceEl = document.getElementById("modalCardResistance");
  const retreatEl = document.getElementById("modalCardRetreat");

  if (weaknessEl) {
    if (card.weaknesses && card.weaknesses.length > 0) {
      let weaknessHtml = card.weaknesses
        .map(
          (w) =>
            `<div class="d-flex align-items-center gap-1">${getTcgTypeIconHtml(w.type)} <span class="ms-1" style="font-size: 0.8rem">(${w.value || ""})</span></div>`,
        )
        .join("");
      weaknessEl.innerHTML = `<div class="d-flex gap-2">${weaknessHtml}</div>`;
    } else {
      weaknessEl.textContent = "-";
    }
  }

  if (resistanceEl) {
    if (card.resistances && card.resistances.length > 0) {
      let resistanceHtml = card.resistances
        .map(
          (r) =>
            `<div class="d-flex align-items-center gap-1">${getTcgTypeIconHtml(r.type)} <span class="ms-1" style="font-size: 0.8rem">(${r.value || ""})</span></div>`,
        )
        .join("");
      resistanceEl.innerHTML = `<div class="d-flex gap-2">${resistanceHtml}</div>`;
    } else {
      resistanceEl.textContent = "-";
    }
  }

  if (retreatEl) {
    if (typeof card.retreat === "number" && card.retreat > 0) {
      let retreatIcons = "";
      for (let i = 0; i < card.retreat; i++) {
        retreatIcons += getTcgTypeIconHtml("Colorless");
      }
      retreatEl.innerHTML = `<div class="d-flex gap-1">${retreatIcons} <span class="ms-1" style="font-size: 0.8rem">(${card.retreat})</span></div>`;
    } else if (card.retreat === 0) {
      retreatEl.textContent = "0";
    } else {
      retreatEl.textContent = "-";
    }
  }

  // Variants - Populate existing element
  const variantsListEl = document.getElementById("modalCardVariantsList");
  if (variantsListEl) {
    variantsListEl.innerHTML = "";
    if (card.variants) {
      Object.entries(card.variants).forEach(([k, v]) => {
        if (v) {
          const badge = document.createElement("span");
          badge.className = "badge bg-secondary";
          const vKey = k.toLowerCase().replace(/\s+/g, "");
          badge.textContent =
            I18n.t(`tcg.variant_names.${vKey}`) || I18n.toTitle(k);
          variantsListEl.appendChild(badge);
        }
      });
    }
    if (variantsListEl.innerHTML === "") {
      variantsListEl.innerHTML = '<span class="text-muted">-</span>';
    }
  }

  // Prices - Populate existing elements
  // TCGDex uses card.pricing.cardmarket and card.pricing.tcgplayer
  const cmLow = document.getElementById("cmLow");
  const cmAvg = document.getElementById("cmAvg");
  const cmTrend = document.getElementById("cmTrend");
  const tcgLow = document.getElementById("tcgLow");
  const tcgMarket = document.getElementById("tcgMarket");
  const tcgHigh = document.getElementById("tcgHigh");

  // TCGDex pricing structure: card.pricing.cardmarket or card.pricing.tcgplayer
  const pricing = card.pricing || {};
  const cmPrices = pricing.cardmarket || card.cardmarket?.prices || null;
  const tcgPrices = pricing.tcgplayer || card.tcgplayer?.prices || null;

  if (cmPrices) {
    // TCGDex fields: low, avg, trend OR lowPrice, averageSellPrice, trendPrice
    if (cmLow)
      cmLow.textContent =
        cmPrices.low || cmPrices.lowPrice
          ? `€${cmPrices.low || cmPrices.lowPrice}`
          : "-";
    if (cmAvg)
      cmAvg.textContent =
        cmPrices.avg || cmPrices.averageSellPrice
          ? `€${cmPrices.avg || cmPrices.averageSellPrice}`
          : "-";
    if (cmTrend)
      cmTrend.textContent =
        cmPrices.trend || cmPrices.trendPrice
          ? `€${cmPrices.trend || cmPrices.trendPrice}`
          : "-";
  } else {
    if (cmLow) cmLow.textContent = "-";
    if (cmAvg) cmAvg.textContent = "-";
    if (cmTrend) cmTrend.textContent = "-";
  }

  if (tcgPrices) {
    // TCGDex fields: low, market, high OR for nested: prices.normal.low, etc.
    // Check if it has nested price types (like normal, holofoil)
    let priceData = tcgPrices;
    if (!tcgPrices.low && !tcgPrices.market) {
      // Nested structure, get first available type
      const priceType = Object.keys(tcgPrices)[0];
      priceData = tcgPrices[priceType] || {};
    }
    if (tcgLow) tcgLow.textContent = priceData.low ? `$${priceData.low}` : "-";
    if (tcgMarket)
      tcgMarket.textContent =
        priceData.market || priceData.mid
          ? `$${priceData.market || priceData.mid}`
          : "-";
    if (tcgHigh)
      tcgHigh.textContent = priceData.high ? `$${priceData.high}` : "-";
  } else {
    if (tcgLow) tcgLow.textContent = "-";
    if (tcgMarket) tcgMarket.textContent = "-";
    if (tcgHigh) tcgHigh.textContent = "-";
  }

  // Check Pokedex Link visibility
  const pokedexBtn = document.getElementById("viewInPokedex");
  if (card.supertype !== "Pokémon" && !card.types) {
    pokedexBtn.style.display = "none";
  } else {
    pokedexBtn.style.display = "inline-block";
    updatePokedexLink(pokedexBtn, card.name_en || card.name);
  }

  // Handle Card Zoom (Re-bind because heroContainer was replaced)
  const modalImg = heroContainer.querySelector("#modalCardImage");
  if (modalImg) {
    const highImgSrc = modalImg.dataset.large || modalImg.src;
    modalImg.addEventListener("click", () => {
      const modalHolo = heroContainer.querySelector(".card-holo-container");
      const rarityTraits = modalHolo
        ? modalHolo.getAttribute("data-rarity-classes")
        : "rarify-satin";

      // Update Zoom Image
      const zoomImg = document.getElementById("zoomedImage");
      if (zoomImg) {
        zoomImg.src = highImgSrc;
        delete zoomImg.dataset.fallbackApplied;
        zoomImg.onerror = null;
      }

      // Sync Classes and State
      const zoomContainer = document.querySelector(
        "#zoomOverlay .card-holo-container",
      );
      if (zoomContainer) {
        zoomContainer.className = `card-holo-container ${rarityTraits}`;
        zoomContainer.style.transform = "";
        zoomContainer.classList.add("card-idle-tilt");
      }

      const zoomOverlayModal = document.getElementById("zoomOverlay");
      if (zoomOverlayModal) zoomOverlayModal.showModal();
    });
  }
}

function getTcgTypeIconHtml(type) {
  let t = type;
  if (t === "Colorless") t = "Normal";
  const icon = getPokespriteTypeIcon(t.toLowerCase());
  return `<img src="${icon}" width="16" height="16" class="type-icon-inline" style="vertical-align:text-bottom;">`;
}

function renderAttacksAndRules(card) {
  const attacksList = document.querySelector("#modalCardAttacks .attacks-list");
  const rulesList = document.querySelector("#modalCardRules .rules-list");

  // Safety check if elements exist
  if (!attacksList || !rulesList) return;

  attacksList.innerHTML = "";
  rulesList.innerHTML = "";

  // 1. Render Effects (Global description for Trainers/Energy/Some Pokémon)
  if (card.effect) {
    const effectEl = document.createElement("div");
    effectEl.className = "effect-item mb-3";
    effectEl.style.borderLeft = "4px solid var(--modal-accent)";
    effectEl.style.backgroundColor = "rgba(255,255,255,0.08)";
    effectEl.style.borderRadius = "0.5rem";
    effectEl.style.padding = "0.75rem 1rem";
    effectEl.innerHTML = `
      <div class="effect-text" style="line-height: 1.5; color: rgba(255,255,255,0.95)">
        ${card.effect.replace(/\n/g, "<br>")}
      </div>
    `;
    attacksList.appendChild(effectEl);
  }

  // 2. Render Abilities
  if (card.abilities) {
    card.abilities.forEach((ab) => {
      const el = document.createElement("div");
      el.className = "ability-item mb-3 p-2 rounded";
      el.style.backgroundColor = "rgba(255, 53, 69, 0.1)";
      el.innerHTML = `
            <div class="ability-header d-flex justify-content-between align-items-center mb-1">
                <div class="ability-name text-danger fw-bold">
                    <small class="text-white-50 text-uppercase" style="font-size: 0.65rem; display: block;">${I18n.t("tcg.ability") || "Ability"}</small>
                    ${ab.name}  
                </div>
                <span class="badge bg-danger shadow-sm">${ab.type || I18n.t("tcg.ability")}</span>
            </div>
            <div class="ability-text small" style="color: rgba(255,255,255,0.9); line-height: 1.4">${ab.effect || ""}</div>
          `;
      attacksList.appendChild(el);
    });
  }

  // 3. Render Attacks
  if (card.attacks) {
    card.attacks.forEach((atk) => {
      const el = document.createElement("div");
      el.className = "attack-item mb-3 p-2 rounded";
      el.style.backgroundColor = "rgba(255,255,255,0.05)";

      let costs = "";
      if (atk.cost) {
        costs = atk.cost.map((c) => getTcgTypeIconHtml(c)).join("");
      }

      // TCGDex uses 'effect' for the description, but 'text' might exist in some cards
      const attackDescription = atk.effect || atk.text || "";

      el.innerHTML = `
        <div class="attack-header d-flex justify-content-between align-items-center">
            <div class="costs d-flex align-items-center gap-1">
              ${costs} 
              <span class="attack-name ms-2 fw-bold text-white" style="font-size: 1.1rem">${atk.name}</span>
            </div>
            <div class="attack-damage fw-bold text-warning" style="font-size: 1.3rem">${atk.damage || ""}</div>
        </div>
        ${attackDescription ? `<div class="attack-text mt-2 small" style="line-height: 1.4; color: rgba(255,255,255,0.85); border-top: 1px solid rgba(255,255,255,0.1); pt-2">${attackDescription}</div>` : ""}
      `;
      attacksList.appendChild(el);
    });
  }

  // 4. Render Rules
  if (card.rules) {
    card.rules.forEach((r) => {
      const d = document.createElement("div");
      d.className = "alert alert-warning small py-2 mb-2 shadow-sm";
      d.style.backgroundColor = "rgba(255, 193, 7, 0.15)";
      d.style.color = "#ffc107";
      d.style.border = "1px solid rgba(255, 193, 7, 0.3)";
      d.textContent = r;
      rulesList.appendChild(d);
    });
  }
}

function updatePokedexLink(btn, cardName) {
  if (!cardName) return;
  let name = cardName.toLowerCase();

  // 1. Detect Special States
  const isMega = name.startsWith("m ") || name.includes("mega");
  const isPrimal = name.includes("primal");

  // 2. Identify Regional Suffix
  let regionSuffix = "";
  const regionalForms = {
    alolan: "-alola",
    galarian: "-galar",
    hisuian: "-hisui",
    paldean: "-paldea",
  };
  for (const [prefix, pSuffix] of Object.entries(regionalForms)) {
    if (name.includes(prefix)) regionSuffix = pSuffix;
  }

  // 3. Identify X/Y Variants
  let variantSuffix = "";
  if (name.includes(" x") || name.endsWith("-x")) variantSuffix = "-x";
  if (name.includes(" y") || name.endsWith("-y")) variantSuffix = "-y";

  // 4. Clean base name
  let cleanBaseName = name
    .replace(/^m\s+/g, "") // Remove "M " prefix
    .replace(/mega|primal|alolan|galarian|hisuian|paldean/g, "") // Remove descriptors
    .replace(/-ex\b|-gx\b|-v\b|-vmax\b|-vstar\b/g, "") // Remove TCG types
    .replace(/\(.*\)/g, "") // Remove (Delta Species), (A), etc.
    .replace(/\b[xy]\b/g, "") // Remove standalone X or Y
    .trim()
    .split(" ")[0]
    .split("-")[0]; // Also split by dash for cases like "Ho-Oh"

  // Ho-Oh and Porygon-Z fixes
  if (cleanBaseName === "ho") cleanBaseName = "ho-oh";
  if (cleanBaseName === "porygon") {
    if (name.includes("porygon-z")) cleanBaseName = "porygon-z";
    else if (name.includes("porygon2")) cleanBaseName = "porygon2";
  }

  let finalSlug = cleanBaseName + regionSuffix;
  if (isMega) finalSlug += "-mega";
  if (isPrimal) finalSlug += "-primal";
  finalSlug += variantSuffix;

  btn.href = `${I18n.getBasePath()}index.html#pokemon/${finalSlug}`;
  btn.target = "_blank";
}

// Start the app
init();
