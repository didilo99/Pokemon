/**
 * =============================================================================
 * POKÉDEX - GESTOR DE COOKIES Y PRIVACIDAD (CookieManager)
 * Banner funcional, panel de preferencias y persistencia en LocalStorage
 * =============================================================================
 */

(function () {
  const STORAGE_KEY = "pokedex_cookie_consent";

  const CookieManager = {
    isSubPage: window.location.pathname.includes("/pages/"),

    getBasePath() {
      return this.isSubPage ? "../" : "";
    },

    getConsent() {
      try {
        const item = localStorage.getItem(STORAGE_KEY);
        if (!item) return null;
        return JSON.parse(item);
      } catch (e) {
        return null;
      }
    },

    hasAnswered() {
      return this.getConsent() !== null;
    },

    setConsent(preferences = true, analytics = true) {
      const consentData = {
        necessary: true, // Siempre obligatorias
        preferences: Boolean(preferences),
        analytics: Boolean(analytics),
        timestamp: Date.now(),
        version: 1,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
      } catch (e) {
        console.warn("No se pudo almacenar el consentimiento en LocalStorage:", e);
      }

      this.hideBanner();
      this.hideModal();
      this.showToast(
        window.I18n?.t("cookies.saved_toast") || "Preferencias de cookies guardadas correctamente."
      );

      // Notificar a toda la aplicación
      window.dispatchEvent(
        new CustomEvent("cookieConsentChanged", { detail: consentData })
      );
    },

    showBanner() {
      const banner = document.getElementById("cookieBanner");
      if (banner) {
        banner.classList.add("show");
        banner.setAttribute("aria-hidden", "false");
      }
    },

    hideBanner() {
      const banner = document.getElementById("cookieBanner");
      if (banner) {
        banner.classList.remove("show");
        banner.setAttribute("aria-hidden", "true");
      }
    },

    openModal() {
      const backdrop = document.getElementById("cookieModalBackdrop");
      if (!backdrop) return;

      const consent = this.getConsent();
      const prefToggle = document.getElementById("cookiePrefToggle");
      const cacheToggle = document.getElementById("cookieCacheToggle");

      if (prefToggle) {
        prefToggle.checked = consent ? consent.preferences : true;
      }
      if (cacheToggle) {
        cacheToggle.checked = consent ? consent.analytics : true;
      }

      backdrop.classList.add("show");
      backdrop.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden"; // Prevenir scroll al abrir modal
    },

    hideModal() {
      const backdrop = document.getElementById("cookieModalBackdrop");
      if (backdrop) {
        backdrop.classList.remove("show");
        backdrop.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
    },

    showToast(message) {
      let toast = document.getElementById("cookieToast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "cookieToast";
        toast.className = "cookie-toast";
        toast.innerHTML = `<i data-lucide="check-circle"></i> <span id="cookieToastMsg"></span>`;
        document.body.appendChild(toast);
        if (typeof lucide !== "undefined") lucide.createIcons({ root: toast });
      }
      const msgSpan = document.getElementById("cookieToastMsg");
      if (msgSpan) msgSpan.textContent = message;

      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 3500);
    },

    injectHTML() {
      if (document.getElementById("cookieBanner")) return;

      const cookiePolicyUrl = this.isSubPage
        ? "politica-cookies.html"
        : "pages/politica-cookies.html";

      const html = `
        <!-- Cookie Banner -->
        <div id="cookieBanner" class="cookie-banner" role="region" aria-label="Aviso de cookies" aria-hidden="true">
          <div class="cookie-banner-content">
            <div class="cookie-banner-icon">
              <i data-lucide="cookie"></i>
            </div>
            <div class="cookie-banner-text">
              <h3 class="cookie-banner-title">
                <span data-i18n="cookies.banner_title">Configuración de Privacidad y Cookies</span>
              </h3>
              <p class="cookie-banner-desc">
                <span data-i18n="cookies.banner_desc">
                  Utilizamos cookies esenciales y almacenamiento local para recordar tus preferencias (idioma, tema) y almacenar datos en caché para una navegación instantánea. Puedes aceptar todas, rechazarlas o configurar tus preferencias.
                </span>
                <a href="${cookiePolicyUrl}" class="cookie-banner-link" data-i18n="cookies.more_info_link">Leer Política de Cookies</a>.
              </p>
            </div>
          </div>
          <div class="cookie-banner-actions">
            <button type="button" id="cookieRejectBtn" class="cookie-btn cookie-btn-ghost">
              <span data-i18n="cookies.reject_all">Solo necesarias</span>
            </button>
            <button type="button" id="cookieConfigBtn" class="cookie-btn cookie-btn-secondary">
              <i data-lucide="sliders-horizontal" style="width:16px;height:16px;"></i>
              <span data-i18n="cookies.configure">Configurar</span>
            </button>
            <button type="button" id="cookieAcceptAllBtn" class="cookie-btn cookie-btn-primary">
              <i data-lucide="check" style="width:16px;height:16px;"></i>
              <span data-i18n="cookies.accept_all">Aceptar todas</span>
            </button>
          </div>
        </div>

        <!-- Cookie Settings Modal -->
        <div id="cookieModalBackdrop" class="cookie-modal-backdrop" role="dialog" aria-modal="true" aria-hidden="true">
          <div class="cookie-modal">
            <div class="cookie-modal-header">
              <div class="cookie-modal-title-wrap">
                <i data-lucide="shield-check"></i>
                <h4 class="cookie-modal-title" data-i18n="cookies.modal_title">Preferencias de Privacidad</h4>
              </div>
              <button type="button" id="cookieModalCloseBtn" class="cookie-modal-close" aria-label="Cerrar">
                <i data-lucide="x" style="width:20px;height:20px;"></i>
              </button>
            </div>
            <div class="cookie-modal-body">
              <p class="cookie-modal-desc" data-i18n="cookies.modal_desc">
                En Poke App respetamos tu privacidad. A continuación puedes personalizar qué tecnologías y datos deseas permitir almacenar en tu dispositivo. Puedes consultar más detalles en nuestra 
                <a href="${cookiePolicyUrl}" class="cookie-banner-link" data-i18n="cookies.more_info_link">Política de Cookies</a>.
              </p>

              <!-- Categoría 1: Necesarias -->
              <div class="cookie-option-card">
                <div class="cookie-option-header">
                  <div class="cookie-option-info">
                    <h5 class="cookie-option-title" data-i18n="cookies.necessary_title">Cookies Técnicas y Esenciales</h5>
                    <span class="cookie-badge-locked" data-i18n="cookies.always_active">Siempre Activas</span>
                  </div>
                  <label class="cookie-switch">
                    <input type="checkbox" checked disabled />
                    <span class="cookie-slider"></span>
                  </label>
                </div>
                <p class="cookie-option-desc" data-i18n="cookies.necessary_desc">
                  Estrictamente requeridas para la navegación segura, carga de recursos e integridad básica de la aplicación. No se pueden desactivar.
                </p>
              </div>

              <!-- Categoría 2: Preferencias -->
              <div class="cookie-option-card">
                <div class="cookie-option-header">
                  <div class="cookie-option-info">
                    <h5 class="cookie-option-title" data-i18n="cookies.preferences_title">Preferencias y Personalización</h5>
                  </div>
                  <label class="cookie-switch">
                    <input type="checkbox" id="cookiePrefToggle" checked />
                    <span class="cookie-slider"></span>
                  </label>
                </div>
                <p class="cookie-option-desc" data-i18n="cookies.preferences_desc">
                  Permiten recordar tu idioma seleccionado (Español, Inglés, etc.), el tema visual (Modo Claro/Oscuro) y las configuraciones de accesibilidad.
                </p>
              </div>

              <!-- Categoría 3: Rendimiento y Caché -->
              <div class="cookie-option-card">
                <div class="cookie-option-header">
                  <div class="cookie-option-info">
                    <h5 class="cookie-option-title" data-i18n="cookies.cache_title">Caché Local y Rendimiento</h5>
                  </div>
                  <label class="cookie-switch">
                    <input type="checkbox" id="cookieCacheToggle" checked />
                    <span class="cookie-slider"></span>
                  </label>
                </div>
                <p class="cookie-option-desc" data-i18n="cookies.cache_desc">
                  Permiten guardar información de Pokémon, cartas y movimientos en IndexedDB y almacenamiento local para navegación instantánea y menor consumo de datos.
                </p>
              </div>
            </div>
            <div class="cookie-modal-footer">
              <button type="button" id="cookieModalRejectBtn" class="cookie-btn cookie-btn-ghost">
                <span data-i18n="cookies.reject_all">Solo necesarias</span>
              </button>
              <button type="button" id="cookieModalSaveBtn" class="cookie-btn cookie-btn-secondary">
                <span data-i18n="cookies.save_preferences">Guardar preferencias</span>
              </button>
              <button type="button" id="cookieModalAcceptAllBtn" class="cookie-btn cookie-btn-primary">
                <i data-lucide="check" style="width:16px;height:16px;"></i>
                <span data-i18n="cookies.accept_all">Aceptar todas</span>
              </button>
            </div>
          </div>
        </div>
      `;

      const wrapper = document.createElement("div");
      wrapper.id = "cookieManagerContainer";
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);

      if (typeof lucide !== "undefined") {
        lucide.createIcons({ root: wrapper });
      }

      if (window.I18n && typeof window.I18n.applyTranslations === "function") {
        window.I18n.applyTranslations();
      }
    },

    bindEvents() {
      // Botón "Aceptar todas" del banner
      const acceptAllBtn = document.getElementById("cookieAcceptAllBtn");
      if (acceptAllBtn) {
        acceptAllBtn.addEventListener("click", () => {
          this.setConsent(true, true);
        });
      }

      // Botón "Rechazar no esenciales" del banner
      const rejectBtn = document.getElementById("cookieRejectBtn");
      if (rejectBtn) {
        rejectBtn.addEventListener("click", () => {
          this.setConsent(false, false);
        });
      }

      // Botón "Configurar" del banner
      const configBtn = document.getElementById("cookieConfigBtn");
      if (configBtn) {
        configBtn.addEventListener("click", () => {
          this.openModal();
        });
      }

      // Cerrar modal
      const closeBtn = document.getElementById("cookieModalCloseBtn");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          this.hideModal();
        });
      }

      // Cerrar modal al hacer clic en el backdrop fuera del modal
      const backdrop = document.getElementById("cookieModalBackdrop");
      if (backdrop) {
        backdrop.addEventListener("click", (e) => {
          if (e.target === backdrop) {
            this.hideModal();
          }
        });
      }

      // Botón guardar preferencias en el modal
      const saveBtn = document.getElementById("cookieModalSaveBtn");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          const prefToggle = document.getElementById("cookiePrefToggle");
          const cacheToggle = document.getElementById("cookieCacheToggle");
          const pref = prefToggle ? prefToggle.checked : true;
          const cache = cacheToggle ? cacheToggle.checked : true;
          this.setConsent(pref, cache);
        });
      }

      // Botón aceptar todas desde el modal
      const modalAcceptAll = document.getElementById("cookieModalAcceptAllBtn");
      if (modalAcceptAll) {
        modalAcceptAll.addEventListener("click", () => {
          this.setConsent(true, true);
        });
      }

      // Botón rechazar desde el modal
      const modalReject = document.getElementById("cookieModalRejectBtn");
      if (modalReject) {
        modalReject.addEventListener("click", () => {
          this.setConsent(false, false);
        });
      }

      // Escuchar clic en cualquier elemento con ID openCookieSettingsBtn o clase .open-cookie-settings
      document.addEventListener("click", (e) => {
        const target = e.target.closest("#openCookieSettingsBtn, .open-cookie-settings");
        if (target) {
          e.preventDefault();
          this.openModal();
        }
      });

      // Cerrar con Escape
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.hideModal();
        }
      });
    },

    init() {
      this.injectHTML();
      this.bindEvents();

      // Si no ha respondido aún, mostrar el banner tras medio segundo
      if (!this.hasAnswered()) {
        setTimeout(() => {
          this.showBanner();
        }, 500);
      }
    },
  };

  // Exponer globalmente
  window.CookieManager = CookieManager;

  // Auto-iniciar al cargar el DOM o si ya está listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => CookieManager.init());
  } else {
    CookieManager.init();
  }
})();
