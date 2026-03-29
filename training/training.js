// Datenstruktur
let appData = { players: [], trainings: [] };
let players = [];
let trainings = [];
let currentTrainingId = null;
let selectedPlayers = new Set();
let githubToken = localStorage.getItem('githubToken') || '';
let fileSHA = null;

// Laden der Daten beim Start
document.addEventListener('DOMContentLoaded', function() {
    updateSettingsButton();
    loadData();
    
    // Event Listener für das Formular
    document.getElementById('trainingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveNewTraining();
    });

    // Setze heutiges Datum als Standard
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trainingDate').value = today;
});

// Settings-Button Sichtbarkeit aktualisieren
function updateSettingsButton() {
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.style.display = githubToken ? 'flex' : 'none';
    }
}

// GitHub Token zurücksetzen
function resetGitHubToken() {
    localStorage.removeItem('githubToken');
    githubToken = '';
    updateSettingsButton();
    alert('Token wurde gelöscht. Die Seite wird neu geladen.');
    location.reload();
}

// Daten aus GitHub laden
async function loadData() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`;
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
        }
        
        const response = await fetch(url, { headers });
        
        if (response.ok) {
            const data = await response.json();
            fileSHA = data.sha;
            const binaryString = atob(data.content);
            const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
            const content = new TextDecoder().decode(bytes);
            appData = JSON.parse(content);
            // Kompatibilität: Falls alte Struktur, konvertiere
            if (Array.isArray(appData)) {
                appData = { players: appData, trainings: [] };
            }
            players = appData.players;
            trainings = appData.trainings || [];
            
            // Stelle sicher, dass jeder Spieler ein trainings-Array hat
            players.forEach(player => {
                if (!player.trainings) {
                    player.trainings = [];
                }
            });
        } else if (response.status === 404) {
            appData = { players: [], trainings: [] };
            players = appData.players;
            trainings = appData.trainings;
        }
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        appData = { players: [], trainings: [] };
        players = appData.players;
        trainings = appData.trainings;
    }
    
    renderTrainings();
}

// Daten in GitHub speichern
async function saveData(commitMessage = null) {
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
        const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
        const content = btoa(binaryString);
        
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`;
        
        const body = {
            message: commitMessage || `Update Trainingsplan - ${new Date().toLocaleString('de-DE')}`,
            content: content,
            branch: GITHUB_CONFIG.branch
        };
        
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

// Datum formatieren
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

// Trainings rendern
function renderTrainings() {
    const container = document.getElementById('trainingsList');
    
    if (trainings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Noch keine Trainings eingetragen.</p>
                <p>Klicke auf "+ Neues Training" um zu beginnen.</p>
            </div>
        `;
        return;
    }
    
    // Sortiere Trainings nach Datum (neueste zuerst)
    const sortedTrainings = [...trainings].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    container.innerHTML = sortedTrainings.map(training => {
        // Zähle Teilnehmer: Spieler, die diese Training-ID haben
        const participantCount = players.filter(p => 
            p.trainings && p.trainings.includes(training.id)
        ).length;
        
        return `
            <div class="training-item" onclick="openTrainingDetails(${training.id})">
                <div class="training-header">
                    <div class="training-date">${formatDate(training.date)}</div>
                    <div class="training-participants-count">${participantCount} Teilnehmer</div>
                </div>
            </div>
        `;
    }).join('');
}

// Overlay öffnen: Neues Training
function openAddTrainingOverlay() {
    selectedPlayers.clear();
    renderPlayerSelection();
    document.getElementById('addTrainingOverlay').classList.add('active');
}

// Overlay schließen: Neues Training
function closeAddTrainingOverlay() {
    document.getElementById('addTrainingOverlay').classList.remove('active');
    document.getElementById('trainingForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trainingDate').value = today;
    selectedPlayers.clear();
}

// Spielerauswahl rendern
function renderPlayerSelection() {
    const container = document.getElementById('playerSelectionList');
    
    if (players.length === 0) {
        container.innerHTML = '<p style="color: #999;">Keine Spieler verfügbar.</p>';
        return;
    }
    
    // Sortiere Spieler alphabetisch
    const sortedPlayers = [...players].sort((a, b) => 
        a.name.localeCompare(b.name, 'de')
    );
    
    container.innerHTML = sortedPlayers.map(player => `
        <label class="player-checkbox ${selectedPlayers.has(player.id) ? 'selected' : ''}" 
               onclick="togglePlayerSelection(${player.id})">
            <input type="checkbox" 
                   ${selectedPlayers.has(player.id) ? 'checked' : ''}
                   onchange="event.stopPropagation(); togglePlayerSelection(${player.id})">
            <span>${player.name}</span>
        </label>
    `).join('');
}

// Spielerauswahl umschalten
function togglePlayerSelection(playerId) {
    playerId = Number(playerId);
    if (selectedPlayers.has(playerId)) {
        selectedPlayers.delete(playerId);
    } else {
        selectedPlayers.add(playerId);
    }
    renderPlayerSelection();
}

// Neues Training speichern
async function saveNewTraining() {
    const date = document.getElementById('trainingDate').value;
    
    if (!date) {
        alert('Bitte ein Datum auswählen!');
        return;
    }
    
    const trainingId = Date.now();
    
    // Training-Objekt erstellen (nur id und date)
    const newTraining = {
        id: trainingId,
        date: date
    };
    
    trainings.push(newTraining);
    
    // Training-ID zu allen ausgewählten Spielern hinzufügen
    selectedPlayers.forEach(playerId => {
        const player = players.find(p => p.id === playerId);
        if (player) {
            if (!player.trainings) {
                player.trainings = [];
            }
            player.trainings.push(trainingId);
        }
    });
    
    const participantCount = selectedPlayers.size;
    const commitMessage = `Training hinzugefügt: ${formatDate(date)} (${participantCount} Teilnehmer)`;
    await saveData(commitMessage);
    
    renderTrainings();
    closeAddTrainingOverlay();
}

// Training-Details öffnen
function openTrainingDetails(trainingId) {
    currentTrainingId = Number(trainingId);
    const training = trainings.find(t => t.id === currentTrainingId);
    
    if (!training) return;
    
    document.getElementById('detailsDate').textContent = formatDate(training.date);
    renderParticipants(training);
    renderAvailablePlayers(training);
    document.getElementById('trainingDetailsOverlay').classList.add('active');
}

// Details-Overlay schließen
function closeDetailsOverlay() {
    document.getElementById('trainingDetailsOverlay').classList.remove('active');
    currentTrainingId = null;
}

// Teilnehmer anzeigen
function renderParticipants(training) {
    const container = document.getElementById('participantsList');
    const countElement = document.getElementById('participantCount');
    
    // Finde alle Spieler, die diese Training-ID haben
    const participants = players.filter(p => 
        p.trainings && p.trainings.includes(training.id)
    );
    
    countElement.textContent = participants.length;
    
    if (participants.length === 0) {
        container.innerHTML = '<p style="color: #999;">Noch keine Teilnehmer.</p>';
        return;
    }
    
    container.innerHTML = participants.map(player => {
        return `
            <div class="participant-item">
                <span class="participant-name">${player.name}</span>
                <button class="remove-participant-btn" 
                        onclick="removeParticipant(${player.id})"
                        title="Entfernen">×</button>
            </div>
        `;
    }).join('');
}

// Verfügbare Spieler zum Hinzufügen anzeigen
function renderAvailablePlayers(training) {
    const container = document.getElementById('addPlayersList');
    
    // Filtere Spieler, die noch nicht teilnehmen
    const availablePlayers = players.filter(p => 
        !p.trainings || !p.trainings.includes(training.id)
    ).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    
    if (availablePlayers.length === 0) {
        container.innerHTML = '<p style="color: #999;">Alle Spieler sind bereits Teilnehmer.</p>';
        return;
    }
    
    container.innerHTML = availablePlayers.map(player => `
        <label class="player-checkbox" onclick="addParticipant(${player.id})">
            <span>${player.name}</span>
        </label>
    `).join('');
}

// Teilnehmer entfernen
async function removeParticipant(playerId) {
    playerId = Number(playerId);
    const training = trainings.find(t => t.id === currentTrainingId);
    if (!training) return;
    
    const player = players.find(p => p.id === playerId);
    if (player && player.trainings) {
        // Entferne Training-ID aus dem Spieler
        const trainingIndex = player.trainings.indexOf(training.id);
        if (trainingIndex > -1) {
            player.trainings.splice(trainingIndex, 1);
            
            const commitMessage = `Teilnehmer entfernt: ${player.name} von Training ${formatDate(training.date)}`;
            await saveData(commitMessage);
            
            renderParticipants(training);
            renderAvailablePlayers(training);
            renderTrainings();
        }
    }
}

// Teilnehmer hinzufügen
async function addParticipant(playerId) {
    playerId = Number(playerId);
    const training = trainings.find(t => t.id === currentTrainingId);
    if (!training) return;
    
    const player = players.find(p => p.id === playerId);
    if (player) {
        if (!player.trainings) {
            player.trainings = [];
        }
        
        if (!player.trainings.includes(training.id)) {
            player.trainings.push(training.id);
            
            const commitMessage = `Teilnehmer hinzugefügt: ${player.name} zu Training ${formatDate(training.date)}`;
            await saveData(commitMessage);
            
            renderParticipants(training);
            renderAvailablePlayers(training);
            renderTrainings();
        }
    }
}

// Training löschen
async function deleteTraining() {
    if (!confirm('Möchtest du dieses Training wirklich löschen?')) {
        return;
    }
    
    const training = trainings.find(t => t.id === currentTrainingId);
    const index = trainings.findIndex(t => t.id === currentTrainingId);
    
    if (index > -1) {
        // Entferne Training-ID von allen Spielern
        players.forEach(player => {
            if (player.trainings) {
                const trainingIndex = player.trainings.indexOf(training.id);
                if (trainingIndex > -1) {
                    player.trainings.splice(trainingIndex, 1);
                }
            }
        });
        
        trainings.splice(index, 1);
        
        const commitMessage = `Training gelöscht: ${formatDate(training.date)}`;
        await saveData(commitMessage);
        
        closeDetailsOverlay();
        renderTrainings();
    }
}

// Overlay schließen beim Klick außerhalb
document.getElementById('addTrainingOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeAddTrainingOverlay();
    }
});

document.getElementById('trainingDetailsOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDetailsOverlay();
    }
});
