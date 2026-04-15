/**
 * Bulbapedia Integration Component
 * Handles fetching and rendering extra data from Bulbapedia.
 */

const Bulbapedia = {
    /**
     * Initializes a Bulbapedia section in a given container.
     * @param {string} containerId - The ID of the container where the section should be rendered.
     * @param {string} query - The name of the entity to search (e.g., "Bulbasaur", "Thunderbolt").
     * @param {string} type - The type of entity (pokemon, move, ability, type, item, location).
     */
    async renderSection(containerId, query, type = 'pokemon') {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clean container
        container.innerHTML = `
            <div class="bulbapedia-section">
                <div class="bulbapedia-header">
                    <h3 class="bulbapedia-title">
                        <i data-lucide="book-open"></i> Bulbapedia Info
                    </h3>
                    <button class="bulbapedia-btn" id="btn-load-bulbapedia">
                        <i data-lucide="download"></i> <span data-i18n="bulbapedia.load">Cargar información extra</span>
                    </button>
                </div>
                <div id="bulbapedia-body" class="bulbapedia-content">
                    <p class="small text-muted" data-i18n="bulbapedia.disclaimer">
                        Información adicional extraída de Bulbapedia (en inglés).
                    </p>
                </div>
            </div>
        `;

        // Refresh icons
        if (window.lucide) lucide.createIcons();
        
        // Translate if I18n is available
        if (window.I18n) I18n.translateElement(container);

        const btn = container.querySelector('#btn-load-bulbapedia');
        btn.addEventListener('click', () => this.loadData(query, type));
    },

    async loadData(query, type) {
        const body = document.getElementById('bulbapedia-body');
        const btn = document.getElementById('btn-load-bulbapedia');
        if (!body || !btn) return;

        // Loading state
        btn.disabled = true;
        body.innerHTML = `
            <div class="bulbapedia-loader">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span class="ms-2" data-i18n="common.loading">Cargando...</span>
            </div>
        `;
        if (window.I18n) I18n.translateElement(body);

        try {
            // Determine base path for proxy.php/bulbapedia_proxy.php
            // If we are in a subfolder (like /pages/), we need ../
            const isSubpage = window.location.pathname.includes('/pages/');
            const proxyPath = isSubpage ? '../bulbapedia_proxy.php' : 'bulbapedia_proxy.php';

            const url = `${proxyPath}?query=${encodeURIComponent(query)}&type=${type}`;
            const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            const data = await window.fetchCached(url, ttl);
            
            this.renderContent(body, data);
            
            // Hide button after success
            btn.style.display = 'none';
        } catch (error) {
            console.error('Bulbapedia load error:', error);
            body.innerHTML = `
                <div class="bulbapedia-error">
                    <i data-lucide="alert-circle"></i>
                    <span data-i18n="bulbapedia.error">No se pudo cargar la información de Bulbapedia.</span>
                    <p class="small mb-0">${error.message}</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            if (window.I18n) I18n.translateElement(body);
            btn.disabled = false;
        }
    },

    renderContent(container, data) {
        let html = '';

        // Render Sections (Biology, Effect, etc.)
        if (data.sections) {
            for (const [title, text] of Object.entries(data.sections)) {
                html += `
                    <div class="bulbapedia-content-block">
                        <h4><i data-lucide="info"></i> ${title}</h4>
                        <p>${text.replace(/\n\n/g, '</p><p>')}</p>
                    </div>
                `;
            }
        }

        // Render Trivia
        if (data.trivia && data.trivia.length > 0) {
            html += `
                <div class="bulbapedia-content-block">
                    <h4><i data-lucide="help-circle"></i> Trivia / Curiosidades</h4>
                    <ul>
                        ${data.trivia.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Image rendering removed as per requirements


        if (!html) {
            html = '<p class="text-center text-muted">No se encontró contenido adicional detallado.</p>';
        }

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    }
};

window.Bulbapedia = Bulbapedia;
