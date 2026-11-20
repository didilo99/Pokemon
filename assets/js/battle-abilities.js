/**
 * Battle Abilities & Stat Reactions Engine
 * Faithfully resolves entry abilities, stat-lowering reactions (Intimidate,
 * Competitive, Defiant, Mirror Armor, Guard Dog, Contrary, Clear Body),
 * and immunities without hardcoded chains scattered across the engine.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BattleAbilities = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Applies a stat change to a target Pokémon with full support for:
   * - Contrary (Respondón): inverts stage deltas
   * - Simple (Simple): doubles stage deltas
   * - Clear Body / White Smoke / Full Metal Body: blocks drops by opponent
   * - Defiant (Tenacidad): +2 Attack on stat drop by opponent
   * - Competitive (Competitivo): +2 Special Attack on stat drop by opponent
   * - Mirror Armor (Armadura Espejo): reflects stat drops back to the user
   *
   * @param {Object} target
   * @param {string} stat - 'atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'
   * @param {number} delta - positive or negative integer
   * @param {Object} source - { pokemon, side, isSelf }
   * @param {Object} battle - { events, logMessage }
   */
  function applyStatStageChange(target, stat, delta, source = {}, battle = {}) {
    if (!target || target.isFainted || delta === 0) return { changed: false, delta: 0 };
    if (!target.stages) target.stages = {};

    let actualDelta = delta;
    const ability = (target.ability || "").toLowerCase();
    const isOpponentSource = !source.isSelf;

    // 1. Contrary: inverts any stat stage modification
    if (ability === "contrary") {
      actualDelta = -actualDelta;
    }

    // 2. Simple: doubles any stat stage modification
    if (ability === "simple") {
      actualDelta = actualDelta * 2;
    }

    // 3. Stat drops caused by opponent
    if (actualDelta < 0 && isOpponentSource) {
      // Clear Body, White Smoke, Full Metal Body block drops
      if (["clear-body", "white-smoke", "full-metal-body"].includes(ability)) {
        if (battle.logMessage) {
          battle.logMessage(`¡${target.name} evitó la bajada de estadísticas con su habilidad ${ability.toUpperCase()}!`);
        }
        return { changed: false, delta: 0, blockedBy: ability };
      }

      // Hyper Cutter blocks Attack drops
      if (ability === "hyper-cutter" && stat === "atk") {
        if (battle.logMessage) {
          battle.logMessage(`¡Corte Fuerte de ${target.name} evitó que su Ataque disminuyera!`);
        }
        return { changed: false, delta: 0, blockedBy: ability };
      }

      // Keen Eye blocks Accuracy drops
      if (ability === "keen-eye" && stat === "acc") {
        if (battle.logMessage) {
          battle.logMessage(`¡Vista Lince de ${target.name} evitó que su Precisión disminuyera!`);
        }
        return { changed: false, delta: 0, blockedBy: ability };
      }

      // Big Pecks blocks Defense drops
      if (ability === "big-pecks" && stat === "def") {
        if (battle.logMessage) {
          battle.logMessage(`¡Sacapecho de ${target.name} evitó que su Defensa disminuyera!`);
        }
        return { changed: false, delta: 0, blockedBy: ability };
      }

      // Mirror Armor: bounces back stat drops to opponent
      if (ability === "mirror-armor" && source.pokemon && !source.pokemon.isFainted) {
        if (battle.logMessage) {
          battle.logMessage(`¡La Armadura Espejo de ${target.name} reflejó la reducción de estadísticas a ${source.pokemon.name}!`);
        }
        return applyStatStageChange(source.pokemon, stat, delta, { pokemon: target, side: target.side, isSelf: false }, battle);
      }
    }

    const prevStage = target.stages[stat] || 0;
    const newStage = Math.max(-6, Math.min(6, prevStage + actualDelta));
    const effectiveChange = newStage - prevStage;

    if (effectiveChange === 0) {
      if (battle.logMessage) {
        const text = prevStage >= 6 ? "ya no puede subir más" : "ya no puede bajar más";
        battle.logMessage(`¡${stat.toUpperCase()} de ${target.name} ${text}!`);
      }
      return { changed: false, delta: 0 };
    }

    target.stages[stat] = newStage;

    if (battle.events) {
      battle.events.push({
        type: "stat_change",
        side: target.side || "player",
        stat,
        stages: effectiveChange,
        totalStage: newStage
      });
    }

    if (battle.logMessage) {
      const dir = effectiveChange > 0 ? "subió" : "bajó";
      const amount = Math.abs(effectiveChange) === 1 ? "" : Math.abs(effectiveChange) === 2 ? " mucho" : " drásticamente";
      battle.logMessage(`¡El ${stat.toUpperCase()} de ${target.name} ${dir}${amount}!`);
    }

    // 4. Reactions to successful stat drops by opponent:
    if (effectiveChange < 0 && isOpponentSource) {
      // Defiant (Tenacidad): +2 Attack
      if (ability === "defiant") {
        if (battle.logMessage) battle.logMessage(`¡La Tenacidad de ${target.name} se activó!`);
        applyStatStageChange(target, "atk", 2, { pokemon: target, isSelf: true }, battle);
      }
      // Competitive (Competitivo): +2 Special Attack
      if (ability === "competitive") {
        if (battle.logMessage) battle.logMessage(`¡El Competitivo de ${target.name} se activó!`);
        applyStatStageChange(target, "spa", 2, { pokemon: target, isSelf: true }, battle);
      }
    }

    return { changed: true, delta: effectiveChange, totalStage: newStage };
  }

  /**
   * Resolves Intimidate specifically respecting Gen IX immunity rules:
   * Oblivious, Own Tempo, Inner Focus, Scrappy, Guard Dog are IMMUNE.
   * Guard Dog: +1 Attack when intimidated!
   * Mirror Armor: reflects Intimidate back to the user!
   */
  function applyIntimidate(user, opponent, battle = {}) {
    if (!user || user.isFainted || !opponent || opponent.isFainted) return;
    const oppAbility = (opponent.ability || "").toLowerCase();

    // Gen 8/9 official immunities to Intimidate
    if (["oblivious", "own-tempo", "inner-focus", "scrappy"].includes(oppAbility)) {
      if (battle.logMessage) {
        battle.logMessage(`¡La habilidad ${oppAbility.toUpperCase()} de ${opponent.name} bloqueó la Intimidación de ${user.name}!`);
      }
      return;
    }

    // Guard Dog (Perro Guardián): boosts attack instead of dropping
    if (oppAbility === "guard-dog") {
      if (battle.logMessage) {
        battle.logMessage(`¡Perro Guardián de ${opponent.name} convirtió la Intimidación en fuerza!`);
      }
      applyStatStageChange(opponent, "atk", 1, { pokemon: opponent, isSelf: true }, battle);
      return;
    }

    // Standard application passing through applyStatStageChange
    applyStatStageChange(opponent, "atk", -1, { pokemon: user, isSelf: false }, battle);
  }

  return {
    applyStatStageChange,
    applyIntimidate
  };
});

