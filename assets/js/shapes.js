(() => {
  const API = "https://pokeapi.co/api/v2";

  // DOM
  const grid = document.getElementById("shapesGrid");
  const empty = document.getElementById("shapesEmpty");

  const dlg = document.getElementById("shapeModal");
  const modalTitle = document.getElementById("modalTitle");

  const kvCount = document.getElementById("kvCount");
  const pokemonList = document.getElementById("shapePokemonList");

  // State
  let ALL_SHAPES = [];

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => {
    if (ALL_SHAPES.length > 0) renderItems(ALL_SHAPES);
  });

  async function init() {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
      <div class="spinner"></div>
      <div style="color: var(--c-text-muted);">${I18n.t("common.loading")}</div>
    </div>`;

    try {
      const res = await window.fetchCached(`${API}/pokemon-shape?limit=20`);

      const promises = res.results.map((r) => window.fetchCached(r.url));
      const details = await Promise.all(promises);

      ALL_SHAPES = details.map((d) => {
        return {
          ...d,
          getDisplayName: () => {
            const local = I18n.t("biology.shapes." + d.name);
            return local !== "biology.shapes." + d.name
              ? local
              : I18n.getName(d);
          },
        };
      });

      renderItems(ALL_SHAPES);

      // Event Listeners
    } catch (e) {
      console.error("Error loading shapes", e);
    }

    // Support Hash Routing: #shape/name
    if (location.hash.startsWith("#shape/")) {
      const shpName = location.hash.split("/")[1];
      const shp = ALL_SHAPES.find((s) => s.name === shpName);
      if (shp) openModal(shp);
    }

    document
      .querySelectorAll("[data-close-modal]")
      .forEach((b) => b.addEventListener("click", () => dlg && dlg.close()));

    if (dlg) {
      dlg.addEventListener("click", (e) => {
        if (e.target === dlg) dlg.close();
      });
      dlg.addEventListener("close", () => {
        history.replaceState(null, "", "shapes.html");
        I18n.clearModalTitle();
      });
    }
  }

  function getIconByValue(name) {
    const map = {
      ball: "circle",
      squiggle: "activity",
      fish: "fish",
      arms: "hand",
      blob: "cloud",
      upright: "accessibility",
      legs: "footprints",
      quadruped: "dog",
      wings: "bird",
      tentacles: "wind",
      heads: "users",
      humanoid: "user",
      "bug-wings": "bug",
      armor: "shield",
    };
    return map[name] || "shapes";
  }

  function renderItems(items) {
    grid.innerHTML = "";
    if (items.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    const frag = document.createDocumentFragment();
    items.forEach((d) => {
      const card = document.createElement("article");
      card.className = "shape-card grid-item-enter";
      card.innerHTML = `
          <div class="card-icon-wrapper">
              <i data-lucide="${getIconByValue(d.name)}" class="card-icon"></i>
          </div>
          <div class="item-name">${d.getDisplayName()}</div>
          <div class="species-count">${d.pokemon_species.length} ${I18n.t(
            "shapes.pokemon_count",
          )}</div>
      `;
      card.onclick = () => openModal(d);
      frag.appendChild(card);
    });

    grid.appendChild(frag);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  function openModal(d) {
    modalTitle.textContent = d.getDisplayName();
    I18n.setModalTitle(modalTitle.textContent);
    kvCount.textContent = d.pokemon_species.length;
    history.replaceState(null, "", `#shape/${d.name}`);

    pokemonList.innerHTML = `<span class="text-muted">${I18n.t("common.loading", "Cargando...")}</span>`;

    setTimeout(() => {
      pokemonList.innerHTML = "";
      if (d.pokemon_species && d.pokemon_species.length > 0) {
        const speciesLinks = [...d.pokemon_species].sort((a, b) => {
          return (
            parseInt(a.url.split("/").slice(-2)[0], 10) -
            parseInt(b.url.split("/").slice(-2)[0], 10)
          );
        });

        const domFrag = document.createDocumentFragment();
        for (const s of speciesLinks) {
          const num = parseInt(s.url.split("/").slice(-2)[0], 10);
          const link = document.createElement("a");
          link.className = "pokemon-badge";
          link.href = `${I18n.getBasePath()}index.html#pokemon/${num}`;
          link.target = "_blank";

          const sprUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png`;

          link.innerHTML = `
                      <img src="${sprUrl}" onerror="this.style.display='none'" class="d-inline-block align-middle me-1" style="width:30px; height:30px; margin-top:-5px;">
                      ${I18n.toTitle(s.name)}
                  `;

          domFrag.appendChild(link);
        }
        pokemonList.appendChild(domFrag);
      } else {
        pokemonList.innerHTML = `<span class="text-muted">${I18n.t("shapes.no_pokemon", "No hay Pokémon con esta forma.")}</span>`;
      }
    }, 100);

    dlg.showModal();
  }
})();
