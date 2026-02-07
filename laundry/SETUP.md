# Trikotwäscheliste - Setup für GitHub Pages

## 1. GitHub Repository erstellen

1. Erstelle ein neues Repository auf GitHub
2. Pushe die Dateien aus dem `laundry` Ordner

```bash
cd laundry
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/DEIN-REPO.git
git push -u origin main
```

## 2. Konfiguration anpassen

Öffne `config.js` und passe die Werte an:

```javascript
const GITHUB_CONFIG = {
    owner: 'dein-github-username',  // Dein GitHub Username
    repo: 'repository-name',         // Dein Repository Name
    branch: 'main',
    dataFile: 'data.json'           // Datei für die Daten
};
```

## 3. GitHub Personal Access Token erstellen

1. Gehe zu https://github.com/settings/tokens
2. Klicke "Generate new token (classic)"
3. Gib dem Token einen Namen (z.B. "Trikotwäscheliste")
4. Wähle die Berechtigung **"repo"** (voller Zugriff auf Repositories)
5. Klicke "Generate token"
6. **Kopiere das Token sofort** (es wird nur einmal angezeigt!)

## 4. GitHub Pages aktivieren

1. Gehe zu deinem Repository
2. Settings → Pages
3. Source: Branch "main" auswählen
4. Ordner: "/ (root)" auswählen
5. Save

Die App ist dann verfügbar unter:
`https://dein-username.github.io/repository-name/`

## 5. App verwenden

1. Öffne die App im Browser
2. Beim ersten Besuch wird nach dem GitHub Token gefragt
3. Füge dein erstelltes Token ein
4. Das Token wird lokal im Browser gespeichert
5. Alle Änderungen werden automatisch als Commits im Repository gespeichert!

## Wichtig

- Das Token wird nur lokal im Browser gespeichert (localStorage)
- Jeder Benutzer benötigt sein eigenes Token mit Schreibrechten
- Die Daten werden in `data.json` im Repository gespeichert
- Jede Änderung erstellt einen neuen Commit

## Token zurücksetzen

Klicke auf das Zahnrad-Symbol ⚙️ oben rechts, um das Token zu löschen und ein neues einzugeben.
