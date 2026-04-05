(() => {
  const API = "https://pokeapi.co/api/v2";
  const STORAGE_KEY = "pokedex_items_filters";

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        category: catFilter.value,
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
  const grid = document.getElementById("itemsGrid");
  const empty = document.getElementById("itemsEmpty");
  const search = document.getElementById("searchItem");
  const catFilter = document.getElementById("catFilter");
  const sortFilter = document.getElementById("sortFilter");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  const perPageSelect = document.getElementById("perPage");

  const dlg = document.getElementById("itemModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalIcon = document.getElementById("modalIcon");
  const kvCategory = document.getElementById("kvCategory");
  const kvCost = document.getElementById("kvCost");
  const itemEffect = document.getElementById("itemEffect");

  // State
  let ALL_ITEMS = [];
  let FILTERED_ITEMS = [];
  let DISPLAY_ITEMS = []; // Items after both category and search filters
  let ITEM_DETAILS = new Map(); // name -> detail (for cost/sorting)
  let PAGE = 1;
  let PER_PAGE = 60;
  let RENDER_ID = 0;

  // Utils
  const toTitle = (s) =>
    s.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  // Init
  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => {
    if (DISPLAY_ITEMS.length > 0) renderCurrentPage();
  });

  async function init() {
    // Fetch All Items & Localized Names
    const bp = I18n.getBasePath();
    const [res, namesRes] = await Promise.all([
      window.fetchCached(`${API}/item?limit=10000`),
      fetch(`${bp}assets/i18n/item_names.json`)
        .then((r) => r.json())
        .catch(() => ({})),
    ]);
    const { results } = res;
    const ITEM_NAMES = namesRes || {};

    ALL_ITEMS = results.map((r) => {
      const names = ITEM_NAMES[r.name] || {};
      const id = parseInt(r.url.split("/").filter(Boolean).pop());
      return {
        ...r,
        id: id,
        getDisplayName: () =>
          names[I18n.currentLang] || names["en"] || I18n.toTitle(r.name),
      };
    });

    FILTERED_ITEMS = ALL_ITEMS;
    // Event Listeners
    search.addEventListener("input", () => {
      applyFilters();
      saveSettings();
    });

    // Initial population of categories
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

    // Add listener BEFORE restoration
    catFilter.addEventListener("change", async () => {
      const cat = catFilter.value;

      // Show loading state
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--c-text-muted);">${I18n.t(
        "common.loading",
      )}</div>`;

      if (!cat) {
        FILTERED_ITEMS = ALL_ITEMS;
      } else if (cat === "badges") {
        FILTERED_ITEMS = ALL_ITEMS.filter((i) => i.name.includes("badge"));
      } else {
        try {
          const cres = await window.fetchCached(`${API}/item-category/${cat}`);
          if (cres) {
            const itemNames = new Set(cres.items.map((x) => x.name));
            FILTERED_ITEMS = ALL_ITEMS.filter((i) => itemNames.has(i.name));
          } else {
            FILTERED_ITEMS = ALL_ITEMS;
          }
        } catch (error) {
          FILTERED_ITEMS = ALL_ITEMS;
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

    await populateCategories();

    if (saved && saved.category) {
      catFilter.value = saved.category;
      // Trigger category logic manually - now the listener will catch it
      catFilter.dispatchEvent(new Event("change"));
    } else {
      applyFilters();
    }

    async function populateCategories() {
      try {
        const pocketRes = await window.fetchCached(`${API}/item-pocket`);
        const pockets = pocketRes.results;

        // Fetch categories for all pockets in parallel
        const pocketsWithCats = await Promise.all(
          pockets.map(async (p) => {
            const detail = await window.fetchCached(p.url);
            return {
              name: p.name,
              categories: detail.categories,
            };
          }),
        );

        // Clear and add "All" option
        catFilter.innerHTML = `<option value="" data-i18n="items.all_categories">${I18n.t(
          "items.all_categories",
        )}</option>`;

        pocketsWithCats.forEach((p) => {
          if (p.categories.length === 0) return;

          const group = document.createElement("optgroup");
          const pocketKey = `items.pocket_${p.name.replace(/-/g, "_")}`;
          group.label =
            I18n.t(pocketKey) !== pocketKey
              ? I18n.t(pocketKey)
              : toTitle(p.name);

          p.categories.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.name;
            const catKey = `items.cat_${c.name.replace(/-/g, "_")}`;
            opt.textContent =
              I18n.t(catKey) !== catKey ? I18n.t(catKey) : toTitle(c.name);
            group.appendChild(opt);
          });

          catFilter.appendChild(group);
        });

        // Add "Badges" at the end under "Others"
        const otherGroup = document.createElement("optgroup");
        otherGroup.label = I18n.t("items.group_others") || "Others";
        const badgeOpt = document.createElement("option");
        badgeOpt.value = "badges";
        badgeOpt.textContent = I18n.t("items.cat_badges") || "Badges";
        otherGroup.appendChild(badgeOpt);
        catFilter.appendChild(otherGroup);
      } catch (e) {}
    }

    function applyFilters() {
      const q = search.value;

      // Start with category-filtered items
      let result = FILTERED_ITEMS;

      // Apply search on top using localized names
      if (q) {
        result = I18n.smartSearch(result, q, (item) => [
          item.name,
          item.getDisplayName(),
        ]);
      }

      // Store filtered results and reset to page 1
      DISPLAY_ITEMS = result;
      PAGE = 1;
      applyFiltersAndSort();
    }

    async function applyFiltersAndSort() {
      const mode = sortFilter.value;

      // For cost sorting, we need details
      if (mode.startsWith("cost_")) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--c-text-muted);">${I18n.t(
          "common.loading",
        )}</div>`;
        await ensureDetailsLoaded(DISPLAY_ITEMS);
      }

      DISPLAY_ITEMS.sort((a, b) => {
        if (mode === "id_asc") return a.id - b.id;
        if (mode === "id_desc") return b.id - a.id;
        if (mode === "name_asc")
          return a.getDisplayName().localeCompare(b.getDisplayName());
        if (mode === "name_desc")
          return b.getDisplayName().localeCompare(a.getDisplayName());

        if (mode.startsWith("cost_")) {
          const detailA = ITEM_DETAILS.get(a.name);
          const detailB = ITEM_DETAILS.get(b.name);
          const costA = detailA?.cost || 0;
          const costB = detailB?.cost || 0;
          return mode === "cost_asc" ? costA - costB : costB - costA;
        }
        return 0;
      });

      renderCurrentPage();
    }

    async function ensureDetailsLoaded(items) {
      const toFetch = items.filter((i) => !ITEM_DETAILS.has(i.name));
      if (toFetch.length === 0) return;

      const batchSize = 50;
      for (let i = 0; i < toFetch.length; i += batchSize) {
        const batch = toFetch.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((item) => window.fetchCached(item.url)),
        );
        results.forEach((d) => {
          if (d) ITEM_DETAILS.set(d.name, d);
        });
      }
    }

    function renderCurrentPage() {
      const start = (PAGE - 1) * PER_PAGE;
      const end = start + PER_PAGE;
      const pageItems = DISPLAY_ITEMS.slice(start, end);

      if (grid) grid.classList.add("pager-transitioning");

      pageInfo.textContent = I18n.t(
        "common.paginator",
        PAGE,
        Math.ceil(DISPLAY_ITEMS.length / PER_PAGE) || 1,
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

    function renderPageItems(pageItems) {
      const rid = ++RENDER_ID;
      grid.innerHTML = `<div class="text-center p-5"><div class="spinner"></div><div class="text-muted mt-2">${I18n.t("common.loading")}</div></div>`;
      const frag = document.createDocumentFragment();

      const renderCardHTML = (item, d) => {
        const apiIcon = d ? d.sprites.default : "";
        const fallbackName = d ? d.name : item.name;
        const pokeApiSpritesFallback = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${fallbackName}.png`;
        const pokesprite = window.getPokeSpriteUrl
          ? window.getPokeSpriteUrl("item", fallbackName)
          : "";

        const iconSrc = apiIcon || pokeApiSpritesFallback;

        return `
          <div class="item-icon-wrapper">
              ${d || item ? `<img src="${iconSrc}" class="item-icon" alt="${item.name}" loading="lazy"
                onerror="this.onerror=null; this.src='${pokesprite || pokeApiSpritesFallback}';">` : `<div style="width:32px;height:32px;" class="skeleton"></div>`}
          </div>
          <div class="item-info">
              <div class="item-name">${item.getDisplayName()}</div>
              <div class="item-cat-badge">${
                d && d.category
                  ? I18n.t(`items.cat_${d.category.name.replace(/-/g, "_")}`) === `items.cat_${d.category.name.replace(/-/g, "_")}`
                    ? toTitle(d.category.name)
                    : I18n.t(`items.cat_${d.category.name.replace(/-/g, "_")}`)
                  : "..."
              }</div>
          </div>
        `;
      };

      pageItems.forEach((item) => {
        const card = document.createElement("article");
        const d = ITEM_DETAILS.get(item.name);
        
        card.className = "interactive-card grid-item-enter" + (d ? "" : " skeleton");
        if (d) card.setAttribute("data-category", d.category?.name || "default");
        
        card.innerHTML = renderCardHTML(item, d);
        if (d) card.onclick = () => openItemModal(d);
        frag.appendChild(card);
        
        if (!d) {
            window.fetchCached(item.url).then(detail => {
                ITEM_DETAILS.set(item.name, detail);
                if (rid === RENDER_ID && card.isConnected) {
                    card.innerHTML = renderCardHTML(item, detail);
                    card.className = "interactive-card grid-item-enter";
                    card.setAttribute("data-category", detail.category?.name || "default");
                    card.onclick = () => openItemModal(detail);
                }
            }).catch(e => console.error(e));
        }
      });

      grid.innerHTML = "";
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
      if (PAGE < Math.ceil(DISPLAY_ITEMS.length / PER_PAGE)) {
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

  function openItemModal(d) {
    // Set category for dynamic styling
    dlg.setAttribute("data-category", d.category?.name || "default");

    modalTitle.textContent = I18n.getName(d);
    I18n.setModalTitle(modalTitle.textContent);
    modalIcon.src = d.sprites.default || "";

    const catKey = d.category
      ? `items.cat_${d.category.name.replace(/-/g, "_")}`
      : "";
    const catName =
      catKey && I18n.t(catKey) !== catKey
        ? I18n.t(catKey)
        : toTitle(d.category?.name || "-");

    kvCategory.textContent = catName;
    kvCost.textContent = d.cost ? `${d.cost} ₽` : I18n.t("items.not_sold");

    const esEntries = d.flavor_text_entries.filter(
      (e) => e.language.name === I18n.currentLang,
    );
    const enEntries = d.flavor_text_entries.filter(
      (e) => e.language.name === "en",
    );

    const entry =
      esEntries.length > 0
        ? esEntries[esEntries.length - 1]
        : enEntries.length > 0
          ? enEntries[enEntries.length - 1]
          : null;

    itemEffect.textContent = entry
      ? entry.text.replace(/\f/g, " ")
      : d.effect_entries[0]?.effect || I18n.t("abilities.no_desc");

    Bulbapedia.renderSection('bulbapediaSection', d.name, 'item');
    dlg.showModal();
  }
})();
