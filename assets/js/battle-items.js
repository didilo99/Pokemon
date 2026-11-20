/**
 * Battle Items Module
 * Handles consumable bag item effects, inventory tracking,
 * and held item conditions.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const BattleData = require("./battle-data.js");
    module.exports = factory(BattleData);
  } else {
    root.BattleItems = factory(root.BattleData);
  }
})(typeof self !== "undefined" ? self : this, function (BattleData) {
  "use strict";

  const { BAG_ITEMS, HELD_ITEMS } = BattleData;

  function canUseItem(itemId, targetPokemon) {
    const item = BAG_ITEMS[itemId];
    if (!item || !targetPokemon) return { canUse: false, reason: "Objeto no válido." };

    // Revive items can ONLY be used on fainted pokemon
    if (item.revivePercent) {
      if (!targetPokemon.isFainted) {
        return { canUse: false, reason: "El Pokémon no está debilitado." };
      }
      return { canUse: true };
    }

    // Healing / Status items CANNOT be used on fainted pokemon
    if (targetPokemon.isFainted) {
      return { canUse: false, reason: "No se puede usar en un Pokémon debilitado." };
    }

    // HP heal check
    if (item.healAmount || item.fullHeal) {
      if (targetPokemon.currentHp >= targetPokemon.maxHp && !item.cureStatus) {
        return { canUse: false, reason: "El Pokémon ya tiene los PS al máximo." };
      }
    }

    // Status cure check
    if (item.cureStatus && !item.healAmount && !item.fullHeal) {
      if (!targetPokemon.status) {
        return { canUse: false, reason: "El Pokémon no sufre ningún problema de estado." };
      }
    }

    return { canUse: true };
  }

  function getAvailableItemsList(inventory) {
    const list = [];
    for (const [key, qty] of Object.entries(inventory || {})) {
      if (qty > 0 && BAG_ITEMS[key]) {
        list.push({
          ...BAG_ITEMS[key],
          quantity: qty
        });
      }
    }
    return list;
  }

  return {
    canUseItem,
    getAvailableItemsList,
    BAG_ITEMS,
    HELD_ITEMS
  };
});

