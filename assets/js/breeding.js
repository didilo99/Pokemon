(() => {
  const API = "https://pokeapi.co/api/v2";

  // DOM
  const grid = document.getElementById("breedingGrid");
  const empty = document.getElementById("breedingEmpty");

  const dlg = document.getElementById("breedingModal");
  const modalTitle = document.getElementById("modalTitle");

  const kvCount = document.getElementById("kvCount");
  const breedingPokemonList = document.getElementById("breedingPokemonList");

  // State
  let ALL_GROUPS = [];

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => {
    if (ALL_GROUPS.length > 0) renderItems(ALL_GROUPS);
  });

  async function init() {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
      <div class="spinner"></div>
      <div style="color: var(--c-text-muted);">${I18n.t("common.loading")}</div>
    </div>`;

    try {
      const res = await window.fetchCached(`${API}/egg-group?limit=20`);

      // Resolve details for species count
      const promises = res.results.map((r) => window.fetchCached(r.url));
      const details = await Promise.all(promises);

      ALL_GROUPS = details.map((d) => {
        return {
          ...d,
          getDisplayName: () => {
            const local = I18n.t("biology.egg_groups." + d.name);
            return local !== "biology.egg_groups." + d.name
              ? local
              : I18n.getName(d);
          },
        };
      });

      renderItems(ALL_GROUPS);

      // Event Listeners
    } catch (e) {
      console.error("Error loading egg groups", e);
    }

    // Modal close listeners
    document
      .querySelectorAll("[data-close-modal]")
      .forEach((b) => b.addEventListener("click", () => dlg && dlg.close()));

    if (dlg) {
      dlg.addEventListener("click", (e) => {
        if (e.target === dlg) dlg.close();
      });
      dlg.addEventListener("close", () => I18n.clearModalTitle());
    }
  }

  function getIconByValue(name) {
    const map = {
      monster: "skull",
      water1: "waves",
      water2: "waves",
      water3: "waves",
      bug: "bug",
      flying: "wind",
      ground: "mountain",
      fairy: "sparkles",
      plant: "leaf",
      humanshape: "user",
      mineral: "gem",
      indeterminate: "ghost",
      ditto: "copy",
      dragon: "flame",
      "no-eggs": "help-circle",
    };
    return map[name] || "egg";
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
      card.className = "interactive-card grid-item-enter";

      const count = d.pokemon_species.length;

      card.innerHTML = `
          <div class="card-icon-wrapper">
              <i data-lucide="${getIconByValue(d.name)}" class="card-icon"></i>
          </div>
          <div class="item-name">${d.getDisplayName()}</div>
      `;
      card.onclick = () => openBreedingModal(d);
      frag.appendChild(card);
    });

    grid.appendChild(frag);
    if (typeof lucide !== "undefined") lucide.createIcons({ root: grid });
  }

  function openBreedingModal(d) {
    modalTitle.textContent = d.getDisplayName();
    I18n.setModalTitle(modalTitle.textContent);
    kvCount.textContent = d.pokemon_species.length;

    breedingPokemonList.innerHTML = `<span class="text-muted">${I18n.t("common.loading", "Cargando...")}</span>`;

    setTimeout(async () => {
      breedingPokemonList.innerHTML = "";
      if (d.pokemon_species && d.pokemon_species.length > 0) {
        const speciesLinks = [...d.pokemon_species].sort((a, b) => {
          let numA = parseInt(a.url.split("/").slice(-2)[0], 10);
          let numB = parseInt(b.url.split("/").slice(-2)[0], 10);
          return numA - numB;
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
        breedingPokemonList.appendChild(domFrag);
      } else {
        breedingPokemonList.innerHTML = `<span class="text-muted">${I18n.t("breeding.no_pokemon", "No hay Pokémon en este grupo.")}</span>`;
      }
    }, 100);

    dlg.showModal();
  }
})();
