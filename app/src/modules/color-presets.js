/**
 * HA-BPMN-Manager: Business Color Presets
 *
 * Provides quick-access corporate color palettes for categorizing BPMN paths
 * (e.g. Happy Path, Exception / Error, Approval / Waiting, System / Info).
 *
 * @package HA_BPMN_Manager
 */

export function getColorPresets(i18n = {}) {
  const isDe = typeof document !== 'undefined' && (document.documentElement.lang || 'de').startsWith('de');
  return [
    {
      id: 'happy',
      label: i18n.colorStandard || (isDe ? 'Standard / Erfolg (Grün)' : 'Standard / Success (Green)'),
      fill: '#ecfdf5',
      stroke: '#059669'
    },
    {
      id: 'error',
      label: i18n.colorError || (isDe ? 'Fehler / Eskalation (Rot)' : 'Error / Escalation (Red)'),
      fill: '#fef2f2',
      stroke: '#dc2626'
    },
    {
      id: 'review',
      label: i18n.colorReview || (isDe ? 'Prüfung / Freigabe (Gelb)' : 'Review / Approval (Yellow)'),
      fill: '#fffbeb',
      stroke: '#d97706'
    },
    {
      id: 'system',
      label: i18n.colorSystem || (isDe ? 'System / Information (Blau)' : 'System / Information (Blue)'),
      fill: '#f0f9ff',
      stroke: '#0284c7'
    },
    {
      id: 'reset',
      label: i18n.colorReset || (isDe ? 'Farbe zurücksetzen' : 'Reset Color'),
      fill: undefined,
      stroke: undefined
    }
  ];
}

export const COLOR_PRESETS = getColorPresets();

/**
 * Applies a color preset to selected elements in bpmn-js modeler.
 *
 * @param {Object} modeler BpmnModeler instance.
 * @param {Object} preset Color preset object with fill and stroke.
 * @param {Object} i18n Optional dictionary of translated strings.
 */
export function applyColorPreset(modeler, preset, i18n = {}) {
  try {
    const isDe = (document.documentElement.lang || 'de').startsWith('de');
    const selection = modeler.get('selection').get();
    if (!selection || selection.length === 0) {
      const prompt = i18n.colorSelectPrompt || (isDe ? 'Bitte markieren Sie mindestens ein Element im Diagramm, um eine Farbe zuzuweisen.' : 'Please select at least one element in the diagram to assign a color.');
      alert(prompt);
      return;
    }

    const modeling = modeler.get('modeling');
    modeling.setColor(selection, {
      fill: preset.fill,
      stroke: preset.stroke
    });
  } catch (err) {
    console.warn('[HA-BPMN] Error applying color preset:', err);
  }
}
