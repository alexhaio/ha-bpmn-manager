/**
 * HA-BPMN-Manager: Main JavaScript Application Bundle
 *
 * Implements bpmn-js Modeler & NavigatedViewer integration for WordPress.
 * Supports multi-instance diagram rendering, token simulation, linter,
 * touch gestures, drag-and-drop file imports, and safe asynchronous form submissions.
 *
 * @package HA_BPMN_Manager
 * @author  Alexander Hacker
 */

import BpmnModeler from 'bpmn-js/lib/Modeler';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

// Optional Feature Modules
import TokenSimulationModelerModule from 'bpmn-js-token-simulation';
import TokenSimulationViewerModule from 'bpmn-js-token-simulation/lib/viewer';
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css';
import MinimapModule from 'diagram-js-minimap';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';
import KeyboardMoveModule from 'diagram-js/lib/navigation/keyboard-move';
import AutoScrollModule from 'diagram-js/lib/features/auto-scroll';
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
import GridSnappingModule from 'diagram-js/lib/features/grid-snapping';
import ColorPickerModule from 'bpmn-js-color-picker';

// Linter Module
import lintModule from 'bpmn-js-bpmnlint';
import 'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css';
import bpmnlintConfig from './bpmnlint-packed-config.js';

// Properties Panel Modules & Stylesheets
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import '@bpmn-io/properties-panel/assets/properties-panel.css';

// Core BPMN Styles
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';

// Extended Modules
import { layoutProcess } from 'bpmn-auto-layout';
import { showTemplateModal, isQuestDiagram, showQuestConfirmModal, getQuestXml } from './modules/templates.js';
import { initTaskDrawer } from './modules/task-drawer.js';
import { initDiagramSearch } from './modules/diagram-search.js';
import { initStepTracker } from './modules/step-tracker.js';
import { openQmHandbook } from './modules/qm-handbook.js';
import { COLOR_PRESETS, applyColorPreset } from './modules/color-presets.js';
import { openRevisionsModal } from './modules/revisions.js';
import { initQuestHUD } from './modules/quest/quest-hud.js';
import { showCertificateModal } from './modules/quest/certificate.js';
import './modules/quest/quest-hud.css';

// Expose certificate preview globally for admin settings page
if (typeof window !== 'undefined') {
  window.haBpmnShowCertificate = showCertificateModal;
}

// Multilingual Translations Dictionaries for bpmn-js UI
import translationsDE from 'bpmn-js-i18n/translations/de.js';
import translationsES from 'bpmn-js-i18n/translations/es.js';
import translationsFR from 'bpmn-js-i18n/translations/fr.js';
import translationsIT from 'bpmn-js-i18n/translations/it.js';
import translationsPT from 'bpmn-js-i18n/translations/pt.js';
import translationsPL from 'bpmn-js-i18n/translations/pl.js';
import translationsRU from 'bpmn-js-i18n/translations/ru.js';
import translationsJA from 'bpmn-js-i18n/translations/ja.js';
import translationsZH from 'bpmn-js-i18n/translations/zn.js';
const translationsAR = {};
import translationsEN from 'bpmn-js-i18n/translations/en.js';

const TRANSLATION_DICTS = {
  de: translationsDE,
  es: translationsES,
  fr: translationsFR,
  it: translationsIT,
  pt: translationsPT,
  pl: translationsPL,
  ru: translationsRU,
  ja: translationsJA,
  zh: translationsZH,
  zh_tw: translationsZH,
  ar: translationsAR,
  en: translationsEN || {}
};

let activeModelerLang = 'de';

export function setActiveModelerLang(lang) {
  activeModelerLang = lang || 'de';
}

/**
 * Custom translation provider function for bpmn-js.
 * Dynamically resolves to the currently active user/site language.
 *
 * @param {string} template Translation key.
 * @param {Object} replacements Replacement key-value pairs.
 * @return {string} Translated string.
 */
function customTranslate(template, replacements = {}) {
  const langKey = activeModelerLang ? activeModelerLang.toLowerCase().split('_')[0] : 'de';
  const dict = TRANSLATION_DICTS[activeModelerLang] || TRANSLATION_DICTS[langKey] || TRANSLATION_DICTS.de || {};
  const translated = dict[template] || template;
  return translated.replace(/\{([^}]+)\}/g, function(_, key) {
    return replacements[key] || '{' + key + '}';
  });
}

/**
 * Default fallback BPMN 2.0 XML string for new diagrams.
 */
const DEFAULT_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

/**
 * Sanitizes a title for use as a downloaded filename.
 *
 * @param {string} title Diagram title.
 * @param {string} extension File extension without dot.
 * @return {string} Safe filename.
 */
function sanitizeFilename(title, extension) {
  const safeTitle = (title || 'diagram')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${safeTitle || 'diagram'}.${extension}`;
}

/**
 * Triggers a file download in the browser.
 *
 * @param {string|Blob} content File content.
 * @param {string} filename Desired filename.
 * @param {string} contentType MIME type.
 */
function downloadFile(content, filename, contentType) {
  let url;
  let shouldRevoke = false;
  if (typeof content === 'string' && content.startsWith('data:')) {
    url = content;
  } else {
    const blob = content instanceof Blob ? content : new Blob([content], { type: contentType });
    url = URL.createObjectURL(blob);
    shouldRevoke = true;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  if (shouldRevoke) {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Extracts SVG string directly from the DOM canvas element.
 *
 * @param {HTMLElement} canvasEl The canvas container element.
 * @returns {string|null} SVG XML string.
 */
function getSvgFromCanvasEl(canvasEl) {
  if (!canvasEl) return null;
  const svgElement = canvasEl.querySelector('svg');
  if (!svgElement) return null;
  const clone = svgElement.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  const serializer = new XMLSerializer();
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
}

/**
 * Extracts SVG content directly from the DOM canvas element and triggers download.
 * Used as a fallback when NavigatedViewer does not support saveSVG().
 *
 * @param {HTMLElement} canvasEl The canvas container element.
 * @param {string} diagramTitle Diagram title for filename.
 */
function extractSvgFromDom(canvasEl, diagramTitle) {
  const svgString = getSvgFromCanvasEl(canvasEl);
  if (svgString) {
    downloadFile(svgString, sanitizeFilename(diagramTitle, 'svg'), 'image/svg+xml');
  } else {
    console.warn('No SVG element found in canvas for export.');
  }
}

/**
 * Obtains the diagram SVG string from viewer or DOM fallback.
 *
 * @param {Object} viewer Modeler or NavigatedViewer instance.
 * @param {HTMLElement} canvasEl The canvas container element.
 * @returns {Promise<string|null>}
 */
function getDiagramSvg(viewer, canvasEl) {
  if (viewer && typeof viewer.saveSVG === 'function') {
    return viewer.saveSVG().then(({ svg }) => svg).catch(() => getSvgFromCanvasEl(canvasEl));
  }
  return Promise.resolve(getSvgFromCanvasEl(canvasEl));
}

/**
 * Exports an SVG string as a crisp PNG image.
 *
 * @param {string} svgString Full SVG XML markup.
 * @param {string} filename Desired download filename.
 * @param {Object} options Configuration (scale, backgroundColor).
 * @returns {Promise<Blob|string>}
 */
function exportSvgToPng(svgString, filename, options = {}) {
  return new Promise((resolve, reject) => {
    if (!svgString) {
      return reject(new Error('No SVG content provided for PNG export'));
    }

    const scale = options.scale || 2; // Default 2x for sharp retina rendering
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');

    if (!svgEl) {
      return reject(new Error('Failed to parse SVG markup'));
    }

    let width = parseFloat(svgEl.getAttribute('width'));
    let height = parseFloat(svgEl.getAttribute('height'));
    const viewBox = svgEl.getAttribute('viewBox');

    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(parseFloat);
      if (parts.length === 4) {
        if (!width || isNaN(width)) width = parts[2];
        if (!height || isNaN(height)) height = parts[3];
      }
    }

    if (!width || isNaN(width)) width = 1200;
    if (!height || isNaN(height)) height = 800;

    svgEl.setAttribute('width', width);
    svgEl.setAttribute('height', height);

    if (!svgEl.getAttribute('xmlns')) {
      svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (!svgEl.getAttribute('xmlns:xlink')) {
      svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    const cleanSvg = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error('Canvas 2D context not available'));
        }

        ctx.fillStyle = options.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        if (canvas.toBlob) {
          canvas.toBlob((blob) => {
            if (blob) {
              downloadFile(blob, filename, 'image/png');
              resolve(blob);
            } else {
              const dataUrl = canvas.toDataURL('image/png');
              downloadFile(dataUrl, filename, 'image/png');
              resolve(dataUrl);
            }
          }, 'image/png');
        } else {
          const dataUrl = canvas.toDataURL('image/png');
          downloadFile(dataUrl, filename, 'image/png');
          resolve(dataUrl);
        }
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load diagram SVG image for PNG rendering'));
    };

    img.src = url;
  });
}

/**
 * Initializes the full BPMN Modeler in WordPress Admin.
 *
 * @param {HTMLElement} wrap Container element (.ha-bpmn-editor-wrap).
 * @param {Object} settings Global settings from bpmnSettings.
 */
function initAdminModeler(wrap, settings) {
  if (wrap.dataset.initialized === 'true') {
    return;
  }
  wrap.dataset.initialized = 'true';

  const diagramId = wrap.getAttribute('data-diagram-id');
  const endpoint = wrap.getAttribute('data-endpoint');
  const diagramTitle = wrap.getAttribute('data-title') || 'diagram';
  const canvasEl = wrap.querySelector('.ha-bpmn-canvas');
  const propContainerEl = wrap.querySelector('.properties-container');
  const dropOverlayEl = wrap.querySelector('.ha-bpmn-drop-overlay');
  const modulesConfig = settings.modules || {};
  const i18n = settings.i18n || {};

  let isDirty = false;
  let isSaving = false;

  // Assemble dynamic modules
  const dynamicModules = [
    ZoomScrollModule,
    KeyboardMoveModule,
    ColorPickerModule,
    GridSnappingModule,
    MoveCanvasModule,
    AutoScrollModule
  ];

  if (modulesConfig.simulation) {
    dynamicModules.push(TokenSimulationModelerModule);
  }
  if (modulesConfig.minimap) {
    dynamicModules.push(MinimapModule);
  }
  if (modulesConfig.linter) {
    dynamicModules.push(lintModule);
  }
  if (modulesConfig.properties && propContainerEl) {
    dynamicModules.push(BpmnPropertiesPanelModule);
    dynamicModules.push(BpmnPropertiesProviderModule);
  }
  const effectiveLang = localStorage.getItem('ha_bpmn_user_lang') || settings.language || 'de';
  if (effectiveLang === 'de') {
    dynamicModules.push({
      translate: ['value', customTranslate]
    });
  }

  // Instantiate Modeler
  const modeler = new BpmnModeler({
    container: canvasEl,
    propertiesPanel: modulesConfig.properties && propContainerEl ? {
      parent: propContainerEl
    } : undefined,
    linting: {
      bpmnlint: bpmnlintConfig,
      active: false
    },
    additionalModules: dynamicModules
  });

  // Suppress third-party ContextPad#getPad deprecation warning logged as Error by diagram-js (cf. bpmn-js-color-picker #75)
  try {
    const contextPad = modeler.get('contextPad', false);
    if (contextPad) {
      const proto = Object.getPrototypeOf(contextPad);
      if (proto && typeof proto.getPad === 'function' && !proto._getPadPatched) {
        const origGetPad = proto.getPad;
        proto.getPad = function(target) {
          const origWarn = console.warn;
          console.warn = function(...args) {
            const first = args[0];
            const msg = (first && (first.message || (typeof first === 'string' ? first : ''))) || '';
            if (msg.includes('ContextPad#getPad is deprecated')) {
              return;
            }
            origWarn.apply(console, args);
          };
          try {
            return origGetPad.call(this, target);
          } finally {
            console.warn = origWarn;
          }
        };
        proto._getPadPatched = true;
      }
    }
  } catch (e) {
    // Non-fatal
  }

  // Prevent linter button, canvas controls, and overlays from submitting the WordPress #post form
  const sanitizeButtons = () => {
    wrap.querySelectorAll('button:not([type]), button[type="submit"]').forEach(btn => {
      btn.setAttribute('type', 'button');
      btn.type = 'button';
    });
  };

  const buttonObserver = new MutationObserver(sanitizeButtons);
  buttonObserver.observe(wrap, { childList: true, subtree: true });
  sanitizeButtons();

  // 1. Capture-phase click interceptor: Ensure any button inside editor cannot submit WordPress #post form
  wrap.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) {
      if (button.type !== 'button') {
        button.type = 'button';
        button.setAttribute('type', 'button');
      }
      // Defense-in-depth: No button inside the BPMN editor wrap is a WordPress post submit button.
      // If a button inside wrap was clicked with default submit behavior, prevent default immediately!
      if (button.getAttribute('type') !== 'button' || button.type === 'submit') {
        e.preventDefault();
      }
    }

    // 2. Prevent anchor tags without valid external link from navigating or reloading the page
    const anchor = e.target.closest('a');
    if (anchor && anchor.getAttribute('target') !== '_blank') {
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) {
        e.preventDefault();
      }
    }
  }, true);

  // 3. Prevent Enter key in any input field (Properties Panel, Search, Modals) from submitting WordPress #post form
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const tag = (e.target?.tagName || '').toLowerCase();
      // Allow Enter in textareas and contenteditable elements (multiline notes, direct editing)
      if (tag === 'textarea' || e.target?.isContentEditable) {
        return;
      }
      // In single-line inputs (e.g. Properties Panel text fields, search, name/id fields), block form submission!
      if (tag === 'input') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.target.blur === 'function') {
          e.target.blur();
        }
      }
    }
  }, true);

  // Diagnostic logging on linter events for easy debugging in console
  modeler.on('linting.toggle', (event) => {
    console.log('[HA-BPMN] Linter toggled:', event.active ? 'active' : 'inactive');
  });

  modeler.on('linting.completed', (event) => {
    const issueCount = Object.values(event.issues || {}).reduce((acc, list) => acc + (list?.length || 0), 0);
    console.log('[HA-BPMN] Linter scan completed. Total issues:', issueCount);
  });

  // Find XML form storage field
  const xmlInput = wrap.querySelector('[name="bpmn_xml"]') || document.getElementById('bpmn_xml');

  const syncXmlToForm = () => {
    if (!xmlInput) return;
    modeler.saveXML({ format: true }).then(({ xml }) => {
      if (xml && xml.indexOf('definitions') !== -1) {
        xmlInput.value = xml;
      }
    }).catch(err => {
      console.warn('Failed to auto-sync BPMN XML to form:', err);
    });
  };

  // Toolbar Elements
  const undoBtn = wrap.querySelector('.ha-btn-undo');
  const redoBtn = wrap.querySelector('.ha-btn-redo');
  const zoomInBtn = wrap.querySelector('.ha-btn-zoom-in');
  const zoomResetBtn = wrap.querySelector('.ha-btn-zoom-reset');
  const zoomOutBtn = wrap.querySelector('.ha-btn-zoom-out');
  const templatesBtn = wrap.querySelector('.ha-btn-templates');
  const questBtn = wrap.querySelector('.ha-btn-quest');
  const langSelect = wrap.querySelector('.ha-select-user-lang');
  const importBtn = wrap.querySelector('.ha-btn-import');
  const importFileInput = wrap.querySelector('.ha-bpmn-import-file-input');
  const canvasParentEl = wrap.querySelector('.ha-bpmn-canvas-parent');
  const autolayoutBtn = wrap.querySelector('.ha-btn-autolayout');
  const revisionsBtn = wrap.querySelector('.ha-btn-revisions');
  const qmHandbookBtn = wrap.querySelector('.ha-btn-qm-handbook');
  const fullscreenBtn = wrap.querySelector('.ha-btn-fullscreen');
  const downloadSvgBtn = wrap.querySelector('.ha-btn-download-svg');
  const downloadPngBtn = wrap.querySelector('.ha-btn-download-png');
  const downloadBpmnBtn = wrap.querySelector('.ha-btn-download-bpmn');
  const togglePropBtn = wrap.querySelector('.ha-btn-toggle-properties');
  const propWrapEl = wrap.querySelector('.ha-bpmn-properties-panel-wrap');

  // Active language resolution (User override > Backend default > Site language > WP locale)
  const getActiveLanguage = () => {
    const stored = localStorage.getItem('ha_bpmn_user_lang');
    let lang = 'de';
    if (stored) {
      lang = stored;
    } else if (settings.defaultLanguage && settings.defaultLanguage !== 'auto') {
      lang = settings.defaultLanguage;
    } else if (settings.siteLanguage && settings.siteLanguage !== 'auto') {
      lang = settings.siteLanguage;
    } else {
      lang = settings.language || 'de';
    }
    setActiveModelerLang(lang);
    return lang;
  };
  setActiveModelerLang(getActiveLanguage());

  // Major operation history (e.g. Auto-Layout, Template imports)
  const majorHistory = {
    past: [],
    future: []
  };

  const updateUndoRedoState = () => {
    try {
      const commandStack = modeler.get('commandStack', false);
      const csCanUndo = commandStack ? commandStack.canUndo() : false;
      const csCanRedo = commandStack ? commandStack.canRedo() : false;

      const canUndo = csCanUndo || majorHistory.past.length > 0;
      const canRedo = csCanRedo || majorHistory.future.length > 0;

      if (undoBtn) {
        undoBtn.disabled = !canUndo;
        undoBtn.classList.toggle('disabled', !canUndo);
      }
      if (redoBtn) {
        redoBtn.disabled = !canRedo;
        redoBtn.classList.toggle('disabled', !canRedo);
      }
    } catch (e) {
      // Modeler commandStack might not be ready yet
    }
  };

  const triggerUndo = async () => {
    try {
      const commandStack = modeler.get('commandStack', false);
      if (commandStack && commandStack.canUndo()) {
        commandStack.undo();
        updateUndoRedoState();
        return;
      }

      if (majorHistory.past.length > 0) {
        const { xml: currentXml } = await modeler.saveXML({ format: true });
        const previousXml = majorHistory.past.pop();
        majorHistory.future.push(currentXml);

        await modeler.importXML(previousXml);
        modeler.get('canvas').zoom('fit-viewport', 'auto');
        isDirty = true;
        syncXmlToForm();
        updateUndoRedoState();
      }
    } catch (err) {
      console.warn('[HA-BPMN] Undo error:', err);
    }
  };

  const triggerRedo = async () => {
    try {
      const commandStack = modeler.get('commandStack', false);
      if (commandStack && commandStack.canRedo()) {
        commandStack.redo();
        updateUndoRedoState();
        return;
      }

      if (majorHistory.future.length > 0) {
        const { xml: currentXml } = await modeler.saveXML({ format: true });
        const nextXml = majorHistory.future.pop();
        majorHistory.past.push(currentXml);

        await modeler.importXML(nextXml);
        modeler.get('canvas').zoom('fit-viewport', 'auto');
        isDirty = true;
        syncXmlToForm();
        updateUndoRedoState();
      }
    } catch (err) {
      console.warn('[HA-BPMN] Redo error:', err);
    }
  };

  // Initial disabled state for Undo/Redo
  if (undoBtn) {
    undoBtn.disabled = true;
    undoBtn.classList.add('disabled');
  }
  if (redoBtn) {
    redoBtn.disabled = true;
    redoBtn.classList.add('disabled');
  }

  // Track changes for dirty-state unload protection, Undo/Redo, and auto-sync
  let syncTimer = null;
  modeler.on('commandStack.changed', () => {
    isDirty = true;
    updateUndoRedoState();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncXmlToForm, 400);
  });

  const beforeUnloadHandler = (e) => {
    if (isDirty && !isSaving) {
      e.preventDefault();
      e.returnValue = settings.i18n?.unsavedWarning || 'Unsaved changes';
      return e.returnValue;
    }
  };

  window.addEventListener('beforeunload', beforeUnloadHandler);

  const disableUnloadProtection = () => {
    isSaving = true;
    isDirty = false;
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    window.onbeforeunload = null;
    if (window.jQuery) {
      window.jQuery(window).off('beforeunload.edit-post');
      window.jQuery(window).off('beforeunload');
    }
    if (window.wp && window.wp.autosave) {
      try {
        if (window.wp.autosave.local) {
          window.wp.autosave.local.hasChanges = false;
        }
      } catch (e) {}
    }
  };

  // Immediate disarm on clicking any WordPress save/publish button
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#save-post, #publish, #post-preview, input[name="save"], input[name="publish"], .ha-btn-save');
    if (btn) {
      disableUnloadProtection();
    }
  }, true);

  // Keyboard shortcut Ctrl+S / Cmd+S for quick save without prompt
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      const saveBtn = document.getElementById('save-post') || document.getElementById('publish');
      if (saveBtn) {
        e.preventDefault();
        disableUnloadProtection();
        saveBtn.click();
      }
    }
  });

  // Load Diagram from REST API
  let loadedXml = DEFAULT_BPMN_XML;
  fetch(endpoint, {
    headers: settings.rest_nonce ? { 'X-WP-Nonce': settings.rest_nonce } : {}
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      return res.json();
    })
    .then(data => {
      loadedXml = data?.raw_content?.xml || DEFAULT_BPMN_XML;
      if (xmlInput && !xmlInput.value) {
        xmlInput.value = loadedXml;
      }
      return modeler.importXML(loadedXml);
    })
    .then(() => {
      const canvas = modeler.get('canvas');
      canvas.zoom('fit-viewport', 'auto');
      isDirty = false; // Reset dirty state on fresh load
      syncXmlToForm(); // Ensure hidden form field has complete XML immediately
      updateUndoRedoState();

      const minimap = modeler.get('minimap', false);
      if (minimap && modulesConfig.minimap) {
        setTimeout(() => minimap.open(), 150);
      }

      if (modulesConfig.quest !== false && isQuestDiagram(loadedXml)) {
        setTimeout(() => {
          const userLang = getActiveLanguage();
          initQuestHUD(wrap, modeler, { lang: userLang });
        }, 300);
      }
    })
    .catch(err => {
      console.error('Failed to load BPMN diagram:', err);
      // Fallback: Preserve existing DOM XML if available rather than wiping out work
      const fallbackXml = (xmlInput && xmlInput.value && xmlInput.value.indexOf('definitions') !== -1)
        ? xmlInput.value
        : DEFAULT_BPMN_XML;
      modeler.importXML(fallbackXml).then(() => {
        modeler.get('canvas').zoom('fit-viewport', 'auto');
        updateUndoRedoState();
        if (modulesConfig.quest !== false && isQuestDiagram(fallbackXml)) {
          setTimeout(() => {
            const userLang = getActiveLanguage();
            initQuestHUD(wrap, modeler, { lang: userLang });
          }, 300);
        }
      });
    });

  // Undo / Redo Event Listeners
  if (undoBtn) {
    undoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerUndo();
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerRedo();
    });
  }

  // Hook into bpmn-js editorActions if available
  try {
    const editorActions = modeler.get('editorActions', false);
    if (editorActions) {
      if (editorActions.isRegistered('undo')) editorActions.unregister('undo');
      editorActions.register('undo', triggerUndo);

      if (editorActions.isRegistered('redo')) editorActions.unregister('redo');
      editorActions.register('redo', triggerRedo);
    }
  } catch (e) {}

  // Global keyboard shortcuts (Ctrl+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z)
  window.addEventListener('keydown', (e) => {
    const targetTag = (e.target?.tagName || '').toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) {
      return;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (!isCtrlOrCmd) return;

    if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      triggerUndo();
    } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
      e.preventDefault();
      triggerRedo();
    }
  });

  // Zoom Event Listeners
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const canvas = modeler.get('canvas');
      canvas.zoom(canvas.zoom() * 1.25);
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modeler.get('canvas').zoom('fit-viewport', 'auto');
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const canvas = modeler.get('canvas');
      canvas.zoom(canvas.zoom() * 0.75);
    });
  }

  // Zen Mode / Fullscreen Event Listener
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isZen = wrap.classList.toggle('fullscreen-zen');
      document.body.classList.toggle('ha-bpmn-zen-mode', isZen);
      setTimeout(() => {
        modeler.get('canvas').resized();
      }, 100);
    });

    // Escape key exits Zen mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && wrap.classList.contains('fullscreen-zen')) {
        wrap.classList.remove('fullscreen-zen');
        document.body.classList.remove('ha-bpmn-zen-mode');
        setTimeout(() => {
          modeler.get('canvas').resized();
        }, 100);
      }
    });
  }

  // Download SVG
  if (downloadSvgBtn) {
    downloadSvgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modeler.saveSVG().then(({ svg }) => {
        downloadFile(svg, sanitizeFilename(diagramTitle, 'svg'), 'image/svg+xml');
      }).catch(err => {
        console.error('Failed to export SVG:', err);
      });
    });
  }

  // Download PNG
  if (downloadPngBtn) {
    downloadPngBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getDiagramSvg(modeler, canvasEl).then((svg) => {
        if (!svg) {
          console.error('Failed to get SVG for PNG export');
          return;
        }
        return exportSvgToPng(svg, sanitizeFilename(diagramTitle, 'png'));
      }).catch(err => {
        console.error('Failed to export PNG:', err);
      });
    });
  }

  // Download BPMN XML
  if (downloadBpmnBtn) {
    downloadBpmnBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modeler.saveXML({ format: true }).then(({ xml }) => {
        downloadFile(xml, sanitizeFilename(diagramTitle, 'bpmn'), 'application/xml');
      }).catch(err => {
        console.error('Failed to export BPMN:', err);
      });
    });
  }

  // Toggle Properties Panel
  if (togglePropBtn && propWrapEl) {
    togglePropBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isCollapsed = propWrapEl.classList.toggle('collapsed');
      togglePropBtn.classList.toggle('active', !isCollapsed);
      setTimeout(() => {
        modeler.get('canvas').resized();
      }, 200);
    });
  }

  // Templates Modal
  if (templatesBtn && modulesConfig.templates !== false) {
    templatesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showTemplateModal(async (tplXml, tplTitle) => {
        const confirmMsg = i18n.unsavedConfirm || 'Ungespeicherte Änderungen gehen verloren. Möchten Sie die Vorlage wirklich laden?';
        if (isDirty && !confirm(confirmMsg)) {
          return;
        }
        try {
          const { xml: currentXml } = await modeler.saveXML({ format: true });
          majorHistory.past.push(currentXml);
          majorHistory.future = [];

          await modeler.importXML(tplXml);
          modeler.get('canvas').zoom('fit-viewport', 'auto');
          isDirty = true;
          syncXmlToForm();
          updateUndoRedoState();

          if ((tplTitle && (tplTitle.includes('Quest') || tplTitle.includes('Abenteuer'))) || (tplXml && tplXml.includes('Process_BpmnQuest'))) {
            setTimeout(() => {
              const hud = initQuestHUD(wrap, modeler, { lang: getActiveLanguage() });
              if (hud && hud.isMinimized) {
                hud.isMinimized = false;
                hud.render();
                hud.bindEvents();
              }
            }, 300);
          }
        } catch (err) {
          console.error('Failed to load template:', err);
        }
      }, i18n);
    });
  }

  // Unified BPMN Import Handler (Button & Drag-and-Drop)
  const importBpmnXml = async (xmlString, fileName = '') => {
    if (!xmlString || typeof xmlString !== 'string') {
      alert(i18n.importError || 'Failed to import BPMN diagram.');
      return;
    }

    if (!xmlString.includes('<bpmn:') && !xmlString.includes('<definitions') && !xmlString.includes('<bpmn2:')) {
      alert(i18n.invalidXml || 'The selected file is not a valid BPMN 2.0 XML document.');
      return;
    }

    const confirmMsg = i18n.unsavedConfirm || 'Ungespeicherte Änderungen gehen verloren. Möchten Sie fortfahren?';
    if (isDirty && !confirm(confirmMsg)) {
      return;
    }

    try {
      const { xml: currentXml } = await modeler.saveXML({ format: true });
      majorHistory.past.push(currentXml);
      majorHistory.future = [];

      await modeler.importXML(xmlString);
      modeler.get('canvas').zoom('fit-viewport', 'auto');
      isDirty = true;
      syncXmlToForm();
      updateUndoRedoState();

      // Auto-update post title if empty or default auto draft
      if (fileName) {
        const baseName = fileName.replace(/\.(bpmn|xml)$/i, '');
        const titleInput = document.getElementById('title');
        if (titleInput && (!titleInput.value || titleInput.value.trim() === '' || titleInput.value.trim().toLowerCase() === 'auto draft')) {
          titleInput.value = baseName;
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    } catch (err) {
      console.error('[HA-BPMN] Import failed:', err);
      alert((i18n.importError || 'Failed to import BPMN diagram: ') + (err.message || err));
    }
  };

  const handleSelectedFile = (file) => {
    if (!file) return;
    const name = file.name || '';
    if (!/\.(bpmn|xml)$/i.test(name)) {
      alert(i18n.invalidFileType || 'Invalid file format. Please upload a .bpmn or .xml file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      importBpmnXml(content, name);
    };
    reader.onerror = () => {
      alert(i18n.fileReadError || 'Error reading the file.');
    };
    reader.readAsText(file);
  };

  // Import Button & Hidden File Input
  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', (e) => {
      e.preventDefault();
      importFileInput.value = '';
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleSelectedFile(files[0]);
      }
    });
  }

  // Drag and Drop onto Canvas Parent
  if (canvasParentEl) {
    let dragCounter = 0;

    canvasParentEl.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      canvasParentEl.classList.add('drag-active');
    });

    canvasParentEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      canvasParentEl.classList.add('drag-active');
    });

    canvasParentEl.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        canvasParentEl.classList.remove('drag-active');
      }
    });

    canvasParentEl.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      canvasParentEl.classList.remove('drag-active');

      const files = e.dataTransfer ? e.dataTransfer.files : null;
      if (files && files.length > 0) {
        handleSelectedFile(files[0]);
      }
    });
  }

  // Auto-Layout
  if (autolayoutBtn) {
    autolayoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      autolayoutBtn.classList.add('loading');
      try {
        const { xml } = await modeler.saveXML({ format: true });
        const layoutedXml = await layoutProcess(xml);
        if (layoutedXml && layoutedXml !== xml) {
          majorHistory.past.push(xml);
          majorHistory.future = [];

          await modeler.importXML(layoutedXml);
          modeler.get('canvas').zoom('fit-viewport', 'auto');
          isDirty = true;
          syncXmlToForm();
          updateUndoRedoState();
        }
      } catch (err) {
        console.error('[HA-BPMN] Auto-Layout error:', err);
        alert((i18n.autoLayoutError || 'Error during automatic layout calculation: ') + (err.message || err));
      } finally {
        autolayoutBtn.classList.remove('loading');
      }
    });
  }

  // Revisions & Semantic Diff
  if (revisionsBtn) {
    revisionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openRevisionsModal(modeler, diagramId, settings.rest_base, settings.rest_nonce, i18n);
    });
  }

  // QM Process Handbook
  if (qmHandbookBtn && modulesConfig.handbook !== false) {
    qmHandbookBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openQmHandbook(modeler, diagramTitle, i18n);
    });
  }

  // Interactive Quest HUD & Learning Companion
  if (questBtn && modulesConfig.quest !== false) {
    questBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      let currentXml = '';
      try {
        const result = await modeler.saveXML({ format: false });
        currentXml = result.xml || '';
      } catch (err) {
        currentXml = (xmlInput && xmlInput.value) || '';
      }

      const existingHud = wrap.__questHUDInstance;

      if (isQuestDiagram(currentXml)) {
        // Diagram is already the Quest adventure.
        // If HUD is closed, not in DOM, or minimized: restore/open it without touching progress
        if (!existingHud || !document.body.contains(existingHud.hudElement) || existingHud.isMinimized) {
          const userLang = getActiveLanguage();
          const hud = initQuestHUD(wrap, modeler, { lang: userLang });
          hud.isMinimized = false;
          hud.render();
          hud.bindEvents();
          hud.focusCurrentChapter();
          hud.showToast(hud.t('questOpened'), 3000);
          return;
        }

        // If HUD is already open and visible, focus current chapter and notify user (never reset progress!)
        existingHud.focusCurrentChapter();
        existingHud.showToast(existingHud.t('questAlreadyOpen'), 4000);
      } else {
        // Different diagram loaded - confirm with user before loading Quest scenario
        const userLang = getActiveLanguage();
        showQuestConfirmModal(async (questXml, selectedLang) => {
          try {
            const { xml: prevXml } = await modeler.saveXML({ format: true });
            majorHistory.past.push(prevXml);
            majorHistory.future = [];

            await modeler.importXML(questXml);
            modeler.get('canvas').zoom('fit-viewport', 'auto');
            isDirty = true;
            syncXmlToForm();
            updateUndoRedoState();
            const hud = initQuestHUD(wrap, modeler, { lang: selectedLang || userLang });
            hud.isMinimized = false;
            hud.render();
            hud.bindEvents();
            hud.focusCurrentChapter();
          } catch (err) {
            console.error('[HA-BPMN] Failed to load Quest diagram:', err);
          }
        }, { lang: userLang });
      }
    });
  }

  // Language Selector (Manual User Language Selection)
  if (langSelect) {
    const savedUserLang = localStorage.getItem('ha_bpmn_user_lang');
    const backendDefault = (settings.defaultLanguage && settings.defaultLanguage !== 'auto')
      ? settings.defaultLanguage
      : (settings.siteLanguage && settings.siteLanguage !== 'auto' ? settings.siteLanguage : '');
    langSelect.value = savedUserLang || backendDefault || '';

    langSelect.addEventListener('change', async (e) => {
      const selected = e.target.value;
      if (selected) {
        localStorage.setItem('ha_bpmn_user_lang', selected);
      } else {
        localStorage.removeItem('ha_bpmn_user_lang');
      }
      const newLang = getActiveLanguage();
      setActiveModelerLang(newLang);
      if (modulesConfig.quest !== false) {
        const hud = wrap.__questHUDInstance;
        if (hud && typeof hud.setLanguage === 'function') {
          hud.setLanguage(newLang);
        }

        // If the active diagram is the Quest adventure, live-translate the diagram XML
        try {
          const { xml: currentXml } = await modeler.saveXML({ format: false });
          if (isQuestDiagram(currentXml)) {
            const localizedQuestXml = getQuestXml(newLang);
            if (localizedQuestXml) {
              await modeler.importXML(localizedQuestXml);
              modeler.get('canvas').zoom('fit-viewport', 'auto');
              syncXmlToForm();
              if (hud && typeof hud.goToChapter === 'function') {
                hud.goToChapter(hud.currentChapterIndex);
              }
            }
          }
        } catch (err) {
          console.warn('[HA-BPMN] Dynamic quest diagram translation warning:', err);
        }
      }
    });
  }

  // Live Diagram Search in Modeler
  initDiagramSearch(wrap, modeler, i18n);

  // Critical Fix: Intercept Form Submission to avoid Async Save Race Conditions
  const postForm = document.getElementById('post');
  if (postForm) {
    postForm.addEventListener('submit', function(e) {
      if (postForm.dataset.haBpmnSaving === 'true') {
        return; // Allow form submit to proceed on programmatic trigger
      }

      // Check whether this submit was initiated by an intentional WordPress save/publish action
      const submitter = e.submitter;
      const isExplicitSubmitter = submitter && (
        submitter.id === 'publish' ||
        submitter.id === 'save-post' ||
        submitter.name === 'publish' ||
        submitter.name === 'save' ||
        submitter.classList.contains('ha-btn-save')
      );
      const isIntentionalSave = isSaving || isExplicitSubmitter;

      // If the submit was NOT triggered intentionally by WordPress save/publish buttons or Ctrl+S,
      // block it immediately! This prevents accidental Enter in inputs or canvas controls from submitting
      // the post and redirecting the user back to the edit.php post overview!
      if (!isIntentionalSave) {
        console.warn('[HA-BPMN] Blocked accidental form submission inside editor canvas/controls.');
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      disableUnloadProtection();

      // Stop default synchronous submission to ensure XML/SVG are saved first
      e.preventDefault();
      e.stopImmediatePropagation();

      postForm.dataset.haBpmnSaving = 'true';

      // Preserve clicked button (e.g. 'publish' or 'save') for WordPress post status transitions
      postForm.querySelectorAll('.ha-bpmn-temp-submitter').forEach(el => el.remove());
      if (submitter && submitter.name && !postForm.querySelector('input[type="hidden"][name="' + submitter.name + '"]')) {
        const hiddenBtn = document.createElement('input');
        hiddenBtn.type = 'hidden';
        hiddenBtn.name = submitter.name;
        hiddenBtn.value = submitter.value || '1';
        hiddenBtn.className = 'ha-bpmn-temp-submitter';
        postForm.appendChild(hiddenBtn);
      }

      const xmlTarget = wrap.querySelector('[name="bpmn_xml"]') || document.getElementById('bpmn_xml');
      const svgTarget = wrap.querySelector('[name="bpmn_svg_cache"]') || document.getElementById('bpmn_svg_cache');

      Promise.all([
        modeler.saveXML({ format: true }),
        modeler.saveSVG().catch(() => ({ svg: '' }))
      ])
        .then(([{ xml }, { svg }]) => {
          if (xmlTarget && xml) {
            xmlTarget.value = xml;
          }
          if (svgTarget && svg) {
            svgTarget.value = svg;
          }
          disableUnloadProtection();
          // Use prototype submit to avoid conflicts with inputs named 'submit'
          HTMLFormElement.prototype.submit.call(postForm);
        })
        .catch(err => {
          console.error('Error exporting XML/SVG on save:', err);
          disableUnloadProtection();
          HTMLFormElement.prototype.submit.call(postForm);
        });
    }, true);
  }

  // If properties module is disabled, hide toggle button and wrapper
  if (!modulesConfig.properties) {
    if (togglePropBtn) togglePropBtn.style.display = 'none';
    if (propWrapEl) propWrapEl.style.display = 'none';
  }

  // If quest / tutorial module is disabled, ensure button is hidden
  if (modulesConfig.quest === false && questBtn) {
    questBtn.style.display = 'none';
  }

  // If templates module is disabled, ensure button is hidden
  if (modulesConfig.templates === false && templatesBtn) {
    templatesBtn.style.display = 'none';
  }

  // If QM handbook module is disabled, ensure button is hidden
  if (modulesConfig.handbook === false && qmHandbookBtn) {
    qmHandbookBtn.style.display = 'none';
  }
}

/**
 * Initializes a read-only or interactive BPMN viewer in Frontend.
 *
 * @param {HTMLElement} wrap Container element (.ha-bpmn-viewer-wrap).
 * @param {Object} settings Global settings from bpmnSettings.
 */
function initFrontendViewer(wrap, settings) {
  if (wrap.dataset.initialized === 'true') {
    return;
  }
  wrap.dataset.initialized = 'true';

  const diagramId = wrap.getAttribute('data-diagram-id');
  const endpoint = wrap.getAttribute('data-endpoint');
  const diagramTitle = wrap.getAttribute('data-title') || 'diagram';
  const canvasEl = wrap.querySelector('.ha-bpmn-canvas');
  const modulesConfig = settings.modules || {};
  const i18n = settings.i18n || {};

  const dynamicModules = [
    ZoomScrollModule,
    KeyboardMoveModule,
    MoveCanvasModule
  ];

  if (modulesConfig.simulation) {
    dynamicModules.push(TokenSimulationViewerModule);
  }
  if (modulesConfig.minimap) {
    dynamicModules.push(MinimapModule);
  }
  if (modulesConfig.linter) {
    dynamicModules.push(lintModule);
  }
  if (settings.language === 'de') {
    dynamicModules.push({
      translate: ['value', customTranslate]
    });
  }

  // Use NavigatedViewer for pure frontend viewing (fast, lightweight, interactive)
  const viewer = new NavigatedViewer({
    container: canvasEl,
    linting: {
      bpmnlint: bpmnlintConfig,
      active: false
    },
    additionalModules: dynamicModules
  });

  // Ensure all buttons inside viewer are strictly type="button"
  const sanitizeViewerButtons = () => {
    wrap.querySelectorAll('button:not([type]), button[type="submit"]').forEach(btn => {
      btn.setAttribute('type', 'button');
      btn.type = 'button';
    });
  };

  const viewerButtonObserver = new MutationObserver(sanitizeViewerButtons);
  viewerButtonObserver.observe(wrap, { childList: true, subtree: true });
  sanitizeViewerButtons();

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && btn.type !== 'button') {
      btn.setAttribute('type', 'button');
      btn.type = 'button';
    }

    const anchor = e.target.closest('a');
    if (anchor && anchor.getAttribute('target') !== '_blank') {
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) {
        e.preventDefault();
      }
    }
  }, false);

  viewer.on('linting.toggle', (event) => {
    console.log('[HA-BPMN] Viewer Linter toggled:', event.active ? 'active' : 'inactive');
  });

  // Load Diagram from REST API (include nonce for draft/private diagram access)
  const fetchHeaders = settings.rest_nonce ? { 'X-WP-Nonce': settings.rest_nonce } : {};
  fetch(endpoint, { headers: fetchHeaders })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      return res.json();
    })
    .then(data => {
      const xml = data?.raw_content?.xml || DEFAULT_BPMN_XML;
      return viewer.importXML(xml);
    })
    .then(() => {
      const canvas = viewer.get('canvas');
      canvas.zoom('fit-viewport', 'auto');

      const minimap = viewer.get('minimap', false);
      if (minimap && modulesConfig.minimap) {
        setTimeout(() => minimap.open(), 150);
      }

      // Initialize Task Drawer, Live Search, and Step Tracker
      if (wrap.getAttribute('data-drawer') !== '0') {
        initTaskDrawer(wrap, viewer, i18n);
      }
      initDiagramSearch(wrap, viewer, i18n);
      initStepTracker(wrap, viewer);
    })
    .catch(err => {
      console.error('Failed to load diagram in frontend viewer:', err);
    });

  // Frontend Controls
  const zoomInBtn = wrap.querySelector('.ha-btn-zoom-in');
  const zoomResetBtn = wrap.querySelector('.ha-btn-zoom-reset');
  const zoomOutBtn = wrap.querySelector('.ha-btn-zoom-out');
  const downloadSvgBtn = wrap.querySelector('.ha-btn-download-svg');
  const downloadPngBtn = wrap.querySelector('.ha-btn-download-png');
  const downloadBpmnBtn = wrap.querySelector('.ha-btn-download-bpmn');
  const fullscreenBtn = wrap.querySelector('.ha-btn-fullscreen');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const canvas = viewer.get('canvas');
      canvas.zoom(canvas.zoom() * 1.25);
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      viewer.get('canvas').zoom('fit-viewport', 'auto');
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const canvas = viewer.get('canvas');
      canvas.zoom(canvas.zoom() * 0.75);
    });
  }

  if (downloadSvgBtn) {
    downloadSvgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // NavigatedViewer may not have saveSVG(); use DOM serialization fallback
      if (typeof viewer.saveSVG === 'function') {
        viewer.saveSVG().then(({ svg }) => {
          downloadFile(svg, sanitizeFilename(diagramTitle, 'svg'), 'image/svg+xml');
        }).catch(() => {
          extractSvgFromDom(canvasEl, diagramTitle);
        });
      } else {
        extractSvgFromDom(canvasEl, diagramTitle);
      }
    });
  }

  if (downloadPngBtn) {
    downloadPngBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getDiagramSvg(viewer, canvasEl).then((svg) => {
        if (!svg) {
          console.error('Failed to get SVG for PNG export');
          return;
        }
        return exportSvgToPng(svg, sanitizeFilename(diagramTitle, 'png'));
      }).catch(err => {
        console.error('Failed to export PNG:', err);
      });
    });
  }

  if (downloadBpmnBtn) {
    downloadBpmnBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof viewer.saveXML === 'function') {
        viewer.saveXML({ format: true }).then(({ xml }) => {
          downloadFile(xml, sanitizeFilename(diagramTitle, 'bpmn'), 'application/xml');
        }).catch(err => {
          console.error('Failed to export BPMN XML:', err);
        });
      }
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.preventDefault();
      wrap.classList.toggle('fullscreen');
      document.body.style.overflow = wrap.classList.contains('fullscreen') ? 'hidden' : '';
      setTimeout(() => {
        viewer.get('canvas').zoom('fit-viewport', 'auto');
      }, 150);
    });
  }
}

/**
 * Bootstrap all diagram containers on page ready.
 */
document.addEventListener('DOMContentLoaded', () => {
  const settings = typeof bpmnSettings !== 'undefined' ? bpmnSettings : {};

  // Relocate Author metabox into the sidebar (#side-sortables) in admin if not already there
  function relocateAuthorMetabox() {
    const author = document.getElementById('authordiv');
    const side = document.getElementById('side-sortables');
    if (author && side && !side.contains(author)) {
      side.appendChild(author);
    }
  }
  relocateAuthorMetabox();
  setTimeout(relocateAuthorMetabox, 150);
  setTimeout(relocateAuthorMetabox, 600);

  // 1. Initialize Admin Modeler (if present)
  document.querySelectorAll('.ha-bpmn-editor-wrap').forEach(wrap => {
    initAdminModeler(wrap, settings);
  });

  // 2. Initialize Frontend Viewers (multi-instance support)
  document.querySelectorAll('.ha-bpmn-viewer-wrap').forEach(wrap => {
    initFrontendViewer(wrap, settings);
  });
});