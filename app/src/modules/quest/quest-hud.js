/**
 * HA-BPMN-Manager: Interactive Quest HUD & Learning Companion
 *
 * Implements an interactive companion HUD docked to the BPMN Studio canvas.
 * Provides chapter navigation with smooth auto-pan and spotlight highlighting,
 * mission tracking with auto-advancement on fulfilled tasks, locked forward
 * navigation until tasks are completed, once-only XP awards, gamified linter
 * challenges, and certificate conferral.
 *
 * @package HA_BPMN_Manager
 */

import { LINTER_CHALLENGES } from './challenges.js';
import { showCertificateModal, getHonorGrade } from './certificate.js';
import { getQuestXml } from '../templates.js';
import { escapeHtml } from '../escape-html.js';
import {
  getHudString,
  getChapterInfo,
  getSubtaskInfo,
  getNextTierInfo,
  getLinterRulesContent,
  resolveQuestLang
} from './quest-i18n.js';

export class QuestHUD {
  /**
   * Initializes the Quest HUD.
   *
   * @param {HTMLElement} wrap Container element (.ha-bpmn-editor-wrap).
   * @param {Object} modeler bpmn-js Modeler instance.
   * @param {Object} options Configuration and i18n options.
   */
  constructor(wrap, modeler, options = {}) {
    this.wrap = wrap;
    this.modeler = modeler;
    this.options = options;
    this.lang = options.lang || 'de';
    this.isDe = this.lang === 'de';

    this.activeTab = 'walkthrough'; // 'walkthrough' | 'challenges'
    this.currentChapterIndex = 0;
    this.isMinimized = false;
    this.activeChallenge = null;
    this.challengeState = null;
    this.challengeLoading = false;
    this.completedChallenges = new Set();
    this.completedChapters = new Set();
    this.completedSubtasks = new Set();
    this.xp = 100;
    this.hudElement = null;

    // Load persisted progress from localStorage
    try {
      const saved = localStorage.getItem('ha_bpmn_quest_save');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.xp === 'number') this.xp = parsed.xp;
        if (Array.isArray(parsed.completedChapters)) {
          this.completedChapters = new Set(parsed.completedChapters);
        }
        if (Array.isArray(parsed.completedChallenges)) {
          this.completedChallenges = new Set(parsed.completedChallenges);
        }
        if (Array.isArray(parsed.completedSubtasks)) {
          this.completedSubtasks = new Set(parsed.completedSubtasks);
        }
      }
    } catch (e) {}

    this.chapters = [
      {
        id: 'chapter1',
        icon: '🏰',
        title: {
          de: 'Kapitel 1: Das Erwachen (Start & Erste Modellierung)',
          en: 'Chapter 1: The Awakening (Start & First Modeling)'
        },
        targetId: 'StartEvent_Quest',
        box: { x: 200, y: 0, width: 750, height: 950 },
        taskText: {
          de: 'Aktiviere das Token Game, starte am Start-Event und erstelle deine erste eigene Aufgabe!',
          en: 'Activate token simulation, start at start event, and model your first task!'
        },
        tipText: {
          de: 'Nutze die linke Palette oder klicke auf ein Element, um das Kontext-Menü (Kreis) zu nutzen.',
          en: 'Use the left palette or click any element to use the circular context pad.'
        },
        subtasks: [
          {
            id: 'c1_toggle_sim',
            text: {
              de: 'Token-Game aktivieren (Play-Symbol unten links)',
              en: 'Activate Token Game (Play icon bottom-left)'
            },
            hint: {
              de: 'Klicke unten links auf das Play-Symbol oder drücke "T"',
              en: 'Click the play toggle in the bottom-left palette or press "T"'
            }
          },
          {
            id: 'c1_start_event',
            text: {
              de: 'Start-Event auslösen (Token starten ▶)',
              en: 'Trigger Start Event (Launch token ▶)'
            },
            hint: {
              de: 'Klicke im aktiven Token Game auf den Kreis des Start-Events, um den goldenen Token loszuschicken',
              en: 'Click on the Start Event circle in active token simulation to launch the golden token'
            }
          },
          {
            id: 'c1_model_task',
            text: {
              de: '🔨 Bauauftrag: Aufgabe "Proviant vorbereiten" erstellen & benennen (Rechteck 🔲)',
              en: '🔨 Build Task: Create & name Task "Prepare Rations" (Rectangle 🔲)'
            },
            hint: {
              de: 'Klicke in der linken Palette auf das abgerundete Rechteck (Task 🔲), platziere es in der Helden-Lane und benenne es per Doppelklick als "Proviant vorbereiten"',
              en: 'Click the rounded rectangle (Task 🔲) in the left palette, place it into Hero Lane, and double-click to name it "Prepare Rations"'
            }
          },
          {
            id: 'c1_color_task',
            text: {
              de: '🎨 Farbe bekennen: Färbe eine Aufgabe in Lane 1 ein (Farbpalette 🎨)',
              en: '🎨 Choose Color: Color a task in Lane 1 (Color palette 🎨)'
            },
            hint: {
              de: 'Klicke auf deine erstellte Aufgabe "Proviant vorbereiten" oder eine Helden-Aufgabe und nutze das Farbpaletten-Symbol 🎨 im kleinen Menü direkt am Element, um ihr eine Farbe zuzuweisen.',
              en: 'Click your created task "Prepare Rations" or any hero task and use the color palette icon 🎨 in the context pad to give it a color.'
            }
          },
          {
            id: 'c1_open_properties',
            text: {
              de: '⚙️ Eigenschaften & Dokumentation öffnen (Button "Eigenschaften" oben)',
              en: '⚙️ Open Properties & Documentation ("Properties" button top)'
            },
            hint: {
              de: 'Klicke oben in der Werkzeugleiste auf den Button "Eigenschaften" (📋). Markiere eine Aufgabe (z. B. "Heldenklasse wählen") und öffne in der rechten Seitenleiste den Bereich "Dokumentation", um die QM-Arbeitsanweisung zu studieren!',
              en: 'Click the "Properties" button (📋) in the top toolbar. Select a task (e.g. "Choose Hero") and open the "Documentation" section in the right sidebar to inspect the QM instructions!'
            }
          },
          {
            id: 'c1_add_annotation',
            text: {
              de: '📝 Kommentar anheften: Ergänze eine Text-Annotation (Symbol [ am Element) an eine Aufgabe ohne Notiz',
              en: '📝 Attach Note: Add a Text Annotation (symbol [ on element) to a task without note'
            },
            hint: {
              de: 'Klicke auf deine erstellte Aufgabe "Proviant vorbereiten" oder auf "Rucksack packen". Wähle im Kontextmenü direkt am Element das Notiz-Symbol [ (Text-Annotation) und schreibe einen kurzen Kommentar.',
              en: 'Click your task "Prepare Rations" or "Pack Gear". In the element context menu, click the note symbol [ (Text Annotation) and type a brief note.'
            }
          },
          {
            id: 'c1_user_tasks',
            text: {
              de: 'Heldenklasse wählen (👤) & Rucksack packen (✋)',
              en: 'Choose Hero (👤) & Pack Gear (✋)'
            },
            hint: {
              de: 'Klicke auf die beiden Vorbereitungs-Aufgaben im Token Game',
              en: 'Click both preparation activities in token simulation'
            }
          }
        ]
      },
      {
        id: 'chapter2',
        icon: '⚔️',
        title: {
          de: 'Kapitel 2: Weggabelung des Schicksals (XOR & Fluchtweg-Bau)',
          en: 'Chapter 2: Crossroads of Destiny (XOR & Escape Path)'
        },
        targetId: 'Gateway_XorChoice',
        box: { x: 860, y: 0, width: 780, height: 950 },
        taskText: {
          de: 'Schalte die XOR-Weiche um, löse die Ausnahme-Falle aus und schließe den Fluchtweg mit einem End-Event ab!',
          en: 'Toggle XOR switch, trigger incident trap, and complete the escape path with an End Event!'
        },
        tipText: {
          de: '💡 Was ist ein Linter? Wie eine automatische Rechtschreibprüfung für Prozesse prüft er dein BPMN-Modell nach ISO 19510! Du findest den Linter-Button unten zentriert auf der Zeichenfläche. Klicke darauf, um Regelverstöße und die 3 goldenen Regeln anzuzeigen!',
          en: '💡 What is a linter? Like an automated spell checker for workflows, it validates your model against ISO 19510! Find the linter button centered at the bottom of the canvas. Click it to view issues and inspect the 3 golden rules!'
        },
        subtasks: [
          {
            id: 'c2_switch_xor',
            text: {
              de: 'Weiche umstellen (Klick auf XOR-Gateway ✖ oder Pfad-Schalter)',
              en: 'Toggle Switch (Click XOR Gateway ✖ or Branch Switch)'
            },
            hint: {
              de: 'Klicke im Simulationsmodus auf das XOR-Gateway ✖ oder den kleinen Verzweigungs-Button direkt an der Weiche, um den Gefahrenpfad zur Trollhöhle einzuschalten',
              en: 'In simulation mode, click the XOR gateway ✖ or the small branch button directly on the gateway to select the hazard path to the Troll Cave'
            }
          },
          {
            id: 'c2_trigger_trap',
            text: {
              de: 'Ausnahme-Falle testen (Blitz-Symbol ⚡ Trollhöhle)',
              en: 'Test Exception Trap (Flash Icon ⚡ at Troll Cave)'
            },
            hint: {
              de: 'Error Boundary Events fangen unvorhergesehene Fehler ab und leiten sofort auf die Notfall-Spur um',
              en: 'Error boundary events catch failures and escalate immediately to emergency paths'
            }
          },
          {
            id: 'c2_model_end',
            text: {
              de: '🔨 Bauauftrag: Verbinde "Notruf senden" mit dem End-Event \'Rückzug zum Basislager\'',
              en: '🔨 Build Task: Connect "Call Help" to End Event \'Retreat to Base Camp\''
            },
            hint: {
              de: 'Klicke auf "Notruf senden", wähle das Pfeil-Werkzeug (Sequenzfluss) und klicke auf das rote End-Event \'Rückzug zum Basislager\' (🔴)',
              en: 'Click "Call Help", select the arrow tool (Sequence Flow) and connect to the red End Event \'Retreat to Base Camp\' (🔴)'
            }
          },
          {
            id: 'c2_color_hazard',
            text: {
              de: '🎨 Signalfarbe setzen: Färbe den Notfallpfad rot ein (z. B. End-Event 🔴)',
              en: '🎨 Set Alert Color: Color the incident path red (e.g. End Event 🔴)'
            },
            hint: {
              de: 'In BPMN-Diagrammen werden Ausnahme- und Notfallpfade oft rot hervorgehoben. Markiere das End-Event "Rückzug zum Basislager" oder "Notruf senden" und wähle im Farbmenü 🎨 einen Rot- oder Orangeton.',
              en: 'In BPMN diagrams, incident and error paths are commonly highlighted red. Click "Retreat to Base Camp" or "Call Help" and pick a red or orange shade via the color icon 🎨.'
            }
          },
          {
            id: 'c2_study_linter',
            text: {
              de: 'Linter-Regeln studieren (Linter unten mittig aktivieren 📜)',
              en: 'Study Linter Rules (Activate linter at bottom center 📜)'
            },
            hint: {
              de: '💡 Was ist ein Linter? Eine automatische Prozess-Prüfung (Rechtschreibprüfung für BPMN) nach ISO 19510!\n📍 Wo zu finden? Unten mittig auf der Zeichenfläche (Pille mit Fehleranzeige z. B. „0 Fehler“). Klicke darauf, um den Linter zu aktivieren und die 3 goldenen Regeln zu öffnen.',
              en: '💡 What is a linter? An automated workflow checker (spell check for BPMN) according to ISO 19510!\n📍 Where to find? Centered at the bottom of the canvas (pill badge with issue count e.g. "0 errors"). Click it to activate linting and inspect the 3 golden rules.'
            }
          }
        ]
      },
      {
        id: 'chapter3',
        icon: '🔮',
        title: {
          de: 'Kapitel 3: Portal der Parallelität (AND-Split & Schmiede-Anbindung)',
          en: 'Chapter 3: Portal of Parallelism (AND-Split & Workshop Link)'
        },
        targetId: 'Gateway_AndSplit',
        box: { x: 1400, y: 0, width: 650, height: 950 },
        taskText: {
          de: 'Verbinde die Schmiede per Pfeil mit dem AND-Join, löse den AND-Split aus und beobachte die Synchronisation!',
          en: 'Connect forge to AND-Join, trigger AND-Split, and observe synchronization!'
        },
        tipText: {
          de: 'Das AND-Join (➕) wartet geduldig, bis Tokens aus ALLEN eingehenden Pfaden eingetroffen sind.',
          en: 'The AND-Join (➕) synchronizes by waiting until tokens arrive from ALL incoming branches.'
        },
        subtasks: [
          {
            id: 'c3_model_connect',
            text: {
              de: '🔨 Bauauftrag: Verbinde die Schmiede per Pfeil mit dem AND-Join (➕)',
              en: '🔨 Build Task: Connect forge to AND-Join Gateway (➕)'
            },
            hint: {
              de: 'Klicke auf "Schwert schmieden" in Lane 3 und ziehe einen Pfeil zum AND-Join',
              en: 'Click "Forge Sword" in Lane 3 and draw an arrow to AND-Join'
            }
          },
          {
            id: 'c3_and_split',
            text: {
              de: 'AND-Split auslösen (Klick auf AND-Gateway ➕)',
              en: 'Trigger AND-Split (Click AND Gateway ➕)'
            },
            hint: {
              de: 'Erzeugt 2 Tokens gleichzeitig in Lane 1 und Lane 3',
              en: 'Spawns 2 tokens concurrently in Lane 1 and Lane 3'
            }
          },
          {
            id: 'c3_spell_task',
            text: {
              de: 'Schutzzauber in Lane 1 wirken (🛡️ Business Rule)',
              en: 'Cast Shield Spell in Lane 1 (🛡️ Business Rule)'
            },
            hint: {
              de: 'Business Rule Tasks automatisieren Entscheidungslogiken',
              en: 'Business rule tasks automate decision logic'
            }
          },
          {
            id: 'c3_and_join',
            text: {
              de: 'Synchronisation am AND-Join beobachten',
              en: 'Observe Synchronization at AND-Join'
            },
            hint: {
              de: 'Das Join-Gateway wartet, bis BEIDE parallelen Pfade eingetroffen sind',
              en: 'The join gateway waits until BOTH paths have completed'
            }
          }
        ]
      },
      {
        id: 'chapter4',
        icon: '⏱️',
        title: {
          de: 'Kapitel 4: Halle der Zeit & Das Schatzgewölbe (Timer & Datenspeicher)',
          en: 'Chapter 4: Hall of Time & Treasure Vault (Timer & Data Store)'
        },
        targetId: 'SubProcess_Vault',
        box: { x: 1880, y: 0, width: 850, height: 950 },
        taskText: {
          de: 'Raste 3s am Lagerfeuer, platziere einen Datenspeicher (🛢️ Tresor) beim Gewölbe und berge das BPMN-Relikt!',
          en: 'Rest 3s at campfire, place a Data Store (🛢️ Vault) near the vault, and loot relic!'
        },
        tipText: {
          de: 'Datenspeicher (🛢️) repräsentieren persistente Datenstrukturen oder Tresore, die über den Prozess hinaus bestehen.',
          en: 'Data stores (🛢️) represent persistent storage structures retained beyond single workflow executions.'
        },
        subtasks: [
          {
            id: 'c4_timer_rest',
            text: {
              de: '3s Pause am Lagerfeuer einlegen (⏱️ Timer-Event)',
              en: 'Rest 3s at campfire (⏱️ Timer Event)'
            },
            hint: {
              de: 'Zwischenereignisse vom Typ Timer pausieren die Simulation automatisch',
              en: 'Intermediate timer events pause execution automatically'
            }
          },
          {
            id: 'c4_model_datastore',
            text: {
              de: '🔨 Bauauftrag: Platziere einen Datenspeicher (🛢️ Tresor-Symbol) beim Gewölbe',
              en: '🔨 Build Task: Place a Data Store (🛢️ Vault Storage) near vault'
            },
            hint: {
              de: 'Wähle das Zylinder-Symbol (Datenspeicher 🛢️) in der linken Palette und platziere es beim Gewölbe als Tresor-Datenbank',
              en: 'Select the cylinder icon (Data Store 🛢️) in the left palette and place it near the vault as persistent storage'
            }
          },
          {
            id: 'c4_enter_vault',
            text: {
              de: 'Subprozess "Schatzkammer" betreten & Relikt bergen (📦)',
              en: 'Enter "Vault" Subprocess & loot relic (📦)'
            },
            hint: {
              de: 'Klicke nacheinander auf die Aktivitäten im Subprozess',
              en: 'Click the activities sequentially inside the vault'
            }
          }
        ]
      },
      {
        id: 'chapter5',
        icon: '👑',
        title: {
          de: 'Kapitel 5: Gilde der Prozessmeister (Datenfluss & Audit)',
          en: 'Chapter 5: Guild of Process Masters (Data Flow & Audit)'
        },
        targetId: 'Task_VerifyGuild',
        box: { x: 2550, y: 0, width: 680, height: 950 },
        taskText: {
          de: 'Verknüpfe das Quest-Logbuch per Daten-Assoziation, führe das Gilden-Audit durch und nimm deinen Titel entgegen!',
          en: 'Link Quest Logbook via data association, perform guild audit, and receive title!'
        },
        tipText: {
          de: 'Daten-Assoziationen (gestrichelte Pfeile) modellieren den Lese- und Schreibzugriff auf Datenobjekte.',
          en: 'Data associations (dashed arrows) model read/write access to data objects.'
        },
        subtasks: [
          {
            id: 'c5_model_data_assoc',
            text: {
              de: '🔨 Bauauftrag: Verbinde "📄 Quest-Logbuch" mit der Urkunden-Aufgabe',
              en: '🔨 Build Task: Connect "📄 Quest Logbook" to Award Task'
            },
            hint: {
              de: 'Klicke auf das Datenobjekt und ziehe eine Datenassoziation zur Urkunden-Aufgabe',
              en: 'Click data object and draw data association to award task'
            }
          },
          {
            id: 'c5_guild_audit',
            text: {
              de: 'Gilden-Audit in Lane 4 durchführen (⚙️ Prüfung)',
              en: 'Conduct Guild Audit in Lane 4 (⚙️ Audit Task)'
            },
            hint: {
              de: 'Die Gilde prüft Konformität und Qualität des Gesamtmodells',
              en: 'The Guild verifies compliance and quality of the model'
            }
          },
          {
            id: 'c5_award_master',
            text: {
              de: 'Großmeister-Titel empfangen (👑 Task_AwardMaster)',
              en: 'Receive Master Title (👑 Task_AwardMaster)'
            },
            hint: {
              de: 'Klicke auf die Urkunden-Aufgabe, um den Weg zur Architekten-Prüfung freizuschalten',
              en: 'Click the award task to unlock the path to the Architect Exam'
            }
          }
        ]
      },
      {
        id: 'chapter6',
        icon: '🏛️',
        title: {
          de: 'Kapitel 6: Die Architekten-Prüfung (Cross-Lane Modellierung)',
          en: 'Chapter 6: The Architect\'s Exam (Cross-Lane Modeling)'
        },
        targetId: 'Task_PlanMasterpiece',
        box: { x: 3150, y: 0, width: 950, height: 950 },
        taskText: {
          de: 'Die Meisterprüfung: Erstelle eine Aufgabe in der Werkstatt-Lane (Lane 3), ziehe Sequenzflüsse über Lane-Grenzen hinweg und schließe bei der Gilde (Lane 4) ab!',
          en: 'The Master Trial: Create a task in Workshop Lane (Lane 3), draw cross-lane sequence flows, and finish at the Guild (Lane 4)!'
        },
        tipText: {
          de: 'Swimlanes trennen Verantwortungsbereiche. Sequenzflüsse dürfen frei zwischen Lanes fließen, aber niemals Pool-Grenzen überschreiten!',
          en: 'Swimlanes separate roles. Sequence flows cross lane boundaries freely, but never pool boundaries!'
        },
        subtasks: [
          {
            id: 'c6_plan_masterpiece',
            text: {
              de: 'Meisterwerk in der Helden-Lane planen (👤 Task)',
              en: 'Plan Masterpiece in Hero Lane (👤 Task)'
            },
            hint: {
              de: 'Klicke auf "Meisterwerk planen" in Lane 1',
              en: 'Click "Plan Masterpiece" in Lane 1'
            }
          },
          {
            id: 'c6_create_workshop_task',
            text: {
              de: '🔨 Bauauftrag 1: Erstelle eine neue Aufgabe in der Werkstatt (Lane 3)',
              en: '🔨 Build Task 1: Create a new Task in Workshop (Lane 3)'
            },
            hint: {
              de: 'Ziehe eine Aufgabe aus der Palette in Lane 3 (Zauberwerkstatt) bei x > 3200',
              en: 'Drag a task from palette into Lane 3 (Workshop) at x > 3200'
            }
          },
          {
            id: 'c6_connect_cross_lane1',
            text: {
              de: '🔨 Bauauftrag 2: Ziehe einen Pfeil von Lane 1 nach Lane 3 (Cross-Lane)',
              en: '🔨 Build Task 2: Draw an arrow from Lane 1 to Lane 3 (Cross-Lane)'
            },
            hint: {
              de: 'Verbinde "Meisterwerk planen" (Lane 1) mit deiner neuen Werkstatt-Aufgabe (Lane 3)',
              en: 'Connect "Plan Masterpiece" (Lane 1) to your new workshop task (Lane 3)'
            }
          },
          {
            id: 'c6_connect_cross_lane2',
            text: {
              de: '🔨 Bauauftrag 3: Verbinde Werkstatt-Aufgabe mit "Finale Bauabnahme" (Lane 4)',
              en: '🔨 Build Task 3: Connect Workshop Task to "Final Audit" (Lane 4)'
            },
            hint: {
              de: 'Ziehe einen Pfeil von deiner Werkstatt-Aufgabe zu "Finale Bauabnahme" in der Gilden-Lane',
              en: 'Draw an arrow from your workshop task to "Final Audit" in Guild Lane'
            }
          },
          {
            id: 'c6_finish_grandmaster',
            text: {
              de: 'Finale Bauabnahme durchführen & Großmeister-Status krönen (🏆)',
              en: 'Complete Final Audit & achieve Grandmaster Architect Status (🏆)'
            },
            hint: {
              de: 'Klicke im Token Game auf "Finale Bauabnahme" und das Abschluss-Event',
              en: 'Click "Final Audit" and the end event in token simulation'
            }
          }
        ]
      }
    ];

    this.init();
  }

  t(key) {
    return getHudString(key, this.lang);
  }

  getChapterTitle(chap) {
    const info = getChapterInfo(chap.id, this.lang);
    return info?.title || (chap.title ? (chap.title[this.lang] || chap.title.en || chap.title.de) : '');
  }

  getChapterTaskText(chap) {
    const info = getChapterInfo(chap.id, this.lang);
    return info?.taskText || (chap.taskText ? (chap.taskText[this.lang] || chap.taskText.en || chap.taskText.de) : '');
  }

  getChapterTipText(chap) {
    const info = getChapterInfo(chap.id, this.lang);
    return info?.tipText || (chap.tipText ? (chap.tipText[this.lang] || chap.tipText.en || chap.tipText.de) : '');
  }

  getSubtaskText(st) {
    const info = getSubtaskInfo(st.id, this.lang);
    return info?.text || (st.text ? (st.text[this.lang] || st.text.en || st.text.de) : '');
  }

  getSubtaskHint(st) {
    const info = getSubtaskInfo(st.id, this.lang);
    return info?.hint || (st.hint ? (st.hint[this.lang] || st.hint.en || st.hint.de) : '');
  }

  saveProgress() {
    try {
      localStorage.setItem('ha_bpmn_quest_save', JSON.stringify({
        xp: this.xp,
        completedChapters: Array.from(this.completedChapters),
        completedChallenges: Array.from(this.completedChallenges),
        completedSubtasks: Array.from(this.completedSubtasks)
      }));
    } catch (e) {}
  }

  async syncWithAchievementApi() {
    const api = window.bpmnSettings && window.bpmnSettings.achievementApi;
    if (!api || !api.available || !api.restUrl) return;

    try {
      const res = await fetch(`${api.restUrl}user/progress`, {
        headers: {
          'X-WP-Nonce': api.nonce || ''
        }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success) {
        let updated = false;
        if (data.tasks) {
          Object.entries(data.tasks).forEach(([key, t]) => {
            if (t && t.is_completed && !this.completedSubtasks.has(key)) {
              this.completedSubtasks.add(key);
              updated = true;
            }
          });
        }
        if (data.profile && typeof data.profile.total_xp === 'number' && data.profile.total_xp > this.xp) {
          this.xp = data.profile.total_xp;
          updated = true;
        }
        if (updated) {
          this.saveProgress();
          this.render();
          this.bindEvents();
        }
      }
    } catch (e) {
      console.debug('[HA-BPMN] Achievement API sync skipped:', e);
    }
  }

  reportTaskToAchievementApi(taskId) {
    const api = window.bpmnSettings && window.bpmnSettings.achievementApi;
    if (!api || !api.available || !api.restUrl) return;

    fetch(`${api.restUrl}tasks/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': api.nonce || ''
      },
      body: JSON.stringify({
        task_key: taskId,
        source: 'ha-bpmn-manager'
      })
    }).catch(e => console.debug('[HA-BPMN] Task report skipped:', e));
  }

  reportXpToAchievementApi(amount) {
    const api = window.bpmnSettings && window.bpmnSettings.achievementApi;
    if (!api || !api.available || !api.restUrl) return;

    fetch(`${api.restUrl}xp/award`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': api.nonce || ''
      },
      body: JSON.stringify({
        xp: amount,
        source: 'ha-bpmn-manager',
        reason: 'BPMN Quest Fortgang'
      })
    }).catch(e => console.debug('[HA-BPMN] XP report skipped:', e));
  }

  init() {
    this.removeExisting();
    if (!this.hudElement || !document.body.contains(this.hudElement)) {
      this.hudElement = document.createElement('div');
      document.body.appendChild(this.hudElement);
    }
    this.initDraggable();
    this.render();
    this.bindEvents();
    this.attachBPMNListeners();
    this.syncWithAchievementApi();
  }

  removeExisting() {
    document.querySelectorAll('.ha-quest-hud').forEach(el => {
      if (el !== this.hudElement) {
        el.remove();
      }
    });
  }

  setLanguage(newLang) {
    if (!newLang) return;
    this.lang = newLang;
    this.isDe = (newLang === 'de');
    this.render();
    this.bindEvents();
  }

  initDraggable() {
    if (this._draggableInitialized || !this.hudElement) return;
    this._draggableInitialized = true;

    const hud = this.hudElement;

    // Restore saved position from localStorage
    try {
      const saved = localStorage.getItem('ha_quest_hud_pos');
      if (saved) {
        const pos = JSON.parse(saved);
        if (typeof pos.left === 'number' && typeof pos.top === 'number') {
          const maxLeft = Math.max(10, window.innerWidth - 100);
          const maxTop = Math.max(10, window.innerHeight - 80);
          const clampedLeft = Math.min(Math.max(10, pos.left), maxLeft);
          const clampedTop = Math.min(Math.max(10, pos.top), maxTop);
          hud.style.left = `${clampedLeft}px`;
          hud.style.top = `${clampedTop}px`;
          hud.style.right = 'auto';
          hud.style.bottom = 'auto';
        }
      }
    } catch (e) {}

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onPointerDown = (e) => {
      if (e.target.closest('button, input, select, textarea, a, .ha-quest-tab')) {
        return;
      }
      const targetHeader = e.target.closest('.ha-quest-panel-header, .ha-quest-pill, .ha-quest-drag-handle');
      if (!targetHeader) return;

      isDragging = true;
      hud.classList.add('ha-quest-dragging');

      const rect = hud.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      const minLeft = 10;
      const maxLeft = window.innerWidth - 80;
      const minTop = 10;
      const maxTop = window.innerHeight - 60;

      newLeft = Math.min(Math.max(minLeft, newLeft), maxLeft);
      newTop = Math.min(Math.max(minTop, newTop), maxTop);

      hud.style.left = `${newLeft}px`;
      hud.style.top = `${newTop}px`;
      hud.style.right = 'auto';
      hud.style.bottom = 'auto';
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      hud.classList.remove('ha-quest-dragging');

      const rect = hud.getBoundingClientRect();
      try {
        localStorage.setItem('ha_quest_hud_pos', JSON.stringify({
          left: rect.left,
          top: rect.top
        }));
      } catch (e) {}
    };

    hud.addEventListener('dblclick', (e) => {
      const targetHeader = e.target.closest('.ha-quest-panel-header, .ha-quest-drag-handle');
      if (targetHeader) {
        hud.style.left = 'auto';
        hud.style.top = '80px';
        hud.style.right = '25px';
        hud.style.bottom = 'auto';
        try {
          localStorage.removeItem('ha_quest_hud_pos');
        } catch (err) {}
      }
    });

    hud.addEventListener('mousedown', onPointerDown);
    hud.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    this._dragHandlers = { onPointerMove, onPointerUp };
  }

  destroyDraggable() {
    if (this._dragHandlers) {
      window.removeEventListener('mousemove', this._dragHandlers.onPointerMove);
      window.removeEventListener('touchmove', this._dragHandlers.onPointerMove);
      window.removeEventListener('mouseup', this._dragHandlers.onPointerUp);
      window.removeEventListener('touchend', this._dragHandlers.onPointerUp);
      this._dragHandlers = null;
    }
    this._draggableInitialized = false;
  }

  attachBPMNListeners() {
    if (this._bpmnListenersAttached) return;
    this._bpmnListenersAttached = true;
    try {
      const eventBus = this.modeler.get('eventBus', false);
      if (!eventBus) return;

      // 1. Element Click on Canvas (supports shapes and labels)
      eventBus.on('element.click', (e) => {
        if (!e || !e.element) return;
        const targetId = e.element.labelTarget ? e.element.labelTarget.id : e.element.id;
        this.handleElementInteraction(targetId);
      });

      // 2. Token Simulation Events
      eventBus.on('tokenSimulation.toggleMode', (e) => {
        if (e && e.active) {
          if (this.currentChapterIndex === 0) {
            this.completeSubtask('c1_toggle_sim');
          }
          if (!this._simModeActive) {
            this._simModeActive = true;
            try {
              const canvas = this.modeler.get('canvas');
              const z = canvas.zoom();
              if (typeof z === 'number' && !isNaN(z) && z > 0) {
                // Two zoom steps out (0.72 provides 2 comfortable overview steps out)
                canvas.zoom(z * 0.72);
              }
            } catch (err) {
              console.warn('[HA-BPMN] Failed to adjust zoom on token simulation start:', err);
            }
          }
        } else {
          this._simModeActive = false;
        }
      });

      // Discrete Start-Event triggering: Only when token actually triggers or exits StartEvent_Quest
      eventBus.on('tokenSimulation.simulator.elementTrigger', (e) => {
        if (e && e.element && e.element.id === 'StartEvent_Quest') {
          if (this.completedSubtasks.has('c1_toggle_sim')) {
            this.completeSubtask('c1_start_event');
          }
        }
        if (e && e.element && e.element.id) {
          this.handleElementInteraction(e.element.id);
        }
      });

      eventBus.on('tokenSimulation.simulator.exit', (e) => {
        if (e && e.element && e.element.id === 'StartEvent_Quest') {
          if (this.completedSubtasks.has('c1_toggle_sim')) {
            this.completeSubtask('c1_start_event');
          }
        }
      });

      const handleSimEvent = (e) => {
        if (e && e.element && e.element.id) {
          this.handleElementInteraction(e.element.id);
        }
      };

      eventBus.on('tokenSimulation.simulator.trace', handleSimEvent);
      eventBus.on('tokenSimulation.simulator.enter', handleSimEvent);

      // 3. Inspection of Linter Rules ONLY when activating the linter (no hover popup)
      eventBus.on('linting.toggle', (event) => {
        if (event && event.active) {
          if (this.currentChapterIndex === 1) {
            this.showLinterRulesNotification();
          }
        }
      });

      // 4. Element coloring executed
      eventBus.on(['commandStack.element.setColor.executed', 'commandStack.elements.setColor.executed'], (event) => {
        const elements = event.context?.elements || (event.context?.element ? [event.context.element] : []);
        this.handleElementsColored(elements);
      });

      // 5. Connection / Shape create events & selection changes for immediate Chapter 1 tracking
      eventBus.on(['commandStack.connection.create.executed', 'commandStack.shape.create.executed'], () => {
        if (this.currentChapterIndex === 0) {
          setTimeout(() => this.checkRegistryState(), 100);
        }
      });
      eventBus.on('selection.changed', () => {
        if (this.currentChapterIndex === 0) {
          setTimeout(() => this.checkDocumentationOpened(), 100);
        }
      });

      // DOM Click Interception (Capture Phase) for simulation context pads, gateway switches & linter
      this.wrap.addEventListener('click', (e) => {
        // 0. Properties & Documentation Click / Interaction in Chapter 1
        if (this.currentChapterIndex === 0) {
          const propBtn = e.target.closest('.ha-btn-toggle-properties');
          if (propBtn) {
            setTimeout(() => this.checkDocumentationOpened(), 200);
          }
          const isDocClick = Boolean(
            e.target.closest('[data-group-id="group-documentation"], [data-group-id="documentation"], .bio-properties-panel-group-header, #bio-properties-panel-documentation, textarea[name="documentation"]')
          );
          if (isDocClick) {
            setTimeout(() => this.checkDocumentationOpened(), 100);
          }
        }

        // 1. Linter Button Click
        const linterBtn = e.target.closest('.bjsl-button');
        if (linterBtn && this.currentChapterIndex === 1) {
          setTimeout(() => {
            try {
              const linting = this.modeler.get('linting', false);
              if (linting && linting.isActive()) {
                this.showLinterRulesNotification();
              }
            } catch (err) {}
          }, 100);
        }

        // 2. Gateway Switch Button / Context Pad click in Chapter 2
        if (this.currentChapterIndex === 1) {
          const switchPad = e.target.closest('.bts-context-pad[title*="Sequence Flow"], [title="Set Sequence Flow"], .djs-overlay-bts-context-menu .bts-context-pad');
          if (switchPad) {
            setTimeout(() => checkGatewaySwitched(), 60);
          }

          const gatewayShape = e.target.closest('[data-element-id="Gateway_XorChoice"]');
          if (gatewayShape) {
            try {
              const tokenSim = this.modeler.get('tokenSimulation', false);
              const egSettings = this.modeler.get('exclusiveGatewaySettings', false);
              const elementRegistry = this.modeler.get('elementRegistry', false);
              if (tokenSim && tokenSim.isActive() && egSettings && elementRegistry) {
                const gw = elementRegistry.get('Gateway_XorChoice');
                if (gw) {
                  egSettings.setSequenceFlow(gw);
                  setTimeout(() => checkGatewaySwitched(), 60);
                }
              }
            } catch (err) {}
          }
        }
      }, true);

      // Simulator Listeners: Detect when gateway outgoing flow is switched to the hazard branch
      const checkGatewaySwitched = () => {
        if (this.currentChapterIndex === 1 && !this.completedSubtasks.has('c2_switch_xor')) {
          try {
            const simulator = this.modeler.get('simulator', false);
            if (simulator) {
              const config = simulator.getConfig('Gateway_XorChoice');
              const activeOut = config && config.activeOutgoing;
              const outId = activeOut ? (typeof activeOut === 'string' ? activeOut : activeOut.id) : null;
              if (outId === 'Flow_HazardPath') {
                this.completeSubtask('c2_switch_xor');
              }
            }
          } catch (err) {}
        }
      };

      eventBus.on('tokenSimulation.simulator.elementChanged', (e) => {
        checkGatewaySwitched();
      });

      eventBus.on('tokenSimulation.simulator.tick', checkGatewaySwitched);

      // 4. Auto-Linter Solver when activeChallenge is in progress
      eventBus.on('linting.completed', (event) => {
        if (this.activeChallenge) {
          this.checkChallengeAutoSolve(event ? event.issues : null);
        }
      });

      // 5. Active Modeling CommandStack Listeners
      eventBus.on('commandStack.shape.create.executed', (e) => {
        if (e && e.context) this.handleShapeCreated(e.context.shape, e.context.parent);
      });
      eventBus.on('commandStack.shape.append.executed', (e) => {
        if (e && e.context) this.handleShapeCreated(e.context.shape, e.context.source ? e.context.source.parent : null);
      });
      eventBus.on('commandStack.connection.create.executed', (e) => {
        if (e && e.context) this.handleConnectionCreated(e.context.connection, e.context.source, e.context.target);
      });
      eventBus.on('commandStack.changed', () => {
        if (this.activeChallenge && !this.challengeLoading && this.challengeState) {
          this.challengeState.userModified = true;
          setTimeout(() => this.checkChallengeAutoSolve(), 200);
        }
        setTimeout(() => this.checkRegistryState(), 120);
      });
      eventBus.on('elements.changed', () => {
        if (this.activeChallenge && !this.challengeLoading && this.challengeState) {
          this.challengeState.userModified = true;
          setTimeout(() => this.checkChallengeAutoSolve(), 200);
        }
        setTimeout(() => this.checkRegistryState(), 120);
      });
    } catch (e) {
      console.warn('[HA-BPMN] Quest HUD could not attach event listeners:', e);
    }
  }

  getCurrentLinterErrors(eventIssues = null) {
    try {
      const lint = this.modeler.get('linting', false);
      let issuesObj = null;
      if (eventIssues && typeof eventIssues === 'object') {
        issuesObj = eventIssues;
      } else if (lint && lint._issues) {
        issuesObj = lint._issues;
      }
      if (!issuesObj) return [];
      const allIssues = Object.values(issuesObj).flat();
      return allIssues.filter(i => i && (i.severity === 'error' || i.category === 'error'));
    } catch (e) {
      return [];
    }
  }

  checkChallengeAutoSolve(eventIssues = null) {
    if (!this.activeChallenge || this.challengeLoading || !this.challengeState) return;

    const errors = this.getCurrentLinterErrors(eventIssues);

    // If initial errors were not yet confirmed, record them now
    if (!this.challengeState.initialErrorsDetected && errors.length > 0) {
      this.challengeState.initialErrorsDetected = true;
      this.challengeState.lastErrorCount = errors.length;
    }

    this.challengeState.lastErrorCount = errors.length;
    this.updateLinterStatusDisplay(errors.length);

    // CRITICAL: Never auto-solve if the user has not modified the diagram,
    // or if initial errors were never detected!
    if (!this.challengeState.initialErrorsDetected || !this.challengeState.userModified) {
      return;
    }

    // Auto-solve when error count drops to 0!
    if (errors.length === 0) {
      this.onChallengeSolved();
    }
  }

  updateLinterStatusDisplay(errorCount = null) {
    if (!this.hudElement) return;
    const msgEl = this.hudElement.querySelector('.ha-quest-linter-msg');
    if (!msgEl) return;

    if (this.activeChallenge) {
      const count = (typeof errorCount === 'number') ? errorCount : (this.challengeState?.lastErrorCount || 0);
      if (count > 0) {
        msgEl.textContent = `🎯 ${this.t('puzzleActive')}: ${count} ${this.t('errorsRemaining')}`;
        msgEl.style.color = '#dc2626';
      } else {
        msgEl.textContent = this.t('zeroErrors');
        msgEl.style.color = '#16a34a';
      }
    } else {
      msgEl.textContent = `🔍 ${this.t('linterGuardActive')}`;
      msgEl.style.color = '#64748b';
    }
  }

  handleElementsColored(elements) {
    if (!elements || elements.length === 0) return;
    if (this.currentChapterIndex === 0) {
      this.completeSubtask('c1_color_task');
    }
    if (this.currentChapterIndex === 1) {
      this.completeSubtask('c2_color_hazard');
    }
    setTimeout(() => this.checkRegistryState(), 80);
  }

  handleShapeCreated(shape, parent) {
    if (!shape) return;
    const type = shape.type || '';
    const parentId = parent ? parent.id : (shape.parent ? shape.parent.id : '');

    // Chapter 0 (Kapitel 1): Any task created and named
    if (this.currentChapterIndex === 0 && type.includes('Task')) {
      const name = (shape.businessObject?.name || '').trim();
      if (name.length > 0) {
        this.completeSubtask('c1_model_task');
      } else {
        const nameHintMap = {
          de: '💡 Fast geschafft! Benenne deine neue Aufgabe jetzt per Doppelklick (z. B. "Proviant vorbereiten").',
          en: '💡 Almost done! Name your new task via double-click (e.g. "Prepare Rations").',
          es: '💡 ¡Casi listo! Nombra tu nueva tarea haciendo doble clic (p. ej. "Preparar provisiones").',
          fr: '💡 Presque terminé ! Nommez votre tâche en double-cliquant (ex. "Préparer les rations").',
          it: '💡 Quasi fatto! Rinomina la nuova attività con un doppio clic (es. "Preparare provviste").',
          pt: '💡 Quase lá! Nomeie sua nova tarefa com um clique duplo (ex.: "Preparar provisões").',
          nl: '💡 Bijna klaar! Geef je nieuwe taak een naam via dubbelklik (bijv. "Proviand klaarmaken").',
          pl: '💡 Prawie gotowe! Nazwij nowe zadanie, klikając dwukrotnie (np. "Przygotuj prowiant").',
          ru: '💡 Почти готово! Назовите вашу задачу двойным щелчком (напр., "Подготовить припасы").',
          zh: '💡 接近完成！现在请双击该活动节点为其赋予名称（例如“整理物资”）。',
          ja: '💡 あと少し！タスクをダブルクリックして名前を設定してください（例：「物資の準備」）。'
        };
        const resolved = resolveQuestLang(this.lang);
        const nameHint = nameHintMap[resolved] || nameHintMap[resolved.split('_')[0]] || nameHintMap.en;
        this.showToast(nameHint, 4500);
      }
    }

    // Chapter 1 (Kapitel 2): End event created
    if (this.currentChapterIndex === 1 && type === 'bpmn:EndEvent') {
      this.completeSubtask('c2_model_end');
    }

    // Chapter 3 (Kapitel 4): Data store created
    if (this.currentChapterIndex === 3 && (type === 'bpmn:DataStoreReference' || type === 'bpmn:DataStore' || type.includes('DataStore'))) {
      this.completeSubtask('c4_model_datastore');
    }

    // Chapter 5 (Kapitel 6): Task created in Lane_Workshop or in Station 6
    if (this.currentChapterIndex === 5 && type.includes('Task')) {
      if (parentId === 'Lane_Workshop' || (shape.y > 450 && shape.y < 650) || shape.x > 3000) {
        this.completeSubtask('c6_create_workshop_task');
      }
    }

    setTimeout(() => this.checkRegistryState(), 120);
  }

  handleConnectionCreated(conn, source, target) {
    if (!conn) return;
    const connType = conn.type || '';
    const srcId = source ? source.id : '';
    const tgtId = target ? target.id : '';
    const tgtType = target ? target.type : '';

    // Chapter 1 (Kapitel 2): Connection from Task_CallHelp to EndEvent
    if (srcId === 'Task_CallHelp' && tgtType === 'bpmn:EndEvent') {
      this.completeSubtask('c2_model_end');
    }

    // Chapter 2 (Kapitel 3): Connection from Task_ForgeSword to Gateway_AndJoin
    if (srcId === 'Task_ForgeSword' && tgtId === 'Gateway_AndJoin') {
      this.completeSubtask('c3_model_connect');
    }

    // Chapter 4 (Kapitel 5): Data association between DataObjectReference_Logbook and Task_AwardMaster
    if (
      (srcId === 'DataObjectReference_Logbook' && tgtId === 'Task_AwardMaster') ||
      (connType.includes('Association') && (srcId === 'DataObjectReference_Logbook' || tgtId === 'DataObjectReference_Logbook'))
    ) {
      this.completeSubtask('c5_model_data_assoc');
    }

    // Chapter 5 (Kapitel 6): Cross-lane connection from Task_PlanMasterpiece (Lane 1) to Lane 3 (Workshop)
    if (srcId === 'Task_PlanMasterpiece') {
      this.completeSubtask('c6_connect_cross_lane1');
    }

    // Chapter 5 (Kapitel 6): Cross-lane connection from Workshop to Task_FinalAudit or Lane 4
    if (tgtId === 'Task_FinalAudit' || (source && source.parent && source.parent.id === 'Lane_Workshop' && tgtId === 'Task_FinalAudit')) {
      this.completeSubtask('c6_connect_cross_lane2');
    }

    setTimeout(() => this.checkRegistryState(), 120);
  }

  checkDocumentationOpened() {
    if (this.currentChapterIndex !== 0) return;
    const propWrap = document.querySelector('.ha-bpmn-properties-panel-wrap');
    if (!propWrap) {
      // Properties panel module disabled in backend -> auto-complete so user is not blocked
      this.completeSubtask('c1_open_properties');
      return;
    }
    // Must be uncollapsed
    if (propWrap.classList.contains('collapsed')) return;

    // Check if documentation textarea, open group entries, or documentation header is present/open
    const docTextarea = propWrap.querySelector('#bio-properties-panel-documentation, textarea[name="documentation"]');
    const docEntriesOpen = propWrap.querySelector('[data-group-id="group-documentation"] .bio-properties-panel-group-entries.open, [data-group-id="documentation"] .bio-properties-panel-group-entries.open');
    const docHeaderOpen = propWrap.querySelector('.bio-properties-panel-group-header.open');
    const hasDocHeaderTitle = docHeaderOpen && (docHeaderOpen.textContent.includes('Documentation') || docHeaderOpen.textContent.includes('Dokumentation'));
    const isDocOpen = Boolean(docTextarea || docEntriesOpen || hasDocHeaderTitle);

    if (isDocOpen) {
      this.completeSubtask('c1_open_properties');
    }
  }

  checkRegistryState() {
    try {
      const registry = this.modeler.get('elementRegistry', false);
      if (!registry) return;

      // Chapter 0 (Kapitel 1): Check task creation, color, properties & documentation, and annotations
      if (this.currentChapterIndex === 0) {
        const heroTasks = registry.filter(el => el.type && el.type.includes('Task') && (el.parent?.id === 'Lane_Hero' || (el.y > 50 && el.y < 350)) && el.x > 180 && el.x < 900);
        const newTask = heroTasks.find(t => t.id !== 'Task_ChooseHero' && t.id !== 'Task_PackGear');
        if (newTask) {
          const name = (newTask.businessObject?.name || '').trim();
          if (name.length > 0) {
            this.completeSubtask('c1_model_task');
          }
        }

        // Check if properties panel is open AND documentation is inspected/open
        this.checkDocumentationOpened();

        // Check if any element has an attached TextAnnotation (c1_add_annotation)
        const initialAnnotatedIds = [
          'StartEvent_Quest',
          'Task_ChooseHero',
          'Gateway_XorChoice',
          'Boundary_Trap',
          'Gateway_AndSplit',
          'Timer_RestCamp',
          'SubProcess_Vault',
          'Task_PlanMasterpiece'
        ];
        const associations = registry.filter(el => el.type === 'bpmn:Association');
        const hasCustomAnnotation = associations.some(assoc => {
          const s = assoc.source;
          const t = assoc.target;
          if (!s || !t) return false;
          const isNote = s.type === 'bpmn:TextAnnotation' || t.type === 'bpmn:TextAnnotation';
          if (!isNote) return false;
          const other = s.type === 'bpmn:TextAnnotation' ? t : s;
          return other && !initialAnnotatedIds.includes(other.id);
        });
        if (hasCustomAnnotation) {
          this.completeSubtask('c1_add_annotation');
        }

        // Check if any element has color fill or stroke
        const coloredAny = registry.filter(el => {
          const di = el.di;
          if (!di) return false;
          const fill = di.fill || di.background || (di.get && di.get('fill'));
          const stroke = di.stroke || di.border || (di.get && di.get('stroke'));
          return Boolean(fill || stroke);
        });
        if (coloredAny.length > 0) {
          this.completeSubtask('c1_color_task');
        }
      }

      // Chapter 1 (Kapitel 2): Check if Task_CallHelp connects to an EndEvent, XOR switch & hazard color
      if (this.currentChapterIndex === 1) {
        const callHelp = registry.get('Task_CallHelp');
        if (callHelp && callHelp.outgoing && callHelp.outgoing.some(flow => flow.target && flow.target.type === 'bpmn:EndEvent')) {
          this.completeSubtask('c2_model_end');
        }

        const hazardColored = registry.filter(el => {
          const di = el.di;
          if (!di) return false;
          const fill = di.fill || di.background || (di.get && di.get('fill'));
          const stroke = di.stroke || di.border || (di.get && di.get('stroke'));
          if (!fill && !stroke) return false;
          return el.id === 'Task_CallHelp' || el.id === 'Task_TrollCave' || (el.type === 'bpmn:EndEvent' && el.id !== 'EndEvent_Grandmaster') || (el.x >= 750 && el.x <= 1600 && el.y >= 200);
        });
        if (hazardColored.length > 0) {
          this.completeSubtask('c2_color_hazard');
        }
        try {
          const simulator = this.modeler.get('simulator', false);
          if (simulator) {
            const config = simulator.getConfig('Gateway_XorChoice');
            const activeOut = config && config.activeOutgoing;
            const outId = activeOut ? (typeof activeOut === 'string' ? activeOut : activeOut.id) : null;
            if (outId === 'Flow_HazardPath') {
              this.completeSubtask('c2_switch_xor');
            }
          }
        } catch (err) {}
      }

      // Chapter 2 (Kapitel 3): Check if Task_ForgeSword connects to Gateway_AndJoin
      if (this.currentChapterIndex === 2) {
        const forge = registry.get('Task_ForgeSword');
        if (forge && forge.outgoing && forge.outgoing.some(flow => flow.target && flow.target.id === 'Gateway_AndJoin')) {
          this.completeSubtask('c3_model_connect');
        }
      }

      // Chapter 3 (Kapitel 4): Check if DataStore exists
      if (this.currentChapterIndex === 3) {
        const stores = registry.filter(el => el.type === 'bpmn:DataStoreReference' || el.type === 'bpmn:DataStore' || (el.type && el.type.includes('DataStore')));
        if (stores.length > 0) {
          this.completeSubtask('c4_model_datastore');
        }
      }

      // Chapter 4 (Kapitel 5): Check if Logbook connects to Task_AwardMaster
      if (this.currentChapterIndex === 4) {
        const award = registry.get('Task_AwardMaster');
        const hasLogbookAssoc = award && (
          (award.incoming && award.incoming.some(f => f.source?.id === 'DataObjectReference_Logbook' || f.id === 'DataInputAssoc_Logbook')) ||
          (award.dataInputAssociations && award.dataInputAssociations.some(a => a.sourceRef?.id === 'DataObjectReference_Logbook'))
        );
        if (hasLogbookAssoc) {
          this.completeSubtask('c5_model_data_assoc');
        }
      }

      // Chapter 5 (Kapitel 6): Architect Exam
      if (this.currentChapterIndex === 5) {
        // 1. Task in Lane_Workshop
        const workshopTasks = registry.filter(el => el.type && el.type.includes('Task') && (el.parent?.id === 'Lane_Workshop' || (el.y > 450 && el.y < 650)) && el.x > 3000);
        if (workshopTasks.length > 0) {
          this.completeSubtask('c6_create_workshop_task');
        }
        // 2. Cross-lane flow from Task_PlanMasterpiece down to Workshop
        const plan = registry.get('Task_PlanMasterpiece');
        if (plan && plan.outgoing && plan.outgoing.some(flow => flow.target && (flow.target.parent?.id === 'Lane_Workshop' || flow.target.y > 450))) {
          this.completeSubtask('c6_connect_cross_lane1');
        }
        // 3. Flow into Task_FinalAudit
        const audit = registry.get('Task_FinalAudit');
        if (audit && audit.incoming && audit.incoming.some(flow => flow.source && flow.source.id !== 'Task_PlanMasterpiece')) {
          this.completeSubtask('c6_connect_cross_lane2');
        }
      }
    } catch (e) {}
  }

  handleElementInteraction(elId) {
    if (this.activeTab !== 'walkthrough') return;
    if (!elId) return;

    const cleanId = elId.replace(/_label$/, '');

    // Chapter 0 (Kapitel 1)
    if (this.currentChapterIndex === 0) {
      if (cleanId === 'Flow_1' || cleanId === 'Task_ChooseHero') {
        if (this.completedSubtasks.has('c1_toggle_sim')) {
          this.completeSubtask('c1_start_event');
        }
      }
      if (cleanId === 'StartEvent_Quest') {
        if (!this.completedSubtasks.has('c1_toggle_sim')) {
          const startHintMap = {
            de: '💡 Das Start-Event startet deinen Prozess! Aktiviere zuerst das Token Game (unten links ▶), um den Durchlauf zu starten.',
            en: '💡 The Start Event begins your workflow! Activate Token Game first (bottom-left ▶) to simulate.',
            es: '💡 ¡El evento de inicio arranca el proceso! Activa primero la simulación de tokens (abajo a la izquierda ▶).',
            fr: '💡 L\'événement de début lance le processus ! Activez d\'abord la simulation de jetons (en bas à gauche ▶).',
            it: '💡 L\'evento iniziale avvia il processo! Attiva prima la simulazione dei token (in basso a sinistra ▶).',
            pt: '💡 O evento de início começa seu fluxo! Ative a simulação de tokens primeiro (abaixo à esquerda ▶).',
            nl: '💡 Het start-event begint je proces! Activeer eerst het Token Game (linksonder ▶) om te simuleren.',
            pl: '💡 Zdarzenie początkowe uruchamia proces! Najpierw aktywuj Token Game (w lewym dolnym rogu ▶).',
            ru: '💡 Стартовое событие запускает процесс! Сначала активируйте Токен-игру (внизу слева ▶).',
            zh: '💡 开始事件是整个业务流程的起点！请先激活左下角的令牌模拟运行控制台（▶）。',
            ja: '💡 開始イベントがプロセスの始点です！まず左下のトークンゲーム（▶）を起動してください。'
          };
          const resolved = resolveQuestLang(this.lang);
          const hint = startHintMap[resolved] || startHintMap[resolved.split('_')[0]] || startHintMap.en;
          this.showToast(hint, 7000);
        }
      }
      if (cleanId === 'Task_ChooseHero' || cleanId === 'Flow_ToPauseHero' || cleanId === 'Timer_PauseHero' || cleanId === 'Task_PackGear' || cleanId === 'Flow_ToPack' || cleanId === 'Flow_ToPauseXor' || cleanId === 'Timer_PauseXor') {
        this.completeSubtask('c1_user_tasks');
      }
    }

    // Chapter 1 (Kapitel 2)
    if (this.currentChapterIndex === 1) {
      if (cleanId === 'Flow_HazardPath' || cleanId === 'Task_TrollCave') {
        this.completeSubtask('c2_switch_xor');
      }
      if (cleanId === 'Boundary_Trap' || cleanId === 'Flow_TrapFired') {
        this.completeSubtask('c2_trigger_trap');
        const trapMap = {
          de: '⚡ AUSNAHME-FALLE AUSGELÖST!\n💡 Lerneffekt: Das Blitz-Symbol am Rand der Trollhöhle ist ein "Error Boundary Event". Tritt ein Fehler auf, bricht es den normalen Pfad ab und lenkt den Token auf die Notfall-Spur ("Notruf senden")!',
          en: '⚡ EXCEPTION TRAP TRIGGERED!\n💡 Learning Insight: The lightning bolt on the Troll Cave border is an "Error Boundary Event". If an error occurs, it interrupts normal execution and diverts the token to the escalation path ("Call Help")!',
          es: '⚡ ¡TRAMPA DE EXCEPCIÓN DISPARADA!\n💡 Aprendizaje: El rayo en el borde es un "Error Boundary Event". Si ocurre un fallo, interrumpe el flujo normal y lo desvía a la ruta de auxilio.',
          fr: '⚡ PIÈGE D\'EXCEPTION DÉCLENCHÉ !\n💡 Règle BPMN : L\'éclair est un "Error Boundary Event". En cas d\'erreur, il interrompt le flux normal et l\'oriente vers la procédure d\'urgence.',
          it: '⚡ TRAPPOLA DI ECCEZIONE ATTIVATA!\n💡 Riconoscimento: Il fulmine sul bordo è un "Error Boundary Event". Interrompe l\'esecuzione normale e devia il token verso la procedura di emergenza.',
          pt: '⚡ ARMADILHA DE EXCEÇÃO DISPARADA!\n💡 Aprendizado: O raio na borda é um "Error Boundary Event". Ao ocorrer um erro, ele interrompe a execução e desvia o token para a rota de emergência.',
          nl: '⚡ UITZONDERINGSVAL GEACTIVEERD!\n💡 Leereffect: Het bliksemsymbool is een "Error Boundary Event". Bij een fout onderbreekt het het normale pad en stuurt het token naar de noodroute.',
          pl: '⚡ PUŁAPKA WYJĄTKU WYRZUCONA!\n💡 Wskazówka: Symbol błyskawicy to "Error Boundary Event". W razie błędu przerywa normalny bieg i kieruje przepływ na ścieżkę awaryjną.',
          ru: '⚡ ЛОВУШКА ИСКЛЮЧЕНИЯ СРАБОТАЛА!\n💡 Обучение: Молния на границе — это граничное событие ошибки. При сбое процесс прерывается и перенаправляется на ветку тревоги.',
          zh: '⚡ 异常陷阱触发成功！\n💡 核心认知：活动边框上的闪电图标属于“边界错误事件”（Error Boundary Event）。当异常抛出时，它会立刻中断常规工作流并引导控制流驶入应急响应通道！',
          ja: '⚡ 例外トラップ発動！\n💡 学習ポイント：境界の稲妻マークは「エラールート境界イベント」です。エラー発生時に通常フローを中断し、緊急対応ルートへ誘導します。'
        };
        const resolved = resolveQuestLang(this.lang);
        const trapInfo = trapMap[resolved] || trapMap[resolved.split('_')[0]] || trapMap.en;
        this.showToast(trapInfo, 9000);
      }
    }

    // Chapter 2 (Kapitel 3)
    if (this.currentChapterIndex === 2) {
      if (cleanId === 'Gateway_AndSplit') {
        this.completeSubtask('c3_and_split');
      }
      if (cleanId === 'Task_CastSpell' || cleanId === 'Flow_SpellBranch' || cleanId === 'Flow_SpellDone') {
        this.completeSubtask('c3_spell_task');
      }
      if (cleanId === 'Gateway_AndJoin') {
        this.completeSubtask('c3_and_join');
      }
    }

    // Chapter 3 (Kapitel 4)
    if (this.currentChapterIndex === 3) {
      if (cleanId === 'Timer_RestCamp' || cleanId === 'Flow_ToVault') {
        this.completeSubtask('c4_timer_rest');
      }
      if (cleanId.includes('DataStore') || cleanId.includes('dataStore')) {
        this.completeSubtask('c4_model_datastore');
      }
      if (cleanId === 'SubProcess_Vault' || cleanId === 'SubStart_Vault' || cleanId === 'Flow_Sub1' || cleanId === 'Task_PickLock' || cleanId === 'Task_LootRelic' || cleanId === 'Flow_Sub2' || cleanId === 'Flow_Sub3' || cleanId === 'SubEnd_Vault') {
        this.completeSubtask('c4_enter_vault');
      }
    }

    // Chapter 4 (Kapitel 5)
    if (this.currentChapterIndex === 4) {
      if (cleanId === 'Task_VerifyGuild' || cleanId === 'Timer_PauseGuild' || cleanId === 'Flow_AuditPassed') {
        this.completeSubtask('c5_guild_audit');
      }
      if (cleanId === 'Task_AwardMaster' || cleanId === 'Flow_ToAward' || cleanId === 'Flow_ToArchExam') {
        this.completeSubtask('c5_award_master');
      }
    }

    // Chapter 5 (Kapitel 6: Architekten-Prüfung)
    if (this.currentChapterIndex === 5) {
      if (cleanId === 'Task_PlanMasterpiece') {
        this.completeSubtask('c6_plan_masterpiece');
      }
      if (cleanId === 'Task_FinalAudit' || cleanId === 'Flow_FinalDone' || cleanId === 'EndEvent_Grandmaster') {
        this.completeSubtask('c6_finish_grandmaster');
      }
    }

    this.showDidacticElementHint(cleanId);
    setTimeout(() => this.checkRegistryState(), 100);
  }

  showLinterRulesNotification() {
    let notif = this.wrap.querySelector('#ha-quest-linter-notification');
    if (!notif) {
      notif = document.createElement('div');
      notif.id = 'ha-quest-linter-notification';
      notif.className = 'ha-quest-linter-notification';
      this.wrap.appendChild(notif);
    }

    const rules = getLinterRulesContent(this.lang);
    notif.innerHTML = `
      <div class="ha-quest-linter-card">
        <div class="ha-quest-linter-card-header">
          <span>📜 ${escapeHtml(rules.modalTitle)}</span>
          <button type="button" class="ha-quest-linter-close" aria-label="${escapeHtml(this.t('close'))}">&times;</button>
        </div>
        <div class="ha-quest-linter-card-body">
          <div class="ha-quest-linter-intro">
            <div class="ha-quest-linter-intro-title">💡 ${escapeHtml(rules.introTitle)}</div>
            <p>${escapeHtml(rules.introP1)}<br><br>${escapeHtml(rules.introP2)}</p>
          </div>
          <div class="ha-quest-linter-rules-title">🎯 ${escapeHtml(rules.rulesTitle)}</div>
          <ul>
            <li><strong>1. ${escapeHtml(rules.rule1Title)}</strong> ${escapeHtml(rules.rule1Desc)}</li>
            <li><strong>2. ${escapeHtml(rules.rule2Title)}</strong> ${escapeHtml(rules.rule2Desc)}</li>
            <li><strong>3. ${escapeHtml(rules.rule3Title)}</strong> ${escapeHtml(rules.rule3Desc)}</li>
          </ul>
          <div class="ha-quest-linter-card-footer">
            <span>${escapeHtml(this.t('rulesStudiedDone'))}</span>
          </div>
        </div>
      </div>
    `;

    const closeBtn = notif.querySelector('.ha-quest-linter-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => notif.remove());
    }

    if (this.currentChapterIndex === 1) {
      this.completeSubtask('c2_study_linter');
    }
  }

  showDidacticElementHint(elId) {
    if (!elId) return;
    const hints = {
      Gateway_XorChoice: {
        de: '✖ XOR-Gateway: Exklusive Entscheidung! Genau ein Pfad wird gewählt. Klicke im Simulationsmodus auf die Weiche, um den aktiven Pfad umzuschalten.',
        en: '✖ XOR Gateway: Exclusive choice! Exactly one branch is taken. Click the gateway in simulation mode to toggle branch.'
      },
      Gateway_MergeXor: {
        de: '✖ XOR-Zusammenführung: Führt alternative Pfade wieder auf einen gemeinsamen Ablauf zusammen.',
        en: '✖ XOR Merge: Merges alternative branches back into a single sequence flow.'
      },
      Gateway_AndSplit: {
        de: '➕ AND-Split: Paralleles Gateway! Teilt den Token auf – beide Folgeaktivitäten laufen gleichzeitig ab.',
        en: '➕ AND Split: Parallel Gateway! Splits the token – both following activities execute simultaneously.'
      },
      Gateway_AndJoin: {
        de: '➕ AND-Join: Synchronisation! Wartet geduldig, bis alle eingehenden Pfade eingetroffen sind.',
        en: '➕ AND Join: Synchronization! Waits until all incoming branches have arrived before continuing.'
      },
      Task_ChooseHero: {
        de: '👤 User Task (Benutzeraufgabe): Eine manuelle Tätigkeit, die von einem Menschen mit Systemunterstützung ausgeführt wird.',
        en: '👤 User Task: A manual activity performed by a human assisted by a software application.'
      },
      Task_PackGear: {
        de: '✋ Manual Task (Manuelle Aufgabe): Eine rein physische Arbeit ohne Softwarebeteiligung (z. B. Ausrüstung packen).',
        en: '✋ Manual Task: A physical activity without software interaction (e.g. packing gear).'
      },
      Task_StudyLinter: {
        de: '🔍 Was ist ein Linter? Wie eine automatische Rechtschreibprüfung prüft er dein BPMN-Modell nach ISO 19510!\n📍 Wo ist er? Unten mittig auf der Zeichenfläche als Pillen-Button mit Fehlerzähler. Klicke darauf, um ihn zu aktivieren und die 3 goldenen Regeln zu studieren!',
        en: '🔍 What is a linter? Like an automated spell checker, it validates your BPMN process against ISO 19510!\n📍 Where is it? Centered at the bottom of the canvas as a pill button. Click it to activate and study the 3 golden rules!'
      },
      Task_TrollCave: {
        de: '🐺 Gefahrenzone: Klicke auf das Blitz-Symbol (⚡) am Rand der Aufgabe, um das Error Boundary Event auszulösen!',
        en: '🐺 Danger Zone: Click the lightning symbol (⚡) on the task border to trigger the Error Boundary Event!'
      },
      Task_CallHelp: {
        de: '✉️ Send Task (Sendeaufgabe): Sendet eine Nachricht (z. B. E-Mail, Notruf oder API-Call) an externe Empfänger.',
        en: '✉️ Send Task: Automatically dispatches a message (e.g. email, alert, or webhook) to external systems.'
      },
      Task_CastSpell: {
        de: '🛡️ Business Rule Task: Führt automatisierte Geschäftsregeln oder Entscheidungslogiken (DMN) aus.',
        en: '🛡️ Business Rule Task: Executes automated business rules or decision logic (DMN).'
      },
      Task_ForgeSword: {
        de: '⚙️ Service Task: Vollautomatisierte Systemfunktion (z. B. REST API, Microservice oder Hintergrund-Skript).',
        en: '⚙️ Service Task: Fully automated system service (e.g. REST API, microservice, or background script).'
      },
      Timer_PauseHero: {
        de: '⏱️ Timer-Zwischenereignis: Pausiert den Prozessablauf für eine definierte Wartezeit (z. B. 3 Sekunden).',
        en: '⏱️ Intermediate Timer Event: Suspends process execution for a defined duration (e.g. 3 seconds).'
      },
      Timer_PauseXor: {
        de: '⏱️ Timer-Zwischenereignis: Hält den Token kurz an, damit Prozessbeobachter den Status prüfen können.',
        en: '⏱️ Intermediate Timer Event: Holds the token briefly for process observation.'
      },
      Timer_RestCamp: {
        de: '⏱️ Rast am Lagerfeuer: Unterbricht den Fluss vor dem Betreten des Subprozesses.',
        en: '⏱️ Campfire Rest: Pauses the token before entering the embedded subprocess.'
      },
      SubProcess_Vault: {
        de: '📦 Eingebetteter Subprozess: Kapselt einen eigenständigen Teilprozess mit eigenem Start- und Endpunkt.',
        en: '📦 Embedded Subprocess: Encapsulates a self-contained sub-workflow with its own start and end.'
      },
      DataObjectReference_Logbook: {
        de: '📄 Datenobjekt: Repräsentiert Geschäftsdaten oder Dokumente (z. B. QM-Prüfprotokoll), die Aufgaben nutzen oder erstellen.',
        en: '📄 Data Object: Represents business data or artifacts (e.g. QM audit report) consumed or produced by tasks.'
      },
      Task_VerifyGuild: {
        de: '⚙️ Gilden-Prüfung: QM-Audits sichern Prozessqualität nach ISO 9001 / ISO 19510.',
        en: '⚙️ Guild Audit: QM audits ensure quality standards according to ISO 9001 / ISO 19510.'
      },
      Task_AwardMaster: {
        de: '👑 Meister-Verleihung: Diese Aufgabe liest das Prüfprotokoll und verleiht den Grandmaster-Titel.',
        en: '👑 Master Conferral: This task reads the audit report and awards the Grandmaster diploma.'
      },
      Task_PlanMasterpiece: {
        de: '🏛️ Architekten-Prüfung: Plane die Cross-Lane Verbindung hinunter in die Werkstatt-Lane!',
        en: '🏛️ Architect Exam: Plan the cross-lane connection down into the workshop lane!'
      },
      Task_FinalAudit: {
        de: '⚖️ End-Audit: Letzte Prüfung vor dem Abschluss des gesamten BPMN-Meisterstücks.',
        en: '⚖️ Final Audit: Final validation before concluding the complete BPMN masterpiece.'
      },
      EndEvent_Escaped: {
        de: '🔴 End-Ereignis \'Rückzug zum Basislager\': Beendet den Eskalationspfad sauber.',
        en: '🔴 End Event \'Retreat to Base Camp\': Cleanly concludes the escalation path.'
      },
      EndEvent_Grandmaster: {
        de: '🏁 Terminierungs-End-Event (Dicker Doppelring): Beendet sofort die gesamte Prozessinstanz!',
        en: '🏁 Terminate End Event (Thick ring): Instantly terminates the entire process instance!'
      }
    };

    if (elId && (elId.includes('DataStore') || elId.includes('dataStore'))) {
      const dsMap = {
        de: '🛢️ Datenspeicher (Data Store): Speichert Geschäftsinformationen persistent über einzelne Prozessinstanzen hinweg (z. B. Tresor-Datenbank).',
        en: '🛢️ Data Store: Persistently stores business information beyond single workflow instances (e.g. vault repository).',
        es: '🛢️ Almacén de datos (Data Store): Almacena información persistente más allá de instancias individuales del proceso.',
        fr: '🛢️ Magasin de données (Data Store) : Conserve les informations métier au-delà des instances individuelles de processus.',
        it: '🛢️ Archivio dati (Data Store): Conserva i dati di business in modo persistente oltre la singola istanza del flusso.',
        pt: '🛢️ Armazenamento de dados (Data Store): Salva dados comerciais de forma persistente além de instâncias isoladas.',
        nl: '🛢️ Gegevensopslag (Data Store): Slaat bedrijfsinformatie persistent op voorbij individuele procesinstanties.',
        pl: '🛢️ Magazyn danych (Data Store): Trwale przechowuje dane biznesowe niezależnie od pojedynczych instancji procesu.',
        ru: '🛢️ Хранилище данных (Data Store): Обеспечивает долговременное хранение информации за рамками отдельного экземпляра.',
        zh: '🛢️ 数据存储（Data Store）：具备超越单一流程实例生命周期的全局持久化能力（如核心数据库或凭证金库）。',
        ja: '🛢️ データストア（Data Store）：個別のプロセス実行を超えて業務情報を永続化して保持します。'
      };
      const resolved = resolveQuestLang(this.lang);
      const msg = dsMap[resolved] || dsMap[resolved.split('_')[0]] || dsMap.en;
      this.showToast(msg, 8000);
      return;
    }

    const hint = hints[elId];
    if (hint) {
      const resolved = resolveQuestLang(this.lang);
      const msg = hint[resolved] || hint[resolved.split('_')[0]] || hint.en || hint.de;
      this.showToast(msg, 8000);
    }
  }

  completeSubtask(subtaskId) {
    if (this.completedSubtasks.has(subtaskId)) return;

    this.completedSubtasks.add(subtaskId);
    this.saveProgress();
    this.reportTaskToAchievementApi(subtaskId);

    const chap = this.chapters[this.currentChapterIndex];
    const st = chap && chap.subtasks ? chap.subtasks.find(s => s.id === subtaskId) : null;
    const subtaskTitle = st ? this.getSubtaskText(st) : '';

    if (subtaskTitle) {
      const miniToast = `${this.t('completedPrefix')} ${subtaskTitle}`;
      this.showToast(miniToast, 2500);
    }

    // Check if all subtasks in current chapter are done -> complete chapter!
    if (chap && chap.subtasks) {
      const allDone = chap.subtasks.every(s => this.completedSubtasks.has(s.id));
      if (allDone) {
        this.completeChapter(this.currentChapterIndex);
        return;
      }
    }

    this.render();
    this.bindEvents();
  }

  awardXP(amount) {
    const oldHonor = getHonorGrade(this.xp, this.lang);
    this.xp += amount;
    this.saveProgress();
    this.reportXpToAchievementApi(amount);
    const newHonor = getHonorGrade(this.xp, this.lang);

    if (newHonor.tier > oldHonor.tier) {
      setTimeout(() => {
        const promoMap = {
          de: `🎖️ BEFÖRDERUNG! Neues akademisches Prädikat:\n„${newHonor.latin}“ (${newHonor.guildTitle})!`,
          en: `🎖️ PROMOTION! New academic distinction:\n"${newHonor.latin}" (${newHonor.guildTitle})!`,
          es: `🎖️ ¡ASCENSO! Nueva distinción académica:\n"${newHonor.latin}" (${newHonor.guildTitle})!`,
          fr: `🎖️ PROMOTION ! Nouvelle distinction académique :\n"${newHonor.latin}" (${newHonor.guildTitle}) !`,
          it: `🎖️ PROMOZIONE! Nuovo titolo accademico:\n"${newHonor.latin}" (${newHonor.guildTitle})!`,
          pt: `🎖️ PROMOÇÃO! Nova distinção acadêmica:\n"${newHonor.latin}" (${newHonor.guildTitle})!`,
          nl: `🎖️ PROMOTIE! Nieuwe academische waardigheid:\n"${newHonor.latin}" (${newHonor.guildTitle})!`,
          pl: `🎖️ AWANS! Nowy tytuł akademicki:\n"${newHonor.latin}" (${newHonor.guildTitle})!`,
          ru: `🎖️ ПОВЫШЕНИЕ! Новое академическое отличие:\n"${newHonor.latin}" (${newHonor.guildTitle})!`,
          zh: `🎖️ 荣誉晋级！荣获全新学术成就衔称：\n“${newHonor.latin}”（${newHonor.guildTitle}）！`,
          ja: `🎖️ 昇格！新たな認定称号を獲得：\n「${newHonor.latin}」（${newHonor.guildTitle}）！`
        };
        const resolved = resolveQuestLang(this.lang);
        const promoMsg = promoMap[resolved] || promoMap[resolved.split('_')[0]] || promoMap.en;
        this.showToast(promoMsg, 5000);
      }, 1400);
    }
  }

  completeChapter(idx) {
    const isFirstTime = !this.completedChapters.has(idx);
    if (isFirstTime) {
      this.completedChapters.add(idx);
      const xpGain = (idx === this.chapters.length - 1) ? 150 : 50;
      this.awardXP(xpGain);

      const toastMap = {
        de: `🎉 Aufgabe erfüllt! +${xpGain} XP!`,
        en: `🎉 Task completed! +${xpGain} XP!`,
        es: `¡🎉 Tarea cumplida! +${xpGain} XP!`,
        fr: `🎉 Tâche accomplie ! +${xpGain} XP !`,
        it: `🎉 Attività completata! +${xpGain} XP!`,
        pt: `🎉 Tarefa concluída! +${xpGain} XP!`,
        nl: `🎉 Taak voltooid! +${xpGain} XP!`,
        pl: `🎉 Zadanie wykonane! +${xpGain} XP!`,
        ru: `🎉 Задача выполнена! +${xpGain} XP!`,
        zh: `🎉 任务圆满达成！获得 +${xpGain} XP！`,
        ja: `🎉 タスク達成！+${xpGain} XP獲得！`
      };
      const resolved = resolveQuestLang(this.lang);
      const toastMsg = toastMap[resolved] || toastMap[resolved.split('_')[0]] || toastMap.en;
      this.showToast(toastMsg);

      this.render();
      this.bindEvents();

      // Auto-advance to next chapter after 1.2s
      if (idx < this.chapters.length - 1) {
        setTimeout(() => {
          if (this.currentChapterIndex === idx) {
            this.goToChapter(idx + 1);
          }
        }, 1200);
      } else {
        // Grandmaster Architect status reached!
        setTimeout(() => {
          this.highlightElement('EndEvent_Grandmaster');
          const finalMsgMap = {
            de: '👑 Großmeister-Architekt! Du hast alle 6 Kapitel und die Cross-Lane-Prüfung gemeistert! Klicke auf "Urkunde öffnen", um dein Diplom anzuzeigen!',
            en: '👑 Grandmaster Architect! You mastered all 6 chapters and the Cross-Lane Exam! Click "Open Diploma" to view your certificate!',
            es: '👑 ¡Gran Maestro Arquitecto! ¡Has dominado los 6 capítulos y el examen entre carriles! Haz clic en "Abrir diploma" para ver tu certificado.',
            fr: '👑 Grand Maître Architecte ! Vous maîtrisez les 6 chapitres et l\'examen inter-couloirs ! Cliquez sur "Ouvrir le diplôme" pour l\'afficher !',
            it: '👑 Gran Maestro Architetto! Hai padroneggiato tutti i 6 capitoli e l\'esame tra corsie! Fai clic su "Apri diploma" per vedere il tuo certificato!',
            pt: '👑 Grão-Mestre Arquiteto! Você dominou todos os 6 capítulos e o exame entre raias! Clique em "Abrir diploma" para ver seu certificado!',
            nl: '👑 Grootmeester-Architect! Je beheerst alle 6 hoofdstukken en de cross-lane proef! Klik op "Diploma openen" om je diploma te bekijken!',
            pl: '👑 Arcymistrz Architektury! Opanowałeś wszystkie 6 rozdziałów i egzamin między torami! Kliknij "Otwórz dyplom", aby go wyświetlić!',
            ru: '👑 Гроссмейстер-Архитектор! Вы освоили все 6 глав и междорожечный экзамен! Нажмите "Открыть диплом", чтобы просмотреть сертификат!',
            zh: '👑 首席架构大宗师！你已全面通关 6 大核心章节与跨泳道综合实操大考！请点击“查看证书”受领你的至高大宗师文凭！',
            ja: '👑 グランドマスター・アーキテクト！全6章とレーン間モデリング試験を制覇しました！「認定証を開く」をクリックして証書を確認しましょう！'
          };
          const resolved = resolveQuestLang(this.lang);
          const finalMsg = finalMsgMap[resolved] || finalMsgMap[resolved.split('_')[0]] || finalMsgMap.en;
          this.showToast(finalMsg, 6000);
        }, 1000);
      }
    }
  }

  showToast(message, duration = 6500) {
    const container = this.wrap || (this.hudElement ? this.hudElement.parentElement : null);
    if (!container) return;
    const existing = container.querySelector('.ha-quest-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'ha-quest-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.setProperty('--toast-duration', `${duration}ms`);

    const header = document.createElement('div');
    header.className = 'ha-quest-toast-header';

    const msgSpan = document.createElement('span');
    msgSpan.className = 'ha-quest-toast-text';
    msgSpan.textContent = message;
    header.appendChild(msgSpan);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ha-quest-toast-close';
    closeBtn.setAttribute('aria-label', this.t('close'));
    closeBtn.setAttribute('title', `${this.t('close')} (✕)`);
    closeBtn.innerHTML = '&times;';
    header.appendChild(closeBtn);

    toast.appendChild(header);

    // Progress bar indicating remaining display time
    const track = document.createElement('div');
    track.className = 'ha-quest-toast-progress-track';
    const bar = document.createElement('div');
    bar.className = 'ha-quest-toast-progress-bar';
    track.appendChild(bar);
    toast.appendChild(track);

    let isDismissed = false;
    let timerId = null;
    let remainingTime = duration;
    let startTime = Date.now();

    const dismiss = () => {
      if (isDismissed) return;
      isDismissed = true;
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 350);
    };

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });

    const startTimer = (ms) => {
      startTime = Date.now();
      remainingTime = ms;
      timerId = setTimeout(() => {
        dismiss();
      }, ms);
    };

    const pauseTimer = () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
        const elapsed = Date.now() - startTime;
        remainingTime = Math.max(0, remainingTime - elapsed);
      }
    };

    const resumeTimer = () => {
      if (isDismissed) return;
      if (remainingTime > 0) {
        startTimer(remainingTime);
      } else {
        dismiss();
      }
    };

    toast.addEventListener('mouseenter', pauseTimer);
    toast.addEventListener('mouseleave', resumeTimer);

    container.appendChild(toast);
    startTimer(duration);
  }

  render() {
    if (!this.hudElement || !document.body.contains(this.hudElement)) {
      this.hudElement = document.createElement('div');
      document.body.appendChild(this.hudElement);
      this.initDraggable();
    }

    this.hudElement.className = 'ha-quest-hud ' + (this.isMinimized ? 'ha-quest-hud-minimized' : '');

    const chap = this.chapters[this.currentChapterIndex];
    const isLastChapter = this.currentChapterIndex === this.chapters.length - 1;
    const isCurrentDone = this.completedChapters.has(this.currentChapterIndex);

    const honor = getHonorGrade(this.xp, this.lang);
    const nextTierInfo = getNextTierInfo(this.xp, this.lang);

    this.hudElement.innerHTML = `
      <!-- Minimized Floating Badge -->
      <div class="ha-quest-pill" title="${escapeHtml(this.t('openCompanion'))} (${escapeHtml(nextTierInfo)})">
        <span class="ha-quest-pill-icon">🎮</span>
        <span class="ha-quest-pill-title">BPMN-Quest (${this.currentChapterIndex + 1}/${this.chapters.length})</span>
        <span class="ha-quest-pill-xp" style="background:${honor.bannerBg};color:${honor.bannerText};border:1px solid ${honor.bannerBorder};">⭐ ${this.xp} XP • ${escapeHtml(honor.shortLabel)}</span>
      </div>

      <!-- Main Expanded HUD Container -->
      <div class="ha-quest-panel">
        <div class="ha-quest-panel-header">
          <div class="ha-quest-drag-handle" title="${escapeHtml(this.t('dragHandleTitle'))}">⋮⋮</div>
          <div class="ha-quest-header-left">
            <span class="ha-quest-logo">${honor.tier === 5 ? '💎' : '🎮'}</span>
            <div class="ha-quest-title-wrap">
              <h4 class="ha-quest-app-title">BPMN-Quest • Studio Companion</h4>
              <div class="ha-quest-xp-bar" title="${escapeHtml(nextTierInfo)}">
                <span class="ha-quest-xp-label" style="color:${honor.badgeColor};">⭐ ${this.xp} XP • ${escapeHtml(honor.shortLabel)}</span>
                <span class="ha-quest-rank-label">👑 ${escapeHtml(honor.guildTitle)}</span>
              </div>
            </div>
          </div>
          <div class="ha-quest-header-actions">
            <button type="button" class="ha-quest-btn-icon ha-quest-btn-minimize" title="${escapeHtml(this.t('minimize'))}">&minus;</button>
            <button type="button" class="ha-quest-btn-icon ha-quest-btn-close" title="${escapeHtml(this.t('close'))}">&times;</button>
          </div>
        </div>

        <!-- Tab Selector -->
        <div class="ha-quest-tabs">
          <button type="button" class="ha-quest-tab ${this.activeTab === 'walkthrough' ? 'active' : ''}" data-tab="walkthrough">
            🏰 ${escapeHtml(this.t('tabJourney'))}
          </button>
          <button type="button" class="ha-quest-tab ${this.activeTab === 'challenges' ? 'active' : ''}" data-tab="challenges">
            🧩 ${escapeHtml(this.t('tabChallenges'))}
          </button>
        </div>

        <div class="ha-quest-panel-body">
          ${this.activeTab === 'walkthrough' ? this.renderWalkthrough(chap, isLastChapter, isCurrentDone) : this.renderChallenges()}
        </div>
      </div>
    `;
  }

  renderWalkthrough(chap, isLastChapter, isCurrentDone) {
    const progressPct = Math.round((this.completedChapters.size / this.chapters.length) * 100);
    // Highest chapter unlocked: user can navigate to any completed chapter, plus the first uncompleted chapter
    const maxUnlocked = Math.min(this.completedChapters.size, this.chapters.length - 1);
    const subtasks = chap.subtasks || [];
    const doneCount = subtasks.filter(st => isCurrentDone || this.completedSubtasks.has(st.id)).length;

    return `
      <div class="ha-quest-chapter-nav">
        ${this.chapters.map((c, idx) => {
          const isDone = this.completedChapters.has(idx);
          const isLocked = idx > maxUnlocked;
          const isActive = idx === this.currentChapterIndex;
          let cls = 'ha-quest-nav-dot';
          if (isActive) cls += ' active';
          if (isDone) cls += ' completed';
          if (isLocked) cls += ' locked';

          return `
            <button type="button" class="${cls}" data-chapter="${idx}" ${isLocked ? 'disabled' : ''} title="${escapeHtml(isLocked ? this.t('lockedTooltip') : this.getChapterTitle(c))}">
              ${isLocked ? '🔒' : escapeHtml(c.icon)}
            </button>
          `;
        }).join('')}
      </div>

      <div class="ha-quest-card">
        <div class="ha-quest-card-header">
          <span class="ha-quest-chapter-badge">${escapeHtml(this.t('chapterBadge'))} ${this.currentChapterIndex + 1} / ${this.chapters.length}</span>
          <span class="ha-quest-progress-pct">${progressPct}% ${escapeHtml(this.t('solved'))}</span>
        </div>
        <h3 class="ha-quest-chapter-title">${escapeHtml(this.getChapterTitle(chap))}</h3>

        <div class="ha-quest-mission-box">
          <div class="ha-quest-mission-top">
            <span class="ha-quest-mission-label">🎯 ${escapeHtml(this.t('yourMission'))}:</span>
            ${isCurrentDone
              ? `<span class="ha-quest-status-done">✅ ${escapeHtml(this.t('done'))}</span>`
              : `<span class="ha-quest-status-pending">⏳ ${escapeHtml(this.t('pending'))} (${doneCount}/${subtasks.length})</span>`}
          </div>
          <p class="ha-quest-mission-desc">${escapeHtml(this.getChapterTaskText(chap))}</p>
        </div>

        <!-- Step-by-Step Subtasks Checklist -->
        <div class="ha-quest-subtasks-wrap">
          <div class="ha-quest-subtasks-header">
            <span class="ha-quest-subtasks-title">📋 ${escapeHtml(this.t('subtasksHeader'))}</span>
            <span class="ha-quest-subtasks-counter">${doneCount} / ${subtasks.length}</span>
          </div>
          <ul class="ha-quest-subtasks-list">
            ${subtasks.map(st => {
              const isDone = isCurrentDone || this.completedSubtasks.has(st.id);
              return `
                <li class="ha-quest-subtask-item ${isDone ? 'is-done' : ''}" title="${escapeHtml(this.getSubtaskHint(st))}">
                  <span class="ha-quest-subtask-check">${isDone ? '✅' : '⬜'}</span>
                  <span class="ha-quest-subtask-text">${escapeHtml(this.getSubtaskText(st))}</span>
                </li>
              `;
            }).join('')}
          </ul>
        </div>

        <div class="ha-quest-tip-box">
          <span class="ha-quest-tip-icon">💡</span>
          <div class="ha-quest-tip-content">
            <strong>${escapeHtml(this.t('insightsTitle'))}:</strong>
            <span>${escapeHtml(this.getChapterTipText(chap))}</span>
          </div>
        </div>

        <div class="ha-quest-card-controls">
          <button type="button" class="button ha-quest-btn-focus" data-target="${escapeHtml(chap.targetId)}">
            🔍 ${escapeHtml(this.t('focusCamera'))}
          </button>
          <button type="button" class="button ha-quest-btn-highlight" data-target="${escapeHtml(chap.targetId)}">
            ✨ ${escapeHtml(this.t('highlight'))}
          </button>
        </div>
      </div>

      <div class="ha-quest-footer-actions">
        <button type="button" class="button button-secondary ha-quest-btn-prev" ${this.currentChapterIndex === 0 ? 'disabled' : ''}>
          ◀ ${escapeHtml(this.t('prevChapter'))}
        </button>

        ${isLastChapter ? `
          <button type="button" class="button button-primary ha-quest-btn-cert ${isCurrentDone ? 'ha-btn-cert-ready' : ''}">
            🏆 ${escapeHtml(this.t('openCertificate'))}
          </button>
        ` : `
          <button type="button" class="button button-primary ha-quest-btn-next ${!isCurrentDone ? 'disabled' : ''}" ${!isCurrentDone ? 'disabled' : ''} title="${!isCurrentDone ? escapeHtml(this.t('completeSubtasksFirst')) : ''}">
            ${!isCurrentDone ? '🔒 ' : ''}${escapeHtml(this.t('nextChapter'))} ▶
          </button>
        `}
      </div>

      <div class="ha-quest-reset-wrap">
        <button type="button" class="ha-quest-btn-link-reload-template" title="${escapeHtml(this.t('reloadTemplateOnlyTooltip'))}">
          📄 ${escapeHtml(this.t('reloadTemplateOnly'))}
        </button>
        <button type="button" class="ha-quest-btn-link-reset" title="${escapeHtml(this.t('reloadTemplateAndResetTooltip'))}">
          🔄 ${escapeHtml(this.t('reloadTemplateAndReset'))}
        </button>
      </div>
    `;
  }

  renderChallenges() {
    return `
      <div class="ha-quest-challenges-list">
        <div class="ha-quest-challenges-intro">
          <p>${escapeHtml(this.t('challengesIntro'))}</p>
        </div>

        ${LINTER_CHALLENGES.map((ch) => {
          const isDone = this.completedChallenges.has(ch.id);
          const resolved = resolveQuestLang(this.lang);
          const badge = typeof ch.badge === 'object' ? (ch.badge[resolved] || ch.badge[resolved.split('_')[0]] || ch.badge.en || ch.badge.de) : ch.badge;
          const title = ch.title[resolved] || ch.title[resolved.split('_')[0]] || ch.title.en || ch.title.de;
          const intro = ch.intro[resolved] || ch.intro[resolved.split('_')[0]] || ch.intro.en || ch.intro.de;
          return `
            <div class="ha-quest-challenge-card ${isDone ? 'completed' : ''}" data-challenge-id="${escapeHtml(ch.id)}">
              <div class="ha-quest-ch-top">
                <span class="ha-quest-ch-badge">${escapeHtml(badge)}</span>
                <span class="ha-quest-ch-xp">+${ch.xp} XP</span>
              </div>
              <h4 class="ha-quest-ch-title">${escapeHtml(title)}</h4>
              <p class="ha-quest-ch-intro">${escapeHtml(intro)}</p>
              <div class="ha-quest-ch-actions">
                ${isDone ? `
                  <span class="ha-quest-ch-solved">✅ ${escapeHtml(this.t('done'))}</span>
                ` : `
                  <button type="button" class="button button-secondary ha-quest-btn-start-ch" data-ch-id="${escapeHtml(ch.id)}">
                    🚀 ${escapeHtml(this.t('startPuzzle'))}
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}

        <div class="ha-quest-linter-status-bar">
          <span class="ha-quest-linter-msg">${this.getInitialLinterMsg()}</span>
          <button type="button" class="button ha-quest-btn-check-lint">
            ⚡ ${this.t('checkNow')}
          </button>
        </div>

        <div class="ha-quest-reset-wrap">
          <button type="button" class="ha-quest-btn-link-reload-template" title="${this.t('reloadTemplateOnlyTooltip')}">
            📄 ${this.t('reloadTemplateOnly')}
          </button>
          <button type="button" class="ha-quest-btn-link-reset" title="${this.t('reloadTemplateAndResetTooltip')}">
            🔄 ${this.t('reloadTemplateAndReset')}
          </button>
        </div>
      </div>
    `;
  }

  getInitialLinterMsg() {
    if (this.activeChallenge) {
      const count = this.challengeState?.lastErrorCount || 0;
      if (count > 0) {
        return `🎯 ${this.t('puzzleActive')}: ${count} ${this.t('errorsRemaining')}`;
      }
      return `🎯 ${this.t('puzzleActive')}`;
    }
    return `🔍 ${this.t('linterGuardActive')}`;
  }

  bindEvents() {
    if (!this.hudElement) return;

    // Minimize / Expand
    this.hudElement.querySelectorAll('.ha-quest-pill, .ha-quest-btn-minimize').forEach(el => {
      el.addEventListener('click', () => {
        this.isMinimized = !this.isMinimized;
        this.render();
        this.bindEvents();
      });
    });

    // Close
    const closeBtn = this.hudElement.querySelector('.ha-quest-btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.destroyDraggable();
        this.hudElement.remove();
      });
    }

    // Tabs
    this.hudElement.querySelectorAll('.ha-quest-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        this.activeTab = e.currentTarget.getAttribute('data-tab');
        this.render();
        this.bindEvents();
      });
    });

    // Chapter Navigation Dots
    this.hudElement.querySelectorAll('.ha-quest-nav-dot:not(.locked)').forEach(dot => {
      dot.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-chapter'), 10);
        this.goToChapter(idx);
      });
    });

    // Next Button (Only active when current chapter task is done)
    const nextBtn = this.hudElement.querySelector('.ha-quest-btn-next:not(.disabled)');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.goToChapter(this.currentChapterIndex + 1);
      });
    }

    // Previous Button
    const prevBtn = this.hudElement.querySelector('.ha-quest-btn-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.goToChapter(this.currentChapterIndex - 1);
      });
    }

    // Camera Focus
    const focusBtn = this.hudElement.querySelector('.ha-quest-btn-focus');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        this.focusCurrentChapter();
      });
    }

    // Element Spotlight Highlight
    const highlightBtn = this.hudElement.querySelector('.ha-quest-btn-highlight');
    if (highlightBtn) {
      highlightBtn.addEventListener('click', () => {
        const chap = this.chapters[this.currentChapterIndex];
        this.highlightElement(chap.targetId);
      });
    }

    // Certificate Button
    const certBtn = this.hudElement.querySelector('.ha-quest-btn-cert');
    if (certBtn) {
      certBtn.addEventListener('click', () => {
        const wpUserName = (typeof window !== 'undefined' && window.bpmnSettings && window.bpmnSettings.currentUser) || '';
        showCertificateModal({
          lang: this.lang,
          userName: wpUserName || document.getElementById('user_login')?.value || this.t('userNameDefault') || 'BPMN Process Architect',
          xp: this.xp,
          completedChaptersCount: this.completedChapters.size,
          totalChaptersCount: this.chapters.length,
          completedChallenges: Array.from(this.completedChallenges),
          totalChallengesCount: LINTER_CHALLENGES.length,
          completedSubtasksCount: this.completedSubtasks.size,
          certificate: (window.bpmnSettings && window.bpmnSettings.certificate) ? window.bpmnSettings.certificate : {}
        });
      });
    }

    // Start Challenge
    this.hudElement.querySelectorAll('.ha-quest-btn-start-ch').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chId = e.currentTarget.getAttribute('data-ch-id');
        this.startChallenge(chId);
      });
    });

    // Manual Linter Check
    const checkLintBtn = this.hudElement.querySelector('.ha-quest-btn-check-lint');
    if (checkLintBtn) {
      checkLintBtn.addEventListener('click', () => {
        this.verifyLinterClean();
      });
    }

    // Reload Template Only (keeps progress intact)
    this.hudElement.querySelectorAll('.ha-quest-btn-link-reload-template').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showReloadTemplateModal();
      });
    });

    // Reset Progress (Only via the explicit "Vorlage neu laden & Fortschritt zurücksetzen" button)
    this.hudElement.querySelectorAll('.ha-quest-btn-link-reset').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showResetConfirmationModal();
      });
    });
  }

  showReloadTemplateModal() {
    const existing = document.querySelector('.ha-quest-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'ha-quest-confirm-overlay';
    overlay.innerHTML = `
      <div class="ha-quest-confirm-dialog" role="dialog" aria-modal="true">
        <div class="ha-quest-confirm-header">
          <span class="ha-quest-confirm-icon">📄</span>
          <h4>${escapeHtml(this.t('confirmReloadTitle'))}</h4>
        </div>
        <p class="ha-quest-confirm-text">
          ${escapeHtml(this.t('confirmReloadText')).replace(/\n/g, '<br>')}
        </p>
        <div class="ha-quest-confirm-actions">
          <button type="button" class="button button-secondary ha-quest-confirm-cancel">
            ${escapeHtml(this.t('btnCancel'))}
          </button>
          <button type="button" class="button button-primary ha-quest-confirm-proceed">
            📄 ${escapeHtml(this.t('reloadTemplateOnly'))}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('.ha-quest-confirm-cancel');
    const proceedBtn = overlay.querySelector('.ha-quest-confirm-proceed');

    const closeOverlay = () => overlay.remove();

    cancelBtn.addEventListener('click', closeOverlay);
    proceedBtn.addEventListener('click', async () => {
      closeOverlay();
      await this.reloadTemplateOnly();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
  }

  async reloadTemplateOnly() {
    this.activeChallenge = null;
    this.challengeState = null;
    this.challengeLoading = false;

    // Reload the official clean Quest template XML into the modeler
    try {
      const cleanQuestXml = getQuestXml(this.lang);
      if (cleanQuestXml) {
        await this.modeler.importXML(cleanQuestXml);
        const canvas = this.modeler.get('canvas');
        canvas.zoom('fit-viewport', 'auto');

        const xmlInput = this.wrap.querySelector('[name="bpmn_xml"]') || document.getElementById('bpmn_xml');
        if (xmlInput) {
          xmlInput.value = cleanQuestXml;
        }
      }
    } catch (err) {
      console.warn('[HA-BPMN] Failed to reload Quest template:', err);
    }

    // Explicitly persist current progress so nothing is lost
    this.saveProgress();

    const toastMsg = this.t('toastReloadDone');
    this.showToast(toastMsg, 3500);

    this.goToChapter(this.currentChapterIndex);
  }

  showResetConfirmationModal() {
    const existing = document.querySelector('.ha-quest-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'ha-quest-confirm-overlay';
    overlay.innerHTML = `
      <div class="ha-quest-confirm-dialog" role="dialog" aria-modal="true">
        <div class="ha-quest-confirm-header">
          <span class="ha-quest-confirm-icon">⚠️</span>
          <h4>${escapeHtml(this.t('confirmResetTitle'))}</h4>
        </div>
        <p class="ha-quest-confirm-text">
          ${escapeHtml(this.t('confirmResetText')).replace(/\n/g, '<br>')}
        </p>
        <div class="ha-quest-confirm-actions">
          <button type="button" class="button button-secondary ha-quest-confirm-cancel">
            ${escapeHtml(this.t('btnCancel'))}
          </button>
          <button type="button" class="button button-danger ha-quest-confirm-proceed">
            🔄 ${escapeHtml(this.t('reloadTemplateAndReset'))}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('.ha-quest-confirm-cancel');
    const proceedBtn = overlay.querySelector('.ha-quest-confirm-proceed');

    const closeOverlay = () => overlay.remove();

    cancelBtn.addEventListener('click', closeOverlay);
    proceedBtn.addEventListener('click', async () => {
      closeOverlay();
      await this.resetProgress();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
  }

  async resetProgress() {
    this.xp = 100;
    this.completedChapters = new Set();
    this.completedSubtasks = new Set();
    this.completedChallenges = new Set();
    this.currentChapterIndex = 0;
    this.activeChallenge = null;
    this.challengeState = null;
    this.challengeLoading = false;
    try {
      localStorage.removeItem('ha_bpmn_quest_save');
    } catch (e) {}

    // Reload the official clean Quest template XML into the modeler
    try {
      const cleanQuestXml = getQuestXml(this.lang);
      if (cleanQuestXml) {
        await this.modeler.importXML(cleanQuestXml);
        const canvas = this.modeler.get('canvas');
        canvas.zoom('fit-viewport', 'auto');

        const xmlInput = this.wrap.querySelector('[name="bpmn_xml"]') || document.getElementById('bpmn_xml');
        if (xmlInput) {
          xmlInput.value = cleanQuestXml;
        }
      }
    } catch (err) {
      console.warn('[HA-BPMN] Failed to reload Quest template on reset:', err);
    }

    const toastMsg = this.t('toastResetDone');
    this.showToast(toastMsg, 3500);

    this.render();
    this.bindEvents();
    this.goToChapter(0);
  }

  goToChapter(idx) {
    if (idx < 0 || idx >= this.chapters.length) return;
    this.currentChapterIndex = idx;
    if (idx !== 1 && this.wrap) {
      const notif = this.wrap.querySelector('#ha-quest-linter-notification');
      if (notif) notif.remove();
    }
    // NOTE: XP is NOT added on navigation. Only awarded once via completeChapter()!
    this.render();
    this.bindEvents();
    this.focusCurrentChapter();
    const chap = this.chapters[this.currentChapterIndex];
    setTimeout(() => this.highlightElement(chap.targetId), 250);
    setTimeout(() => this.checkRegistryState(), 150);
  }

  focusCurrentChapter() {
    try {
      const canvas = this.modeler.get('canvas');
      const chap = this.chapters[this.currentChapterIndex];
      if (chap && chap.box) {
        canvas.viewbox({
          x: chap.box.x - 60,
          y: Math.max(0, chap.box.y - 30),
          width: chap.box.width + 120,
          height: chap.box.height + 80
        });
        const currentZoom = canvas.zoom();
        if (typeof currentZoom === 'number' && currentZoom > 0.75) {
          canvas.zoom(0.75);
        }
      }
    } catch (e) {
      console.warn('[HA-BPMN] Quest HUD could not focus canvas:', e);
    }
  }

  highlightElement(elementId) {
    try {
      const canvas = this.modeler.get('canvas');
      canvas.addMarker(elementId, 'ha-quest-spotlight');
      setTimeout(() => {
        canvas.removeMarker(elementId, 'ha-quest-spotlight');
      }, 2500);
    } catch (e) {
      console.warn('[HA-BPMN] Highlight element error:', e);
    }
  }

  async startChallenge(challengeId) {
    const ch = LINTER_CHALLENGES.find(c => c.id === challengeId);
    if (!ch) return;

    const resolved = resolveQuestLang(this.lang);
    const chTitle = ch.title[resolved] || ch.title[resolved.split('_')[0]] || ch.title.en || ch.title.de;
    const confirmMap = {
      de: `Möchtest du das Rätsel "${chTitle}" starten? Ungespeicherte Änderungen werden überschrieben.`,
      en: `Start puzzle "${chTitle}"? Unsaved changes will be replaced.`,
      es: `¿Iniciar el desafío "${chTitle}"? Los cambios no guardados se sobrescribirán.`,
      fr: `Démarrer l\'énigme "${chTitle}" ? Les modifications non enregistrées seront remplacées.`,
      it: `Avviare l\'enigma "${chTitle}"? Le modifiche non salvate andranno perse.`,
      pt: `Iniciar o desafio "${chTitle}"? Alterações não salvas serão substituídas.`,
      nl: `Puzzel "${chTitle}" starten? Niet-opgeslagen wijzigingen worden overschreven.`,
      pl: `Uruchomić zagadkę "${chTitle}"? Niezapisane zmiany zostaną nadpisane.`,
      ru: `Начать решение задачи "${chTitle}"? Несохраненные изменения будут перезаписаны.`,
      zh: `是否载入谜题“${chTitle}”？当前未保存的修改将被覆盖。`,
      ja: `パズル「${chTitle}」を開始しますか？未保存の変更は失われます。`
    };
    const confirmMsg = confirmMap[resolved] || confirmMap[resolved.split('_')[0]] || confirmMap.en;

    if (!confirm(confirmMsg)) return;

    try {
      this.challengeLoading = true;
      this.activeChallenge = ch;
      this.challengeState = {
        id: ch.id,
        initialErrorsDetected: false,
        userModified: false,
        lastErrorCount: 0
      };

      await this.modeler.importXML(ch.initialXml);
      this.modeler.get('canvas').zoom('fit-viewport', 'auto');

      try {
        const linting = this.modeler.get('linting', false);
        if (linting) {
          if (typeof linting.toggle === 'function' && !linting.isActive()) {
            linting.toggle(true);
          }
          if (typeof linting.update === 'function') {
            linting.update();
          }
        }
      } catch (e) {}

      // Wait 500ms after import to allow linting to populate issues and clear loading state
      setTimeout(() => {
        this.challengeLoading = false;
        const initialErrors = this.getCurrentLinterErrors();
        if (initialErrors.length > 0) {
          this.challengeState.initialErrorsDetected = true;
          this.challengeState.lastErrorCount = initialErrors.length;
        } else {
          // If linting needs another tick
          setTimeout(() => {
            const retryErrors = this.getCurrentLinterErrors();
            if (retryErrors.length > 0) {
              this.challengeState.initialErrorsDetected = true;
              this.challengeState.lastErrorCount = retryErrors.length;
            }
            this.updateLinterStatusDisplay();
          }, 300);
        }
        this.updateLinterStatusDisplay();
      }, 500);

      const alertMap = {
        de: `🚀 Rätsel "${chTitle}" geladen!\n\nZiel: Behebe die Modellierungsfehler im Diagramm, bis der Linter 0 Fehler anzeigt!`,
        en: `🚀 Puzzle "${chTitle}" loaded!\n\nGoal: Fix the modeling errors in the diagram until bpmnlint reports 0 errors!`,
        es: `🚀 ¡Desafío "${chTitle}" cargado!\n\nObjetivo: Corrige los fallos en el diagrama hasta que el linter muestre 0 errores.`,
        fr: `🚀 Énigme "${chTitle}" chargée !\n\nObjectif : Corrigez les erreurs du diagramme jusqu'à ce que le linter affiche 0 erreur !`,
        it: `🚀 Enigma "${chTitle}" caricato!\n\nObiettivo: Correggi gli errori nel diagramma fino a quando il linter segnala 0 errori!`,
        pt: `🚀 Desafio "${chTitle}" carregado!\n\nObjetivo: Corrija os erros no diagrama até que o linter reporte 0 erros!`,
        nl: `🚀 Puzzel "${chTitle}" geladen!\n\nDoel: Herstel de fouten in het diagram tot de linter 0 fouten meldt!`,
        pl: `🚀 Zagadka "${chTitle}" załadowana!\n\nCel: Napraw błędy w diagramie, aż linter wskaże 0 błędów!`,
        ru: `🚀 Задача "${chTitle}" загружена!\n\nЦель: Исправьте ошибки в диаграмме, пока линтер не покажет 0 ошибок!`,
        zh: `🚀 谜题“${chTitle}”已载入！\n\n目标：修复画布上的所有建模缺陷，直至 Linter 质检错误清零！`,
        ja: `🚀 パズル「${chTitle}」が読み込まれました！\n\n目標：リンターのエラーが0件になるまでダイアグラムを修正してください！`
      };
      const alertMsg = alertMap[resolved] || alertMap[resolved.split('_')[0]] || alertMap.en;
      alert(alertMsg);

      this.render();
      this.bindEvents();
    } catch (err) {
      console.error('[HA-BPMN] Challenge load error:', err);
      this.challengeLoading = false;
    }
  }

  verifyLinterClean() {
    try {
      const lint = this.modeler.get('linting', false);
      if (lint && typeof lint.update === 'function') {
        lint.update();
      }
    } catch (e) {}

    const errors = this.getCurrentLinterErrors();

    const resolved = resolveQuestLang(this.lang);
    // Case 1: No challenge is active - standard diagram check
    if (!this.activeChallenge) {
      if (errors.length === 0) {
        alert(this.t('zeroErrors'));
      } else {
        const header = resolved === 'de' ? `⚠️ Es wurden ${errors.length} Fehler gefunden:` : `⚠️ Found ${errors.length} error(s):`;
        alert(`${header}\n${errors.map(e => '• ' + e.message).join('\n')}`);
      }
      return;
    }

    // Case 2: Challenge is active, but user hasn't edited anything
    if (!this.challengeState || !this.challengeState.userModified) {
      const chIntro = this.activeChallenge.intro[resolved] || this.activeChallenge.intro[resolved.split('_')[0]] || this.activeChallenge.intro.en || this.activeChallenge.intro.de;
      const notModifiedMsg = resolved === 'de'
        ? `⚠️ Du hast das Diagramm noch nicht bearbeitet!\n\nAufgabe: ${chIntro}`
        : `⚠️ You haven't modified the diagram yet!\n\nTask: ${chIntro}`;
      alert(notModifiedMsg);
      return;
    }

    // Case 3: Challenge active and user edited -> Check errors
    if (errors.length === 0) {
      this.onChallengeSolved();
    } else {
      const remainingMsg = resolved === 'de'
        ? `⚠️ Noch nicht ganz! Es gibt noch ${errors.length} Fehler zu beheben:\n${errors.map(e => '• ' + e.message).join('\n')}`
        : `⚠️ Not yet! There are ${errors.length} error(s) remaining:\n${errors.map(e => '• ' + e.message).join('\n')}`;
      alert(remainingMsg);
    }
  }

  onChallengeSolved() {
    if (this.activeChallenge) {
      const ch = this.activeChallenge;
      const isFirst = !this.completedChallenges.has(ch.id);
      this.completedChallenges.add(ch.id);
      if (isFirst) {
        this.awardXP(ch.xp);
      }
      const resolved = resolveQuestLang(this.lang);
      const chTitle = ch.title[resolved] || ch.title[resolved.split('_')[0]] || ch.title.en || ch.title.de;
      const winMap = {
        de: `🎉 GLÜCKWUNSCH! Du hast das Rätsel "${chTitle}" gemeistert!\n+${ch.xp} XP erhalten!`,
        en: `🎉 CONGRATULATIONS! You solved "${chTitle}"!\n+${ch.xp} XP awarded!`,
        es: `¡🎉 ¡ENHORABUENA! Has resuelto el desafío "${chTitle}".\n+${ch.xp} XP recibidos.`,
        fr: `🎉 FÉLICITATIONS ! Vous avez résolu "${chTitle}" !\n+${ch.xp} XP obtenus !`,
        it: `🎉 CONGRATULAZIONI! Hai risolto l\'enigma "${chTitle}"!\n+${ch.xp} XP ricevuti!`,
        pt: `🎉 PARABÉNS! Você resolveu o desafio "${chTitle}"!\n+${ch.xp} XP recebidos!`,
        nl: `🎉 GEFELICITEERD! Je hebt de puzzel "${chTitle}" opgelost!\n+${ch.xp} XP ontvangen!`,
        pl: `🎉 GRATULACJE! Rozwiązałeś zagadkę "${chTitle}"!\n+${ch.xp} XP przyznane!`,
        ru: `🎉 ПОЗДРАВЛЯЕМ! Вы решили задачу "${chTitle}"!\n+${ch.xp} XP получено!`,
        zh: `🎉 热烈祝贺！你已成功攻克谜题“${chTitle}”！\n斩获 +${ch.xp} XP！`,
        ja: `🎉 おめでとうございます！パズル「${chTitle}」を解決しました！\n+${ch.xp} XP 獲得！`
      };
      const winMsg = winMap[resolved] || winMap[resolved.split('_')[0]] || winMap.en;
      this.showToast(winMsg, 4000);
      alert(winMsg);
      this.activeChallenge = null;
      this.challengeState = null;
      this.challengeLoading = false;
      this.render();
      this.bindEvents();
    }
  }
}

/**
 * Helper to initialize or toggle Quest HUD on a modeler wrap.
 *
 * @param {HTMLElement} wrap Container element.
 * @param {Object} modeler bpmn-js instance.
 * @param {Object} options Configuration.
 * @return {QuestHUD}
 */
export function initQuestHUD(wrap, modeler, options = {}) {
  let instance = wrap.__questHUDInstance;
  if (!instance) {
    instance = new QuestHUD(wrap, modeler, options);
    wrap.__questHUDInstance = instance;
  } else {
    if (options.lang) {
      instance.lang = options.lang;
      instance.isDe = options.lang === 'de';
    }
    if (!instance.hudElement || !document.body.contains(instance.hudElement)) {
      if (!instance.hudElement) {
        instance.hudElement = document.createElement('div');
      }
      instance.removeExisting();
      document.body.appendChild(instance.hudElement);
      instance.initDraggable();
    }
    instance.render();
    instance.bindEvents();
  }
  return instance;
}
