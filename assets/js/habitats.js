(() => {
  const API = "https://pokeapi.co/api/v2";

  // DOM
  const grid = document.getElementById("habitatsGrid");
  const empty = document.getElementById("habitatsEmpty");

  const dlg = document.getElementById("habitatModal");
  const modalTitle = document.getElementById("modalTitle");

  const kvCount = document.getElementById("kvCount");
  const pokemonList = document.getElementById("habitatPokemonList");

  // State
  let ALL_HABITATS = [];

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => {
    if (ALL_HABITATS.length > 0) renderItems(ALL_HABITATS);
  });

  async function init() {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
      <div class="spinner"></div>
      <div style="color: var(--c-text-muted);">${I18n.t("common.loading")}</div>
    </div>`;

    try {
      const res = await window.fetchCached(`${API}/pokemon-habitat?limit=20`);

      const promises = res.results.map((r) => window.fetchCached(r.url));
      const details = await Promise.all(promises);

      ALL_HABITATS = details.map((d) => {
        return {
          ...d,
          getDisplayName: () => {
            const local = I18n.t("biology.habitats." + d.name);
            return local !== "biology.habitats." + d.name
              ? local
              : I18n.getName(d);
          },
        };
      });

      renderItems(ALL_HABITATS);

      // Event Listeners
    } catch (e) {
      console.error("Error loading habitats", e);
    }

    // Support Hash Routing: #habitat/name
    if (location.hash.startsWith("#habitat/")) {
      const habName = location.hash.split("/")[1];
      const hab = ALL_HABITATS.find((h) => h.name === habName);
      if (hab) openModal(hab);
    }

    // Modal close listeners
    document
      .querySelectorAll("[data-close-modal]")
      .forEach((b) => b.addEventListener("click", () => dlg && dlg.close()));

    if (dlg) {
      dlg.addEventListener("click", (e) => {
        if (e.target === dlg) dlg.close();
      });
      dlg.addEventListener("close", () => {
        history.replaceState(null, "", "habitats.html");
        I18n.clearModalTitle();
      });
    }
  }

  function getIconByValue(name) {
    const map = {
      cave: "mountain",
      forest: "trees",
      grassland: "sprout",
      mountain: "mountain-snow",
      rare: "star",
      "rough-terrain": "zap",
      sea: "anchor",
      urban: "building-2",
      "waters-edge": "droplets",
    };
    return map[name] || "map-pin";
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
      card.className = "habitat-card grid-item-enter";
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
    history.replaceState(null, "", `#habitat/${d.name}`);

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
        pokemonList.innerHTML = `<span class="text-muted">${I18n.t("habitats.no_pokemon", "No hay Pokémon en este hábitat.")}</span>`;
      }
    }, 100);

    dlg.showModal();
  }
})();
