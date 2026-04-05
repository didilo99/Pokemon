/**
 * Games Page V3 Logic - Authentic & Clean
 */

(() => {
  const API = "https://pokeapi.co/api/v2";

  // State
  let STATE = {
    allGames: [],
    favorites: JSON.parse(localStorage.getItem("pokedex_game_favs") || "[]"),
    view: "grid",
    filters: {
      search: "",
      gen: "all",
      platform: "all",
      onlyFavs: false,
      sort: "release_asc",
    },
  };

  const SETTINGS_KEY = "pokedex_games_settings";

  function saveSettings() {
    const filtersToSave = { ...STATE.filters };
    delete filtersToSave.search;
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        view: STATE.view,
        filters: filtersToSave,
      }),
    );
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.view) STATE.view = s.view;
        if (s.filters) STATE.filters = { ...STATE.filters, ...s.filters };
      }
    } catch (e) {}
  }

  // DOM Elements
  const grid = document.getElementById("gamesGrid");
  const timeline = document.getElementById("gamesTimeline");
  const searchInput = document.getElementById("gameSearch");
  const genFilter = document.getElementById("genFilter");
  const platformFilter = document.getElementById("platformFilter");
  const sortFilter = document.getElementById("sortFilter");
  const viewGridBtn = document.getElementById("viewGrid");
  const viewTimelineBtn = document.getElementById("viewTimeline");
  const emptyState = document.getElementById("gamesEmpty");
  const featuredImg = document.getElementById("featuredGameImg");
  const featuredTitle = document.getElementById("featuredGameTitle");

  // Modal Elements
  const modal = document.getElementById("gameModal");
  const modalData = document.getElementById("modalData");
  const modalLoading = document.getElementById("modalLoading");
  // NEW ELEMENTS FOR DUAL-PANE MODAL
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const modalBoxArt = document.getElementById("modalBoxArt");
  const gameSummary = document.getElementById("gameSummary");
  const startersContainer = document.getElementById("startersContainer");
  const legendariesContainer = document.getElementById("legendariesContainer");
  const launchJP = document.getElementById("launchJP");
  const launchINT = document.getElementById("launchINT");
  const platformValue = document.getElementById("platformValue");
  const favToggleBtn = document.getElementById("favToggleBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");

  function getLocalBoxArt(name) {
    const base = (window.I18n ? I18n.getBasePath() : "") + "assets/img/games";
    const mapping = {
      red: "250px-Red_EN_boxart.png",
      blue: "250px-Blue_EN_boxart.png",
      yellow: "250px-Yellow_EN_boxart.png",
      gold: "250px-Gold_EN_boxart.png",
      silver: "250px-Silver_EN_boxart.png",
      crystal: "250px-Crystal_EN_boxart.png",
      ruby: "250px-Ruby_EN_boxart.png",
      sapphire: "250px-Sapphire_EN_boxart.png",
      emerald: "250px-Emerald_EN_boxart.jpg",
      firered: "250px-FireRed_EN_boxart.png",
      leafgreen: "250px-LeafGreen_EN_boxart.png",
      diamond: "250px-Diamond_EN_boxart.jpg",
      pearl: "250px-Pearl_EN_boxart.jpg",
      platinum: "250px-Platinum_EN_boxart.png",
      heartgold: "250px-HeartGold_EN_boxart.jpg",
      soulsilver: "250px-SoulSilver_EN_boxart.jpg",
      black: "250px-Black_EN_boxart.png",
      white: "250px-White_EN_boxart.png",
      "black-2": "250px-Black_2_EN_boxart.png",
      "white-2": "250px-White_2_EN_boxart.png",
      x: "250px-X_EN_boxart.png",
      y: "250px-Y_EN_boxart.png",
      "omega-ruby": "250px-Omega_Ruby_EN_boxart.png",
      "alpha-sapphire": "250px-Alpha_Sapphire_EN_boxart.png",
      sun: "250px-Sun_EN_boxart.png",
      moon: "250px-Moon_EN_boxart.png",
      "ultra-sun": "250px-Ultra_Sun_EN_boxart.png",
      "ultra-moon": "250px-Ultra_Moon_EN_boxart.png",
      "lets-go-pikachu": "250px-Lets_Go_Pikachu_EN_boxart.png",
      "lets-go-eevee": "250px-Lets_Go_Eevee_EN_boxart.png",
      sword: "250px-Sword_EN_boxart.png",
      shield: "250px-Shield_EN_boxart.png",
      "brilliant-diamond": "250px-Brilliant_Diamond_EN_boxart.png",
      "shining-pearl": "250px-Shining_Pearl_EN_boxart.png",
      "legends-arceus": "250px-Legends_Arceus_EN_boxart.png",
      "legends-za": "250px-Legends_Z-A_Nintendo_Switch_2_Edition_EN_boxart.png",
      scarlet: "250px-Scarlet_EN_boxart.png",
      violet: "250px-Violet_EN_boxart.png",
      colosseum: "250px-Colosseum_EN_boxart.png",
      xd: "250px-XD_EN_boxart.jpg",
      "the-isle-of-armor": "SwSh_eShop_The_Isle_of_Armor.jpg",
      "the-crown-tundra": "SwSh_eShop_The_Crown_Tundra.jpg",
      "the-teal-mask": "SV_eShop_Part_1_The_Teal_Mask.jpg",
      "the-indigo-disk": "SV_eShop_Part_2_The_Indigo_Disk.jpg",
      "red-japan": "250px-Red_JP_boxart.png",
      "green-japan": "250px-Green_JP_boxart.png",
      "blue-japan": "250px-Blue_JP_boxart.png",
      "mega-dimension": "250px-LZA_MD_KO.png",
    };

    return mapping[name] ? `${base}/${mapping[name]}` : null;
  }

  // --- Init ---
  async function init() {
    try {
      if (!window.I18n || !I18n.translations) {
        await new Promise((r) =>
          window.addEventListener("languageChanged", r, { once: true }),
        );
      }

      loadSettings();

      // UI Sync
      if (searchInput) searchInput.value = STATE.filters.search;
      if (genFilter) genFilter.value = STATE.filters.gen;
      if (platformFilter) platformFilter.value = STATE.filters.platform;
      if (sortFilter) sortFilter.value = STATE.filters.sort;
      switchView(STATE.view);

      // 1. Fetch Version Groups
      const groupRes = await window.fetchCached(
        `${API}/version-group?limit=100`,
      );
      const dlcBlacklist = ["the-hidden-treasure-of-area-zero"];

      const groupDetailPromises = groupRes.results
        .filter((vg) => !dlcBlacklist.includes(vg.name))
        .map((vg) => window.fetchCached(vg.url));
      const groups = await Promise.all(groupDetailPromises);

      // 2. Flatten into individual versions (WITHOUT fetching 80 details up front)
      const versionsList = [];
      groups.forEach((group) => {
        group.versions.forEach((v) => {
          try {
            // RICH_GAMES_DATA still keys off group name or version name
            const extra =
              (window.RICH_GAMES_DATA &&
                (window.RICH_GAMES_DATA[v.name] ||
                  window.RICH_GAMES_DATA[group.name])) ||
              {};

            const localBoxArt = getLocalBoxArt(v.name);
            const id = parseInt(v.url.split("/").filter(Boolean).pop());

            versionsList.push({
              ...group, // Inherit group properties (generation, platform, etc.)
              ...extra, // Apply rich data (summary, starters, etc.)
              boxArt: localBoxArt || extra.boxArt || "",
              id: id,
              name: v.name, // The unique version name (e.g., 'red')
              groupName: group.name,
              names: extra.names || [], // Use extra names if available
              localizedName: window.I18n ? window.I18n.toTitle(v.name) : v.name,
              url: v.url
            });
          } catch (e) {
            console.warn(`Skipping version ${v.name} due to error`, e);
          }
        });
      });

      STATE.allGames = versionsList;

      // Inyectar manualmente juegos que solo existen en local (como remakes exclusivos, green-japan, legends-za...)
      if (window.RICH_GAMES_DATA) {
        Object.keys(window.RICH_GAMES_DATA).forEach((key, idx) => {
          if (!STATE.allGames.find((g) => g.name === key)) {
            const extra = window.RICH_GAMES_DATA[key];
            const isGen1 = ["red-japan", "green-japan", "blue-japan"].includes(
              key,
            );

            STATE.allGames.push({
              ...extra,
              id: isGen1 ? idx / 1000 : 9000 + idx, // IDs artificiales menores a 1 para asegurar que Gen 1 JPN vaya primero en empates de fecha
              name: key,
              groupName: key,
              localizedName: window.I18n ? window.I18n.toTitle(key) : key,
              generation: {
                name: isGen1 ? "generation-i" : "generation-unknown",
                url: isGen1 ? "https://pokeapi.co/api/v2/generation/1/" : "",
              },
              boxArt: getLocalBoxArt(key) || extra.boxArt || "",
            });
          }
        });
      }

      sortGames(STATE.allGames);
      updateFeatured();
      setupEvents();
      applyFilters();

      // NEW: Check for game parameter in URL to open modal on load
      const urlParams = new URLSearchParams(window.location.search);
      const gameParam = urlParams.get("game");
      if (gameParam) {
        const game = STATE.allGames.find((g) => g.name === gameParam);
        if (game) {
          setTimeout(() => openDetails(game), 300);
        }
      }
    } catch (err) {
      console.error("INIT ERROR:", err);
    }
  }

  function sortGames(list) {
    list.sort((a, b) => {
      // Forzamos estrictamente usar la fecha JPN y la comparamos alfabéticamente (YYYY-MM-DD funciona perfecto con localeCompare)
      const dateA =
        a.releaseDate && a.releaseDate.jpn && a.releaseDate.jpn !== "-"
          ? a.releaseDate.jpn
          : "9999-99-99";
      const dateB =
        b.releaseDate && b.releaseDate.jpn && b.releaseDate.jpn !== "-"
          ? b.releaseDate.jpn
          : "9999-99-99";

      let diff = dateA.localeCompare(dateB);

      // Desempate usando el ID
      if (diff === 0) {
        diff = (a.id || 9999) - (b.id || 9999);
      }
      return diff;
    });
  }

  function updateFeatured() {
    const mainGames = STATE.allGames.filter((g) => g.boxArt);
    if (mainGames.length === 0) return;

    // If we already have a featured image, try to keep it but update the name (for translation)
    const currentSrc = featuredImg.getAttribute("src");
    let featured = mainGames.find((g) => g.boxArt === currentSrc);

    if (!featured) {
      featured = mainGames[Math.floor(Math.random() * mainGames.length)];
    }

    if (featured) {
      featuredImg.src = featured.boxArt;
      featuredImg.classList.remove("skeleton");
      featuredTitle.textContent =
        featured.localizedName || toTitle(featured.name);
    }
  }

  function setupEvents() {
    searchInput.addEventListener("input", (e) => {
      STATE.filters.search = e.target.value.toLowerCase();
      applyFilters();
      saveSettings();
    });

    genFilter.addEventListener("change", (e) => {
      STATE.filters.gen = e.target.value;
      applyFilters();
      saveSettings();
    });

    platformFilter.addEventListener("change", (e) => {
      STATE.filters.platform = e.target.value;
      applyFilters();
      saveSettings();
    });

    if (sortFilter) {
      sortFilter.addEventListener("change", (e) => {
        STATE.filters.sort = e.target.value;
        applyFilters();
        saveSettings();
      });
    }

    viewGridBtn.addEventListener("click", () => {
      switchView("grid");
      saveSettings();
    });
    viewTimelineBtn.addEventListener("click", () => {
      switchView("timeline");
      saveSettings();
    });

    closeModalBtn.addEventListener("click", () => {
      modal.close();
      history.pushState(null, "", "games.html");
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.close();
        history.pushState(null, "", "games.html");
      }
    });
    modal.addEventListener("close", () => I18n.clearModalTitle());

    window.addEventListener("popstate", () => {
      const urlParams = new URLSearchParams(window.location.search);
      const gameParam = urlParams.get("game");
      if (gameParam) {
        const game = STATE.allGames.find((g) => g.name === gameParam);
        if (game) openDetails(game, true);
      } else {
        modal.close();
      }
    });

    window.addEventListener("languageChanged", () => {
      // 1. Re-localize all game names in state
      STATE.allGames.forEach((g) => {
        g.localizedName = window.I18n.getName({ names: g.names, name: g.name });
      });

      // 2. Update static labels (even inside modal if open)
      window.I18n.applyTranslations();

      // 3. Update featured section
      updateFeatured();

      // 4. Update modal content if open
      // Since modalTitle text might have changed or we want to re-localize it
      // we check if the modal is open. If so, we re-apply content for the currently open game
      // (a bit hacky but works given the current structure)
      if (modal.open) {
        // We can find the game by looking at the URL param which is reliable
        const urlParams = new URLSearchParams(window.location.search);
        const gameName = urlParams.get("game");
        const openGame = STATE.allGames.find(g => g.name === gameName);
        if (openGame) updateModalContent(openGame);
      }

      // 5. Re-render list
      applyFilters();
    });

    const exploreBtn = document.getElementById("exploreBtn");
    const favoritesBtn = document.getElementById("favoritesBtn");

    const scrollToGrid = () => {
      const el = document.getElementById("controlsPanel");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    };

    if (exploreBtn) {
      exploreBtn.addEventListener("click", scrollToGrid);
    }

    if (favoritesBtn) {
      favoritesBtn.addEventListener("click", () => {
        STATE.filters.onlyFavs = !STATE.filters.onlyFavs;
        favoritesBtn.classList.toggle("active", STATE.filters.onlyFavs);
        applyFilters();
        scrollToGrid();
      });
    }
  }

  function switchView(type) {
    STATE.view = type;
    viewGridBtn.classList.toggle("active", type === "grid");
    viewTimelineBtn.classList.toggle("active", type === "timeline");
    applyFilters();
  }

  function applyFilters() {
    let result = [...STATE.allGames];

    // 1. Smart Search (Weighted & Normalized)
    if (STATE.filters.search.trim()) {
      result = I18n.smartSearch(result, STATE.filters.search, (g) => [
        g.localizedName || "",
        g.name || "",
      ]);
    }

    // 2. Attribute Filters
    const filtered = result.filter((g) => {
      const genNum = (g.generation?.url || "").split("/").filter(Boolean).pop();
      const matchesGen =
        STATE.filters.gen === "all" || genNum === STATE.filters.gen;
      const matchesPlatform =
        STATE.filters.platform === "all" ||
        (g.platform &&
          g.platform.toLowerCase().includes(STATE.filters.platform));
      const matchesFav =
        !STATE.filters.onlyFavs || STATE.favorites.includes(g.name);
      return matchesGen && matchesPlatform && matchesFav;
    });

    sortGames(filtered);

    if (STATE.view === "grid") {
      renderGrid(filtered);
    } else {
      renderTimeline(filtered);
    }

    emptyState.hidden = filtered.length > 0;

    emptyState.hidden = filtered.length > 0;
  }

  function renderGrid(list) {
    grid.hidden = false;
    timeline.hidden = true;
    grid.innerHTML = "";
    
    const frag = document.createDocumentFragment();

    list.forEach((game) => {
      const card = document.createElement("div");
      card.className = "game-card-v2 grid-item-enter";
      const isFav = STATE.favorites.includes(game.name);

      card.innerHTML = `
            <div class="card-banner">
                <img src="${game.boxArt || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"}" alt="${game.name}" loading="lazy" />
                <button class="fav-overlay-btn ${isFav ? "active" : ""}" title="${isFav ? I18n.t("games.remove_fav") : I18n.t("games.add_to_favs")}">
                    <i data-lucide="star" class="${isFav ? "lucide-star-filled" : ""}"></i>
                </button>
                <div class="card-body-v2">
                    <h3 class="game-title-v2">${game.localizedName || toTitle(game.name)}</h3>
                    <div class="game-meta">
                        <span>${game.platform || "-"}</span>
                    </div>
                </div>
            </div>
        `;

      const favBtn = card.querySelector(".fav-overlay-btn");
      favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(game.name);
      };

      card.onclick = () => openDetails(game);
      frag.appendChild(card);
    });
    
    grid.appendChild(frag);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  function renderTimeline(list) {
    grid.hidden = true;
    timeline.hidden = false;
    timeline.innerHTML = "";
    
    const frag = document.createDocumentFragment();

    list.forEach((game, idx) => {
      const item = document.createElement("div");
      item.className = `timeline-item grid-item-enter ${idx % 2 === 0 ? "left" : "right"}`;
      const year = game.releaseDate
        ? game.releaseDate.jpn.split("-")[0]
        : "????";

      item.innerHTML = `
            <div class="timeline-node"></div>
            <div class="timeline-content clickable">
                <span class="year-badge">${year}</span>
                <h4>${game.localizedName || toTitle(game.name)}</h4>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small class="text-muted">${game.platform || ""}</small>
                    <span class="text-accent">${I18n.t("games.gen_prefix", (game.generation?.name || "").split("-")[1]?.toUpperCase() || "?")}</span>
                </div>
            </div>
        `;
      item.onclick = () => openDetails(game);
      frag.appendChild(item);
    });
    
    timeline.appendChild(frag);
  }

  async function openDetails(game, skipHistory = false) {
    modal.showModal();
    modalLoading.hidden = false;
    modalData.hidden = true;
    
    // Background fetch the game details if we don't have its proper localized names yet
    if (game.url && (!game.names || game.names.length === 0)) {
       try {
           const versionDetail = await window.fetchCached(game.url);
           game.names = versionDetail.names;
           const localized = window.I18n.getName(versionDetail);
           if (localized && localized !== game.name) {
               game.localizedName = localized;
           }
       } catch (e) {}
    }

    if (!skipHistory) {
      history.pushState(
        { game: game.name },
        "",
        `games.html?game=${game.name}`,
      );
    }

    updateModalContent(game);

    startersContainer.innerHTML = "";
    legendariesContainer.innerHTML = "";

    const renderSprites = async (ids, container, size = 96) => {
      for (const id of ids) {
        const box = document.createElement("div");
        box.className = "sprite-box clickable";
        box.title = I18n.t("games.view_details");
        box.innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" width="${size}" alt="Sprite" />`;
        box.onclick = async () => {
          const mon = await window
            .fetchCached(`${API}/pokemon/${id}`)
            .catch(() => null);
          const pName = mon ? mon.name : "unknown";
          window.open(
            `${I18n.getBasePath()}index.html#pokemon/${pName}`,
            "_blank",
          );
        };
        container.appendChild(box);
      }
    };

    if (game.starters)
      await renderSprites(game.starters, startersContainer, 90);
    if (game.legendaries)
      await renderSprites(game.legendaries, legendariesContainer, 70);

    modalLoading.hidden = true;
    modalData.hidden = false;
  }

  function updateModalContent(game) {
    modalTitle.textContent = game.localizedName || toTitle(game.name);
    I18n.setModalTitle(modalTitle.textContent);
    modalSubtitle.textContent = I18n.t(
      "games.era",
      (game.generation?.name || "").split("-")[1]?.toUpperCase() || "?",
    );
    modalBoxArt.src = game.boxArt || "";
    gameSummary.textContent = game.summary || I18n.t("games.no_summary");
    launchJP.textContent = game.releaseDate?.jpn || "-";
    launchINT.textContent = game.releaseDate?.int || "-";
    platformValue.textContent = game.platform || "-";

    updateFavButton(game.name);
    favToggleBtn.onclick = () => toggleFavorite(game.name);
  }

  function updateFavButton(name) {
    const isFav = STATE.favorites.includes(name);
    favToggleBtn.innerHTML = `<span>${isFav ? '<i data-lucide="star" class="lucide-star-filled"></i>' : '<i data-lucide="star"></i>'}</span> ${isFav ? I18n.t("games.remove_fav") : I18n.t("games.add_to_favs")}`;
    favToggleBtn.className = isFav
      ? "btn btn-outline-danger w-100 mt-4"
      : "btn btn-accent w-100 mt-4";
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  function toggleFavorite(name) {
    if (STATE.favorites.includes(name)) {
      STATE.favorites = STATE.favorites.filter((f) => f !== name);
    } else {
      STATE.favorites.push(name);
    }
    localStorage.setItem("pokedex_game_favs", JSON.stringify(STATE.favorites));
    updateFavButton(name);
    applyFilters();
  }

  function toTitle(str) {
    return str.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  init();
})();
