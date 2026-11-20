/**
 * Official Battle Damage Calculator (Gen IX Scarlet & Violet Reference Engine)
 * Features:
 * - 4096-based integer fixed point scaling (pokeRound & applyModifier)
 * - Exact STAB (1.5x regular, 2.0x Adaptability, 2.0x Tera matching base, 2.25x Tera Adaptability)
 * - Complete type effectiveness table handling
 * - Defensive screen scaling (Singles 0.5x, Doubles 0.66x, bypassed by Crits/Infiltrator/Brick Break)
 * - Abilities: Huge Power, Guts, Hustle, Technician, Tough Claws, Multiscale, Thick Fat, Fur Coat, Unaware, Sturdy
 * - Items: Choice Band/Specs, Life Orb, Expert Belt, Assault Vest, Type-resisting berries
 * - Clima (Sol/Lluvia) y Terrenos (Eléctrico, Hierba, Psíquico, Niebla)
 * - Diagnóstico completo paso a paso (breakdown)
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const BattleData = require("./battle-data.js");
    module.exports = factory(BattleData);
  } else {
    root.BattleDamage = factory(root.BattleData);
  }
})(typeof self !== "undefined" ? self : this, function (BattleData) {
  "use strict";

  const { TYPE_CHART } = BattleData;

  /**
   * Official Game Freak fixed-point rounding helper (4096-based math).
   */
  function pokeRound(val) {
    return Math.floor(val + 0.5);
  }

  function applyModifier(base, modifier) {
    return Math.floor((base * modifier + 2048) / 4096);
  }

  const STAT_STAGE_NUMERATORS = [2, 2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7, 8];
  const STAT_STAGE_DENOMINATORS = [8, 7, 6, 5, 4, 3, 2, 2, 2, 2, 2, 2, 2];

  function getStatStageMultiplier(stage) {
    const clamped = Math.max(-6, Math.min(6, parseInt(stage, 10) || 0));
    const index = clamped + 6;
    return STAT_STAGE_NUMERATORS[index] / STAT_STAGE_DENOMINATORS[index];
  }

  /**
   * Compute Type Effectiveness with dual types, Tera type, and immunity abilities.
   */
  function calculateTypeEffectiveness(moveType, targetTypes, options = {}) {
    if (!moveType || !targetTypes || targetTypes.length === 0) return 1.0;
    const mType = moveType.toLowerCase();

    // Freeze-Dry vs Water special rule
    const isFreezeDry = options.moveName === "freeze-dry" && mType === "ice";

    // Ring Target or Scrappy (Ghost immunity ignored)
    const ignoresGhostImmunity = options.scrappy && (mType === "normal" || mType === "fighting");

    // Ground vs Flying with Gravity / Iron Ball / Smack Down
    const grounded = options.grounded || options.field?.gravity;

    let total = 1.0;
    for (const t of targetTypes) {
      const dType = t.toLowerCase();

      if (isFreezeDry && dType === "water") {
        total *= 2.0;
        continue;
      }

      if (ignoresGhostImmunity && dType === "ghost") {
        total *= 1.0;
        continue;
      }

      if (grounded && dType === "flying" && mType === "ground") {
        total *= 1.0;
        continue;
      }

      const row = TYPE_CHART[mType];
      if (row && Object.prototype.hasOwnProperty.call(row, dType)) {
        total *= row[dType];
      }
    }
    return total;
  }

  /**
   * High Fidelity Official Damage Calculation
   */
  function calculateDamage(attacker, defender, move, field = {}, options = {}) {
    const breakdown = options.debug ? { steps: [] } : null;
    const logStep = (step, val) => {
      if (breakdown) breakdown.steps.push({ step, value: val });
    };

    if (!move || move.category === "status" || (move.power || 0) <= 0) {
      return { damage: 0, effectiveness: 1, isCrit: false, isImmune: false, breakdown };
    }

    const mName = (move.name || "").toLowerCase();
    const isPhysical = move.category === "physical";
    const attackStatKey = isPhysical ? "atk" : "spa";
    const defenseStatKey = isPhysical ? "def" : "spd";

    // 1. Check Abilities for Immunities
    const defAbility = (defender.ability || "").toLowerCase();
    const defIgnoresAbilities =
      move.ignoreAbilities ||
      attacker.ability === "mold-breaker" ||
      attacker.ability === "teravolt" ||
      attacker.ability === "turboblaze";

    if (!defIgnoresAbilities) {
      if (move.type === "water" && ["water-absorb", "dry-skin", "storm-drain"].includes(defAbility)) {
        return { damage: 0, effectiveness: 0, isCrit: false, isImmune: true, immuneReason: defAbility, breakdown };
      }
      if (move.type === "electric" && ["volt-absorb", "lightning-rod", "motor-drive"].includes(defAbility)) {
        return { damage: 0, effectiveness: 0, isCrit: false, isImmune: true, immuneReason: defAbility, breakdown };
      }
      if (move.type === "fire" && ["flash-fire", "well-baked-body"].includes(defAbility)) {
        return { damage: 0, effectiveness: 0, isCrit: false, isImmune: true, immuneReason: defAbility, breakdown };
      }
      if (move.type === "grass" && defAbility === "sap-sipper") {
        return { damage: 0, effectiveness: 0, isCrit: false, isImmune: true, immuneReason: defAbility, breakdown };
      }
      if (move.type === "ground" && (defAbility === "levitate" || defender.item === "air-balloon") && !field.gravity) {
        return { damage: 0, effectiveness: 0, isCrit: false, isImmune: true, immuneReason: defAbility || "air-balloon", breakdown };
      }
      if (move.type === "ground" && defAbility === "earth-eater") {
        return { damage: 0, effectiveness: 0, isCrit: false, isImmune: true, immuneReason: defAbility, breakdown };
      }
    }

    // 2. Target Defender Types (Check Teracristalización)
    const effectiveDefenderTypes = defender.isTerastallized && defender.teraType
      ? [defender.teraType]
      : (defender.types || ["normal"]);

    // 3. Type Effectiveness
    const scrappy = !defIgnoresAbilities && attacker.ability === "scrappy";
    const effectiveness = calculateTypeEffectiveness(move.type, effectiveDefenderTypes, {
      moveName: mName,
      scrappy,
      grounded: field.gravity,
      field
    });

    logStep("type_effectiveness", effectiveness);

    if (effectiveness === 0) {
      return { damage: 0, effectiveness: 0, isCrit: false, isImmune: true, breakdown };
    }

    // Wonder Guard check
    if (!defIgnoresAbilities && defAbility === "wonder-guard" && effectiveness <= 1) {
      return { damage: 0, effectiveness, isCrit: false, isImmune: true, immuneReason: "wonder-guard", breakdown };
    }

    // 4. Critical Hit Determination (Gen 7-9 official: Stage 0: 1/24, Stage 1: 1/8, Stage 2: 1/2, Stage 3+: 1/1)
    let isCrit = false;
    if (options.isCrit !== undefined) {
      isCrit = options.isCrit;
    } else {
      const critStage = (move.critRatio || 0) + (attacker.critStage || 0) + (attacker.item === "scope-lens" ? 1 : 0);
      const critChances = [24, 8, 2, 1];
      const denom = critChances[Math.min(Math.max(0, critStage), 3)];
      const roll = options.rng ? options.rng.next() : (options.random !== undefined ? options.random : Math.random());
      isCrit = roll < (1 / denom);
    }

    // Battle Armor / Shell Armor block critical hits
    if (!defIgnoresAbilities && (defAbility === "battle-armor" || defAbility === "shell-armor")) {
      isCrit = false;
    }
    logStep("is_critical", isCrit);

    // 5. Stat Stages (If critical hit, ignore negative attack stages and positive defense stages)
    let atkStage = attacker.stages ? attacker.stages[attackStatKey] || 0 : 0;
    let defStage = defender.stages ? defender.stages[defenseStatKey] || 0 : 0;

    if (!defIgnoresAbilities && defAbility === "unaware") {
      atkStage = 0; // Defender ignores attacker's offensive stat boosts
    }
    if (!defIgnoresAbilities && attacker.ability === "unaware") {
      defStage = 0; // Attacker ignores defender's defensive stat boosts
    }

    if (isCrit) {
      if (atkStage < 0) atkStage = 0;
      if (defStage > 0) defStage = 0;
    }

    // 6. Base Attack & Defense Calculation
    let a = Math.floor(attacker.stats[attackStatKey] * getStatStageMultiplier(atkStage));
    let d = Math.floor(defender.stats[defenseStatKey] * getStatStageMultiplier(defStage));

    // 6.1 Attack modifiers (Abilities & Items)
    let aMod = 4096;
    if (isPhysical && ["huge-power", "pure-power"].includes(attacker.ability)) {
      aMod = Math.floor(aMod * 2);
    }
    if (isPhysical && attacker.ability === "guts" && attacker.status) {
      aMod = Math.floor(aMod * 1.5);
    }
    if (isPhysical && attacker.ability === "hustle") {
      aMod = Math.floor(aMod * 1.5);
    }
    if (isPhysical && attacker.item === "choice-band") {
      aMod = Math.floor(aMod * 1.5);
    } else if (!isPhysical && attacker.item === "choice-specs") {
      aMod = Math.floor(aMod * 1.5);
    }

    a = applyModifier(a, aMod);
    logStep("effective_attack", a);

    // 6.2 Defense modifiers
    let dMod = 4096;
    if (!isPhysical && defender.item === "assault-vest") {
      dMod = Math.floor(dMod * 1.5);
    }
    if (field.weather === "sandstorm" && !isPhysical && (defender.types || []).includes("rock")) {
      dMod = Math.floor(dMod * 1.5);
    }
    if (field.weather === "snow" && isPhysical && (defender.types || []).includes("ice")) {
      dMod = Math.floor(dMod * 1.5);
    }
    if (!defIgnoresAbilities && isPhysical && defAbility === "fur-coat") {
      dMod = Math.floor(dMod * 2);
    }

    d = Math.max(1, applyModifier(d, dMod));
    logStep("effective_defense", d);

    // 7. Base Power calculation and modifiers
    let basePower = move.power;
    if (attacker.ability === "technician" && basePower <= 60 && basePower > 0) {
      basePower = Math.floor(basePower * 1.5);
    }
    if (attacker.ability === "sheer-force" && move.secondary) {
      basePower = Math.floor(basePower * 1.3);
    }
    if (attacker.ability === "tough-claws" && (move.isContact || isPhysical)) {
      basePower = Math.floor(basePower * 1.3);
    }

    // Terrains
    const attackerIsGrounded = !((attacker.types || []).includes("flying") || attacker.ability === "levitate");
    if (field.terrain === "electric" && move.type === "electric" && attackerIsGrounded) {
      basePower = Math.floor(basePower * 1.3);
    } else if (field.terrain === "grassy" && move.type === "grass" && attackerIsGrounded) {
      basePower = Math.floor(basePower * 1.3);
    } else if (field.terrain === "psychic" && move.type === "psychic" && attackerIsGrounded) {
      basePower = Math.floor(basePower * 1.3);
    } else if (field.terrain === "misty" && move.type === "dragon") {
      basePower = Math.floor(basePower * 0.5);
    }

    logStep("modified_base_power", basePower);

    // 8. Base Damage Core Formula (Official: floor(floor(floor(2 * Level / 5 + 2) * Power * A / D) / 50) + 2)
    const level = attacker.level || 50;
    const levelFactor = Math.floor((2 * level) / 5 + 2);
    let baseDamage = Math.floor(Math.floor((levelFactor * basePower * a) / d) / 50) + 2;
    logStep("base_damage_unmodified", baseDamage);

    // 9. Targets Modifier
    if (field.isDoubleBattle && move.target === "all-adjacent-foes") {
      baseDamage = applyModifier(baseDamage, 3072);
    }

    // 10. Weather Modifier
    if (field.weather === "sun" || field.weather === "harsh-sun") {
      if (move.type === "fire") baseDamage = applyModifier(baseDamage, 6144);
      else if (move.type === "water") baseDamage = applyModifier(baseDamage, 2048);
    } else if (field.weather === "rain" || field.weather === "heavy-rain") {
      if (move.type === "water") baseDamage = applyModifier(baseDamage, 6144);
      else if (move.type === "fire") baseDamage = applyModifier(baseDamage, 2048);
    }
    logStep("damage_after_weather", baseDamage);

    // 11. Critical Hit (1.5x in Gen 6-9)
    if (isCrit) {
      baseDamage = applyModifier(baseDamage, 6144);
    }
    logStep("damage_after_crit", baseDamage);

    // 12. Random Factor: integer range [85, 100] / 100
    let roll = 100;
    if (options.randomRoll !== undefined && options.randomRoll !== null) {
      roll = options.randomRoll;
    } else if (options.rng && typeof options.rng.damageRoll === "function") {
      roll = options.rng.damageRoll();
    } else if (options.rng && typeof options.rng.range === "function") {
      roll = options.rng.range(85, 100);
    } else {
      roll = Math.floor(Math.random() * 16 + 85);
    }
    baseDamage = Math.floor((baseDamage * roll) / 100);
    logStep("damage_after_random", baseDamage);

    // 13. STAB & Teracristalización (Official Gen IX Mechanics)
    let stabMod = 4096;
    const originalTypes = (attacker.originalTypes || attacker.types || []).map((t) => t.toLowerCase());
    const moveTypeLower = move.type.toLowerCase();
    const hasOriginalStab = originalTypes.includes(moveTypeLower);

    if (attacker.isTerastallized && attacker.teraType) {
      const teraLower = attacker.teraType.toLowerCase();
      if (moveTypeLower === teraLower) {
        if (hasOriginalStab) {
          // Tera type matches original type: 2.0x (Adaptability: 2.25x)
          stabMod = attacker.ability === "adaptability" ? 9216 : 8192;
        } else {
          // Tera type is a new 3rd type: 1.5x (Adaptability: 2.0x)
          stabMod = attacker.ability === "adaptability" ? 8192 : 6144;
        }
      } else if (hasOriginalStab) {
        // Original STAB preserved when not matching Tera type
        stabMod = attacker.ability === "adaptability" ? 8192 : 6144;
      }
    } else if (hasOriginalStab) {
      stabMod = attacker.ability === "adaptability" ? 8192 : 6144;
    }

    if (stabMod !== 4096) {
      baseDamage = applyModifier(baseDamage, stabMod);
    }
    logStep("damage_after_stab", baseDamage);

    // 14. Type Effectiveness Multiplier
    baseDamage = Math.floor(baseDamage * effectiveness);
    logStep("damage_after_type_effectiveness", baseDamage);

    // 15. Burn reduction (0.5x on physical moves unless Guts)
    if (isPhysical && attacker.status === "brn" && attacker.ability !== "guts") {
      baseDamage = applyModifier(baseDamage, 2048);
    }

    // 16. Defensive Screens (Reflect / Light Screen / Aurora Veil)
    // Supports both unified FieldState sides and legacy flat field objects
    const defenderScreens = field.sides ? field.sides[defender.side || "rival"] || {} : field;
    const ignoresScreens = isCrit || attacker.ability === "infiltrator" || ["brick-break", "psychic-fangs"].includes(mName);

    if (!ignoresScreens) {
      const isDoubles = Boolean(field.isDoubleBattle);
      const screenMod = isDoubles ? 2732 : 2048; // 0.66x in doubles, 0.5x in singles

      if (defenderScreens.auroraVeil && defenderScreens.auroraVeil > 0) {
        baseDamage = applyModifier(baseDamage, screenMod);
      } else if (isPhysical && defenderScreens.reflect && defenderScreens.reflect > 0) {
        baseDamage = applyModifier(baseDamage, screenMod);
      } else if (!isPhysical && defenderScreens.lightScreen && defenderScreens.lightScreen > 0) {
        baseDamage = applyModifier(baseDamage, screenMod);
      }
    }

    // 17. Defensive Abilities (Multiscale, Thick Fat, Ice Scales)
    if (!defIgnoresAbilities) {
      if (["multiscale", "shadow-shield"].includes(defAbility) && defender.currentHp >= defender.maxHp) {
        baseDamage = applyModifier(baseDamage, 2048);
      }
      if (defAbility === "thick-fat" && (move.type === "fire" || move.type === "ice")) {
        baseDamage = applyModifier(baseDamage, 2048);
      }
      if (defAbility === "ice-scales" && !isPhysical) {
        baseDamage = applyModifier(baseDamage, 2048);
      }
    }

    // 18. Held Items (Life Orb 1.3x, Expert Belt 1.2x if supereffective)
    if (attacker.item === "life-orb") {
      baseDamage = applyModifier(baseDamage, 5324);
    } else if (attacker.item === "expert-belt" && effectiveness > 1) {
      baseDamage = applyModifier(baseDamage, 4915);
    }

    // Defensive berries (half damage from super effective move)
    const DEFENSIVE_BERRIES = {
      fire: "occa-berry",
      water: "passho-berry",
      electric: "wacan-berry",
      grass: "rindo-berry",
      ice: "yache-berry",
      fighting: "chople-berry",
      poison: "kebia-berry",
      ground: "shuca-berry",
      flying: "coba-berry",
      psychic: "payapa-berry",
      bug: "tanga-berry",
      rock: "charti-berry",
      ghost: "kasib-berry",
      dragon: "haban-berry",
      dark: "colbur-berry",
      steel: "babiri-berry",
      fairy: "roseli-berry",
      normal: "chilan-berry",
    };
    const reqBerry = DEFENSIVE_BERRIES[move.type.toLowerCase()];
    if (defender.item === reqBerry && (effectiveness > 1 || move.type === "normal")) {
      baseDamage = applyModifier(baseDamage, 2048);
    }

    // 19. Minimum 1 damage rule (if effectiveness > 0)
    let finalDamage = baseDamage;
    if (finalDamage < 1 && effectiveness > 0) {
      finalDamage = 1;
    }

    logStep("final_damage", finalDamage);

    return {
      damage: finalDamage,
      effectiveness,
      isCrit,
      isImmune: false,
      breakdown,
    };
  }

  return {
    pokeRound,
    applyModifier,
    getStatStageMultiplier,
    calculateTypeEffectiveness,
    calculateDamage,
  };
});
