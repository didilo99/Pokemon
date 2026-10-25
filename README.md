<div align="center">
  <img src="https://raw.githubusercontent.com/PokeAPI/media/master/logo/pokeapi_256.png" alt="PokeAPI Logo" width="160" />
  <h1>🐉 PokéApp — La Enciclopedia Pokémon Definitiva v3.0</h1>
  <p><b>Una aplicación web masiva, moderna e integral para explorar el universo Pokémon al completo.</b><br>
  Consulta estadísticas oficiales, mecánicas competitivas avanzadas, gestión de colecciones TCG, simuladores matemáticos de captura, tutoriales interactivos, sistema de accesibilidad universal y mucho más.</p>

  <p>
    <a href="https://github.com/didilo99/Pokemon"><img src="https://img.shields.io/github/repo-size/didilo99/Pokemon?style=for-the-badge&color=blue" alt="Repo Size"></a>
    <a href="https://github.com/didilo99/Pokemon"><img src="https://img.shields.io/github/last-commit/didilo99/Pokemon?style=for-the-badge&color=crimson" alt="Last Commit"></a>
    <img src="https://img.shields.io/badge/Idiomas-8_Lenguajes-blueviolet?style=for-the-badge" alt="Idiomas">
    <img src="https://img.shields.io/badge/Accesibilidad-WCAG_2.1_Ready-success?style=for-the-badge" alt="Accesibilidad">
    <a href="LICENSE"><img src="https://img.shields.io/badge/Licencia-CC_BY--NC--ND_4.0_/_MIT-yellow?style=for-the-badge" alt="Licencia"></a>
  </p>
</div>

---

## 📖 Tabla de Contenidos

1. [Conoce la Aplicación (Manual del Usuario y Módulos)](#-conoce-la-aplicación-manual-del-usuario-y-módulos)
   - [1.1 La Pokédex Principal y Constructor de Equipos (Team Builder)](#11-la-pokédex-principal-y-constructor-de-equipos-team-builder)
   - [1.2 Mecánicas de Combate y Crianza Competitiva](#12-mecánicas-de-combate-y-crianza-competitiva)
   - [1.3 El Mundo Pokémon (Regiones, Juegos, Localizaciones y Hábitats)](#13-el-mundo-pokémon-regiones-juegos-localizaciones-y-hábitats)
   - [1.4 Calculadoras y Herramientas Especiales](#14-calculadoras-y-herramientas-especiales)
   - [1.5 Objetos, Bayas y Máquinas (MT/MO)](#15-objetos-bayas-y-máquinas-mtmo)
   - [1.6 Juego de Cartas Coleccionables (TCG) y Mi Álbum Personal](#16-juego-de-cartas-coleccionables-tcg-y-mi-álbum-personal)
   - [1.7 Centro de Tutoriales y Guías Interactivas](#17-centro-de-tutoriales-y-guías-interactivas)
   - [1.8 Suite de Accesibilidad (A11y) y Selector de Temas](#18-suite-de-accesibilidad-a11y-y-selector-de-temas)
   - [1.9 Sistema Multilenguaje Completo (i18n en 8 Idiomas)](#19-sistema-multilenguaje-completo-i18n-en-8-idiomas)
   - [1.10 Suite de Seguridad y Protección de Contenido](#110-suite-de-seguridad-y-protección-de-contenido)
   - [1.11 Privacidad y Cumplimiento Legal (RGPD / Cookies)](#111-privacidad-y-cumplimiento-legal-rgpd--cookies)
2. [Apartado Técnico y Arquitectura (Para Desarrolladores)](#-apartado-técnico-y-arquitectura-para-desarrolladores)
   - [Stack Tecnológico](#stack-tecnológico)
   - [Motor de Caché Asíncrono y Anti-Timeouts 504](#motor-de-caché-asíncrono-y-anti-timeouts-504)
   - [Sincronización en Segundo Plano (Deep Sync)](#sincronización-en-segundo-plano-deep-sync)
   - [Pasarelas Seguras (Proxies PHP) y Lore de Bulbapedia](#pasarelas-seguras-proxies-php-y-lore-de-bulbapedia)
   - [Consola de Auditoría y Diagnóstico de APIs](#consola-de-auditoría-y-diagnóstico-de-apis)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Guía de Instalación y Despliegue Local](#-guía-de-instalación-y-despliegue-local)
5. [Solución de Problemas (Troubleshooting)](#-solución-de-problemas-troubleshooting)
6. [Licencia y Créditos](#-licencia-y-créditos)

---

## 🎮 Conoce la Aplicación (Manual del Usuario y Módulos)

**PokéApp** ha evolucionado para convertirse en una plataforma omnicanal de consulta, entrenamiento y coleccionismo. Está pensada tanto para entrenadores novatos como para competidores de torneos VGC, criadores y coleccionistas del Juego de Cartas Coleccionables (TCG).

A continuación se detalla exhaustivamente cada una de las secciones y funcionalidades disponibles:

---

### 1.1 La Pokédex Principal y Constructor de Equipos (Team Builder)

- **Pokédex Principal (`index.html`):**
  - **Buscador Universal y Filtros por Tipo:** Busca instantáneamente por nombre o número nacional. Incluye contador en tiempo real de Pokémon disponibles por cada tipo elemental.
  - **Ficha Técnica Detallada (Modal Dinámico):** Arte oficial en alta definición, animaciones de entrada, sprites de todas las variantes (normal, shiny), lore descriptivo extraído directamente de _Bulbapedia_ en múltiples idiomas, tabla de debilidades y fortalezas ofensivas/defensivas, estadísticas base (HP, Ataque, Defensa, Sp. Atk, Sp. Def, Velocidad), línea evolutiva completa con requisitos de evolución y lista interactiva de movimientos aprendidos por nivel, MT o tutor.
  - **Integración de Cartas TCG en el Perfil:** Carrusel visual integrado dentro del modal del Pokémon que muestra cartas reales de dicho monstruo extraídas de la base de datos oficial de Pokémon TCG.
- **Constructor de Equipos Competitivo (Team Builder):**
  - Configura hasta 6 Pokémon en tu equipo activo con persistencia automática en el navegador.
  - **Edición Profunda por Pokémon:**
    - Selección de forma alterna (formas regionales Alola/Galar/Hisui/Paldea, Megaevoluciones, Gigamax).
    - Ajuste de nivel (1 al 100).
    - Asignación de objeto equipado (_Held Item_) con buscador predictivo y descripción.
    - Asignación de Habilidad (incluyendo Habilidades Ocultas).
    - Asignación de Naturaleza con su impacto reflejado en las estadísticas.
    - Distribución de **IVs (0-31)** y **EVs (0-252)** con control del límite legal total de 508 EVs.
    - Selección personalizada de hasta 4 movimientos.
  - Reorganización mediante arrastre (_drag & drop_), visualización del balance defensivo del equipo y exportación.

---

### 1.2 Mecánicas de Combate y Crianza Competitiva

- **Diccionario Completo de Movimientos (`pages/moves.html`):** Catálogo de cientos de ataques existentes. Filtra por tipo, categoría de daño (Físico, Especial o Estado), potencia, precisión, puntos de poder (PP) y efecto secundario.
- **Compendio de Habilidades (`pages/abilities.html`):** Guía detallada de cada habilidad pasiva y oculta, explicando su activación dentro del combate y sus efectos secundarios fuera de la batalla (como acelerar la eclosión de huevos en el mapa).
- **Tabla Interactiva de Tipos (`pages/types.html`):** Matriz visual de efectividad elemental. Analiza multiplicadores de daño (x2 supereficaz, x0.5 resistente, x0 inmunidad y combinaciones de doble tipo como x4 o x0.25).
- **Matriz de Naturalezas (`pages/natures.html`):** Guía visual de las 25 naturalezas Pokémon, detallando las estadísticas bonificadas (+10%), penalizadas (-10%) y los sabores preferidos/desagradados de bayas para concursos o Pokécubos.
- **Centro de Crianza y Grupos Huevo (`pages/breeding.html`):** Manual completo para optimizar la guardería Pokémon: compatibilidad entre Grupos Huevo (Egg Groups), cadenas de herencia de movimientos huevo (_Egg Moves_), lógicas de objetos recios para herencia de IVs y compatibilidad con Ditto.

---

### 1.3 El Mundo Pokémon (Regiones, Juegos, Localizaciones y Hábitats)

- **Generaciones y Eras (`pages/generations.html`):** Un recorrido histórico por todas las generaciones de la franquicia (desde la I en Kanto hasta la IX en Paldea), detallando especies introducidas, nuevas mecánicas y aportes a la saga.
- **Juegos y Ediciones (`pages/games.html`):** Catálogo cronológico de las versiones principales y derivados, organizados por consolas (Game Boy, GBA, Nintendo DS, 3DS, Nintendo Switch).
- **Regiones del Mundo (`pages/regions.html`):** Enciclopedia geográfica de todas las regiones oficiales (Kanto, Johto, Hoenn, Sinnoh, Teselia/Unova, Kalos, Alola, Galar, Paldea y más).
- **Localizaciones y Subáreas (`pages/locations.html`):** Explorador de ciudades, rutas, cuevas, bosques y puntos de interés geográfico con enlaces a sus especies autóctonas.
- **Encuentros Salvajes (`pages/encounters.html`):** Condiciones climáticas, métodos de aparición (caminando en hierba alta, surfeando, pescando con diferentes cañas, golpeando árboles o mediante sonidos de radio).
- **Hábitats Naturales (`pages/habitats.html`):** Clasificación por biomas naturales (praderas, bosques, montañas, fondos marinos, entornos urbanos o cavernas).
- **Morfología y Formas Corporales (`pages/shapes.html`):** Clasificación por categorías morfológicas oficiales (bípedos, cuadrúpedos, serpentinos, alados, con tentáculos, esféricos, etc.).

---

### 1.4 Calculadoras y Herramientas Especiales

- **Calculadora y Simulador de Ratios de Captura (`pages/capture-calculator.html`):**
  - Implementación matemática de la **fórmula oficial de captura** de los videojuegos principales.
  - Selección dinámica de cualquier Pokémon para importar automáticamente su Ratio de Captura Base (_Catch Rate_).
  - Control de salud restante del enemigo (slider de 1% a 100% de HP).
  - Selector de estados alterados: **Sueño y Congelación (multiplicador x2.5)**, **Parálisis, Quemadura y Veneno (multiplicador x1.5)** o estado normal.
  - Amplio catálogo de Poké Balls con sus condiciones especiales simuladas: Poké Ball (x1), Super Ball (x1.5), Ultra Ball (x2), Master Ball (100%), Veloz Ball (x5 en primer turno), Ocaso Ball (x3 en cuevas o de noche), Malla Ball (x3.5 en tipo Agua/Bicho), Buceo Ball, Turno Ball, Acopio Ball y muchas más.
  - Cálculo instantáneo del porcentaje exacto de captura (0% a 100%) y desglose de probabilidad por cada sacudida de la Poké Ball (1ª, 2ª y 3ª sacudida).
- **Pabellón de Concursos Pokémon (`pages/contests.html`):** Guía de las cualidades de exhibición: Carisma, Belleza, Dulzura, Ingenio y Dureza, interacción de movimientos y combos para ganar cintas en festivales.

---

### 1.5 Objetos, Bayas y Máquinas (MT/MO)

- **El Gran Bazar de Objetos (`pages/items.html`):** Catálogo extenso con imágenes oficiales, categorías (pokéballs, medicina, combate, evolución, objetos clave, tesoros vendibles) e historiales de uso.
- **Huerto de Bayas (`pages/berries.html`):** Guía agrícola y curativa: tiempo de crecimiento, cosecha máxima, potencia de bayas reductoras de daño supereficaz, curación de estados alterados y sabores para repostería.
- **Terminal de Máquinas Técnicas y Ocultas (`pages/machines.html`):** Buscador histórico de MTs, MOs y DTs a lo largo de las distintas generaciones de juegos, localizando qué ataque enseña cada disco.

---

### 1.6 Juego de Cartas Coleccionables (TCG) y Mi Álbum Personal

- **Explorador General de Cartas (`pages/cards.html`):** Navegación interactiva por miles de cartas del juego físico: ataques, costes de energía, HP, debilidades, rarezas (Común, Holográfica, Ultra Rara, Secreta) y precios de mercado en tiempo real.
- **Expansiones y Sets TCG (`pages/tcg-sets.html`):** Catálogo completo de expansiones lanzadas desde la era clásica del _Base Set_ (1999) hasta las colecciones contemporáneas de _Escarlata y Púrpura_.
- **Mi Álbum Personal de Cartas (`pages/my-album.html`):**
  - Gestor para llevar el inventario de tu colección física y digital de cartas.
  - **Seguimiento de Progreso:** Muestra el porcentaje completado (%) de cada expansión y la cantidad de cartas obtenidas frente al total del set.
  - **Valoración Económica:** Estimación en tiempo real del coste de mercado restante para completar las cartas que te faltan de cada colección.
  - **Filtros Avanzados:** Ordenación por expansiones más recientes o antiguas, orden alfabético, mayor/menor porcentaje completado y mayor/menor precio de cartas restantes.
  - **Persistencia Segura:** Todo el progreso de tu colección queda guardado automáticamente en tu navegador (`LocalStorage` / `cardStorage.js`).

---

### 1.7 Centro de Tutoriales y Guías Interactivas

Disponible en `pages/tutorials.html`, es un centro de aprendizaje interactivo con guías estructuradas paso a paso tanto para principiantes como para jugadores experimentados:

- **Buscador en Tiempo Real y Filtros por Categoría:** Encuentra explicaciones rápidas filtrando por _Combate & Captura_, _Mundo & Aventura_, _Coleccionismo_ o _Sistema & Accesibilidad_.
- **10 Guías Paso a Paso Exhaustivas:**
  1. *Calculadora de Captura:* Cómo maximizar tus opciones frente a legendarios paso a paso.
  2. *Tabla Interactiva de Tipos:* Cómo leer coberturas defensivas y debilidades dobles.
  3. *Buscador de Movimientos:* Cómo filtrar ataques idóneos para competitivo.
  4. *Centro de Crianza Pokémon:* Guía para criar con 6 IVs perfectos y movimientos huevo.
  5. *Matriz de Naturalezas:* Cuándo conviene cada personalidad y su impacto en stats.
  6. *Cartas TCG & Mi Álbum:* Cómo catalogar tu mazo y calcular el valor de tus cartas.
  7. *Simulador de Concursos:* Puntuación por apelación e inhibición.
  8. *Rastreador de Encuentros:* Cómo usar la Pokédex de campo y condiciones horarias.
  9. *Gestor de Caché Offline:* Cómo navegar sin conexión y optimizar tu memoria local.
  10. *Panel de Accesibilidad:* Cómo adaptar la aplicación a cualquier necesidad visual o motriz.
- **Simuladores Interactivos en Vivo:** Pequeños módulos interactivos incrustados en la propia guía (como un simulador de probabilidad rápida de atrapar a Mewtwo variando Pokéball y estado en directo).

---

### 1.8 Suite de Accesibilidad (A11y) y Selector de Temas

La aplicación cumple con estándares modernos de accesibilidad universal e interfaces adaptativas (`assets/js/a11y.js` y `assets/css/a11y.css`):

- **Panel de Accesibilidad Modal:**
  - **Ajuste de Tamaño de Tipografía:** Tres niveles dinámicos (Normal, Grande, Muy Grande).
  - **Modos de Contraste Adaptativo:** Normal, Modo de Alto Contraste y Escala de Grises (Blanco y Negro).
  - **Fuente para Dislexia:** Activación con un clic de la tipografía especializada _OpenDyslexic_ para facilitar la lectura fluida.
  - **Reducción de Movimiento:** Opción de pausar animaciones pesadas y efectos de rebote para usuarios con sensibilidad vestibular o TDAH.
  - **Cursor Resaltado y Espaciado de Texto:** Mejora la visibilidad del puntero y amplía el interlineado.
- **Selector de Temas Dinámico:**
  - Modo Claro (Light Mode) optimizado para entornos luminosos.
  - Modo Oscuro (Dark Mode) con contraste armónico y estética futurista.
  - Modo Sincronizado con el Sistema Operativo (detección automática de `prefers-color-scheme`).
- **Transiciones Suaves:** Navegación snappy y fluida entre páginas con animaciones no intrusivas.
- **Navegación Asistida:** Etiquetas ARIA completas, foco visual para teclado y soporte para lectores de pantalla.

---

### 1.9 Sistema Multilenguaje Completo (i18n en 8 Idiomas)

Toda la aplicación está internacionalizada mediante un motor propio y reactivo (`assets/js/i18n.js`):

| Idioma | Código | Bandera | Archivo de Diccionario |
| :--- | :---: | :---: | :--- |
| **Español** | `es` | 🇪🇸 | `assets/i18n/es.json` |
| **English** | `en` | 🇬🇧 | `assets/i18n/en.json` |
| **Français** | `fr` | 🇫🇷 | `assets/i18n/fr.json` |
| **Deutsch** | `de` | 🇩🇪 | `assets/i18n/de.json` |
| **Italiano** | `it` | 🇮🇹 | `assets/i18n/it.json` |
| **Português** | `pt` | 🇵🇹 | `assets/i18n/pt.json` |
| **日本語 (Japonés)** | `ja` | 🇯🇵 | `assets/i18n/ja.json` |
| **中文 (Chino)** | `zh` | 🇨🇳 | `assets/i18n/zh.json` |

- Traducción en tiempo real de títulos, textos, botones, atributos de accesibilidad (`aria-label`, `title`) y nombres de objetos (`assets/i18n/item_names.json`).
- Selector de idioma con banderas visuales y persistencia automática en las sesiones del usuario.

---

### 1.10 Suite de Seguridad y Protección de Contenido

Para garantizar la integridad del contenido y una experiencia interactiva sólida (`assets/js/security.js`):

- **Bloqueo de Menú Contextual:** Deshabilitación selectiva del clic derecho para evitar descargas accidentales o interfaces rotas.
- **Protección contra Arrastre de Imágenes:** Prevención activa de eventos `dragstart` y reglas de estilo CSS (`user-drag: none; -webkit-user-drag: none;`) para mantener el diseño visual intacto.
- **Inyección Autónoma:** El módulo de seguridad se incorpora automáticamente en todas las páginas de la aplicación.

---

### 1.11 Privacidad y Cumplimiento Legal (RGPD / Cookies)

La aplicación integra una arquitectura legal transparente acorde a las normativas vigentes de protección de datos:

- **Banner Interactivo de Consentimiento de Cookies (`assets/js/cookies.js`):**
  - Notificación de entrada con opciones de aceptación rápida o rechazo no esencial.
  - Panel modal de configuración granular: Cookies Técnicas (necesarias), Cookies de Preferencias (idioma, tema visual, accesibilidad) y Cookies Analíticas.
- **Páginas Legales Específicas:**
  - **Aviso Legal (`pages/aviso-legal.html`):** Información general, titularidad del proyecto, condiciones de uso y exención de responsabilidad respecto a Nintendo, Game Freak y The Pokémon Company.
  - **Política de Privacidad (`pages/politica-privacidad.html`):** Detalle de qué datos se conservan localmente (en el cliente) y la ausencia de rastreo invasivo a terceros.
  - **Política de Cookies (`pages/politica-cookies.html`):** Clasificación técnica de cada clave almacenada en `LocalStorage` y su propósito.
- **Licenciamiento:** Distribución legal bajo licencia combinada **MIT** y **Creative Commons (CC BY-NC-ND 4.0)**.

---

## 💻 Apartado Técnico y Arquitectura (Para Desarrolladores)

El proyecto está diseñado bajo una arquitectura de cliente enriquecido (Rich Client-Side Architecture) complementada con micro-servicios de proxy en PHP para salvaguardar peticiones CORS y maximizar la resiliencia de datos.

### Stack Tecnológico

| Área | Tecnologías Principales |
| :--- | :--- |
| **Frontend Base** | **HTML5 Semántico**, **CSS3 Vanilla Avanzado** (Variables CSS, Grid, Flexbox, Media Queries), **Bootstrap 5.3** (utilidades y componentes estructurales). |
| **Interactividad y Lógica** | **JavaScript ES6+ Moderno**. Modularizado en componentes específicos (`app.js`, `cards.js`, `moves.js`, `my-album.js`, etc.) con cero dependencias pesadas de frameworks externos. |
| **Iconografía y Tipografía** | **Lucide Icons** (vectorial SVG ultraligero) y fuentes tipográficas optimizadas para legibilidad y dislexia. |
| **Almacenamiento Local** | **LocalStorage** e **IndexedDB** para cachés masivas de criaturas, sprites, cartas de TCG y colecciones personales. |
| **Backend & Pasarelas** | **PHP 8.x** con soporte para `cURL`. Pasarelas locales seguras (`proxy.php` y `bulbapedia_proxy.php`). |
| **APIs Externas Integradas** | [PokeAPI v2](https://pokeapi.co/), [Pokémon TCG API](https://pokemontcg.io/), [Bulbapedia MediaWiki API](https://bulbapedia.bulbagarden.net/). |

---

### Motor de Caché Asíncrono y Anti-Timeouts 504

PokeAPI alberga más de 1200 criaturas y millones de puntos de datos relacionales, lo que suele provocar sobrecarga y bloqueos por tiempo de espera (_HTTP 504 Gateway Timeout_).

El módulo central `assets/js/cache.js` soluciona esto mediante una estrategia multicapa:
- **`fetchCached(url)`**: Envuelve cada llamada HTTP. Si la petición ya fue resuelta previamente, la sirve de manera instantánea desde la memoria local del navegador en 0 milisegundos.
- **Tolerancia a Fallos y Reintentos Inteligentes:** Si la red se interrumpe o la API devuelve un error temporal, el sistema no se rompe: reintenta exponencialmente o sirve la última copia local conocida.

---

### Sincronización en Segundo Plano (Deep Sync)

En el pie de página de cada sección, los usuarios y administradores cuentan con un panel de control de datos en vivo:
- **Contador de Registros en Caché:** Muestra cuántos miles de objetos están almacenados localmente.
- **Marca Temporal:** Fecha y hora exacta de la última sincronización.
- **Sincronización Profunda (`Deep Sync`):** Descarga proactivamente en segundo plano toda la base de datos de especies, movimientos y habilidades. Incluye una **barra de progreso porcentual en vivo** y un **botón para cancelar/detener** la tarea en cualquier momento.
- **Actualizar Todo / Borrar Caché:** Permite depurar o forzar una actualización fresca de los datos.

---

### Pasarelas Seguras (Proxies PHP) y Lore de Bulbapedia

- **`proxy.php`:** Canaliza peticiones a APIs de terceros eliminando las restricciones de cabeceras CORS (_Cross-Origin Resource Sharing_) y permitiendo caché local en el servidor Apache.
- **`bulbapedia_proxy.php` y `assets/js/bulbapedia.js`:** Interroga de forma segura la API de la enciclopedia Bulbapedia para extraer historias, etimología del nombre, curiosidades y contexto biológico del Pokémon en tiempo real.

---

### Consola de Auditoría y Diagnóstico de APIs

Ubicada en `pages/api_info.html`, actúa como una herramienta interna de telemetría:
- Comprobación en vivo del estado de los endpoints externos de PokeAPI y Pokémon TCG.
- Tiempos de respuesta (latencia en ms), códigos de respuesta HTTP (200 OK, 404, 500) y verificación de conectividad.

---

## 📂 Estructura del Proyecto

```text
Pokedex/
│
├── index.html                   # Página principal: Pokédex general y Team Builder
├── README.md                    # Manual integral y documentación técnica
├── LICENSE                      # Términos de licencia del proyecto
├── proxy.php                    # Proxy PHP para peticiones HTTP y bypass de CORS
├── bulbapedia_proxy.php         # Proxy PHP especializado para lore de Bulbapedia
│
├── pages/                       # Módulos y herramientas individuales
│   ├── abilities.html           # Guía de habilidades
│   ├── api_info.html            # Consola de diagnóstico y estado de APIs
│   ├── aviso-legal.html         # Documento legal: Aviso Legal
│   ├── berries.html             # Enciclopedia de bayas
│   ├── breeding.html            # Centro de crianza y grupos huevo
│   ├── capture-calculator.html  # Calculadora y simulador de ratios de captura
│   ├── cards.html               # Catálogo de cartas TCG
│   ├── contests.html            # Pabellón de concursos Pokémon
│   ├── encounters.html          # Métodos y lógicas de encuentros salvajes
│   ├── games.html               # Juegos oficiales por consola
│   ├── generations.html         # Historia y características por generación
│   ├── habitats.html            # Clasificación de hábitats naturales
│   ├── items.html               # Gran bazar de objetos e inventario
│   ├── locations.html           # Localizaciones geográficas y subáreas
│   ├── machines.html            # Máquinas Técnicas (MT), MO y DT
│   ├── moves.html               # Diccionario de movimientos y ataques
│   ├── my-album.html            # Gestor de colección TCG personal (Mi Álbum)
│   ├── natures.html             # Matriz de las 25 naturalezas Pokémon
│   ├── politica-cookies.html    # Documento legal: Política de Cookies
│   ├── politica-privacidad.html # Documento legal: Política de Privacidad
│   ├── regions.html             # Atlas geográfico de regiones
│   ├── shapes.html              # Clasificación por morfología corporal
│   ├── tcg-sets.html            # Expansiones y colecciones TCG
│   ├── tutorials.html           # Centro de tutoriales y guías interactivas
│   └── types.html               # Tabla de tipos y cálculo de debilidades
│
├── assets/
│   ├── css/                     # Hojas de estilo modulares
│   │   ├── a11y.css             # Estilos de accesibilidad, contrastes y dislexia
│   │   ├── cards.css            # Estilos de galerías de cartas TCG
│   │   ├── index.css            # Estilos de la Pokédex principal y modales
│   │   ├── items.css            # Estilos del catálogo de objetos
│   │   ├── my-album.css         # Estilos del álbum de colección
│   │   ├── styles.css           # Sistema de diseño central, variables y layout
│   │   └── tutorials.css        # Estilos del centro de tutoriales interactivos
│   │
│   ├── js/                      # Lógica y controladores en JavaScript
│   │   ├── a11y.js              # Controlador del panel de accesibilidad y temas
│   │   ├── app.js               # Orquestador de la Pokédex y Team Builder
│   │   ├── bulbapedia.js        # Integración y parsing de lore de Bulbapedia
│   │   ├── cache.js             # Motor de caché, persistencia y Deep Sync
│   │   ├── capture-calculator.js# Motor matemático de cálculo de captura
│   │   ├── cards.js             # Lógica de búsqueda y render de cartas TCG
│   │   ├── cardStorage.js       # Persistencia local de cartas en álbumes
│   │   ├── collectionStorage.js # Gestión de colecciones TCG
│   │   ├── cookies.js           # Gestor de consentimiento y banner de cookies
│   │   ├── i18n.js              # Motor de internacionalización en tiempo real
│   │   ├── my-album.js          # Lógica interactiva del álbum de colecciones
│   │   ├── security.js          # Bloqueo de clic derecho y protección de imágenes
│   │   ├── tutorials.js         # Lógica interactiva y demos del tutorial
│   │   └── ...                  # Controladores específicos de cada página
│   │
│   ├── i18n/                    # Diccionarios de traducción en formato JSON
│   │   ├── es.json              # Español
│   │   ├── en.json              # Inglés
│   │   ├── fr.json              # Francés
│   │   ├── de.json              # Alemán
│   │   ├── it.json              # Italiano
│   │   ├── pt.json              # Portugués
│   │   ├── ja.json              # Japonés
│   │   ├── zh.json              # Chino Tradicional
│   │   └── item_names.json      # Nombres oficiales de objetos traducidos
│   │
│   ├── icon/                    # Favicons y logotipos oficiales
│   └── img/                     # Recursos visuales, badges y banderas
│
└── includes/
    └── footer_snippet.html      # Pie de página compartido con estado de caché y enlaces
```

---

## ⚙️ Guía de Instalación y Despliegue Local

Dado que el aplicativo incluye scripts PHP para evitar restricciones CORS en llamadas a APIs y lore de Bulbapedia, se requiere un servidor HTTP local con soporte para PHP 8.x.

### 1. Requisitos Previos

- **Git** instalado en tu sistema operativo.
- Un paquete de servidor web local como **[Laragon](https://laragon.org/)**, **[XAMPP](https://www.apachefriends.org/)** o **WAMP**.
- **PHP 8.0 o superior** con la extensión `curl` habilitada (viene activada por defecto en la gran mayoría de instalaciones).

### 2. Clonación del Repositorio

Abre tu terminal en la carpeta pública de tu servidor (`C:/laragon/www` o `C:/xampp/htdocs`):

```bash
cd C:/laragon/www/
git clone https://github.com/didilo99/Pokemon.git Pokedex
```

### 3. Puesta en Marcha

1. Inicia tu servidor web (en Laragon pulsa **"Start All"**; en XAMPP inicia el módulo **"Apache"**).
2. Asegúrate de que los puertos estándar (80 o su alternativa local) estén libres.
3. Abre tu navegador preferido (Chrome, Firefox, Brave, Edge).
4. Accede a la URL local del proyecto:
   ```text
   http://localhost/Pokedex/index.html
   ```
   *(Si utilizas Laragon con Virtual Hosts activos, también puedes acceder mediante `http://pokedex.test/`).*

> ⚠️ **Advertencia Importante:** No abras los archivos HTML haciendo doble clic en el explorador de archivos (`file:///C:/...`). El protocolo `file://` bloquea las peticiones asíncronas (`fetch`), las llamadas a los proxies PHP y el almacenamiento local por directivas de seguridad del navegador.

---

## 🩺 Solución de Problemas (Troubleshooting)

### 1. Las cartas de TCG o el lore de Bulbapedia no cargan
- **Causa:** El servidor Apache no está ejecutándose o PHP no tiene la extensión `curl` activada.
- **Solución:** Comprueba que puedes acceder a `http://localhost/Pokedex/proxy.php`. Si arroja error, abre tu `php.ini` y asegúrate de que la línea `extension=curl` no tenga punto y coma (`;`) al inicio. Luego reinicia Apache.

### 2. Los datos parecen lentos en la primera carga
- **Causa:** Al ser la primera vez que visitas la app, tu navegador no tiene datos en caché y está consultando PokeAPI en vivo.
- **Solución:** Dirígete al pie de página (footer) y pulsa en **"Sincronización Profunda"** o simplemente navega unos minutos. En visitas posteriores, todo cargará instantáneamente desde tu almacenamiento local en milisegundos.

### 3. El texto no cambia al cambiar el idioma
- **Causa:** El navegador tiene en caché los archivos JSON de traducciones anteriores.
- **Solución:** Realiza una recarga forzada con `Ctrl + F5` (o `Cmd + Shift + R` en Mac) para renovar los archivos de `assets/i18n/`.

### 4. No puedo hacer clic derecho o arrastrar imágenes
- **Causa:** Es una característica de diseño y seguridad activa (`assets/js/security.js`) pensada para proteger la estabilidad visual de las cartas, sprites e interactividad.

---

## 📜 Licencia y Créditos

- **Licencia de Código:** Publicado bajo la licencia de código abierto **MIT License**.
- **Licencia de Contenido:** Licenciado bajo **Creative Commons Atribución-NoComercial-SinDerivadas 4.0 Internacional ([CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/))**.
- **Aviso Legal de Marcas:** Pokémon, los nombres de los personajes, las cartas coleccionables y las marcas comerciales asociadas son propiedad intelectual de **Nintendo**, **Game Freak** y **Creatures Inc.** / **The Pokémon Company**. Este es un proyecto educativo, sin fines de lucro y desarrollado por y para la comunidad.
- **Autor:** Creado con dedicación por **[Diego Diaz](https://github.com/didilo99)**.

---

<div align="center">
  <p><b>¡Atrápalos a todos, entrena con sabiduría y disfruta del fascinante mundo Pokémon! ⚡</b></p>
</div>
