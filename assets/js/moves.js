(() => {
  const API = "https://pokeapi.co/api/v2";
  const STORAGE_KEY = "pokedex_moves_filters";

  let RENDER_ID = 0;

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        type: typeFilter.value,
        power: powerFilter.value,
        accuracy: accuracyFilter.value,
        perPage: perPageSelect.value,
        sort: sortFilter.value,
        page: PAGE,
        search: search.value,
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
  const grid = document.getElementById("movesGrid");
  const empty = document.getElementById("movesEmpty");
  const search = document.getElementById("searchMove");
  const typeFilter = document.getElementById("typeFilter");
  const catFilter = document.getElementById("catFilter");
  const sortFilter = document.getElementById("sortFilter");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  const perPageSelect = document.getElementById("perPage");
  const powerFilter = document.getElementById("powerFilter");
  const accuracyFilter = document.getElementById("accuracyFilter");

  const dlg = document.getElementById("moveModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalTypeBadge = document.getElementById("modalTypeBadge");
  const kvPower = document.getElementById("kvPower");
  const kvAccuracy = document.getElementById("kvAccuracy");
  const kvPP = document.getElementById("kvPP");
  const kvCategory = document.getElementById("kvCategory");
  const kvPriority = document.getElementById("kvPriority");
  const kvTarget = document.getElementById("kvTarget");
  const moveEffect = document.getElementById("moveEffect");

  // State
  let ALL_MOVES = []; // { name, url, getDisplayName }
  let FILTERED_MOVES = [];
  let MOVES_DETAILS = new Map(); // name -> detail object
  let PAGE = 1;
  let PER_PAGE = 60;
  let DETAILS_LOADED = false;
  let TYPE_LIST = []; // Dynamic Discovery (Phase 1.1)

  /**
   * Phase 1.1: Dynamically discovers types from PokeAPI to ensure the app is future-proof.
   */
  async function discoverDynamicLists() {
    try {
      const typeRes = await window.fetchCached(`${API}/type?limit=100`);
      if (typeRes && typeRes.results) {
        TYPE_LIST = typeRes.results
          .filter(t => {
            const id = parseInt(t.url.split("/").filter(Boolean).pop());
            return id < 10000 || t.name === 'stellar';
          })
          .map(t => t.name);
      }
    } catch (e) {
      console.error("Discovery error:", e);
      TYPE_LIST = ["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"];
    }
  }

  // Utils
  const toTitle = (s) =>
    s.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  function getPokespriteTypeIcon(name) {
    const bp = window.I18n ? I18n.getBasePath() : '';
    return `${bp}assets/img/types/${name.toLowerCase()}.png`;
  }

  function typeBadge(name) {
    return `<span class="type-badge type-${name}">
      <img src="${getPokespriteTypeIcon(
        name,
      )}" width="20" height="20" alt="${name}">
      <span>${(I18n.t("types." + name) || toTitle(name)).replace(
        /^type\s+/i,
        "",
      )}</span>
    </span>`;
  }

  // Init
  // Init
  // Init - Wait for I18n
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  // Re-render on language change
  window.addEventListener("languageChanged", () => {
    // Resort moves with new language
    sortMoves();

    // Sort filtered moves as well
    if (FILTERED_MOVES.length > 0) {
      FILTERED_MOVES.sort((a, b) =>
        a.getDisplayName().localeCompare(b.getDisplayName()),
      );
      renderPage();
    }

    // Update dropdown options
    updateTypeDropdown();
  });

  function sortMoves() {
    ALL_MOVES.sort((a, b) =>
      a.getDisplayName().localeCompare(b.getDisplayName()),
    );
  }

  function updateTypeDropdown() {
    const optionsContainer = document.getElementById("typeOptions");
    if (!optionsContainer) return;

    const allOpt = optionsContainer.querySelector(
      '.custom-option[data-value=""] span',
    );
    if (allOpt)
      allOpt.textContent = I18n.t("moves.all_types") || "Todos los tipos";

    TYPE_LIST.forEach((t) => {
      const opt = optionsContainer.querySelector(
        `.custom-option[data-value="${t}"] span`,
      );
      if (opt) {
        const label = (I18n.t("types." + t) || toTitle(t)).replace(
          /^type\s+/i,
          "",
        );
        opt.textContent = label;
      }
    });
  }

  async function init() {
    // Fetch All Moves (Lightweight)
    // Fetch All Moves (Lightweight) & Spanish Names
    // Fetch All Moves (Lightweight) & Localized Names
    const bp = I18n.getBasePath();
    const [_, moveData, namesRes] = await Promise.all([
      window.discoverDynamicLists ? window.discoverDynamicLists() : discoverDynamicLists(),
      window.fetchCached(`${API}/move?limit=1000`),
      fetch(`${bp}assets/i18n/move_names.json`)
        .then((r) => r.json())
        .catch(() => ({})),
    ]);

    const { results } = moveData;
    const MOVES_NAMES = namesRes || {};

    ALL_MOVES = results.map((r) => {
      const names = MOVES_NAMES[r.name] || {};
      return {
        name: r.name,
        url: r.url,
        // Helper to get name efficiently
        getDisplayName: () =>
          names[I18n.currentLang] || names["en"] || toTitle(r.name),
      };
    });

    ALL_MOVES.sort((a, b) =>
      a.getDisplayName().localeCompare(b.getDisplayName()),
    );

    // Initial ID extraction for all moves
    ALL_MOVES.forEach((m) => {
      m.id = parseInt(m.url.split("/").filter(Boolean).pop());
    });

    // Load saved filters
    const saved = loadSettings();
    FILTERED_MOVES = ALL_MOVES;
    if (saved && saved.search) {
      search.value = saved.search;
      FILTERED_MOVES = I18n.smartSearch(ALL_MOVES, saved.search, (m) => [
        m.name,
        m.getDisplayName(),
      ]);
    }

    if (saved && saved.perPage) {
      perPageSelect.value = saved.perPage;
      PER_PAGE = parseInt(saved.perPage);
    }

    if (saved && saved.page) {
      PAGE = Number(saved.page) || 1;
    }

    if (saved && saved.sort) {
      sortFilter.value = saved.sort;
    }

    renderPage();

    // Event Listeners
    search.addEventListener("input", () => {
      PAGE = 1;
      applyFilters();
    });

    [powerFilter, accuracyFilter, sortFilter].forEach((input) => {
      input.addEventListener("input", () => {
        PAGE = 1;
        applyFilters();
      });
    });

    sortFilter.addEventListener("change", () => {
      PAGE = 1;
      applyFilters();
    });
    const wrapper = document.getElementById("typeFilterWrapper");
    const trigger = document.getElementById("typeSelectTrigger");
    const optionsContainer = document.getElementById("typeOptions");
    const selectedText = document.getElementById("selectedTypeText");

    // Populate Options
    // Add "All Types" first
    const allOpt = document.createElement("div");
    allOpt.className = "custom-option selected";
    allOpt.dataset.value = "";
    allOpt.innerHTML = `<span>${
      I18n.t("moves.all_types") || "Todos los tipos"
    }</span>`;
    allOpt.addEventListener("click", () => selectType("", allOpt));
    optionsContainer.appendChild(allOpt);

    TYPE_LIST.forEach((t) => {
      const opt = document.createElement("div");
      opt.className = "custom-option";
      opt.dataset.value = t;
      opt.dataset.type = t; // For CSS hover color

      const iconUrl = getPokespriteTypeIcon(t);
      const label = (I18n.t("types." + t) || toTitle(t)).replace(
        /^type\s+/i,
        "",
      );

      opt.innerHTML = `
        <img src="${iconUrl}" alt="${t}">
        <span>${label}</span>
      `;
      opt.addEventListener("click", () => selectType(t, opt));
      optionsContainer.appendChild(opt);
    });

    if (saved && saved.type) {
      const opt = optionsContainer.querySelector(
        `.custom-option[data-value="${saved.type}"]`,
      );
      if (opt) selectType(saved.type, opt, true); // silent load
    }

    if (saved && saved.power) {
      powerFilter.value = saved.power;
    }
    if (saved && saved.accuracy) {
      accuracyFilter.value = saved.accuracy;
    }

    if (saved && (saved.power || saved.accuracy)) {
      applyFilters();
    }

    // Toggle Dropdown
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.toggle("open");
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    // Selection Logic
    async function selectType(val, optElement, silent = false) {
      typeFilter.value = val;

      // Update UI
      document
        .querySelectorAll(".custom-option")
        .forEach((o) => o.classList.remove("selected"));
      optElement.classList.add("selected");

      const label = optElement.querySelector("span").textContent;
      const icon = optElement.querySelector("img");

      if (val === "") {
        selectedText.innerHTML = label;
      } else {
        selectedText.innerHTML = `
            <span style="display:inline-flex; align-items:center; gap:8px;">
                <img src="${icon.src}" width="20" height="20" style="filter:none;">
                <span>${label}</span>
            </span>
         `;
      }

      wrapper.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");

      if (!silent) {
        PAGE = 1;
        applyFilters();
        saveSettings();
      }
    }

    async function applyFilters() {
      const q = search.value.toLowerCase();
      const type = typeFilter.value;
      const minPower = parseInt(powerFilter.value) || 0;
      const minAcc = parseInt(accuracyFilter.value) || 0;

      saveSettings();

      // Filtering requires data
      let results = ALL_MOVES;

      // 1. Type Filter (Fastest if using type endpoint)
      if (type) {
        const tdata = await window.fetchCached(`${API}/type/${type}`);
        const moveNames = new Set(tdata.moves.map((m) => m.name));
        results = results.filter((m) => moveNames.has(m.name));
      }

      // 2. Search Filter
      if (q) {
        results = I18n.smartSearch(results, q, (m) => [
          m.name,
          m.getDisplayName(),
        ]);
      }

      // 3. Power/Accuracy (Requires deep details)
      if (minPower > 0 || minAcc > 0) {
        await ensureDetailsLoaded(results);
        results = results.filter((m) => {
          const d = MOVES_DETAILS.get(m.name);
          if (!d) return false;
          const power = d.power || 0;
          const acc = d.accuracy || 0;
          return power >= minPower && acc >= minAcc;
        });
      }

      FILTERED_MOVES = results;

      // Sort results
      const mode = sortFilter.value;

      // Deep sorting (requires move details)
      const needsDetails = [
        "power_desc",
        "power_asc",
        "pp_desc",
        "pp_asc",
        "acc_desc",
        "acc_asc",
      ].includes(mode);

      if (needsDetails) {
        // Temporarily show loading indicator
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--c-text-muted);">${I18n.t(
          "common.loading",
        )}</div>`;
        await ensureDetailsLoaded(FILTERED_MOVES);
      }

      FILTERED_MOVES.sort((a, b) => {
        switch (mode) {
          case "id_asc":
            return a.id - b.id;
          case "id_desc":
            return b.id - a.id;
          case "name_asc":
            return a.getDisplayName().localeCompare(b.getDisplayName());
          case "name_desc":
            return b.getDisplayName().localeCompare(a.getDisplayName());
          case "power_desc":
            return (
              (MOVES_DETAILS.get(b.name)?.power || 0) -
              (MOVES_DETAILS.get(a.name)?.power || 0)
            );
          case "power_asc":
            return (
              (MOVES_DETAILS.get(a.name)?.power || 0) -
              (MOVES_DETAILS.get(b.name)?.power || 0)
            );
          case "pp_desc":
            return (
              (MOVES_DETAILS.get(b.name)?.pp || 0) -
              (MOVES_DETAILS.get(a.name)?.pp || 0)
            );
          case "pp_asc":
            return (
              (MOVES_DETAILS.get(a.name)?.pp || 0) -
              (MOVES_DETAILS.get(b.name)?.pp || 0)
            );
          case "acc_desc":
            return (
              (MOVES_DETAILS.get(b.name)?.accuracy || 0) -
              (MOVES_DETAILS.get(a.name)?.accuracy || 0)
            );
          case "acc_asc":
            return (
              (MOVES_DETAILS.get(a.name)?.accuracy || 0) -
              (MOVES_DETAILS.get(b.name)?.accuracy || 0)
            );
          default:
            return 0; // Should not happen if sortFilter.value is always one of the cases
        }
      });

      renderPage();
    }

    // Category filter is harder (requires move details). We might skip it or fetch on demand.
    // Let's skip category filter logic for now or implement it by fetching details for the filtered list (if small enough).

    prevBtn.addEventListener("click", () => {
      if (PAGE > 1) {
        PAGE--;
        renderPage();
        saveSettings();
        window.scrollTo(0, 0);
      }
    });

    nextBtn.addEventListener("click", () => {
      const max = Math.ceil(FILTERED_MOVES.length / PER_PAGE);
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
      saveSettings();
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

  async function ensureDetailsLoaded(sublist) {
    const toFetch = sublist.filter((m) => !MOVES_DETAILS.has(m.name));
    if (toFetch.length === 0) return;

    // Batch fetch with concurrency limit to avoid browser lag
    const batchSize = 20;
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((m) => window.fetchCached(m.url)),
      );
      results.forEach((d) => {
        if (d) MOVES_DETAILS.set(d.name, d);
      });
    }
  }

  function renderPage() {
    const rid = ++RENDER_ID;
    grid.innerHTML = `<div class="text-center p-5"><div class="spinner"></div><div class="text-muted mt-2">${I18n.t("common.loading")}</div></div>`;
    const start = (PAGE - 1) * PER_PAGE;
    const end = start + PER_PAGE;
    const pageItems = FILTERED_MOVES.slice(start, end);

    if (grid) grid.classList.add("pager-transitioning");

    pageInfo.textContent = I18n.t(
      "common.paginator",
      PAGE,
      Math.ceil(FILTERED_MOVES.length / PER_PAGE) || 1,
    );

    if (pageItems.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    setTimeout(() => {
      if (rid !== RENDER_ID) return;
      const frag = document.createDocumentFragment();

      const renderCardHTML = (item, d) => `
        <div class="move-card-header">
            <div class="move-name">${item.getDisplayName()}</div>
            <span class="move-pp-badge">PP ${d ? d.pp || "-" : "..."}</span>
        </div>
        
        <div class="move-card-body">
            <div class="move-badges">
                <span class="type-badge move-type-badge">
                  ${d ? `<img src="${getPokespriteTypeIcon(d.type.name)}" alt="${d.type.name}" width="16" height="16">
                  ${(
                    I18n.t("types." + d.type.name) || toTitle(d.type.name)
                  ).replace(/^type\s+/i, "")}` : "..."}
                </span>
            </div>

            <div class="move-mini-stats">
                <div class="mini-stat">
                    <span class="label">${I18n.t("moves.power") || "Pow"}</span>
                    <span class="value">${d ? d.power || "-" : "..."}</span>
                </div>
                <div class="mini-stat">
                    <span class="label">${I18n.t("moves.accuracy") || "Acc"}</span>
                    <span class="value">${d ? (d.accuracy ? d.accuracy + "%" : "-") : "..."}</span>
                </div>
            </div>
        </div>
      `;

      pageItems.forEach((item) => {
        const card = document.createElement("article");
        const d = MOVES_DETAILS.get(item.name);
        
        card.className = "move-card grid-item-enter" + (d ? "" : " skeleton");
        card.dataset.type = d ? d.type.name : "normal";

        card.innerHTML = renderCardHTML(item, d);
        if (d) {
            card.onclick = () => openMoveModal(d);
        }
        frag.appendChild(card);
        
        if (!d) {
            window.fetchCached(item.url).then(detail => {
                MOVES_DETAILS.set(item.name, detail);
                if (rid === RENDER_ID && card.isConnected) {
                    card.innerHTML = renderCardHTML(item, detail);
                    card.dataset.type = detail.type.name;
                    card.classList.remove("skeleton");
                    card.classList.add("grid-item-enter");
                    card.onclick = () => openMoveModal(detail);
                }
            }).catch(e => console.error(e));
        }
      });

      grid.innerHTML = "";
      grid.appendChild(frag);
      if (grid) grid.classList.remove("pager-transitioning");
    }, 200);
  }

  /**
   * Phase 1.3: Renders move meta data (drain, healing, crit, hits, ailments).
   */
  function renderMoveMeta(d) {
    const section = document.getElementById("moveMetaSection");
    const grid = document.getElementById("moveMetaGrid");
    if (!section || !grid) return;

    const meta = d.meta;
    if (!meta) {
      section.style.display = "none";
      return;
    }

    const items = [];

    if (meta.drain !== 0) {
      const label = meta.drain > 0 ? "moves.drain" : "moves.recoil";
      items.push({ label: I18n.t(label) || (meta.drain > 0 ? "Drenaje" : "Retroceso"), val: Math.abs(meta.drain) + "%" });
    }
    if (meta.healing !== 0) {
      items.push({ label: I18n.t("moves.healing") || "Curación", val: meta.healing + "%" });
    }
    if (meta.crit_rate > 0) {
      items.push({ label: I18n.t("moves.crit_rate") || "Ratio Crítico", val: "+" + meta.crit_rate });
    }
    if (meta.flinch_chance > 0) {
      items.push({ label: I18n.t("moves.flinch_chance") || "Prob. Retroceso", val: meta.flinch_chance + "%" });
    }
    if (meta.ailment && meta.ailment.name !== "none") {
      const ailmentTrans = I18n.t("moves.ailments." + meta.ailment.name) || toTitle(meta.ailment.name);
      items.push({ label: I18n.t("moves.ailment") || "Estado", val: ailmentTrans + (meta.ailment_chance > 0 ? ` (${meta.ailment_chance}%)` : "") });
    }
    if (meta.min_hits || meta.max_hits) {
      const val = meta.min_hits === meta.max_hits ? meta.min_hits : `${meta.min_hits}-${meta.max_hits}`;
      items.push({ label: I18n.t("moves.hits") || "Golpes", val: val });
    }
    if (meta.min_turns || meta.max_turns) {
      const val = meta.min_turns === meta.max_turns ? meta.min_turns : `${meta.min_turns}-${meta.max_turns}`;
      items.push({ label: I18n.t("moves.turns") || "Turnos", val: val });
    }

    if (items.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    grid.innerHTML = items.map(item => `
      <div class="meta-badge">
        <span class="meta-label">${item.label}</span>
        <span class="meta-val">${item.val}</span>
      </div>
    `).join("");
  }

  /**
   * Phase 1.3: Renders stat changes (buffs/debuffs) caused by the move.
   */
  function renderStatChanges(d) {
    const section = document.getElementById("moveStatChanges");
    const list = document.getElementById("statChangesList");
    if (!section || !list) return;

    const changes = d.stat_changes;
    const metaStatChance = d.meta?.stat_chance || 0;

    if (!changes || changes.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    const chanceText = metaStatChance > 0 ? ` (${metaStatChance}%)` : "";
    
    list.innerHTML = changes.map(c => {
      const statTrans = I18n.t("stats." + c.stat.name) || toTitle(c.stat.name);
      const sign = c.change > 0 ? "+" : "";
      const className = c.change > 0 ? "plus" : "minus";
      return `
        <div class="stat-change-item">
          <span class="stat-change-name">${statTrans}${chanceText}</span>
          <span class="stat-change-stage ${className}">${sign}${c.change}</span>
        </div>
      `;
    }).join("");
  }

  /**
   * Phase 1.3: Renders contest information (Appeal/Jam) for Gen 3 style contests.
   */
  function renderContestInfo(d) {
    const section = document.getElementById("moveContestSection");
    const grid = document.getElementById("contestInfoGrid");
    if (!section || !grid) return;

    const contestType = d.contest_type?.name;

    if (!contestType) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    const typeTrans = I18n.t("contests.types." + contestType) || toTitle(contestType);
    
    grid.innerHTML = `
      <div class="contest-badge">
        <span class="label">${I18n.t("moves.contest_type") || "Tipo Concurso"}</span>
        <span class="val">${typeTrans}</span>
      </div>
    `;
  }

  /**
   * Phase 2.2: Renders historical changes to the move (past_values).
   */
  function renderMovePastValues(d) {
    const section = document.getElementById("movePastValues");
    const container = document.getElementById("pastValuesTable");
    if (!section || !container) return;

    const past = d.past_values;
    if (!past || past.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    
    let html = `
      <table class="past-values-table">
        <thead>
          <tr>
            <th>${I18n.t("moves.generation") || "Gen"}</th>
            <th>${I18n.t("moves.changes") || "Cambios"}</th>
          </tr>
        </thead>
        <tbody>
    `;

    past.forEach(pv => {
      const genName = pv.version_group.name;
      const genLabel = I18n.t("versions." + genName) || toTitle(genName);
      const changes = [];
      
      if (pv.power !== null && pv.power !== d.power) {
        changes.push(`
          <div class="past-val-row">
            <span class="label">${I18n.t("moves.power") || "Poder"}:</span>
            <span class="past-val-change">
              <span class="past-val-old">${pv.power || "-"}</span>
              <i data-lucide="arrow-right" class="past-val-arrow"></i>
              <span class="past-val-new">${d.power || "-"}</span>
            </span>
          </div>
        `);
      }
      if (pv.accuracy !== null && pv.accuracy !== d.accuracy) {
        changes.push(`
          <div class="past-val-row">
            <span class="label">${I18n.t("moves.accuracy") || "Precisión"}:</span>
            <span class="past-val-change">
              <span class="past-val-old">${pv.accuracy || "-"}%</span>
              <i data-lucide="arrow-right" class="past-val-arrow"></i>
              <span class="past-val-new">${d.accuracy || "-"}%</span>
            </span>
          </div>
        `);
      }
      if (pv.pp !== null && pv.pp !== d.pp) {
        changes.push(`
          <div class="past-val-row">
            <span class="label">${I18n.t("moves.pp") || "PP"}:</span>
            <span class="past-val-change">
              <span class="past-val-old">${pv.pp || "-"}</span>
              <i data-lucide="arrow-right" class="past-val-arrow"></i>
              <span class="past-val-new">${d.pp || "-"}</span>
            </span>
          </div>
        `);
      }
      if (pv.type !== null && pv.type.name !== d.type.name) {
        const oldType = I18n.t("types." + pv.type.name) || toTitle(pv.type.name);
        const newType = I18n.t("types." + d.type.name) || toTitle(d.type.name);
        changes.push(`
          <div class="past-val-row">
            <span class="label">${I18n.t("moves.type") || "Tipo"}:</span>
            <span class="past-val-change">
              <span class="past-val-old">${oldType}</span>
              <i data-lucide="arrow-right" class="past-val-arrow"></i>
              <span class="past-val-new">${newType}</span>
            </span>
          </div>
        `);
      }
      if (pv.effect_chance !== null && pv.effect_chance !== d.effect_chance) {
        changes.push(`
          <div class="past-val-row">
            <span class="label">${I18n.t("moves.effect_chance") || "Prob. Efecto"}:</span>
            <span class="past-val-change">
              <span class="past-val-old">${pv.effect_chance || "0"}%</span>
              <i data-lucide="arrow-right" class="past-val-arrow"></i>
              <span class="past-val-new">${d.effect_chance || "0"}%</span>
            </span>
          </div>
        `);
      }

      html += `
        <tr>
          <td>${genLabel}</td>
          <td>${changes.join("")}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
  }

  async function openMoveModal(d) {
    modalTitle.textContent = I18n.getName(d);
    I18n.setModalTitle(modalTitle.textContent);

    // Reset visibility
    ["moveMetaSection", "moveStatChanges", "moveContestSection", "movePastValues"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    // Update type icon in header
    const typeIcon = document.getElementById("modalTypeIcon");
    if (typeIcon) {
      typeIcon.innerHTML = `
            <img src="${getPokespriteTypeIcon(d.type.name)}" 
                 alt="${d.type.name}" width="32" height="32">
        `;
    }

    // Apply color context to modal
    const modalContent = document.querySelector("#moveModal .modal-content");
    modalContent.setAttribute("data-type", d.type.name);

    // Update Stat Values (Bubbles & Visuals)
    document.getElementById("valPower").textContent = d.power || "-";
    document.getElementById("valAccuracy").textContent = d.accuracy
      ? d.accuracy + "%"
      : "-";
    document.getElementById("valPP").textContent = d.pp || "-";

    // Trigger Stat Bar Animations (Small delay to ensure modal is open/visible)
    setTimeout(() => {
      updateStatBar("barPower", d.power, 150);
      updateStatBar("barAccuracy", d.accuracy, 100);
    }, 50);

    // Phase 1.3 & 2.2 additions
    renderMoveMeta(d);
    renderStatChanges(d);
    renderContestInfo(d);
    renderMovePastValues(d);

    // Category Info
    const cat = d.damage_class.name;
    const catTrans = I18n.t("moves." + cat);
    kvCategory.textContent =
      catTrans === "moves." + cat ? toTitle(cat) : catTrans;

    kvPriority.textContent = d.priority;

    const target = d.target.name;
    const targetTrans = I18n.t("moves.targets." + target);
    kvTarget.textContent =
      targetTrans === "moves.targets." + target ? toTitle(target) : targetTrans;

    // Flavor Text
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

    moveEffect.textContent = entry
      ? entry.flavor_text.replace(/\f/g, " ")
      : I18n.t("moves.no_desc");

    // Learned By Section
    const learnedContainer = document.getElementById("learnedBy");
    learnedContainer.innerHTML = `<div class="spinner">${I18n.t("moves.loading_pokemon")}</div>`;

    Bulbapedia.renderSection('bulbapediaSection', d.name, 'move');
    dlg.showModal();

    // Use data already present in 'd'
    try {
      const learned = d.learned_by_pokemon;

      if (!learned || learned.length === 0) {
        learnedContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--c-text-muted);">${I18n.t(
          "moves.no_learned_by",
        )}</div>`;
        return;
      }

      learnedContainer.innerHTML = "";
      const frag = document.createDocumentFragment();

      // Sort by name
      learned.sort((a, b) => a.name.localeCompare(b.name));

      for (const p of learned) {
        const div = document.createElement("div");
        div.className = "learned-mon";
        // Use pokesprite for small icon
        // Extract ID from URL for fallback
        // Extract ID from URL
        const id = p.url.split("/").filter(Boolean).pop();

        // Sprite Chain: Standard -> Home -> Official -> Fallback
        const base =
          "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
        const spriteUrl = `${base}/${id}.png`;
        const homeUrl = `${base}/other/home/${id}.png`;
        const artUrl = `${base}/other/official-artwork/${id}.png`;

        const nameSpan = document.createElement("span");
        // User request: Use API names to avoid translation errors
        nameSpan.textContent = toTitle(p.name);

        div.innerHTML = `
          <img src="${spriteUrl}" loading="lazy" alt="${p.name}" 
            onerror="this.onerror=null; this.src='${homeUrl}'; this.onerror=function(){this.src='${artUrl}'};">
        `;
        div.appendChild(nameSpan);
        div.onclick = () => {
          window.open(
            `${I18n.getBasePath()}index.html#pokemon/${p.name}`,
            "_blank",
          );
        };
        frag.appendChild(div);
      }
      learnedContainer.appendChild(frag);
    } catch (e) {
      learnedContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--c-error);">${I18n.t(
        "moves.error_loading",
      )}</div>`;
    }
  }

  function updateStatBar(id, value, max) {
    const bar = document.getElementById(id);
    if (!value) {
      bar.style.width = "0%";
      return;
    }
    const pct = Math.min(100, (value / max) * 100);
    bar.style.width = `${pct}%`;
  }
})();
