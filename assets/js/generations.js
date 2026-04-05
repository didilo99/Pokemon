/**
 * Generations Page
 * Displays all Pokémon generations with their regions and games
 */

(() => {
  const API = "https://pokeapi.co/api/v2";
  const GENERATION_COUNT = 9;
  const POKEMON_PER_PAGE = 24;

  // Version groups blacklisted in games.js — must stay in sync
  const VG_BLACKLIST = [
    "the-hidden-treasure-of-area-zero",
    "red-green-japan",
    "blue-japan",
    "mega-dimension",
  ];

  // DOM Elements - Grid
  const grid = document.getElementById("generationsGrid");
  const emptyState = document.getElementById("generationsEmpty");

  // DOM Elements - Modal
  const modal = document.getElementById("generationModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const modalLoading = document.getElementById("modalLoading");
  const modalData = document.getElementById("modalData");

  // Modal Stats
  const speciesCount = document.getElementById("speciesCount");
  const movesCount = document.getElementById("movesCount");
  const abilitiesCount = document.getElementById("abilitiesCount");
  const typesCount = document.getElementById("typesCount");

  // Modal Content
  const versionsList = document.getElementById("versionsList");
  const pokemonList = document.getElementById("pokemonList");
  const pokemonSearch = document.getElementById("pokemonSearch");

  // Pagination
  const paginationControls = document.getElementById("paginationControls");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const paginationInfo = document.getElementById("paginationInfo");

  let ALL_GENERATIONS = [];
  let CURRENT_POKEMON = [];
  let FILTERED_POKEMON = [];
  let currentPage = 1;
  let totalPages = 1;

  // --- Initialization ---
  async function init() {
    if (grid) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <div class="spinner"></div>
        <div style="color: var(--c-text-muted);">${I18n.t("common.loading")}</div>
      </div>`;
    }

    try {
      // Wait for translations to be loaded
      if (!I18n.translations || Object.keys(I18n.translations).length === 0) {
        await new Promise((resolve) => {
          // Check if already loaded while we were setting up
          if (I18n.translations && Object.keys(I18n.translations).length > 0) {
            return resolve();
          }
          const onLang = () => {
            window.removeEventListener("languageChanged", onLang);
            resolve();
          };
          window.addEventListener("languageChanged", onLang);
          // Safety timeout
          setTimeout(onLang, 2000);
        });
      }

      // Fetch all generations with individual error handling
      const promises = [];
      for (let i = 1; i <= GENERATION_COUNT; i++) {
        promises.push(
          window.fetchCached(`${API}/generation/${i}`).catch((err) => {
            console.warn(`Failed to fetch generation ${i}:`, err);
            return null;
          }),
        );
      }

      const results = await Promise.all(promises);
      ALL_GENERATIONS = results.filter((g) => g !== null);

      if (ALL_GENERATIONS.length === 0) {
        throw new Error("No generations loaded");
      }

      ALL_GENERATIONS.forEach((g) => {
        // PokeAPI resource objects include an 'id' property directly.
        if (g.id === undefined && g.url) {
          try {
            g.id = parseInt(g.url.split("/").filter(Boolean).pop());
          } catch (e) {
            console.error("Error parsing ID for generation", g);
          }
        }

        g.getDisplayName = () => {
          const genLabel =
            (window.I18n && I18n.t("abilities.generation")) || "Generación";
          let genNum = "";
          if (g.name && g.name.includes("-")) {
            genNum = g.name.split("-")[1].toUpperCase();
          } else {
            genNum = g.id || "?";
          }
          return `${genLabel} ${genNum}`;
        };
      });

      // Sort by ID to ensure correct order
      ALL_GENERATIONS.sort((a, b) => a.id - b.id);

      renderGrid(ALL_GENERATIONS);

      // Event Listeners
      closeModalBtn.addEventListener("click", closeGenerationModal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeGenerationModal();
      });
      modal.addEventListener("cancel", closeGenerationModal);
      modal.addEventListener("close", () => I18n.clearModalTitle());

      pokemonSearch.addEventListener("input", () => {
        filterPokemon();
        currentPage = 1; // Reset to first page
        renderPokemonPage();
      });

      prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          renderPokemonPage();
        }
      });

      nextPageBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderPokemonPage();
        }
      });
    } catch (error) {
      console.error("Initialization error:", error);
      if (grid) {
        grid.innerHTML = `<p class="error" style="text-align: center; color: var(--c-text-muted); padding: 2rem;">${I18n.t(
          "common.error_loading",
        )}</p>`;
      }
    }

    // Reactivity
    window.addEventListener("languageChanged", () => {
      if (ALL_GENERATIONS.length > 0) renderGrid(ALL_GENERATIONS);
    });
  }

  // --- Rendering Grid ---
  async function renderGrid(list) {
    grid.innerHTML = "";

    if (list.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const frag = document.createDocumentFragment();

    // Use for...of to await each card creation
    for (const gen of list) {
      const card = await createGenerationCard(gen);
      frag.appendChild(card);
    }

    grid.appendChild(frag);
  }

  async function createGenerationCard(data) {
    try {
      const card = document.createElement("div");
      card.className = "card interactive-card grid-item-enter";
      card.style.cursor = "pointer";

      // Extract generation number (e.g., "generation-i" -> "I")
      const genNumber = data.name.split("-")[1].toUpperCase();
      const mainRegion = data.main_region
        ? I18n.t("regions.names." + data.main_region.name) ||
          toTitle(data.main_region.name)
        : "—";
      const speciesCount = data.pokemon_species.length;

      let versionString = "";
      let moreVersions = "";
      let allVersions = [];

      try {
        // Get individual versions from version groups (excluding blacklisted)
        const validGroups = data.version_groups.filter(
          (vg) => !VG_BLACKLIST.includes(vg.name),
        );
        const versionPromises = validGroups.map((vg) =>
          window.fetchCached(vg.url).catch(() => null),
        );

        const vgDatas = await Promise.all(versionPromises);
        allVersions = vgDatas
          .filter((vg) => vg && vg.versions)
          .flatMap((vg) => vg.versions);

        if (allVersions.length > 0) {
          // Get localized names for first few versions to show on card
          const displayVersions = await Promise.all(
            allVersions
              .slice(0, 3)
              .map((v) =>
                window
                  .getLocalizedName(v.url, "version")
                  .catch(() => toTitle(v.name)),
              ),
          );

          versionString = displayVersions.join(", ");
          moreVersions =
            allVersions.length > 3 ? ` +${allVersions.length - 3}` : "";
        } else {
          // Fallback to version group names if versions couldn't be fetched
          versionString = validGroups
            .slice(0, 3)
            .map((vg) => toTitle(vg.name))
            .join(", ");
          moreVersions =
            validGroups.length > 3 ? ` +${validGroups.length - 3}` : "";
        }
      } catch (err) {
        versionString = validGroups
          .slice(0, 3)
          .map((vg) => toTitle(vg.name))
          .join(", ");
      }

      card.innerHTML = `
        <div class="id">Gen ${genNumber}</div>
        <div class="gen-num-bg">
          ${genNumber}
        </div>
        <h4 class="name">${
          I18n.t("generations.title").split(" ")[0]
        } ${genNumber}</h4>
        <div style="margin-top: 0.5rem; text-align: center;">
          <div style="font-size: 0.85rem; color: var(--c-text-muted); margin-bottom: 0.5rem;">
            <strong>${I18n.t("generations.region")}:</strong> ${mainRegion}
          </div>
          <div style="font-size: 0.85rem; color: var(--c-text-muted); margin-bottom: 0.5rem;">
            <strong>${I18n.t(
              "generations.new_species",
            )}:</strong> ${speciesCount}
          </div>
          <div style="font-size: 0.75rem; color: var(--c-text-muted);">
            ${versionString}${moreVersions}
          </div>
        </div>
      `;

      // Click handler to open modal
      card.addEventListener("click", () => openGenerationModal(data));

      return card;
    } catch (error) {
      // Return a very basic card instead of throwing
      const errorCard = document.createElement("div");
      errorCard.className = "card";
      errorCard.textContent = "Error loading generation";
      return errorCard;
    }
  }

  // --- Modal Logic ---
  async function openGenerationModal(genData) {
    // Show modal and loading state
    modal.showModal();
    modalLoading.hidden = false;
    modalData.hidden = true;
    pokemonSearch.value = "";
    currentPage = 1;

    // Extract generation number
    const genNumber = genData.name.split("-")[1].toUpperCase();
    const mainRegion = genData.main_region
      ? I18n.t("regions.names." + genData.main_region.name) ||
        I18n.toTitle(genData.main_region.name)
      : I18n.t("common.unknown_region");

    // Set header info
    modalTitle.textContent = `${
      I18n.t("generations.title").split(" ")[0]
    } ${genNumber}`;
    I18n.setModalTitle(modalTitle.textContent);
    modalSubtitle.textContent = mainRegion;

    try {
      // Update stats
      speciesCount.textContent = genData.pokemon_species.length;
      movesCount.textContent = genData.moves.length;
      abilitiesCount.textContent = genData.abilities.length;
      typesCount.textContent = genData.types.length;

      // Render versions (not version groups)
      await renderVersions(genData.version_groups);

      // Store and render Pokémon - Sort by Pokédex number
      // Extract ID from URL (e.g., ".../pokemon-species/25/" -> 25)
      const pokemonWithIds = genData.pokemon_species.map((sp) => {
        const id = parseInt(sp.url.split("/").filter(Boolean).pop());
        return { name: sp.name, id: id };
      });

      // Sort by Pokédex ID
      pokemonWithIds.sort((a, b) => a.id - b.id);

      CURRENT_POKEMON = pokemonWithIds;
      FILTERED_POKEMON = [...CURRENT_POKEMON];
      totalPages = Math.ceil(FILTERED_POKEMON.length / POKEMON_PER_PAGE);
      renderPokemonPage();

      // Show data
      modalLoading.hidden = true;
      modalData.hidden = false;
    } catch (error) {
      modalTitle.textContent = "Error";
      modalSubtitle.textContent = I18n.t("common.error_loading");
      modalLoading.hidden = true;
    }
  }

  function closeGenerationModal() {
    modal.close();
    pokemonList.innerHTML = "";
    versionsList.innerHTML = "";
    modalLoading.hidden = false;
    modalData.hidden = true;
    CURRENT_POKEMON = [];
    FILTERED_POKEMON = [];
    currentPage = 1;
  }

  async function renderVersions(versionGroups) {
    versionsList.innerHTML = "";

    const frag = document.createDocumentFragment();
    const pokemonPrefix = I18n.t("nav.pokemon");

    try {
      // Filter out blacklisted version groups before processing
      const validGroups = versionGroups.filter(
        (vg) => !VG_BLACKLIST.includes(vg.name),
      );

      // Get all individual versions
      const versionPromises = validGroups.map((vg) =>
        window.fetchCached(vg.url).catch(() => null),
      );

      const vgDatas = await Promise.all(versionPromises);
      const allVersions = vgDatas
        .filter((vg) => vg && vg.versions)
        .flatMap((vg) => vg.versions);

      if (allVersions.length > 0) {
        // Fetch localized names and individual version objects
        const versionDetails = await Promise.all(
          allVersions.map(async (v) => {
            try {
              const name = await window.getLocalizedName(v.url, "version");
              return { name: name || toTitle(v.name), slug: v.name };
            } catch {
              return { name: toTitle(v.name), slug: v.name };
            }
          }),
        );

        versionDetails.forEach((v) => {
          const badge = document.createElement("a");
          badge.href = `games.html?game=${v.slug}`;
          badge.target = "_blank";
          badge.className = "game-badge";

          // Prefix with "Pokémon" if not already present
          let fullName = v.name;
          if (
            !v.name.toLowerCase().includes("pokemon") &&
            !v.name.toLowerCase().includes("pokémon")
          ) {
            fullName = `${pokemonPrefix} ${v.name}`;
          }

          badge.textContent = fullName;
          frag.appendChild(badge);
        });
      } else {
        // Fallback to version group names
        validGroups.forEach((vg) => {
          const badge = document.createElement("span");
          badge.className = "game-badge";
          badge.textContent = toTitle(vg.name);
          frag.appendChild(badge);
        });
      }
    } catch (err) {
      // Last resort: show something
      const fallbackGroups = versionGroups.filter(
        (vg) => !VG_BLACKLIST.includes(vg.name),
      );
      fallbackGroups.forEach((vg) => {
        const badge = document.createElement("span");
        badge.className = "game-badge";
        badge.textContent = toTitle(vg.name);
        frag.appendChild(badge);
      });
    }

    versionsList.appendChild(frag);
  }

  function filterPokemon() {
    const query = pokemonSearch.value;

    if (!query.trim()) {
      FILTERED_POKEMON = [...CURRENT_POKEMON];
    } else {
      FILTERED_POKEMON = I18n.smartSearch(CURRENT_POKEMON, query, (p) => [
        p.name,
      ]);
    }

    totalPages = Math.ceil(FILTERED_POKEMON.length / POKEMON_PER_PAGE);
  }

  function renderPokemonPage() {
    pokemonList.innerHTML = "";

    // Calculate start and end indices
    const startIdx = (currentPage - 1) * POKEMON_PER_PAGE;
    const endIdx = Math.min(
      startIdx + POKEMON_PER_PAGE,
      FILTERED_POKEMON.length,
    );
    const pagePokemon = FILTERED_POKEMON.slice(startIdx, endIdx);

    // Create fragment
    const frag = document.createDocumentFragment();

    if (pagePokemon.length === 0) {
      const emptyMsg = document.createElement("p");
      emptyMsg.style.cssText =
        "text-align: center; color: var(--c-text-muted); padding: 2rem; grid-column: 1 / -1;";
      emptyMsg.textContent = I18n.t("common.no_results");
      frag.appendChild(emptyMsg);
    } else {
      // Get the generation number from the modal title to apply specific styles if needed
      // const genClass = `gen-${modalTitle.textContent.split(" ")[1].toLowerCase()}`;

      pagePokemon.forEach((pokemon) => {
        // pokemon is now an object { name, id }
        // If it's just a string (from search filtering), we need to find the ID
        let id = pokemon.id;
        let name = pokemon.name;

        // Fallback if we only have the name string (shouldn't happen with current logic but good for safety)
        if (typeof pokemon === "string") {
          name = pokemon;
          // Try to find ID from ALL_GENERATIONS or just use a placeholder
          // For simplicity in this specific flow, we assume we have the object
          // If not, we can't easily get the ID without looking it up
          id = "???";
        }

        const card = document.createElement("a");
        card.href = `${I18n.getBasePath()}index.html#pokemon/${name}`;
        card.target = "_blank";
        card.className = "gen-poke-card";

        // Sprite URL (using official artwork or sprite)
        const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

        const nameSpan = document.createElement("span");
        // User request: Don't translate pokemon names, use API name (formatted)
        nameSpan.textContent = toTitle(name);

        card.innerHTML = `
          <span class="pid">#${id}</span>
          <img src="${spriteUrl}" loading="lazy" alt="${name}">
        `;
        card.appendChild(nameSpan);

        frag.appendChild(card);
      });
    }

    pokemonList.appendChild(frag);

    // Update pagination controls
    updatePaginationControls();
  }

  function updatePaginationControls() {
    // Update info text
    paginationInfo.textContent = `${I18n.t(
      "common.paginator",
      currentPage,
      totalPages,
    )} (${FILTERED_POKEMON.length} Pokémon)`;

    // Update button states
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    // Hide pagination if only one page
    paginationControls.style.display = totalPages <= 1 ? "none" : "flex";
  }

  // --- Helpers ---
  function toTitle(str) {
    return str.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Start
  init();
})();
