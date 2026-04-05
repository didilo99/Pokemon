(() => {
  const API = "https://pokeapi.co/api/v2";
  const STORAGE_KEY = "pokedex_locations_filters";

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        region: regionFilter.value,
        sort: sortOrderSelect.value,
        perPage: perPageSelect.value,
        page: PAGE,
      }),
    );
  }

  function loadSettings() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) {
      return null;
    }
  }

  // DOM
  const grid = document.getElementById("locationsGrid");
  const empty = document.getElementById("locationsEmpty");
  const search = document.getElementById("searchLocation");
  const regionFilter = document.getElementById("regionFilter");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  const perPageSelect = document.getElementById("perPage");

  const dlg = document.getElementById("locationModal");
  const modalTitle = document.getElementById("modalTitle");

  const kvRegion = document.getElementById("kvRegion");
  const locationAreasList = document.getElementById("locationAreasList");
  const sortOrderSelect = document.getElementById("sortOrder");

  // State
  let ALL_LOCATIONS = [];
  let FILTERED_LOCATIONS = [];
  let DISPLAY_LOCATIONS = [];
  let PAGE = 1;
  let PER_PAGE = 60;

  const REGION_COLORS = {
    kanto: "#ef4444",
    johto: "#eab308",
    hoenn: "#22c55e",
    sinnoh: "#3b82f6",
    unova: "#64748b",
    kalos: "#ec4899",
    alola: "#f97316",
    galar: "#0ea5e9",
    hisui: "#5f9ea0",
    paldea: "#8b5cf6",
    default: "#10b981",
  };

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => {
    if (DISPLAY_LOCATIONS.length > 0) renderCurrentPage();
  });

  async function init() {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--c-text-muted);">${I18n.t(
      "common.loading",
    )}</div>`;

    try {
      const [locRes, regionRes] = await Promise.all([
        window.fetchCached(`${API}/location?limit=1000`), // There are ~850 locations
        window.fetchCached(`${API}/region?limit=20`),
      ]);

      // Regions into Dropdown and build mapping
      const locToRegionMap = {};
      const regionPromises = regionRes.results.map((r) =>
        window.fetchCached(`${API}/region/${r.name}`),
      );
      const regionsDetails = await Promise.all(regionPromises);

      regionFilter.innerHTML = `<option value="" data-i18n="locations.all_regions">${I18n.t("locations.all_regions", "Todas las Regiones")}</option>`;
      regionsDetails.forEach((rd) => {
        // Add to dropdown
        const opt = document.createElement("option");
        opt.value = rd.name;
        opt.textContent = I18n.toTitle(rd.name);
        regionFilter.appendChild(opt);

        // Map locations
        rd.locations.forEach((l) => {
          locToRegionMap[l.name] = rd.name;
        });
      });

      ALL_LOCATIONS = locRes.results.map((r) => {
        const id = parseInt(r.url.split("/").filter(Boolean).pop());
        return {
          ...r,
          id,
          getDisplayName: () => I18n.toTitle(r.name.replace(/-/g, " ")),
          searchText: r.name.replace(/-/g, " "),
          region: locToRegionMap[r.name] || null,
        };
      });
    } catch (e) {
      console.error("Error loading locations", e);
    }

    FILTERED_LOCATIONS = ALL_LOCATIONS;

    // Event Listeners
    search.addEventListener("input", () => {
      PAGE = 1;
      applyFilters();
      saveSettings();
    });

    const saved = loadSettings();
    if (saved && saved.search) search.value = saved.search;
    if (saved && saved.perPage) {
      perPageSelect.value = saved.perPage;
      PER_PAGE = parseInt(saved.perPage);
    }
    if (saved && saved.region) {
      regionFilter.value = saved.region;
    }
    if (saved && saved.sort) {
      sortOrderSelect.value = saved.sort;
    }

    perPageSelect.addEventListener("change", () => {
      PER_PAGE = parseInt(perPageSelect.value);
      PAGE = 1;
      renderCurrentPage();
      saveSettings();
    });

    sortOrderSelect.addEventListener("change", () => {
      applyFilters();
      saveSettings();
    });

    regionFilter.addEventListener("change", async () => {
      const reg = regionFilter.value;
      if (!reg) {
        FILTERED_LOCATIONS = ALL_LOCATIONS;
      } else {
        FILTERED_LOCATIONS = ALL_LOCATIONS.filter((l) => l.region === reg);
      }
      PAGE = 1;
      applyFilters();
      saveSettings();
    });

    if (saved && saved.region) {
      regionFilter.dispatchEvent(new Event("change"));
    } else {
      applyFilters();
    }

    function applyFilters() {
      const q = search.value.toLowerCase();
      const sort = sortOrderSelect.value;

      let result = [...FILTERED_LOCATIONS];

      if (q) {
        result = I18n.smartSearch(result, q, (item) => [item.searchText]);
      }

      // Sort
      result.sort((a, b) => {
        if (sort === "id-asc") return a.id - b.id;
        if (sort === "id-desc") return b.id - a.id;
        if (sort === "name-asc") return a.name.localeCompare(b.name);
        if (sort === "name-desc") return b.name.localeCompare(a.name);

        if (sort === "region-asc" || sort === "region-desc") {
          const regA = a.region ? I18n.toTitle(a.region) : "";
          const regB = b.region ? I18n.toTitle(b.region) : "";
          const cmp = regA.localeCompare(regB);
          if (cmp !== 0) return sort === "region-asc" ? cmp : -cmp;
          return a.name.localeCompare(b.name);
        }
        return 0;
      });

      DISPLAY_LOCATIONS = result;
      renderCurrentPage();
    }

    function renderCurrentPage() {
      const start = (PAGE - 1) * PER_PAGE;
      const end = start + PER_PAGE;
      const pageItems = DISPLAY_LOCATIONS.slice(start, end);

      if (grid) grid.classList.add("pager-transitioning");

      pageInfo.textContent = I18n.t(
        "common.paginator",
        PAGE,
        Math.ceil(DISPLAY_LOCATIONS.length / PER_PAGE) || 1,
      );

      if (pageItems.length === 0) {
        empty.hidden = false;
        grid.innerHTML = "";
        return;
      }
      empty.hidden = true;

      setTimeout(() => {
        renderPageItems(pageItems);
        if (grid) grid.classList.remove("pager-transitioning");
      }, 200);
    }

    async function renderPageItems(pageItems) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <div class="spinner"></div>
        <div style="color: var(--c-text-muted);">${I18n.t("common.loading")}</div>
      </div>`;

      const promises = pageItems.map((item) => window.fetchCached(item.url));
      const details = await Promise.all(promises);

      grid.innerHTML = "";
      const frag = document.createDocumentFragment();

      details.forEach((d) => {
        const card = document.createElement("article");
        card.className = "interactive-card grid-item-enter";
        card.setAttribute("data-category", "location");

        // Use localized name if available in the API response names array
        const esName = d.names?.find((n) => n.language.name === "es")?.name;
        const enName = d.names?.find((n) => n.language.name === "en")?.name;
        let displayName =
          esName || enName || I18n.toTitle(d.name.replace(/-/g, " "));

        // Differentiator for duplicate names: check if slug has extra info
        // Example: "alola-route-1--hauoli-outskirts" vs "Ruta 1"
        if (d.name.includes("--")) {
          const suffix = d.name.split("--")[1].replace(/-/g, " ");
          if (suffix) {
            displayName += ` (${I18n.toTitle(suffix)})`;
          }
        }

        const regName = d.region
          ? I18n.toTitle(d.region.name)
          : I18n.t("common.unknown_region") || "Desconocida";
        const regionId = d.region ? d.region.name : "default";
        const accentColor = REGION_COLORS[regionId] || REGION_COLORS.default;

        card.innerHTML = `
          <div class="item-info p-3">
              <div class="location-id">#${d.id}</div>
              <div class="item-name mb-3">${displayName}</div>
              <div class="text-center">
                  <span class="badge region-badge" style="--badge-color: ${accentColor}">${regName}</span>
              </div>
          </div>
        `;
        card.style.setProperty("--item-location-color", accentColor);
        card.onclick = () =>
          openLocationModal(d, displayName, regName, accentColor);
        frag.appendChild(card);
      });

      grid.appendChild(frag);
    }

    prevBtn.addEventListener("click", () => {
      if (PAGE > 1) {
        PAGE--;
        renderCurrentPage();
        saveSettings();
        window.scrollTo(0, 0);
      }
    });

    nextBtn.addEventListener("click", () => {
      if (PAGE < Math.ceil(DISPLAY_LOCATIONS.length / PER_PAGE)) {
        PAGE++;
        renderCurrentPage();
        saveSettings();
        window.scrollTo(0, 0);
      }
    });

    // Modal
    document
      .querySelectorAll("[data-close-modal]")
      .forEach((b) => b.addEventListener("click", () => dlg.close()));
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener("close", () => I18n.clearModalTitle());
  }

  function openLocationModal(d, displayName, regName, accentColor) {
    dlg.setAttribute("data-category", "location");
    const content = dlg.querySelector(".modal-content");
    if (content) {
      content.style.setProperty("--item-location-color", accentColor);
    }

    modalTitle.textContent = displayName;
    I18n.setModalTitle(displayName);
    kvRegion.textContent = regName;

    document.getElementById("kvLocationId").textContent = `#${d.id}`;

    // Extract generation
    let genText = "-";
    if (d.game_indices && d.game_indices.length > 0) {
      const genName = d.game_indices[0].generation.name;
      genText = genName.replace("generation-", "").toUpperCase();
    }
    document.getElementById("kvGeneration").textContent = genText;

    locationAreasList.innerHTML = "";
    const encounterList = document.getElementById("locationEncounterList");
    encounterList.innerHTML = `<div class="text-muted small">${I18n.t("common.loading", "Cargando...")}</div>`;

    if (d.areas && d.areas.length > 0) {
      // Area badges
      d.areas.forEach((a) => {
        const badge = document.createElement("span");
        badge.className = "badge region-badge";
        badge.style.setProperty("--badge-color", accentColor);
        badge.textContent = I18n.toTitle(a.name.replace(/-/g, " "));
        locationAreasList.appendChild(badge);
      });

      // Fetch Encounters from all areas
      fetchEncounters(d.areas, encounterList);
    } else {
      locationAreasList.innerHTML = `<span class="text-muted">${I18n.t("locations.no_areas", "No hay áreas específicas conocidas.")}</span>`;
      encounterList.innerHTML = `<span class="text-muted">${I18n.t("locations.no_pokemon", "No hay Pokémon salvajes registrados en esta zona.")}</span>`;
    }

    Bulbapedia.renderSection('bulbapediaSection', d.name, 'location');
    dlg.showModal();
  }

  async function fetchEncounters(areas, container) {
    try {
      const promises = areas.map((a) => window.fetchCached(a.url));
      const areaDetails = await Promise.all(promises);

      const pokemonMap = new Map(); // Use name as key to avoid duplicates

      areaDetails.forEach((ad) => {
        if (ad.pokemon_encounters) {
          ad.pokemon_encounters.forEach((pe) => {
            if (!pokemonMap.has(pe.pokemon.name)) {
              pokemonMap.set(pe.pokemon.name, pe.pokemon.url);
            }
          });
        }
      });

      if (pokemonMap.size === 0) {
        container.innerHTML = `<span class="text-muted">${I18n.t("locations.no_pokemon", "No hay Pokémon salvajes registrados en esta zona.")}</span>`;
        return;
      }

      container.innerHTML = "";
      const frag = document.createDocumentFragment();

      for (const [name, url] of pokemonMap.entries()) {
        const id = url.split("/").filter(Boolean).pop();
        const monDiv = document.createElement("div");
        monDiv.className = "text-center p-1 clickable-mon";
        monDiv.style.width = "70px";
        monDiv.innerHTML = `
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" 
               alt="${name}" 
               style="width: 50px; height: 50px; cursor: pointer;"
               title="${I18n.toTitle(name.replace(/-/g, " "))}"
               onclick="window.open('${I18n.getBasePath()}index.html#pokemon/${name}', '_blank')">
          <div class="mon-name text-truncate">${I18n.toTitle(name.replace(/-/g, " "))}</div>
        `;
        frag.appendChild(monDiv);
      }
      container.appendChild(frag);
    } catch (e) {
      console.error("Error fetching encounters", e);
      container.innerHTML = `<span class="text-danger">${I18n.t("common.error_loading", "Error al cargar datos")}</span>`;
    }
  }
})();
