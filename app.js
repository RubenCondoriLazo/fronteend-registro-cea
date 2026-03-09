const API_BASE = 'http://localhost:5000/api';
let currentUser = null;

// DOM Elements
const loginForm = document.getElementById('login-form');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const viewContainer = document.getElementById('view-container');
const menuLinks = document.querySelectorAll('#menu-list li');
const welcomeMsg = document.getElementById('welcome-msg');
const roleBadge = document.getElementById('user-role-badge');

// 1. Authentication
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            initDashboard();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('Error conectando con el servidor backend.');
    }
});

function initDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    welcomeMsg.textContent = `Bienvenido, ${currentUser.full_name}`;
    roleBadge.textContent = currentUser.role;
    renderView('home');
}

// 2. Navigation
menuLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (link.id === 'logout-btn') {
            location.reload();
            return;
        }
        menuLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        renderView(link.dataset.view);
    });
});

async function renderView(viewId) {
    viewContainer.innerHTML = '<div class="loader">Cargando módulo...</div>';
    
    if (viewId === 'home') {
        viewContainer.innerHTML = `
            <div class="glass-card fade-in">
                <h3>Resumen Académico CEA</h3>
                <p>Año Lectivo: 2026 | Días Hábiles: 200</p>
                <div class="stats-grid">
                    <div class="stat-item">Áreas: Humanística / Técnica</div>
                </div>
            </div>
        `;
    } else if (viewId === 'grades') {
        const template = document.getElementById('view-grades');
        viewContainer.innerHTML = '';
        viewContainer.appendChild(template.content.cloneNode(true));
        loadModulesForSelect();
        updateGradesTable();
    } else if (viewId === 'certify') {
        const template = document.getElementById('view-certify');
        viewContainer.innerHTML = '';
        viewContainer.appendChild(template.content.cloneNode(true));
    } else if (viewId === 'centralizer') {
        const template = document.getElementById('view-centralizer');
        viewContainer.innerHTML = '';
        viewContainer.appendChild(template.content.cloneNode(true));
        renderCentralizer();
    }
}

async function renderCentralizer() {
    const tbody = document.querySelector('#centralizer-table tbody');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/cea/centralizador`);
        const data = await res.json();
        
        tbody.innerHTML = data.map(s => `
            <tr>
                <td style="font-weight: bold; color: var(--primary-glow);">${s.rude || 'S/N'}</td>
                <td>${s.name}</td>
                <td>${s.carnet}</td>
                <td>${s.area === 'Humanistica' ? 'Humanística' : 'Técnica'}</td>
                <td><span class="score-badge">${s.average}</span></td>
                <td>${s.modules_passed} / ${s.total_modules}</td>
                <td>
                    <span class="${s.average >= 51 ? 'status-approved' : 'status-failed'}">
                        ${s.average >= 51 ? 'PROMOVIDO' : 'REITERA'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

// 3. Grades Logic
function handleAreaChange() {
    const area = document.getElementById('grade-area-id').value;
    const levelContainer = document.getElementById('level-field-container');
    const moduleSelect = document.getElementById('grade-module-id');

    if (area === 'Tecnica') {
        levelContainer.classList.remove('hidden');
        moduleSelect.innerHTML = '<option value="">-- Seleccione Nivel Primero --</option>';
    } else if (area === 'Humanistica') {
        levelContainer.classList.add('hidden');
        loadCeaModules(); // Directly load humanistic modules
    } else {
        levelContainer.classList.add('hidden');
        moduleSelect.innerHTML = '<option value="">-- Primero seleccione área --</option>';
    }
}

async function loadCeaModules() {
    const area = document.getElementById('grade-area-id').value;
    const levelId = document.getElementById('grade-level-id').value;
    const select = document.getElementById('grade-module-id');
    
    if (!area) return;
    if (area === 'Tecnica' && !levelId) return;

    try {
        let url = `${API_BASE}/cea/modules?area=${area}`;
        if (levelId) url += `&level_id=${levelId}`;
        
        const response = await fetch(url);
        const modules = await response.json();
        
        select.innerHTML = '<option value="">Seleccione Módulo / Materia</option>';
        modules.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            select.appendChild(opt);
        });
    } catch (err) { console.error(err); }
}

async function submitGrade() {
    const studentId = document.getElementById('grade-student-id').value;
    const moduleId = document.getElementById('grade-module-id').value;
    const score = document.getElementById('grade-score').value;

    if (!studentId || !score || !moduleId) return alert('Por favor, complete todos los campos.');

    try {
        const res = await fetch(`${API_BASE}/cea/grades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                module_id: moduleId,
                teacher_id: currentUser.id,
                score: score
            })
        });
        const data = await res.json();
        if (data.success) {
            alert(`✅ Nota Registrada con éxito. Estado: ${data.status}`);
            updateGradesTable();
        }
    } catch (err) { console.error(err); }
}

async function updateGradesTable() {
    const tbody = document.querySelector('#grades-table tbody');
    if (!tbody) return;
    
    try {
        const res = await fetch(`${API_BASE}/cea/grades`);
        const grades = await res.json();
        tbody.innerHTML = grades.map(g => {
            const areaLevel = g.subject_id ? 'Humanística' : `Técnica (Nivel ${g.level_id})`;
            return `
                <tr>
                    <td>Est. #${g.student_id}</td>
                    <td>${g.module_name}</td>
                    <td><span class="score-badge">${g.score}</span></td>
                    <td><span class="${g.status === 'APROBADO' ? 'status-approved' : 'status-failed'}">${g.status}</span></td>
                    <td>${areaLevel}</td>
                </tr>
            `;
        }).join('');
    } catch (err) { console.error(err); }
}

// 4. Certification Logic
async function checkCert() {
    const studentId = document.getElementById('cert-student-id').value;
    const resultDiv = document.getElementById('cert-result');
    
    try {
        const res = await fetch(`${API_BASE}/cea/report/${studentId}`);
        const data = await res.json();
        
        resultDiv.innerHTML = `
            <div class="cert-card ${data.certified ? 'cert-success' : 'cert-pending'}">
                <h4>Resultado para ID: ${studentId}</h4>
                <p>${data.message}</p>
                ${data.certified ? '<button class="btn-glow">Descargar Título PDF</button>' : ''}
            </div>
        `;
    } catch (err) { console.error(err); }
}
