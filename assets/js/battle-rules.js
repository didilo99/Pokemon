/**
 * Generation Rulesets & Mechanics Matrix
 * Provides explicit, official mechanics parameterization for Generations 1 through 9.
 * Serves as the single source of truth for generation-dependent constants, formulas,
 * critical hit tiers, paralysis penalties, and mechanics availability.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GenerationRules = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const GENERATIONS = {
    1: {
      gen: 1,
      name: "Gen I (RBY)",
      paralysisSpeedMultiplier: 0.25, // -75% speed
      burnAttackMultiplier: 0.5,
      critMultiplier: 2.0,
      critChances: [16, 8, 4, 2], // Base speed based originally
      screensHalveDamage: true,
      weatherAvailable: false,
      terrainAvailable: false,
      abilitiesAvailable: false,
      itemsAvailable: false,
      teraAvailable: false,
      dynamaxAvailable: false,
      megaAvailable: false,
      electricImmuneToParalysis: false,
      poisonImmuneToToxicSpikes: false,
      ghostImmuneToTrap: false
    },
    2: {
      gen: 2,
      name: "Gen II (GSC)",
      paralysisSpeedMultiplier: 0.25,
      burnAttackMultiplier: 0.5,
      critMultiplier: 2.0,
      critChances: [16, 8, 4, 3, 2],
      screensHalveDamage: true,
      weatherAvailable: true,
      terrainAvailable: false,
      abilitiesAvailable: false,
      itemsAvailable: true,
      teraAvailable: false,
      dynamaxAvailable: false,
      megaAvailable: false,
      electricImmuneToParalysis: false,
      poisonImmuneToToxicSpikes: false,
      ghostImmuneToTrap: false
    },
    3: {
      gen: 3,
      name: "Gen III (RSE/FRLG)",
      paralysisSpeedMultiplier: 0.25,
      burnAttackMultiplier: 0.5,
      critMultiplier: 2.0,
      critChances: [16, 8, 4, 3, 2],
      screensHalveDamage: true,
      weatherAvailable: true,
      terrainAvailable: false,
      abilitiesAvailable: true,
      itemsAvailable: true,
      teraAvailable: false,
      dynamaxAvailable: false,
      megaAvailable: false,
      electricImmuneToParalysis: false,
      poisonImmuneToToxicSpikes: false,
      ghostImmuneToTrap: false
    },
    4: {
      gen: 4,
      name: "Gen IV (DPPt/HGSS)",
      paralysisSpeedMultiplier: 0.25,
      burnAttackMultiplier: 0.5,
      critMultiplier: 2.0,
      critChances: [16, 8, 4, 3, 2],
      screensHalveDamage: true,
      weatherAvailable: true,
      terrainAvailable: false,
      abilitiesAvailable: true,
      itemsAvailable: true,
      teraAvailable: false,
      dynamaxAvailable: false,
      megaAvailable: false,
      electricImmuneToParalysis: false,
      poisonImmuneToToxicSpikes: true,
      ghostImmuneToTrap: false
    },
    5: {
      gen: 5,
      name: "Gen V (BW/B2W2)",
      paralysisSpeedMultiplier: 0.25,
      burnAttackMultiplier: 0.5,
      critMultiplier: 2.0,
      critChances: [16, 8, 4, 3, 2],
      screensHalveDamage: true,
      weatherAvailable: true,
      terrainAvailable: false,
      abilitiesAvailable: true,
      itemsAvailable: true,
      teraAvailable: false,
      dynamaxAvailable: false,
      megaAvailable: false,
      electricImmuneToParalysis: false,
      poisonImmuneToToxicSpikes: true,
      ghostImmuneToTrap: false
    },
    6: {
      gen: 6,
      name: "Gen VI (XY/ORAS)",
      paralysisSpeedMultiplier: 0.25,
      burnAttackMultiplier: 0.5,
      critMultiplier: 1.5,
      critChances: [16, 8, 2, 1], // Stage 0: 1/16, Stage 1: 1/8, Stage 2: 1/2, Stage 3+: 100%
      screensHalveDamage: true,
      weatherAvailable: true,
      terrainAvailable: true,
      abilitiesAvailable: true,
      itemsAvailable: true,
      teraAvailable: false,
      dynamaxAvailable: false,
      megaAvailable: true,
      electricImmuneToParalysis: true, // Electric types immune to PAR since Gen 6
      poisonImmuneToToxicSpikes: true,
      ghostImmuneToTrap: true // Ghost types cannot be trapped
    },
    7: {
      gen: 7,
      name: "Gen VII (SM/USUM)",
      paralysisSpeedMultiplier: 0.5, // Changed to -50% in Gen 7
      burnAttackMultiplier: 0.5,
      burnDamageFraction: 1 / 16, // Nerfed from 1/8 to 1/16
      critMultiplier: 1.5,
      critChances: [24, 8, 2, 1], // Stage 0: 1/24 in Gen 7+
      screensHalveDamage: true,
      weatherAvailable: true,
      terrainAvailable: true,
      abilitiesAvailable: true,
      itemsAvailable: true,
      teraAvailable: false,
      dynamaxAvailable: false,
      megaAvailable: true,
      electricImmuneToParalysis: true,
      poisonImmuneToToxicSpikes: true,
      ghostImmuneToTrap: true
    },
    8: {
      gen: 8,
      name: "Gen VIII (SwSh)",
      paralysisSpeedMultiplier: 0.5,
      burnAttackMultiplier: 0.5,
      burnDamageFraction: 1 / 16,
      critMultiplier: 1.5,
      critChances: [24, 8, 2, 1],
      screensHalveDamage: true,
      weatherAvailable: true,
      terrainAvailable: true,
      abilitiesAvailable: true,
      itemsAvailable: true,
      teraAvailable: false,
      dynamaxAvailable: true,
      gigantamaxAvailable: true,
      megaAvailable: false,
      electricImmuneToParalysis: true,
      poisonImmuneToToxicSpikes: true,
      ghostImmuneToTrap: true
    },
    9: {
      gen: 9,
      name: "Gen IX (SV)",
      paralysisSpeedMultiplier: 0.5,
      burnAttackMultiplier: 0.5,
      burnDamageFraction: 1 / 16,
      critMultiplier: 1.5,
      critChances: [24, 8, 2, 1], // 1/24, 1/8, 1/2, 1/1
      screensHalveDamage: true,
      weatherAvailable: true,
      terrainAvailable: true,
      abilitiesAvailable: true,
      itemsAvailable: true,
      teraAvailable: true,
      dynamaxAvailable: false,
      gigantamaxAvailable: false,
      megaAvailable: false,
      electricImmuneToParalysis: true,
      poisonImmuneToToxicSpikes: true,
      ghostImmuneToTrap: true
    }
  };

  /**
   * Get ruleset definition for a given generation number (1-9) or format string.
   */
  function getGenRules(genOrFormat = 9) {
    if (typeof genOrFormat === "string") {
      const match = genOrFormat.match(/gen(\d)/i);
      if (match) {
        return GENERATIONS[parseInt(match[1], 10)] || GENERATIONS[9];
      }
      return GENERATIONS[9];
    }
    const n = parseInt(genOrFormat, 10) || 9;
    return GENERATIONS[n] || GENERATIONS[9];
  }

  return {
    GENERATIONS,
    getGenRules
  };
});

