# HA-BPMN-Manager

> Ein leistungsstarkes, sicheres und modernes WordPress-Plugin zur Modellierung, Simulation und Anzeige von **BPMN 2.0-Workflows** basierend auf **bpmn-js**.

---

## Inhaltsverzeichnis
1. [Architektur & Ordnerstruktur](#architektur--ordnerstruktur)
2. [Voraussetzungen](#voraussetzungen)
3. [Entwicklungs- & Build-Befehle](#entwicklungs---build-befehle)
4. [Packaging & Deployment (Installierbares ZIP)](#packaging--deployment-installierbares-zip)
5. [Docker-Build (Alternative ohne lokales Node.js)](#docker-build-alternative-ohne-lokales-nodejs)
6. [Shortcode-Referenz & Verwendung](#shortcode-referenz--verwendung)
7. [Lizenz- & Veröffentlichungshinweise](#lizenz---veröffentlichungshinweise)

---

## Architektur & Ordnerstruktur

Das Projekt trennt Entwicklungs- und Build-Werkzeuge strikt von den produktiven WordPress-Laufzeitdateien:

```text
ha-bpmn-manager/  (Repository Root)
│
├── plugin/                                  # REINER WORDPRESS PLUGIN-ORDNER
│   ├── ha-bpmn-manager.php                  # Haupt-Plugin-Datei (Bootstrap)
│   ├── readme.txt                           # WordPress Readme (Metadaten & Changelog)
│   ├── LICENSE.txt                          # GPL-3.0-or-later
│   ├── BPMN_IO_LICENSE.txt                  # bpmn.io Lizenzhinweis
│   ├── uninstall.php                        # Datenbankbereinigung bei Deinstallation
│   ├── assets/                              # Kompilierte JS/CSS-Dateien & BPMN-Fonts
│   ├── includes/                            # Vollständig dokumentierte PHP-Klassen
│   ├── languages/                           # Übersetzungen (.pot, .po, .mo)
│   └── templates/                           # CPT Single Template (Theme-overridable)
│
├── app/                                     # ENTWICKLUNGS- & BUILD-UMGEBUNG
│   ├── src/                                 # ES6 JS-Quellcode (app.js, bpmnlint-config)
│   ├── package.json                         # npm dependencies & Skripte
│   ├── webpack.config.js                    # Webpack 5 (baut direkt nach plugin/assets/)
│   └── .bpmnlintrc
│
├── bin/                                     # AUTOMATISIERUNGS- & PACKAGING-TOOLS
│   ├── build.ps1                            # 1-Klick Asset-Build (Node oder Docker)
│   ├── package.ps1                          # Erstellt release/ha-bpmn-manager.zip
│   └── Dockerfile                           # Container-Build-Fallback
│
├── release/                                 # GENERIERTE INSTALLATIONS-ARCHIVE
│   └── ha-bpmn-manager.zip                  # Fertiges Plugin-ZIP für WordPress
│
└── README.md                                # Dieses Entwickler-Handbuch
```

> **Wichtig:** Der Ordner `plugin/` enthält keinerlei Entwickler-Abhängigkeiten (`node_modules`, Quell-Dateien etc.). Er kann direkt nach `wp-content/plugins/ha-bpmn-manager` verlinkt oder kopiert werden!

---

## Voraussetzungen

- **Für die lokale Entwicklung:**
  - [Node.js](https://nodejs.org/) Version 18+ und **npm** 9+
  - **PowerShell** 5.1+ (unter Windows 10/11 standardmäßig vorinstalliert)
  - Optional: [Docker Desktop](https://www.docker.com/), falls kein lokales Node.js vorhanden ist
- **Für die WordPress-Laufzeit:**
  - WordPress 5.8+ (getestet bis 6.9)
  - PHP 8.2+ (getestet bis 8.4+)

---

## Entwicklungs- & Build-Befehle

Alle JavaScript- und SCSS/CSS-Dateien werden im Ordner `app/` gepflegt und von Webpack nach `plugin/assets/` kompiliert.

### 1. Abhängigkeiten installieren
```bash
cd app
npm install
```

### 2. Entwicklungsmodus mit Live-Watcher (Watch Mode)
Startet Webpack im Entwicklungsmodus mit Source Maps. Jede Änderung in `app/src/` wird automatisch neu kompiliert:
```bash
npm run dev
```

### 3. Produktions-Build (Minifiziert & Tree-Shaken)
Erzeugt die minifizierten Produktionsdateien `plugin/assets/js/bpmn-bundle.min.js` und `plugin/assets/css/bpmn-bundle.min.css`:
```bash
npm run build
```

---

## Packaging & Deployment (Installierbares ZIP)

Um aus dem Repository ein sofort installierbares WordPress-Plugin-ZIP zu erzeugen, steht das PowerShell-Skript `bin/package.ps1` bereit:

### Standard-Packaging (erzeugt das Release-ZIP)
Führen Sie im Projekt-Hauptverzeichnis aus:
```powershell
.\bin\package.ps1
```
*Was passiert:*
1. Der Inhalt von `plugin/` wird geprüft.
2. Es wird eine temporäre Staging-Struktur mit dem kanonischen Slug `ha-bpmn-manager/` erstellt.
3. Sämtliche Entwickler-Dateien (`.map`, `.git`, Dev-Configs) werden gefiltert.
4. Es wird ein sauberes, kompaktes ZIP-Archiv unter `release/ha-bpmn-manager.zip` (und versionsspezifisch `release/ha-bpmn-manager-v4.9.0.zip`) erstellt.

### Build & Packaging in einem einzigen Befehl
Kompiliert die JS/CSS-Assets neu und packt anschließend direkt das fertige ZIP:
```powershell
.\bin\package.ps1 -Build
```

### Installation in WordPress
1. Öffnen Sie Ihr WordPress-Adminmenü.
2. Navigieren Sie zu **Plugins -> Installieren -> Plugin hochladen**.
3. Wählen Sie `release/ha-bpmn-manager.zip` aus und klicken Sie auf **Jetzt installieren** und **Aktivieren**.

---

## Docker-Build (Alternative ohne lokales Node.js)

Falls auf dem Entwickler-Rechner kein Node.js installiert ist, kann der Build vollautomatisch über Docker ausgeführt werden:

```bash
docker run --rm -v "${PWD}:/workspace" -w /workspace/app node:20-alpine sh -c "npm install && npm run build"
```
Das PowerShell-Skript `.\bin\build.ps1` erkennt automatisch, ob Node oder Docker vorhanden ist, und wählt die passende Methode.

---

## Shortcode-Referenz & Verwendung

Jedes erstellte BPMN-Diagramm kann über Shortcodes in Seiten, Beiträge oder Widgets eingebunden werden:

### Basis-Shortcode
```text
[bpmnm id="123"]
```
*(Hinweis: `[bpmn id="123"]` wird als abwärtskompatibler Alias ebenfalls unterstützt.)*

### Erweiterte Attribute
| Parameter | Standard | Beschreibung | Beispiel |
| :--- | :--- | :--- | :--- |
| `id` | `0` (bzw. aktueller Post) | ID des BPMN-Beitrags | `id="42"` |
| `height` | `600px` | CSS-Höhe des Canvas-Viewers | `height="800px"` oder `height="80vh"` |
| `fullscreen` | `true` | Zeigt den Vollbild-/Lightbox-Button an | `fullscreen="false"` |

**Beispiel mit allen Optionen:**
```text
[bpmnm id="42" height="750px" fullscreen="true"]
```

### Multi-Instance-Fähigkeit
Es können beliebig viele Diagramme auf einer einzigen Seite eingebunden werden:
```text
[bpmnm id="101" height="500px"]
[bpmnm id="102" height="500px"]
```
Beide Diagramme initialisieren sich vollkommen autark und kollisionsfrei.

---

## Lizenz- & Veröffentlichungshinweise

### Lizenzierung (GPL-3.0 + bpmn.io)
- **PHP-Plugin-Code:** Lizenziert unter der **GNU General Public License v3 oder höher (GPL-3.0-or-later)**.
- **Eingebundene Bibliothek (bpmn-js):** Lizenziert unter der **bpmn.io License** von Camunda Services GmbH (modifizierte MIT-Lizenz mit verpflichtender Namensnennung / Wasserzeichen).

### Verteilung außerhalb des offiziellen WordPress.org Stores
Wegen der bindenden Wasserzeichen-Pflichtklausel von Camunda ist `bpmn-js` formell inkompatibel mit der 100%-GPL-Richtlinie des WordPress.org Plugin Directory. Außerhalb von WordPress.org ist die Verbreitung als aggregiertes Werk rechtlich vollkommen legal.

**Empfohlener Update-Mechanismus:**
Das Plugin ist für den **Plugin Update Checker (PUC)** vorbereitet. Bei Veröffentlichung über **GitHub Releases** erhalten Nutzer automatische 1-Klick-Updates direkt in ihrem WordPress-Adminbereich.
