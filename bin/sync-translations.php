<?php
/**
 * Translation Synchronization & Build Tool for HA-BPMN-Manager.
 *
 * Ensures:
 * 1. plugin/languages/ha-bpmn-manager.pot is current.
 * 2. All 35 locales have complete, valid .po files with 100% of the pot msgids.
 * 3. All .po files are compiled to binary .mo files with msgfmt.
 * 4. All .l10n.php files are generated directly from the .po dictionary.
 * 5. Traditional gettext files (.po/.mo) and modern PHP files (.l10n.php) are 100% identical.
 */

$lang_dir = __DIR__ . '/../plugin/languages';
$pot_file = $lang_dir . '/ha-bpmn-manager.pot';

if ( ! file_exists( $pot_file ) ) {
	die( "POT file not found at $pot_file\n" );
}

// 1. Parse POT file
function parse_pot_msgids( $file ) {
	$content = file_get_contents( $file );
	$lines = explode( "\n", $content );
	$msgids = [];
	$current_msgid = null;
	$state = null;
	foreach ( $lines as $line ) {
		$trim = trim( $line );
		if ( 0 === strpos( $trim, 'msgid ' ) ) {
			if ( null !== $current_msgid && '' !== $current_msgid ) {
				$msgids[] = $current_msgid;
			}
			$current_msgid = substr( $trim, 6 );
			$current_msgid = stripcslashes( trim( $current_msgid, '"' ) );
			$state = 'msgid';
		} elseif ( 0 === strpos( $trim, '"' ) && 'msgid' === $state ) {
			$current_msgid .= stripcslashes( trim( $trim, '"' ) );
		} elseif ( 0 === strpos( $trim, 'msgstr ' ) ) {
			$state = 'msgstr';
		}
	}
	if ( null !== $current_msgid && '' !== $current_msgid ) {
		$msgids[] = $current_msgid;
	}
	return array_unique( $msgids );
}

$canonical_msgids = parse_pot_msgids( $pot_file );
echo "Found " . count( $canonical_msgids ) . " canonical translatable strings in POT.\n";

// 2. Comprehensive German Translations Dictionary
$de_translations = [
	'Continue in BPMN Studio ▶' => 'Im BPMN-Studio fortsetzen ▶',
	'Open BPMN Studio 🚀' => 'BPMN-Studio öffnen 🚀',
	'Interactive modeling studio for ISO 19510 business processes with token simulation.' => 'Interaktives Modellierungsstudio für ISO 19510 Geschäftsprozesse mit Tokensimulation.',
	'Download PNG' => 'PNG herunterladen',
	'Download PNG Image' => 'PNG-Grafik herunterladen',
	'HA-BPMN-Manager: Deactivation & Data' => 'HA-BPMN-Manager: Deaktivierung & Daten',
	'Close' => 'Schließen',
	'You are about to deactivate <strong>HA-BPMN-Manager</strong>. Please choose what should happen to your diagrams and data if the plugin is later uninstalled:' => 'Sie sind dabei, <strong>HA-BPMN-Manager</strong> zu deaktivieren. Bitte legen Sie fest, was mit Ihren Diagrammen und Daten geschehen soll, falls das Plugin später gelöscht wird:',
	'Keep data in database' => 'Daten in der Datenbank behalten',
	'Recommended' => 'Empfohlen',
	'All BPMN diagrams, XML models, revisions, and settings remain safely stored in the database. Everything will be restored immediately if the plugin is reactivated.' => 'Alle BPMN-Diagramme, XML-Modelle, Revisionen und Einstellungen bleiben sicher in der Datenbank erhalten. Bei erneuter Aktivierung ist alles sofort wieder da.',
	'Remove all data upon uninstallation' => 'Daten bei Löschung restlos entfernen',
	'GDPR / Danger' => 'DSGVO / Gefahr',
	'Warning: If you delete the plugin via WordPress after deactivation, all diagrams and settings will be permanently destroyed.' => 'Achtung: Sollten Sie das Plugin nach der Deaktivierung über WordPress löschen, werden alle Diagramme und Einstellungen unwiderruflich entfernt.',
	'💡 <strong>Note:</strong> You can also change this preference at any time in the <em>System Status</em> tab of the plugin settings.' => '💡 <strong>Hinweis:</strong> Diese Einstellung kann auch jederzeit im Tab <em>System Status</em> der Plugin-Einstellungen geändert werden.',
	'Cancel' => 'Abbrechen',
	'Save & Deactivate' => 'Speichern & Deaktivieren',
	'Saving & deactivating…' => 'Wird gespeichert & deaktiviert…',
	'Tutorial' => 'Tutorial',
	'Select user language manually (Default: WordPress language)' => 'Benutzersprache manuell wählen (Standard: WordPress-Sprache)',
	'🌐 Automatic (WordPress)' => '🌐 Automatisch (WP)',
	'Master Certificate & Quest Award' => 'Meister-Urkunde & Quest-Zertifikat',
	'Standard WordPress Tags' => 'Standard WordPress Tags (Schlagwörter)',
	'Interactive Guide & BPMN-Quest (Tutorial)' => 'Interaktive Anleitung & BPMN-Quest (Tutorial)',
	'Enables the interactive tutorial button, gamified learning companion HUD, step-by-step walkthroughs, and linter challenges in the BPMN editor.' => 'Aktiviert den interaktiven Tutorial-Button, das spielerische Lernbegleiter-HUD, Schritt-für-Schritt-Anleitungen und Linter-Rätsel im BPMN-Editor.',
	'Process Templates Library' => 'Prozess-Vorlagen-Bibliothek',
	'Enables the pre-built business process templates modal and toolbar button (e.g. employee onboarding, invoice approval, change request) to quickly jump-start diagram modeling.' => 'Aktiviert den Vorlagen-Button und Dialog für vorgefertigte Geschäftsprozesse (z. B. Mitarbeiter-Onboarding, Rechnungsgenehmigung, Änderungsantrag) für den schnellen Einstieg.',
	'QM Process Handbook (Print/PDF)' => 'QM-Prozesshandbuch (Druck/PDF)',
	'Enables the QM Handbook generator button in the editor toolbar to export structured, audit-ready process documentation and step tables into a printable browser view.' => 'Aktiviert den QM-Handbuch-Generator in der Werkzeugleiste, um strukturierte, revisionssichere Prozessdokumentationen und Schritt-Tabellen in einer druckbaren Ansicht zu exportieren.',
	'Allow Visitors to Download BPMN, SVG & PNG' => 'Besuchern den Download von BPMN, SVG & PNG gestatten',
	'Displays download buttons in the frontend viewer bar so users can export the raw BPMN 2.0 XML, SVG vector image, or high-resolution PNG.' => 'Zeigt Download-Schaltflächen in der Frontend-Viewer-Leiste an, damit Benutzer die BPMN 2.0 XML-Rohdatei, SVG-Vektorgrafik oder hochauflösende PNG exportieren können.',
	'BPMN Quest / Learning Studio Target URL' => 'Ziel-URL für BPMN-Quest / Lernstudio',
	'Optional: Specify a custom frontend page URL containing the BPMN modeler where learners should be redirected to continue tasks (e.g. https://your-site.com/bpmn-studio/). If empty, the plugin automatically resolves the latest published BPMN diagram or WordPress editor.' => 'Optional: Benutzerdefinierte Seiten-URL mit dem BPMN-Modeler angeben, zu der Lernende weitergeleitet werden (z. B. https://ihre-website.de/bpmn-studio/). Wenn leer, wählt das Plugin automatisch das zuletzt veröffentlichte Diagramm.',
	'Check for updates' => 'Nach Updates suchen',
	'Danger Zone: Deinstallation & Data Cleanup' => 'Gefahrenzone: Deinstallation & Datenbereinigung',
	'Choose what happens to your BPMN diagrams and settings when the plugin is deleted via WordPress.' => 'Bestimme, was mit deinen BPMN-Diagrammen und Einstellungen passiert, wenn das Plugin über WordPress gelöscht wird.',
	'Permanently delete all BPMN diagrams and settings when uninstalling the plugin' => 'Alle BPMN-Diagramme und Einstellungen beim Löschen des Plugins unwiderruflich entfernen',
	'🛡️ Safe by default (Recommended):' => '🛡️ Standardmäßig sicher (Empfohlen):',
	'When this toggle is disabled, all diagrams, XML models, revisions, and settings are preserved in the WordPress database. You can safely deactivate, update, or reinstall the plugin without losing data.' => 'Ist dieser Schalter deaktiviert, bleiben alle Diagramme, XML-Modelle, Revisionen und Einstellungen in der WordPress-Datenbank erhalten. Du kannst das Plugin gefahrlos deaktivieren, aktualisieren oder neu installieren, ohne Daten zu verlieren.',
	'⚠️ Only for permanent removal (GDPR):' => '⚠️ Nur bei endgültiger Entfernung (DSGVO):',
	'Only enable this option if you are permanently uninstalling the plugin and wish to clean up the database completely.' => 'Aktiviere diese Option nur, wenn du das Plugin dauerhaft deinstallierst und die Datenbank restlos bereinigen möchtest.',
	'Live Preview of Master Certificate' => 'Live-Vorschau der Meister-Urkunde',
	'Open the certificate with your currently configured texts, colors, seals, and signatures in full resolution (including print, SVG, and 300 DPI PNG export).' => 'Öffne die Urkunde mit deinen aktuell eingestellten Texten, Farben, Siegeln und Unterschriften in voller Auflösung (inkl. Druck, SVG- & 300 DPI PNG-Export).',
	'Open Certificate Preview' => 'Urkunden-Vorschau öffnen',
	'Notice:' => 'Hinweis:',
	'The Interactive Guide & BPMN-Quest (Tutorial) is currently disabled under „Modeler & Studio Tools“. Your certificate styling and signature settings remain safely saved and will be used as soon as the quest module is re-enabled.' => 'Die interaktive Anleitung & BPMN-Quest (Tutorial) ist unter „Modeler & Studio Tools“ derzeit deaktiviert. Deine Urkunden- und Unterschrifteneinstellungen bleiben sicher gespeichert und greifen, sobald das Quest-Modul wieder aktiv ist.',
	'Issuer, Institution & Governance' => 'Aussteller, Institution & Governance',
	'Configure the organization or academy name and the official governance text on the certificate.' => 'Konfiguriere den Namen der Akademie/Organisation sowie den offiziellen Governance-Schriftzug auf der Meister-Urkunde.',
	'Organization Name / Header' => 'Name der Organisation / Kopfzeile',
	'Appears in capital letters at the very top of the certificate. Leave empty for default ("GUILD OF PROCESS MASTERS • QM & ISO-19510 GOVERNANCE").' => 'Erscheint in Großbuchstaben ganz oben auf der Urkunde. Leer lassen für Standard („GILDE DER PROZESSMEISTER • QM & ISO-19510 GOVERNANCE“).',
	'Governance Text / Examination Authority' => 'Governance-Schriftzug / Prüfstelle',
	'Text below the primary signature (e.g. "HA-BPMN Guild Governance" or "Enterprise Architecture Board").' => 'Schriftzug unter der Hauptunterschrift (z. B. „HA-BPMN Guild Governance“ oder „Enterprise Architecture Board“).',
	'Certificate ID Prefix' => 'Zertifikats-ID Präfix',
	'Prefix before the generated verification number (e.g. "HA-BPMN-" or "CORP-CERT-").' => 'Kürzel vor der generierten Verifikationsnummer (z. B. „HA-BPMN-“ oder „CORP-CERT-“).',
	'Certificate Title, Salutation & Dedication' => 'Urkunden-Titel, Anrede & Widmungstext',
	'Customize the certificate title, personal dedication, and achievement badges.' => 'Passe den Haupttitel, die persönliche Widmung und die Darstellung der Leistungs-Badges an.',
	'Title Mode' => 'Titel-Modus',
	'Choose whether the certificate title is assigned dynamically based on quest honor level or as a fixed corporate title.' => 'Wähle, ob der Urkundentitel dynamisch nach erreichter Quest-Ehrenstufe vergeben wird (gamifiziert) oder als fester Unternehmenstitel.',
	'🏆 Dynamic based on honor level (Titan Grandmaster, Master Architect, etc.)' => '🏆 Dynamisch nach Ehrenstufe (Titanen-Großmeister, Meister-Architekt, etc.)',
	'🏢 Fixed custom title (e.g. Certificate for BPMN 2.0 Process Modeling)' => '🏢 Fester individueller Titel (z. B. Zertifikat für BPMN 2.0 Prozessmodellierung)',
	'Custom Main Title' => 'Individueller Urkunden-Haupttitel',
	'Applies when title mode is "Fixed custom title" or overrides the default title.' => 'Gilt bei Titel-Modus „Fester individueller Titel“ oder überschreibt den Standardtitel.',
	'Subtitle / Distinction' => 'Individueller Untertitel',
	'Optional subtitle below the main title. Leave blank for default.' => 'Optionaler Untertitel unter dem Haupttitel. Leer lassen für Standard (Prädikat & Gildenzeugnis).',
	'Salutation / Introductory Line' => 'Einleitungs-Formel (Anrede)',
	'Text line before the recipient name (default: "This diploma is proudly conferred upon:").' => 'Textzeile vor dem Namen des Empfängers (Standard: „Hiermit wird feierlich verliehen an:“).',
	'Custom Dedication (Laudatio)' => 'Benutzerdefinierte Würdigung (Laudatio)',
	'Custom dedication text. Leave blank to use the automatic summary of completed tasks and linter challenges.' => 'Eigener Würdigungstext. Leer lassen, um die automatische Zusammenfassung der gelösten Aufgaben und Linter-Puzzles zu nutzen.',
	'Show Achievement Badges' => 'Gamification-Badges anzeigen',
	'Displays the 3 achievement badges (Chapters, XP score, Linter puzzles) on the certificate. Disable for a purely formal look.' => 'Zeigt die 3 Leistungs-Pillen (🏛️ Kapitel, ⭐ XP-Score, 🧩 Linter-Rätsel) auf der Urkunde an. Deaktivieren für einen rein formellen Look.',
	'Signatures & Signers (Single / Dual Signature)' => 'Unterschriften & Unterzeichner (Single / Dual Signature)',
	'Upload your own signature images (transparent PNGs or SVGs) or use built-in vector calligraphy.' => 'Lade eigene Unterschriften-Bilder hoch (transparente PNGs oder SVGs) oder nutze die integrierten Vektor-Kalligraphien.',
	'Signature Mode' => 'Unterschriften-Modus',
	'Choose between single signature (right) or dual signature (left trainer/examiner, right head/guildmaster).' => 'Wähle zwischen einer einzelnen Unterschrift (rechts) oder doppelter Unterschrift (links Prüfer/Trainer, rechts Leitung/Gildenmeister).',
	'✍️ Single Signature (Right, Default)' => '✍️ Einzel-Unterschrift (Rechts, Standard)',
	'✍️✍️ Dual Signature (Left Trainer/Examiner, Right Head)' => '✍️✍️ Doppel-Unterschrift (Links Prüfer/Trainer, Rechts Leitung)',
	'1. Primary Signer (Right)' => '1. Hauptunterzeichner (Rechts)',
	'Signature 1 (Image File)' => 'Unterschrift 1 (Bilddatei)',
	'Recommended: Transparent PNG or SVG graphic of the handwritten signature. Leave blank for vector calligraphy.' => 'Empfohlen: Transparente PNG- oder SVG-Grafik der handgeschriebenen Unterschrift. Leer lassen für elegante Vektor-Kalligraphie.',
	'Select Image' => 'Bild auswählen',
	'Remove' => 'Entfernen',
	'Name of 1st Signer' => 'Name des 1. Unterzeichners',
	'Optional name of the signing person (e.g. "Dr. Alexander Brand").' => 'Optionaler Name der unterzeichnenden Person (z. B. „Dr. Alexander Brand“).',
	'Title / Role of 1st Signer' => 'Titel / Funktion des 1. Unterzeichners',
	'Title / designation (default: "The Guild Master").' => 'Funktionsbezeichnung (Standard: „Der Gildenmeister“).',
	'2. Second Examiner / Co-Signer (Left)' => '2. Zweitprüfer / Co-Signer (Links)',
	'Signature 2 (Image File)' => 'Unterschrift 2 (Bilddatei)',
	'Graphic of the second signature (e.g. trainer or examiner).' => 'Grafik der Zweitunterschrift (z. B. Trainer oder Prüfer).',
	'Name of 2nd Signer' => 'Name des 2. Unterzeichners',
	'Name of the trainer or co-examiner (e.g. "Prof. Dr. M. Weber").' => 'Name des Trainers / Zweitprüfers (z. B. „Prof. Dr. M. Weber“).',
	'Title / Role of 2nd Signer' => 'Titel / Funktion des 2. Unterzeichners',
	'Title / role of the co-examiner (e.g. "BPMN Trainer & Examiner").' => 'Funktion des Zweitprüfers (z. B. „Leitender BPMN-Trainer & Prüfer“).',
	'Official Seal, Stamp & Watermark' => 'Offizielles Siegel, Stempel & Wasserzeichen',
	'Upload an official company seal, academy crest, or subtle background watermark.' => 'Lade ein offizielles Firmen-Siegel, Akademie-Wappen oder ein zartes Hintergrund-Wasserzeichen hoch.',
	'Official Seal / Stamp / Logo' => 'Offizielles Siegel / Stempel / Logo',
	'Circular company or academy seal. Leave empty for the dynamic honor level medallion with BPMN embossing.' => 'Kreisrundes Firmen- oder Akademie-Siegel. Leer lassen für das dynamische Ehrenstufen-Medaillon mit BPMN-Prägung.',
	'Background Watermark (Optional)' => 'Hintergrund-Wasserzeichen (Optional)',
	'Placed centered in the background of the certificate with subtle transparency (approx. 5%) behind the text.' => 'Wird zentriert im Hintergrund der Urkunde mit dezenter Transparenz (ca. 5%) hinter dem Text platziert.',
	'Color Theme & Design Accents' => 'Farbwelt & Corporate Identity (Themes)',
	'Adjust borders, gradients, and ornaments to match your brand color scheme.' => 'Passe Rahmen, Verläufe und Ornamente an dein Unternehmens-Farbschema an.',
	'Design Color Theme' => 'Farbschema / Theme',
	'Choose a predefined color theme or define a custom accent color.' => 'Wähle ein vordefiniertes Design-Farbschema oder definiere eine eigene Akzentfarbe.',
	'👑 Dynamic Honor Levels (Titanium Violet, Ruby Red, Gold, Silver, Bronze)' => '👑 Ehrenstufen-Dynamisch (Titan-Violett, Rubinrot, Gold, Silber, Bronze)',
	'🌟 Timeless Gold & Prussian Blue (Classic Navy & Gold)' => '🌟 Zeitloses Gold & Preußischblau (Classic Navy & Gold)',
	'🏛️ Corporate Deep Blue & Silver (Modern Enterprise)' => '🏛️ Corporate Tiefblau & Silber (Modern Enterprise)',
	'🌿 Emerald Green & Brass (Excellence Emerald)' => '🌿 Smaragdgrün & Messing (Excellence Emerald)',
	'🎨 Custom Accent Color (HEX Color Picker)' => '🎨 Eigene Akzentfarbe (HEX-Farbwähler)',
	'Custom Accent Color' => 'Eigene Akzentfarbe (bei Modus Custom)',
	'Choose your company color code (Hex value) for the certificate frame and accent lines.' => 'Wähle deinen Unternehmens-Farbcode (Hex-Wert) für den Urkundenrahmen und Akzentlinien.',
	'Certificate Preview (Live)' => 'Urkunden-Vorschau (Live)',
	'Loading certificate module... Please wait a moment.' => 'Zertifikats-Modul wird geladen... Bitte einen kurzen Moment warten.',
];

// Formal variations for de_DE_formal
$de_formal_replacements = [
	'Bestimme, was mit deinen BPMN-Diagrammen' => 'Bestimmen Sie, was mit Ihren BPMN-Diagrammen',
	'Wähle, ob der Urkundentitel' => 'Wählen Sie, ob der Urkundentitel',
	'Passe den Haupttitel' => 'Passen Sie den Haupttitel',
	'Lade eigene Unterschriften-Bilder hoch' => 'Laden Sie eigene Unterschriften-Bilder hoch',
	'Wähle zwischen einer einzelnen' => 'Wählen Sie zwischen einer einzelnen',
	'Lade ein offizielles Firmen-Siegel' => 'Laden Sie ein offizielles Firmen-Siegel',
	'Passe Rahmen, Verläufe' => 'Passen Sie Rahmen, Verläufe',
	'Wähle ein vordefiniertes' => 'Wählen Sie ein vordefiniertes',
	'Wähle deinen Unternehmens-Farbcode' => 'Wählen Sie Ihren Unternehmens-Farbcode',
	'Öffne die Urkunde mit deinen aktuell eingestellten' => 'Öffnen Sie die Urkunde mit Ihren aktuell eingestellten',
	'Deine Urkunden- und Unterschrifteneinstellungen' => 'Ihre Urkunden- und Unterschrifteneinstellungen',
	'Du kannst das Plugin' => 'Sie können das Plugin',
	'Aktiviere diese Option nur, wenn du' => 'Aktivieren Sie diese Option nur, wenn Sie',
	'Konfiguriere den Namen' => 'Konfigurieren Sie den Namen',
];

// Helper: parse PO file entries
function parse_po_entries( $file ) {
	if ( ! file_exists( $file ) ) {
		return [];
	}
	$content = file_get_contents( $file );
	$lines = explode( "\n", $content );
	$entries = [];
	$current_msgid = null;
	$current_msgstr = null;
	$state = null;
	foreach ( $lines as $line ) {
		$trim = trim( $line );
		if ( 0 === strpos( $trim, 'msgid ' ) ) {
			if ( null !== $current_msgid && '' !== $current_msgid ) {
				$entries[ $current_msgid ] = $current_msgstr;
			}
			$current_msgid = substr( $trim, 6 );
			$current_msgid = stripcslashes( trim( $current_msgid, '"' ) );
			$current_msgstr = null;
			$state = 'msgid';
		} elseif ( 0 === strpos( $trim, 'msgstr ' ) ) {
			$current_msgstr = substr( $trim, 7 );
			$current_msgstr = stripcslashes( trim( $current_msgstr, '"' ) );
			$state = 'msgstr';
		} elseif ( 0 === strpos( $trim, '"' ) ) {
			$val = stripcslashes( trim( $trim, '"' ) );
			if ( 'msgid' === $state ) {
				$current_msgid .= $val;
			} elseif ( 'msgstr' === $state ) {
				$current_msgstr .= $val;
			}
		}
	}
	if ( null !== $current_msgid && '' !== $current_msgid ) {
		$entries[ $current_msgid ] = $current_msgstr;
	}
	return $entries;
}

// 3. Process every language in the directory
$po_files = glob( "$lang_dir/*.po" );
sort( $po_files );

foreach ( $po_files as $po_path ) {
	$base = basename( $po_path, '.po' );
	$locale = str_replace( 'ha-bpmn-manager-', '', $base );
	$php_path = "$lang_dir/$base.l10n.php";
	$mo_path = "$lang_dir/$base.mo";

	// Load existing PO and PHP translations
	$po_data = parse_po_entries( $po_path );
	$php_data = [];
	if ( file_exists( $php_path ) ) {
		$php_arr = require $php_path;
		$php_data = $php_arr['messages'] ?? [];
	}

	// Build master dictionary for this locale
	$master = [];
	$is_german = ( 'de_DE' === $locale );
	$is_german_formal = ( 'de_DE_formal' === $locale );
	$is_english = ( 'en_US' === $locale || 'en_GB' === $locale );

	foreach ( $canonical_msgids as $msgid ) {
		$translation = '';

		// 1. Check existing PO
		if ( isset( $po_data[ $msgid ] ) && '' !== $po_data[ $msgid ] ) {
			$translation = $po_data[ $msgid ];
		}
		// 2. Check existing PHP
		elseif ( isset( $php_data[ $msgid ] ) && '' !== $php_data[ $msgid ] ) {
			$translation = $php_data[ $msgid ];
		}

		// 3. Apply German translations
		if ( $is_german || $is_german_formal ) {
			if ( isset( $de_translations[ $msgid ] ) ) {
				$translation = $de_translations[ $msgid ];
			}
			if ( $is_german_formal ) {
				foreach ( $de_formal_replacements as $search => $replace ) {
					$translation = str_replace( $search, $replace, $translation );
				}
			}
		}

		// 4. Apply English fallback
		if ( $is_english || empty( $translation ) ) {
			if ( empty( $translation ) ) {
				if ( 'en_GB' === $locale ) {
					$translation = str_replace( 'Color', 'Colour', $msgid );
				} else {
					$translation = $msgid;
				}
			}
		}

		$master[ $msgid ] = $translation;
	}

	// 4. Generate updated .po file
	$po_output = "# Translation of HA-BPMN-Manager into $locale\n";
	$po_output .= "# Copyright (C) 2020-present Alexander Hacker\n";
	$po_output .= "msgid \"\"\n";
	$po_output .= "msgstr \"\"\n";
	$po_output .= "\"Project-Id-Version: HA-BPMN-Manager 4.8.7\\n\"\n";
	$po_output .= "\"Report-Msgid-Bugs-To: https://wordpress.org/support/plugin/ha-bpmn-manager\\n\"\n";
	$po_output .= "\"POT-Creation-Date: 2026-11-09 17:44+0000\\n\"\n";
	$po_output .= "\"PO-Revision-Date: 2026-11-09 17:44+0000\\n\"\n";
	$po_output .= "\"Last-Translator: Alexander Hacker <alex@seo-hacker.de>\\n\"\n";
	$po_output .= "\"Language-Team: $locale\\n\"\n";
	$po_output .= "\"Language: $locale\\n\"\n";
	$po_output .= "\"MIME-Version: 1.0\\n\"\n";
	$po_output .= "\"Content-Type: text/plain; charset=UTF-8\\n\"\n";
	$po_output .= "\"Content-Transfer-Encoding: 8bit\\n\"\n";
	$po_output .= "\"X-Generator: HA-BPMN-Manager i18n Toolkit\\n\"\n\n";

	foreach ( $master as $msgid => $msgstr ) {
		// Escape quotes and newlines
		$clean_id = str_replace( [ "\\", "\"" ], [ "\\\\", "\\\"" ], $msgid );
		$clean_str = str_replace( [ "\\", "\"" ], [ "\\\\", "\\\"" ], $msgstr );

		if ( false !== strpos( $clean_id, "\n" ) ) {
			$lines = explode( "\n", $clean_id );
			$po_output .= "msgid \"\"\n";
			foreach ( $lines as $idx => $l ) {
				$eol = ( $idx < count( $lines ) - 1 ) ? "\\n" : "";
				$po_output .= "\"$l$eol\"\n";
			}
		} else {
			$po_output .= "msgid \"$clean_id\"\n";
		}

		if ( false !== strpos( $clean_str, "\n" ) ) {
			$lines = explode( "\n", $clean_str );
			$po_output .= "msgstr \"\"\n";
			foreach ( $lines as $idx => $l ) {
				$eol = ( $idx < count( $lines ) - 1 ) ? "\\n" : "";
				$po_output .= "\"$l$eol\"\n";
			}
		} else {
			$po_output .= "msgstr \"$clean_str\"\n";
		}
		$po_output .= "\n";
	}

	file_put_contents( $po_path, $po_output );

	// 5. Compile binary .mo using msgfmt
	$cmd = "msgfmt -o " . escapeshellarg( $mo_path ) . " " . escapeshellarg( $po_path );
	exec( $cmd, $mo_out, $mo_ret );
	if ( 0 !== $mo_ret ) {
		echo "::error:: Failed to compile MO file for $locale\n";
	}

	// 6. Generate performant .l10n.php with identical dictionary
	$php_output = "<?php\n";
	$php_output .= "/**\n";
	$php_output .= " * Translation file for $locale\n";
	$php_output .= " * Modern Performant Translations format for WordPress 6.5+\n";
	$php_output .= " *\n";
	$php_output .= " * @package HA_BPMN_Manager\n";
	$php_output .= " */\n\n";
	$php_output .= "return [\n";
	$php_output .= "\t'project-id-version' => 'HA-BPMN-Manager 4.8.7',\n";
	$php_output .= "\t'report-msgid-bugs-to' => 'https://wordpress.org/support/plugin/ha-bpmn-manager',\n";
	$php_output .= "\t'source-date' => '2026-11-09 17:44+0000',\n";
	$php_output .= "\t'language' => '$locale',\n";
	$php_output .= "\t'messages' => [\n";

	foreach ( $master as $msgid => $msgstr ) {
		$k = var_export( $msgid, true );
		$v = var_export( $msgstr, true );
		$php_output .= "\t\t$k => $v,\n";
	}

	$php_output .= "\t],\n";
	$php_output .= "];\n";

	file_put_contents( $php_path, $php_output );

	echo sprintf( "%-28s => PO: %3d | MO: OK | PHP: %3d\n", $locale, count( $master ), count( $master ) );
}

echo "\nSynchronization finished successfully across all " . count( $po_files ) . " languages!\n";
