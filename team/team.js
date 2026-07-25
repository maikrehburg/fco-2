// ============================================
// Team-Management - FC Oppenwehe II
// ============================================

let appData = { players: [], trainings: [] };
let players = [];
let trainings = [];
let githubToken = localStorage.getItem('githubToken') || '';
let fileSHA = null;
let currentPlayerId = null;

document.addEventListener('DOMContentLoaded', function() {
    updateSettingsButton();
    loadData();

    document.getElementById('newPlayerName').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') addPlayer();
    });

    document.getElementById('addPlayerOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeAddPlayerOverlay();
    });

    document.getElementById('playerDetailsOverlay').addEventListener('click', function(e) {
        if (e.target === this) closePlayerDetails();
    });

    document.getElementById('addAbsenceOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeAbsenceOverlay();
    });

    document.getElementById('absenceForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addAbsence();
    });
});

function updateSettingsButton() {
    const btn = document.getElementById('settingsBtn');
    if (btn) btn.style.display = githubToken ? 'flex' : 'none';
}

function resetGitHubToken() {
    localStorage.removeItem('githubToken');
    githubToken = '';
    updateSettingsButton();
    alert('Token wurde gelöscht. Die Seite wird neu geladen.');
    location.reload();
}

async function loadData() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${getDataFile()}`;
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (githubToken) headers['Authorization'] = `token ${githubToken}`;

        const response = await fetch(url, { headers });
        if (response.ok) {
            const data = await response.json();
            fileSHA = data.sha;
            const binary = atob(data.content);
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            appData = JSON.parse(new TextDecoder().decode(bytes));
            if (Array.isArray(appData)) appData = { players: appData, trainings: [] };
            players = appData.players;
            trainings = appData.trainings || [];
            players.forEach(p => {
                if (!p.trainings) p.trainings = [];
                if (!p.absences) p.absences = [];
            });
        } else if (response.status === 404) {
            appData = { players: [], trainings: [] };
            players = [];
            trainings = [];
        } else {
            throw new Error(`GitHub API Fehler: ${response.status}`);
        }
    } catch (e) {
        console.error('Fehler beim Laden:', e);
        appData = { players: [], trainings: [] };
        players = [];
        trainings = [];
    }
    renderPlayers();
}

async function saveData(commitMessage) {
    if (!githubToken) {
        const token = prompt(
            'Zum Speichern wird ein GitHub Personal Access Token benötigt:\n\n' +
            '1. Gehe zu: https://github.com/settings/tokens\n' +
            '2. Klicke "Generate new token (classic)"\n' +
            '3. Wähle "repo" Berechtigung\n' +
            '4. Kopiere das Token und füge es hier ein:'
        );
        if (token) {
            githubToken = token;
            localStorage.setItem('githubToken', token);
            updateSettingsButton();
        } else {
            alert('Ohne Token können keine Änderungen gespeichert werden.');
            return;
        }
    }

    try {
        const jsonString = JSON.stringify(appData, null, 2);
        const utf8Bytes = new TextEncoder().encode(jsonString);
        const binaryStr = Array.from(utf8Bytes, b => String.fromCharCode(b)).join('');
        const content = btoa(binaryStr);

        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${getDataFile()}`;
        const body = {
            message: commitMessage || `Team-Management Update - ${new Date().toLocaleString('de-DE')}`,
            content,
            branch: GITHUB_CONFIG.branch
        };
        if (fileSHA) body.sha = fileSHA;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            const data = await response.json();
            fileSHA = data.content.sha;
        } else {
            const err = await response.json();
            throw new Error(err.message);
        }
    } catch (e) {
        console.error('Fehler beim Speichern:', e);
        alert('Fehler beim Speichern auf GitHub: ' + e.message);
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function renderPlayers() {
    const container = document.getElementById('playersList');
    const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, 'de'));

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Noch keine Spieler in dieser Saison.</p>
                <p>Klicke auf "+ Neuer Spieler" um zu beginnen.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sorted.map(player => {
        const washCount = player.washDates ? player.washDates.length : 0;
        const trainingCount = player.trainings ? player.trainings.length : 0;
        return `
            <div class="player-item" onclick="openPlayerDetails(${player.id})">
                <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <div class="player-stats">
                        <span class="stat-badge" title="Trikotwäschen">&#128085; ${washCount}</span>
                        <span class="stat-badge" title="Trainingsteilnahmen">&#9917; ${trainingCount}</span>
                    </div>
                </div>
                <div class="player-actions">
                    <button class="absence-btn" onclick="event.stopPropagation(); openAddAbsenceOverlay(${player.id})" title="Abwesenheit hinzufügen">&#128197;</button>
                    <button class="delete-player-btn" onclick="event.stopPropagation(); deletePlayer(${player.id})" title="Spieler entfernen">&#128465;</button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddPlayerOverlay() {
    document.getElementById('newPlayerName').value = '';
    document.getElementById('addPlayerOverlay').classList.add('active');
    setTimeout(() => document.getElementById('newPlayerName').focus(), 100);
}

function closeAddPlayerOverlay() {
    document.getElementById('addPlayerOverlay').classList.remove('active');
}

async function addPlayer() {
    const input = document.getElementById('newPlayerName');
    const name = input.value.trim();
    if (!name) {
        alert('Bitte einen Namen eingeben!');
        return;
    }

    const newPlayer = { id: Date.now(), name, washDates: [], trainings: [], absences: [] };
    appData.players.push(newPlayer);
    players = appData.players;
    await saveData(`Spieler hinzugefügt: ${name}`);
    renderPlayers();
    closeAddPlayerOverlay();
}

async function deletePlayer(id) {
    id = Number(id);
    const player = players.find(p => p.id === id);
    if (!player) return;

    if (!confirm(`Spieler "${player.name}" wirklich entfernen?\n\nAlle zugehörigen Daten gehen verloren.`)) return;

    appData.players = appData.players.filter(p => p.id !== id);
    players = appData.players;
    await saveData(`Spieler entfernt: ${player.name}`);
    renderPlayers();
}

function openPlayerDetails(id) {
    id = Number(id);
    const player = players.find(p => p.id === id);
    if (!player) return;

    document.getElementById('detailsPlayerName').textContent = player.name;

    // Waschdaten
    const washDates = player.washDates || [];
    document.getElementById('detailsWashCount').textContent = washDates.length;
    const washList = document.getElementById('detailsWashList');
    if (washDates.length === 0) {
        washList.innerHTML = '<p class="empty-detail">Noch keine Einträge.</p>';
    } else {
        const sortedWash = [...washDates].sort((a, b) => new Date(b.date) - new Date(a.date));
        washList.innerHTML = sortedWash.map(w => `
            <div class="detail-item">
                <span class="detail-date">${formatDate(w.date)}</span>
                <span class="detail-opponent">${w.opponent}</span>
            </div>
        `).join('');
    }

    // Trainings
    const playerTrainingIds = player.trainings || [];
    document.getElementById('detailsTrainingCount').textContent = playerTrainingIds.length;
    const trainingList = document.getElementById('detailsTrainingList');
    if (playerTrainingIds.length === 0) {
        trainingList.innerHTML = '<p class="empty-detail">Noch keine Einträge.</p>';
    } else {
        const attended = trainings
            .filter(t => playerTrainingIds.includes(t.id))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        trainingList.innerHTML = attended.map(t => `
            <div class="detail-item">
                <span class="detail-date">${formatDate(t.date)}</span>
            </div>
        `).join('');
    }

    // Abwesenheiten
    const absences = player.absences || [];
    document.getElementById('detailsAbsenceCount').textContent = absences.length;
    const absenceList = document.getElementById('detailsAbsenceList');
    if (absences.length === 0) {
        absenceList.innerHTML = '<p class="empty-detail">Noch keine Einträge.</p>';
    } else {
        const sorted = [...absences].sort((a, b) => new Date(b.from) - new Date(a.from));
        absenceList.innerHTML = sorted.map((a, idx) => {
            const fromDate = formatDate(a.from);
            const toDate = formatDate(a.to);
            const dateRange = a.from === a.to ? fromDate : `${fromDate} - ${toDate}`;
            return `
                <div class="detail-item">
                    <span class="detail-date">${dateRange}</span>
                    <button class="remove-detail-btn" onclick="event.stopPropagation(); deleteAbsence(${player.id}, ${idx})" title="Eintrag löschen">×</button>
                </div>
            `;
        }).join('');
    }

    currentPlayerId = id;
    document.getElementById('playerDetailsOverlay').classList.add('active');
}

function closePlayerDetails() {
    document.getElementById('playerDetailsOverlay').classList.remove('active');
    currentPlayerId = null;
}

function openAddAbsenceOverlay(playerId) {
    playerId = Number(playerId);
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    currentPlayerId = playerId;
    document.getElementById('absencePlayerName').textContent = player.name;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('absenceFromDate').value = today;
    document.getElementById('absenceToDate').value = today;

    document.getElementById('addAbsenceOverlay').classList.add('active');
}

function closeAbsenceOverlay() {
    document.getElementById('addAbsenceOverlay').classList.remove('active');
}

async function addAbsence() {
    const fromDate = document.getElementById('absenceFromDate').value;
    const toDate = document.getElementById('absenceToDate').value;

    if (!fromDate || !toDate) {
        alert('Bitte alle Felder ausfüllen!');
        return;
    }

    if (fromDate > toDate) {
        alert('Startdatum kann nicht nach Enddatum liegen!');
        return;
    }

    const player = players.find(p => p.id === currentPlayerId);
    if (!player) return;

    if (!player.absences) {
        player.absences = [];
    }

    player.absences.push({ from: fromDate, to: toDate });

    const dateRange = fromDate === toDate ? formatDate(fromDate) : `${formatDate(fromDate)} - ${formatDate(toDate)}`;
    await saveData(`Abwesenheit hinzugefügt: ${player.name} - ${dateRange}`);
    renderPlayers();
    closeAbsenceOverlay();
}

async function deleteAbsence(playerId, absenceIndex) {
    playerId = Number(playerId);
    const player = players.find(p => p.id === playerId);
    if (!player || !player.absences) return;

    const absence = player.absences[absenceIndex];
    if (!absence) return;

    if (!confirm('Abwesenheit wirklich löschen?')) return;

    const dateRange = absence.from === absence.to ? formatDate(absence.from) : `${formatDate(absence.from)} - ${formatDate(absence.to)}`;
    player.absences.splice(absenceIndex, 1);
    await saveData(`Abwesenheit entfernt: ${player.name} - ${dateRange}`);
    
    // Aktualisiere Detail-Overlay falls noch offen
    if (currentPlayerId === playerId) {
        openPlayerDetails(playerId);
    } else {
        renderPlayers();
    }
}
