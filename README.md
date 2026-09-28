# Schalttafel

Soundboard im Look einer 50er-Jahre-Schalttafel – als Windows-Desktop-App (Tauri v2).
Ursprung: Lovable-Projekt „Soundboard Studio“, hier als reines Vite/React-Frontend ohne Server.

## .exe bekommen (ohne etwas zu installieren)

1. Repo auf GitHub hochladen (Branch `main`).
2. Reiter **Actions** → Workflow **Windows-Build** läuft automatisch (oder „Run workflow“).
3. Nach ca. 10 Minuten im Lauf unten bei **Artifacts** → `Schalttafel-Windows` herunterladen.

Im ZIP:

| Datei | Zweck |
|---|---|
| `schalttafel.exe` | Portable – einfach starten, keine Installation |
| `Schalttafel_1.0.0_x64-setup.exe` | Installer (ohne Adminrechte, nur für den aktuellen Benutzer) |
| `Schalttafel_1.0.0_x64_de-DE.msi` | MSI-Paket, z. B. für Softwareverteilung |

Voraussetzung auf dem Zielrechner: WebView2 (ist bei Windows 10/11 praktisch immer vorhanden).
Die Datei ist nicht signiert – SmartScreen fragt beim ersten Start evtl. nach („Weitere Informationen“ → „Trotzdem ausführen“).

## Lokal bauen

Voraussetzungen: Node.js 22, Rust (rustup), Visual Studio Build Tools mit „Desktopentwicklung mit C++“.

```bash
npm ci
npm run tauri dev     # Entwicklungsmodus mit Live-Reload
npm run tauri build   # fertige .exe/.msi unter src-tauri/target/release
```

## Hinweise

- Sounds und Einstellungen liegen in der IndexedDB der App (`%LOCALAPPDATA%\de.sauck.schalttafel`).
  Übertragen zwischen Rechnern oder aus der Web-Version: „Sicherung“ → „Einlesen“.
- Icon ändern: `src-tauri/app-icon.svg` anpassen, dann `npx tauri icon src-tauri/app-icon.svg -o src-tauri/icons`.
