(() => {
  const PROXY_URL = (window.I18n ? I18n.getBasePath() : "") + "proxy.php";
  const STORAGE_KEY = "pokedex_tcgsets_filters";

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sort: sortSets.value,
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
  const grid = document.getElementById("setsGrid");
  const empty = document.getElementById("setsEmpty");
  const search = document.getElementById("searchSet");
  const sortSets = document.getElementById("sortSets");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  const perPageSelect = document.getElementById("perPage");

  const dlg = document.getElementById("setModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalSetSymbol = document.getElementById("modalSetSymbol");
  const modalSetLogo = document.getElementById("modalSetLogo");
  const kvSeries = document.getElementById("kvSeries");
  const kvRelease = document.getElementById("kvRelease");
  const kvCount = document.getElementById("kvCount");
  const btnViewCards = document.getElementById("btnViewCards");

  // State
  let ALL_SETS = [];
  let DISPLAY_SETS = [];
  let PAGE = 1;
  let PER_PAGE = 96;

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  async function init() {
    async function loadData() {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--c-text-muted);">${I18n.t(
        "common.loading",
      )}</div>`;

      try {
        // 1. Always ensure English sets are available as base metadata (for releaseDate and logos)
        let enSets = [];
        if (window.CardStorage) {
          enSets = await CardStorage.getAllSets("en");
        }

        // If English sets aren't in DB, fetch from proxy to ensure we have sorting metadata
        if (!enSets || enSets.length === 0) {
          try {
            enSets = await window.fetchCached(
              `${PROXY_URL}?endpoint=sets&lang=en`,
            );
          } catch (e) {
            console.warn("Could not fetch English base sets for metadata", e);
            enSets = [];
          }
        }
        const enMap = new Map(enSets.map((s) => [s.id, s]));

        // 2. Load sets for current language
        let sets = [];
        if (window.CardStorage) {
          sets = await CardStorage.getAllSets(I18n.currentLang);
        }

        if (!sets || sets.length === 0) {
          // Fetch from proxy
          const res = await window.fetchCached(
            `${PROXY_URL}?endpoint=sets&lang=${I18n.currentLang}`,
          );
          sets = res;

          // Merge with English base to fill in missing metadata before saving
          if (sets && sets.length > 0 && I18n.currentLang !== "en") {
            sets = sets.map((s) => {
              const base = enMap.get(s.id);
              if (base) {
                // Merge carefully: localized name/cardCount overwrites base,
                // but base provides releaseDate/logo/symbol if localized lacks them.
                return {
                  ...base,
                  ...s,
                  releaseDate: s.releaseDate || base.releaseDate,
                  logo: s.logo || base.logo,
                  symbol: s.symbol || base.symbol,
                };
              }
              return s;
            });
            if (window.CardStorage) {
              await CardStorage.saveSetsBatch(sets, I18n.currentLang);
            }
          }
        } else {
          // Even if loaded from DB, ensure we have the latest metadata from EN base
          sets = sets.map((s) => {
            const base = enMap.get(s.id);
            if (base) {
              return {
                ...base,
                ...s,
                releaseDate: s.releaseDate || base.releaseDate,
                logo: s.logo || base.logo,
                symbol: s.symbol || base.symbol,
              };
            }
            return s;
          });
        }
        ALL_SETS = sets;
      } catch (e) {
        console.error("Error loading TCG sets", e);
      }
    }

    await loadData();

    window.addEventListener("languageChanged", async () => {
      // Re-translate static UI elements (search placeholder, sort options, etc.)
      I18n.applyTranslations();

      // Keep track of current scroll/page if possible
      const oldPage = PAGE;

      await loadData();

      // Re-apply filters with new localized data
      applyFilters();

      // Try to restore page
      PAGE = Math.min(oldPage, Math.ceil(DISPLAY_SETS.length / PER_PAGE) || 1);
      renderCurrentPage();
    });

    // Event Listeners
    search.addEventListener("input", () => {
      applyFilters();
      saveSettings();
    });

    const saved = loadSettings();
    if (saved && saved.search) search.value = saved.search;
    if (saved && saved.perPage) {
      perPageSelect.value = saved.perPage;
      PER_PAGE = parseInt(saved.perPage);
    }
    if (saved && saved.sort) {
      sortSets.value = saved.sort;
    }

    perPageSelect.addEventListener("change", () => {
      PER_PAGE = parseInt(perPageSelect.value);
      PAGE = 1;
      renderCurrentPage();
      saveSettings();
    });

    sortSets.addEventListener("change", () => {
      PAGE = 1;
      applyFilters();
      saveSettings();
    });

    if (saved && saved.page) {
      PAGE = Number(saved.page) || 1;
    }

    applyFilters();
    backgroundSyncDates();

    async function backgroundSyncDates() {
      // Check if any set is missing releaseDate
      const missing = ALL_SETS.filter((s) => !s.releaseDate);
      if (missing.length === 0) return;

      // Background sync: missing sets missing releaseDate

      const BATCH_SIZE = 5;
      for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (s) => {
          try {
            const res = await window.fetchCached(
              `${PROXY_URL}?endpoint=set&id=${encodeURIComponent(s.id)}&lang=${
                I18n.currentLang
              }`,
            );
            if (res && res.releaseDate) {
              s.releaseDate = res.releaseDate;
              if (res.cardCount) s.cardCount = res.cardCount;
              return true;
            }
          } catch (e) {}
          return false;
        });

        const results = await Promise.all(promises);
        const anySuccess = results.some((r) => r);

        if (anySuccess) {
          // If we are currently sorting by release, update the view
          const sortVal = sortSets.value;
          if (sortVal.startsWith("release")) {
            applyFilters();
          }
        }

        // Small delay to be polite to the proxy/API
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    function applyFilters() {
      const q = search.value.toLowerCase();

      let result = ALL_SETS;

      if (q) {
        result = I18n.smartSearch(result, q, (item) => {
          const rawSeries =
            item.serie?.name ||
            item.series ||
            (typeof item.serie === "string" ? item.serie : "");
          const key = `tcg.series_names.${rawSeries}`;
          const translated = I18n.t(key);
          const sName = translated === key ? rawSeries : translated;
          return [item.name, sName];
        });
      }

      DISPLAY_SETS = result;

      // Sorting
      const sortVal = sortSets.value;
      DISPLAY_SETS.sort((a, b) => {
        let cmp = 0;
        switch (sortVal) {
          case "release_asc":
            cmp = (a.releaseDate || "9999").localeCompare(
              b.releaseDate || "9999",
            );
            break;
          case "name_asc":
            cmp = (a.name || "").localeCompare(b.name || "");
            break;
          case "name_desc":
            cmp = (b.name || "").localeCompare(a.name || "");
            break;
          case "release_desc":
          default:
            const dateA = a.releaseDate || "1900-01-01";
            const dateB = b.releaseDate || "1900-01-01";
            cmp = dateB.localeCompare(dateA);
            break;
        }
        // Tie-breaker: stable ID sort to prevent jumping between languages
        return cmp === 0 ? a.id.localeCompare(b.id) : cmp;
      });

      renderCurrentPage();
    }

    function renderCurrentPage() {
      const start = (PAGE - 1) * PER_PAGE;
      const end = start + PER_PAGE;
      const pageItems = DISPLAY_SETS.slice(start, end);

      if (grid) grid.classList.add("pager-transitioning");

      pageInfo.textContent = I18n.t(
        "common.paginator",
        PAGE,
        Math.ceil(DISPLAY_SETS.length / PER_PAGE) || 1,
      );

      if (pageItems.length === 0) {
        empty.hidden = false;
        grid.innerHTML = "";
        return;
      }
      empty.hidden = true;

      setTimeout(() => {
        renderItems(pageItems);
        if (grid) grid.classList.remove("pager-transitioning");
      }, 200);
    }

    function renderItems(items) {
      grid.innerHTML = "";
      const frag = document.createDocumentFragment();

      items.forEach((d) => {
        const card = document.createElement("article");
        card.className = "interactive-card py-4 grid-item-enter";

        const logoUrl = d.logo
          ? `${d.logo}.png`
          : (window.I18n ? I18n.getBasePath() : "") +
            "assets/img/fallback/fallback.png";
        const rawSeries =
          d.serie?.name ||
          d.series ||
          (typeof d.serie === "string" ? d.serie : "");
        const key = `tcg.series_names.${rawSeries}`;
        const translated = I18n.t(key);
        const sName = translated === key ? rawSeries : translated;

        card.innerHTML = `
          <div class="item-info p-2 d-flex flex-column align-items-center justify-content-center">
              <img src="${logoUrl}" alt="${d.name}" style="max-height: 80px; max-width:90%; object-fit:contain; margin-bottom:1rem;" loading="lazy">
              <div class="item-name mb-1" style="font-size: 1.1rem; text-align:center;">${d.name}</div>
              <div class="text-center mt-1">
                  <span class="badge bg-secondary">${sName}</span>
              </div>
          </div>
        `;
        card.onclick = () => openSetModal(d);
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
      if (PAGE < Math.ceil(DISPLAY_SETS.length / PER_PAGE)) {
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

  async function openSetModal(d) {
    modalTitle.textContent = d.name;
    I18n.setModalTitle(d.name);
    modalSetSymbol.src = d.symbol
      ? `${d.symbol}.png`
      : (window.I18n ? I18n.getBasePath() : "") +
        "assets/img/fallback/fallback.png";
    modalSetLogo.src = d.logo
      ? `${d.logo}.png`
      : (window.I18n ? I18n.getBasePath() : "") +
        "assets/img/fallback/fallback.png";

    const rawSeries =
      d.serie?.name || d.series || (typeof d.serie === "string" ? d.serie : "");
    const key = `tcg.series_names.${rawSeries}`;
    const translated = I18n.t(key);
    const sName = translated === key ? rawSeries : translated;
    kvSeries.textContent = sName;
    kvRelease.textContent = d.releaseDate || "...";

    // If releaseDate is missing, fetch full details
    if (!d.releaseDate) {
      try {
        const res = await window.fetchCached(
          `${PROXY_URL}?endpoint=set&id=${encodeURIComponent(d.id)}&lang=${
            I18n.currentLang
          }`,
        );
        if (res && res.releaseDate) {
          d.releaseDate = res.releaseDate;
          if (res.cardCount) d.cardCount = res.cardCount;
          kvRelease.textContent = d.releaseDate;
          const off = d.cardCount?.official || "?";
          const tot = d.cardCount?.total || "?";
          kvCount.textContent = `${off} / ${tot}`;
        } else {
          kvRelease.textContent = "Unknown";
        }
      } catch (e) {
        kvRelease.textContent = "Unknown";
      }
    }

    const official = d.cardCount?.official || "?";
    const total = d.cardCount?.total || "?";
    kvCount.textContent = `${official} / ${total}`;

    btnViewCards.href = `cards.html?set=${encodeURIComponent(d.id)}`;
    btnViewCards.target = "_blank";

    dlg.showModal();
  }
})();
