/**
 * Pokemon Battle Simulator Engine
 * Core mechanics, damage calculations, stat generation, priority resolution,
 * status ailments, and event emissions.
 * Compatible with Browser and Node.js.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const BattleData = require("./battle-data.js");
    const BattleDamage = require("./battle-damage.js");
    const BattleEvents = require("./battle-events.js");
    const BattleRNG = require("./battle-rng.js");
    const BattleTurn = require("./battle-turn.js");
    const BattleAbilities = require("./battle-abilities.js");
    const BattleField = require("./battle-field.js");
    const GenerationRules = require("./battle-rules.js");
    const BattleItems = require("./battle-items.js");
    module.exports = factory(
      BattleData,
      BattleDamage,
      BattleEvents,
      BattleRNG,
      BattleTurn,
      BattleAbilities,
      BattleField,
      GenerationRules,
      BattleItems
    );
  } else {
    root.BattleEngine = factory(
      root.BattleData,
      root.BattleDamage,
      root.BattleEvents,
      root.BattleRNG,
      root.BattleTurn,
      root.BattleAbilities,
      root.BattleField,
      root.GenerationRules,
      root.BattleItems
    );
  }
})(typeof self !== "undefined" ? self : this, function (
  BattleData,
  BattleDamage,
  BattleEvents,
  BattleRNG,
  BattleTurn,
  BattleAbilities,
  BattleField,
  GenerationRules,
  BattleItems
) {
  "use strict";

  // Graceful fallback if companion modules are loaded in different order in browser
  const DamageModule = BattleDamage || (typeof window !== "undefined" && window.BattleDamage);
  const EventsModule = BattleEvents || (typeof window !== "undefined" && window.BattleEvents);
  const RngModule = BattleRNG || (typeof window !== "undefined" && window.BattleRNG);
  const TurnModule = BattleTurn || (typeof window !== "undefined" && window.BattleTurn);
  const AbilitiesModule = BattleAbilities || (typeof window !== "undefined" && window.BattleAbilities);
  const FieldModule = BattleField || (typeof window !== "undefined" && window.BattleField);
  const RulesModule = GenerationRules || (typeof window !== "undefined" && window.GenerationRules);
  const ItemsModule = BattleItems || (typeof window !== "undefined" && window.BattleItems);

  const {
    TYPE_CHART,
    NATURES,
    COMMON_MOVES,
    HELD_ITEMS,
    BAG_ITEMS,
    BATTLE_FORMATS,
    MEGA_EVOLUTIONS,
    MAX_MOVES,
    GIGANTAMAX_SPECIES,
    G_MAX_MOVES,
    getBattleRules,
    canPokemonMegaEvolve,
    getMegaEvolutionData,
    canPokemonDynamax,
    isPokemonGigantamax,
    getGigantamaxData,
    convertToMaxMove,
    calculateMaxMovePower,
  } = BattleData;

  // --- STAT CALCULATIONS (Official Gen 3-9 Formulas) ---

  function calculateHp(base, iv = 31, ev = 0, level = 50) {
    if (base === 1) return 1; // Shedinja special case
    const clampedIv = Math.max(0, Math.min(31, parseInt(iv) || 0));
    const clampedEv = Math.max(0, Math.min(252, parseInt(ev) || 0));
    const clampedLvl = Math.max(1, Math.min(100, parseInt(level) || 50));
    return (
      Math.floor(
        ((2 * base + clampedIv + Math.floor(clampedEv / 4)) * clampedLvl) / 100,
      ) +
      clampedLvl +
      10
    );
  }

  function calculateStat(
    statName,
    base,
    iv = 31,
    ev = 0,
    level = 50,
    natureName = "hardy",
  ) {
    if (statName === "hp") {
      return calculateHp(base, iv, ev, level);
    }
    const clampedIv = Math.max(0, Math.min(31, parseInt(iv) || 0));
    const clampedEv = Math.max(0, Math.min(252, parseInt(ev) || 0));
    const clampedLvl = Math.max(1, Math.min(100, parseInt(level) || 50));

    let val =
      Math.floor(
        ((2 * base + clampedIv + Math.floor(clampedEv / 4)) * clampedLvl) / 100,
      ) + 5;

    // Nature modifier (+10% or -10%)
    const nature = NATURES[natureName.toLowerCase()] || NATURES.hardy;
    let natureMult = 1.0;
    if (nature.plus === statName && nature.minus !== statName) {
      natureMult = 1.1;
    } else if (nature.minus === statName && nature.plus !== statName) {
      natureMult = 0.9;
    }

    return Math.floor(val * natureMult);
  }

  function calculateAllStats(
    baseStats,
    ivs = {},
    evs = {},
    level = 50,
    nature = "hardy",
  ) {
    return {
      hp: calculateHp(baseStats.hp, ivs.hp, evs.hp, level),
      atk: calculateStat("atk", baseStats.atk, ivs.atk, evs.atk, level, nature),
      def: calculateStat("def", baseStats.def, ivs.def, evs.def, level, nature),
      spa: calculateStat("spa", baseStats.spa, ivs.spa, evs.spa, level, nature),
      spd: calculateStat("spd", baseStats.spd, ivs.spd, evs.spd, level, nature),
      spe: calculateStat("spe", baseStats.spe, ivs.spe, evs.spe, level, nature),
    };
  }

  // --- STAT STAGE MULTIPLIERS (-6 to +6) ---

  const STAT_STAGE_MULTIPLIERS = {
    "-6": 2 / 8,
    "-5": 2 / 7,
    "-4": 2 / 6,
    "-3": 2 / 5,
    "-2": 2 / 4,
    "-1": 2 / 3,
    0: 2 / 2,
    1: 3 / 2,
    2: 4 / 2,
    3: 5 / 2,
    4: 6 / 2,
    5: 7 / 2,
    6: 8 / 2,
  };

  const ACC_EVASION_MULTIPLIERS = {
    "-6": 3 / 9,
    "-5": 3 / 8,
    "-4": 3 / 7,
    "-3": 3 / 6,
    "-2": 3 / 5,
    "-1": 3 / 4,
    0: 3 / 3,
    1: 4 / 3,
    2: 5 / 3,
    3: 6 / 3,
    4: 7 / 3,
    5: 8 / 3,
    6: 9 / 3,
  };

  function getStatStageMultiplier(stage) {
    const clamped = Math.max(-6, Math.min(6, parseInt(stage) || 0));
    return STAT_STAGE_MULTIPLIERS[clamped.toString()];
  }

  function getAccEvasionMultiplier(stage) {
    const clamped = Math.max(-6, Math.min(6, parseInt(stage) || 0));
    return ACC_EVASION_MULTIPLIERS[clamped.toString()];
  }

  // --- TYPE EFFECTIVENESS ---

  function getTypeEffectiveness(moveType, targetTypes) {
    if (!moveType || !targetTypes || targetTypes.length === 0) return 1.0;
    const move = moveType.toLowerCase();
    const chart = TYPE_CHART[move];
    if (!chart) return 1.0;

    let total = 1.0;
    for (const t of targetTypes) {
      const defType = t.toLowerCase();
      if (chart.hasOwnProperty(defType)) {
        total *= chart[defType];
      }
    }
    return total;
  }

  // --- EFFECTIVE SPEED ---

  function getEffectiveSpeed(pokemon, field = {}, rules = {}) {
    if (TurnModule && typeof TurnModule.calculateEffectiveSpeed === "function") {
      return TurnModule.calculateEffectiveSpeed(pokemon, field, rules);
    }
    let speed = (pokemon && pokemon.stats) ? pokemon.stats.spe : 50;
    const stage = pokemon && pokemon.stages ? pokemon.stages.spe || 0 : 0;
    speed = Math.floor(speed * getStatStageMultiplier(stage));

    if (pokemon && pokemon.status === "par") {
      speed = Math.floor(speed * (rules.paralysisSpeedMultiplier || 0.5));
    }
    if (pokemon && pokemon.item === "choice-scarf") {
      speed = Math.floor(speed * 1.5);
    }
    if (field && field.tailwind) {
      speed = Math.floor(speed * 2);
    }
    if (pokemon && pokemon.boosterEnergyStat === "spe") {
      speed = Math.floor(speed * 1.5);
    }
    return Math.max(1, speed);
  }

  // --- DAMAGE CALCULATION (Official Formula + Damage Module Bridge) ---

  function calculateDamage(
    attacker,
    defender,
    move,
    field = {},
    randomRoll = null,
    options = {}
  ) {
    if (DamageModule && typeof DamageModule.calculateDamage === "function") {
      const calcOptions = {
        ...options,
        randomRoll: randomRoll !== null ? randomRoll : options.randomRoll
      };
      return DamageModule.calculateDamage(attacker, defender, move, field, calcOptions);
    }

    if (!move || move.category === "status" || (move.power || 0) <= 0) {
      return { damage: 0, effectiveness: 1, isCrit: false, isImmune: false };
    }

    const effectiveness = getTypeEffectiveness(move.type, defender.types);
    if (effectiveness === 0) {
      return { damage: 0, effectiveness: 0, isCrit: false, isImmune: true };
    }

    const isPhysical = move.category === "physical";
    const attackStatKey = isPhysical ? "atk" : "spa";
    const defenseStatKey = isPhysical ? "def" : "spd";

    const a = Math.floor(attacker.stats[attackStatKey] * getStatStageMultiplier(attacker.stages ? attacker.stages[attackStatKey] || 0 : 0));
    const d = Math.max(1, Math.floor(defender.stats[defenseStatKey] * getStatStageMultiplier(defender.stages ? defender.stages[defenseStatKey] || 0 : 0)));
    const level = attacker.level || 50;
    const baseDamage = Math.floor(Math.floor((Math.floor((2 * level) / 5 + 2) * move.power * a) / d) / 50) + 2;

    const roll = randomRoll !== null ? randomRoll : 100;
    const finalDamage = Math.max(1, Math.floor((baseDamage * roll * effectiveness) / 100));

    return {
      damage: finalDamage,
      effectiveness,
      isCrit: false,
      isImmune: false
    };
  }

  // --- POKEMON INITIALIZATION & NORMALIZATION ---

  function createBattlePokemon(config) {
    const baseStats = config.baseStats || {
      hp: 50,
      atk: 50,
      def: 50,
      spa: 50,
      spd: 50,
      spe: 50,
    };
    const level = parseInt(config.level) || 50;
    const ivs = config.ivs || {
      hp: 31,
      atk: 31,
      def: 31,
      spa: 31,
      spd: 31,
      spe: 31,
    };
    const evs = config.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const nature = config.nature || "hardy";

    const calculatedStats = calculateAllStats(
      baseStats,
      ivs,
      evs,
      level,
      nature,
    );

    // Normalize moves list
    const moves = (config.moves || [])
      .map((m) => {
        if (!m) return null;
        if (typeof m === "string") {
          const s = m.toLowerCase().replace(/_/g, "-");
          const found = COMMON_MOVES[s] || (typeof window !== "undefined" && window.BattleDynamicMoves && window.BattleDynamicMoves[s]) || {
            name: s,
            displayName: (typeof BattleData !== "undefined" && BattleData.getLocalizedMove) ? BattleData.getLocalizedMove(s) : s.charAt(0).toUpperCase() + s.slice(1),
            type: "normal",
            category: "physical",
            power: 50,
            accuracy: 100,
            pp: 20,
            priority: 0,
          };
          return {
            ...found,
            currentPp: found.pp !== undefined ? found.pp : 20,
            maxPp: found.pp !== undefined ? found.pp : 20,
          };
        }
        return {
          name: m.name,
          displayName: m.displayName || ((typeof BattleData !== "undefined" && BattleData.getLocalizedMove) ? BattleData.getLocalizedMove(m.name) : m.name),
          type: m.type || "normal",
          category: m.category || "physical",
          power: m.power !== undefined ? m.power : 40,
          accuracy: m.accuracy !== undefined ? m.accuracy : 100,
          pp: m.pp || 20,
          currentPp: m.currentPp !== undefined ? m.currentPp : m.pp || 20,
          maxPp: m.maxPp || m.pp || 20,
          priority: m.priority || 0,
          critRatio: m.critRatio || 0,
          secondary: m.secondary || null,
          statChanges: m.statChanges || null,
          selfStatChanges: m.selfStatChanges || null,
          healPercent: m.healPercent || null,
          drainPercent: m.drainPercent || null,
          recoilPercent: m.recoilPercent || null,
          status: m.status || null,
        };
      })
      .filter(Boolean);

    // Fallback if no moves
    if (moves.length === 0) {
      const tackle = COMMON_MOVES.tackle;
      moves.push({ ...tackle, currentPp: tackle.pp, maxPp: tackle.pp });
    }

    const initialTypes = Array.isArray(config.types) ? [...config.types] : ["normal"];
    const initialName = config.name || "Pokémon";
    const pokeId = config.id || 25;
    const initialSpriteFront =
      config.spriteFront ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`;
    const initialSpriteBack =
      config.spriteBack ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokeId}.png`;
    const initialArtwork =
      config.artwork ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokeId}.png`;
    // Animated showdown sprites (GIFs) – derive from config or build from id
    const initialShowdownFront =
      config.showdownFront ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokeId}.gif`;
    const initialShowdownBack =
      config.showdownBack ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${pokeId}.gif`;

    return {
      id: config.id || Math.floor(Math.random() * 100000),
      species: (config.species || config.name || "").toLowerCase(),
      name: initialName,
      originalName: initialName,
      level,
      gender: config.gender || (Math.random() < 0.5 ? "M" : "F"),
      types: [...initialTypes],
      originalTypes: [...initialTypes],
      baseStats: { ...baseStats },
      originalBaseStats: { ...baseStats },
      stats: calculatedStats,
      currentHp: calculatedStats.hp,
      maxHp: calculatedStats.hp,
      originalMaxHp: calculatedStats.hp,
      ivs,
      evs,
      nature,
      ability: config.ability || "none",
      originalAbility: config.ability || "none",
      revealedAbility: false,
      item: config.item || null,
      revealedItem: false,
      moves,
      revealedMoves: [],
      status: null, // 'par', 'brn', 'psn', 'tox', 'slp', 'frz'
      statusTurns: 0,
      toxicCounter: 0,
      volatiles: {}, // { confusion: 2, flinch: true, substitute: 0 }
      stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
      isFainted: false,
      lockedMove: null, // For Choice Band/Specs/Scarf
      // Mega Evolution State
      isMega: Boolean(config.isMega),
      megaFormId: config.megaFormId || null,
      // Dynamax & Gigantamax State
      isDynamax: Boolean(config.isDynamax),
      isGigantamax: Boolean(config.isGigantamax),
      canGigantamax: config.canGigantamax !== undefined ? Boolean(config.canGigantamax) : true,
      dynamaxTurnsLeft: parseInt(config.dynamaxTurnsLeft) || 0,
      dynamaxMultiplier: config.dynamaxMultiplier || 2.0,
      isMaxGuarded: false,
      // Teracristalización State (Gen IX)
      isTerastallized: Boolean(config.isTerastallized),
      teraType: (config.teraType || initialTypes[0] || "normal").toLowerCase(),
      spriteFront: initialSpriteFront,
      spriteBack: initialSpriteBack,
      artwork: initialArtwork,
      showdownFront: initialShowdownFront,
      showdownBack: initialShowdownBack,
      originalSpriteFront: initialSpriteFront,
      originalSpriteBack: initialSpriteBack,
      originalArtwork: initialArtwork,
      originalShowdownFront: initialShowdownFront,
      originalShowdownBack: initialShowdownBack,
    };
  }

  // --- SANITIZE RIVAL STATE (True Information Hiding) ---

  function sanitizeRival(rivalPokemon) {
    if (!rivalPokemon) return null;
    return {
      id: rivalPokemon.id,
      species: rivalPokemon.species,
      name: rivalPokemon.name,
      level: rivalPokemon.level,
      gender: rivalPokemon.gender,
      types: [...rivalPokemon.types],
      currentHp: rivalPokemon.currentHp, // Or hp percent
      maxHp: rivalPokemon.maxHp,
      hpPercent: Math.max(
        0,
        Math.min(
          100,
          Math.round((rivalPokemon.currentHp / rivalPokemon.maxHp) * 100),
        ),
      ),
      status: rivalPokemon.status,
      isFainted: rivalPokemon.isFainted,
      stages: { ...rivalPokemon.stages },
      spriteFront: rivalPokemon.spriteFront,
      showdownFront: rivalPokemon.showdownFront,
      artwork: rivalPokemon.artwork,
      isMega: Boolean(rivalPokemon.isMega),
      isDynamax: Boolean(rivalPokemon.isDynamax),
      isGigantamax: Boolean(rivalPokemon.isGigantamax),
      dynamaxTurnsLeft: rivalPokemon.dynamaxTurnsLeft || 0,
      isTerastallized: Boolean(rivalPokemon.isTerastallized),
      teraType: rivalPokemon.isTerastallized ? rivalPokemon.teraType : null,
      // Only revealed attributes!
      ability: (rivalPokemon.revealedAbility || rivalPokemon.isMega) ? rivalPokemon.ability : null,
      item: rivalPokemon.revealedItem ? rivalPokemon.item : null,
      revealedMoves: [...rivalPokemon.revealedMoves],
      // Notice: IVs, EVs, Nature, exact unrevealed moves, full stats and secret future decisions are completely stripped!
    };
  }

  function getPublicBattleState(state) {
    const activePlayerPokemon = state.playerTeam[state.playerActiveIndex];
    const rules = state.rules || BattleData.getBattleRules(state.format);

    return {
      turn: state.turn,
      phase: state.phase, // 'action_select', 'resolving', 'force_switch', 'ended'
      winner: state.winner,
      format: state.format,
      rules,
      field: { ...state.field },
      auroraVeil: { ...state.auroraVeil },
      gmaxResiduals: { ...state.gmaxResiduals },
      playerMegaUsed: Boolean(state.playerMegaUsed),
      rivalMegaUsed: Boolean(state.rivalMegaUsed),
      playerDynamaxUsed: Boolean(state.playerDynamaxUsed),
      rivalDynamaxUsed: Boolean(state.rivalDynamaxUsed),
      playerTerastallizeUsed: Boolean(state.playerTerastallizeUsed),
      rivalTerastallizeUsed: Boolean(state.rivalTerastallizeUsed),
      playerCanMega: Boolean(
        !state.playerMegaUsed &&
        rules.allowMega &&
        activePlayerPokemon &&
        canPokemonMegaEvolve(activePlayerPokemon, rules)
      ),
      playerCanDynamax: Boolean(
        !state.playerDynamaxUsed &&
        rules.allowDynamax &&
        activePlayerPokemon &&
        canPokemonDynamax(activePlayerPokemon, rules)
      ),
      playerCanTerastallize: Boolean(
        !state.playerTerastallizeUsed &&
        rules.allowTerastal !== false &&
        activePlayerPokemon &&
        !activePlayerPokemon.isTerastallized &&
        !activePlayerPokemon.isFainted
      ),
      playerActive: activePlayerPokemon,
      playerTeam: state.playerTeam.map((p) => ({
        id: p.id,
        species: p.species,
        name: p.name,
        originalName: p.originalName,
        level: p.level,
        gender: p.gender,
        types: [...p.types],
        currentHp: p.currentHp,
        maxHp: p.maxHp,
        originalMaxHp: p.originalMaxHp,
        hpPercent: Math.max(
          0,
          Math.min(100, Math.round((p.currentHp / p.maxHp) * 100)),
        ),
        status: p.status,
        isFainted: p.isFainted,
        stages: { ...p.stages },
        item: p.item,
        ability: p.ability,
        isMega: Boolean(p.isMega),
        isDynamax: Boolean(p.isDynamax),
        isGigantamax: Boolean(p.isGigantamax),
        dynamaxTurnsLeft: p.dynamaxTurnsLeft || 0,
        canGigantamax: Boolean(p.canGigantamax),
        moves: p.moves.map((m) => ({ ...m })),
        spriteFront: p.spriteFront,
        spriteBack: p.spriteBack,
        showdownFront: p.showdownFront,
        showdownBack: p.showdownBack,
        artwork: p.artwork,
      })),
      playerInventory: { ...state.playerInventory },
      rivalActive: sanitizeRival(state.rivalTeam[state.rivalActiveIndex]),
      rivalActiveIndex: state.rivalActiveIndex,
      rivalTeamSummary: state.rivalTeam.map((p) => ({
        id: p.id,
        species: p.species,
        name: p.name,
        gender: p.gender,
        level: p.level,
        isFainted: p.isFainted,
        status: p.status,
        isMega: Boolean(p.isMega),
        isDynamax: Boolean(p.isDynamax),
        isGigantamax: Boolean(p.isGigantamax),
        hpPercent: Math.max(
          0,
          Math.min(100, Math.round((p.currentHp / p.maxHp) * 100)),
        ),
      })),
      forcedSwitchSide: state.forcedSwitchSide,
      log: [...state.log],
    };
  }

  // --- INITIALIZE BATTLE STATE ---

  function initBattle(playerTeamConfig, rivalTeamConfig, options = {}) {
    // Support options object passed as first argument: initBattle({ playerTeam, rivalTeam, ... })
    if (!Array.isArray(playerTeamConfig) && typeof playerTeamConfig === "object" && playerTeamConfig !== null) {
      options = playerTeamConfig;
      playerTeamConfig = options.playerTeam || options.playerTeamConfig || [];
      rivalTeamConfig = options.rivalTeam || options.rivalTeamConfig || [];
    }

    const playerTeam = (playerTeamConfig || []).map((p) => (p && p.stats ? p : createBattlePokemon(p)));
    const rivalTeam = (rivalTeamConfig || []).map((p) => (p && p.stats ? p : createBattlePokemon(p)));

    const defaultInventory = {
      potion: 3,
      "super-potion": 2,
      "hyper-potion": 1,
      "full-restore": 1,
      "full-heal": 2,
      revive: 2,
    };

    const format = options.format || options.rulesFormat || "national_dex";
    const rules = BattleData.getBattleRules
      ? BattleData.getBattleRules(format)
      : { allowMega: true, allowDynamax: true, allowGigantamax: true };

    const state = {
      turn: 1,
      phase: "action_select",
      winner: null,
      difficulty: options.difficulty || "normal",
      format,
      rules,
      generation:
        options.generation ||
        (rules.id === "gen8"
          ? 8
          : rules.id === "gen7"
            ? 7
            : rules.id === "gen6"
              ? 6
              : 9),
      field: {
        weather: null,
        weatherTurns: 0,
        terrain: null,
        terrainTurns: 0,
      },
      playerTeam,
      playerActiveIndex: 0,
      rivalTeam,
      rivalActiveIndex: 0,
      playerInventory: options.inventory
        ? { ...options.inventory }
        : defaultInventory,
      forcedSwitchSide: null, // 'player' | 'rival'
      log: [],
      // Transformation trackers (1 Mega, 1 Dynamax/GMax, 1 Teracristalización per side per match)
      playerMegaUsed: false,
      rivalMegaUsed: false,
      playerDynamaxUsed: false,
      rivalDynamaxUsed: false,
      playerTerastallizeUsed: false,
      rivalTerastallizeUsed: false,
      // Screens & Hazard State per side
      screens: {
        player: { reflect: 0, lightScreen: 0, auroraVeil: 0, tailwind: 0 },
        rival: { reflect: 0, lightScreen: 0, auroraVeil: 0, tailwind: 0 }
      },
      hazards: {
        player: { stealthRock: false, spikes: 0, toxicSpikes: 0 },
        rival: { stealthRock: false, spikes: 0, toxicSpikes: 0 }
      },
      // PRNG instance
      rng: RngModule ? RngModule.create(options.seed) : null,
      seed: options.seed || null,
      gmaxResiduals: { player: null, rival: null },
      auroraVeil: { player: 0, rival: 0 },
      // Secret internal AI memory
      aiMemory: {
        lastMoveUsedByPlayer: null,
        playerThreatProfile: {},
      },
    };

    return state;
  }

  // --- TRANSFORMATION HELPERS (MEGA & DYNAMAX/GIGAMAX) ---

  function triggerMegaEvolution(pokemon, side = "player", state = {}, events = [], logMessage = () => {}) {
    if (typeof side === "object" && side !== null) {
      state = side;
      side = state.side || "player";
    }
    state = state || {};
    events = events || [];
    if (typeof logMessage !== "function") logMessage = () => {};

    if (!pokemon || pokemon.isFainted || pokemon.isMega || pokemon.isDynamax) return { success: false, reason: "invalid_state" };
    if (state[side + "MegaUsed"]) return { success: false, reason: "already_used" };
    const rules = state.rules || (state.format ? BattleData.getBattleRules(state.format) : { allowMega: true });
    if (rules.allowMega === false) return { success: false, reason: "format_disallowed" };

    const megaData = BattleData.getMegaEvolutionData(pokemon);
    if (!megaData) return { success: false, reason: "no_mega_data" };

    state[side + "MegaUsed"] = true;
    pokemon.isMega = true;
    pokemon.megaFormId = megaData.id;
    pokemon.name = megaData.name;
    pokemon.types = [...megaData.types];
    pokemon.ability = megaData.ability;
    pokemon.baseStats = { ...megaData.baseStats };

    if (megaData.spriteFront) pokemon.spriteFront = megaData.spriteFront;
    if (megaData.spriteBack) pokemon.spriteBack = megaData.spriteBack;
    if (megaData.showdownFront) pokemon.showdownFront = megaData.showdownFront;
    if (megaData.showdownBack) pokemon.showdownBack = megaData.showdownBack;
    if (megaData.artwork) pokemon.artwork = megaData.artwork;

    // Recalculate stats with new base stats:
    // IMPORTANT: Under official Pokémon rules, HP is NOT changed upon Megaevolution!
    const newStats = calculateAllStats(
      pokemon.baseStats,
      pokemon.ivs,
      pokemon.evs,
      pokemon.level,
      pokemon.nature,
    );
    pokemon.stats.atk = newStats.atk;
    pokemon.stats.def = newStats.def;
    pokemon.stats.spa = newStats.spa;
    pokemon.stats.spd = newStats.spd;
    pokemon.stats.spe = newStats.spe;

    const sideLabel = side === "player" ? "¡Tu" : "¡El";
    logMessage(`${sideLabel} ${pokemon.originalName || pokemon.name} reacciona a su Megapiedra y ha megaevolucionado en ${megaData.name}!`);

    events.push({
      type: "mega_evolution",
      side,
      name: megaData.name,
      species: megaData.species,
      newTypes: [...megaData.types],
      newAbility: megaData.ability,
      spriteFront: pokemon.spriteFront,
      spriteBack: pokemon.spriteBack,
      artwork: pokemon.artwork,
    });

    if (!state.field) state.field = { weather: null, terrain: null };

    // Entry abilities
    if (pokemon.ability === "drought") {
      state.field.weather = "sun";
      state.field.weatherTurns = 5;
      logMessage(`¡La habilidad Sequía de ${pokemon.name} intensificó los rayos del sol!`);
      events.push({ type: "ability_trigger", side, ability: "drought", abilityName: "Sequía" });
      events.push({ type: "weather_change", weather: "sun" });
    } else if (pokemon.ability === "sand-stream") {
      state.field.weather = "sandstorm";
      state.field.weatherTurns = 5;
      logMessage(`¡La habilidad Chorro Arena de ${pokemon.name} desató una Tormenta de Arena!`);
      events.push({ type: "ability_trigger", side, ability: "sand-stream", abilityName: "Chorro Arena" });
      events.push({ type: "weather_change", weather: "sandstorm" });
    } else if (pokemon.ability === "drizzle") {
      state.field.weather = "rain";
      state.field.weatherTurns = 5;
      logMessage(`¡La habilidad Llovizna de ${pokemon.name} desató una lluvia torrencial!`);
      events.push({ type: "ability_trigger", side, ability: "drizzle", abilityName: "Llovizna" });
      events.push({ type: "weather_change", weather: "rain" });
    } else if (pokemon.ability) {
      const abName = (typeof BattleData !== "undefined" && BattleData.getLocalizedAbility)
        ? BattleData.getLocalizedAbility(pokemon.ability)
        : pokemon.ability;
      events.push({ type: "ability_trigger", side, ability: pokemon.ability, abilityName: abName });
    }

    return { success: true, megaData };
  }

  function triggerDynamax(pokemon, side = "player", state = {}, events = [], logMessage = () => {}) {
    if (typeof side === "object" && side !== null) {
      state = side;
      side = state.side || "player";
    }
    state = state || {};
    events = events || [];
    if (typeof logMessage !== "function") logMessage = () => {};

    if (!pokemon || pokemon.isFainted || pokemon.isDynamax || pokemon.isMega) return { success: false, reason: "invalid_state" };
    if (state[side + "DynamaxUsed"]) return { success: false, reason: "already_used" };
    const rules = state.rules || (state.format ? BattleData.getBattleRules(state.format) : { allowDynamax: true, allowGigantamax: true });
    if (rules.allowDynamax === false) return { success: false, reason: "format_disallowed" };
    if (!BattleData.canPokemonDynamax(pokemon, rules)) return { success: false, reason: "ineligible" };

    state[side + "DynamaxUsed"] = true;
    pokemon.isDynamax = true;
    pokemon.dynamaxTurnsLeft = 3;

    // Check Gigantamax
    const isGmax = Boolean(rules.allowGigantamax !== false && BattleData.isPokemonGigantamax(pokemon));
    pokemon.isGigantamax = isGmax;

    const mult = pokemon.dynamaxMultiplier || 2.0;
    pokemon.originalMaxHp = pokemon.originalMaxHp || pokemon.maxHp;
    const newMaxHp = Math.floor(pokemon.originalMaxHp * mult);
    const newCurrentHp = Math.floor(pokemon.currentHp * mult);

    pokemon.maxHp = newMaxHp;
    pokemon.currentHp = newCurrentHp;

    // Suppress choice lock
    pokemon.lockedMove = null;

    let gmaxData = null;
    if (isGmax) {
      gmaxData = BattleData.getGigantamaxData(pokemon);
      if (gmaxData) {
        if (!pokemon.originalSpriteFront) pokemon.originalSpriteFront = pokemon.spriteFront;
        if (!pokemon.originalSpriteBack) pokemon.originalSpriteBack = pokemon.spriteBack;
        if (!pokemon.originalShowdownFront) pokemon.originalShowdownFront = pokemon.showdownFront;
        if (!pokemon.originalShowdownBack) pokemon.originalShowdownBack = pokemon.showdownBack;
        if (!pokemon.originalArtwork) pokemon.originalArtwork = pokemon.artwork;
        if (gmaxData.spriteFront) pokemon.spriteFront = gmaxData.spriteFront;
        if (gmaxData.spriteBack) pokemon.spriteBack = gmaxData.spriteBack;
        if (gmaxData.showdownFront) pokemon.showdownFront = gmaxData.showdownFront;
        if (gmaxData.showdownBack) pokemon.showdownBack = gmaxData.showdownBack;
        if (gmaxData.artwork) pokemon.artwork = gmaxData.artwork;
      }
    }

    const sideLabel = side === "player" ? "¡Tu" : "¡El";
    if (isGmax && gmaxData) {
      logMessage(`${sideLabel} ${pokemon.name} se envuelve en energía Gigamax y adopta su forma Gigamax!`);
    } else {
      logMessage(`${sideLabel} ${pokemon.name} absorbe la energía Dinamax y se agiganta colosalmente!`);
    }

    events.push({
      type: "dynamax_start",
      side,
      isGigantamax: isGmax,
      name: isGmax && gmaxData ? gmaxData.gmaxName : pokemon.name,
      spriteFront: pokemon.spriteFront,
      spriteBack: pokemon.spriteBack,
      currentHp: pokemon.currentHp,
      maxHp: pokemon.maxHp,
      dynamaxTurnsLeft: 3,
    });

    return { success: true };
  }

  function revertDynamax(pokemon, side = "player", state = {}, events = [], logMessage = () => {}) {
    if (!pokemon || !pokemon.isDynamax) return { success: false };
    if (typeof side === "object" && side !== null) {
      state = side;
      side = state.side || "player";
    }
    state = state || {};
    events = events || [];
    if (typeof logMessage !== "function") logMessage = () => {};

    const mult = pokemon.dynamaxMultiplier || 2.0;
    const baseMax = pokemon.originalMaxHp || Math.floor(pokemon.maxHp / mult);
    const revertedHp = pokemon.currentHp <= 0 ? 0 : Math.max(1, Math.min(baseMax, Math.ceil(pokemon.currentHp / mult)));

    pokemon.maxHp = baseMax;
    pokemon.currentHp = revertedHp;
    pokemon.isDynamax = false;
    const wasGmax = pokemon.isGigantamax;
    pokemon.isGigantamax = false;
    pokemon.dynamaxTurnsLeft = 0;

    if (wasGmax && pokemon.originalSpriteFront) {
      pokemon.spriteFront = pokemon.originalSpriteFront;
      pokemon.spriteBack = pokemon.originalSpriteBack;
      pokemon.showdownFront = pokemon.originalShowdownFront;
      pokemon.showdownBack = pokemon.originalShowdownBack;
    }

    logMessage(`¡La energía Dinamax de ${pokemon.name} se ha disipado y vuelve a su tamaño normal!`);
    events.push({
      type: "dynamax_end",
      side,
      currentHp: pokemon.currentHp,
      maxHp: pokemon.maxHp,
      spriteFront: pokemon.spriteFront,
      spriteBack: pokemon.spriteBack,
    });
  }

  // --- TERACRISTALIZACIÓN (GEN IX) ---

  function triggerTerastallization(pokemon, side = "player", state = {}, events = [], logMessage = () => {}) {
    if (typeof side === "object" && side !== null) {
      state = side;
      side = state.side || "player";
    }
    state = state || {};
    events = events || [];
    if (typeof logMessage !== "function") logMessage = () => {};

    if (!pokemon || pokemon.isFainted || pokemon.isTerastallized) {
      return { success: false, reason: "invalid_state" };
    }
    if (state[side + "TerastallizeUsed"]) {
      return { success: false, reason: "already_used" };
    }
    const rules = state.rules || (state.format ? BattleData.getBattleRules(state.format) : { allowTerastal: true });
    if (rules.allowTerastal === false) {
      return { success: false, reason: "format_disallowed" };
    }

    state[side + "TerastallizeUsed"] = true;
    pokemon.isTerastallized = true;

    // Default Tera type if none specified is original primary type
    if (!pokemon.teraType) {
      pokemon.teraType = (pokemon.originalTypes && pokemon.originalTypes[0]) || pokemon.types[0] || "normal";
    }
    pokemon.teraType = pokemon.teraType.toLowerCase();

    // Defensively, Pokémon becomes pure Tera Type!
    // Offensively, it retains original STABs and gains/boosts Tera Type STAB.
    pokemon.types = [pokemon.teraType];

    const sideLabel = side === "player" ? "¡Tu" : "¡El";
    const typeLabel = pokemon.teraType.toUpperCase();
    logMessage(`${sideLabel} ${pokemon.name} se envuelve en un fulgor prismático y se Teracristaliza en tipo ${typeLabel}!`);

    events.push({
      type: "terastallize",
      side,
      name: pokemon.name,
      teraType: pokemon.teraType,
      newTypes: [...pokemon.types],
      originalTypes: [...(pokemon.originalTypes || [])]
    });

    return { success: true, teraType: pokemon.teraType };
  }

  // --- TURN RESOLUTION (Priority, Order, Effects, Event Queue) ---

  /**
   * Action structure:
   * - Attack: { type: 'attack', moveIndex: 0, moveName: 'surf' }
   * - Switch: { type: 'switch', targetIndex: 2 }
   * - Item:   { type: 'item', itemId: 'potion', targetIndex: 0 }
   * - Forfeit:{ type: 'forfeit' }
   */
  function resolveTurn(state, playerAction, rivalAction) {
    const events = [];
    const logMessage = (msg) => {
      events.push({ type: "text", message: msg });
      state.log.push(`[T${state.turn}] ${msg}`);
    };

    const playerActive = state.playerTeam[state.playerActiveIndex];
    const rivalActive = state.rivalTeam[state.rivalActiveIndex];

    // Forfeit immediate check
    if (playerAction && playerAction.type === "forfeit") {
      state.winner = "rival";
      state.phase = "ended";
      logMessage(
        `${playerActive.name} y su entrenador han abandonado el combate.`,
      );
      events.push({ type: "battle_end", winner: "rival" });
      return { events, state, publicState: getPublicBattleState(state) };
    }

    // Reset transient round protections
    playerActive.isMaxGuarded = false;
    rivalActive.isMaxGuarded = false;
    playerActive.isProtected = false;
    rivalActive.isProtected = false;

    // 0. TERACRISTALIZACIÓN PHASE (Gen IX: activates at the start of the turn before moves)
    if (playerAction && (playerAction.terastallize || playerAction.tera)) {
      triggerTerastallization(playerActive, "player", state, events, logMessage);
    }
    if (rivalAction && (rivalAction.terastallize || rivalAction.tera)) {
      triggerTerastallization(rivalActive, "rival", state, events, logMessage);
    }

    // 1. MEGA EVOLUTION PHASE (Before priority/speed calculation, Gen 7+ rule)
    if (playerAction && playerAction.mega) {
      triggerMegaEvolution(playerActive, "player", state, events, logMessage);
    }
    if (rivalAction && rivalAction.mega) {
      triggerMegaEvolution(rivalActive, "rival", state, events, logMessage);
    }

    // 2. DYNAMAX / GIGANTAMAX ACTIVATION PHASE
    if (playerAction && playerAction.dynamax) {
      triggerDynamax(playerActive, "player", state, events, logMessage);
    }
    if (rivalAction && rivalAction.dynamax) {
      triggerDynamax(rivalActive, "rival", state, events, logMessage);
    }

    // Determine Turn Order based on Priority and Speed using TurnModule
    const rules = state.rules || (RulesModule ? RulesModule.getGenRules(state.generation || 9) : {});
    let playerFirst = true;

    if (TurnModule && typeof TurnModule.compareActionOrder === "function") {
      playerActive.side = "player";
      rivalActive.side = "rival";
      const order = TurnModule.compareActionOrder(
        { action: playerAction, pokemon: playerActive, side: "player" },
        { action: rivalAction, pokemon: rivalActive, side: "rival" },
        state.field,
        state.rng,
        rules
      );
      playerFirst = order <= 0;
    } else {
      const getActionPriority = (action, pokemon) => {
        if (!action) return 0;
        if (action.type === "item" || action.type === "switch") return 6;
        if (action.type === "attack") {
          const move = pokemon.moves[action.moveIndex];
          if (!move) return 0;
          if (pokemon.isDynamax && move.category === "status") return 4;
          return move.priority || 0;
        }
        return 0;
      };

      const playerPriority = getActionPriority(playerAction, playerActive);
      const rivalPriority = getActionPriority(rivalAction, rivalActive);

      if (playerPriority > rivalPriority) {
        playerFirst = true;
      } else if (rivalPriority > playerPriority) {
        playerFirst = false;
      } else {
        const playerSpeed = getEffectiveSpeed(playerActive, state.field, rules);
        const rivalSpeed = getEffectiveSpeed(rivalActive, state.field, rules);
        const isTrickRoom = Boolean(state.field && state.field.trickRoom > 0);
        if (playerSpeed !== rivalSpeed) {
          playerFirst = isTrickRoom ? playerSpeed < rivalSpeed : playerSpeed > rivalSpeed;
        } else {
          playerFirst = state.rng ? state.rng.chance(0.5) : Math.random() < 0.5;
        }
      }
    }

    const first = playerFirst
      ? {
          side: "player",
          action: playerAction,
          active: playerActive,
          opponent: rivalActive,
          activeIdx: state.playerActiveIndex,
          oppIdx: state.rivalActiveIndex,
        }
      : {
          side: "rival",
          action: rivalAction,
          active: rivalActive,
          opponent: playerActive,
          activeIdx: state.rivalActiveIndex,
          oppIdx: state.playerActiveIndex,
        };

    const second = playerFirst
      ? {
          side: "rival",
          action: rivalAction,
          active: rivalActive,
          opponent: playerActive,
          activeIdx: state.rivalActiveIndex,
          oppIdx: state.playerActiveIndex,
        }
      : {
          side: "player",
          action: playerAction,
          active: playerActive,
          opponent: rivalActive,
          activeIdx: state.playerActiveIndex,
          oppIdx: state.rivalActiveIndex,
        };

    // --- Helper: Entry Hazards & Switch-In Abilities ---
    function applyEntryHazards(pokemon, side, state, events, logMessage) {
      if (!pokemon || pokemon.currentHp <= 0 || !state.hazards || !state.hazards[side]) return;
      // Heavy-Duty Boots (Botas Gruesas) completely ignores entry hazards!
      if (pokemon.item === "heavy-duty-boots") {
        pokemon.revealedItem = true;
        return;
      }

      const h = state.hazards[side];

      // Stealth Rock (Trampa Rocas)
      if (h.stealthRock) {
        const eff = getTypeEffectiveness("rock", pokemon.types);
        const fraction = (1 / 8) * eff;
        const srDmg = Math.max(1, Math.floor(pokemon.maxHp * fraction));
        pokemon.currentHp = Math.max(0, pokemon.currentHp - srDmg);
        logMessage(`¡Las piedras puntiagudas de Trampa Rocas se clavan en ${pokemon.name} (-${srDmg} PS)!`);
        events.push({
          type: "damage",
          targetSide: side,
          damage: srDmg,
          currentHp: pokemon.currentHp,
          maxHp: pokemon.maxHp,
          hazard: "stealth-rock"
        });
        if (pokemon.currentHp <= 0) {
          pokemon.isFainted = true;
          logMessage(`¡${pokemon.name} se debilitó!`);
          events.push({ type: "faint", targetSide: side });
          return;
        }
      }

      // Spikes (Púas) - grounded only
      const isFlyingOrLevitate = pokemon.types.includes("flying") || pokemon.ability === "levitate" || pokemon.item === "air-balloon";
      if (h.spikes > 0 && !isFlyingOrLevitate) {
        const fractions = [0, 1 / 8, 1 / 6, 1 / 4];
        const spikeFraction = fractions[Math.min(h.spikes, 3)];
        const spkDmg = Math.max(1, Math.floor(pokemon.maxHp * spikeFraction));
        pokemon.currentHp = Math.max(0, pokemon.currentHp - spkDmg);
        logMessage(`¡${pokemon.name} se hirió con las Púas del suelo (-${spkDmg} PS)!`);
        events.push({
          type: "damage",
          targetSide: side,
          damage: spkDmg,
          currentHp: pokemon.currentHp,
          maxHp: pokemon.maxHp,
          hazard: "spikes"
        });
        if (pokemon.currentHp <= 0) {
          pokemon.isFainted = true;
          logMessage(`¡${pokemon.name} se debilitó!`);
          events.push({ type: "faint", targetSide: side });
          return;
        }
      }

      // Toxic Spikes (Púas Tóxicas)
      if (h.toxicSpikes > 0 && !isFlyingOrLevitate && !pokemon.status) {
        if (pokemon.types.includes("poison")) {
          // Poison types absorb toxic spikes
          h.toxicSpikes = 0;
          logMessage(`¡${pokemon.name} absorbió las Púas Tóxicas del campo!`);
        } else if (!pokemon.types.includes("steel")) {
          const statusToApply = h.toxicSpikes >= 2 ? "tox" : "psn";
          pokemon.status = statusToApply;
          pokemon.toxicCounter = statusToApply === "tox" ? 1 : 0;
          logMessage(`¡${pokemon.name} fue envenenado por las Púas Tóxicas!`);
          events.push({ type: "status_change", side, status: statusToApply });
        }
      }
    }

    function applySwitchInAbilities(pokemon, opponent, side, state, events, logMessage) {
      if (!pokemon || pokemon.isFainted) return;
      const ab = (pokemon.ability || "").toLowerCase();

      // Intimidate (Intimidación) with full reaction handling (Competitive, Defiant, Mirror Armor, Guard Dog)
      if (ab === "intimidate" && opponent && !opponent.isFainted) {
        pokemon.revealedAbility = true;
        if (AbilitiesModule && typeof AbilitiesModule.applyIntimidate === "function") {
          AbilitiesModule.applyIntimidate(pokemon, opponent, { events, logMessage });
        } else {
          const oppAb = (opponent.ability || "").toLowerCase();
          if (["clear-body", "white-smoke", "hyper-cutter", "inner-focus", "oblivious", "scrappy"].includes(oppAb)) {
            logMessage(`¡La habilidad ${ab.toUpperCase()} de ${pokemon.name} no afectó a ${opponent.name} debido a su ${oppAb.toUpperCase()}!`);
          } else if (oppAb === "contrary") {
            opponent.stages.atk = Math.min(6, (opponent.stages.atk || 0) + 1);
            logMessage(`¡Respondón de ${opponent.name} invirtió la Intimidación y subió su Ataque!`);
            events.push({ type: "stat_change", side: side === "player" ? "rival" : "player", stat: "atk", stages: 1 });
          } else {
            opponent.stages.atk = Math.max(-6, (opponent.stages.atk || 0) - 1);
            logMessage(`¡La Intimidación de ${pokemon.name} redujo el Ataque de ${opponent.name}!`);
            events.push({ type: "stat_change", side: side === "player" ? "rival" : "player", stat: "atk", stages: -1 });
          }
        }
      }

      // Weather abilities
      if (ab === "drought") {
        state.field.weather = "sun";
        state.field.weatherTurns = 5;
        logMessage(`¡La Sequía de ${pokemon.name} llenó el campo de sol radiante!`);
        events.push({ type: "weather_change", weather: "sun" });
      } else if (ab === "drizzle") {
        state.field.weather = "rain";
        state.field.weatherTurns = 5;
        logMessage(`¡La Llovizna de ${pokemon.name} desató una lluvia torrencial!`);
        events.push({ type: "weather_change", weather: "rain" });
      } else if (ab === "sand-stream") {
        state.field.weather = "sandstorm";
        state.field.weatherTurns = 5;
        logMessage(`¡El Chorro Arena de ${pokemon.name} desató una tormenta de arena!`);
        events.push({ type: "weather_change", weather: "sandstorm" });
      } else if (ab === "snow-warning") {
        state.field.weather = "snow";
        state.field.weatherTurns = 5;
        logMessage(`¡Nevada de ${pokemon.name} cubrió el campo de nieve!`);
        events.push({ type: "weather_change", weather: "snow" });
      }
    }

    // --- Helper: Execute Single Action ---
    function executeAction(current, target) {
      if (state.winner) return;
      const actor =
        current.side === "player"
          ? state.playerTeam[state.playerActiveIndex]
          : state.rivalTeam[state.rivalActiveIndex];
      const defender =
        target.side === "player"
          ? state.playerTeam[state.playerActiveIndex]
          : state.rivalTeam[state.rivalActiveIndex];

      // If actor fainted earlier in the turn, cannot act
      if (actor.isFainted) return;

      const act = current.action;
      if (!act) return;

      // 1. SWITCH ACTION
      if (act.type === "switch") {
        const targetTeam =
          current.side === "player" ? state.playerTeam : state.rivalTeam;
        const newPokemon = targetTeam[act.targetIndex];
        if (
          newPokemon &&
          !newPokemon.isFainted &&
          act.targetIndex !== current.activeIdx
        ) {
          // If the switched Pokémon is currently Dynamaxed, Dynamax ends immediately!
          if (actor.isDynamax) {
            revertDynamax(actor, current.side, state, events, logMessage);
          }
          // Note: Mega Evolution is permanent and persists across switches!

          // Reset stat stages & volatiles of old active
          actor.stages = {
            atk: 0,
            def: 0,
            spa: 0,
            spd: 0,
            spe: 0,
            acc: 0,
            eva: 0,
          };
          actor.volatiles = {};
          actor.lockedMove = null;

          if (current.side === "player") {
            state.playerActiveIndex = act.targetIndex;
          } else {
            state.rivalActiveIndex = act.targetIndex;
          }

          logMessage(
            current.side === "player"
              ? `¡Vuelve, ${actor.name}! ¡Adelante, ${newPokemon.name}!`
              : `¡El rival retira a ${actor.name} y envía a ${newPokemon.name}!`,
          );

          events.push({
            type: "switch",
            side: current.side,
            fromName: actor.name,
            toPokemon:
              current.side === "player"
                ? newPokemon
                : sanitizeRival(newPokemon),
          });

          // ENTRY HAZARDS & SWITCH-IN ABILITIES
          applyEntryHazards(newPokemon, current.side, state, events, logMessage);
          applySwitchInAbilities(newPokemon, current.side === "player" ? state.rivalTeam[state.rivalActiveIndex] : state.playerTeam[state.playerActiveIndex], current.side, state, events, logMessage);
        }
        return;
      }

      // 2. ITEM ACTION (Trainer bag item)
      if (act.type === "item") {
        const itemDef = BAG_ITEMS[act.itemId];
        const targetPokemon = (
          current.side === "player" ? state.playerTeam : state.rivalTeam
        )[act.targetIndex];

        if (itemDef && targetPokemon) {
          // Validate using BattleItems if available BEFORE deducting inventory
          if (ItemsModule && typeof ItemsModule.canUseItem === "function") {
            const check = ItemsModule.canUseItem(act.itemId, targetPokemon);
            if (!check.canUse) {
              logMessage(`¡No se pudo usar ${itemDef.name}: ${check.reason || "Sin efecto"}!`);
              return;
            }
          }

          let itemWorked = false;

          if (itemDef.revivePercent) {
            if (targetPokemon.isFainted) {
              targetPokemon.isFainted = false;
              targetPokemon.currentHp = Math.floor(
                targetPokemon.maxHp * itemDef.revivePercent,
              );
              logMessage(`¡${itemDef.name} revivió a ${targetPokemon.name}!`);
              events.push({
                type: "heal",
                side: current.side,
                targetIndex: act.targetIndex,
                currentHp: targetPokemon.currentHp,
                maxHp: targetPokemon.maxHp,
              });
              itemWorked = true;
            }
          } else {
            // Healing HP
            let healAmount = 0;
            if (itemDef.fullHeal) {
              healAmount = targetPokemon.maxHp - targetPokemon.currentHp;
            } else if (itemDef.healAmount) {
              healAmount = Math.min(
                itemDef.healAmount,
                targetPokemon.maxHp - targetPokemon.currentHp,
              );
            }

            if (healAmount > 0) {
              targetPokemon.currentHp = Math.min(
                targetPokemon.maxHp,
                targetPokemon.currentHp + healAmount,
              );
              logMessage(
                `¡${itemDef.name} restauró ${healAmount} PS de ${targetPokemon.name}!`,
              );
              events.push({
                type: "heal",
                side: current.side,
                targetIndex: act.targetIndex,
                currentHp: targetPokemon.currentHp,
                maxHp: targetPokemon.maxHp,
              });
              itemWorked = true;
            }

            // Cure status
            if (itemDef.cureStatus && targetPokemon.status) {
              targetPokemon.status = null;
              targetPokemon.statusTurns = 0;
              targetPokemon.toxicCounter = 0;
              logMessage(
                `¡${itemDef.name} curó el estado alterado de ${targetPokemon.name}!`,
              );
              events.push({
                type: "status_change",
                side: current.side,
                targetIndex: act.targetIndex,
                status: null,
              });
              itemWorked = true;
            }
          }

          // Deduct from inventory ONLY if item successfully worked
          if (
            itemWorked &&
            current.side === "player" &&
            state.playerInventory &&
            state.playerInventory[act.itemId] > 0
          ) {
            state.playerInventory[act.itemId]--;
          }
        }
        return;
      }

      // 3. ATTACK ACTION
      if (act.type === "attack") {
        let move = actor.moves[act.moveIndex];
        // If locked into move (Choice item)
        if (actor.lockedMove !== null && actor.moves[actor.lockedMove]) {
          move = actor.moves[actor.lockedMove];
        }

        // Struggle fallback if no PP
        if (!move || move.currentPp <= 0) {
          const hasAnyPp = actor.moves.some((m) => m && m.currentPp > 0);
          if (!hasAnyPp) {
            move = {
              name: "struggle",
              displayName: "Combate",
              type: "normal",
              category: "physical",
              power: 50,
              accuracy: 100,
              pp: 1,
              currentPp: 1,
              recoilPercent: 25,
            };
          } else {
            logMessage(`¡No quedan PP para este movimiento!`);
            return;
          }
        }

        // Decrement PP
        if (move.name !== "struggle") {
          move.currentPp = Math.max(0, move.currentPp - 1);
        }

        // Reveal move if rival
        if (
          current.side === "rival" &&
          !actor.revealedMoves.includes(move.name)
        ) {
          actor.revealedMoves.push(move.name);
        }

        // Check if locked by Choice item
        if (
          ["choice-band", "choice-specs", "choice-scarf"].includes(actor.item)
        ) {
          actor.lockedMove = act.moveIndex;
        }

        // Check Status restrictions before attacking
        // A. Sleep
        if (actor.status === "slp") {
          actor.statusTurns--;
          if (actor.statusTurns <= 0) {
            actor.status = null;
            logMessage(`¡${actor.name} se ha despertado!`);
            events.push({
              type: "status_change",
              side: current.side,
              status: null,
            });
          } else {
            logMessage(`¡${actor.name} está profundamente dormido!`);
            events.push({ type: "dialogue", message: `${actor.name} duerme.` });
            return;
          }
        }

        // B. Freeze
        if (actor.status === "frz") {
          const thawRoll = state.rng ? state.rng.chance(0.2) : Math.random() < 0.2;
          if (thawRoll) {
            actor.status = null;
            logMessage(`¡${actor.name} se descongeló!`);
            events.push({
              type: "status_change",
              side: current.side,
              status: null,
            });
          } else {
            logMessage(`¡${actor.name} está congelado y no puede moverse!`);
            return;
          }
        }

        // C. Paralysis
        if (actor.status === "par") {
          const parRoll = state.rng ? state.rng.chance(0.25) : Math.random() < 0.25;
          if (parRoll) {
            logMessage(`¡${actor.name} está paralizado! ¡No se puede mover!`);
            events.push({
              type: "status_animation",
              side: current.side,
              status: "par",
            });
            return;
          }
        }

        // D. Confusion
        if (actor.volatiles.confusion) {
          actor.volatiles.confusion--;
          logMessage(`¡${actor.name} está confuso!`);
          if (actor.volatiles.confusion <= 0) {
            delete actor.volatiles.confusion;
            logMessage(`¡${actor.name} ya no está confuso!`);
          } else {
            const confRoll = state.rng ? state.rng.chance(0.33) : Math.random() < 0.33;
            if (confRoll) {
              // Hurt itself in confusion
              const selfDmg = Math.max(
                1,
                Math.floor(
                  Math.floor(
                    (((2 * actor.level) / 5 + 2) * 40 * actor.stats.atk) /
                      Math.max(1, actor.stats.def),
                  ) / 50,
                ) + 2,
              );
              actor.currentHp = Math.max(0, actor.currentHp - selfDmg);
              logMessage(
                `¡Está tan confuso que se hirió a sí mismo con ${selfDmg} de daño!`,
              );
              events.push({
                type: "damage",
                targetSide: current.side,
                damage: selfDmg,
                currentHp: actor.currentHp,
                maxHp: actor.maxHp,
                isCrit: false,
                effectiveness: 1,
              });
              if (actor.currentHp <= 0) {
                actor.isFainted = true;
                logMessage(`¡${actor.name} se debilitó!`);
                events.push({ type: "faint", targetSide: current.side });
              }
              return;
            }
          }
        }

        // If Dynamaxed, Choice locks are suppressed and move is converted to Max Move / G-Max Move / Max Guard
        if (actor.isDynamax) {
          actor.lockedMove = null;
          move = BattleData.convertToMaxMove(move, actor);
        }

        // Announce move
        logMessage(`${actor.name} usó ${move.displayName || move.name}!`);
        events.push({
          type: "move_start",
          side: current.side,
          moveName: move.name,
          moveDisplayName: move.displayName || move.name,
          moveType: move.type,
          category: move.category,
          isMaxMove: Boolean(move.isMaxMove),
          isGigantamax: Boolean(move.isGigantamax),
        });

        // Protect & Detect resolution
        if (move.isProtect || move.name === "protect" || move.name === "detect") {
          actor.isProtected = true;
          logMessage(`¡${actor.name} se protegió firmemente!`);
          events.push({
            type: "protect",
            side: current.side,
            moveName: move.name,
            moveDisplayName: move.displayName || move.name
          });
          return;
        }

        // Max Guard resolution
        if (move.name === "max-guard") {
          actor.isMaxGuarded = true;
          logMessage(`¡${actor.name} erigió una Maxibarrera infranqueable!`);
          events.push({
            type: "max_guard",
            side: current.side,
            moveName: "max-guard",
            moveDisplayName: "Maxibarrera",
          });
          return;
        }

        // Accuracy Check (Max Moves never miss)
        if (!move.neverMiss && move.accuracy) {
          const accStage = actor.stages ? actor.stages.acc || 0 : 0;
          const evaStage = defender.stages ? defender.stages.eva || 0 : 0;
          const hitChance =
            move.accuracy *
            (getAccEvasionMultiplier(accStage) /
              getAccEvasionMultiplier(evaStage));
          const hitRoll = state.rng ? state.rng.next() * 100 : Math.random() * 100;
          if (hitRoll > hitChance) {
            logMessage(`¡El ataque de ${actor.name} falló!`);
            events.push({ type: "miss", side: current.side });
            return;
          }
        }

        // Play Visual VFX
        events.push({
          type: "vfx",
          moveType: move.type,
          category: move.category,
          moveName: move.name,
          targetSide: target.side,
          isMaxMove: Boolean(move.isMaxMove),
          isGigantamax: Boolean(move.isGigantamax),
        });

        // 3A. ATTACK DEALS DAMAGE
        if (move.category === "physical" || move.category === "special") {
          // Check standard Protection (Protect / Detect)
          if (defender.isProtected) {
            if (move.isMaxMove || move.ignoreProtection) {
              logMessage(`¡El movimiento de ${actor.name} penetró la Protección!`);
            } else {
              logMessage(`¡${defender.name} se protegió y no recibió daño!`);
              events.push({ type: "blocked", side: target.side, move: "protect" });
              return;
            }
          }

          // Check if defender is protected by Max Guard
          if (defender.isMaxGuarded) {
            if (move.name === "g-max-one-blow" || move.name === "g-max-rapid-flow" || move.ignoreProtection) {
              logMessage(`¡El movimiento de ${actor.name} ignora y penetra la Maxibarrera!`);
            } else {
              logMessage(`¡${defender.name} repelió por completo el ataque con su Maxibarrera!`);
              events.push({ type: "blocked", side: target.side, move: "max-guard" });
              return;
            }
          }

          // Determine Hit Count (Multi-Hit moves like Bullet Seed, Icicle Spear, Rock Blast)
          let totalHits = 1;
          if (move.isMultiHit || (move.minHits && move.maxHits)) {
            const hasSkillLink = actor.ability === "skill-link";
            if (state.rng && typeof state.rng.multiHitRoll === "function") {
              totalHits = state.rng.multiHitRoll(hasSkillLink);
            } else {
              totalHits = hasSkillLink ? 5 : (Math.floor(Math.random() * 4) + 2);
            }
          }

          let hitsLanded = 0;
          const targetScreens = state.screens ? state.screens[target.side] || {} : {};

          for (let hit = 0; hit < totalHits; hit++) {
            if (defender.currentHp <= 0) break;

            const { damage, effectiveness, isCrit, isImmune } = calculateDamage(
              actor,
              defender,
              move,
              {
                ...state.field,
                ...targetScreens,
                sides: state.screens,
                auroraVeil: targetScreens.auroraVeil || (state.auroraVeil ? state.auroraVeil[target.side] : 0),
              },
              null,
              { rng: state.rng }
            );

            if (isImmune) {
              logMessage(`¡No afecta a ${defender.name}!`);
              events.push({ type: "immune", targetSide: target.side });
              return;
            }

            if (hit === 0) {
              if (isCrit) logMessage(`¡Un golpe crítico!`);
              if (effectiveness > 1) {
                logMessage(`¡Es súper eficaz!`);
              } else if (effectiveness > 0 && effectiveness < 1) {
                logMessage(`No es muy eficaz...`);
              }
            }

            // Check Focus Sash & Sturdy (Robustez)
            let dealt = damage;
            const hasSturdy = !move.ignoreAbilities && defender.ability === "sturdy";
            if (
              (defender.item === "focus-sash" || hasSturdy) &&
              defender.currentHp === defender.maxHp &&
              dealt >= defender.currentHp
            ) {
              dealt = defender.currentHp - 1;
              if (defender.item === "focus-sash") {
                defender.revealedItem = true;
                defender.item = null; // Consumed
                logMessage(`¡${defender.name} se aferró a la vida con su Banda Focus!`);
                events.push({ type: "item_trigger", side: target.side, item: "focus-sash" });
              } else {
                defender.revealedAbility = true;
                logMessage(`¡${defender.name} resistió el golpe gracias a su habilidad Robustez!`);
                events.push({ type: "ability_trigger", side: target.side, ability: "sturdy" });
              }
            }

            defender.currentHp = Math.max(0, defender.currentHp - dealt);
            hitsLanded++;

            events.push({
              type: "damage",
              targetSide: target.side,
              damage: dealt,
              currentHp: defender.currentHp,
              maxHp: defender.maxHp,
              isCrit,
              effectiveness,
              hitNumber: hit + 1,
              totalHits
            });

            // Check Sitrus Berry threshold
            if (
              defender.item === "sitrus-berry" &&
              defender.currentHp > 0 &&
              defender.currentHp <= defender.maxHp * 0.5
            ) {
              const heal = Math.floor(defender.maxHp * 0.25);
              defender.currentHp = Math.min(defender.maxHp, defender.currentHp + heal);
              defender.revealedItem = true;
              defender.item = null; // Consumed
              logMessage(`¡${defender.name} restauró salud gracias a su Baya Zidra!`);
              events.push({
                type: "heal",
                side: target.side,
                currentHp: defender.currentHp,
                maxHp: defender.maxHp,
                item: "sitrus-berry",
              });
            }
          }

          if (totalHits > 1) {
            logMessage(`¡Ha acertado ${hitsLanded} vez/veces!`);
          }

          // Recoil Damage (e.g. Flare Blitz, Brave Bird, Struggle)
          if (move.recoilPercent && dealt > 0) {
            const recoil = Math.max(
              1,
              Math.floor(dealt * (move.recoilPercent / 100)),
            );
            actor.currentHp = Math.max(0, actor.currentHp - recoil);
            logMessage(
              `¡${actor.name} se dañó con el retroceso del ataque (${recoil} PS)!`,
            );
            events.push({
              type: "damage",
              targetSide: current.side,
              damage: recoil,
              currentHp: actor.currentHp,
              maxHp: actor.maxHp,
              isCrit: false,
              effectiveness: 1,
            });
          }

          // Drain Healing (e.g. Giga Drain, Drain Punch)
          if (move.drainPercent && dealt > 0 && actor.currentHp > 0) {
            const drain = Math.max(
              1,
              Math.floor(dealt * (move.drainPercent / 100)),
            );
            actor.currentHp = Math.min(actor.maxHp, actor.currentHp + drain);
            logMessage(`¡${actor.name} recuperó ${drain} PS con su ataque!`);
            events.push({
              type: "heal",
              side: current.side,
              currentHp: actor.currentHp,
              maxHp: actor.maxHp,
            });
          }

          // Life Orb Recoil (10% max HP)
          if (actor.item === "life-orb" && actor.currentHp > 0) {
            const loDmg = Math.max(1, Math.floor(actor.maxHp * 0.1));
            actor.currentHp = Math.max(0, actor.currentHp - loDmg);
            actor.revealedItem = true;
            events.push({
              type: "damage",
              targetSide: current.side,
              damage: loDmg,
              currentHp: actor.currentHp,
              maxHp: actor.maxHp,
              isCrit: false,
              effectiveness: 1,
            });
          }

          // Secondary Effect on Defender
          if (move.secondary && defender.currentHp > 0) {
            const secRoll = state.rng ? state.rng.next() * 100 : Math.random() * 100;
            if (secRoll <= move.secondary.chance) {
              if (move.secondary.status && !defender.status) {
                // Type immunity checks
                const defTypes = defender.types.map((t) => t.toLowerCase());
                let immuneToStatus = false;
                if (
                  move.secondary.status === "brn" &&
                  defTypes.includes("fire")
                )
                  immuneToStatus = true;
                if (move.secondary.status === "frz" && defTypes.includes("ice"))
                  immuneToStatus = true;
                if (
                  (move.secondary.status === "psn" ||
                    move.secondary.status === "tox") &&
                  (defTypes.includes("poison") || defTypes.includes("steel"))
                )
                  immuneToStatus = true;
                if (
                  move.secondary.status === "par" &&
                  defTypes.includes("electric")
                )
                  immuneToStatus = true;

                if (!immuneToStatus) {
                  defender.status = move.secondary.status;
                  defender.statusTurns =
                    move.secondary.status === "slp"
                      ? (state.rng && typeof state.rng.sleepDurationRoll === "function" ? state.rng.sleepDurationRoll() : Math.floor(Math.random() * 3 + 1))
                      : 0;
                  logMessage(
                    `¡${defender.name} fue afectado por ${move.secondary.status.toUpperCase()}!`,
                  );
                  events.push({
                    type: "status_change",
                    side: target.side,
                    status: move.secondary.status,
                  });
                }
              }

              // Stat drops on defender (integrated with AbilitiesModule for Contrary, Competitive, Defiant, Mirror Armor)
              if (move.secondary.stat && move.secondary.stages) {
                if (AbilitiesModule && typeof AbilitiesModule.applyStatStageChange === "function") {
                  AbilitiesModule.applyStatStageChange(
                    defender,
                    move.secondary.stat,
                    move.secondary.stages,
                    { pokemon: actor, side: current.side, isSelf: false },
                    { events, logMessage }
                  );
                } else {
                  defender.stages[move.secondary.stat] = Math.max(
                    -6,
                    Math.min(
                      6,
                      (defender.stages[move.secondary.stat] || 0) +
                        move.secondary.stages,
                    ),
                  );
                  const dir = move.secondary.stages > 0 ? "subió" : "bajó";
                  logMessage(
                    `¡El/La ${move.secondary.stat.toUpperCase()} de ${defender.name} ${dir}!`,
                  );
                  events.push({
                    type: "stat_change",
                    side: target.side,
                    stat: move.secondary.stat,
                    stages: move.secondary.stages,
                  });
                }
              }
            }
          }

          // Self Stat Changes (e.g. Close Combat, Draco Meteor)
          if (move.selfStatChanges && actor.currentHp > 0) {
            for (const chg of move.selfStatChanges) {
              if (AbilitiesModule && typeof AbilitiesModule.applyStatStageChange === "function") {
                AbilitiesModule.applyStatStageChange(
                  actor,
                  chg.stat,
                  chg.stages,
                  { pokemon: actor, side: current.side, isSelf: true },
                  { events, logMessage }
                );
              } else {
                actor.stages[chg.stat] = Math.max(
                  -6,
                  Math.min(6, (actor.stages[chg.stat] || 0) + chg.stages),
                );
                const dir = chg.stages > 0 ? "subió" : "bajó";
                logMessage(
                  `¡El/La ${chg.stat.toUpperCase()} de ${actor.name} ${dir}!`,
                );
                events.push({
                  type: "stat_change",
                  side: current.side,
                  stat: chg.stat,
                  stages: chg.stages,
                });
              }
            }
          }

          // Max Move & G-Max Move Field and Secondary Effects
          if (move.isMaxMove || move.isGigantamax) {
            // Weather changes
            if (move.weather) {
              state.field.weather = move.weather;
              state.field.weatherTurns = 5;
              const wNames = {
                sun: "Día Soleado",
                rain: "Lluvia",
                hail: "Tormenta de Nieve / Granizo",
                sandstorm: "Tormenta de Arena",
              };
              logMessage(`¡El movimiento Dinamax activó ${wNames[move.weather] || move.weather}!`);
              events.push({ type: "weather_change", weather: move.weather });
            }

            // Terrain changes
            if (move.terrain) {
              state.field.terrain = move.terrain;
              state.field.terrainTurns = 5;
              const tNames = {
                electric: "Eléctrico",
                grassy: "de Hierba",
                psychic: "Psíquico",
                misty: "de Niebla",
              };
              logMessage(`¡El movimiento Dinamax desplegó un Campo ${tNames[move.terrain] || move.terrain}!`);
              events.push({ type: "terrain_change", terrain: move.terrain });
            }

            // G-Max Residual Damage
            if (move.gmaxResidual && defender.currentHp > 0) {
              state.gmaxResiduals[target.side] = { ...move.gmaxResidual };
              logMessage(`¡Llamas/Lianas/Torbellinos residuales de ${move.displayName} envuelven al bando rival!`);
              events.push({
                type: "gmax_residual_start",
                targetSide: target.side,
                residualType: move.gmaxResidual.type,
              });
            }

            // G-Max Special Effects
            if (move.secondary && move.secondary.status === "par" && defender.currentHp > 0 && !defender.status) {
              defender.status = "par";
              logMessage(`¡${defender.name} quedó paralizado por el ataque Gigamax!`);
              events.push({ type: "status_change", side: target.side, status: "par" });
            }
            if (move.trapTarget && defender.currentHp > 0) {
              defender.volatiles.trapped = true;
              logMessage(`¡${defender.name} ha sido atrapado y no puede huir ni cambiar!`);
            }
            if (move.auroraVeil && actor.currentHp > 0) {
              state.auroraVeil[current.side] = move.auroraVeil;
              logMessage(`¡Velo Aurora reduce a la mitad el daño recibido por el bando de ${actor.name} durante 5 turnos!`);
            }
            if (move.critStageBoost && actor.currentHp > 0) {
              actor.critStage = (actor.critStage || 0) + move.critStageBoost;
              logMessage(`¡El ratio de golpe crítico de ${actor.name} aumentó en 1 etapa!`);
            }
            if (move.clearField) {
              state.field.weather = null;
              state.field.terrain = null;
              state.auroraVeil = { player: 0, rival: 0 };
              logMessage(`¡${move.displayName} despejó todos los climas, terrenos y barreras activas!`);
            }
            if (move.healFraction && actor.currentHp > 0 && actor.currentHp < actor.maxHp) {
              const heal = Math.floor(actor.maxHp * move.healFraction);
              actor.currentHp = Math.min(actor.maxHp, actor.currentHp + heal);
              logMessage(`¡${actor.name} restauró ${heal} PS gracias a su movimiento Gigamax!`);
              events.push({
                type: "heal",
                side: current.side,
                currentHp: actor.currentHp,
                maxHp: actor.maxHp,
              });
            }
          }

          // Check if defender fainted
          if (defender.currentHp <= 0) {
            defender.isFainted = true;
            logMessage(`¡${defender.name} se debilitó!`);
            events.push({ type: "faint", targetSide: target.side });
          }

          // Check if actor fainted (from recoil/life orb)
          if (actor.currentHp <= 0) {
            actor.isFainted = true;
            logMessage(`¡${actor.name} se debilitó!`);
            events.push({ type: "faint", targetSide: current.side });
          }
        }

        // 3B. STATUS MOVES
        if (move.category === "status") {
          // Entry Hazard Setting (Stealth Rock, Spikes, Toxic Spikes)
          if (move.isHazard && move.hazardType) {
            const oppSide = target.side;
            if (!state.hazards) state.hazards = { player: { stealthRock: false, spikes: 0, toxicSpikes: 0 }, rival: { stealthRock: false, spikes: 0, toxicSpikes: 0 } };
            const sideH = state.hazards[oppSide];

            if (move.hazardType === "stealth-rock") {
              if (!sideH.stealthRock) {
                sideH.stealthRock = true;
                logMessage(`¡Se colocó una lluvia de piedras puntiagudas alrededor del bando rival!`);
                events.push({ type: "hazard_set", targetSide: oppSide, hazard: "stealth-rock" });
              } else {
                logMessage(`¡Ya había Trampa Rocas en el campo rival!`);
              }
            } else if (move.hazardType === "spikes") {
              if (sideH.spikes < 3) {
                sideH.spikes++;
                logMessage(`¡Se esparcieron Púas por el campo rival (Capa ${sideH.spikes})!`);
                events.push({ type: "hazard_set", targetSide: oppSide, hazard: "spikes", count: sideH.spikes });
              } else {
                logMessage(`¡No se pueden esparcir más Púas!`);
              }
            } else if (move.hazardType === "toxic-spikes") {
              if (sideH.toxicSpikes < 2) {
                sideH.toxicSpikes++;
                logMessage(`¡Se esparcieron Púas Tóxicas por el campo rival (Capa ${sideH.toxicSpikes})!`);
                events.push({ type: "hazard_set", targetSide: oppSide, hazard: "toxic-spikes", count: sideH.toxicSpikes });
              } else {
                logMessage(`¡No se pueden esparcir más Púas Tóxicas!`);
              }
            }
            return;
          }

          // Screen Setting (Reflect, Light Screen, Aurora Veil, Tailwind)
          if (move.screen) {
            const sideS = state.screens[current.side];
            sideS[move.screen] = move.duration || 5;
            logMessage(`¡${move.displayName} protegió al bando de ${actor.name} durante ${move.duration || 5} turnos!`);
            events.push({ type: "screen_set", side: current.side, screen: move.screen, duration: move.duration || 5 });
            return;
          }

          // Trick Room (Espacio Raro)
          if (move.name === "trick-room") {
            if (state.field.trickRoom && state.field.trickRoom > 0) {
              state.field.trickRoom = 0;
              logMessage(`¡Las dimensiones volvieron a la normalidad!`);
              events.push({ type: "trick_room_end" });
            } else {
              state.field.trickRoom = 5;
              logMessage(`¡${actor.name} distorsionó las dimensiones con Espacio Raro!`);
              events.push({ type: "trick_room_start", duration: 5 });
            }
            return;
          }

          // Stat Changes (Self buff, e.g. Swords Dance, Calm Mind)
          if (move.statChanges) {
            const buffTarget = move.target === "self" ? actor : defender;
            const buffSide =
              move.target === "self" ? current.side : target.side;
            for (const chg of move.statChanges) {
              buffTarget.stages[chg.stat] = Math.max(
                -6,
                Math.min(6, (buffTarget.stages[chg.stat] || 0) + chg.stages),
              );
              const dir = chg.stages > 0 ? "subió drásticamente" : "disminuyó";
              logMessage(
                `¡El/La ${chg.stat.toUpperCase()} de ${buffTarget.name} ${dir}!`,
              );
              events.push({
                type: "stat_change",
                side: buffSide,
                stat: chg.stat,
                stages: chg.stages,
              });
            }
          }

          // Direct Status infliction (e.g. Will-O-Wisp, Spore, Toxic, Thunder Wave)
          if (move.status && !defender.status) {
            const defTypes = defender.types.map((t) => t.toLowerCase());
            let immuneToStatus = false;
            if (move.status === "brn" && defTypes.includes("fire"))
              immuneToStatus = true;
            if (move.status === "frz" && defTypes.includes("ice"))
              immuneToStatus = true;
            if (
              (move.status === "psn" || move.status === "tox") &&
              (defTypes.includes("poison") || defTypes.includes("steel"))
            )
              immuneToStatus = true;
            if (move.status === "par" && defTypes.includes("electric"))
              immuneToStatus = true;

            if (!immuneToStatus) {
              defender.status = move.status;
              defender.statusTurns =
                move.status === "slp"
                  ? (state.rng && typeof state.rng.sleepDurationRoll === "function"
                      ? state.rng.sleepDurationRoll()
                      : Math.floor(Math.random() * 3 + 1))
                  : 0;
              defender.toxicCounter = move.status === "tox" ? 1 : 0;
              logMessage(
                `¡${defender.name} ahora sufre ${move.status.toUpperCase()}!`,
              );
              events.push({
                type: "status_change",
                side: target.side,
                status: move.status,
              });
            } else {
              logMessage(`¡No tuvo efecto en ${defender.name}!`);
            }
          }

          // Direct Healing (e.g. Recover, Roost)
          if (move.healPercent && actor.currentHp < actor.maxHp) {
            const heal = Math.floor(actor.maxHp * (move.healPercent / 100));
            actor.currentHp = Math.min(actor.maxHp, actor.currentHp + heal);
            logMessage(`¡${actor.name} recuperó ${heal} PS!`);
            events.push({
              type: "heal",
              side: current.side,
              currentHp: actor.currentHp,
              maxHp: actor.maxHp,
            });
          }
        }
      }
    }

    // --- STEP 1: First action ---
    executeAction(first, second);

    // --- STEP 2: Second action (if opponent still alive and active) ---
    if (!state.winner && !second.active.isFainted) {
      executeAction(second, first);
    }

    // --- STEP 3: END-OF-TURN EFFECTS ---
    function processEndOfTurn(pokemon, side) {
      if (pokemon.isFainted) return;

      // Burn Damage (1/16 max HP)
      if (pokemon.status === "brn") {
        const brnDmg = Math.max(1, Math.floor(pokemon.maxHp / 16));
        pokemon.currentHp = Math.max(0, pokemon.currentHp - brnDmg);
        logMessage(
          `¡${pokemon.name} se resiente de la quemadura (-${brnDmg} PS)!`,
        );
        events.push({
          type: "damage",
          targetSide: side,
          damage: brnDmg,
          currentHp: pokemon.currentHp,
          maxHp: pokemon.maxHp,
          isCrit: false,
          effectiveness: 1,
        });
      }

      // Poison Damage (1/8 max HP)
      if (pokemon.status === "psn") {
        const psnDmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
        pokemon.currentHp = Math.max(0, pokemon.currentHp - psnDmg);
        logMessage(
          `¡${pokemon.name} sufre el daño del veneno (-${psnDmg} PS)!`,
        );
        events.push({
          type: "damage",
          targetSide: side,
          damage: psnDmg,
          currentHp: pokemon.currentHp,
          maxHp: pokemon.maxHp,
          isCrit: false,
          effectiveness: 1,
        });
      }

      // Badly Poisoned / Toxic (n/16 max HP)
      if (pokemon.status === "tox") {
        pokemon.toxicCounter = pokemon.toxicCounter || 1;
        const toxDmg = Math.max(
          1,
          Math.floor((pokemon.maxHp * pokemon.toxicCounter) / 16),
        );
        pokemon.toxicCounter++;
        pokemon.currentHp = Math.max(0, pokemon.currentHp - toxDmg);
        logMessage(
          `¡El veneno grave carcome a ${pokemon.name} (-${toxDmg} PS)!`,
        );
        events.push({
          type: "damage",
          targetSide: side,
          damage: toxDmg,
          currentHp: pokemon.currentHp,
          maxHp: pokemon.maxHp,
          isCrit: false,
          effectiveness: 1,
        });
      }

      // Leftovers Trigger
      if (
        pokemon.item === "leftovers" &&
        pokemon.currentHp > 0 &&
        pokemon.currentHp < pokemon.maxHp
      ) {
        const heal = Math.max(1, Math.floor(pokemon.maxHp / 16));
        pokemon.currentHp = Math.min(pokemon.maxHp, pokemon.currentHp + heal);
        pokemon.revealedItem = true;
        logMessage(
          `¡Los Restos de ${pokemon.name} recuperaron salud (+${heal} PS)!`,
        );
        events.push({
          type: "heal",
          side,
          currentHp: pokemon.currentHp,
          maxHp: pokemon.maxHp,
          item: "leftovers",
        });
      }

      // G-Max Residual Damage (Wildfire, Cannonade, Vine Lash)
      if (state.gmaxResiduals && state.gmaxResiduals[side]) {
        const res = state.gmaxResiduals[side];
        const isImmune =
          pokemon.types &&
          pokemon.types.map((t) => t.toLowerCase()).includes(res.type);
        if (!isImmune && pokemon.currentHp > 0) {
          const dmg = Math.max(
            1,
            Math.floor(pokemon.maxHp * (res.fraction || 1 / 6)),
          );
          pokemon.currentHp = Math.max(0, pokemon.currentHp - dmg);
          logMessage(
            `¡El efecto residual de ${res.type.toUpperCase()} causó ${dmg} PS de daño a ${pokemon.name}!`,
          );
          events.push({
            type: "damage",
            targetSide: side,
            damage: dmg,
            currentHp: pokemon.currentHp,
            maxHp: pokemon.maxHp,
            isCrit: false,
            effectiveness: 1,
          });
        }
        res.turns--;
        if (res.turns <= 0) {
          state.gmaxResiduals[side] = null;
          logMessage(
            `¡El efecto residual de ${res.type.toUpperCase()} ha terminado!`,
          );
        }
      }

      // Screen & Tailwind Turn Countdown (Single Source of Truth)
      if (state.screens && state.screens[side]) {
        const sc = state.screens[side];
        ["reflect", "lightScreen", "auroraVeil", "tailwind"].forEach(sKey => {
          if (sc[sKey] > 0) {
            sc[sKey]--;
            if (sc[sKey] === 0) {
              const sNames = { reflect: "Reflejo", lightScreen: "Pantalla Luz", auroraVeil: "Velo Aurora", tailwind: "Viento Afín" };
              logMessage(`¡El efecto de ${sNames[sKey] || sKey} de tu bando ha terminado!`);
            }
          }
        });
        // Synchronize legacy state.auroraVeil to prevent dual-decrement bugs
        if (state.auroraVeil) {
          state.auroraVeil[side] = sc.auroraVeil || 0;
        }
      }

      // Faint check from end of turn damage
      if (pokemon.currentHp <= 0) {
        pokemon.isFainted = true;
        // If Dynamaxed when fainted, revert Dynamax state
        if (pokemon.isDynamax) {
          pokemon.isDynamax = false;
          pokemon.isGigantamax = false;
          pokemon.maxHp = pokemon.originalMaxHp;
        }
        logMessage(`¡${pokemon.name} se debilitó!`);
        events.push({ type: "faint", targetSide: side });
        return;
      }

      // Dynamax Turn Countdown & Automatic Reversion
      if (pokemon.isDynamax && !pokemon.isFainted) {
        pokemon.dynamaxTurnsLeft--;
        if (pokemon.dynamaxTurnsLeft <= 0) {
          revertDynamax(pokemon, side, state, events, logMessage);
        } else {
          logMessage(
            `¡A ${pokemon.name} le quedan ${pokemon.dynamaxTurnsLeft} turno(s) de Dinamax!`,
          );
        }
      }
    }

    processEndOfTurn(state.playerTeam[state.playerActiveIndex], "player");
    processEndOfTurn(state.rivalTeam[state.rivalActiveIndex], "rival");

    // Weather turn decrement
    if (state.field && state.field.weatherTurns > 0) {
      state.field.weatherTurns--;
      if (state.field.weatherTurns <= 0) {
        const oldW = state.field.weather;
        state.field.weather = null;
        logMessage(`¡El clima ha vuelto a la normalidad!`);
        events.push({ type: "weather_end", weather: oldW });
      }
    }

    // Terrain turn decrement
    if (state.field && state.field.terrainTurns > 0) {
      state.field.terrainTurns--;
      if (state.field.terrainTurns <= 0) {
        logMessage(`¡El campo ${state.field.terrain} se ha disipado!`);
        state.field.terrain = null;
        events.push({ type: "terrain_end" });
      }
    }

    // Trick Room countdown
    if (state.field && state.field.trickRoom > 0) {
      state.field.trickRoom--;
      if (state.field.trickRoom <= 0) {
        logMessage(`¡Las dimensiones distorsionadas por Espacio Raro volvieron a la normalidad!`);
        events.push({ type: "trick_room_end" });
      }
    }

    // --- STEP 4: VICTORY / DEFEAT / FORCED SWITCH CHECK ---
    const playerAllFainted = state.playerTeam.every((p) => p.isFainted);
    const rivalAllFainted = state.rivalTeam.every((p) => p.isFainted);

    if (playerAllFainted && rivalAllFainted) {
      state.winner = "draw";
      state.phase = "ended";
      logMessage(`¡Todos los Pokémon se debilitaron! ¡Empate!`);
      events.push({ type: "battle_end", winner: "draw" });
    } else if (playerAllFainted) {
      state.winner = "rival";
      state.phase = "ended";
      logMessage(`¡Te has quedado sin Pokémon! ¡Has perdido el combate!`);
      events.push({ type: "battle_end", winner: "rival" });
    } else if (rivalAllFainted) {
      state.winner = "player";
      state.phase = "ended";
      logMessage(`¡Has derrotado a todos los Pokémon del rival! ¡VICTORIA!`);
      events.push({ type: "battle_end", winner: "player" });
    } else {
      // Check forced switches
      const playerActiveFainted =
        state.playerTeam[state.playerActiveIndex].isFainted;
      const rivalActiveFainted =
        state.rivalTeam[state.rivalActiveIndex].isFainted;

      if (rivalActiveFainted) {
        // Automatic AI forced switch to next alive pokemon
        const nextRivalIdx = state.rivalTeam.findIndex((p) => !p.isFainted);
        if (nextRivalIdx !== -1) {
          state.rivalActiveIndex = nextRivalIdx;
          const nextRival = state.rivalTeam[nextRivalIdx];
          logMessage(`¡El rival envía al combate a ${nextRival.name}!`);
          events.push({
            type: "switch",
            side: "rival",
            toPokemon: sanitizeRival(nextRival),
          });
        }
      }

      if (playerActiveFainted) {
        state.phase = "force_switch";
        state.forcedSwitchSide = "player";
        logMessage(`¡Elige a tu siguiente Pokémon para continuar!`);
        events.push({ type: "prompt_switch" });
      } else {
        state.phase = "action_select";
        state.turn++;
      }
    }

    return {
      events,
      state,
      publicState: getPublicBattleState(state),
    };
  }

  // Forced Switch resolver when player's active pokemon was fainted
  function resolveForcedSwitch(state, targetIndex) {
    const events = [];
    const newActive = state.playerTeam[targetIndex];

    if (
      !newActive ||
      newActive.isFainted ||
      targetIndex === state.playerActiveIndex
    ) {
      return { success: false, error: "Selección de Pokémon no válida." };
    }

    state.playerActiveIndex = targetIndex;
    state.phase = "action_select";
    state.forcedSwitchSide = null;
    state.turn++;

    const msg = `¡Adelante, ${newActive.name}!`;
    events.push({ type: "text", message: msg });
    state.log.push(`[T${state.turn}] ${msg}`);

    events.push({
      type: "switch",
      side: "player",
      toPokemon: newActive,
    });

    return {
      success: true,
      events,
      state,
      publicState: getPublicBattleState(state),
    };
  }

  return {
    calculateHp,
    calculateStat,
    calculateAllStats,
    getTypeEffectiveness,
    getStatStageMultiplier,
    getAccEvasionMultiplier,
    getEffectiveSpeed,
    calculateDamage,
    createBattlePokemon,
    sanitizeRival,
    getPublicBattleState,
    initBattle,
    resolveTurn,
    resolveForcedSwitch,
    triggerMegaEvolution,
    triggerDynamax,
    revertDynamax,
    triggerTerastallization,
  };
});
