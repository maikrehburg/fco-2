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
// Fällt auf data.json zurück wenn noch keine Saison ausgewählt wurde.
function getDataFile() {
    const season = localStorage.getItem('fco_current_season');
    return season ? `season_${season}.json` : 'data.json';
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
