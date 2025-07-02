// ===== Srh Frontend Application =====

class SrhApp {
    constructor() {
        this.API_BASE = '/api';
        this.currentTab = 'search';
        this.searchHistory = [];
        this.debounceTimer = null;
        this.currentData = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupSearchSuggestions();
        await this.loadInitialData();
        this.showApp();
    }

    // ===== App Initialization =====
    showApp() {
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            this.activateTab('search');
        }, 2000);
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.activateTab(tab);
            });
        });

        // Search functionality
        const searchForm = document.getElementById('search-form');
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performSearch();
        });

        // Search input with live suggestions
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        // Data management
        document.getElementById('add-data-btn').addEventListener('click', () => {
            this.showDataForm();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            this.showImportModal();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // Data form
        document.getElementById('data-input-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveData();
        });

        document.getElementById('cancel-form-btn').addEventListener('click', () => {
            this.hideDataForm();
        });

        // Data filters
        document.getElementById('data-search').addEventListener('input', (e) => {
            this.filterDataEntries(e.target.value);
        });

        document.getElementById('data-category-filter').addEventListener('change', (e) => {
            this.filterDataByCategory(e.target.value);
        });

        // Statistics
        document.getElementById('refresh-stats-btn').addEventListener('click', () => {
            this.loadStatistics();
        });

        // Health check
        document.getElementById('health-check').addEventListener('click', (e) => {
            e.preventDefault();
            this.performHealthCheck();
        });

        // Modal
        document.getElementById('modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });
    }

    // ===== Tab Management =====
    activateTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Show tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        if (tabName === 'data') {
            this.loadDataEntries();
            this.loadCategories();
        } else if (tabName === 'stats') {
            this.loadStatistics();
        }
    }

    // ===== Search Functionality =====
    async performSearch() {
        const query = document.getElementById('search-input').value.trim();
        const searchType = document.querySelector('input[name="searchType"]:checked').value;
        const category = document.getElementById('category-filter').value;

        if (!query) {
            this.showNotification('Bitte geben Sie einen Suchbegriff ein', 'warning');
            return;
        }

        this.showSearchLoading(true);
        const startTime = Date.now();

        try {
            const response = await this.apiRequest(`/search/${searchType}`, 'POST', {
                query,
                options: { category }
            });

            const searchTime = Date.now() - startTime;
            this.displaySearchResults(response.results, query, searchTime);
            
            // Add to search history
            this.addToSearchHistory(query, searchType, response.results.length);

        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Suche fehlgeschlagen: ' + error.message, 'error');
            this.showNoResults();
        } finally {
            this.showSearchLoading(false);
        }
    }

    displaySearchResults(results, query, searchTime) {
        const resultsContainer = document.getElementById('search-results');
        const resultsList = document.getElementById('results-list');
        const resultsCount = document.getElementById('results-count');
        const searchTimeEl = document.getElementById('search-time');
        const noResults = document.getElementById('no-results');

        if (!results || results.length === 0) {
            this.showNoResults();
            return;
        }

        // Update results info
        resultsCount.textContent = `${results.length} Ergebnis${results.length !== 1 ? 'se' : ''}`;
        searchTimeEl.textContent = `(${searchTime}ms)`;

        // Render results
        resultsList.innerHTML = '';
        results.forEach(result => {
            const resultElement = this.createResultElement(result);
            resultsList.appendChild(resultElement);
        });

        // Show results
        resultsContainer.style.display = 'block';
        noResults.style.display = 'none';
    }

    createResultElement(result) {
        const div = document.createElement('div');
        div.className = 'result-item';

        const title = result.title || result.name || 'Unbekannter Titel';
        const snippet = result.snippet || result.content || 'Kein Inhalt verfügbar';
        const source = result.source || 'Unbekannte Quelle';
        
        div.innerHTML = `
            <div class="result-title">${this.escapeHtml(title)}</div>
            <div class="result-snippet">${this.escapeHtml(snippet)}</div>
            <div class="result-meta">
                <span class="result-source">${this.escapeHtml(source)}</span>
                ${result.category ? `<span>Kategorie: ${this.escapeHtml(result.category)}</span>` : ''}
                ${result.matches ? `<span>${result.matches} Treffer</span>` : ''}
                ${result.modified ? `<span>Geändert: ${new Date(result.modified).toLocaleDateString('de-DE')}</span>` : ''}
            </div>
        `;

        return div;
    }

    showNoResults() {
        document.getElementById('search-results').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
    }

    showSearchLoading(show) {
        const searchButton = document.querySelector('.search-button');
        if (show) {
            searchButton.style.opacity = '0.6';
            searchButton.disabled = true;
        } else {
            searchButton.style.opacity = '1';
            searchButton.disabled = false;
        }
    }

    // ===== Search Suggestions =====
    setupSearchSuggestions() {
        const searchInput = document.getElementById('search-input');
        const suggestionsContainer = document.getElementById('search-suggestions');

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    handleSearchInput(value) {
        clearTimeout(this.debounceTimer);
        
        if (value.length < 2) {
            document.getElementById('search-suggestions').style.display = 'none';
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.loadSearchSuggestions(value);
        }, 300);
    }

    async loadSearchSuggestions(query) {
        try {
            const response = await this.apiRequest(`/search/suggestions?q=${encodeURIComponent(query)}`);
            this.displaySearchSuggestions(response.suggestions);
        } catch (error) {
            console.error('Suggestions error:', error);
        }
    }

    displaySearchSuggestions(suggestions) {
        const container = document.getElementById('search-suggestions');
        const list = container.querySelector('.suggestions-list');

        if (!suggestions || suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        list.innerHTML = '';
        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = suggestion;
            div.addEventListener('click', () => {
                document.getElementById('search-input').value = suggestion;
                container.style.display = 'none';
                this.performSearch();
            });
            list.appendChild(div);
        });

        container.style.display = 'block';
    }

    // ===== Data Management =====
    async loadDataEntries(page = 1) {
        try {
            const response = await this.apiRequest(`/data?page=${page}&limit=${this.itemsPerPage}`);
            this.currentData = response.data;
            this.displayDataEntries(response.data);
            this.displayDataPagination(response.pagination);
        } catch (error) {
            console.error('Data loading error:', error);
            this.showNotification('Fehler beim Laden der Daten', 'error');
        }
    }

    displayDataEntries(data) {
        const container = document.getElementById('data-entries');
        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-center">Keine Daten verfügbar</div>';
            return;
        }

        data.forEach(entry => {
            const div = this.createDataEntryElement(entry);
            container.appendChild(div);
        });
    }

    createDataEntryElement(entry) {
        const div = document.createElement('div');
        div.className = 'data-entry';

        const tags = Array.isArray(entry.tags) ? entry.tags : [];
        const tagsHtml = tags.map(tag => `<span class="meta-badge tag">${this.escapeHtml(tag)}</span>`).join('');

        div.innerHTML = `
            <div class="data-entry-header">
                <div>
                    <div class="data-entry-title">${this.escapeHtml(entry.title)}</div>
                </div>
                <div class="data-entry-actions">
                    <button class="action-btn" onclick="app.editData(${entry.id})" title="Bearbeiten">✏️</button>
                    <button class="action-btn" onclick="app.deleteDataEntry(${entry.id})" title="Löschen">🗑️</button>
                </div>
            </div>
            <div class="data-entry-content">${this.escapeHtml(entry.content.substring(0, 200))}${entry.content.length > 200 ? '...' : ''}</div>
            <div class="data-entry-meta">
                <span class="meta-badge category">${this.escapeHtml(entry.category || 'general')}</span>
                ${tagsHtml}
                <span class="meta-badge">Erstellt: ${new Date(entry.created_at).toLocaleDateString('de-DE')}</span>
            </div>
        `;

        return div;
    }

    showDataForm(data = null) {
        const form = document.getElementById('data-form');
        const title = document.getElementById('form-title');
        
        if (data) {
            title.textContent = 'Daten bearbeiten';
            document.getElementById('data-title').value = data.title;
            document.getElementById('data-content').value = data.content;
            document.getElementById('data-category').value = data.category || '';
            document.getElementById('data-tags').value = Array.isArray(data.tags) ? data.tags.join(', ') : '';
            form.dataset.editId = data.id;
        } else {
            title.textContent = 'Neue Daten hinzufügen';
            document.getElementById('data-input-form').reset();
            delete form.dataset.editId;
        }

        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
    }

    hideDataForm() {
        document.getElementById('data-form').style.display = 'none';
        document.getElementById('data-input-form').reset();
    }

    async saveData() {
        const form = document.getElementById('data-form');
        const title = document.getElementById('data-title').value.trim();
        const content = document.getElementById('data-content').value.trim();
        const category = document.getElementById('data-category').value.trim();
        const tagsInput = document.getElementById('data-tags').value.trim();

        if (!title || !content) {
            this.showNotification('Titel und Inhalt sind erforderlich', 'warning');
            return;
        }

        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        const data = { title, content, category, tags };

        try {
            const isEdit = form.dataset.editId;
            const url = isEdit ? `/data/${form.dataset.editId}` : '/data';
            const method = isEdit ? 'PUT' : 'POST';

            await this.apiRequest(url, method, data);
            
            this.showNotification(isEdit ? 'Daten erfolgreich aktualisiert' : 'Daten erfolgreich hinzugefügt', 'success');
            this.hideDataForm();
            this.loadDataEntries();
            
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Fehler beim Speichern: ' + error.message, 'error');
        }
    }

    async editData(id) {
        try {
            const entry = this.currentData.find(item => item.id === id);
            if (entry) {
                this.showDataForm(entry);
            }
        } catch (error) {
            console.error('Edit error:', error);
            this.showNotification('Fehler beim Laden der Daten', 'error');
        }
    }

    async deleteDataEntry(id) {
        if (!confirm('Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?')) {
            return;
        }

        try {
            await this.apiRequest(`/data/${id}`, 'DELETE');
            this.showNotification('Daten erfolgreich gelöscht', 'success');
            this.loadDataEntries();
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Fehler beim Löschen: ' + error.message, 'error');
        }
    }

    // ===== Import/Export =====
    showImportModal() {
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="import-data">JSON-Daten:</label>
                <textarea id="import-data" class="form-textarea" rows="10" placeholder='[{"title": "Titel", "content": "Inhalt", "category": "kategorie", "tags": ["tag1", "tag2"]}]'></textarea>
            </div>
        `;

        const modalFooter = document.getElementById('modal-footer');
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="app.closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="app.importData()">Importieren</button>
        `;

        document.getElementById('modal-title').textContent = 'Daten importieren';
        document.getElementById('modal-overlay').style.display = 'flex';
    }

    async importData() {
        const dataText = document.getElementById('import-data').value.trim();
        
        if (!dataText) {
            this.showNotification('Bitte geben Sie JSON-Daten ein', 'warning');
            return;
        }

        try {
            const data = JSON.parse(dataText);
            
            if (!Array.isArray(data)) {
                throw new Error('Daten müssen als Array bereitgestellt werden');
            }

            const response = await this.apiRequest('/data/import', 'POST', { data });
            
            this.showNotification(`${response.imported} Einträge erfolgreich importiert`, 'success');
            this.closeModal();
            this.loadDataEntries();
            
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Fehler beim Importieren: ' + error.message, 'error');
        }
    }

    async exportData() {
        try {
            const response = await fetch(`${this.API_BASE}/data/export`);
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `srh-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Daten erfolgreich exportiert', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Fehler beim Exportieren: ' + error.message, 'error');
        }
    }

    // ===== Statistics =====
    async loadStatistics() {
        try {
            const response = await this.apiRequest('/data/stats');
            this.displayStatistics(response.stats);
        } catch (error) {
            console.error('Statistics error:', error);
            this.showNotification('Fehler beim Laden der Statistiken', 'error');
        }
    }

    displayStatistics(stats) {
        document.getElementById('total-entries').textContent = stats.totalEntries || 0;
        document.getElementById('total-categories').textContent = stats.totalCategories || 0;
        document.getElementById('total-tags').textContent = stats.totalTags || 0;
        
        const lastUpdated = stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString('de-DE') : 'Nie';
        document.getElementById('last-updated').textContent = lastUpdated;

        // Simple category chart
        this.displayCategoryChart(stats.categories || {});
    }

    displayCategoryChart(categories) {
        const chartContainer = document.getElementById('category-chart');
        
        if (Object.keys(categories).length === 0) {
            chartContainer.innerHTML = '<div class="text-center text-muted">Keine Kategorien verfügbar</div>';
            return;
        }

        const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
        
        let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        for (const [category, count] of Object.entries(categories)) {
            const percentage = ((count / total) * 100).toFixed(1);
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${this.escapeHtml(category)}</span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 100px; height: 8px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: var(--primary-color);"></div>
                        </div>
                        <span style="font-size: 0.875rem; color: var(--text-secondary); min-width: 60px; text-align: right;">${count} (${percentage}%)</span>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        
        chartContainer.innerHTML = html;
    }

    // ===== Filters and Search =====
    async loadCategories() {
        try {
            const response = await this.apiRequest('/data');
            const categories = [...new Set(response.data.map(item => item.category).filter(Boolean))];
            
            this.populateCategorySelect('category-filter', categories);
            this.populateCategorySelect('data-category-filter', categories);
            
        } catch (error) {
            console.error('Categories error:', error);
        }
    }

    populateCategorySelect(selectId, categories) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        // Keep the "All categories" option
        select.innerHTML = '<option value="">Alle Kategorien</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    }

    filterDataEntries(searchTerm) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.loadDataEntries(1, searchTerm);
        }, 300);
    }

    filterDataByCategory(category) {
        this.loadDataEntries(1, null, category);
    }

    // ===== Pagination =====
    displayDataPagination(pagination) {
        const container = document.getElementById('data-pagination');
        
        if (pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        
        // Previous button
        html += `<button class="pagination-btn" ${pagination.page <= 1 ? 'disabled' : ''} onclick="app.goToPage(${pagination.page - 1})">‹ Zurück</button>`;
        
        // Page numbers
        for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
            html += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" onclick="app.goToPage(${i})">${i}</button>`;
        }
        
        // Next button
        html += `<button class="pagination-btn" ${pagination.page >= pagination.totalPages ? 'disabled' : ''} onclick="app.goToPage(${pagination.page + 1})">Weiter ›</button>`;
        
        container.innerHTML = html;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadDataEntries(page);
    }

    // ===== Modal Management =====
    closeModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    }

    // ===== Health Check =====
    async performHealthCheck() {
        try {
            const response = await this.apiRequest('/health');
            this.showNotification(`System Status: ${response.status} (${response.timestamp})`, 'success');
        } catch (error) {
            this.showNotification('System-Status konnte nicht abgerufen werden', 'error');
        }
    }

    // ===== Search History =====
    addToSearchHistory(query, type, resultsCount) {
        this.searchHistory.unshift({
            query,
            type,
            resultsCount,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 10 searches
        this.searchHistory = this.searchHistory.slice(0, 10);
    }

    // ===== Utility Functions =====
    async apiRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.API_BASE}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Network error' }));
            throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Remove on click
        notification.addEventListener('click', () => {
            notification.remove();
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ===== Initial Data Loading =====
    async loadInitialData() {
        try {
            await this.loadCategories();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }
}

// Initialize the application
const app = new SrhApp();

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    app.showNotification('Ein unerwarteter Fehler ist aufgetreten', 'error');
});

// Service worker registration (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment if you want to add service worker support
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered: ', registration))
        //     .catch(registrationError => console.log('SW registration failed: ', registrationError));
    });
}