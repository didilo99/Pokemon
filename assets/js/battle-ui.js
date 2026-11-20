/**
 * Pokémon Battle Simulator - UI & Controller Module (Enhanced)
 * Handles Preparation phase, Team Builder modal, in-battle controls,
 * event dispatching, realistic sprites, item icons, and summary phase.
 */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const {
    BattleData,
    BattleEngine,
    BattleAI,
    BattleAnimations,
    BattleItems,
    I18n,
  } = window;
  if (!BattleData || !BattleEngine || !BattleAI || !BattleAnimations) {
    console.error("Battle modules not found.");
    return;
  }


  // Image cache and preloader to prevent jank/stutter during battle start and transitions
  
  // --- APPLICATION STATE ---
  const EV_PRESETS = {
    atk_spe: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
    spa_spe: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
    hp_def: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
    hp_spd: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
    bulky_atk: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
    balanced: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 },
  };

  const APP_STATE = {
    phase: "prep", // 'prep', 'battle', 'summary'
    format: "6v6", // '6v6', '3v3', '1v1'
    rulesFormat: "national_dex", // 'national_dex', 'gen8', 'gen7', 'gen6', 'gen9'
    difficulty: "normal", // 'easy', 'normal', 'hard'
    generation: 9,
    isBackendSecure: false,
    playerTeamConfig: [], // Array of up to 6 pokemon configs
    battleState: null,
    editingSlotIndex: -1,
    selectedMoveIndex: null,
    isTurnResolving: false,
    combatLogHistory: [],
    allPokemonSpecies: [],
    currentModalPokemon: null,
    isMegaToggled: false,
    isDynamaxToggled: false,
  };

  // --- DOM ELEMENTS ---
  const DOM = {
    // Phases
    prepPhase: document.getElementById("prepPhase"),
    battlePhase: document.getElementById("battlePhase"),
    summaryPhase: document.getElementById("summaryPhase"),

    // Toolbar
    formatSelect: document.getElementById("formatSelect"),
    rulesSelect: document.getElementById("rulesSelect"),
    difficultySelect: document.getElementById("difficultySelect"),
    backendBadge: document.getElementById("backendBadge"),

    // Prep
    teamBuilderGrid: document.getElementById("teamBuilderGrid"),
    btnQuickTeam: document.getElementById("btnQuickTeam"),
    btnImportTeam: document.getElementById("btnImportTeam"),
    btnClearTeam: document.getElementById("btnClearTeam"),
    btnStartBattle: document.getElementById("btnStartBattle"),

    // Battle Stadium
    rivalPlatform: document.getElementById("rivalPlatform"),
    playerPlatform: document.getElementById("playerPlatform"),
    rivalSprite: document.getElementById("rivalPokemonSprite"),
    playerSprite: document.getElementById("playerPokemonSprite"),
    rivalShadow: document.getElementById("rivalShadow"),
    playerShadow: document.getElementById("playerShadow"),
    rivalSpriteWrapper: document.getElementById("rivalSpriteWrapper"),
    playerSpriteWrapper: document.getElementById("playerSpriteWrapper"),
    rivalName: document.getElementById("rivalName"),
    playerName: document.getElementById("playerName"),
    rivalTransformBadge: document.getElementById("rivalTransformBadge"),
    playerTransformBadge: document.getElementById("playerTransformBadge"),
    rivalDynamaxCounter: document.getElementById("rivalDynamaxCounter"),
    playerDynamaxCounter: document.getElementById("playerDynamaxCounter"),
    rivalLevel: document.getElementById("rivalLevel"),
    playerLevel: document.getElementById("playerLevel"),
    rivalBalls: document.getElementById("rivalTeamBalls"),
    playerBalls: document.getElementById("playerTeamBalls"),
    rivalHpFill: document.getElementById("rivalHpBarFill"),
    playerHpFill: document.getElementById("playerHpBarFill"),
    rivalGhostFill: document.getElementById("rivalHpBarGhost"),
    playerGhostFill: document.getElementById("playerHpBarGhost"),
    playerHpNumbers: document.getElementById("playerHpNumbers"),
    rivalHpPercent: document.getElementById("rivalHpPercent"),
    playerStatusBadge: document.getElementById("playerStatusBadge"),
    rivalStatusBadge: document.getElementById("rivalStatusBadge"),

    // Controls Pad
    dialogueText: document.getElementById("battleDialogueText"),
    speedBtn025x: document.getElementById("speed025x"),
    speedBtn05x: document.getElementById("speed05x"),
    speedBtn1x: document.getElementById("speed1x"),
    speedBtn15x: document.getElementById("speed15x"),
    speedBtn2x: document.getElementById("speed2x"),
    speedBtnInstant: document.getElementById("speedInstant"),
    btnToggleLog: document.getElementById("btnToggleLog"),
    logDrawer: document.getElementById("battleLogDrawer"),
    logList: document.getElementById("battleLogList"),

    // Submenus
    mainActionsPanel: document.getElementById("mainActionsPanel"),
    movesPanel: document.getElementById("movesPanel"),
    transformControlsRow: document.getElementById("transformControlsRow"),
    btnMegaToggle: document.getElementById("btnMegaToggle"),
    btnDynamaxToggle: document.getElementById("btnDynamaxToggle"),
    btnDynamaxToggleText: document.getElementById("btnDynamaxToggleText"),
    switchPanel: document.getElementById("switchPanel"),
    bagPanel: document.getElementById("bagPanel"),
    movesGrid: document.getElementById("movesGrid"),
    switchGrid: document.getElementById("switchGrid"),
    bagGrid: document.getElementById("bagGrid"),

    btnFight: document.getElementById("btnFight"),
    btnSwitch: document.getElementById("btnSwitch"),
    btnBag: document.getElementById("btnBag"),
    btnRun: document.getElementById("btnRun"),
    btnBackFromMoves: document.getElementById("btnBackFromMoves"),
    btnBackFromSwitch: document.getElementById("btnBackFromSwitch"),
    btnBackFromBag: document.getElementById("btnBackFromBag"),

    // Summary
    summaryTitle: document.getElementById("summaryTitle"),
    summarySubtitle: document.getElementById("summarySubtitle"),
    summaryTurns: document.getElementById("summaryTurns"),
    summaryPlayerFainted: document.getElementById("summaryPlayerFainted"),
    summaryRivalFainted: document.getElementById("summaryRivalFainted"),
    btnRematch: document.getElementById("btnRematch"),
    btnNewBattle: document.getElementById("btnNewBattle"),
    btnBackToEditor: document.getElementById("btnBackToEditor"),

    // Edit Modal Elements
    editModalEl: document.getElementById("pokemonEditModal"),
    modalSearchInput: document.getElementById("modalPokemonSearch"),
    modalSearchDropdown: document.getElementById("modalSearchDropdown"),
    modalLevelInput: document.getElementById("modalLevelInput"),
    modalGenderSelect: document.getElementById("modalGenderSelect"),
    modalNatureSelect: document.getElementById("modalNatureSelect"),
    modalItemSelect: document.getElementById("modalItemSelect"),
    modalAbilitySelect: document.getElementById("modalAbilitySelect"),
    modalEvPresetSelect: document.getElementById("modalEvPresetSelect"),
    modalMove1: document.getElementById("modalMove1"),
    modalMove2: document.getElementById("modalMove2"),
    modalMove3: document.getElementById("modalMove3"),
    modalMove4: document.getElementById("modalMove4"),
    modalMoveCustom1: document.getElementById("modalMoveCustom1"),
    modalMoveCustom2: document.getElementById("modalMoveCustom2"),
    modalMoveCustom3: document.getElementById("modalMoveCustom3"),
    modalMoveCustom4: document.getElementById("modalMoveCustom4"),
    modalRandomizeBtn: document.getElementById("modalRandomizePokemonBtn"),
    modalSaveBtn: document.getElementById("modalSavePokemonBtn"),
    modalPreviewSprite: document.getElementById("modalPreviewSprite"),
    modalPreviewName: document.getElementById("modalPreviewName"),
    modalPreviewTypes: document.getElementById("modalPreviewTypes"),
    modalStatHp: document.getElementById("modalStatHp"),
    modalStatAtk: document.getElementById("modalStatAtk"),
    modalStatDef: document.getElementById("modalStatDef"),
    modalStatSpa: document.getElementById("modalStatSpa"),
    modalStatSpd: document.getElementById("modalStatSpd"),
    modalStatSpe: document.getElementById("modalStatSpe"),
    modalBarHp: document.getElementById("modalBarHp"),
    modalBarAtk: document.getElementById("modalBarAtk"),
    modalBarDef: document.getElementById("modalBarDef"),
    modalBarSpa: document.getElementById("modalBarSpa"),
    modalBarSpd: document.getElementById("modalBarSpd"),
    modalBarSpe: document.getElementById("modalBarSpe"),
    modalStatTotal: document.getElementById("modalStatTotal"),
    modalItemPreviewIcon: document.getElementById("modalItemPreviewIcon"),
    modalItemPreviewName: document.getElementById("modalItemPreviewName"),
    modalItemPreviewDesc: document.getElementById("modalItemPreviewDesc"),
  };

  // --- INITIALIZATION ---
  async function init() {
    checkBackendStatus();
    loadDefaultPresets();
    setupEventListeners();
    setupSpeedControls();
    renderTeamBuilder();
    preloadPokemonList();

    // Listen to reactive language changes
    window.addEventListener("languageChanged", () => {
      renderTeamBuilder();
      if (APP_STATE.battleState) {
        updateBattleArena(APP_STATE.battleState);
      }
      // Re-apply backend badge text since it's injected via JS
      checkBackendStatus();
    });
  }

  // i18n helper: returns translated string or fallback
  function t(key, fallback) {
    if (window.I18n && typeof window.I18n.t === "function") {
      const val = window.I18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback !== undefined ? fallback : key;
  }

  // Check if PHP backend is reachable
  async function checkBackendStatus() {
    try {
      const res = await fetch("../battle_api.php?action=ping").then((r) =>
        r.json(),
      );
      if (res && res.status === "ok") {
        APP_STATE.isBackendSecure = true;
        if (DOM.backendBadge) {
          DOM.backendBadge.className = "security-badge";
          DOM.backendBadge.innerHTML = `<i data-lucide="shield-check"></i> ${t("battle_sim.server_secure", "Modo Servidor Seguro")}`;
          if (window.lucide) window.lucide.createIcons();
        }
        return;
      }
    } catch (e) {
      // Offline / Local static mode
    }

    APP_STATE.isBackendSecure = false;
    if (DOM.backendBadge) {
      DOM.backendBadge.className = "security-badge local-mode";
      DOM.backendBadge.innerHTML = `<i data-lucide="shield-alert"></i> ${t("battle_sim.local_mode", "Modo Navegador (Local)")}`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // Preload species list, moves localization and types for search dropdown
  async function preloadPokemonList() {
    try {
      let data = null;
      if (window.cacheManager) {
        data = await window.cacheManager.get(
          "https://pokeapi.co/api/v2/pokemon?limit=1025",
        );
      }
      if (!data && window.fetchCached) {
        data = await window
          .fetchCached("https://pokeapi.co/api/v2/pokemon?limit=1025")
          .catch(() => null);
      }
      if (!data) {
        data = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025")
          .then((r) => r.json())
          .catch(() => null);
      }
      if (data && data.results) {
        APP_STATE.allPokemonSpecies = data.results;
      }
    } catch (e) {
      console.warn("Could not preload species:", e);
    }

    // Preload dictionary files: move names, move types, item names, ability names and species types
    const bp = window.I18n ? window.I18n.getBasePath() : "../";
    try {
      const promises = [];
      if (!window.BattleMoveNames) {
        promises.push(
          fetch(`${bp}assets/i18n/move_names.json`)
            .then((r) => r.json())
            .then((d) => {
              window.BattleMoveNames = d;
            })
            .catch(() => null),
        );
      }
      if (!window.BattleMoveTypes) {
        promises.push(
          fetch(`${bp}assets/i18n/move_types.json`)
            .then((r) => r.json())
            .then((d) => {
              window.BattleMoveTypes = d;
            })
            .catch(() => null),
        );
      }
      if (!window.BattleItemNames) {
        promises.push(
          fetch(`${bp}assets/i18n/item_names.json`)
            .then((r) => r.json())
            .then((d) => {
              window.BattleItemNames = d;
            })
            .catch(() => null),
        );
      }
      if (!window.BattleAbilityNames) {
        promises.push(
          fetch(`${bp}assets/i18n/ability_names.json`)
            .then((r) => r.json())
            .then((d) => {
              window.BattleAbilityNames = d;
            })
            .catch(() => null),
        );
      }
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (err) {}

    // Preload types mapping for all species so search dropdown shows real types instantly
    if (!window.SpeciesTypeCache) {
      window.SpeciesTypeCache = new Map();
    }
  }

  // Load default team of 6 from competitive presets
  function loadDefaultPresets() {
    // Generate a cohesive, sensible starting team at standard competitive level 50
    // Guarantee unique species across the player's initial roster
    const shuffled = [...BattleData.COMPETITIVE_PRESETS].sort(
      () => Math.random() - 0.5,
    );
    const chosenPlayerPresets = [];
    const chosenSpecies = new Set();
    for (const preset of shuffled) {
      const sp = (preset.species || preset.name).toLowerCase();
      if (!chosenSpecies.has(sp)) {
        chosenSpecies.add(sp);
        chosenPlayerPresets.push(preset);
        if (chosenPlayerPresets.length === 6) break;
      }
    }
    APP_STATE.playerTeamConfig = chosenPlayerPresets.map((preset) => {
      return BattleData.randomizePokemonBuild
        ? BattleData.randomizePokemonBuild(preset, {
            targetLevel: 50,
            variance: 0,
          })
        : JSON.parse(JSON.stringify(preset));
    });
  }

  // --- RENDER TEAM BUILDER (PREPARATION PHASE) ---
  function renderTeamBuilder() {
    if (!DOM.teamBuilderGrid) return;
    DOM.teamBuilderGrid.innerHTML = "";

    const maxSlots =
      APP_STATE.format === "1v1" ? 1 : APP_STATE.format === "3v3" ? 3 : 6;

    for (let i = 0; i < maxSlots; i++) {
      const p = APP_STATE.playerTeamConfig[i];
      const card = document.createElement("div");

      if (p) {
        card.className = "team-slot-card filled";
        const typesHtml = (p.types || ["normal"])
          .map(
            (t) =>
              `<span class="team-slot-type-badge" style="background-color: var(--tc-${t})">${t.toUpperCase()}</span>`,
          )
          .join(" ");

        // Localized item with official sprite
        const itemSlug = p.item || "";
        const itemSpriteUrl = BattleData.getItemSpriteUrl(itemSlug);
        const itemDisplayName = BattleData.getLocalizedItem(itemSlug);

        // Localized ability
        const abilityDisplayName = BattleData.getLocalizedAbility(p.ability);

        // Localized moves with type background colors
        const movesHtml = (p.moves || [])
          .map((m) => {
            const mSlug = typeof m === "string" ? m : m ? m.name : "";
            const def = BattleData.COMMON_MOVES[mSlug] || {};
            const typeKey = def.type || "normal";
            const dispName = BattleData.getLocalizedMove(mSlug);
            return `<div class="team-slot-move-pill" style="background-color: var(--tc-${typeKey})">${dispName}</div>`;
          })
          .join("");

        card.innerHTML = `
          <div class="team-slot-header">
            <span class="team-slot-index">#${i + 1}</span>
            <div class="team-slot-actions">
              <button class="slot-action-btn btn-edit-slot" data-index="${i}" title="Editar Pokémon">✏️</button>
              <button class="slot-action-btn btn-remove-slot" data-index="${i}" title="Eliminar Pokémon">🗑️</button>
            </div>
          </div>
          <div class="team-slot-sprite-wrap">
            <img src="${p.showdownFront || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${p.id || 25}.gif`}" class="team-slot-sprite" alt="${p.name}"
                 onerror="this.onerror=null;this.src='${(p.spriteFront || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id || 25}.png`).replace(/'/g, "\\'")}'" />
          </div>
          <div class="team-slot-name">${p.name} <small class="text-warning">Nv.${p.level || 50}</small></div>
          <div class="team-slot-types">${typesHtml}</div>
          <div class="team-slot-meta">
            <div class="team-slot-item-badge">
              <img src="${itemSpriteUrl}" class="team-slot-item-icon" alt="${itemDisplayName}" />
              <span>${itemDisplayName}</span>
            </div>
            <div class="team-slot-ability-badge">
              <span>⚡ ${abilityDisplayName}</span>
            </div>
          </div>
          <div class="team-slot-moves">${movesHtml}</div>
        `;
      } else {
        card.className = "team-slot-card";
        card.innerHTML = `
          <div class="team-slot-empty-icon">➕</div>
          <div class="team-slot-empty-text">${t("battle_sim.add_pokemon", "Añadir Pokémon")} #${i + 1}</div>
          <small class="text-muted mt-1">${t("battle_sim.click_configure", "Haz clic para configurar")}</small>
        `;
        card.addEventListener("click", () => openEditModal(i));
      }

      DOM.teamBuilderGrid.appendChild(card);
    }

    // Attach edit/remove handlers
    DOM.teamBuilderGrid.querySelectorAll(".btn-edit-slot").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        openEditModal(idx);
      });
    });

    DOM.teamBuilderGrid.querySelectorAll(".btn-remove-slot").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        APP_STATE.playerTeamConfig.splice(idx, 1);
        renderTeamBuilder();
      });
    });

    // Update Start Button
    const validCount = APP_STATE.playerTeamConfig.filter(Boolean).length;
    DOM.btnStartBattle.disabled = validCount === 0;
    DOM.btnStartBattle.textContent =
      validCount === 0
        ? t("battle_sim.select_one", "Selecciona al menos 1 Pokémon")
        : t(
            "battle_sim.start_count",
            "¡COMENZAR COMBATE! ({n} vs {n})",
          ).replace(/\{n\}/g, validCount);
  }

  // --- QUICK TEAM & IMPORT HANDLERS ---
  function generateQuickTeam() {
    const maxSlots =
      APP_STATE.format === "1v1" ? 1 : APP_STATE.format === "3v3" ? 3 : 6;
    const shuffled = [...BattleData.COMPETITIVE_PRESETS].sort(
      () => Math.random() - 0.5,
    );
    // Base team around standard level 50 with sensible synergy and tight variance (±2)
    APP_STATE.playerTeamConfig = shuffled.slice(0, maxSlots).map((p) => {
      return BattleData.randomizePokemonBuild
        ? BattleData.randomizePokemonBuild(p, { targetLevel: 50, variance: 2 })
        : JSON.parse(JSON.stringify(p));
    });
    renderTeamBuilder();
  }

  function importFromPokedex() {
    try {
      const raw = localStorage.getItem("pokedex_ui_v3");
      if (!raw) {
        alert(
          t(
            "battle_sim.no_team",
            "No se encontró ningún equipo guardado en el Team Builder de la Pokédex principal.",
          ),
        );
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.team) && parsed.team.length > 0) {
        const imported = parsed.team.map((t) => {
          const matchedPreset = BattleData.COMPETITIVE_PRESETS.find(
            (cp) => cp.species === (t.name || "").toLowerCase(),
          );
          if (matchedPreset) {
            return JSON.parse(JSON.stringify(matchedPreset));
          }
          return {
            species: t.name ? t.name.toLowerCase() : "pikachu",
            name: t.name || "Pikachu",
            level: t.level || 50,
            nature: t.nature || "hardy",
            item: t.item || "leftovers",
            ability: "normal",
            types: ["normal"],
            baseStats: { hp: 70, atk: 70, def: 70, spa: 70, spd: 70, spe: 70 },
            moves:
              t.moves && t.moves.filter(Boolean).length > 0
                ? t.moves.filter(Boolean)
                : ["tackle"],
          };
        });
        APP_STATE.playerTeamConfig = imported;
        renderTeamBuilder();
        alert(
          t(
            "battle_sim.team_imported",
            "¡Se importaron {n} Pokémon del Team Builder!",
          ).replace("{n}", imported.length),
        );
      } else {
        alert(
          t(
            "battle_sim.team_empty",
            "El Team Builder de la Pokédex principal está vacío.",
          ),
        );
      }
    } catch (e) {
      alert(
        t(
          "battle_sim.import_error",
          "Error al importar el equipo de la memoria local.",
        ),
      );
    }
  }

  // --- EDIT MODAL (TEAM BUILDER CONFIG) ---
  let modalBsInstance = null;

  function updateItemPreview() {
    if (!DOM.modalItemSelect) return;
    const itemKey = DOM.modalItemSelect.value;
    const item = BattleData.HELD_ITEMS[itemKey];
    if (item && DOM.modalItemPreviewIcon) {
      DOM.modalItemPreviewIcon.src =
        item.icon || BattleData.getItemSpriteUrl(itemKey);
      if (DOM.modalItemPreviewName)
        DOM.modalItemPreviewName.textContent = item.displayName;
      if (DOM.modalItemPreviewDesc)
        DOM.modalItemPreviewDesc.textContent = item.description;
    } else if (DOM.modalItemPreviewIcon) {
      DOM.modalItemPreviewIcon.src =
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
      if (DOM.modalItemPreviewName)
        DOM.modalItemPreviewName.textContent = "(Ninguno)";
      if (DOM.modalItemPreviewDesc)
        DOM.modalItemPreviewDesc.textContent =
          "Sin objeto equipado en combate.";
    }
  }

  async function openEditModal(slotIndex) {
    APP_STATE.editingSlotIndex = slotIndex;
    const current =
      APP_STATE.playerTeamConfig[slotIndex] ||
      BattleData.COMPETITIVE_PRESETS[0];
    APP_STATE.currentModalPokemon = JSON.parse(JSON.stringify(current));

    // Populate natures
    DOM.modalNatureSelect.innerHTML = "";
    Object.keys(BattleData.NATURES).forEach((n) => {
      const nat = BattleData.NATURES[n];
      let label = n.charAt(0).toUpperCase() + n.slice(1);
      if (nat.plus && nat.minus) {
        label +=
          " (+" +
          nat.plus.toUpperCase() +
          " / -" +
          nat.minus.toUpperCase() +
          ")";
      } else {
        label += ` (${t("battle_sim.nature_neutral", "Neutra")})`;
      }
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = label;
      DOM.modalNatureSelect.appendChild(opt);
    });

    // Fill current values
    DOM.modalSearchInput.value = current.name || "";
    DOM.modalLevelInput.value = current.level || 50;
    DOM.modalGenderSelect.value = current.gender || "M";
    DOM.modalNatureSelect.value = current.nature || "hardy";

    if (current.evPreset && DOM.modalEvPresetSelect) {
      DOM.modalEvPresetSelect.value = current.evPreset;
    } else if (DOM.modalEvPresetSelect) {
      DOM.modalEvPresetSelect.value = "atk_spe";
    }

    populateModalAbilities(current);
    populateModalItems(current);
    populateModalMoves(current);

    updateModalPreview(current);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    if (!modalBsInstance && window.bootstrap) {
      modalBsInstance = new window.bootstrap.Modal(DOM.editModalEl);
      // Remove focus from inside modal when hidden to prevent aria-hidden accessibility warning
      DOM.editModalEl.addEventListener("hidden.bs.modal", () => {
        if (DOM.editModalEl.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      });
    }
    if (modalBsInstance) modalBsInstance.show();

    // Ensure full learnset from PokéAPI is loaded even for preset Pokémon
    ensureFullLearnsetForPokemon(APP_STATE.currentModalPokemon);
  }

  // Fetches full PokéAPI move list for any Pokémon (presets or custom) if not yet present
  async function ensureFullLearnsetForPokemon(pokemon) {
    if (!pokemon) return;
    if (
      Array.isArray(pokemon.learnableMoves) &&
      pokemon.learnableMoves.length > 30
    )
      return;

    const speciesSlug = (pokemon.species || pokemon.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (!speciesSlug) return;

    try {
      const url = `https://pokeapi.co/api/v2/pokemon/${speciesSlug}`;
      let details = null;
      if (window.cacheManager) details = await window.cacheManager.get(url);
      if (!details && window.fetchCached)
        details = await window.fetchCached(url).catch(() => null);
      if (!details)
        details = await fetch(url)
          .then((r) => r.json())
          .catch(() => null);

      if (details && Array.isArray(details.moves) && details.moves.length > 0) {
        pokemon.learnableMoves = details.moves.map((m) => m.move.name);
        if (
          APP_STATE.currentModalPokemon &&
          (APP_STATE.currentModalPokemon.species === speciesSlug ||
            APP_STATE.currentModalPokemon.name.toLowerCase() === speciesSlug)
        ) {
          APP_STATE.currentModalPokemon.learnableMoves = pokemon.learnableMoves;
          populateModalMoves(APP_STATE.currentModalPokemon);
        }
      }
    } catch (e) {}
  }

  function populateModalItems(pokemon) {
    if (!DOM.modalItemSelect) return;
    const legalItems = BattleData.getLegalItemsForPokemon
      ? BattleData.getLegalItemsForPokemon(pokemon)
      : Object.keys(BattleData.HELD_ITEMS);

    DOM.modalItemSelect.innerHTML = `<option value="">${t("battle_sim.item_none", "(Ninguno)")}</option>`;
    legalItems.forEach((k) => {
      const item = BattleData.HELD_ITEMS[k];
      if (item) {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = item.displayName;
        DOM.modalItemSelect.appendChild(opt);
      }
    });

    const currentItem = (pokemon && pokemon.item) || "";
    if (currentItem && legalItems.includes(currentItem)) {
      DOM.modalItemSelect.value = currentItem;
    } else {
      DOM.modalItemSelect.value = "";
      if (pokemon) pokemon.item = "";
    }
    updateItemPreview();
  }

  function populateModalMoves(pokemon) {
    const moveSelectors = [
      DOM.modalMove1,
      DOM.modalMove2,
      DOM.modalMove3,
      DOM.modalMove4,
    ];
    const customContainers = [
      DOM.modalMoveCustom1,
      DOM.modalMoveCustom2,
      DOM.modalMoveCustom3,
      DOM.modalMoveCustom4,
    ];

    const legalMoves = BattleData.getLegalMovesForPokemon
      ? BattleData.getLegalMovesForPokemon(pokemon)
      : Object.keys(BattleData.COMMON_MOVES);

    // Prepare list of move objects with localized name and type
    const moveOptions = legalMoves.map((mKey) => {
      const def =
        BattleData.COMMON_MOVES[mKey] ||
        (window.BattleDynamicMoves && window.BattleDynamicMoves[mKey]) ||
        {};
      const typeKey =
        def.type ||
        (window.BattleMoveTypes && window.BattleMoveTypes[mKey]) ||
        (window.moveMetaMap && window.moveMetaMap[mKey]?.type) ||
        "normal";
      const displayName = BattleData.getLocalizedMove
        ? BattleData.getLocalizedMove(mKey)
        : mKey;
      return {
        key: mKey,
        displayName: displayName,
        type: typeKey.toLowerCase(),
      };
    });

    // Sort alphabetically by localized display name
    moveOptions.sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Assign initial values to hidden inputs
    moveSelectors.forEach((sel, i) => {
      if (!sel) return;
      const currMove =
        pokemon && pokemon.moves && pokemon.moves[i]
          ? typeof pokemon.moves[i] === "string"
            ? pokemon.moves[i]
            : pokemon.moves[i].name
          : "";

      if (currMove && legalMoves.includes(currMove)) {
        sel.value = currMove;
      } else if (legalMoves[i]) {
        sel.value = legalMoves[i];
      } else {
        sel.value = "";
      }
    });

    // Render searchable custom dropdown for each slot
    customContainers.forEach((container, slotIndex) => {
      if (!container) return;
      const hiddenInput = moveSelectors[slotIndex];
      renderCustomMoveSelect(
        container,
        hiddenInput,
        slotIndex,
        moveOptions,
        moveSelectors,
      );
    });

    // Enforce uniqueness across all 4 selects
    syncMoveDisabledOptions(moveSelectors);
  }

  function renderCustomMoveSelect(
    container,
    hiddenInput,
    slotIndex,
    moveOptions,
    allHiddenInputs,
  ) {
    container.innerHTML = "";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "battle-move-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const triggerText = document.createElement("span");
    triggerText.className = "battle-move-trigger-text";

    const triggerArrow = document.createElement("span");
    triggerArrow.className = "battle-move-trigger-arrow";
    triggerArrow.innerHTML = `<i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>`;

    trigger.appendChild(triggerText);
    trigger.appendChild(triggerArrow);

    const dropdown = document.createElement("div");
    dropdown.className = "battle-move-dropdown-menu";

    dropdown.innerHTML = `
      <div class="battle-move-search-box">
        <span class="battle-move-search-icon"><i data-lucide="search" style="width: 12px; height: 12px;"></i></span>
        <input type="text" class="battle-move-search-input" placeholder="${t("battle_sim.search_move", "Buscar movimiento...")}" autocomplete="off" />
      </div>
      <div class="battle-move-options-list"></div>
    `;

    container.appendChild(trigger);
    container.appendChild(dropdown);

    if (window.lucide) window.lucide.createIcons({ root: container });

    const searchInput = dropdown.querySelector(".battle-move-search-input");
    const optionsList = dropdown.querySelector(".battle-move-options-list");

    const updateTriggerText = () => {
      const val = hiddenInput.value;
      if (!val) {
        triggerText.textContent = t("battle_sim.move_empty", "(Vacío)");
      } else {
        const found = moveOptions.find((m) => m.key === val);
        const name = found
          ? found.displayName
          : BattleData.getLocalizedMove(val);
        const type = (found ? found.type : "normal").toUpperCase();
        triggerText.innerHTML = `${name} <span class="battle-move-type-pill" style="background-color: var(--tc-${type.toLowerCase()})">${type}</span>`;
      }
    };

    const renderOptionList = (filterText = "") => {
      optionsList.innerHTML = "";
      const q = (filterText || "").trim().toLowerCase();

      // Gather moves selected in other slots to disable duplication
      const otherSelected = allHiddenInputs
        .filter((_, idx) => idx !== slotIndex)
        .map((input) => input.value)
        .filter(Boolean);

      // Add empty option
      const emptyItem = document.createElement("div");
      emptyItem.className = `battle-move-option-item ${!hiddenInput.value ? "selected" : ""}`;
      emptyItem.innerHTML = `<span>${t("battle_sim.move_empty", "(Vacío)")}</span>`;
      emptyItem.addEventListener("click", () => {
        hiddenInput.value = "";
        updateTriggerText();
        closeDropdown();
        syncMoveDisabledOptions(allHiddenInputs);
      });
      optionsList.appendChild(emptyItem);

      const filtered = moveOptions.filter(
        (m) =>
          !q ||
          m.displayName.toLowerCase().includes(q) ||
          m.key.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q),
      );

      filtered.forEach((m) => {
        const isSelected = hiddenInput.value === m.key;
        const isAlreadyPickedInOtherSlot = otherSelected.includes(m.key);

        const optItem = document.createElement("div");
        optItem.className = `battle-move-option-item ${isSelected ? "selected" : ""} ${isAlreadyPickedInOtherSlot ? "disabled" : ""}`;
        optItem.title = isAlreadyPickedInOtherSlot
          ? t(
              "battle_sim.move_already_picked",
              "Movimiento ya seleccionado en otro espacio",
            )
          : "";

        optItem.innerHTML = `
          <span>${m.displayName}</span>
          <span class="battle-move-type-pill" style="background-color: var(--tc-${m.type})">${m.type.toUpperCase()}</span>
        `;

        if (!isAlreadyPickedInOtherSlot) {
          optItem.addEventListener("click", () => {
            hiddenInput.value = m.key;
            updateTriggerText();
            closeDropdown();
            syncMoveDisabledOptions(allHiddenInputs);
          });
        }

        optionsList.appendChild(optItem);
      });

      if (filtered.length === 0) {
        const noRes = document.createElement("div");
        noRes.className = "text-muted small p-2 text-center";
        noRes.textContent = t(
          "battle_sim.no_moves_found",
          "No se encontraron movimientos",
        );
        optionsList.appendChild(noRes);
      }
    };

    const positionDropdown = (menuEl, triggerEl) => {
      const modalBody = DOM.editModalEl
        ? DOM.editModalEl.querySelector(".battle-modal-body")
        : null;
      const boundaryRect = modalBody
        ? modalBody.getBoundingClientRect()
        : {
            top: 0,
            bottom: window.innerHeight,
            height: window.innerHeight,
          };

      const triggerRect = triggerEl.getBoundingClientRect();
      const menuHeight = menuEl.offsetHeight || 220;
      const spaceBelow = boundaryRect.bottom - triggerRect.bottom;
      const spaceAbove = triggerRect.top - boundaryRect.top;

      // Prefer dropping up if space below is limited and space above is larger
      if (spaceBelow < menuHeight + 10 && spaceAbove > spaceBelow) {
        menuEl.classList.add("drop-up");
        const maxAvail = Math.max(120, spaceAbove - 15);
        if (optionsList) {
          optionsList.style.maxHeight = `${Math.min(190, maxAvail - 45)}px`;
        }
      } else {
        menuEl.classList.remove("drop-up");
        const maxAvail = Math.max(120, spaceBelow - 15);
        if (optionsList) {
          optionsList.style.maxHeight = `${Math.min(190, maxAvail - 45)}px`;
        }
      }
    };

    const openDropdown = () => {
      // Close any other open dropdowns first
      document
        .querySelectorAll(".battle-move-dropdown-menu.show")
        .forEach((el) => {
          if (el !== dropdown) {
            el.classList.remove("show");
            el.classList.remove("drop-up");
            const parentTrig = el.parentElement?.querySelector(
              ".battle-move-trigger",
            );
            if (parentTrig) parentTrig.classList.remove("active");
          }
        });

      dropdown.classList.add("show");
      trigger.classList.add("active");
      trigger.setAttribute("aria-expanded", "true");
      searchInput.value = "";
      renderOptionList("");

      // Calculate best direction (up or down)
      positionDropdown(dropdown, trigger);

      setTimeout(() => searchInput.focus(), 50);
    };

    const closeDropdown = () => {
      dropdown.classList.remove("show");
      dropdown.classList.remove("drop-up");
      trigger.classList.remove("active");
      trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dropdown.classList.contains("show")) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    searchInput.addEventListener("input", () => {
      renderOptionList(searchInput.value);
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        closeDropdown();
      }
    });

    // Store refresh function on the container so other slots can trigger updates
    container._refreshCustomSelect = () => {
      updateTriggerText();
      if (dropdown.classList.contains("show")) {
        renderOptionList(searchInput.value);
      }
    };

    updateTriggerText();
  }

  function syncMoveDisabledOptions(allHiddenInputs) {
    const selectedVals = allHiddenInputs
      .map((inp) => inp.value)
      .filter(Boolean);

    // Check if any slot has duplicate and clear duplicate
    const seen = new Set();
    allHiddenInputs.forEach((inp) => {
      if (inp.value) {
        if (seen.has(inp.value)) {
          inp.value = ""; // Clear duplicate automatically
        } else {
          seen.add(inp.value);
        }
      }
    });

    // Refresh all 4 custom dropdown triggers and open lists
    [
      DOM.modalMoveCustom1,
      DOM.modalMoveCustom2,
      DOM.modalMoveCustom3,
      DOM.modalMoveCustom4,
    ].forEach((container) => {
      if (container && typeof container._refreshCustomSelect === "function") {
        container._refreshCustomSelect();
      }
    });
  }

  function populateModalAbilities(pokemon) {
    if (!DOM.modalAbilitySelect) return;
    DOM.modalAbilitySelect.innerHTML = "";
    const list =
      pokemon.abilities || (pokemon.ability ? [pokemon.ability] : ["normal"]);
    list.forEach((ab) => {
      const opt = document.createElement("option");
      opt.value = ab;
      opt.textContent = BattleData.getLocalizedAbility(ab);
      DOM.modalAbilitySelect.appendChild(opt);
    });
    if (pokemon.ability) DOM.modalAbilitySelect.value = pokemon.ability;
  }

  function updateModalPreview(pokemon) {
    if (!pokemon) return;
    DOM.modalPreviewName.textContent =
      pokemon.name || pokemon.species || "Pokémon";
    const modalAnimatedUrl =
      pokemon.showdownFront ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemon.id || 25}.gif`;
    const modalStaticUrl =
      pokemon.spriteFront ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id || 25}.png`;
    DOM.modalPreviewSprite.onerror = () => {
      DOM.modalPreviewSprite.onerror = null;
      DOM.modalPreviewSprite.src = modalStaticUrl;
    };
    DOM.modalPreviewSprite.src = modalAnimatedUrl;

    DOM.modalPreviewTypes.innerHTML = (pokemon.types || ["normal"])
      .map(
        (t) =>
          `<span class="badge" style="background-color: var(--tc-${t})">${t.toUpperCase()}</span>`,
      )
      .join(" ");

    const evKey = DOM.modalEvPresetSelect
      ? DOM.modalEvPresetSelect.value
      : "atk_spe";
    const evs = EV_PRESETS[evKey] ||
      pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    const stats = BattleEngine.calculateAllStats(
      pokemon.baseStats || {
        hp: 50,
        atk: 50,
        def: 50,
        spa: 50,
        spd: 50,
        spe: 50,
      },
      pokemon.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs,
      parseInt(DOM.modalLevelInput.value) || 50,
      DOM.modalNatureSelect.value,
    );

    DOM.modalStatHp.textContent = stats.hp;
    DOM.modalStatAtk.textContent = stats.atk;
    DOM.modalStatDef.textContent = stats.def;
    DOM.modalStatSpa.textContent = stats.spa;
    DOM.modalStatSpd.textContent = stats.spd;
    DOM.modalStatSpe.textContent = stats.spe;

    const lvl = parseInt(DOM.modalLevelInput.value) || 50;
    const maxRef = Math.max(160, Math.round(lvl * 4.6));

    if (DOM.modalBarHp)
      DOM.modalBarHp.style.width =
        Math.min(100, Math.round((stats.hp / maxRef) * 100)) + "%";
    if (DOM.modalBarAtk)
      DOM.modalBarAtk.style.width =
        Math.min(100, Math.round((stats.atk / maxRef) * 100)) + "%";
    if (DOM.modalBarDef)
      DOM.modalBarDef.style.width =
        Math.min(100, Math.round((stats.def / maxRef) * 100)) + "%";
    if (DOM.modalBarSpa)
      DOM.modalBarSpa.style.width =
        Math.min(100, Math.round((stats.spa / maxRef) * 100)) + "%";
    if (DOM.modalBarSpd)
      DOM.modalBarSpd.style.width =
        Math.min(100, Math.round((stats.spd / maxRef) * 100)) + "%";
    if (DOM.modalBarSpe)
      DOM.modalBarSpe.style.width =
        Math.min(100, Math.round((stats.spe / maxRef) * 100)) + "%";

    const total =
      stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
    if (DOM.modalStatTotal) DOM.modalStatTotal.textContent = `Total: ${total}`;
  }

  // --- START BATTLE PHASE (Strictly No Rival Duplicates) ---
  function startBattle() {
    const validTeam = APP_STATE.playerTeamConfig.filter(Boolean);
    if (validTeam.length === 0) return;

    // 1. Identify all species present in the player team
    const playerSpeciesSet = new Set(
      validTeam.map((p) => (p.species || p.name).toLowerCase()),
    );

    // 2. Filter available rival presets to strictly EXCLUDE player species
    // AND guarantee distinct species among rival team choices (no duplicates)
    const availablePresets = BattleData.COMPETITIVE_PRESETS.filter(
      (p) => !playerSpeciesSet.has((p.species || p.name).toLowerCase()),
    );

    // Shuffle presets
    const shuffled = [...availablePresets].sort(() => Math.random() - 0.5);

    // Pick presets with unique species only
    const chosenRivalPresets = [];
    const chosenSpeciesSet = new Set(playerSpeciesSet);

    for (const preset of shuffled) {
      const sp = (preset.species || preset.name).toLowerCase();
      if (!chosenSpeciesSet.has(sp)) {
        chosenSpeciesSet.add(sp);
        chosenRivalPresets.push(preset);
        if (chosenRivalPresets.length === validTeam.length) break;
      }
    }

    // Calculate level range based on player team levels and difficulty
    const playerLevels = validTeam.map((p) => p.level || 50);
    const avgPlayerLevel = Math.round(
      playerLevels.reduce((a, b) => a + b, 0) / playerLevels.length,
    );

    // Difficulty modifiers for rival levels:
    // Easy: rival slightly lower level (-2 a -1), accessible for beginners
    // Normal: balanced, equal level (-1 a +1)
    // Hard: challenging, slightly higher level (+2 a +3) without being absurd/unfair
    const difficultyModifier = {
      easy: { min: -2, max: -1 },
      normal: { min: -1, max: 1 },
      hard: { min: 2, max: 3 },
    };
    const mod =
      difficultyModifier[APP_STATE.difficulty] || difficultyModifier.normal;

    const rivalTeamConfig = chosenRivalPresets.map((p, index) => {
      const referenceLevel = playerLevels[index] || avgPlayerLevel;
      const offset =
        Math.floor(Math.random() * (mod.max - mod.min + 1)) + mod.min;
      const targetLvl = Math.max(1, Math.min(100, referenceLevel + offset));

      if (BattleData.randomizePokemonBuild) {
        return BattleData.randomizePokemonBuild(p, {
          targetLevel: targetLvl,
          variance: 1,
          allowMega: true,
        });
      }

      const copy = JSON.parse(JSON.stringify(p));
      copy.level = targetLvl;
      return copy;
    });

    // Fallback safeguard: if not enough presets without collision, fill with unused presets or randomized
    if (rivalTeamConfig.length < validTeam.length) {
      for (const preset of BattleData.COMPETITIVE_PRESETS) {
        const sp = (preset.species || preset.name).toLowerCase();
        if (!chosenSpeciesSet.has(sp)) {
          chosenSpeciesSet.add(sp);
          const copy = BattleData.randomizePokemonBuild
            ? BattleData.randomizePokemonBuild(preset, {
                targetLevel: avgPlayerLevel,
                variance: 2,
                allowMega: true,
              })
            : JSON.parse(JSON.stringify(preset));
          rivalTeamConfig.push(copy);
          if (rivalTeamConfig.length === validTeam.length) break;
        }
      }
    }

    // Pre-cache combatant sprites for immediate smooth display without layout shift or lag
    // Active combatant sprites are assigned directly via setSprite when updating arena

    const chosenRulesFormat = DOM.rulesSelect
      ? DOM.rulesSelect.value
      : APP_STATE.rulesFormat || "national_dex";
    APP_STATE.rulesFormat = chosenRulesFormat;

    // Initialize state
    APP_STATE.battleState = BattleEngine.initBattle(
      validTeam,
      rivalTeamConfig,
      {
        difficulty: APP_STATE.difficulty,
        format: chosenRulesFormat,
      },
    );

    // Reset turn toggles
    APP_STATE.isMegaToggled = false;
    APP_STATE.isDynamaxToggled = false;

    // Transition to Battle phase
    APP_STATE.phase = "battle";
    DOM.prepPhase.style.display = "none";
    DOM.summaryPhase.style.display = "none";
    DOM.battlePhase.style.display = "block";

    // Setup arena HUD
    updateBattleArena(APP_STATE.battleState);
    showMainMenu();
    if (window.lucide) window.lucide.createIcons();

    clearDialogue();
    setDialogue(
      t(
        "battle_sim.battle_start",
        "¡Comienza el combate! ¡El rival ha sacado a {name}!",
      ).replace("{name}", APP_STATE.battleState.rivalTeam[0].name),
    );
  }

  // --- SPECIES SCALE & STAGING SYSTEM ---
  const SPECIES_SCALE_CONFIG = {
    pikachu: 0.85,
    eevee: 0.82,
    pichu: 0.78,
    diglett: 0.75,
    meowth: 0.84,
    charmander: 0.86,
    squirtle: 0.84,
    bulbasaur: 0.85,
    lucario: 1.0,
    gengar: 1.02,
    alakazam: 1.0,
    greninja: 1.02,
    cinderace: 1.0,
    umbreon: 0.94,
    espeon: 0.94,
    jolteon: 0.94,
    vaporeon: 0.96,
    flareon: 0.94,
    charizard: 1.1,
    blastoise: 1.08,
    venusaur: 1.08,
    dragonite: 1.12,
    garchomp: 1.14,
    tyranitar: 1.16,
    gyarados: 1.18,
    snorlax: 1.18,
    mewtwo: 1.12,
    salamence: 1.12,
    metagross: 1.12,
    scizor: 1.05,
    swampert: 1.08,
    blaziken: 1.08,
    sceptile: 1.08,
    gardevoir: 1.0,
    kangaskhan: 1.1,
    zapdos: 1.1,
    moltres: 1.12,
    articuno: 1.1,
  };

  const FLOATING_SPECIES = new Set([
    "charizard",
    "dragonite",
    "gengar",
    "zapdos",
    "articuno",
    "moltres",
    "hydreigon",
    "latios",
    "latias",
    "salamence",
    "pidgeot",
    "talonflame",
    "chandelure",
    "volcarona",
    "togekiss",
    "dragapult",
  ]);

  function applyPokemonStaging(side, pokemon, spriteEl, wrapperEl, shadowEl) {
    if (!pokemon) return;
    const slug = (pokemon.species || pokemon.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    // Normalized base scale
    let baseScale =
      SPECIES_SCALE_CONFIG[slug] ||
      (pokemon.height
        ? Math.max(0.85, Math.min(1.15, 0.8 + pokemon.height * 0.025))
        : 1.0);

    // Transformation scale boost (noticeable and imposing without exceeding bounds)
    if (pokemon.isMega) baseScale *= 1.08;
    if (pokemon.isDynamax || pokemon.isGigantamax) baseScale *= 1.22;

    // Perspective depth: player 1.06x in foreground, rival 0.90x in midground
    const perspectiveMultiplier = side === "player" ? 1.06 : 0.9;
    let finalScale = baseScale * perspectiveMultiplier;

    // Strict clamp to guarantee no sprite ever overflows or covers the HUD cards
    const maxAllowedScale = side === "player" ? 1.28 : 1.15;
    const minAllowedScale = side === "player" ? 0.8 : 0.72;
    finalScale = Math.min(
      maxAllowedScale,
      Math.max(minAllowedScale, finalScale),
    ).toFixed(3);

    // Apply scale with horizontal centering so CSS animations on spriteEl do not override it
    if (wrapperEl) {
      wrapperEl.style.transform = `translateX(-50%) scale(${finalScale})`;
    }
    if (spriteEl) {
      spriteEl.style.transform = "";
    }

    // Float floating/flying species
    const isFloating = FLOATING_SPECIES.has(slug);
    if (wrapperEl) {
      if (isFloating) {
        wrapperEl.classList.add("pokemon-floating");
      } else {
        wrapperEl.classList.remove("pokemon-floating");
      }
    }

    // Adapt ground shadow
    if (shadowEl) {
      const shadowW = Math.round(
        (side === "player" ? 180 : 130) *
          Math.min(1.25, Math.max(0.75, baseScale)),
      );
      shadowEl.style.width = `${shadowW}px`;
      shadowEl.style.opacity = isFloating ? "0.45" : "0.85";
    }
  }

  // --- ARENA HUD UPDATES ---
  function updateBattleArena(battleState, forceSprites = false) {
    if (!battleState) return;

    const playerActive = battleState.playerTeam[battleState.playerActiveIndex];
    const rivalActive = battleState.rivalTeam[battleState.rivalActiveIndex];

    // Sprites – efficient animated/static handling with caching
    if (!APP_STATE.isTurnResolving || forceSprites) {
      // Global cache (persistent across updates)
      const spriteCache = window.__spriteCache || (window.__spriteCache = {});

      const setSprite = (imgEl, pokemon, isBack) => {
        if (!imgEl || !pokemon) return;

        const pokeId = pokemon.id || 25;
        const staticFront = pokemon.spriteFront || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`;
        const staticBack = pokemon.spriteBack || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokeId}.png`;

        // Animated showdown sprites (GIFs): prefer these, fallback to static if unavailable
        const animatedFront = pokemon.showdownFront || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokeId}.gif`;
        const animatedBack = pokemon.showdownBack || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${pokeId}.gif`;

        // Primary target: animated GIF; fallback: static PNG
        const targetUrl = isBack ? animatedBack : animatedFront;
        const fallbackUrl = isBack ? staticBack : staticFront;

        if (imgEl.dataset.current === targetUrl && imgEl.src) return;

        imgEl.decoding = 'async';
        imgEl.loading = 'eager';

        // On error loading the animated sprite, gracefully fall back to static
        imgEl.onerror = () => {
          imgEl.onerror = null;
          if (imgEl.src !== fallbackUrl) {
            imgEl.src = fallbackUrl;
            imgEl.dataset.current = fallbackUrl;
          }
        };

        imgEl.src = targetUrl;
        imgEl.dataset.current = targetUrl;
      };

      // Set Player and Rival sprites
      if (playerActive) {
        setSprite(DOM.playerSprite, playerActive, true);
      } else if (DOM.playerSprite) {
        DOM.playerSprite.src = '';
        DOM.playerSprite.dataset.current = '';
      }

      if (rivalActive) {
        setSprite(DOM.rivalSprite, rivalActive, false);
      } else if (DOM.rivalSprite) {
        DOM.rivalSprite.src = '';
        DOM.rivalSprite.dataset.current = '';
      }
      // Opacity handling (single assignment)
      if (DOM.playerSprite && playerActive) {
        DOM.playerSprite.style.opacity = playerActive.isFainted ? "0" : "1";
      }
      if (DOM.rivalSprite && rivalActive) {
        DOM.rivalSprite.style.opacity = rivalActive.isFainted ? "0" : "1";
      }
    }


    applyPokemonStaging(
      "player",
      playerActive,
      DOM.playerSprite,
      DOM.playerSpriteWrapper,
      DOM.playerShadow,
    );
    applyPokemonStaging(
      "rival",
      rivalActive,
      DOM.rivalSprite,
      DOM.rivalSpriteWrapper,
      DOM.rivalShadow,
    );

    // Weather & Terrain sync with animations module
    if (battleState.field) {
      if (battleState.field.weather !== BattleAnimations.currentWeather) {
        BattleAnimations.setWeather(battleState.field.weather);
      }
      if (battleState.field.terrain !== BattleAnimations.currentTerrain) {
        BattleAnimations.setTerrain(battleState.field.terrain);
      }
    }
    BattleAnimations.updateStatusAura("player", playerActive.status);
    BattleAnimations.updateStatusAura("rival", rivalActive.status);

    // Dynamic scale and aura for transformations
    if (playerActive.isDynamax) {
      DOM.playerSprite.classList.add("dynamax-scaled");
      DOM.playerSprite.classList.add(
        playerActive.isGigantamax ? "gigantamax-aura" : "dynamax-aura",
      );
    } else {
      DOM.playerSprite.classList.remove(
        "dynamax-scaled",
        "dynamax-aura",
        "gigantamax-aura",
      );
    }
    if (playerActive.isMega) {
      DOM.playerSprite.classList.add("mega-evolved-glow");
    } else {
      DOM.playerSprite.classList.remove("mega-evolved-glow");
    }

    if (rivalActive.isDynamax) {
      DOM.rivalSprite.classList.add("dynamax-scaled");
      DOM.rivalSprite.classList.add(
        rivalActive.isGigantamax ? "gigantamax-aura" : "dynamax-aura",
      );
    } else {
      DOM.rivalSprite.classList.remove(
        "dynamax-scaled",
        "dynamax-aura",
        "gigantamax-aura",
      );
    }
    if (rivalActive.isMega) {
      DOM.rivalSprite.classList.add("mega-evolved-glow");
    } else {
      DOM.rivalSprite.classList.remove("mega-evolved-glow");
    }

    // Names & Levels
    DOM.playerName.innerHTML = `${playerActive.name} <span class="hud-gender-${(playerActive.gender || "M").toLowerCase()}">${playerActive.gender === "M" ? "♂" : "♀"}</span>`;
    DOM.rivalName.innerHTML = `${rivalActive.name} <span class="hud-gender-${(rivalActive.gender || "M").toLowerCase()}">${rivalActive.gender === "M" ? "♂" : "♀"}</span>`;
    const lvlPrefix = t("battle_sim.level_prefix", "Nv.");
    DOM.playerLevel.textContent = `${lvlPrefix}${playerActive.level}`;
    DOM.rivalLevel.textContent = `${lvlPrefix}${rivalActive.level}`;

    // Transformation Badges (Mega / Dinamax / Gigamax)
    if (DOM.playerTransformBadge) {
      if (playerActive.isMega) {
        DOM.playerTransformBadge.innerHTML = `<span class="mega-badge">💎 MEGA</span>`;
      } else if (playerActive.isGigantamax) {
        DOM.playerTransformBadge.innerHTML = `<span class="gigantamax-badge">⚡ G-MAX</span>`;
      } else if (playerActive.isDynamax) {
        DOM.playerTransformBadge.innerHTML = `<span class="dynamax-badge">⚡ D-MAX</span>`;
      } else {
        DOM.playerTransformBadge.innerHTML = "";
      }
    }

    if (DOM.rivalTransformBadge) {
      if (rivalActive.isMega) {
        DOM.rivalTransformBadge.innerHTML = `<span class="mega-badge">💎 MEGA</span>`;
      } else if (rivalActive.isGigantamax) {
        DOM.rivalTransformBadge.innerHTML = `<span class="gigantamax-badge">⚡ G-MAX</span>`;
      } else if (rivalActive.isDynamax) {
        DOM.rivalTransformBadge.innerHTML = `<span class="dynamax-badge">⚡ D-MAX</span>`;
      } else {
        DOM.rivalTransformBadge.innerHTML = "";
      }
    }

    // Dynamax Turn Counters
    if (DOM.playerDynamaxCounter) {
      if (playerActive.isDynamax && playerActive.dynamaxTurnsLeft > 0) {
        DOM.playerDynamaxCounter.innerHTML = `<span class="dynamax-counter-pill">⏳ ${playerActive.dynamaxTurnsLeft}T</span>`;
      } else {
        DOM.playerDynamaxCounter.innerHTML = "";
      }
    }

    if (DOM.rivalDynamaxCounter) {
      if (rivalActive.isDynamax && rivalActive.dynamaxTurnsLeft > 0) {
        DOM.rivalDynamaxCounter.innerHTML = `<span class="dynamax-counter-pill">⏳ ${rivalActive.dynamaxTurnsLeft}T</span>`;
      } else {
        DOM.rivalDynamaxCounter.innerHTML = "";
      }
    }

    // HP Bars & Numbers with Ghost Bar synchronization
    const playerHpPercent = Math.max(
      0,
      Math.min(
        100,
        Math.round((playerActive.currentHp / playerActive.maxHp) * 100),
      ),
    );
    const rivalHpPercent = Math.max(
      0,
      Math.min(
        100,
        Math.round((rivalActive.currentHp / rivalActive.maxHp) * 100),
      ),
    );

    DOM.playerHpFill.style.width = `${playerHpPercent}%`;
    DOM.rivalHpFill.style.width = `${rivalHpPercent}%`;
    if (DOM.playerGhostFill)
      DOM.playerGhostFill.style.width = `${playerHpPercent}%`;
    if (DOM.rivalGhostFill)
      DOM.rivalGhostFill.style.width = `${rivalHpPercent}%`;

    // Colors
    updateHpBarColor(DOM.playerHpFill, playerHpPercent);
    updateHpBarColor(DOM.rivalHpFill, rivalHpPercent);

    DOM.playerHpNumbers.textContent = `${playerActive.currentHp} / ${playerActive.maxHp} PS`;
    DOM.rivalHpPercent.textContent = `${rivalHpPercent}%`;

    // Status Badges
    renderStatusBadge(DOM.playerStatusBadge, playerActive.status);
    renderStatusBadge(DOM.rivalStatusBadge, rivalActive.status);

    // Realistic Poké Ball Team Trackers
    renderTeamBalls(
      DOM.playerBalls,
      battleState.playerTeam,
      battleState.playerActiveIndex,
    );
    renderTeamBalls(
      DOM.rivalBalls,
      battleState.rivalTeam,
      battleState.rivalActiveIndex,
    );
  }

  function updateHpBarColor(barFillEl, percent) {
    if (!barFillEl) return;
    barFillEl.classList.remove(
      "hp-high",
      "hp-mid",
      "hp-low",
      "hp-yellow",
      "hp-red",
    );
    if (percent <= 20) {
      barFillEl.classList.add("hp-low");
    } else if (percent <= 50) {
      barFillEl.classList.add("hp-mid");
    } else {
      barFillEl.classList.add("hp-high");
    }
  }

  function renderStatusBadge(badgeEl, status) {
    if (!badgeEl) return;
    if (!status) {
      badgeEl.innerHTML = "";
      return;
    }
    const icons = {
      par: "PAR",
      brn: "BRN",
      psn: "PSN",
      tox: "TOX",
      slp: "SLP",
      frz: "FRZ",
    };
    badgeEl.innerHTML = `<span class="status-badge ${status}">${icons[status] || status.toUpperCase()}</span>`;
  }

  function renderTeamBalls(container, team, activeIndex = -1) {
    if (!container || !team) return;
    container.innerHTML = "";
    team.forEach((p, idx) => {
      const ball = document.createElement("div");
      const isCurrentActive = idx === activeIndex;
      const statusClass = p.isFainted
        ? "fainted"
        : p.status
          ? "has-status"
          : "alive";
      const activeClass = isCurrentActive ? "is-active" : "";

      ball.className =
        `team-ball-indicator ${statusClass} ${activeClass}`.trim();

      const statusLabel = p.isFainted
        ? t("battle_sim.debilitated", "Debilitado")
        : isCurrentActive
          ? p.status
            ? t("battle_sim.in_battle_status", "En combate ({s})").replace(
                "{s}",
                p.status.toUpperCase(),
              )
            : t("battle_sim.in_battle", "En combate")
          : p.status
            ? t("battle_sim.in_reserve_status", "En reserva ({s})").replace(
                "{s}",
                p.status.toUpperCase(),
              )
            : t("battle_sim.in_reserve", "En reserva");

      ball.title = `${p.name} — ${statusLabel} (${p.currentHp}/${p.maxHp} ${t("battle_sim.hp_label", "PS")})`;
      container.appendChild(ball);
    });
  }

  function setDialogue(text) {
    // Append new message as a visible entry in the dialogue box (accumulated log)
    const entry = document.createElement("div");
    entry.className = "battle-dialogue-entry";
    entry.textContent = text;
    DOM.dialogueText.appendChild(entry);
    // Auto-scroll to latest message
    DOM.dialogueText.scrollTop = DOM.dialogueText.scrollHeight;

    // Also add to the full log drawer
    if (DOM.logList) {
      const li = document.createElement("li");
      li.className = "py-1 border-bottom border-secondary";
      li.textContent = text;
      DOM.logList.prepend(li);
    }
  }

  function clearDialogue() {
    DOM.dialogueText.innerHTML = "";
  }

  // --- SUBMENU NAVIGATION ---
  function showMainMenu() {
    DOM.mainActionsPanel.style.display = "grid";
    DOM.movesPanel.style.display = "none";
    DOM.switchPanel.style.display = "none";
    DOM.bagPanel.style.display = "none";
  }

  function showMovesMenu() {
    DOM.mainActionsPanel.style.display = "none";
    DOM.movesPanel.style.display = "block";
    DOM.switchPanel.style.display = "none";
    DOM.bagPanel.style.display = "none";

    const battleState = APP_STATE.battleState;
    const playerActive = battleState.playerTeam[battleState.playerActiveIndex];
    const rules =
      battleState.rules ||
      (BattleData.getBattleRules
        ? BattleData.getBattleRules(battleState.format)
        : { allowMega: true, allowDynamax: true });

    // Determine transformation legality
    const canMega = Boolean(
      !battleState.playerMegaUsed &&
      rules.allowMega !== false &&
      playerActive &&
      !playerActive.isMega &&
      !playerActive.isDynamax &&
      BattleData.canPokemonMegaEvolve &&
      BattleData.canPokemonMegaEvolve(playerActive, rules),
    );

    const canDynamax = Boolean(
      !battleState.playerDynamaxUsed &&
      rules.allowDynamax !== false &&
      playerActive &&
      !playerActive.isDynamax &&
      !playerActive.isMega &&
      BattleData.canPokemonDynamax &&
      BattleData.canPokemonDynamax(playerActive, rules),
    );

    const isGigantamaxEligible =
      canDynamax &&
      BattleData.isPokemonGigantamax &&
      BattleData.isPokemonGigantamax(playerActive);

    // Transformation controls row
    if (DOM.transformControlsRow) {
      if (canMega || canDynamax) {
        DOM.transformControlsRow.style.display = "flex";
      } else {
        DOM.transformControlsRow.style.display = "none";
      }
    }

    if (DOM.btnMegaToggle) {
      DOM.btnMegaToggle.style.display = canMega ? "inline-flex" : "none";
      DOM.btnMegaToggle.classList.toggle("active", APP_STATE.isMegaToggled);
    }

    if (DOM.btnDynamaxToggle) {
      DOM.btnDynamaxToggle.style.display = canDynamax ? "inline-flex" : "none";
      DOM.btnDynamaxToggle.classList.toggle(
        "active",
        APP_STATE.isDynamaxToggled,
      );
      DOM.btnDynamaxToggle.classList.toggle(
        "btn-gigamax-toggle",
        isGigantamaxEligible,
      );
      if (DOM.btnDynamaxToggleText) {
        DOM.btnDynamaxToggleText.textContent = isGigantamaxEligible
          ? "⚡ GIGAMAX"
          : "⚡ DINAMAX";
      }
    }

    DOM.movesGrid.innerHTML = "";

    const isDynamaxActive = Boolean(
      playerActive.isDynamax || APP_STATE.isDynamaxToggled,
    );

    playerActive.moves.forEach((baseMove, idx) => {
      const btn = document.createElement("button");
      btn.className = "move-btn move-select-btn";
      const isUsable =
        baseMove && baseMove.currentPp > 0 && !playerActive.isFainted;
      btn.disabled = !isUsable;

      let move = baseMove;
      let isConvertedMax = false;
      let isConvertedGmax = false;

      if (isDynamaxActive && baseMove && BattleData.convertToMaxMove) {
        move = BattleData.convertToMaxMove(baseMove, playerActive);
        isConvertedMax = Boolean(move.isMaxMove);
        isConvertedGmax = Boolean(move.isGigantamax);
        if (isConvertedGmax) {
          btn.classList.add("move-card-gigantamax", "max-move-btn");
        } else {
          btn.classList.add("move-card-dynamax", "max-move-btn");
        }
      }

      const typeKey = (move ? move.type : "normal").toLowerCase();
      const moveDisplayName = move
        ? move.displayName || BattleData.getLocalizedMove(move.name)
        : "—";
      const catIcon =
        move?.category === "special"
          ? t("battle_sim.move_special", "🌀 Especial")
          : move?.category === "status"
            ? t("battle_sim.move_status", "✨ Estado")
            : t("battle_sim.move_physical", "💥 Físico");

      let badgeHtml = `<span class="move-btn-type-badge" style="background-color: var(--tc-${typeKey})">${typeKey.toUpperCase()}</span>`;
      if (isConvertedGmax) {
        badgeHtml += ` <span class="move-gmax-badge">G-MAX</span>`;
      } else if (isConvertedMax) {
        badgeHtml += ` <span class="move-dmax-badge">MAX</span>`;
      }

      btn.innerHTML = `
        <div class="move-btn-top">
          <span class="move-btn-name">${moveDisplayName}</span>
          <span class="move-btn-pp">PP ${baseMove ? baseMove.currentPp : 0}/${baseMove ? baseMove.maxPp : 0}</span>
        </div>
        <div class="move-btn-bottom">
          <div class="d-flex align-items-center gap-1">${badgeHtml}</div>
          <span class="move-btn-stats">${catIcon} | ${t("battle_sim.move_power", "POT:")} ${move?.power || "—"} | ${t("battle_sim.move_acc", "PREC:")} ${move?.neverMiss ? "—" : move?.accuracy || "—"}</span>
        </div>
      `;

      btn.addEventListener("click", () => {
        if (APP_STATE.isTurnResolving) return;
        handlePlayerAction({
          type: "attack",
          moveIndex: idx,
          mega: Boolean(APP_STATE.isMegaToggled),
          dynamax: Boolean(APP_STATE.isDynamaxToggled),
        });
      });

      DOM.movesGrid.appendChild(btn);
    });
  }

  function showSwitchMenu(isForced = false) {
    DOM.mainActionsPanel.style.display = "none";
    DOM.movesPanel.style.display = "none";
    DOM.switchPanel.style.display = "block";
    DOM.bagPanel.style.display = "none";

    DOM.btnBackFromSwitch.style.display = isForced ? "none" : "block";

    DOM.switchGrid.innerHTML = "";
    APP_STATE.battleState.playerTeam.forEach((p, idx) => {
      const card = document.createElement("div");
      const isCurrent = idx === APP_STATE.battleState.playerActiveIndex;
      card.className = `switch-pokemon-card ${isCurrent ? "active" : ""} ${p.isFainted ? "fainted" : ""}`;

      const switchSpriteUrl = p.showdownFront || p.spriteFront;
      card.innerHTML = `
        <img src="${switchSpriteUrl}" class="switch-card-sprite" alt="${p.name}"
             onerror="this.onerror=null;this.src='${p.spriteFront}';" />
        <div class="switch-card-info">
          <div class="switch-card-name">${p.name}</div>
          <div class="switch-card-hp">${p.isFainted ? t("battle_sim.debilitated", "DEBILITADO") : `${p.currentHp}/${p.maxHp} ${t("battle_sim.hp_label", "PS")}`}</div>
        </div>
      `;

      if (!p.isFainted && !isCurrent) {
        card.addEventListener("click", () => {
          if (APP_STATE.isTurnResolving) return;
          if (isForced) {
            handleForcedSwitch(idx);
          } else {
            handlePlayerAction({ type: "switch", targetIndex: idx });
          }
        });
      }

      DOM.switchGrid.appendChild(card);
    });
  }

  function showBagMenu() {
    DOM.mainActionsPanel.style.display = "none";
    DOM.movesPanel.style.display = "none";
    DOM.switchPanel.style.display = "none";
    DOM.bagPanel.style.display = "block";

    DOM.bagGrid.innerHTML = "";
    const items = BattleItems.getAvailableItemsList(
      APP_STATE.battleState.playerInventory,
    );

    if (items.length === 0) {
      DOM.bagGrid.innerHTML = `<div class="text-muted p-3">${t("battle_sim.no_items", "No te quedan objetos utilizables en la mochila.")}</div>`;
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "bag-item-card";
      const itemSprite = BattleData.getItemSpriteUrl(item.id);

      card.innerHTML = `
        <img src="${itemSprite}" class="bag-item-icon" alt="${item.name}" />
        <div class="flex-grow-1">
          <div class="bag-item-name">${item.name} <span class="bag-item-qty">x${item.quantity}</span></div>
          <div class="bag-item-desc">${item.desc}</div>
        </div>
      `;

      card.addEventListener("click", () => {
        if (APP_STATE.isTurnResolving) return;
        const activeIdx = APP_STATE.battleState.playerActiveIndex;
        const target = item.revivePercent
          ? APP_STATE.battleState.playerTeam.find((p) => p.isFainted)
          : APP_STATE.battleState.playerTeam[activeIdx];

        if (!target) {
          alert(
            t(
              "battle_sim.no_valid_pokemon",
              "No hay un Pokémon válido para usar este objeto.",
            ),
          );
          return;
        }

        const check = BattleItems.canUseItem(item.id, target);
        if (!check.canUse) {
          alert(check.reason);
          return;
        }

        const targetIdx = APP_STATE.battleState.playerTeam.indexOf(target);
        handlePlayerAction({
          type: "item",
          itemId: item.id,
          targetIndex: targetIdx,
        });
      });

      DOM.bagGrid.appendChild(card);
    });
  }

  // --- TURN DISPATCH & ANIMATIONS ---
  async function handlePlayerAction(playerAction) {
    if (APP_STATE.isTurnResolving) return;
    APP_STATE.isTurnResolving = true;
    showMainMenu();

    // Disable all action buttons & interactive move/switch elements
    if (DOM.mainActionsPanel) DOM.mainActionsPanel.style.pointerEvents = "none";
    if (DOM.movesPanel) DOM.movesPanel.style.pointerEvents = "none";
    if (DOM.switchPanel) DOM.switchPanel.style.pointerEvents = "none";
    if (DOM.bagPanel) DOM.bagPanel.style.pointerEvents = "none";

    DOM.btnFight.disabled = true;
    DOM.btnSwitch.disabled = true;
    DOM.btnBag.disabled = true;
    DOM.btnRun.disabled = true;

    try {
      // AI Chooses Rival Action
      const rivalAction = BattleAI.chooseRivalAction(
        APP_STATE.battleState,
        APP_STATE.difficulty,
      );

      // Resolve Turn
      const outcome = BattleEngine.resolveTurn(
        APP_STATE.battleState,
        playerAction,
        rivalAction,
      );

      // Sequential animation execution
      await BattleAnimations.playEvents(outcome.events, {
        onMessage: async (msg) => {
          setDialogue(msg);
        },
        onHpUpdate: async (side, curr, max) => {
          const fillEl = side === "player" ? DOM.playerHpFill : DOM.rivalHpFill;
          const ghostEl =
            side === "player" ? DOM.playerGhostFill : DOM.rivalGhostFill;
          const pct = Math.max(
            0,
            Math.min(100, Math.round((curr / max) * 100)),
          );
          fillEl.style.width = `${pct}%`;
          updateHpBarColor(fillEl, pct);
          if (ghostEl) {
            // Use requestAnimationFrame to sync with the next repaint instead of a fixed timeout
            await new Promise((resolve) => requestAnimationFrame(resolve));
            ghostEl.style.width = `${pct}%`;
          }
          if (side === "player") {
            DOM.playerHpNumbers.textContent = `${curr} / ${max} PS`;
          } else {
            DOM.rivalHpPercent.textContent = `${pct}%`;
          }
        },
        onStatusUpdate: async (side, status) => {
          const badgeEl =
            side === "player" ? DOM.playerStatusBadge : DOM.rivalStatusBadge;
          renderStatusBadge(badgeEl, status);
        },
        onSwitch: (side, newPokemon) => {
          updateBattleArena(APP_STATE.battleState, true);
        },
        onFaint: (side) => {
          // Update team balls immediately so the fainted ball turns gray right away
          updateBattleArena(APP_STATE.battleState, false);
        },
        onMegaEvolution: (side, data) => {
          updateBattleArena(APP_STATE.battleState, true);
        },
        onDynamaxStart: (side, data) => {
          updateBattleArena(APP_STATE.battleState, true);
        },
        onDynamaxEnd: (side) => {
          updateBattleArena(APP_STATE.battleState, true);
        },
      });

      // Reset transform toggles after action is executed
      APP_STATE.isMegaToggled = false;
      APP_STATE.isDynamaxToggled = false;
      if (DOM.btnMegaToggle) DOM.btnMegaToggle.classList.remove("active");
      if (DOM.btnDynamaxToggle) DOM.btnDynamaxToggle.classList.remove("active");

      updateBattleArena(APP_STATE.battleState);

      // Check if battle finished or forced switch is required
      if (APP_STATE.battleState.winner) {
        endBattle(APP_STATE.battleState.winner);
      } else if (APP_STATE.battleState.phase === "force_switch") {
        setDialogue(
          t(
            "battle_sim.fainted_switch",
            "¡Tu Pokémon se debilitó! Elige a tu siguiente contendiente.",
          ),
        );
        showSwitchMenu(true);
      } else {
        setDialogue(
          t("battle_sim.what_should_do", "¿Qué debería hacer {name}?").replace(
            "{name}",
            APP_STATE.battleState.playerTeam[
              APP_STATE.battleState.playerActiveIndex
            ].name,
          ),
        );
      }
    } finally {
      if (DOM.mainActionsPanel) DOM.mainActionsPanel.style.pointerEvents = "";
      if (DOM.movesPanel) DOM.movesPanel.style.pointerEvents = "";
      if (DOM.switchPanel) DOM.switchPanel.style.pointerEvents = "";
      if (DOM.bagPanel) DOM.bagPanel.style.pointerEvents = "";

      DOM.btnFight.disabled = false;
      DOM.btnSwitch.disabled = false;
      DOM.btnBag.disabled = false;
      DOM.btnRun.disabled = false;
      APP_STATE.isTurnResolving = false;
    }
  }

  // Handle Forced Switch when Player active fainted
  async function handleForcedSwitch(newIndex) {
    if (APP_STATE.isTurnResolving) return;
    APP_STATE.isTurnResolving = true;

    try {
      const outcome = BattleEngine.resolveForcedSwitch(
        APP_STATE.battleState,
        newIndex,
      );
      if (!outcome.success) return;

      await BattleAnimations.playEvents(outcome.events, {
        onMessage: async (msg) => setDialogue(msg),
        onSwitch: () => updateBattleArena(APP_STATE.battleState, true),
      });

      updateBattleArena(APP_STATE.battleState, true);
      showMainMenu();
      setDialogue(
        t("battle_sim.what_should_do", "¿Qué debería hacer {name}?").replace(
          "{name}",
          APP_STATE.battleState.playerTeam[
            APP_STATE.battleState.playerActiveIndex
          ].name,
        ),
      );
    } finally {
      APP_STATE.isTurnResolving = false;
    }
  }

  // --- BATTLE SUMMARY ---
  function endBattle(winner) {
    APP_STATE.phase = "summary";
    DOM.battlePhase.style.display = "none";
    DOM.summaryPhase.style.display = "block";

    if (winner === "player") {
      DOM.summaryTitle.textContent = t("battle_sim.victory", "🏆 ¡VICTORIA!");
      DOM.summaryTitle.className = "summary-title-victory";
      DOM.summarySubtitle.textContent = t(
        "battle_sim.victory_sub",
        "¡Has derrotado al equipo rival y dominado el combate con maestría!",
      );
    } else if (winner === "rival") {
      DOM.summaryTitle.textContent = t("battle_sim.defeat", "💔 DERROTA");
      DOM.summaryTitle.className = "summary-title-defeat";
      DOM.summarySubtitle.textContent = t(
        "battle_sim.defeat_sub",
        "Todos tus Pokémon se han debilitado. ¡Revisa tu estrategia y vuelve a intentarlo!",
      );
    } else {
      DOM.summaryTitle.textContent = t("battle_sim.draw", "⚖️ ¡EMPATE!");
      DOM.summaryTitle.className = "text-warning";
      DOM.summarySubtitle.textContent = t(
        "battle_sim.draw_sub",
        "Ambos bandos cayeron exhaustos en el fragor de la batalla.",
      );
    }

    DOM.summaryTurns.textContent = APP_STATE.battleState.turn;
    DOM.summaryPlayerFainted.textContent =
      APP_STATE.battleState.playerTeam.filter((p) => p.isFainted).length;
    DOM.summaryRivalFainted.textContent =
      APP_STATE.battleState.rivalTeam.filter((p) => p.isFainted).length;
  }

  // --- SPEED CONTROLS ---
  function setupSpeedControls() {
    const speeds = [
      { el: DOM.speedBtn025x, val: 0.25 },
      { el: DOM.speedBtn05x, val: 0.5 },
      { el: DOM.speedBtn1x, val: 1.0 },
      { el: DOM.speedBtn15x, val: 1.5 },
      { el: DOM.speedBtn2x, val: 2.0 },
      { el: DOM.speedBtnInstant, val: 0.0 },
    ];

    speeds.forEach(({ el, val }) => {
      if (!el) return;
      el.addEventListener("click", () => {
        speeds.forEach((s) => s.el && s.el.classList.remove("active"));
        el.classList.add("active");
        BattleAnimations.setSpeed(val);
      });
    });
  }

  // --- GENERAL EVENT LISTENERS ---
  function setupEventListeners() {
    // Toolbar selects
    if (DOM.formatSelect) {
      DOM.formatSelect.addEventListener("change", (e) => {
        APP_STATE.format = e.target.value;
        renderTeamBuilder();
      });
    }

    if (DOM.difficultySelect) {
      DOM.difficultySelect.addEventListener("change", (e) => {
        APP_STATE.difficulty = e.target.value;
      });
    }

    if (DOM.rulesSelect) {
      DOM.rulesSelect.addEventListener("change", (e) => {
        APP_STATE.rulesFormat = e.target.value;
      });
    }

    // Transformation toggle buttons in moves menu
    if (DOM.btnMegaToggle) {
      DOM.btnMegaToggle.addEventListener("click", () => {
        APP_STATE.isMegaToggled = !APP_STATE.isMegaToggled;
        if (APP_STATE.isMegaToggled) {
          APP_STATE.isDynamaxToggled = false;
          if (DOM.btnDynamaxToggle)
            DOM.btnDynamaxToggle.classList.remove("active");
        }
        DOM.btnMegaToggle.classList.toggle("active", APP_STATE.isMegaToggled);
        showMovesMenu();
      });
    }

    if (DOM.btnDynamaxToggle) {
      DOM.btnDynamaxToggle.addEventListener("click", () => {
        APP_STATE.isDynamaxToggled = !APP_STATE.isDynamaxToggled;
        if (APP_STATE.isDynamaxToggled) {
          APP_STATE.isMegaToggled = false;
          if (DOM.btnMegaToggle) DOM.btnMegaToggle.classList.remove("active");
        }
        DOM.btnDynamaxToggle.classList.toggle(
          "active",
          APP_STATE.isDynamaxToggled,
        );
        showMovesMenu();
      });
    }

    // Prep actions
    DOM.btnQuickTeam.addEventListener("click", generateQuickTeam);
    DOM.btnImportTeam.addEventListener("click", importFromPokedex);
    DOM.btnClearTeam.addEventListener("click", () => {
      APP_STATE.playerTeamConfig = [];
      renderTeamBuilder();
    });
    DOM.btnStartBattle.addEventListener("click", startBattle);

    // Main in-battle buttons
    DOM.btnFight.addEventListener("click", showMovesMenu);
    DOM.btnSwitch.addEventListener("click", () => showSwitchMenu(false));
    DOM.btnBag.addEventListener("click", showBagMenu);
    DOM.btnRun.addEventListener("click", () => {
      if (
        confirm("¿Estás seguro de que quieres rendirte y abandonar el combate?")
      ) {
        handlePlayerAction({ type: "forfeit" });
      }
    });

    // Submenu Back buttons
    DOM.btnBackFromMoves.addEventListener("click", showMainMenu);
    DOM.btnBackFromSwitch.addEventListener("click", showMainMenu);
    DOM.btnBackFromBag.addEventListener("click", showMainMenu);

    // Toggle Combat Log drawer
    DOM.btnToggleLog.addEventListener("click", () => {
      const isVisible = DOM.logDrawer.style.display === "block";
      DOM.logDrawer.style.display = isVisible ? "none" : "block";
    });

    // Summary buttons
    DOM.btnRematch.addEventListener("click", startBattle);
    DOM.btnNewBattle.addEventListener("click", () => {
      generateQuickTeam();
      startBattle();
    });
    DOM.btnBackToEditor.addEventListener("click", () => {
      DOM.summaryPhase.style.display = "none";
      DOM.battlePhase.style.display = "none";
      DOM.prepPhase.style.display = "block";
      renderTeamBuilder();
    });

    // Search Autocomplete Handler
    DOM.modalSearchInput.addEventListener("input", () => {
      const q = DOM.modalSearchInput.value.trim().toLowerCase();
      if (!q || q.length < 2) {
        DOM.modalSearchDropdown.style.display = "none";
        DOM.modalSearchDropdown.innerHTML = "";
        return;
      }

      const presetMatches = BattleData.COMPETITIVE_PRESETS.filter(
        (p) => p.name.toLowerCase().includes(q) || p.species.includes(q),
      );
      const speciesMatches = (APP_STATE.allPokemonSpecies || [])
        .filter((s) => s.name.toLowerCase().includes(q))
        .slice(0, 10);

      const combined = [...presetMatches];
      speciesMatches.forEach((sm) => {
        if (!combined.some((c) => c.species === sm.name)) {
          const idMatch = sm.url.match(/\/(\d+)\/?$/);
          const pId = idMatch ? parseInt(idMatch[1]) : 25;
          const sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pId}.png`;
          const showdownFront = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pId}.gif`;
          const showdownBack = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${pId}.gif`;

          // If types already mapped in SpeciesTypeCache, use them immediately
          const cachedTypes =
            window.SpeciesTypeCache && window.SpeciesTypeCache.get(sm.name);
          const initialTypes =
            cachedTypes && cachedTypes.length > 0 ? cachedTypes : null;

          const pokeItem = {
            id: pId,
            name: sm.name.charAt(0).toUpperCase() + sm.name.slice(1),
            species: sm.name,
            types: initialTypes || ["normal"],
            spriteFront: sprite,
            spriteBack: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pId}.png`,
            showdownFront: showdownFront,
            showdownBack: showdownBack,
            baseStats: { hp: 70, atk: 70, def: 70, spa: 70, spd: 70, spe: 70 },
            moves: ["tackle", "quick-attack"],
            isApiSpecies: true,
            url: sm.url,
          };

          // Asynchronously resolve real types & showdown sprites from PokéAPI cache
          const fetchTypesAsync = async (itemElement) => {
            try {
              const d = window.fetchCached
                ? await window.fetchCached(sm.url)
                : await fetch(sm.url).then((r) => r.json());
              if (d && d.types) {
                pokeItem.types = d.types.map((t) => t.type.name);
                pokeItem.id = d.id;
                if (window.SpeciesTypeCache) {
                  window.SpeciesTypeCache.set(sm.name, pokeItem.types);
                }
                pokeItem.spriteFront =
                  d.sprites.front_default ||
                  sprite;
                pokeItem.spriteBack =
                  d.sprites.back_default ||
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${d.id || pId}.png`;
                pokeItem.showdownFront =
                  d.sprites.other?.showdown?.front_default ||
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${d.id || pId}.gif`;
                pokeItem.showdownBack =
                  d.sprites.other?.showdown?.back_default ||
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${d.id || pId}.gif`;
                pokeItem.baseStats = {
                  hp: d.stats[0]?.base_stat || 70,
                  atk: d.stats[1]?.base_stat || 70,
                  def: d.stats[2]?.base_stat || 70,
                  spa: d.stats[3]?.base_stat || 70,
                  spd: d.stats[4]?.base_stat || 70,
                  spe: d.stats[5]?.base_stat || 70,
                };
                pokeItem.abilities = (d.abilities || []).map(
                  (a) => a.ability.name,
                );
                pokeItem.learnableMoves = (d.moves || []).map(
                  (m) => m.move.name,
                );

                // Update row in open dropdown if still in DOM
                if (itemElement) {
                  const elType = itemElement.querySelector(
                    ".species-types-preview",
                  );
                  if (elType) {
                    elType.textContent = pokeItem.types
                      .join(" / ")
                      .toUpperCase();
                  }
                  const elImg = itemElement.querySelector("img");
                  if (elImg && pokeItem.spriteFront) {
                    elImg.src = pokeItem.spriteFront;
                  }
                }
              }
            } catch (err) {}
          };

          pokeItem._resolveDetails = fetchTypesAsync;
          combined.push(pokeItem);
        }
      });

      if (combined.length === 0) {
        DOM.modalSearchDropdown.style.display = "none";
        return;
      }

      DOM.modalSearchDropdown.innerHTML = "";
      combined.slice(0, 8).forEach((poke) => {
        const item = document.createElement("div");
        item.className = "battle-search-item";
        const spriteUrl =
          poke.spriteFront ||
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id || 25}.png`;
        const typesStr = (poke.types || ["normal"]).join(" / ").toUpperCase();
        item.innerHTML = `
          <img src="${spriteUrl}" style="width: 32px; height: 32px; image-rendering: pixelated; object-fit: contain;" />
          <div class="flex-grow-1">
            <div class="fw-bold text-light">${poke.name}</div>
            <small class="text-muted species-types-preview">${typesStr}</small>
          </div>
          <span class="badge ${poke.isApiSpecies ? "bg-secondary" : "bg-primary"}">${poke.isApiSpecies ? "PokéAPI" : "Preset"}</span>
        `;

        if (poke._resolveDetails) {
          poke._resolveDetails(item);
        }

        item.addEventListener("click", async (e) => {
          e.preventDefault();
          DOM.modalSearchInput.value = poke.name;
          DOM.modalSearchDropdown.style.display = "none";

          if (poke.isApiSpecies) {
            try {
              const fetcher = window.fetchCached || fetch;
              const details = window.fetchCached
                ? await window.fetchCached(poke.url)
                : await fetch(poke.url).then((r) => r.json());
              if (details) {
                poke.id = details.id;
                poke.types = details.types.map((t) => t.type.name);
                poke.baseStats = {
                  hp: details.stats[0]?.base_stat || 70,
                  atk: details.stats[1]?.base_stat || 70,
                  def: details.stats[2]?.base_stat || 70,
                  spa: details.stats[3]?.base_stat || 70,
                  spd: details.stats[4]?.base_stat || 70,
                  spe: details.stats[5]?.base_stat || 70,
                };
                poke.spriteFront =
                  details.sprites.front_default ||
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${details.id}.png`;
                poke.spriteBack =
                  details.sprites.back_default ||
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${details.id}.png`;
                poke.showdownFront =
                  details.sprites.other?.showdown?.front_default ||
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${details.id}.gif`;
                poke.showdownBack =
                  details.sprites.other?.showdown?.back_default ||
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${details.id}.gif`;
                poke.abilities = details.abilities.map((a) => a.ability.name);
                poke.learnableMoves = (details.moves || []).map(
                  (m) => m.move.name,
                );
              }
            } catch (err) {}
          }

          APP_STATE.currentModalPokemon = poke;
          updateModalPreview(poke);
          populateModalAbilities(poke);
          populateModalItems(poke);
          populateModalMoves(poke);

          // If preset or partial learnset, fetch full PokéAPI move list in background and refresh
          ensureFullLearnsetForPokemon(poke);
        });
        DOM.modalSearchDropdown.appendChild(item);
      });
      DOM.modalSearchDropdown.style.display = "block";

      // Position species search dropdown intelligently (up or down)
      const modalBody = DOM.editModalEl
        ? DOM.editModalEl.querySelector(".battle-modal-body")
        : null;
      const boundaryRect = modalBody
        ? modalBody.getBoundingClientRect()
        : {
            top: 0,
            bottom: window.innerHeight,
          };
      const inputRect = DOM.modalSearchInput.getBoundingClientRect();
      const dropHeight = DOM.modalSearchDropdown.offsetHeight || 220;
      const spaceBelow = boundaryRect.bottom - inputRect.bottom;
      const spaceAbove = inputRect.top - boundaryRect.top;

      if (spaceBelow < dropHeight + 10 && spaceAbove > spaceBelow) {
        DOM.modalSearchDropdown.classList.add("drop-up");
        DOM.modalSearchDropdown.style.maxHeight = `${Math.min(240, Math.max(120, spaceAbove - 15))}px`;
      } else {
        DOM.modalSearchDropdown.classList.remove("drop-up");
        DOM.modalSearchDropdown.style.maxHeight = `${Math.min(240, Math.max(120, spaceBelow - 15))}px`;
      }
    });

    document.addEventListener("click", (e) => {
      if (
        !DOM.modalSearchInput.contains(e.target) &&
        !DOM.modalSearchDropdown.contains(e.target)
      ) {
        DOM.modalSearchDropdown.style.display = "none";
        DOM.modalSearchDropdown.classList.remove("drop-up");
      }
    });

    const triggerPreviewRefresh = () => {
      const pName = DOM.modalSearchInput.value.trim().toLowerCase();
      let current = APP_STATE.currentModalPokemon;
      if (
        !current ||
        (current.species !== pName && current.name.toLowerCase() !== pName)
      ) {
        current = BattleData.COMPETITIVE_PRESETS.find(
          (p) => p.species === pName || p.name.toLowerCase() === pName,
        ) || {
          name: DOM.modalSearchInput.value || "Pikachu",
          species: pName || "pikachu",
          types: ["normal"],
          baseStats: { hp: 70, atk: 70, def: 70, spa: 70, spd: 70, spe: 70 },
        };
        APP_STATE.currentModalPokemon = current;
        populateModalAbilities(current);
        populateModalItems(current);
        populateModalMoves(current);
        ensureFullLearnsetForPokemon(current);
      }
      updateModalPreview(current);
    };

    DOM.modalLevelInput.addEventListener("input", triggerPreviewRefresh);
    DOM.modalNatureSelect.addEventListener("change", triggerPreviewRefresh);
    if (DOM.modalEvPresetSelect)
      DOM.modalEvPresetSelect.addEventListener("change", triggerPreviewRefresh);
    if (DOM.modalItemSelect)
      DOM.modalItemSelect.addEventListener("change", updateItemPreview);

    // Edit Modal Randomize button: generate a sensible, cohesive build for the current Pokémon
    if (DOM.modalRandomizeBtn) {
      DOM.modalRandomizeBtn.addEventListener("click", () => {
        let basePoke = APP_STATE.currentModalPokemon;
        const searchVal = DOM.modalSearchInput.value.trim().toLowerCase();

        if (
          !basePoke ||
          (basePoke.species !== searchVal &&
            basePoke.name.toLowerCase() !== searchVal)
        ) {
          const matchedPreset = BattleData.COMPETITIVE_PRESETS.find(
            (p) =>
              p.species === searchVal || p.name.toLowerCase() === searchVal,
          );
          if (matchedPreset) {
            basePoke = JSON.parse(JSON.stringify(matchedPreset));
          }
        }

        // Determine target level from current input or default to 50
        const currentLvl = parseInt(DOM.modalLevelInput.value) || 50;
        const randomized = BattleData.randomizePokemonBuild
          ? BattleData.randomizePokemonBuild(basePoke, {
              targetLevel: currentLvl,
              variance: 0, // maintain the user's chosen level when randomizing inside modal
              allowMega: true,
            })
          : basePoke;

        if (randomized) {
          APP_STATE.currentModalPokemon = randomized;

          DOM.modalSearchInput.value = randomized.name || randomized.species;
          DOM.modalLevelInput.value = randomized.level || currentLvl;
          if (DOM.modalGenderSelect)
            DOM.modalGenderSelect.value = randomized.gender || "M";
          if (DOM.modalNatureSelect)
            DOM.modalNatureSelect.value = randomized.nature || "hardy";
          if (DOM.modalEvPresetSelect && randomized.evPreset) {
            DOM.modalEvPresetSelect.value = randomized.evPreset;
          }

          populateModalAbilities(randomized);
          populateModalItems(randomized);
          populateModalMoves(randomized);

          // Synchronize move selects with randomized moves
          if (Array.isArray(randomized.moves)) {
            const moveSelectors = [
              DOM.modalMove1,
              DOM.modalMove2,
              DOM.modalMove3,
              DOM.modalMove4,
            ];
            moveSelectors.forEach((sel, idx) => {
              if (sel) {
                sel.value = randomized.moves[idx] || "";
              }
            });
            syncMoveDisabledOptions(moveSelectors);
          }

          if (DOM.modalItemSelect && randomized.item) {
            DOM.modalItemSelect.value = randomized.item;
          }
          updateItemPreview();
          updateModalPreview(randomized);
        }
      });
    }

    // Edit Modal Save button
    DOM.modalSaveBtn.addEventListener("click", () => {
      const slot = APP_STATE.editingSlotIndex;
      if (slot < 0) return;

      const pName = DOM.modalSearchInput.value.trim() || "Pikachu";
      const presetMatch = BattleData.COMPETITIVE_PRESETS.find(
        (p) =>
          p.species === pName.toLowerCase() ||
          p.name.toLowerCase() === pName.toLowerCase(),
      );
      const current = APP_STATE.currentModalPokemon || {};

      const updated = presetMatch
        ? JSON.parse(JSON.stringify(presetMatch))
        : {
            species: (current.species || pName).toLowerCase(),
            name: pName,
            id: current.id || 25,
            spriteFront:
              current.spriteFront ||
              `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${current.id || 25}.png`,
            spriteBack:
              current.spriteBack ||
              `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${current.id || 25}.png`,
            showdownFront:
              current.showdownFront ||
              `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${current.id || 25}.gif`,
            showdownBack:
              current.showdownBack ||
              `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${current.id || 25}.gif`,
            baseStats: current.baseStats || {
              hp: 80,
              atk: 80,
              def: 80,
              spa: 80,
              spd: 80,
              spe: 80,
            },
            types: current.types || ["normal"],
            ivs: current.ivs || {
              hp: 31,
              atk: 31,
              def: 31,
              spa: 31,
              spd: 31,
              spe: 31,
            },
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          };

      updated.level = parseInt(DOM.modalLevelInput.value) || 50;
      updated.gender = DOM.modalGenderSelect.value || "M";
      updated.nature = DOM.modalNatureSelect.value || "hardy";
      updated.ability = DOM.modalAbilitySelect.value || "normal";

      const legalItems = BattleData.getLegalItemsForPokemon
        ? BattleData.getLegalItemsForPokemon(updated)
        : Object.keys(BattleData.HELD_ITEMS);
      const chosenItem = DOM.modalItemSelect.value || null;
      updated.item =
        chosenItem && legalItems.includes(chosenItem) ? chosenItem : null;

      const evKey = DOM.modalEvPresetSelect
        ? DOM.modalEvPresetSelect.value
        : "atk_spe";
      updated.evPreset = evKey;
      updated.evs = JSON.parse(
        JSON.stringify(
          EV_PRESETS[evKey] || {
            hp: 0,
            atk: 0,
            def: 0,
            spa: 0,
            spd: 0,
            spe: 0,
          },
        ),
      );

      const legalMoves = BattleData.getLegalMovesForPokemon
        ? BattleData.getLegalMovesForPokemon(updated)
        : Object.keys(BattleData.COMMON_MOVES);
      const chosenMoves = [
        DOM.modalMove1.value,
        DOM.modalMove2.value,
        DOM.modalMove3.value,
        DOM.modalMove4.value,
      ].filter((m) => m && legalMoves.includes(m));

      // Guarantee at least 1 valid canon move
      if (chosenMoves.length === 0 && legalMoves.length > 0) {
        chosenMoves.push(legalMoves[0]);
      }
      updated.moves = chosenMoves;

      APP_STATE.playerTeamConfig[slot] = updated;
      renderTeamBuilder();
      if (
        document.activeElement &&
        DOM.editModalEl &&
        DOM.editModalEl.contains(document.activeElement)
      ) {
        document.activeElement.blur();
      }
      if (modalBsInstance) modalBsInstance.hide();
    });
  }

  init();
});
