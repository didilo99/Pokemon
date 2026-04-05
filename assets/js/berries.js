(() => {
  const API = "https://pokeapi.co/api/v2";
  const STORAGE_KEY = "pokedex_berries_filters";

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        firmness: firmFilter.value,
        sort: sortFilter.value,
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
  const grid = document.getElementById("berriesGrid");
  const empty = document.getElementById("berriesEmpty");
  const search = document.getElementById("searchBerry");
  const firmFilter = document.getElementById("firmFilter");
  const sortFilter = document.getElementById("sortFilter");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  const perPageSelect = document.getElementById("perPage");

  const dlg = document.getElementById("berryModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalIcon = document.getElementById("modalIcon");
  const kvFirmness = document.getElementById("kvFirmness");
  const kvSize = document.getElementById("kvSize");
  const berryEffect = document.getElementById("berryEffect");

  const kvGrowthTime = document.getElementById("kvGrowthTime");
  const kvMaxHarvest = document.getElementById("kvMaxHarvest");
  const kvSoilDryness = document.getElementById("kvSoilDryness");
  const kvSmoothness = document.getElementById("kvSmoothness");
  const berryFlavors = document.getElementById("berryFlavors");

  // State
  let ALL_BERRIES = [];
  let FILTERED_BERRIES = [];
  let DISPLAY_BERRIES = [];
  let BERRY_DETAILS = new Map(); // name -> detail object
  let PAGE = 1;
  let PER_PAGE = 60;

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => {
    if (DISPLAY_BERRIES.length > 0) renderCurrentPage();
  });

  async function init() {
    const itemDict = await window.fetchI18nDictLocal("item");

    const bRes = await window.fetchCached(`${API}/berry?limit=1000`);
    if (!bRes) return;
    const results = bRes.results;

    ALL_BERRIES = results.map((r) => {
      const berryName = r.name + "-berry";
      const localizedName =
        itemDict?.[berryName]?.[I18n.currentLang] ||
        itemDict?.[berryName]?.["en"];

      return {
        ...r,
        id: parseInt(r.url.split("/").filter(Boolean).pop()),
        getDisplayName: () =>
          localizedName || I18n.toTitle(r.name.replace("-", " ")),
      };
    });

    FILTERED_BERRIES = ALL_BERRIES;

    // Event Listeners
    search.addEventListener("input", () => {
      applyFilters();
      saveSettings();
    });

    const saved = loadSettings();
    if (saved && saved.search) {
      search.value = saved.search;
    }
    if (saved && saved.perPage) {
      perPageSelect.value = saved.perPage;
      PER_PAGE = parseInt(saved.perPage);
    }
    if (saved && saved.firmness) {
      firmFilter.value = saved.firmness;
    }
    if (saved && saved.sort) {
      sortFilter.value = saved.sort;
    }

    firmFilter.addEventListener("change", async () => {
      const firm = firmFilter.value;

      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--c-text-muted);">${I18n.t(
        "common.loading",
      )}</div>`;

      if (!firm) {
        FILTERED_BERRIES = ALL_BERRIES;
      } else {
        try {
          const cres = await window.fetchCached(
            `${API}/berry-firmness/${firm}`,
          );
          if (cres) {
            const berryNames = new Set(cres.berries.map((x) => x.berry.name));
            FILTERED_BERRIES = ALL_BERRIES.filter((i) =>
              berryNames.has(i.name),
            );
          } else {
            FILTERED_BERRIES = ALL_BERRIES;
          }
        } catch (error) {
          FILTERED_BERRIES = ALL_BERRIES;
        }
      }

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
      renderCurrentPage();
      saveSettings();
    });

    if (saved && saved.page) {
      PAGE = Number(saved.page) || 1;
    }

    if (saved && saved.firmness) {
      firmFilter.dispatchEvent(new Event("change"));
    } else {
      applyFilters();
    }

    async function applyFilters() {
      const q = search.value.toLowerCase();
      let res = FILTERED_BERRIES;

      if (q) {
        res = I18n.smartSearch(res, q, (b) => [b.name, b.getDisplayName()]);
      }

      DISPLAY_BERRIES = res;
      PAGE = 1;
      applySort();
    }

    async function applySort() {
      const mode = sortFilter.value;

      if (mode === "growth_asc" || mode === "harvest_desc") {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--c-text-muted);">${I18n.t(
          "common.loading",
        )}</div>`;
        await ensureDetailsLoaded(DISPLAY_BERRIES);
      }

      DISPLAY_BERRIES.sort((a, b) => {
        if (mode === "id_asc") return a.id - b.id;
        if (mode === "id_desc") return b.id - a.id;
        if (mode === "name_asc")
          return a.getDisplayName().localeCompare(b.getDisplayName());
        if (mode === "name_desc")
          return b.getDisplayName().localeCompare(a.getDisplayName());

        const dA = BERRY_DETAILS.get(a.name);
        const dB = BERRY_DETAILS.get(b.name);

        if (mode === "growth_asc")
          return (dA?.growth_time || 0) - (dB?.growth_time || 0);
        if (mode === "harvest_desc")
          return (dB?.max_harvest || 0) - (dA?.max_harvest || 0);

        return 0;
      });

      renderCurrentPage();
    }

    async function ensureDetailsLoaded(items) {
      const toFetch = items.filter((i) => !BERRY_DETAILS.has(i.name));
      if (toFetch.length === 0) return;

      const batchSize = 25;
      for (let i = 0; i < toFetch.length; i += batchSize) {
        const batch = toFetch.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((b) => window.fetchCached(b.url)),
        );
        results.forEach((d) => {
          if (d) BERRY_DETAILS.set(d.name, d);
        });
      }
    }

    function renderCurrentPage() {
      const start = (PAGE - 1) * PER_PAGE;
      const end = start + PER_PAGE;
      const pageItems = DISPLAY_BERRIES.slice(start, end);

      if (grid) grid.classList.add("pager-transitioning");

      pageInfo.textContent = I18n.t(
        "common.paginator",
        PAGE,
        Math.ceil(DISPLAY_BERRIES.length / PER_PAGE) || 1,
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
      grid.innerHTML = `<div class="text-center p-5"><div class="spinner"></div><div class="text-muted mt-2">${I18n.t("common.loading")}</div></div>`;

      await ensureDetailsLoaded(pageItems);
      const details = pageItems.map((b) => BERRY_DETAILS.get(b.name));

      grid.innerHTML = "";
      const frag = document.createDocumentFragment();

      details.forEach((d) => {
        if (!d) return;
        const card = document.createElement("article");
        card.className = "interactive-card item-card grid-item-enter";
        card.setAttribute("data-category", "berry");

        const iconSrc = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${d.name}-berry.png`;
        const pokesprite = window.getPokeSpriteUrl
          ? window.getPokeSpriteUrl("item", d.name + "-berry")
          : "";

        const displayName =
          pageItems.find((p) => p.name === d.name)?.getDisplayName() ||
          I18n.toTitle(d.name);

        card.innerHTML = `
            <div class="item-icon-wrapper">
                <img src="${iconSrc}" class="item-icon" alt="${d.name}" loading="lazy"
                  onerror="this.onerror=null; this.src='${pokesprite || iconSrc}';">
            </div>
            <div class="item-info">
                <div class="item-name">${displayName}</div>
                <div class="item-cat-badge">${I18n.t(
                  `berries.firm.${d.firmness.name.replace(/-/g, "_")}`,
                )}</div>
            </div>
        `;
        card.onclick = () => openBerryModal(d);
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
      if (PAGE < Math.ceil(DISPLAY_BERRIES.length / PER_PAGE)) {
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

  async function openBerryModal(berry) {
    dlg.setAttribute("data-category", "berry");

    // Reset/Loading state
    modalTitle.textContent = I18n.t("common.loading");
    modalIcon.src = "";
    berryEffect.textContent = I18n.t("common.loading");
    berryFlavors.innerHTML = "";
    kvFirmness.textContent = "-";
    kvSize.textContent = "-";
    kvGrowthTime.textContent = "-";
    kvMaxHarvest.textContent = "-";
    kvSoilDryness.textContent = "-";
    kvSmoothness.textContent = "-";

    const berryName = berry.name + "-berry";
    window.fetchI18nDictLocal("item").then((dict) => {
      const localizedName =
        dict?.[berryName]?.[I18n.currentLang] ||
        dict?.[berryName]?.["en"] ||
        I18n.toTitle(berry.name.replace("-", " "));

      modalTitle.textContent = localizedName;
      I18n.setModalTitle(modalTitle.textContent);
    });

    modalIcon.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${berry.name}-berry.png`;

    kvFirmness.textContent = I18n.t(
      "berries.firm." + berry.firmness.name.replace("-", "_"),
    );
    kvSize.textContent = `${berry.size} mm`;
    kvGrowthTime.textContent = `${berry.growth_time} h`;
    kvMaxHarvest.textContent = berry.max_harvest;
    kvSoilDryness.textContent = berry.soil_dryness;
    kvSmoothness.textContent = berry.smoothness;

    // Render flavors
    if (berry.flavors && berry.flavors.length > 0) {
      berry.flavors.forEach((f) => {
        if (f.potency > 0) {
          const badge = document.createElement("span");
          badge.className = "flavor-badge";
          const flavorName = I18n.t(
            "flavors." + f.flavor.name,
            I18n.toTitle(f.flavor.name),
          );
          badge.innerText = `${flavorName}: ${f.potency}`;
          berryFlavors.appendChild(badge);
        }
      });
      if (berryFlavors.innerHTML === "") {
        berryFlavors.innerHTML = `<span class="text-muted">${I18n.t("berries.no_flavor")}</span>`;
      }
    } else {
      berryFlavors.innerHTML = `<span class="text-muted">${I18n.t("berries.no_flavor")}</span>`;
    }

    dlg.showModal();

    // Fetch Item Data for Effect/Description
    try {
      const itemData = await window.fetchCached(berry.item.url);
      if (itemData) {
        const esEntries = itemData.flavor_text_entries.filter(
          (e) => e.language.name === I18n.currentLang,
        );
        const enEntries = itemData.flavor_text_entries.filter(
          (e) => e.language.name === "en",
        );

        const entry =
          esEntries.length > 0
            ? esEntries[esEntries.length - 1]
            : enEntries.length > 0
              ? enEntries[enEntries.length - 1]
              : null;

        berryEffect.textContent = entry
          ? entry.text.replace(/\f/g, " ")
          : itemData.effect_entries?.[0]?.effect || I18n.t("abilities.no_desc");

        if (itemData.sprites?.default) {
          modalIcon.src = itemData.sprites.default;
        }
      }
    } catch (e) {
      berryEffect.textContent = I18n.t("abilities.no_desc");
    }
  }
})();
