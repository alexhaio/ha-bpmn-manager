=== HA-BPMN-Manager ===
Contributors: mystryx
Tags: bpmn, bpmn 2.0, workflow, diagram, process modeler, business process, gutenberg, camunda
Donate link: https://www.paypal.com/paypalme/edvhacker/6
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 8.2
Stable tag: 4.8.7
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Design, model, simulate, and publish interactive or zero-JS static BPMN 2.0 process workflows directly in WordPress.

== Description ==

**HA-BPMN-Manager** is an enterprise-grade Business Process Model and Notation (BPMN 2.0) suite designed natively for WordPress. Powered by the industry-standard `bpmn-js` engine by Camunda/bpmn.io, it provides a seamless visual modeling environment directly within wp-admin, alongside powerful interactive viewers and lightning-fast static vector displays for the frontend.

Whether you are managing ISO 9001 quality management (QM) procedures, operational standard operating procedures (SOPs), ITIL service tickets, employee onboarding, or compliance workflows, HA-BPMN-Manager delivers professional process management without requiring third-party SaaS subscriptions.

= Core Features =
  * Blank Start Template
* **Native Gutenberg Block (`ha-bpmn/viewer`):** Visual block selection with live inspector controls for height, mode (interactive vs. static), search, task drawer, and step tracking.
* **Zero-JS Static SVG Mode:** Renders diagrams as server-cached pure SVG vector graphics. No heavy client-side JavaScript bundle loaded – 0ms rendering overhead, 100% SEO-friendly.
* **Interactive Frontend Task Drawer:** Clicking any task or event opens an elegant slide-in drawer displaying assigned roles/lanes, technical IDs, and comprehensive QM instructions from `<bpmn:documentation>`.
* **Live Diagram Search & Highlighting:** Real-time search by task name, documentation, or technical ID with smooth viewport navigation and bright amber visual glow.
* **Process Step Tracker:** Visually highlight current execution stages in real time with animated pulse markers (`active`) and green completion checkmarks (`completed`).
* **Semantic Revision History & Diff:** Compare any two WordPress revisions side-by-side using `bpmn-js-differ` to inspect additions, modifications, and deletions. Revert to any prior version with one click.
* **Automated QM Process Handbook Export:** Generate a print-ready, high-resolution documentation handbook in a new browser tab, complete with process metadata, vector diagram, and tabular task breakdown.
* **Token Simulation:** Interactive step-by-step workflow simulation ("Token Game") with playback controls, speed toggles (1x, 2x), and live simulation log console.
* **Integrated BPMN Linter:** Real-time rule validation (`bpmnlint`) checks diagrams against official BPMN 2.0 modeling standards and flags errors and warnings.
* **Business Color Presets:** Standardized semantic color coding for Happy Paths (Green), Errors/Escalations (Red), Reviews (Yellow), and Systems (Blue).
* **Multi-Instance Support:** Render multiple independent BPMN diagrams on the same page without ID collisions or script interference.
* **Enterprise Security:** Built-in XML External Entity (XXE) protection on file imports, strict user capability checks, and WordPress nonce validation.
* **Subprocess Navigation:** Deep-dive navigation into embedded subprocesses with interactive breadcrumbs.
* **Full Translation Readiness:** Localized into the Top 25 WordPress languages with modern WordPress 6.5+ `.l10n.php` performant translations.

== Installation ==

1. Download `ha-bpmn-manager-v2.5.1.zip` from the release page.
2. In your WordPress Admin dashboard, go to **Plugins -> Add New -> Upload Plugin**.
3. Select the downloaded ZIP file and click **Install Now**.
4. Click **Activate Plugin**.
5. Navigate to the newly created **BPMN Diagrams** menu item in your WordPress admin sidebar to create your first diagram!

== Frequently Asked Questions ==

= Can I undo an Auto-Layout action? =
Yes! In version 2.5.1, Auto-Layout is fully integrated into the editor's undo stack. Clicking the "Rückgängig" (Undo) button in the toolbar or pressing `Ctrl+Z` (or `Cmd+Z`) immediately reverts the diagram to its exact layout prior to the Auto-Layout. You can also re-apply it using "Wiederholen" (Redo) or `Ctrl+Y`.

= How does the Zero-JS Static SVG Mode work? =
When saving a diagram in the WordPress backend, HA-BPMN-Manager automatically renders and caches the complete SVG vector markup in post metadata. When embedding via `[bpmnm id="123" mode="static"]` or setting the Gutenberg block to "Static SVG", WordPress delivers pure inline SVG markup directly from the server. The ~1.6MB JavaScript bundle is not enqueued at all, resulting in instant load times and perfect Google Lighthouse scores.

= How do I embed a diagram using Gutenberg? =
Simply insert the **BPMN Diagram** block (`ha-bpmn/viewer`). Use the Block Inspector in the right sidebar to select your desired diagram from the dropdown list, adjust container height, toggle interactive features (Search, Drawer, Fullscreen), or set active/completed tracking steps.

= What shortcodes are supported? =
You can use `[bpmnm id="123"]` (or the legacy alias `[bpmn id="123"]`).
Supported shortcode attributes:
* `id` (required): The numeric post ID of the diagram.
* `height`: CSS height value (default: `600px`, e.g. `height="750px"` or `height="70vh"`).
* `mode`: Display mode, either `interactive` (default) or `static`.
* `fullscreen`: `true` (default) or `false` to toggle the fullscreen control.
* `search`: `true` (default) or `false` to toggle live search.
* `drawer`: `true` (default) or `false` to toggle the interactive task details drawer.
* `active`: Comma-separated list of active step IDs or names (e.g. `active="Task_Review"`).
* `completed`: Comma-separated list of completed step IDs (e.g. `completed="StartEvent_1,Task_Submit"`).

= Can I embed multiple diagrams on a single page? =
Yes! HA-BPMN-Manager includes full multi-instance support. Each diagram instance receives an isolated canvas, independent viewport state, unique event bus, and scoped controls.

= How does the Process Step Tracker work? =
By passing `active="Task_ID"` and/or `completed="Task_ID1,Task_ID2"`, the diagram highlights running tasks with an eye-catching amber pulse animation and marks finished tasks with green outlines and checkmark badges. This is ideal for order tracking, ticket lifecycles, and onboarding progress bars!

= Is import protected against malicious XML files? =
Yes. All XML imports (both via file upload and canvas drag-and-drop) are validated through an XXE-hardened parser that forbids external entity expansion (`<!ENTITY`), external DTDs, and remote network access (`LIBXML_NONET`).

== Screenshots ==

1. **Integrated BPMN Modeler:** Clean, modern interface inside wp-admin with Auto-Layout, Templates, Linter, and Token Simulation.
2. **Process Starter Templates:** Modal selector for common business processes (Approval, Support Ticket, Onboarding).
3. **Interactive Frontend Viewer:** Task Details Drawer sliding in with role assignments and detailed QM instructions.
4. **Live Diagram Search:** Real-time search highlighting with smooth viewport navigation.
5. **Semantic Revision Diff:** Visual and tabular comparison of diagram changes between revisions.
6. **Token Simulation:** Step-by-step execution simulation with speed selection and logging.

== Changelog ==

= 4.8.7 =
* **Full Translation Parity:** Audited and synchronized all 35 language packs. Modern WordPress 6.5+ performant translations (.l10n.php) and traditional gettext files (.po and .mo) are now 100% identical with 332 complete message keys each.
* **English Source String Normalization:** Standardized all source gettext strings in backend templates, certificate settings, and deactivation modals to canonical English for seamless internationalization.
* **Complete German & Multilingual Coverage:** Added missing German translations for all recent features including settings tabs, certificate customization, tutorial/templates/handbook module switches, and update check controls.

= 4.8.6 =
* **Update Checker & UI Link Fix:** Restored the "Nach Updates suchen" (Check for updates) button and link across wp-admin/plugins.php and plugin settings.
* **Dual-Path Registration:** Ensured Plugin Update Checker seamlessly detects both root entry point and legacy plugin subfolder installations.
* **Direct Settings Action Link:** Added a direct "Einstellungen" action link below the plugin title on the WordPress Plugins management page.
* **Reliable Asset Downloads:** Enforced octet-stream headers and external redirect auth-stripping for zero-friction GitHub release downloads.

= 4.8.5 =
* **QM Handbook Fix:** Resolved ReferenceError in qm-handbook.js caused by missing i18n parameter declaration, allowing the print and PDF process documentation handbook to open cleanly in all browser environments.
* **Process Templates & QM Handbook Setting Switches:** Added independent switches in plugin settings ("Modeler & Studio Tools") to enable or disable the Process Templates library and QM Process Handbook buttons in the modeler toolbar.
* **Robust UI Synchronization:** Gracefully hides toolbar buttons in both server-side PHP templates and client-side JavaScript fallback when modules are deactivated.

= 4.8.4 =
* **Tutorial & BPMN-Quest Setting Switch:** Added a dedicated admin setting switch in "Modeler & Studio Tools" to enable or disable the interactive tutorial button, gamified companion HUD, and linter challenges.
* **Module & Build Optimizations:** Resolved import references and rebuilt optimized production assets.

= 4.8.3 =
* **Major Milestone Release:**
  * **Interactive BPMN Quest & Gamification:** Comprehensive learning journey with 6 interactive chapters, 8 linter challenges, live XP tracking, and honors system.
  * **Vector Certificate & Seal:** Automated certificate generator with high-resolution vector medallion seal (`<textPath>`), ribbon tails, and custom certification options.
  * **Console Error Fixes:** Resolved initial load ReferenceError on XML promise chain, removed non-standard `<svg>` height attribute, and suppressed upstream ContextPad deprecation warnings.
  * **Multi-Language Synchronization:** Complete i18n support across 31 languages for diagrams and 35 languages for WordPress admin.
  * **Diagram Layout Optimization:** Streamlined spacing, zero collisions, and clean orthogonal routing across all swimlanes.

= 2.5.1 =
* **Major Version Alignment:** Consolidated versioning across all components with single-source version variable `HA_BPMN_VERSION`.
* **Centralized Asset Cache-Busting:** All enqueued CSS and JS assets are unified via `Assets::get_asset_version()`, supporting automatic cache busting on upgrades and `SCRIPT_DEBUG` filemtime during development.
* **Undo/Redo for Auto-Layout:** Auto-Layout operations and template loading are now completely undoable via toolbar buttons, `Ctrl+Z` / `Cmd+Z`, and bpmn-js editor actions.
* **Linter Positioning:** Linter status button statically elevated to `bottom: 72px` with issue panel at `bottom: 110px`, permanently eliminating overlaps with bottom simulation controls.
* **Sidebar Publish Action Alignment:** Fixed WordPress core class mismatch (`.preview-action`), aligning "Entwurf speichern" and "Vorschau anzeigen" pixel-perfect side by side with identical height and responsive flex layout.
* **Interactive BPMN 2.0 Educational Tutorial Template:** Added a flagship, rich reference process template with horizontal swimlanes, XOR/AND gateways, diverse task types, timer events, and 9 didactic sticky notes to quickly train beginners and teams.
* **Code Standards & PCP Compliance:** Added missing text domains, English base translation strings, translator context comments, and comprehensive docblocks across all PHP classes.

= 2.5.0 =
* **Enterprise Roadmap Release:**
  * Added 1-Click Auto-Layout (`bpmn-auto-layout`).
  * Added Process Starter Templates modal.
  * Added Interactive Task Details Drawer for frontend visitors.
  * Added Live Search with amber highlighting and match navigation.
  * Added Step Tracker with pulse animations and checkmark badges.
  * Added Native Gutenberg Block (`ha-bpmn/viewer`).
  * Added Semantic Revisions Comparison (`bpmn-js-differ`).
  * Added Automated QM Process Handbook generator.
  * Added Zero-JS Static SVG caching mode.
  * Added Business Color Presets for process paths.

= 0.9.0 =
* Resolved HTTP 500 error in REST API endpoint `/ha-bpmn/v1/diagram/{id}` caused by unclosed docblock.
* Relocated Minimap to top-right to prevent overlap with bpmn.io attribution logo.
* Added universal search highlighting styles for admin and frontend.
* Docked Token Simulation speed controls adjacent to the playback bar.

= 0.8.0 =
* Complete architectural overhaul: Separation of runtime plugin and build tools.
* Multi-instance support: Render multiple diagrams on a single page without collisions.
* Fixed critical async save race condition on diagram form submission.
* Added missing AJAX BPMN export handler with descriptive filenames.
* Added XXE security protection on BPMN file imports.
* Switched REST API to dedicated `ha-bpmn/v1` namespace.
* Added canvas drag-and-drop file import and dirty-state unload warning.
* Enhanced mobile touch navigation gestures (pinch-to-zoom, pan).

= 0.5.0 =
* Initial release with bpmn-js integration.

== Upgrade Notice ==

= 2.5.1 =
Version 2.5.1 delivers centralized asset versioning, Auto-Layout undo capability, perfect sidebar button alignment, and full WordPress coding standards compliance. Recommended for all installations.

== License ==

This plugin is free software, released under the terms of the GNU General Public License v3 or later (GPL-3.0-or-later).

**Third-Party Components & Attribution:**
* `bpmn-js`, `diagram-js`, `bpmn-auto-layout`, `bpmn-js-differ`, and `bpmn-js-token-simulation` are created by Camunda Services GmbH and contributors under the bpmn.io license (modified MIT License with mandatory attribution watermark). The "Powered by bpmn.io" link is displayed in compliance with license terms.
