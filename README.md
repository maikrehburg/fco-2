# FC Oppenwehe II - Team-App ⚽

Eine modulare Web-App für das Team-Management der FC Oppenwehe II.

**[Zur Team-App](https://maikrehburg.github.io/fco-2/)**

## 📱 Module

### 🏠 [Startseite](https://maikrehburg.github.io/fco-2/)
Zentrale Navigation zu allen Team-Funktionen

### 📅 [Spielplan](https://maikrehburg.github.io/fco-2/spielplan.html)
- Anzeige aller Spiele der Saison 25/26
- Integration von fussball.de
- Termine und Ergebnisse

### 👕 [Trikotwäsche](https://maikrehburg.github.io/fco-2/laundry/)
- Spielerverwaltung
- Waschdaten mit Datum und Gegner/Anlass erfassen
- Sortierung nach Anzahl der Wäschen
- GitHub-basierte Datenspeicherung

## 🛠 Technische Struktur

```
fco-2/
├── index.html              # Startseite
├── style.css               # Globale Styles (Header, Komponenten)
├── home.css                # Styles für Startseite
├── manifest.json           # Globale PWA-Konfiguration
├── config.js               # Globale Konfiguration
├── match-plan/
│   ├── match-plan.html     # Spielplan-Seite
│   └── match-plan.css      # Spielplan-spezifische Styles
└── laundry/
    ├── laundry.html        # Trikotwäsche-App
    ├── laundry.css         # Trikotwäsche-spezifische Styles
    ├── script.js           # App-Logik
    └── data.json           # Spielerdaten
```

**CSS-Architektur:**
- `style.css` - Globale Komponenten (Header, Theme-Variablen)
- `home.css` - Startseiten-spezifische Styles
- `match-plan.css` - Spielplan-spezifische Styles
- `laundry.css` - Trikotwäsche-spezifische Styles

## 🎨 Features

- ✅ **PWA-Support**: Als App auf dem Smartphone-Startbildschirm installierbar
- ✅ **Responsive Design**: Optimiert für Mobile und Desktop
- ✅ **Offline-fähig**: Daten werden lokal vorgehalten
- ✅ **GitHub Integration**: Automatische Datensynchronisation
- ✅ **Modularer Aufbau**: Einfach erweiterbar mit neuen Modulen

## 🔐 Verwendung

Die App ist öffentlich zugänglich. Zum Ansehen aller Inhalte ist kein Login erforderlich. 

Für die Trikotwäsche-Verwaltung wird zum Bearbeiten ein GitHub Personal Access Token benötigt:
1. Gehe zu [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Erstelle ein "Personal Access Token (classic)"
3. Wähle die "repo" Berechtigung
4. Füge das Token in der App ein, wenn du Daten bearbeiten möchtest