(() => {
  const API = "https://pokeapi.co/api/v2";

  // Image paths: Local only
  const bp = window.I18n ? I18n.getBasePath() : "";
  const GLOBAL_MAP_LOCAL = bp + "assets/img/global/300px-PokemonWorldAnime.png";
  const FALLBACK_IMG = bp + "assets/img/fallback/fallback.png";

  // Local region maps
  const REGION_IMG_LOCAL = {
    kanto: bp + "assets/img/regions/300px-PE_Kanto_Map.png",
    johto: bp + "assets/img/regions/300px-JohtoMap.png",
    hoenn: bp + "assets/img/regions/300px-Hoenn_ORAS.png",
    sinnoh: bp + "assets/img/regions/300px-Sinnoh_BDSP_artwork.png",
    unova: bp + "assets/img/regions/300px-Unova_B2W2_alt.png",
    kalos: bp + "assets/img/regions/300px-Kalos_alt.png",
    alola: bp + "assets/img/regions/300px-Alola_USUM_artwork.png",
    galar: bp + "assets/img/regions/300px-Galar_artwork.png",
    hisui: bp + "assets/img/regions/300px-Legends_Arceus_Hisui.png",
    paldea: bp + "assets/img/regions/300px-Paldea_artwork.png",
    orre: bp + "assets/img/regions/Orre_Map.png",
  };

  // DOM Elements - moved to init to ensure they exist
  let grid, emptyState, globalMap;
  let modal,
    closeModalBtn,
    modalTitle,
    modalSubtitle,
    modalCover,
    modalLoading,
    modalData,
    locationsList,
    locCount,
    pokedexCount,
    locationSearch,
    locationTypeFilter;

  let ALL_REGIONS = [];
  let CURRENT_LOCATIONS = []; // Store current region's locations

  // Regex for classification
  const RE_CITY = /city|town|village|island|resort|ciudad|pueblo|villa|isla/i;
  const RE_ROUTE = /route|path|road|bridge|way|ruta|camino|puente|via/i;

  // --- Image Helper ---
  function setImg(el, localUrl) {
    el.loading = "lazy";
    el.decoding = "async";
    el.src = localUrl || FALLBACK_IMG;
    el.onerror = () => {
      el.onerror = null;
      el.src = FALLBACK_IMG;
    };
  }

  // Helper to fetch pokemon data (needed for location details)
  async function getPokemon(idOrName) {
    return window.fetchCached(`${API}/pokemon/${idOrName}`);
  }

  // --- Initialization ---
  async function init() {
    try {
      // Initialize DOM Elements
      grid = document.getElementById("regionsGrid");
      emptyState = document.getElementById("regionsEmpty");
      globalMap = document.getElementById("globalMap");

      modal = document.getElementById("regionModal");
      closeModalBtn = document.getElementById("closeModalBtn");
      modalTitle = document.getElementById("modalTitle");
      modalSubtitle = document.getElementById("modalSubtitle");
      modalCover = document.getElementById("modalCover");
      modalLoading = document.getElementById("modalLoading");
      modalData = document.getElementById("modalData");
      locationsList = document.getElementById("locationsList");
      locCount = document.getElementById("locCount");
      pokedexCount = document.getElementById("pokedexCount");
      locationSearch = document.getElementById("locationSearch");
      locationTypeFilter = document.getElementById("locationTypeFilter");

      if (!grid) {
        return;
      }

      // Load World Map
      if (globalMap) setImg(globalMap, GLOBAL_MAP_LOCAL);

      // Fetch Regions
      const res = await window.fetchCached(`${API}/region?limit=50`);
      const data = res;

      ALL_REGIONS = data.results;
      renderGrid(ALL_REGIONS);

      // Modal Close Handlers
      if (closeModalBtn) {
        closeModalBtn.addEventListener("click", closeRegionModal);
      }
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) closeRegionModal();
        });
        modal.addEventListener("cancel", closeRegionModal);
        modal.addEventListener("close", () => I18n.clearModalTitle());
      }

      if (locationSearch) {
        locationSearch.addEventListener("input", filterLocations);
      }
      if (locationTypeFilter) {
        locationTypeFilter.addEventListener("change", filterLocations);
      }
    } catch (error) {
      if (grid)
        grid.innerHTML = `<p class="error">${I18n.t(
          "common.error_loading",
        )}</p>`;
    }

    // Reactivity
    window.addEventListener("languageChanged", () => {
      if (ALL_REGIONS.length > 0) renderGrid(ALL_REGIONS);
    });
  }

  // Set Global Map Hero
  function setGlobalMap() {
    if (globalMap) {
      globalMap.src =
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"; // Placeholder if world map not available
      // Actually use a real map if we have one
      globalMap.src = bp + "assets/img/world-map.jpg"; // Assuming exists or will be provided
      globalMap.onerror = () => {
        globalMap.parentElement.style.display = "none";
      };
    }
  }

  // --- Rendering Grid ---
  function renderGrid(list) {
    if (!grid) return;
    grid.innerHTML = "";

    if (!list || list.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const frag = document.createDocumentFragment();

    list.forEach((r) => {
      const card = document.createElement("div");
      card.className = "region-card-premium";
      card.tabIndex = 0;

      // Media
      const media = document.createElement("div");
      media.className = "region-card-media";
      const img = document.createElement("img");
      img.alt = `Mapa de ${toTitle(r.name)}`;
      setImg(img, REGION_IMG_LOCAL[r.name]);
      media.appendChild(img);

      // Body
      const body = document.createElement("div");
      body.className = "region-card-body";
      body.innerHTML = `
        <h3>${toTitle(r.name)}</h3>
        <div class="view-details" data-i18n="common.view_details">${I18n.t(
          "common.view_details",
        )}</div>
      `;

      // Click Handler
      card.addEventListener("click", () => openRegionModal(r));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openRegionModal(r);
        }
      });

      card.appendChild(media);
      card.appendChild(body);
      card.classList.add("grid-item-enter");
      frag.appendChild(card);
    });

    grid.appendChild(frag);
  }

  // --- Modal Logic ---

  async function openRegionModal(regionBasic) {
    // 1. Show Modal & Loading State
    modal.showModal();
    modalLoading.hidden = false;
    modalData.hidden = true;

    modalLoading.hidden = false;
    modalData.hidden = true;

    // Set Header Info immediately
    modalTitle.textContent = toTitle(regionBasic.name);
    I18n.setModalTitle(modalTitle.textContent);
    modalSubtitle.textContent =
      I18n.t("regions.loading_subtitle") || "Generación...";

    // Set Background Map
    const headerCol = document.getElementById("modalHeaderCol");
    const localImg = REGION_IMG_LOCAL[regionBasic.name];

    // Try local, then fallback
    const imgUrl = (await checkImage(localImg)) ? localImg : FALLBACK_IMG;
    headerCol.style.backgroundImage = `url('${imgUrl}')`;
    headerCol.style.imageRendering = "pixelated";

    // 2. Fetch Region Details
    try {
      const regionData = await window.fetchCached(regionBasic.url);

      // Update Header with Generation
      if (regionData.main_generation) {
        modalSubtitle.textContent = toTitle(regionData.main_generation.name);
      } else {
        modalSubtitle.textContent =
          I18n.t("regions.default_region") || "Región Principal";
      }

      // Update Stats
      locCount.textContent = regionData.locations.length;
      pokedexCount.textContent = regionData.pokedexes.length;

      // Store locations
      CURRENT_LOCATIONS = regionData.locations;
      renderLocations(CURRENT_LOCATIONS);

      // Show data
      modalLoading.hidden = true;
      modalData.hidden = false;
    } catch (error) {
      modalTitle.textContent = "Error";
      modalSubtitle.textContent = I18n.t("common.error_loading");
      modalLoading.hidden = true;
    }
  }

  async function checkImage(url) {
    if (!url) return false;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  function closeRegionModal() {
    modal.close();
    locationsList.innerHTML = "";
    modalLoading.hidden = false;
    modalData.hidden = true;
    CURRENT_LOCATIONS = [];
    if (locationSearch) locationSearch.value = "";
    if (locationTypeFilter) locationTypeFilter.value = "all";
    document.getElementById("modalHeaderCol").style.backgroundImage = "none";
  }

  function filterLocations() {
    if (!locationsList) return;
    const q = locationSearch ? locationSearch.value.toLowerCase().trim() : "";
    const type = locationTypeFilter ? locationTypeFilter.value : "all";

    const filtered = CURRENT_LOCATIONS.filter((loc) => {
      const transName = loc._translatedName
        ? loc._translatedName.toLowerCase()
        : "";
      const matchQ =
        loc.name.toLowerCase().includes(q) ||
        toTitle(loc.name).toLowerCase().includes(q) ||
        transName.includes(q);

      let locType = "special";
      if (RE_CITY.test(loc.name)) locType = "city";
      else if (RE_ROUTE.test(loc.name)) locType = "route";

      const matchType = type === "all" || type === locType;

      return matchQ && matchType;
    });

    renderLocations(filtered);
  }

  function renderLocations(locations) {
    locationsList.innerHTML = "";
    const frag = document.createDocumentFragment();

    if (locations.length === 0) {
      locationsList.innerHTML = `<p class="empty-msg" data-i18n="common.no_results">${I18n.t(
        "common.no_results",
      )}</p>`;
      return;
    }

    // Limit visible locations to prevent infinite loading of massive lists
    const visible = locations.slice(0, 50);

    visible.forEach((loc) => {
      const item = document.createElement("div");
      item.className = "loc-item-premium";
      item.dataset.url = loc.url;

      const name = toTitle(loc.name);
      let typeKey = "special";
      if (RE_CITY.test(loc.name)) typeKey = "city";
      else if (RE_ROUTE.test(loc.name)) typeKey = "route";

      const typeLabel = I18n.t(`regions.${typeKey}`);

      item.innerHTML = `
        <div class="loc-header">
          <div class="loc-info">
            <div class="loc-name">${name}</div>
            <span class="loc-badge">${typeLabel}</span>
          </div>
          <div class="loc-toggle">
            <span class="pokemon-count">...</span>
          </div>
        </div>
        <div class="loc-details">
           <div class="loading-mini">
             <div class="spinner-small"></div>
           </div>
           <div class="pokemon-grid-small"></div>
        </div>
      `;

      frag.appendChild(item);
      // Automatically fetch details
      fetchLocationDetails(item);
    });

    locationsList.appendChild(frag);

    if (locations.length > 50) {
      const more = document.createElement("p");
      more.className = "empty-msg";
      more.textContent =
        I18n.t("regions.more_locations_suffix", locations.length - 50) ||
        `(+${locations.length - 50} lugares más...)`;
      locationsList.appendChild(more);
    }
  }

  async function fetchLocationDetails(item) {
    const url = item.dataset.url;
    const grid = item.querySelector(".pokemon-grid-small");
    const countSpan = item.querySelector(".pokemon-count");
    const loader = item.querySelector(".loading-mini");

    try {
      const data = await window.fetchCached(url);

      // Extract translated name
      const lang = document.documentElement.lang || "es";
      if (data.names && data.names.length > 0) {
        const translated =
          data.names.find((n) => n.language.name === lang) ||
          data.names.find((n) => n.language.name === "en");
        if (translated) {
          const locNameEl = item.querySelector(".loc-name");
          if (locNameEl) locNameEl.textContent = translated.name;

          // Store translated name for filtering
          const locIdx = CURRENT_LOCATIONS.findIndex((l) => l.url === url);
          if (locIdx !== -1) {
            CURRENT_LOCATIONS[locIdx]._translatedName = translated.name;
          }
        }
      }

      const areas = data.areas || [];
      const pokemonSet = new Set();

      // Limit to 5 areas per location to avoid over-fetching
      const areasToFetch = areas.slice(0, 5);

      await Promise.all(
        areasToFetch.map(async (area) => {
          const areaData = await window.fetchCached(area.url);
          areaData.pokemon_encounters.forEach((enc) => {
            const pid = enc.pokemon.url.split("/").filter(Boolean).pop();
            pokemonSet.add(pid);
          });
        }),
      );

      const pokes = Array.from(pokemonSet).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );
      countSpan.textContent = pokes.length;

      if (pokes.length === 0) {
        grid.innerHTML = `<span class="empty-small">${
          I18n.t("regions.wild_encounters_none") || "—"
        }</span>`;
      } else {
        const links = await Promise.all(
          pokes.map(async (pid) => {
            const pokeData = await getPokemon(pid);
            const pokeName = I18n.toTitle(pokeData.name);
            return `<a href="${bp}index.html#pokemon/${pid}" class="poke-mini-link" target="_blank">${pokeName}</a>`;
          }),
        );
        grid.innerHTML = links.join("");
      }
    } catch (err) {
      countSpan.textContent = "!";
      grid.innerHTML = `<span class="error-small">Error</span>`;
    } finally {
      if (loader) loader.hidden = true;
    }
  }

  function toTitle(str) {
    return str
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  init();
})();
