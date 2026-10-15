# 🔴 Manual Técnico — PokéApp v2.0

> **La Enciclopedia Pokémon Definitiva**
> Documento técnico de arquitectura, instalación, funcionamiento interno y guía para desarrolladores.
> Basado en un análisis completo de la base de código (frontend estático + proxies PHP).

---

## 📑 Índice general

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura global del sistema](#2-arquitectura-global-del-sistema)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Estructura de directorios](#4-estructura-de-directorios)
5. [Capa de datos: las APIs externas que consume la app](#5-capa-de-datos-las-apis-externas-que-consume-la-app)
6. [Backend: los proxies PHP](#6-backend-los-proxies-php)
7. [Núcleo del frontend: `app.js`](#7-núcleo-del-frontend-appjs)
8. [Motor de caché y sincronización: `cache.js`](#8-motor-de-caché-y-sincronización-cachejs)
9. [Sistema de internacionalización (i18n)](#9-sistema-de-internacionalización-i18n)
10. [Persistencia del cliente: claves y bases de datos](#10-persistencia-del-cliente-claves-y-bases-de-datos)
11. [Subsistema TCG (cartas coleccionables)](#11-subsistema-tcg-cartas-coleccionables)
12. [Calculadora de Captura: modelo matemático](#12-calculadora-de-captura-modelo-matemático)
13. [Motor de combate y probabilidad de victoria](#13-motor-de-combate-y-probabilidad-de-victoria)
14. [Capa de presentación: sistema de diseño CSS](#14-capa-de-presentación-sistema-de-diseño-css)
15. [Accesibilidad (A11y)](#15-accesibilidad-a11y)
16. [Guía de instalación paso a paso](#16-guía-de-instalación-paso-a-paso)
17. [Guía de personalización](#17-guía-de-personalización)
18. [Rendimiento y optimizaciones](#18-rendimiento-y-optimizaciones)
19. [Análisis de seguridad y privacidad](#19-análisis-de-seguridad-y-privacidad)
20. [Solución de problemas (Troubleshooting)](#20-solución-de-problemas-troubleshooting)
21. [Deuda técnica y mejoras recomendadas](#21-deuda-tecnica-y-mejoras-recomendadas)
22. [Glosario de términos](#22-glosario-de-términos)

---

## 1. Resumen ejecutivo

**PokéApp** es una aplicación web de tipo *enciclopedia Pokémon* construida casi íntegramente en **frontend puro** (HTML5 + CSS3 + JavaScript ES6+, sin frameworks SPA ni build tools) que se apoya en **dos pequeños scripts PHP** que actúan como *proxies* reversos para sortear las restricciones **CORS** de APIs de terceros.

La filosofía del proyecto es notable: en lugar de un backend con base de datos propia, la aplicación **convierte el navegador del usuario en la base de datos**. Mediante una capa de persistencia robusta construida sobre **IndexedDB** (caché L2) y un **Map en memoria** (caché L1), la app descarga masivamente los datos de la [PokéAPI](https://pokeapi.co) y los almacena localmente, de modo que:

- La navegación posterior es **casi instantánea** (lectura local).
- La app funciona de forma **parcialmente offline** ya sincronizados los datos.
- Se mitigan los temidos errores **504 (Gateway Timeout)** de la PokéAPI pública bajo carga intensiva.

### Alcance funcional

La aplicación integra **más de 25 secciones** en tres grandes dominios:

| Dominio | Secciones |
| :--- | :--- |
| **Mundo Pokémon** | Pokédex interactiva, Regiones, Generaciones, Localizaciones, Crianza, Hábitats, Formas corporales, Calculadora de Captura |
| **Combate** | Movimientos, Habilidades, Tabla de Tipos, Naturalezas, Máquinas (MT/MO), Concursos |
| **Colección** | Objetos, Bayas, Juegos, Cartas TCG, Sets TCG, Mi Álbum |

A esto se suman herramientas transversales: **constructor de equipos** con simulador de combate, **panel de auditoría de APIs**, **sistema multiidioma (8 idiomas)**, **tema claro/oscuro**, y un **gestor de cookies** integrado.

### Métricas del código (a fecha de análisis)

| Métrica | Valor |
| :--- | :--- |
| Archivos JavaScript | 30 módulos (`assets/js/`) |
| Módulo principal (`app.js`) | ~6.850 líneas |
| Motor de caché (`cache.js`) | ~1.200 líneas |
| CSS | 26 hojas de estilo (~160 KB la principal) |
| Páginas HTML | 1 (`index.html`) + 24 en `pages/` |
| Idiomas soportados | 8 (ES, EN, FR, DE, IT, PT, JA, ZH-TW) |
| APIs externas integradas | 6 (PokéAPI, TCGDex, Bulbapedia, WikiDex, Pokémon Wiki/Fandom, GitHub) |
| Inicio del historial Git | 2026-04-05 |

---

## 2. Arquitectura global del sistema

La aplicación sigue un patrón **cliente-servidor ingenuo** donde el "servidor" es mínimo y el grueso de la lógica vive en el cliente.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR DEL USUARIO                           │
│                                                                         │
│  ┌──────────────┐   ┌───────────────────────────────────────────────┐  │
│  │   Páginas     │   │              CAPA JS (Núcleo)                 │  │
│  │   HTML        │◄──┤  app.js · i18n.js · cache.js · a11y.js       │  │
│  │  (25 páginas) │   │  bulbs.js · cookies.js · 20 módulos/página   │  │
│  └──────────────┘   └───────────────┬───────────────────────────────┘  │
│                                      │                                  │
│         ┌────────────────────────────┼───────────────────────────┐     │
│         ▼                            ▼                            ▼     │
│  ┌─────────────┐           ┌──────────────────┐         ┌─────────────┐ │
│  │ LocalStorage │           │    IndexedDB      │         │  Memoria   │ │
│  │ (UI, prefs, │           │  (caché L2 de     │         │  (caché L1 │ │
│  │  colección) │           │   datos + TCG)     │         │  Map, ≤2500│ │
│  └─────────────┘           └──────────────────┘         └─────────────┘ │
└───────────────┬─────────────────────────────────────────────┬───────────┘
                │ fetch() directo                              │ fetch() vía proxy
                ▼                                              ▼
┌───────────────────────────┐                ┌─────────────────────────────────┐
│   APIs CON CORS abierto   │                │        SERVIDOR LOCAL (XAMPP)   │
│  · PokéAPI (pokeapi.co)   │                │   Apache + PHP 8.x              │
│                           │                │  ┌────────────┐ ┌─────────────┐ │
└───────────────────────────┘                │  │ proxy.php  │ │ bulbapedia  │ │
                                             │  │ (→ TCGDex) │ │ _proxy.php  │ │
                                             │  └─────┬──────┘ └──────┬──────┘ │
                                             └────────┼───────────────┼────────┘
                                                      │ cURL           │ cURL
                                                      ▼                ▼
                                        ┌─────────────────┐  ┌────────────────────┐
                                        │   TCGDex API    │  │ Bulbapedia · WikiDex│
                                        │ (api.tcgdex.net)│  │ Fandom · PokéAPI    │
                                        └─────────────────┘  └────────────────────┘
```

### Flujo de datos típico (ejemplo: abrir el detalle de un Pokémon)

1. El usuario pulsa una tarjeta → `openModal(name)`.
2. `app.js` consulta `state.details` (Map en memoria). Si no está, llama a `getPokemon(name)`.
3. `getPokemon` delega en `fetchJSON` → primero consulta la **caché L1 (Map)**, luego la **L2 (IndexedDB)**.
4. Solo si ambas fallan se emite una petición de red a la PokéAPI, gestionada por una **cola con límite de 10 peticiones concurrentes**.
5. El resultado se persiste en L1 y L2, y se devuelve.
6. `openModal` enriquece con `pokemon-species`, `evolution-chain`, `pokemon-form`, movimientos, datos TCG (vía `proxy.php`) y lore enciclopédico (vía `bulbapedia_proxy.php`, solo bajo demanda).
7. La URL del navegador se actualiza a `#pokemon/charizard` mediante `history.replaceState` (deep-linking sin recarga).

---

## 3. Stack tecnológico

| Capa | Tecnología | Observaciones |
| :--- | :--- | :--- |
| **Marcado** | HTML5 semántico | Uso extensivo de `<dialog>` nativo, `template`, ARIA |
| **Estilos** | CSS3 vanilla | Variables CSS (custom properties), Grid/Flexbox, sin preprocesador |
| **Lógica** | JavaScript ES6+ | `class`, `async/await`, `Map`, `Set`, `IntersectionObserver`, `BroadcastChannel`, `AbortController` |
| **UI Kit** | Bootstrap 5.3.3 (CDN) | Clases utilitarias y componentes (dropdowns, tablas, modales de apoyo) |
| **Iconografía** | Lucide (CDN, `unpkg`) | Iconos vectoriales renderizados vía `lucide.createIcons()` |
| **Backend** | PHP 8.x | Solo 2 archivos; usa `match`, tipos de retorno, `str_contains`, `str_ends_with` |
| **HTTP cliente (PHP)** | cURL | Con reintentos, *timeouts* dinámicos y *fallbacks* |
| **Persistencia** | IndexedDB + LocalStorage | Dos bases de datos independientes (caché y TCG) |
| **Servidor (dev)** | XAMPP (Apache + PHP) | Cualquier stack LAMP/WAMP/MAMP funciona |

> **Nota de compatibilidad PHP:** el código emplea sintaxis de **PHP 8.0+** (`match`, argumentos nombrados, `str_contains`, `str_ends_with`, tipos de retorno en funciones). No funcionará en PHP 7.x. En PHP 8.5+, `curl_close()` está deprecado y el código ya evita llamarlo (usa `unset($ch)`), demostrando mantenimiento activo y anticipación a la evolución del runtime.

---

## 4. Estructura de directorios

```
Pokedex/
│
├── index.html                    # Pokédex principal (SPA de página única)
├── proxy.php                     # Proxy TCGDex (+ GitHub commits)
├── bulbapedia_proxy.php          # Scraper multi-tier de lore enciclopédico
├── README.md                     # Documentación de usuario
│
├── includes/
│   └── footer_snippet.html       # Pie de página dinámico (inyectado por i18n.js)
│
├── pages/                        # 24 páginas de sección
│   ├── abilities.html            ├── moves.html
│   ├── api_info.html             ├── my-album.html
│   ├── aviso-legal.html          ├── natures.html
│   ├── berries.html              ├── politica-cookies.html
│   ├── breeding.html             ├── politica-privacidad.html
│   ├── capture-calculator.html   ├── regions.html
│   ├── cards.html                ├── shapes.html
│   ├── contests.html             ├── tcg-sets.html
│   ├── encounters.html           ├── types.html
│   ├── games.html                └── ...
│   ├── generations.html
│   ├── habitats.html
│   ├── items.html
│   ├── locations.html
│   └── machines.html
│
└── assets/
    ├── css/                      # 26 hojas: styles.css (núcleo) + 1 por módulo
    ├── i18n/                     # 8 diccionarios de idioma + diccionarios de nombres
    │   ├── es.json  en.json  fr.json  de.json
    │   ├── it.json  pt.json  ja.json  zh.json
    │   ├── item_names.json  move_names.json  ability_names.json
    │   └── audit-report.json
    ├── icon/                     # logo.png, favicon.png
    ├── img/                      # Banderas, tipos, regiones, juegos, fallback
    └── js/                       # 30 módulos JavaScript
        ├── app.js                # Núcleo de la Pokédex principal (~6.850 lín.)
        ├── cache.js              # Motor de caché IndexedDB + sync (~1.200 lín.)
        ├── i18n.js               # Internacionalización (~560 lín.)
        ├── bulbapedia.js         # Cliente del proxy de lore
        ├── cardStorage.js        # Persistencia IndexedDB del TCG
        ├── cards.js              # Galería de cartas TCG (~2.100 lín.)
        ├── collectionStorage.js  # Colección personal (localStorage)
        ├── capture-calculator.js # Motor matemático de capturas
        ├── a11y.js / cookies.js  # Accesibilidad, tema y consentimiento
        └── [moves, abilities, types, natures, ...] # Un módulo por página
```

### Convención de carga de scripts

Cada página carga **solo lo necesario**, siempre en este orden crítico:

1. **`cache.js`** y **`i18n.js`** en `<head>` con `defer` → definen `window.fetchCached` e `I18n` **antes** de que cualquier módulo dependa de ellos.
2. Bootstrap y Lucide desde CDN.
3. El módulo específico de la página (p. ej. `moves.js`) con `defer`.
4. `footer_snippet.html` se inyecta en runtime en `<div id="footer-placeholder">` y, tras inyectarse, `i18n.js` invoca `initFooterLogic()` (definida en `cache.js`) para arrancar los botones de sincronización.

> El uso de `defer` garantiza que los scripts se ejecutan en orden tras parsear el DOM, sin bloquear el render. **No hay bundler ni paso de compilación**: el proyecto se sirve tal cual.

---

## 5. Capa de datos: las APIs externas que consume la app

La aplicación es un **agregador de seis fuentes de datos**. Conocer cada una es clave para mantener el sistema.

### 5.1 PokéAPI (`https://pokeapi.co/api/v2`) — Fuente primaria

API REST pública, gratuita y con CORS abierto. Es la **columna vertebral** de casi todo:

| Recurso | Uso en la app |
| :--- | :--- |
| `/pokemon`, `/pokemon/{id}` | Estadísticas, tipos, sprites, habilidades, moves, cries |
| `/pokemon-species/{id}` | Genera, grupo huevo, hábitat, color, tasa de captura, entradas de Pokédex, `evolution_chain` |
| `/evolution-chain/{id}` | Cadena evolutiva completa (incluye ramas) |
| `/pokemon-form/{id}` | Formas morfológicas (Unown, Burmy, etc.) |
| `/type/{id}` | Matriz de relaciones de daño (debilidades/resistencias) |
| `/move`, `/ability`, `/item`, `/nature` | Diccionarios de combate |
| `/region`, `/pokedex`, `/location`, `/location-area` | Geografía y encuentros |
| `/berry`, `/contest-type`, `/egg-group`, ... | Módulos especializados |

Se consume **directamente desde el navegador** (no pasa por proxy) porque PokéAPI permite CORS.

### 5.2 TCGDex (`https://api.tcgdex.net/v2/{lang}`) — Vía `proxy.php`

API REST del juego de cartas coleccionables. Expone `/cards`, `/sets`, `/types`, `/rarities`, etc. **Se accede siempre a través de `proxy.php`** para centralizar la gestión de idioma, *fallbacks* y caché HTTP.

### 5.3 Bulbapedia, WikiDex y Pokémon Wiki — Vía `bulbapedia_proxy.php`

Tres enciclopedias de las que se extrae "lore" (biología, efectos, etimología, curiosidades). Se accede mediante **scraping** y APIs MediaWiki, con una cadena de prioridad de 5 niveles (ver §6.2).

### 5.4 GitHub API — Vía `proxy.php`

`endpoint=githubCommits` consulta el último commit del repositorio oficial de PokéAPI para mostrar en `api_info.html` la "última actualización de la fuente de datos".

### 5.5 CDN de imágenes

- **`raw.githubusercontent.com/PokeAPI/sprites`**: sprites oficiales (grid, ítems).
- **`raw.githubusercontent.com/msikma/pokesprite`**: sprites Gen8 alternativos.
- **`assets.tcgdex.net`**: imágenes de cartas TCG (con *fallback* automático de idioma a `en/`, ver §9.4).

---

## 6. Backend: los proxies PHP

PHP se usa exclusivamente para **salvar barreras CORS** y **abstraer scraping**. No hay base de datos, sesiones ni lógica de negocio persistente en el servidor.

### 6.1 `proxy.php` — Pasarela TCGDex

**Responsabilidad:** actuar como intermediario confiable entre el navegador y TCGDex, con caché HTTP, reintentos y degradación elegante.

#### Parámetros de entrada

| Parámetro | Descripción |
| :--- | :--- |
| `endpoint` | Recurso solicitado. **Lista blanca**: `sets`, `cards`, `types`, `rarities`, `series`, `hp`, `retreats`, `illustrators`, `categories`, `suffixes`, `cardDetail`, `set`, `githubCommits` |
| `lang` | Idioma. Validado contra `['en','es','fr','de','it','pt','ja','zh','zh-tw']`; si no es válido, fuerza `en` |
| `page`, `pageSize` | Re-mapeados a la sintaxis de TCGDex: `pagination:page`, `pagination:itemsPerPage` |
| `id` | Para `cardDetail` y `set` |

> **Diseño defensivo:** cualquier `endpoint` fuera de la lista blanca responde `400` con JSON de error. Nunca se permite al usuario controlar arbitrariamente la URL destino (protección básica contra *SSRF*).

#### Pipeline interno

```
1. Validar método (GET) y parámetros.
2. Construir $targetUrl a partir de la lista blanca.
3. Asignar TTL de caché según endpoint:
      · Listas estáticas (types, rarities...) → 14 días
      · Detalle carta/set                     → 7 días
      · Listados (sets, cards)                → 6 horas
      · GitHub commits                        → 30 minutos
4. Ejecutar cURL con:
      · Timeouts: 3 s (listas) / 20 s (detalle) / 5 s (GitHub)
      · Reintentos: hasta 2 intentos ante 5xx o 429
      · HTTP/1.1, User-Agent "PokedexApp/1.0"
5. SI responde 404/500/502/503 en idioma ≠ en:
      → Reintentar contra la versión ENGLISH (fallback de idioma).
        (Frecuente con cartas promocionales "x-yp" y expansiones e-Card)
6. SI definitivamente falla:
      · Listas      → 200 + fallback estático embebido ($staticFallbacks)
      · cardDetail  → 200 + payload informativo {error, id, notFound:true}
      · set         → 200 + payload informativo
      · cURL roto   → 500 + mensaje para error_log
7. Validar que la respuesta sea JSON válido.
8. Responder con ETag (md5) + Cache-Control → permite 304 Not Modified.
```

#### Detalles de ingeniería destacables

- **`$staticFallbacks`**: el archivo embebe listas completas (33 rarezas, 11 tipos, 14 series, sufijos...) para que la UI **nunca se quede vacía** aunque TCGDex caiga por completo. Es un patrón de *graceful degradation* ejemplar.
- **ETag + 304**: el proxy calcula el `md5` del contenido y lo compara con `HTTP_IF_NONE_MATCH`; si coincide, responde `304` sin cuerpo. Ahorca ancho de banda significativo.
- **Compresión Gzip**: `ob_start("ob_gzhandler")` activa compresión si el servidor la soporta.
- **Preflight CORS**: responde `200` inmediatamente a peticiones `OPTIONS`.

### 6.2 `bulbapedia_proxy.php` — Scraper multi-tier de lore

**Responsabilidad:** obtener texto enciclopédico rico (secciones y curiosidades) de forma fiable, aun cuando algunas fuentes estén caídas o bloqueadas.

#### Cadena de prioridad (5 niveles)

```
P1. Bulbapedia directo (scraping HTML con DOMXPath)
      └─ Aborta si detecta Cloudflare ("Just a moment...", "challenges.cloudflare.com")
P2. WikiDex (API MediaWiki en español) — solo si lang = es
P3. Pokémon Wiki / Fandom (API MediaWiki en inglés)
P4. WikiDex otra vez (cubre el caso en que se pidió inglés y Fandom no tenía contenido)
P5. PokéAPI (fallback "infalible": flavor_text, effect_entries, genera,
      flags legendary/mythical, habitat)
└─ Si todo falla → 200 con mensaje amigable (nunca 500).
```

#### Normalización de nombres

La función `normalizeEntity()` es una pieza crítica de *data cleaning*:

1. **Elimina sufijos de forma** (`-mega`, `-alola`, `-therian`, `-gmax`, `-paldea`, etc. — más de 40 sufijos) para reducir `charizard-mega-x` → `charizard`.
2. Convierte a *Title Case* reemplazando `-` y `_` por espacios.
3. Aplica una **tabla de excepciones manuales** para nombres con puntuación especial: `Mr. Mime`, `Type: Null`, `Ho-Oh`, `Porygon-Z`, `Farfetch'd`, `Sirfetch'd`, `Nidoran♀/♂`, `Flabébé`, los parajes de Paldea (`Wo-Chien`...), etc.

> Sin esta tabla, el scraping fallaría sistemáticamente con ~30 Pokémon cuyos nombres oficiales incluyen guiones, puntos o apóstrofes.

#### Limpieza de HTML

`cleanHtmlToText()` y `cleanHtmlToList()` usan `DOMDocument` + `DOMXPath` para:
- Eliminar `script`, `style`, `aside`, `table`, `nav`, `figure`, índice de contenidos y *tabbers*.
- Conservar solo párrafos con más de 20 caracteres (filtra plantillas y notas de pie).
- Quitar las referencias bibliográficas `[1]`, `[2]` mediante regex.
- Colapsar espacios múltiples.

#### Secciones objetivo

- **Pokémon:** `Biology`, `Effect`, `Description`, `Geography`, `Evolution`, `Trivia`.
- **WikiDex (ES):** `Etimología`, `Biología`, `Evolución`, `Efecto`, `Descripción`, `Efecto en Combate`, `Curiosidades`.
- **Fandom (EN):** `Biology`, `Physiology`, `Behavior`, `Evolution`, `Effect`, `Description`, `Geography`, `Trivia`.

> **Decisión UX importante:** el lore **no se carga automáticamente**. `bulbapedia.js` renderiza un botón *"Cargar información extra"* y solo al pulsarlo se realiza la petición (con caché de 7 días). Esto evita cientos de peticiones de scraping al abrir la Pokédex, respetando a las fuentes y acelerando el arranque.

---

## 7. Núcleo del frontend: `app.js`

Es el archivo más grande y complejo del proyecto (~6.850 líneas). Concentra la Pokédex principal: carga de índice, filtrado, ordenación, renderizado de tarjetas, modal de detalle, evoluciones, learnsets, equipos y simulación de combate.

### 7.1 Gestión de estado

Todo el estado vive en un objeto singleton `state`:

```js
const state = {
  index: [],              // Lista de nombres (orden del índice)
  indexData: [],          // [{name, id, isForm}] — incluye formas
  details: new Map(),     // Cache en memoria: nombre → dato /pokemon
  species: new Map(),     // nombre → dato /pokemon-species
  evoChains: new Map(),   // url → dato /evolution-chain
  typeSets: new Map(),    // tipo → Set(names) de Pokémon con ese tipo
  typeInfo: new Map(),    // tipo → relaciones de daño completas
  regionSets: new Map(),  // región → Set(species)
  genSets: new Map(),     // generación → Set(species)
  bst: new Map(),         // nombre → suma de estadísticas base

  // Filtros (persistidos en localStorage con clave "pokedex_ui_v3")
  search: "", region: "all", generation: "all",
  selectedTypes: new Set(),   // máximo 2 tipos simultáneos
  typeMode: "or",             // "or" | "and" | "exact"
  sort: "id-asc", perPage: 60, page: 1,
  includeForms: false, gridShiny: false,
  showOnlyFavorites: false, minBST: 0, minSpeed: 0,

  // Colección del usuario
  favorites: new Set(),
  team: [], rivalTeam: [], activeTeam: "user", showTeams: true,
};
```

`saveSettings()` serializa todo a `localStorage["pokedex_ui_v3"]`; `loadSettings()` lo restaura al arrancar, **normalizando formatos antiguos** (p. ej. si un miembro de equipo guardado es un simple `string`, lo convierte al objeto completo por defecto con IVs 31, nivel 50 y naturaleza `hardy`).

### 7.2 Descubrimiento dinámico de listas

`discoverDynamicLists()` consulta `/type`, `/region` y `/generation` al arrancar y **reconstruye** `TYPE_LIST`, `REGION_KEYS` y `GEN_KEYS` y sus `<select>` en el DOM. Esto hace la app **a prueba de futuro**: cuando la Gen X o un tipo nuevo (p. ej. `stellar`) aparezcan en la PokéAPI, se detectan y muestran automáticamente sin tocar código. Solo se aceptan si la API devuelve *al menos* tantos elementos como la lista de respaldo (evita que un fallo parcial degenere la UI).

### 7.3 Pipeline de carga de datos

| Función | Misión |
| :--- | :--- |
| `loadIndex()` | Descarga `/pokemon?limit=10000` y `/pokemon-form?limit=10000`, fusionándolos con **heurística anti-duplicados** (descarta formas cuyo nombre es prefijo de una variedad ya existente). |
| `loadTypeSets()` | Para cada tipo, construye el `Set` de nombres de Pokémon que lo poseen (base para el filtro por tipos). |
| `loadRegions()` | Para cada región, recorre sus `pokedexes` y acumula las especies en un `Set`. |
| `loadGenerations()` | Igual pero desde `pokemon_species` de cada generación. |

### 7.4 Resolución de identidades (el problema de formas y variedades)

PokéAPI distingue entre **especies**, **variedades** (`charizard`, `charizard-mega-x`) y **formas morfológicas** (`unown-a`, `burmy-plant`). `getPokemon(name)` implementa una máquina de fallbacks de 4 pasos (`_getPokemonFallback`) que garantiza resolver *cualquier* entrada:

1. **ID numérico fallido** → intenta `/pokemon-form/{id}`.
2. **Nombre no hifenado (o en lista blanca de especies hifenadas)** → busca `/pokemon-species/{name}` y redirige a su variedad por defecto.
3. **Nombre hifenado** → trocea el nombre progresivamente (`mr-mime-galar` → prueba `mr-mime`, luego `mr-mime-galar`) evitando sufijos que siempre son variedades (`mega`, `alola`, `therian`...), hasta encontrar la especie. Después intenta localizar la forma concreta en `d.forms`.
4. **Validación por sprite ("fantasmas")**: si la forma resuelta **no tiene ningún sprite** (p. ej. *Mothim* forma *Trash*), se descarta y se devuelve la variedad por defecto. Esto evita tarjetas rotas por formas que existen en el modelo de datos pero nunca se ilustraron.

### 7.5 Filtrado y ordenación

`buildFilteredList()` aplica los filtros en cadena sobre `indexData`:

1. Excluye formas si `includeForms=false` (y siempre los `-female` redundantes).
2. Búsqueda por nombre con **`I18n.smartSearch`** (ver §9.5).
3. Región y generación (intersectando los `Set` precargados).
4. Tipos según el modo:
   - **`or`** → unión de los `Set` seleccionados.
   - **`and`** → intersección.
   - **`exact`** → intersección de los seleccionados **más** exclusión de todos los no seleccionados (identifica combos mono/dual exactos).
5. Solo favoritos.
6. Umbral de estadísticas (BST/velocidad) — requiere cargar detalles.

`applySort()` tiene dos rutas:
- **Rápida (O(n log n) en memoria):** por nombre (`localeCompare` sensible a acentos) o por ID (usa un `Map` índice→posición).
- **Lenta (requiere red/caché):** por estadísticas, peso o altura. Despliega un **indicador de progreso con porcentaje** y usa un **pool de 15 workers concurrentes** que consumen una cola de índices, actualizando el porcentaje cada vez que se completa un elemento. El usuario ve "Cargando datos para ordenar... 43% (870/2016)" en lugar de una congelación.

### 7.6 Renderizado de tarjetas (virtualización con IntersectionObserver)

`renderPage()` no carga datos: solo **clona el `<template id="card-tpl">`** y crea las tarjetas esqueleto con su nombre e imagen placeholder. Cada tarjeta se registra en un **`IntersectionObserver` con `rootMargin: 800px`**: solo cuando está a menos de 800px de entrar en el viewport (o ya visible) se dispara `loadCardData()`, que rellena ID, tipos, colores y sprite.

> Este patrón es el responsable de que la app muestre 60–100 tarjetas por página sin disparar 100 peticiones simultáneas. Los sprites se cargan con `loading="lazy"` y `decoding="async"` como segunda red de seguridad, y una clase `skeleton` muestra un efecto de *shimmer* hasta que la imagen dispare el evento `load`.

### 7.7 Modal de detalle

`openModal(name, preferredSuffix, keepShiny)` es la función más densa. Al abrirla:

1. Muestra inmediatamente el `<dialog>` nativo con un **overlay de carga** (spinner) — feedback instantáneo.
2. Resuelve `pokemon` + `pokemon-species`.
3. **Cambio inteligente de forma**: si se le pasa un sufijo (p. ej. `-mega` al navegar desde otra vista) y la especie tiene esa variedad, la carga automáticamente.
4. Sincroniza el deep-link (`#pokemon/{name}`) y el índice de navegación.
5. Aplica el **gradiente temático del tipo** (variables `--tc1`/`--tc2`, clases `bg-1`/`bg-2`/`dual`).
6. Rellena: genera/categoría, tipos, altura/peso (divididos entre 10 para pasar a m/cm y kg), experiencia base, habilidades (con etiqueta de *habilidad oculta*), grupos huevo, crecimiento, hábitat (enlace a `habitats.html#habitat/{x}`), forma (enlace a `shapes.html#shape/{x}`), color, generación, tasa de captura, felicidad, ratio de género.
7. Lista los **objetos que puede llevar** (`held_items`) con su rareza por versión, e íconos con doble fallback (repositorio PokéAPI → repositorio msikma → ocultar).
8. Tabla de estadísticas con barras proporcionales.
9. Selector de **forma** unificando *variedades* y *formas*, filtrando las de género redundantes, y mostrando junto a cada opción su **requisito de obtención** (consultado del diccionario i18n `forms.requirements_data`).
10. Coordina género↔forma (p. ej. elegir ♀ en Meowstic recarga la variedad femenina).
11. Renderiza: efectividad de tipos, tipos pasados, números de Pokédex regionales, learnset filtrable, carrusel TCG, sección Bulbapedia y **árbol evolutivo**.
12. Instala un **trap de foco** accesible (Tab cicla dentro; Escape cierra) y limpia el foco y el hash al cerrar.

**Navegación entre Pokémon:** flechas `←`/`→` del teclado y **gestos de deslizamiento** (`SwipeDetector`) permiten recorrer la Pokédex sin cerrar el modal.

### 7.8 Cadena evolutiva

`buildEvolutionUI` + `renderEvoBranch` construyen un árbol recursivo desde `evolution-chain`:

- `calculateEvoDepth` y `getTreeMaxDepth` calculan la profundidad para dimensionar el scroll.
- `formatEvolutionDetails` traduce los disparadores a texto legible: nivel, objeto (p. ej. "Piedra Fuego"), amistad, moves, región, intercambio, etc.
- Cada nodo es una mini-tarjeta clicable que reabre el modal con ese estadio.

---

## 8. Motor de caché y sincronización: `cache.js`

Es el sistema que hace viable el rendimiento de la app. Implementa una caché de **dos niveles** con invalidación por tiempo y versionado por aplicación.

### 8.1 Arquitectura de dos niveles

| Nivel | Almacén | Capacidad | Latencia | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **L1** | `Map` en memoria (`_memoryCache`) | 2.500 entradas (evicción FIFO del más antiguo) | Nanosegundos | Igual que L2 |
| **L2** | IndexedDB (`PokedexCacheDB`) | Ilimitada (hasta cuota del navegador) | Milisegundos | Configurable por petición |

**Lectura (`get`):** L1 → si caducó, se borra → L2 → si es válida, **re-alimenta L1** y se devuelve → si no, `null`.
**Escritura (`set`):** se escribe siempre en L1 de inmediato y, en paralelo, en L2.

### 8.2 Sharding de la base de datos

En lugar de un único almacén, la caché se divide en **11 object stores** por categoría, elegidos por **análisis de la URL destino** (`getStoreForUrl`): `cache_pokemon`, `cache_moves`, `cache_items`, `cache_abilities`, `cache_natures`, `cache_types`, `cache_generations`, `cache_regions`, `cache_games`, `cache_misc`, `cache_bulbapedia`.

> Ventaja: las estadísticas (`getStats`) y la limpieza selectiva son mucho más rápidas al no requerir escaneo completo, y la base queda organizada semánticamente.

Las claves se **normalizan a URL absoluta canónica** (`normalizeCacheKey`), de modo que la misma petición hecha desde `index.html` o desde `pages/moves.html` comparte entrada de caché.

### 8.3 `fetchCached`: el fetch "inteligente"

Es el wrapper que usan todos los módulos. Características:

- **Caché primero:** salta a red solo si no hay entrada vigente.
- **Deduplicación de peticiones en vuelo:** un `Map` (`_inFlightRequests`) asegura que 10 tarjetas del mismo Pokémon en pantalla disparen **una sola** petición HTTP.
- **Reintentos con retroceso exponencial + jitter aleatorio:** `delay * 2^i + random(0..500ms)`, para evitar el efecto *thundering herd*.
- **No reintenta 404** (fallo permanente) ni ante `AbortError`.
- **Valida `Content-Type: application/json`** antes de parsear.
- **Respeta `AbortController`** compartido para poder cancelar sincronizaciones.

### 8.4 Versionado y purga automática

`APP_CACHE_VERSION` (actualmente `"2.3.1"`) se compara con el valor persistido en `localStorage["pokedex_app_cache_version"]`. Si difiere (p. ej. al desplegar un cambio de modelo de datos), **se limpian los 11 stores automáticamente** en el arranque. Es el mecanismo de invalidación global recomendado para desarrolladores: *basta con incrementar el número*.

### 8.5 Modos de sincronización

| Modo | Alcance | Disparo |
| :--- | :--- | :--- |
| **`syncAllPokeAPI()`** | 9 índices principales (`pokemon`, `type`, `generation`, `region`, `move`, `ability`, `item`, `nature`, `version-group`) | Botón "Actualizar Todo" |
| **`deepSyncAllPokeAPI()`** | **33 categorías** + cada registro de detalle, sus especies, cadenas evolutivas y formularios | Botón "Sincronización Profunda" o automático cada 24 h |

El **deep sync** es el proceso más pesado (miles de peticiones) y está blindado con:

- **Pool de 8 workers** concurrentes que consumen un índice compartido.
- **Pausa de 25 ms** entre peticiones por worker (cortesía hacia la API pública).
- **Throttle de UI**: la barra de progreso solo se actualiza cada 80 ms para no saturar el hilo principal.
- **`AbortController`** global para detener todo al instante.
- **Detección de recursión**: un `Set syncedUrls` evita re-descargar la misma URL (una especie ya incluida en el índice no se pide dos veces; sus cadenas evolutivas y formularios se deduplican).

### 8.6 Coordinación multi-pestaña (evita duplicados)

Si el usuario tiene varias pestañas abiertas, **solo una debe sincronizar**. El mecanismo combina:

- **`localStorage`** como canal de estado compartido (`pokedex_sync_state` + `pokedex_deepsync_lock`).
- **`BroadcastChannel("pokedex_sync_channel")`** para mensajes instantáneos entre pestañas del mismo origen.
- **Heartbeat cada 1.5 s**: la pestaña líder refresca su marca de tiempo. Si otra pestaña detecta que el heartbeat tiene más de 4.5 s de antigüedad, asume que la líder murió y **recupera el bloqueo** (limpieza de locks huérfanos al cerrar/cargar).
- **`beforeunload`:** la pestaña líder libera el lock y emite un estado `stopped`, para que una pestaña superviviente reabra la UI correctamente.

Todas las pestañas siguen el progreso mediante `handleIncomingSyncProgress` (la barra avanza en todas a la vez), y cualquiera puede pulsar **Detener**, que emite un evento global `STOP_SYNC`.

### 8.7 Sincronización automática

`autoDeepSyncDaily()` se ejecuta en cada carga: si el último deep sync fue hace ≥24 h (o nunca), o si las estadísticas de la base indican entradas caducadas, relanza el proceso automáticamente tras 1,5 s de margen, con doble verificación de bloqueo. Esto mantiene la base local siempre razonablemente fresca sin intervención del usuario.

---

## 9. Sistema de internacionalización (i18n)

`i18n.js` implementa un sistema de traducción declarativo, sin dependencias.

### 9.1 Modelo de datos

Ocho diccionarios JSON (`assets/i18n/{lang}.json`) se cargan **en paralelo** (`Promise.all`) al arrancar y se guardan en `I18n.translations`. El idioma activo persiste en `localStorage["pokedex_lang"]` (con normalización `zh` → `zh-tw`).

### 9.2 Mecanismo de anclaje

El marcado HTML declara las traducciones como atributos `data-*`:

| Atributo | Traduce |
| :--- | :--- |
| `data-i18n="clave"` | Contenido textual (`textContent`) |
| `data-i18n-html="clave"` | Contenido con HTML permitido (`innerHTML`) |
| `data-i18n-placeholder` | Atributo `placeholder` |
| `data-i18n-title` | Atributo `title` (tooltips) |
| `data-i18n-alt` | Atributo `alt` (imágenes) |
| `data-i18n-aria-label` | Atributo `aria-label` (accesibilidad) |
| `data-i18n-label` | Atributo `label` (optgroup) |

`applyTranslations()` recorre el DOM y aplica cada ancla. `translateElement(root)` hace lo mismo pero **limitado a un subárbol**, para traducir contenido inyectado dinámicamente sin recorrer toda la página.

La resolución de claves es **jerárquica por puntos** (`"modal.base_stats"` → `translations.es.modal.base_stats`), con parámetros posicionales `{0}`, `{1}` y sustitución automática de `{year}`.

### 9.3 Evento `languageChanged`

Al cambiar de idioma se despacha un `CustomEvent("languageChanged")`. Todos los módulos (grid, equipos, modal, chips de tipo, learnset) se suscriben y **re-renderizan** sus textos. El idioma se refleja incluso en el atributo `<html lang>` y en el título de la pestaña.

### 9.4 Traducción de nombres de entidades y *fallback* de imágenes

Para traducir nombres de **objetos, movimientos y habilidades** sin hacer 2.000 peticiones, el proyecto incluye **diccionarios locales** (`item_names.json`, `move_names.json`, `ability_names.json`) que se cargan una vez y se consultan por clave. `getLocalizedName(url, type)` implementa una cascada:

1. Diccionario local → 2. Recurso completo de la API → 3. `form_names`/`names` en idioma actual → 4. Equivalente en inglés → 5. Nombre por defecto formateado.

En paralelo, `i18n.js` define un **manejador global de errores de imagen** (captura en fase de captura, `useCapture=true`) con dos niveles:
- Si la imagen es de **TCGDex** y no está en inglés, reescribe `/es/` → `/en/` (muchas cartas promocionales solo existen en inglés).
- Si aún así falla, aplica el `fallback.png` local, con guardas anti-bucle (`data-fallbackApplied`).

### 9.5 Búsqueda inteligente

`I18n.smartSearch` es un buscador **tolerante a acentos y espacios** con ranking ponderado:

- Normaliza quitando acentos (NFD + regex de combinantes), minúsculas y no-alfanuméricos.
- Puntúa cada campo: **coincidencia exacta = 100**, *empieza por* = 80, *empieza una palabra* = 70, *contiene* = 50.
- Prueba también la versión "sin espacios" con penalización del 10 % (para buscar `mrmime` → `mr mime`).
- Ordena los resultados de mayor a menor peso.

Así, buscar `"cha"` prioriza *Charizard* y *Charmeleon* sobre *Machamp*.

---

## 10. Persistencia del cliente: claves y bases de datos

### 10.1 Base de datos `PokedexCacheDB` (v5)

Caché de datos de API. 11 stores (`keyPath: "url"`). Entrada: `{url, data, cachedAt, expiry}`. Ver §8.

### 10.2 Base de datos `PokedexTCG_DB` (v5)

Persistencia del subsistema TCG (ver §11): stores `cards`, `sets`, `metadata`, `card_images`, y **stores por idioma** (`cards_es`, `sets_es`, ... para los 8 idiomas soportados).

### 10.3 Claves de `localStorage`

| Clave | Tipo | Contenido |
| :--- | :--- | :--- |
| `pokedex_ui_v3` | JSON | Estado completo de la Pokédex (filtros, favoritos, equipos, paginación) |
| `pokedex_lang` | string | Idioma activo (`es`, `en`, `zh-tw`...) |
| `pokedex_theme` | string | Tema visual (`light`, `dark`, `auto`) |
| `pokedex_app_cache_version` | string | Última versión de caché aplicada (purga automática) |
| `pokedex_cookie_consent` | JSON | Consentimiento de cookies del usuario |
| `pokedex_sync_state` | JSON | Estado de sincronización compartido entre pestañas |
| `pokedex_deepsync_lock` | timestamp | Bloqueo anti-duplicados de deep sync |
| `pokedex_last_auto_deepsync` | timestamp | Última sincronización profunda completada |
| `tcg_filters_v1` | JSON | Filtros de la galería TCG |
| `pokedex_moves_filters` | JSON | Filtros del diccionario de movimientos |
| `my_tcg_collection` | JSON (array) | IDs de cartas en la colección personal del usuario |

> **Patrón de diseño aplicado de forma consistente:** cada subsistema expone su propio *storage adapter* (`saveSettings`/`loadSettings`, `CardStorage`, `CollectionStorage`, `CookieManager`). Esto aísla el detalle de persistencia y facilita migrar (p. ej. de `localStorage` a IndexedDB) sin tocar la lógica de UI.

---

## 11. Subsistema TCG (cartas coleccionables)

Tres módulos cooperan: `cards.js` (galería), `cardStorage.js` (persistencia) y `my-album.js` + `collectionStorage.js` (colección personal).

### 11.1 `cards.js` — Galería de cartas

- **Filtros dinámicos**: rareza, supertipo (Pokémon/Entrenador/Energía), subtipo (EX, V, VMAX...), tipo TCG, HP, etapa, serie, set, orden y un interruptor **"Mostrar solo TCG Pocket"** que filtra expansiones por prefijo de ID (`a1`, `a2`, `p1`) o nombre de serie.
- **Carga híbrida**: intenta primero la base local (`CardStorage.getAllSets`) y solo cae a la API si nunca se sincronizó.
- **Modal de carta** con zoom, navegación previa/siguiente y enlace profundo (`checkUrlForCard`).
- **Paleta de tipos TCG** propia (`TCG_TYPE_CONFIG`) con color e icono Lucide por tipo (incluye `stellar`).

### 11.2 `cardStorage.js` — Persistencia TCG

Capa de acceso a IndexedDB con:

- **Stores por idioma** para cartas y sets (8 idiomas), evitando traducciones cruzadas.
- **Cachés en memoria** por idioma (`_locMapCache`, `_allCardsCache_en`, `_setsMetaCache`) para no re-leer la base en cada render.
- **Claves de filtro precalculadas** (`_buildFilterKey`): guarda los resultados de combinaciones de filtros ya resueltas.
- **Manejador `onversionchange`**: si otra pestaña actualiza el esquema, cierra y recarga la página para evitar inconsistencias.

### 11.3 Mi Álbum y colección personal

`CollectionStorage` es deliberadamente simple: un array de IDs de cartas en `localStorage["my_tcg_collection"]`, con `hasCard`, `addCard`, `removeCard` y `toggleCard`. `my-album.js` lo consume para mostrar expansiones y, en un modal, el progreso de completado por set (cartas obtenidas/total, barra de progreso y coste estimado).

---

## 12. Calculadora de Captura: modelo matemático

`capture-calculator.js` reimplementa las **fórmulas oficiales de captura de los videojuegos**, con selector de generación. Este es el módulo más "científico" del proyecto.

### 12.1 Entradas del modelo

| Variable | Fuente |
| :--- | :--- |
| `HP_max`, `HP_current` | Usuario (con recálculo automático por nivel: `floor((2·BaseHP + 25)·Nivel/100) + Nivel + 10`) |
| `catchRate` | PokéAPI (`pokemon-species.capture_rate`) |
| Ball + multiplicador | Calculado dinámicamente (ver §12.2) |
| Estado alterado | `statusMod`: Dormido/Congelado = **×2.0**; Paralizado/Quemado/Envenenado = **×1.5**; Ninguno = ×1.0 |
| Generación | Selector (Gen 1 / Gen 2 / Gen 3–9) |
| Nivel del objetivo | Modificador Gen 8+ |

### 12.2 Multiplicadores por Poké Ball

Implementa el comportamiento **real y condicional** de cada ball:

| Ball | Multiplicador |
| :--- | :--- |
| Poke / Premier / Luxury / Heal / Friend | ×1.0 (fijo) |
| Great / Safari / Sport | ×1.5 (fijo) |
| Ultra | ×2.0 (fijo) |
| **Master** | ×255 → **captura garantizada** |
| Net | ×3.5 si es tipo Agua o Bicho |
| Nest | `max(1, (40 − Nivel)/10)`, tope ×3.0 |
| Repeat | ×3.5 si ya está registrado, si no ×1.0 |
| Timer | `1 + ((turnos−1)·1229/4096)`, tope ×4.0 |
| Dusk | ×3.0 en cueva/noche |
| Dive | ×3.5 bajo el agua |
| Quick | ×5.0 solo en el turno 1 |
| Fast | ×4.0 si Velocidad base ≥ 100 |
| Level | ×1/×2/×4/×8 según el nivel de tu Pokémon vs. el objetivo |
| Love | ×8.0 si coincide el género |
| Moon | ×4.0 si evoluciona con Piedra Luna |
| Dream | ×4.0 si está dormido |
| Beast | ×5.0 Ultra Bestias, ×0.1 cualquier otro |
| **Heavy** | **Aditiva** (no multiplicativa): −20 / 0 / +20 / +30 según peso (<100, <200, <300, ≥300 kg) |

> La UI lo detecta: cuando `isAdditive=true`, muestra el valor con signo (`+30 Ratio`) y coloreado de amarillo, y el motor lo suma al `catchRate` (limitado a [1,255]) en lugar de multiplicar.

### 12.3 Fórmulas por generación

**Gen 1 (Kanto):** aproxima la lógica original: calcula `A = min(255, ⌊HP_max·255·4 / HP_current⌋)`, combina con el bonus de estado (`25/256` sueño/congelación, `12/256` otros) como `P = P_status + (1 − P_status)·(A/256)`.

**Gen 2 (Johto):** introduce las balls y el estado aditivamente:
```
ratio    = max(1, ⌊catchRate / 3⌋)
A        = min(255, ⌊((3·HP_max − 2·HP_current) · ratio) / (3·HP_max)⌋)
ValorB   = min(255, A + BonoBall + BonusEstado)      // Ultra +150, Great +100
Prob     = ValorB / 256
```

**Gen 3–9 (Moderna):** la fórmula estándar:
```
A = ((3·HP_max − 2·HP_current) · catchRate · ballMod) / (3·HP_max) · statusMod

// Gen 8+: penalización a objetivos de bajo nivel
Si NivelGen ≥ 8 y Nivel < 30:
    levelMod = max(0.01, (30 − Nivel) / 25)
    A = A · levelMod

Si A ≥ 255 o es Master Ball → captura garantizada (100 %).

B = ⌊65536 / (255/A)^0.25⌋        // probabilidad por temblor
probShake = B / 65536
p_norm    = probShake^4           // 4 temblores correctos
```

**Captura Crítica (Gen 5+):** modela el bono de Pokédex (`dexMult` según nº de registrados: 0.5 / 1.0 / 1.5 / 2.0 / 2.5):
```
a_cc     = ⌊min(255, A) · dexMult⌋
p_crit   = a_cc / 256                     // prob. de captura crítica (1 solo temblor)
p_comb   = p_crit · probShake + (1 − p_crit) · p_norm
```
La probabilidad final es `p_comb · 100`. El simulador también **reproduce visualmente los temblores** esperados (1–4) mediante `Math.random`, dando un resultado creíble y didáctico.

---

## 13. Motor de combate y probabilidad de victoria

El constructor de equipos incluye un **simulador heurístico** de emparejamientos (`calculateWinProbability`).

### 13.1 Cálculo de estadísticas finales

`calculateStat` implementa la **fórmula oficial** de las generaciones modernas:
```
HP     = ⌊((2·Base + IV + ⌊EV/4⌋) · Nivel / 100) + Nivel + 10
Stat   = ⌊(⌊(2·Base + IV + ⌊EV/4⌋) · Nivel / 100⌋ + 5) · modNaturaleza⌋
```
Con guarda especial para **Shedinja** (Base HP = 1 → HP fijo = 1). `getNatureModifier` aplica ×1.1 / ×0.9 según la naturaleza elegida (datos cargados de la API, no hardcodeados).

### 13.2 Puntuación de combate (`calculateCombatScore`)

Compone un puntaje a partir de:
- **Bulk** = `HP · (Defensa + DefEsp)/2` (normalizado /100).
- **Velocidad** × 2.
- **Ofensiva** = `max(Atq, AtqEsp)` × 2.
- Bonificaciones fijas por tener movimientos (+50 c/u), objeto (+100) y habilidad (+50).

### 13.3 Simulación de emparejamiento (`simulateMatchup`)

Para cada par (miembro propio × rival) calcula los **turnos para K.O.**:
1. Elige el ataque físico o especial según la estadística ofensiva dominante.
2. Busca el **mejor multiplicador STAB**: recorre los tipos propios, aplica las relaciones de daño contra *cada* tipo rival (`×2`, `×0.5`, `×0` — inmunidad) y multiplica ×1.5 por STAB.
3. Aplica una fórmula de daño simplificada asumiendo un movimiento genérico de potencia 80: `daño = ((2·Nivel/5 + 2)·80·(Atq/Def))/50 + 2` escalado por el multiplicador.
4. Devuelve `HP_rival / daño`.

### 13.4 Integración de resultados

- Cada emparejamiento se resuelve comparando "turnos para KO" con **desempate por velocidad** (una velocidad >10 % superior otorga un medio turno de ventaja).
- Las victorias se acumulan con margen (hasta +1.5 por *rotura*).
- `matchupAdvantage` (normalizada a ±1) se combina con la proporción de puntuación base:
  `prob = ratioBase + ventajaMatchups · 0.4`, recortada a [1 %, 99 %].
- Se pintan dos barras de progreso y los porcentajes en la caja "Mi Equipo vs Equipo Rival".

> **Naturaleza del modelo:** es un **heurístico orientativo**, no un simulador competitivo real (asume movimientos genéricos, ignora objetos/equipos/volatilidad). Su valor es didáctico y de guiado, y así se presenta en la UI.

### 13.5 Tabla de análisis del equipo

`updateTeamStatsTable` y `renderTeamTypeAnalysis` ofrecen:
- Estadísticas individuales + **suma y media** del equipo.
- **Análisis defensivo**: vulnerabilidades agregadas (qué tipos hacen ×2 o ×4 al equipo).
- **Análisis ofensivo**: cobertura (qué tipos el equipo puede golpear con ventaja).

---

## 14. Capa de presentación: sistema de diseño CSS

### 14.1 Arquitectura

`styles.css` (~118 KB) es la hoja raíz. Arranca con `@import url("cookies.css")` y define el sistema completo. Cada módulo tiene su propia hoja (`moves.css`, `cards.css`, `capture-calculator.css`...) que se carga **solo** en su página.

### 14.2 Theming con variables CSS

Todo el aspecto visual se parametriza mediante **custom properties** en `:root`, con una guía de personalización incrustada en comentarios:

```css
:root {
  --c-bg: #1b2234;            /* Fondo principal (tema oscuro) */
  --c-bg-lighter: #232c42;
  --c-surface: #2f3b55;
  --c-text: #f8fafc;
  --c-accent: #6366f1;        /* Botones, enlaces */
}
:root[data-theme="light"] { /* Override para modo claro */ }
```

### 14.3 Paleta de tipos Pokémon

Se definen **tres variantes por tipo** siguiendo la paleta oficial de Bulbapedia (Gen IX / SV / HOME), más 60 valores:

- `--tc-{tipo}` (color base), `--tc-{tipo}-dark` (bordes/sombras), `--tc-{tipo}-light` (resaltados).
- `--tc-{tipo}-text` para los tipos claros (eléctrico, hielo, volador) que exigen **texto oscuro** por contraste WCAG AA.
- Un **degradado prismático** exclusivo para el tipo Estelar (`--tc-stellar-gradient`, 6 paradas de color).

Estas variables se consumen en tarjetas, modales, chips y badges mediante `style.setProperty("--tc1", "var(--tc-fire)")`.

### 14.4 Modo claro/oscuro

`a11y.js` inyecta un dropdown de tema (Claro / Oscuro / Sistema) en la cabecera. La selección alterna el atributo `data-theme` en `<html>`, que activa los overrides del bloque `:root[data-theme="light"]`. La opción "Sistema" respeta `prefers-color-scheme` del SO.

---

## 15. Accesibilidad (A11y)

- **Semántica ARIA:** `aria-live="polite"` en el grid y la paginación (anuncian cambios), `aria-modal`, `role="dialog"`, `aria-labelledby`, etiquetas traducidas con `data-i18n-aria-label`.
- **Navegación por teclado:** toda tarjeta es enfocable (`tabindex="0"`) y responde a Enter/Espacio. El modal instala un **trap de foco** (Tab/Shift+Tab ciclan dentro; Escape cierra). Flechas `←`/`→` navegan entre Pokémon.
- **Gestos táctiles:** `SwipeDetector` permite deslizar en el modal.
- **`prefers-reduced-motion`:** respetado en las transiciones (verificado en `a11y.css`).
- **Transiciones de página:** `a11y.js` intercepta los enlaces internos, añade `page-exiting` al `<body>` y navega tras 120 ms, logrando transiciones suaves sin un router SPA (excluye enlaces externos, con `target=_blank`, descargas y *toggles* de Bootstrap).
- **Contraste:** la paleta define colores de texto explícitos por tipo para cumplir WCAG AA.

---

## 16. Guía de instalación paso a paso

### 16.1 Requisitos previos

| Requisito | Detalle |
| :--- | :--- |
| **Sistema operativo** | Windows, macOS o Linux |
| **Servidor web con PHP 8.x** | [XAMPP](https://www.apachefriends.org/) (recomendado), WAMP, MAMP, Laragon o un LAMP real |
| **Extensión PHP `curl`** | **Imprescindible.** Suele venir activa en XAMPP; en Linux/macOS puede requerir habilitarla en `php.ini` |
| **Extensión PHP `dom`/`libxml`** | Para el scraping de `bulbapedia_proxy.php` (incluida por defecto) |
| **Git** | Para clonar el repositorio |
| **Navegador moderno** | Chrome, Edge, Brave, Firefox o Safari recientes (IndexedDB + `<dialog>` nativo) |

> ⚠️ **PHP 7.x NO es compatible**: el código usa `match`, `str_contains` y `str_ends_with` (PHP 8.0+).

### 16.2 Instalación con XAMPP (Windows)

```bash
# 1. Clonar dentro de la raíz web de Apache
cd C:\xampp\htdocs
git clone https://github.com/didilo99/Pokemon.git Pokedex

# 2. (Opcional) entrar al directorio para gestionar el proyecto
cd Pokedex
```

1. Abre el **Panel de Control de XAMPP** y arranca **Apache** (el botón debe ponerse verde en el puerto 80/443). MySQL **no es necesario**: el proyecto no usa base de datos del servidor.
2. Verifica la versión de PHP: `http://localhost/dashboard/` debe indicar **PHP 8.x**.
3. Abre la aplicación en el navegador:

```
http://localhost/Pokedex/index.html
```

### 16.3 Verificación posterior a la instalación

| Paso | Resultado esperado |
| :--- | :--- |
| Cargar `index.html` | Aparece la cabecera, los filtros y el grid con esqueletos que se rellenan |
| Abrir el pie | Botones "Sincronización Profunda", "Actualizar Todo", "Borrar Caché" visibles |
| Pulsar "Actualizar Todo" | La barra avanza y, al terminar, "Datos en caché" muestra > 0 |
| Abrir `pages/cards.html` | Aparecen cartas TCG (requiere que `proxy.php` funcione) |
| Abrir un Pokémon | El modal muestra datos y, al pulsar "Cargar información extra", lore enciclopédico |

### 16.4 Instalación en Linux / macOS (LAMP / MAMP)

```bash
# Ubuntu/Debian - asegurar curl y dom
sudo apt install php-curl php-xml php-dom

# Clonar en la raíz web
sudo git clone https://github.com/didilo99/Pokemon.git /var/www/html/Pokedex
sudo chown -R www-data:www-data /var/www/html/Pokedex   # permisos de lectura

# Reiniciar Apache
sudo systemctl restart apache2
```

En **macOS con MAMP**, clona en `/Applications/MAMP/htdocs/Pokedex` y asegúrate de que MAMP usa PHP ≥ 8.

### 16.5 Despliegue en producción (recomendaciones)

- **HTTPS obligatorio.** Los proxies son origen de peticiones; servirlos por HTTPS evita bloqueos de contenido mixto.
- **Compresión:** activa `mod_deflate` (Apache) o equivalente. Los proxies ya usan `ob_gzhandler`, pero comprimir JS/CSS estáticos reduce el peso inicial.
- **Cacheo HTTP de estáticos:** configura `Cache-Control` largo para `assets/**` y versiona por query (`?v=14` — ya se hace en el HTML).
- **Restringir CORS en el proxy:** en producción, sustituye `Access-Control-Allow-Origin: *` por tu dominio explícito en ambos proxies.
- **Rate limiting:** si la web es pública, considera añadir límite de peticiones por IP en `proxy.php` para evitar que terceros lo usen como puente gratuito a TCGDex.
- **Sin pasos de build:** el despliegue consiste en copiar los archivos. No hay `node_modules`, ni bundling, ni variables de entorno.

---

## 17. Guía de personalización

El propio código está comentado con bloques de ayuda para el desarrollador. Los puntos clave:

| Objetivo | Archivo | Qué tocar |
| :--- | :--- | :--- |
| **Cambiar textos del menú/UI** | `assets/i18n/{lang}.json` | Editar las claves (¡no el HTML!) |
| **Añadir un idioma** | `assets/i18n/` + `i18n.js` + `index.html` | Nuevo JSON, añadirlo al `Promise.all`, al mapa de banderas y a `SUPPORTED_LANGS` de `cardStorage.js` |
| **Cambiar colores del tema** | `assets/css/styles.css` | Variables `--c-*` en `:root` y en `:root[data-theme="light"]` |
| **Cambiar colores de tipos** | `assets/css/styles.css` | Variables `--tc-*`, `--tc-*-dark`, `--tc-*-light` |
| **Apuntar a otra PokéAPI** | `assets/js/app.js` | `CONSTANTS.API_URL` (p. ej. una instancia local/self-hosted) |
| **Forzar re-sincronización de clientes** | `assets/js/cache.js` | Incrementar `APP_CACHE_VERSION` (p. ej. `"2.3.1"` → `"2.4.0"`) |
| **Ajustar paginación por defecto** | `index.html` / `cards.js` | `#perPage` (`selected`) / `CARDS_PER_PAGE` |
| **Modificar fórmula de captura** | `capture-calculator.js` | Bloque comentado `FÓRMULA DE CAPTURA` |
| **Cambiar requisitos de formas** | `assets/i18n/*.json` | Clave `forms.requirements_data` |
| **Cambiar logo** | `index.html` | `src` del `<img class="title-logo">` |
| **Items permitidos en equipo** | `app.js` | `ALLOWED_ITEM_CATEGORIES` y `SIGNATURE_ITEM_MAP` |

---

## 18. Rendimiento y optimizaciones

Inventario de las técnicas de rendimiento empleadas (todas identificadas en el código):

1. **Caché de dos niveles** (Map L1 + IndexedDB L2) con re-alimentación automática. → *La consulta habitual nunca toca red.*
2. **Sharding de IndexedDB** por categoría semántica. → *Lecturas/limpieza más rápidas.*
3. **Deduplicación de peticiones en vuelo** (`_inFlightRequests`). → *N peticiones idénticas = 1 HTTP.*
4. **Cola con límite de concurrencia** (10 en red, 8–15 en workers). → *Evita saturar la API y el navegador.*
5. **Renderizado lazy con `IntersectionObserver`** (rootMargin 800 px). → *Solo se cargan datos de lo visible.*
6. **`loading="lazy"` + `decoding="async"`** en sprites.
7. **`DocumentFragment`** para insertar tarjetas en un único reflow.
8. **Templates `<template>`** clonados en memoria (sin parsear HTML).
9. **Debounce de 300 ms** en el buscador.
10. **Retroceso exponencial con jitter** en reintentos → *evita el efecto thundering herd.*
11. **Throttle de UI** (80 ms) durante el deep sync. → *La barra no satura el hilo principal.*
12. **ETag + 304** en los proxies. → *Ahorro de ancho de banda.*
13. **`ob_gzhandler`** (Gzip) en ambos proxies.
14. **Caché HTTP del navegador** con TTL escalonados (14 d / 7 d / 6 h / 30 min según tipo de recurso).
15. **Diccionarios de nombres locales** (`item_names.json`...) → *traducir 2.000 objetos sin 2.000 peticiones.*
16. **Carga diferida del lore** (Bulbapedia solo bajo demanda).
17. **`prefers-reduced-motion`** respetado.
18. **Carga diferida de scripts** (`defer`).

---

## 19. Análisis de seguridad y privacidad

### 19.1 Puntos fuertes

- **No almacena datos personales** en servidor: no hay cuentas, ni backend con BD propia.
- **Validación de endpoints** por lista blanca en `proxy.php` (mitiga *SSRF* básico).
- **Validación de idiomas** por lista blanca.
- **Búsqueda de patrones peligrosos**: no se detectó uso de `eval`, `innerHTML` con datos de usuario sin sanitizar en los flujos críticos (el HTML dinámico proviene de APIs de confianza o diccionarios propios), ni almacenamiento de credenciales.
- **Gestor de cookies** explícito con consentimiento persistido en `localStorage`.
- **`rel="noopener noreferrer"`** en los enlaces externos (`target="_blank"`), previniendo *tab-nabbing*.

### 19.2 Riesgos y recomendaciones

| Riesgo | Detalle | Mitigación recomendada |
| :--- | :--- | :--- |
| **`CURLOPT_SSL_VERIFYPEER = false`** | Los proxies desactivan la verificación TLS del destino. | Activar la verificación en producción (`true` + CA bundle). Se entiende como atajo de desarrollo, pero es un hábito inseguro. |
| **`Access-Control-Allow-Origin: *`** | Permite que cualquier sitio use tus proxies. | Restringir al dominio propio. |
| **XSS vía HTML de terceros** | El lore de wikias se inserta como HTML. | El backend ya filtra `<script>`/`<style>`, pero una sanitización estricta (p. ej. DOMPurify) en el cliente añadiría defensa en profundidad. |
| **`innerHTML` en render de contenido externo** | Patrón usado en varias vistas. | Auditar cada punto donde se inserta dato externo. |
| **Cuota de almacenamiento** | Miles de registros pueden agotar la cuota IndexedDB del navegador. | Implementar política de *eviction* por edad o mostrar cuota usada en `api_info.html`. |

### 19.3 Licencia (discrepancia a resolver)

El `README.md` declara **Licencia MIT**, pero el pie de página (`footer_snippet.html`) muestra **CC BY-NC-ND 4.0**. Son incompatibles (MIT permite modificación y uso comercial; ND prohíbe derivados). Se recomienda **unificar** en una única licencia y añadir el archivo `LICENSE` real al repo, además de aclarar que las imágenes de Pokémon son propiedad de Nintendo/Game Freak/The Pokémon Company y que este es un proyecto *fan* sin ánimo de lucro.

---

## 20. Solución de problemas (Troubleshooting)

| Síntoma | Causa probable | Solución |
| :--- | :--- | :--- |
| **La app no carga datos y veo errores CORS** | Estás abriendo el archivo con `file://` | Sirve siempre vía `http://localhost/Pokedex/`. Abrir `index.html` doble-clic rompe `fetch` y proxies. |
| **`cards.html` o sets vacíos** | `proxy.php` no funciona, o falta cURL | Comprueba que Apache sirve PHP (abre `http://localhost/Pokedex/proxy.php?endpoint=types`). Verifica `extension=curl` en `php.ini` y reinicia Apache. |
| **Lore/Bulbapedia no carga** | Cloudflare bloquea el scraping, o falta `bulbapedia_proxy.php` | Es esperable puntualmente: la app degrada a PokéAPI automáticamente. Reintenta más tarde. |
| **Primera carga muy lenta / mucha actividad** | Descarga inicial masiva de la PokéAPI | Espera o pulsa F5. Mejor aún: usa "Sincronización Profunda" **una vez** desde el pie; después todo será local y veloz. |
| **Aparecen celdas vacías en el grid** | Petición fallida puntual | Recarga (F5). La caché ya guardó lo demás; solo se reintentará lo faltante. |
| **Los cambios de código no se ven** | Caché del navegador o de la app | (1) Ctrl+F5. (2) Si cambiaste datos, incrementa `APP_CACHE_VERSION` en `cache.js`. (3) Purga con "Borrar Caché". |
| **"Base de datos actualizada. Recargando..."** | Otra pestaña subió la versión de IndexedDB (`onversionchange`) | Comportamiento esperado: recarga y listo. |
| **La sincronización profunda no arranca** | Creen un bloqueo huérfano de otra pestaña | Cierra todas las pestañas y vuelve a abrir, o espera ~5 s (el lock caduca por heartbeat). |
| **Errores 504 de PokéAPI** | Límite de la API pública bajo carga | Usa la caché local: tras el primer deep sync, casi no se consultará la API. Reintenta pasados unos minutos. |
| **PHP de versión antigua** | Sintaxis `match`/`str_contains` no reconocida | Actualiza a PHP 8.0+. |

### Diagnóstico útil

- **Consola del navegador** (F12 → Console): `cache.js` loguea claramente reintentos, purgas de caché y estado de la sincronización.
- **Panel Application** (F12): inspecciona las bases `PokedexCacheDB` y `PokedexTCG_DB` y el consumo de `localStorage`.
- **`pages/api_info.html`**: panel de estado que muestra totales, válidos/caducados y última sincronización, más el estado de las APIs.

---

## 21. Deuda técnica y mejoras recomendadas

Como revisión experta, estos son los puntos de mejora más relevantes detectados, ordenados por impacto:

### 21.1 Arquitectura de código

- **`app.js` es un "módulo dios"** de ~6.850 líneas. Contiene al menos 6 responsabilidades (carga de datos, filtrado, render de grid, modal, equipos, combate). **Recomendación:** fragmentar en módulos ES (`pokedex/state.js`, `pokedex/filters.js`, `pokedex/modal.js`, ...) e introducir un bundler mínimo (Vite) solo para desarrollo, manteniendo la opción de servir sin build si se desea.
- **Funciones duplicadas:** existen **dos definiciones** de `renderPastTypes`, `renderPokedexNumbers` y `renderEncounterLocations` (líneas ~3162 y ~6652). La segunda sobrescribe a la primera. Hay que eliminar la versión obsoleta.
- **IDs duplicados en `index.html`:** hay **dos elementos con `id="flavor"`** (líneas 517 y 667) y las referencias a secciones de tipos pasados/números Pokédex en el HTML usan IDs distintos de los que busca el JS (`pastTypesSection`/`pokedexNumbersList` vs. los del marcado), por lo que esas vistas podrían no renderizarse. Unificar IDs.
- **Variables globales extensas:** muchos módulos declaran `let`/`const` a nivel de script global (riesgo de colisión entre páginas que cargan varios módulos). Envolverlos en IIFES o módulos ES, como ya hacen bien `moves.js` y `my-album.js` con su patrón `(() => { ... })()`.

### 21.2 Rendimiento y datos

- **Filtrado por estadísticas sin índice:** `minBST`/`minSpeed` cargan **todos** los detalles con `Promise.all` sin límite de concurrencia. Con 2.000 Pokémon puede congelar la pestaña. **Recomendación:** usar el mismo patrón de pool de workers con throttle que ya usa `applySort`.
- **`state.indexData` duplica memoria** respecto a `state.index`. Podrían unificarse.
- **Sincronización profunda muy agresiva:** descarga decenas de miles de peticiones cada 24 h de forma automática. Considerar hacerla **solo bajo consentimiento explícito** o acotarla, para respetar cuotas de datos y rate-limits de la PokéAPI pública.
- **`deepSync` sin reanudación:** si se interrumpe, empieza de cero. Añadir persistencia de progreso (checkpoint en IndexedDB) permitiría reanudar.

### 21.3 Calidad y mantenimiento

- **Sin tests ni CI:** no hay `package.json`, ni tests unitarios (Jest/Vitest), ni linter (ESLint/Prettier), ni CI. Dado el volumen de lógica pura (fórmulas de captura, combate, normalización de nombres), **las fórmulas son candidatas ideales a tests unitarios**.
- **Sin `package.json`/herramientas:** añadiríamos ESLint + Prettier y scripts de validación de JSON i18n.
- **Validación de JSON i18n:** un JSON malformado rompe un idioma entero. Un test de paridad de claves entre los 8 diccionarios evitaría traducciones faltantes (existe un `audit-report.json`, pero no un mecanismo automático).
- **`alert()` nativo** en algunos flujos (equipo lleno, error de BD). Mejorar con toasts/no-dialogs propios para coherencia visual.
- **Manejo de errores silencioso:** múltiples `catch (e) {}` vacíos dificultan el diagnóstico. Al menos loguear en modo debug.
- **Documentación de API de los módulos:** añadir JSDoc a las funciones públicas de `cards.js` y `app.js`.

### 21.4 Seguridad (ver también §19)

- Reactivar verificación TLS (`CURLOPT_SSL_VERIFYPEER`) y restringir CORS al dominio propio en producción.
- Sanitizar HTML externo en el cliente (DOMPurify).

### 21.5 Producto

- **Deep-linking de filtros:** codificar el estado de filtros en la URL (`?type=fire&gen=9`) permitiría compartir búsquedas. Hoy solo se comparte el Pokémon (`#pokemon/x`).
- **Service Worker (PWA):** añadiría funcionamiento 100 % offline tras la primera visita y control fino del caché.
- **Exportar/importar colección y equipos:** hoy viven en `localStorage` y se pierden al limpiar datos del navegador. Permitir exportar a JSON.
- **Unificar licencia** (ver §19.3).

---

## 22. Glosario de términos

| Término | Definición |
| :--- | :--- |
| **PokéAPI** | API REST pública gratuita con datos estructurados de la franquicia Pokémon. Fuente primaria de la app. |
| **TCGDex** | API REST con datos del juego de cartas coleccionables Pokémon. Fuente de `cards.html`. |
| **Proxy reverso** | Script intermedio que pide datos a una API externa en nombre del navegador, sorteando CORS. |
| **CORS** | *Cross-Origin Resource Sharing*: política de seguridad que restringe peticiones entre orígenes distintos. Motiva la existencia de los proxies PHP. |
| **SSRF** | *Server-Side Request Forgery*: ataque que abusa de un servidor para hacer peticiones internas. Mitigado con la lista blanca de `proxy.php`. |
| **IndexedDB** | Base de datos NoSQL del navegador, asíncrona y orientada a objetos. Usada para la caché (L2) y el TCG. |
| **LocalStorage** | Almacenamiento clave-valor síncrono del navegador. Usado para preferencias y colecciones ligeras. |
| **Caché L1/L2** | Diseño de dos niveles: memoria rápida (L1) delante de almacenamiento persistente (L2). |
| **TTL** | *Time To Live*: tiempo antes de que una entrada de caché caduque. |
| **ETag** | Cabecera HTTP con identificador único del contenido; permite responder `304` sin reenviar datos. |
| **STAB** | *Same Type Attack Bonus*: ×1.5 de daño al usar un movimiento del mismo tipo del atacante. |
| **BST** | *Base Stat Total*: suma de las 6 estadísticas base. |
| **IV / EV** | Valores individuales (0–31) y de esfuerzo (EVs, hasta 510) que ajustan las estadísticas finales. |
| **Naturaleza** | Modificador de ×1.1/×0.9 sobre una estadística según la personalidad del Pokémon. |
| **Captura crítica** | Mecánica Gen 5+ que permite capturar con un solo temblor, con probabilidad ligada al progreso de la Pokédex. |
| **Deep sync** | Sincronización profunda: descarga masiva de miles de registros para precachear la base local. |
| **i18n / Internacionalización** | Diseño que permite adaptar la app a distintos idiomas sin cambiar el código. |
| **IntersectionObserver** | API para observar la visibilidad de elementos; aquí se usa para cargar datos solo al acercarse al viewport. |
| **BroadcastChannel** | API para comunicar pestañas del mismo origen; aquí coordina la sincronización entre ventanas. |
| **WCAG AA** | Nivel de accesibilidad web (contraste, navegación) que aspira a cumplir la paleta de colores. |
| **Fallback** | Mecanismo de degradación elegante: si una fuente falla, se usa otra automáticamente. |

---

## Apéndice A · Endpoints usados por `proxy.php`

| `endpoint` | Destino | TTL |
| :--- | :--- | :--- |
| `sets` | `TCGDex /v2/{lang}/sets` | 6 h |
| `cards` | `TCGDex /v2/{lang}/cards` | 6 h |
| `cardDetail` (con `id`) | `TCGDex /v2/{lang}/cards/{id}` | 7 d |
| `set` (con `id`) | `TCGDex /v2/{lang}/sets/{id}` | 7 d |
| `types`, `rarities`, `series`, `categories`, `suffixes`, `hp`, `retreats`, `illustrators` | `TCGDex /v2/{lang}/{endpoint}` | 14 d |
| `githubCommits` | `GitHub API (PokeAPI/pokeapi)` | 30 min |

## Apéndice B · Categorías que descarga el *deep sync*

`pokemon`, `pokemon-form`, `pokemon-species`, `ability`, `type`, `stat`, `move`, `move-category`, `move-damage-class`, `move-learn-method`, `move-target`, `item`, `item-category`, `item-pocket`, `berry`, `berry-flavor`, `region`, `pokedex`, `location`, `location-area`, `encounter-method`, `evolution-chain`, `evolution-trigger`, `generation`, `version`, `version-group`, `egg-group`, `nature`, `growth-rate`, `characteristic`, `pokemon-color`, `pokemon-habitat`, `pokemon-shape`, `contest-type`, `contest-effect`.

Para cada `pokemon` descargado, además, se enlazan recursivamente su `pokemon-species`, su `evolution-chain` y todas sus `forms`.

## Apéndice C · Estructura del árbol de scripts de una página

```html
<head>
  <script src="assets/js/cache.js" defer></script>       <!-- define fetchCached -->
  <script src="assets/js/i18n.js"  defer></script>       <!-- define I18n, carga footer -->
  <script src="assets/js/bulbapedia.js" defer></script>  <!-- lore bajo demanda -->
  <script src="assets/js/a11y.js"  defer></script>       <!-- tema + transiciones -->
</head>
<body>
  ...
  <div id="footer-placeholder"></div>                    <!-- inyectado por i18n.js -->
  <script src="assets/js/cardStorage.js" defer></script> <!-- si la página usa TCG -->
  <script src="assets/js/app.js" defer></script>         <!-- módulo específico -->
</body>
```

---

> **Nota final.** Este manual describe el estado del proyecto en su rama principal a fecha del análisis (historial Git desde 2026-04-05, última revisión de arquitectura v2.0). Ante discrepancias entre este documento y el código, **el código es la fuente de verdad**: revisa `assets/js/app.js` y `assets/js/cache.js`, donde el propio equipo ha incrustado comentarios de ayuda al desarrollador (bloques `=====` explicando cómo cambiar textos, colores, fórmulas y versiones de caché).

---

*Documento generado a partir del análisis completo de la base de código de PokéApp.*
