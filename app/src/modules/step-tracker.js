/**
 * HA-BPMN-Manager: Process Step Tracker & Status Highlighting
 *
 * Applies visual indicators (pulsing active state, completed checkmark state)
 * to diagram elements specified via shortcode parameters or data attributes.
 *
 * @package HA_BPMN_Manager
 */

import { escapeHtml } from './escape-html.js';

/**
 * Initializes the Step Tracker on a bpmn-js instance.
 *
 * @param {HTMLElement} wrap Container element (.ha-bpmn-viewer-wrap or .ha-bpmn-editor-wrap).
 * @param {Object} bpmnInstance Modeler or NavigatedViewer instance.
 * @param {Object} i18n Optional dictionary of translated strings.
 */
export function initStepTracker(wrap, bpmnInstance, i18n = {}) {
  const activeAttr = wrap.getAttribute('data-active-steps') || '';
  const completedAttr = wrap.getAttribute('data-completed-steps') || '';

  if (!activeAttr && !completedAttr) {
    return;
  }

  const isDe = typeof document !== 'undefined' && (document.documentElement.lang || 'de').startsWith('de');
  const completedLabel = escapeHtml(i18n.stepCompleted || (isDe ? 'Abgeschlossen' : 'Completed'));
  const activeLabel = escapeHtml(i18n.stepActive || (isDe ? 'In Bearbeitung' : 'In Progress'));

  const activeList = activeAttr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const completedList = completedAttr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const applyStatusMarkers = () => {
    try {
      const elementRegistry = bpmnInstance.get('elementRegistry');
      const canvas = bpmnInstance.get('canvas');
      const overlays = bpmnInstance.get('overlays', false);

      elementRegistry.forEach(el => {
        if (!el.businessObject || el.type === 'bpmn:Process' || el.type === 'bpmn:SequenceFlow') {
          return;
        }

        const id = (el.id || '').toLowerCase();
        const name = (el.businessObject.name || '').toLowerCase();

        // Check Completed State
        const isCompleted = completedList.some(item => item === id || (name && name === item));
        if (isCompleted) {
          canvas.addMarker(el.id, 'ha-step-completed');
          if (overlays) {
            overlays.add(el.id, 'ha-status-badge', {
              position: { top: -8, right: -8 },
              html: `<div class="ha-status-badge-completed" title="${completedLabel}">&check;</div>`
            });
          }
        }

        // Check Active State
        const isActive = activeList.some(item => item === id || (name && name === item));
        if (isActive) {
          canvas.addMarker(el.id, 'ha-step-active');
          if (overlays) {
            overlays.add(el.id, 'ha-status-badge', {
              position: { top: -8, right: -8 },
              html: `<div class="ha-status-badge-active" title="${activeLabel}"><span class="ha-pulse-dot"></span></div>`
            });
          }
        }
      });
    } catch (e) {
      console.warn('[HA-BPMN] Step Tracker could not apply status markers:', e);
    }
  };

  // Run on initial load and after import
  applyStatusMarkers();
}
