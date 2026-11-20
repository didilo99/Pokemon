/**
 * Battle Field Engine
 * Single Source of Truth for weather, terrains, room effects (Trick Room),
 * screens (Reflect, Light Screen, Aurora Veil), and hazard states.
 * Centralizes turns countdown to strictly avoid double-decrement bugs.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BattleField = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class FieldState {
    constructor() {
      // Global battlefield phenomena
      this.weather = null; // 'sun', 'rain', 'sandstorm', 'snow'
      this.weatherTurns = 0;
      this.terrain = null; // 'electric', 'grassy', 'psychic', 'misty'
      this.terrainTurns = 0;
      this.trickRoom = 0; // Turns remaining (5 when cast)
      this.gravity = 0;
      this.isDoubleBattle = false;

      // Side specific conditions
      this.sides = {
        player: {
          reflect: 0,
          lightScreen: 0,
          auroraVeil: 0,
          tailwind: 0,
          stealthRock: false,
          spikes: 0,
          toxicSpikes: 0,
          stickyWeb: false,
        },
        rival: {
          reflect: 0,
          lightScreen: 0,
          auroraVeil: 0,
          tailwind: 0,
          stealthRock: false,
          spikes: 0,
          toxicSpikes: 0,
          stickyWeb: false,
        }
      };
    }

    reset() {
      this.weather = null;
      this.weatherTurns = 0;
      this.terrain = null;
      this.terrainTurns = 0;
      this.trickRoom = 0;
      this.gravity = 0;
      this.sides.player = {
        reflect: 0,
        lightScreen: 0,
        auroraVeil: 0,
        tailwind: 0,
        stealthRock: false,
        spikes: 0,
        toxicSpikes: 0,
        stickyWeb: false,
      };
      this.sides.rival = {
        reflect: 0,
        lightScreen: 0,
        auroraVeil: 0,
        tailwind: 0,
        stealthRock: false,
        spikes: 0,
        toxicSpikes: 0,
        stickyWeb: false,
      };
    }

    setWeather(weatherName, turns = 5) {
      this.weather = weatherName;
      this.weatherTurns = turns;
    }

    setTerrain(terrainName, turns = 5) {
      this.terrain = terrainName;
      this.terrainTurns = turns;
    }

    toggleTrickRoom() {
      if (this.trickRoom > 0) {
        this.trickRoom = 0;
        return { active: false, message: "¡Las dimensiones volvieron a la normalidad!" };
      }
      this.trickRoom = 5;
      return { active: true, message: "¡Se distorsionaron las dimensiones con Espacio Raro!" };
    }

    setScreen(side, screenName, turns = 5) {
      if (this.sides[side] && this.sides[side].hasOwnProperty(screenName)) {
        this.sides[side][screenName] = turns;
        return true;
      }
      return false;
    }

    getScreensForSide(side) {
      return this.sides[side] || {};
    }

    getHazardsForSide(side) {
      return this.sides[side] || {};
    }

    /**
     * Decrements all turn counters atomically once per turn.
     * Returns an array of event notices for any condition that expired.
     */
    decrementTurnTimers() {
      const expiredEvents = [];

      // 1. Weather
      if (this.weatherTurns > 0) {
        this.weatherTurns--;
        if (this.weatherTurns <= 0) {
          const oldW = this.weather;
          this.weather = null;
          expiredEvents.push({ type: "weather_end", weather: oldW });
        }
      }

      // 2. Terrain
      if (this.terrainTurns > 0) {
        this.terrainTurns--;
        if (this.terrainTurns <= 0) {
          const oldT = this.terrain;
          this.terrain = null;
          expiredEvents.push({ type: "terrain_end", terrain: oldT });
        }
      }

      // 3. Trick Room
      if (this.trickRoom > 0) {
        this.trickRoom--;
        if (this.trickRoom <= 0) {
          expiredEvents.push({ type: "trick_room_end" });
        }
      }

      // 4. Screens per side
      for (const side of ["player", "rival"]) {
        const sc = this.sides[side];
        for (const sKey of ["reflect", "lightScreen", "auroraVeil", "tailwind"]) {
          if (sc[sKey] > 0) {
            sc[sKey]--;
            if (sc[sKey] === 0) {
              expiredEvents.push({ type: "screen_end", side, screen: sKey });
            }
          }
        }
      }

      return expiredEvents;
    }
  }

  return {
    FieldState,
    create: () => new FieldState()
  };
});

