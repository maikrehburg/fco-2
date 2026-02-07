// Datenstruktur für Spieler und Waschdaten
let players = [];
let currentPlayerId = null;
let githubToken = localStorage.getItem('githubToken') || '';
let fileSHA = null; // Wird benötigt für Updates
let washSortMode = localStorage.getItem('washSortMode') || 'none'; // 'asc', 'desc', 'none'

// Laden der Daten beim Start
document.addEventListener('DOMContentLoaded', function() {
    updateSettingsButton();
    loadData();
    updateWashSortIndicator();
    
    // Event Listener für das Formular
    document.getElementById('washForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveWashDate();
    });

    // Setze heutiges Datum als Standard
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('washDate').value = today;
});

// Settings-Button Sichtbarkeit aktualisieren
function updateSettingsButton() {
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.style.display = githubToken ? 'flex' : 'none';
    }
}

// GitHub Token prüfen und ggf. abfragen
function checkGitHubToken() {
    if (!githubToken) {
        const token = prompt(
            'Bitte gib dein GitHub Personal Access Token ein:\n\n' +
            '1. Gehe zu: https://github.com/settings/tokens\n' +
            '2. Klicke "Generate new token (classic)"\n' +
            '3. Wähle "repo" Berechtigung\n' +
            '4. Kopiere das Token und füge es hier ein:'
        );
        if (token) {
            githubToken = token;
            localStorage.setItem('githubToken', token);
        }
    }
}

// GitHub Token zurücksetzen (für Einstellungen)
function resetGitHubToken() {
    localStorage.removeItem('githubToken');
    githubToken = '';
    updateSettingsButton();
    alert('Token wurde gelöscht. Die Seite wird neu geladen.');
    location.reload();
}

// Daten aus GitHub laden (ohne Token für öffentliche Repos)
async function loadData() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`;
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        // Wenn Token vorhanden, verwende es (für höhere Rate Limits)
        if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
        }
        
        const response = await fetch(url, { headers });
        
        if (response.ok) {
            const data = await response.json();
            fileSHA = data.sha;
            // UTF-8 korrekt dekodieren von atob()
            const binaryString = atob(data.content);
            const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
            const content = new TextDecoder().decode(bytes);
            players = JSON.parse(content);
        } else if (response.status === 404) {
            // Datei existiert noch nicht - verwende Beispieldaten
            players = [
                {
                    id: Date.now(),
                    name: 'Max Mustermann',
                    washDates: []
                },
                {
                    id: Date.now() + 1,
                    name: 'Lisa Schmidt',
                    washDates: []
                }
            ];
        } else {
            throw new Error(`GitHub API Fehler: ${response.status}`);
        }
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        alert('Fehler beim Laden der Daten von GitHub. Prüfe die Konfiguration in config.js.');
        players = [];
    }
    
    renderTable();
}

// Daten in GitHub speichern
async function saveData() {
    // Token prüfen/anfordern nur wenn gespeichert werden soll
    if (!githubToken) {
        const token = prompt(
            'Zum Speichern wird ein GitHub Personal Access Token benötigt:\n\n' +
            '1. Gehe zu: https://github.com/settings/tokens\n' +
            '2. Klicke "Generate new token (classic)"\n' +
            '3. Wähle "repo" Berechtigung\n' +
            '4. Kopiere das Token und füge es hier ein:\n\n' +
            'Oder klicke "Abbrechen" um nur lesend zuzugreifen.'
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
        // UTF-8 korrekt enkodieren für btoa()
        const jsonString = JSON.stringify(players, null, 2);
        const utf8Bytes = new TextEncoder().encode(jsonString);
        const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
        const content = btoa(binaryString);
        
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`;
        
        const body = {
            message: `Update Trikotwäscheliste - ${new Date().toLocaleString('de-DE')}`,
            content: content,
            branch: GITHUB_CONFIG.branch
        };
        
        // Wenn Datei existiert, muss SHA mitgegeben werden
        if (fileSHA) {
            body.sha = fileSHA;
        }
        
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
            console.log('Daten erfolgreich gespeichert');
        } else {
            const error = await response.json();
            throw new Error(`GitHub API Fehler: ${error.message}`);
        }
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        alert('Fehler beim Speichern auf GitHub: ' + error.message);
    }
}

// Sortierung nach Wäschen umschalten
function toggleWashSort() {
    // Toggle zwischen asc und desc
    washSortMode = washSortMode === 'asc' ? 'desc' : 'asc';
    
    localStorage.setItem('washSortMode', washSortMode);
    updateWashSortIndicator();
    renderTable();
}

// Sortier-Indikator für Wäschen aktualisieren
function updateWashSortIndicator() {
    const washIndicator = document.getElementById('washSortIndicator');
    
    if (washIndicator) {
        if (washSortMode === 'asc') {
            washIndicator.textContent = '↑';
            washIndicator.title = 'Aufsteigend';
        } else if (washSortMode === 'desc') {
            washIndicator.textContent = '↓';
            washIndicator.title = 'Absteigend';
        } else {
            washIndicator.textContent = '';
            washIndicator.title = '';
        }
    }
}

// Spieler sortieren basierend auf aktuellem Modus
function getSortedPlayers() {
    const sortedPlayers = [...players];
    
    if (washSortMode !== 'none') {
        // Sortiere nach Wäschen-Anzahl
        sortedPlayers.sort((a, b) => {
            const countA = a.washDates ? a.washDates.length : 0;
            const countB = b.washDates ? b.washDates.length : 0;
            if (washSortMode === 'asc') {
                return countA - countB;
            } else {
                return countB - countA;
            }
        });
    } else {
        // Standard: alphabetisch nach Namen
        sortedPlayers.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    }
    
    return sortedPlayers;
}

// Tabelle rendern
function renderTable() {
    const tbody = document.getElementById('playerTableBody');
    
    if (players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="empty-state">Noch keine Spieler vorhanden. Füge einen Spieler hinzu!</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    const sortedPlayers = getSortedPlayers();
    
    sortedPlayers.forEach(player => {
        const row = document.createElement('tr');
        
        // Spieler-Name Spalte
        const nameCell = document.createElement('td');
        nameCell.innerHTML = `
            <div class="player-name">
                <span>${player.name}</span>
            </div>
        `;
        
        // Waschdaten Spalte
        const datesCell = document.createElement('td');
        datesCell.style.position = 'relative';
        if (player.washDates && player.washDates.length > 0) {
            const datesHTML = player.washDates
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((wash, index) => `
                    <div class="wash-date-item">
                        <strong>${formatDate(wash.date)}</strong>
                        <span>${wash.opponent}</span>
                        <button class="delete-wash-btn" onclick="deleteWashDate(${player.id}, ${index})" title="Eintrag löschen">×</button>
                    </div>
                `).join('');
            datesCell.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <div class="wash-dates" style="flex: 1;">${datesHTML}</div>
                    <button class="add-wash-btn" onclick="openOverlay(${player.id})">+</button>
                </div>
            `;
        } else {
            datesCell.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="color: #999; font-style: italic;">Noch keine Einträge</span>
                    <button class="add-wash-btn" onclick="openOverlay(${player.id})">+</button>
                </div>
            `;
        }
        
        row.appendChild(nameCell);
        row.appendChild(datesCell);
        tbody.appendChild(row);
    });
}

// Datum formatieren
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

// Neuen Spieler hinzufügen
function addPlayer() {
    const input = document.getElementById('newPlayerName');
    const name = input.value.trim();
    
    if (name === '') {
        alert('Bitte einen Namen eingeben!');
        return;
    }
    
    const newPlayer = {
        id: Date.now(),
        name: name,
        washDates: []
    };
    
    players.push(newPlayer);
    saveData();
    renderTable();
    input.value = '';
}

// Overlay öffnen
function openOverlay(playerId) {
    currentPlayerId = playerId;
    const overlay = document.getElementById('overlay');
    overlay.classList.add('active');
    
    // Setze heutiges Datum als Standard
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('washDate').value = today;
    document.getElementById('opponent').value = '';
    document.getElementById('opponent').focus();
}

// Overlay schließen
function closeOverlay() {
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('active');
    currentPlayerId = null;
}

// Waschdatum speichern
function saveWashDate() {
    const date = document.getElementById('washDate').value;
    const opponent = document.getElementById('opponent').value.trim();
    
    if (!date || !opponent) {
        alert('Bitte alle Felder ausfüllen!');
        return;
    }
    
    const player = players.find(p => p.id === currentPlayerId);
    if (player) {
        if (!player.washDates) {
            player.washDates = [];
        }
        
        player.washDates.push({
            date: date,
            opponent: opponent
        });
        
        saveData();
        renderTable();
        closeOverlay();
    }
}

// Waschdatum löschen
function deleteWashDate(playerId, washIndex) {
    if (confirm('Möchtest du diesen Eintrag wirklich löschen?')) {
        const player = players.find(p => p.id === playerId);
        if (player && player.washDates) {
            // Da die Anzeige sortiert ist, müssen wir den richtigen Index finden
            const sortedDates = [...player.washDates].sort((a, b) => new Date(b.date) - new Date(a.date));
            const dateToDelete = sortedDates[washIndex];
            const originalIndex = player.washDates.indexOf(dateToDelete);
            
            player.washDates.splice(originalIndex, 1);
            saveData();
            renderTable();
        }
    }
}

// Overlay schließen beim Klick außerhalb
document.getElementById('overlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeOverlay();
    }
});
