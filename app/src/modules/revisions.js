/**
 * HA-BPMN-Manager: Revisions History & Visual Diff
 *
 * Fetches WordPress post revisions, enables side-by-side semantic diffing
 * via bpmn-js-differ, and allows one-click restoration of previous versions.
 *
 * @package HA_BPMN_Manager
 */

import { diff } from 'bpmn-js-differ';
import BpmnModdle from 'bpmn-moddle';

/**
 * Opens the Revisions History modal.
 *
 * @param {Object} modeler BpmnModeler instance.
 * @param {string} diagramId Diagram post ID.
 * @param {string} restBase Base URL for REST API.
 * @param {string} restNonce WordPress REST nonce.
 * @param {Object} i18n Optional dictionary of translated strings.
 */
export async function openRevisionsModal(modeler, diagramId, restBase, restNonce, i18n = {}) {
  const existingModal = document.getElementById('ha-bpmn-revisions-modal');
  if (existingModal) existingModal.remove();

  const isDe = (document.documentElement.lang || 'de').startsWith('de');

  const titleText = i18n.history || (isDe ? 'Versionshistorie & Revisions-Vergleich' : 'Revision History & Semantic Diff');
  const loadingText = i18n.loadingRevisions || (isDe ? 'Lade gespeicherte Revisionen...' : 'Loading revisions...');
  const restoreBtnText = i18n.restore || (isDe ? 'Diese Version im Editor wiederherstellen' : 'Restore this version in editor');
  const addedText = i18n.added || (isDe ? 'Hinzugefügt' : 'Added');
  const modifiedText = i18n.modified || (isDe ? 'Geändert' : 'Modified');
  const deletedText = i18n.deleted || (isDe ? 'Entfernt' : 'Deleted');
  const closeLabel = i18n.close || (isDe ? 'Schließen' : 'Close');
  const savedVersionsHeading = i18n.savedVersions || (isDe ? 'Gespeicherte Versionen' : 'Saved Versions');
  const diffAnalysisHeading = i18n.diffAnalysis || (isDe ? 'Diff-Analyse gegenüber aktueller Version' : 'Diff Analysis vs Current Version');
  const selectRevisionHelp = i18n.selectRevisionHelp || (isDe ? 'Wählen Sie links eine Revision aus, um die Änderungen semantisch zu analysieren.' : 'Select a revision on the left to semantically analyze changes.');

  const modal = document.createElement('div');
  modal.id = 'ha-bpmn-revisions-modal';
  modal.className = 'ha-bpmn-modal-backdrop';
  modal.innerHTML = `
    <div class="ha-bpmn-modal-dialog ha-revisions-dialog">
      <div class="ha-bpmn-modal-header">
        <h2>${titleText}</h2>
        <button type="button" class="ha-bpmn-modal-close" aria-label="${closeLabel}">&times;</button>
      </div>
      <div class="ha-bpmn-modal-body">
        <div class="ha-revisions-loading">${loadingText}</div>
        <div class="ha-revisions-content" style="display:none;">
          <div class="ha-revisions-list-col">
            <h3>${savedVersionsHeading}</h3>
            <ul class="ha-revisions-list"></ul>
          </div>
          <div class="ha-revisions-diff-col">
            <h3>${diffAnalysisHeading}</h3>
            <div class="ha-diff-summary">${selectRevisionHelp}</div>
            <div class="ha-diff-details"></div>
            <div class="ha-diff-actions" style="display:none; margin-top: 16px;">
              <button type="button" class="button button-primary ha-btn-restore-revision">${restoreBtnText}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('.ha-bpmn-modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  const endpoint = `${restBase.replace(/\/$/, '')}/diagram/${diagramId}/revisions`;
  let revisions = [];

  try {
    const res = await fetch(endpoint, {
      headers: restNonce ? { 'X-WP-Nonce': restNonce } : {}
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    revisions = await res.json();
  } catch (err) {
    modal.querySelector('.ha-revisions-loading').innerHTML = `
      <p style="color: #dc2626;">Konnte Revisionen nicht laden: ${err.message}</p>
    `;
    return;
  }

  const loadingEl = modal.querySelector('.ha-revisions-loading');
  const contentEl = modal.querySelector('.ha-revisions-content');
  const listEl = modal.querySelector('.ha-revisions-list');
  const summaryEl = modal.querySelector('.ha-diff-summary');
  const detailsEl = modal.querySelector('.ha-diff-details');
  const actionsEl = modal.querySelector('.ha-diff-actions');
  const restoreBtn = modal.querySelector('.ha-btn-restore-revision');

  loadingEl.style.display = 'none';
  contentEl.style.display = 'flex';

  if (!Array.isArray(revisions) || revisions.length === 0) {
    listEl.innerHTML = '<li class="no-revisions">Keine früheren Revisionen vorhanden.</li>';
    return;
  }

  let selectedRevision = null;

  revisions.forEach((rev, idx) => {
    const li = document.createElement('li');
    li.className = 'ha-revision-item';
    li.innerHTML = `
      <div class="ha-rev-title">Revision #${rev.id}</div>
      <div class="ha-rev-meta">${rev.date} von <strong>${escapeHtml(rev.author)}</strong></div>
    `;

    li.addEventListener('click', () => {
      listEl.querySelectorAll('.ha-revision-item').forEach(el => el.classList.remove('active'));
      li.classList.add('active');
      selectedRevision = rev;
      actionsEl.style.display = 'block';
      analyzeDiff(rev);
    });

    listEl.appendChild(li);
    if (idx === 0) {
      li.click();
    }
  });

  async function analyzeDiff(rev) {
    summaryEl.innerHTML = '<em>Berechne semantischen Diff...</em>';
    detailsEl.innerHTML = '';

    try {
      const { xml: currentXml } = await modeler.saveXML();
      const pastXml = rev.xml;

      if (!pastXml) {
        summaryEl.innerHTML = `<p>${i18n.noXmlInRevision || (isDe ? 'In dieser Revision ist keine BPMN-Definition gespeichert.' : 'No BPMN definition is stored in this revision.')}</p>`;
        return;
      }

      const moddle = new BpmnModdle();
      const [{ rootElement: oldDefinitions }, { rootElement: newDefinitions }] = await Promise.all([
        moddle.fromXML(pastXml),
        moddle.fromXML(currentXml)
      ]);

      const diffResult = diff(oldDefinitions, newDefinitions);

      const added = Object.keys(diffResult._added || {});
      const removed = Object.keys(diffResult._removed || {});
      const changed = Object.keys(diffResult._changed || {});
      const layoutChanged = Object.keys(diffResult._layoutChanged || {});

      summaryEl.innerHTML = `
        <div class="ha-diff-stats">
          <span class="stat-badge added">+${added.length} ${addedText}</span>
          <span class="stat-badge changed">~${changed.length + layoutChanged.length} ${modifiedText}</span>
          <span class="stat-badge removed">-${removed.length} ${deletedText}</span>
        </div>
      `;

      const addedPrefix = i18n.elementAdded || (isDe ? 'Element hinzugefügt:' : 'Element added:');
      const changedPrefix = i18n.elementChanged || (isDe ? 'Elementinhalt geändert:' : 'Element content changed:');
      const layoutPrefix = i18n.layoutChanged || (isDe ? 'Position/Layout geändert:' : 'Position/layout changed:');
      const removedPrefix = i18n.elementDeleted || (isDe ? 'Element gelöscht:' : 'Element deleted:');
      const identicalMsg = i18n.identicalRevision || (isDe ? 'Diese Revision ist identisch mit dem aktuellen Stand im Editor.' : 'This revision is identical to the current editor state.');

      let html = '<ul class="ha-diff-list">';
      added.forEach(id => html += `<li class="diff-added"><span class="badge">+</span> ${addedPrefix} <code>${escapeHtml(id)}</code></li>`);
      changed.forEach(id => html += `<li class="diff-changed"><span class="badge">~</span> ${changedPrefix} <code>${escapeHtml(id)}</code></li>`);
      layoutChanged.forEach(id => html += `<li class="diff-changed"><span class="badge">~</span> ${layoutPrefix} <code>${escapeHtml(id)}</code></li>`);
      removed.forEach(id => html += `<li class="diff-removed"><span class="badge">-</span> ${removedPrefix} <code>${escapeHtml(id)}</code></li>`);
      if (added.length === 0 && changed.length === 0 && layoutChanged.length === 0 && removed.length === 0) {
        html += `<li><em>${identicalMsg}</em></li>`;
      }
      html += '</ul>';
      detailsEl.innerHTML = html;
    } catch (err) {
      console.warn('[HA-BPMN] Diff error:', err);
      const fallbackMsg = isDe
        ? `Einfacher Revisionsstand vom ${rev.date}. Detaillierte Diff-Grafik konnte nicht erstellt werden.`
        : `Basic revision state from ${rev.date}. Detailed diff graphics could not be generated.`;
      summaryEl.innerHTML = `<p style="color: #64748b;">${fallbackMsg}</p>`;
    }
  }

  restoreBtn.addEventListener('click', async () => {
    if (!selectedRevision || !selectedRevision.xml) return;
    const confirmPrompt = isDe
      ? `Möchten Sie das Diagramm wirklich auf Revision #${selectedRevision.id} vom ${selectedRevision.date} zurücksetzen?`
      : `Do you really want to restore the diagram to revision #${selectedRevision.id} from ${selectedRevision.date}?`;
    if (confirm(confirmPrompt)) {
      try {
        await modeler.importXML(selectedRevision.xml);
        modeler.get('canvas').zoom('fit-viewport', 'auto');
        closeModal();
      } catch (err) {
        const errPrefix = i18n.restoreError || (isDe ? 'Fehler beim Wiederherstellen der Revision:' : 'Error restoring revision:');
        alert(`${errPrefix} ${err.message}`);
      }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
