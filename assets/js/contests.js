(() => {
  const API = "https://pokeapi.co/api/v2";

  // Data mapping for Contest Effects in Spanish
  const CONTEST_DATA_ES = {
    1: {
      name: "Atractivo Puro",
      desc: "Otorga una gran cantidad de puntos de exhibición sin otros efectos.",
    },
    2: {
      name: "Atractivo Doble",
      desc: "Si el Pokémon que actuó antes obtuvo puntos, el usuario obtiene el doble de esos puntos.",
    },
    3: {
      name: "Atractivo Mímico",
      desc: "Si el Pokémon que actuó antes obtuvo puntos, el usuario recibe la misma cantidad.",
    },
    4: {
      name: "Inicio Explosivo",
      desc: "Otorga puntos extra si se usa primero en el turno.",
    },
    5: {
      name: "Final Estelar",
      desc: "Otorga puntos extra si se usa el último en el turno.",
    },
    6: {
      name: "Inhibición Rápida",
      desc: "Intenta inhibir a los Pokémon que ya han actuado en este turno.",
    },
    7: {
      name: "Inhibición General",
      desc: "Intenta inhibir a todos los Pokémon que ya han actuado.",
    },
    8: {
      name: "Inhibición Directa",
      desc: "Intenta inhibir a los Pokémon que actuaron justo antes que el usuario.",
    },
    9: {
      name: "Inhibición Seleccionada",
      desc: "Intenta inhibir a todos los Pokémon que actuaron antes que el usuario.",
    },
    10: {
      name: "Escudo Total",
      desc: "Evita ser inhibido por los demás Pokémon durante el resto de este turno.",
    },
    11: {
      name: "Escudo Temporal",
      desc: "Evita ser inhibido por los demás Pokémon una sola vez durante este turno.",
    },
    12: {
      name: "Público Vulnerable",
      desc: "Hace que los demás Pokémon sean más fáciles de inhibir temporalmente.",
    },
    13: {
      name: "Nervios de Escenario",
      desc: "Hace que los demás Pokémon se pongan nerviosos y fallen su actuación.",
    },
    14: {
      name: "Aplauso Extra",
      desc: "Añade un punto extra al medidor de entusiasmo, sin importar el tipo de movimiento.",
    },
    15: {
      name: "Eco de Atractivo",
      desc: "Obtiene puntos de exhibición equivalentes a la mitad de los puntos del Pokémon anterior.",
    },
    16: {
      name: "Cambio de Turno",
      desc: "Baraja el orden de actuación del próximo turno.",
    },
    17: {
      name: "Ruptura de Combo",
      desc: "Cancela el estado de combo en espera de todos los Pokémon que han actuado.",
    },
    18: {
      name: "Bloqueo de Entusiasmo",
      desc: "Evita que el medidor de entusiasmo aumente durante el resto del turno.",
    },
    19: {
      name: "Atractivo Azaroso",
      desc: "Otorga aleatoriamente uno, dos, cuatro u ocho puntos de exhibición.",
    },
    20: {
      name: "Atractivo Creciente",
      desc: "Si el usuario actúa primero este turno, obtiene un punto; si lo hace segundo, dos; y así sucesivamente.",
    },
    21: {
      name: "Atractivo Decreciente",
      desc: "Si el usuario actúa primero este turno, obtiene seis puntos; si actúa el último, ninguno.",
    },
    22: {
      name: "Atractivo de Inicio",
      desc: "Obtiene un punto de exhibición. Si el medidor de entusiasmo está vacío o a uno, obtiene cuatro más.",
    },
    23: {
      name: "Sincronía de Tipo",
      desc: "Si la exhibición del último Pokémon es del mismo tipo que la del usuario, este obtiene puntos extra.",
    },
    24: {
      name: "Actuación Constante",
      desc: "El uso repetido no conlleva penalización de puntos en este movimiento.",
    },
    25: {
      name: "Atractivo Secuencial",
      desc: "Otorga el doble de puntos si se usa en el mismo turno que el movimiento anterior del usuario.",
    },
    26: {
      name: "Actuación Final",
      desc: "Otorga una gran cantidad de puntos, pero el usuario no puede realizar más exhibiciones este turno.",
    },
    27: {
      name: "Mitigación de Daño",
      desc: "Si el usuario se inhibe este turno después de usar el movimiento, la inhibición se mitiga.",
    },
    28: {
      name: "Contra-atractivo",
      desc: "Intenta inhibir al Pokémon que ha actuado antes que el usuario.",
    },
    29: {
      name: "Actuación Versátil",
      desc: "Otorga puntos extra si el usuario actúa el primero, el segundo, el tercero o el cuarto.",
    },
    30: {
      name: "Éxtasis del Público",
      desc: "Otorga puntos extra si el medidor de entusiasmo del público está lleno.",
    },
    31: {
      name: "Sinergia de Combo",
      desc: "Otorga puntos extra si se usa como parte de una combinación de movimientos definida.",
    },
    32: {
      name: "Dulce Recuerdo",
      desc: "Otorga puntos extra si el movimiento anterior del usuario era una exhibición de tipo Dulce.",
    },
    33: {
      name: "Ingenio Recordado",
      desc: "Otorga puntos extra si el movimiento anterior del usuario era una exhibición de tipo Ingenio.",
    },
  };

  // DOM
  const grid = document.getElementById("contestsGrid");
  const dlg = document.getElementById("contestModal");
  const modalIdText = document.getElementById("modalId");
  const modalTitle = document.getElementById("modalTitle");
  const kvAppeal = document.getElementById("kvAppeal");
  const kvJam = document.getElementById("kvJam");
  const contestEffectText = document.getElementById("contestEffect");
  const contestFlavorText = document.getElementById("contestFlavor");

  // State
  let ALL_CONTESTS = [];

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => {
    if (ALL_CONTESTS.length > 0) renderAll();
  });

  async function init() {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 6rem; color: var(--c-text-muted);">
      <div class="spinner mb-3"></div>
      ${I18n.t("common.loading")}
    </div>`;

    try {
      const effRes = await window.fetchCached(
        `${API}/contest-effect?limit=100`,
      );
      const effPromises = effRes.results.map((r) => window.fetchCached(r.url));
      const effDetails = await Promise.all(effPromises);

      ALL_CONTESTS = effDetails.map((d) => {
        const enEntry = d.effect_entries.find((e) => e.language.name === "en");
        const esEntry = d.effect_entries.find((e) => e.language.name === "es");
        const enFlavor = d.flavor_text_entries.find(
          (e) => e.language.name === "en",
        );
        const esFlavor = d.flavor_text_entries.find(
          (e) => e.language.name === "es",
        );

        return {
          ...d,
          getLocalizedName: () => {
            return I18n.currentLang === "es" && CONTEST_DATA_ES[d.id]
              ? CONTEST_DATA_ES[d.id].name
              : `Effect #${d.id}`;
          },
          getLocalizedEffect: () => {
            if (I18n.currentLang === "es" && CONTEST_DATA_ES[d.id]) {
              return CONTEST_DATA_ES[d.id].desc;
            }
            return esEntry
              ? esEntry.effect
              : enEntry
                ? enEntry.effect
                : `Efecto ${d.id}`;
          },
          getLocalizedFlavor: () => {
            return esFlavor
              ? esFlavor.flavor_text
              : enFlavor
                ? enFlavor.flavor_text
                : "";
          },
        };
      });

      renderAll();
    } catch (e) {
      console.error("Error loading contests", e);
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--c-danger);">
        Error loading contests.
      </div>`;
    }

    document
      .querySelectorAll("[data-close-modal]")
      .forEach((b) => b.addEventListener("click", () => dlg.close()));
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener("close", () => I18n.clearModalTitle());
  }

  function renderAll() {
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();

    ALL_CONTESTS.forEach((d, index) => {
      const card = document.createElement("article");
      card.className = "contest-card grid-item-enter";
      card.style.setProperty("--item-index", index);

      const appealHearts =
        d.appeal > 0
          ? '<i data-lucide="heart" class="lucide-heart-appeal"></i>'.repeat(
              d.appeal,
            )
          : "0";
      const jamHearts =
        d.jam > 0
          ? '<i data-lucide="heart" class="lucide-heart-jam"></i>'.repeat(d.jam)
          : "0";

      card.innerHTML = `
        <div class="contest-card-inner">
          <div class="contest-id">#${d.id}</div>
          <div class="contest-header-vibrant">
             <div class="contest-title-text">${d.getLocalizedName()}</div>
          </div>
          <div class="contest-body-content">
            <div class="contest-description-short">${d.getLocalizedEffect()}</div>
            <div class="contest-footer-stats">
              <div class="contest-stat-pill appeal">
                <span class="stat-icon"><i data-lucide="heart" class="lucide-heart-appeal"></i></span>
                <span class="stat-val">${appealHearts}</span>
              </div>
              <div class="contest-stat-pill jam">
                <span class="stat-icon"><i data-lucide="heart" class="lucide-heart-jam"></i></span>
                <span class="stat-val">${jamHearts}</span>
              </div>
            </div>
          </div>
        </div>
      `;
      card.onclick = () => openContestModal(d);
      frag.appendChild(card);
    });

    grid.appendChild(frag);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  function openContestModal(d) {
    modalIdText.textContent = `#${d.id}`;
    modalTitle.textContent = d.getLocalizedName();
    I18n.setModalTitle(modalTitle.textContent);

    kvAppeal.innerHTML =
      d.appeal > 0
        ? `${'<i data-lucide="heart" class="lucide-heart-appeal"></i>'.repeat(d.appeal)} <span class="ms-2 opacity-30 text-xs">(${d.appeal})</span>`
        : "0";
    kvJam.innerHTML =
      d.jam > 0
        ? `${'<i data-lucide="heart" class="lucide-heart-jam"></i>'.repeat(d.jam)} <span class="ms-2 opacity-30 text-xs">(${d.jam})</span>`
        : "0";

    contestEffectText.textContent = d.getLocalizedEffect();
    contestFlavorText.textContent =
      d.getLocalizedFlavor() || I18n.t("contests.no_description");

    dlg.showModal();
    if (typeof lucide !== "undefined") lucide.createIcons();
  }
})();
