// ============================================
// Global Configuration - FC Oppenwehe II
// ============================================

// GitHub Repository Konfiguration
const GITHUB_CONFIG = {
    owner: 'maikrehburg',
    repo: 'fco-2',
    branch: 'main',
    dataFile: 'data.json'
};

// App Configuration
const APP_CONFIG = {
    name: 'FC Oppenwehe II',
    shortName: 'FCO II',
    logo: 'https://assets.vereinify.com/b9973154-a615-420a-a696-0343240a7750/header.logo/1651081669/FCO-Wappen.gif',
    themeColor: '#b32d06',
    themeColorDark: '#8a2205'
};

// ============================================
// Season Management
// ============================================

function getCurrentSeason() {
    return localStorage.getItem('fco_current_season') || '2526';
}

function setCurrentSeason(key) {
    localStorage.setItem('fco_current_season', key);
}

// Gibt den Dateinamen der aktuellen Saison zurück.
// Nutzt immer season_XXXX.json Format - keine Fallback auf data.json mehr
function getDataFile() {
    const season = getCurrentSeason();
    return `season_${season}.json`;
}

// '2526' → '25/26'
function seasonKeyToLabel(key) {
    return key.length === 4
        ? `${key.substring(0, 2)}/${key.substring(2, 4)}`
        : key;
}

// '26/27' oder '2627' → '2627'
function seasonLabelToKey(label) {
    return label.replace(/\D/g, '');
}

// ============================================
// GitHub Token Authentication
// ============================================

function checkGitHubToken() {
    let token = localStorage.getItem('githubToken');
    if (!token) {
        openAuthModal();
    }
    return token;
}

function resetGitHubToken() {
    localStorage.removeItem('githubToken');
    alert('Token wurde gelöscht. Bitte melden Sie sich erneut an.');
    location.reload();
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('tokenInput').focus();
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function saveGitHubToken() {
    const token = document.getElementById('tokenInput').value.trim();
    if (!token) {
        alert('Bitte geben Sie einen Token ein.');
        return;
    }
    localStorage.setItem('githubToken', token);
    alert('Token gespeichert!');
    closeAuthModal();
    updateSettingsButton();
}

function updateSettingsButton() {
    const btn = document.getElementById('settingsBtn');
    const token = localStorage.getItem('githubToken');
    if (btn) {
        btn.textContent = token ? '⚙️ Angemeldet' : '⚙️ Anmelden';
        btn.title = token ? 'Abmelden' : 'Token eingeben';
    }
}

// Stellt sicher, dass Modal-Events beim Laden der Page registriert sind
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.addEventListener('click', function(e) {
                if (e.target === this) closeAuthModal();
            });
        }
        updateSettingsButton();
    });
} else {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.addEventListener('click', function(e) {
            if (e.target === this) closeAuthModal();
        });
    }
    updateSettingsButton();
}
