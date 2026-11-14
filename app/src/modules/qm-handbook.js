/**
 * HA-BPMN-Manager: QM Process Handbook Generator
 *
 * Extracts process metadata, diagrams, and step-by-step documentation
 * into a structured, print-ready Quality Management (QM) handbook.
 *
 * @package HA_BPMN_Manager
 */

import { escapeHtml } from './escape-html.js';

function getElementTypeNames(i18n = {}, isDe = true) {
  return {
    'bpmn:StartEvent': i18n.startEvent || (isDe ? 'Start-Ereignis' : 'Start Event'),
    'bpmn:EndEvent': i18n.endEvent || (isDe ? 'End-Ereignis' : 'End Event'),
    'bpmn:IntermediateCatchEvent': i18n.intermediateEvent || (isDe ? 'Zwischenereignis' : 'Intermediate Event'),
    'bpmn:IntermediateThrowEvent': i18n.intermediateEvent || (isDe ? 'Zwischenereignis' : 'Intermediate Event'),
    'bpmn:Task': i18n.task || (isDe ? 'Aufgabe' : 'Task'),
    'bpmn:UserTask': i18n.userTask || (isDe ? 'Benutzeraufgabe' : 'User Task'),
    'bpmn:ServiceTask': i18n.serviceTask || (isDe ? 'Service-Aufgabe (System)' : 'Service Task'),
    'bpmn:SendTask': i18n.sendTask || (isDe ? 'Nachricht senden' : 'Send Task'),
    'bpmn:ReceiveTask': i18n.receiveTask || (isDe ? 'Nachricht empfangen' : 'Receive Task'),
    'bpmn:ManualTask': i18n.manualTask || (isDe ? 'Manuelle Tätigkeit' : 'Manual Task'),
    'bpmn:BusinessRuleTask': i18n.businessRuleTask || (isDe ? 'Geschäftsregel' : 'Business Rule Task'),
    'bpmn:ScriptTask': i18n.scriptTask || (isDe ? 'Skriptaufgabe' : 'Script Task'),
    'bpmn:SubProcess': i18n.subProcess || (isDe ? 'Teilprozess' : 'Sub-Process'),
    'bpmn:CallActivity': i18n.callActivity || (isDe ? 'Aufruf-Aktivität' : 'Call Activity'),
    'bpmn:ExclusiveGateway': i18n.exclusiveGateway || (isDe ? 'Exklusive Verzweigung (XOR)' : 'Exclusive Gateway (XOR)'),
    'bpmn:ParallelGateway': i18n.parallelGateway || (isDe ? 'Parallele Verzweigung (AND)' : 'Parallel Gateway (AND)'),
    'bpmn:InclusiveGateway': i18n.inclusiveGateway || (isDe ? 'Inklusive Verzweigung (OR)' : 'Inclusive Gateway (OR)')
  };
}

/**
 * Generates and opens a print-ready QM handbook for the given modeler instance.
 *
 * @param {Object} bpmnInstance Modeler or NavigatedViewer instance.
 * @param {string} title Diagram title.
 * @param {Object} [i18n={}] Localized string overrides from bpmnSettings.
 */
export async function openQmHandbook(bpmnInstance, title = 'Prozessdokumentation', i18n = {}) {
  const i18nObj = (i18n && typeof i18n === 'object') ? i18n : {};
  const isDe = (typeof document !== 'undefined' && document.documentElement && (document.documentElement.lang || 'de').startsWith('de'));
  const typeNames = getElementTypeNames(i18nObj, isDe);

  let svgContent = '';
  try {
    if (bpmnInstance && typeof bpmnInstance.saveSVG === 'function') {
      const res = await bpmnInstance.saveSVG();
      svgContent = res.svg;
    }
  } catch (e) {
    console.warn('[HA-BPMN] Handbook SVG export fallback:', e);
  }

  // Extract steps from element registry
  const elementRegistry = (bpmnInstance && typeof bpmnInstance.get === 'function') ? bpmnInstance.get('elementRegistry') : null;
  const steps = [];

  if (elementRegistry && typeof elementRegistry.forEach === 'function') {
    elementRegistry.forEach(el => {
      if (!el.businessObject || el.type === 'bpmn:Process' || el.type === 'bpmn:SequenceFlow') {
        return;
      }

      const bo = el.businessObject;
      const typeLabel = typeNames[el.type] || el.type.replace('bpmn:', '');
      const name = bo.name || i18nObj.unnamedStep || (isDe ? '(Ohne Bezeichnung)' : '(Unnamed)');
      
      // Documentation
      let doc = '';
      if (Array.isArray(bo.documentation) && bo.documentation.length > 0) {
        doc = bo.documentation[0]?.text || '';
      }

      // Determine parent lane
      let laneName = '-';
      let curr = el.parent;
      while (curr) {
        if (curr.businessObject && curr.businessObject.$type === 'bpmn:Lane') {
          laneName = curr.businessObject.name || '-';
          break;
        }
        if (curr.businessObject && curr.businessObject.$type === 'bpmn:Participant') {
          laneName = curr.businessObject.name || '-';
        }
        curr = curr.parent;
      }

      // Following elements
      const outgoing = (bo.outgoing || []).map(flow => {
        const target = flow.targetRef;
        const condition = flow.name ? ` [${flow.name}]` : '';
        return (target && target.name) ? `${target.name}${condition}` : (target ? target.id : '');
      }).filter(Boolean);

      steps.push({
        id: el.id,
        name,
        type: typeLabel,
        lane: laneName,
        doc,
        outgoing: outgoing.join(', ') || '-'
      });
    });
  }

  const currentDate = new Date().toLocaleDateString(isDe ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const noDocText = i18nObj.noDoc || (isDe ? 'Keine gesonderte Handlungsanweisung' : 'No special operating procedure');

  const rowsHtml = steps.map((s, idx) => `
    <tr>
      <td class="col-num">${idx + 1}</td>
      <td class="col-step"><strong>${escapeHtml(s.name)}</strong><br><small class="mono">${escapeHtml(s.id)}</small></td>
      <td class="col-type"><span class="badge">${escapeHtml(s.type)}</span></td>
      <td class="col-role">${escapeHtml(s.lane)}</td>
      <td class="col-doc">${s.doc ? escapeHtml(s.doc.replace(/\\r\\n|\\n/g, '\n')).replace(/\n/g, '<br>') : `<em>${escapeHtml(noDocText)}</em>`}</td>
      <td class="col-next">${escapeHtml(s.outgoing)}</td>
    </tr>
  `).join('');

  if (typeof window === 'undefined' || typeof window.open !== 'function') {
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    if (typeof alert === 'function') {
      alert(i18nObj.allowPopups || (isDe ? 'Bitte erlauben Sie Popups, um das QM-Handbuch zu öffnen.' : 'Please allow popups to open the QM Handbook.'));
    }
    return;
  }

  const handbookTitle = i18nObj.qmHandbookTitle || (isDe ? 'Qualitätsmanagement-Handbuch' : 'Quality Management Handbook');
  const handbookSubtitle = i18nObj.qmHandbookSubtitle || (isDe ? 'Standard-Prozessdokumentation nach BPMN 2.0 Spezifikation' : 'Standard process documentation compliant with BPMN 2.0 specification');
  const printPdfLabel = i18nObj.printPdf || (isDe ? '🖨️ Drucken / Als PDF speichern' : '🖨️ Print / Save as PDF');
  const dateLabel = i18nObj.dateLabel || (isDe ? 'Datum:' : 'Date:');
  const statusLabel = i18nObj.statusLabel || (isDe ? 'Status:' : 'Status:');
  const statusValue = i18nObj.statusValue || (isDe ? 'Freigegeben / Produktiv' : 'Approved / Production');
  const overviewHeading = i18nObj.overviewHeading || (isDe ? '1. Prozess-Übersicht & Ablaufdiagramm' : '1. Process Overview & Flow Diagram');
  const stepsHeading = i18nObj.stepsHeading || (isDe ? '2. Prozessschritte & Handlungsanweisungen' : '2. Process Steps & Operating Procedures');
  const colStepLabel = i18nObj.colStep || (isDe ? 'Prozessschritt' : 'Process Step');
  const colTypeLabel = i18nObj.colType || (isDe ? 'Typ' : 'Type');
  const colRoleLabel = i18nObj.colRole || (isDe ? 'Verantwortlich' : 'Responsible');
  const colDocLabel = i18nObj.colDoc || (isDe ? 'Handlungsanweisung & QM-Details' : 'Operating Procedure & QM Details');
  const colNextLabel = i18nObj.colNext || (isDe ? 'Folgeschritte' : 'Next Steps');
  const noSvgText = i18nObj.noSvg || (isDe ? 'Keine SVG-Grafik verfügbar.' : 'No SVG graphic available.');

  printWindow.document.write(`<!DOCTYPE html>
<html lang="${isDe ? 'de' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(handbookTitle)}: ${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 30px;
      background: #fff;
      line-height: 1.5;
    }
    .handbook-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .handbook-header h1 {
      margin: 0 0 6px 0;
      font-size: 26px;
      color: #0f172a;
    }
    .handbook-meta {
      font-size: 13px;
      color: #64748b;
      text-align: right;
    }
    .diagram-section {
      margin-bottom: 36px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      background: #f8fafc;
      page-break-inside: avoid;
    }
    .diagram-section h2 {
      margin: 0 0 12px 0;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
    }
    .diagram-svg-container {
      max-width: 100%;
      overflow: hidden;
      display: flex;
      justify-content: center;
    }
    .diagram-svg-container svg {
      max-width: 100%;
      height: auto;
    }
    .steps-section h2 {
      font-size: 18px;
      margin: 0 0 12px 0;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .col-num { width: 35px; text-align: center; color: #94a3b8; font-weight: 600; }
    .col-step { width: 22%; }
    .col-type { width: 15%; }
    .col-role { width: 15%; font-weight: 500; color: #0369a1; }
    .col-doc { width: 30%; }
    .col-next { width: 15%; color: #64748b; font-size: 12px; }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      background: #e2e8f0;
      font-size: 11px;
      font-weight: 500;
    }
    .mono {
      font-family: monospace;
      color: #94a3b8;
      font-size: 11px;
    }
    .print-bar {
      position: fixed;
      top: 15px;
      right: 20px;
      z-index: 100;
      display: flex;
      gap: 10px;
    }
    .btn-print {
      background: #0f172a;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    @media print {
      body { padding: 0; }
      .print-bar { display: none; }
      .diagram-section { border: none; padding: 0; background: transparent; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="btn-print" onclick="window.print()">${escapeHtml(printPdfLabel)}</button>
  </div>
  <div class="handbook-header">
    <div>
      <h1>${escapeHtml(handbookTitle)}: ${escapeHtml(title)}</h1>
      <p style="margin: 0; color: #64748b;">${escapeHtml(handbookSubtitle)}</p>
    </div>
    <div class="handbook-meta">
      <div><strong>${escapeHtml(dateLabel)}</strong> ${currentDate}</div>
      <div><strong>${escapeHtml(statusLabel)}</strong> ${escapeHtml(statusValue)}</div>
      <div><strong>Export:</strong> HA-BPMN-Manager</div>
    </div>
  </div>

  <div class="diagram-section">
    <h2>${escapeHtml(overviewHeading)}</h2>
    <div class="diagram-svg-container">
      ${svgContent || `<p>${escapeHtml(noSvgText)}</p>`}
    </div>
  </div>

  <div class="steps-section">
    <h2>${escapeHtml(stepsHeading)}</h2>
    <table>
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-step">${escapeHtml(colStepLabel)}</th>
          <th class="col-type">${escapeHtml(colTypeLabel)}</th>
          <th class="col-role">${escapeHtml(colRoleLabel)}</th>
          <th class="col-doc">${escapeHtml(colDocLabel)}</th>
          <th class="col-next">${escapeHtml(colNextLabel)}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`);

  printWindow.document.close();
}
