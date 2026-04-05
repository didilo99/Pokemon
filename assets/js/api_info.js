document.addEventListener("DOMContentLoaded", async () => {
  // Load footer
  try {
    const bp = window.I18n ? I18n.getBasePath() : "";
    const response = await fetch(`${bp}includes/footer_snippet.html`);
    const html = await response.text();
    document.getElementById("footer-placeholder").innerHTML = html;
    if (window.initFooterLogic) {
      window.initFooterLogic();
    }
    if (window.I18n) {
      I18n.applyTranslations();
      I18n.updateDropdownUI();
    }
  } catch (err) {
    console.error("Error loading footer", err);
  }

  // Load PokeAPI stats
  await loadPokeApiStats();

  // Load TCG stats
  await loadTcgStats();
});

async function loadPokeApiStats() {
  try {
    const stats = await cacheManager.getStats();

    document.getElementById("pokeapi-total").textContent =
      stats.total.toLocaleString();
    document.getElementById("pokeapi-valid").textContent =
      stats.valid.toLocaleString();
    document.getElementById("pokeapi-expired").textContent =
      stats.expired.toLocaleString();

    if (stats.newestTimestamp) {
      const date = new Date(stats.newestTimestamp);
      document.getElementById("pokeapi-last-sync").textContent =
        `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      document.getElementById("pokeapi-last-sync").textContent =
        (window.I18n && I18n.t("footer.never_synced")) || "Nunca";
    }

    // Fetch global update from GitHub API (PokeAPI repository)
    try {
      const githubRes = await fetch(
        "https://api.github.com/repos/PokeAPI/pokeapi/commits?per_page=1",
      );
      if (githubRes.ok) {
        const ghData = await githubRes.json();
        if (ghData && ghData.length > 0) {
          const ghDate = new Date(ghData[0].commit.committer.date);
          document.getElementById("pokeapi-global-update").textContent =
            `${ghDate.toLocaleDateString()} ${ghDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

          const commitMsg = ghData[0].commit.message.split("\n")[0];
          const latestChangeEl = document.getElementById(
            "pokeapi-latest-change",
          );
          if (latestChangeEl) latestChangeEl.textContent = commitMsg;
        } else {
          document.getElementById("pokeapi-global-update").textContent =
            "Desconocida";
          const latestChangeEl = document.getElementById(
            "pokeapi-latest-change",
          );
          if (latestChangeEl) latestChangeEl.textContent = "-";
        }
      } else {
        document.getElementById("pokeapi-global-update").textContent =
          "Desconocida";
      }
    } catch (e) {
      console.error("Error fetching PokeAPI github date:", e);
      document.getElementById("pokeapi-global-update").textContent = "Error";
      const latestChangeEl = document.getElementById("pokeapi-latest-change");
      if (latestChangeEl) latestChangeEl.textContent = "Error";
    }
  } catch (e) {
    console.error("Error loading PokeAPI stats:", e);
    document.getElementById("pokeapi-total").textContent = "Error";
  }
}

async function loadTcgStats() {
  try {
    await CardStorage.init();
    const currentLang = (window.I18n && I18n.currentLang) || "es";

    let tcgMeta = await CardStorage.loadMetadata();

    // Calculate total cards properly by checking the local cache directly
    try {
      const localCards = await CardStorage.getAllCards(currentLang);
      document.getElementById("tcg-total-cards").textContent =
        localCards.length.toLocaleString();
    } catch (e) {
      document.getElementById("tcg-total-cards").textContent = "0";
    }

    if (tcgMeta) {
      if (tcgMeta.lastUpdated || tcgMeta.lastSync) {
        const dateStr = tcgMeta.lastUpdated || tcgMeta.lastSync;
        const date = new Date(dateStr);
        document.getElementById("tcg-last-sync").textContent =
          `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      } else {
        document.getElementById("tcg-last-sync").textContent =
          (window.I18n && I18n.t("footer.never_synced")) || "Nunca";
      }
    } else {
      document.getElementById("tcg-last-sync").textContent =
        (window.I18n && I18n.t("footer.never_synced")) || "Nunca";
    }

    // Sets
    const sets = await CardStorage.getAllSets(currentLang);
    document.getElementById("tcg-total-sets").textContent =
      sets.length.toLocaleString();

    // Always fetch from API directly to get the latest live updates for "recently added sets"
    // so it shows what the state of the API actually is (latest data).
    // 1. Get sets from Live API to see if there are new ones
    let liveSets = [];
    try {
      const PROXY_URL = (window.I18n ? I18n.getBasePath() : "") + "proxy.php";
      const response = await fetch(
        `${PROXY_URL}?endpoint=sets&lang=${currentLang}`,
      );
      if (response.ok) {
        const data = await response.json();
        liveSets = Array.isArray(data) ? data : data.data || [];
      }
    } catch (err) {
      console.warn(
        "TCG API fetch blocked or failed. Using local cache. Error:",
        err,
      );
    }

    // 2. Merge Live Sets with Local Sets
    // Local sets have more details (like releaseDate) due to Deep Sync.
    // We want to display all sets but prioritize local details if they exist.
    const localSetsMap = new Map();
    sets.forEach((s) => localSetsMap.set(s.id, s));

    let mergedSets = [];
    if (liveSets.length > 0) {
      mergedSets = liveSets.map((ls) => {
        const localMatched = localSetsMap.get(ls.id);
        return localMatched ? { ...ls, ...localMatched } : ls;
      });
    } else {
      mergedSets = sets;
    }

    let setsToDisplay = mergedSets;

    // Sort by releaseDate desc
    setsToDisplay.sort((a, b) => {
      // For sets without release date, we'll try to put them based on ID or at the end
      const dateA = a.releaseDate || "1900-01-01";
      const dateB = b.releaseDate || "1900-01-01";
      return dateB.localeCompare(dateA);
    });

    // Find max updatedAt for global API update date
    let globalUpdatedDate = null;
    setsToDisplay.forEach((set) => {
      // Use updatedAt if available, otherwise fallback to releaseDate
      const dateString = set.updatedAt || set.releaseDate;
      if (dateString) {
        const setDate = new Date(dateString);
        if (!isNaN(setDate.getTime())) {
          if (!globalUpdatedDate || setDate > globalUpdatedDate) {
            globalUpdatedDate = setDate;
          }
        }
      }
    });

    if (globalUpdatedDate) {
      document.getElementById("tcg-global-update").textContent =
        `${globalUpdatedDate.toLocaleDateString()}`;
    } else {
      document.getElementById("tcg-global-update").textContent = "Desconocida";
    }

    // Top 10 recent
    const recentSets = setsToDisplay.slice(0, 10);

    const container = document.getElementById("recent-sets-container");
    if (recentSets.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-muted" data-i18n="common.no_results">Sin resultados.</div>`;
      return;
    }

    container.innerHTML = "";
    recentSets.forEach((set) => {
      const releaseStr = window.I18n
        ? I18n.t("api_info.release_date") || "Lanzamiento:"
        : "Lanzamiento:";
      const updateStr = window.I18n
        ? I18n.t("api_info.updated_at") || "Actualizado:"
        : "Actualizado:";

      const logoUrl =
        set.images && set.images.logo
          ? set.images.logo
          : set.logo
            ? `${set.logo}.png`
            : null;
      let logoHtml = logoUrl
        ? `<img src="${logoUrl}" class="set-logo" alt="${set.name}">`
        : `<div class="set-logo fw-bold fs-4"><i data-lucide="square-stack"></i></div>`;

      const seriesName =
        set.series || (set.serie && set.serie.name)
          ? set.serie && set.serie.name
            ? set.serie.name
            : set.series
          : "Desconocido";
      const totalCards =
        set.printedTotal || (set.cardCount && set.cardCount.total) || "?";

      const html = `
                <div class="recent-set-row">
                    ${logoHtml}
                    <div class="set-info">
                        <h4 class="set-name">${set.name || "Set"}</h4>
                        <p class="set-series">${seriesName} - ${totalCards} cartas</p>
                    </div>
                    <div class="set-dates">
                        <p class="set-release">${releaseStr} ${set.releaseDate || "Desconocida"}</p>
                        <p class="set-updated">${updateStr} ${set.updatedAt ? new Date(set.updatedAt).toLocaleDateString() : set.releaseDate ? new Date(set.releaseDate).toLocaleDateString() : "N/A"}</p>
                    </div>
                </div>
            `;
      container.insertAdjacentHTML("beforeend", html);
    });
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (e) {
    console.error("Error loading TCG stats:", e);
    document.getElementById("tcg-total-cards").textContent = "Error";
    document.getElementById("tcg-total-sets").textContent = "Error";
    document.getElementById("tcg-global-update").textContent = "Error";
    document.getElementById("recent-sets-container").innerHTML =
      `<div class="text-center py-4 text-danger">Error al cargar datos TCG.</div>`;
  }
}
