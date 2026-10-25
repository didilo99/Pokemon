/**
 * POKÉDEX - LÓGICA DE LA PÁGINA DE TUTORIALES DE HERRAMIENTAS
 * Filtro interactivo, simulaciones pedagógicas en vivo y navegación guiada.
 */

document.addEventListener("DOMContentLoaded", () => {
  initTutorialFilters();
  initQuickJump();
  initMiniCatchDemo();
  initMiniTypeDemo();
  initMiniNatureDemo();
  initFaqAccordion();
});

/* =============================================================================
   1. FILTRO POR CATEGORÍA Y BÚSQUEDA EN TIEMPO REAL
   ============================================================================= */
function initTutorialFilters() {
  const searchInput = document.getElementById("tutorialsSearchInput");
  const clearBtn = document.getElementById("tutorialsSearchClear");
  const categoryBtns = document.querySelectorAll(".nav-category-btn");
  const cards = document.querySelectorAll(".tutorial-card");
  const noResultsMsg = document.getElementById("tutorialsNoResults");

  let currentCategory = "all";
  let searchQuery = "";

  function applyFilters() {
    let visibleCount = 0;
    const query = searchQuery.trim().toLowerCase();

    cards.forEach((card) => {
      const cardCategory = card.dataset.category || "all";
      const matchesCategory = currentCategory === "all" || cardCategory === currentCategory;

      const title = card.querySelector(".tool-title")?.textContent.toLowerCase() || "";
      const desc = card.querySelector(".tool-short-desc")?.textContent.toLowerCase() || "";
      const text = card.textContent.toLowerCase();
      const tags = card.dataset.keywords ? card.dataset.keywords.toLowerCase() : "";

      const matchesSearch = !query || title.includes(query) || desc.includes(query) || tags.includes(query) || text.includes(query);

      if (matchesCategory && matchesSearch) {
        card.style.display = "";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    if (noResultsMsg) {
      noResultsMsg.style.display = visibleCount === 0 ? "block" : "none";
    }

    if (clearBtn) {
      clearBtn.style.display = searchQuery.length > 0 ? "block" : "none";
    }
  }

  // Evento de búsqueda con debounce ligero
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      applyFilters();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      searchQuery = "";
      applyFilters();
      searchInput?.focus();
    });
  }

  // Evento de botones de categoría
  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      categoryBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category || "all";
      applyFilters();
    });
  });

  // Botón para resetear filtros si no hay resultados
  const resetFiltersBtn = document.getElementById("resetTutorialsSearchBtn");
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      searchQuery = "";
      currentCategory = "all";
      categoryBtns.forEach((b) => b.classList.toggle("active", b.dataset.category === "all"));
      applyFilters();
    });
  }
}

/* =============================================================================
   2. SALTO RÁPIDO CON ANIMACIÓN Y RESALTE
   ============================================================================= */
function initQuickJump() {
  const jumpLinks = document.querySelectorAll(".quick-jump-link, a[href^='#tutorial-']");

  jumpLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (!targetId || !targetId.startsWith("#")) return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        // Aseguramos que la tarjeta no esté oculta por filtro
        targetEl.style.display = "";
        
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        
        targetEl.classList.add("highlight");
        setTimeout(() => {
          targetEl.classList.remove("highlight");
        }, 1800);
      }
    });
  });
}

/* =============================================================================
   3. MINI DEMOSTRACIÓN INTERACTIVA: CALCULADORA DE CAPTURA
   Muestra visualmente cómo cambia la probabilidad de atrapar a Mewtwo
   al cambiar de Pokéball y aplicar estado de Sueño.
   ============================================================================= */
function initMiniCatchDemo() {
  const container = document.getElementById("miniCatchDemo");
  if (!container) return;

  const ballBtns = container.querySelectorAll(".demo-ball-btn");
  const hpBtns = container.querySelectorAll(".demo-hp-btn");
  const statusBtns = container.querySelectorAll(".demo-status-btn");
  const probDisplay = container.querySelector("#demoCatchProb");
  const shakesDisplay = container.querySelector("#demoCatchShakes");
  const adviceDisplay = container.querySelector("#demoCatchAdvice");

  let currentBallMult = 1.0; // Poké Ball
  let currentHp = 0.05; // 5% HP (barra roja)
  let currentStatus = 2.5; // Sueño

  function recalc() {
    // Estimación didáctica basada en Mewtwo (Catch Rate = 3, Base HP alto)
    // Demuestra el salto gigante entre una Poké Ball con vida llena vs Quick Ball / Ultra Ball con Sueño y vida roja
    let baseProb = 0.016; // Con Poké Ball a vida llena (~1.6%)
    
    // Factor de vida
    const hpFactor = (3 - (2 * currentHp)); // de 1.0 (llena) a ~2.9 (roja)
    
    // Multiplicador total
    let effectiveRate = baseProb * hpFactor * currentBallMult * currentStatus;
    let percent = Math.min(Math.round(effectiveRate * 100), 100);

    // Ajuste de realismo visual para el usuario
    if (currentBallMult === 255) {
      percent = 100; // Master Ball
    } else if (currentBallMult === 5.0 && currentHp > 0.9) {
      percent = 32; // Quick Ball turno 1
    } else if (percent < 1) {
      percent = 1;
    }

    if (probDisplay) {
      probDisplay.textContent = `${percent}%`;
      probDisplay.style.color = percent > 50 ? "#4ade80" : (percent > 20 ? "#facc15" : "#f87171");
    }

    if (shakesDisplay) {
      if (percent >= 100) shakesDisplay.textContent = "¡Captura Instantánea!";
      else if (percent > 40) shakesDisplay.textContent = "3 Sacudidas (Casi seguro)";
      else if (percent > 15) shakesDisplay.textContent = "1 a 2 Sacudidas";
      else shakesDisplay.textContent = "0 a 1 Sacudida (Poco probable)";
    }

    if (adviceDisplay) {
      if (currentStatus === 1.0) {
        adviceDisplay.textContent = "💡 ¡Ponlo a dormir! Multiplicarás las opciones por x2.5 de inmediato.";
      } else if (currentBallMult === 1.0) {
        adviceDisplay.textContent = "💡 Una Ultra Ball duplica la probabilidad (x2); una Ocaso Ball en cueva la triplica (x3).";
      } else if (percent > 50) {
        adviceDisplay.textContent = "⭐ ¡Configuración óptima! En pocos lanzamientos será tuyo.";
      } else {
        adviceDisplay.textContent = "✨ Sigue reduciendo sus PS y mantén el estado Sueño activo.";
      }
    }
  }

  ballBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      ballBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentBallMult = parseFloat(btn.dataset.mult || "1");
      recalc();
    });
  });

  hpBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      hpBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentHp = parseFloat(btn.dataset.hp || "1.0");
      recalc();
    });
  });

  statusBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      statusBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentStatus = parseFloat(btn.dataset.status || "1.0");
      recalc();
    });
  });

  recalc();
}

/* =============================================================================
   4. MINI DEMOSTRACIÓN INTERACTIVA: DEBILIDAD DUAL DE TIPOS
   ============================================================================= */
function initMiniTypeDemo() {
  const container = document.getElementById("miniTypeDemo");
  if (!container) return;

  const comboBtns = container.querySelectorAll(".demo-type-combo-btn");
  const resultDisplay = container.querySelector("#demoTypeResult");
  const descDisplay = container.querySelector("#demoTypeDesc");

  const typeData = {
    "water-ground": {
      multiplier: "Planta x4 (Daño Cuádruple Devastador)",
      immune: "Inmune a Eléctrico (x0)",
      desc: "Swampert o Gastrodon: El Agua cancela la debilidad a Eléctrico de Tierra, y Tierra cancela la de Eléctrico de Agua, ¡pero ambos son débiles a Planta, resultando en un colosal 4x!",
      badgeClass: "diff-advanced"
    },
    "steel-fairy": {
      multiplier: "Solo 2 Debilidades (Fuego x2, Tierra x2)",
      immune: "Inmune a Dragón (x0) y Veneno (x0)",
      desc: "Tinkaton o Zacian: La mejor combinación defensiva de todo el juego. Resiste 9 tipos y es totalmente inmune a dos de los ataques más comunes.",
      badgeClass: "diff-easy"
    },
    "ghost-dark": {
      multiplier: "Solo 1 Debilidad (Hada x2)",
      immune: "Inmune a Normal (x0), Lucha (x0) y Psíquico (x0)",
      desc: "Sableye o Spiritomb: Durante las generaciones 3, 4 y 5 no tenían NINGUNA debilidad. Desde la Gen 6, el tipo Hada es su único punto vulnerable.",
      badgeClass: "diff-easy"
    },
    "flying-dragon": {
      multiplier: "Hielo x4 (Daño Cuádruple Fatal)",
      immune: "Inmune a Tierra (x0)",
      desc: "Dragonite, Salamence o Rayquaza: Volador y Dragón son ambos débiles a Hielo, por lo que cualquier ataque de Hielo multiplicará su poder por 4.",
      badgeClass: "diff-medium"
    }
  };

  comboBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      comboBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.dataset.combo;
      const data = typeData[key];
      if (data && resultDisplay && descDisplay) {
        resultDisplay.innerHTML = `<strong>${data.multiplier}</strong> • <span style="color:#38bdf8">${data.immune}</span>`;
        descDisplay.textContent = data.desc;
      }
    });
  });
}

/* =============================================================================
   5. MINI DEMOSTRACIÓN INTERACTIVA: SELECTOR DE NATURALEZAS
   ============================================================================= */
function initMiniNatureDemo() {
  const container = document.getElementById("miniNatureDemo");
  if (!container) return;

  const natureBtns = container.querySelectorAll(".demo-nature-btn");
  const statUpDisplay = container.querySelector("#demoStatUp");
  const statDownDisplay = container.querySelector("#demoStatDown");
  const idealForDisplay = container.querySelector("#demoNatureIdeal");

  const naturesData = {
    "adamant": { up: "Ataque (+10%)", down: "Ataque Especial (-10%)", ideal: "Atacantes Físicos puros (Machamp, Garchomp, Tyranitar)" },
    "modest": { up: "Ataque Especial (+10%)", down: "Ataque (-10%)", ideal: "Atacantes Especiales puros (Alakazam, Gengar, Gardevoir)" },
    "jolly": { up: "Velocidad (+10%)", down: "Ataque Especial (-10%)", ideal: "Sweepers veloces físicos (Weavile, Cinderace)" },
    "timid": { up: "Velocidad (+10%)", down: "Ataque (-10%)", ideal: "Sweepers veloces especiales (Greninja, Jolteon)" },
    "bold": { up: "Defensa (+10%)", down: "Ataque (-10%)", ideal: "Muros y soportes defensivos (Blissey, Slowbro)" }
  };

  natureBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      natureBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.dataset.nature;
      const data = naturesData[key];
      if (data && statUpDisplay && statDownDisplay && idealForDisplay) {
        statUpDisplay.textContent = data.up;
        statDownDisplay.textContent = data.down;
        idealForDisplay.textContent = data.ideal;
      }
    });
  });
}

/* =============================================================================
   6. FAQ ACCORDION EXPANDIBLE
   ============================================================================= */
function initFaqAccordion() {
  const questions = document.querySelectorAll(".faq-question");

  questions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const isExpanded = btn.getAttribute("aria-expanded") === "true";
      const answer = btn.nextElementSibling;

      // Cerrar otros o alternar
      btn.setAttribute("aria-expanded", !isExpanded);
      if (answer) {
        answer.style.display = isExpanded ? "none" : "block";
      }
    });
  });
}
