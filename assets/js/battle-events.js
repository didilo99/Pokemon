/**
 * Battle Event Bus & Hook Registry
 * Implements a prioritized lifecycle event manager modeled after the official Gen IX battle system.
 * Allows Moves, Abilities, Items, Weather, Terrains, Screens, and Status effects
 * to register listeners for specific hooks without hardcoded if/else chains in the engine core.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BattleEvents = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Standard Lifecycle Hooks
  const HOOKS = [
    "BeforeTurn",
    "ModifyPriority",
    "ModifySpeed",
    "BeforeMove",
    "MoveStart",
    "ModifyMove",
    "ModifyPower",
    "ModifyAccuracy",
    "TryHit",
    "Immunity",
    "ModifyAttackStat",
    "ModifyDefenseStat",
    "ModifyDamage",
    "CriticalHit",
    "Damage",
    "AfterDamage",
    "AfterMoveSecondary",
    "AfterMove",
    "SwitchOut",
    "SwitchIn",
    "Faint",
    "Residual",
    "TurnEnd",
    "WeatherChange",
    "TerrainChange",
  ];

  class EventBus {
    constructor() {
      this.listeners = new Map();
      HOOKS.forEach((h) => this.listeners.set(h, []));
    }

    /**
     * Clear all registered listeners.
     */
    clear() {
      HOOKS.forEach((h) => this.listeners.set(h, []));
    }

    /**
     * Register a callback for a specific hook.
     * @param {string} hookName - One of HOOKS
     * @param {Function} handler - function(context, value) => { value, stop }
     * @param {number} priority - Execution order priority (higher runs earlier, default 100)
     * @param {string} source - Tag identifying the source (e.g. 'ability:intimidate')
     */
    on(hookName, handler, priority = 100, source = "") {
      if (!this.listeners.has(hookName)) {
        this.listeners.set(hookName, []);
      }
      this.listeners.get(hookName).push({ handler, priority, source });
      // Sort descending by priority
      this.listeners.get(hookName).sort((a, b) => b.priority - a.priority);
    }

    /**
     * Trigger a modifying event pipeline where a value is passed through listeners sequentially.
     * @param {string} hookName
     * @param {Object} context - Battle context { pokemon, opponent, move, field, battle, ... }
     * @param {*} initialValue - The base value (e.g. base power, speed, damage multiplier)
     * @returns {*} Modified final value
     */
    triggerModify(hookName, context, initialValue) {
      const list = this.listeners.get(hookName) || [];
      let val = initialValue;
      for (const entry of list) {
        try {
          const res = entry.handler(context, val);
          if (res !== undefined) {
            val = res;
          }
        } catch (err) {
          console.error(`Error in hook ${hookName} [${entry.source}]:`, err);
        }
      }
      return val;
    }

    /**
     * Trigger a void or notification hook (e.g. SwitchIn, AfterDamage, Residual).
     * Stops early if any handler returns false.
     * @param {string} hookName
     * @param {Object} context
     * @returns {boolean} true if completed without stop, false if stopped
     */
    trigger(hookName, context) {
      const list = this.listeners.get(hookName) || [];
      for (const entry of list) {
        try {
          const res = entry.handler(context);
          if (res === false) {
            return false;
          }
        } catch (err) {
          console.error(`Error in trigger ${hookName} [${entry.source}]:`, err);
        }
      }
      return true;
    }
  }

  return {
    HOOKS,
    EventBus,
    create: () => new EventBus(),
  };
});

