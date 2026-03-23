/* ═══════════════════════════════════════════════════════════════════════════
   WellnVIT – Application JavaScript (Phase 1 + Phase 2)
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Symptom List (loaded from server) ────────────────────────────────────────
let allSymptoms = [];
let selectedSymptoms = [];

// ── Toast Notification System ────────────────────────────────────────────────
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle'
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ── Page Navigation ──────────────────────────────────────────────────────────
let currentPage = 'home';

function showPage(pageId) {
    const activePage = document.querySelector('.page.active-page');
    if (activePage) {
        activePage.style.opacity = '0';
        activePage.style.transform = 'translateY(18px)';
        setTimeout(() => {
            activePage.classList.remove('active-page');
            const newPage = document.getElementById(pageId);
            if (newPage) {
                newPage.classList.add('active-page');
                void newPage.offsetWidth;
                newPage.style.opacity = '1';
                newPage.style.transform = 'translateY(0)';
            }
        }, 150);
    } else {
        const newPage = document.getElementById(pageId);
        if (newPage) {
            newPage.classList.add('active-page');
            newPage.style.opacity = '1';
            newPage.style.transform = 'translateY(0)';
        }
    }
    currentPage = pageId;
    updateActiveNav(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pageId === 'disease-prediction') loadPatientContext();
    if (pageId === 'dashboard') loadDashboard();
    if (pageId === 'history') loadHistory();
    updateStepper(pageId);
    closeMobileNav();

    // Auto-focus first input
    setTimeout(() => {
        const firstInput = document.querySelector(`#${pageId} input:not([type=hidden]):not([type=radio]):not([type=file])`);
        if (firstInput) firstInput.focus();
    }, 300);
}

function updateActiveNav(pageId) {
    document.querySelectorAll('#nav-menu a').forEach(link => {
        link.classList.remove('active-nav');
        const onclick = link.getAttribute('onclick') || '';
        if (onclick.includes(`'${pageId}'`)) link.classList.add('active-nav');
    });
}

function updateStepper(pageId) {
    const stepMap = { 'patient-details': 1, 'success': 1, 'disease-prediction': 2 };
    const step = stepMap[pageId];
    if (!step) return;
    document.querySelectorAll('.stepper-step').forEach((s, i) => {
        s.classList.remove('active', 'completed');
        if (i + 1 === step) s.classList.add('active');
        if (i + 1 < step) s.classList.add('completed');
    });
    document.querySelectorAll('.stepper-connector').forEach((c, i) => {
        c.classList.toggle('completed', i + 1 < step);
    });
}

// ── Handle Get Started ───────────────────────────────────────────────────────
function handleGetStarted() {
    const logoutItem = document.getElementById('logout-nav-item');
    if (logoutItem && logoutItem.style.display !== 'none') {
        showPage('patient-details');
    } else {
        showPage('login');
    }
}

// ── Login ────────────────────────────────────────────────────────────────────
function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.querySelector('#login .btn-block');

    if (!email || !password) {
        errorEl.textContent = 'Please enter both email and password';
        errorEl.style.display = 'block';
        return;
    }
    errorEl.style.display = 'none';
    btn.classList.add('loading');
    btn.disabled = true;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(res => res.json())
        .then(data => {
            btn.classList.remove('loading');
            btn.disabled = false;
            if (data.success) {
                document.getElementById('login-nav-item').style.display = 'none';
                document.getElementById('logout-nav-item').style.display = 'block';
                showLoggedInNav(true);
                showToast(`Welcome, ${data.name}!`, 'success');
                showPage('patient-details');
            } else {
                errorEl.textContent = data.message || 'Login failed';
                errorEl.style.display = 'block';
            }
        })
        .catch(() => {
            btn.classList.remove('loading');
            btn.disabled = false;
            errorEl.textContent = 'Network error. Please try again.';
            errorEl.style.display = 'block';
        });
}

function showLoggedInNav(show) {
    const dashNav = document.getElementById('dashboard-nav-item');
    const histNav = document.getElementById('history-nav-item');
    if (dashNav) dashNav.style.display = show ? 'block' : 'none';
    if (histNav) histNav.style.display = show ? 'block' : 'none';
}

// ── Logout ───────────────────────────────────────────────────────────────────
function logout() {
    fetch('/logout', { method: 'POST' })
        .then(() => { window.location.reload(); })
        .catch(console.error);
}

// ── Toggle Password Visibility ───────────────────────────────────────────────
function togglePassword() {
    const input = document.getElementById('password');
    const icon = document.querySelector('.toggle-password i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// ── Live BMI Calculation ─────────────────────────────────────────────────────
function calculateBMI() {
    const height = parseFloat(document.getElementById('patient-height').value);
    const weight = parseFloat(document.getElementById('patient-weight').value);
    const bmiDisplay = document.getElementById('bmi-display');

    if (height > 0 && weight > 0) {
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        let category = '', catClass = '';
        if (bmi < 18.5) { category = 'Underweight'; catClass = 'underweight'; }
        else if (bmi < 25) { category = 'Normal'; catClass = 'normal'; }
        else if (bmi < 30) { category = 'Overweight'; catClass = 'overweight'; }
        else { category = 'Obese'; catClass = 'obese'; }
        bmiDisplay.querySelector('.bmi-value').textContent = bmi;
        const catEl = bmiDisplay.querySelector('.bmi-category');
        catEl.textContent = category;
        catEl.className = 'bmi-category ' + catClass;
        bmiDisplay.style.display = 'block';
    } else {
        bmiDisplay.style.display = 'none';
    }
}

// ── Submit Patient Data ──────────────────────────────────────────────────────
function submitData() {
    const patientId = document.getElementById('patient-id').value.trim();
    const patientName = document.getElementById('patient-name').value.trim();
    const patientAge = document.getElementById('patient-age').value;
    const patientHeight = document.getElementById('patient-height').value;
    const patientWeight = document.getElementById('patient-weight').value;
    const genderSelected = document.querySelector('input[name="gender"]:checked');

    if (!patientId || !patientName || !patientAge || !patientHeight || !patientWeight || !genderSelected) {
        showToast('Please fill all mandatory fields', 'error');
        return;
    }
    if (patientAge < 0 || patientAge > 150) { showToast('Please enter a valid age (0–150)', 'error'); return; }
    if (patientHeight <= 0 || patientHeight > 300) { showToast('Please enter a valid height (1–300 cm)', 'error'); return; }
    if (patientWeight <= 0 || patientWeight > 500) { showToast('Please enter a valid weight (1–500 kg)', 'error'); return; }

    const btn = document.querySelector('#patient-details .btn-block');
    btn.classList.add('loading');
    btn.disabled = true;

    fetch('/save-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: patientId, name: patientName, age: patientAge,
            gender: genderSelected.value, height: patientHeight,
            weight: patientWeight,
            bp: document.getElementById('patient-bp').value.trim(),
            pulse: document.getElementById('patient-pulse').value,
            temperature: document.getElementById('patient-temp').value.trim(),
        })
    })
        .then(res => res.json())
        .then(data => {
            btn.classList.remove('loading');
            btn.disabled = false;
            if (data.success) {
                showToast('Patient data saved!', 'success');
                showPage('success');
            } else {
                showToast('Failed to save patient data.', 'error');
            }
        })
        .catch(() => {
            btn.classList.remove('loading');
            btn.disabled = false;
            showToast('Network error.', 'error');
        });
}

// ── Load Patient Context Banner ──────────────────────────────────────────────
function loadPatientContext() {
    fetch('/patient-context')
        .then(res => res.json())
        .then(data => {
            const banner = document.getElementById('patient-banner');
            if (data.has_patient && banner) {
                const p = data.patient;
                const parts = [];
                if (p.age) parts.push(`${p.age}y`);
                if (p.gender) parts.push(p.gender.charAt(0).toUpperCase());
                if (p.bmi) parts.push(`BMI ${p.bmi} (${p.bmi_category})`);
                if (p.bp) parts.push(`BP ${p.bp}`);
                banner.querySelector('.banner-text strong').textContent = `Diagnosing for: ${p.name || 'Patient'}`;
                banner.querySelector('.banner-text span').textContent = parts.join(' • ');
                banner.classList.add('visible');
            }
        })
        .catch(() => { });
}

// ── Symptom Autocomplete ─────────────────────────────────────────────────────
function initAutocomplete() {
    const input = document.getElementById('symptom-input');
    const dropdown = document.getElementById('autocomplete-dropdown');
    const chipsContainer = document.getElementById('symptom-chips');
    if (!input || !dropdown) return;

    let highlightIdx = -1;

    input.addEventListener('input', () => {
        const val = input.value.trim().toLowerCase();
        updateCharCounter();
        if (val.length < 2) { dropdown.classList.remove('open'); return; }

        const matches = allSymptoms
            .filter(s => s.includes(val) && !selectedSymptoms.includes(s))
            .slice(0, 8);

        if (matches.length === 0) { dropdown.classList.remove('open'); return; }

        highlightIdx = -1;
        dropdown.innerHTML = matches.map((s, i) => {
            const highlighted = s.replace(new RegExp(`(${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
            return `<div class="autocomplete-item" data-value="${s}" data-index="${i}">${highlighted}</div>`;
        }).join('');
        dropdown.classList.add('open');

        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => addSymptomChip(item.dataset.value));
        });
    });

    input.addEventListener('keydown', e => {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightIdx = Math.min(highlightIdx + 1, items.length - 1);
            items.forEach((it, i) => it.classList.toggle('highlighted', i === highlightIdx));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightIdx = Math.max(highlightIdx - 1, 0);
            items.forEach((it, i) => it.classList.toggle('highlighted', i === highlightIdx));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIdx >= 0 && items[highlightIdx]) {
                addSymptomChip(items[highlightIdx].dataset.value);
            } else if (input.value.trim()) {
                addSymptomChip(input.value.trim().toLowerCase());
            }
        }
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.symptom-input-area')) dropdown.classList.remove('open');
    });
}

function addSymptomChip(value) {
    if (selectedSymptoms.includes(value)) return;
    selectedSymptoms.push(value);
    renderChips();
    const input = document.getElementById('symptom-input');
    input.value = '';
    document.getElementById('autocomplete-dropdown').classList.remove('open');
    updateSymptomsTextarea();
    input.focus();
}

function removeSymptomChip(value) {
    selectedSymptoms = selectedSymptoms.filter(s => s !== value);
    renderChips();
    updateSymptomsTextarea();
}

function renderChips() {
    const container = document.getElementById('symptom-chips');
    if (!container) return;
    container.innerHTML = selectedSymptoms.map(s =>
        `<span class="symptom-chip">${s}<span class="chip-remove" onclick="removeSymptomChip('${s}')">&times;</span></span>`
    ).join('');
}

function updateSymptomsTextarea() {
    const ta = document.getElementById('symptoms');
    if (ta) ta.value = selectedSymptoms.join(', ');
}

function updateCharCounter() {
    const input = document.getElementById('symptom-input');
    const counter = document.getElementById('char-counter');
    if (input && counter) {
        counter.textContent = `${(input.value || '').length} characters`;
    }
}

// ── Symptom Analysis ─────────────────────────────────────────────────────────
function analyzeSymptoms() {
    const symptoms = document.getElementById('symptoms').value.trim();
    if (!symptoms) {
        showToast('Please enter or select your symptoms', 'warning');
        return;
    }

    document.getElementById('results-container').style.display = 'none';
    document.getElementById('predict-error').style.display = 'none';
    document.getElementById('predict-loading').style.display = 'block';

    const btn = document.querySelector('#disease-prediction .btn-analyze');
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }

    fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'symptoms=' + encodeURIComponent(symptoms)
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('predict-loading').style.display = 'none';
            if (btn) { btn.classList.remove('loading'); btn.disabled = false; }

            if (data.error) {
                const errEl = document.getElementById('predict-error');
                errEl.textContent = data.error;
                errEl.style.display = 'block';
                return;
            }

            // Disease card (XSS safe)
            const diseaseEl = document.getElementById('disease-result');
            diseaseEl.textContent = '';
            const strong = document.createElement('strong');
            strong.textContent = data.disease || 'Unknown';
            diseaseEl.appendChild(strong);
            diseaseEl.appendChild(document.createElement('br'));
            diseaseEl.appendChild(document.createElement('br'));
            diseaseEl.appendChild(document.createTextNode(data.description || ''));

            // Precautions & Medications
            const precEl = document.getElementById('precaution-result');
            precEl.innerHTML = '';
            buildList(precEl, 'Precautions:', data.precautions);
            buildList(precEl, 'Medications:', data.medications);

            // Diet & Workout
            const dietEl = document.getElementById('diet-result');
            dietEl.innerHTML = '';
            buildList(dietEl, 'Diet:', data.diet);
            buildList(dietEl, 'Workout:', data.workout);

            document.getElementById('results-container').style.display = 'block';
            document.getElementById('predict-again-btn').style.display = 'block';
            document.getElementById('print-report-btn').style.display = 'block';

            // Scroll to results
            setTimeout(() => {
                document.getElementById('results-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        })
        .catch(error => {
            document.getElementById('predict-loading').style.display = 'none';
            if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
            const errEl = document.getElementById('predict-error');
            errEl.textContent = 'Network error: ' + error.message;
            errEl.style.display = 'block';
        });
}

function buildList(parentEl, title, items) {
    const h = document.createElement('strong');
    h.textContent = title;
    parentEl.appendChild(h);
    const ul = document.createElement('ul');
    (items || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
    });
    parentEl.appendChild(ul);
}

function predictAgain() {
    document.getElementById('symptoms').value = '';
    document.getElementById('symptom-input').value = '';
    selectedSymptoms = [];
    renderChips();
    document.getElementById('results-container').style.display = 'none';
    document.getElementById('predict-again-btn').style.display = 'none';
    document.getElementById('print-report-btn').style.display = 'none';
    document.getElementById('predict-error').style.display = 'none';
}

// ── Print Report ─────────────────────────────────────────────────────────────
function printReport() {
    window.print();
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function loadDashboard() {
    fetch('/patient-context')
        .then(res => res.json())
        .then(data => {
            if (!data.has_patient) {
                document.getElementById('dashboard-content').innerHTML =
                    '<div class="history-empty"><i class="fas fa-user-plus"></i><p>No patient data yet. Go to <a href="#" onclick="showPage(\'patient-details\'); return false;" style="color:var(--primary)">Patient Details</a> first.</p></div>';
                return;
            }
            const p = data.patient;

            // BMI Gauge needle
            const bmi = p.bmi || 22;
            // Map BMI 15-40 to -90deg..90deg
            const clampedBmi = Math.max(15, Math.min(40, bmi));
            const angle = ((clampedBmi - 15) / 25) * 180 - 90;
            const needle = document.getElementById('gauge-needle');
            if (needle) {
                setTimeout(() => { needle.style.transform = `translateX(-50%) rotate(${angle}deg)`; }, 300);
            }

            // Labels
            const gaugeLabel = document.getElementById('gauge-label');
            const gaugeSub = document.getElementById('gauge-sublabel');
            if (gaugeLabel) gaugeLabel.textContent = bmi;
            if (gaugeSub) {
                gaugeSub.textContent = p.bmi_category || '';
                gaugeSub.className = 'bmi-gauge-sublabel ' + (p.bmi_category || '').toLowerCase();
            }

            // Vitals
            setVital('vital-age', p.age ? `${p.age}y` : '—');
            setVital('vital-gender', p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—');
            setVital('vital-bp', p.bp || '—');
            setVital('vital-pulse', p.pulse ? `${p.pulse}` : '—');
            setVital('vital-temp', p.temperature || '—');
            setVital('vital-height', p.height ? `${p.height} cm` : '—');
            setVital('vital-weight', p.weight ? `${p.weight} kg` : '—');
        })
        .catch(() => { });
}

function setVital(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ── History ──────────────────────────────────────────────────────────────────
function loadHistory() {
    fetch('/history')
        .then(res => res.json())
        .then(items => {
            const container = document.getElementById('history-content');
            if (!container) return;
            if (!items.length) {
                container.innerHTML = '<div class="history-empty"><i class="fas fa-clock"></i><p>No predictions yet. Make your first diagnosis!</p></div>';
                document.getElementById('history-actions').style.display = 'none';
                return;
            }
            document.getElementById('history-actions').style.display = 'flex';
            container.innerHTML = '<div class="timeline">' +
                items.slice().reverse().map(item =>
                    `<div class="timeline-item">
                        <div class="timeline-time">${item.timestamp}</div>
                        <div class="timeline-disease">${escapeHtml(item.disease)}</div>
                        <div class="timeline-symptoms">Symptoms: ${escapeHtml(item.symptoms)}</div>
                    </div>`
                ).join('') + '</div>';
        })
        .catch(() => { });
}

function clearHistory() {
    fetch('/clear-history', { method: 'POST' })
        .then(() => {
            showToast('History cleared', 'success');
            loadHistory();
        })
        .catch(() => showToast('Failed to clear history', 'error'));
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
}

// ── Dark Mode Toggle ─────────────────────────────────────────────────────────
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('wellnvit-dark-mode', isDark ? '1' : '0');
    const icon = document.querySelector('.dark-mode-toggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function initDarkMode() {
    if (localStorage.getItem('wellnvit-dark-mode') === '1') {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('.dark-mode-toggle i');
        if (icon) icon.className = 'fas fa-sun';
    }
}

// ── Medical Disclaimer Modal ─────────────────────────────────────────────────
function initDisclaimer() {
    if (localStorage.getItem('wellnvit-disclaimer-accepted')) return;
    const modal = document.getElementById('disclaimer-modal');
    if (modal) modal.classList.remove('hidden');
}

function acceptDisclaimer() {
    localStorage.setItem('wellnvit-disclaimer-accepted', '1');
    const modal = document.getElementById('disclaimer-modal');
    if (modal) modal.classList.add('hidden');
}

// ── Animated Stats Counter ───────────────────────────────────────────────────
function initStatsCounter() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.counted) {
                entry.target.dataset.counted = '1';
                entry.target.classList.add('visible');
                const numEl = entry.target.querySelector('.stat-number');
                if (numEl) {
                    const target = parseInt(numEl.dataset.target, 10);
                    const suffix = numEl.dataset.suffix || '';
                    animateCount(numEl, 0, target, 1500, suffix);
                }
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.stat-item').forEach(el => observer.observe(el));
}

function animateCount(el, start, end, duration, suffix) {
    const startTime = performance.now();
    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * eased);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ── Hamburger Menu ───────────────────────────────────────────────────────────
function toggleMobileNav() {
    document.querySelector('.hamburger').classList.toggle('open');
    document.querySelector('nav').classList.toggle('open');
}
function closeMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('nav');
    if (hamburger) hamburger.classList.remove('open');
    if (nav) nav.classList.remove('open');
}

// ── Drag & Drop CSV Upload ───────────────────────────────────────────────────
function initDropZone() {
    const zone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('csv-upload-page');
    if (!zone || !fileInput) return;

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            showFilePreview(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) showFilePreview(fileInput.files[0]);
    });
}

function showFilePreview(file) {
    const preview = document.querySelector('.file-preview');
    if (preview) {
        preview.innerHTML = `<i class="fas fa-file-csv"></i> ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        preview.style.display = 'block';
    }
}

function uploadCSV() {
    const fileInput = document.getElementById('csv-upload-page');
    if (fileInput.files.length === 0) {
        showToast('Please select a file first.', 'warning');
        return;
    }
    
    const btn = document.querySelector('#anonymize .btn-block');
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    fetch('/anonymize', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Upload failed'); });
        }
        return response.blob();
    })
    .then(blob => {
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
        showToast('Anonymization complete. Downloading...', 'success');
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const originalName = fileInput.files[0].name;
        const namePart = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        a.download = namePart + '_anonymized.csv';
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        fileInput.value = '';
        const preview = document.querySelector('.file-preview');
        if (preview) preview.style.display = 'none';
    })
    .catch(error => {
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
        showToast(error.message || 'Error processing file.', 'error');
    });
}

// ── Contact Form ─────────────────────────────────────────────────────────────
function sendContactMessage() {
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const msg = document.getElementById('message').value.trim();
    
    if (!name || !email || !msg) { 
        showToast('Please fill all fields.', 'warning'); 
        return; 
    }
    
    // Show a loading toast
    showToast('Sending message...', 'success');
    
    // AJAX POST request to FormSubmit free service
    fetch("https://formsubmit.co/ajax/hrushika.bhaskar@gmail.com", {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            email: email,
            message: msg,
            _subject: `New Query from WellnVIT: ${name}`
        })
    })
    .then(response => response.json())
    .then(data => {
        showToast('Message sent! We\'ll get back to you soon.', 'success');
        document.getElementById('contact-name').value = '';
        document.getElementById('contact-email').value = '';
        document.getElementById('message').value = '';
    })
    .catch(error => {
        console.error(error);
        showToast('There was an error sending the message.', 'error');
    });
}

// ── Header Scroll Shadow ─────────────────────────────────────────────────────
function initScrollEffects() {
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 10);
    });
}

// ── Scroll-triggered Animations ──────────────────────────────────────────────
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.feature-card, .animate-on-scroll').forEach(el => observer.observe(el));
}

// ── Enter Key on Forms ───────────────────────────────────────────────────────
function initEnterKeys() {
    ['email', 'password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    });
    ['patient-id', 'patient-name', 'patient-age', 'patient-height', 'patient-weight', 'patient-bp', 'patient-pulse', 'patient-temp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') submitData(); });
    });
    ['contact-name', 'contact-email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') sendContactMessage(); });
    });
}

// ── Load Symptom List from Server ────────────────────────────────────────────
function loadSymptomList() {
    fetch('/symptoms-list')
        .then(res => res.json())
        .then(data => { allSymptoms = data; })
        .catch(() => { });
}

// ── Initialization ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    // Dark mode (before render)
    initDarkMode();

    // Check session
    fetch('/me')
        .then(res => res.json())
        .then(data => {
            if (data.logged_in) {
                document.getElementById('login-nav-item').style.display = 'none';
                document.getElementById('logout-nav-item').style.display = 'block';
                showLoggedInNav(true);
            } else {
                document.getElementById('login-nav-item').style.display = 'block';
                document.getElementById('logout-nav-item').style.display = 'none';
                showLoggedInNav(false);
            }
            showPage('home');
        })
        .catch(() => showPage('home'));

    // Init all features
    initScrollEffects();
    initDropZone();
    initEnterKeys();
    initAutocomplete();
    loadSymptomList();

    // BMI live calculation
    const heightEl = document.getElementById('patient-height');
    const weightEl = document.getElementById('patient-weight');
    if (heightEl) heightEl.addEventListener('input', calculateBMI);
    if (weightEl) weightEl.addEventListener('input', calculateBMI);

    // Deferred inits
    setTimeout(() => {
        initScrollAnimations();
        initStatsCounter();
        initDisclaimer();
    }, 500);
});
