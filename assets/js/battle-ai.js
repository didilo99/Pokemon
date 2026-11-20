/**
 * Tactical Combat AI Module
 * Supports 3 difficulty levels: Easy, Normal, and Hard (Tactical).
 * Decides attack, switch, or item actions based only on legitimate public knowledge.
 * Compatible with Browser and Node.js.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    const BattleData = require("./battle-data.js");
    const BattleEngine = require("./battle-engine.js");
    module.exports = factory(BattleData, BattleEngine);
  } else {
    root.BattleAI = factory(root.BattleData, root.BattleEngine);
  }
})(
  typeof self !== "undefined" ? self : this,
  function (BattleData, BattleEngine) {
    "use strict";

    const { getTypeEffectiveness, calculateDamage, getEffectiveSpeed } =
      BattleEngine;
    const { canPokemonMegaEvolve, canPokemonDynamax, getBattleRules } =
      BattleData;

    /**
     * Decide the Rival AI's action for the turn.
     * @param {Object} state - Full or server battle state.
     * @param {string} difficulty - 'easy', 'normal', 'hard'
     * @returns {Object} Action object, e.g. { type: 'attack', moveIndex: 0, mega: false, dynamax: false }
     */
    function chooseRivalAction(state, difficulty = "normal") {
      const rivalActive = state.rivalTeam[state.rivalActiveIndex];
      const playerActive = state.playerTeam[state.playerActiveIndex];

      if (!rivalActive || rivalActive.isFainted) return null;

      const rules =
        state.rules ||
        (getBattleRules
          ? getBattleRules(state.format)
          : { allowMega: true, allowDynamax: true });
      const canMega = Boolean(
        !state.rivalMegaUsed &&
        rules.allowMega !== false &&
        canPokemonMegaEvolve &&
        canPokemonMegaEvolve(rivalActive, rules),
      );
      const canDynamax = Boolean(
        !state.rivalDynamaxUsed &&
        rules.allowDynamax !== false &&
        !rivalActive.isMega &&
        canPokemonDynamax &&
        canPokemonDynamax(rivalActive, rules),
      );

      // Filter usable moves (PP > 0)
      const validMoveIndices = [];
      rivalActive.moves.forEach((m, idx) => {
        if (m && m.currentPp > 0) validMoveIndices.push(idx);
      });

      if (validMoveIndices.length === 0) {
        // Struggle fallback
        return { type: "attack", moveIndex: 0, moveName: "struggle" };
      }

      // 1. EASY MODE (Casual / Principiante)
      // El rival juega de forma descuidada:
      // - Usa movimientos de forma 70% aleatoria (puede usar ataques poco eficaces o fallar táctica).
      // - Ocasionalmente usa estados o cura a destiempo.
      // - Rara vez cambia voluntariamente o transforma a su Pokémon en el mejor momento.
      if (difficulty === "easy") {
        const bench = state.rivalTeam
          .map((p, idx) => ({ p, idx }))
          .filter((x) => !x.p.isFainted && x.idx !== state.rivalActiveIndex);

        // 10% chance de cambio solo si está en peligro extremo (< 20% HP)
        if (
          bench.length > 0 &&
          rivalActive.currentHp < rivalActive.maxHp * 0.2 &&
          Math.random() < 0.1
        ) {
          const randBench = bench[Math.floor(Math.random() * bench.length)];
          return { type: "switch", targetIndex: randBench.idx };
        }

        let chosenMoveIdx;
        // 70% de las veces elige un movimiento al azar
        if (Math.random() < 0.7) {
          chosenMoveIdx =
            validMoveIndices[
              Math.floor(Math.random() * validMoveIndices.length)
            ];
        } else {
          // 30% elige el movimiento con mayor potencia base sin mirar tipos ni coberturas
          chosenMoveIdx = validMoveIndices.reduce((best, curr) => {
            const pCurr = rivalActive.moves[curr]?.power || 0;
            const pBest = rivalActive.moves[best]?.power || 0;
            return pCurr > pBest ? curr : best;
          }, validMoveIndices[0]);
        }

        // Transformaciones raras y tardías
        const useMega = canMega && Math.random() < 0.35;
        const useDynamax = !useMega && canDynamax && Math.random() < 0.25;
        return {
          type: "attack",
          moveIndex: chosenMoveIdx,
          mega: useMega,
          dynamax: useDynamax,
        };
      }

      // 2. NORMAL MODE (Equilibrado / Estándar Pokémon)
      // El rival juega con sentido común pero sin predicciones avanzadas:
      // - Prioriza ventaja de tipos y rematar rivales con poca vida.
      // - No usa movimientos inútiles o nulos (inmunidades).
      // - Se cura si está a mitad de vida.
      // - Usa Mega/Dynamax cuando está en buena posición.
      if (difficulty === "normal") {
        let bestMoveIdx = validMoveIndices[0];
        let bestScore = -999;

        for (const idx of validMoveIndices) {
          const move = rivalActive.moves[idx];
          let score = 0;

          if (move.category === "status") {
            // Curación inteligente
            if (move.healPercent) {
              if (rivalActive.currentHp < rivalActive.maxHp * 0.5) {
                score += 130;
              } else {
                score -= 60; // No curarse con vida llena
              }
            } else if (move.status) {
              // Inducir estado si el jugador no tiene uno
              if (!playerActive.status) {
                score += 90;
              } else {
                score -= 150; // Evitar repetir estado
              }
            } else if (move.statChanges || move.selfStatChanges) {
              const currentStage =
                rivalActive.stages.atk || rivalActive.stages.spa || 0;
              if (
                currentStage < 2 &&
                rivalActive.currentHp >= rivalActive.maxHp * 0.5
              ) {
                score += 70;
              } else {
                score += 15;
              }
            } else {
              score += 25;
            }
          } else {
            // Ataques con daño
            const eff = getTypeEffectiveness(move.type, playerActive.types);
            if (eff === 0) {
              score -= 600; // No usar ataques inmunes
            } else {
              const hasStab = rivalActive.types.includes(move.type) ? 1.5 : 1.0;
              score += (move.power || 50) * eff * hasStab;

              // Estimación de daño para rematar
              const est = calculateDamage(
                rivalActive,
                playerActive,
                move,
                state.field,
                90,
              );
              if (est.damage >= playerActive.currentHp) {
                score += 350; // ¡Rematar al jugador!
              }
            }
          }

          // Leve variabilidad (10-15 pts) para que no sea 100% monótono
          score += Math.random() * 12;

          if (score > bestScore) {
            bestScore = score;
            bestMoveIdx = idx;
          }
        }

        // En Normal: Mega evolución inmediata si está disponible
        const useMega = canMega;
        // Dynamax si el rival tiene buena salud (> 40%)
        const useDynamax =
          !useMega &&
          canDynamax &&
          rivalActive.currentHp >= rivalActive.maxHp * 0.4;

        return {
          type: "attack",
          moveIndex: bestMoveIdx,
          mega: useMega,
          dynamax: useDynamax,
        };
      }

      // 3. HARD / TACTICAL MODE (Competitivo VGC - Retador pero justo)
      // El rival juega como un jugador de nivel torneo:
      // - Análisis de velocidad efectiva y umbrales de noqueo (KO).
      // - Si es más rápido y remata con cualquier golpe, lo ejecuta con certeza.
      // - Si el jugador es más rápido y puede noquear al rival, el rival busca cambio defensivo o golpe con prioridad.
      // - Cambios de cobertura inteligentes hacia Pokémon que resistan al jugador.
      // - Sinergia de estados (quemar atacantes físicos, paralizar atacantes veloces).
      // - Uso óptimo de climas/terrenos y transformaciones (Mega/Dynamax).
      const rivalEffectiveSpeed = getEffectiveSpeed(rivalActive);
      const playerEffectiveSpeed = getEffectiveSpeed(playerActive);
      const bench = state.rivalTeam
        .map((p, idx) => ({ p, idx }))
        .filter((x) => !x.p.isFainted && x.idx !== state.rivalActiveIndex);

      // Calcular amenaza que sufre el rival actualmente
      const maxPlayerThreat = Math.max(
        ...playerActive.types.map((t) =>
          getTypeEffectiveness(t, rivalActive.types),
        ),
      );

      // Chequeo de cambio táctico:
      // Si el rival está en seria desventaja (debilidad x2/x4 o vida < 45% y superado en velocidad)
      if (
        bench.length > 0 &&
        ((maxPlayerThreat >= 2.0 &&
          rivalActive.currentHp < rivalActive.maxHp * 0.6) ||
          (rivalActive.currentHp < rivalActive.maxHp * 0.35 &&
            rivalEffectiveSpeed < playerEffectiveSpeed))
      ) {
        let bestSwitchCandidate = null;
        let lowestCandidateThreat = 999;
        let highestCandidateScore = -999;

        for (const candidate of bench) {
          const threatToCandidate = Math.max(
            ...playerActive.types.map((t) =>
              getTypeEffectiveness(t, candidate.p.types),
            ),
          );
          const candidateHpRatio = candidate.p.currentHp / candidate.p.maxHp;

          // Comprobar si el compañero tiene ventaja de tipos contra el jugador
          const bestCandidateOffensiveEff = Math.max(
            ...(candidate.p.moves || []).map((m) =>
              m ? getTypeEffectiveness(m.type, playerActive.types) : 0,
            ),
          );

          let candidateScore =
            (1.5 - threatToCandidate) * 100 +
            candidateHpRatio * 80 +
            bestCandidateOffensiveEff * 40;

          if (threatToCandidate <= 1.0 && candidateHpRatio > 0.4) {
            if (candidateScore > highestCandidateScore) {
              highestCandidateScore = candidateScore;
              lowestCandidateThreat = threatToCandidate;
              bestSwitchCandidate = candidate;
            }
          }
        }

        // Si encuentra un relevo sólido que resiste y está sano, 75% de probabilidad de cambio táctico
        if (
          bestSwitchCandidate &&
          lowestCandidateThreat < 1.0 &&
          Math.random() < 0.75
        ) {
          return { type: "switch", targetIndex: bestSwitchCandidate.idx };
        }
      }

      // Evaluación táctica de movimientos
      let bestMoveIdx = validMoveIndices[0];
      let bestScore = -999;

      for (const idx of validMoveIndices) {
        const move = rivalActive.moves[idx];
        let score = 0;

        if (move.category === "status") {
          // Movimientos de recuperación (Recover, Roost, Synthesis...)
          if (move.healPercent) {
            if (rivalActive.currentHp <= rivalActive.maxHp * 0.5) {
              score += 260;
              // Si además supera en velocidad, curarse es aún más seguro
              if (rivalEffectiveSpeed >= playerEffectiveSpeed) score += 60;
            } else {
              score -= 150; // Castigo por desperdiciar turno curándose con mucha vida
            }
          }

          // Alteraciones de estado (Parálisis, Quemadura, Tóxico, Sueño)
          if (move.status) {
            if (!playerActive.status) {
              score += 200;
              // Quemar a atacantes físicos prioritariamente
              if (
                move.status === "brn" &&
                (playerActive.baseStats.atk || 0) >=
                  (playerActive.baseStats.spa || 0)
              ) {
                score += 70;
              }
              // Paralizar si el jugador es más rápido para ganar el control de velocidad
              if (
                move.status === "par" &&
                playerEffectiveSpeed > rivalEffectiveSpeed
              ) {
                score += 80;
              }
            } else {
              score -= 500; // Nunca repetir estado sobre un objetivo ya alterado
            }
          }

          // Movimientos de boost/setup (Danza Espada, Maquinación, Paz Mental...)
          if (move.statChanges || move.selfStatChanges) {
            const currentStage = Math.max(
              rivalActive.stages.atk || 0,
              rivalActive.stages.spa || 0,
            );
            if (
              rivalActive.currentHp >= rivalActive.maxHp * 0.65 &&
              currentStage < 2
            ) {
              score += 170;
              if (maxPlayerThreat <= 1.0) score += 50; // Situación segura para boostearse
            } else {
              score -= 70; // Peligroso boostearse con poca vida o bajo alta amenaza
            }
          }
        } else {
          // Movimientos de ataque con daño directo
          const eff = getTypeEffectiveness(move.type, playerActive.types);
          if (eff === 0) {
            score -= 1000; // Jamás atacar con inmunidad
          } else {
            const est = calculateDamage(
              rivalActive,
              playerActive,
              move,
              state.field,
              90,
            );
            score += est.damage * 2.2;

            const isLethal = est.damage >= playerActive.currentHp;
            const isPriority = (move.priority || 0) > 0;

            // Si el golpe noquea al jugador:
            if (isLethal) {
              // Si el rival es más lento pero tiene prioridad que noquea, es la mejor jugada
              if (rivalEffectiveSpeed < playerEffectiveSpeed && isPriority) {
                score += 700;
              } else if (rivalEffectiveSpeed >= playerEffectiveSpeed) {
                score += 550; // Noquea antes de que el jugador se mueva
              } else {
                score += 400; // Noquea pero el jugador se moverá primero
              }
            }

            // Bonificación por movimiento STAB (mismo tipo que el Pokémon)
            if (rivalActive.types.includes(move.type)) {
              score += 35;
            }

            // Bonificación por daño supereficaz
            if (eff > 1.0) {
              score += 45 * eff;
            }
          }
        }

        // Variación mínima táctica (2-4 pts) para desempates lógicos sin azar caótico
        score += Math.random() * 4;

        if (score > bestScore) {
          bestScore = score;
          bestMoveIdx = idx;
        }
      }

      // Decisión de transformación en Modo Difícil:
      // Mega Evolución: activación inmediata (mejora de estadísticas sin contrapartida)
      const useMega = canMega;

      // Dynamax: activación táctica si está saludable (> 35% HP) y tiene ventaja o necesita resistir/barrer
      let useDynamax = false;
      if (
        !useMega &&
        canDynamax &&
        rivalActive.currentHp >= rivalActive.maxHp * 0.35
      ) {
        const hasSuperEffectiveMove = rivalActive.moves.some(
          (m) => m && getTypeEffectiveness(m.type, playerActive.types) > 1.0,
        );
        if (
          hasSuperEffectiveMove ||
          playerActive.currentHp > playerActive.maxHp * 0.45
        ) {
          useDynamax = true;
        }
      }

      return {
        type: "attack",
        moveIndex: bestMoveIdx,
        mega: useMega,
        dynamax: useDynamax,
      };
    }

    return {
      chooseRivalAction,
    };
  },
);
