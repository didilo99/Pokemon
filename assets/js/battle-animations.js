/**
 * Battle Animations & Event Player Module (Cinematic Remastered)
 * High-fidelity PokÃ©mon animations, ballistics, weather effects,
 * ability announcements, sprite staging, and event sequencing.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BattleAnimations = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class CinematicAnimationPlayer {
    constructor() {
      this.speed = 1.0; // 1.0 = normal, 1.5 = fast, 2.0 = fast+, 0 = turbo/instant
      this.isPlaying = false;
      this.cancelRequested = false;
      this.currentWeather = null;
      this.currentTerrain = null;
      this.weatherInterval = null;
    }

    setSpeed(speedVal) {
      this.speed = parseFloat(speedVal);
      if (isNaN(this.speed)) this.speed = 1.0;
    }

    async delay(ms) {
      if (this.speed === 0) return Promise.resolve();
      return new Promise((resolve) => setTimeout(resolve, Math.max(8, ms / this.speed)));
    }

    /**
     * Sequential execution of battle event queue with UI callbacks.
     */
    async playEvents(events, uiCallbacks) {
      this.isPlaying = true;
      this.cancelRequested = false;

      let currentAttackerSide = "player";

      for (const ev of events) {
        if (this.cancelRequested) break;

        switch (ev.type) {
          case "text":
          case "dialogue":
            if (uiCallbacks && uiCallbacks.onMessage) {
              await uiCallbacks.onMessage(ev.message);
              await this.delay(420);
            }
            break;

          case "move_start":
            currentAttackerSide = ev.side || "player";
            if (uiCallbacks && uiCallbacks.onMoveStart) {
              await uiCallbacks.onMoveStart(ev.side, ev.moveDisplayName, ev.moveType, ev.category);
            }
            // Anticipation & physical lunging
            await this.playAnticipation(ev.side);
            if (ev.category === "physical") {
              await this.playPhysicalLunge(ev.side);
            }
            break;

          case "vfx": {
            const targetSide = ev.targetSide || (currentAttackerSide === "player" ? "rival" : "player");
            await this.playMoveVfx(ev.moveType, ev.category, ev.moveName, targetSide, currentAttackerSide);
            break;
          }

          case "damage":
            await this.playHitAnimation(ev.targetSide, ev.isCrit);
            if (uiCallbacks && uiCallbacks.onHpUpdate) {
              await uiCallbacks.onHpUpdate(ev.targetSide, ev.currentHp, ev.maxHp);
            }
            await this.delay(380);
            break;

          case "heal":
            await this.playHealVfx(ev.side);
            if (uiCallbacks && uiCallbacks.onHpUpdate) {
              await uiCallbacks.onHpUpdate(ev.side, ev.currentHp, ev.maxHp);
            }
            await this.delay(380);
            break;

          case "status_change":
            if (uiCallbacks && uiCallbacks.onStatusUpdate) {
              await uiCallbacks.onStatusUpdate(ev.side, ev.status);
            }
            this.updateStatusAura(ev.side, ev.status);
            if (ev.status) {
              await this.playStatusVfx(ev.side, ev.status);
            }
            await this.delay(300);
            break;

          case "stat_change":
            await this.playStatChangeVfx(ev.side, ev.stages > 0 ? "up" : "down");
            await this.delay(350);
            break;

          case "switch":
            if (uiCallbacks && uiCallbacks.onSwitch) {
              await this.playSwitchAnimation(ev.side, ev.toPokemon, uiCallbacks.onSwitch);
            }
            break;

          case "faint":
            await this.playFaintAnimation(ev.targetSide);
            if (uiCallbacks && uiCallbacks.onFaint) {
              uiCallbacks.onFaint(ev.targetSide);
            }
            await this.delay(550);
            break;

          case "miss":
            await this.playMissVfx(ev.side || (currentAttackerSide === "player" ? "rival" : "player"));
            await this.delay(400);
            break;

          case "immune":
            await this.playImmuneVfx(ev.targetSide || (currentAttackerSide === "player" ? "rival" : "player"));
            await this.delay(400);
            break;

          case "blocked":
            await this.playBlockedAnimation(ev.side || ev.targetSide);
            break;

          case "max_guard":
            await this.playMaxGuardAnimation(ev.side);
            break;

          case "ability_trigger":
            await this.playAbilityTrigger(ev.side, ev.ability, ev.abilityName);
            break;

          case "weather_change":
            await this.setWeather(ev.weather);
            break;

          case "weather_end":
            await this.clearWeather();
            break;

          case "terrain_change":
            await this.setTerrain(ev.terrain);
            break;

          case "terrain_end":
            await this.clearTerrain();
            break;

          case "item_trigger":
            await this.playItemTriggerVfx(ev.side, ev.item);
            await this.delay(400);
            break;

          case "mega_evolution":
            await this.playMegaEvolutionAnimation(
              ev.side,
              ev.name,
              ev.newTypes,
              ev.newAbility,
              ev.spriteFront,
              ev.spriteBack,
              uiCallbacks
            );
            break;

          case "dynamax_start":
            await this.playDynamaxStartAnimation(
              ev.side,
              ev.isGigantamax,
              ev.name,
              ev.spriteFront,
              ev.spriteBack,
              ev.currentHp,
              ev.maxHp,
              ev.dynamaxTurnsLeft,
              uiCallbacks
            );
            break;

          case "dynamax_end":
            await this.playDynamaxEndAnimation(
              ev.side,
              ev.currentHp,
              ev.maxHp,
              ev.spriteFront,
              ev.spriteBack,
              uiCallbacks
            );
            break;

          case "protect":
            await this.playProtectAnimation(ev.side);
            break;

          default:
            break;
        }
      }

      this.isPlaying = false;
    }

    // --- GEOMETRIC COORDINATES & TRAJECTORIES ---

    getSpriteAnchor(side) {
      const vfxLayer = document.getElementById("battleVfxLayer");
      const spriteEl = document.getElementById(side === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      const platformEl = document.getElementById(side === "player" ? "playerPlatform" : "rivalPlatform");

      if (!vfxLayer) return { x: 0, y: 0 };
      const vfxRect = vfxLayer.getBoundingClientRect();

      if (spriteEl) {
        const sRect = spriteEl.getBoundingClientRect();
        if (sRect.width > 0 && sRect.height > 0) {
          return {
            x: sRect.left + sRect.width / 2 - vfxRect.left,
            y: sRect.top + sRect.height * 0.55 - vfxRect.top,
          };
        }
      }

      if (platformEl) {
        const pRect = platformEl.getBoundingClientRect();
        return {
          x: pRect.left + pRect.width / 2 - vfxRect.left,
          y: pRect.top + pRect.height * 0.45 - vfxRect.top,
        };
      }

      // Default relative coordinates
      return side === "player"
        ? { x: vfxRect.width * 0.28, y: vfxRect.height * 0.68 }
        : { x: vfxRect.width * 0.72, y: vfxRect.height * 0.32 };
    }

    getTrajectory(attackerSide, targetSide) {
      const start = this.getSpriteAnchor(attackerSide);
      const end = this.getSpriteAnchor(targetSide);
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const distance = Math.hypot(deltaX, deltaY);
      const angleRad = Math.atan2(deltaY, deltaX);
      const angleDeg = (angleRad * 180) / Math.PI;

      return {
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        deltaX,
        deltaY,
        distance,
        angleDeg,
      };
    }

    // --- SPRITE REACTIONS & PHYSICAL DYNAMICS ---

    async playAnticipation(side) {
      const spriteEl = document.getElementById(side === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      if (!spriteEl) return;
      spriteEl.classList.add("anim-anticipate");
      await this.delay(120);
      spriteEl.classList.remove("anim-anticipate");
    }

    async playPhysicalLunge(side) {
      const spriteEl = document.getElementById(side === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      if (!spriteEl) return;
      const animClass = side === "player" ? "anim-lunge-player" : "anim-lunge-rival";
      spriteEl.classList.add(animClass);
      await this.delay(360);
      spriteEl.classList.remove(animClass);
    }

    async playHitAnimation(targetSide, isCrit) {
      const spriteEl = document.getElementById(targetSide === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      if (!spriteEl) return;

      const animClass = isCrit ? "anim-crit-shake" : "anim-hit-recoil";
      spriteEl.classList.add(animClass);

      if (isCrit) {
        document.body.classList.add("screen-flash-crit");
      }

      await this.delay(420);
      spriteEl.classList.remove(animClass);
      document.body.classList.remove("screen-flash-crit");
    }

    async playMissVfx(targetSide) {
      const spriteEl = document.getElementById(targetSide === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      const dodgeClass = targetSide === "player" ? "anim-dodge-player" : "anim-dodge-rival";

      if (spriteEl) {
        spriteEl.classList.add(dodgeClass);
      }

      const vfxContainer = document.getElementById("battleVfxLayer");
      if (vfxContainer) {
        const anchor = this.getSpriteAnchor(targetSide);
        const missEl = document.createElement("div");
        missEl.className = "vfx-miss-text";
        missEl.style.left = `${anchor.x}px`;
        missEl.style.top = `${anchor.y - 45}px`;
        missEl.textContent = (window.I18n && typeof window.I18n.t === "function")
          ? window.I18n.t("battle_sim.vfx_miss")
          : "Â¡FALLÃ“!";
        vfxContainer.appendChild(missEl);
        setTimeout(() => missEl.remove(), 700);
      }

      await this.delay(450);
      if (spriteEl) spriteEl.classList.remove(dodgeClass);
    }

    async playImmuneVfx(targetSide) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      if (vfxContainer) {
        const anchor = this.getSpriteAnchor(targetSide);
        const immEl = document.createElement("div");
        immEl.className = "vfx-blocked-text";
        immEl.style.left = `${anchor.x}px`;
        immEl.style.top = `${anchor.y - 45}px`;
        immEl.textContent = (window.I18n && typeof window.I18n.t === "function")
          ? window.I18n.t("battle_sim.vfx_immune")
          : "Â¡NO AFECTA!";
        vfxContainer.appendChild(immEl);
        setTimeout(() => immEl.remove(), 700);
      }
      await this.delay(400);
    }

    async playFaintAnimation(side) {
      const spriteEl = document.getElementById(side === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      const shadowEl = document.getElementById(side === "player" ? "playerShadow" : "rivalShadow");
      if (!spriteEl) return;

      spriteEl.classList.add("anim-faint-sink");
      if (shadowEl) shadowEl.style.opacity = "0";

      await this.delay(720);
      spriteEl.classList.remove("anim-faint-sink");
      spriteEl.style.opacity = "0";
      this.updateStatusAura(side, null);
    }

    async playSwitchAnimation(side, toPokemon, callback) {
      const spriteEl = document.getElementById(side === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      const shadowEl = document.getElementById(side === "player" ? "playerShadow" : "rivalShadow");

      // 1. Switch out (red return beam)
      if (spriteEl && spriteEl.style.opacity !== "0") {
        spriteEl.classList.add("anim-switch-out");
        await this.delay(380);
        spriteEl.classList.remove("anim-switch-out");
      }

      // 2. Callback to update state & UI
      if (callback) callback(side, toPokemon);

      // 3. Switch in with PokÃ©ball burst
      if (spriteEl) {
        spriteEl.style.opacity = "1";
        if (shadowEl) shadowEl.style.opacity = "1";
        spriteEl.classList.add("anim-switch-in");
        this.playPokeballBurst(side);
        await this.delay(480);
        spriteEl.classList.remove("anim-switch-in");
      }
    }

    playPokeballBurst(side) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      if (!vfxContainer) return;
      const anchor = this.getSpriteAnchor(side);

      const burst = document.createElement("div");
      burst.className = "pokeball-burst-ring";
      burst.style.left = `${anchor.x}px`;
      burst.style.top = `${anchor.y}px`;

      vfxContainer.appendChild(burst);
      setTimeout(() => burst.remove(), 600);
    }

    // --- MODULAR MOVE VFX FAMILIES WITH TRAJECTORIES ---

    async playMoveVfx(moveType, category, moveName, targetSide, attackerSide) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      if (!vfxContainer) return;

      const traj = this.getTrajectory(attackerSide, targetSide);
      const typeKey = (moveType || "normal").toLowerCase();
      const moveSlug = (moveName || "").toLowerCase();

      // Special handling for Earthquake / Ground arena-wide quakes
      if (typeKey === "ground" && (moveSlug.includes("earthquake") || moveSlug.includes("terremoto") || moveSlug.includes("magnitude"))) {
        const stadiumEl = document.getElementById("battleStadium");
        if (stadiumEl) {
          stadiumEl.classList.add("stadium-screen-quake");
          setTimeout(() => stadiumEl.classList.remove("stadium-screen-quake"), 700);
        }
        await this.delay(500);
        return;
      }

      // Special handling for Beam attacks (Thunderbolt, Ice Beam, Hyper Beam, Dragon Pulse)
      const isBeam = moveSlug.includes("beam") || moveSlug.includes("rayo") || moveSlug.includes("pulse") || moveSlug.includes("pulso") || moveSlug.includes("hyper");
      if (isBeam && traj.distance > 0) {
        await this.renderEnergyBeam(vfxContainer, traj, typeKey);
        await this.playHitBurst(vfxContainer, traj.endX, traj.endY, typeKey);
        return;
      }

      // Special handling for Projectiles (Flamethrower, Shadow Ball, Energy Ball, Hydro Pump)
      const isProjectile = category === "special" || moveSlug.includes("ball") || moveSlug.includes("bomba") || moveSlug.includes("lanzallamas") || moveSlug.includes("rock");
      if (isProjectile) {
        await this.renderBallisticProjectile(vfxContainer, traj, typeKey);
        await this.playHitBurst(vfxContainer, traj.endX, traj.endY, typeKey);
        return;
      }

      // Physical Slashing / Claws / Punches
      await this.renderPhysicalSlash(vfxContainer, traj.endX, traj.endY, typeKey);
      await this.playHitBurst(vfxContainer, traj.endX, traj.endY, typeKey);
    }

    async renderBallisticProjectile(container, traj, typeKey) {
      const proj = document.createElement("div");
      proj.className = `vfx-ballistic-projectile projectile-${this.getProjectileClass(typeKey)}`;
      proj.style.left = `${traj.startX}px`;
      proj.style.top = `${traj.startY}px`;
      container.appendChild(proj);

      const durationMs = Math.max(180, Math.min(380, traj.distance / 1.4));
      const startTime = performance.now();

      await new Promise((resolve) => {
        const step = (now) => {
          const progress = Math.min(1, (now - startTime) / durationMs);
          const curX = traj.startX + traj.deltaX * progress;
          // Arc trajectory for realism
          const arcOffset = Math.sin(progress * Math.PI) * -35;
          const curY = traj.startY + traj.deltaY * progress + arcOffset;

          proj.style.left = `${curX}px`;
          proj.style.top = `${curY}px`;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            proj.remove();
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    }

    getProjectileClass(typeKey) {
      switch (typeKey) {
        case "fire": return "fire";
        case "water": return "water";
        case "electric": return "electric";
        case "ghost":
        case "dark": return "shadow";
        case "grass":
        case "bug": return "grass";
        case "ice": return "ice";
        case "psychic": return "psychic";
        case "fairy": return "fairy";
        case "dragon": return "dragon";
        case "rock":
        case "ground": return "rock";
        case "steel": return "steel";
        case "poison": return "poison";
        case "flying": return "flying";
        case "fighting": return "fighting";
        case "normal":
        default: return "normal";
      }
    }

    async renderEnergyBeam(container, traj, typeKey) {
      const beam = document.createElement("div");
      beam.className = `vfx-energy-beam beam-${this.getBeamClass(typeKey)}`;
      beam.style.left = `${traj.startX}px`;
      beam.style.top = `${traj.startY}px`;
      beam.style.width = `${traj.distance}px`;
      beam.style.transform = `rotate(${traj.angleDeg}deg)`;

      container.appendChild(beam);
      await this.delay(380);
      beam.remove();
    }

    getBeamClass(typeKey) {
      switch (typeKey) {
        case "electric": return "electric";
        case "ice": return "ice";
        case "dragon": return "dragon";
        case "fire": return "fire";
        case "water": return "water";
        case "grass":
        case "bug": return "grass";
        case "psychic": return "psychic";
        case "fairy": return "fairy";
        case "ghost":
        case "dark": return "dark";
        case "poison": return "poison";
        case "steel": return "steel";
        case "ground":
        case "rock": return "rock";
        case "fighting": return "fighting";
        case "flying": return "flying";
        case "normal":
        default: return "hyper";
      }
    }

    async renderPhysicalSlash(container, x, y, typeKey) {
      const slash = document.createElement("div");
      slash.className = `vfx-slash-arc slash-${typeKey}`;
      slash.style.left = `${x}px`;
      slash.style.top = `${y}px`;

      container.appendChild(slash);
      await this.delay(300);
      slash.remove();
    }

    async playHitBurst(container, x, y, typeKey) {
      const burst = document.createElement("div");
      burst.className = `vfx-elemental-burst burst-${this.getBurstClass(typeKey)}`;
      burst.style.left = `${x}px`;
      burst.style.top = `${y}px`;

      container.appendChild(burst);
      await this.delay(400);
      burst.remove();
    }

    getBurstClass(typeKey) {
      switch (typeKey) {
        case "fire": return "fire";
        case "water": return "water";
        case "electric": return "electric";
        case "grass":
        case "bug": return "grass";
        case "ice": return "ice";
        case "ghost":
        case "dark": return "shadow";
        case "psychic": return "psychic";
        case "fairy": return "fairy";
        case "dragon": return "dragon";
        case "steel": return "steel";
        case "poison": return "poison";
        case "ground":
        case "rock": return "rock";
        case "fighting": return "fighting";
        case "flying": return "flying";
        case "normal":
        default: return "normal";
      }
    }

    // --- DEFENSIVE BARRIERS & HEALING ---

    async playMaxGuardAnimation(side) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      if (!vfxContainer) return;
      const anchor = this.getSpriteAnchor(side);

      const barrier = document.createElement("div");
      barrier.className = "vfx-shield-barrier";
      barrier.style.left = `${anchor.x}px`;
      barrier.style.top = `${anchor.y}px`;

      vfxContainer.appendChild(barrier);
      await this.delay(650);
      barrier.remove();
    }

    async playBlockedAnimation(targetSide) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      if (!vfxContainer) return;
      const anchor = this.getSpriteAnchor(targetSide);

      const blockEl = document.createElement("div");
      blockEl.className = "vfx-blocked-text";
      blockEl.style.left = `${anchor.x}px`;
      blockEl.style.top = `${anchor.y - 35}px`;
      blockEl.textContent = (window.I18n && typeof window.I18n.t === "function")
        ? window.I18n.t("battle_sim.vfx_protected")
        : "Â¡PROTEGIDO!";

      vfxContainer.appendChild(blockEl);
      await this.delay(500);
      blockEl.remove();
    }

    async playHealVfx(side) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      if (!vfxContainer) return;
      const anchor = this.getSpriteAnchor(side);

      const healEl = document.createElement("div");
      healEl.className = "vfx-heal-pillar";
      healEl.style.left = `${anchor.x}px`;
      healEl.style.top = `${anchor.y}px`;
      healEl.innerHTML = "<span>âœ¨ ðŸ’š âœ¨</span>";

      vfxContainer.appendChild(healEl);
      await this.delay(600);
      healEl.remove();
    }

    async playStatChangeVfx(side, direction) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      if (!vfxContainer) return;
      const anchor = this.getSpriteAnchor(side);

      const arrow = document.createElement("div");
      arrow.className = `vfx-stat-arrow vfx-stat-${direction}`;
      arrow.style.left = `${anchor.x}px`;
      arrow.style.top = `${anchor.y}px`;
      arrow.textContent = direction === "up" ? "â–²â–²" : "â–¼â–¼";

      vfxContainer.appendChild(arrow);
      await this.delay(500);
      arrow.remove();
    }

    async playItemTriggerVfx(side, itemKey) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      if (!vfxContainer) return;
      const anchor = this.getSpriteAnchor(side);

      const itemEl = document.createElement("div");
      itemEl.className = "vfx-item-popup";
      itemEl.style.left = `${anchor.x}px`;
      itemEl.style.top = `${anchor.y - 45}px`;
      itemEl.innerHTML = `<span class="badge bg-warning text-dark font-weight-bold">ðŸ›¡ï¸ ${(itemKey || "").toUpperCase()}</span>`;

      vfxContainer.appendChild(itemEl);
      await this.delay(550);
      itemEl.remove();
    }

    // --- ABILITY ANNOUNCEMENT BANNER ---

    async playAbilityTrigger(side, abilityKey, abilityName) {
      const banner = document.getElementById("abilityBanner");
      if (!banner) return;

      const displayName = abilityName || abilityKey || "Habilidad";
      const abilityLabel = (window.I18n && typeof window.I18n.t === "function")
        ? window.I18n.t("battle_sim.ability_label_banner")
        : "HABILIDAD";
      banner.className = `ability-announcement-banner ${side === "player" ? "player-side" : "rival-side"}`;
      banner.innerHTML = `
        <span class="ability-banner-icon">âš¡</span>
        <div>
          <span style="font-size: 0.72rem; color: #94a3b8; display: block;">${abilityLabel}</span>
          <span class="ability-banner-name">${displayName}</span>
        </div>
      `;
      banner.style.display = "flex";

      await this.delay(1200);
      setTimeout(() => {
        banner.style.display = "none";
      }, 1500);
    }

    // --- PERSISTENT WEATHER & TERRAIN MANAGEMENT ---

    async setWeather(weatherKey) {
      this.currentWeather = weatherKey;
      const sky = document.getElementById("battleSky");
      const weatherLayer = document.getElementById("battleWeatherLayer");
      if (!sky || !weatherLayer) return;

      // Clean old weather classes
      sky.classList.remove("weather-sun", "weather-rain", "weather-sandstorm", "weather-hail");
      weatherLayer.classList.remove("weather-sun", "weather-rain", "weather-sandstorm", "weather-hail", "active");
      weatherLayer.innerHTML = "";
      if (this.weatherInterval) clearInterval(this.weatherInterval);

      if (!weatherKey) return;

      const wClass = `weather-${weatherKey}`;
      sky.classList.add(wClass);
      weatherLayer.classList.add(wClass, "active");

      // Spawn weather particle systems
      if (weatherKey === "rain") {
        for (let i = 0; i < 35; i++) {
          const drop = document.createElement("div");
          drop.className = "weather-rain-drop";
          drop.style.left = `${Math.random() * 110}%`;
          drop.style.animationDelay = `${Math.random() * 0.55}s`;
          drop.style.animationDuration = `${0.45 + Math.random() * 0.2}s`;
          weatherLayer.appendChild(drop);
        }
      } else if (weatherKey === "sun") {
        const shimmer = document.createElement("div");
        shimmer.className = "sun-heat-shimmer";
        weatherLayer.appendChild(shimmer);

        const ray1 = document.createElement("div");
        ray1.className = "weather-sun-ray";
        ray1.style.left = "40%";
        weatherLayer.appendChild(ray1);
      } else if (weatherKey === "sandstorm") {
        for (let i = 0; i < 28; i++) {
          const sand = document.createElement("div");
          sand.className = "sand-particle";
          const size = 3 + Math.random() * 5;
          sand.style.width = `${size}px`;
          sand.style.height = `${size}px`;
          sand.style.right = `${-20 + Math.random() * 100}%`;
          sand.style.top = `${Math.random() * 95}%`;
          sand.style.animationDelay = `${Math.random() * 0.7}s`;
          sand.style.animationDuration = `${0.5 + Math.random() * 0.3}s`;
          weatherLayer.appendChild(sand);
        }
      } else if (weatherKey === "hail") {
        for (let i = 0; i < 24; i++) {
          const snow = document.createElement("div");
          snow.className = "snow-flake";
          const size = 4 + Math.random() * 6;
          snow.style.width = `${size}px`;
          snow.style.height = `${size}px`;
          snow.style.left = `${Math.random() * 100}%`;
          snow.style.animationDelay = `${Math.random() * 2}s`;
          snow.style.animationDuration = `${1.8 + Math.random() * 0.8}s`;
          weatherLayer.appendChild(snow);
        }
      }

      await this.delay(500);
    }

    async clearWeather() {
      await this.setWeather(null);
    }

    async setTerrain(terrainKey) {
      this.currentTerrain = terrainKey;
      const terrainLayer = document.getElementById("battleTerrainLayer");
      if (!terrainLayer) return;

      terrainLayer.classList.remove("terrain-electric", "terrain-grassy", "terrain-psychic", "terrain-misty", "active");
      if (!terrainKey) return;

      terrainLayer.classList.add(`terrain-${terrainKey}`, "active");
      await this.delay(450);
    }

    async clearTerrain() {
      await this.setTerrain(null);
    }

    // --- PERSISTENT STATUS AURAS ---

    updateStatusAura(side, status) {
      const auraEl = document.getElementById(side === "player" ? "playerStatusAura" : "rivalStatusAura");
      if (!auraEl) return;

      auraEl.className = "pokemon-status-aura";
      if (!status) return;

      auraEl.classList.add(`status-aura-${status}`, "active");
    }

    async playStatusVfx(side, status) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      if (!vfxContainer) return;
      const anchor = this.getSpriteAnchor(side);

      const elem = document.createElement("div");
      elem.className = `vfx-status-badge vfx-status-${status}`;
      elem.style.left = `${anchor.x}px`;
      elem.style.top = `${anchor.y - 45}px`;

      const icons = { par: "âš¡", brn: "ðŸ”¥", psn: "â˜ ï¸", tox: "â˜£ï¸", slp: "ðŸ’¤", frz: "â„ï¸" };
      elem.textContent = icons[status] || "âš ï¸";

      vfxContainer.appendChild(elem);
      await this.delay(420);
      elem.remove();
    }

    // --- MEGA EVOLUTION & DYNAMAX CINEMATICS ---

    async playMegaEvolutionAnimation(side, name, newTypes, newAbility, spriteFront, spriteBack, uiCallbacks) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      const spriteEl = document.getElementById(side === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      const anchor = this.getSpriteAnchor(side);

      if (vfxContainer) {
        const megaBurst = document.createElement("div");
        megaBurst.className = "vfx-mega-burst";
        megaBurst.style.left = `${anchor.x}px`;
        megaBurst.style.top = `${anchor.y}px`;
        megaBurst.innerHTML = `
          <div class="mega-symbol-ring"></div>
          <div class="mega-crystal-glow"></div>
        `;
        vfxContainer.appendChild(megaBurst);
        setTimeout(() => megaBurst.remove(), 1100);
      }

      if (spriteEl) {
        spriteEl.classList.add("anim-mega-evolve");
      }

      await this.delay(550);

      if (spriteEl) {
        if (side === "player") {
          spriteEl.src = spriteBack || spriteFront || spriteEl.src;
        } else {
          spriteEl.src = spriteFront || spriteEl.src;
        }
      }

      if (uiCallbacks && uiCallbacks.onMegaEvolution) {
        uiCallbacks.onMegaEvolution(side, name, newTypes, newAbility, spriteFront, spriteBack);
      }

      await this.delay(550);
      if (spriteEl) {
        spriteEl.classList.remove("anim-mega-evolve");
        spriteEl.classList.add("mega-evolved-glow");
      }
    }

    async playDynamaxStartAnimation(
      side,
      isGigantamax,
      name,
      spriteFront,
      spriteBack,
      currentHp,
      maxHp,
      dynamaxTurnsLeft,
      uiCallbacks
    ) {
      const vfxContainer = document.getElementById("battleVfxLayer");
      const spriteEl = document.getElementById(side === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      const cloudsEl = document.getElementById(side === "player" ? "playerDynamaxClouds" : "rivalDynamaxClouds");
      const anchor = this.getSpriteAnchor(side);

      if (vfxContainer) {
        const dmaxStorm = document.createElement("div");
        dmaxStorm.className = "vfx-dynamax-storm";
        dmaxStorm.style.left = `${anchor.x}px`;
        dmaxStorm.style.top = `${anchor.y}px`;
        dmaxStorm.innerHTML = `
          <div class="dynamax-crimson-pillar"></div>
        `;
        vfxContainer.appendChild(dmaxStorm);
        setTimeout(() => dmaxStorm.remove(), 1200);
      }

      if (spriteEl) {
        spriteEl.classList.add("anim-dynamax-grow");
      }

      await this.delay(650);

      // If Gigantamax, swap sprite smoothly to G-Max sprite without disappearing
      if (isGigantamax && spriteEl) {
        const targetSrc = side === "player" ? (spriteBack || spriteFront) : (spriteFront || spriteBack);
        if (targetSrc) {
          const preImg = new Image();
          preImg.onload = () => {
            if (spriteEl) spriteEl.src = targetSrc;
          };
          preImg.onerror = () => {
            console.warn("Gigantamax sprite failed to load, keeping original sprite fallback.");
          };
          preImg.src = targetSrc;
          if (preImg.complete) {
            spriteEl.src = targetSrc;
          }
        }
      }

      if (spriteEl) {
        spriteEl.classList.remove("anim-dynamax-grow");
        spriteEl.classList.add("dynamax-scaled");
        spriteEl.classList.add(isGigantamax ? "gigantamax-aura" : "dynamax-aura");
      }

      if (cloudsEl) {
        cloudsEl.style.display = "block";
      }

      if (uiCallbacks && uiCallbacks.onHpUpdate) {
        await uiCallbacks.onHpUpdate(side, currentHp, maxHp);
      }

      if (uiCallbacks && uiCallbacks.onDynamaxStart) {
        uiCallbacks.onDynamaxStart(side, isGigantamax, name, currentHp, maxHp, dynamaxTurnsLeft);
      }

      await this.delay(450);
    }

    async playDynamaxEndAnimation(side, currentHp, maxHp, spriteFront, spriteBack, uiCallbacks) {
      const spriteEl = document.getElementById(side === "player" ? "playerPokemonSprite" : "rivalPokemonSprite");
      const cloudsEl = document.getElementById(side === "player" ? "playerDynamaxClouds" : "rivalDynamaxClouds");

      if (cloudsEl) {
        cloudsEl.style.display = "none";
      }

      if (spriteEl) {
        spriteEl.classList.remove("dynamax-scaled", "dynamax-aura", "gigantamax-aura");
        spriteEl.classList.add("anim-dynamax-shrink");
      }

      await this.delay(550);

      if (spriteEl) {
        const revertSrc = side === "player" ? (spriteBack || spriteFront) : (spriteFront || spriteBack);
        if (revertSrc) {
          const preImg = new Image();
          preImg.onload = () => {
            if (spriteEl) spriteEl.src = revertSrc;
          };
          preImg.src = revertSrc;
          if (preImg.complete) {
            spriteEl.src = revertSrc;
          }
        }
        spriteEl.classList.remove("anim-dynamax-shrink");
      }

      if (uiCallbacks && uiCallbacks.onHpUpdate) {
        await uiCallbacks.onHpUpdate(side, currentHp, maxHp);
      }

      if (uiCallbacks && uiCallbacks.onDynamaxEnd) {
        uiCallbacks.onDynamaxEnd(side, currentHp, maxHp);
      }

      await this.delay(400);
    }
  }

  return new CinematicAnimationPlayer();
});
