(() => {
  const API = "https://pokeapi.co/api/v2";
  const tbody = document.getElementById("naturesBody");

  // Stat translations - Now using I18n
  // Flavor translations - Now using I18n

  let naturesList = [];
  let currentSort = { col: "name", dir: "asc" };

  // Init
  window.addEventListener("languageChanged", () => {
    if (naturesList.length > 0) sortAndRender();
  });

  init();

  async function init() {
    const res = await window.fetchCached(`${API}/nature?limit=50`);
    const { results } = res;

    // Fetch details for all natures
    const promises = results.map((n) => window.fetchCached(n.url));
    const details = await Promise.all(promises);
    naturesList = details; // Store for re-rendering

    // Initial render
    sortAndRender();

    // Add event listeners for sorting
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const col = th.getAttribute("data-sort");
        if (currentSort.col === col) {
          currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
        } else {
          currentSort.col = col;
          currentSort.dir = "asc";
        }
        sortAndRender();
      });
    });
  }

  function sortAndRender() {
    const { col, dir } = currentSort;

    naturesList.sort((a, b) => {
      let valA = "";
      let valB = "";

      switch (col) {
        case "name":
          valA = getLocalizedName(a);
          valB = getLocalizedName(b);
          break;
        case "increased":
          valA = getStatText(a.increased_stat, a.decreased_stat);
          valB = getStatText(b.increased_stat, b.decreased_stat);
          break;
        case "decreased":
          valA = getStatText(a.decreased_stat, a.increased_stat);
          valB = getStatText(b.decreased_stat, b.increased_stat);
          break;
        case "flavor":
          valA = getFlavorText(a.likes_flavor);
          valB = getFlavorText(b.likes_flavor);
          break;
        case "dislike":
          valA = getFlavorText(a.hates_flavor);
          valB = getFlavorText(b.hates_flavor);
          break;
      }

      const res = valA.localeCompare(valB);
      return dir === "asc" ? res : -res;
    });

    renderTable(naturesList);
    updateSortIcons();
  }

  function getStatText(stat, otherStat) {
    if (stat && otherStat && stat.name === otherStat.name) {
      const neu = I18n.t("natures.neutral");
      return neu === "natures.neutral" ? "Neutral" : neu;
    }
    if (!stat) return "—";
    const t = I18n.t("stats." + stat.name);
    return t === "stats." + stat.name ? stat.name : t;
  }

  function getFlavorText(flavor) {
    if (!flavor) return "—";
    const key = "flavors." + flavor.name;
    const t = I18n.t(key);
    return t === key ? flavor.name : t;
  }

  function updateSortIcons() {
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.classList.remove("sort-active", "sort-asc", "sort-desc");
      const icon = th.querySelector("i");
      if (icon) icon.setAttribute("data-lucide", "arrow-up-down");

      if (th.getAttribute("data-sort") === currentSort.col) {
        th.classList.add("sort-active");
        th.classList.add(currentSort.dir === "asc" ? "sort-asc" : "sort-desc");
        if (icon) {
          icon.setAttribute(
            "data-lucide",
            currentSort.dir === "asc" ? "arrow-up" : "arrow-down"
          );
        }
      }
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function getLocalizedName(d) {
    if (!I18n || !I18n.currentLang) return d.name;
    const n = d.names.find((x) => x.language.name === I18n.currentLang);
    return n ? n.name : d.name;
  }

  function renderTable(list) {
    tbody.innerHTML = "";

    list.forEach((d) => {
      const name = getLocalizedName(d);
      const up = d.increased_stat;
      const down = d.decreased_stat;
      const like = d.likes_flavor;
      const dislike = d.hates_flavor;

      const tr = document.createElement("tr");
      tr.className = "grid-item-enter";

      let upText = "—";
      let downText = "—";
      let upClass = "neutral";
      let downClass = "neutral";

      if (up && down && up.name === down.name) {
        const neu = I18n.t("natures.neutral");
        upText = neu === "natures.neutral" ? "Neutral" : neu;
        downText = upText;
      } else {
        if (up) {
          upText = getStatText(up);
          upClass = "stat-up";
        }
        if (down) {
          downText = getStatText(down);
          downClass = "stat-down";
        }
      }

      const likeText = getFlavorText(like);
      const dislikeText = getFlavorText(dislike);

      tr.innerHTML = `
        <td style="font-weight:bold; text-transform:capitalize;">${name}</td>
        <td class="${upClass}">${upText}</td>
        <td class="${downClass}">${downText}</td>
        <td class="flavor-like">${likeText}</td>
        <td class="flavor-dislike">${dislikeText}</td>
      `;
      tbody.appendChild(tr);
    });
  }
})();
