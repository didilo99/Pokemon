<div align="center">
  <img src="https://raw.githubusercontent.com/PokeAPI/media/master/logo/pokeapi_256.png" alt="PokeAPI Logo" width="150" />
  <h1>🐉 PokéApp - La Enciclopedia Pokémon Definitiva v2.0</h1>
  <p>Una aplicación web integral y masiva para explorar el mundo Pokémon. Consulta estadísticas, mecánicas avanzadas, cartas del TCG, regiones, calculadoras de captura y ¡mucho más!</p>

[![GitHub repo size](https://img.shields.io/github/repo-size/didilo99/Pokemon?style=for-the-badge)](https://github.com/didilo99/Pokemon)
[![GitHub last commit](https://img.shields.io/github/last-commit/didilo99/Pokemon?style=for-the-badge&color=red)](https://github.com/didilo99/Pokemon)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Tabla de Contenidos

1. [Conoce la Aplicación (Manual del Usuario)](#-conoce-la-aplicación-manual-del-usuario)
   - [La Pokédex Principal y Equipos](#1-la-pokédex-principal-y-equipos)
   - [Mecánicas de Combate y Crianza](#2-mecánicas-de-combate-y-crianza)
   - [El Mundo Pokémon (Regiones, Juegos y Encuentros)](#3-el-mundo-pokémon-regiones-juegos-y-encuentros)
   - [Calculadoras y Herramientas Especiales](#4-calculadoras-y-herramientas-especiales)
   - [Objetos, Bayas y Máquinas (MT/MO)](#5-objetos-bayas-y-máquinas-mtmo)
   - [Juego de Cartas Coleccionables (TCG)](#6-juego-de-cartas-coleccionables-tcg)
2. [Apartado Técnico (Para Desarrolladores)](#-apartado-técnico-para-desarrolladores)
3. [Guía de Instalación](#-guía-de-instalación)
4. [Solución de Problemas (Troubleshooting)](#-solución-de-problemas-troubleshooting)

---

## 🎮 Conoce la Aplicación (Manual del Usuario)

**PokéApp** ha evolucionado mucho más allá de una simple lista de criaturas. Es una enciclopedia interactiva profunda diseñada para todo tipo de jugadores: desde coleccionistas que juegan al TCG, hasta criadores competitivos y _shiny hunters_. A continuación detallamos exhaustivamente todas las herramientas (páginas) a tu disposición:

### 1. La Pokédex Principal y Equipos

- **Pokédex Interactiva (`index.html`):** La puerta de entrada principal. Busca a cualquier Pokémon por nombre o número Nacional. Al entrar al detalle, verás su arte oficial en resoluciones fluidas, lore de la franquicia, estadísticas base (Ataque, Salud, Velocidad), línea evolutiva ilustrada y tipajes detallados.
- **Gestor Dinámico de Equipos (Team Builder):** Disponible mediante un modal rápido sin salir de tu navegación, el constructor te permite seleccionar cuáles son tus 6 ejemplares preferidos. Arrastra las celdas para organizar su orden de entrada y descarta miembros rápidamente cuando tu estrategia requiera un cambio en competitivo.

### 2. Mecánicas de Combate y Crianza

Secciones completas para los jugadores competitivos y analistas del _meta-game_:

- **Diccionario de Movimientos (`moves.html`):** Un compendio robusto con absolutamente todos los ataques conocidos. Útil para filtrar por potencia (Power), precisión (Accuracy), clase (Físico, Especial, Estado) o tipo, a la hora de determinar tú setlist ideal.
- **Guía de Habilidades (`abilities.html`):** Explora los efectos detallados en batalla de cada habilidad disponible en el juego, desde pasivas comunes hasta complejas de Ocultas, mostrando su impacto tanto dentro como fuera del combate.
- **Tabla de Tipos y Debilidades (`types.html`):** Comprender las matemáticas de daño jamás había sido tan fácil. Analiza visualmente qué tipos son super-efectivos, resistentes o derechamente inmunes contra otros, previniendo así un fracaso rotundo en combate.
- **Tabla de Naturalezas (`natures.html`):** Listado esquemático donde consultar exactamente a qué estadística favorece cada personalidad (ej. Audaz da Ataque - Quita Velocidad) y qué sabor de perfil prefiere el Pokémon en la preparación de Pokochos/Pokécubos.
- **Estudio de Crianza (`breeding.html`):** Fundamental para guarderías Pokémon. Comprende las lógicas de herencia y evalúa listados completos de Grupos Huevo (Egg Groups).

### 3. El Mundo Pokémon (Regiones, Juegos y Encuentros)

Para los coleccionistas de juegos y exploradores geográficos:

- **Generaciones e Historia (`generations.html` / `games.html`):** Un viaje a la nostalgia. Consulta los detalles de todas las épocas introducidas en los juegos principales (desde las de Game Boy en 1996 hasta los títulos actuales).
- **Regiones y Localizaciones (`regions.html` / `locations.html`):** Una app de "mapa interactivo" para los juegos. Aprende la demografía de Kanto, Sinnoh o Paldea, identificando rutas, islas desiertas o ciudades cosmopolitas y las diferentes subáreas existentes dentro de un único bosque o cueva.
- **Hábitats Naturales (`habitats.html` / `encounters.html`):** Investiga en campo como un verdadero profesor. Esta sección informa sobre las diferentes zonas de apariciones endémicas de ciertas especies y las lógicas internas de los encuentros en la hierba, agua o cuevas ocultas.

### 4. Calculadoras y Herramientas Especiales

- **Simulador y Calculadora de Capturas (`capture-calculator.html`):** ¡No lances Poké Balls a ciegas! Esta avanzada calculadora simula la retención aplicando fórmulas matemáticas oficiales de los videojuegos: introduciendo la vitalidad restante del Pokémon a combatir, estado (dormido/paralizado), ratio de captura base y qué _Ball_ emplearás, calcularás la probabilidad porcentual exacta (0 a 100%) en ese turno en concreto.
- **Pabellón de Concursos (`contests.html`):** Una visión a la faceta pacífica de las entregas. Detalla condiciones de Belleza, Carisma o Dureza y cómo las exhibiciones emplean mecánicas distintas al daño común para dar al jugador las medallas o cintas.
- **Clasificación por Formas Mofológicas (`shapes.html`):** Sistema académico para descubrir de qué _"Template"_ viene la estructura (Con alas, Serpentinos, Multípedos o Forma de Bola).

### 5. Objetos, Bayas y Máquinas (MT/MO)

- **El Gran Bazar de Objetos (`items.html`):** Conoce cientos de _Items_ diferentes. Desde pociones de curación básicas o Repelentes temporales, hasta rarísimos Objetos Clave y ticket dorados con un historial de para qué fueron útiles en cada juego.
- **Arbusto de Bayas (`berries.html`):** Conoce todo acerca de este alimento indispensable: duración óptima de plantado, perfiles frutales o gustativos para preparar recetarios, y los efectos defensivos o aliviadores que producen cuando un Pokémon las sostiene en batalla automática durante un despiste o golpe mortal.
- **Terminal de Máquinas (`machines.html`):** Consulta el catálogo histórico de los discos de las enigmáticas MT (Máquinas Técnicas) y MO (Máquinas Ocultas), pudiendo localizar por generación qué enumeración pertenecía a Surf, Terremoto o Daño Secreto.

### 6. Juego de Cartas Coleccionables (TCG)

El santuario donde convergen la web e impresos de cartón real:

- **Galería del Juego de Cartas (`cards.html`):** Un impresionante tablero visual donde puedes inspeccionar cartas oficiales. Aquí, todos los Pokémon revelan su cara a la inversa del videojuego: te enseñarán sus ataques ilustrados y sus estadísticas clave para barajas de un mazo físico a través de la exactitudes requeridas de _Retirada (Retreat Cost)_, _Resistencia al tipo_ o _Debilidad severa_ para las reglas oficiales del campeonato.
- **Colecciones y Sets TCG (`tcg-sets.html`):** Observación por paquete expansión. Consulta los logotipos oficiales icónicos de base set o colecciones brillantes para navegar a través del catálogo que compuso tu infancia o tus cartas con rareza "Secreta".

---

## 💻 Apartado Técnico (Para Desarrolladores)

Mantener todos estos servicios estables en la web del cliente (Client-Side) implica una logística que gestiona llamadas asíncronas hacia servidores altamente densos y terceros.

### Stack Tecnológico

| Componente          | Tecnologías Empleadas                                                                                                                                                                                      |
| :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend UI/UX**  | **HTML5 Semántico**, **CSS3 Vanilla** optimizado con layout asíncronos y cuadrículas visuales eficientes, y **Diseño Grid/Flexbox**.                                                                       |
| **Interactividad**  | **JavaScript ES6+**. Rutinas especializadas puras que controlan dinámicas (como el modal de equipos o simuladores) en una única sesión, reduciendo repintado del Documento (`DOM`).                        |
| **Backend Proxies** | **PHP 8.x**. Como pasarela segura mediante archivos como `proxy.php` y `bulbapedia_proxy.php`, imprescindibles para evitar bloqueos por políticas CORS de diferentes APIs al buscar lore extra y TCG Data. |
| **Local Memory**    | Persistencia interna y mitigación de llamadas mediante LocalStorage y cachés manejados de JS y Bases MySQL.                                                                                                |

### Arquitectura y API Management

- **Orquestador Principal de API y Anti-Gateway Timeouts:**
  La información de más de 1200 Pokémon con sus estadísticas requiere muchísimas solicitudes que a menudo desembocan en el infame Error _504 de Timeout en PokeAPI_. El script `cache.js` solventa la resiliencia al integrar de manera autónoma esquemas `fetchCached` y `deepSyncAllPokeAPI`. Retiene las llamadas ya solventes almacenándolas sin tener que re-preguntarle al servidor externo las 1000 previas logradas, permitiendo una experiencia ininterrumpida frente a fallas ocasionales del Internet o hostings foráneos.
- **Centro de Auditoría API (`api_info.html`):** Un panel lateral incorporado a manera de _"DevTool"_ para auditar cómo se comunican todas las URL o end-points hacia el exterior de forma cómoda por estado en línea (Alive / Broken).

---

## ⚙️ Guía de Instalación

El proceso estándar exige la implementación de servidor web completo dada la participación intrínseca de PHP en los enlaces puente (Proxies).

### 1. Requisitos Principales

- Tener **Git** para clonar correctamente sin corrupción de datos.
- [XAMPP](https://www.apachefriends.org/es/index.html) para Windows (o servicios análogos como WAMP), activador local de las capacidades HTTP del servidor Apache.

### 2. Clonación Segura

Sencillamente ubícate usando la terminal en la sub-carpeta natural al servidor, comúnmente llamada `htdocs` en programas como XAMPP:

```bash
cd C:/xampp/htdocs/
git clone https://github.com/didilo99/Pokemon.git Pokedex
```

_(Es ideal clonar a la subcategoría Pokedex para acotar URLS amigables)._

### 3. Configuración de Puesta en Marcha

- Activa el panel de control de tu XAMPP levantando **Apache** en "Start", debe aparecer listado verde su puerto.
- En caso de contar integraciones extra a cachés persistentes nativas de backend, sube tu base de datos y activa el módulo **MySQL** desde su gestor `/phpmyadmin/`.
- Permite escritura (chmod o permisos de perfil) a cualquier archivo transaccional subyacente que un proxy cree.

### 4. Entrando a Ejecución

Enciende tu explorador moderno (ej: Brave, Chrome) o dispositivo móvil conectado e introduce tu puerto de manera explícita:
`http://localhost/Pokedex/index.html`

> ⚠️ Nota de seguridad: **Nunca abras el `index.html` arrastrándolo a una pestaña si vienes de la ruta `file:///C:/Users/...`**. Esto aisla inmediatamente todo protocolo de comunicación por considerarlo inseguro y rompe el flujo del aplicativo en 100%.

---

## 🩺 Solución de Problemas (Troubleshooting)

- **Cuelgues masivos o Error 504 (_Timeout_) por primera vez**
  Debido al brutal tráfico de objetos, juegos o cartas, si es la sesión número 1 de tu navegador accediendo (caché nulo), la web podría parecer detenida o con casillas vacías al sobre-apresurarse descargando. Solo ejecuta Recarga (Botón F5) al encontrar el mensaje de error. Por debajo del capó, el servicio continuará su labor y estabilizará toda tu Pokedex de manera perpetua mediante descargas silenciosas paulatinas.
- **Rompimiento de CORS / Tarjetas de TCG desiertas o faltantes**
  Si notas las áreas de texto lore de _Bulbapedia_ en Pokedex o las cartas de `cards.html` vacías sin previo aviso, ten por seguro que las peticiones por _localhost_ de Apache cayeron o que no cuentas en tu distribución de PHP con el paquete `cURL` (normalmente el estándar viene activado, pero en Linux/Mac podría implicar una breve modificación en tú `php.ini`). Re-inicia tus servidores.

---

<div align="center">
  <p><b>¡Atrápalos a Todos, estudia inteligente, entrena ferozmente!</b></p>
  Hecho para la comunidad y el Open Source bajo la Licencia MIT.<br>
</div>
