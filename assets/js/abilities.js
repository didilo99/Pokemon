(() => {
  const API = "https://pokeapi.co/api/v2";
  const STORAGE_KEY = "pokedex_abilities_filters";

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        perPage: perPageSelect.value,
        sort: sortFilter.value,
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
  const grid = document.getElementById("abilitiesGrid");
  const empty = document.getElementById("abilitiesEmpty");
  const search = document.getElementById("searchAbility");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  const perPageSelect = document.getElementById("perPage");
  const sortFilter = document.getElementById("sortFilter");

  const dlg = document.getElementById("abilityModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const modalLoading = document.getElementById("modalLoading");
  const modalData = document.getElementById("modalData");
  const abilityEffect = document.getElementById("abilityEffect");
  const pokemonList = document.getElementById("pokemonList");
  const pokemonCount = document.getElementById("pokemonCount");
  const generationVal = document.getElementById("generationVal");
  const hiddenStatus = document.getElementById("hiddenStatus");

  // State
  let ALL_ABILITIES = [];
  let FILTERED_ABILITIES = [];
  let PAGE = 1;
  let PER_PAGE = 60;

  // Utils
  const toTitle = (s) =>
    s.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => {
    renderPage();
  });

  async function init() {
    // Fetch All Abilities & Localized Names
    const bp = I18n.getBasePath();
    const [res, namesRes] = await Promise.all([
      window.fetchCached(`${API}/ability?limit=1000`),
      fetch(`${bp}assets/i18n/ability_names.json`)
        .then((r) => r.json())
        .catch(() => ({})),
    ]);
    const { results } = res;
    const ABILITY_NAMES = namesRes || {};
    ALL_ABILITIES = results.map((r) => {
      const names = ABILITY_NAMES[r.name] || {};
      const id = parseInt(r.url.split("/").filter(Boolean).pop());
      return {
        ...r,
        id: id,
        getDisplayName: () =>
          names[I18n.currentLang] || names["en"] || I18n.toTitle(r.name),
      };
    });

    // Load saved filters
    const saved = loadSettings();
    if (saved && saved.search) {
      search.value = saved.search;
    }
    if (saved && saved.perPage) {
      perPageSelect.value = saved.perPage;
      PER_PAGE = parseInt(saved.perPage);
    }
    if (saved && saved.sort) {
      sortFilter.value = saved.sort;
    }
    if (saved && saved.page) {
      PAGE = Number(saved.page) || 1;
    }

    applyFilters();

    // Event Listeners
    search.addEventListener("input", () => {
      applyFilters();
      saveSettings();
    });

    sortFilter.addEventListener("change", () => {
      applyFilters();
      saveSettings();
    });

    perPageSelect.addEventListener("change", () => {
      PER_PAGE = parseInt(perPageSelect.value);
      PAGE = 1;
      renderPage();
      saveSettings();
    });

    function applyFilters() {
      FILTERED_ABILITIES = I18n.smartSearch(
        ALL_ABILITIES,
        search.value,
        (a) => [a.name, a.getDisplayName()],
      );

      const mode = sortFilter.value;
      FILTERED_ABILITIES.sort((a, b) => {
        if (mode === "id_asc") return (a.id || 0) - (b.id || 0);
        if (mode === "id_desc") return (b.id || 0) - (a.id || 0);
        if (mode === "name_asc")
          return a.getDisplayName().localeCompare(b.getDisplayName());
        if (mode === "name_desc")
          return b.getDisplayName().localeCompare(a.getDisplayName());
        return 0;
      });

      PAGE = 1;
      renderPage();
    }

    prevBtn.addEventListener("click", () => {
      if (PAGE > 1) {
        PAGE--;
        renderPage();
        saveSettings();
        window.scrollTo(0, 0);
      }
    });

    nextBtn.addEventListener("click", () => {
      const max = Math.ceil(FILTERED_ABILITIES.length / PER_PAGE);
      if (PAGE < max) {
        PAGE++;
        renderPage();
        saveSettings();
        window.scrollTo(0, 0);
      }
    });

    perPageSelect.addEventListener("change", () => {
      PER_PAGE = parseInt(perPageSelect.value);
      PAGE = 1;
      renderPage();
      saveSettings(search.value);
    });

    // Modal
    const closeBtn = document.getElementById("closeModalBtn");
    if (closeBtn) closeBtn.addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener("cancel", () => dlg.close());
    dlg.addEventListener("close", () => I18n.clearModalTitle());
  }

  async function renderPage() {
    if (grid) {
        grid.innerHTML = `<div class="text-center p-5"><div class="spinner"></div><div class="text-muted mt-2">${I18n.t("common.loading")}</div></div>`;
    }
    const start = (PAGE - 1) * PER_PAGE;
    const end = start + PER_PAGE;
    const pageItems = FILTERED_ABILITIES.slice(start, end);

    if (grid) grid.classList.add("pager-transitioning");

    pageInfo.textContent = I18n.t(
      "common.paginator",
      PAGE,
      Math.ceil(FILTERED_ABILITIES.length / PER_PAGE) || 1,
    );

    if (pageItems.length === 0) {
      empty.hidden = false;
      if (grid) grid.classList.remove("pager-transitioning");
      return;
    }
    empty.hidden = true;

    // Fetch details for current page to get short effect
    const promises = pageItems.map((item) => window.fetchCached(item.url));
    const details = await Promise.all(promises);

    setTimeout(() => {
      if (grid) grid.innerHTML = "";
      const frag = document.createDocumentFragment();

      details.forEach((d) => {
        const card = document.createElement("article");
        card.className = "card grid-item-enter";
        if (d.is_main_series === false || d.generation === null) {
          card.classList.add("hidden-ability");
        }

      const entry =
        d.flavor_text_entries.find(
          (e) => e.language.name === I18n.currentLang,
        ) || d.flavor_text_entries.find((e) => e.language.name === "en");

      const shortEffect = entry
        ? entry.flavor_text.replace(/\f/g, " ")
        : I18n.t("abilities.no_desc");

      let badgeHTML = "";
      if (d.is_main_series === false || d.generation === null) {
        badgeHTML = `<span class="ability-badge">${I18n.t(
          "abilities.status_special",
        )}</span>`;
      }

      card.innerHTML = `
        ${badgeHTML}
        <div class="ability-name">${I18n.getName(d)}</div>
        <div class="ability-effect">${shortEffect}</div>
      `;
      card.onclick = () => openAbilityModal(d);
      frag.appendChild(card);
    });

    grid.appendChild(frag);
    if (grid) grid.classList.remove("pager-transitioning");
    }, 200);
  }

  /**
   * Phase 2.3: Renders historical changes to an ability's effect.
   */
  function renderAbilityEffectChanges(d) {
    const section = document.getElementById("effectChangesSection");
    const list = document.getElementById("effectChangesList");
    if (!section || !list) return;

    const changes = d.effect_changes;
    if (!changes || changes.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    list.innerHTML = changes.map(item => {
      const version = item.version_group.name;
      const versionTrans = I18n.t("versions." + version) || toTitle(version);
      // Usually PokeAPI has the change description in EN only even if localized elsewhere
      const entry = item.effect_entries.find(e => e.language.name === I18n.currentLang) || 
                    item.effect_entries.find(e => e.language.name === "en");
      
      if (!entry) return "";
      
      return `
        <div class="effect-change-item">
          <div class="effect-change-header">
            <span class="version-label">${versionTrans}</span>
          </div>
          <div class="effect-change-text">${entry.effect.replace(/\f/g, " ")}</div>
        </div>
      `;
    }).join("");
  }

  async function openAbilityModal(d) {
    // Show modal with loading state
    dlg.showModal();
    modalLoading.hidden = false;
    modalData.hidden = true;
    modalLoading.innerHTML = `<div class="text-center p-5"><div class="spinner"></div></div>`;

    modalTitle.textContent = I18n.getName(d);
    I18n.setModalTitle(modalTitle.textContent);

    // Reset visibility
    const changesSection = document.getElementById("effectChangesSection");
    if (changesSection) changesSection.style.display = "none";

    // Determine if hidden ability
    const hasHidden = d.pokemon.some((p) => p.is_hidden);
    const isSpecial = d.is_main_series === false || d.generation === null;

    if (isSpecial) {
      modalSubtitle.textContent = I18n.t("abilities.status_special");
    } else if (hasHidden) {
      modalSubtitle.textContent = I18n.t("abilities.status_hidden");
    } else {
      modalSubtitle.textContent = I18n.t("abilities.status_normal");
    }

    // Stats
    pokemonCount.textContent = d.pokemon.length;
    generationVal.textContent = d.generation
      ? toTitle(d.generation.name).replace("Generation ", "Gen ")
      : "-";
    hiddenStatus.textContent = hasHidden
      ? I18n.t("common.yes")
      : I18n.t("common.no");

    // Effect description
    const esEntries = d.flavor_text_entries.filter(
      (e) => e.language.name === I18n.currentLang,
    );
    const enEntries = d.effect_entries.filter((e) => e.language.name === "en");
    const enFlavorEntries = d.flavor_text_entries.filter(
      (e) => e.language.name === "en",
    );

    const entry =
      esEntries.length > 0
        ? esEntries[esEntries.length - 1]
        : enEntries.length > 0
          ? enEntries[enEntries.length - 1]
          : enFlavorEntries.length > 0
            ? enFlavorEntries[enFlavorEntries.length - 1]
            : null;

    abilityEffect.textContent = entry
      ? (entry.effect || entry.flavor_text).replace(/\f/g, " ")
      : I18n.t("abilities.no_desc_detail");

    // Phase 2.3
    renderAbilityEffectChanges(d);

    Bulbapedia.renderSection('bulbapediaSection', d.name, 'ability');

    // Pokemon List
    pokemonList.innerHTML = `<div class="spinner">${I18n.t(
      "common.loading",
    )}</div>`;

    try {
      const pokemon = d.pokemon;
      if (!pokemon || pokemon.length === 0) {
        pokemonList.innerHTML = `<div>${I18n.t("abilities.no_pokemon")}</div>`;
        return;
      }

      pokemonList.innerHTML = "";
      const frag = document.createDocumentFragment();

      // Sort by name
      pokemon.sort((a, b) => a.pokemon.name.localeCompare(b.pokemon.name));

      for (const p of pokemon) {
        const div = document.createElement("div");
        div.className = "pokemon-item";

        // Extract ID
        const id = p.pokemon.url.split("/").filter(Boolean).pop();

        // Sprite Chain: Standard -> Home -> Official
        const base =
          "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
        const spriteUrl = `${base}/${id}.png`;
        const homeUrl = `${base}/other/home/${id}.png`;
        const artUrl = `${base}/other/official-artwork/${id}.png`;

        const nameSpan = document.createElement("span");
        // User request: Use API names to avoid translation errors
        nameSpan.textContent = toTitle(p.pokemon.name);

        const hiddenBadge = p.is_hidden
          ? `<span class="is-hidden">${I18n.t("abilities.status_hidden")}</span>`
          : "";

        div.innerHTML = `
          <img src="${spriteUrl}" loading="lazy" alt="${p.pokemon.name}">
          ${hiddenBadge}
        `;
        div.insertBefore(
          nameSpan,
          div.lastElementChild ? div.lastElementChild.nextSibling : null,
        );
        // Actually simpler: append nameSpan, then hiddenBadge?
        // Original order: img, span, hiddenBadge.
        // So:
        div.innerHTML = `
          <img src="${spriteUrl}" loading="lazy" alt="${p.pokemon.name}"
            onerror="this.onerror=null; this.src='${homeUrl}'; this.onerror=function(){this.src='${artUrl}'};">
        `;
        div.appendChild(nameSpan);
        if (p.is_hidden) {
          const badge = document.createElement("span");
          badge.className = "is-hidden";
          badge.textContent = I18n.t("abilities.status_hidden");
          div.appendChild(badge);
        }
        div.onclick = () => {
          window.open(
            `${I18n.getBasePath()}index.html#pokemon/${p.pokemon.name}`,
            "_blank",
          );
        };
        frag.appendChild(div);
      }

      // Create proper pokemon-grid wrapper
      pokemonList.innerHTML = "";
      const gridDiv = document.createElement("div");
      gridDiv.className = "pokemon-grid";
      gridDiv.appendChild(frag);
      pokemonList.appendChild(gridDiv);

      // Show modal data
      modalLoading.hidden = true;
      modalData.hidden = false;
    } catch (e) {
      pokemonList.innerHTML = `<div>${I18n.t("abilities.error_pokemon")}</div>`;
      modalLoading.hidden = true;
      modalData.hidden = false;
    }
  }
})();
