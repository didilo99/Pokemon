/**
 * Pokedex App
 * Refactored for performance, accessibility, and code quality.
 */

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const fmtId = (i) => "#" + String(i).padStart(4, "0");
const toTitle = (s) =>
  s.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

document.addEventListener("error", function(e) {
  if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === "img") {
    if (e.target.classList.contains("item-icon-small") || e.target.classList.contains("ts-icon")) {
      e.target.style.display = "none";
    }
  }
}, true);

// --- Constants ---
/* 
  =============================================================================
  CONFIGURACIÓN PRINCIPAL DE JAVASCRIPT
  - API_URL: Cambia esta URL si tienes tu propio servidor de PokeAPI local 
             o quieres apuntar a una versión diferente de la API.
  - FALLBACK_IMAGE: Imagen mostrada por defecto si un Pokémon no tiene sprite.
  =============================================================================
*/
const CONSTANTS = {
  API_URL: "https://pokeapi.co/api/v2",
  STORAGE_KEY: "pokedex_ui_v3",
  FALLBACK_LANG: "en",
  FALLBACK_IMAGE:
    (window.I18n ? I18n.getBasePath() : "") +
    "assets/img/fallback/fallback.png",
};

const API_URL = CONSTANTS.API_URL; // Kept for compatibility
// Default TYPE_LIST (fallback) — dynamically updated at init via discoverDynamicLists()
let TYPE_LIST = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];
// Default REGION_KEYS (fallback) — dynamically updated at init
let REGION_KEYS = [
  "kanto",
  "johto",
  "hoenn",
  "sinnoh",
  "unova",
  "kalos",
  "alola",
  "galar",
  "hisui",
  "paldea",
];

const ALLOWED_ITEM_CATEGORIES = [
  "held-items",
  "choice",
  "effort-training",
  "bad-held-items",
  "training",
  "plates",
  "species-specific",
  "type-enhancement",
  "jewels",
  "mega-stones",
  "memories",
  "z-crystals",
  "in-a-pinch",
  "picky-healing",
  "type-protection",
  "stat-boosts",
  "healing",
  "status-cures",
  "revival",
  "pp-recovery",
  "nature-mints",
  "vitamins",
  "special-balls",
  "standard-balls",
  "apricorn-balls",
  "evolution",
];

// Form change requirements for special forms
// Note: Requirements moved to i18n/*.json under "forms.requirements_data"
const FORM_REQUIREMENTS = {}; // Deprecated, mapping now in JSON

// --- State Management ---
const state = {
  index: [],
  includeForms: false,
  gridShiny: false,
  showTeams: true,
  selectedTypes: new Set(),
  typeMode: "or",
  region: "all",
  search: "",
  perPage: 102,
  page: 1,
  filteredNames: [],
  details: new Map(),
  species: new Map(),
  typeSets: new Map(),
  regionSets: new Map(),
  typeInfo: new Map(),
  sort: "id-asc",
  bst: new Map(),
  lastOpenedName: null,
  evoChains: new Map(),
  favorites: new Set(),
  team: [],
  rivalTeam: [], // Rival team support
  activeTeam: "user", // 'user' or 'rival'
  showOnlyFavorites: false,
  minBST: 0,
  minSpeed: 0,
  generation: "all",
  genSets: new Map(),
  indexData: [], // Initialized
};

// Default GEN_KEYS (fallback) — dynamically updated at init
let GEN_KEYS = [
  "generation-i",
  "generation-ii",
  "generation-iii",
  "generation-iv",
  "generation-v",
  "generation-vi",
  "generation-vii",
  "generation-viii",
  "generation-ix",
];

/**
 * Discovers types, regions, and generations dynamically from the API.
 * Updates TYPE_LIST, REGION_KEYS, GEN_KEYS and the HTML select options.
 * This ensures future additions (e.g. Gen X, Stellar type) are auto-detected.
 */
async function discoverDynamicLists() {
  try {
    // --- Types ---
    const typesRes = await window.fetchCached(`${API_URL}/type?limit=100`);
    if (typesRes?.results) {
      // Filter out dummy/shadow/unknown types (id > 10000 or name contains 'unknown'/'shadow')
      const validTypes = typesRes.results
        .map(t => t.name)
        .filter(name => name !== 'unknown' && name !== 'shadow' && !name.startsWith('???'));
      if (validTypes.length >= TYPE_LIST.length) {
        TYPE_LIST = validTypes;
      }
    }

    // --- Regions ---
    const regionsRes = await window.fetchCached(`${API_URL}/region?limit=100`);
    if (regionsRes?.results) {
      const apiRegions = regionsRes.results.map(r => r.name);
      if (apiRegions.length >= REGION_KEYS.length) {
        REGION_KEYS = apiRegions;
        // Update region <select> if it exists
        const regionSelect = document.getElementById('region');
        if (regionSelect) {
          const currentValue = regionSelect.value;
          // Keep "all" option, rebuild the rest
          const allOption = regionSelect.querySelector('option[value="all"]');
          regionSelect.innerHTML = '';
          if (allOption) regionSelect.appendChild(allOption);
          for (const rk of REGION_KEYS) {
            const opt = document.createElement('option');
            opt.value = rk;
            opt.textContent = I18n.t(`regions.names.${rk}`) || toTitle(rk);
            opt.setAttribute('data-i18n', `regions.names.${rk}`);
            regionSelect.appendChild(opt);
          }
          regionSelect.value = currentValue;
        }
      }
    }

    // --- Generations ---
    const gensRes = await window.fetchCached(`${API_URL}/generation?limit=100`);
    if (gensRes?.results) {
      const apiGens = gensRes.results.map(g => g.name);
      if (apiGens.length >= GEN_KEYS.length) {
        GEN_KEYS = apiGens;
        // Update generation <select> if it exists
        const genSelect = document.getElementById('generation');
        if (genSelect) {
          const currentValue = genSelect.value;
          const allOption = genSelect.querySelector('option[value="all"]');
          genSelect.innerHTML = '';
          if (allOption) genSelect.appendChild(allOption);
          for (let i = 0; i < GEN_KEYS.length; i++) {
            const gk = GEN_KEYS[i];
            const opt = document.createElement('option');
            opt.value = gk;
            const label = I18n.t(`regions.gen_names.gen${i + 1}`);
            opt.textContent = label && !label.startsWith('regions.') ? label : `Gen ${i + 1}`;
            genSelect.appendChild(opt);
          }
          genSelect.value = currentValue;
        }
      }
    }
  } catch (e) {
    console.warn('discoverDynamicLists: Using fallback constants', e);
  }
}

// Map specific items to species (for both Recommendation and Visibility)
const SIGNATURE_ITEM_MAP = {
  "light-ball": ["pikachu"],
  "thick-club": ["cubone", "marowak"],
  "lucky-punch": ["chansey"],
  stick: ["farfetchd", "sirfetchd"],
  leek: ["farfetchd", "sirfetchd"],
  "metal-powder": ["ditto"],
  "quick-powder": ["ditto"],
  "deep-sea-scale": ["clamperl"],
  "deep-sea-tooth": ["clamperl"],
  "adamant-orb": ["dialga"],
  "lustrous-orb": ["palkia"],
  "griseous-orb": ["giratina"],
  "soul-dew": ["latios", "latias"],
  "rusted-sword": ["zacian"],
  "rusted-shield": ["zamazenta"],
  "vile-vial": ["pecharunt"],
  "pikanium-z": ["pikachu"],
  "pikashunium-z": ["pikachu"],
  "aloraichium-z": ["raichu-alola"],
  "decidium-z": ["decidueye"],
  "incinium-z": ["incineroar"],
  "primarium-z": ["primarina"],
  "tapunium-z": ["tapu-koko", "tapu-lele", "tapu-bulu", "tapu-fini"],
  "mimikium-z": ["mimikyu"],
  "lycanium-z": ["lycanroc"],
  "kommonium-z": ["kommo-o"],
  "solganium-z": ["solgaleo"],
  "lunalium-z": ["lunala"],
  "ultranecrozium-z": ["necrozma"],
  "marshadium-z": ["marshadow"],
  "mewnium-z": ["mew"],
  "snorlium-z": ["snorlax"],
  "eeevium-z": ["eevee"],
};

const STORAGE_KEY = "pokedex_ui_v3";

function saveSettings() {
  const data = {
    includeForms: state.includeForms,
    gridShiny: state.gridShiny,
    showTeams: state.showTeams,
    selectedTypes: [...state.selectedTypes],
    typeMode: state.typeMode,
    region: state.region,
    sort: state.sort,
    perPage: state.perPage,
    favorites: [...state.favorites],
    team: state.team,
    rivalTeam: state.rivalTeam, // Added
    activeTeam: state.activeTeam, // Added
    showOnlyFavorites: state.showOnlyFavorites,
    minBST: state.minBST,
    minSpeed: state.minSpeed,
    generation: state.generation,
    page: state.page,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    state.includeForms = !!s.includeForms;
    state.gridShiny = !!s.gridShiny;
    state.showTeams = s.showTeams !== undefined ? !!s.showTeams : true;
    state.selectedTypes = new Set(s.selectedTypes || []);
    state.typeMode = s.typeMode || state.typeMode;
    state.region = s.region || state.region;
    state.sort = s.sort || state.sort;
    state.perPage = Number(s.perPage) || state.perPage;
    state.favorites = new Set(s.favorites || []);
    const loadTeamData = (teamSource) => {
      if (!Array.isArray(teamSource)) return [];
      return teamSource.map((t) => {
        if (typeof t === "string") {
          return {
            name: t,
            moves: [null, null, null, null],
            item: null,
            nature: "hardy",
            level: 50,
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            id: Date.now() + Math.random(),
          };
        }
        return t;
      });
    };
    state.team = loadTeamData(s.team);
    state.rivalTeam = loadTeamData(s.rivalTeam);
    state.activeTeam = s.activeTeam || "user";
    state.showOnlyFavorites = !!s.showOnlyFavorites;
    state.minBST = Number(s.minBST || 0);
    state.minSpeed = Number(s.minSpeed || 0);
    state.generation = s.generation || "all";
    state.page = Number(s.page) || 1;
  } catch (e) {}
}

// --- API Layer ---

// Simple Request Queue to prevent rate limiting
const MAX_CONCURRENT_REQUESTS = 3;
let activeRequests = 0;
const requestQueue = [];

function processQueue() {
  if (requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS)
    return;

  const { task, resolve, reject } = requestQueue.shift();
  activeRequests++;

  task()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      activeRequests--;
      processQueue();
    });
}

function enqueueRequest(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ task, resolve, reject });
    processQueue();
  });
}

async function fetchJSON(url, tries = 3, delay = 500) {
  // Use the new caching layer
  // We wrap it in the retry logic just in case, but fetchCached handles the fetch.
  // Actually, fetchCached doesn't have retry logic built-in for network errors,
  // but for now let's trust the cache or single fetch.
  // If we want to keep retry logic, we should move it inside fetchCached or wrap it here.
  // For simplicity and performance, let's use fetchCached directly for most things.
  // However, existing code expects fetchJSON to handle retries.

  return enqueueRequest(async () => {
    for (let i = 0; i < tries; i++) {
      try {
        return await window.fetchCached(url);
      } catch (e) {
        if (i === tries - 1) throw e;
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
      }
    }
  });
}

async function loadIndex() {
  const [res, formRes] = await Promise.all([
    window.fetchCached(`${API_URL}/pokemon?limit=10000&offset=0`),
    window.fetchCached(`${API_URL}/pokemon-form?limit=10000&offset=0`).catch(() => ({ results: [] })),
  ]);

  const indexData = res.results.map((p) => {
    const parts = p.url.split("/").filter(Boolean);
    return {
      name: p.name,
      id: parseInt(parts[parts.length - 1], 10),
      isForm: false,
    };
  });

  // Add morphological forms intelligently to avoid duplicates with varieties
  if (formRes && formRes.results) {
    formRes.results.forEach((f) => {
      const parts = f.url.split("/").filter(Boolean);
      const id = parseInt(parts[parts.length - 1], 10);
      
      // Heuristic: If we already have a variety with this name, or a variety with this ID 
      // whose name is a prefix of this form (e.g. variety "cherrim" and form "cherrim-overcast"),
      // skip the form as it's likely a redundant "default" visual.
      const isDuplicate = indexData.some(p => p.name === f.name) || 
                          indexData.some(p => p.id === id && (f.name === p.name || f.name.startsWith(p.name + "-")));
      
      if (!isDuplicate) {
        indexData.push({
          name: f.name,
          id: id,
          isForm: true,
        });
      }
    });
  }

  state.indexData = indexData;
  state.index = indexData.map((p) => p.name);
}

async function loadTypeSets() {
  await Promise.all(
    TYPE_LIST.map(async (t) => {
      const d = await fetchJSON(`${API_URL}/type/${t}`);
      state.typeSets.set(t, new Set(d.pokemon.map((p) => p.pokemon.name)));
      state.typeInfo.set(t, d);
    }),
  );
}

async function loadRegions() {
  for (const key of REGION_KEYS) {
    try {
      const region = await fetchJSON(`${API_URL}/region/${key}`);
      const species = new Set();
      for (const pdx of region.pokedexes) {
        const url = pdx.url || `${API_URL}/pokedex/${pdx.name}`;
        try {
          const pd = await fetchJSON(url);
          for (const e of pd.pokemon_entries)
            species.add(e.pokemon_species.name);
        } catch {}
      }
      state.regionSets.set(key, species);
    } catch {}
  }
}

async function loadGenerations() {
  for (const key of GEN_KEYS) {
    try {
      const genData = await fetchJSON(`${API_URL}/generation/${key}`);
      const species = new Set();
      for (const s of genData.pokemon_species) {
        species.add(s.name);
      }
      state.genSets.set(key, species);
    } catch (e) {}
  }
}
async function getPokemon(name) {
  if (state.details.has(name)) return state.details.get(name);
  
  // If numeric ID, let it proceed to fetchJSON directly
  const isNumeric = !isNaN(name) && !isNaN(parseFloat(name));

  // If the index tells us this is a form, go to fallback (pokemon-form endpoint)
  const entry = state.indexData?.find(p => p.name === name);
  if (entry && entry.isForm) {
     return _getPokemonFallback(name);
  }

  // If the index is loaded and the name is NOT a valid variety,
  // skip directly to the species/form fallback to avoid 404 network logs
  if (!isNumeric && state.index.length > 0 && !state.index.includes(name)) {
    return _getPokemonFallback(name);
  }

  try {
    const d = await fetchJSON(`${API_URL}/pokemon/${name}`);
    state.details.set(name, d);
    return d;
  } catch (e) {
    // If it's a numeric ID but failed, it might be a form ID
    return _getPokemonFallback(name, e);
  }
}

async function _getPokemonFallback(name, originalError = new Error('Not found')) {
  try {
    // 0. If name is numeric but errored in getPokemon, it's NOT a pokemon variety ID.
    // However, it could be a pokemon-form ID.
    if (!isNaN(name) && !isNaN(parseFloat(name))) {
       // Search for this form ID
       const formRes = await fetchJSON(`${API_URL}/pokemon-form/${name}`).catch(() => null);
       if (formRes) {
         const basePoke = await getPokemon(formRes.pokemon.name);
         // Inject form sprites
         if (formRes.sprites) {
           basePoke.sprites = { ...basePoke.sprites, ...formRes.sprites };
         }
         state.details.set(name, basePoke);
         return basePoke;
       }
    }

    // 1. Try species endpoint directly ONLY if it's a known non-hyphenated species
    // Skip for names with hyphens unless they are special cases (Mr. Mime, etc)
    const knownHyphenatedSpecies = ["mr-mime", "ho-oh", "type-null", "mime-jr", "mr-rime", "porygon-z", "wo-chien", "chien-pao", "ting-lu", "chi-yu", "jangmo-o", "hakamo-o", "kommo-o", "tapu-koko", "tapu-lele", "tapu-bulu", "tapu-fini", "great-tusk", "scream-tail", "brute-bonnet", "flutter-mane", "slither-wing", "sandy-shocks", "roaring-moon", "iron-treads", "iron-bundle", "iron-hands", "iron-jugulis", "iron-moth", "iron-thorns", "iron-valiant", "walking-wake", "gouging-fire", "raging-bolt", "iron-leaves", "iron-boulder", "iron-crown"];
    
    if (!name.includes("-") || knownHyphenatedSpecies.includes(name)) {
      const spResult = await fetchJSON(`${API_URL}/pokemon-species/${name}`).catch(() => null);
      if (spResult) {
        const defaultVariety = spResult.varieties?.find(v => v.is_default)?.pokemon?.name;
        if (defaultVariety && defaultVariety !== name) {
          const d = await fetchJSON(`${API_URL}/pokemon/${defaultVariety}`);
          state.details.set(name, d);
          return d;
        }
      }
    }

    // 2. Morphological Form Logic (Burmy, Gastrodon, Deerling, etc.)
    if (name.includes("-")) {
      const parts = name.split("-");
      let sp = null;
      let baseNameUsed = "";
      
      // OPTIMIZATION: Do not try to fetch species for common suffixes that are 100% varieties
      // NOTE: Color suffixes (white, orange, yellow, blue) are intentionally excluded because
      // they are used for morphological forms (Flabébé/Floette/Florges, Minior) that need
      // species lookups. True varieties with these suffixes (e.g. Kyurem-White) resolve at
      // the main pokemon endpoint and never reach this fallback.
      const varietyOnlySuffixes = ["female", "male", "mega", "gmax", "gigantamax", "alola", "galar", "hisui", "paldea", "starter", "totem", "primal", "ash", "eternamax", "ultra", "origin", "therian", "dawn", "dusk", "resolute", "pirouette", "aria", "zen", "unbound", "complete", "10%", "50%", "school", "midnight", "blade", "average", "small", "large", "super", "antique", "artisan", "masterpiece", "three-segment", "family-of-three"];

      for (let i = 1; i <= parts.length; i++) {
        const candidate = parts.slice(0, i).join("-");
        const lastPart = parts[i - 1]; // Check if the candidate's last part is a variety suffix
        
        if (varietyOnlySuffixes.includes(lastPart)) continue;

        // Quick check against state.index if available
        if (state.index.length > 0 && !state.index.includes(candidate) && !knownHyphenatedSpecies.includes(candidate)) continue;
        
        try {
          const tempSp = await fetchJSON(`${API_URL}/pokemon-species/${candidate}`);
          if (tempSp) {
            sp = tempSp;
            baseNameUsed = candidate;
            break;
          }
        } catch(e) {}
      }

      if (sp) {
        const defaultVar = sp.varieties?.find(v => v.is_default)?.pokemon?.name || baseNameUsed;
        const d = await fetchJSON(`${API_URL}/pokemon/${defaultVar}`);
        
        // 3. Find if requested 'name' exists as a variety OR a form of this pokemon
        const varietyMatch = sp.varieties.find(v => v.pokemon.name === name);
        if (varietyMatch && name !== defaultVar) {
            // Avoid infinite loop: only fetch if variety is different from default and we were searching for it
            return fetchJSON(`${API_URL}/pokemon/${name}`).then(res => {
               state.details.set(name, res);
               return res;
            });
        }

        const formMatch = d.forms.find(f => f.name === name);
        if (formMatch) {
          try {
            const formData = await fetchJSON(formMatch.url);
            if (formData) {
              // Important: set name and ID to the specific form requested
              d.name = name;
              d.id = formData.id; // Use form-specific ID for sprite lookups
              d.is_morphological = true;

              if (formData.sprites) {
                if (formData.is_default) {
                  // If it's the default form, MERGE to keep animations/other sources from the variety
                  d.sprites = { ...d.sprites, ...formData.sprites };
                } else {
                  // For non-default forms (morphological variants), REPLACE/PRIORITIZE form sprites
                  // variety sprites (like animations) are usually for the wrong visual
                  d.sprites = { ...formData.sprites };
                }
              }
              if (formData.types) {
                // Ensure form-specific types override variety types if different
                d.types = formData.types;
              }
              // Store form-specific names for UI labels
              if (formData.names && formData.names.length > 0) {
                d.form_specific_names = formData.names;
              }
            }
          } catch (e) {
            console.warn("Could not fetch extra form data for", name, e);
          }
        }
        
        // 4. Sprite-Based Validation for Ghost Forms (e.g., Mothim Trash has no sprites in PokeAPI)
        const hasSprite = d.sprites && (
          d.sprites.front_default || 
          d.sprites.other?.home?.front_default || 
          d.sprites.other?.['official-artwork']?.front_default
        );
        
        if (!hasSprite && name.includes('-')) {
          const baseVariety = sp.varieties?.find(v => v.is_default)?.pokemon?.name || baseNameUsed;
          // console.debug(`Ghost form detected for ${name}, falling back to ${baseVariety}`);
          if (baseVariety !== name) {
            return getPokemon(baseVariety);
          }
        }

        state.details.set(name, d);
        
        // Ensure the returned data has the requested name even if it's a fallback 
        // to avoid incorrect labels in UI
        if (d.name !== name && name.includes('-')) {
            const cloned = { ...d, name: name };
            state.details.set(name, cloned);
            return cloned;
        }

        return d;
      }
    }
  } catch (e2) {}
  throw originalError;
}

async function getSpecies(name) {
  if (state.species.has(name)) return state.species.get(name);
  // Guard against numeric IDs that might 404 in species
  if (!isNaN(name) && !state.index.includes(name)) {
     // If we have a cached variety with this ID, use its species name
     for (let [k, v] of state.details) {
        if (String(v.id) === String(name)) {
           return getSpecies(v.species.name);
        }
     }
  }
  const d = await fetchJSON(`${API_URL}/pokemon-species/${name}`);
  state.species.set(name, d);
  return d;
}

async function getEvoChainByUrl(url) {
  if (state.evoChains.has(url)) return state.evoChains.get(url);
  const d = await fetchJSON(url);
  state.evoChains.set(url, d);
  return d;
}

// --- Local Dictionary Caching ---
const dictPromises = {
  item: null,
  move: null,
  ability: null,
};
let localDicts = {
  item: null,
  move: null,
  ability: null,
};

async function fetchI18nDict(type) {
  if (localDicts[type]) return localDicts[type];
  if (dictPromises[type]) return dictPromises[type];

  dictPromises[type] = (async () => {
    try {
      const bp = window.I18n ? I18n.getBasePath() : "";
      const res = await fetch(`${bp}assets/i18n/${type}_names.json`);
      if (res.ok) {
        const data = await res.json();
        localDicts[type] = data;
        return data;
      }
    } catch (e) {
      console.warn(`Failed to load ${type} dictionary:`, e);
    } finally {
      dictPromises[type] = null;
    }
    return null;
  })();

  return dictPromises[type];
}

/**
 * Get localized name from PokeAPI resource
 * @param {string} urlOrResource - URL to the resource or the resource object itself
 * @param {string} resourceType - Type of resource ('ability', 'item', 'move', etc.)
 * @returns {Promise<string>} - Localized name or fallback
 */
async function getLocalizedName(urlOrResource, resourceType = "ability") {
  try {
    // Determine the resource name
    let resourceName = "";
    if (typeof urlOrResource === "string") {
      const parts = urlOrResource.split("/").filter(Boolean);
      resourceName = parts[parts.length - 1];
    } else if (urlOrResource && urlOrResource.name) {
      resourceName = urlOrResource.name;
    }

    // Try dictionary lookup first for item, move, and ability
    if (
      resourceName &&
      (resourceType === "item" ||
        resourceType === "move" ||
        resourceType === "ability")
    ) {
      const dict = localDicts[resourceType] || (await fetchI18nDict(resourceType));
      if (dict && dict[resourceName]) {
        const langCode = I18n.currentLang || "es";
        if (dict[resourceName][langCode]) {
          return dict[resourceName][langCode];
        }
        if (dict[resourceName]["en"]) {
          return dict[resourceName]["en"];
        }
      }
    }

    // If it's a URL string, fetch the resource
    const resource =
      typeof urlOrResource === "string"
        ? await fetchJSON(urlOrResource)
        : urlOrResource;

    if (!resource || (!resource.names && !resource.name)) {
      // Fallback: extract name from URL or use resource.name
      if (typeof urlOrResource === "string") {
        const parts = urlOrResource.split("/");
        return toTitle(parts[parts.length - 2] || "unknown");
      }
      return toTitle(resource?.name || "unknown");
    }

    // NEW: If it's a pokemon or form, just use the API name as requested by user
    if (
      resourceType === "pokemon" ||
      resourceType === "pokemon-form" ||
      resourceType === "species"
    ) {
      return toTitle(resource.name);
    }

    // Try to find translation in current language
    const langCode = I18n.currentLang || "es";

    // Check form_names first if available (specific to forms)
    if (resource.form_names) {
      const localFormName = resource.form_names.find(
        (n) => n.language.name === langCode,
      );
      if (localFormName) return localFormName.name;
    }

    // Check names
    if (resource.names) {
      const localName = resource.names.find(
        (n) => n.language.name === langCode,
      );
      if (localName) return localName.name;
    }

    // Fallback to English
    if (resource.form_names) {
      const enFormName = resource.form_names.find(
        (n) => n.language.name === "en",
      );
      if (enFormName) return enFormName.name;
    }

    if (resource.names) {
      const enName = resource.names.find((n) => n.language.name === "en");
      if (enName) return enName.name;
    }

    // Ultimate fallback to resource name
    return toTitle(resource.name || "unknown");
  } catch (error) {
    // Extract name from URL as last resort
    if (typeof urlOrResource === "string") {
      const parts = urlOrResource.split("/");
      return toTitle(parts[parts.length - 2] || "unknown");
    }
    return "Unknown";
  }
}

// Expose globally
window.getLocalizedName = getLocalizedName;
window.getPokemon = getPokemon;

// --- Filtering & Sorting ---

/**
 * Filters the master index based on current state (search, region, types, etc.)
 * and updates the pagination and grid.
 */
async function buildFilteredList() {
  const {
    includeForms,
    region,
    search,
    selectedTypes,
    typeMode,
    showOnlyFavorites,
    minBST,
    minSpeed,
    generation,
  } = state;
  const q = search.toLowerCase();
  const types = [...selectedTypes];

  let names = state.indexData
    ? state.indexData
        .filter((p) => (includeForms || (!p.isForm && p.id < 10000)) && !/-female\b/.test(p.name))
        .map((p) => p.name)
    : state.index.filter(
        (n) =>
          (includeForms ||
          !/(?:-(mega|gmax|gigantamax|alola|galar|hisui|paldea|totem|primal|ash|starter|cosplay))\b/.test(
            n,
          )) && !/-female\b/.test(n),
      );

  if (q) {
    names = I18n.smartSearch(names, q, (n) => [n]);
  }

  if (region !== "all") {
    const rset = state.regionSets.get(region) || new Set();
    names = names.filter((n) => rset.has(n.split("-")[0]));
  }

  if (generation !== "all") {
    const gset = state.genSets.get(generation) || new Set();
    names = names.filter((n) => gset.has(n.split("-")[0]));
  }

  if (types.length) {
    const sets = types.map((t) => state.typeSets.get(t) || new Set());
    if (typeMode === "or") {
      const u = new Set();
      sets.forEach((s) => s.forEach((x) => u.add(x)));
      names = names.filter((n) => u.has(n));
    } else if (typeMode === "and") {
      names = names.filter((n) => sets.every((s) => s.has(n)));
    } else if (typeMode === "exact") {
      // 1. Must have ALL selected types
      names = names.filter((n) => sets.every((s) => s.has(n)));
      // 2. Must NOT have any unselected type
      const unselectedSets = TYPE_LIST.filter(
        (t) => !state.selectedTypes.has(t),
      ).map((t) => state.typeSets.get(t));

      names = names.filter((n) => !unselectedSets.some((s) => s.has(n)));
    }
  }

  if (showOnlyFavorites) {
    names = names.filter((n) => state.favorites.has(n));
  }

  if (minBST || minSpeed) {
    // For BST/Speed filtering, we MUST fetch details.
    // This is unavoidable if we want to filter by stats.
    // We'll limit this to the first 500 matches to avoid freezing?
    // Or just let it run (it might be slow).
    const details = await Promise.all(
      names.map(async (n) => ({ n, d: await getPokemon(n) })),
    );
    names = details
      .filter(({ d }) => {
        const bst = bstOf(d);
        const spd =
          d.stats?.find((s) => s.stat?.name === "speed")?.base_stat || 0;
        return bst >= (minBST || 0) && spd >= (minSpeed || 0);
      })
      .map((x) => x.n);
  }

  state.filteredNames = names;
  state.page = 1;

  const grid = $("#grid");
  if (grid) grid.classList.add("pager-transitioning");

  await applySort();
  updatePager();
  
  setTimeout(() => {
    renderPage();
    if (grid) grid.classList.remove("pager-transitioning");
  }, 200);

  syncModalIndex();
  updateFiltersCount();
  saveSettings();
}

async function applySort() {
  const mode = state.sort;
  if (mode.startsWith("name")) {
    const dir = mode.endsWith("asc") ? 1 : -1;
    state.filteredNames.sort(
      (a, b) =>
        a.localeCompare(b, I18n.currentLang, { sensitivity: "base" }) * dir,
    );
    return;
  }

  if (mode.startsWith("id")) {
    const dir = mode.endsWith("asc") ? 1 : -1;
    // Optimization: state.index is already sorted by ID.
    // If we haven't shuffled it too much, we can just rely on index order.
    // To be robust, we map names to their original index.
    const idxMap = new Map(state.index.map((n, i) => [n, i]));
    state.filteredNames.sort((a, b) => (idxMap.get(a) - idxMap.get(b)) * dir);
    return;
  }

  // For BST, stat, weight, or height sorting, we need details.
  // Show visual loading spinner in grid if there are uncached items
  const grid = $("#grid");
  let progressIndicator = null;
  const uncachedNames = state.filteredNames.filter((n) => !state.details.has(n));

  if (uncachedNames.length > 0 && grid) {
    grid.innerHTML = `
      <div class="grid-loading-container" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; color: var(--c-text-muted); width: 100%;">
        <div class="modal-spinner" style="border: 4px solid var(--c-white-20); border-top: 4px solid var(--c-accent); border-radius: 50%; width: 45px; height: 45px; animation: spin 1s linear infinite; margin-bottom: 1.5rem;"></div>
        <div class="grid-loading-text" style="font-weight: 700; font-size: 1.1rem; color: var(--c-text); text-align: center;" data-i18n="filters.loading_sort_data">Cargando datos para ordenar...</div>
        <div class="grid-loading-progress" style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.8; font-family: monospace;">0%</div>
      </div>
    `;
    progressIndicator = grid.querySelector(".grid-loading-progress");
    if (window.I18n && typeof I18n.translateElement === "function") {
      I18n.translateElement(grid);
    }
  }

  const details = new Array(state.filteredNames.length);
  const CONCURRENCY = 15;
  let completed = 0;
  let nextTaskIndex = 0;

  const worker = async () => {
    while (nextTaskIndex < state.filteredNames.length) {
      const currentIdx = nextTaskIndex++;
      const name = state.filteredNames[currentIdx];
      try {
        const data = await getPokemon(name);
        details[currentIdx] = { name, data };
      } catch (e) {
        console.warn(`Failed to fetch ${name} for sorting:`, e);
        details[currentIdx] = { name, data: null };
      }
      completed++;
      if (progressIndicator) {
        const pct = Math.round((completed / state.filteredNames.length) * 100);
        progressIndicator.textContent = `${pct}% (${completed}/${state.filteredNames.length})`;
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, state.filteredNames.length) },
    () => worker()
  );
  await Promise.all(workers);

  if (mode.startsWith("bst")) {
    const dir = mode.endsWith("asc") ? 1 : -1;
    details.sort((a, b) => (bstOf(b.data) - bstOf(a.data)) * dir * -1);
  }

  // Individual stat sorting: hp, atk, def, spa, spd, spe
  const statSortMap = {
    "hp": "hp",
    "atk": "attack",
    "def": "defense",
    "spa": "special-attack",
    "spd": "special-defense",
    "spe": "speed",
  };

  const sortKey = mode.replace(/-(?:asc|desc)$/, "");
  if (statSortMap[sortKey]) {
    const statName = statSortMap[sortKey];
    const dir = mode.endsWith("asc") ? 1 : -1;
    details.sort((a, b) => {
      const aVal = a.data?.stats?.find(s => s.stat?.name === statName)?.base_stat || 0;
      const bVal = b.data?.stats?.find(s => s.stat?.name === statName)?.base_stat || 0;
      return (aVal - bVal) * dir;
    });
  }

  // Weight sorting
  if (sortKey === "weight") {
    const dir = mode.endsWith("asc") ? 1 : -1;
    details.sort((a, b) => {
      const aVal = a.data?.weight || 0;
      const bVal = b.data?.weight || 0;
      return (aVal - bVal) * dir;
    });
  }

  // Height sorting
  if (sortKey === "height") {
    const dir = mode.endsWith("asc") ? 1 : -1;
    details.sort((a, b) => {
      const aVal = a.data?.height || 0;
      const bVal = b.data?.height || 0;
      return (aVal - bVal) * dir;
    });
  }

  state.filteredNames = details.map((x) => x.name);
}

function bstOf(d) {
  if (!d) return 0;
  if (state.bst.has(d.name)) return state.bst.get(d.name);
  const v = (d.stats || []).reduce((s, x) => s + (x.base_stat || 0), 0);
  state.bst.set(d.name, v);
  return v;
}

// --- Dynamic Grid Columns ---
// Calculates the largest divisor of `perPage` that is <= maxCols,
// ensuring the last row of the grid is always completely filled.
function updateGridColumns(perPage) {
  const grid = document.getElementById("pokedexGrid");
  if (!grid) return;
  const maxCols = 10;
  let best = 1;
  for (let c = maxCols; c >= 2; c--) {
    if (perPage % c === 0) {
      best = c;
      break;
    }
  }
  grid.style.setProperty("--grid-cols", best);
}

// --- UI Rendering ---

function updatePager() {
  const total = state.filteredNames.length,
    pages = Math.max(1, Math.ceil(total / state.perPage));
  $("#pageInfo").textContent = I18n.t("common.paginator", state.page, pages);
  $("#pageJump").max = pages;
  $("#pageJump").value = state.page;
  $("#prevBtn").disabled = state.page <= 1;
  $("#nextBtn").disabled = state.page >= pages;

  const perPageSel = $("#perPage");
  if (perPageSel) perPageSel.value = String(state.perPage);
}

function renderPage() {
  const grid = $("#grid");
  grid.innerHTML = "";
  const start = (state.page - 1) * state.perPage;
  const list = state.filteredNames.slice(start, start + state.perPage);
  const frag = document.createDocumentFragment();

  for (const name of list) {
    frag.appendChild(createCard(name));
  }
  grid.appendChild(frag);
  if (typeof lucide !== "undefined") lucide.createIcons();
  updateFavTeamBadges();
  updateTeamPanel();
  saveSettings();
}

const cardObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const node = entry.target;
      const name = node.dataset.name;
      if (name) {
        loadCardData(node, name);
        observer.unobserve(node);
      }
    }
  });
}, { rootMargin: "200px" });

function createCard(name) {
  const tpl = document.getElementById("card-tpl");
  const node = tpl.content.firstElementChild.cloneNode(true);
  const img = node.querySelector("img.sprite");
  const idEl = node.querySelector(".id");
  const nameEl = node.querySelector(".name");
  const badges = node.querySelector(".badges");
  const controls = node.querySelector(".card-controls");

  nameEl.textContent = toTitle(name);
  idEl.textContent = "…";
  img.alt = `${I18n.t("modal.sprite")} ${name}`;
  img.classList.add("skeleton");
  img.addEventListener("load", () => img.classList.remove("skeleton"), {
    once: true,
  });

  const favBtn = createControlBtn(name, "fav");
  const teamBtn = createControlBtn(name, "team");
  controls.appendChild(teamBtn);
  controls.appendChild(favBtn);

  node.dataset.name = name;
  node.classList.add("grid-item-enter");
  cardObserver.observe(node);

  node.addEventListener("click", () => openModal(name));
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal(name);
    }
  });

  return node;
}

function loadCardData(node, name) {
  const img = node.querySelector("img.sprite");
  const idEl = node.querySelector(".id");
  const nameEl = node.querySelector(".name");
  const badges = node.querySelector(".badges");

  getPokemon(name)
    .then((d) => {
      const tps = d.types
        .sort((a, b) => a.slot - b.slot)
        .map((x) => x.type.name);
      node.classList.add(tps.length > 1 ? "bg-2" : "bg-1", `type-${tps[0]}`);
      idEl.textContent = fmtId(d.id);

      // Always set primary color var
      node.style.setProperty("--tc1", `var(--tc-${tps[0]}, var(--c-surface))`);

      if (tps.length === 2) {
        const [t1, t2] = tps;
        node.classList.add("dual");
        node.style.setProperty("--tc2", `var(--tc-${t2}, var(--c-surface))`);
      } else {
        node.classList.remove("dual");
        node.style.removeProperty("--tc2");
      }

      badges.innerHTML = tps.map(typeBadge).join("");

      const shiny = state.gridShiny;
      const fallback = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${d.id}.png`;
      img.src = getGridSprite(d, shiny) || fallbackArt(d) || fallback;

      // Fetch Species for Localized Name and correct ID
      getSpecies(d.species.name)
        .then(async (sp) => {
          let displayName = d.name;
          
          // If includeForms is active and this is a base variety with morphological forms,
          // prefer the default form's name for consistency (e.g. "Unown" -> "Unown A")
          if (state.includeForms && d.forms && d.forms.length > 1 && d.name === d.species.name) {
             const firstForm = d.forms[0].name;
             if (firstForm !== d.name && firstForm.startsWith(d.name + "-")) {
                 displayName = firstForm;
             }
          }

          // Strip species name if it's a form suffix to match user request for clean labels
          let label = toTitle(displayName);
          
          // Custom Gender Cleaning: Remove " Male" or " Female" from the end
          label = label.replace(/\s+(Male|Female)$/i, "");

          if (displayName !== sp.name && label.toLowerCase().includes(sp.name.toLowerCase())) {
             const baseName = sp.name;
             const cleaned = label
               .replace(new RegExp(`^${baseName}\\s*|\\s*${baseName}$`, "gi"), "")
               .replace(/^-+|-+$/g, "")
               .trim();
             if (cleaned) label = `${toTitle(baseName)} ${toTitle(cleaned)}`;
          }

          nameEl.textContent = label;

          // If it's a special form (> 10000), show species ID
          if (d.id >= 10000) {
            idEl.textContent = fmtId(sp.id);
          }
        })
        .catch((e) => {});
    })
    .catch((e) => {
      idEl.textContent = "ERR";
      img.src = CONSTANTS.FALLBACK_IMAGE;
      node.style.opacity = "0.5";
      node.style.pointerEvents = "none"; // Disable interaction on error
    });
}

function createControlBtn(name, type) {
  const btn = document.createElement("button");
  const isFav = type === "fav";
  const isActive = isFav
    ? state.favorites.has(name)
    : state.team.some((t) => t.name === name);

  btn.className =
    "small-btn" + (isActive ? (isFav ? " fav-on" : " team-on") : "");
  btn.type = "button";
  btn.title = isFav ? I18n.t("team.fav") : I18n.t("team.add_remove");
  btn.innerHTML = isFav
    ? isActive
      ? '<i data-lucide="star" class="lucide-star-filled" style="width:16px;height:16px;"></i>'
      : '<i data-lucide="star" style="width:16px;height:16px;"></i>'
    : isActive
      ? '<i data-lucide="check" style="width:16px;height:16px;"></i>'
      : '<i data-lucide="plus" style="width:16px;height:16px;"></i>';

  btn.onclick = (e) => {
    e.stopPropagation();
    if (isFav) {
      toggleFavorite(name);
      const nowActive = state.favorites.has(name);
      btn.innerHTML = nowActive
        ? '<i data-lucide="star" class="lucide-star-filled" style="width:16px;height:16px;"></i>'
        : '<i data-lucide="star" style="width:16px;height:16px;"></i>';
      btn.classList.toggle("fav-on", nowActive);
    } else {
      const wasIn = state.team.some((t) => t.name === name);
      toggleTeam(name).then(() => {
        const nowIn = state.team.some((t) => t.name === name);
        btn.innerHTML = nowIn
          ? '<i data-lucide="check" style="width:16px;height:16px;"></i>'
          : '<i data-lucide="plus" style="width:16px;height:16px;"></i>';
        btn.classList.toggle("team-on", nowIn);
        if (!wasIn && state.team.length > 6) alert(I18n.t("team.full_alert"));
      });
    }
  };
  return btn;
}

// --- Asset Helpers (pokesprite) ---
function getPokespriteTypeIcon(name) {
  // Normalize type names (electric vs lightning etc)
  const n = name.toLowerCase();
  // Using pokesprite gen8 types path
  return `https://raw.githubusercontent.com/msikma/pokesprite/master/misc/types/gen8/${n}.png`;
}

function getPokespritePokemon(name) {
  // Using msikma/pokesprite for static grid sprites.
  // Path: pokemon-gen8/regular/{name}.png
  // Note: pokesprite uses specific naming. We might need to handle special cases if they break.
  // But standard names usually work.
  return `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${name}.png`;
}

function svgType(name) {
  if (!name) return "";
  const url = getPokespriteTypeIcon(name);
  return `<img src="${url}" alt="${name}" class="type-icon" width="24" height="24" onerror="this.style.display='none'">`;
}

function typeBadge(t) {
  const nm = typeof t === "string" ? t : t.type.name;
  const label = I18n.t(`types.${nm}`) || toTitle(nm);
  // Vertical layout for cards/modal (Square style)
  return `<span class="type-badge type-${nm}" title="${label}">
            ${svgType(nm)}
            <span>${label}</span>
          </span>`;
}

function updateTypeChipsUI() {
  const container = $("#typeChips");
  if (!container) return;
  container.querySelectorAll(".type-chip").forEach((btn) => {
    const type = btn.className
      .split(" ")
      .find((c) => c.startsWith("type-") && c !== "type-chip")
      ?.replace("type-", "");
    if (type && state.selectedTypes.has(type)) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function createTypeFilters() {
  const container = $("#typeChips");
  if (!container) return;
  container.innerHTML = "";

  TYPE_LIST.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `type-chip type-${t}`;
    if (state.selectedTypes.has(t)) btn.classList.add("active");

    const typeSet = state.typeSets.get(t);
    const count = typeSet ? state.index.filter(n => typeSet.has(n)).length : 0;

    btn.innerHTML = `${svgType(t)}<span>${
      I18n.t(`types.${t}`) || toTitle(t)
    }</span><span class="type-chip-count">${count}</span>`;

    btn.onclick = () => {
      if (state.selectedTypes.has(t)) {
        state.selectedTypes.delete(t);
      } else {
        if (state.selectedTypes.size >= 2) {
          // Remove oldest (first) element
          const first = state.selectedTypes.values().next().value;
          state.selectedTypes.delete(first);
        }
        state.selectedTypes.add(t);
      }
      updateTypeChipsUI();
      buildFilteredList();
      updateFiltersCount();
      saveSettings();
    };

    container.appendChild(btn);
  });
}

function effBadge(t, mult) {
  const label = I18n.t(`types.${t}`) || toTitle(t);
  return `<div class="eff-badge type-${t}" title="${label} ×${mult}">
            ${svgType(t)}
            <span class="eff-name">${label}</span>
            <span class="eff-mult">×${mult}</span>
          </div>`;
}

/**
 * Checks if a form name represents a gender-specific variety.
 * @param {string} formName
 * @returns {boolean}
 */
function isGenderForm(formName) {
  return (
    formName.endsWith("-male") ||
    formName.endsWith("-female") ||
    formName.includes("-male-") ||
    formName.includes("-female-")
  );
}


// --- Modal & Interaction ---
async function openModal(name, preferredSuffix = "", keepShiny = false) {
  state.lastOpenedName = name;
  const currentLang = I18n.currentLang;

  const modal = $("#modal");
  
  // Show modal instantly with loading skeleton overlay
  let overlay = modal.querySelector(".modal-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "modal-loading-overlay active";
    overlay.innerHTML = `<div class="modal-spinner"></div><div class="modal-loading-text">${I18n.t("common.loading") || "Cargando..."}</div>`;
    modal.querySelector(".poke-modal").appendChild(overlay);
  } else {
    overlay.classList.add("active");
  }
  
  if (!modal.open) {
    modal.showModal();
    modal.scrollTop = 0;
  }

  try {
    // Initial fetch to get strict data
    let data = await getPokemon(name);
    const sp = await getSpecies(data.species.name);

  // Smart Form Switching:
  // If we have a preferred suffix (e.g. "-mega", "-alola") and the target species
  // has a variety with that exact suffix, switch to it automatically.
  if (preferredSuffix) {
    const targetForm = sp.name + preferredSuffix;
    const hasForm = sp.varieties?.some((v) => v.pokemon.name === targetForm);
    if (hasForm && targetForm !== data.name) {
      try {
        const formData = await getPokemon(targetForm);
        data = formData;
        name = targetForm;
        state.lastOpenedName = name;
      } catch (e) {}
    }
  }

  history.replaceState(null, "", `#pokemon/${name}`);
  syncModalIndex(data.species.name);

  const tps = data.types
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name);

  // Apply gradient background to modal card
  const modalCard = $(".poke-modal");
  modalCard.className = "poke-modal"; // Reset classes
  modalCard.classList.add(tps.length > 1 ? "bg-2" : "bg-1", `type-${tps[0]}`);

  // Set Type Colors for Gradient
  const [t1, t2] = tps;
  modalCard.style.setProperty("--tc1", `var(--tc-${t1}, var(--c-surface))`);

  if (tps.length === 2) {
    modalCard.classList.add("dual");
    modalCard.style.setProperty("--tc2", `var(--tc-${t2}, var(--c-surface))`);
  } else {
    modalCard.style.removeProperty("--tc2");
  }

  // Use API name as requested, but synced with default form if includeForms is true
  let displayName = data.name;
  if (state.includeForms && data.forms && data.forms.length > 1 && data.name === data.species.name) {
     const firstForm = data.forms[0].name;
     if (firstForm !== data.name && firstForm.startsWith(data.name + "-")) {
         displayName = firstForm;
     }
  }
  
  // Apply title formatting/cleaning (Sync with loadCardData logic)
  let displayLabel = toTitle(displayName);

  // Custom Gender Cleaning: Remove " Male" or " Female" from the end
  displayLabel = displayLabel.replace(/\s+(Male|Female)$/i, "");

  if (displayName !== sp.name && displayLabel.toLowerCase().includes(sp.name.toLowerCase())) {
     const baseName = sp.name;
     const cleaned = displayLabel
       .replace(new RegExp(`^${baseName}\\s*|\\s*${baseName}$`, "gi"), "")
       .replace(/^-+|-+$/g, "")
       .trim();
     if (cleaned) displayLabel = `${toTitle(baseName)} ${toTitle(cleaned)}`;
  }
  displayName = displayLabel;

  const displayId = data.id >= 10000 ? sp.id : data.id;

  $("#modalTitle").textContent = `${displayName} ${fmtId(displayId)}`;
  I18n.setModalTitle(displayName);

  // Cry support
  const playCryBtn = $("#playCryBtn");
  if (playCryBtn) {
    if (data.cries && (data.cries.latest || data.cries.legacy)) {
      playCryBtn.style.display = "flex";
      playCryBtn.onclick = (e) => {
        e.preventDefault();
        const audio = new Audio(data.cries.latest || data.cries.legacy);
        audio.play().catch((err) => console.warn("Error playing cry:", err));
      };
    } else {
      playCryBtn.style.display = "none";
    }
  }

  // Genera (Category)
  const genusEntry =
    (sp.genera || []).find((g) => g.language.name === currentLang) ||
    (sp.genera || []).find((g) => g.language.name === "en");
  $("#genera").textContent = genusEntry ? genusEntry.genus : "";

  $("#modalTypes").innerHTML = tps.map(typeBadge).join("");

  $("#kvHeight").textContent = (data.height / 10).toFixed(1) + " m";
  $("#kvWeight").textContent = (data.weight / 10).toFixed(1) + " kg";
  $("#kvBaseExp").textContent = data.base_experience ?? "-";

  // Render abilities with translations
  const abilityPromises = data.abilities.map(async (a) => {
    const localizedName = await getLocalizedName(a.ability.url, "ability");
    return `<span class="badge bg-secondary">${localizedName}${
      a.is_hidden ? " " + I18n.t("modal.hidden_ability") : ""
    }</span>`;
  });
  $("#kvAbilities").innerHTML = (await Promise.all(abilityPromises)).join(" ");

  $("#kvEgg").textContent =
    sp.egg_groups
      ?.map((g) => I18n.t("biology.egg_groups." + g.name))
      .join(", ") || "-";
  $("#kvGrowth").textContent = I18n.t(
    "biology.growth_rates." + (sp.growth_rate?.name || "-"),
  );
  if (sp.habitat) {
    const habName = sp.habitat.name;
    const habTrans = I18n.t("biology.habitats." + habName);
    $("#kvHabitat").innerHTML =
      `<a href="habitats.html#habitat/${habName}" class="modal-link" target="_blank">${habTrans}</a>`;
  } else {
    $("#kvHabitat").textContent = "—";
  }

  if (sp.shape) {
    const shpName = sp.shape.name;
    const shpTrans = I18n.t("biology.shapes." + shpName);
    $("#kvShape").innerHTML =
      `<a href="shapes.html#shape/${shpName}" class="modal-link" target="_blank">${shpTrans}</a>`;
  } else {
    $("#kvShape").textContent = "—";
  }
  $("#kvColor").textContent = I18n.t(
    "biology.colors." + (sp.color?.name || "—"),
  );
  $("#kvGen").textContent = I18n.t(
    "biology.generations." + (sp.generation?.name || "—"),
  );
  $("#kvCapture").textContent = sp.capture_rate ?? "—";
  $("#kvHappiness").textContent = sp.base_happiness ?? "—";
  const femaleRate = sp.gender_rate;
  $("#kvGender").textContent =
    femaleRate === -1
      ? I18n.t("modal.genderless")
      : (femaleRate * 12.5).toFixed(1) + "%";

  // Items with icons and translations
  const itemContainer = $("#kvItems");
  itemContainer.innerHTML = "";

  // Combine wild held items with special usable items
  const displayItems = new Set();
  const itemInfos = [];

  // 1. Wild Held Items
  if (data.held_items && data.held_items.length > 0) {
    for (const h of data.held_items) {
      if (!displayItems.has(h.item.name)) {
        displayItems.add(h.item.name);
        itemInfos.push({ name: h.item.name, url: h.item.url, source: "wild" });
      }
    }
  }

  // 2. Special Usable Items (Species specific, Mega stones, etc.)
  const allPossibleItems = await loadItems();
  const specialItems = (allPossibleItems || []).filter((item) => {
    const itemName = item.name.toLowerCase();
    const speciesName = data.species.name.toLowerCase();

    // Only pick truly special items for Pokedex view
    if (itemName === "light-ball" && speciesName === "pikachu") return true;
    if (
      itemName === "thick-club" &&
      (speciesName === "cubone" || speciesName === "marowak")
    )
      return true;
    if (itemName === "metal-powder" && speciesName === "ditto") return true;
    if (itemName === "quick-powder" && speciesName === "ditto") return true;
    if (itemName === "lucky-punch" && speciesName === "chansey") return true;
    if (
      itemName === "stick" &&
      (speciesName === "farfetchd" || speciesName === "sirfetchd")
    )
      return true;
    if (
      itemName === "leek" &&
      (speciesName === "farfetchd" || speciesName === "sirfetchd")
    )
      return true;
    if (itemName === "deep-sea-scale" && speciesName === "clamperl")
      return true;
    if (itemName === "deep-sea-tooth" && speciesName === "clamperl")
      return true;

    // Mega Stones
    if (
      itemName.endsWith("-ite") &&
      itemName.includes(
        speciesName
          .replace("nidoran-m", "nidoran")
          .replace("nidoran-f", "nidoran"),
      )
    )
      return true;

    // Memories, Drives, Masks
    if (itemName.endsWith("-memory") && speciesName === "silvally") return true;
    if (itemName.endsWith("-drive") && speciesName === "genesect") return true;
    if (itemName.endsWith("-mask") && speciesName === "ogerpon") return true;

    return false;
  });

  specialItems.forEach((si) => {
    if (!displayItems.has(si.name)) {
      displayItems.add(si.name);
      itemInfos.push({ name: si.name, url: si.url, source: "special" });
    }
  });

  if (itemInfos.length > 0) {
    for (const info of itemInfos) {
      const itemName = info.name;
      const localizedItemName = await getLocalizedName(info.url, "item");
      const itemSpan = document.createElement("span");
      itemSpan.className =
        "item-badge" + (info.source === "special" ? " special-item" : "");
      itemSpan.title =
        localizedItemName + (info.source === "special" ? " (Especial)" : "");

      const icon = document.createElement("img");
      const apiIcon = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemName}.png`;
      const fallbackIcon = getPokeSpriteUrl("item", itemName);

      icon.src = apiIcon;
      icon.alt = itemName;
      icon.className = "item-icon-small";
      icon.onerror = () => {
        if (icon.src !== fallbackIcon) {
          icon.src = fallbackIcon;
        } else {
          icon.style.display = "none";
        }
      };

      itemSpan.appendChild(icon);
      const nameSpan = document.createElement("span");
      nameSpan.textContent = toTitle(itemName);
      itemSpan.appendChild(nameSpan);
      itemContainer.appendChild(itemSpan);
    }
  } else {
    itemContainer.textContent = "—";
  }

  const entry =
    (sp.flavor_text_entries || []).find(
      (e) => e.language.name === currentLang,
    ) || (sp.flavor_text_entries || []).find((e) => e.language.name === "en");
  $("#flavor").textContent = entry ? entry.flavor_text.replace(/\f/g, " ") : "";

  const table = $("#statsTable");
  table.innerHTML = "";
  for (const st of data.stats) {
    const row = document.createElement("tr");
    const statLabel = I18n.t("stats." + st.stat.name) || toTitle(st.stat.name);
    row.innerHTML = `<td class="stat-name">${statLabel}</td>
      <td class="stat-val">${st.base_stat}</td>
      <td><div class="bar"><i style="width:${Math.min(
        100,
        st.base_stat / 2,
      )}%"></i></div></td>`;
    table.appendChild(row);
  }

  $("#shinyToggle").checked = keepShiny;
  $("#genderSelect").value = "auto";
  const spriteOptions = collectSpriteOptions(data);
  $("#spriteSelect").innerHTML = spriteOptions
    .map((o) => `<option value="${o.key}">${o.label}</option>`)
    .join("");
  $("#spriteSelect").value = "auto";

  // Combine Varieties and Forms for the selector intelligently
  let allFormOptions = [];
  const defaultVarName = (sp.varieties || []).find(v => v.is_default)?.pokemon?.name || sp.name;
  const varietyNames = (sp.varieties || []).map((v) => v.pokemon.name);
  
  if (data.forms && data.forms.length > 1) {
    const formNames = data.forms.map(f => f.name);
    varietyNames.forEach(vn => {
       if (formNames.some(fn => fn === vn || fn.startsWith(vn + "-"))) {
          data.forms.forEach(f => {
            if (!allFormOptions.includes(f.name)) allFormOptions.push(f.name);
          });
       } else {
          if (!allFormOptions.includes(vn)) allFormOptions.push(vn);
       }
    });
  } else {
    allFormOptions = varietyNames;
  }

  // Final Filter: Remove gendered forms that aren't the species' default
  allFormOptions = allFormOptions.filter(vn => {
     if (vn === defaultVarName) return true;
     return !vn.includes("-male") && !vn.includes("-female");
  });

  // Hide the whole pill if there is only 1 option
  const formPill = $("#formSelect").closest(".pill");
  if (formPill) {
     formPill.style.display = allFormOptions.length > 1 ? "flex" : "none";
  }

  $("#formSelect").innerHTML = allFormOptions
    .map((v) => {
      let formLabel = "";
      // Force "Base" label for the species' default variety
      if (v === defaultVarName) {
        formLabel = I18n.t("modal.form_base") || "Base";
      }

      // If this is the currently loaded form (or variety name) and we have its localized names, use it
      if (!formLabel && (v === name || v === data.name) && data.form_specific_names) {
        const localName =
          data.form_specific_names.find((n) => n.language.name === currentLang) ||
          data.form_specific_names.find((n) => n.language.name === "en");
        if (localName) formLabel = localName.name;
      }

      if (!formLabel || formLabel.toLowerCase().includes(data.species.name.toLowerCase())) {
        // Fallback to suffix removal or clean the existing label
        const baseName = data.species.name;
        const currentLabel = formLabel || toTitle(v);
        
        // Remove species name from start or end, and handle hyphens
        let cleaned = currentLabel
          .replace(new RegExp(`^${baseName}\\s*|\\s*${baseName}$`, "gi"), "")
          .replace(/^-+|-+$/g, "")
          .trim();
          
        if (!cleaned) {
           // If cleaning emptied it, it might be the base form
           const isBase = sp.varieties?.find(vari => vari.is_default)?.pokemon.name === v || 
                          (v.startsWith(data.species.name + "-") && data.is_default);
           formLabel = isBase ? (I18n.t("modal.form_base") || "Base") : currentLabel;
        } else {
           formLabel = toTitle(cleaned);
        }
      }
      
      const requirement = I18n.t("forms.requirements_data." + v);
      const label =
        requirement !== "forms.requirements_data." + v
          ? `${formLabel} ◆ ${requirement}`
          : formLabel;
      return `<option value="${v}">${label || "—"}</option>`;
    })
    .join("");

  // Ensure the value matches one of the options (handles variety name vs default form name mismatch)
  let bestValue = name;
  if (!allFormOptions.includes(name)) {
      bestValue = allFormOptions.find(o => o === data.name || o.startsWith(name + "-")) || allFormOptions[0];
  }
  $("#formSelect").value = bestValue;

  // Coordina género y forma para especies con formas de género (Basculegion, Meowstic, etc.)
  const syncGenderWithForm = (formName) => {
    if (formName.includes("-male")) {
      $("#genderSelect").value = "male";
    } else if (formName.includes("-female")) {
      $("#genderSelect").value = "female";
    } else {
      // If base form and a female variety exists, it's likely the male one (e.g. Pyroar)
      const hasFemaleVariety = sp.varieties?.some(v => v.pokemon.name.includes("-female"));
      if (hasFemaleVariety) $("#genderSelect").value = "male";
    }
  };

  const syncFormWithGender = async (newGender) => {
    if (newGender === "auto") return;
    const speciesName = data.species.name;
    let targetFormName = `${speciesName}-${newGender}`;
    let hasVariety = sp.varieties?.some((v) => v.pokemon.name === targetFormName);
    
    // Fallback: If female suffix doesn't exist, it might be the base form (or vice versa for male)
    if (!hasVariety && newGender === "male") {
        targetFormName = speciesName;
        hasVariety = sp.varieties?.some((v) => v.pokemon.name === targetFormName);
    }

    if (hasVariety && targetFormName !== data.name) {
      await openModal(targetFormName, "", $("#shinyToggle").checked);
    }
  };

  // Attach listeners for sprite updates
  const updateFn = async () => {
    updateSpriteDisplay(data);
    await buildEvolutionUI(data.name);
  };

  $("#shinyToggle").onchange = updateFn;
  $("#genderSelect").onchange = async (e) => {
    await syncFormWithGender(e.target.value);
    updateFn();
  };
  $("#spriteSelect").onchange = updateFn;
  $("#formSelect").onchange = async (e) => {
    const newForm = e.target.value;
    if (newForm !== data.name) {
      syncGenderWithForm(newForm);
      await openModal(newForm, "", $("#shinyToggle").checked);
    }
  };

  syncGenderWithForm(data.name);
  updateSpriteDisplay(data);

  renderEffectiveness(tps);
  renderPastTypes(data);
  renderPokedexNumbers(sp);
  renderTcgCarousel(data.name);
  // renderEncounterLocations(data.id); // Removed: encounter section disabled
  if (typeof Bulbapedia !== "undefined") {
    Bulbapedia.renderSection('bulbapediaSection', data.name, 'pokemon');
  }
  await buildEvolutionUI(data.name);

  if (typeof lucide !== "undefined") lucide.createIcons();

  // Hide loading overlay
  if (overlay) overlay.classList.remove("active");

  // Accessibility: Focus Trap
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusableElements.length > 0) {
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const trapFocus = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
      if (e.key === "Escape") {
        modal.close();
      }
    };

    modal.addEventListener("keydown", trapFocus);

    // Restore focus on close
    modal.addEventListener(
      "close",
      () => {
        modal.removeEventListener("keydown", trapFocus);
        history.replaceState(null, "", " "); // Clear hash without reloading
        I18n.clearModalTitle();
      },
      { once: true },
    );
  }
  
  } catch(e) {
      console.error("Error loading modal data", e);
      if (overlay) overlay.classList.remove("active");
      modal.close();
  }
}

function updateSpriteDisplay(d) {
  const shiny = $("#shinyToggle").checked,
    gender = $("#genderSelect").value,
    key = $("#spriteSelect").value;

  const url =
    lookupSpriteByKey(d, key, { shiny, gender }) ||
    chooseSprite(d, { shiny, gender }) ||
    fallbackArt(d) ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${d.id}.png`;

  const img = $("#modalSprite");
  if (img) {
    img.src = url;
    img.alt = `${I18n.t("modal.sprite")} ${toTitle(d.name)}`;
  }

  // Sync with team edit if relevant
  const teamSprite = $("#teamEditSprite");
  if (teamSprite && teamSprite.dataset.id === d.name) {
    teamSprite.src = url;
  }
}

/**
 * Renders TCG cards for the current Pokemon in the modal
 * @param {string} pokemonName
 */
async function renderTcgCarousel(pokemonName) {
  const container = $("#tcgCarousel");
  const title = $("#tcgCarouselTitle");
  if (!container) {
    return;
  }

  container.innerHTML = `<div class="tcg-loading">${
    I18n.t("common.loading") || "Cargando..."
  }</div>`;

  // Localize title
  if (title) {
    title.textContent = `${
      I18n.t("modal.tcg_cards_prefix") || "Cartas de"
    } ${toTitle(pokemonName)}`;
  }

  try {
    // Wait for CardStorage availability with timeout
    let retries = 0;
    while (retries < 20) {
      if (window.CardStorage && window.CardStorage.getCards) break;
      await new Promise((r) => setTimeout(r, 100));
      retries++;
    }

    if (!window.CardStorage || !window.CardStorage.getCards) {
      container.innerHTML = `<div class="tcg-error">CardStorage unavailable</div>`;
      return;
    }

    // Determine query for TCG API based on form
    const searchQuery = getTcgSearchQuery(pokemonName);

    // Fetch cards using existing API
    // We request a batch of 50 to have enough variety for carousel
    // Sort by "set_newest" (assuming API supports it or we sort client side)
    const { cards: allCards } = await CardStorage.getCards(
      { name: searchQuery, sort: "set_newest" },
      "en",
      1,
      200,
    );

    let cards = allCards || [];

    // Client-side Strict Filtering for forms
    const lowerName = pokemonName.toLowerCase();

    // Detect which form is being requested
    const isMega = lowerName.includes("-mega");
    const isAlola = lowerName.includes("-alola");
    const isGalar = lowerName.includes("-galar");
    const isHisui = lowerName.includes("-hisui");
    const isPaldea = lowerName.includes("-paldea");
    const isOrigin = lowerName.includes("-origin");
    const isTherian = lowerName.includes("-therian");
    const isBlack = lowerName.includes("-black");
    const isWhite = lowerName.includes("-white");
    const isDawn = lowerName.includes("-dawn");
    const isDusk = lowerName.includes("-dusk");
    const isUltra = lowerName.includes("-ultra");
    const isPrimal = lowerName.includes("-primal");
    const isShadowRider = lowerName.includes("-shadow");
    const isIceRider = lowerName.includes("-ice");
    const isCrowned = lowerName.includes("-crowned");
    const isEternal = lowerName.includes("-eternamax");
    const isAsh = lowerName.includes("-ash");
    const isResolute = lowerName.includes("-resolute");
    const isComplete = lowerName.includes("-complete");
    const isSchool = lowerName.includes("-school");
    const isMidnight = lowerName.includes("-midnight");
    const isDusk2 =
      lowerName.includes("-dusk") && lowerName.includes("lycanroc");
    const isBlade = lowerName.includes("-blade");
    const isPirouette = lowerName.includes("-pirouette");
    const isAria = lowerName.includes("-aria");
    const isUnbound = lowerName.includes("-unbound");
    const isZen = lowerName.includes("-zen");

    cards = cards.filter((c) => {
      const n = c.name.toLowerCase();

      // Helper to check if card name contains form indicator
      const cardIsMega =
        n.includes("mega ") ||
        n.includes(" m ") ||
        (n.includes("-m") && !n.includes("-metal"));
      const cardIsAlolan = n.includes("alolan");
      const cardIsGalarian = n.includes("galarian");
      const cardIsHisuian = n.includes("hisuian");
      const cardIsPaldean = n.includes("paldean");
      const cardIsOrigin =
        n.includes("origin forme") || n.includes("origin form");
      const cardIsTherian = n.includes("therian");
      const cardIsBlack = n.includes("black kyurem");
      const cardIsWhite = n.includes("white kyurem");
      const cardIsDawn = n.includes("dawn wings");
      const cardIsDusk = n.includes("dusk mane");
      const cardIsUltra = n.includes("ultra necrozma") || n.includes("ultra ");
      const cardIsPrimal = n.includes("primal ");
      const cardIsShadowRider = n.includes("shadow rider");
      const cardIsIceRider = n.includes("ice rider");
      const cardIsCrowned = n.includes("crowned ");
      const cardIsEternal = n.includes("eternamax");
      const cardIsAsh = n.includes("ash-");
      const cardIsResolute = n.includes("resolute");
      const cardIsComplete =
        n.includes("complete forme") || n.includes("10%") || n.includes("50%");
      const cardIsSchool = n.includes("school form");
      const cardIsMidnight = n.includes("midnight");
      const cardIsBlade = n.includes("blade forme");
      const cardIsPirouette = n.includes("pirouette");
      const cardIsAria = n.includes("aria forme");
      const cardIsUnbound = n.includes("unbound");
      const cardIsZen = n.includes("zen mode");
      const cardIsRadiant = n.includes("radiant ");
      const cardIsVStar = n.includes(" vstar");
      const cardIsTag = n.includes(" & "); // Tag Team cards like "Pikachu & Zekrom"

      // If viewing a SPECIFIC FORM, only show cards matching that form
      if (isMega) return cardIsMega;
      if (isAlola) return cardIsAlolan;
      if (isGalar) return cardIsGalarian;
      if (isHisui) return cardIsHisuian;
      if (isPaldea) return cardIsPaldean;
      if (isOrigin) return cardIsOrigin;
      if (isTherian) return cardIsTherian;
      if (isBlack) return cardIsBlack;
      if (isWhite) return cardIsWhite;
      if (isDawn) return cardIsDawn;
      if (isDusk) return cardIsDusk;
      if (isUltra) return cardIsUltra;
      if (isPrimal) return cardIsPrimal;
      if (isShadowRider) return cardIsShadowRider;
      if (isIceRider) return cardIsIceRider;
      if (isCrowned) return cardIsCrowned;
      if (isEternal) return cardIsEternal;
      if (isAsh) return cardIsAsh;
      if (isResolute) return cardIsResolute;
      if (isComplete) return cardIsComplete;
      if (isSchool) return cardIsSchool;
      if (isMidnight) return cardIsMidnight;
      if (isBlade) return cardIsBlade;
      if (isPirouette) return cardIsPirouette;
      if (isAria) return cardIsAria;
      if (isUnbound) return cardIsUnbound;
      if (isZen) return cardIsZen;

      // If viewing BASE FORM, exclude all special forms
      if (
        cardIsMega ||
        cardIsAlolan ||
        cardIsGalarian ||
        cardIsHisuian ||
        cardIsPaldean ||
        cardIsOrigin ||
        cardIsTherian ||
        cardIsBlack ||
        cardIsWhite ||
        cardIsDawn ||
        cardIsDusk ||
        cardIsUltra ||
        cardIsPrimal ||
        cardIsShadowRider ||
        cardIsIceRider ||
        cardIsCrowned ||
        cardIsEternal ||
        cardIsAsh ||
        cardIsResolute ||
        cardIsMidnight ||
        cardIsBlade ||
        cardIsPirouette ||
        cardIsAria ||
        cardIsUnbound ||
        cardIsZen ||
        cardIsTag
      ) {
        return false;
      }

      return true;
    });

    if (cards.length === 0) {
      container.innerHTML = `<div class="tcg-empty">${
        I18n.t("tcg.no_cards") || "No se encontraron cartas"
      }</div>`;
      return;
    }

    // Build Carousel
    container.innerHTML = "";

    // -- Manual Infinite Scroll Logic --
    // 1. Create duplication for infinite feel (e.g., 4 copies)
    // We use enough copies so the user never hits the edge easily
    const isSmallSet = cards.length < 6;
    const copies = isSmallSet ? 1 : 4;
    let infiniteList = [];
    for (let i = 0; i < copies; i++) {
      infiniteList = [...infiniteList, ...cards];
    }

    // 2. Create Outer Wrapper with Arrows
    container.innerHTML = "";
    const outerWrapper = document.createElement("div");
    outerWrapper.className = "tcg-carousel-wrapper-outer";

    const btnPrev = document.createElement("button");
    btnPrev.className = "tcg-nav-btn prev";
    btnPrev.innerHTML = '<i data-lucide="chevron-left"></i>';
    btnPrev.ariaLabel = "Previous cards";

    const btnNext = document.createElement("button");
    btnNext.className = "tcg-nav-btn next";
    btnNext.innerHTML = '<i data-lucide="chevron-right"></i>';
    btnNext.ariaLabel = "Next cards";

    const scrollContainer = document.createElement("div");
    scrollContainer.className = "tcg-carousel-container";
    // Important: No ID collision, use class or unique ID if needed.

    // 3. Render Cards
    const createCardNode = (card) => {
      const cardWrap = document.createElement("div");
      cardWrap.className = "tcg-card-wrapper";

      const img = document.createElement("img");
      img.className = "tcg-card-img loading";
      img.alt = card.name;
      img.loading = "lazy";

      let src = "assets/img/fallback/fallback.png";
      if (card.images && card.images.small) {
        src = card.images.small;
      } else if (card.image) {
        if (card.image.endsWith(".png") || card.image.endsWith(".jpg")) {
          src = card.image;
        } else {
          src = `${card.image}/low.png`;
        }
      }
      if (!src) src = "assets/img/fallback/fallback.png";

      img.src = src;

      img.onload = () => img.classList.remove("loading");
      img.onerror = () => {
        if (img.src !== "assets/img/fallback/fallback.png") {
          img.src = "assets/img/fallback/fallback.png";
        }
        img.classList.remove("loading");
      };

      const setName = document.createElement("div");
      setName.className = "tcg-set-name";
      let setNameText = "";
      if (card.set && typeof card.set === "object" && card.set.name) {
        setNameText = card.set.name;
      } else if (card.set && typeof card.set === "string") {
        setNameText = card.set;
      } else {
        setNameText = "Set ???";
      }
      setName.textContent = setNameText;
      setName.title = setNameText;

      cardWrap.onclick = () => {
        window.open(
          `pages/cards.html?card=${encodeURIComponent(card.id)}`,
          "_blank",
        );
      };

      cardWrap.appendChild(img);
      cardWrap.appendChild(setName);
      return cardWrap;
    };

    const fragment = document.createDocumentFragment();
    infiniteList.forEach((card) => {
      fragment.appendChild(createCardNode(card));
    });

    scrollContainer.appendChild(fragment);

    // Create Bottom Controls Container
    const controlsBottom = document.createElement("div");
    controlsBottom.className = "tcg-controls-bottom";
    if (isSmallSet) controlsBottom.style.display = "none";
    controlsBottom.appendChild(btnPrev);
    controlsBottom.appendChild(btnNext);

    outerWrapper.appendChild(scrollContainer);
    outerWrapper.appendChild(controlsBottom);
    container.appendChild(outerWrapper);
    if (typeof lucide !== "undefined") lucide.createIcons();

    // 4. Infinite Scroll & Button Logic
    // Wait for render to calculate widths
    requestAnimationFrame(() => {
      if (cards.length > 0) {
        // Calculate width of one set
        // We can approximate or measure. Since cards are consistent width (140px + gap 16px?)
        // Better to measure:
        const singleSetCount = cards.length;
        const approximateCardWidth = 140 + 16; // width + gap
        const singleSetWidth = singleSetCount * approximateCardWidth;

        // Start in the middle set (index 1 of 0..3)
        // copies = 4. Middle is start of copy 1 or 2.
        // Let's start at the beginning of the second copy (index 1)
        const startScroll = isSmallSet ? 0 : singleSetWidth;
        scrollContainer.scrollLeft = startScroll;

        if (isSmallSet) {
          scrollContainer.style.overflowX = "hidden";
          scrollContainer.style.justifyContent = "center";
        }

        // Infinite Loop Handler
        const handleScroll = () => {
          if (isSmallSet) return;
          const scrollLeft = scrollContainer.scrollLeft;
          const scrollWidth = scrollContainer.scrollWidth;
          const clientWidth = scrollContainer.clientWidth;

          // If we are near the start (first copy), jump to corresponding position in 3rd copy
          if (scrollLeft < 100) {
            scrollContainer.scrollLeft = scrollLeft + singleSetWidth * 2;
          }
          // If we are near the end (4th copy), jump to corresponding position in 2nd copy
          else if (scrollLeft > singleSetWidth * 3) {
            scrollContainer.scrollLeft = scrollLeft - singleSetWidth * 2;
          }
        };

        scrollContainer.addEventListener("scroll", handleScroll);

        // Button Click Handlers
        btnPrev.onclick = () => {
          scrollContainer.scrollBy({ left: -300, behavior: "smooth" });
        };
        btnNext.onclick = () => {
          scrollContainer.scrollBy({ left: 300, behavior: "smooth" });
        };

        // Drag-to-scroll logic
        let isDown = false;
        let startX;
        let scrollLeft;

        scrollContainer.addEventListener("mousedown", (e) => {
          if (isSmallSet) return;
          isDown = true;
          scrollContainer.style.cursor = "grabbing";
          scrollContainer.style.userSelect = "none";
          startX = e.pageX - scrollContainer.offsetLeft;
          scrollLeft = scrollContainer.scrollLeft;
        });
        scrollContainer.addEventListener("mouseleave", () => {
          isDown = false;
          scrollContainer.style.cursor = "grab";
        });
        scrollContainer.addEventListener("mouseup", () => {
          isDown = false;
          scrollContainer.style.cursor = "grab";
          scrollContainer.style.removeProperty("user-select");
        });
        scrollContainer.addEventListener("mousemove", (e) => {
          if (!isDown || isSmallSet) return;
          e.preventDefault();
          const x = e.pageX - scrollContainer.offsetLeft;
          const walk = (x - startX) * 2; // scroll-fast
          scrollContainer.scrollLeft = scrollLeft - walk;
        });

        // Initialize cursor
        if (!isSmallSet) scrollContainer.style.cursor = "grab";
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="tcg-error">Error al cargar cartas</div>`;
  }
}

/**
 * Maps PokéAPI names to TCG search queries
 */
function getTcgSearchQuery(pokemonName) {
  const lower = pokemonName.toLowerCase();

  // Mega
  if (lower.includes("-mega")) {
    // "charizard-mega-x" -> "Mega Charizard" (or M Charizard)
    // Usually "Mega [Name]" works
    const base = lower.split("-")[0];
    return `Mega ${toTitle(base)}`;
  }

  // Primal
  if (lower.includes("-primal")) {
    const base = lower.split("-")[0];
    return `Primal ${toTitle(base)}`;
  }

  // Regional Forms
  if (lower.includes("-alola")) {
    const base = lower.split("-")[0];
    return `Alolan ${toTitle(base)}`;
  }
  if (lower.includes("-galar")) {
    const base = lower.split("-")[0];
    return `Galarian ${toTitle(base)}`;
  }
  if (lower.includes("-hisui")) {
    const base = lower.split("-")[0];
    return `Hisuian ${toTitle(base)}`;
  }
  if (lower.includes("-paldea")) {
    const base = lower.split("-")[0];
    return `Paldean ${toTitle(base)}`;
  }

  // Origin Forme (Giratina, Dialga, Palkia)
  if (lower.includes("-origin")) {
    const base = lower.split("-")[0];
    return `${toTitle(base)} Origin`;
  }

  // Therian Forme (Tornadus, Thundurus, Landorus, Enamorus)
  if (lower.includes("-therian")) {
    const base = lower.split("-")[0];
    return `${toTitle(base)} Therian`;
  }

  // Black/White Kyurem
  if (lower.includes("-black")) {
    const base = lower.split("-")[0];
    return `Black ${toTitle(base)}`;
  }
  if (lower.includes("-white")) {
    const base = lower.split("-")[0];
    return `White ${toTitle(base)}`;
  }

  // Dawn Wings / Dusk Mane Necrozma
  if (lower.includes("-dawn")) {
    return "Dawn Wings Necrozma";
  }
  if (lower.includes("-dusk")) {
    return "Dusk Mane Necrozma";
  }

  // Ultra Necrozma
  if (lower.includes("-ultra")) {
    return "Ultra Necrozma";
  }

  // Shadow Rider / Ice Rider Calyrex
  if (lower.includes("-shadow")) {
    const base = lower.split("-")[0];
    return `Shadow Rider ${toTitle(base)}`;
  }
  if (lower.includes("-ice")) {
    const base = lower.split("-")[0];
    return `Ice Rider ${toTitle(base)}`;
  }

  // Crowned forms (Zacian, Zamazenta)
  if (lower.includes("-crowned")) {
    const base = lower.split("-")[0];
    return `${toTitle(base)} Crowned`;
  }

  // Ash-Greninja
  if (lower.includes("-ash")) {
    return "Ash-Greninja";
  }

  // Resolute Forme (Keldeo)
  if (lower.includes("-resolute")) {
    const base = lower.split("-")[0];
    return `${toTitle(base)} Resolute`;
  }

  // Complete Forme (Zygarde)
  if (lower.includes("-complete")) {
    return "Zygarde Complete";
  }

  // Midnight Lycanroc
  if (lower.includes("-midnight")) {
    return "Lycanroc Midnight";
  }

  // Blade Forme (Aegislash)
  if (lower.includes("-blade")) {
    const base = lower.split("-")[0];
    return `${toTitle(base)} Blade`;
  }

  // Pirouette Forme (Meloetta)
  if (lower.includes("-pirouette")) {
    return "Meloetta Pirouette";
  }

  // Unbound (Hoopa)
  if (lower.includes("-unbound")) {
    return "Hoopa Unbound";
  }

  // Zen Mode (Darmanitan)
  if (lower.includes("-zen")) {
    const base = lower.split("-")[0];
    return `${toTitle(base)} Zen`;
  }

  // Special Cases
  if (lower === "mime-jr") return "Mime Jr.";
  if (lower === "mr-mime") return "Mr. Mime";
  if (lower === "mr-rime") return "Mr. Rime";
  if (lower === "type-null") return "Type: Null";
  if (lower === "ho-oh") return "Ho-Oh";
  if (lower === "porygon-z") return "Porygon-Z";
  
  // Treasures of Ruin
  if (lower === "wo-chien") return "Wo-Chien";
  if (lower === "chien-pao") return "Chien-Pao";
  if (lower === "ting-lu") return "Ting-Lu";
  if (lower === "chi-yu") return "Chi-Yu";

  // Jangmo-o line
  if (lower === "jangmo-o") return "Jangmo-o";
  if (lower === "hakamo-o") return "Hakamo-o";
  if (lower === "kommo-o") return "Kommo-o";

  // Paradox Pokemon & Tapus that use SPACE instead of hyphen in TCG
  const spaceNames = [
    "tapu-koko", "tapu-lele", "tapu-bulu", "tapu-fini",
    "great-tusk", "scream-tail", "brute-bonnet", "flutter-mane", 
    "slither-wing", "sandy-shocks", "roaring-moon", 
    "iron-treads", "iron-bundle", "iron-hands", "iron-jugulis", 
    "iron-moth", "iron-thorns", "iron-valiant",
    "walking-wake", "gouging-fire", "raging-bolt",
    "iron-leaves", "iron-boulder", "iron-crown"
  ];
  if (spaceNames.includes(lower)) {
    return lower.split("-").map(toTitle).join(" ");
  }

  // Base Pokemon (ignore other suffixes like -totem for broad matching)
  return toTitle(lower.split("-")[0]);
}

// --- Initialization ---
// --- Initialization ---
async function init() {
  try {
    // Wait for I18n to be ready before doing ANYTHING
    if (!I18n.translations[I18n.currentLang]) {
      await new Promise((resolve) =>
        window.addEventListener("languageChanged", resolve, { once: true }),
      );
    }

    loadSettings();

    const searchEl = $("#search");
    if (searchEl) {
      searchEl.addEventListener("input", debounce(() => {
        state.search = searchEl.value;
        buildFilteredList();
      }, 300));
    }

    const regionEl = $("#region");
    if (regionEl) {
      regionEl.addEventListener("change", (e) => {
        state.region = e.target.value;
        buildFilteredList();
      });
    }

    const generationEl = $("#generation");
    if (generationEl) {
      generationEl.addEventListener("change", (e) => {
        state.generation = e.target.value;
        buildFilteredList();
      });
    }

    const typeModeEl = $("#typeMode");
    if (typeModeEl) {
      typeModeEl.addEventListener("change", (e) => {
        state.typeMode = e.target.value;
        buildFilteredList();
      });
    }

    const sortEl = $("#sort");
    if (sortEl) {
      sortEl.addEventListener("change", (e) => {
        state.sort = e.target.value;
        applySort().then(() => {
          updatePager();
          renderPage();
          saveSettings();
        });
      });
    }

    const perPageEl = $("#perPage");
    if (perPageEl) {
      perPageEl.addEventListener("change", (e) => {
        state.perPage = Number(e.target.value);
        state.page = 1;
        updateGridColumns(state.perPage);
        updatePager();
        renderPage();
        saveSettings();
      });
    }

    const filterFavsBtn = $("#filterFavs");
    if (filterFavsBtn) {
      filterFavsBtn.addEventListener("click", () => {
        state.showOnlyFavorites = !state.showOnlyFavorites;
        filterFavsBtn.classList.toggle("active", state.showOnlyFavorites);
        buildFilteredList();
        saveSettings();
      });
    }

    const includeFormsEl = $("#includeForms");
    if (includeFormsEl) {
      includeFormsEl.addEventListener("change", (e) => {
        state.includeForms = e.target.checked;
        buildFilteredList();
      });
    }

    const gridShinyEl = $("#gridShiny");
    if (gridShinyEl) {
      gridShinyEl.addEventListener("change", (e) => {
        state.gridShiny = e.target.checked;
        renderPage();
        saveSettings();
      });
    }

    const showTeamsEl = $("#showTeams");
    if (showTeamsEl) {
      showTeamsEl.addEventListener("change", (e) => {
        const show = e.target.checked;
        state.showTeams = show;

        // Toggle visibility of toggle row / favorites
        const favCountSection = $(".d-flex.flex-wrap.gap-2.mb-2");
        if (favCountSection) favCountSection.style.display = show ? "" : "none";

        // Refresh Team Panels
        updateTeamPanel();
        if (show) {
          calculateWinRate();
          if (window.calculateWinProbability) calculateWinProbability();
        } else {
          const winProbModule = $("#winProbModule");
          const teamPanel = $(".team-panel");
          const teamStats = $("#teamStats");
          if (winProbModule) winProbModule.style.display = "none";
          if (teamPanel) teamPanel.style.display = "none";
          if (teamStats) teamStats.style.display = "none";
        }

        saveSettings();
      });
    }

    const prevBtn = $("#prevBtn");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (state.page > 1) {
          state.page--;
          updatePager();
          renderPage();
          saveSettings();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    const nextBtn = $("#nextBtn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const max = Math.ceil(state.filteredNames.length / state.perPage);
        if (state.page < max) {
          state.page++;
          updatePager();
          renderPage();
          saveSettings();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    const goBtn = $("#goBtn");
    const pageJumpInput = $("#pageJump");

    const performPageJump = () => {
      const p = Number(pageJumpInput.value);
      const max = Math.ceil(state.filteredNames.length / state.perPage);
      if (p >= 1) {
        state.page = Math.min(p, max); // Clamp to max
        updatePager();
        renderPage();
        saveSettings();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    if (goBtn) {
      goBtn.addEventListener("click", performPageJump);
    }
    if (pageJumpInput) {
      pageJumpInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          performPageJump();
        }
      });
    }

    // Modal Closure Logic
    const modal = $("#modal");
    if (modal) {
      // Click outside to close (backdrop)
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.close();
      });

      const closeBtn = $("#closeDetailBtn");
      if (closeBtn) closeBtn.onclick = () => modal.close();
    }

    // Cleanup: Remove duplicate load calls and consolidate languageChanged listener
    if (document.getElementById("pokedexGrid")) {
      // Discover dynamic types/regions/gens from API (future-proofing)
      await discoverDynamicLists();

      await loadIndex();
      await loadTypeSets();
      await loadRegions();
      await loadGenerations();

      createTypeFilters();
      
      // Pre-load dictionaries and other data for UI speed
      fetchI18nDict("item");
      fetchI18nDict("move");
      fetchI18nDict("ability");
      loadItems(); // Pre-load items list
      ensureNaturesLoaded();
      buildFilteredList();
      updateGridColumns(state.perPage);

      window.addEventListener("languageChanged", () => {
        // Update Type Chips
        const chips = $("#typeChips");
        if (chips) {
          TYPE_LIST.forEach((t, i) => {
            const btn = chips.children[i];
            if (btn)
              btn.querySelector("span").textContent =
                I18n.t(`types.${t}`) || toTitle(t);
          });
        }

        // Re-render grid and team
        if (state.sort.startsWith("name")) {
          applySort().then(() => {
            renderPage();
            updateTeamPanel();
          });
        } else {
          renderPage();
          updateTeamPanel();
        }
      });
    }

    const includeFormsEL = $("#includeForms");
    const gridShinyEL = $("#gridShiny");
    const showTeamsEL = $("#showTeams");
    if (includeFormsEL) includeFormsEL.checked = state.includeForms;
    if (gridShinyEL) gridShinyEL.checked = state.gridShiny;
    if (showTeamsEL) showTeamsEL.checked = state.showTeams;

    // Apply initial team sections visibility
    const showTeams = state.showTeams;
    const winProbModule = $("#winProbModule");
    const teamPanel = $(".team-panel");
    const teamStats = $("#teamStats");
    const favCountSection = $(".d-flex.flex-wrap.gap-2.mb-2");

    if (winProbModule) winProbModule.style.display = showTeams ? "" : "none";
    if (teamPanel) teamPanel.style.display = showTeams ? "" : "none";
    if (teamStats) teamStats.style.display = showTeams ? "" : "none";
    if (favCountSection)
      favCountSection.style.display = showTeams ? "" : "none";

    const searchInput = $("#search");
    const generationSelect = $("#generation");
    const perPageSelect = $("#perPage");
    const regionSelect = $("#region");
    const typeModeSelect = $("#typeMode");
    const sortSelect = $("#sort");
    const filterFavsBtn_ = $("#filterFavs");

    if (searchInput) searchInput.value = state.search;
    if (generationSelect) generationSelect.value = state.generation;
    if (perPageSelect) perPageSelect.value = state.perPage;
    if (regionSelect) regionSelect.value = state.region;
    if (typeModeSelect) typeModeSelect.value = state.typeMode;
    if (sortSelect) sortSelect.value = state.sort;
    if (filterFavsBtn_)
      filterFavsBtn_.classList.toggle("active", state.showOnlyFavorites);

    // Team Switcher Listeners
    const tabs = $$(".team-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        state.activeTeam = tab.dataset.team;
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const teamColor =
          state.activeTeam === "user" ? "var(--c-primary)" : "#fb7185";
        $(".team-panel").style.borderTopColor = teamColor;

        updateTeamPanel();
        saveSettings();
      });
    });

    // Activate existing tab on load
    const activeTab = $(`.team-tab[data-team="${state.activeTeam}"]`);
    if (activeTab) activeTab.click();

    // Global Keyboard Navigation
    document.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
        return;
      }
      const modal = document.getElementById("modal");
      if (modal && modal.open) {
        if (e.key === "ArrowLeft") {
          const prev = document.getElementById("prevMon");
          if (prev && !prev.disabled) {
            e.preventDefault();
            prev.click();
          }
        } else if (e.key === "ArrowRight") {
          const next = document.getElementById("nextMon");
          if (next && !next.disabled) {
            e.preventDefault();
            next.click();
          }
        }
      }
    });

    // Swipe Navigation
    if (window.SwipeDetector) {
      // Modal Swipe
      const modalEl = document.getElementById("modal");
      if (modalEl) {
        new SwipeDetector(modalEl, {
          left: () => {
            const next = document.getElementById("nextMon");
            if (next && !next.disabled) next.click();
          },
          right: () => {
            const prev = document.getElementById("prevMon");
            if (prev && !prev.disabled) prev.click();
          },
        });
      }
    }

    if (location.hash.startsWith("#pokemon/")) {
      const name = location.hash.split("/")[1];
      if (name) openModal(name);
    }
  } catch (err) {}
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * PokeSprite Helper
 * Generates URLs for high-quality icons from the PokeSprite repository.
 */
function getPokeSpriteUrl(type, rawName, { shiny = false, form = "" } = {}) {
  const baseUrl =
    "https://raw.githubusercontent.com/msikma/pokesprite/master/icons/";
  const name = rawName.toLowerCase();

  if (type === "pokemon") {
    let fileName = name;
    if (form && form !== name) {
      // PokeSprite uses double hyphen for forms: name--form
      const formSuffix = form.replace(name + "-", "");
      if (formSuffix) fileName = `${name}--${formSuffix}`;
    }
    const path = shiny
      ? `pokemon/shiny/${fileName}.png`
      : `pokemon/${fileName}.png`;
    return baseUrl + path;
  }

  if (type === "item") {
    let category = "hold-item";
    let fileName = name;

    // PokeSprite Item Structure: icons/{category}/{filename}.png
    // Categories: berry, ball, choice-item, held-item, key-item, medicine, tm, etc.

    if (name.includes("berry")) {
      category = "berry";
      fileName = name.replace("-berry", "");
    } else if (name.includes("ball")) {
      category = "ball";
    } else if (name.startsWith("choice-")) {
      category = "choice-item";
    } else if (name.includes("plate")) {
      category = "hold-item"; // Plates are usually in hold-item or similar, check...
      // Actually hold-item is the catch-all.
    } else if (
      [
        "potion",
        "antidote",
        "revive",
        "ether",
        "elixir",
        "herb",
        "heal",
        "candy",
        "zinc",
        "calcium",
        "protein",
        "iron",
        "carbos",
        "hp-up",
      ].some((k) => name.includes(k))
    ) {
      category = "medicine";
    } else if (
      name.includes("tm") ||
      name.includes("hm") ||
      name.includes("tr")
    ) {
      category = "tm";
    } else if (
      name.includes("letter") ||
      name.includes("pass") ||
      name.includes("ticket") ||
      name.startsWith("exp-")
    ) {
      category = "key-item";
    } else if (name.includes("fossil")) {
      category = "fossil";
    } else if (
      ["stone", "shard", "gem", "fossil", "nugget", "pearl", "star-piece"].some(
        (k) => name.includes(k),
      )
    ) {
      // Gems/Shards etc might be in other folders or hold-item.
      // In Pokesprite, gems are in "hold-item" but stones like fire-stone are in "evo-item"
      if (name.includes("stone")) category = "evo-item";
      else category = "hold-item";
    }

    return baseUrl + `${category}/${fileName}.png`;
  }

  return "";
}

function chooseSprite(d, { shiny = false, gender = "auto" } = {}) {
  if (!d || !d.sprites) return "";
  const s = d.sprites;

  // 1. Prioritize Modern 3D Animated (Showdown)
  const showdown = s.other?.showdown;

  const pickFrom = (node) => {
    if (!node) return null;

    // Determine the absolute best base fallback within this node
    const fallback = node.front_default || node.front_female;
    const shinyFallback = node.front_shiny || node.front_shiny_female;

    // STRICT SHINY CHECK: If shiny requested but no shiny sprite in this source,
    // return null to allow falling back to next source (e.g. static).
    if (shiny && !shinyFallback) return null;

    const base = shiny ? shinyFallback : fallback;

    if (gender === "female") {
      const female = shiny ? node.front_shiny_female : node.front_female;
      return female || base;
    }
    if (gender === "male") {
      const male = shiny ? node.front_shiny : node.front_default;
      return male || base;
    }
    return base;
  };

  const anim3d = pickFrom(showdown);
  if (anim3d) return anim3d;

  const bw = s.versions?.["generation-v"]?.["black-white"]?.animated;
  const anim2d = pickFrom(bw);
  if (anim2d) return anim2d;

  // 3. Fallback to static sprites (standard)
  // For static, we can be less strict because if we are here, we have no better option.
  // But wait, if shiny is requested and we have NO shiny static, maybe we should still return null?
  // Current logic: prioritize shiny versions if available.

  const reg = pickFrom(s);
  // If we are strictly looking for shiny and found nothing so far...
  if (shiny && !reg) {
    // Check if we have a Home Shiny or Official Shiny
    if (s.other?.home?.front_shiny) return s.other.home.front_shiny;
    if (s.other?.["official-artwork"]?.front_shiny)
      return s.other["official-artwork"].front_shiny;

    // Fallback to static default (non-shiny) ONLY if absolutely nothing else found?
    // User said "si el sprite no existe que aparezca el fallback".
    // So if NO shiny exists anywhere, show non-shiny.
    // But we should prioritize *any* shiny over *any* non-shiny.
  }

  if (reg) return reg;
  if (shiny && s.other?.home?.front_shiny) return s.other.home.front_shiny;
  if (s.other?.home?.front_default) return s.other.home.front_default;
  if (s.other?.["official-artwork"]?.front_default)
    return s.other["official-artwork"].front_default;

  // Last resort fallback: PokeSprite
  return getPokeSpriteUrl("pokemon", d.species.name, { shiny, form: d.name });
}

function fallbackArt(d) {
  return (
    d.sprites.other?.["official-artwork"]?.front_default ||
    d.sprites.front_default ||
    ""
  );
}

function collectSpriteOptions(d) {
  const o = [],
    s = d.sprites,
    add = (k, l, u) => {
      // ALWAYS add options, even if 'u' (url) is missing
      o.push({ key: k, label: l });
    };
  add("front_default", I18n.t("modal.sprite_front"), s.front_default);
  add("back_default", I18n.t("modal.sprite_back"), s.back_default);
  add("front_shiny", I18n.t("modal.sprite_front_shiny"), s.front_shiny);
  add("back_shiny", I18n.t("modal.sprite_back_shiny"), s.back_shiny);
  add(
    "official",
    I18n.t("modal.sprite_official"),
    s.other?.["official-artwork"]?.front_default,
  );
  add(
    "home_default",
    I18n.t("modal.sprite_home"),
    s.other?.home?.front_default,
  );
  add(
    "home_shiny",
    I18n.t("modal.sprite_home_shiny"),
    s.other?.home?.front_shiny,
  );
  // Showdown animated sprites (new from PokéAPI)
  add(
    "showdown",
    I18n.t("modal.sprite_showdown"),
    s.other?.showdown?.front_default,
  );
  add(
    "showdown_shiny",
    I18n.t("modal.sprite_showdown_shiny"),
    s.other?.showdown?.front_shiny,
  );
  o.unshift({ key: "auto", label: I18n.t("modal.sprite_auto") });
  return o;
}

function lookupSpriteByKey(d, key, { shiny, gender }) {
  const s = d.sprites;
  switch (key) {
    case "front_default":
      return gender === "female"
        ? s.front_female || s.front_default
        : s.front_default;
    case "back_default":
      return gender === "female"
        ? s.back_female || s.back_default
        : s.back_default;
    case "front_shiny":
      return s.front_shiny;
    case "back_shiny":
      return s.back_shiny;
    case "official":
      return s.other?.["official-artwork"]?.front_default;
    case "home_default":
      return s.other?.home?.front_default;
    case "home_shiny":
      return s.other?.home?.front_shiny;
    // Showdown animated sprites
    case "showdown":
      return gender === "female"
        ? s.other?.showdown?.front_female || s.other?.showdown?.front_default
        : s.other?.showdown?.front_default;
    case "showdown_shiny":
      return gender === "female"
        ? s.other?.showdown?.front_shiny_female ||
            s.other?.showdown?.front_shiny
        : s.other?.showdown?.front_shiny;
    default:
      return null;
  }
}

function getGridSprite(d, shiny) {
  const s = d.sprites;
  if (!s) return "";

  // 1. Standard (Pixel)
  let url = shiny ? s.front_shiny : s.front_default;
  if (url) return url;

  // 2. Home (High Qual Static)
  if (s.other?.home) {
    url = shiny ? s.other.home.front_shiny : s.other.home.front_default;
    if (url) return url;
  }

  // 3. Official Artwork (Static)
  if (s.other?.["official-artwork"]) {
    url = shiny
      ? s.other["official-artwork"].front_shiny
      : s.other["official-artwork"].front_default;
    if (url) return url;
  }

  // 4. Fallback to default if shiny was requested but missing
  if (shiny && s.front_default) return s.front_default;

  return "";
}

function renderEffectiveness(types) {
  // Incoming Damage (Recibe más daño de)
  const multFrom = {};
  TYPE_LIST.forEach((t) => (multFrom[t] = 1));

  types.forEach((t) => {
    const info = state.typeInfo.get(t);
    if (!info) return;
    info.damage_relations.double_damage_from.forEach(
      (x) => (multFrom[x.name] *= 2),
    );
    info.damage_relations.half_damage_from.forEach(
      (x) => (multFrom[x.name] *= 0.5),
    );
    info.damage_relations.no_damage_from.forEach(
      (x) => (multFrom[x.name] *= 0),
    );
  });

  const fromDiv = $("#effFrom");
  fromDiv.innerHTML = "";
  Object.entries(multFrom).forEach(([t, m]) => {
    if (m !== 1) fromDiv.innerHTML += effBadge(t, m);
  });

  // Outgoing Damage (Hace más daño a)
  // Logic: For each of the pokemon's types, find what it deals damage to.
  // Note: A pokemon can have 2 types. We should probably show the BEST multiplier it can deal?
  // Or just list the types it hits super effectively (x2 or x4)?
  // The user asked for "poner los multiplicadores".
  // Usually "Deals more damage to" implies types that this pokemon is good against.
  // So we check `double_damage_to` for each of its types.

  const dealsTo = new Map(); // Type -> Max Multiplier

  types.forEach((t) => {
    const info = state.typeInfo.get(t);
    if (!info) return;

    // We only care about > 1x for "Hace más daño a" usually.
    info.damage_relations.double_damage_to.forEach((x) => {
      const current = dealsTo.get(x.name) || 1;
      dealsTo.set(x.name, Math.max(current, 2));
    });
    // Note: We don't usually combine dual types for OUTGOING damage because you use one move at a time.
    // So if I am Fire/Flying, I deal x2 to Grass (Fire) and x2 to Grass (Flying). It's just x2.
    // But if I am Fire/Ground, I deal x2 to Bug (Fire) and x0.5 to Bug (Ground).
    // But I would use the Fire move. So I deal x2.
    // So we just collect all types where at least one of my types deals > 1x.
  });

  const toDiv = $("#effTo");
  toDiv.innerHTML = "";
  if (dealsTo.size === 0) {
    toDiv.textContent = "—";
  } else {
    [...dealsTo.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([t, m]) => {
        toDiv.innerHTML += effBadge(t, m);
      });
  }
}

/**
 * Phase 1.4: Renders past_types section if the Pokémon had different types in earlier generations.
 * Example: Clefairy was Normal in Gen I-V, became Fairy in Gen VI.
 */
function renderPastTypes(data) {
  const section = $("#pastTypes");
  if (!section) return;

  const pastTypes = data.past_types;
  if (!pastTypes || pastTypes.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  const label = section.querySelector(".past-types-label");
  const list = section.querySelector(".past-types-list");

  label.textContent = I18n.t("modal.past_types") || "Tipos en generaciones anteriores:";
  list.innerHTML = "";

  pastTypes.forEach((pt) => {
    const genName = pt.generation?.name || "?";
    const genLabel = I18n.t("biology.generations." + genName) || toTitle(genName);
    const typeNames = (pt.types || [])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name);

    const row = document.createElement("div");
    row.className = "past-type-row";
    row.innerHTML = `
      <span class="past-type-gen">${genLabel}:</span>
      <span class="past-type-badges">${typeNames.map(typeBadge).join("")}</span>
    `;
    list.appendChild(row);
  });
}

/**
 * Phase 1.2: Renders encounter locations for a Pokémon.
 * Uses the pokemon.location_area_encounters endpoint.
 */
async function renderEncounterLocations(pokemonId) {
  const section = document.getElementById("encounterSection");
  const container = document.getElementById("encounterLocations");
  if (!section || !container) return;

  container.innerHTML = `<div class="spinner-small"></div>`;
  section.style.display = "block";

  try {
    const encounters = await fetchJSON(`${API_URL}/pokemon/${pokemonId}/encounters`);

    if (!encounters || encounters.length === 0) {
      section.style.display = "none";
      return;
    }

    container.innerHTML = "";

    // Apply grid layout inline on the container
    container.style.cssText = "display:grid; grid-template-columns:repeat(2,1fr); gap:20px; margin-top:20px; max-height:550px; overflow-y:auto; padding:10px;";

    // Group encounters by Location Area
    const byLocation = new Map();
    encounters.forEach((enc) => {
      const locArea = enc.location_area?.name || "unknown";
      if (!byLocation.has(locArea)) byLocation.set(locArea, []);
      enc.version_details.forEach(vd => {
        byLocation.get(locArea).push(vd.version.name);
      });
    });

    // Sort locations by name
    const sortedLocations = [...byLocation.keys()].sort();

    sortedLocations.forEach((locKey) => {
      const uniqueVersions = [...new Set(byLocation.get(locKey))];
      const locName = toTitle(locKey.replace(/-/g, " "));

      // === CARD ===
      const card = document.createElement("div");
      card.style.cssText = "background:rgba(255,255,255,0.06); border:2px solid rgba(255,255,255,0.25); border-left:5px solid #6366f1; border-radius:10px; padding:15px; display:flex; flex-direction:column; gap:12px; box-shadow:0 4px 15px rgba(0,0,0,0.3); transition:transform 0.2s;";

      // === LOCATION NAME ===
      const nameEl = document.createElement("div");
      nameEl.textContent = locName;
      nameEl.style.cssText = "font-weight:800; font-size:0.95rem; color:#fff; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1);";
      card.appendChild(nameEl);

      // === VERSIONS CONTAINER ===
      const versionsContainer = document.createElement("div");
      versionsContainer.style.cssText = "display:flex; flex-wrap:wrap; gap:8px; align-items:center;";

      uniqueVersions.forEach(v => {
        const tag = document.createElement("span");
        const label = I18n.t("versions." + v) || toTitle(v.replace(/-/g, " "));
        tag.textContent = label;
        tag.style.cssText = "display:inline-block; background:rgba(255,255,255,0.12); color:#fff; padding:4px 12px; border-radius:50px; border:1px solid rgba(255,255,255,0.35); font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;";
        versionsContainer.appendChild(tag);
      });

      card.appendChild(versionsContainer);

      // Hover effect
      card.addEventListener("mouseenter", () => { card.style.transform = "translateY(-3px)"; card.style.borderColor = "rgba(255,255,255,0.5)"; });
      card.addEventListener("mouseleave", () => { card.style.transform = "translateY(0)"; card.style.borderColor = "rgba(255,255,255,0.25)"; });

      container.appendChild(card);
    });

  } catch (e) {
    console.error("Error rendering encounters:", e);
    section.style.display = "none";
  }
}

/**
 * Phase 2.1: Renders regional Pokédex numbers from species.pokedex_numbers.
 */
function renderPokedexNumbers(species) {
  const section = $("#pokedexNumbersSection");
  const grid = $("#pokedexNumbersGrid");
  if (!section || !grid) return;

  const numbers = species.pokedex_numbers;
  if (!numbers || numbers.length <= 1) {
    // Only national dex = not interesting
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  grid.innerHTML = "";

  numbers.forEach((pn) => {
    const dexName = pn.pokedex?.name || "unknown";
    const num = pn.entry_number;
    const label = I18n.t("pokedex." + dexName) || toTitle(dexName.replace(/-/g, " "));

    const badge = document.createElement("div");
    badge.className = "pokedex-num-badge";
    badge.innerHTML = `<span class="pdx-name">${label}</span><span class="pdx-num">#${num}</span>`;
    grid.appendChild(badge);
  });
}

function toggleFavorite(name) {
  if (state.favorites.has(name)) state.favorites.delete(name);
  else state.favorites.add(name);
  updateFavTeamBadges();
  saveSettings();
}

async function toggleTeam(name) {
  const currentTeam =
    state.activeTeam === "user" ? state.team : state.rivalTeam;
  const idx = currentTeam.findIndex((t) => t.name === name);

  if (idx !== -1) {
    currentTeam.splice(idx, 1);
  } else {
    if (currentTeam.length < 6) {
      let defaultEvs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      try {
        const d = await getPokemon(name);
        d.stats.forEach((s) => {
          const statName = s.stat.name;
          const effort = s.effort;
          if (effort > 0) {
            if (statName === "hp") defaultEvs.hp = effort;
            else if (statName === "attack") defaultEvs.atk = effort;
            else if (statName === "defense") defaultEvs.def = effort;
            else if (statName === "special-attack") defaultEvs.spa = effort;
            else if (statName === "special-defense") defaultEvs.spd = effort;
            else if (statName === "speed") defaultEvs.spe = effort;
          }
        });
      } catch (e) {}

      currentTeam.push({
        name,
        moves: [null, null, null, null],
        item: null,
        level: 50,
        nature: null,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: defaultEvs,
        id: Date.now(),
      });
    } else {
      alert(I18n.t("team.full_alert"));
    }
  }
  updateTeamPanel();
  updateFavTeamBadges();
  saveSettings();
  if (window.calculateWinProbability) calculateWinProbability();
}

function updateFavTeamBadges() {
  $("#favCount").textContent = state.favorites.size;
  $("#userTeamCountBadge").textContent = state.team.length;
  $("#rivalTeamCountBadge").textContent = state.rivalTeam.length;
  $("#teamCount").textContent =
    state.activeTeam === "user" ? state.team.length : state.rivalTeam.length;
}

// Ensure Natures are loaded for stat calc
let teamRenderingLock = false;
async function ensureNaturesLoaded() {
  if (window.allNatures) return;
  try {
    const res = await window.fetchCached(
      `${CONSTANTS.API_URL}/nature?limit=100`,
    );
    const details = await Promise.all(
      res.results.map((n) => window.fetchCached(n.url)),
    );
    window.allNatures = details;
  } catch (e) {
    window.allNatures = [];
  }
}

async function updateTeamPanel() {
  if (teamRenderingLock) return;
  teamRenderingLock = true;
  try {
    const container = $("#teamSlots");
    const teamPanel = $(".team-panel");
    if (!container) return;

    if (!state.showTeams) {
      if (teamPanel) teamPanel.style.display = "none";
      return;
    }
    if (teamPanel) teamPanel.style.display = "";

    container.innerHTML = "";

    const currentTeam =
      state.activeTeam === "user" ? state.team : state.rivalTeam;
    $("#teamCount").textContent = currentTeam.length;
    $("#userTeamCountBadge").textContent = state.team.length;
    $("#rivalTeamCountBadge").textContent = state.rivalTeam.length;

    for (let i = 0; i < 6; i++) {
      const member = currentTeam[i];
      const div = document.createElement("div");
      div.className =
        "slot interactive-card" +
        (state.activeTeam === "rival" ? " rival-slot" : "");

      if (member) {
        div.onclick = () => openTeamEditModal(i);
        const d = await getPokemon(member.name);
        const spriteUrl = getGridSprite(d, state.gridShiny);
        div.classList.add("pixelated");

        const tps = d.types
          .sort((a, b) => a.slot - b.slot)
          .map((x) => x.type.name);
        div.classList.add(tps.length > 1 ? "bg-2" : "bg-1", `type-${tps[0]}`);
        div.style.setProperty("--tc1", `var(--tc-${tps[0]})`);
        if (tps.length === 2) {
          div.classList.add("dual");
          div.style.setProperty("--tc2", `var(--tc-${tps[1]})`);
        }

        let itemHtml = "";
        if (member.item) {
          const apiIcon = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${member.item}.png`;
          const fallbackIcon = getPokeSpriteUrl("item", member.item);
          itemHtml = `<div class="slot-item-container" title="${toTitle(member.item)}">
                <img src="${apiIcon}" class="slot-item-sprite" alt="${member.item}">
              </div>`;
        }

        // Fix: Handle localized names for alternate forms (>10000)
        let displayName = toTitle(d.name);

        div.innerHTML = `
              <div class="slot-header">
                 <div class="slot-types">${tps.map((t) => svgType(t)).join("")}</div>
                 <button class="small-btn delete-btn" onclick="event.stopPropagation(); toggleTeam('${member.name}')" title="${I18n.t("team.add_remove")}">
                    <i data-lucide="x" style="width:16px;height:16px;"></i>
                 </button>
              </div>
              <div class="slot-body">
                <img src="${spriteUrl}" alt="${member.name}" class="slot-main-sprite">
                ${itemHtml}
              </div>
              <div class="slot-footer">
                <div class="slot-name">${displayName}</div>
                <div class="slot-level">Lv. ${member.level}</div>
              </div>
            `;
        container.appendChild(div);
      } else {
        div.classList.add("empty");
        div.innerHTML = `<div class="slot-body"><span class="opacity-25">+</span></div>`;
        div.onclick = () => showQuickAddInput(div, i);
        container.appendChild(div);
      }
    }

    calculateWinRate();
    if (window.calculateWinProbability) calculateWinProbability();
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (e) {
  } finally {
    teamRenderingLock = false;
  }
}

/**
 * Shows an inline search input in a team slot for quick adding.
 */
function showQuickAddInput(slotEl, index) {
  if (slotEl.querySelector(".quick-add-container")) return;

  slotEl.classList.add("slot-open");

  const container = document.createElement("div");
  container.className = "quick-add-container";
  container.onclick = (e) => e.stopPropagation();

  const input = document.createElement("input");
  input.type = "text";
  input.className = "quick-add-input";
  input.placeholder = I18n.t("filters.search_placeholder") || "Nombre...";
  input.autocomplete = "off";

  const resultsList = document.createElement("ul");
  resultsList.className = "quick-add-results";
  resultsList.style.display = "none";

  // APPEND TO BODY to bypass ANY possible CSS overflow/clipping bugs
  document.body.appendChild(resultsList);

  container.appendChild(input);
  slotEl.appendChild(container);

  input.focus();

  let selectedIndex = -1;
  let currentMatches = [];

  const updatePosition = () => {
    const rect = input.getBoundingClientRect();
    resultsList.style.position = "absolute";
    resultsList.style.top = `${rect.bottom + window.scrollY}px`;
    resultsList.style.left = `${rect.left + window.scrollX}px`;
    resultsList.style.width = `${rect.width}px`;
    resultsList.style.zIndex = "99999";
  };

  const updateMatches = () => {
    updatePosition(); // Ensure it stays attached to the input visually
    const q = input.value.toLowerCase().trim();
    if (q.length < 1) {
      resultsList.style.display = "none";
      resultsList.innerHTML = "";
      return;
    }

    resultsList.style.display = "block";
    resultsList.innerHTML = `<li class="quick-add-info">${I18n.t("common.searching") || "Buscando..."}</li>`;

    // Fallback logic: Try indexData first, then state.index
    let matches = [];
    if (state.indexData && state.indexData.length > 0) {
      matches = state.indexData
        .filter(p => p.name.toLowerCase().includes(q))
        .slice(0, 10);
    } else if (state.index && state.index.length > 0) {
      matches = state.index
        .filter(n => n.toLowerCase().includes(q))
        .slice(0, 10)
        .map(n => ({ name: n, id: null })); // Minimal object
    }

    if (matches.length === 0) {
      resultsList.innerHTML = `<li class="quick-add-info">${I18n.t("filters.no_results") || "No hay resultados"}</li>`;
      return;
    }

    resultsList.innerHTML = matches
      .map((m, idx) => {
        const idHtml = m.id ? `<span class="mon-id">${fmtId(m.id)}</span>` : "";
        const spriteUrl = m.id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png` : "";
        const iconHtml = spriteUrl ? `<img src="${spriteUrl}" class="mon-icon" alt="" />` : "";
        return `
          <li class="quick-add-result-item" data-name="${m.name}" data-index="${idx}">
            ${iconHtml}
            ${idHtml}
            <span class="mon-name">${toTitle(m.name)}</span>
          </li>
        `;
      })
      .join("");
    selectedIndex = -1;
  };

  const selectPokemon = (name) => {
    if (resultsList.parentNode) resultsList.parentNode.removeChild(resultsList);
    toggleTeam(name).then(() => {
      updateTeamPanel();
    });
  };

  input.oninput = () => {
    selectedIndex = -1;
    updateMatches();
  };

  input.onkeydown = (e) => {
    const items = resultsList.querySelectorAll(".quick-add-result-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      items.forEach((item, idx) => item.classList.toggle("selected", idx === selectedIndex));
      if (selectedIndex !== -1) items[selectedIndex].scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      items.forEach((item, idx) => item.classList.toggle("selected", idx === selectedIndex));
      if (selectedIndex !== -1) items[selectedIndex].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex !== -1) {
        selectPokemon(items[selectedIndex].dataset.name);
      } else if (items.length > 0) {
        selectPokemon(items[0].dataset.name);
      }
    } else if (e.key === "Escape") {
      slotEl.classList.remove("slot-open");
      container.remove();
      if (resultsList.parentNode) resultsList.parentNode.removeChild(resultsList);
    }
  };

  // Ensure position updates if window resizes while open
  window.addEventListener("resize", updatePosition);

  // Close when clicking outside
  const clickHandler = (e) => {
    if (!container.contains(e.target) && !resultsList.contains(e.target)) {
      slotEl.classList.remove("slot-open");
      container.remove();
      if (resultsList.parentNode) resultsList.parentNode.removeChild(resultsList);
      document.removeEventListener("mousedown", clickHandler);
      window.removeEventListener("resize", updatePosition);
    }
  };
  setTimeout(() => document.addEventListener("mousedown", clickHandler), 10);

  resultsList.onclick = (e) => {
    const item = e.target.closest(".quick-add-result-item");
    if (item) {
      selectPokemon(item.dataset.name);
    }
  };
}

async function openTeamEditModal(index) {
  const currentTeam =
    state.activeTeam === "user" ? state.team : state.rivalTeam;
  const member = currentTeam[index];
  if (!member) return;

  // Initial Data Migration (if needed)
  if (!member.ivs)
    member.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
  if (!member.evs)
    member.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  // Migrate moves to objects if they are strings
  member.moves = member.moves.map((m) => {
    if (typeof m === "string")
      return { name: m, power: null, type: null, acc: null, cat: null };
    if (!m) return null;
    return m;
  });

  const modal = $("#teamEditModal");
  const modalContainer = modal.querySelector(".poke-modal");
  const title = $("#teamEditTitle");
  const sprite = $("#teamEditSprite");
  const formSel = $("#teamForm");
  const closeBtn = $("#closeTeamEdit");
  const saveBtn = $("#saveTeamMember");

  // Show modal instantly with loading skeleton overlay
  let overlay = modal.querySelector(".modal-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "modal-loading-overlay active";
    overlay.innerHTML = `<div class="modal-spinner"></div><div class="modal-loading-text">${I18n.t("common.loading") || "Cargando..."}</div>`;
    modalContainer.appendChild(overlay);
  } else {
    overlay.classList.add("active");
  }

  if (!modal.open) {
    modal.showModal();
  }
  
  // Force translation of modal content to ensure labels are correct
  if (window.I18n) I18n.translateElement(modalContainer);

  try {
    // 1. Fetch Basic Data in parallel
    const pokemonData = await getPokemon(member.name);
    const speciesData = await getSpecies(pokemonData.species.name);
    let d = pokemonData;
    const sp = speciesData;

  // Store references to our dropdown instances to get values later
  const dropdowns = {
    item: null,
    moves: [],
    ability: null,
    nature: null,
  };

  const statsOrder = ["hp", "atk", "def", "spa", "spd", "spe"];

  // Helper to apply styles
  const applyTypeStyles = (data) => {
    const tps = data.types
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name);
    modalContainer.className = "poke-modal team-edit-modal";
    modalContainer.classList.add(
      tps.length > 1 ? "bg-2" : "bg-1",
      `type-${tps[0]}`,
    );
    const [t1, t2] = tps;
    modalContainer.style.setProperty(
      "--tc1",
      `var(--tc-${t1}, var(--c-surface))`,
    );
    if (tps.length === 2) {
      modalContainer.classList.add("dual");
      modalContainer.style.setProperty(
        "--tc2",
        `var(--tc-${t2}, var(--c-surface))`,
      );
    } else {
      modalContainer.classList.remove("dual");
      modalContainer.style.removeProperty("--tc2");
    }
  };

  // Helper to re-render summary (Left Panel)
  const updateSummary = async () => {
    const summaryBox = $("#teamEditSummary");
    if (!summaryBox) return;

    const level = $("#teamLevel").value;
    const itemVal = $("#teamItemControl input")?.getAttribute("data-value");
    const abilityVal = $("#teamAbilityControl input")?.getAttribute(
      "data-value",
    );
    const natureVal = $("#teamNatureControl input")?.getAttribute("data-value");

    // Get moves from inputs
    const currentMoves = [1, 2, 3, 4]
      .map((i) => {
        const val = $(`#teamMove${i}Control input`)?.getAttribute("data-value");
        return val ? { name: val } : null;
      })
      .filter(Boolean);

    // Fetch PP and type for moves from the API/cache
    const moveDetails = await Promise.all(
      currentMoves.map(async (m) => {
        try {
          let pp = "--";
          let type = "normal";

          // Check moveMetaMap cache first
          if (window.moveMetaMap && window.moveMetaMap[m.name]) {
            pp = window.moveMetaMap[m.name].pp || "--";
            type = window.moveMetaMap[m.name].type || "normal";
          }

          // If we still need PP or type, fetch from API
          if (pp === "--" || type === "normal") {
            try {
              const data = await window.fetchCached(
                `${CONSTANTS.API_URL}/move/${m.name}`,
              );
              pp = data.pp || pp;
              type = (data.type && data.type.name) || type;
              // Update cache
              if (!window.moveMetaMap[m.name]) window.moveMetaMap[m.name] = {};
              window.moveMetaMap[m.name].pp = pp;
              window.moveMetaMap[m.name].type = type;
            } catch (e) {}
          }

          return { name: m.name, pp, type };
        } catch {
          return { name: m.name, pp: "--", type: "normal" };
        }
      }),
    );

    let html = `
        <div class="team-summary-box">
           <div class="ts-row"><strong>Lv. ${level}</strong></div>
           <div class="ts-row">
              ${
                itemVal
                  ? `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemVal}.png" class="ts-icon" onerror="this.style.display='none'"> <span>${toTitle(
                      itemVal,
                    )}</span>`
                  : `<span class="text-muted">${I18n.t("common.no_item")}</span>`
              }
           </div>
           
           <div class="ts-row" style="margin-top:4px;">
              ${
                abilityVal
                  ? `<span><small>${I18n.t(
                      "modal.ability",
                    )}:</small> <strong>${toTitle(abilityVal)}</strong></span>`
                  : ""
              }
           </div>
           <div class="ts-row">
              ${(() => {
                if (!natureVal) return "";
                let label = toTitle(natureVal);
                // Find nature details
                if (window.allNatures) {
                  const n = window.allNatures.find((x) => x.name === natureVal);
                  if (n) {
                    // Localized name
                    const loc = n.names.find(
                      (x) => x.language.name === I18n.currentLang,
                    );
                    if (loc) label = loc.name;

                    // Stats
                    if (
                      n.increased_stat &&
                      n.decreased_stat &&
                      n.increased_stat.name !== n.decreased_stat.name
                    ) {
                      const up = I18n.t("stats." + n.increased_stat.name);
                      const down = I18n.t("stats." + n.decreased_stat.name);
                      const upShort = up.substring(0, 3);
                      const downShort = down.substring(0, 3);
                      label += ` <span style="font-size:0.75rem; opacity:0.8">(+${upShort} -${downShort})</span>`;
                    }
                  }
                }
                return `<span><small>${I18n.t(
                  "modal.nature",
                )}:</small> <strong>${label}</strong></span>`;
              })()}
           </div>

           <div class="ts-moves">
      `;

    if (moveDetails.length === 0) {
      html += `<div class="ts-move-empty">${I18n.t("common.no_moves")}</div>`;
    } else {
      moveDetails.forEach((m) => {
        html += `
                <div class="ts-move-row">
                    <div class="d-flex align-items-center gap-1">
                        ${svgType(m.type)} <span>${toTitle(m.name)}</span>
                    </div>
                    <span class="ts-pp">${m.pp}/${m.pp}</span>
                </div>
              `;
      });
    }

    html += `</div></div>`;
    summaryBox.innerHTML = html;
  };

    // Apply initial styles
    applyTypeStyles(d);

    let displayName = toTitle(d.name);
    title.textContent = `${I18n.t("modal.edit_title")} ${displayName}`;
    
    // Hide overlay once basic data is loaded and styles are applied
    if (overlay) overlay.classList.remove("active");

  // 2. Setup UI (Sprite & Form)
  sprite.dataset.id = d.name; // For sync with updateSpriteDisplay
  sprite.src =
    chooseSprite(d, {
      shiny: state.gridShiny,
      gender: member.gender || "auto",
    }) || "";
  setupFormSelect(formSel, sp, member);

  // 3. Helper to enforce form-specific items (e.g. Mega Stones)
  const checkEnforceFormItem = (currentD) => {
    let requiredItem = null;
    let lockItem = false;
    const formName = currentD.name;
    const speciesName = currentD.species.name;

    if (formName.includes("mega")) {
      // Rayquaza doesn't need a mega stone
      if (speciesName === "rayquaza") return false;

      let baseName = speciesName;
      let variant = "";
      const parts = formName.split("mega");
      if (parts.length > 1) {
        const after = parts[1].replace(/^-/, "").replace(/_/g, "");
        if (after) variant = "-" + after;
      }

      const megaStoneMap = {
        blastoise: "blastoisinite",
        alakazam: "alakazite",
        mewtwo: "mewtwonite",
        houndoom: "houndoominite",
        sceptile: "sceptilite",
        sableye: "sablenite",
        mawile: "mawilite",
        manectric: "manectite",
        sharpedo: "sharpedonite",
        altaria: "altarianite",
        banette: "banettite",
        absol: "absolite",
        glalie: "glalitite",
        salamence: "salamencite",
        lopunny: "lopunnite",
        lucario: "lucarionite",
        abomasnow: "abomasite",
        gallade: "galladite",
        audino: "audinite",
        diancie: "diancite",
        pidgeot: "pidgeotite",
        aerodactyl: "aerodactylite",
        kangaskhan: "kangaskhanite",
        ampharos: "ampharosite",
        heracross: "heracrossite",
        camerupt: "cameruptite",
      };

      if (megaStoneMap[speciesName]) {
        requiredItem = megaStoneMap[speciesName] + variant;
      } else {
        requiredItem = `${baseName}ite${variant}`;
      }

      lockItem = true;
    }

    if (requiredItem) {
      member.item = requiredItem;
    }

    return lockItem;
  };

  // 4. Handle Form Change (Species/Form swap)
  formSel.onchange = async (e) => {
    const newName = e.target.value;
    if (newName !== member.name) {
      try {
        const newD = await getPokemon(newName);
        d = newD; // Update outer variable for stat calculations
        member.name = newName; // Important: update member name immediately so dropdown logic knows the current form
        sprite.dataset.id = d.name;
        sprite.src =
          chooseSprite(d, {
            shiny: state.gridShiny,
            gender: member.gender || "auto",
          }) ||
          d.sprites.front_default ||
          "";

        // Update name in modal title
        title.textContent = `${I18n.t("modal.edit_title")} ${toTitle(d.name)}`;

        applyTypeStyles(d);

        const lockItem = checkEnforceFormItem(d);

        // If not locked (e.g. going back to base form) but we previously held a required item like a mega stone, clear it.
        if (
          !lockItem &&
          member.item &&
          (member.item.endsWith("ite") ||
            member.item.endsWith("ite-x") ||
            member.item.endsWith("ite-y"))
        ) {
          member.item = "";
        }

        await initDropdowns(d); // Re-init moves & items for new form

        // If we locked the item, disable the input. If not, make sure it is enabled.
        const inputEl = $("#teamItemControl input");
        if (inputEl) {
          if (lockItem) {
            if (dropdowns.item && member.item) {
              dropdowns.item.setValue(member.item);
            }
            inputEl.disabled = true;
            inputEl.style.opacity = "0.7";
            inputEl.style.cursor = "not-allowed";
          } else {
            inputEl.disabled = false;
            inputEl.style.opacity = "";
            inputEl.style.cursor = "";
          }
        }

        renderStatRows(d); // Refresh table rows with new base stats
        updateModalStats(); // Recalculate based on new base stats
        updateSummary(); // Refresh left panel summary
      } catch (err) {
        console.error("Error in form change:", err);
      }
    }
  };

  $("#teamLevel").value = member.level;

  // Helper logic for live stat calc in modal
  // We need bidirectional logic.
  // 1. When opening modal (or changing IV/Level/Nature), update Stat Input from current EVs.
  // 2. When user edits Stat Input, reverse calculate EVs and update them.

  $("#teamLevel").oninput = () => {
    updateSummary();
    // updateModalStats(); // Base stats don't change with level
  };

  // --- Initialize Custom Dropdowns ---

  // A. Items
  let itemNames = [];
  try {
    itemNames = await loadItems();
  } catch (e) {
    itemNames = [];
  }
  // Create options
  const recommendedItems = filterItemsForPokemon(d, itemNames);
  const recommendedNames = new Set(recommendedItems.map((i) => i.name));

  // Category Mappings
  const categoryMap = {
    berries: I18n.t("items.cat_berries") || "Bayas",
    healing: I18n.t("items.cat_medicine") || "Medicinas",
    "status-cures": I18n.t("items.cat_medicine") || "Medicinas",
    revival: I18n.t("items.cat_medicine") || "Medicinas",
    "pp-recovery": I18n.t("items.cat_medicine") || "Medicinas",
    vitamins: I18n.t("items.cat_medicine") || "Medicinas",
    "nature-mints": I18n.t("items.cat_medicine") || "Medicinas",
    "stat-boosts": I18n.t("items.cat_medicine") || "Medicinas",
    "standard-balls": I18n.t("items.cat_pokeballs") || "Poké Balls",
    "special-balls": I18n.t("items.cat_pokeballs") || "Poké Balls",
    "apricorn-balls": I18n.t("items.cat_pokeballs") || "Poké Balls",
    evolution: I18n.t("items.cat_evolution") || "Evolución",
    "mega-stones": I18n.t("items.cat_mega_stones") || "Mega Piedras",
    "z-crystals": I18n.t("items.cat_z_crystals") || "Cristales Z",
    plates: I18n.t("items.cat_plates") || "Tablas",
    "species-specific": I18n.t("items.cat_held_items") || "Objetos Equipables",
    "held-items": I18n.t("items.cat_held_items") || "Objetos Equipables",
  };

  const battleItemCats = [
    "choice",
    "effort-training",
    "bad-held-items",
    "training",
    "type-enhancement",
    "jewels",
    "in-a-pinch",
    "picky-healing",
    "type-protection",
  ];
  battleItemCats.forEach(
    (cat) =>
      (categoryMap[cat] = I18n.t("items.cat_battle") || "Objetos de Combate"),
  );

  // Build Grouped Options
  const groupedOptions = [];

  // 1. Recommended Group
  if (recommendedItems.length > 0) {
    const itemDict = localDicts["item"] || (await fetchI18nDict("item"));
    const langCode = I18n.currentLang || "es";

    const locRecommended = recommendedItems.map((i) => {
      let label = toTitle(i.name);
      if (itemDict && itemDict[i.name]) {
        label = itemDict[i.name][langCode] || itemDict[i.name]["en"] || label;
      }
      return { value: i.name, label };
    });
    locRecommended.sort((a, b) => a.label.localeCompare(b.label));

    groupedOptions.push({
      value: "header_rec",
      label: I18n.t("common.recommended") || "Recomendados",
      isHeader: true,
    });
    groupedOptions.push(...locRecommended);
  }

  /**
   * Helper to determine if an item should be visible AT ALL for a pokemon.
   * Prevents Abomasnowite appearing for Charizard.
   */
  function isItemPermitted(item, d) {
    if (!d || !d.species) return true;
    const itemName = item.name.toLowerCase();
    const speciesName = d.species.name.toLowerCase();
    const category = item.category;

    // 0. Manual Signature Map Check (Hard-coded overrides)
    if (SIGNATURE_ITEM_MAP[itemName]) {
      return (
        SIGNATURE_ITEM_MAP[itemName].includes(speciesName) ||
        SIGNATURE_ITEM_MAP[itemName].includes(d.name.toLowerCase())
      );
    }

    // 1. API-driven "wild held" check (Species-specific items from API)
    if (item.heldBy && item.heldBy.length > 0) {
      if (
        item.heldBy.includes(d.name.toLowerCase()) ||
        item.heldBy.includes(speciesName)
      ) {
        return true;
      }
      return false;
    }

    // 2. Strict Category Logic (Mega Stones, Forms)
    if (category === "mega-stones" || itemName.endsWith("-ite")) {
      const normSpecies = speciesName
        .replace("nidoran-m", "nidoran")
        .replace("nidoran-f", "nidoran");

      const megaStoneMap = {
        blastoise: "blastoisinite",
        alakazam: "alakazite",
        mewtwo: "mewtwonite",
        houndoom: "houndoominite",
        sceptile: "sceptilite",
        sableye: "sablenite",
        mawile: "mawilite",
        manectric: "manectite",
        sharpedo: "sharpedonite",
        altaria: "altarianite",
        banette: "banettite",
        absol: "absolite",
        glalie: "glalitite",
        salamence: "salamencite",
        lopunny: "lopunnite",
        lucario: "lucarionite",
        abomasnow: "abomasite",
        gallade: "galladite",
        audino: "audinite",
        diancie: "diancite",
        pidgeot: "pidgeotite",
        aerodactyl: "aerodactylite",
        kangaskhan: "kangaskhanite",
        ampharos: "ampharosite",
        heracross: "heracrossite",
        camerupt: "cameruptite",
      };

      if (
        megaStoneMap[normSpecies] &&
        itemName.startsWith(megaStoneMap[normSpecies])
      ) {
        return true;
      }
      return itemName.includes(normSpecies);
    }

    if (category === "memories" || itemName.endsWith("-memory"))
      return speciesName === "silvally";
    if (category === "drives" || itemName.endsWith("-drive"))
      return speciesName === "genesect";
    if (category === "species-specific" || itemName.endsWith("-mask")) {
      if (itemName.endsWith("-mask")) return speciesName === "ogerpon";

      // Generic check for species-specific category items
      return itemName.includes(speciesName.replace("-m", "").replace("-f", ""));
    }

    // 3. Z-Crystals (Handled via MAP for signature ones, generic ones match any)
    if (category === "z-crystals" || itemName.endsWith("-z")) {
      // Signature ones were already handled by SIGNATURE_ITEM_MAP at the start
      // If it's a generic one like 'firium-z', we allow it.
      return true;
    }

    return true;
  }

  // 2. All Items by Category
  const remainingItems = itemNames.filter(
    (i) => !recommendedNames.has(i.name) && isItemPermitted(i, d),
  );
  const itemsByGroup = {};

  for (const i of remainingItems) {
    const group =
      categoryMap[i.category] || I18n.t("items.cat_others") || "Otros";
    if (!itemsByGroup[group]) itemsByGroup[group] = [];
    itemsByGroup[group].push(i);
  }

  // Define Group Order (Categorized by UI relevance)
  const groupOrder = [
    categoryMap["berries"],
    categoryMap["held-items"],
    I18n.t("items.cat_battle") || "Objetos de Combate",
    categoryMap["mega-stones"],
    categoryMap["z-crystals"],
    categoryMap["plates"],
    categoryMap["healing"],
    categoryMap["standard-balls"],
    categoryMap["evolution"],
    I18n.t("items.cat_others") || "Otros",
  ];

  const itemDict = localDicts["item"] || (await fetchI18nDict("item"));
  const langCode = I18n.currentLang || "es";

  for (const groupLabel of groupOrder) {
    const items = itemsByGroup[groupLabel];
    if (items && items.length > 0) {
      groupedOptions.push({
        value: `header_${groupLabel}`,
        label: groupLabel,
        isHeader: true,
      });

      const localized = items.map((i) => {
        let label = toTitle(i.name);
        if (itemDict && itemDict[i.name]) {
          label = itemDict[i.name][langCode] || itemDict[i.name]["en"] || label;
        }
        return { value: i.name, label };
      });

      localized.sort((a, b) => a.label.localeCompare(b.label));
      groupedOptions.push(...localized);
    }
  }

  dropdowns.item = setupCustomDropdown({
    container: $("#teamItemControl"),
    options: groupedOptions,
    currentValue: member.item,
    placeholder: I18n.t("common.no_item"),
    renderOption: (opt) => {
      if (opt.isHeader)
        return `<div class="dropdown-header">${opt.label}</div>`;
      const apiIcon = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${opt.value}.png`;
      return `<img src="${apiIcon}" class="item-icon-small" onerror="this.style.display='none'">
              <span>${opt.label}</span>`;
    },
    onSelect: updateSummary,
  });

  // C. Abilities
  // Fetch only if needed; PokeAPI includes them in 'd' but names are just references.
  // Using Promise.all here is fine but we must ensure 'd' is the source.
  const abilities = await Promise.all(
    d.abilities.map(async (a) => {
      const locName = await getLocalizedName(a.ability.url, "ability");
      return {
        value: a.ability.name,
        label:
          locName + (a.is_hidden ? ` (${I18n.t("modal.hidden_ability")})` : ""),
      };
    }),
  );

  dropdowns.ability = setupCustomDropdown({
    container: $("#teamAbilityControl"),
    options: abilities,
    currentValue: member.ability, // Might be null
    placeholder: I18n.t("modal.ability"),
    onSelect: updateSummary,
  });

  // D. Natures
  if (!window.allNatures) {
    try {
      const res = await window.fetchCached(
        `${CONSTANTS.API_URL}/nature?limit=100`,
      );
      // Fetch details for all (parallel)
      const details = await Promise.all(
        res.results.map((n) => window.fetchCached(n.url)),
      );
      window.allNatures = details;
    } catch (e) {
      window.allNatures = [];
    }
  }

  const natureOptions = window.allNatures
    .map((n) => {
      const loc = n.names.find((x) => x.language.name === I18n.currentLang);
      return { value: n.name, label: loc ? loc.name : toTitle(n.name) };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  dropdowns.nature = setupCustomDropdown({
    container: $("#teamNatureControl"),
    options: natureOptions,
    currentValue: member.nature,
    placeholder: I18n.t("modal.nature"),
    onSelect: () => {
      updateSummary();
      updateModalStats();
    },
  });

  // B. Moves
  const initDropdowns = async (pokemonData) => {
    let moves = [];
    try {
      moves = await getPokemonLearnset(pokemonData);
    } catch (e) {
      moves = pokemonData.moves
        .map((m) => ({
          name: m.move.name,
          type: "normal",
          category: "status",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const moveOptions = await Promise.all(
      moves.map(async (m) => {
        const locName = await getLocalizedName(
          `${CONSTANTS.API_URL}/move/${m.name}`,
          "move",
        );
        return {
          value: m.name,
          label: locName,
          type: m.type,
          category: m.category,
        };
      }),
    );

    // Add "No move" option at top
    const fullOptions = [
      { value: "", label: I18n.t("modal.no_move"), type: "normal" },
      ...moveOptions,
    ];

    [1, 2, 3, 4].forEach((i) => {
      const currentMoveStub = member.moves[i - 1]; // This is now an object or null
      const currentMoveName = currentMoveStub ? currentMoveStub.name : null;

      // Update display fields (New badges/boxes)
      const updateMoveStats = (index, m) => {
        const powerEl = $(`#move${index}_power_val`);
        const pwrIcon = $(`#move${index}_power_icon`);
        const typeEl = $(`#move${index}_type_badge`);
        const accEl = $(`#move${index}_acc_val`);
        const accIcon = $(`#move${index}_acc_icon`);
        const catEl = $(`#move${index}_cat_badge`);

        if (powerEl) {
          powerEl.textContent = m ? (m.power || "—") : "—";
          if (pwrIcon) pwrIcon.innerHTML = "💥";
        }
        
        if (accEl) {
          accEl.textContent = m ? (m.accuracy || "—") : "—";
          if (accIcon) accIcon.innerHTML = "🎯";
        }
        
        if (typeEl) {
          const type = m ? (m.type.name || m.type) : "normal";
          typeEl.className = `move-type-badge type-${type}`;
          typeEl.innerHTML = `${svgType(type)}<span data-i18n="types.${type}">${I18n.t(`types.${type}`) || toTitle(type)}</span>`;
        }

        if (catEl) {
          const cat = m ? (m.damage_class?.name || m.category) : "status";
          catEl.className = `move-cat-badge ${cat}`;
          
          let iconHtml = "🛡️";
          if (cat === "physical") iconHtml = "⚔️";
          if (cat === "special") iconHtml = "✨";
          
          const iconSpan = catEl.querySelector(".cat-icon");
          if (iconSpan) {
            iconSpan.innerHTML = iconHtml;
            iconSpan.style.fontStyle = "normal";
          }

          const catSpan = catEl.querySelector(".cat-text");
          if (catSpan) {
            const translationKey = `modal.${cat.toLowerCase()}`;
            catSpan.textContent = I18n.t(translationKey) || toTitle(cat);
          }
        }
      };

      // Fill secondary inputs if data exists
      if (currentMoveStub && currentMoveStub.name) {
        // Always fetch fresh data to ensure accuracy
        window
          .fetchCached(`${CONSTANTS.API_URL}/move/${currentMoveStub.name}`)
          .then((m) => {
             updateMoveStats(i, m);
          })
          .catch((e) => {
            // Fallback to stored data if fetch fails
            updateMoveStats(i, currentMoveStub);
          });
      } else {
        // Clear inputs
        updateMoveStats(i, null);
      }

      dropdowns.moves[i - 1] = setupCustomDropdown({
        container: $(`#teamMove${i}Control`),
        options: fullOptions,
        currentValue: currentMoveName,
        placeholder: I18n.t("common.search_placeholder"),
        filterOption: (opt) => {
          if (!opt.value) return true; // keep empty
          // check if opt.value is selected in any other move slot
          for (let j = 1; j <= 4; j++) {
            if (j === i) continue;
            const otherEl = $(`#teamMove${j}Control input`);
            if (otherEl && otherEl.getAttribute("data-value") === opt.value)
              return false;
          }
          return true;
        },
        renderOption: (opt) => {
          if (!opt.value) return `<span>${opt.label}</span>`;
          return `${svgType(opt.type)} <span>${opt.label}</span>`;
        },
        onSelect: async (val) => {
          // Auto-fill logic
          if (val) {
            try {
              const m = await window.fetchCached(
                `${CONSTANTS.API_URL}/move/${val}`,
              );
              updateMoveStats(i, m);
            } catch (e) {}
          } else {
            updateMoveStats(i, null);
          }
          updateSummary();
        },
      });
    });
  };

  // Run initDropdowns safely
  const initialLock = checkEnforceFormItem(d);
  initDropdowns(d)
    .then(() => {
      const inputEl = $("#teamItemControl input");
      if (inputEl) {
        if (initialLock && dropdowns.item) {
          if (member.item) {
            dropdowns.item.setValue(member.item);
          }
          inputEl.disabled = true;
          inputEl.style.opacity = "0.7";
          inputEl.style.cursor = "not-allowed";
        } else {
          inputEl.disabled = false;
          inputEl.style.opacity = "";
          inputEl.style.cursor = "";
        }
      }
      updateSummary();
    })
    .catch((e) => {});
  modal.showModal();

    saveBtn.onclick = () => {
      // ... (rest of save logic)
      member.name = $("#teamForm").value;
      member.level = Number($("#teamLevel").value);
      const itemVal = $("#teamItemControl input").getAttribute("data-value");
      member.item = itemVal || null;
      const abilityVal = $("#teamAbilityControl input").getAttribute("data-value");
      member.ability = abilityVal || null;
      const natureVal = $("#teamNatureControl input").getAttribute("data-value");
      member.nature = natureVal || null;
      member.moves = [1, 2, 3, 4].map((i) => {
        const val = $(`#teamMove${i}Control input`).getAttribute("data-value");
        if (!val) return null;
        
        // Extract values from the display badges/spans
        const extractNum = (id) => {
          const txt = $(id)?.textContent || "";
          return parseInt(txt.replace(/\D/g, "")) || 0;
        };

        return {
          name: val,
          power: extractNum(`#move${i}_power_val`),
          type: $(`#move${i}_type_badge`).className.split("type-")[1] || "normal",
          accuracy: extractNum(`#move${i}_acc_val`) || 100,
          category: $(`#move${i}_cat_badge`).className.split(" ")[1] || "status",
        };
      });
      ["hp", "atk", "def", "spa", "spd", "spe"].forEach((s) => {
        member.ivs[s] = Number($(`#iv_${s}`).value) || 0;
        member.evs[s] = Number($(`#ev_${s}`).value) || 0;
      });
      updateTeamPanel();
      saveSettings();
      modal.close();
    };

    closeBtn.onclick = () => modal.close();

    // 4. Handle Stats (EVs/IVs)
    const statsBody = $("#editStatsBody");
    const evRemainingEl = $("#evRemaining");

    const updateModalStats = () => {
      if (!d) return;
      const level = Number($("input#teamLevel").value);
      const natureVal = $("#teamNatureControl input").getAttribute("data-value");

      let totalEVs = 0;
      const currentEVs = {};
      const currentIVs = {};

      ["hp", "atk", "def", "spa", "spd", "spe"].forEach((s) => {
        const evVal = Number($(`#ev_${s}`).value) || 0;
        const ivVal = Number($(`#iv_${s}`).value) || 0;
        currentEVs[s] = evVal;
        currentIVs[s] = ivVal;
        totalEVs += evVal;
      });

      if (totalEVs > 510) {
        evRemainingEl.classList.add("warning");
      } else {
        evRemainingEl.classList.remove("warning");
      }
      evRemainingEl.textContent = 510 - totalEVs;

      ["hp", "atk", "def", "spa", "spd", "spe"].forEach((s, idx) => {
        const base = d.stats[idx].base_stat;
        const natureMod = getNatureModifier(natureVal, STAT_MAP_REV[s]);
        const total = calculateStat(
          base,
          currentIVs[s],
          currentEVs[s],
          level,
          natureMod,
          s === "hp",
        );
        $(`#total_${s}`).textContent = total;
        const bar = $(`#bar_${s}`);
        const limit = s === "hp" ? 714 : 526;
        const percent = Math.min(100, (total / limit) * 100);
        bar.style.width = `${percent}%`;
        bar.className = "stat-bar";
        if (percent > 70) bar.classList.add("bg-success");
        else if (percent > 35) bar.classList.add("bg-warning");
        else bar.classList.add("bg-danger");
      });

      updateSummary();
    };

    const renderStatRows = (d) => {
      if (!statsBody) return;
      statsBody.innerHTML = d.stats
        .map((st, idx) => {
          const key = statsOrder[idx];
          const localizedStatName =
            I18n.t(`stats.${st.stat.name}`) || toTitle(st.stat.name);
          return `
          <tr>
            <td><span class="stat-badge">${localizedStatName}</span></td>
            <td class="text-center"><strong>${st.base_stat}</strong></td>
            <td><input type="number" id="iv_${key}" class="stat-input" data-stat="${key}" data-type="iv" value="${member.ivs[key]}" min="0" max="31"></td>
            <td><input type="number" id="ev_${key}" class="stat-input" data-stat="${key}" data-type="ev" value="${member.evs[key]}" min="0" max="252"></td>
            <td class="text-center"><span id="total_${key}" class="stat-total">0</span></td>
          </tr>
          <tr style="border:none;">
            <td colspan="5" style="padding: 0 8px 8px !important;">
              <div class="stat-bar-container">
                <div id="bar_${key}" class="stat-bar" style="width: 0%"></div>
              </div>
            </td>
          </tr>`;
        })
        .join("");

      statsOrder.forEach((s) => {
        const ivIn = $(`#iv_${s}`);
        const evIn = $(`#ev_${s}`);
        if (ivIn) {
          ivIn.oninput = (e) => {
            if (e.target.value > 31) e.target.value = 31;
            if (e.target.value < 0) e.target.value = 0;
            updateModalStats();
          };
        }
        if (evIn) {
          evIn.oninput = (e) => {
            if (e.target.value > 252) e.target.value = 252;
            if (e.target.value < 0) e.target.value = 0;
            let currentTotal = 0;
            statsOrder.forEach((st) => {
              const val = Number($(`#ev_${st}`)?.value) || 0;
              currentTotal += val;
            });
            if (currentTotal > 510) {
              const otherTotal = currentTotal - (Number(e.target.value) || 0);
              e.target.value = Math.max(0, 510 - otherTotal);
            }
            updateModalStats();
          };
        }
      });
    };

    renderStatRows(d);
    updateModalStats();

    // Check if buildFormChangeUI exists before calling
    if (window.buildFormChangeUI) {
      await buildFormChangeUI(d.name);
    }

    modal.onclick = (e) => {
      if (e.target === modal) modal.close();
    };

  } catch (err) {
    console.error("Error opening team edit modal:", err);
    const modal_element = $("#teamEditModal");
    if (modal_element) modal_element.showModal();
  }
}

// --- Helpers ---

function setupFormSelect(formSel, sp, member) {
  const defaultVarName = (sp.varieties || []).find(v => v.is_default)?.pokemon?.name || sp.name;
  const varieties = (sp.varieties || [])
    .map((v) => v.pokemon.name)
    .filter(vn => {
        if (vn === defaultVarName) return true;
        return !vn.includes("-male") && !vn.includes("-female");
    });

  const getFormLabel = (formName) => {
    if (formName === defaultVarName) return I18n.t("modal.form_base") || "Base";
    const suffix = formName.replace(sp.name, "").replace(/^-/, "");
    if (!suffix) return I18n.t("modal.form_base") || "Base";

    let displayForm = "";
    let displayReq = "";
    let baseName = toTitle(sp.name);

    // 1. MEGA EVOLUTIONS
    // Check for "-mega" OR just "mega" in suffix if it's a custom form like "scraftymegaz"
    if (formName.includes("mega")) {
      displayForm = "Mega";

      // Extract variant logic:
      // If "mega-z" -> variant "Z"
      // If "megaz" -> variant "Z"
      // If "mega-y" -> variant "Y"

      let variant = "";
      const parts = formName.split("mega");
      if (parts.length > 1) {
        // "absol-mega-z" -> ["absol-", "-z"]
        // "absolmegaz" -> ["absol", "z"]
        const after = parts[1].replace(/^-/, "").replace(/_/g, " ");
        if (after) variant = after.toUpperCase();
      }

      if (variant) displayForm += ` ${variant}`;

      // Try to find exact item from I18n or fall back to constructed name
      const key = formName;
      const drug = I18n.t(`forms.requirements_data.${key}`);

      if (drug && drug !== `forms.requirements_data.${key}`) {
        displayReq = drug;
      } else {
        // HEURISTIC CONSTRUCTION
        const lang = I18n.currentLang;
        const stoneSuffix = lang === "es" ? "ita" : "ite";
        displayReq = `${baseName}${stoneSuffix}`;
        if (variant) displayReq += ` ${variant}`;
      }
    }
    // 2. GIGANTAMAX
    else if (formName.includes("-gmax") || formName.includes("gmax")) {
      displayForm = "Gigantamax";
      let gmaxText = I18n.t("forms.requirements_data.gmax");
      if (gmaxText === "forms.requirements_data.gmax") {
        gmaxText = I18n.currentLang === "es" ? "Maxisopa" : "Max Soup";
      }
      displayReq = gmaxText;
    }
    // 3. REGIONAL FORMS (Alola, Galar, Hisui, Paldea)
    else if (formName.includes("alola")) {
      displayForm = "Alola";
      displayReq = I18n.t("regions.names.alola") || "Alola";
    } else if (formName.includes("galar")) {
      displayForm = "Galar";
      displayReq = I18n.t("regions.names.galar") || "Galar";
    } else if (formName.includes("hisui")) {
      displayForm = "Hisui";
      displayReq = I18n.t("regions.names.hisui") || "Hisui";
    } else if (formName.includes("paldea")) {
      displayForm = "Paldea";
      displayReq = I18n.t("regions.names.paldea") || "Paldea";
    }
    // 4. GENERIC FALLBACK
    else {
      displayForm = toTitle(suffix.replace(/-/g, " "));
      const key = formName;
      const drug = I18n.t(`forms.requirements_data.${key}`);
      if (drug && drug !== `forms.requirements_data.${key}`) {
        displayReq = drug;
      }
    }

    // Combine with Diamond Separator if requirement exists
    if (displayReq) {
      return `${displayForm} ◆ ${displayReq}`;
    }

    return displayForm;
  };

  formSel.innerHTML = varieties
    .map((v) => {
      const isSelected = v === member.name ? "selected" : "";
      const label = getFormLabel(v);
      return `<option value="${v}" ${isSelected}>${label}</option>`;
    })
    .join("");

  formSel.onchange = async (e) => {
    const newName = e.target.value;
    const scrollPos = document.getElementById("modal").scrollTop;
    await openModal(newName);
    document.getElementById("modal").scrollTop = scrollPos;
    // buildFormChangeUI is called inside openModal
  };
}

async function createEvoMon(targetName, currentName, options = {}) {
  const { shiny, gender } = options;
  const pd = await getPokemon(targetName);
  const localizedName = toTitle(pd.name);

  const el = document.createElement("div");
  el.className = "evo-mon" + (targetName === currentName ? " active" : "");
  el.onclick = () => openModal(targetName, "", shiny);

  const sprite =
    chooseSprite(pd, { shiny, gender }) ||
    pd.sprites.other["official-artwork"].front_default ||
    pd.sprites.front_default ||
    CONSTANTS.FALLBACK_IMAGE;

  el.innerHTML = `
    <img src="${sprite}" alt="${localizedName}" loading="lazy">
    <div class="evo-mon-name">${localizedName}</div>
  `;

  return el;
}

async function buildFormChangeUI(name) {
  const container = $("#formChangeKV");
  if (!container) return;

  container.style.display = "none";
  container.innerHTML = "";

  // 1. Check if it's a special form
  const isMega = name.includes("-mega");
  const isGmax = name.includes("-gmax");
  const isAlola = name.includes("-alola");
  const isGalar = name.includes("-galar");
  const isHisui = name.includes("-hisui");
  const isPaldea = name.includes("-paldea");

  if (!isMega && !isGmax && !isAlola && !isGalar && !isHisui && !isPaldea)
    return;

  // 2. Get requirement text
  const key = name;
  let req = I18n.t(`forms.requirements_data.${key}`);
  if (!req || req === `forms.requirements_data.${key}`) {
    if (isGmax) req = I18n.t("forms.requirements_data.gmax") || "Maxisopa";
    else if (isAlola) req = I18n.t("regions.names.alola") || "Alola";
    else if (isGalar) req = I18n.t("regions.names.galar") || "Galar";
    else if (isHisui) req = I18n.t("regions.names.hisui") || "Hisui";
    else if (isPaldea) req = I18n.t("regions.names.paldea") || "Paldea";
  }

  if (!req || req.includes("forms.requirements_data")) return;

  // 3. Build UI v2 (Evolution Style)
  const baseName = name.split("-")[0];
  let title = I18n.t("modal.form_transformation") || "Transformación";
  let icon = "sparkles";

  if (isMega) {
    title = I18n.t("modal.form_mega") || "Megaevolución";
    icon = "zap";
  } else if (isGmax) {
    title = I18n.t("modal.form_gmax") || "Gigantamax";
    icon = "flame";
  } else {
    title = I18n.t("modal.form_regional") || "Forma Regional";
    icon = "map-pin";
  }

  container.innerHTML = `
    <div class="form-change-header">
      <i data-lucide="${icon}" style="width:16px;height:16px;color:var(--c-accent);"></i>
      <span class="form-change-title">${title}</span>
    </div>
    <div class="form-change-content" id="formChangeContent">
      <div class="form-change-loading">${I18n.t("common.loading") || "Cargando..."}</div>
    </div>
  `;

  container.style.display = "block";
  if (typeof lucide !== "undefined") lucide.createIcons();

  // Load Sprites for the mini-evolution chain
  const isShiny = $("#shinyToggle").checked;
  const gender = $("#genderSelect").value;

  const content = $("#formChangeContent");
  const baseMon = await createEvoMon(baseName, "", { shiny: isShiny, gender });
  const targetMon = await createEvoMon(name, name, { shiny: isShiny, gender }); // Highlight target

  content.innerHTML = "";
  content.appendChild(baseMon);

  const arrowBox = document.createElement("div");
  arrowBox.className = "form-change-arrow-box";
  arrowBox.innerHTML = `
    <div class="form-change-req">${req}</div>
    <div class="evo-arrow">→</div>
  `;
  content.appendChild(arrowBox);

  content.appendChild(targetMon);
}

// --- Logic Helpers ---

async function loadItems() {
  if (state.items && state.items.length > 0) return state.items;

  // Blocklist keywords for non-held items to display
  // We want to exclude purely mechanical items but keep potential held items
  const junkKeywords = [
    "candy",
    "exp-",
    "shard",
    "fragment",
    "tera-",
    "tm-",
    "tr-",
    "hm-",
    "recipe",
    "curry",
    "berry-sweet",
    "clover-sweet",
    "flower-sweet",
    "love-sweet",
    "ribbon-sweet",
    "star-sweet",
    "strawberry-sweet",
    "fossil",
    "mail",
    "dynamax-candy",
    "max-honey",
    "sticker",
    "poster",
    "doll",
  ];

  // Helper filter function
  const isUsefulItem = (name) => {
    if (junkKeywords.some((k) => name.includes(k))) return false;
    if (name.startsWith("item-")) return false;
    // Exclude specific junk categories manually if needed, but name filter is usually enough for "useless" items
    return true;
  };

  try {
    // FETCH ALL ITEMS (Limit 10000 to get everything)
    const res = await window.fetchCached(
      `${CONSTANTS.API_URL}/item?limit=10000`,
    );
    const allItems = res.results || [];

    const itemRefs = [];

    // Process all items
    for (const i of allItems) {
      if (isUsefulItem(i.name)) {
        // We don't have category in the list result, but we can fetch it lazily or just rely on name/id
        // For the modal list, we might need category for grouping.
        // Fetching 1000 items details is too heavy.
        // Strategy: We only fetch details when clicking or for specific recommended items.
        // BUT `filterItemsForPokemon` needs category for some logic.
        // Compromise: We assign a default "unknown" category and rely on name matching for recommendations.
        // The previous logic verified category.
        // Let's rely on name matching primarily for the "Special/held" check.

        itemRefs.push({ name: i.name, url: i.url, category: "misc" });
      }
    }

    // We still want to identify "species-specific" items roughly.
    // We can't fetch details for all of them.
    // We'll trust the name matching in `filterItemsForPokemon`.

    state.items = itemRefs.sort((a, b) => a.name.localeCompare(b.name));
    return state.items;
  } catch (e) {
    console.error("Error loading items:", e);
    return [];
  }
}

function filterItemsForPokemon(d, items) {
  if (!d || !items) return items;

  const pokemonName = d.name.toLowerCase();
  const speciesName = d.species.name.toLowerCase();
  const pokemonTypes = d.types.map((t) => t.type.name);

  // Clean species name for matching (remove suffixes if needed, though usually strict matching is better)
  const cleanSpecies = speciesName.replace("-m", "").replace("-f", "");

  return items.filter((item) => {
    const itemName = item.name.toLowerCase();

    // 0. Manual Signature Map Check (Hard-coded overrides)
    if (SIGNATURE_ITEM_MAP[itemName]) {
      return (
        SIGNATURE_ITEM_MAP[itemName].includes(speciesName) ||
        SIGNATURE_ITEM_MAP[itemName].includes(pokemonName)
      );
    }

    // 0.5 NAME MATCHING (Fuzzy)
    // If item name contains the full species name, it's likely relevant (e.g. "Absolite" contains "Absol", "Blastoisinite" contains "Blastoise"?) -> Wait, "Absolite" does.
    // "Blastoisinite" contains "Blastoise". "Venusaurite" contains "Venusaur".
    // "Mewtwonite" contains "Mewtwo".
    // "Light Ball" does NOT contain "Pikachu".
    // "Thick Club" does NOT contain "Cubone".
    // So this catches mostly Mega Stones, Z-Crystals, and specific held items like "Latiasite".
    // Also "Ditto Quick Powder" (if named like that).

    // We check if item name includes the species name.
    if (itemName.includes(cleanSpecies)) {
      // Filter out "candy" or "doll" etc (already filtered in loadItems)
      return true;
    }

    // 1. General Battle Items (Staple Competitive Items)
    const staples = [
      "choice-band",
      "choice-specs",
      "choice-scarf",
      "life-orb",
      "focus-sash",
      "leftovers",
      "assault-vest",
      "expert-belt",
      "rocky-helmet",
      "eviolite",
      "focus-band",
      "muscle-band",
      "wise-glasses",
      "wide-lens",
      "zoom-lens",
      "air-balloon",
      "red-card",
      "eject-button",
      "destiny-knot",
      "heavy-duty-boots",
      "throat-spray",
      "loaded-dice",
      "utility-umbrella",
      "clear-amulet",
      "covert-cloak",
    ];
    if (staples.includes(itemName)) return true;

    // Special case for Black Sludge (Only for Poisons)
    if (itemName === "black-sludge") return pokemonTypes.includes("poison");

    // 2. Staple Berries
    if (["sitrus-berry", "lum-berry", "enigma-berry"].includes(itemName))
      return true;

    // 3. Mega Stones (Strict - redundant with name check but kept for safety)
    if (itemName.endsWith("-ite")) {
      const normSpecies = speciesName
        .replace("nidoran-m", "nidoran")
        .replace("nidoran-f", "nidoran");
      if (itemName.includes(normSpecies)) return true;
      return false;
    }

    if (itemName.endsWith("-memory")) return speciesName === "silvally";
    if (itemName.endsWith("-drive")) return speciesName === "genesect";
    if (itemName.endsWith("-mask")) return speciesName === "ogerpon";

    // 5. Type-enhancement items
    const typeEnhancers = {
      "black-belt": "fighting",
      "black-glasses": "dark",
      charcoal: "fire",
      "dragon-fang": "dragon",
      "hard-stone": "rock",
      magnet: "electric",
      "miracle-seed": "grass",
      "mystic-water": "water",
      "never-melt-ice": "ice",
      "poison-barb": "poison",
      "sharp-beak": "flying",
      "silk-scarf": "normal",
      "silver-powder": "bug",
      "soft-sand": "ground",
      "spell-tag": "ghost",
      "twisted-spoon": "psychic",
      "metal-coat": "steel",
      "pixie-plate": "fairy",
    };
    if (typeEnhancers[itemName])
      return pokemonTypes.includes(typeEnhancers[itemName]);

    // 6. Plates (Arceus or matching type)
    if (itemName.endsWith("-plate")) {
      if (speciesName === "arceus") return true;
      const plateTypeMap = {
        "flame-plate": "fire",
        "splash-plate": "water",
        "zap-plate": "electric",
        "meadow-plate": "grass",
        "icicle-plate": "ice",
        "fist-plate": "fighting",
        "toxic-plate": "poison",
        "earth-plate": "ground",
        "sky-plate": "flying",
        "mind-plate": "psychic",
        "insect-plate": "bug",
        "stone-plate": "rock",
        "spooky-plate": "ghost",
        "draco-plate": "dragon",
        "dread-plate": "dark",
        "iron-plate": "steel",
        "pixie-plate": "fairy",
      };
      if (plateTypeMap[itemName])
        return pokemonTypes.includes(plateTypeMap[itemName]);
    }

    // Default: NOT recommended
    return false;
  });
}

async function getPokemonLearnset(pokemonData) {
  // Enrichment of move data with Types and Categories.
  // We use the moveMetaMap for speed, but for accuracy we ensure the current pokemon's moves are fetched.
  if (!window.moveMetaMap) window.moveMetaMap = {};

  const moveList = pokemonData.moves.map(m => m.move);
  
  // To avoid hundreds of requests, we only fetch what we don't have.
  const unknownMoves = moveList.filter(m => !window.moveMetaMap[m.name]);
  
  if (unknownMoves.length > 0) {
    // Limit parallel fetches to batches to avoid overwhelming the browser/API
    const batchSize = 25;
    for (let i = 0; i < unknownMoves.length; i += batchSize) {
      const batch = unknownMoves.slice(i, i + batchSize);
      await Promise.all(batch.map(async (m) => {
        try {
          const d = await window.fetchCached(m.url);
          window.moveMetaMap[m.name] = {
            type: d.type.name,
            class: d.damage_class?.name || "status"
          };
        } catch (e) {
          window.moveMetaMap[m.name] = { type: "normal", class: "status" };
        }
      }));
    }
  }

  return moveList
    .map((m) => {
      const meta = window.moveMetaMap[m.name] || {};
      return {
        name: m.name,
        type: meta.type || "normal",
        category: meta.class || "status",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function setupCustomDropdown({
  container,
  options,
  onSelect,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  currentValue,
  renderOption,
  onSearch,
  filterOption,
}) {
  if (!container) return;
  container.innerHTML = "";

  // Create UI Structure
  const wrapper = document.createElement("div");
  wrapper.className = "custom-dropdown";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "custom-dropdown-input";
  input.placeholder = placeholder;

  const displayEl = document.createElement("div");
  displayEl.className = "custom-dropdown-display";
  displayEl.style.display = "none";

  const updateDisplay = (val, optObj) => {
    if (val && optObj && renderOption) {
      displayEl.innerHTML = renderOption(optObj);
      displayEl.style.display = "flex";
      input.classList.add("has-display");
    } else {
      displayEl.style.display = "none";
      input.classList.remove("has-display");
    }
  };

  // If we have a current value, set it (formatted)
  if (currentValue) {
    const matchedOpt = options.find((o) => o.value === currentValue);
    input.value =
      matchedOpt && matchedOpt.label ? matchedOpt.label : toTitle(currentValue);
    input.setAttribute("data-value", currentValue);
    updateDisplay(currentValue, matchedOpt);
  }

  const list = document.createElement("ul");
  list.className = "dropdown-options";

  wrapper.appendChild(input);
  wrapper.appendChild(displayEl);
  wrapper.appendChild(list);
  container.appendChild(wrapper);

  // State
  let filteredOptions = [...options];

  // Render List Function
  const renderList = () => {
    list.innerHTML = "";

    const activeOptions = filterOption
      ? filteredOptions.filter(filterOption)
      : filteredOptions;

    if (activeOptions.length === 0) {
      const p = document.createElement("div");
      p.className = "dropdown-no-results";
      p.textContent = "Sin resultados";
      list.appendChild(p);
      return;
    }

    // Limit rendering for performance
    const fragment = document.createDocumentFragment();
    const maxItems = 100;

    activeOptions.slice(0, maxItems).forEach((opt) => {
      const li = document.createElement("li");
      li.className = opt.isHeader ? "dropdown-header-item" : "dropdown-option";
      if (!opt.isHeader && opt.value === currentValue)
        li.classList.add("selected");

      // Use Custom Renderer if provided
      if (renderOption) {
        li.innerHTML = renderOption(opt);
        // Inject type color for hover border if available
        if (opt.type) {
          li.style.setProperty("--type-color", `var(--tc-${opt.type})`);
        }
      } else {
        li.textContent = opt.label;
      }

      if (!opt.isHeader) {
        li.onclick = () => {
          input.value = opt.label || toTitle(opt.value);
          input.setAttribute("data-value", opt.value);
          currentValue = opt.value;

          updateDisplay(opt.value, opt);

          list.classList.remove("show");
          if (onSelect) onSelect(opt.value);
        };
      }

      fragment.appendChild(li);
    });
    list.appendChild(fragment);
  };

  // Event Listeners
  input.onfocus = () => {
    displayEl.style.display = "none";
    input.classList.remove("has-display");
    renderList();
    list.classList.add("show");
  };

  input.onblur = () => {
    // Delay slightly to let selection clicks register before replacing input
    setTimeout(() => {
      const matchedOpt = options.find((o) => o.value === currentValue);
      updateDisplay(currentValue, matchedOpt);
    }, 150);
  };

  // Close on click outside
  const closeHandler = (e) => {
    if (!wrapper.contains(e.target)) {
      list.classList.remove("show");
    }
  };
  document.addEventListener("click", closeHandler);

  // Cleanup on remove (not strictly implemented but good practice)
  wrapper._cleanup = () => document.removeEventListener("click", closeHandler);

  input.oninput = () => {
    const q = input.value.toLowerCase();

    // Filter
    if (onSearch) {
      // If searching needs complex logic (e.g. searching types)
      filteredOptions = onSearch(options, q);
    } else {
      filteredOptions = options.filter((o) =>
        (o.label || o.value).toLowerCase().includes(q),
      );
    }

    list.classList.add("show");
    renderList();
  };

  // Initial Render (to populate list once)
  renderList();

  // Return handle to update value programmatically if needed
  return {
    setValue: (val) => {
      currentValue = val;
      const opt = options.find((o) => o.value === val);
      input.value = opt ? opt.label || toTitle(opt.value) : val;
      input.setAttribute("data-value", val);
      updateDisplay(val, opt);
    },
  };
}

async function preloadMoveMetadata() {
  const types = [
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
  ];
  const classes = ["physical", "special", "status"];

  if (!window.moveMetaMap) window.moveMetaMap = {}; // Ensure initialization

  const promises = [
    ...types.map(
      (t) =>
        window
          .fetchCached(`${CONSTANTS.API_URL}/type/${t}`)
          .then((r) => ({ kind: "type", name: t, moves: r.moves }))
          .catch(() => ({ kind: "type", name: t, moves: [] })), // Safe fail
    ),
    ...classes.map(
      (c) =>
        window
          .fetchCached(`${CONSTANTS.API_URL}/move-damage-class/${c}`)
          .then((r) => ({ kind: "class", name: c, moves: r.moves }))
          .catch(() => ({ kind: "class", name: c, moves: [] })), // Safe fail
    ),
  ];

  try {
    const results = await Promise.all(promises);
    results.forEach((res) => {
      res.moves.forEach((m) => {
        if (!window.moveMetaMap[m.name]) window.moveMetaMap[m.name] = {};
        if (res.kind === "type") window.moveMetaMap[m.name].type = res.name;
        if (res.kind === "class") window.moveMetaMap[m.name].class = res.name;
      });
    });
  } catch (e) {}
}

async function calculateWinRate() {
  const currentTeam =
    state.activeTeam === "user" ? state.team : state.rivalTeam;

  if (currentTeam.length === 0 || !state.showTeams) {
    if ($("#teamStats")) $("#teamStats").style.display = "none";
    // Clear the table so it doesn't show stale data when re-enabled
    if ($("#teamMembersBody")) $("#teamMembersBody").innerHTML = "";
    return;
  }
  if ($("#teamStats")) $("#teamStats").style.display = "";

  // Heuristic Calculation
  let totalScore = 0;

  for (const p of currentTeam) {
    let pScore = 0;
    const d = state.details.get(p.name);
    if (!d) return;

    // 1. BST Score (approx 600 is god tier)
    const bst = d.stats.reduce((a, b) => a + b.base_stat, 0);
    pScore += (bst / 600) * 300; // Up to 300 pts

    // 2. Level Score
    pScore += (p.level / 100) * 400; // Up to 400 pts

    // 3. Moves Score (25 pts per move)
    const moveCount = p.moves.filter(Boolean).length;
    pScore += moveCount * 25; // Up to 100 pts

    // 4. Item Score (50 pts if held)
    if (p.item) pScore += 50;

    // 5. Type Coverage (Simplified: Bonus for dual type)
    if (d.types.length > 1) pScore += 50;

    totalScore += pScore;
  }

  // Normalize to 0-100%
  const maxPossible = currentTeam.length * 900;
  const winRate = Math.min(99, Math.round((totalScore / maxPossible) * 100));

  // Also update the table stats (sum/avg)
  updateTeamStatsTable();
}

async function updateTeamStatsTable() {
  const membersBody = $("#teamMembersBody");
  if (!membersBody) return;
  membersBody.innerHTML = "";

  const stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, bst: 0 };
  let count = 0;
  const currentTeam =
    state.activeTeam === "user" ? state.team : state.rivalTeam;
  const teamData = [];

  for (const p of currentTeam) {
    const d = state.details.get(p.name);

    const pStats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, bst: 0 };

    if (d) {
      const level = p.level || 50;
      const nature = p.nature || "hardy";

      const statsOrder = ["hp", "atk", "def", "spa", "spd", "spe"];
      statsOrder.forEach((s, idx) => {
        const base = d.stats[idx].base_stat;
        const natureMod = getNatureModifier(nature, STAT_MAP_REV[s]);
        const iv = p.ivs && p.ivs[s] !== undefined ? p.ivs[s] : 31;
        const ev = p.evs && p.evs[s] !== undefined ? p.evs[s] : 0;

        pStats[s] = calculateStat(base, iv, ev, level, natureMod, s === "hp");
      });

      pStats.bst =
        pStats.hp +
        pStats.atk +
        pStats.def +
        pStats.spa +
        pStats.spd +
        pStats.spe;

      // Add to teamData for Analysis
      teamData.push({
        pokemon: d,
        member: p,
        stats: pStats, // Now using Base Stats for any analytical purposes if needed
      });
    }

    stats.hp += pStats.hp;
    stats.atk += pStats.atk;
    stats.def += pStats.def;
    stats.spa += pStats.spa;
    stats.spd += pStats.spd;
    stats.spe += pStats.spe;
    stats.bst += pStats.bst;
    count++;

    // Render Row
    const row = document.createElement("tr");
    let initialName = d ? toTitle(d.name) : toTitle(p.name);
    const sprite = d ? d.sprites?.front_default || "" : "";

    const createStatCell = (val, type) => {
      // User requested absolute maximums for scaling: HP=714, Others=526
      let limit = 526;
      if (type === "hp") limit = 714;
      if (type === "bst") limit = 3344; // 714 + (526 * 5)

      const percent = limit > 0 ? Math.min(100, (val / limit) * 100) : 0;

      return `<td class="stat-cell">
          <div class="d-flex justify-content-between"><span>${val}</span></div>
          <div class="stat-bar-container">
            <div class="stat-bar ${type}-bar" style="width: ${percent}%"></div>
          </div>
        </td>`;
    };

    let html = `
        <td class="text-start">
            <div class="d-flex align-items-center gap-2">
                <img src="${sprite}" style="width:32px; height:32px; object-fit:contain;">
                <span class="fw-bold small team-stat-name">${initialName}</span>
            </div>
        </td>
      `;

    html += createStatCell(pStats.hp, "hp");
    html += createStatCell(pStats.atk, "atk");
    html += createStatCell(pStats.def, "def");
    html += createStatCell(pStats.spa, "spa");
    html += createStatCell(pStats.spd, "spd");
    html += createStatCell(pStats.spe, "spe");
    html += createStatCell(pStats.bst, "bst");

    row.innerHTML = html;
    membersBody.appendChild(row);
  }

  // Update Summary Rows in Footer
  const sumRow = $("#teamSum");
  const avgRow = $("#teamAvg");
  if (sumRow && avgRow) {
    const sumTds = sumRow.querySelectorAll("td");
    const avgTds = avgRow.querySelectorAll("td");
    const statKeys = ["hp", "atk", "def", "spa", "spd", "spe", "bst"];

    statKeys.forEach((key, idx) => {
      if (sumTds[idx]) sumTds[idx].textContent = stats[key];
      if (avgTds[idx] && count > 0) {
        avgTds[idx].textContent = Math.round(stats[key] / count);
      } else if (avgTds[idx]) {
        avgTds[idx].textContent = "-";
      }
    });
  }

  // Trigger Analysis
  renderTeamTypeAnalysis(teamData);
}

async function renderTeamTypeAnalysis(teamData) {
  const defDiv = $("#teamDefense");
  const offDiv = $("#teamOffense");
  if (!defDiv || !offDiv) return;

  // Defensive Analysis
  const defMults = {};
  TYPE_LIST.forEach((t) => (defMults[t] = 0)); // We'll count how many mons are weak/resists

  // Better approach: Calculate combined team vulnerability
  // For each type, how many mons are weak, how many are resistant
  const typeResults = {};
  TYPE_LIST.forEach(
    (t) => (typeResults[t] = { weak: 0, resist: 0, immune: 0 }),
  );

  teamData.forEach((item) => {
    const types = item.pokemon.types.map((t) => t.type.name);
    const multFrom = {};
    TYPE_LIST.forEach((t) => (multFrom[t] = 1));

    types.forEach((t) => {
      const info = state.typeInfo.get(t);
      if (!info) return;
      info.damage_relations.double_damage_from.forEach(
        (x) => (multFrom[x.name] *= 2),
      );
      info.damage_relations.half_damage_from.forEach(
        (x) => (multFrom[x.name] *= 0.5),
      );
      info.damage_relations.no_damage_from.forEach(
        (x) => (multFrom[x.name] *= 0),
      );
    });

    Object.entries(multFrom).forEach(([type, m]) => {
      if (m > 1) typeResults[type].weak++;
      else if (m === 0) typeResults[type].immune++;
      else if (m < 1) typeResults[type].resist++;
    });
  });

  defDiv.innerHTML = "";
  TYPE_LIST.forEach((t) => {
    const res = typeResults[t];
    const score = res.weak - res.resist - res.immune * 2;
    if (score > 0) {
      defDiv.innerHTML += `
        <div class="analysis-badge" title="Débil: ${res.weak}, Resist: ${
          res.resist
        }, Inmune: ${res.immune}">
          ${svgType(t)}
          <span class="mult mult-4">-${score}</span>
        </div>
      `;
    }
  });
  if (defDiv.innerHTML === "")
    defDiv.innerHTML =
      '<span class="text-muted small">Sin debilidades críticas</span>';

  // Offensive Analysis
  const coverage = new Set();
  const movePromises = [];

  teamData.forEach((item) => {
    // 1. Add Pokémon types as base coverage (STAB baseline)
    const pTypes = item.pokemon.types.map((t) => t.type.name);
    pTypes.forEach((t) => {
      const info = state.typeInfo.get(t);
      if (info) {
        info.damage_relations.double_damage_to.forEach((x) =>
          coverage.add(x.name),
        );
      }
    });

    // 2. Prepare move metadata fetching
    const moves = item.member.moves.filter(Boolean);
    moves.forEach((moveObj) => {
      const moveName = typeof moveObj === "string" ? moveObj : moveObj.name;

      // Use cached type if available in the object itself
      if (
        typeof moveObj === "object" &&
        moveObj.type &&
        moveObj.type !== "normal"
      ) {
        // If we have manual type override, use it!
        // Note: 'normal' check is heuristic; if user sets Normal, fine.
        // But usually we trust existing data.
        movePromises.push(
          Promise.resolve({ name: moveName, type: moveObj.type }),
        );
        return;
      }

      if (window.moveMetaMap && window.moveMetaMap[moveName]?.type) {
        movePromises.push(
          Promise.resolve({
            name: moveName,
            type: window.moveMetaMap[moveName].type,
          }),
        );
      } else {
        movePromises.push(
          window
            .fetchCached(`${CONSTANTS.API_URL}/move/${moveName}`)
            .then((d) => ({ name: moveName, type: d.type.name }))
            .catch(() => null),
        );
      }
    });
  });

  // 3. Process all moves in parallel
  const moveResults = await Promise.all(movePromises);
  moveResults.forEach((res) => {
    if (res && res.type) {
      const info = state.typeInfo.get(res.type);
      if (info) {
        info.damage_relations.double_damage_to.forEach((x) =>
          coverage.add(x.name),
        );
      }
    }
  });

  offDiv.innerHTML = "";
  TYPE_LIST.forEach((t) => {
    if (coverage.has(t)) {
      offDiv.innerHTML += `
        <div class="analysis-badge">
          ${svgType(t)}
          <span class="mult mult-0-5"><i data-lucide="check" style="width:14px;height:14px;"></i></span>
        </div>
      `;
    }
  });

  if (offDiv.innerHTML === "") {
    offDiv.innerHTML =
      '<span class="text-muted small">Sin cobertura ofensiva</span>';
  }
}

function syncModalIndex(baseName) {
  const openedName = state.lastOpenedName;
  if (!openedName) {
    $("#prevMon").disabled = true;
    $("#nextMon").disabled = true;
    return;
  }

  // If baseName was not provided (e.g. called from buildFilteredList after filter change),
  // try to extract it from lastOpenedName by looking for a matching base species in the list
  if (!baseName && openedName) {
    // Try to find the base species: look for the name before any form suffix
    const parts = openedName.split("-");
    for (let i = parts.length; i >= 1; i--) {
      const candidate = parts.slice(0, i).join("-");
      if (state.filteredNames.includes(candidate)) {
        baseName = candidate;
        break;
      }
    }
    // If still not found, try using the pokemon details cache to find the base species
    if (!baseName && state.details.has(openedName)) {
      const d = state.details.get(openedName);
      if (d && d.species && d.species.name) baseName = d.species.name;
    }
  }

  let idx = state.filteredNames.indexOf(openedName);
  // Fallback: if current form is not in list, try base species
  if (idx === -1 && baseName) {
    idx = state.filteredNames.indexOf(baseName);
  }

  // Calculate current suffix (form) to preserve it on navigation,
  // but ONLY when includeForms is ON (forms are individual entries in the list).
  // When includeForms is OFF, navigation should move between base species
  // without trying to apply form suffixes to unrelated Pokémon.
  let suffix = "";
  if (state.includeForms && baseName && openedName !== baseName && openedName.startsWith(baseName)) {
    suffix = openedName.slice(baseName.length);
  }

  $("#prevMon").disabled = idx <= 0;
  $("#nextMon").disabled = idx === -1 || idx >= state.filteredNames.length - 1;

  $("#prevMon").onclick = () => navigateModal(-1, baseName, suffix);
  $("#nextMon").onclick = () => navigateModal(1, baseName, suffix);
}
let isNavigating = false;
async function navigateModal(direction, baseName, preferredSuffix) {
  if (isNavigating) return;
  isNavigating = true;
  try {
    let idx = state.filteredNames.indexOf(state.lastOpenedName);

    if (idx === -1 && baseName) {
      idx = state.filteredNames.indexOf(baseName);
    }

    if (idx === -1) return; // Can't navigate if we don't know where we are

    const max = state.filteredNames.length;
    let nextIdx = idx + direction;

    // Preserve shiny state
    const isShiny = $("#shinyToggle").checked;

    // When includeForms is OFF, don't propagate form suffixes to avoid
    // unnecessary API calls for forms that don't exist on other species
    const suffix = state.includeForms ? preferredSuffix : "";

    // Try to find the next valid pokemon (limit attempts to avoid infinite loop)
    const maxAttempts = Math.min(10, max);
    let attempts = 0;
    while (nextIdx >= 0 && nextIdx < max && attempts < maxAttempts) {
      const nextName = state.filteredNames[nextIdx];
      try {
        await openModal(nextName, suffix, isShiny);
        return; // Success!
      } catch (e) {
        nextIdx += direction;
        attempts++;
      }
    }
  } finally {
    isNavigating = false;
  }
}

function updateFiltersCount() {
  const count =
    state.selectedTypes.size +
    (state.search ? 1 : 0) +
    (state.region !== "all" ? 1 : 0) +
    (state.generation !== "all" ? 1 : 0);
  $("#filtersCount").textContent = count;
}

async function buildEvolutionUI(name) {
  const stageEl = $("#evoStage"),
    track = $("#evoTrack");
  stageEl.textContent = "";
  track.innerHTML = "Cargando…";

  // Get current modal state
  const isShiny = $("#shinyToggle").checked;
  const gender = $("#genderSelect").value;

  try {
    const pokemonData = await getPokemon(name);
    const sp = await getSpecies(pokemonData.species.name);

    const url = sp.evolution_chain?.url;
    if (!url) {
      track.textContent = "—";
      return;
    }
    const chainData = await getEvoChainByUrl(url);

    // Determine if we are in a morphological form context (Alola, Size, Style, Color)
    const formSuffixes = [
      "-alola", "-galar", "-hisui", "-paldea",
      "-sandy", "-trash", "-plant",
      "-east", "-west",
      "-summer", "-autumn", "-winter",
      "-small", "-large", "-super", "-average",
      "-yellow", "-orange", "-blue", "-white",
      "-antique", "-artisan", "-masterpiece",
      "-droopy", "-stretchy",
      "-family-of-three", "-three-segment"
    ];
    let activeSuffix = formSuffixes.find((s) => name.endsWith(s)) || "";

    // Suffix projection is now safe for all species (including Burmy/Mothim) 
    // because renderEvoBranch checks state.index before attempting a fetch.

    // Manual mapping for cross-suffix lines
    if (name === "sinistcha-masterpiece") activeSuffix = "-artisan";

    // Calculate depth for the stage display
    const { depth, totalStages } = calculateEvoDepth(chainData.chain, name);
    stageEl.textContent = I18n.t("modal.evolution_stage", depth, totalStages);

    track.innerHTML = "";
    const rootNodes = expandEvolutions([chainData.chain], null);
    
    // Create a horizontal container if there are multiple root branches (like Oricorio)
    const rootsContainer = document.createElement("div");
    rootsContainer.style.display = "flex";
    rootsContainer.style.gap = "2rem";
    rootsContainer.style.justifyContent = "center";
    rootsContainer.style.flexWrap = "wrap";
    
    for (const root of rootNodes) {
      const tree = await renderEvoBranch(root, {
        currentName: name,
        activeSuffix: activeSuffix,
        shiny: isShiny,
        gender: root.forcedGender || gender,
      }, null);
      rootsContainer.appendChild(tree);
    }
    track.appendChild(rootsContainer);
  } catch (e) {
    track.textContent = "—";
  }
}
const EVO_FORM_SPLITS = {
  // Regional variants and forms are now grouped by default to keep the chain clean.
  // The evolution UI contextually displays the active form if you are viewing it.
};

const EVO_REQUIREMENTS = {
  persian: { excludeParent: "meowth-galar" },
  perrserker: { requireParent: "meowth-galar" },
  sirfetchd: { requireParent: "farfetchd-galar" },
  cursola: { requireParent: "corsola-galar" },
  obstagoon: { requireParent: "linoone-galar" },
  runerigus: { requireParent: "yamask-galar" },
  cofagrigus: { excludeParent: "yamask-galar" },
  weavile: { excludeParent: "sneasel-hisui" },
  sneasler: { requireParent: "sneasel-hisui" },
  quagsire: { excludeParent: "wooper-paldea" },
  clodsire: { requireParent: "wooper-paldea" },
  overqwil: { requireParent: "qwilfish-hisui" },
  "mr-rime": { requireParent: "mr-mime-galar" },
  "basculegion-male": { requireParent: "basculin-white-striped" },
  "basculegion-female": { requireParent: "basculin-white-striped" },
  "lycanroc-dusk": { requireParent: "rockruff-own-tempo" }
};

function expandEvolutions(evolves_to, parentSpeciesToShow = null) {
  const expanded = [];
  for (const next of evolves_to) {
    if (EVO_REQUIREMENTS[next.species.name]) {
      const req = EVO_REQUIREMENTS[next.species.name];
      if (req.requireParent) {
        const reqList = Array.isArray(req.requireParent) ? req.requireParent : [req.requireParent];
        if (parentSpeciesToShow && !reqList.includes(parentSpeciesToShow)) continue;
      }
      if (req.excludeParent) {
        const exclList = Array.isArray(req.excludeParent) ? req.excludeParent : [req.excludeParent];
        if (parentSpeciesToShow && exclList.includes(parentSpeciesToShow)) continue;
      }
    }

    if (EVO_FORM_SPLITS[next.species.name]) {
      for (const item of EVO_FORM_SPLITS[next.species.name]) {
        const formName = typeof item === 'string' ? item : item.name;
        const forcedGender = typeof item === 'object' ? item.gender : null;

        if (EVO_REQUIREMENTS[formName]) {
          const req = EVO_REQUIREMENTS[formName];
          if (req.requireParent) {
            const reqList = Array.isArray(req.requireParent) ? req.requireParent : [req.requireParent];
            if (parentSpeciesToShow && !reqList.includes(parentSpeciesToShow)) continue;
          }
          if (req.excludeParent) {
            const exclList = Array.isArray(req.excludeParent) ? req.excludeParent : [req.excludeParent];
            if (parentSpeciesToShow && exclList.includes(parentSpeciesToShow)) continue;
          }
        }
        const clonedNode = JSON.parse(JSON.stringify(next));
        clonedNode.species.name = formName;
        clonedNode.isFormSplit = true;
        clonedNode.forcedGender = forcedGender;
        expanded.push(clonedNode);
      }
    } else {
      expanded.push(next);
    }
  }
  return expanded;
}

function calculateEvoDepth(node, targetName, currentDepth = 1) {
  const totalStages =
    1 +
    (node.evolves_to.length > 0
      ? Math.max(...node.evolves_to.map((n) => getTreeMaxDepth(n)))
      : 0);

  // Exact match or form match that cleanly prefixes
  if (
    node.species.name === targetName ||
    targetName.startsWith(node.species.name + "-")
  ) {
    return { depth: currentDepth, found: true, totalStages };
  }

  let targetDepth = 0;
  let found = false;

  for (const next of node.evolves_to) {
    const res = calculateEvoDepth(next, targetName, currentDepth + 1);
    if (res.found) {
      targetDepth = res.depth;
      found = true;
    }
  }

  return {
    depth: found ? targetDepth : 0,
    found,
    totalStages,
  };
}

function getTreeMaxDepth(node) {
  if (!node.evolves_to || node.evolves_to.length === 0) return 1;
  return 1 + Math.max(...node.evolves_to.map((n) => getTreeMaxDepth(n)));
}

async function renderEvoBranch(node, options, parentSpeciesToShow = null) {
  const { currentName, activeSuffix, shiny, gender } = options;
  const nodeContainer = document.createElement("div");
  nodeContainer.className = "evo-node";

  // 1. Base Species logic (includes Regional Forms and active form overrides)
  const baseSpeciesName = node.species.name;
  let speciesToShow = baseSpeciesName;

  const isEvolutionaryTransformation = 
    currentName.startsWith(baseSpeciesName + "-") &&
    currentName !== baseSpeciesName &&
    /(?:-(mega|gmax|gigantamax|primal|eternamax|ultra))\b/.test(currentName);

  if (!node.isFormSplit) {
    // Regional forms REPLACE the base species in the chain across all stages
    if (activeSuffix) {
      const regionalName = baseSpeciesName + activeSuffix;
      // 404 Suppression: Only attempt fetch if the variety is likely to exist (in index)
      // to prevent the browser from logging unnecessary 404 network errors.
      const likelyExists = state.index.length === 0 || state.index.includes(regionalName);

      if (likelyExists) {
        try {
          await getPokemon(regionalName);
          speciesToShow = regionalName;
        } catch {
          speciesToShow = baseSpeciesName;
        }
      } else {
        speciesToShow = baseSpeciesName;
      }
    }

    // Direct Form Replacement: If the user is viewing a non-evolutionary transformation (e.g. Deoxys Attack, Sizes, Styles),
    // REPLACE the node's visually displayed sprite/name with the form itself.
    if (!isEvolutionaryTransformation && currentName.startsWith(baseSpeciesName + "-") && currentName !== speciesToShow) {
      // Ensure we aren't interfering with an active region suffix match
      if (!activeSuffix || !currentName.endsWith(activeSuffix)) {
         speciesToShow = currentName;
      }
    }
  }

  // Render the Species Node
  const speciesWrap = await createEvoMon(speciesToShow, currentName, {
    shiny,
    gender,
  });
  nodeContainer.appendChild(speciesWrap);

  // 2. Extra Form Transformation logic for Mega/Gmax
  if (isEvolutionaryTransformation) {
    const transformationWrap = document.createElement("div");
    transformationWrap.className = "evo-branch form-change-branch";

    // Transformation Arrow
    const arrContainer = document.createElement("div");
    arrContainer.className = "evo-arrow-container";

    const arr = document.createElement("span");
    arr.className = "evo-arrow";
    arr.textContent = "→";
    arrContainer.appendChild(arr);

    // Transformation Requirement
    let requirement = I18n.t("forms.requirements_data." + currentName);
    if (!requirement || requirement === "forms.requirements_data." + currentName) {
      if (currentName.includes("-gmax") || currentName.includes("-gigantamax")) {
        requirement = "Gigamax";
      } else if (currentName.includes("-mega")) {
        requirement = "Mega";
      } else if (currentName.includes("-primal")) {
        requirement = "Primal";
      } else {
        requirement = "";
      }
    }

    if (requirement.trim() !== "") {
      const det = document.createElement("span");
      det.className = "evo-detail";
      det.textContent = requirement;
      arrContainer.appendChild(det);
    }
    transformationWrap.appendChild(arrContainer);

    // Transformation Pokémon Node
    const formWrap = await createEvoMon(currentName, currentName, {
      shiny,
      gender,
    });
    transformationWrap.appendChild(formWrap);

    nodeContainer.appendChild(transformationWrap);
  }

  // 3. Recursive Branches (Standard Evolutions with Expansion)
  if (node.evolves_to && node.evolves_to.length > 0) {
    const branchesContainer = document.createElement("div");
    branchesContainer.className = "evo-branches";

    // Expand evolutions to support intrinsic form branching
    const expandedEvolutions = expandEvolutions(node.evolves_to, speciesToShow);

    for (const next of expandedEvolutions) {
      const branchWrap = document.createElement("div");
      branchWrap.className = "evo-branch";

      // Render Arrow + Details
      const arrContainer = document.createElement("div");
      arrContainer.className = "evo-arrow-container";

      const arr = document.createElement("span");
      arr.className = "evo-arrow";
      arr.textContent = "→";
      arrContainer.appendChild(arr);

      if (next.evolution_details && next.evolution_details.length > 0) {
        const detailText = await formatEvolutionDetails(next.evolution_details);
        if (detailText && detailText.trim() !== "") {
          const det = document.createElement("span");
          det.className = "evo-detail";
          det.innerHTML = detailText;
          arrContainer.appendChild(det);
        }
      }
      branchWrap.appendChild(arrContainer);

      // Render Next node (recursive)
      const nextNode = await renderEvoBranch(next, {
        ...options,
        gender: next.forcedGender || gender
      }, speciesToShow);
      branchWrap.appendChild(nextNode);

      branchesContainer.appendChild(branchWrap);
    }
    if (expandedEvolutions.length > 0) {
      nodeContainer.appendChild(branchesContainer);
    }
  }

  return nodeContainer;
}

async function formatEvolutionDetails(detailsArray) {
  if (!detailsArray || detailsArray.length === 0) return "";

  const d = detailsArray[0];
  const parts = [];

  const t = (key, val) => {
    let str = I18n.t(key);
    if (!str || str === key) return val || key;
    if (val !== undefined && str.includes("{0}")) {
      return str.replace("{0}", val);
    }
    return str;
  };

  // 1. Level
  if (d.min_level) parts.push(`Lvl ${d.min_level}`);

  // 2. Item
  if (d.item) {
    const itemNm = await getLocalizedName(d.item.url, "item");
    parts.push(t("forms.requirements.item", itemNm));
  }

  // 3. Friendship
  if (d.min_happiness) parts.push(I18n.t("forms.requirements.friendship"));

  // 4. Time
  if (d.time_of_day) {
    const timeKey = "forms.requirements." + d.time_of_day.toLowerCase();
    parts.push(I18n.t(timeKey));
  }

  // 5. Trade
  if (d.trigger?.name === "trade") {
    parts.push(I18n.t("forms.requirements.trade"));
  }

  // 6. Held Item
  if (d.held_item) {
    const itemNm = await getLocalizedName(d.held_item.url, "item");
    parts.push(t("forms.requirements.held", itemNm));
  }

  // 7. Known Move
  if (d.known_move) {
    const moveNm = await getLocalizedName(d.known_move.url, "move");
    parts.push(t("forms.requirements.move", moveNm));
  }

  // 8. Known Move Type
  if (d.known_move_type) {
    const typeNm = d.known_move_type.name;
    const typeLabel = I18n.t("types." + typeNm) || toTitle(typeNm);
    parts.push(t("forms.requirements.move", typeLabel));
  }

  // 9. Location
  if (d.location) {
    const locNm = await getLocalizedName(d.location.url, "location");
    parts.push(t("forms.requirements.location", locNm));
  }

  // 10. Stat (e.g. Tyrogue)
  if (
    d.relative_physical_stats !== null &&
    d.relative_physical_stats !== undefined
  ) {
    if (d.relative_physical_stats === 1) parts.push("Atk > Def");
    if (d.relative_physical_stats === -1) parts.push("Def > Atk");
    if (d.relative_physical_stats === 0) parts.push("Atk = Def");
  }

  // 11. Beauty (Feebas)
  if (d.min_beauty) {
    parts.push(t("forms.requirements.beauty", d.min_beauty));
  }

  // 12. Rain
  if (d.needs_overworld_rain) {
    parts.push(I18n.t("forms.requirements.rain"));
  }

  // 13. Upside Down (Inkay)
  if (d.turn_upside_down) {
    parts.push(I18n.t("forms.requirements.upside-down"));
  }

  // 14. Gender
  if (d.gender === 1) parts.push(I18n.t("forms.requirements.gender_female"));
  if (d.gender === 2) parts.push(I18n.t("forms.requirements.gender_male"));

  // 15. Affection
  if (d.min_affection) {
    parts.push(t("forms.requirements.affection", d.min_affection));
  }

  // 16. Party Species
  if (d.party_species) {
    const spNm = toTitle(d.party_species.name); // PokeAPI species names are usually enough
    parts.push(t("forms.requirements.party_species", spNm));
  }

  // 17. Party Type
  if (d.party_type) {
    const typeNm = d.party_type.name;
    const typeLabel = I18n.t("types." + typeNm) || toTitle(typeNm);
    parts.push(t("forms.requirements.party_type", typeLabel));
  }

  // 18. Move Styles (PLA)
  if (d.known_move_type) {
    // Some style evolutions use known_move_type? No, they use specific triggers.
  }

  return parts.join(" + ");
}

function calculateStat(base, iv, ev, level, natureModifier = 1, isHP = false) {
  const inner = Math.floor(2 * base + iv + Math.floor(ev / 4));
  if (isHP) {
    if (base === 1) return 1; // Shedinja
    return Math.floor((inner * level) / 100) + level + 10;
  } else {
    return Math.floor((Math.floor((inner * level) / 100) + 5) * natureModifier);
  }
}

function getNatureModifier(natureName, statName) {
  if (!window.allNatures) return 1;
  const n = window.allNatures.find((x) => x.name === natureName);
  if (!n) return 1;
  if (n.increased_stat?.name === statName) return 1.1;
  if (n.decreased_stat?.name === statName) return 0.9;
  return 1;
}

// Map PokéAPI stat names to our keys and vice-versa
const STAT_MAP = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};
const STAT_MAP_REV = {
  hp: "hp",
  atk: "attack",
  def: "defense",
  spa: "special-attack",
  spd: "special-defense",
  spe: "speed",
};

// Preload items
// --- Combat Engine ---

/**
 * Calculates a Combat Score for a Pokémon based on its stats, types, items, and moves.
 */
async function calculateCombatScore(member) {
  const d = await getPokemon(member.name);
  if (!d) return { score: 0, stats: null };

  let score = 0;

  // 1. Base Stats Contribution
  const finalStats = {};
  for (const s of d.stats) {
    const key = STAT_MAP[s.stat.name];
    const mod = getNatureModifier(member.nature, s.stat.name);
    finalStats[key] = calculateStat(
      s.base_stat,
      member.ivs[key],
      member.evs[key],
      member.level,
      mod,
      key === "hp"
    );
  }

  // 1.1 Bulk (HP * Average Defense)
  const bulk = finalStats.hp * ((finalStats.def + finalStats.spd) / 2);
  score += bulk / 100; // Normalized bulk

  // 1.2 Speed
  score += finalStats.spe * 2;
  
  // 1.3 Offense (Highest of Atk or SpA)
  const offense = Math.max(finalStats.atk, finalStats.spa);
  score += offense * 2;

  // 2. Moves Contribution
  let offensivePower = 0;
  for (const moveName of member.moves) {
    if (!moveName) continue;
    // We assume default power/acc if not fully loaded yet, but try to fetch if needed
    // For now we use a heuristic based on move slots
    score += 50;
  }

  // 3. Item & Ability synergy (simplified)
  if (member.item) score += 100;
  if (member.ability) score += 50;

  return { score, stats: finalStats };
}

/**
 * Simulates a simplified 1v1 matchup and returns a "Turns to KO" heuristic.
 * Lower means p1 wins faster.
 */
function simulateMatchup(p1Info, d1, p2Info, d2, p1Level) {
  if (!p1Info || !p1Info.stats || !p2Info || !p2Info.stats) return 10; // Fallback
  
  // Highest offensive stat determines which defense to hit
  const usePhysical = p1Info.stats.atk > p1Info.stats.spa;
  const attackStat = usePhysical ? p1Info.stats.atk : p1Info.stats.spa;
  const defenseStat = usePhysical ? p2Info.stats.def : p2Info.stats.spd;
  
  // Type Effectiveness
  let bestDamageMult = 0.5; // Base fallback in case of no STAB
  const p1Types = d1.types.map((t) => t.type.name);
  const p2Types = d2.types.map((t) => t.type.name);

  // Find the best STAB move type modifier
  p1Types.forEach((t1) => {
    let currentMult = 1.0; // STAB base is handled by assuming a move of that type
    const info = state.typeInfo.get(t1);
    if (info) {
      p2Types.forEach((t2) => {
        if (info.damage_relations.double_damage_to.some((x) => x.name === t2))
          currentMult *= 2.0;
        if (info.damage_relations.half_damage_to.some((x) => x.name === t2))
          currentMult *= 0.5;
        if (info.damage_relations.no_damage_to.some((x) => x.name === t2))
          currentMult *= 0.0;
      });
    }
    // Boost by STAB
    currentMult *= 1.5;
    if (currentMult > bestDamageMult) bestDamageMult = currentMult;
  });

  // Simple Damage Formula calculation (Level affects it roughly like this)
  const damageBase = (((2 * p1Level) / 5 + 2) * 80 * (attackStat / defenseStat)) / 50 + 2; 
  // Assume a generic 80 base power move
  const actualDamage = damageBase * bestDamageMult;
  
  // Prevent zero damage infinite loops, max it out at 100 turns
  if (actualDamage <= 0) return 100;

  // Turns to KO
  return p2Info.stats.hp / actualDamage;
}

/**
 * Phase 1.4: Renders historical types if the Pokemon had different types in past generations.
 * Phase 3.2: Added defensive checks with optional chaining.
 */
function renderPastTypes(data) {
  const section = document.getElementById("pastTypesSection");
  const list = document.getElementById("pastTypesList");
  if (!section || !list) return;

  const pastTypes = data?.past_types || [];
  if (pastTypes.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  list.innerHTML = pastTypes
    .map((entry) => {
      const genName = entry.generation?.name || "past";
      const types = entry.types?.map((t) => typeBadge(t.type.name)).join(" ") || "";
      return `<div class="past-type-entry mb-2">
        <div class="text-muted small mb-1">${I18n.t("biology.generations." + genName) || toTitle(genName)}</div>
        <div class="d-flex gap-1">${types}</div>
      </div>`;
    })
    .join("");
}

/**
 * Phase 2.1: Renders Pokédex numbers for different regions.
 * Phase 3.2: Added defensive checks and error handling.
 */
function renderPokedexNumbers(species) {
  const section = document.getElementById("pokedexNumbersSection");
  const list = document.getElementById("pokedexNumbersList");
  if (!section || !list) return;

  const numbers = species?.pokedex_numbers || [];
  if (numbers.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  list.innerHTML = numbers
    .map((n) => {
      const pokedexName = n.pokedex?.name || "unknown";
      const regionName = pokedexName.replace(/-/g, " ");
      return `<div class="pokedex-number-chip">
        <span class="pokedex-name">${toTitle(regionName)}</span>
        <span class="pokedex-val">#${n.entry_number}</span>
      </div>`;
    })
    .join("");
}

/**
 * Phase 1.2: Renders locations where the Pokemon can be encountered.
 * Phase 3.2: Added defensive checks and async error handling.
 */
async function renderEncounterLocations(pokemonId) {
  const section = document.getElementById("encounterSection");
  const container = document.getElementById("encounterLocations");
  if (!section || !container) return;

  container.innerHTML = `<div class="spinner-border spinner-border-sm text-accent" role="status"></div>`;
  section.style.display = "block";

  try {
    const encounters = await window.fetchCached(`${CONSTANTS.API_URL}/pokemon/${pokemonId}/encounters`);
    
    if (!encounters || encounters.length === 0) {
      section.style.display = "none";
      return;
    }

    // Group by location
    const locationMap = new Map();
    for (const e of encounters) {
      const locName = e.location_area?.name || "unknown";
      if (!locationMap.has(locName)) locationMap.set(locName, []);
      
      // Extract unique version names
      e.version_details?.forEach(vd => {
        const vName = vd.version?.name;
        if (vName && !locationMap.get(locName).includes(vName)) {
          locationMap.get(locName).push(vName);
        }
      });
    }

    container.innerHTML = Array.from(locationMap.entries())
      .map(([loc, versions]) => {
        const cleanLoc = loc.replace(/-/g, " ");
        const versionBadges = versions
          .map(v => `<span class="version-badge v-${v}">${toTitle(v)}</span>`)
          .join("");
        return `<div class="encounter-entry">
          <div class="location-name">${toTitle(cleanLoc)}</div>
          <div class="version-list">${versionBadges}</div>
        </div>`;
      })
      .join("");

  } catch (e) {
    console.warn("Error rendering encounter locations:", e);
    section.style.display = "none";
  }
}

/**
 * Calculates win probability between state.team and state.rivalTeam.
 */
async function calculateWinProbability() {
  if (
    !state.showTeams ||
    state.team.length === 0 ||
    state.rivalTeam.length === 0
  ) {
    if ($("#winProbModule")) $("#winProbModule").style.display = "none";
    return;
  }
  if ($("#winProbModule")) $("#winProbModule").style.display = "";

  let userTotalCS = 0;
  let rivalTotalCS = 0;
  const userTeamInfo = [];
  const rivalTeamInfo = [];

  const userDetails = await Promise.all(
    state.team.map((m) => getPokemon(m.name))
  );
  const rivalDetails = await Promise.all(
    state.rivalTeam.map((m) => getPokemon(m.name))
  );

  for (let i = 0; i < state.team.length; i++) {
    const info = await calculateCombatScore(state.team[i]);
    userTotalCS += info.score;
    userTeamInfo.push(info);
  }
  for (let i = 0; i < state.rivalTeam.length; i++) {
    const info = await calculateCombatScore(state.rivalTeam[i]);
    rivalTotalCS += info.score;
    rivalTeamInfo.push(info);
  }

  // Matchup simulation multiplier based on Turns to KO
  let matchupWins = 0;
  let matchTotal = 0;

  state.team.forEach((u, i) => {
    state.rivalTeam.forEach((r, j) => {
      const uTurnsToKO = simulateMatchup(userTeamInfo[i], userDetails[i], rivalTeamInfo[j], rivalDetails[j], u.level);
      const rTurnsToKO = simulateMatchup(rivalTeamInfo[j], rivalDetails[j], userTeamInfo[i], userDetails[i], r.level);
      
      // Speed tie-breaker
      const uSpd = userTeamInfo[i].stats?.spe || 0;
      const rSpd = rivalTeamInfo[j].stats?.spe || 0;
      
      let uEffectiveTurns = uTurnsToKO;
      let rEffectiveTurns = rTurnsToKO;
      
      // If speed is much higher, effectively gives a free hit, subtract a half turn from needed
      if (uSpd > rSpd * 1.1) uEffectiveTurns -= 0.5;
      else if (rSpd > uSpd * 1.1) rEffectiveTurns -= 0.5;
      
      if (uEffectiveTurns < rEffectiveTurns) {
        // User wins this matchup
        let margin = (rEffectiveTurns - uEffectiveTurns) / Math.max(uEffectiveTurns, 1);
        matchupWins += 1 + Math.min(margin * 0.5, 0.5); // Win gives +1, crush gives up to +1.5
      } else if (rEffectiveTurns < uEffectiveTurns) {
        // Rival wins this matchup
        let margin = (uEffectiveTurns - rEffectiveTurns) / Math.max(rEffectiveTurns, 1);
        matchupWins -= (1 + Math.min(margin * 0.5, 0.5)); // Loss gives -1, crush gives up to -1.5
      }
      matchTotal += 1.5; // Max possible per matchup
    });
  });

  // Calculate advantage from matchups: range from -1 (total wipeout) to +1
  const matchupAdvantage = matchTotal > 0 ? (matchupWins / matchTotal) : 0;
  
  // Combine base Combat Score with Matchup Advantage
  // We'll treat the matchup advantage as a swing of up to +/- 40% on the theoretical parity
  const baseUserRatio = userTotalCS / (userTotalCS + rivalTotalCS);
  let userProbDecimal = baseUserRatio + (matchupAdvantage * 0.4);

  // Clamp the probability between 1% and 99%
  userProbDecimal = Math.max(0.01, Math.min(0.99, userProbDecimal));

  const userProb = Math.round(userProbDecimal * 100);
  const rivalProb = 100 - userProb;

  // Update UI
  $("#userWinProb").textContent = `${userProb}%`;
  $("#rivalWinProb").textContent = `${rivalProb}%`;
  $("#probBarUser").style.width = `${userProb}%`;
  $("#probBarRival").style.width = `${rivalProb}%`;

  // Color the bar
  $("#probBarUser").className =
    `progress-bar ${userProb > 50 ? "bg-success" : "bg-primary"}`;
  $("#probBarRival").className =
    `progress-bar ${rivalProb > 50 ? "bg-danger" : "bg-warning"}`;
}

loadItems();
init();
