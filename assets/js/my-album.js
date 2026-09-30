/**
 * Mi Álbum - Gestión de colección personal de cartas TCG
 * Muestra expansiones en cuadrícula y abre un popup modal con las cartas.
 */
(function () {
  document.addEventListener("DOMContentLoaded", async () => {
    const lang = localStorage.getItem("pokedex_lang") || "es";

    // DOM Elements
    const searchInput = document.getElementById("searchSet");
    const albumGrid = document.getElementById("albumGrid");
    const emptyState = document.getElementById("setsEmpty");
    const perPageSelect = document.getElementById("perPage");
    const sortSelect = document.getElementById("sortSets");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageInfo = document.getElementById("pageInfo");

    // Modal DOM
    const dlg = document.getElementById("albumModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalSymbol = document.getElementById("modalSetSymbol");
    const modalProgress = document.getElementById("modalProgress");
    const modalSpent = document.getElementById("modalSpent");
    const modalRemaining = document.getElementById("modalRemaining");
    const modalProgressBar = document.getElementById("modalProgressBar");
    const modalProgressPercent = document.getElementById("modalProgressPercent");
    const modalProgressLabel = document.getElementById("modalProgressLabel");
    const modalCardsBody = document.getElementById("modalCardsBody");
    const modalSearchCards = document.getElementById("modalSearchCards");
    const closeBtn = document.getElementById("closeAlbumModal");

    // State
    let ALL_SETS = [];
    let DISPLAY_SETS = [];
    let PAGE = 1;
    let PER_PAGE = 60;
    let currentModalSetId = null;
    // Cache: setId -> {owned, total, spent, remaining} for progress on grid cards
    const setProgressCache = {};

    // ===== PRICE HELPER =====
    function getPrice(card) {
      const pricing = card.pricing || {};
      const cm = pricing.cardmarket || card.cardmarket?.prices || {};
      const cmPrice = cm.avg || cm.averageSellPrice || cm.trend || cm.trendPrice;
      if (cmPrice) return parseFloat(cmPrice);
      const tcg = pricing.tcgplayer || card.tcgplayer?.prices || {};
      let tcgData = tcg;
      if (!tcg.market && !tcg.low) {
        const types = Object.keys(tcg);
        if (types.length > 0) tcgData = tcg[types[0]] || {};
      }
      const tcgPrice = tcgData.market || tcgData.mid || tcgData.low;
      return tcgPrice ? parseFloat(tcgPrice) : 0;
    }

    // ===== INIT =====
    try {
      await window.CardStorage.init();
      const rawSets = await window.CardStorage.getAllSets(lang);

      // Filter out Pocket sets
      ALL_SETS = rawSets.filter((set) => {
        const series = (set.serie?.name || set.series || set.serie || "").toLowerCase();
        const isPocket =
          series.includes("pocket") ||
          (set.id &&
            (set.id.startsWith("a1") ||
              set.id.startsWith("p1") ||
              set.id.startsWith("a2")));
        return !isPocket;
      });

      // Pre-calculate stats for all sets (for sorting and grid display)
      const allCardsData = await window.CardStorage.getCards({ pocket: false }, lang, 1, 999999);
      
      allCardsData.cards.forEach(card => {
        const setId = card.set?.id;
        if (!setId) return;
        
        if (!setProgressCache[setId]) {
          setProgressCache[setId] = { owned: 0, total: 0, spent: 0, remaining: 0 };
        }
        
        const isOwned = window.CollectionStorage.hasCard(card.id);
        const price = getPrice(card);
        
        setProgressCache[setId].total++;
        if (isOwned) {
          setProgressCache[setId].owned++;
          setProgressCache[setId].spent += price;
        } else {
          setProgressCache[setId].remaining += price;
        }
      });

      applyFilters();
    } catch (error) {
      console.error("Error loading sets", error);
    }

    // ===== EVENT LISTENERS =====
    searchInput.addEventListener("input", () => {
      PAGE = 1;
      applyFilters();
    });

    sortSelect.addEventListener("change", () => {
      PAGE = 1;
      applyFilters();
    });

    perPageSelect.addEventListener("change", () => {
      PER_PAGE = parseInt(perPageSelect.value);
      PAGE = 1;
      renderCurrentPage();
    });

    prevBtn.addEventListener("click", () => {
      if (PAGE > 1) {
        PAGE--;
        renderCurrentPage();
        window.scrollTo(0, 0);
      }
    });

    nextBtn.addEventListener("click", () => {
      if (PAGE < Math.ceil(DISPLAY_SETS.length / PER_PAGE)) {
        PAGE++;
        renderCurrentPage();
        window.scrollTo(0, 0);
      }
    });

    // Modal close
    closeBtn.addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });

    // ===== FILTERS & SORT =====
    function applyFilters() {
      const q = searchInput.value.toLowerCase().trim();
      let result = ALL_SETS;

      if (q) {
        result = result.filter((s) => {
          const name = (s.name || "").toLowerCase();
          const series = (s.serie?.name || s.series || s.serie || "").toLowerCase();
          return name.includes(q) || series.includes(q);
        });
      }

      // Sort
      const sortVal = sortSelect.value;
      result.sort((a, b) => {
        let cmp = 0;
        switch (sortVal) {
          case "release_asc":
            cmp = (a.releaseDate || "9999").localeCompare(b.releaseDate || "9999");
            break;
          case "name_asc":
            cmp = (a.name || "").localeCompare(b.name || "");
            break;
          case "name_desc":
            cmp = (b.name || "").localeCompare(a.name || "");
            break;
          case "progress_desc":
          case "progress_asc":
            const statsA = setProgressCache[a.id] || { owned: 0, total: 1 };
            const statsB = setProgressCache[b.id] || { owned: 0, total: 1 };
            const pctA = statsA.total > 0 ? (statsA.owned / statsA.total) : 0;
            const pctB = statsB.total > 0 ? (statsB.owned / statsB.total) : 0;
            cmp = sortVal === "progress_desc" ? pctB - pctA : pctA - pctB;
            break;
          case "missing_price_desc":
          case "missing_price_asc":
            const priceA = setProgressCache[a.id]?.remaining || 0;
            const priceB = setProgressCache[b.id]?.remaining || 0;
            cmp = sortVal === "missing_price_desc" ? priceB - priceA : priceA - priceB;
            break;
          case "release_desc":
          default:
            cmp = (b.releaseDate || "1900").localeCompare(a.releaseDate || "1900");
            break;
        }
        return cmp === 0 ? a.id.localeCompare(b.id) : cmp;
      });

      DISPLAY_SETS = result;
      renderCurrentPage();
    }

    // ===== RENDER GRID =====
    function renderCurrentPage() {
      const totalPages = Math.ceil(DISPLAY_SETS.length / PER_PAGE) || 1;
      const start = (PAGE - 1) * PER_PAGE;
      const end = start + PER_PAGE;
      const pageItems = DISPLAY_SETS.slice(start, end);

      pageInfo.textContent = `Página ${PAGE} / ${totalPages}`;

      if (pageItems.length === 0) {
        emptyState.hidden = false;
        albumGrid.innerHTML = "";
        return;
      }
      emptyState.hidden = true;

      albumGrid.innerHTML = "";
      const frag = document.createDocumentFragment();

      pageItems.forEach((set) => {
        const card = document.createElement("article");
        card.className = "album-set-card grid-item-enter";

        const logoUrl = set.logo
          ? `${set.logo}.png`
          : set.images?.logo ||
            (window.I18n ? I18n.getBasePath() : "") + "assets/img/fallback/fallback.png";
        const seriesName = set.serie?.name || set.series || set.serie || "";
        // Check progress cache
        const cached = setProgressCache[set.id];
        const owned = cached ? cached.owned : 0;
        const totalCards = set.printedTotal || set.total || (cached ? cached.total : 0) || 0;
        const progressPct = totalCards > 0 ? Math.round((owned / totalCards) * 100) : 0;

        card.innerHTML = `
          <div class="set-logo-wrap">
            <img src="${logoUrl}" alt="${set.name}" loading="lazy"
              width="200" height="70"
              style="aspect-ratio: 200 / 70; max-height: 70px; max-width: 90%; object-fit: contain;"
              onerror="this.onerror=null; this.src=(window.I18n ? window.I18n.getBasePath() : '') + 'assets/img/fallback/fallback.png';">
          </div>
          <div class="set-name">${set.name}</div>
          <div class="set-series">
            <span class="badge bg-secondary">${seriesName}</span>
          </div>
          <div class="album-progress-wrap">
            <div class="album-progress-bar-bg">
              <div class="album-progress-bar-fill" style="width: ${progressPct}%"></div>
            </div>
            <div class="album-progress-text">
              <span class="progress-count">${owned} / ${totalCards}</span>
              <span>${progressPct}%</span>
            </div>
          </div>
        `;

        card.addEventListener("click", () => openSetModal(set));
        frag.appendChild(card);
      });

      albumGrid.appendChild(frag);

      // Re-init Lucide icons if available
      if (window.lucide) lucide.createIcons({ root: albumGrid });
    }

    // ===== MODAL: OPEN SET =====
    async function openSetModal(set) {
      currentModalSetId = set.id;
      modalTitle.textContent = set.name;

      // TCGdex CDN returns 400 for ALL symbol.png URLs — always use logo instead
      modalSymbol.onerror = function () {
        this.onerror = null;
        this.src =
          (window.I18n ? I18n.getBasePath() : "") +
          "assets/img/fallback/fallback.png";
      };

      const symbolUrl = set.logo
        ? set.logo.endsWith(".png")
          ? set.logo
          : `${set.logo}.png`
        : (window.I18n ? I18n.getBasePath() : "") +
          "assets/img/fallback/fallback.png";
      modalSymbol.src = symbolUrl;

      // Reset stats
      modalProgress.textContent = "...";
      modalSpent.textContent = "...";
      modalRemaining.textContent = "...";
      modalProgressBar.style.width = "0%";
      modalProgressPercent.textContent = "0%";
      modalProgressLabel.textContent = "Cargando...";

      // Show loading
      modalCardsBody.innerHTML = `
        <div class="album-loading">
          <div class="spinner"></div>
          <p>Cargando cartas...</p>
        </div>
      `;

      dlg.showModal();
      if (window.lucide) lucide.createIcons({ root: dlg });

      // Load cards
      try {
        const res = await window.CardStorage.getCards(
          { set: set.id, sort: "number", pocket: false },
          lang,
          1,
          2000
        );
        const cards = res.cards;

        if (cards.length === 0) {
          modalCardsBody.innerHTML = `<p class="text-center text-muted p-4">No hay cartas disponibles para esta expansión.</p>`;
          return;
        }

        // Build cards grid
        let html = '<div class="album-cards-grid">';
        cards.forEach((card) => {
          const isOwned = window.CollectionStorage.hasCard(card.id);
          const cardClass = isOwned ? "card-owned" : "card-missing";
          const price = getPrice(card);
          const safeName = (card.name || "").replace(/"/g, "&quot;");

          // Image: card.image (REST API) or card.images.small
          let imageHtml;
          if (card.image) {
            imageHtml = `<img src="${card.image}/low.png" alt="${safeName}" class="album-card-img" loading="lazy"
              width="245" height="342" style="aspect-ratio: 245 / 342;"
              onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'album-card-fallback\\'>${safeName}</div>';">`;
          } else if (card.images?.small) {
            imageHtml = `<img src="${card.images.small}" alt="${safeName}" class="album-card-img" loading="lazy"
              width="245" height="342" style="aspect-ratio: 245 / 342;"
              onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'album-card-fallback\\'>${safeName}</div>';">`;
          } else {
            imageHtml = `<div class="album-card-fallback">${safeName}</div>`;
          }

          html += `
            <div class="album-card-wrapper ${cardClass}" data-card-id="${card.id}" data-price="${price}" data-card-name="${safeName.toLowerCase()}">
              <div class="card-owned-badge">✓</div>
              ${imageHtml}
            </div>
          `;
        });
        html += "</div>";

        modalCardsBody.innerHTML = html;

        // Attach click events
        const wrappers = modalCardsBody.querySelectorAll(".album-card-wrapper");
        wrappers.forEach((w) => {
          w.addEventListener("click", () => {
            const cid = w.dataset.cardId;
            const added = window.CollectionStorage.toggleCard(cid);
            if (added) {
              w.classList.remove("card-missing");
              w.classList.add("card-owned");
            } else {
              w.classList.remove("card-owned");
              w.classList.add("card-missing");
            }
            updateModalStats(set.id);
          });
        });

        // Search logic
        modalSearchCards.value = "";
        modalSearchCards.oninput = (e) => {
          const q = e.target.value.toLowerCase().trim();
          wrappers.forEach(w => {
            if (w.dataset.cardName.includes(q) || w.dataset.cardId.toLowerCase().includes(q)) {
              w.style.display = "";
            } else {
              w.style.display = "none";
            }
          });
        };

        updateModalStats(set.id);
      } catch (e) {
        console.error("Error loading cards for set", set.id, e);
        modalCardsBody.innerHTML = `<p class="text-center text-danger p-4">Error al cargar las cartas.</p>`;
      }
    }

    // ===== MODAL: UPDATE STATS =====
    function updateModalStats(setId) {
      const wrappers = modalCardsBody.querySelectorAll(".album-card-wrapper");
      if (wrappers.length === 0) return;

      let ownedCount = 0;
      let spent = 0;
      let remaining = 0;

      wrappers.forEach((w) => {
        const price = parseFloat(w.dataset.price) || 0;
        if (w.classList.contains("card-owned")) {
          ownedCount++;
          spent += price;
        } else {
          remaining += price;
        }
      });

      const totalCount = wrappers.length;
      const pct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

      modalProgress.textContent = `${ownedCount} / ${totalCount}`;
      modalSpent.textContent = `${spent.toFixed(2)} €`;
      modalRemaining.textContent = `${remaining.toFixed(2)} €`;
      modalProgressBar.style.width = `${pct}%`;
      modalProgressPercent.textContent = `${pct}%`;
      modalProgressLabel.textContent = `${ownedCount} de ${totalCount} cartas`;

      // Update cache for grid card progress bars
      setProgressCache[setId] = { owned: ownedCount, total: totalCount, spent, remaining };

      // Update the grid card progress bar if visible
      renderCurrentPage();
    }
  });
})();
