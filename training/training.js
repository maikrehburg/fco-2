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
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${getDataFile()}`;
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

            // Stelle sicher, dass jedes Training notes/photos hat (Kompatibilität)
            trainings.forEach(training => {
                if (typeof training.notes !== 'string') {
                    training.notes = '';
                }
                if (!Array.isArray(training.photos)) {
                    training.photos = [];
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

// Stellt sicher, dass ein GitHub Token vorhanden ist (fragt ggf. per Prompt ab)
function ensureGithubToken() {
    if (githubToken) return true;

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
        return true;
    }
    alert('Ohne Token können keine Änderungen gespeichert werden.');
    return false;
}

// Daten in GitHub speichern
async function saveData(commitMessage = null) {
    if (!ensureGithubToken()) {
        return;
    }
    
    try {
        const jsonString = JSON.stringify(appData, null, 2);
        const utf8Bytes = new TextEncoder().encode(jsonString);
        const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
        const content = btoa(binaryString);
        
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${getDataFile()}`;
        
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

// Datum fuer die Trainingsansicht mit deutschem Wochentag formatieren
function formatTrainingDisplayDate(dateString) {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('de-DE', {
        weekday: 'short'
    });

    return `${weekday} ${formatDate(dateString)}`;
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
                    <div class="training-date">${formatTrainingDisplayDate(training.date)}</div>
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
    
    // Training-Objekt erstellen
    const newTraining = {
        id: trainingId,
        date: date,
        notes: '',
        photos: []
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
    
    document.getElementById('detailsDate').textContent = formatTrainingDisplayDate(training.date);
    renderParticipants(training);
    renderAvailablePlayers(training);
    renderTrainingNotes(training);
    renderTrainingPhotos(training);
    document.getElementById('trainingPhotoInput').value = '';
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

// Notizen im Textfeld anzeigen
function renderTrainingNotes(training) {
    document.getElementById('trainingNotes').value = training.notes || '';
}

// Notizen speichern
async function saveTrainingNotes() {
    const training = trainings.find(t => t.id === currentTrainingId);
    if (!training) return;

    training.notes = document.getElementById('trainingNotes').value;

    const commitMessage = `Notizen aktualisiert: Training ${formatDate(training.date)}`;
    await saveData(commitMessage);
    alert('Notizen gespeichert.');
}

// Fotos als Galerie anzeigen
function renderTrainingPhotos(training) {
    const container = document.getElementById('trainingPhotosList');
    const photos = training.photos || [];

    if (photos.length === 0) {
        container.innerHTML = '<p style="color: #999;">Noch keine Fotos.</p>';
        return;
    }

    container.innerHTML = photos.map((photo, index) => `
        <div class="photo-thumb" onclick="window.open('${photo.url}', '_blank')">
            <img src="${photo.url}" alt="${photo.name || 'Foto'}">
            <button class="remove-photo-btn"
                    onclick="event.stopPropagation(); removeTrainingPhoto(${index})"
                    title="Entfernen">×</button>
        </div>
    `).join('');
}

// Bild verkleinern/komprimieren, bevor es hochgeladen wird (GitHub Contents API Limit ~1MB)
function compressImage(file, maxDimension = 1600, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    const scale = maxDimension / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl.split(',')[1]);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Einzelnes Foto zu GitHub hochladen, gibt die gespeicherte Foto-Referenz zurück
async function uploadTrainingPhoto(file) {
    const base64Content = await compressImage(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `training-photos/${currentTrainingId}/${Date.now()}-${safeName}.jpg`;
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Foto hinzugefügt zu Training ${currentTrainingId}`,
            content: base64Content,
            branch: GITHUB_CONFIG.branch
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API Fehler: ${error.message}`);
    }

    const data = await response.json();
    return {
        path: data.content.path,
        sha: data.content.sha,
        url: data.content.download_url,
        name: file.name
    };
}

// Foto aus dem Repo löschen
async function deleteTrainingPhoto(photo) {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${photo.path}`;

    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Foto gelöscht von Training ${currentTrainingId}`,
            sha: photo.sha,
            branch: GITHUB_CONFIG.branch
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API Fehler: ${error.message}`);
    }
}

// Ausgewählte Fotos hochladen
async function handlePhotoUpload(fileList) {
    const training = trainings.find(t => t.id === currentTrainingId);
    if (!training || fileList.length === 0) return;

    if (!ensureGithubToken()) {
        return;
    }

    const statusEl = document.getElementById('photoUploadStatus');
    statusEl.style.display = 'block';

    for (const file of Array.from(fileList)) {
        try {
            const photo = await uploadTrainingPhoto(file);
            training.photos.push(photo);
        } catch (error) {
            console.error('Fehler beim Hochladen:', error);
            alert(`Foto "${file.name}" konnte nicht hochgeladen werden: ${error.message}`);
        }
    }

    statusEl.style.display = 'none';
    document.getElementById('trainingPhotoInput').value = '';

    await saveData(`Fotos hinzugefügt zu Training ${formatDate(training.date)}`);
    renderTrainingPhotos(training);
}

// Foto entfernen
async function removeTrainingPhoto(index) {
    const training = trainings.find(t => t.id === currentTrainingId);
    if (!training || !training.photos[index]) return;

    if (!confirm('Möchtest du dieses Foto wirklich löschen?')) {
        return;
    }

    const photo = training.photos[index];

    try {
        await deleteTrainingPhoto(photo);
        training.photos.splice(index, 1);
        await saveData(`Foto gelöscht von Training ${formatDate(training.date)}`);
        renderTrainingPhotos(training);
    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        alert(`Foto konnte nicht gelöscht werden: ${error.message}`);
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
