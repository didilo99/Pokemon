/**
 * Bulbapedia & Pokémon Lore Integration Component
 * Handles fetching and rendering extra encyclopedic data from Bulbapedia, WikiDex, and Pokémon Lore archives.
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

        // Render clean component layout
        container.innerHTML = `
            <div class="bulbapedia-section">
                <div class="bulbapedia-header">
                    <h3 class="bulbapedia-title">
                        <i data-lucide="book-open"></i> <span data-i18n="bulbapedia.title">Bulbapedia & Lore</span>
                    </h3>
                    <button class="bulbapedia-btn" type="button" aria-label="Cargar información">
                        <i data-lucide="download"></i> <span data-i18n="bulbapedia.load">Cargar información extra</span>
                    </button>
                </div>
                <div class="bulbapedia-content">
                    <p class="small text-muted mb-0" data-i18n="bulbapedia.disclaimer">
                        Información adicional extraída de la enciclopedia Bulbapedia / WikiDex.
                    </p>
                </div>
            </div>
        `;

        // Refresh icons
        if (window.lucide) lucide.createIcons({ root: container });
        
        // Translate if I18n is available
        if (window.I18n) I18n.translateElement(container);

        const btn = container.querySelector('.bulbapedia-btn');
        if (btn) {
            btn.onclick = () => this.loadData(container, query, type);
        }
    },

    async loadData(container, query, type) {
        if (!container) return;
        const body = container.querySelector('.bulbapedia-content');
        const btn = container.querySelector('.bulbapedia-btn');
        if (!body) return;

        // Loading state
        if (btn) btn.disabled = true;
        body.innerHTML = `
            <div class="bulbapedia-loader">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span class="ms-2" data-i18n="common.loading">Cargando datos enciclopédicos...</span>
            </div>
        `;
        if (window.I18n) I18n.translateElement(body);

        try {
            // Determine base path for bulbapedia_proxy.php
            const basePath = (window.I18n && typeof window.I18n.getBasePath === 'function')
                ? window.I18n.getBasePath()
                : (window.location.pathname.includes('/pages/') ? '../' : '');
            const proxyPath = `${basePath}bulbapedia_proxy.php`;
            const lang = (window.I18n && window.I18n.currentLang) ? window.I18n.currentLang : 'es';

            const url = `${proxyPath}?query=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}&lang=${encodeURIComponent(lang)}`;
            const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

            let data;
            if (typeof window.fetchCached === 'function') {
                data = await window.fetchCached(url, ttl);
            } else {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                data = await res.json();
            }

            if (!data || data.error) {
                throw new Error(data && data.error ? data.error : 'Sin datos disponibles');
            }
            
            this.renderContent(body, data);
            
            // Hide load button after success
            if (btn) btn.style.display = 'none';
        } catch (error) {
            console.error('Bulbapedia load error:', error);
            body.innerHTML = `
                <div class="bulbapedia-error">
                    <i data-lucide="alert-circle"></i>
                    <span data-i18n="bulbapedia.error">No se pudo cargar la información de Bulbapedia.</span>
                    <p class="small mb-0 text-muted mt-1">${error.message || ''}</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons({ root: body });
            if (window.I18n) I18n.translateElement(body);
            if (btn) btn.disabled = false;
        }
    },

    renderContent(container, data) {
        let html = '';

        // Render Sections (Biology, Effect, Evolution, Description, etc.)
        if (data.sections && typeof data.sections === 'object') {
            for (const [title, text] of Object.entries(data.sections)) {
                if (!text || !text.trim()) continue;
                
                // Icon selection based on section title
                let icon = 'info';
                const lower = title.toLowerCase();
                if (lower.includes('bio') || lower.includes('fisiolog')) icon = 'dna';
                else if (lower.includes('evol')) icon = 'git-merge';
                else if (lower.includes('efecto') || lower.includes('effect')) icon = 'zap';
                else if (lower.includes('etim')) icon = 'book';
                else if (lower.includes('curios') || lower.includes('triv')) icon = 'help-circle';
                else if (lower.includes('descrip') || lower.includes('oficial')) icon = 'file-text';

                const paragraphs = text
                    .split(/\n\n+/)
                    .map(p => p.trim())
                    .filter(Boolean)
                    .map(p => `<p>${p}</p>`)
                    .join('');

                html += `
                    <div class="bulbapedia-content-block">
                        <h4><i data-lucide="${icon}"></i> ${title}</h4>
                        <div class="bulbapedia-text">${paragraphs}</div>
                    </div>
                `;
            }
        }

        // Render Trivia / Curiosidades
        if (data.trivia && Array.isArray(data.trivia) && data.trivia.length > 0) {
            const isEs = !window.I18n || window.I18n.currentLang !== 'en';
            html += `
                <div class="bulbapedia-content-block">
                    <h4><i data-lucide="sparkles"></i> ${isEs ? 'Curiosidades & Datos' : 'Trivia & Facts'}</h4>
                    <ul>
                        ${data.trivia.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Footer with Source & Link
        const sourceName = data.source || 'Bulbapedia';
        const articleUrl = data.url || data.bulbapedia_url;
        const isEs = !window.I18n || window.I18n.currentLang !== 'en';
        const linkText = isEs ? 'Ver artículo completo' : 'Read full article';

        if (articleUrl) {
            html += `
                <div class="bulbapedia-footer">
                    <span class="bulbapedia-source">
                        <i data-lucide="book"></i> ${sourceName}
                    </span>
                    <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" class="bulbapedia-ext-link">
                        <span>${linkText}</span>
                        <i data-lucide="external-link"></i>
                    </a>
                </div>
            `;
        }

        if (!html) {
            const noDataMsg = isEs ? 'No se encontró contenido adicional detallado.' : 'No detailed extra content found.';
            html = `<p class="text-center text-muted my-3">${noDataMsg}</p>`;
        }

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons({ root: container });
    }
};

window.Bulbapedia = Bulbapedia;
