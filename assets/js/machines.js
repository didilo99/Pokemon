(() => {
  const API = "https://pokeapi.co/api/v2";
  const STORAGE_KEY = "pokedex_machines_filters";
  const VERSION_COLORS = {
    "red-blue": "#ff1111",
    yellow: "#ffd700",
    "gold-silver": "#daa520",
    crystal: "#48d1cc",
    "ruby-sapphire": "#a52a2a",
    emerald: "#008000",
    "firered-leafgreen": "#7fff00",
    "diamond-pearl": "#b9f2ff",
    platinum: "#e5e4e2",
    "heartgold-soulsilver": "#ff8c00",
    "black-white": "#f5f5f5",
    colosseum: "#696969",
    xd: "#4b0082",
    "black-2-white-2": "#333333",
    "x-y": "#00bfff",
    "omega-ruby-alpha-sapphire": "#dc143c",
    "sun-moon": "#ffa500",
    "ultra-sun-ultra-moon": "#ff4500",
    "lets-go-pikachu-lets-go-eevee": "#f4e01b",
    "sword-shield": "#00b7ee",
    "the-isle-of-armor": "#90ee90",
    "the-crown-tundra": "#00ffff",
    "brilliant-diamond-shining-pearl": "#00ced1",
    "legends-arceus": "#1a243d",
    "scarlet-violet": "#e62211",
  };

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sort: sortSelect.value,
        version: versionFilter.value,
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
  const grid = document.getElementById("machinesGrid");
  const empty = document.getElementById("machinesEmpty");
  const search = document.getElementById("searchMachine");
  const sortSelect = document.getElementById("sortMachines"); // Added
  const versionFilter = document.getElementById("versionFilter");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  const perPageSelect = document.getElementById("perPage");

  const dlg = document.getElementById("machineModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalIcon = document.getElementById("modalIcon");

  const kvMove = document.getElementById("kvMove");
  const kvVersion = document.getElementById("kvVersion");
  const kvCost = document.getElementById("kvCost");
  const machineEffect = document.getElementById("machineEffect");

  const moveType = document.getElementById("moveType");
  const moveDamageClass = document.getElementById("moveDamageClass");
  const movePower = document.getElementById("movePower");
  const moveAccuracy = document.getElementById("moveAccuracy");
  const movePP = document.getElementById("movePP");

  // State
  let ALL_MACHINES = []; // items
  let FILTERED_MACHINES = [];
  let DISPLAY_MACHINES = [];
  let PAGE = 1;
  let PER_PAGE = 60;

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => {
    if (DISPLAY_MACHINES.length > 0) renderCurrentPage();
  });

  async function init() {
    // 1. Fetch Item Categories for machines
    // Machines are usually in categories: "all-machines", "tm", "hm", "tr"
    // To ensure completeness, we'll fetch items in the "machines" pocket or from the 'machine' endpoint.
    // However, the /machine endpoint returns machine IDs with their move and version group, but no names directly.
    // It's better to fetch items by category 'all-machines' or the 'machines' pocket.

    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--c-text-muted);">${I18n.t(
      "common.loading",
    )}</div>`;

    try {
      const pocketRes = await window.fetchCached(`${API}/item-pocket/machines`);
      // The pocket contains categories
      let allMachineItems = [];

      for (const cat of pocketRes.categories) {
        const catRes = await window.fetchCached(cat.url);
        allMachineItems.push(...catRes.items);
      }

      // Deduplicate
      const uniqueItems = Array.from(
        new Set(allMachineItems.map((a) => a.name)),
      ).map((name) => allMachineItems.find((a) => a.name === name));

      const bp = I18n.getBasePath();
      const namesRes = await fetch(`${bp}assets/i18n/item_names.json`)
        .then((r) => r.json())
        .catch(() => ({}));
      const moveNamesRes = await fetch(`${bp}assets/i18n/move_names.json`)
        .then((r) => r.json())
        .catch(() => ({}));

      ALL_MACHINES = uniqueItems.map((r) => {
        const names = namesRes[r.name] || {};
        // Extract number for sorting (TM01 -> 01)
        const match = r.name.match(/\d+/);
        const num = match ? parseInt(match[0], 10) : 9999;
        const type = r.name.substring(0, 2).toLowerCase(); // tm, hm, tr

        return {
          ...r,
          num,
          typePrefix: type,
          getDisplayName: () =>
            names[I18n.currentLang] || names["en"] || I18n.toTitle(r.name),
        };
      });

      // Store move names globally for easy access in search
      window.MOVE_NAMES = moveNamesRes;
    } catch (e) {
      console.error("Failed to load machines:", e);
      // Fallback: manually load TM/HM/TR limits from items?
      // In most cases, the pocket request will work.
    }

    FILTERED_MACHINES = ALL_MACHINES;

    // Populate Versions
    try {
      const vgRes = await window.fetchCached(`${API}/version-group?limit=100`);
      versionFilter.innerHTML = `<option value="" data-i18n="machines.all_versions">${I18n.t(
        "machines.all_versions",
        "Todos los Juegos",
      )}</option>`;
      vgRes.results.forEach((vg) => {
        const opt = document.createElement("option");
        opt.value = vg.name;
        opt.textContent = I18n.toTitle(vg.name.replace(/-/g, " "));
        versionFilter.appendChild(opt);
      });
    } catch (e) {}

    // Event Listeners
    search.addEventListener("input", () => {
      applyFilters();
      saveSettings();
    });

    sortSelect.addEventListener("change", () => {
      applyFilters();
      saveSettings();
    });

    const saved = loadSettings();
    if (saved && saved.search) search.value = saved.search;
    if (saved && saved.sort) sortSelect.value = saved.sort;
    if (saved && saved.perPage) {
      perPageSelect.value = saved.perPage;
      PER_PAGE = parseInt(saved.perPage);
    }
    if (saved && saved.version) {
      versionFilter.value = saved.version;
    }

    perPageSelect.addEventListener("change", () => {
      PER_PAGE = parseInt(perPageSelect.value);
      PAGE = 1;
      renderCurrentPage();
      saveSettings();
    });

    versionFilter.addEventListener("change", async () => {
      applyFilters();
      saveSettings();
    });

    if (saved && saved.page) {
      PAGE = Number(saved.page) || 1;
    }

    applyFilters();

    function applyFilters() {
      const q = search.value.toLowerCase();
      const sortMode = sortSelect.value;

      let result = ALL_MACHINES;

      if (q) {
        // Also search by move name if it happens to match "TMxx Name"
        result = I18n.smartSearch(result, q, (item) => {
          // Very naive way to match TM name + possible move name if user typed it
          return [item.name, item.getDisplayName()];
        });
      }

      // Sorting
      if (sortMode.startsWith("name")) {
        const dir = sortMode.endsWith("asc") ? 1 : -1;
        result.sort((a, b) => {
          return (
            a
              .getDisplayName()
              .localeCompare(b.getDisplayName(), I18n.currentLang, {
                sensitivity: "base",
              }) * dir
          );
        });
      } else if (sortMode.startsWith("id")) {
        const dir = sortMode.endsWith("asc") ? 1 : -1;
        result.sort((a, b) => {
          // First sort by type prefix (TM < HM < TR)
          if (a.typePrefix !== b.typePrefix) {
            return a.typePrefix.localeCompare(b.typePrefix) * dir;
          }
          // Then by number
          return (a.num - b.num) * dir;
        });
      }

      DISPLAY_MACHINES = result;
      PAGE = 1;
      renderCurrentPage();
    }

    function renderCurrentPage() {
      const start = (PAGE - 1) * PER_PAGE;
      const end = start + PER_PAGE;
      const pageItems = DISPLAY_MACHINES.slice(start, end);

      if (grid) grid.classList.add("pager-transitioning");

      pageInfo.textContent = I18n.t(
        "common.paginator",
        PAGE,
        Math.ceil(DISPLAY_MACHINES.length / PER_PAGE) || 1,
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

      // Current active version color (if any)
      const verFilter = versionFilter.value;
      const verColor = VERSION_COLORS[verFilter] || null;

      details.forEach((d) => {
        // A machine might not be available in the selected version group.
        if (verFilter && d.machines) {
          // Check if machine array has this version
          const hasVer = d.machines.some(
            (m) => m.version_group.name === verFilter,
          );
          if (!hasVer) return;
        }

        const card = document.createElement("article");
        card.className = "interactive-card grid-item-enter";

        // Set card category for base color
        card.setAttribute("data-category", d.category?.name || "machine");

        // Apply version color override if present
        if (verColor) {
          card.style.setProperty("--item-color", verColor);
          card.style.borderColor = verColor;
        }

        const apiIcon = d.sprites.default;
        const fallback = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${d.name}.png`;
        const iconSrc = apiIcon || fallback;

        card.innerHTML = `
          <div class="item-icon-wrapper">
              <img src="${iconSrc}" class="item-icon" alt="${d.name}" loading="lazy"
                onerror="this.onerror=null; this.src='${fallback}';">
          </div>
          <div class="item-info">
              <div class="item-name" style="text-transform: uppercase;">${I18n.getName(
                d,
              )}</div>
              <div class="item-cat-badge">${I18n.toTitle(
                d.category?.name || "Machine",
              )}</div>
          </div>
        `;
        card.onclick = () => openMachineModal(d);
        frag.appendChild(card);
      });

      if (frag.children.length === 0) {
        empty.hidden = false;
      } else {
        empty.hidden = true;
        grid.appendChild(frag);
      }
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
      if (PAGE < Math.ceil(DISPLAY_MACHINES.length / PER_PAGE)) {
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

  async function openMachineModal(d) {
    dlg.setAttribute("data-category", d.category?.name || "machine");

    // Apply color override based on current version group (if selected) or category
    const verFilter = versionFilter.value;
    const verColor = VERSION_COLORS[verFilter] || null;

    if (verColor) {
      dlg.style.setProperty("--modal-color", verColor);
    } else {
      dlg.style.removeProperty("--modal-color");
    }

    modalTitle.textContent = I18n.getName(d).toUpperCase();
    I18n.setModalTitle(modalTitle.textContent);
    modalIcon.src =
      d.sprites.default ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${d.name}.png`;

    kvCost.textContent = d.cost
      ? `${d.cost} ₽`
      : I18n.t("items.not_sold", "No a la venta");

    // Process Machines logic to find the move
    let targetMachineUrl = null;
    let targetVgName = "-";

    if (d.machines && d.machines.length > 0) {
      let machineEntry = d.machines[0];
      if (verFilter) {
        const found = d.machines.find(
          (m) => m.version_group.name === verFilter,
        );
        if (found) machineEntry = found;
      }
      targetMachineUrl = machineEntry.machine.url;
      targetVgName = I18n.toTitle(
        machineEntry.version_group.name.replace(/-/g, " "),
      );
    }

    kvVersion.textContent = targetVgName;

    moveType.textContent = "Cargando...";
    moveType.className = "type-badge bg-secondary";
    moveType.style.backgroundColor = "";

    if (targetMachineUrl) {
      try {
        const mRes = await window.fetchCached(targetMachineUrl);
        const moveUrl = mRes.move.url;
        const moveRes = await window.fetchCached(moveUrl);

        const mNames =
          window.MOVE_NAMES && window.MOVE_NAMES[moveRes.name]
            ? window.MOVE_NAMES[moveRes.name][I18n.currentLang] ||
              window.MOVE_NAMES[moveRes.name]["en"]
            : I18n.toTitle(moveRes.name);

        kvMove.textContent = mNames;

        moveType.textContent = I18n.t(
          `types.${moveRes.type.name}`,
          I18n.toTitle(moveRes.type.name),
        );
        moveType.className = `type-badge type-${moveRes.type.name}`;

        moveDamageClass.textContent = I18n.t(
          `modal.${moveRes.damage_class?.name}`,
          moveRes.damage_class?.name || "-",
        );

        // Adjust badges based on damage class
        if (moveRes.damage_class?.name === "physical")
          moveDamageClass.className = "badge bg-danger";
        else if (moveRes.damage_class?.name === "special")
          moveDamageClass.className = "badge bg-info text-dark";
        else moveDamageClass.className = "badge bg-secondary";

        movePower.textContent = moveRes.power !== null ? moveRes.power : "-";
        moveAccuracy.textContent =
          moveRes.accuracy !== null ? moveRes.accuracy : "-";
        movePP.textContent = moveRes.pp !== null ? moveRes.pp : "-";

        const esMoveEntries = moveRes.flavor_text_entries.filter(
          (e) => e.language.name === I18n.currentLang,
        );
        const enMoveEntries = moveRes.flavor_text_entries.filter(
          (e) => e.language.name === "en",
        );
        const entry =
          esMoveEntries.length > 0
            ? esMoveEntries[esMoveEntries.length - 1]
            : enMoveEntries[enMoveEntries.length - 1];

        machineEffect.textContent = entry
          ? entry.flavor_text.replace(/\f/g, " ")
          : "-";
      } catch (e) {
        kvMove.textContent = "-";
        machineEffect.textContent = I18n.t(
          "common.error_loading",
          "Error cargando datos.",
        );
        console.error(e);
      }
    } else {
      kvMove.textContent = "-";
      machineEffect.textContent = "-";
      ["movePower", "moveAccuracy", "movePP"].forEach(
        (id) => (document.getElementById(id).textContent = "-"),
      );
    }

    dlg.showModal();
  }
})();
