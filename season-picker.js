// ============================================
// Season Picker - FC Oppenwehe II
// ============================================

async function initSeasonPicker() {
    const container = document.querySelector('.season_picker');
    if (!container) return;

    container.innerHTML = '<span class="season-loading">Lädt...</span>';

    const seasons = await discoverSeasons();
    renderSeasonPicker(container, seasons);
}

// Listet alle season_XXXX.json Dateien im GitHub-Root
async function discoverSeasons() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/`;
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        const token = localStorage.getItem('githubToken');
        if (token) headers['Authorization'] = `token ${token}`;

        const response = await fetch(url, { headers });
        if (!response.ok) return [];

        const files = await response.json();
        return files
            .filter(f => f.type === 'file' && /^season_\d{4}\.json$/.test(f.name))
            .map(f => f.name.replace('season_', '').replace('.json', ''))
            .sort();
    } catch (e) {
        console.warn('Season-Erkennung fehlgeschlagen:', e);
        return [];
    }
}

function renderSeasonPicker(container, seasons) {
    if (seasons.length === 0) {
        container.innerHTML = `
            <div class="season-picker-inner">
                <button class="season-new-btn" onclick="createNewSeason()">&#xFF0B; Erste Saison anlegen</button>
            </div>
        `;
        return;
    }

    const stored = localStorage.getItem('fco_current_season');
    const activeKey = seasons.includes(stored) ? stored : seasons[0];

    // Aktive Saison sichern falls noch nicht gesetzt oder ungültig
    if (activeKey !== stored) {
        setCurrentSeason(activeKey);
    }

    const options = seasons.map(key =>
        `<option value="${key}"${key === activeKey ? ' selected' : ''}>Saison ${seasonKeyToLabel(key)}</option>`
    ).join('');

    container.innerHTML = `
        <div class="season-picker-inner">
            <span class="season-label">Saison</span>
            <div class="season-select-wrapper">
                <select id="seasonSelect" onchange="handleSeasonChange(this.value)">
                    ${options}
                    <option value="__new__">&#xFF0B; Neue Saison anlegen</option>
                </select>
            </div>
        </div>
    `;

    updateSeasonDescription(activeKey);
}

function handleSeasonChange(value) {
    if (value === '__new__') {
        const sel = document.getElementById('seasonSelect');
        if (sel) sel.value = getCurrentSeason();
        createNewSeason();
        return;
    }
    setCurrentSeason(value);
    updateSeasonDescription(value);
}

function updateSeasonDescription(key) {
    const desc = document.getElementById('matchPlanDesc');
    if (desc) {
        desc.textContent = `Alle Spiele und Termine der Saison ${seasonKeyToLabel(key)}`;
    }
}

async function createNewSeason() {
    const token = localStorage.getItem('githubToken');
    if (!token) {
        alert(
            'Zum Anlegen einer neuen Saison wird ein GitHub Token benötigt.\n\n' +
            'Bitte zuerst in Trikotwäsche oder Training einloggen.'
        );
        return;
    }

    const input = prompt('Neue Saison anlegen\n\nSaisonbezeichnung eingeben (z.B. 26/27):');
    if (!input) return;

    const key = input.trim().replace(/\D/g, '');
    if (key.length !== 4) {
        alert('Ungültige Eingabe. Bitte im Format "26/27" oder "2627" eingeben.');
        return;
    }

    const label = seasonKeyToLabel(key);
    const filename = `season_${key}.json`;

    // Prüfen ob Saison schon existiert
    const checkUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filename}`;
    const checkResp = await fetch(checkUrl, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (checkResp.ok) {
        alert(`Saison ${label} existiert bereits.`);
        setCurrentSeason(key);
        location.reload();
        return;
    }

    // Spielerliste aus aktueller Saison laden
    let players = [];
    const currentFile = getDataFile();
    const dataUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${currentFile}`;
    const dataResp = await fetch(dataUrl, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (dataResp.ok) {
        const fileData = await dataResp.json();
        const binaryString = atob(fileData.content);
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        const parsed = JSON.parse(new TextDecoder().decode(bytes));
        players = (parsed.players || []).map(p => ({
            id: p.id,
            name: p.name,
            washDates: [],
            trainings: []
        }));
    }

    // Neue Datei auf GitHub erstellen
    const newData = { players, trainings: [] };
    const jsonString = JSON.stringify(newData, null, 2);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    const binaryStr = Array.from(utf8Bytes, b => String.fromCharCode(b)).join('');
    const b64content = btoa(binaryStr);

    try {
        const createUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filename}`;
        const resp = await fetch(createUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Neue Saison ${label} anlegen`,
                content: b64content,
                branch: GITHUB_CONFIG.branch
            })
        });

        if (resp.ok) {
            setCurrentSeason(key);
            alert(`Saison ${label} wurde erfolgreich angelegt!`);
            location.reload();
        } else {
            const err = await resp.json();
            throw new Error(err.message);
        }
    } catch (e) {
        alert('Fehler beim Anlegen der Saison: ' + e.message);
    }
}

document.addEventListener('DOMContentLoaded', initSeasonPicker);
