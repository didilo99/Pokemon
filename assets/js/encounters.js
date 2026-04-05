(() => {
  const API = "https://pokeapi.co/api/v2";

  // DOM
  const methodsGrid = document.getElementById("methodsGrid");
  const conditionsGrid = document.getElementById("conditionsGrid");

  const dlg = document.getElementById("methodModal");
  const modalMethodTitle = document.getElementById("modalMethodTitle");
  const methodDescription = document.getElementById("methodDescription");

  // Init
  if (I18n.translations[I18n.currentLang]) {
    init();
  } else {
    window.addEventListener("languageChanged", () => init(), { once: true });
  }

  window.addEventListener("languageChanged", () => init());

  async function init() {
    methodsGrid.innerHTML = `<div class="text-center p-5"><div class="spinner"></div><div class="text-muted mt-2">${I18n.t("common.loading")}</div></div>`;
    conditionsGrid.innerHTML = `<div class="text-center p-5"><div class="spinner"></div><div class="text-muted mt-2">${I18n.t("common.loading")}</div></div>`;

    try {
      const [methodsRes, condRes] = await Promise.all([
        window.fetchCached(`${API}/encounter-method?limit=100`),
        window.fetchCached(`${API}/encounter-condition?limit=100`),
      ]);

      const mPromises = methodsRes.results.map((r) =>
        window.fetchCached(r.url),
      );
      const cPromises = condRes.results.map((r) => window.fetchCached(r.url));

      const mDetails = await Promise.all(mPromises);
      const cDetails = await Promise.all(cPromises);

      renderMethods(mDetails);
      renderConditions(cDetails);
    } catch (e) {
      console.error("Error loading encounters", e);
    }

    // Modal
    document
      .querySelectorAll("[data-close-modal]")
      .forEach((b) => b.addEventListener("click", () => dlg.close()));
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener("close", () => I18n.clearModalTitle());
  }

  function renderMethods(items) {
    methodsGrid.innerHTML = "";
    const frag = document.createDocumentFragment();

    items.forEach((d) => {
      const card = document.createElement("article");
      card.className = "encounter-card grid-item-enter";

      const curLang = I18n.currentLang;
      const nmEntry = d.names?.find((n) => n.language.name === curLang) || d.names?.find((n) => n.language.name === "en");
      const displayName = nmEntry ? nmEntry.name : I18n.toTitle(d.name.replace(/-/g, " "));

      card.innerHTML = `
          <div class="item-name">${displayName}</div>
        `;
      card.onclick = () => openMethodModal(d, displayName);
      frag.appendChild(card);
    });

    methodsGrid.appendChild(frag);
  }

  function renderConditions(items) {
    conditionsGrid.innerHTML = "";
    const frag = document.createDocumentFragment();

    items.forEach((d) => {
      const card = document.createElement("article");
      card.className = "encounter-card cond grid-item-enter";

      const curLang = I18n.currentLang;
      const nmEntry = d.names?.find((n) => n.language.name === curLang) || d.names?.find((n) => n.language.name === "en");
      const displayName = nmEntry ? nmEntry.name : I18n.toTitle(d.name.replace(/-/g, " "));

      let valsHTML = "";
      if (d.values && d.values.length > 0) {
        valsHTML = `<div class="mt-2 text-muted" style="font-size:0.85rem;">${I18n.t("common.values") || "Valores"}: ${d.values.map((v) => I18n.toTitle(v.name.replace(/-/g, " "))).join(", ")}</div>`;
      }

      card.innerHTML = `
          <div class="item-name">${displayName}</div>
          ${valsHTML}
        `;
      frag.appendChild(card);
    });

    conditionsGrid.appendChild(frag);
  }

  function openMethodModal(d, displayName) {
    modalMethodTitle.textContent = displayName;
    I18n.setModalTitle(displayName);

    // description
    const curLang = I18n.currentLang;
    const descEntry = d.names?.find((n) => n.language.name === curLang) || d.names?.find((n) => n.language.name === "en");
    // Encounter methods don't have long flavor texts in PokeAPI v2 usually.
    // Let's just show its name and any extra info.

    let info = `<strong>Identificador API:</strong> ${d.name}<br><br>`;
    info += `Este es un método de encuentro utilizado en los datos de localización de los Pokémon.`;

    methodDescription.innerHTML = info;

    dlg.showModal();
  }
})();
