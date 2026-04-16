let SERVICES = [];
let SPECIES = [];
let DESCRIPTIONS = [];

const DEFAULT_SERVICES = [
    "Recepcion",
    "Proceso",
    "Embalaje",
    "Frio",
    "Despacho",
    "Almacenaje",
    "Materiales"
];

const DEFAULT_SPECIES = [
    "Cerezos",
    "Manzanos",
    "Kiwis",
    "Arándanos",
    "Ciruelas",
    "Uva de Mesa",
    "Otra"
];

const DEFAULT_DESCRIPTIONS = [
    "General",
    "Caja 5KG",
    "Caja 2.5KG",
    "Granel",
    "Proceso Standard"
];

// Estado de la Aplicación
let budgetItems = [];
let itemIdCounter = 1;
let tariffRules = [];
let ruleIdCounter = 1;
let currentUSD = 0;
let companyInfo = {
    name: "",
    rut: "",
    contact: "",
    logo: null,
    signature: null
};
let salesChart = null;
let clientsChart = null;
let servicesChart = null;
let budgetHistory = [];
let clients = [];
let historyStartDate = "";
let historyEndDate = "";
let taxName = "IVA";
let taxPercent = 19;
let legalNotes = "Válido por 15 días. Pago al contado.";

// Variables de Estado de Navegación y Filtros
let baseCurrency = "CLP";
let historySearchQuery = "";
let historyCurrentPage = 1;
let historyItemsPerPage = 10;

// Referencias al DOM - Navegación
const navDashboard = document.getElementById('nav-dashboard');
const navBudget = document.getElementById('nav-budget');
const navConfig = document.getElementById('nav-config');
const navHistory = document.getElementById('nav-history');
const viewDashboard = document.getElementById('view-dashboard');
const viewBudget = document.getElementById('view-budget');
const viewConfig = document.getElementById('view-config');
const viewHistory = document.getElementById('view-history');

// Referencias al DOM - Presupuesto
const tbody = document.getElementById('budget-tbody');
const btnAddRow = document.getElementById('btn-add-row');
const summaryContent = document.getElementById('summary-content');
const subtotalEl = document.getElementById('subtotal-amount');
const taxEl = document.getElementById('tax-amount');
const grandTotalEl = document.getElementById('grand-total-amount');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnExportPdf = document.getElementById('btn-export-pdf');

// Referencias al DOM - Configuración Básica
const servicesTbody = document.getElementById('services-tbody');
const btnAddService = document.getElementById('btn-add-service');
const newServiceInput = document.getElementById('new-service-input');

const speciesTbody = document.getElementById('species-tbody');
const btnAddSpecies = document.getElementById('btn-add-species');
const newSpeciesInput = document.getElementById('new-species-input');

const descTbody = document.getElementById('desc-tbody');
const btnAddDesc = document.getElementById('btn-add-desc');
const newDescInput = document.getElementById('new-desc-input');

// Referencias al DOM - Tarifas
const tariffTbody = document.getElementById('tariff-tbody');
const btnAddRule = document.getElementById('btn-add-rule');
const btnClearTariffs = document.getElementById('btn-clear-tariffs');

// Función Global de Navegación
const switchView = (viewName) => {
    const views = [
        { name: 'dashboard', el: viewDashboard },
        { name: 'budget', el: viewBudget },
        { name: 'config', el: viewConfig },
        { name: 'history', el: viewHistory }
    ];

    views.forEach(v => {
        if (v.el) {
            v.el.style.display = v.name === viewName ? 'block' : 'none';
            if (v.name === viewName) {
                v.el.classList.remove('animate-view');
                void v.el.offsetWidth; // Trigger reflow
                v.el.classList.add('animate-view');
            }
        }
    });

    if (navDashboard) navDashboard.classList.toggle('active', viewName === 'dashboard');
    if (navBudget) navBudget.classList.toggle('active', viewName === 'budget');
    if (navConfig) navConfig.classList.toggle('active', viewName === 'config');
    if (navHistory) navHistory.classList.toggle('active', viewName === 'history');

    if (viewName === 'history') renderHistory();
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'config') {
        renderConfigLists();
        renderTariffTable();
        renderClients();
    }
    if (viewName === 'budget') renderTable();
};

// Inicializar la App
document.addEventListener('DOMContentLoaded', () => {
    loadLists();
    loadTariffRules();
    
    // Establecer fecha de hoy por defecto
    document.getElementById('budget-date').valueAsDate = new Date();
    
    // No agregar fila por defecto como se solicitó

    // Listeners - Navegación
    if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
    if (navBudget) navBudget.addEventListener('click', (e) => { e.preventDefault(); switchView('budget'); });
    if (navConfig) navConfig.addEventListener('click', (e) => { e.preventDefault(); switchView('config'); });
    if (navHistory) navHistory.addEventListener('click', (e) => { e.preventDefault(); switchView('history'); });

    // Listeners - Presupuestos
    if (btnAddRow) btnAddRow.addEventListener('click', addRow);
    if (btnExportExcel) btnExportExcel.addEventListener('click', () => { exportToExcel(); saveBudgetToHistory(); });
    if (btnExportPdf) btnExportPdf.addEventListener('click', () => { exportToPdf(); saveBudgetToHistory(); });

    // Listeners - Configuración Listas
    if (btnAddService) btnAddService.addEventListener('click', addService);
    if (btnAddSpecies) btnAddSpecies.addEventListener('click', addSpecies);
    if (btnAddDesc) btnAddDesc.addEventListener('click', addDesc);

    // Listeners - Configuración Tarifas
    if (btnAddRule) btnAddRule.addEventListener('click', addTariffRule);
    if (btnClearTariffs) btnClearTariffs.addEventListener('click', () => {
        if(confirm('¿Seguro que desea eliminar todas las reglas de tarifas guardadas?')) {
            tariffRules = [];
            saveTariffRules();
            renderTariffTable();
        }
    });

    fetchExchangeRate();
    initTheme();
    loadCompanyInfo();
    loadHistory();
    loadBaseCurrency();
    loadClients();
    loadTaxSettings();
    loadLegalNotes();
    checkExpirations();

    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) btnThemeToggle.addEventListener('click', toggleTheme);
    
    // Branding Listeners
    const inputLogo = document.getElementById('input-logo');
    const inputSignature = document.getElementById('input-signature');
    if (document.getElementById('company-name')) document.getElementById('company-name').addEventListener('input', (e) => updateCompanyInfo('name', e.target.value));
    if (document.getElementById('company-rut')) document.getElementById('company-rut').addEventListener('input', (e) => updateCompanyInfo('rut', e.target.value));
    if (document.getElementById('company-contact')) document.getElementById('company-contact').addEventListener('input', (e) => updateCompanyInfo('contact', e.target.value));
    if (inputLogo) inputLogo.addEventListener('change', handleLogoUpload);
    if (inputSignature) inputSignature.addEventListener('change', handleSignatureUpload);

    // Currency Listener
    const baseCurrencySelect = document.getElementById('base-currency-select');
    if (baseCurrencySelect) baseCurrencySelect.addEventListener('change', (e) => {
        baseCurrency = e.target.value;
        localStorage.setItem('protarifas_base_currency', baseCurrency);
        renderTable(); 
        updateSummary();
    });

    // History Listeners
    const historySearch = document.getElementById('history-search');
    const historyDateFrom = document.getElementById('history-date-from');
    const historyDateTo = document.getElementById('history-date-to');
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');

    if (historySearch) historySearch.addEventListener('input', (e) => {
        historySearchQuery = e.target.value.toLowerCase();
        historyCurrentPage = 1;
        renderHistory();
    });

    if (historyDateFrom) historyDateFrom.addEventListener('change', (e) => {
        historyStartDate = e.target.value;
        historyCurrentPage = 1;
        renderHistory();
    });

    if (historyDateTo) historyDateTo.addEventListener('change', (e) => {
        historyEndDate = e.target.value;
        historyCurrentPage = 1;
        renderHistory();
    });

    if (btnPrevPage) btnPrevPage.addEventListener('click', () => {
        if (historyCurrentPage > 1) {
            historyCurrentPage--;
            renderHistory();
        }
    });

    if (btnNextPage) btnNextPage.addEventListener('click', () => {
        const filtered = budgetHistory.filter(h => h.client.toLowerCase().includes(historySearchQuery));
        const totalPages = Math.ceil(filtered.length / historyItemsPerPage);
        if (historyCurrentPage < totalPages) {
            historyCurrentPage++;
            renderHistory();
        }
    });

    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) btnClearHistory.addEventListener('click', clearHistory);

    // New Budget Listener
    const btnNewBudget = document.getElementById('btn-new-budget');
    if (btnNewBudget) btnNewBudget.addEventListener('click', newBudget);

    // Backup Listeners
    const btnExportBackup = document.getElementById('btn-export-backup');
    const inputImportBackup = document.getElementById('input-import-backup');
    if (btnExportBackup) btnExportBackup.addEventListener('click', exportUserData);
    if (inputImportBackup) inputImportBackup.addEventListener('change', importUserData);

    // Global History Export
    const btnExportAllHistory = document.getElementById('btn-export-all-history');
    const btnExportHistoryPdf = document.getElementById('btn-export-history-pdf');
    if (btnExportAllHistory) btnExportAllHistory.addEventListener('click', exportAllHistoryToExcel);
    if (btnExportHistoryPdf) btnExportHistoryPdf.addEventListener('click', exportHistoryToPdf);

    // v4.0 New Listeners
    const taxNameInput = document.getElementById('tax-name');
    const taxPercentInput = document.getElementById('tax-percent');
    const legalNotesInput = document.getElementById('legal-notes');
    const btnAddClient = document.getElementById('btn-add-client');
    const inputImportRules = document.getElementById('input-import-rules');

    if (taxNameInput) taxNameInput.addEventListener('input', (e) => { taxName = e.target.value; saveTaxSettings(); updateSummary(); });
    if (taxPercentInput) taxPercentInput.addEventListener('input', (e) => { taxPercent = parseFloat(e.target.value) || 0; saveTaxSettings(); updateSummary(); });
    if (legalNotesInput) legalNotesInput.addEventListener('input', (e) => { legalNotes = e.target.value; saveLegalNotes(); });
    if (btnAddClient) btnAddClient.addEventListener('click', addClient);
    if (inputImportRules) inputImportRules.addEventListener('change', importRulesFromExcel);
    if (inputImportRules) inputImportRules.addEventListener('change', importRulesFromExcel);
});

// ----------------------------------------------------
// BRANDING / EMPRESA
// ----------------------------------------------------

function loadCompanyInfo() {
    const saved = localStorage.getItem('protarifas_company');
    if (saved) {
        companyInfo = JSON.parse(saved);
        document.getElementById('company-name').value = companyInfo.name || "";
        document.getElementById('company-rut').value = companyInfo.rut || "";
        document.getElementById('company-contact').value = companyInfo.contact || "";
        if (companyInfo.logo) {
            updateLogoPreview(companyInfo.logo);
        }
        if (companyInfo.signature) {
            updateSignaturePreview(companyInfo.signature);
        }
    }
}

function handleSignatureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        companyInfo.signature = event.target.result;
        updateSignaturePreview(companyInfo.signature);
        saveCompanyInfo();
    };
    reader.readAsDataURL(file);
}

function updateSignaturePreview(dataUrl) {
    const preview = document.getElementById('signature-preview');
    if (preview) {
        preview.innerHTML = `<img src="${dataUrl}" style="max-height: 100%; max-width: 100%;">`;
    }
}

function updateCompanyInfo(field, value) {
    companyInfo[field] = value;
    localStorage.setItem('protarifas_company', JSON.stringify(companyInfo));
}

function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const base64 = event.target.result;
        companyInfo.logo = base64;
        updateLogoPreview(base64);
        localStorage.setItem('protarifas_company', JSON.stringify(companyInfo));
    };
    reader.readAsDataURL(file);
}

function updateLogoPreview(src) {
    const preview = document.getElementById('logo-preview');
    preview.innerHTML = `<img src="${src}" alt="Logo preview">`;
}

function loadBaseCurrency() {
    const saved = localStorage.getItem('protarifas_base_currency');
    if (saved) {
        baseCurrency = saved;
        document.getElementById('base-currency-select').value = baseCurrency;
    }
}

// ----------------------------------------------------
// DÓLAR Y TEMA
// ----------------------------------------------------

async function fetchExchangeRate() {
    const usdValueEl = document.getElementById('usd-rate-value');
    try {
        const response = await fetch('https://mindicador.cl/api/dolar');
        const data = await response.json();
        if (data && data.serie && data.serie[0]) {
            currentUSD = data.serie[0].valor;
            usdValueEl.innerText = `USD: $${currentUSD.toLocaleString('es-CL')}`;
        }
    } catch (error) {
        console.error('Error fetching USD rate:', error);
        usdValueEl.innerText = 'Dólar no disp.';
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('protarifas_theme') || 'light-mode';
    const body = document.getElementById('app-body');
    const icon = document.querySelector('#btn-theme-toggle i');
    
    body.className = savedTheme;
    updateThemeIcon(savedTheme, icon);
}

function toggleTheme() {
    const body = document.getElementById('app-body');
    const icon = document.querySelector('#btn-theme-toggle i');
    const newTheme = body.classList.contains('light-mode') ? 'dark-mode' : 'light-mode';
    
    body.className = newTheme;
    localStorage.setItem('protarifas_theme', newTheme);
    updateThemeIcon(newTheme, icon);
}

function updateThemeIcon(theme, icon) {
    if (theme === 'dark-mode') {
        icon.className = 'ph ph-sun';
    } else {
        icon.className = 'ph ph-moon';
    }
}


// ----------------------------------------------------
// HISTORIAL DE PRESUPUESTOS
// ----------------------------------------------------

function loadHistory() {
    const saved = localStorage.getItem('protarifas_history');
    if (saved) {
        budgetHistory = JSON.parse(saved);
    }
}

function saveBudgetToHistory() {
    const clientName = document.getElementById('client-name').value || "Cliente Sin Nombre";
    const date = document.getElementById('budget-date').value;
    
    const globalTotal = budgetItems.reduce((acc, item) => acc + item.total, 0);
    const tax = globalTotal * 0.19;
    const finalTotal = globalTotal + tax;

    const historyEntry = {
        id: Date.now(),
        date: date,
        client: clientName,
        total: finalTotal,
        status: 'enviado', // Estado inicial por defecto
        items: [...budgetItems]
    };

    budgetHistory.unshift(historyEntry);
    localStorage.setItem('protarifas_history', JSON.stringify(budgetHistory));
}

function updateBudgetStatus(id, newStatus) {
    const budget = budgetHistory.find(b => b.id === id);
    if (budget) {
        budget.status = newStatus;
        localStorage.setItem('protarifas_history', JSON.stringify(budgetHistory));
        renderHistory();
    }
}

function newBudget() {
    if (budgetItems.length > 0 && !confirm("¿Está seguro que desea iniciar un nuevo presupuesto? Se perderán los datos actuales no guardados.")) {
        return;
    }
    budgetItems = [];
    itemIdCounter = 1;
    document.getElementById('client-name').value = '';
    document.getElementById('budget-date').value = new Date().toISOString().split('T')[0];
    renderTable();
    updateSummary();
}

function renderHistory() {
    const historyTbody = document.getElementById('history-tbody');
    const paginationControls = document.getElementById('history-pagination');
    historyTbody.innerHTML = '';

    // 1. Filtrar
    const filtered = budgetHistory.filter(h => {
        const matchesClient = h.client.toLowerCase().includes(historySearchQuery);
        const matchesFrom = !historyStartDate || h.date >= historyStartDate;
        const matchesTo = !historyEndDate || h.date <= historyEndDate;
        return matchesClient && matchesFrom && matchesTo;
    });

    if (filtered.length === 0) {
        historyTbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 30px; color: #6b7280;">No se encontraron resultados para los filtros aplicados.</td></tr>`;
        paginationControls.style.display = 'none';
        return;
    }

    // 2. Paginar
    const totalPages = Math.ceil(filtered.length / historyItemsPerPage);
    if (historyCurrentPage > totalPages) historyCurrentPage = totalPages || 1;
    
    const start = (historyCurrentPage - 1) * historyItemsPerPage;
    const end = start + historyItemsPerPage;
    const paginatedItems = filtered.slice(start, end);

    // 3. Renderizar filas
    paginatedItems.forEach((entry, index) => {
        const tr = document.createElement('tr');
        tr.classList.add('animate-row');
        tr.style.animationDelay = `${index * 0.05}s`;
        tr.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.client}</td>
            <td>${formatCurrency(entry.total)}</td>
            <td class="text-center">
                <span class="status-badge status-${entry.status || 'draft'}">
                    <select class="status-select" onchange="updateBudgetStatus(${entry.id}, this.value)">
                        <option value="enviado" ${entry.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                        <option value="aprobado" ${entry.status === 'aprobado' ? 'selected' : ''}>Aprobado</option>
                        <option value="vencido" ${entry.status === 'vencido' ? 'selected' : ''}>Vencido</option>
                    </select>
                </span>
            </td>
            <td class="text-center">
                <button class="btn btn-outline btn-sm" onclick="exportHistoryEntryToPdf(${entry.id})" title="Exportar PDF" style="border-color: #ef4444; color: #ef4444;">
                    <i class="ph ph-file-pdf"></i>
                </button>
                <button class="btn btn-outline btn-sm" onclick="sendBudgetByEmailFromHistory(${entry.id})" title="Enviar por Correo" style="border-color: #6366f1; color: #6366f1;">
                    <i class="ph ph-envelope"></i>
                </button>
                <button class="btn btn-outline btn-sm" onclick="loadBudgetFromHistory(${entry.id})" title="Cargar / Editar">
                    <i class="ph ph-folder-open"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteHistoryEntry(${entry.id})" title="Eliminar">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        historyTbody.appendChild(tr);
    });

    // 4. Actualizar controles de paginación
    paginationControls.style.display = filtered.length > historyItemsPerPage ? 'flex' : 'none';
    document.getElementById('page-indicator').innerText = `Página ${historyCurrentPage} de ${totalPages}`;
    document.getElementById('btn-prev-page').disabled = historyCurrentPage === 1;
    document.getElementById('btn-next-page').disabled = historyCurrentPage === totalPages;
}

window.loadBudgetFromHistory = function(id) {
    const entry = budgetHistory.find(h => h.id === id);
    if (!entry) return;

    if (confirm(`¿Desea cargar el presupuesto de "${entry.client}"? Se perderán los datos actuales no guardados.`)) {
        budgetItems = [...entry.items];
        document.getElementById('client-name').value = entry.client;
        document.getElementById('budget-date').value = entry.date;
        
        // El ID máximo debe actualizarse
        itemIdCounter = budgetItems.length > 0 ? Math.max(...budgetItems.map(i => i.id)) + 1 : 1;
        
        renderTable();
        switchView('budget');
    }
};

window.deleteHistoryEntry = function(id) {
    if (confirm('¿Seguro que desea eliminar esta entrada?')) {
        budgetHistory = budgetHistory.filter(h => h.id !== id);
        localStorage.setItem('protarifas_history', JSON.stringify(budgetHistory));
        renderHistory();
    }
};

function clearHistory() {
    if (confirm('¿Seguro que desea borrar TODO el historial?')) {
        budgetHistory = [];
        localStorage.setItem('protarifas_history', JSON.stringify(budgetHistory));
        renderHistory();
    }
}

// ----------------------------------------------------
// LÓGICA DE CONFIGURACIÓN DE LISTAS (SERVICIOS/ESPECIES)
// ----------------------------------------------------

function loadLists() {
    const savedServices = localStorage.getItem('protarifas_services');
    SERVICES = savedServices ? JSON.parse(savedServices) : [...DEFAULT_SERVICES];

    const savedSpecies = localStorage.getItem('protarifas_species');
    SPECIES = savedSpecies ? JSON.parse(savedSpecies) : [...DEFAULT_SPECIES];

    const savedDesc = localStorage.getItem('protarifas_desc');
    DESCRIPTIONS = savedDesc ? JSON.parse(savedDesc) : [...DEFAULT_DESCRIPTIONS];
}

function saveLists() {
    localStorage.setItem('protarifas_services', JSON.stringify(SERVICES));
    localStorage.setItem('protarifas_species', JSON.stringify(SPECIES));
    localStorage.setItem('protarifas_desc', JSON.stringify(DESCRIPTIONS));
}

function addService() {
    const val = newServiceInput.value.trim();
    if (val && !SERVICES.includes(val)) {
        SERVICES.push(val);
        newServiceInput.value = '';
        saveLists();
        renderConfigLists();
        renderTable(); 
        renderTariffTable();
    }
}

window.removeService = function(val) {
    SERVICES = SERVICES.filter(s => s !== val);
    saveLists();
    renderConfigLists();
    renderTable();
    renderTariffTable();
};

function addSpecies() {
    const val = newSpeciesInput.value.trim();
    if (val && !SPECIES.includes(val)) {
        SPECIES.push(val);
        newSpeciesInput.value = '';
        saveLists();
        renderConfigLists();
        renderTable();
        renderTariffTable();
    }
}

window.removeSpecies = function(val) {
    SPECIES = SPECIES.filter(s => s !== val);
    saveLists();
    renderConfigLists();
    renderTable();
    renderTariffTable();
};

function addDesc() {
    const val = newDescInput.value.trim();
    if (val && !DESCRIPTIONS.includes(val)) {
        DESCRIPTIONS.push(val);
        newDescInput.value = '';
        saveLists();
        renderConfigLists();
        renderTable();
        renderTariffTable();
    }
}

window.removeDesc = function(val) {
    DESCRIPTIONS = DESCRIPTIONS.filter(s => s !== val);
    saveLists();
    renderConfigLists();
    renderTable();
    renderTariffTable();
};

function renderConfigLists() {
    // Servicios
    servicesTbody.innerHTML = '';
    SERVICES.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s}</td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm" onclick="removeService('${s}')" title="Eliminar">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        servicesTbody.appendChild(tr);
    });

    // Especies
    speciesTbody.innerHTML = '';
    SPECIES.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s}</td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm" onclick="removeSpecies('${s}')" title="Eliminar">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        speciesTbody.appendChild(tr);
    });

    // Descripciones
    descTbody.innerHTML = '';
    DESCRIPTIONS.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s}</td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm" onclick="removeDesc('${s}')" title="Eliminar">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        descTbody.appendChild(tr);
    });
}

// ----------------------------------------------------
// LÓGICA DE CONFIGURACIÓN DE TARIFAS
// ----------------------------------------------------

function loadTariffRules() {
    const data = localStorage.getItem('protarifas_rules');
    if (data) {
        tariffRules = JSON.parse(data);
        ruleIdCounter = tariffRules.length > 0 ? Math.max(...tariffRules.map(r => r.id)) + 1 : 1;
    }
}

function saveTariffRules() {
    localStorage.setItem('protarifas_rules', JSON.stringify(tariffRules));
}

function addTariffRule() {
    const newRule = {
        id: ruleIdCounter++,
        service: SERVICES[0] || "",
        species: SPECIES[0] || "",
        description: DESCRIPTIONS[0] || "",
        price: 0
    };
    tariffRules.push(newRule);
    saveTariffRules();
    renderTariffTable();
}

window.removeTariffRule = function(id) {
    tariffRules = tariffRules.filter(r => r.id !== id);
    saveTariffRules();
    renderTariffTable();
};

window.updateTariffRule = function(id, field, value) {
    const rule = tariffRules.find(r => r.id === id);
    if (!rule) return;
    
    if (field === 'price') {
        rule[field] = parseFloat(value) || 0;
    } else {
        rule[field] = value;
    }
    saveTariffRules();
};

function renderTariffTable() {
    tariffTbody.innerHTML = '';
    
    if (tariffRules.length === 0) {
        tariffTbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 30px; color: #6b7280;">No hay reglas de tarifas. Haga clic en "Nueva Regla".</td></tr>`;
        return;
    }

    tariffRules.forEach((rule, index) => {
        const tr = document.createElement('tr');
        tr.classList.add('animate-row');
        tr.style.animationDelay = `${index * 0.05}s`;
        tr.innerHTML = `
            <td>
                <select class="form-control" onchange="updateTariffRule(${rule.id}, 'service', this.value)">
                    ${createSelectOptions(SERVICES, rule.service)}
                </select>
            </td>
            <td>
                <select class="form-control" onchange="updateTariffRule(${rule.id}, 'species', this.value)">
                    ${createSelectOptions(SPECIES, rule.species)}
                </select>
            </td>
            <td>
                <select class="form-control" onchange="updateTariffRule(${rule.id}, 'description', this.value)">
                    ${createSelectOptions(DESCRIPTIONS, rule.description)}
                </select>
            </td>
            <td>
                <input type="number" class="form-control price-input" min="0" step="0.01" value="${rule.price}" 
                       onchange="updateTariffRule(${rule.id}, 'price', this.value)">
            </td>
            <td class="text-center">
                <button class="btn btn-danger btn-icon" onclick="removeTariffRule(${rule.id})" title="Eliminar regla">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tariffTbody.appendChild(tr);
    });
}

// Obtener descripciones válidas según reglas tarifarias para un servicio y especie
const getValidDescriptions = (service, species) => {
    const validRules = tariffRules.filter(r => r.service === service && r.species === species);
    // Retornar lista de descripciones únicas
    return [...new Set(validRules.map(r => r.description))];
};

function applyTariffRuleIfMatch(item) {
    // Buscar si hay una regla que coincide con servicio y especie formados
    const validRules = tariffRules.filter(r => r.service === item.service && r.species === item.species);
    
    if (validRules.length > 0) {
        // Por defecto tomar la primera regla disponible para esa combinación
        const matchedRule = validRules.find(r => r.description === item.description) || validRules[0];
        item.description = matchedRule.description;
        item.price = matchedRule.price;
        item.total = item.quantity * item.price;
    } else {
        // Si no hay reglas, dejar vacío o marcar error según preferencia del usuario
        item.description = "";
        item.price = 0;
        item.total = 0;
    }
}

// Agregar Fila
function addRow() {
    const id = itemIdCounter++;
    
    // Item por defecto
    const newItem = {
        id: id,
        service: SERVICES[0] || "",
        species: SPECIES[0] || "",
        description: DESCRIPTIONS[0] || "",
        quantity: 1,
        price: 0,
        total: 0
    };
    
    applyTariffRuleIfMatch(newItem);
    budgetItems.push(newItem);
    renderTable();
}

// Eliminar Fila
function removeRow(id) {
    budgetItems = budgetItems.filter(item => item.id !== id);
    renderTable();
}

// Renderizar la tabla principal
function renderTable() {
    tbody.innerHTML = '';
    
    if (budgetItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 30px; color: #6b7280;">No hay servicios agregados. Haga clic en "Añadir Fila".</td></tr>`;
        updateSummary();
        return;
    }

    budgetItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.classList.add('animate-row');
        tr.style.animationDelay = `${index * 0.05}s`;
        tr.innerHTML = `
            <td>
                <select class="form-control" onchange="updateItem(${item.id}, 'service', this.value)">
                    ${createSelectOptions(SERVICES, item.service)}
                </select>
            </td>
            <td>
                <select class="form-control" onchange="updateItem(${item.id}, 'species', this.value)">
                    ${createSelectOptions(SPECIES, item.species)}
                </select>
            </td>
            <td>
                <select class="form-control" onchange="updateItem(${item.id}, 'description', this.value)">
                    ${createSelectOptions(getValidDescriptions(item.service, item.species), item.description)}
                </select>
            </td>
            <td>
                <input type="number" class="form-control qty-input" min="1" step="0.01" value="${item.quantity}" 
                       onchange="updateItem(${item.id}, 'quantity', this.value)">
            </td>
            <td>
                <input type="number" class="form-control price-input" min="0" step="0.01" value="${item.price}" 
                       readonly style="background-color: var(--color-bg-muted); cursor: not-allowed; opacity: 0.8;" 
                       title="El precio se asigna automáticamente según las reglas en Configuración">
            </td>
            <td style="font-weight: 600;">
                ${formatCurrency(item.total)}
            </td>
            <td class="text-center">
                <button class="btn btn-danger btn-icon" onclick="removeRow(${item.id})" title="Eliminar fila">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateSummary();
}

// Actualizar un ítem
// Se expone al modo global para el HTML incrustado
window.updateItem = function(id, field, value) {
    const item = budgetItems.find(i => i.id === id);
    if (!item) return;

    if (field === 'quantity' || field === 'price') {
        item[field] = parseFloat(value) || 0;
        item.total = item.quantity * item.price;
    } else {
        item[field] = value;
        // Si cambia servicio, especie o descripción (ahora restrictivo), actualizar precio y reglas
        if (field === 'service' || field === 'species' || field === 'description') {
            applyTariffRuleIfMatch(item);
        }
    }
    
    renderTable();
};

window.removeRow = removeRow;

// Actualizar el Resumen y Totales
function updateSummary() {
    if (budgetItems.length === 0) {
        summaryContent.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-tray"></i>
                <p>Agregue servicios para ver el resumen interactivo.</p>
            </div>`;
        subtotalEl.innerText = formatCurrency(0);
        taxEl.innerText = formatCurrency(0);
        grandTotalEl.innerText = formatCurrency(0);
        
        const totalUSDEl = document.getElementById('total-usd-amount');
        if (totalUSDEl) totalUSDEl.innerText = formatAltCurrency(0);
        
        return;
    }

    // Agrupar por Servicio
    const grouped = {};
    let globalTotal = 0;

    budgetItems.forEach(item => {
        if (!grouped[item.service]) {
            grouped[item.service] = { items: [], subtotal: 0 };
        }
        grouped[item.service].items.push(item);
        grouped[item.service].subtotal += item.total;
        globalTotal += item.total;
    });

    // Render HTML del resumen
    let html = '';
    for (const [serviceName, data] of Object.entries(grouped)) {
        html += `<div class="summary-group">
                    <div class="group-title">${serviceName.toUpperCase()}</div>`;
        
        data.items.forEach(i => {
            const desc = i.description ? ` (${i.description})` : '';
            html += `<div class="group-row">
                        <span>${i.species}${desc} x${i.quantity}</span>
                        <span>${formatCurrency(i.total)}</span>
                     </div>`;
        });
        
        html += `<div class="group-subtotal">
                    <span>Subtotal ${serviceName}</span>
                    <span>${formatCurrency(data.subtotal)}</span>
                 </div>
                 </div>`;
    }

    summaryContent.innerHTML = html;

    // Calcular Impuestos y Total
    const taxValue = globalTotal * (taxPercent / 100);
    const grandTotal = globalTotal + taxValue;

    document.getElementById('tax-label').innerText = `${taxName} (${taxPercent}%):`;
    subtotalEl.innerText = formatCurrency(globalTotal);
    taxEl.innerText = formatCurrency(taxValue);
    const grandTotalLabelEl = document.getElementById('grand-total-label');
    if (baseCurrency === "USD") {
        grandTotalLabelEl.innerText = "Total a Pagar en Dólares";
    } else {
        grandTotalLabelEl.innerText = "Total a Pagar en Pesos";
    }
    grandTotalEl.innerText = formatCurrency(grandTotal);

    // Actualizar Moneda Alternativa
    const totalUSDEl = document.getElementById('total-usd-amount');
    const labelAltEl = document.querySelector('.alt-currency .total-label');
    
    if (currentUSD > 0) {
        if (baseCurrency === "CLP") {
            const totalUSD = grandTotal / currentUSD;
            labelAltEl.innerText = "Equivalente Aproximado (USD)";
            totalUSDEl.innerText = formatAltCurrency(totalUSD);
        } else {
            const totalCLP = grandTotal * currentUSD;
            labelAltEl.innerText = "Equivalente Aproximado (CLP)";
            totalUSDEl.innerText = formatAltCurrency(totalCLP);
        }
    } else {
        totalUSDEl.innerText = "Esperando tasa...";
    }
}

// Exportar a Excel usando SheetJS (XLSX)
function exportToExcel() {
    if (budgetItems.length === 0) {
        alert("Agregue servicios al presupuesto para exportar.");
        return;
    }

    const clientName = document.getElementById('client-name').value || "Cliente_Sin_Nombre";
    const date = document.getElementById('budget-date').value;

    // Aplanar los datos para Excel
    const dataForExcel = budgetItems.map(item => ({
        "Servicio": item.service,
        "Especie": item.species,
        "Descripción/Variedad": item.description,
        "Cantidad": item.quantity,
        "Precio Unitario": item.price,
        "Total Fila": item.total
    }));

    // Obtener los totales agrupados por servicio también? Podría ir en otra hoja.
    
    // Crear hoja
    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Presupuesto Detalles");

    // Guardar
    XLSX.writeFile(wb, `Presupuesto_${clientName.replace(/\s+/g, '_')}_${date}.xlsx`);
}

// Exportar a PDF usando jsPDF y autoTable
function exportToPdf() {
    const clientName = document.getElementById('client-name').value || "Cliente Sin Nombre";
    const date = document.getElementById('budget-date').value;
    generateBudgetPdf(clientName, date, budgetItems);
}

function exportHistoryEntryToPdf(id) {
    const entry = budgetHistory.find(h => h.id === id);
    if (!entry) return;
    generateBudgetPdf(entry.client, entry.date, entry.items);
}

function generateBudgetPdf(clientName, date, items) {
    if (!items || items.length === 0) {
        alert("No hay servicios para exportar.");
        return;
    }

    const clientData = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- HEADER CORPORATIVO ---
    // Fondo superior
    doc.setFillColor(16, 185, 129); // Verde primario
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Logo y Nombre de Empresa
    let textX = 14;
    if (companyInfo.logo) {
        try {
            doc.addImage(companyInfo.logo, 'PNG', 14, 5, 25, 25);
            textX = 45;
        } catch (e) { console.error("Error drawing logo on PDF", e); }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(companyInfo.name || "", textX, 18);
    
    // Info Empresa debajo del nombre
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const companySub = companyInfo.rut ? `RUT: ${companyInfo.rut}` : "";
    const companyAddr = companyInfo.contact ? ` | ${companyInfo.contact}` : "";
    doc.text(companySub + companyAddr, textX, 26);

    // Subtítulo de tipo de documento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("COTIZACIÓN DE SERVICIOS", pageWidth - 14, 18, { align: "right" });

    // --- SECCIÓN DE DETALLES DEL CLIENTE ---
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Emitido para:", 14, 45);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Cliente: ${clientName}`, 14, 51);
    
    // Si el cliente existe en el directorio, mostrar más info
    if (clientData) {
        doc.setFontSize(9);
        doc.setTextColor(112, 114, 128); // Gris
        let offset = 57;
        if (clientData.rut) {
            doc.text(`RUT: ${clientData.rut}`, 14, offset);
            offset += 5;
        }
        if (clientData.address) {
            doc.text(`Dirección: ${clientData.address}`, 14, offset);
            offset += 5;
        }
        if (clientData.phone) {
            doc.text(`Teléfono: ${clientData.phone}`, 14, offset);
            offset += 5;
        }
        if (clientData.email) {
            doc.text(`Correo: ${clientData.email}`, 14, offset);
        }
    }

    // Caja de info del documento a la derecha
    doc.setFontSize(10);
    doc.setDrawColor(209, 213, 219);
    doc.rect(pageWidth - 70, 42, 56, 18);
    
    doc.setFont("helvetica", "bold");
    doc.text("Fecha:", pageWidth - 66, 48);
    doc.setFont("helvetica", "normal");
    doc.text(date, pageWidth - 36, 48);

    doc.setFont("helvetica", "bold");
    doc.text("Validez:", pageWidth - 66, 56);
    doc.setFont("helvetica", "normal");
    doc.text("15 Días", pageWidth - 36, 56);

    // Tasa de cambio eliminada de aquí (se mueve a notas abajo)

    const globalTotal = items.reduce((acc, item) => acc + item.total, 0);
    const taxValue = globalTotal * (taxPercent / 100);
    const grandTotal = globalTotal + taxValue;

    const tableBody = items.map(item => [
        item.service,
        item.species,
        item.description,
        item.quantity,
        formatPrice(item.price),
        formatCurrency(item.total)
    ]);

    doc.autoTable({
        startY: 68,
        head: [['Servicio', 'Especie', 'Formato / Detalle', 'Cant.', 'P. Unit', 'Total']],
        body: tableBody,
        theme: 'grid',
        margin: { left: 14, right: 14, bottom: 95 }, // Margen inferior para no solapar con totales fijos
        headStyles: { 
            fillColor: [31, 41, 55], 
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            textColor: [55, 65, 81],
            fontSize: 8, // Reducido para que quepan 25 ítems
            cellPadding: 1.5,
            valign: 'middle'
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 'auto' },
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'right', cellWidth: 25 },
            5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
        },
        didDrawPage: function (data) {
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(`Generado por ${companyInfo.name || 'Sistema de Gestión'} - Documento Automático`, 14, pageHeight - 10);
            const str = "Página " + doc.internal.getNumberOfPages();
            doc.text(str, pageWidth - 14, pageHeight - 10, { align: "right" });
        }
    });

    // --- SECCIÓN DE TOTALES FIJA AL PIE ---
    const finalY = pageHeight - 90;

    // --- SECCIÓN DE TOTALES ---
    // Usaremos un bloque sombreado a la derecha
    const boxWidth = 70;
    const boxX = pageWidth - boxWidth - 14;
    
    // Contorno y fondo del cuadro de totales
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(229, 231, 235);
    doc.rect(boxX, finalY, boxWidth, 30, 'FD');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    
    // Subtotal
    doc.text("Subtotal:", boxX + 6, finalY + 8);
    doc.text(`$ ${globalTotal.toLocaleString('es-CL')}`, boxX + boxWidth - 6, finalY + 8, { align: "right" });
    
    // IVA / TAX
    const taxLabel = `${taxName} (${taxPercent}%):`;
    doc.text(taxLabel, boxX + 6, finalY + 16);
    doc.text(`$ ${taxValue.toLocaleString('es-CL')}`, boxX + boxWidth - 6, finalY + 16, { align: "right" });
    
    // Línea separadora
    doc.setDrawColor(209, 213, 219);
    doc.line(boxX + 6, finalY + 20, boxX + boxWidth - 6, finalY + 20);

    // Total Final en Moneda Base
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // Verde primary
    
    const labelMain = baseCurrency === "USD" ? "Total a Pagar en Dólares:" : "Total a Pagar en Pesos:";
    doc.setFontSize(9); // Texto más pequeño según solicitud
    doc.text(labelMain, boxX + 6, finalY + 26);
    
    doc.setFontSize(12); // El monto sigue siendo grande para destacar
    doc.text(`${formatCurrency(grandTotal)}`, boxX + boxWidth - 6, finalY + 26, { align: "right" });

    // Total Alternativo en el PDF
    if (currentUSD > 0) {
        let altTotal, altLabel;
        if (baseCurrency === "CLP") {
            altTotal = grandTotal / currentUSD;
            altLabel = "Equiv. USD:";
            doc.text(`${formatUSD(altTotal)}`, boxX + boxWidth - 6, finalY + 34, { align: "right" });
        } else {
            altTotal = grandTotal * currentUSD;
            altLabel = "Equiv. CLP:";
            doc.text(`${formatAltCurrency(altTotal)}`, boxX + boxWidth - 6, finalY + 34, { align: "right" });
        }
        
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // Gris
        doc.text(altLabel, boxX + 6, finalY + 34);
        
        // Ajustar altura del rectángulo para la moneda dual
        doc.setDrawColor(229, 231, 235);
        doc.rect(boxX, finalY, boxWidth, 38, 'D');
    }

    // Notas Adicionales al Pie de la Página
    const notesY = pageHeight - 45;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // Gris
    doc.setFont("helvetica", "bold");
    doc.text("Términos y Condiciones:", 14, notesY);
    
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(legalNotes, pageWidth - 100); // Dar espacio para la firma
    doc.text(splitNotes, 14, notesY + 5);

    // --- FIRMA DIGITAL AL FINAL ---
    if (companyInfo.signature) {
        try {
            // Dibujar firma a la derecha de las notas
            doc.addImage(companyInfo.signature, 'PNG', pageWidth - 60, pageHeight - 55, 45, 20);
            doc.setFontSize(7);
            doc.text("Firma / Timbre Autorizado", pageWidth - 60 + 22.5, pageHeight - 32, { align: 'center' });
        } catch (e) { console.error("Error drawing signature on PDF", e); }
    }

    // Guardar
    doc.save(`Presupuesto_${clientName.replace(/\s+/g, '_')}_${date}.pdf`);
}

window.exportHistoryEntryToPdf = exportHistoryEntryToPdf;

// ----------------------------------------------------
// GESTIÓN DE CLIENTES
// ----------------------------------------------------

function loadClients() {
    const saved = localStorage.getItem('protarifas_clients');
    if (saved) {
        clients = JSON.parse(saved);
        renderClients();
        renderClientDatalist();
    }
}

function saveClients() {
    localStorage.setItem('protarifas_clients', JSON.stringify(clients));
    renderClients();
    renderClientDatalist();
}

function renderClients() {
    const tbody = document.getElementById('clients-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    clients.forEach((c, index) => {
        const tr = document.createElement('tr');
        tr.classList.add('animate-row');
        tr.style.animationDelay = `${index * 0.05}s`;
        tr.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td>${c.rut || '-'}</td>
            <td>${c.email || '-'}</td>
            <td>${c.phone || '-'}</td>
            <td style="font-size: 0.85rem; color: var(--color-text-muted);">
                ${c.address || '-'}
            </td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm" onclick="deleteClient(${index})">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderClientDatalist() {
    const datalist = document.getElementById('client-datalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    clients.forEach(c => {
        const option = document.createElement('option');
        option.value = c.name;
        datalist.appendChild(option);
    });
}

function addClient() {
    const nameInput = document.getElementById('new-client-name');
    const rutInput = document.getElementById('new-client-rut');
    const phoneInput = document.getElementById('new-client-phone');
    const emailInput = document.getElementById('new-client-email');
    const addrInput = document.getElementById('new-client-address');

    if (!nameInput.value.trim()) {
        alert("El nombre del cliente es obligatorio.");
        return;
    }

    const newClient = {
        name: nameInput.value.trim(),
        rut: rutInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        address: addrInput.value.trim()
    };

    clients.push(newClient);
    saveClients();

    // Limpiar inputs
    nameInput.value = '';
    rutInput.value = '';
    phoneInput.value = '';
    emailInput.value = '';
    addrInput.value = '';
}

window.deleteClient = function(index) {
    if (confirm("¿Seguro que desea eliminar este cliente del directorio?")) {
        clients.splice(index, 1);
        saveClients();
    }
};

// ----------------------------------------------------
// DASHBOARD & ANALYTICS (Chart.js)
// ----------------------------------------------------

function renderDashboard() {
    if (typeof Chart === 'undefined') return;

    const dashboardGrid = document.querySelector('.dashboard-grid');
    if (budgetHistory.length === 0) {
        dashboardGrid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 60px; text-align: center; color: var(--color-text-muted);">
                <i class="ph ph-chart-pie-slice" style="font-size: 4rem; opacity: 0.3; margin-bottom: 20px;"></i>
                <h2>No hay suficientes datos</h2>
                <p>Cree y guarde presupuestos para ver las estadísticas de su negocio aquí.</p>
            </div>
        `;
        return;
    }
    
    // Restaurar estructura original si había mensaje de "No hay datos"
    if (!document.getElementById('salesChart')) {
        dashboardGrid.innerHTML = `
            <section class="card stat-card">
                <div class="card-header"><h3>Resumen de Ventas (Mensual)</h3></div>
                <div class="card-body"><canvas id="salesChart"></canvas></div>
            </section>
            <section class="card stat-card">
                <div class="card-header"><h3>Top 5 Clientes</h3></div>
                <div class="card-body"><canvas id="clientsChart"></canvas></div>
            </section>
            <section class="card stat-card">
                <div class="card-header"><h3>Distribución de Servicios</h3></div>
                <div class="card-body"><canvas id="servicesChart"></canvas></div>
            </section>
        `;
    }
    // 1. Datos para Ventas Mensuales
    const salesData = {};
    budgetHistory.forEach(h => {
        const month = h.date.substring(0, 7); // YYYY-MM
        salesData[month] = (salesData[month] || 0) + h.total;
    });
    const months = Object.keys(salesData).sort();
    const totals = months.map(m => salesData[m]);

    if (salesChart) salesChart.destroy();
    salesChart = new Chart(document.getElementById('salesChart'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Ventas Totales (' + baseCurrency + ')',
                data: totals,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Top 5 Clientes
    const clientSales = {};
    budgetHistory.forEach(h => {
        clientSales[h.client] = (clientSales[h.client] || 0) + h.total;
    });
    const topClients = Object.entries(clientSales)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5);

    if (clientsChart) clientsChart.destroy();
    clientsChart = new Chart(document.getElementById('clientsChart'), {
        type: 'bar',
        data: {
            labels: topClients.map(c => c[0]),
            datasets: [{
                label: 'Monto Total',
                data: topClients.map(c => c[1]),
                backgroundColor: '#3b82f6'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
    });

    // 3. Distribución de Servicios
    const serviceCount = {};
    budgetHistory.forEach(h => {
        h.items.forEach(item => {
            serviceCount[item.service] = (serviceCount[item.service] || 0) + 1;
        });
    });

    if (servicesChart) servicesChart.destroy();
    servicesChart = new Chart(document.getElementById('servicesChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(serviceCount),
            datasets: [{
                data: Object.values(serviceCount),
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ----------------------------------------------------
// COPIA DE SEGURIDAD (Backup)
// ----------------------------------------------------

function exportUserData() {
    const data = {
        services: SERVICES,
        species: SPECIES,
        descriptions: DESCRIPTIONS,
        tariffRules: tariffRules,
        clients: clients,
        companyInfo: companyInfo,
        history: budgetHistory,
        baseCurrency: baseCurrency
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ProTarifas_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importUserData(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm("ADVERTENCIA: Importar una configuración reemplazará todos sus datos actuales. ¿Desea continuar?")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.services) localStorage.setItem('protarifas_services', JSON.stringify(data.services));
            if (data.species) localStorage.setItem('protarifas_species', JSON.stringify(data.species));
            if (data.descriptions) localStorage.setItem('protarifas_descriptions', JSON.stringify(data.descriptions));
            if (data.tariffRules) localStorage.setItem('protarifas_rules', JSON.stringify(data.tariffRules));
            if (data.clients) localStorage.setItem('protarifas_clients', JSON.stringify(data.clients));
            if (data.companyInfo) localStorage.setItem('protarifas_company', JSON.stringify(data.companyInfo));
            if (data.history) localStorage.setItem('protarifas_history', JSON.stringify(data.history));
            if (data.baseCurrency) localStorage.setItem('protarifas_base_currency', data.baseCurrency);
            
            alert("Configuración importada con éxito. La aplicación se reiniciará.");
            location.reload();
        } catch (err) {
            alert("Error al procesar el archivo. Asegúrese de que sea un respaldo válido de ProTarifas.");
        }
    };
    reader.readAsText(file);
}

// ----------------------------------------------------
// EXPORTACIÓN GLOBAL HISTORIAL
// ----------------------------------------------------

function exportAllHistoryToExcel() {
    if (budgetHistory.length === 0) {
        alert("No hay datos en el historial para exportar.");
        return;
    }

    const flattenedData = [];
    budgetHistory.forEach(entry => {
        entry.items.forEach(item => {
            flattenedData.push({
                'Fecha': entry.date,
                'Cliente': entry.client,
                'Estado': entry.status || 'Enviado',
                'Servicio': item.service,
                'Especie': item.species,
                'Descripción': item.description,
                'Cantidad': item.quantity,
                'Precio Unit': item.price,
                'Total': item.total,
                'ID Presupuesto': entry.id
            });
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Global");
    XLSX.writeFile(workbook, `Reporte_Historial_ProTarifas_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportHistoryToPdf() {
    const filtered = budgetHistory.filter(h => {
        const matchesClient = h.client.toLowerCase().includes(historySearchQuery);
        const matchesFrom = !historyStartDate || h.date >= historyStartDate;
        const matchesTo = !historyEndDate || h.date <= historyEndDate;
        return matchesClient && matchesFrom && matchesTo;
    });

    if (filtered.length === 0) {
        alert("No hay registros en la vista actual para exportar.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Corporativo del Reporte
    doc.setFillColor(31, 41, 55); // Gris oscuro professional
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    if (companyInfo.logo) {
        try { doc.addImage(companyInfo.logo, 'PNG', 14, 8, 24, 24); } catch (e) {}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE COTIZACIONES", 45, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const periodStr = (historyStartDate || historyEndDate) 
        ? `Periodo: ${historyStartDate || 'Inicio'} al ${historyEndDate || 'Hoy'}`
        : "Todos los registros guardados";
    doc.text(periodStr, 45, 28);
    doc.text(`Generado por: ${companyInfo.name || 'ProTarifas'} | Fecha: ${new Date().toLocaleDateString()}`, 45, 34);

    // Tabla de Datos
    const tableBody = filtered.map(h => [
        h.date,
        h.client,
        (h.status || 'Enviado').toUpperCase(),
        formatCurrency(h.total)
    ]);

    const globalTotalSum = filtered.reduce((acc, h) => acc + h.total, 0);

    doc.autoTable({
        startY: 50,
        head: [['Fecha', 'Cliente / Proyecto', 'Estado', 'Monto Total']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }, // Verde ProTarifas
        foot: [['', '', 'TOTAL ACUMULADO:', formatCurrency(globalTotalSum)]],
        footStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: 'bold', fontSize: 10 },
        columnStyles: {
            3: { halign: 'right' },
            2: { halign: 'center' }
        }
    });

    doc.save(`Reporte_Historial_PDF_${new Date().toISOString().split('T')[0]}.pdf`);
}

// v4.0 Settings Persistence
function saveTaxSettings() { localStorage.setItem('protarifas_tax_name', taxName); localStorage.setItem('protarifas_tax_percent', taxPercent); }
function loadTaxSettings() {
    taxName = localStorage.getItem('protarifas_tax_name') || "IVA";
    taxPercent = parseFloat(localStorage.getItem('protarifas_tax_percent')) || 19;
    document.getElementById('tax-name').value = taxName;
    document.getElementById('tax-percent').value = taxPercent;
}
function saveLegalNotes() { localStorage.setItem('protarifas_legal_notes', legalNotes); }
function loadLegalNotes() {
    legalNotes = localStorage.getItem('protarifas_legal_notes') || "Válido por 15 días. Pago al contado.";
    document.getElementById('legal-notes').value = legalNotes;
}

// v4.0 Logic Modules
function importRulesFromExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        rows.forEach(row => {
            const rule = {
                id: Date.now() + Math.random(),
                service: row['Servicio'] || '',
                species: row['Especie'] || '',
                description: row['Variedad'] || row['Descripcion'] || '',
                price: parseFloat(row['Precio'] || 0)
            };
            if (rule.service && rule.price > 0) tariffRules.push(rule);
        });
        saveRules();
        alert(`Se han importado ${rows.length} reglas de precios.`);
    };
    reader.readAsArrayBuffer(file);
}

function checkExpirations() {
    const today = new Date();
    let updated = false;
    budgetHistory.forEach(h => {
        if (h.status === 'enviado') {
            const budgetDate = new Date(h.date);
            const diffDays = Math.floor((today - budgetDate) / (1000 * 60 * 60 * 24));
            if (diffDays > 15) {
                h.status = 'vencido';
                updated = true;
            }
        }
    });
    if (updated) localStorage.setItem('protarifas_history', JSON.stringify(budgetHistory));
}

function sendBudgetByEmail(entry) {
    if (!entry.items || entry.items.length === 0) {
        alert("Agregue servicios al presupuesto para enviar por correo.");
        return;
    }

    const client = clients.find(c => c.name.toLowerCase() === entry.client.toLowerCase());
    let email = client ? client.email : '';
    
    if (!email) {
        email = prompt(`No se encontró un correo para "${entry.client}". Ingrese el correo del destinatario:`, "");
        if (!email) return; // Cancelado
    }

    const subject = encodeURIComponent(`Cotización de Servicios - ${companyInfo.name || 'ProTarifas'}`);
    const body = encodeURIComponent(`Hola ${entry.client},\n\nAdjunto enviamos la cotización solicitada con fecha ${entry.date}.\nTotal: ${formatCurrency(entry.total)}\n\nPor favor, revise el archivo PDF adjunto para más detalles (debe generarlo antes para enviarlo).\n\nAtentamente,\n${companyInfo.name || 'El equipo'}`);
    
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function sendBudgetByEmailFromHistory(id) {
    const entry = budgetHistory.find(h => h.id === id);
    if (entry) sendBudgetByEmail(entry);
}

window.sendBudgetByEmailFromHistory = sendBudgetByEmailFromHistory;

// ----------------------------------------------------
// FUNCIONES AUXILIARES (Utilidades)
// ----------------------------------------------------

function formatCurrency(val) {
    if (val === undefined || val === null || isNaN(val)) return "$ 0";
    if (baseCurrency === "USD") {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    }
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Math.round(val));
}

function formatUSD(val) {
    if (val === undefined || val === null || isNaN(val)) return "U$ 0,00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatPrice(val) {
    if (val === undefined || val === null || isNaN(val)) return "0";
    return new Intl.NumberFormat('es-CL').format(val);
}

function formatAltCurrency(val) {
    if (baseCurrency === "USD") {
        // Si base es USD, alt es CLP
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Math.round(val));
    }
    // Si base es CLP, alt es USD
    return formatUSD(val);
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL');
}

function createSelectOptions(optionsArray, selectedValue = "") {
    if (!optionsArray) return '';
    return optionsArray.map(opt => `<option value="${opt}" ${opt === selectedValue ? 'selected' : ''}>${opt}</option>`).join('');
}

function saveTariffRules() {
    localStorage.setItem('protarifas_rules', JSON.stringify(tariffRules));
}

function saveRules() { saveTariffRules(); }

function saveClients() {
    localStorage.setItem('protarifas_clients', JSON.stringify(clients));
}

function saveTaxSettings() {
    localStorage.setItem('protarifas_tax_name', taxName);
    localStorage.setItem('protarifas_tax_percent', taxPercent);
}

function saveLegalNotes() {
    localStorage.setItem('protarifas_legal_notes', legalNotes);
}

function loadTaxSettings() {
    taxName = localStorage.getItem('protarifas_tax_name') || "IVA";
    taxPercent = parseFloat(localStorage.getItem('protarifas_tax_percent')) || 19;
    const nameEl = document.getElementById('tax-name');
    const percentEl = document.getElementById('tax-percent');
    if (nameEl) nameEl.value = taxName;
    if (percentEl) percentEl.value = taxPercent;
}

function loadLegalNotes() {
    legalNotes = localStorage.getItem('protarifas_legal_notes') || "Válido por 15 días. Pago al contado.";
    const notesEl = document.getElementById('legal-notes');
    if (notesEl) notesEl.value = legalNotes;
}
