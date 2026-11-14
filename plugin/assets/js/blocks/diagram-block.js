/**
 * HA-BPMN-Manager: Native Gutenberg Block
 *
 * Implements the 'ha-bpmn/viewer' block for WordPress Block Editor.
 *
 * @package HA_BPMN_Manager
 */

(function(wp) {
  const { registerBlockType } = wp.blocks;
  const { createElement: el, useState, useEffect } = wp.element;
  const { InspectorControls } = wp.blockEditor || wp.editor;
  const { PanelBody, SelectControl, TextControl, ToggleControl, Spinner } = wp.components;
  const apiFetch = wp.apiFetch;

  const data = window.haBpmnBlockData || { i18n: {} };
  const i18n = data.i18n;

  registerBlockType('ha-bpmn/viewer', {
    title: i18n.title || 'BPMN Diagram',
    description: i18n.description || 'Embed BPMN 2.0 business process',
    icon: 'randomize',
    category: 'widgets',
    keywords: ['bpmn', 'process', 'workflow', 'camunda', 'diagram'],

    edit: function(props) {
      const { attributes, setAttributes } = props;
      const { diagramId, height, fullscreen, mode, search, drawer, activeSteps, completedSteps } = attributes;

      const [diagrams, setDiagrams] = useState([]);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        apiFetch({ path: '/ha-bpmn/v1/diagrams' })
          .then(list => {
            setDiagrams(list || []);
            setLoading(false);
          })
          .catch(err => {
            console.warn('[HA-BPMN Block] Could not fetch diagrams list:', err);
            setLoading(false);
          });
      }, []);

      const options = [
        { label: i18n.choosePrompt || '-- Select diagram --', value: 0 }
      ];

      diagrams.forEach(d => {
        options.push({
          label: d.title + (d.status !== 'publish' ? ` (${d.status})` : ''),
          value: d.id
        });
      });

      const selectedDiagram = diagrams.find(d => Number(d.id) === Number(diagramId));

      return [
        el(InspectorControls, { key: 'inspector' },
          el(PanelBody, { title: i18n.displayOptions || 'Display Options', initialOpen: true },
            el(SelectControl, {
              label: i18n.selectDiagram || 'BPMN Diagram',
              value: diagramId,
              options: options,
              onChange: (val) => setAttributes({ diagramId: parseInt(val, 10) || 0 })
            }),
            el(SelectControl, {
              label: i18n.mode || 'Display Mode',
              value: mode,
              options: [
                { label: i18n.modeInteractive || 'Interactive (bpmn-js with Zoom & Simulation)', value: 'interactive' },
                { label: i18n.modeStatic || 'Static (Ultra-fast SVG, Zero-JS)', value: 'static' }
              ],
              onChange: (val) => setAttributes({ mode: val })
            }),
            el(TextControl, {
              label: i18n.height || 'Container Height',
              value: height,
              onChange: (val) => setAttributes({ height: val })
            }),
            el(ToggleControl, {
              label: i18n.fullscreen || 'Show Fullscreen Button',
              checked: fullscreen,
              onChange: (val) => setAttributes({ fullscreen: val })
            }),
            el(ToggleControl, {
              label: i18n.search || 'Enable Live Search in Viewer',
              checked: search,
              onChange: (val) => setAttributes({ search: val })
            }),
            el(ToggleControl, {
              label: i18n.drawer || 'Clickable Tasks (Details Drawer)',
              checked: drawer,
              onChange: (val) => setAttributes({ drawer: val })
            })
          ),
          el(PanelBody, { title: i18n.trackingHeader || 'Process Step Tracker', initialOpen: false },
            el(TextControl, {
              label: i18n.activeSteps || 'Active Steps (IDs or Names)',
              help: i18n.activeStepsHelp || 'e.g. Task_Review,Task_Approval',
              value: activeSteps,
              onChange: (val) => setAttributes({ activeSteps: val })
            }),
            el(TextControl, {
              label: i18n.completedSteps || 'Completed Steps (IDs or Names)',
              help: i18n.completedHelp || 'e.g. StartEvent_1,Task_CreateRequest',
              value: completedSteps,
              onChange: (val) => setAttributes({ completedSteps: val })
            })
          )
        ),

        el('div', { key: 'preview', className: 'ha-bpmn-gutenberg-preview-wrap' },
          loading ? el('div', { className: 'ha-bpmn-preview-loading' }, el(Spinner), ' ' + (i18n.loadingDiagrams || 'Loading BPMN diagrams...')) :
          (!diagramId || !selectedDiagram) ?
            el('div', { className: 'ha-bpmn-preview-placeholder' },
              el('div', { className: 'placeholder-icon' }, '🔀'),
              el('h3', null, i18n.title || 'BPMN 2.0 Diagram'),
              el('p', null, i18n.description || 'Select a diagram from the sidebar or dropdown menu:'),
              el(SelectControl, {
                value: diagramId,
                options: options,
                onChange: (val) => setAttributes({ diagramId: parseInt(val, 10) || 0 })
              })
            ) :
            el('div', { className: 'ha-bpmn-preview-card' },
              el('div', { className: 'ha-preview-header' },
                el('span', { className: 'ha-preview-badge' }, mode === 'static' ? (i18n.badgeStatic || 'Static (SVG)') : (i18n.badgeInteractive || 'Interactive')),
                el('span', { className: 'ha-preview-dim' }, `${i18n.heightPrefix || 'Height'}: ${height}`)
              ),
              el('h4', { className: 'ha-preview-title' }, selectedDiagram.title),
              el('p', { className: 'ha-preview-info' }, `${i18n.diagramIdPrefix || 'Diagram ID'}: #${diagramId} | ${i18n.shortcodeLabel || 'Shortcode'}: [bpmnm id="${diagramId}"]`),
              activeSteps ? el('div', { className: 'ha-preview-tracking' }, `${i18n.activePrefix || 'Active'}: ${activeSteps}`) : null,
              el('div', { className: 'ha-preview-note' }, i18n.previewNote || 'The interactive diagram view is rendered on the frontend.')
            )
        )
      ];
    },

    save: function() {
      // Dynamic block rendered via server-side render_callback
      return null;
    }
  });
})(window.wp);
