document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://pokeapi.co/api/v2";

  // Cache
  let allPokemon = []; // para la búsqueda
  let currentPokemon = null; // { weight, baseSpeed, types, catchRate, speciesData }
  let lastSearchQuery = "";

  // DOM Elements - Secciones
  const searchInput = document.getElementById("pokemonSearch");
  const searchResultsDiv = document.createElement("div"); // Dropdown para resultados
  searchResultsDiv.className = "dex-dropdown-menu position-absolute w-100 shadow search-dropdown";
  searchResultsDiv.style.display = "none";
  searchResultsDiv.style.zIndex = "1000";
  searchResultsDiv.style.top = "100%";
  searchResultsDiv.style.left = "0";
  searchInput.parentNode.style.position = "relative";
  searchInput.parentNode.appendChild(searchResultsDiv);

  const pokemonSprite = document.getElementById("pokemonSprite");
  const spriteBox = document.getElementById("pokemonSpriteBox");
  const captureRateSpan = document.getElementById("captureRate");

  // DOM - HP y Estado
  const currentHpRange = document.getElementById("currentHpRange");
  const currentHpInput = document.getElementById("currentHp");
  const totalHpInput = document.getElementById("totalHp");
  const hpBarFill = document.getElementById("hpBarFill");
  const hpBarLabel = document.getElementById("hpBarLabel");
  const statusCondition = document.getElementById("statusCondition");

  // DOM - Poké Ball
  const pokeballSelect = document.getElementById("pokeball");
  const ballSprite = document.getElementById("ballSprite");
  const ballMultiplierSpan = document.getElementById("ballMultiplier");

  // DOM - Condicionales
  const conditionCards = document.querySelectorAll(".condition-card");
  const turnCount = document.getElementById("turnCount");
  const pokemonLevel = document.getElementById("pokemonLevel");
  const placeCondition = document.getElementById("placeCondition");
  const checkUnderwater = document.getElementById("underwater");
  const checkAlreadyCaught = document.getElementById("alreadyCaught");
  const myPokemonLevel = document.getElementById("myPokemonLevel");
  const pokedexCaught = document.getElementById("pokedexCaught");
  const checkLove = document.getElementById("loveCheck");

  // DOM - Resultado
  const calculateBtn = document.getElementById("calculateBtn");
  const resultValue = document.getElementById("resultValue");
  const resultBarFill = document.getElementById("resultBarFill");
  const detailedResults = document.getElementById("detailedResults");
  const probNormalDisp = document.getElementById("probNormal");
  const probCritSuccessDisp = document.getElementById("probCritSuccess");
  const probCritOccurDisp = document.getElementById("probCritOccur");
  const expectedShakesDisplay = document.getElementById("expectedShakesDisplay");
  
  const shakes = [
    document.getElementById("shake1"),
    document.getElementById("shake2"),
    document.getElementById("shake3"),
    document.getElementById("shake4")
  ];

  // List of moon-stone evolvers
  const moonStoneEvolvers = ["nidorina", "nidorino", "clefairy", "jigglypuff", "skitty", "munna"];
  
  // List of Ultra Beasts
  const ultraBeasts = [
    "nihilego", "buzzwole", "pheromosa", "xurkitree", "celesteela", "kartana", 
    "guzzlord", "poipole", "naganadel", "stakataka", "blacephalon"
  ];

  // INIT
  async function init() {
    loadPokemonList();
    setupEventListeners();
    updateConditionVisibility();
  }

  // EVENT LISTENERS
  function setupEventListeners() {
    // Custom Dropdown Search
    searchInput.addEventListener("input", handleSearchInput);
    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !searchResultsDiv.contains(e.target)) {
        searchResultsDiv.style.display = "none";
      }
    });

    // HP Sync (Porcentaje)
    currentHpRange.addEventListener("input", (e) => {
      currentHpInput.value = e.target.value;
      updateHpVisuals();
    });
    currentHpInput.addEventListener("input", (e) => {
      let val = parseInt(e.target.value) || 1;
      if (val > 100) val = 100;
      if (val < 1) val = 1;
      currentHpRange.value = val;
      updateHpVisuals();
    });

    // Level changes
    pokemonLevel.addEventListener("input", updateDynamicMultiplier);
    pokemonLevel.addEventListener("change", updateDynamicMultiplier);
    
    // HP Slider and Numeric inputs synchronization
    currentHpRange.addEventListener("input", () => {
      const tot = parseInt(totalHpInput.value) || 100;
      const pct = parseInt(currentHpRange.value);
      currentHpInput.value = Math.max(1, Math.floor(tot * (pct / 100)));
      updateHpVisuals();
    });

    totalHpInput.addEventListener("input", () => {
      updateHpVisuals();
    });

    pokemonLevel.addEventListener("input", () => {
      if (currentPokemon) {
        recalculateHpByLevel();
      }
    });

    // Ball Selection
    pokeballSelect.addEventListener("change", (e) => {
      const selectedOpt = e.target.options[e.target.selectedIndex];
      ballSprite.src = selectedOpt.dataset.sprite;
      updateConditionVisibility();
      updateDynamicMultiplier();
    });

    // Handle multiplier changes WITHOUT calculating probability
    const triggerInputs = [
      turnCount, pokemonLevel, placeCondition, checkUnderwater, 
      checkAlreadyCaught, myPokemonLevel, checkLove, pokedexCaught
    ].filter(i => i !== null);

    triggerInputs.forEach(i => i.addEventListener("input", updateDynamicMultiplier));
    triggerInputs.forEach(i => i.addEventListener("change", () => calculateCatchProbability(true)));

    const genSelect = document.getElementById("calcGeneration");
    if(genSelect) {
      genSelect.addEventListener("change", () => calculateCatchProbability(true));
    }

    // Calculate Button triggers the full animation
    calculateBtn.addEventListener("click", () => calculateCatchProbability(false));
  }

  function updateHpVisuals() {
    const curVal = parseInt(currentHpInput.value) || 1;
    const totVal = parseInt(totalHpInput.value) || 100;
    const pct = Math.min(100, Math.max(0, (curVal / totVal) * 100));

    hpBarFill.style.width = pct + "%";
    hpBarLabel.textContent = `${curVal} / ${totVal} (${Math.round(pct)}%)`;

    // Color code
    hpBarFill.className = "hp-bar-fill"; 
    if (pct <= 20) hpBarFill.classList.add("danger");
    else if (pct <= 50) hpBarFill.classList.add("warning");
  }

  function recalculateHpByLevel() {
    if (!currentPokemon) return;
    const lvl = parseInt(pokemonLevel.value) || 50;
    const oldPct = parseInt(currentHpRange.value) || 100;
    
    // HP = floor((2*Base + 25) * Level/100) + Level + 10
    const newMax = Math.floor((2 * currentPokemon.baseHp + 25) * (lvl / 100)) + lvl + 10;
    totalHpInput.value = newMax;
    currentHpInput.value = Math.max(1, Math.floor(newMax * (oldPct / 100)));
    updateHpVisuals();
  }



  function toggleDisplay(id, displayValue) {
    const el = document.getElementById(id);
    if (el) el.style.display = displayValue;
  }

  // VISIBILITY LÓGICA
  function updateConditionVisibility() {
    const ball = pokeballSelect.value;
    
    // Hide all
    conditionCards.forEach(c => c.style.display = "none");

    // Show specific
    if (ball === "timer-ball") toggleDisplay("condTimerBall", "flex");
    if (ball === "nest-ball") toggleDisplay("condTargetLevel", "flex");
    if (ball === "dusk-ball") toggleDisplay("condDuskBall", "flex");
    if (ball === "dive-ball") toggleDisplay("condDiveBall", "flex");
    if (ball === "repeat-ball") toggleDisplay("condRepeatBall", "flex");
    if (ball === "level-ball") toggleDisplay("condMyLevel", "flex");
    if (ball === "love-ball") toggleDisplay("condLoveBall", "flex");
    if (ball === "quick-ball") toggleDisplay("condTimerBall", "flex");

    // Pokedex bonus exists from Gen 5 onwards
    const genVal = getActiveGen();
    if (genVal >= 5) {
      toggleDisplay("condPokedex", "flex");
    } else {
      toggleDisplay("condPokedex", "none");
    }
  }

  function getActiveGen() {
    const gs = document.getElementById("calcGeneration");
    if (!gs) return 9;
    const v = gs.value;
    if (v === "gen1") return 1;
    if (v === "gen2") return 2;
    if (v.includes("3") || v.includes("4")) return 4;
    if (v.includes("5") || v.includes("6")) return 6;
    if (v.includes("7")) return 7;
    if (v.includes("8") || v.includes("9")) return 9;
    return 9;
  }

  // DYNAMIC MULTIPLIER CALCULATION
  function updateDynamicMultiplier() {
    const ball = pokeballSelect.value;
    const targetLvl = parseInt(pokemonLevel.value) || 1;
    let mult = 1.0;
    let isAdditive = false;

    // Default static multipliers list
    const staticMultipliers = {
      "poke-ball": 1.0, "great-ball": 1.5, "ultra-ball": 2.0, "master-ball": 255.0,
      "safari-ball": 1.5, "sport-ball": 1.5, "premier-ball": 1.0, "luxury-ball": 1.0,
      "heal-ball": 1.0, "friend-ball": 1.0
    };

    if (staticMultipliers[ball]) {
      mult = staticMultipliers[ball];
    } else {
      // Dynamic logic
      if (ball === "net-ball") {
        if (currentPokemon && (currentPokemon.types.includes("water") || currentPokemon.types.includes("bug"))) {
          mult = 3.5;
        }
      } 
      else if (ball === "nest-ball") {
        mult = Math.max(1.0, (40 - targetLvl) / 10);
        mult = Math.min(3.0, mult);
      }
      else if (ball === "repeat-ball") {
        mult = checkAlreadyCaught.checked ? 3.5 : 1.0;
      }
      else if (ball === "timer-ball") {
        const t = parseInt(turnCount.value) || 1;
        // Gen 5+ scale: 1 + (t * 1229 / 4096). Max 4.0
        mult = 1.0 + ((t - 1) * 1229 / 4096);
        if (mult > 4) mult = 4.0;
      }
      else if (ball === "dusk-ball") {
        mult = (placeCondition.value !== "normal") ? 3.0 : 1.0;
      }
      else if (ball === "dive-ball") {
        mult = checkUnderwater.checked ? 3.5 : 1.0;
      }
      else if (ball === "quick-ball") {
        const t = parseInt(turnCount.value) || 1;
        mult = (t === 1) ? 5.0 : 1.0;
        // Force show turns if Quick Ball selected so user can see it only works on turn 1
        // (Just logical behind the scene. Turn card is not open, assuming Turn 1 always if not shown)
        const currentTurn = document.getElementById("condTimerBall").style.display === "flex" ? t : 1;
        mult = (currentTurn === 1) ? 5.0 : 1.0; 
      }
      else if (ball === "fast-ball") {
        if (currentPokemon && currentPokemon.baseSpeed >= 100) mult = 4.0;
      }
      else if (ball === "level-ball") {
        const myLvl = parseInt(myPokemonLevel.value) || 1;
        if (myLvl <= targetLvl) mult = 1.0;
        else if (myLvl > targetLvl && myLvl < targetLvl * 2) mult = 2.0;
        else if (myLvl >= targetLvl * 2 && myLvl < targetLvl * 4) mult = 4.0;
        else if (myLvl >= targetLvl * 4) mult = 8.0;
      }
      else if (ball === "love-ball") {
        mult = checkLove.checked ? 8.0 : 1.0;
      }
      else if (ball === "moon-ball") {
        if (currentPokemon && moonStoneEvolvers.includes(currentPokemon.name)) mult = 4.0;
      }
      else if (ball === "dream-ball") {
        mult = (statusCondition.value === "sleep") ? 4.0 : 1.0;
      }
      else if (ball === "beast-ball") {
        if (currentPokemon && ultraBeasts.includes(currentPokemon.name)) mult = 5.0;
        else mult = 0.1;
      }
      else if (ball === "heavy-ball") {
        isAdditive = true;
        mult = 0;
        if (currentPokemon) {
          const w = currentPokemon.weight; // weight in kg
          // Pokemon SM/SwSh mechanics
          if (w < 100) mult = -20;
          else if (w >= 100 && w < 200) mult = 0;
          else if (w >= 200 && w < 300) mult = 20;
          else if (w >= 300) mult = 30; // 300kg+ = +30
        }
      }
    }

    if (isAdditive) {
      const sign = mult >= 0 ? "+" : "";
      ballMultiplierSpan.textContent = `${sign}${mult} Ratio`;
      ballMultiplierSpan.classList.add("text-warning");
      ballMultiplierSpan.parentElement.classList.add("additive-mode");
    } else {
      let txt = mult === 255 ? I18n.t("capture_calc.guaranteed") : `×${mult.toFixed(2).replace(/\.00$/, "")}`;
      ballMultiplierSpan.textContent = txt;
      ballMultiplierSpan.classList.remove("text-warning");
      ballMultiplierSpan.parentElement.classList.remove("additive-mode");
    }

    return { mult, isAdditive };
  }

  // DATA FETCHING
  async function loadPokemonList() {
    try {
      const res = await window.fetchCached("https://pokeapi.co/api/v2/pokemon?limit=1025");
      if (res && res.results) {
        allPokemon = res.results;
      }
    } catch(e) {
      console.error(e);
    }
  }

  function handleSearchInput(e) {
    const q = e.target.value.toLowerCase().trim();
    if (!q || allPokemon.length === 0) {
      searchResultsDiv.style.display = "none";
      return;
    }

    const matched = allPokemon.filter(p => p.name.includes(q)).slice(0, 10);
    
    searchResultsDiv.innerHTML = "";
    if (matched.length === 0) {
      searchResultsDiv.style.display = "none";
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list-unstyled mb-0";
    matched.forEach(p => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.className = "dropdown-item rounded pointer text-capitalize";
      a.textContent = p.name.replace(/-/g, " ");
      a.href = "#";
      a.onclick = (e) => {
        e.preventDefault();
        selectPokemon(p.name);
      };
      li.appendChild(a);
      ul.appendChild(li);
    });

    searchResultsDiv.appendChild(ul);
    searchResultsDiv.style.display = "block";
  }

  async function selectPokemon(name) {
    searchInput.value = name.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    searchResultsDiv.style.display = "none";
    
    // UI Blocking
    calculateBtn.disabled = true;
    searchInput.disabled = true;
    document.getElementById("sectionPokemon").classList.add("is-loading");
    document.getElementById("sectionStatus").classList.add("is-loading");

    // UI Loading state
    spriteBox.querySelector(".sprite-placeholder").style.display = "flex";
    pokemonSprite.style.display = "none";
    pokemonSprite.style.opacity = "0.5";
    captureRateSpan.textContent = I18n.t("common.loading");

    try {
      const pokeData = await window.fetchCached(`${API_BASE}/pokemon/${name}`);
      const speciesData = await window.fetchCached(pokeData.species.url);

      currentPokemon = {
        name: pokeData.name,
        weight: pokeData.weight / 10, 
        baseSpeed: pokeData.stats.find(s => s.stat.name === 'speed')?.base_stat || 50,
        baseHp: pokeData.stats.find(s => s.stat.name === 'hp')?.base_stat || 50,
        types: pokeData.types.map(t => t.type.name),
        catchRate: speciesData.capture_rate,
        speciesData: speciesData
      };

      // Set default HP values based on base stats and level 50
      const level = 50;
      pokemonLevel.value = level;
      const estHp = Math.floor((2 * currentPokemon.baseHp + 25) * (level / 100)) + level + 10;
      totalHpInput.value = estHp;
      currentHpInput.value = estHp;
      updateHpVisuals();

      captureRateSpan.textContent = currentPokemon.catchRate;

      let spriteUrl = pokeData.sprites.other["official-artwork"].front_default 
        || pokeData.sprites.front_default;
      
      pokemonSprite.src = spriteUrl;
      pokemonSprite.onload = () => {
        spriteBox.querySelector(".sprite-placeholder").style.display = "none";
        pokemonSprite.style.display = "block";
        pokemonSprite.style.opacity = "1";
      };

      updateConditionVisibility();
      updateDynamicMultiplier();
      calculateCatchProbability();
    } catch (e) {
      console.error(e);
      captureRateSpan.textContent = I18n.t("common.error_loading");
    } finally {
      // Re-enable UI
      calculateBtn.disabled = false;
      searchInput.disabled = false;
      document.getElementById("sectionPokemon").classList.remove("is-loading");
      document.getElementById("sectionStatus").classList.remove("is-loading");
    }
  }

  // ALGORITMO DE CAPTURA
  function calculateCatchProbability(isQuiet = false) {
    if (!currentPokemon) {
      alert(I18n.t("capture_calc.error_select_pokemon"));
      return;
    }
    const gen = document.getElementById("calcGeneration") ? document.getElementById("calcGeneration").value : "modern";
    const genNum = getActiveGen();
    const { mult, isAdditive } = updateDynamicMultiplier();
    
    let HP_max = parseInt(totalHpInput.value) || 100;
    if (HP_max < 1) HP_max = 1;
    let HP_current = parseInt(currentHpInput.value) || 1;
    if (HP_current > HP_max) {
      HP_current = HP_max;
      currentHpInput.value = HP_current;
      updateHpVisuals();
    }
    const targetLevelValue = parseInt(pokemonLevel.value) || 1;

    // Status Modifier
    let statusMod = 1.0;
    const s = statusCondition.value;
    // Según instrucciones: 2.0 para Dormido/Congelado, 1.5 para Paralizado/Quemado/Envenenado
    if (s === "sleep" || s === "freeze") statusMod = 2.0;
    else if (s === "paralysis" || s === "burn" || s === "poison") statusMod = 1.5;

    // Base Catch Rate
    let catchRate = currentPokemon.catchRate;
    let ballMod = mult;

    if (isAdditive) {
      catchRate = Math.max(1, Math.min(255, catchRate + mult));
      ballMod = 1.0; 
    }

    let A = 0;
    let B = 0;
    let probShake = 0;
    let finalPercent = 0;
    let expectedShakes = 0;
    let detailsText = "";

    // Additional result displays
    let p_norm_val = 0;
    let p_crit_success_val = 0;
    let p_crit_occur_val = 0;

    // GEN 1 Logic
    if (genNum === 1) {
      // Official-like Gen 1 algorithm simplified
      // Step 1: Status
      const statusBonus = (s === "sleep" || s === "freeze") ? 25 : (s === "none" ? 0 : 12);
      
      // Step 2: Probability A
      A = Math.floor((HP_max * 255 * 4) / HP_current);
      if (A > 255) A = 255;
      if (pokeballSelect.value === "master-ball") A = 255;
      
      let P_main = A / 256;
      // Combine with status (in Gen 1 status check happens first)
      let P_status = statusBonus / 256;
      finalPercent = (P_status + (1 - P_status) * P_main) * 100;
      
      expectedShakes = (Math.random() < (finalPercent / 100)) ? 4 : 0;
      
      detailsText = `Fórmula usada: GEN 1 (Red/Blue/Yellow)\n` +
                    `Status Bonus: ${statusBonus}/256\n` +
                    `Valor A (HP): ${A}/256\n` +
                    `Cálculo: Prob_Status + (1-Prob_Status)*Prob_A\n\n` +
                    `⚠️ APROXIMACIONES:\n` +
                    `- Simulando lógica oficial de Gen 1 corregida.`;
    } 
    // GEN 2 Logic
    else if (genNum === 2) {
      let ratio = Math.floor(catchRate / 3);
      if (ratio < 1) ratio = 1;
      A = Math.floor(((3 * HP_max - 2 * HP_current) * ratio) / (3 * HP_max));
      if (A > 255) A = 255;
      
      // Special Ball bonuses in Gen 2 are varied, but here we treat Ultra/Great as flat additions
      let BonoBall = (pokeballSelect.value === "ultra-ball") ? 150 : (pokeballSelect.value === "great-ball" ? 100 : 0);
      let statusBonusVal = (s === "sleep" || s === "freeze") ? 10 : (s === "none" ? 0 : 5);
      
      let ValB = Math.min(255, A + BonoBall + statusBonusVal);
      finalPercent = (ValB / 256) * 100;
      expectedShakes = (Math.random() < (ValB / 256)) ? 4 : 0;

      detailsText = `Fórmula usada: GEN 2 (Gold/Silver/Crystal)\n` +
                    `Valor A = ${A} | Bono Ball = ${BonoBall} | Status = ${statusBonusVal}\n` +
                    `Valor B = min(255, A + BonoBall + Status) = ${ValB}\n` +
                    `Probabilidad = ${finalPercent.toFixed(2)}%\n`;
    }
    // MODERN GEN (3-9)
    else {
      // Step 1: Base A
      A = (((3 * HP_max - 2 * HP_current) * catchRate * ballMod) / (3 * HP_max)) * statusMod;
      
      // Step 2: Gen 8+ Level Modifier
      let levelMod = 1.0;
      if (getActiveGen() >= 8 && targetLevelValue < 30) {
        levelMod = Math.max(0.01, (30 - targetLevelValue) / 25);
        A = A * levelMod;
      }

      // Step 3: Critical Capture (Gen 5+)
      let p_crit_occur = 0;
      let a_cc = 0;
      if (genNum >= 5) {
        const caught = parseInt(pokedexCaught.value) || 0;
        let dexMult = 0;
        if (caught > 600) dexMult = 2.5;
        else if (caught > 450) dexMult = 2.0;
        else if (caught > 300) dexMult = 1.5;
        else if (caught > 150) dexMult = 1.0;
        else if (caught > 30) dexMult = 0.5;
        
        a_cc = Math.floor(Math.min(255, A) * dexMult);
        p_crit_occur = a_cc / 256;
      }
      p_crit_occur_val = p_crit_occur * 100;

      // Step 4: Shake Probability B
      if (A >= 255 || pokeballSelect.value === "master-ball") {
        finalPercent = 100;
        p_norm_val = 100;
        expectedShakes = 4;
        detailsText = `Fórmula usada: MODERNA (Gen ${genNum})\n` +
                      `Valor A = ${A.toFixed(2)} (>= 255) -> Captura Garantizada.`;
      } else {
        B = Math.floor(65536 / Math.pow(255 / A, 0.25));
        probShake = B / 65536;
        let p_norm = Math.pow(probShake, 4);
        p_norm_val = p_norm * 100;
        p_crit_success_val = probShake * 100;
        
        // P_comb = (p_crit_occur * p_shake) + ((1 - p_crit_occur) * p_norm)
        let p_comb = (p_crit_occur * probShake) + ((1 - p_crit_occur) * p_norm);
        finalPercent = p_comb * 100;

        // Simulate Outcome
        const r_crit = Math.random();
        if (r_crit < p_crit_occur) {
          expectedShakes = (Math.random() < probShake) ? 4 : 0;
        } else {
          const r_norm = Math.random();
          if (r_norm < p_norm) expectedShakes = 4;
          else {
            if (r_norm < probShake) expectedShakes = 1;
            else if (r_norm < Math.pow(probShake, 2)) expectedShakes = 2;
            else if (r_norm < Math.pow(probShake, 3)) expectedShakes = 3;
          }
        }

        detailsText = `Fórmula usada: MODERNA (Gen ${genNum})\n` +
                      `Valor A = ${A.toFixed(2)} | Valor B = ${B}\n` +
                      `Prob. Shake (B/65536) = ${probShake.toFixed(4)}\n` +
                      `Modificador Gen 8 (<30): x${levelMod.toFixed(2)}\n\n` +
                      `CAPTURA CRÍTICA:\n` +
                      `- Bono Pokédex: x${(a_cc / (Math.min(255, A) || 1)).toFixed(1)}\n` +
                      `- Valor a_cc = ${a_cc}\n` +
                      `- Prob. Ocurrencia Crítica: ${(p_crit_occur * 100).toFixed(2)}%\n` +
                      `- Prob. Captura Crítica (1 shake): ${(p_crit_occur * probShake * 100).toFixed(2)}%\n\n` +
                      `PROBABILIDAD COMBINADA: ${finalPercent.toFixed(2)}%\n`;
      }
    }

    const captureMessage = document.getElementById("captureMessage");
    if (!isQuiet) {
      animateResult(finalPercent.toFixed(2), expectedShakes);
    } else {
      resultValue.textContent = `${finalPercent.toFixed(2)}%`;
      resultBarFill.style.width = `${finalPercent.toFixed(2)}%`;
      if (captureMessage) {
        captureMessage.classList.remove("show");
        captureMessage.style.display = "none";
      }
    }

    // Detailed results update
    if (detailedResults) {
      detailedResults.style.display = "block";
      probNormalDisp.textContent = `${p_norm_val.toFixed(2)}%`;
      probCritSuccessDisp.textContent = `${p_crit_success_val.toFixed(2)}%`;
      probCritOccurDisp.textContent = `${p_crit_occur_val.toFixed(2)}%`;
      expectedShakesDisplay.textContent = expectedShakes;
    }

    const detailsDiv = document.getElementById("calcDetails");
    const detailsContent = document.getElementById("calcDetailsContent");
    if (detailsDiv && detailsContent) {
      detailsDiv.style.display = "block";
      detailsContent.textContent = detailsText;
    }
  }

  function animateResult(percent, shakesCount) {
    const gen = document.getElementById("calcGeneration") ? document.getElementById("calcGeneration").value : "modern";
    const shakeContainer = document.querySelector(".shake-checks");
    if (shakeContainer) {
      shakeContainer.style.display = (gen === "gen1") ? "none" : "flex";
    }



    resultValue.textContent = `${percent}%`;
    resultBarFill.style.width = `0%`; // reset
    resultBarFill.className = "result-bar-fill";
    
    // Hide capture message if it was shown
    const captureMessage = document.getElementById("captureMessage");
    if (captureMessage) {
      captureMessage.classList.remove("show");
      captureMessage.style.display = "none";
    }
    
    // Delay to let browser paint reset
    setTimeout(() => {
      resultBarFill.style.width = `${percent}%`;
      if (percent < 30) resultBarFill.classList.add("danger");
      else if (percent < 60) resultBarFill.classList.add("warning");
      else resultBarFill.classList.add("success");
    }, 50);

    // Shakes animation
    shakes.forEach((el, index) => {
      el.className = "shake-check"; // reset
      setTimeout(() => {
        if (index < shakesCount) {
          el.classList.add("success");
          // If 4th shake successful, show captured message
          if (index === 3 && shakesCount === 4 && captureMessage) {
            setTimeout(() => {
              captureMessage.style.display = "flex"; // Changed from block for vertical centering
              setTimeout(() => captureMessage.classList.add("show"), 50);
            }, 500);
          }
        } else if (index === shakesCount && index < 4) {
          el.classList.add("fail");
        }
      }, index * 400 + 300);
    });
  }

  // Launch initial setup
  init();
});
