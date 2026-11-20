/**
 * Battle Turn & Action Order Manager
 * Calculates official priority resolution, effective speed, dynamic speed tiers,
 * and handles Trick Room (Espacio Raro) through explicit order logic rather than artificial speed inversion.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const BattleDamage = require("./battle-damage.js");
    module.exports = factory(BattleDamage);
  } else {
    root.BattleTurn = factory(root.BattleDamage);
  }
})(typeof self !== "undefined" ? self : this, function (BattleDamage) {
  "use strict";

  const getStatStageMultiplier =
    BattleDamage && BattleDamage.getStatStageMultiplier
      ? BattleDamage.getStatStageMultiplier
      : (stage) => {
          const s = Math.max(-6, Math.min(6, parseInt(stage, 10) || 0));
          return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
        };

  /**
   * Calculates true effective speed for a Pokémon taking into account:
   * - Base stat & EVs/IVs/Nature
   * - Stat Stage (-6 to +6)
   * - Paralysis (50% in Gen 7-9, 25% in Gen 1-6)
   * - Choice Scarf (1.5x)
   * - Tailwind (2.0x)
   * - Speed Boost / Protosynthesis / Quark Drive
   * - Weather abilities: Chlorophyll (Clorofila), Swift Swim (Nado Rápido), Slush Rush (Quitanieves), Sand Rush
   *
   * @param {Object} pokemon
   * @param {Object} field - Unified field state
   * @param {Object} rules - Generation rules
   */
  function calculateEffectiveSpeed(pokemon, field = {}, rules = {}) {
    if (!pokemon || !pokemon.stats) return 1;
    let speed = pokemon.stats.spe || 50;

    // Stat stage modifier
    const stage = pokemon.stages ? pokemon.stages.spe || 0 : 0;
    speed = Math.floor(speed * getStatStageMultiplier(stage));

    // Paralysis penalty (official: 50% in Gen 7-9, 25% in Gen 1-6)
    if (pokemon.status === "par") {
      const parMult = rules.paralysisSpeedMultiplier !== undefined ? rules.paralysisSpeedMultiplier : 0.5;
      speed = Math.floor(speed * parMult);
    }

    // Choice Scarf (Pañuelo Elección)
    if (pokemon.item === "choice-scarf") {
      speed = Math.floor(speed * 1.5);
    }

    // Tailwind (Viento Afín)
    const side = pokemon.side || "player";
    const screens = field.sides ? field.sides[side] || {} : field;
    if (screens.tailwind && screens.tailwind > 0) {
      speed = Math.floor(speed * 2);
    }

    // Paradox Boost (Protosynthesis / Quark Drive)
    if (pokemon.boosterEnergyStat === "spe") {
      speed = Math.floor(speed * 1.5);
    }

    // Weather Speed Abilities (Chlorophyll in sun, Swift Swim in rain, Slush Rush in snow, Sand Rush in sandstorm)
    const ab = (pokemon.ability || "").toLowerCase();
    const weather = field.weather;
    if (
      (ab === "chlorophyll" && (weather === "sun" || weather === "harsh-sun")) ||
      (ab === "swift-swim" && (weather === "rain" || weather === "heavy-rain")) ||
      (ab === "slush-rush" && weather === "snow") ||
      (ab === "sand-rush" && weather === "sandstorm")
    ) {
      speed = Math.floor(speed * 2);
    }

    // Quick Powder (Polvo Veloz for Ditto)
    if (pokemon.name?.toLowerCase() === "ditto" && pokemon.item === "quick-powder" && !pokemon.isTransformed) {
      speed = Math.floor(speed * 2);
    }

    // Iron Ball (Bola Férrea)
    if (pokemon.item === "iron-ball") {
      speed = Math.floor(speed * 0.5);
    }

    return Math.max(1, speed);
  }

  /**
   * Official Action Priority calculation.
   * Switch and Item actions: Priority 6
   * Mega Evolution / Teracristalización: resolved at turn start before any actions
   * Moves: move.priority (with Prankster / Gale Wings adjustments)
   */
  function getActionPriority(action, pokemon) {
    if (!action) return 0;
    if (action.type === "item" || action.type === "switch") {
      return 6;
    }
    if (action.type === "attack") {
      const move = pokemon.moves ? pokemon.moves[action.moveIndex] : null;
      if (!move) return 0;

      // Status moves in Dynamax become Max Guard (+4 priority)
      if (pokemon.isDynamax && move.category === "status") {
        return 4;
      }

      let priority = move.priority || 0;

      // Prankster (Bromista): +1 priority for status moves
      if (pokemon.ability === "prankster" && move.category === "status") {
        priority += 1;
      }

      // Gale Wings (Alas Vendaval): +1 priority for flying moves at full HP (Gen 7+)
      if (pokemon.ability === "gale-wings" && move.type === "flying" && pokemon.currentHp >= pokemon.maxHp) {
        priority += 1;
      }

      return priority;
    }
    return 0;
  }

  /**
   * Compares two combatants and determines who acts first according to official rules:
   * 1. Action Priority bracket comparison
   * 2. If equal priority:
   *    - If Trick Room is active: lowest effective speed goes first!
   *    - If Trick Room is NOT active: highest effective speed goes first!
   * 3. If exact speed tie: controlled deterministic RNG 50/50 roll
   *
   * @param {Object} actorA { action, pokemon, side }
   * @param {Object} actorB { action, pokemon, side }
   * @param {Object} field
   * @param {Object} rng
   * @param {Object} rules
   * @returns {number} Negative if actorA first, positive if actorB first
   */
  function compareActionOrder(actorA, actorB, field = {}, rng = null, rules = {}) {
    const prioA = getActionPriority(actorA.action, actorA.pokemon);
    const prioB = getActionPriority(actorB.action, actorB.pokemon);

    if (prioA !== prioB) {
      return prioB - prioA; // Higher priority runs first
    }

    // Priority tie: evaluate Speed Order
    const speedA = calculateEffectiveSpeed(actorA.pokemon, field, rules);
    const speedB = calculateEffectiveSpeed(actorB.pokemon, field, rules);

    const isTrickRoom = Boolean(field.trickRoom && field.trickRoom > 0);

    if (speedA !== speedB) {
      if (isTrickRoom) {
        // In Trick Room: lower speed moves earlier (strictly speedA < speedB)
        return speedA - speedB;
      }
      return speedB - speedA; // Standard: higher speed moves earlier
    }

    // Speed Tie: 50/50 roll via deterministic PRNG
    const roll = rng && typeof rng.chance === "function" ? rng.chance(0.5) : Math.random() < 0.5;
    return roll ? -1 : 1;
  }

  return {
    calculateEffectiveSpeed,
    getActionPriority,
    compareActionOrder
  };
});

