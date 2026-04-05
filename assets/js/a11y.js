document.addEventListener("DOMContentLoaded", () => {
  // Page entry animation
  requestAnimationFrame(() => {
    document.body.classList.add("page-loaded");
  });

  // Intercept navigation for exit animation
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (
      link && 
      link.href && 
      link.hostname === window.location.hostname && 
      !link.hash && 
      link.getAttribute("href") !== "#" &&
      !link.dataset.bsToggle &&
      link.getAttribute("role") !== "button" &&
      link.target !== "_blank" &&
      !e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey
    ) {
      // Don't intercept if it's a download or other special link
      if (link.getAttribute("download") !== null) return;
      
      e.preventDefault();
      const targetUrl = link.href;
      document.body.classList.remove("page-loaded");
      document.body.classList.add("page-exiting");
      
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 400); // Matches CSS transition duration
    }
  });

  // Inject the Accessibility Toggle Button in the header
  const dropdownGroup = document.querySelector(
    ".d-flex.align-items-center.gap-2",
  );
  if (dropdownGroup && !document.getElementById("a11yToggle")) {
    const btnHtml = `
      <button class="btn btn-sm dex-select d-flex align-items-center justify-content-center gap-2" type="button" id="a11yToggle" data-i18n-aria-label="a11y.title" data-i18n-title="a11y.title">
        <i data-lucide="user" style="width:18px;height:18px;"></i>
        <span class="d-none d-md-inline" data-i18n="a11y.title">Accesibilidad</span>
      </button>

      <div class="dropdown d-inline-block ms-1" id="themeDropdownContainer">
        <button class="btn btn-sm dropdown-toggle dex-select d-flex align-items-center gap-2" type="button" id="themeDropdown" data-bs-toggle="dropdown" aria-expanded="false" data-i18n-aria-label="theme.change" data-i18n-title="theme.change">
          <span id="themeIconContainer" class="d-flex align-items-center">
            <i data-lucide="sun-moon" style="width:18px;height:18px;"></i>
          </span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end dex-dropdown-menu" aria-labelledby="themeDropdown">
          <li><a class="dropdown-item d-flex align-items-center gap-2 theme-option" href="#" data-theme="light">
            <i data-lucide="sun" style="width:16px;height:16px;"></i> <span data-i18n="theme.light">Claro</span></a></li>
          <li><a class="dropdown-item d-flex align-items-center gap-2 theme-option" href="#" data-theme="dark">
            <i data-lucide="moon" style="width:16px;height:16px;"></i> <span data-i18n="theme.dark">Oscuro</span></a></li>
          <li><a class="dropdown-item d-flex align-items-center gap-2 theme-option" href="#" data-theme="auto">
            <i data-lucide="sun-moon" style="width:16px;height:16px;"></i> <span data-i18n="theme.auto">Sistema</span></a></li>
        </ul>
      </div>
    `;
    dropdownGroup.insertAdjacentHTML("beforeend", btnHtml);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  // Inject the Accessibility Panel HTML
  if (!document.getElementById("a11yPanel")) {
    const panelHtml = `
      <div id="a11yOverlay" class="a11y-overlay"></div>
      <div id="a11yPanel" class="a11y-panel" role="dialog" aria-modal="true" data-i18n-aria-label="a11y.title">
        <div class="a11y-header">
          <h2>
            <i data-lucide="user" style="width:20px;height:20px;"></i>
            <span data-i18n="a11y.title">Accesibilidad</span>
          </h2>
          <button id="a11yClose" class="a11y-close" data-i18n-aria-label="a11y.close"><i data-lucide="x"></i></button>
        </div>
        <div class="a11y-content">
          <div class="a11y-btn-group">
            <button id="a11yTextIncrease" class="a11y-btn" data-i18n="a11y.text_increase">A+ Aumentar Texto</button>
            <button id="a11yTextDecrease" class="a11y-btn" data-i18n="a11y.text_decrease">A- Disminuir Texto</button>
          </div>
          <button id="a11yGrayscale" class="a11y-btn" data-a11y-setting="grayscale">
            <span data-i18n="a11y.grayscale">Escala de Grises</span>
            <div class="a11y-toggle-switch"></div>
          </button>
          <button id="a11yHighContrast" class="a11y-btn" data-a11y-setting="highContrast">
            <span data-i18n="a11y.high_contrast">Alto Contraste</span>
            <div class="a11y-toggle-switch"></div>
          </button>
          <button id="a11yReadableFont" class="a11y-btn" data-a11y-setting="readableFont">
            <span data-i18n="a11y.readable_font">Fuente Legible</span>
            <div class="a11y-toggle-switch"></div>
          </button>
          <button id="a11yUnderlineLinks" class="a11y-btn" data-a11y-setting="underlineLinks">
            <span data-i18n="a11y.underline_links">Subrayar Enlaces</span>
            <div class="a11y-toggle-switch"></div>
          </button>
          <button id="a11yHighlightLinks" class="a11y-btn" data-a11y-setting="highlightLinks">
            <span data-i18n="a11y.highlight_links">Resaltar Enlaces</span>
            <div class="a11y-toggle-switch"></div>
          </button>

          <button id="a11yReset" class="a11y-btn a11y-reset" data-i18n="a11y.reset"><i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Restablecer Ajustes</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", panelHtml);
    if (typeof lucide !== "undefined") lucide.createIcons();
    if (window.I18n && typeof window.I18n.applyTranslations === "function") {
      window.I18n.applyTranslations();
    }
  }

  // Logic Setup
  const toggleBtn = document.getElementById("a11yToggle");
  const closeBtn = document.getElementById("a11yClose");
  const panel = document.getElementById("a11yPanel");
  const overlay = document.getElementById("a11yOverlay");

  const openPanel = () => {
    panel.classList.add("open");
    overlay.classList.add("show");
  };

  const closePanel = () => {
    panel.classList.remove("open");
    overlay.classList.remove("show");
  };

  if (toggleBtn) toggleBtn.addEventListener("click", openPanel);
  if (closeBtn) closeBtn.addEventListener("click", closePanel);
  if (overlay) overlay.addEventListener("click", closePanel);

  // Settings State
  let settings = JSON.parse(localStorage.getItem("pokedex_a11y")) || {
    textSize: 100, // percentage
    grayscale: false,
    highContrast: false,
    readableFont: false,
    underlineLinks: false,
    highlightLinks: false,
  };

  const applySettings = () => {
    // Text Size
    document.documentElement.style.fontSize = `${settings.textSize}%`;

    // Toggle classes on body
    document.body.classList.toggle("a11y-grayscale", settings.grayscale);
    document.body.classList.toggle("a11y-high-contrast", settings.highContrast);
    document.body.classList.toggle("a11y-readable-font", settings.readableFont);
    document.body.classList.toggle(
      "a11y-underline-links",
      settings.underlineLinks,
    );
    document.body.classList.toggle(
      "a11y-highlight-links",
      settings.highlightLinks,
    );

    // Update buttons UI
    document.querySelectorAll("[data-a11y-setting]").forEach((btn) => {
      const setting = btn.getAttribute("data-a11y-setting");
      btn.classList.toggle("active", settings[setting]);
    });

    // Save
    localStorage.setItem("pokedex_a11y", JSON.stringify(settings));
  };

  // Text Size Listeners
  document.getElementById("a11yTextIncrease")?.addEventListener("click", () => {
    if (settings.textSize < 150) {
      settings.textSize += 10;
      applySettings();
    }
  });

  document.getElementById("a11yTextDecrease")?.addEventListener("click", () => {
    if (settings.textSize > 80) {
      settings.textSize -= 10;
      applySettings();
    }
  });

  // Toggle Listeners
  document.querySelectorAll("[data-a11y-setting]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const setting = btn.getAttribute("data-a11y-setting");
      settings[setting] = !settings[setting];
      applySettings();
    });
  });

  // Reset
  document.getElementById("a11yReset")?.addEventListener("click", () => {
    settings = {
      textSize: 100,
      grayscale: false,
      highContrast: false,
      readableFont: false,
      underlineLinks: false,
      highlightLinks: false,
    };
    applySettings();
  });

  // Apply on load
  applySettings();

  // --- THEME LOGIC ---
  const savedTheme = localStorage.getItem("pokedex_theme") || "auto";
  const themeIcon = document.getElementById("themeIcon");
  const themeOptions = document.querySelectorAll(".theme-option");

  const icons = {
    light: '<i data-lucide="sun" style="width:18px;height:18px;"></i>',
    dark: '<i data-lucide="moon" style="width:18px;height:18px;"></i>',
    auto: '<i data-lucide="sun-moon" style="width:18px;height:18px;"></i>',
  };

  const applyTheme = (theme) => {
    let activeTheme = theme;
    if (theme === "auto") {
      activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-theme", activeTheme);

    const targetIcon = document.getElementById("themeIconContainer");
    if (targetIcon) {
      targetIcon.innerHTML = icons[theme] || icons.auto;
      if (typeof lucide !== "undefined") lucide.createIcons();
    }

    themeOptions.forEach((opt) => {
      opt.classList.toggle("active", opt.getAttribute("data-theme") === theme);
    });
  };

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (
        localStorage.getItem("pokedex_theme") === "auto" ||
        !localStorage.getItem("pokedex_theme")
      ) {
        applyTheme("auto");
      }
    });

  themeOptions.forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.preventDefault();
      const theme = opt.getAttribute("data-theme");
      localStorage.setItem("pokedex_theme", theme);
      applyTheme(theme);
    });
  });

  applyTheme(savedTheme);
});

/**
 * SwipeDetector utility for touch devices
 */
class SwipeDetector {
  constructor(element, callback, options = {}) {
    if (!element) return;
    this.element = element;
    this.callback = callback; // { left: fn, right: fn, up: fn, down: fn }
    this.startX = 0;
    this.startY = 0;
    this.threshold = options.threshold || 50;
    this.allowedAngle = options.allowedAngle || 30; // degrees from horizontal/vertical

    this.element.addEventListener(
      "touchstart",
      (e) => {
        this.startX = e.changedTouches[0].clientX;
        this.startY = e.changedTouches[0].clientY;
      },
      { passive: true },
    );

    this.element.addEventListener(
      "touchend",
      (e) => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        this.handleGesture(endX, endY);
      },
      { passive: true },
    );
  }

  handleGesture(endX, endY) {
    const diffX = endX - this.startX;
    const diffY = endY - this.startY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (absX > absY && absX > this.threshold) {
      // Horizontal swipe
      if (diffX > 0) {
        if (this.callback.right) this.callback.right();
      } else {
        if (this.callback.left) this.callback.left();
      }
    } else if (absY > absX && absY > this.threshold) {
      // Vertical swipe
      if (diffY > 0) {
        if (this.callback.down) this.callback.down();
      } else {
        if (this.callback.up) this.callback.up();
      }
    }
  }
}

// Expose globally
window.SwipeDetector = SwipeDetector;

// Global paging keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ignore if user is typing in an input/textarea
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName))
    return;

  // Ignore if a modal is open (modals handle their own inner navigation)
  const openDialog = document.querySelector("dialog[open]");
  if (openDialog) return;

  if (e.key === "ArrowLeft") {
    const prev = document.getElementById("prevBtn");
    if (prev && !prev.disabled) prev.click();
  } else if (e.key === "ArrowRight") {
    const next = document.getElementById("nextBtn");
    if (next && !next.disabled) next.click();
  }
});

// Global paging swipe
if (window.SwipeDetector) {
  new SwipeDetector(document.body, {
    left: () => {
      if (!document.querySelector("dialog[open]")) {
        const next = document.getElementById("nextBtn");
        if (next && !next.disabled) next.click();
      }
    },
    right: () => {
      if (!document.querySelector("dialog[open]")) {
        const prev = document.getElementById("prevBtn");
        if (prev && !prev.disabled) prev.click();
      }
    },
  });
}
