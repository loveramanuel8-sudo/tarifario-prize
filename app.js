// Estado Global
let currentMode = 'ENTRADA';
let records = JSON.parse(localStorage.getItem('access_records_qr')) || [];
let savedQRs = JSON.parse(localStorage.getItem('generated_qrs_list')) || [];
let qrCurrentPage = 1;
const ITEMS_PER_PAGE = 5;
let filteredQRs = [];
let html5QrcodeScanner = null;
let lastScannedCode = null;
let lastScanTime = 0;
let areas = JSON.parse(localStorage.getItem('access_areas')) || ['Principal', 'Biblioteca', 'Comedor'];

// Referencias DOM
const btnEntrada = document.getElementById('btn-entrada');
const btnSalida = document.getElementById('btn-salida');
const timeDisplay = document.getElementById('current-time');
const recordsBody = document.getElementById('records-body');
const resultContainer = document.getElementById('last-scan-result');
const resultName = document.getElementById('result-name');
const resultTime = document.getElementById('result-time');
const resultIcon = document.querySelector('.result-icon i');

// Referencias DOM Areas
const areaSelect = document.getElementById('area-select');
const btnManageAreas = document.getElementById('btn-manage-areas');
const modalAreas = document.getElementById('modal-areas');
const closeModalAreas = document.getElementById('close-modal-areas');

// Referencias DOM Generador y Tabs
const tabScanner = document.getElementById('tab-scanner');
const tabGenerator = document.getElementById('tab-generator');
const viewScanner = document.getElementById('view-scanner');
const viewGenerator = document.getElementById('view-generator');
const btnGenerateQr = document.getElementById('btn-generate-qr');
const qrsContainer = document.getElementById('qrs-container');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    renderAreas();
    renderTable();
    renderSavedQRs();
    initScanner(); // El scanner se inicia pero se podría pausar si ocultan la vista. Se mantiene simple.

    // Eventos Áreas
    if(btnManageAreas) btnManageAreas.addEventListener('click', () => modalAreas.classList.add('show'));
    if(closeModalAreas) closeModalAreas.addEventListener('click', () => modalAreas.classList.remove('show'));
    const btnAddArea = document.getElementById('btn-add-area');
    if(btnAddArea) btnAddArea.addEventListener('click', addArea);

    // Eventos Modo Control Asistencia
    btnEntrada.addEventListener('click', () => setMode('ENTRADA'));
    btnSalida.addEventListener('click', () => setMode('SALIDA'));
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);
    document.getElementById('clear-records').addEventListener('click', clearRecords);

    // Eventos Sistema de Tabs
    tabScanner.addEventListener('click', () => switchTab('scanner'));
    tabGenerator.addEventListener('click', () => switchTab('generator'));

    // Eventos del Generador
    btnGenerateQr.addEventListener('click', createQR);
    document.getElementById('clear-qrs').addEventListener('click', clearSavedQRs);
    document.getElementById('btn-print-qrs').addEventListener('click', printAllQRs);
    document.getElementById('search-qr-input').addEventListener('input', () => {
        qrCurrentPage = 1;
        renderSavedQRs();
    });
});

// ==== SISTEMA DE PESTAÑAS ====
function switchTab(tab) {
    if(tab === 'scanner') {
        tabScanner.classList.add('active');
        tabGenerator.classList.remove('active');
        viewScanner.classList.add('active');
        viewGenerator.classList.remove('active');
    } else {
        tabGenerator.classList.add('active');
        tabScanner.classList.remove('active');
        viewGenerator.classList.add('active');
        viewScanner.classList.remove('active');
    }
}

// ==== GENERADOR DE QR ====
function compressImage(file, maxSize, callback) {
    if (!file) return callback(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            canvas.width = maxSize;
            canvas.height = maxSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
    };
}

function createQR() {
    const nameInput = document.getElementById('qr-gen-name');
    const rutInput = document.getElementById('qr-gen-rut');
    const yearInput = document.getElementById('qr-gen-year');
    
    const nameStr = nameInput.value.trim();
    const rutStr = rutInput.value.trim();
    const yearStr = yearInput.value.trim();
    const photoInput = document.getElementById('qr-gen-photo');

    if(!nameStr) return alert("Debe ingresar el nombre del estudiante.");
    
    // EVITAR DUPLICADOS DE RUT
    if(rutStr && rutStr !== "Sin ID") {
        const exist = savedQRs.some(qr => qr.rut.toLowerCase() === rutStr.toLowerCase());
        if(exist) return alert("Error: El RUT " + rutStr + " ya se encuentra registrado. No se permiten duplicados.");
    }
    
    let textData = nameStr;
    if(rutStr) textData += ` - RUT: ${rutStr}`;
    if(yearStr) textData += ` - Curso: ${yearStr}`;

    compressImage(photoInput.files[0], 150, (base64Img) => {
        const newQr = {
            id: "QR-" + Date.now(),
            name: nameStr,
            rut: rutStr || "Sin ID",
            year: yearStr || "Sin Curso",
            textData: textData,
            photo: base64Img || null,
            createdAt: new Date().toLocaleDateString('es-CL')
        };

        savedQRs.push(newQr);
        localStorage.setItem('generated_qrs_list', JSON.stringify(savedQRs));
        
        // Limpiar form
        nameInput.value = "";
        rutInput.value = "";
        yearInput.value = "";
        photoInput.value = "";
        nameInput.focus();

        renderSavedQRs();
    });
}

function renderSavedQRs() {
    const query = document.getElementById('search-qr-input').value.toLowerCase();
    
    // Filtrar por texto libre
    filteredQRs = savedQRs.filter(qr => {
        return qr.name.toLowerCase().includes(query) || 
               qr.rut.toLowerCase().includes(query) || 
               qr.year.toLowerCase().includes(query);
    }).reverse();

    const totalPages = Math.ceil(filteredQRs.length / ITEMS_PER_PAGE) || 1;
    if(qrCurrentPage > totalPages) qrCurrentPage = totalPages;

    const startIdx = (qrCurrentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filteredQRs.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    qrsContainer.innerHTML = '';
    
    if(paginatedItems.length === 0) {
        qrsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">No se encontraron resultados.</p>';
        document.getElementById('qr-pagination').innerHTML = '';
        return;
    }

    paginatedItems.forEach(item => {
        const canvas = document.createElement('canvas');
        // Renderizado a 800 pixeles para que nunca se distorsione al descargarlo
        new QRious({ element: canvas, value: item.textData, size: 800, level: 'H' });
        
        const yearDisplay = item.year && item.year !== "Sin Curso" ? item.year : "";
        const idDisplay = item.rut && item.rut !== "Sin ID" ? item.rut : "";

        const div = document.createElement('div');
        div.className = 'qr-list-item';
        
        const avatarHtml = item.photo ? `<img src="${item.photo}" class="avatar-img" alt="Avatar">` : `<div class="avatar-img" style="display:flex; align-items:center; justify-content:center; background:#eee; color:#9ca3af;"><i class="fa-solid fa-user"></i></div>`;

        div.innerHTML = `
            <div class="qr-list-info">
                ${avatarHtml}
                <div class="qr-list-details">
                    <strong>${item.name}</strong>
                    <span>${idDisplay} ${yearDisplay ? ` - ${yearDisplay}` : ''}</span>
                </div>
            </div>
            <div class="qr-actions">
                <button title="Descargar" onclick="downloadImageQR('${canvas.toDataURL()}', '${item.name}')"><i class="fa-solid fa-download"></i></button>
                <button class="btn-del-qr" title="Borrar" onclick="deleteQR('${item.id}')"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        qrsContainer.appendChild(div);
    });

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const paginationDiv = document.getElementById('qr-pagination');
    paginationDiv.innerHTML = '';
    
    if (totalPages <= 1) return;

    const btnPrev = document.createElement('button');
    btnPrev.className = 'page-btn';
    btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    btnPrev.disabled = qrCurrentPage === 1;
    btnPrev.onclick = () => { qrCurrentPage--; renderSavedQRs(); };
    paginationDiv.appendChild(btnPrev);

    for(let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === qrCurrentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { qrCurrentPage = i; renderSavedQRs(); };
        paginationDiv.appendChild(btn);
    }

    const btnNext = document.createElement('button');
    btnNext.className = 'page-btn';
    btnNext.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    btnNext.disabled = qrCurrentPage === totalPages;
    btnNext.onclick = () => { qrCurrentPage++; renderSavedQRs(); };
    paginationDiv.appendChild(btnNext);
}

function printAllQRs() {
    if(savedQRs.length === 0) return alert("No hay QRs guardados para imprimir.");
    
    const printContainer = document.getElementById('print-container');
    printContainer.innerHTML = '';
    
    savedQRs.forEach(item => {
        const canvas = document.createElement('canvas');
        // Qrs de 600 pixeles para la hoja de impresion asegurar nitidez impecable
        new QRious({ element: canvas, value: item.textData, size: 600, level: 'H' });
        
        const yearDisplay = item.year && item.year !== "Sin Curso" ? item.year : "";
        const idDisplay = item.rut && item.rut !== "Sin ID" ? item.rut : "";

        const div = document.createElement('div');
        div.className = 'qr-card-print';
        div.innerHTML = `
            <img src="${canvas.toDataURL()}" width="100" height="100">
            <h4>${item.name}</h4>
            <div>${idDisplay} ${yearDisplay ? ` - ${yearDisplay}` : ''}</div>
        `;
        printContainer.appendChild(div);
    });
    
    window.print();
}

window.downloadImageQR = function(dataUrl, name) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR_${name.replace(/\s+/g,'_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

window.deleteQR = function(id) {
    if(confirm("¿Seguro que deseas borrar este código guardado?")){
        savedQRs = savedQRs.filter(q => q.id !== id);
        localStorage.setItem('generated_qrs_list', JSON.stringify(savedQRs));
        renderSavedQRs();
    }
}

function clearSavedQRs() {
    if(savedQRs.length === 0) return;
    if(confirm("¿Borrar todos los QRs guardados?")){
        savedQRs = [];
        localStorage.setItem('generated_qrs_list', JSON.stringify(savedQRs));
        renderSavedQRs();
    }
}


// ==== CONTROL DE ACCESO (VISTA PRINCIPAL) ====

function updateClock() {
    timeDisplay.textContent = new Date().toLocaleTimeString('es-CL');
}

function setMode(mode) {
    currentMode = mode;
    if(mode === 'ENTRADA') {
        btnEntrada.classList.add('active');
        btnSalida.classList.remove('active');
        resultContainer.classList.add('hidden'); 
    } else {
        btnSalida.classList.add('active');
        btnEntrada.classList.remove('active');
        resultContainer.classList.add('hidden'); 
    }
}

function initScanner() {
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, disableFlip: false };
    html5QrcodeScanner = new Html5QrcodeScanner("reader", config, false);
    html5QrcodeScanner.render(onScanSuccess, () => {});
    
    setTimeout(() => {
        const overlay = document.querySelector('.scan-overlay');
        if(overlay) overlay.style.display = 'none';
    }, 2000);
}

function onScanSuccess(decodedText) {
    const now = Date.now();
    if (decodedText === lastScannedCode && (now - lastScanTime) < 4000) return; 
    
    lastScannedCode = decodedText;
    lastScanTime = now;
    processScan(decodedText);
}

function processScan(qrText) {
    const now = new Date();
    const selectedArea = areaSelect ? areaSelect.value : 'Principal';
    const newRecord = {
        id: "REC-" + Date.now(),
        texto: qrText.trim(),
        area: selectedArea,
        tipo: currentMode,
        hora: now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit'}),
        fecha: now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric'})
    };

    records.push(newRecord);
    localStorage.setItem('access_records_qr', JSON.stringify(records));
    
    renderTable();
    showFeedback(newRecord);
}

function showFeedback(record) {
    const feedbackIconDiv = document.getElementById('scan-feedback-icon');
    const foundQR = savedQRs.find(qr => qr.textData === record.texto);
    let extraHTML = "";

    resultContainer.classList.remove('hidden', 'error');
    
    if(currentMode === 'ENTRADA') {
        extraHTML = foundQR && foundQR.photo ? `<img src="${foundQR.photo}" class="scan-avatar">` : `<i class="fa-solid fa-arrow-right-to-bracket" style="color:var(--primary); font-size:2rem;"></i>`;
        feedbackIconDiv.innerHTML = extraHTML;
        resultContainer.style.backgroundColor = "var(--primary-light)";
        resultContainer.style.borderColor = "var(--primary)";
        feedbackIconDiv.style.color = "var(--primary)";
    } else {
        extraHTML = foundQR && foundQR.photo ? `<img src="${foundQR.photo}" class="scan-avatar">` : `<i class="fa-solid fa-arrow-right-from-bracket" style="color:var(--secondary); font-size:2rem;"></i>`;
        feedbackIconDiv.innerHTML = extraHTML;
        resultContainer.style.backgroundColor = "#DBEAFE"; 
        resultContainer.style.borderColor = "var(--secondary)";
        feedbackIconDiv.style.color = "var(--secondary)";
    }
    
    resultName.textContent = record.texto; 
    resultTime.textContent = `${record.tipo} (${record.area || 'Principal'}) a las ${record.hora}`;
    
    playBeep(currentMode === 'ENTRADA' ? 800 : 500);

    setTimeout(() => { resultContainer.classList.add('hidden'); }, 3000);
}

function playBeep(freq = 800) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.1, context.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.15); 
    } catch(e) {}
}

window.renderTable = function() {
    recordsBody.innerHTML = '';
    const displayRecords = [...records].reverse();
    if(displayRecords.length === 0) {
        recordsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #6B7280; padding: 2rem;">Aún no se han escaneado accesos.</td></tr>`;
        return;
    }
    displayRecords.forEach(record => {
        const tr = document.createElement('tr');
        const recordArea = record.area || 'Principal';
        tr.innerHTML = `
            <td><strong>${record.texto}</strong></td>
            <td>${recordArea}</td>
            <td><span class="badge ${record.tipo.toLowerCase()}">${record.tipo}</span></td>
            <td>${record.hora}</td>
            <td>${record.fecha}</td>
            <td><button class="action-btn" onclick="deleteRecord('${record.id}')" title="Eliminar este marcaje"><i class="fa-solid fa-trash-can"></i></button></td>
        `;
        recordsBody.appendChild(tr);
    });
}

window.deleteRecord = function(id) {
    if(confirm('¿Está seguro de eliminar este registro específico del historial?')) {
        records = records.filter(r => r.id !== id);
        localStorage.setItem('access_records_qr', JSON.stringify(records));
        renderTable();
    }
}

function clearRecords() {
    if(records.length === 0) return alert('La tabla ya está limpia.');
    if(confirm('ATENCIÓN: ¿Está seguro de BORRAR TODOS los registros actuales? Procure haber exportado a Excel o PDF previamente, porque esta acción no se puede deshacer.')) {
        records = [];
        localStorage.setItem('access_records_qr', JSON.stringify(records));
        renderTable();
    }
}

function exportToExcel() {
    if(records.length === 0) return alert('No hay datos suficientes para exportar a Excel.');
    const ws_data = [['Estudiante (RUT y Nombre)', 'Área', 'Sentido', 'Hora', 'Fecha']];
    records.forEach(r => ws_data.push([r.texto, r.area || 'Principal', r.tipo, r.hora, r.fecha]));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Control_Asistencia");
    XLSX.writeFile(wb, `Reporte_Acceso_QR_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.xlsx`);
}

function exportToPDF() {
    if(records.length === 0) return alert('No hay datos suficientes para exportar a PDF.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Reporte de Asistencia Institucional", 14, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString('es-CL')}`, 14, 28);
    doc.text(`Cantidad de Registros: ${records.length}`, 14, 34);

    const tableRows = [];
    records.forEach(r => tableRows.push([r.texto, r.area || 'Principal', r.tipo, r.hora, r.fecha]));

    doc.autoTable({
        head: [["Identidad (QR)", "Área", "Modo", "Hora", "Fecha"]],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [247, 248, 250] },
    });
    doc.save(`Reporte_Asistencia_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.pdf`);
}

// ==== GESTIÓN DE ÁREAS ====
function renderAreas() {
    if(areaSelect) {
        const val = areaSelect.value;
        areaSelect.innerHTML = '';
        areas.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a;
            areaSelect.appendChild(opt);
        });
        if(areas.includes(val)) areaSelect.value = val;
    }

    const areasList = document.getElementById('areas-list');
    if(areasList) {
        areasList.innerHTML = '';
        areas.forEach(a => {
            const li = document.createElement('li');
            li.className = 'area-item';
            li.innerHTML = `<span>${a}</span> <button class="btn-del-area" onclick="deleteArea('${a}')" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>`;
            areasList.appendChild(li);
        });
    }
}

function addArea() {
    const input = document.getElementById('new-area-input');
    const val = input.value.trim();
    if(!val) return;
    if(areas.includes(val)) return alert("El área ya existe.");
    areas.push(val);
    localStorage.setItem('access_areas', JSON.stringify(areas));
    input.value = '';
    renderAreas();
}

window.deleteArea = function(name) {
    if(areas.length <= 1) return alert("Debe haber al menos 1 área configurada.");
    if(confirm(`¿Eliminar el área '${name}'?`)) {
        areas = areas.filter(a => a !== name);
        localStorage.setItem('access_areas', JSON.stringify(areas));
        renderAreas();
    }
}
