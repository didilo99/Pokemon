/**
 * Battle Data Module
 * Provides static type charts, nature modifiers, preset teams, moves and items.
 * Includes complete localization dictionaries and item sprite helpers.
 * Can run in both Browser (window.BattleData) and Node.js.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BattleData = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TYPES = [
    "normal", "fire", "water", "electric", "grass", "ice",
    "fighting", "poison", "ground", "flying", "psychic", "bug",
    "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ];

  // Official Gen 6-9 Type Effectiveness Chart (Attacker rows x Defender columns)
  const TYPE_CHART = {
    normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
    dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
  };

  // 25 Official Natures
  const NATURES = {
    hardy:   { name: "hardy",   plus: null,  minus: null },
    lonely:  { name: "lonely",  plus: "atk", minus: "def" },
    brave:   { name: "brave",   plus: "atk", minus: "spe" },
    adamant: { name: "adamant", plus: "atk", minus: "spa" },
    naughty: { name: "naughty", plus: "atk", minus: "spd" },
    bold:    { name: "bold",    plus: "def", minus: "atk" },
    docile:  { name: "docile",  plus: null,  minus: null },
    relaxed: { name: "relaxed", plus: "def", minus: "spe" },
    impish:  { name: "impish",  plus: "def", minus: "spa" },
    lax:     { name: "lax",     plus: "def", minus: "spd" },
    timid:   { name: "timid",   plus: "spe", minus: "atk" },
    hasty:   { name: "hasty",   plus: "spe", minus: "def" },
    serious: { name: "serious", plus: null,  minus: null },
    jolly:   { name: "jolly",   plus: "spe", minus: "spa" },
    naive:   { name: "naive",   plus: "spe", minus: "spd" },
    modest:  { name: "modest",  plus: "spa", minus: "atk" },
    mild:    { name: "mild",    plus: "spa", minus: "def" },
    quiet:   { name: "quiet",   plus: "spa", minus: "spe" },
    bashful: { name: "bashful", plus: null,  minus: null },
    rash:    { name: "rash",    plus: "spa", minus: "spd" },
    calm:    { name: "calm",    plus: "spd", minus: "atk" },
    gentle:  { name: "gentle",  plus: "spd", minus: "def" },
    sassy:   { name: "sassy",   plus: "spd", minus: "spe" },
    careful: { name: "careful", plus: "spd", minus: "spa" },
    quirky:  { name: "quirky",  plus: null,  minus: null }
  };

  // Helper: Official item sprite URL
  function getItemSpriteUrl(slug) {
    if (!slug) return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
    const s = slug.toLowerCase().replace(/_/g, "-");
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${s}.png`;
  }

  // Curated database of key moves
  const COMMON_MOVES = {
    // Normal
    "tackle": { name: "tackle", displayName: "Placaje", type: "normal", category: "physical", power: 40, accuracy: 100, pp: 35, priority: 0 },
    "body-slam": { name: "body-slam", displayName: "Golpe Cuerpo", type: "normal", category: "physical", power: 85, accuracy: 100, pp: 15, priority: 0, secondary: { chance: 30, status: "par" } },
    "hyper-voice": { name: "hyper-voice", displayName: "Vozarrón", type: "normal", category: "special", power: 90, accuracy: 100, pp: 10, priority: 0 },
    "quick-attack": { name: "quick-attack", displayName: "Ataque Rápido", type: "normal", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1 },
    "extreme-speed": { name: "extreme-speed", displayName: "Velocidad Extrema", type: "normal", category: "physical", power: 80, accuracy: 100, pp: 5, priority: 2 },
    "swords-dance": { name: "swords-dance", displayName: "Danza Espada", type: "normal", category: "status", power: 0, accuracy: 100, pp: 20, priority: 0, target: "self", statChanges: [{ stat: "atk", stages: 2 }] },
    "recover": { name: "recover", displayName: "Recuperación", type: "normal", category: "status", power: 0, accuracy: 100, pp: 10, priority: 0, target: "self", healPercent: 50 },

    // Fire
    "flamethrower": { name: "flamethrower", displayName: "Lanzallamas", type: "fire", category: "special", power: 90, accuracy: 100, pp: 15, priority: 0, secondary: { chance: 10, status: "brn" } },
    "fire-blast": { name: "fire-blast", displayName: "Llamarada", type: "fire", category: "special", power: 110, accuracy: 85, pp: 5, priority: 0, secondary: { chance: 10, status: "brn" } },
    "flare-blitz": { name: "flare-blitz", displayName: "Envite Ígneo", type: "fire", category: "physical", power: 120, accuracy: 100, pp: 15, priority: 0, recoilPercent: 33, secondary: { chance: 10, status: "brn" } },
    "will-o-wisp": { name: "will-o-wisp", displayName: "Fuego Fatuo", type: "fire", category: "status", power: 0, accuracy: 85, pp: 15, priority: 0, status: "brn" },

    // Water
    "surf": { name: "surf", displayName: "Surf", type: "water", category: "special", power: 90, accuracy: 100, pp: 15, priority: 0 },
    "hydro-pump": { name: "hydro-pump", displayName: "Hidrobomba", type: "water", category: "special", power: 110, accuracy: 80, pp: 5, priority: 0 },
    "scald": { name: "scald", displayName: "Escaldar", type: "water", category: "special", power: 80, accuracy: 100, pp: 15, priority: 0, secondary: { chance: 30, status: "brn" } },
    "aqua-jet": { name: "aqua-jet", displayName: "Acua Jet", type: "water", category: "physical", power: 40, accuracy: 100, pp: 20, priority: 1 },
    "water-pulse": { name: "water-pulse", displayName: "Hidropulso", type: "water", category: "special", power: 60, accuracy: 100, pp: 20, priority: 0, secondary: { chance: 20, volatile: "confusion" } },

    // Grass
    "energy-ball": { name: "energy-ball", displayName: "Energibola", type: "grass", category: "special", power: 90, accuracy: 100, pp: 10, priority: 0, secondary: { chance: 10, stat: "spd", stages: -1 } },
    "giga-drain": { name: "giga-drain", displayName: "Gigadrenado", type: "grass", category: "special", power: 75, accuracy: 100, pp: 10, priority: 0, drainPercent: 50 },
    "leaf-blade": { name: "leaf-blade", displayName: "Hoja Aguda", type: "grass", category: "physical", power: 90, accuracy: 100, pp: 15, priority: 0, critRatio: 1 },
    "spore": { name: "spore", displayName: "Espora", type: "grass", category: "status", power: 0, accuracy: 100, pp: 15, priority: 0, status: "slp" },

    // Electric
    "thunderbolt": { name: "thunderbolt", displayName: "Rayo", type: "electric", category: "special", power: 90, accuracy: 100, pp: 15, priority: 0, secondary: { chance: 10, status: "par" } },
    "thunder": { name: "thunder", displayName: "Trueno", type: "electric", category: "special", power: 110, accuracy: 70, pp: 10, priority: 0, secondary: { chance: 30, status: "par" } },
    "wild-charge": { name: "wild-charge", displayName: "Voltio Cruel", type: "electric", category: "physical", power: 90, accuracy: 100, pp: 15, priority: 0, recoilPercent: 25 },
    "thunder-wave": { name: "thunder-wave", displayName: "Onda Trueno", type: "electric", category: "status", power: 0, accuracy: 90, pp: 20, priority: 0, status: "par" },
    "volt-switch": { name: "volt-switch", displayName: "Voltiocambio", type: "electric", category: "special", power: 70, accuracy: 100, pp: 20, priority: 0 },

    // Ice
    "ice-beam": { name: "ice-beam", displayName: "Rayo Hielo", type: "ice", category: "special", power: 90, accuracy: 100, pp: 10, priority: 0, secondary: { chance: 10, status: "frz" } },
    "blizzard": { name: "blizzard", displayName: "Ventisca", type: "ice", category: "special", power: 110, accuracy: 70, pp: 5, priority: 0, secondary: { chance: 10, status: "frz" } },
    "ice-shard": { name: "ice-shard", displayName: "Canto Helado", type: "ice", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1 },

    // Fighting
    "close-combat": { name: "close-combat", displayName: "A Bocajarro", type: "fighting", category: "physical", power: 120, accuracy: 100, pp: 5, priority: 0, selfStatChanges: [{ stat: "def", stages: -1 }, { stat: "spd", stages: -1 }] },
    "aura-sphere": { name: "aura-sphere", displayName: "Esfera Aural", type: "fighting", category: "special", power: 80, accuracy: 100, pp: 20, priority: 0, neverMiss: true },
    "focus-blast": { name: "focus-blast", displayName: "Onda Certera", type: "fighting", category: "special", power: 120, accuracy: 70, pp: 5, priority: 0, secondary: { chance: 10, stat: "spd", stages: -1 } },
    "mach-punch": { name: "mach-punch", displayName: "Ultrapuño", type: "fighting", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1 },
    "drain-punch": { name: "drain-punch", displayName: "Puño Drenaje", type: "fighting", category: "physical", power: 75, accuracy: 100, pp: 10, priority: 0, drainPercent: 50 },

    // Poison
    "sludge-bomb": { name: "sludge-bomb", displayName: "Bomba Lodo", type: "poison", category: "special", power: 90, accuracy: 100, pp: 10, priority: 0, secondary: { chance: 30, status: "psn" } },
    "toxic": { name: "toxic", displayName: "Tóxico", type: "poison", category: "status", power: 0, accuracy: 90, pp: 10, priority: 0, status: "tox" },
    "poison-jab": { name: "poison-jab", displayName: "Puya Nociva", type: "poison", category: "physical", power: 80, accuracy: 100, pp: 20, priority: 0, secondary: { chance: 30, status: "psn" } },

    // Ground
    "earthquake": { name: "earthquake", displayName: "Terremoto", type: "ground", category: "physical", power: 100, accuracy: 100, pp: 10, priority: 0 },
    "earth-power": { name: "earth-power", displayName: "Tierra Viva", type: "ground", category: "special", power: 90, accuracy: 100, pp: 10, priority: 0, secondary: { chance: 10, stat: "spd", stages: -1 } },

    // Flying
    "brave-bird": { name: "brave-bird", displayName: "Pájaro Osado", type: "flying", category: "physical", power: 120, accuracy: 100, pp: 15, priority: 0, recoilPercent: 33 },
    "air-slash": { name: "air-slash", displayName: "Tajo Aéreo", type: "flying", category: "special", power: 75, accuracy: 95, pp: 15, priority: 0, secondary: { chance: 30, flinch: true } },
    "roost": { name: "roost", displayName: "Respiro", type: "flying", category: "status", power: 0, accuracy: 100, pp: 10, priority: 0, target: "self", healPercent: 50 },

    // Psychic
    "psychic": { name: "psychic", displayName: "Psíquico", type: "psychic", category: "special", power: 90, accuracy: 100, pp: 10, priority: 0, secondary: { chance: 10, stat: "spd", stages: -1 } },
    "calm-mind": { name: "calm-mind", displayName: "Paz Mental", type: "psychic", category: "status", power: 0, accuracy: 100, pp: 20, priority: 0, target: "self", statChanges: [{ stat: "spa", stages: 1 }, { stat: "spd", stages: 1 }] },
    "zen-headbutt": { name: "zen-headbutt", displayName: "Cabezazo Zen", type: "psychic", category: "physical", power: 80, accuracy: 90, pp: 15, priority: 0, secondary: { chance: 20, flinch: true } },

    // Bug
    "bug-buzz": { name: "bug-buzz", displayName: "Zumbido", type: "bug", category: "special", power: 90, accuracy: 100, pp: 10, priority: 0, secondary: { chance: 10, stat: "spd", stages: -1 } },
    "u-turn": { name: "u-turn", displayName: "Ida y Vuelta", type: "bug", category: "physical", power: 70, accuracy: 100, pp: 20, priority: 0 },

    // Rock
    "stone-edge": { name: "stone-edge", displayName: "Roca Afilada", type: "rock", category: "physical", power: 100, accuracy: 80, pp: 5, priority: 0, critRatio: 1 },
    "rock-slide": { name: "rock-slide", displayName: "Avalancha", type: "rock", category: "physical", power: 75, accuracy: 90, pp: 10, priority: 0, secondary: { chance: 30, flinch: true } },

    // Ghost
    "shadow-ball": { name: "shadow-ball", displayName: "Bola Sombra", type: "ghost", category: "special", power: 80, accuracy: 100, pp: 15, priority: 0, secondary: { chance: 20, stat: "spd", stages: -1 } },
    "shadow-claw": { name: "shadow-claw", displayName: "Garra Umbría", type: "ghost", category: "physical", power: 70, accuracy: 100, pp: 15, priority: 0, critRatio: 1 },
    "shadow-sneak": { name: "shadow-sneak", displayName: "Sombra Vil", type: "ghost", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1 },

    // Dragon
    "draco-meteor": { name: "draco-meteor", displayName: "Cometa Draco", type: "dragon", category: "special", power: 130, accuracy: 90, pp: 5, priority: 0, selfStatChanges: [{ stat: "spa", stages: -2 }] },
    "dragon-claw": { name: "dragon-claw", displayName: "Garra Dragón", type: "dragon", category: "physical", power: 80, accuracy: 100, pp: 15, priority: 0 },
    "dragon-pulse": { name: "dragon-pulse", displayName: "Pulso Dragón", type: "dragon", category: "special", power: 85, accuracy: 100, pp: 10, priority: 0 },
    "dragon-dance": { name: "dragon-dance", displayName: "Danza Dragón", type: "dragon", category: "status", power: 0, accuracy: 100, pp: 20, priority: 0, target: "self", statChanges: [{ stat: "atk", stages: 1 }, { stat: "spe", stages: 1 }] },
    "outrage": { name: "outrage", displayName: "Enfado", type: "dragon", category: "physical", power: 120, accuracy: 100, pp: 10, priority: 0 },

    // Dark
    "dark-pulse": { name: "dark-pulse", displayName: "Pulso Umbrío", type: "dark", category: "special", power: 80, accuracy: 100, pp: 15, priority: 0, secondary: { chance: 20, flinch: true } },
    "crunch": { name: "crunch", displayName: "Triturar", type: "dark", category: "physical", power: 80, accuracy: 100, pp: 15, priority: 0, secondary: { chance: 20, stat: "def", stages: -1 } },
    "sucker-punch": { name: "sucker-punch", displayName: "Golpe Bajo", type: "dark", category: "physical", power: 70, accuracy: 100, pp: 5, priority: 1 },
    "nasty-plot": { name: "nasty-plot", displayName: "Maquinación", type: "dark", category: "status", power: 0, accuracy: 100, pp: 20, priority: 0, target: "self", statChanges: [{ stat: "spa", stages: 2 }] },

    // Steel
    "flash-cannon": { name: "flash-cannon", displayName: "Foco Resplandor", type: "steel", category: "special", power: 80, accuracy: 100, pp: 10, priority: 0, secondary: { chance: 10, stat: "spd", stages: -1 } },
    "iron-head": { name: "iron-head", displayName: "Cabeza de Hierro", type: "steel", category: "physical", power: 80, accuracy: 100, pp: 15, priority: 0, secondary: { chance: 30, flinch: true } },
    "bullet-punch": { name: "bullet-punch", displayName: "Puño Bala", type: "steel", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1 },

    // Fairy
    "moonblast": { name: "moonblast", displayName: "Fuerza Lunar", type: "fairy", category: "special", power: 95, accuracy: 100, pp: 15, priority: 0, secondary: { chance: 30, stat: "spa", stages: -1 } },
    "play-rough": { name: "play-rough", displayName: "Carantoña", type: "fairy", category: "physical", power: 90, accuracy: 90, pp: 10, priority: 0, secondary: { chance: 10, stat: "atk", stages: -1 } },
    "dazzling-gleam": { name: "dazzling-gleam", displayName: "Brillo Mágico", type: "fairy", category: "special", power: 80, accuracy: 100, pp: 10, priority: 0 },

    // Advanced & Competitive Move Additions
    "protect": { name: "protect", displayName: "Protección", type: "normal", category: "status", power: 0, accuracy: 100, pp: 10, priority: 4, target: "self", isProtect: true },
    "detect": { name: "detect", displayName: "Detección", type: "fighting", category: "status", power: 0, accuracy: 100, pp: 5, priority: 4, target: "self", isProtect: true },
    "substitute": { name: "substitute", displayName: "Sustituto", type: "normal", category: "status", power: 0, accuracy: 100, pp: 10, priority: 0, target: "self", isSubstitute: true },
    "stealth-rock": { name: "stealth-rock", displayName: "Trampa Rocas", type: "rock", category: "status", power: 0, accuracy: 100, pp: 20, priority: 0, target: "foeSide", isHazard: true, hazardType: "stealth-rock" },
    "spikes": { name: "spikes", displayName: "Púas", type: "ground", category: "status", power: 0, accuracy: 100, pp: 20, priority: 0, target: "foeSide", isHazard: true, hazardType: "spikes" },
    "toxic-spikes": { name: "toxic-spikes", displayName: "Púas Tóxicas", type: "poison", category: "status", power: 0, accuracy: 100, pp: 20, priority: 0, target: "foeSide", isHazard: true, hazardType: "toxic-spikes" },
    "reflect": { name: "reflect", displayName: "Reflejo", type: "psychic", category: "status", power: 0, accuracy: 100, pp: 20, priority: 0, target: "selfSide", screen: "reflect", duration: 5 },
    "light-screen": { name: "light-screen", displayName: "Pantalla Luz", type: "psychic", category: "status", power: 0, accuracy: 100, pp: 30, priority: 0, target: "selfSide", screen: "lightScreen", duration: 5 },
    "aurora-veil": { name: "aurora-veil", displayName: "Velo Aurora", type: "ice", category: "status", power: 0, accuracy: 100, pp: 20, priority: 0, target: "selfSide", screen: "auroraVeil", duration: 5 },
    "tailwind": { name: "tailwind", displayName: "Viento Afín", type: "flying", category: "status", power: 0, accuracy: 100, pp: 15, priority: 0, target: "selfSide", duration: 4 },
    "trick-room": { name: "trick-room", displayName: "Espacio Raro", type: "psychic", category: "status", power: 0, accuracy: 100, pp: 5, priority: -7, target: "field", duration: 5 },
    "bullet-seed": { name: "bullet-seed", displayName: "Semilladora", type: "grass", category: "physical", power: 25, accuracy: 100, pp: 30, priority: 0, multiHit: [2, 5] },
    "rock-blast": { name: "rock-blast", displayName: "Pedrada", type: "rock", category: "physical", power: 25, accuracy: 90, pp: 10, priority: 0, multiHit: [2, 5] },
    "icicle-spear": { name: "icicle-spear", displayName: "Carámbano", type: "ice", category: "physical", power: 25, accuracy: 100, pp: 30, priority: 0, multiHit: [2, 5] },
    "scale-shot": { name: "scale-shot", displayName: "Ráfaga Escamas", type: "dragon", category: "physical", power: 25, accuracy: 90, pp: 20, priority: 0, multiHit: [2, 5], selfStatChanges: [{ stat: "def", stages: -1 }, { stat: "spe", stages: 1 }] },
    "seismic-toss": { name: "seismic-toss", displayName: "Movimiento Sísmico", type: "fighting", category: "physical", power: 0, fixedDamage: "level", accuracy: 100, pp: 20, priority: 0 },
    "night-shade": { name: "night-shade", displayName: "Tinieblas", type: "ghost", category: "special", power: 0, fixedDamage: "level", accuracy: 100, pp: 15, priority: 0 },
    "tera-blast": { name: "tera-blast", displayName: "Terablast / Teraexplosión", type: "normal", category: "special", power: 80, accuracy: 100, pp: 10, priority: 0, isTeraBlast: true },
    "leech-seed": { name: "leech-seed", displayName: "Drenadoras", type: "grass", category: "status", power: 0, accuracy: 90, pp: 10, priority: 0, volatile: "leech-seed" },
    "whirlwind": { name: "whirlwind", displayName: "Remolino", type: "normal", category: "status", power: 0, accuracy: 100, pp: 20, priority: -6, forcesSwitch: true },
    "roar": { name: "roar", displayName: "Rugido", type: "normal", category: "status", power: 0, accuracy: 100, pp: 20, priority: -6, forcesSwitch: true }
  };

  // Competitive Held Items with sprites and descriptions
  const HELD_ITEMS = {
    "leftovers": {
      name: "leftovers",
      displayName: "Restos",
      description: "Recupera 1/16 de los PS máximos al final de cada turno.",
      icon: getItemSpriteUrl("leftovers"),
      trigger: "turn-end",
      healFraction: 1 / 16
    },
    "life-orb": {
      name: "life-orb",
      displayName: "Vidasfera",
      description: "Aumenta la potencia de los ataques un 30%, pero pierde un 10% de PS al atacar.",
      icon: getItemSpriteUrl("life-orb"),
      trigger: "on-attack",
      damageMultiplier: 1.3,
      recoilFraction: 0.10
    },
    "focus-sash": {
      name: "focus-sash",
      displayName: "Banda Focus",
      description: "Si tiene los PS al máximo, sobrevive a cualquier golpe letal con 1 PS. De un solo uso.",
      icon: getItemSpriteUrl("focus-sash"),
      trigger: "on-lethal",
      consumable: true
    },
    "sitrus-berry": {
      name: "sitrus-berry",
      displayName: "Baya Zidra",
      description: "Restaura el 25% de los PS máximos cuando la salud cae por debajo del 50%. De un solo uso.",
      icon: getItemSpriteUrl("sitrus-berry"),
      trigger: "hp-threshold",
      threshold: 0.5,
      healFraction: 0.25,
      consumable: true
    },
    "lum-berry": {
      name: "lum-berry",
      displayName: "Baya Ziuela",
      description: "Cura inmediatamente cualquier problema de estado primario o confusión. De un solo uso.",
      icon: getItemSpriteUrl("lum-berry"),
      trigger: "on-status",
      consumable: true
    },
    "choice-band": {
      name: "choice-band",
      displayName: "Cinta Elegida",
      description: "Aumenta el Ataque un 50%, pero solo permite usar el primer movimiento seleccionado.",
      icon: getItemSpriteUrl("choice-band"),
      trigger: "stat-boost",
      boostStat: "atk",
      boostMultiplier: 1.5,
      locksMove: true
    },
    "choice-specs": {
      name: "choice-specs",
      displayName: "Gafas Elegidas",
      description: "Aumenta el Ataque Especial un 50%, pero solo permite usar el primer movimiento.",
      icon: getItemSpriteUrl("choice-specs"),
      trigger: "stat-boost",
      boostStat: "spa",
      boostMultiplier: 1.5,
      locksMove: true
    },
    "choice-scarf": {
      name: "choice-scarf",
      displayName: "Pañuelo Elegido",
      description: "Aumenta la Velocidad un 50%, pero solo permite usar el primer movimiento.",
      icon: getItemSpriteUrl("choice-scarf"),
      trigger: "stat-boost",
      boostStat: "spe",
      boostMultiplier: 1.5,
      locksMove: true
    },
    "assault-vest": {
      name: "assault-vest",
      displayName: "Chaleco Asalto",
      description: "Aumenta la Defensa Especial un 50%, pero impide usar movimientos de estado.",
      icon: getItemSpriteUrl("assault-vest"),
      trigger: "stat-boost",
      boostStat: "spd",
      boostMultiplier: 1.5
    },
    "rocky-helmet": {
      name: "rocky-helmet",
      displayName: "Casco Dentado",
      description: "Inflige daño de retroceso al rival si realiza un ataque de contacto físico.",
      icon: getItemSpriteUrl("rocky-helmet"),
      trigger: "on-contact"
    },
    "expert-belt": {
      name: "expert-belt",
      displayName: "Cinta Experto",
      description: "Aumenta un 20% la potencia de los movimientos que resultan supereficaces.",
      icon: getItemSpriteUrl("expert-belt"),
      trigger: "on-attack",
      damageMultiplier: 1.2
    },
    "heavy-duty-boots": {
      name: "heavy-duty-boots",
      displayName: "Botas Gruesas",
      description: "Protege al portador contra los efectos y daños de las trampas del campo.",
      icon: getItemSpriteUrl("heavy-duty-boots")
    },
    "air-balloon": {
      name: "air-balloon",
      displayName: "Globo Helio",
      description: "Hace al portador inmune a movimientos de tipo Tierra hasta recibir un golpe.",
      icon: getItemSpriteUrl("air-balloon")
    },
    "light-ball": {
      name: "light-ball",
      displayName: "Bolaluz",
      description: "Duplica el Ataque y Ataque Especial del portador si es Pikachu o Raichu.",
      icon: getItemSpriteUrl("light-ball"),
      speciesLocked: ["pikachu", "raichu"],
      trigger: "stat-boost"
    },
    // Mega Stones (Gen 6-7 & Custom)
    "charizardite-x": {
      name: "charizardite-x",
      displayName: "Charizardita X",
      description: "Permite a Charizard megaevolucionar a Mega-Charizard X en combate.",
      icon: getItemSpriteUrl("charizardite-x"),
      isMegaStone: true,
      megaSpecies: "charizard",
      megaFormId: "charizard-mega-x"
    },
    "charizardite-y": {
      name: "charizardite-y",
      displayName: "Charizardita Y",
      description: "Permite a Charizard megaevolucionar a Mega-Charizard Y en combate.",
      icon: getItemSpriteUrl("charizardite-y"),
      isMegaStone: true,
      megaSpecies: "charizard",
      megaFormId: "charizard-mega-y"
    },
    "blastoisinite": {
      name: "blastoisinite",
      displayName: "Blastoisita",
      description: "Permite a Blastoise megaevolucionar a Mega-Blastoise en combate.",
      icon: getItemSpriteUrl("blastoisinite"),
      isMegaStone: true,
      megaSpecies: "blastoise",
      megaFormId: "blastoise-mega"
    },
    "venusaurite": {
      name: "venusaurite",
      displayName: "Venusaurita",
      description: "Permite a Venusaur megaevolucionar a Mega-Venusaur en combate.",
      icon: getItemSpriteUrl("venusaurite"),
      isMegaStone: true,
      megaSpecies: "venusaur",
      megaFormId: "venusaur-mega"
    },
    "gengarite": {
      name: "gengarite",
      displayName: "Gengarita",
      description: "Permite a Gengar megaevolucionar a Mega-Gengar en combate.",
      icon: getItemSpriteUrl("gengarite"),
      isMegaStone: true,
      megaSpecies: "gengar",
      megaFormId: "gengar-mega"
    },
    "lucarionite": {
      name: "lucarionite",
      displayName: "Lucarionita",
      description: "Permite a Lucario megaevolucionar a Mega-Lucario en combate.",
      icon: getItemSpriteUrl("lucarionite"),
      isMegaStone: true,
      megaSpecies: "lucario",
      megaFormId: "lucario-mega"
    },
    "garchompite": {
      name: "garchompite",
      displayName: "Garchompita",
      description: "Permite a Garchomp megaevolucionar a Mega-Garchomp en combate.",
      icon: getItemSpriteUrl("garchompite"),
      isMegaStone: true,
      megaSpecies: "garchomp",
      megaFormId: "garchomp-mega"
    },
    "gyaradosite": {
      name: "gyaradosite",
      displayName: "Gyaradosita",
      description: "Permite a Gyarados megaevolucionar a Mega-Gyarados en combate.",
      icon: getItemSpriteUrl("gyaradosite"),
      isMegaStone: true,
      megaSpecies: "gyarados",
      megaFormId: "gyarados-mega"
    },
    "alakazite": {
      name: "alakazite",
      displayName: "Alakazamita",
      description: "Permite a Alakazam megaevolucionar a Mega-Alakazam en combate.",
      icon: getItemSpriteUrl("alakazite"),
      isMegaStone: true,
      megaSpecies: "alakazam",
      megaFormId: "alakazam-mega"
    },
    "salamencite": {
      name: "salamencite",
      displayName: "Salamencita",
      description: "Permite a Salamence megaevolucionar a Mega-Salamence en combate.",
      icon: getItemSpriteUrl("salamencite"),
      isMegaStone: true,
      megaSpecies: "salamence",
      megaFormId: "salamence-mega"
    },
    "tyranitarite": {
      name: "tyranitarite",
      displayName: "Tyranitarita",
      description: "Permite a Tyranitar megaevolucionar a Mega-Tyranitar en combate.",
      icon: getItemSpriteUrl("tyranitarite"),
      isMegaStone: true,
      megaSpecies: "tyranitar",
      megaFormId: "tyranitar-mega"
    },
    "metagrossite": {
      name: "metagrossite",
      displayName: "Metagrossita",
      description: "Permite a Metagross megaevolucionar a Mega-Metagross en combate.",
      icon: getItemSpriteUrl("metagrossite"),
      isMegaStone: true,
      megaSpecies: "metagross",
      megaFormId: "metagross-mega"
    },
    "scizorite": {
      name: "scizorite",
      displayName: "Scizorita",
      description: "Permite a Scizor megaevolucionar a Mega-Scizor en combate.",
      icon: getItemSpriteUrl("scizorite"),
      isMegaStone: true,
      megaSpecies: "scizor",
      megaFormId: "scizor-mega"
    },
    "kangaskhanite": {
      name: "kangaskhanite",
      displayName: "Kangaskhanita",
      description: "Permite a Kangaskhan megaevolucionar a Mega-Kangaskhan en combate.",
      icon: getItemSpriteUrl("kangaskhanite"),
      isMegaStone: true,
      megaSpecies: "kangaskhan",
      megaFormId: "kangaskhan-mega"
    },
    "mewtwonite-x": {
      name: "mewtwonite-x",
      displayName: "Mewtwonita X",
      description: "Permite a Mewtwo megaevolucionar a Mega-Mewtwo X en combate.",
      icon: getItemSpriteUrl("mewtwonite-x"),
      isMegaStone: true,
      megaSpecies: "mewtwo",
      megaFormId: "mewtwo-mega-x"
    },
    "mewtwonite-y": {
      name: "mewtwonite-y",
      displayName: "Mewtwonita Y",
      description: "Permite a Mewtwo megaevolucionar a Mega-Mewtwo Y en combate.",
      icon: getItemSpriteUrl("mewtwonite-y"),
      isMegaStone: true,
      megaSpecies: "mewtwo",
      megaFormId: "mewtwo-mega-y"
    },
    "gardevoirite": {
      name: "gardevoirite",
      displayName: "Gardevoirita",
      description: "Permite a Gardevoir megaevolucionar a Mega-Gardevoir en combate.",
      icon: getItemSpriteUrl("gardevoirite"),
      isMegaStone: true,
      megaSpecies: "gardevoir",
      megaFormId: "gardevoir-mega"
    },
    "swampertite": {
      name: "swampertite",
      displayName: "Swampertita",
      description: "Permite a Swampert megaevolucionar a Mega-Swampert en combate.",
      icon: getItemSpriteUrl("swampertite"),
      isMegaStone: true,
      megaSpecies: "swampert",
      megaFormId: "swampert-mega"
    },
    "sceptilite": {
      name: "sceptilite",
      displayName: "Sceptilita",
      description: "Permite a Sceptile megaevolucionar a Mega-Sceptile en combate.",
      icon: getItemSpriteUrl("sceptilite"),
      isMegaStone: true,
      megaSpecies: "sceptile",
      megaFormId: "sceptile-mega"
    },
    "blazikenite": {
      name: "blazikenite",
      displayName: "Blazikenita",
      description: "Permite a Blaziken megaevolucionar a Mega-Blaziken en combate.",
      icon: getItemSpriteUrl("blazikenite"),
      isMegaStone: true,
      megaSpecies: "blaziken",
      megaFormId: "blaziken-mega"
    }
  };

  // Usable Bag Items with official sprites
  const BAG_ITEMS = {
    "potion": {
      id: "potion",
      name: "Poción",
      category: "medicine",
      icon: getItemSpriteUrl("potion"),
      desc: "Restaura 20 PS de un Pokémon.",
      healAmount: 20
    },
    "super-potion": {
      id: "super-potion",
      name: "Superpoción",
      category: "medicine",
      icon: getItemSpriteUrl("super-potion"),
      desc: "Restaura 60 PS de un Pokémon.",
      healAmount: 60
    },
    "hyper-potion": {
      id: "hyper-potion",
      name: "Hiperpoción",
      category: "medicine",
      icon: getItemSpriteUrl("hyper-potion"),
      desc: "Restaura 120 PS de un Pokémon.",
      healAmount: 120
    },
    "max-potion": {
      id: "max-potion",
      name: "Poción Máxima",
      category: "medicine",
      icon: getItemSpriteUrl("max-potion"),
      desc: "Restaura completamente los PS de un Pokémon.",
      fullHeal: true
    },
    "full-restore": {
      id: "full-restore",
      name: "Restaurar Todo",
      category: "medicine",
      icon: getItemSpriteUrl("full-restore"),
      desc: "Restaura todos los PS y cura cualquier problema de estado.",
      fullHeal: true,
      cureStatus: true
    },
    "full-heal": {
      id: "full-heal",
      name: "Cura Total",
      category: "medicine",
      icon: getItemSpriteUrl("full-heal"),
      desc: "Cura todos los problemas de estado de un Pokémon.",
      cureStatus: true
    },
    "revive": {
      id: "revive",
      name: "Revivir",
      category: "revive",
      icon: getItemSpriteUrl("revive"),
      desc: "Reanima a un Pokémon debilitado con el 50% de sus PS.",
      revivePercent: 0.5
    },
    "max-revive": {
      id: "max-revive",
      name: "Revivir Máximo",
      category: "revive",
      icon: getItemSpriteUrl("max-revive"),
      desc: "Reanima a un Pokémon debilitado restaurando todos sus PS.",
      revivePercent: 1.0
    }
  };

  // Localized ability dictionary (ES/EN)
  const ABILITY_LOCALES = {
    "blaze": "Mar Llamas",
    "torrent": "Torrente",
    "overgrow": "Espesura",
    "cursed-body": "Cuerpo Maldito",
    "rough-skin": "Piel Tosca",
    "inner-focus": "Foco Interno",
    "multiscale": "Compensación",
    "sand-stream": "Chorro Arena",
    "lightning-rod": "Pararrayos",
    "pixilate": "Piel Feérica",
    "thick-fat": "Sebo",
    "protean": "Mutatipo",
    "intimidate": "Intimidación",
    "magic-bounce": "Espejo Mágico",
    "levitate": "Levitación",
    "drizzle": "Llovizna",
    "drought": "Sequía",
    "speed-boost": "Impulso",
    "technician": "Experto",
    "serene-grace": "Dicha",
    "iron-fist": "Puño Férreo",
    "sheer-force": "Potencia Bruta",
    "regenerator": "Regeneración",
    "moxie": "Autoestima",
    "guts": "Agallas"
  };

  function getLocalizedAbility(slug) {
    if (!slug) return "Normal";
    const s = slug.toLowerCase().replace(/_/g, "-");
    const lang = (typeof window !== "undefined" && window.I18n && window.I18n.currentLang) ? window.I18n.currentLang : "es";
    if (typeof window !== "undefined" && window.BattleAbilityNames && window.BattleAbilityNames[s]) {
      const entry = window.BattleAbilityNames[s];
      if (typeof entry === "string") return entry;
      if (entry[lang]) return entry[lang];
      if (lang === "zh-tw" && entry["zh"]) return entry["zh"];
      if (entry["en"]) return entry["en"];
    }
    if (lang === "es" && ABILITY_LOCALES[s]) return ABILITY_LOCALES[s];
    return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  function getLocalizedMove(slug) {
    if (!slug) return "—";
    const s = slug.toLowerCase().replace(/_/g, "-");
    const lang = (typeof window !== "undefined" && window.I18n && window.I18n.currentLang) ? window.I18n.currentLang : "es";
    
    // Check external dictionary first for multilingual support
    if (typeof window !== "undefined" && window.BattleMoveNames && window.BattleMoveNames[s]) {
      const entry = window.BattleMoveNames[s];
      if (typeof entry === "string") return entry;
      if (entry[lang]) return entry[lang];
      if (lang === "zh-tw" && entry["zh"]) return entry["zh"];
      if (entry["en"]) return entry["en"];
    }
    if (lang === "es" && COMMON_MOVES[s]) {
      return COMMON_MOVES[s].displayName;
    }
    if (typeof window !== "undefined" && window.BattleMovesEs && window.BattleMovesEs[s] && lang === "es") {
      return window.BattleMovesEs[s];
    }
    return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  function getLocalizedItem(slug) {
    if (!slug) {
      if (typeof window !== "undefined" && window.I18n && typeof window.I18n.t === "function") {
        return window.I18n.t("battle_sim.item_none_label") || "Sin Objeto";
      }
      return "Sin Objeto";
    }
    const s = slug.toLowerCase().replace(/_/g, "-");
    const lang = (typeof window !== "undefined" && window.I18n && window.I18n.currentLang) ? window.I18n.currentLang : "es";

    if (typeof window !== "undefined" && window.BattleItemNames && window.BattleItemNames[s]) {
      const entry = window.BattleItemNames[s];
      if (typeof entry === "string") return entry;
      if (entry[lang]) return entry[lang];
      if (lang === "zh-tw" && entry["zh"]) return entry["zh"];
      if (entry["en"]) return entry["en"];
    }
    if (lang === "es") {
      if (HELD_ITEMS[s]) return HELD_ITEMS[s].displayName;
      if (BAG_ITEMS[s]) return BAG_ITEMS[s].name;
    }
    return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  // HUGE Roster of 40+ Top Competitive Presets across all 9 Generations
  // This guarantees that the rival never needs to duplicate any Pokémon from the player's team!
  const COMPETITIVE_PRESETS = [
    // Gen 1
    {
      id: 6,
      species: "charizard",
      name: "Charizard",
      types: ["fire", "flying"],
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      ability: "blaze",
      item: "life-orb",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["flamethrower", "air-slash", "dragon-pulse", "roost"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/6.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/6.gif",
    },
    {
      id: 9,
      species: "blastoise",
      name: "Blastoise",
      types: ["water"],
      baseStats: { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 },
      ability: "torrent",
      item: "leftovers",
      nature: "modest",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 4, spa: 252, spd: 0, spe: 0 },
      moves: ["surf", "ice-beam", "flash-cannon", "recover"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/9.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/9.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/9.gif",
    },
    {
      id: 3,
      species: "venusaur",
      name: "Venusaur",
      types: ["grass", "poison"],
      baseStats: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 },
      ability: "overgrow",
      item: "sitrus-berry",
      nature: "calm",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 100, spa: 0, spd: 156, spe: 0 },
      moves: ["giga-drain", "sludge-bomb", "toxic", "energy-ball"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/3.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/3.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/3.gif",
    },
    {
      id: 94,
      species: "gengar",
      name: "Gengar",
      types: ["ghost", "poison"],
      baseStats: { hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110 },
      ability: "cursed-body",
      item: "focus-sash",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["shadow-ball", "sludge-bomb", "thunderbolt", "nasty-plot"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/94.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/94.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/94.gif",
    },
    {
      id: 149,
      species: "dragonite",
      name: "Dragonite",
      types: ["dragon", "flying"],
      baseStats: { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80 },
      ability: "multiscale",
      item: "lum-berry",
      nature: "adamant",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
      moves: ["outrage", "dragon-dance", "extreme-speed", "earthquake"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/149.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/149.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/149.gif",
    },
    {
      id: 130,
      species: "gyarados",
      name: "Gyarados",
      types: ["water", "flying"],
      baseStats: { hp: 95, atk: 125, def: 79, spa: 60, spd: 100, spe: 81 },
      ability: "intimidate",
      item: "life-orb",
      nature: "jolly",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["water-pulse", "crunch", "earthquake", "dragon-dance"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/130.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/130.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/130.gif",
    },
    {
      id: 59,
      species: "arcanine",
      name: "Arcanine",
      types: ["fire"],
      baseStats: { hp: 90, atk: 110, def: 80, spa: 100, spd: 80, spe: 95 },
      ability: "intimidate",
      item: "choice-band",
      nature: "adamant",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["flare-blitz", "extreme-speed", "wild-charge", "close-combat"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/59.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/59.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/59.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/59.gif",
    },
    {
      id: 65,
      species: "alakazam",
      name: "Alakazam",
      types: ["psychic"],
      baseStats: { hp: 55, atk: 50, def: 45, spa: 135, spd: 95, spe: 120 },
      ability: "magic-guard",
      item: "focus-sash",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["psychic", "shadow-ball", "focus-blast", "calm-mind"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/65.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/65.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/65.gif",
    },
    {
      id: 143,
      species: "snorlax",
      name: "Snorlax",
      types: ["normal"],
      baseStats: { hp: 160, atk: 110, def: 65, spa: 65, spd: 110, spe: 30 },
      ability: "thick-fat",
      item: "leftovers",
      nature: "careful",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 4, def: 100, spa: 0, spd: 152, spe: 0 },
      moves: ["body-slam", "earthquake", "crunch", "recover"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/143.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/143.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/143.gif",
    },
    {
      id: 145,
      species: "zapdos",
      name: "Zapdos",
      types: ["electric", "flying"],
      baseStats: { hp: 90, atk: 90, def: 85, spa: 125, spd: 90, spe: 100 },
      ability: "pressure",
      item: "leftovers",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 80, spa: 0, spd: 0, spe: 176 },
      moves: ["thunderbolt", "volt-switch", "roost", "air-slash"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/145.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/145.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/145.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/145.gif",
    },

    // Gen 2
    {
      id: 248,
      species: "tyranitar",
      name: "Tyranitar",
      types: ["rock", "dark"],
      baseStats: { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 },
      ability: "sand-stream",
      item: "choice-band",
      nature: "adamant",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 4, spe: 0 },
      moves: ["stone-edge", "crunch", "earthquake", "iron-head"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/248.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/248.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/248.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/248.gif",
    },
    {
      id: 212,
      species: "scizor",
      name: "Scizor",
      types: ["bug", "steel"],
      baseStats: { hp: 70, atk: 130, def: 100, spa: 55, spd: 80, spe: 65 },
      ability: "technician",
      item: "life-orb",
      nature: "adamant",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
      moves: ["bullet-punch", "u-turn", "close-combat", "swords-dance"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/212.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/212.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/212.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/212.gif",
    },
    {
      id: 196,
      species: "espeon",
      name: "Espeon",
      types: ["psychic"],
      baseStats: { hp: 65, atk: 65, def: 60, spa: 130, spd: 95, spe: 110 },
      ability: "magic-bounce",
      item: "choice-specs",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["psychic", "shadow-ball", "dazzling-gleam", "calm-mind"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/196.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/196.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/196.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/196.gif",
    },
    {
      id: 197,
      species: "umbreon",
      name: "Umbreon",
      types: ["dark"],
      baseStats: { hp: 95, atk: 65, def: 110, spa: 60, spd: 130, spe: 65 },
      ability: "synchronize",
      item: "leftovers",
      nature: "calm",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
      moves: ["dark-pulse", "toxic", "recover", "body-slam"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/197.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/197.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/197.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/197.gif",
    },

    // Gen 3
    {
      id: 373,
      species: "salamence",
      name: "Salamence",
      types: ["dragon", "flying"],
      baseStats: { hp: 95, atk: 135, def: 80, spa: 110, spd: 80, spe: 100 },
      ability: "intimidate",
      item: "choice-scarf",
      nature: "naive",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["outrage", "earthquake", "fire-blast", "dragon-claw"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/373.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/373.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/373.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/373.gif",
    },
    {
      id: 376,
      species: "metagross",
      name: "Metagross",
      types: ["steel", "psychic"],
      baseStats: { hp: 80, atk: 135, def: 130, spa: 95, spd: 90, spe: 70 },
      ability: "clear-body",
      item: "choice-band",
      nature: "adamant",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
      moves: ["iron-head", "bullet-punch", "zen-headbutt", "earthquake"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/376.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/376.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/376.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/376.gif",
    },
    {
      id: 260,
      species: "swampert",
      name: "Swampert",
      types: ["water", "ground"],
      baseStats: { hp: 100, atk: 110, def: 90, spa: 85, spd: 90, spe: 60 },
      ability: "torrent",
      item: "leftovers",
      nature: "relaxed",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
      moves: ["earthquake", "scald", "ice-beam", "toxic"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/260.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/260.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/260.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/260.gif",
    },
    {
      id: 257,
      species: "blaziken",
      name: "Blaziken",
      types: ["fire", "fighting"],
      baseStats: { hp: 80, atk: 120, def: 70, spa: 110, spd: 70, spe: 80 },
      ability: "speed-boost",
      item: "life-orb",
      nature: "jolly",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["flare-blitz", "close-combat", "swords-dance", "stone-edge"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/257.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/257.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/257.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/257.gif",
    },
    {
      id: 282,
      species: "gardevoir",
      name: "Gardevoir",
      types: ["psychic", "fairy"],
      baseStats: { hp: 68, atk: 65, def: 65, spa: 125, spd: 115, spe: 80 },
      ability: "trace",
      item: "choice-specs",
      nature: "modest",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["moonblast", "psychic", "shadow-ball", "calm-mind"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/282.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/282.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/282.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/282.gif",
    },
    {
      id: 350,
      species: "milotic",
      name: "Milotic",
      types: ["water"],
      baseStats: { hp: 95, atk: 60, def: 79, spa: 100, spd: 125, spe: 81 },
      ability: "marvel-scale",
      item: "leftovers",
      nature: "bold",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 252, spa: 4, spd: 0, spe: 0 },
      moves: ["scald", "ice-beam", "recover", "toxic"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/350.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/350.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/350.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/350.gif",
    },

    // Gen 4
    {
      id: 445,
      species: "garchomp",
      name: "Garchomp",
      types: ["dragon", "ground"],
      baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      ability: "rough-skin",
      item: "choice-band",
      nature: "jolly",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["earthquake", "dragon-claw", "stone-edge", "poison-jab"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/445.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/445.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/445.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/445.gif",
    },
    {
      id: 448,
      species: "lucario",
      name: "Lucario",
      types: ["fighting", "steel"],
      baseStats: { hp: 70, atk: 110, def: 70, spa: 115, spd: 70, spe: 90 },
      ability: "inner-focus",
      item: "life-orb",
      nature: "adamant",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["close-combat", "bullet-punch", "extreme-speed", "swords-dance"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/448.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/448.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/448.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/448.gif",
    },
    {
      id: 468,
      species: "togekiss",
      name: "Togekiss",
      types: ["fairy", "flying"],
      baseStats: { hp: 85, atk: 50, def: 95, spa: 120, spd: 115, spe: 80 },
      ability: "serene-grace",
      item: "leftovers",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 0, spe: 252 },
      moves: ["air-slash", "dazzling-gleam", "roost", "nasty-plot"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/468.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/468.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/468.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/468.gif",
    },
    {
      id: 461,
      species: "weavile",
      name: "Weavile",
      types: ["dark", "ice"],
      baseStats: { hp: 70, atk: 120, def: 65, spa: 45, spd: 85, spe: 125 },
      ability: "pressure",
      item: "choice-band",
      nature: "jolly",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["ice-shard", "crunch", "poison-jab", "swords-dance"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/461.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/461.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/461.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/461.gif",
    },

    // Gen 5
    {
      id: 637,
      species: "volcarona",
      name: "Volcarona",
      types: ["bug", "fire"],
      baseStats: { hp: 85, atk: 60, def: 65, spa: 135, spd: 105, spe: 100 },
      ability: "flame-body",
      item: "lum-berry",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["fire-blast", "bug-buzz", "giga-drain", "roost"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/637.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/637.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/637.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/637.gif",
    },
    {
      id: 530,
      species: "excadrill",
      name: "Excadrill",
      types: ["ground", "steel"],
      baseStats: { hp: 110, atk: 135, def: 60, spa: 50, spd: 65, spe: 88 },
      ability: "sand-rush",
      item: "life-orb",
      nature: "jolly",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["earthquake", "iron-head", "rock-slide", "swords-dance"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/530.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/530.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/530.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/530.gif",
    },
    {
      id: 635,
      species: "hydreigon",
      name: "Hydreigon",
      types: ["dark", "dragon"],
      baseStats: { hp: 92, atk: 105, def: 90, spa: 125, spd: 90, spe: 98 },
      ability: "levitate",
      item: "choice-specs",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["draco-meteor", "dark-pulse", "fire-blast", "flash-cannon"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/635.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/635.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/635.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/635.gif",
    },
    {
      id: 609,
      species: "chandelure",
      name: "Chandelure",
      types: ["ghost", "fire"],
      baseStats: { hp: 60, atk: 55, def: 90, spa: 145, spd: 90, spe: 80 },
      ability: "flash-fire",
      item: "choice-scarf",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["shadow-ball", "flamethrower", "energy-ball", "will-o-wisp"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/609.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/609.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/609.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/609.gif",
    },

    // Gen 6
    {
      id: 658,
      species: "greninja",
      name: "Greninja",
      types: ["water", "dark"],
      baseStats: { hp: 72, atk: 95, def: 67, spa: 103, spd: 71, spe: 122 },
      ability: "protean",
      item: "life-orb",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["hydro-pump", "dark-pulse", "ice-beam", "u-turn"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/658.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/658.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/658.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/658.gif",
    },
    {
      id: 700,
      species: "sylveon",
      name: "Sylveon",
      types: ["fairy"],
      baseStats: { hp: 95, atk: 65, def: 65, spa: 110, spd: 130, spe: 60 },
      ability: "pixilate",
      item: "leftovers",
      nature: "modest",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 100, spa: 156, spd: 0, spe: 0 },
      moves: ["hyper-voice", "moonblast", "calm-mind", "shadow-ball"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/700.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/700.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/700.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/700.gif",
    },
    {
      id: 663,
      species: "talonflame",
      name: "Talonflame",
      types: ["fire", "flying"],
      baseStats: { hp: 78, atk: 81, def: 71, spa: 74, spd: 69, spe: 126 },
      ability: "gale-wings",
      item: "life-orb",
      nature: "jolly",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["brave-bird", "flare-blitz", "roost", "u-turn"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/663.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/663.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/663.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/663.gif",
    },
    {
      id: 706,
      species: "goodra",
      name: "Goodra",
      types: ["dragon"],
      baseStats: { hp: 90, atk: 100, def: 70, spa: 110, spd: 150, spe: 80 },
      ability: "hydration",
      item: "leftovers",
      nature: "calm",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
      moves: ["draco-meteor", "sludge-bomb", "thunderbolt", "recover"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/706.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/706.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/706.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/706.gif",
    },

    // Gen 7
    {
      id: 778,
      species: "mimikyu",
      name: "Mimikyu",
      types: ["ghost", "fairy"],
      baseStats: { hp: 55, atk: 90, def: 80, spa: 50, spd: 105, spe: 96 },
      ability: "disguise",
      item: "life-orb",
      nature: "jolly",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["play-rough", "shadow-claw", "shadow-sneak", "swords-dance"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/778.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/778.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/778.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/778.gif",
    },
    {
      id: 748,
      species: "toxapex",
      name: "Toxapex",
      types: ["poison", "water"],
      baseStats: { hp: 50, atk: 63, def: 152, spa: 53, spd: 142, spe: 35 },
      ability: "regenerator",
      item: "leftovers",
      nature: "bold",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
      moves: ["scald", "toxic", "recover", "sludge-bomb"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/748.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/748.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/748.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/748.gif",
    },

    // Gen 8
    {
      id: 887,
      species: "dragapult",
      name: "Dragapult",
      types: ["dragon", "ghost"],
      baseStats: { hp: 88, atk: 120, def: 75, spa: 100, spd: 75, spe: 142 },
      ability: "infiltrator",
      item: "choice-specs",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["shadow-ball", "draco-meteor", "flamethrower", "u-turn"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/887.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/887.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/887.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/887.gif",
    },
    {
      id: 823,
      species: "corviknight",
      name: "Corviknight",
      types: ["flying", "steel"],
      baseStats: { hp: 98, atk: 87, def: 105, spa: 53, spd: 85, spe: 67 },
      ability: "mirror-armor",
      item: "leftovers",
      nature: "impish",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
      moves: ["brave-bird", "iron-head", "roost", "body-slam"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/823.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/823.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/823.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/823.gif",
    },
    {
      id: 815,
      species: "cinderace",
      name: "Cinderace",
      types: ["fire"],
      baseStats: { hp: 80, atk: 116, def: 75, spa: 65, spd: 75, spe: 119 },
      ability: "libero",
      item: "life-orb",
      nature: "jolly",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["flare-blitz", "high-jump-kick", "u-turn", "sucker-punch"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/815.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/815.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/815.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/815.gif",
    },

    // Gen 9
    {
      id: 1000,
      species: "gholdengo",
      name: "Gholdengo",
      types: ["steel", "ghost"],
      baseStats: { hp: 87, atk: 60, def: 95, spa: 133, spd: 91, spe: 84 },
      ability: "good-as-gold",
      item: "choice-specs",
      nature: "timid",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ["flash-cannon", "shadow-ball", "nasty-plot", "recover"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1000.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1000.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/1000.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/1000.gif",
    },
    {
      id: 983,
      species: "kingambit",
      name: "Kingambit",
      types: ["dark", "steel"],
      baseStats: { hp: 100, atk: 135, def: 120, spa: 60, spd: 85, spe: 50 },
      ability: "supreme-overlord",
      item: "leftovers",
      nature: "adamant",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
      moves: ["sucker-punch", "iron-head", "swords-dance", "crunch"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/983.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/983.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/983.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/983.gif",
    },
    {
      id: 908,
      species: "meowscarada",
      name: "Meowscarada",
      types: ["grass", "dark"],
      baseStats: { hp: 76, atk: 110, def: 70, spa: 81, spd: 70, spe: 123 },
      ability: "protean",
      item: "choice-band",
      nature: "jolly",
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ["flower-trick", "knock-off", "u-turn", "play-rough"],
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/908.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/908.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/908.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/908.gif",
    }
  ];

  // =========================================================================
  // 1. FORMAT & MECHANICS RULE CONFIGURATION
  // =========================================================================
  const BATTLE_FORMATS = {
    "gen9": {
      id: "gen9",
      name: "Gen IX Estándar (SV)",
      description: "Reglas oficiales de Paldea. Teracristalización permitida (1 por combate). Sin Megaevolución ni Dinamax.",
      allowMega: false,
      allowDynamax: false,
      allowGigantamax: false,
      allowTerastal: true,
      isCustom: false
    },
    "gen8": {
      id: "gen8",
      name: "Gen VIII Galar (SwSh)",
      description: "Reglas oficiales de Galar. Dinamax y Gigamax permitidos (1 por combate, duración 3 turnos). Sin Megaevolución ni Teracristalización.",
      allowMega: false,
      allowDynamax: true,
      allowGigantamax: true,
      allowTerastal: false,
      isCustom: false
    },
    "gen7": {
      id: "gen7",
      name: "Gen VII Alola (USUM)",
      description: "Reglas oficiales de Alola. Megaevolución permitida con Megapiedra (1 por combate, orden dinámico de velocidad). Sin Dinamax ni Teracristalización.",
      allowMega: true,
      allowDynamax: false,
      allowGigantamax: false,
      allowTerastal: false,
      isCustom: false
    },
    "gen6": {
      id: "gen6",
      name: "Gen VI Kalos / Hoenn (ORAS)",
      description: "Reglas oficiales de Kalos y Hoenn. Megaevolución permitida con Megapiedra. Sin Dinamax ni Teracristalización.",
      allowMega: true,
      allowDynamax: false,
      allowGigantamax: false,
      allowTerastal: false,
      isCustom: false
    },
    "national_dex": {
      id: "national_dex",
      name: "Formato Personalizado (National Dex - Libre)",
      description: "Formato sin restricciones de generación: Teracristalización, Megaevolución y Dinamax/Gigamax coexisten (máximo 1 de cada mecánica por bando).",
      allowMega: true,
      allowDynamax: true,
      allowGigantamax: true,
      allowTerastal: true,
      isCustom: true
    }
  };

  function getBattleRules(formatId = "national_dex") {
    return {
      id: "national_dex",
      name: "Formato Libre (Todas las Mecánicas)",
      description: "Formato sin restricciones: Megaevolución, Dinamax/Gigamax y Teracristalización totalmente habilitados.",
      allowMega: true,
      allowDynamax: true,
      allowGigantamax: true,
      allowTerastal: true,
      isCustom: true
    };
  }

  // =========================================================================
  // 2. MEGA EVOLUTION REGISTRY & DATA
  // =========================================================================
  const MEGA_EVOLUTIONS = {
    "charizard-mega-x": {
      id: "charizard-mega-x",
      species: "charizard",
      name: "Mega-Charizard X",
      requiredItem: "charizardite-x",
      types: ["fire", "dragon"],
      baseStats: { hp: 78, atk: 130, def: 111, spa: 130, spd: 85, spe: 100 },
      ability: "tough-claws",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10034.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10034.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10034.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10034.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10034.png"
    },
    "charizard-mega-y": {
      id: "charizard-mega-y",
      species: "charizard",
      name: "Mega-Charizard Y",
      requiredItem: "charizardite-y",
      types: ["fire", "flying"],
      baseStats: { hp: 78, atk: 104, def: 78, spa: 159, spd: 115, spe: 100 },
      ability: "drought",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10035.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10035.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10035.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10035.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10035.png"
    },
    "blastoise-mega": {
      id: "blastoise-mega",
      species: "blastoise",
      name: "Mega-Blastoise",
      requiredItem: "blastoisinite",
      types: ["water"],
      baseStats: { hp: 79, atk: 103, def: 120, spa: 135, spd: 115, spe: 78 },
      ability: "mega-launcher",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10036.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10036.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10036.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10036.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10036.png"
    },
    "venusaur-mega": {
      id: "venusaur-mega",
      species: "venusaur",
      name: "Mega-Venusaur",
      requiredItem: "venusaurite",
      types: ["grass", "poison"],
      baseStats: { hp: 80, atk: 100, def: 123, spa: 122, spd: 120, spe: 80 },
      ability: "thick-fat",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10033.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10033.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10033.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10033.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10033.png"
    },
    "gengar-mega": {
      id: "gengar-mega",
      species: "gengar",
      name: "Mega-Gengar",
      requiredItem: "gengarite",
      types: ["ghost", "poison"],
      baseStats: { hp: 60, atk: 65, def: 80, spa: 170, spd: 95, spe: 130 },
      ability: "shadow-tag",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10038.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10038.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10038.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10038.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10038.png"
    },
    "lucario-mega": {
      id: "lucario-mega",
      species: "lucario",
      name: "Mega-Lucario",
      requiredItem: "lucarionite",
      types: ["fighting", "steel"],
      baseStats: { hp: 70, atk: 145, def: 88, spa: 140, spd: 70, spe: 112 },
      ability: "adaptability",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10059.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10059.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10059.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10059.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10059.png"
    },
    "garchomp-mega": {
      id: "garchomp-mega",
      species: "garchomp",
      name: "Mega-Garchomp",
      requiredItem: "garchompite",
      types: ["dragon", "ground"],
      baseStats: { hp: 108, atk: 170, def: 115, spa: 120, spd: 95, spe: 92 },
      ability: "sand-force",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10058.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10058.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10058.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10058.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10058.png"
    },
    "gyarados-mega": {
      id: "gyarados-mega",
      species: "gyarados",
      name: "Mega-Gyarados",
      requiredItem: "gyaradosite",
      types: ["water", "dark"],
      baseStats: { hp: 95, atk: 155, def: 109, spa: 70, spd: 130, spe: 81 },
      ability: "mold-breaker",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10041.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10041.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10041.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10041.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10041.png"
    },
    "alakazam-mega": {
      id: "alakazam-mega",
      species: "alakazam",
      name: "Mega-Alakazam",
      requiredItem: "alakazite",
      types: ["psychic"],
      baseStats: { hp: 55, atk: 50, def: 65, spa: 175, spd: 105, spe: 150 },
      ability: "trace",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10037.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10037.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10037.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10037.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10037.png"
    },
    "salamence-mega": {
      id: "salamence-mega",
      species: "salamence",
      name: "Mega-Salamence",
      requiredItem: "salamencite",
      types: ["dragon", "flying"],
      baseStats: { hp: 95, atk: 145, def: 130, spa: 120, spd: 90, spe: 120 },
      ability: "aerilate",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10089.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10089.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10089.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10089.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10089.png"
    },
    "tyranitar-mega": {
      id: "tyranitar-mega",
      species: "tyranitar",
      name: "Mega-Tyranitar",
      requiredItem: "tyranitarite",
      types: ["rock", "dark"],
      baseStats: { hp: 100, atk: 164, def: 150, spa: 95, spd: 120, spe: 71 },
      ability: "sand-stream",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10049.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10049.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10049.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10049.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10049.png"
    },
    "metagross-mega": {
      id: "metagross-mega",
      species: "metagross",
      name: "Mega-Metagross",
      requiredItem: "metagrossite",
      types: ["steel", "psychic"],
      baseStats: { hp: 80, atk: 145, def: 150, spa: 105, spd: 110, spe: 110 },
      ability: "tough-claws",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10076.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10076.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10076.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10076.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10076.png"
    },
    "scizor-mega": {
      id: "scizor-mega",
      species: "scizor",
      name: "Mega-Scizor",
      requiredItem: "scizorite",
      types: ["bug", "steel"],
      baseStats: { hp: 70, atk: 150, def: 140, spa: 65, spd: 100, spe: 75 },
      ability: "technician",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10046.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10046.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10046.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10046.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10046.png"
    },
    "kangaskhan-mega": {
      id: "kangaskhan-mega",
      species: "kangaskhan",
      name: "Mega-Kangaskhan",
      requiredItem: "kangaskhanite",
      types: ["normal"],
      baseStats: { hp: 105, atk: 125, def: 100, spa: 60, spd: 100, spe: 100 },
      ability: "parental-bond",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10039.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10039.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10039.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10039.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10039.png"
    },
    "mewtwo-mega-x": {
      id: "mewtwo-mega-x",
      species: "mewtwo",
      name: "Mega-Mewtwo X",
      requiredItem: "mewtwonite-x",
      types: ["psychic", "fighting"],
      baseStats: { hp: 106, atk: 190, def: 100, spa: 154, spd: 100, spe: 130 },
      ability: "steadfast",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10043.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10043.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10043.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10043.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10043.png"
    },
    "mewtwo-mega-y": {
      id: "mewtwo-mega-y",
      species: "mewtwo",
      name: "Mega-Mewtwo Y",
      requiredItem: "mewtwonite-y",
      types: ["psychic"],
      baseStats: { hp: 106, atk: 150, def: 70, spa: 194, spd: 120, spe: 140 },
      ability: "insomnia",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10044.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10044.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10044.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10044.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10044.png"
    },
    "gardevoir-mega": {
      id: "gardevoir-mega",
      species: "gardevoir",
      name: "Mega-Gardevoir",
      requiredItem: "gardevoirite",
      types: ["psychic", "fairy"],
      baseStats: { hp: 68, atk: 85, def: 65, spa: 165, spd: 135, spe: 100 },
      ability: "pixilate",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10051.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10051.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10051.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10051.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10051.png"
    },
    "swampert-mega": {
      id: "swampert-mega",
      species: "swampert",
      name: "Mega-Swampert",
      requiredItem: "swampertite",
      types: ["water", "ground"],
      baseStats: { hp: 100, atk: 150, def: 110, spa: 95, spd: 110, spe: 70 },
      ability: "swift-swim",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10064.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10064.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10064.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10064.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10064.png"
    },
    "sceptile-mega": {
      id: "sceptile-mega",
      species: "sceptile",
      name: "Mega-Sceptile",
      requiredItem: "sceptilite",
      types: ["grass", "dragon"],
      baseStats: { hp: 70, atk: 110, def: 75, spa: 145, spd: 85, spe: 145 },
      ability: "lightning-rod",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10065.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10065.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10065.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10065.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10065.png"
    },
    "blaziken-mega": {
      id: "blaziken-mega",
      species: "blaziken",
      name: "Mega-Blaziken",
      requiredItem: "blazikenite",
      types: ["fire", "fighting"],
      baseStats: { hp: 80, atk: 160, def: 80, spa: 130, spd: 80, spe: 100 },
      ability: "speed-boost",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10050.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10050.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10050.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10050.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10050.png"
    }
  };

  function canPokemonMegaEvolve(pokemon, formatRules = {}) {
    if (!pokemon || pokemon.isMega || pokemon.isFainted || pokemon.isDynamax) return false;
    const rules = typeof formatRules === "string" ? getBattleRules(formatRules) : (formatRules || {});
    if (rules.allowMega === false) return false;

    const species = (pokemon.species || pokemon.name || "").toLowerCase();
    const item = (pokemon.item || "").toLowerCase();

    for (const megaKey in MEGA_EVOLUTIONS) {
      const mega = MEGA_EVOLUTIONS[megaKey];
      if (mega.species === species && mega.requiredItem === item) {
        return true;
      }
    }
    // Special Rayquaza check: knows dragon-ascent and has no Z-Crystal
    if (species === "rayquaza" && Array.isArray(pokemon.moves)) {
      if (pokemon.moves.some(m => (m && (m.name === "dragon-ascent" || m === "dragon-ascent")))) {
        return true;
      }
    }
    return false;
  }

  function getMegaEvolutionData(pokemon) {
    if (!pokemon) return null;
    const species = (pokemon.species || pokemon.name || "").toLowerCase();
    const item = (pokemon.item || "").toLowerCase();

    for (const megaKey in MEGA_EVOLUTIONS) {
      const mega = MEGA_EVOLUTIONS[megaKey];
      if (mega.species === species && mega.requiredItem === item) {
        return mega;
      }
    }
    return null;
  }

  // =========================================================================
  // 3. DYNAMAX / MAX MOVES DATABASE
  // =========================================================================
  const MAX_MOVES = {
    normal: {
      name: "max-strike",
      displayName: "Maxiatake",
      type: "normal",
      category: "physical",
      effectDesc: "Reduce la Velocidad del rival en 1 nivel.",
      secondary: { stat: "spe", stages: -1, chance: 100 }
    },
    fire: {
      name: "max-flare",
      displayName: "Maxiignición",
      type: "fire",
      category: "special",
      effectDesc: "Activa el clima Día Soleado durante 5 turnos.",
      weather: "sun"
    },
    water: {
      name: "max-geyser",
      displayName: "Maxichorro",
      type: "water",
      category: "special",
      effectDesc: "Activa el clima Lluvia durante 5 turnos.",
      weather: "rain"
    },
    electric: {
      name: "max-lightning",
      displayName: "Maxitormenta",
      type: "electric",
      category: "special",
      effectDesc: "Activa Campo Eléctrico durante 5 turnos.",
      terrain: "electric"
    },
    grass: {
      name: "max-overgrowth",
      displayName: "Maxiflora",
      type: "grass",
      category: "special",
      effectDesc: "Activa Campo de Hierba durante 5 turnos.",
      terrain: "grassy"
    },
    ice: {
      name: "max-hailstorm",
      displayName: "Maxihelada",
      type: "ice",
      category: "special",
      effectDesc: "Activa Tormenta de Nieve / Granizo durante 5 turnos.",
      weather: "hail"
    },
    fighting: {
      name: "max-knuckle",
      displayName: "Maxipuño",
      type: "fighting",
      category: "physical",
      effectDesc: "Aumenta el Ataque del usuario en 1 nivel.",
      selfStatChanges: [{ stat: "atk", stages: 1 }]
    },
    poison: {
      name: "max-ooze",
      displayName: "Maxiácido",
      type: "poison",
      category: "special",
      effectDesc: "Aumenta el Ataque Especial del usuario en 1 nivel.",
      selfStatChanges: [{ stat: "spa", stages: 1 }]
    },
    ground: {
      name: "max-quake",
      displayName: "Maxitemblor",
      type: "ground",
      category: "physical",
      effectDesc: "Aumenta la Defensa Especial del usuario en 1 nivel.",
      selfStatChanges: [{ stat: "spd", stages: 1 }]
    },
    flying: {
      name: "max-airstream",
      displayName: "Maxiciclón",
      type: "flying",
      category: "physical",
      effectDesc: "Aumenta la Velocidad del usuario en 1 nivel.",
      selfStatChanges: [{ stat: "spe", stages: 1 }]
    },
    psychic: {
      name: "max-mindstorm",
      displayName: "Maxionda",
      type: "psychic",
      category: "special",
      effectDesc: "Activa Campo Psíquico durante 5 turnos.",
      terrain: "psychic"
    },
    bug: {
      name: "max-flutterby",
      displayName: "Maxinsecto",
      type: "bug",
      category: "physical",
      effectDesc: "Reduce el Ataque Especial del rival en 1 nivel.",
      secondary: { stat: "spa", stages: -1, chance: 100 }
    },
    rock: {
      name: "max-rockfall",
      displayName: "Maxilito",
      type: "rock",
      category: "physical",
      effectDesc: "Activa Tormenta de Arena durante 5 turnos.",
      weather: "sandstorm"
    },
    ghost: {
      name: "max-phantasm",
      displayName: "Maxiespectro",
      type: "ghost",
      category: "physical",
      effectDesc: "Reduce la Defensa física del rival en 1 nivel.",
      secondary: { stat: "def", stages: -1, chance: 100 }
    },
    dragon: {
      name: "max-wyrmwind",
      displayName: "Maxidraco",
      type: "dragon",
      category: "special",
      effectDesc: "Reduce el Ataque físico del rival en 1 nivel.",
      secondary: { stat: "atk", stages: -1, chance: 100 }
    },
    dark: {
      name: "max-darkness",
      displayName: "Maxisombra",
      type: "dark",
      category: "physical",
      effectDesc: "Reduce la Defensa Especial del rival en 1 nivel.",
      secondary: { stat: "spd", stages: -1, chance: 100 }
    },
    steel: {
      name: "max-steelspike",
      displayName: "Maximetal",
      type: "steel",
      category: "physical",
      effectDesc: "Aumenta la Defensa física del usuario en 1 nivel.",
      selfStatChanges: [{ stat: "def", stages: 1 }]
    },
    fairy: {
      name: "max-starfall",
      displayName: "Maxiestela",
      type: "fairy",
      category: "special",
      effectDesc: "Activa Campo de Niebla durante 5 turnos.",
      terrain: "misty"
    },
    status: {
      name: "max-guard",
      displayName: "Maxibarrera",
      type: "normal",
      category: "status",
      power: 0,
      priority: 4,
      accuracy: 100,
      isMaxGuard: true,
      isMaxMove: true,
      effectDesc: "Protección absoluta contra todo ataque, incluyendo movimientos Dinamax."
    }
  };

  function calculateMaxMovePower(baseMove) {
    if (!baseMove || baseMove.category === "status" || !baseMove.power) return 0;
    const bp = baseMove.power;
    const isFightOrPoison = baseMove.type === "fighting" || baseMove.type === "poison";

    if (isFightOrPoison) {
      if (bp <= 40) return 70;
      if (bp <= 50) return 75;
      if (bp <= 60) return 80;
      if (bp <= 70) return 85;
      if (bp <= 100) return 90;
      if (bp <= 140) return 95;
      return 100;
    }

    if (bp <= 40) return 90;
    if (bp <= 50) return 100;
    if (bp <= 60) return 110;
    if (bp <= 70) return 120;
    if (bp <= 100) return 130;
    if (bp <= 140) return 140;
    return 150;
  }

  // =========================================================================
  // 4. GIGANTAMAX REGISTRY & EXCLUSIVE G-MAX MOVES
  // =========================================================================
  const GIGANTAMAX_SPECIES = {
    charizard: {
      species: "charizard",
      gmaxName: "Charizard Gigamax",
      triggerType: "fire",
      gmaxMove: "g-max-wildfire",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10196.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10196.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10196.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10196.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10196.png"
    },
    blastoise: {
      species: "blastoise",
      gmaxName: "Blastoise Gigamax",
      triggerType: "water",
      gmaxMove: "g-max-cannonade",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10197.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10197.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10197.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10197.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10197.png"
    },
    venusaur: {
      species: "venusaur",
      gmaxName: "Venusaur Gigamax",
      triggerType: "grass",
      gmaxMove: "g-max-vine-lash",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10198.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10198.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10198.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10198.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10198.png"
    },
    pikachu: {
      species: "pikachu",
      gmaxName: "Pikachu Gigamax",
      triggerType: "electric",
      gmaxMove: "g-max-volt-crash",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10199.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10199.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10199.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10199.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10199.png"
    },
    gengar: {
      species: "gengar",
      gmaxName: "Gengar Gigamax",
      triggerType: "ghost",
      gmaxMove: "g-max-terror",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10203.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10203.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10203.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10203.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10203.png"
    },
    snorlax: {
      species: "snorlax",
      gmaxName: "Snorlax Gigamax",
      triggerType: "normal",
      gmaxMove: "g-max-replenish",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10206.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10206.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10206.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10206.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10206.png"
    },
    lapras: {
      species: "lapras",
      gmaxName: "Lapras Gigamax",
      triggerType: "ice",
      gmaxMove: "g-max-resonance",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10204.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10204.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10204.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10204.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10204.png"
    },
    cinderace: {
      species: "cinderace",
      gmaxName: "Cinderace Gigamax",
      triggerType: "fire",
      gmaxMove: "g-max-fireball",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10220.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10220.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10220.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10220.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10220.png"
    },
    rillaboom: {
      species: "rillaboom",
      gmaxName: "Rillaboom Gigamax",
      triggerType: "grass",
      gmaxMove: "g-max-drum-solo",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10219.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10219.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10219.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10219.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10219.png"
    },
    inteleon: {
      species: "inteleon",
      gmaxName: "Inteleon Gigamax",
      triggerType: "water",
      gmaxMove: "g-max-hydrosnipe",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10221.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10221.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10221.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10221.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10221.png"
    },
    corviknight: {
      species: "corviknight",
      gmaxName: "Corviknight Gigamax",
      triggerType: "flying",
      gmaxMove: "g-max-wind-rage",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10212.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10212.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10212.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10212.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10212.png"
    },
    machamp: {
      species: "machamp",
      gmaxName: "Machamp Gigamax",
      triggerType: "fighting",
      gmaxMove: "g-max-chi-strike",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10202.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10202.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10202.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10202.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10202.png"
    },
    alcremie: {
      species: "alcremie",
      gmaxName: "Alcremie Gigamax",
      triggerType: "fairy",
      gmaxMove: "g-max-finale",
      spriteFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10217.png",
        showdownFront: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10217.gif",
      spriteBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10217.png",
        showdownBack: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/10217.gif",
      artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10217.png"
    }
  };

  const G_MAX_MOVES = {
    "g-max-wildfire": {
      name: "g-max-wildfire",
      displayName: "Gigallamarada",
      type: "fire",
      category: "special",
      power: 140,
      effectDesc: "Daña al rival y causa daño de fuego residual (1/6 PS max) durante 4 turnos a Pokémon que no sean de tipo Fuego.",
      gmaxResidual: { type: "fire", turns: 4, fraction: 1 / 6 }
    },
    "g-max-cannonade": {
      name: "g-max-cannonade",
      displayName: "Gigacañonazo",
      type: "water",
      category: "special",
      power: 140,
      effectDesc: "Daña al rival y crea un torbellino de agua residual (1/6 PS max) durante 4 turnos a Pokémon que no sean de tipo Agua.",
      gmaxResidual: { type: "water", turns: 4, fraction: 1 / 6 }
    },
    "g-max-vine-lash": {
      name: "g-max-vine-lash",
      displayName: "Gigalatigazo",
      type: "grass",
      category: "special",
      power: 140,
      effectDesc: "Daña al rival y atrapa con lianas de daño residual (1/6 PS max) durante 4 turnos a Pokémon que no sean de tipo Planta.",
      gmaxResidual: { type: "grass", turns: 4, fraction: 1 / 6 }
    },
    "g-max-volt-crash": {
      name: "g-max-volt-crash",
      displayName: "Gigatronada",
      type: "electric",
      category: "special",
      power: 130,
      effectDesc: "Daña e inflige Parálisis garantizada (100%) al rival.",
      secondary: { status: "par", chance: 100 }
    },
    "g-max-terror": {
      name: "g-max-terror",
      displayName: "Gigaaparición",
      type: "ghost",
      category: "special",
      power: 130,
      effectDesc: "Daña al rival y le impide cambiar o huir del combate.",
      trapTarget: true
    },
    "g-max-replenish": {
      name: "g-max-replenish",
      displayName: "Gigarreciclaje",
      type: "normal",
      category: "physical",
      power: 130,
      effectDesc: "Daña al rival con 50% de probabilidad de reciclar una baya consumida.",
      recycleBerry: 50
    },
    "g-max-resonance": {
      name: "g-max-resonance",
      displayName: "Gigamelodía",
      type: "ice",
      category: "special",
      power: 130,
      effectDesc: "Daña al rival y activa Velo Aurora (reduce el daño recibido a la mitad durante 5 turnos).",
      auroraVeil: 5
    },
    "g-max-fireball": {
      name: "g-max-fireball",
      displayName: "Gigaesfera Ígnea",
      type: "fire",
      category: "physical",
      power: 160,
      fixedPower: true,
      effectDesc: "Potencia colosal de 160 que ignora por completo la habilidad defensiva del objetivo.",
      ignoreAbilities: true
    },
    "g-max-drum-solo": {
      name: "g-max-drum-solo",
      displayName: "Gigapercusión",
      type: "grass",
      category: "physical",
      power: 160,
      fixedPower: true,
      effectDesc: "Potencia colosal de 160 que ignora por completo la habilidad defensiva del objetivo.",
      ignoreAbilities: true
    },
    "g-max-hydrosnipe": {
      name: "g-max-hydrosnipe",
      displayName: "Gigadisparo",
      type: "water",
      category: "special",
      power: 160,
      fixedPower: true,
      effectDesc: "Potencia colosal de 160 que ignora por completo la habilidad defensiva del objetivo.",
      ignoreAbilities: true
    },
    "g-max-wind-rage": {
      name: "g-max-wind-rage",
      displayName: "Gigacorriente de Aire",
      type: "flying",
      category: "physical",
      power: 140,
      effectDesc: "Daña y despeja todo tipo de barreras, pantallas y climas activos en el campo.",
      clearField: true
    },
    "g-max-chi-strike": {
      name: "g-max-chi-strike",
      displayName: "Gigapuñetazo",
      type: "fighting",
      category: "physical",
      power: 130,
      effectDesc: "Daña y aumenta el ratio de golpe crítico del usuario en 1 nivel (+1 crit stage).",
      critStageBoost: 1
    },
    "g-max-finale": {
      name: "g-max-finale",
      displayName: "Gigacolofón",
      type: "fairy",
      category: "special",
      power: 130,
      effectDesc: "Daña y restaura 1/6 de los PS máximos del usuario.",
      healFraction: 1 / 6
    }
  };

  function canPokemonDynamax(pokemon, formatRules = {}) {
    if (!pokemon || pokemon.isFainted || pokemon.isMega || pokemon.isDynamax) return false;
    const rules = typeof formatRules === "string" ? getBattleRules(formatRules) : (formatRules || {});
    if (rules.allowDynamax === false) return false;
    const restricted = ["zacian", "zamazenta", "eternatus"];
    const species = (pokemon.species || pokemon.name || "").toLowerCase();
    if (restricted.includes(species)) return false;
    return true;
  }

  function isPokemonGigantamax(pokemon) {
    if (!pokemon) return false;
    const species = (pokemon.species || pokemon.name || "").toLowerCase();
    return Boolean(GIGANTAMAX_SPECIES[species] && (pokemon.canGigantamax !== false));
  }

  function getGigantamaxData(pokemon) {
    if (!pokemon) return null;
    const species = (pokemon.species || pokemon.name || "").toLowerCase();
    return GIGANTAMAX_SPECIES[species] || null;
  }

  function convertToMaxMove(baseMove, pokemon) {
    if (!baseMove) return null;

    if (baseMove.category === "status") {
      return {
        ...MAX_MOVES.status,
        originalMove: baseMove.name,
        currentPp: baseMove.currentPp,
        maxPp: baseMove.maxPp,
        neverMiss: true
      };
    }

    const moveType = (baseMove.type || "normal").toLowerCase();
    const gmaxData = isPokemonGigantamax(pokemon) ? getGigantamaxData(pokemon) : null;

    if (gmaxData && gmaxData.triggerType === moveType && G_MAX_MOVES[gmaxData.gmaxMove]) {
      const gmaxMoveDef = G_MAX_MOVES[gmaxData.gmaxMove];
      const power = gmaxMoveDef.fixedPower ? gmaxMoveDef.power : calculateMaxMovePower(baseMove);
      return {
        ...gmaxMoveDef,
        category: baseMove.category,
        power,
        originalMove: baseMove.name,
        currentPp: baseMove.currentPp,
        maxPp: baseMove.maxPp,
        neverMiss: true,
        isGigantamax: true
      };
    }

    const template = MAX_MOVES[moveType] || MAX_MOVES.normal;
    const power = calculateMaxMovePower(baseMove);
    return {
      ...template,
      category: baseMove.category,
      power,
      originalMove: baseMove.name,
      currentPp: baseMove.currentPp,
      maxPp: baseMove.maxPp,
      neverMiss: true,
      isMaxMove: true
    };
  }

  // Canonical Learnsets for Competitive Pokémon (Curated from official games)
  const SPECIES_LEARNSETS = {
    // Gen 1
    pikachu: ["thunderbolt", "thunder", "volt-switch", "wild-charge", "thunder-wave", "quick-attack", "extreme-speed", "iron-head", "play-rough", "surf", "calm-mind", "nasty-plot", "tackle", "body-slam"],
    raichu: ["thunderbolt", "thunder", "volt-switch", "wild-charge", "thunder-wave", "focus-blast", "psychic", "surf", "energy-ball", "quick-attack", "extreme-speed", "play-rough", "tackle", "body-slam", "nasty-plot"],
    charizard: ["flamethrower", "fire-blast", "flare-blitz", "will-o-wisp", "air-slash", "roost", "dragon-pulse", "dragon-claw", "dragon-dance", "outrage", "earthquake", "focus-blast", "swords-dance", "body-slam", "tackle"],
    blastoise: ["surf", "hydro-pump", "scald", "aqua-jet", "water-pulse", "ice-beam", "blizzard", "flash-cannon", "earthquake", "focus-blast", "body-slam", "tackle"],
    venusaur: ["energy-ball", "giga-drain", "spore", "sludge-bomb", "toxic", "earth-power", "earthquake", "swords-dance", "body-slam", "tackle"],
    gengar: ["shadow-ball", "shadow-claw", "shadow-sneak", "sludge-bomb", "toxic", "thunderbolt", "thunder", "focus-blast", "energy-ball", "dark-pulse", "nasty-plot", "will-o-wisp"],
    alakazam: ["psychic", "calm-mind", "zen-headbutt", "shadow-ball", "focus-blast", "energy-ball", "dazzling-gleam", "thunder-wave", "recover", "body-slam", "tackle"],
    dragonite: ["draco-meteor", "dragon-claw", "dragon-pulse", "dragon-dance", "outrage", "extreme-speed", "earthquake", "fire-blast", "flamethrower", "thunderbolt", "thunder", "ice-beam", "surf", "roost", "air-slash", "stone-edge", "body-slam", "tackle"],
    gyarados: ["surf", "hydro-pump", "aqua-jet", "crunch", "dark-pulse", "dragon-dance", "outrage", "earthquake", "stone-edge", "ice-beam", "thunderbolt", "brave-bird", "body-slam", "tackle"],
    snorlax: ["body-slam", "tackle", "earthquake", "crunch", "wild-charge", "fire-blast", "surf", "ice-beam", "recover", "toxic"],
    arcanine: ["flare-blitz", "flamethrower", "fire-blast", "will-o-wisp", "extreme-speed", "close-combat", "crunch", "wild-charge", "play-rough", "body-slam", "tackle"],
    zapdos: ["thunderbolt", "thunder", "volt-switch", "thunder-wave", "brave-bird", "air-slash", "roost", "flamethrower", "u-turn", "toxic"],
    articuno: ["ice-beam", "blizzard", "ice-shard", "brave-bird", "air-slash", "roost", "u-turn", "recover"],
    moltres: ["flamethrower", "fire-blast", "flare-blitz", "will-o-wisp", "brave-bird", "air-slash", "roost", "u-turn"],
    mewtwo: ["psychic", "zen-headbutt", "calm-mind", "shadow-ball", "aura-sphere", "focus-blast", "thunderbolt", "ice-beam", "flamethrower", "fire-blast", "recover", "earthquake", "stone-edge", "poison-jab"],
    eevee: ["tackle", "quick-attack", "body-slam", "hyper-voice", "shadow-ball", "iron-head"],
    vaporeon: ["surf", "hydro-pump", "scald", "ice-beam", "blizzard", "shadow-ball", "toxic", "recover", "quick-attack", "body-slam", "tackle"],
    jolteon: ["thunderbolt", "thunder", "volt-switch", "thunder-wave", "shadow-ball", "toxic", "quick-attack", "body-slam", "tackle"],
    flareon: ["flare-blitz", "flamethrower", "fire-blast", "will-o-wisp", "shadow-ball", "iron-head", "quick-attack", "body-slam", "tackle"],

    // Gen 2
    espeon: ["psychic", "calm-mind", "shadow-ball", "dazzling-gleam", "quick-attack", "recover", "body-slam", "tackle"],
    umbreon: ["dark-pulse", "crunch", "sucker-punch", "toxic", "shadow-ball", "calm-mind", "recover", "quick-attack", "body-slam", "tackle"],
    tyranitar: ["stone-edge", "rock-slide", "crunch", "dark-pulse", "earthquake", "earth-power", "fire-blast", "ice-beam", "thunderbolt", "dragon-dance", "dragon-claw", "iron-head", "body-slam", "tackle"],
    scizor: ["bug-buzz", "u-turn", "iron-head", "bullet-punch", "swords-dance", "close-combat", "roost", "quick-attack", "dark-pulse", "body-slam", "tackle"],

    // Gen 3
    salamence: ["draco-meteor", "dragon-claw", "dragon-pulse", "dragon-dance", "outrage", "brave-bird", "air-slash", "roost", "earthquake", "fire-blast", "flamethrower", "hydro-pump", "stone-edge", "body-slam", "tackle"],
    metagross: ["iron-head", "bullet-punch", "flash-cannon", "psychic", "zen-headbutt", "earthquake", "earth-power", "stone-edge", "rock-slide", "thunderbolt", "ice-beam", "body-slam", "tackle"],
    swampert: ["surf", "hydro-pump", "scald", "aqua-jet", "earthquake", "earth-power", "ice-beam", "blizzard", "stone-edge", "rock-slide", "close-combat", "body-slam", "tackle"],
    blaziken: ["flare-blitz", "flamethrower", "fire-blast", "close-combat", "aura-sphere", "focus-blast", "mach-punch", "swords-dance", "brave-bird", "earthquake", "stone-edge", "quick-attack", "body-slam", "tackle"],
    sceptile: ["leaf-blade", "energy-ball", "giga-drain", "dragon-pulse", "dragon-claw", "focus-blast", "earthquake", "rock-slide", "swords-dance", "quick-attack", "body-slam", "tackle"],
    gardevoir: ["moonblast", "dazzling-gleam", "psychic", "calm-mind", "zen-headbutt", "shadow-ball", "energy-ball", "thunderbolt", "focus-blast", "will-o-wisp", "body-slam", "tackle"],
    milotic: ["surf", "hydro-pump", "scald", "ice-beam", "blizzard", "dragon-pulse", "recover", "toxic", "body-slam", "tackle"],

    // Gen 4
    garchomp: ["earthquake", "earth-power", "dragon-claw", "outrage", "draco-meteor", "dragon-dance", "swords-dance", "stone-edge", "rock-slide", "fire-blast", "flamethrower", "iron-head", "poison-jab", "tackle", "body-slam"],
    lucario: ["close-combat", "aura-sphere", "focus-blast", "drain-punch", "mach-punch", "bullet-punch", "iron-head", "flash-cannon", "extreme-speed", "swords-dance", "earthquake", "stone-edge", "dragon-pulse", "dark-pulse", "crunch", "nasty-plot", "zen-headbutt"],
    togekiss: ["air-slash", "roost", "moonblast", "dazzling-gleam", "aura-sphere", "thunder-wave", "flamethrower", "fire-blast", "shadow-ball", "psychic", "calm-mind", "nasty-plot", "body-slam", "extreme-speed"],
    weavile: ["ice-shard", "ice-beam", "blizzard", "dark-pulse", "crunch", "sucker-punch", "swords-dance", "poison-jab", "iron-head", "u-turn", "quick-attack", "body-slam", "tackle"],

    // Gen 5
    volcarona: ["bug-buzz", "u-turn", "flamethrower", "fire-blast", "flare-blitz", "will-o-wisp", "giga-drain", "psychic", "calm-mind", "roost"],
    excadrill: ["earthquake", "earth-power", "iron-head", "swords-dance", "rock-slide", "stone-edge", "poison-jab", "shadow-claw", "body-slam", "tackle"],
    hydreigon: ["dark-pulse", "crunch", "draco-meteor", "dragon-pulse", "dragon-claw", "outrage", "fire-blast", "flamethrower", "surf", "hydro-pump", "earth-power", "flash-cannon", "u-turn", "nasty-plot"],
    chandelure: ["shadow-ball", "shadow-sneak", "flamethrower", "fire-blast", "will-o-wisp", "energy-ball", "psychic", "calm-mind", "toxic"],

    // Gen 6
    greninja: ["surf", "hydro-pump", "scald", "water-pulse", "dark-pulse", "ice-beam", "blizzard", "giga-drain", "u-turn", "shadow-sneak", "toxic"],
    sylveon: ["moonblast", "dazzling-gleam", "hyper-voice", "calm-mind", "shadow-ball", "psychic", "quick-attack", "body-slam", "tackle"],
    talonflame: ["brave-bird", "air-slash", "roost", "flare-blitz", "flamethrower", "fire-blast", "will-o-wisp", "swords-dance", "u-turn", "quick-attack"],
    goodra: ["draco-meteor", "dragon-pulse", "dragon-claw", "outrage", "sludge-bomb", "thunderbolt", "thunder", "ice-beam", "blizzard", "flamethrower", "fire-blast", "surf", "hydro-pump", "earthquake"],

    // Gen 7
    mimikyu: ["play-rough", "shadow-claw", "shadow-sneak", "shadow-ball", "swords-dance", "drain-punch", "energy-ball", "thunderbolt", "will-o-wisp"],
    toxapex: ["scald", "surf", "hydro-pump", "sludge-bomb", "toxic", "recover", "ice-beam"],

    // Gen 8
    dragapult: ["draco-meteor", "dragon-claw", "dragon-pulse", "dragon-dance", "outrage", "shadow-ball", "shadow-sneak", "u-turn", "flamethrower", "fire-blast", "thunderbolt", "thunder", "hydro-pump", "surf"],
    corviknight: ["brave-bird", "air-slash", "roost", "iron-head", "body-slam", "u-turn", "swords-dance"],
    cinderace: ["flare-blitz", "flamethrower", "fire-blast", "close-combat", "u-turn", "swords-dance", "iron-head", "quick-attack", "sucker-punch"],

    // Gen 9
    gholdengo: ["flash-cannon", "shadow-ball", "focus-blast", "recover", "nasty-plot", "thunderbolt", "energy-ball", "dazzling-gleam"],
    kingambit: ["iron-head", "bullet-punch", "crunch", "sucker-punch", "swords-dance", "stone-edge", "close-combat", "poison-jab"],
    meowscarada: ["leaf-blade", "energy-ball", "giga-drain", "dark-pulse", "crunch", "sucker-punch", "u-turn", "play-rough", "swords-dance"]
  };

  /**
   * Filters and returns only moves that the given Pokémon can legally learn.
   * Priority: 1) PokéAPI learnable moves (full canonical learnset), 2) Defined canon learnsets, 3) STAB & basic normal moves.
   */
  function getLegalMovesForPokemon(pokemon) {
    if (!pokemon) return Object.keys(COMMON_MOVES);
    const slug = (pokemon.species || pokemon.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    let allowed = null;

    // 1. If loaded from PokéAPI with details.moves (exhaustive complete movepool)
    if (Array.isArray(pokemon.learnableMoves) && pokemon.learnableMoves.length > 0) {
      allowed = [...pokemon.learnableMoves];
    }

    // 2. Defined canon learnset
    if (!allowed || allowed.length === 0) {
      allowed = SPECIES_LEARNSETS[slug] ? [...SPECIES_LEARNSETS[slug]] : null;
    }

    // 3. Fallback: Moves matching species types + universal normal moves + existing moves
    if (!allowed || allowed.length === 0) {
      const types = (pokemon.types || ["normal"]).map(t => t.toLowerCase());
      allowed = Object.keys(COMMON_MOVES).filter(k => {
        const m = COMMON_MOVES[k];
        if (types.includes(m.type)) return true;
        if (["tackle", "quick-attack", "body-slam"].includes(k)) return true;
        if (Array.isArray(pokemon.moves) && pokemon.moves.some(pm => (pm.name || pm) === k)) return true;
        return false;
      });
    }

    return Array.from(new Set(allowed));
  }

  /**
   * Filters and returns only items that the given Pokémon can legally equip.
   * Restricts Mega Stones strictly to their respective species and handles species-locked items.
   */
  function getLegalItemsForPokemon(pokemon) {
    if (!pokemon) return Object.keys(HELD_ITEMS);
    const slug = (pokemon.species || pokemon.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    return Object.keys(HELD_ITEMS).filter(key => {
      const item = HELD_ITEMS[key];
      if (item.isMegaStone) {
        return slug === item.megaSpecies || slug.includes(item.megaSpecies) || item.megaSpecies.includes(slug);
      }
      if (item.speciesLocked) {
        return item.speciesLocked.includes(slug);
      }
      return true;
    });
  }

  /**
   * Generates a coherent, competitive-ready randomized build for a given Pokémon or preset.
   * Ensures moves, held items, nature, and EV presets have synergy with the Pokémon's stats and role.
   * Keeps levels balanced within an optional target level and variance.
   */
  function randomizePokemonBuild(basePokeOrPreset, options = {}) {
    if (!basePokeOrPreset) {
      // Pick a random competitive preset as base
      const randIdx = Math.floor(Math.random() * COMPETITIVE_PRESETS.length);
      basePokeOrPreset = COMPETITIVE_PRESETS[randIdx];
    }

    const poke = JSON.parse(JSON.stringify(basePokeOrPreset));
    const species = (poke.species || poke.name || "pikachu").toLowerCase();
    const stats = poke.baseStats || { hp: 75, atk: 75, def: 75, spa: 75, spd: 75, spe: 75 };

    // 1. Determine tactical archetype / role based on base stats
    const isPhysical = stats.atk > stats.spa + 15;
    const isSpecial = stats.spa > stats.atk + 15;
    const isMixed = !isPhysical && !isSpecial;
    const isFast = stats.spe >= 85;
    const isBulky = stats.hp >= 80 || (stats.def >= 80 && stats.spd >= 80);

    // 2. Select Synergistic Nature & EV Preset
    let naturePool = [];
    let evPresetKey = "balanced";

    if (isPhysical) {
      naturePool = isFast ? ["adamant", "jolly"] : (isBulky ? ["adamant", "impish", "careful", "brave"] : ["adamant", "jolly"]);
      evPresetKey = isFast ? "atk_spe" : (isBulky ? "bulky_atk" : "atk_spe");
    } else if (isSpecial) {
      naturePool = isFast ? ["modest", "timid"] : (isBulky ? ["modest", "bold", "calm", "quiet"] : ["modest", "timid"]);
      evPresetKey = isFast ? "spa_spe" : (isBulky ? "hp_def" : "spa_spe");
    } else {
      // Mixed or balanced
      naturePool = isFast ? ["hasty", "naive", "jolly", "timid"] : ["hardy", "adamant", "modest", "relaxed"];
      evPresetKey = isFast ? "atk_spe" : "balanced";
    }

    poke.nature = naturePool[Math.floor(Math.random() * naturePool.length)];
    poke.evPreset = evPresetKey;

    const evMap = {
      atk_spe: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      spa_spe: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      hp_def: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
      hp_spd: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
      bulky_atk: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
      balanced: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 }
    };
    poke.evs = JSON.parse(JSON.stringify(evMap[evPresetKey] || evMap.balanced));
    poke.ivs = poke.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

    // 3. Ability Selection
    if (Array.isArray(poke.abilities) && poke.abilities.length > 0) {
      poke.ability = poke.abilities[Math.floor(Math.random() * poke.abilities.length)];
    } else if (!poke.ability) {
      poke.ability = "normal";
    }

    // 4. Synergistic Held Item Selection
    const legalItems = getLegalItemsForPokemon(poke);
    // Categorize legal items for sensible attribution
    const megaStones = legalItems.filter(k => HELD_ITEMS[k] && HELD_ITEMS[k].isMegaStone);
    const offensiveItems = legalItems.filter(k => ["life-orb", "choice-band", "choice-specs", "choice-scarf", "expert-belt", "muscle-band", "wise-glasses"].includes(k));
    const defensiveItems = legalItems.filter(k => ["leftovers", "sitrus-berry", "rocky-helmet", "assault-vest", "eviolite"].includes(k));
    const utilityItems = legalItems.filter(k => ["focus-sash", "lum-berry", "heavy-duty-boots", "light-ball"].includes(k));

    let candidateItems = [];

    // If options.allowMega !== false and Pokemon has a Mega Stone, 35% chance to equip it
    if (options.allowMega !== false && megaStones.length > 0 && Math.random() < 0.35) {
      candidateItems = megaStones;
    } else if (isBulky && Math.random() < 0.55 && defensiveItems.length > 0) {
      candidateItems = defensiveItems;
    } else if (isPhysical && offensiveItems.length > 0) {
      // Avoid choice-specs on purely physical attackers
      candidateItems = offensiveItems.filter(k => k !== "choice-specs");
      if (candidateItems.length === 0) candidateItems = offensiveItems;
    } else if (isSpecial && offensiveItems.length > 0) {
      // Avoid choice-band on purely special attackers
      candidateItems = offensiveItems.filter(k => k !== "choice-band");
      if (candidateItems.length === 0) candidateItems = offensiveItems;
    } else {
      candidateItems = [...offensiveItems, ...defensiveItems, ...utilityItems];
    }

    if (candidateItems.length === 0) candidateItems = legalItems;
    poke.item = candidateItems.length > 0 ? candidateItems[Math.floor(Math.random() * candidateItems.length)] : null;

    // 5. Coherent Move Selection
    // Ensure STAB moves, logical coverage, and avoid incompatible choices (e.g. status moves with Assault Vest)
    const legalMoves = getLegalMovesForPokemon(poke);
    const types = (poke.types || ["normal"]).map(t => t.toLowerCase());

    const stabAttacks = [];
    const coverageAttacks = [];
    const statusSupportMoves = [];

    legalMoves.forEach(mKey => {
      const m = COMMON_MOVES[mKey];
      if (!m) return;
      if (m.category === "status") {
        statusSupportMoves.push(mKey);
      } else {
        // Physical vs Special compatibility check
        if (isPhysical && m.category === "special" && m.power > 70) return; // Skip off-stat big moves
        if (isSpecial && m.category === "physical" && m.power > 70) return; // Skip off-stat big moves

        if (types.includes(m.type)) {
          stabAttacks.push(mKey);
        } else {
          coverageAttacks.push(mKey);
        }
      }
    });

    // Fallbacks if filters were too restrictive
    if (stabAttacks.length === 0 && legalMoves.length > 0) {
      stabAttacks.push(...legalMoves.filter(k => COMMON_MOVES[k] && COMMON_MOVES[k].category !== "status"));
    }

    const pickedMoves = [];
    const hasAssaultVest = poke.item === "assault-vest";

    // A. Pick 1 or 2 STAB attacks
    const shuffledStab = [...stabAttacks].sort(() => Math.random() - 0.5);
    if (shuffledStab.length > 0) pickedMoves.push(shuffledStab[0]);
    if (shuffledStab.length > 1 && Math.random() < 0.6) pickedMoves.push(shuffledStab[1]);

    // B. Optionally pick 1 Status/Buff move (unless Assault Vest is held)
    const shuffledStatus = [...statusSupportMoves].sort(() => Math.random() - 0.5);
    if (!hasAssaultVest && shuffledStatus.length > 0 && Math.random() < 0.65) {
      pickedMoves.push(shuffledStatus[0]);
    }

    // C. Fill remaining slots with coverage attacks or other legal moves
    const remainingCandidates = [...coverageAttacks, ...stabAttacks, ...legalMoves]
      .filter(m => !pickedMoves.includes(m))
      .filter(m => !hasAssaultVest || (COMMON_MOVES[m] && COMMON_MOVES[m].category !== "status"));

    const shuffledRemaining = remainingCandidates.sort(() => Math.random() - 0.5);
    for (const m of shuffledRemaining) {
      if (pickedMoves.length >= 4) break;
      if (!pickedMoves.includes(m)) {
        pickedMoves.push(m);
      }
    }

    // Ensure between 1 and 4 moves
    if (pickedMoves.length === 0 && legalMoves.length > 0) {
      pickedMoves.push(legalMoves[0]);
    }
    poke.moves = pickedMoves.slice(0, 4);

    // 6. Level adjustment: Keep levels consistent and coherent across the team
    const baseTargetLvl = typeof options.targetLevel === "number" ? options.targetLevel : 50;
    const variance = typeof options.variance === "number" ? options.variance : 2; // tight +-2 range
    const lvlOffset = Math.floor(Math.random() * (variance * 2 + 1)) - variance;
    poke.level = Math.max(1, Math.min(100, Math.round(baseTargetLvl + lvlOffset)));

    // Gender
    poke.gender = poke.gender || (Math.random() < 0.5 ? "M" : "F");

    return poke;
  }

  return {
    TYPES,
    TYPE_CHART,
    NATURES,
    COMMON_MOVES,
    HELD_ITEMS,
    BAG_ITEMS,
    COMPETITIVE_PRESETS,
    SPECIES_LEARNSETS,
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
    getLegalMovesForPokemon,
    getLegalItemsForPokemon,
    randomizePokemonBuild,
    getItemSpriteUrl,
    getLocalizedAbility,
    getLocalizedMove,
    getLocalizedItem
  };
});
