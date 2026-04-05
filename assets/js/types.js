const STORAGE_KEY = "pokedex_types_simulator_settings";

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentGen: STATE.currentGen,
      selectedTypes: STATE.selectedTypes,
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

/**
 * Pokémon Type Chart Logic - Multi-Generation Support
 */

const ALL_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

const GEN_DATA = {
  1: {
    types: ALL_TYPES.slice(0, 15),
    // 15x15 Matrix
    // Nrm Fir Wat Ele Gra Ice Fig Poi Gnd Fly Psy Bug Rck Gho Dra
    chart: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0, 1], // Normal
      [1, 0.5, 0.5, 1, 2, 2, 1, 1, 1, 1, 1, 2, 0.5, 1, 0.5], // Fire (Ice is neutral vs Fire in Gen 1)
      [1, 2, 0.5, 1, 0.5, 1, 1, 1, 2, 1, 1, 1, 2, 1, 0.5], // Water
      [1, 1, 2, 0.5, 0.5, 1, 1, 1, 0, 2, 1, 1, 1, 1, 0.5], // Electric
      [1, 0.5, 2, 1, 0.5, 1, 1, 0.5, 2, 0.5, 1, 0.5, 2, 1, 0.5], // Grass
      [1, 1, 0.5, 1, 2, 0.5, 1, 1, 2, 2, 1, 1, 1, 1, 2], // Ice
      [2, 1, 1, 1, 1, 2, 1, 0.5, 1, 0.5, 0.5, 0.5, 2, 0, 1], // Fighting
      [1, 1, 1, 1, 2, 1, 1, 0.5, 0.5, 1, 1, 2, 0.5, 0.5, 1], // Poison (Bug is weak to Poison)
      [1, 2, 1, 2, 0.5, 1, 1, 2, 1, 0, 1, 0.5, 2, 1, 1], // Ground
      [1, 1, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 2, 0.5, 1, 1], // Flying
      [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0.5, 1, 1, 1, 1], // Psychic
      [1, 0.5, 1, 1, 2, 1, 0.5, 2, 1, 0.5, 2, 1, 1, 0.5, 1], // Bug (Poison is weak to Bug)
      [1, 2, 1, 1, 1, 2, 0.5, 1, 0.5, 2, 1, 2, 1, 1, 1], // Rock
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 1], // Ghost (Immune to Psychic - Glitch)
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2], // Dragon
    ],
  },
  2: {
    types: ALL_TYPES.slice(0, 17),
    // 17x17 Matrix (Gen 2-5)
    chart: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0, 1, 1, 0.5], // Normal
      [1, 0.5, 0.5, 1, 2, 2, 1, 1, 1, 1, 1, 2, 0.5, 1, 0.5, 1, 2], // Fire
      [1, 2, 0.5, 1, 0.5, 1, 1, 1, 2, 1, 1, 1, 2, 1, 0.5, 1, 1], // Water
      [1, 1, 2, 0.5, 0.5, 1, 1, 1, 0, 2, 1, 1, 1, 1, 0.5, 1, 1], // Electric
      [1, 0.5, 2, 1, 0.5, 1, 1, 0.5, 2, 0.5, 1, 0.5, 2, 1, 0.5, 1, 0.5], // Grass
      [1, 0.5, 0.5, 1, 2, 0.5, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 0.5], // Ice
      [2, 1, 1, 1, 1, 2, 1, 0.5, 1, 0.5, 0.5, 0.5, 2, 0, 1, 2, 2], // Fighting
      [1, 1, 1, 1, 2, 1, 1, 0.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 0], // Poison
      [1, 2, 1, 2, 0.5, 1, 1, 2, 1, 0, 1, 0.5, 2, 1, 1, 1, 2], // Ground
      [1, 1, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 0.5], // Flying
      [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0.5, 1, 1, 1, 1, 0, 0.5], // Psychic
      [1, 0.5, 1, 1, 2, 1, 0.5, 0.5, 1, 0.5, 2, 1, 1, 0.5, 1, 2, 0.5], // Bug
      [1, 2, 1, 1, 1, 2, 0.5, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 0.5], // Rock
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 0.5], // Ghost (Steel resists Ghost)
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0.5], // Dragon
      [1, 1, 1, 1, 1, 1, 0.5, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 0.5], // Dark (Steel resists Dark)
      [1, 0.5, 0.5, 0.5, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0.5], // Steel
    ],
  },
  6: {
    types: ALL_TYPES,
    // 18x18 Matrix (Gen 6+)
    chart: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0, 1, 1, 0.5, 1], // Normal
      [1, 0.5, 0.5, 1, 2, 2, 1, 1, 1, 1, 1, 2, 0.5, 1, 0.5, 1, 2, 1], // Fire
      [1, 2, 0.5, 1, 0.5, 1, 1, 1, 2, 1, 1, 1, 2, 1, 0.5, 1, 1, 1], // Water
      [1, 1, 2, 0.5, 0.5, 1, 1, 1, 0, 2, 1, 1, 1, 1, 0.5, 1, 1, 1], // Electric
      [1, 0.5, 2, 1, 0.5, 1, 1, 0.5, 2, 0.5, 1, 0.5, 2, 1, 0.5, 1, 0.5, 1], // Grass
      [1, 0.5, 0.5, 1, 2, 0.5, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 0.5, 1], // Ice
      [2, 1, 1, 1, 1, 2, 1, 0.5, 1, 0.5, 0.5, 0.5, 2, 0, 1, 2, 2, 0.5], // Fighting
      [1, 1, 1, 1, 2, 1, 1, 0.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 0, 2], // Poison
      [1, 2, 1, 2, 0.5, 1, 1, 2, 1, 0, 1, 0.5, 2, 1, 1, 1, 2, 1], // Ground
      [1, 1, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 0.5, 1], // Flying
      [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0.5, 1, 1, 1, 1, 0, 0.5, 1], // Psychic
      [1, 0.5, 1, 1, 2, 1, 0.5, 0.5, 1, 0.5, 2, 1, 1, 0.5, 1, 2, 0.5, 0.5], // Bug
      [1, 2, 1, 1, 1, 2, 0.5, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 0.5, 1], // Rock
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 1, 1], // Ghost
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0.5, 0], // Dragon
      [1, 1, 1, 1, 1, 1, 0.5, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 1, 0.5], // Dark
      [1, 0.5, 0.5, 0.5, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0.5, 2], // Steel
      [1, 0.5, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 1, 1, 1, 2, 2, 0.5, 1], // Fairy
    ],
  },
};

const STATE = {
  currentGen: "6",
  selectedTypes: [],
  initialized: false,
};

function init() {
  if (STATE.initialized) return;

  if (
    window.I18n &&
    window.I18n.translations &&
    Object.keys(window.I18n.translations).length > 0
  ) {
    onReady();
  }

  window.addEventListener("languageChanged", () => {
    if (!STATE.initialized) onReady();
    else {
      refreshUI();
    }
  });
}

function onReady() {
  STATE.initialized = true;

  const saved = loadSettings();
  if (saved) {
    if (saved.currentGen) STATE.currentGen = saved.currentGen;
    if (saved.selectedTypes) STATE.selectedTypes = saved.selectedTypes;
  }

  setupGenSelectors();
  refreshUI();

  // Highlight active gen in UI
  document.querySelectorAll(".btn-gen").forEach((btn) => {
    if (btn.getAttribute("data-gen") === STATE.currentGen) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Clear Button
  const clearBtn = document.getElementById("clearSimBtn");
  if (clearBtn) {
    clearBtn.onclick = () => {
      STATE.selectedTypes = [];
      document
        .querySelectorAll("#simSelector .type-chip-btn")
        .forEach((b) => b.classList.remove("active"));
      updateSimulator();
      saveSettings();
    };
  }
}

function setupGenSelectors() {
  document.querySelectorAll(".btn-gen").forEach((btn) => {
    btn.onclick = () => {
      const g = btn.getAttribute("data-gen");
      if (STATE.currentGen === g) return;

      STATE.currentGen = g;
      document
        .querySelectorAll(".btn-gen")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Filter selected types that don't exist in the new gen
      const allowed = GEN_DATA[g].types;
      STATE.selectedTypes = STATE.selectedTypes.filter((t) =>
        allowed.includes(t),
      );

      refreshUI();
      saveSettings();
    };
  });
}

function refreshUI() {
  renderTable();
  setupSimulator();
  updateSimulator();
  renderTypeChanges();
}

/**
 * Phase 2.4: Renders explanatory notes about what changed in the current generation.
 */
function renderTypeChanges() {
  const section = document.getElementById("typeChangesSection");
  const list = document.getElementById("typeChangesList");
  if (!section || !list) return;

  const g = STATE.currentGen;
  const changes = [];

  if (g === "1") {
    changes.push(I18n.t("type_chart.change_gen1_1") || "Solo existen 15 tipos originales.");
    changes.push(I18n.t("type_chart.change_gen1_2") || "Psíquico es inmune a Fantasma (debido a un error en los juegos originales).");
    changes.push(I18n.t("type_chart.change_gen1_3") || "Bicho y Veneno son súper efectivos entre sí.");
    changes.push(I18n.t("type_chart.change_gen1_4") || "Hielo es neutral contra Fuego.");
  } else if (g === "2") {
    changes.push(I18n.t("type_chart.change_gen2_1") || "Se introducen los tipos Acero y Siniestro.");
    changes.push(I18n.t("type_chart.change_gen2_2") || "Fantasma ahora es súper efectivo contra Psíquico.");
    changes.push(I18n.t("type_chart.change_gen2_3") || "Acero resiste casi todos los tipos, incluyendo Siniestro y Fantasma.");
    changes.push(I18n.t("type_chart.change_gen2_4") || "Veneno ya no es débil contra Bicho.");
  } else if (g === "6") {
    changes.push(I18n.t("type_chart.change_gen6_1") || "Se introduce el tipo Hada.");
    changes.push(I18n.t("type_chart.change_gen6_2") || "Acero pierde sus resistencias a Siniestro y Fantasma.");
    changes.push(I18n.t("type_chart.change_gen6_3") || "El tipo Hada es inmune a Dragón.");
  }

  if (changes.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  list.innerHTML = changes.map(c => `<li>${c}</li>`).join("");
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateSimulatorLabels() {
  const selector = document.getElementById("simSelector");
  if (selector) {
    selector.querySelectorAll(".type-chip-btn").forEach((btn) => {
      const type = btn.getAttribute("data-type");
      if (type) {
        const span = btn.querySelector("span");
        if (span) span.textContent = window.I18n.t(`types.${type}`);
      }
    });
  }
}

function getTypeIcon(name) {
  return `https://raw.githubusercontent.com/msikma/pokesprite/master/misc/types/gen8/${name}.png`;
}

function renderTable() {
  const table = document.getElementById("typeTable");
  if (!table) return;

  const data = GEN_DATA[STATE.currentGen];
  const types = data.types;
  const chart = data.chart;
  const getT = (k) => window.I18n.t(k);

  let html = '<thead><tr><th class="corner-cell"></th>';
  types.forEach((t) => {
    const label = getT(`types.${t}`);
    html += `<th class="col-header type-${t}" title="${label} (${getT("type_chart.defender")})">
                <div class="col-header-inner">
                    <img src="${getTypeIcon(t)}" alt="${t}" class="type-icon-small">
                    <span class="vertical-text">${label}</span>
                </div>
             </th>`;
  });
  html += "</tr></thead><tbody>";

  types.forEach((at, i) => {
    const rowLabel = getT(`types.${at}`);
    html += `<tr><th class="row-header type-${at}" title="${rowLabel} (${getT("type_chart.attacker")})">
                <div class="row-header-inner">
                    <img src="${getTypeIcon(at)}" alt="${at}" class="type-icon-small">
                    <span class="row-label">${rowLabel}</span>
                </div>
             </th>`;
    types.forEach((dt, j) => {
      const val = chart[i][j];
      let displayVal = "1";
      let className = "mult-1";

      if (val === 2) {
        displayVal = "2";
        className = "mult-2";
      } else if (val === 0.5) {
        displayVal = "½";
        className = "mult-05";
      } else if (val === 0) {
        displayVal = "0";
        className = "mult-0";
      }

      html += `<td class="${className}">${displayVal === "1" ? "" : displayVal}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody>";
  table.innerHTML = html;
}

function setupSimulator() {
  const container = document.getElementById("simSelector");
  if (!container) return;
  container.innerHTML = "";

  const types = GEN_DATA[STATE.currentGen].types;

  types.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = `type-chip-btn type-${t} grid-item-enter`;
    if (STATE.selectedTypes.includes(t)) btn.classList.add("active");
    btn.setAttribute("data-type", t);
    btn.innerHTML = `<img src="${getTypeIcon(t)}" alt="${t}" class="type-icon-small"> <span>${window.I18n.t(`types.${t}`)}</span>`;
    btn.onclick = () => toggleSimType(t, btn);
    container.appendChild(btn);
  });
}

function toggleSimType(type, btn) {
  const idx = STATE.selectedTypes.indexOf(type);
  if (idx > -1) {
    STATE.selectedTypes.splice(idx, 1);
    btn.classList.remove("active");
  } else {
    if (STATE.selectedTypes.length >= 2) {
      const first = STATE.selectedTypes.shift();
      const firstBtn = document.querySelector(`#simSelector .type-${first}`);
      if (firstBtn) firstBtn.classList.remove("active");
    }
    STATE.selectedTypes.push(type);
    btn.classList.add("active");
  }

  // Update Bulbapedia info for the last selected type
  if (STATE.selectedTypes.length > 0) {
    const lastType = STATE.selectedTypes[STATE.selectedTypes.length - 1];
    Bulbapedia.renderSection('bulbapediaSection', lastType, 'type');
  } else {
    const container = document.getElementById('bulbapediaSection');
    if (container) container.innerHTML = '';
  }

  updateSimulator();
  saveSettings();
}

function updateSimulator() {
  const results = document.getElementById("simResults");
  if (!results) return;

  if (STATE.selectedTypes.length === 0) {
    results.innerHTML = `<p class="text-center w-100 py-5 opacity-50">${window.I18n.t("type_chart.select_types")}</p>`;
    return;
  }

  const data = GEN_DATA[STATE.currentGen];
  const types = data.types;
  const chart = data.chart;

  const effectiveness = {};
  types.forEach((t) => (effectiveness[t] = 1));

  STATE.selectedTypes.forEach((st) => {
    const stIdx = types.indexOf(st);
    types.forEach((dt, dtIdx) => {
      effectiveness[dt] *= chart[dtIdx][stIdx];
    });
  });

  const groups = { x4: [], x2: [], x1: [], x05: [], x025: [], x0: [] };
  Object.entries(effectiveness).forEach(([t, m]) => {
    if (m === 4) groups.x4.push(t);
    else if (m === 2) groups.x2.push(t);
    else if (m === 1) groups.x1.push(t);
    else if (m === 0.5) groups.x05.push(t);
    else if (m === 0.25) groups.x025.push(t);
    else if (m === 0) groups.x0.push(t);
  });

  const renderBadge = (t, mLabel) => `
    <div class="sim-badge type-${t} grid-item-enter">
        <img src="${getTypeIcon(t)}" alt="${t}" class="type-icon-small">
        <span class="type-name">${window.I18n.t(`types.${t}`)}</span>
        <span class="mult-label">${mLabel}</span>
    </div>
  `;

  results.innerHTML = `
    <div class="res-section"><h4 class="text-danger">${window.I18n.t("type_chart.weak_to")}</h4><div class="res-list">${groups.x4
      .map((t) => renderBadge(t, "x4"))
      .concat(groups.x2.map((t) => renderBadge(t, "x2")))
      .join("")}</div></div>
    <div class="res-section"><h4 class="text-success">${window.I18n.t("type_chart.resistant_to")}</h4><div class="res-list">${groups.x05
      .map((t) => renderBadge(t, "x½"))
      .concat(groups.x025.map((t) => renderBadge(t, "x¼")))
      .join("")}</div></div>
    <div class="res-section"><h4 class="text-secondary">${window.I18n.t("type_chart.immune_to")}</h4><div class="res-list">${groups.x0.map((t) => renderBadge(t, "x0")).join("")}</div></div>
    <div class="res-section"><h4 class="opacity-50">${window.I18n.t("type_chart.normal_to")}</h4><div class="res-list">${groups.x1.map((t) => renderBadge(t, "x1")).join("")}</div></div>
  `;
}

document.addEventListener("DOMContentLoaded", init);
if (document.readyState === "complete" || document.readyState === "interactive")
  init();
