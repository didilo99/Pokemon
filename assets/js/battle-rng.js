/**
 * Battle PRNG (Deterministic Pseudo-Random Number Generator)
 * Uses standard Mulberry32 / SplitMix32 algorithm to generate reproducible seeds,
 * random floats [0, 1), random integer ranges [min, max], and chance checks.
 * Logs all rolls for precise combat debugging and replay analysis.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BattleRNG = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class PRNG {
    /**
     * @param {number|string|null} seed - Initial numeric or string seed.
     */
    constructor(seed = null) {
      this.initialSeed = seed !== null && seed !== undefined ? seed : Math.floor(Math.random() * 0xffffffff);
      this.state = this._hashSeed(this.initialSeed);
      this.rollCount = 0;
      this.history = []; // Recorded rolls for debugging/replay
      this.recordHistory = false;
    }

    _hashSeed(s) {
      if (typeof s === "string") {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) {
          h = Math.imul(h ^ s.charCodeAt(i), 16777619);
        }
        return h >>> 0;
      }
      return (Number(s) || 123456789) >>> 0;
    }

    /**
     * Resets PRNG to initial state or a new seed.
     */
    reset(seed = null) {
      if (seed !== null && seed !== undefined) {
        this.initialSeed = seed;
      }
      this.state = this._hashSeed(this.initialSeed);
      this.rollCount = 0;
      this.history = [];
    }

    /**
     * Mulberry32 algorithm
     * Returns a float in [0, 1)
     */
    next() {
      this.rollCount++;
      let t = (this.state += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const val = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      if (this.recordHistory) {
        this.history.push({ step: this.rollCount, val });
      }
      return val;
    }

    /**
     * Returns integer in range [min, max] inclusive.
     */
    range(min, max) {
      return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Returns true with probability p (0 <= p <= 1)
     */
    chance(p) {
      if (p <= 0) return false;
      if (p >= 1) return true;
      return this.next() < p;
    }

    /**
     * Random damage variance factor: [85..100] / 100
     */
    damageRoll() {
      return this.range(85, 100);
    }

    /**
     * Shuffles an array deterministically without mutating the original.
     */
    shuffle(arr) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
      }
      return copy;
    }

    /**
     * Sample one item from an array
     */
    sample(arr) {
      if (!arr || arr.length === 0) return null;
      return arr[Math.floor(this.next() * arr.length)];
    }

    /**
     * Roll multi-hit move count (Gen 5+ official weights: 2 hits: 35%, 3 hits: 35%, 4 hits: 15%, 5 hits: 15%)
     * If user has Skill Link (Encadenado), it is always 5 hits.
     */
    multiHitRoll(hasSkillLink = false) {
      if (hasSkillLink) return 5;
      const roll = this.next() * 100;
      if (roll < 35) return 2;
      if (roll < 70) return 3;
      if (roll < 85) return 4;
      return 5;
    }

    /**
     * Sleep duration roll (Gen 5-9: 1 to 3 turns)
     */
    sleepDurationRoll() {
      return this.range(1, 3);
    }

    /**
     * Confusion duration roll (Gen 2-9: 2 to 5 turns, acting on turn 1)
     */
    confusionDurationRoll() {
      return this.range(2, 5);
    }
  }

  return {
    PRNG,
    create: (seed) => new PRNG(seed)
  };
});

