/**
 * HA-BPMN-Manager: Live Diagram Search & Element Highlighting
 *
 * Enables real-time searching through diagram tasks, events, and descriptions,
 * highlighting matching elements and smoothly centering the viewport on them.
 *
 * @package HA_BPMN_Manager
 */

import { escapeHtml } from './escape-html.js';

/**
 * Initializes Diagram Search on a bpmn-js instance.
 *
 * @param {HTMLElement} wrap Container element.
 * @param {Object} bpmnInstance Modeler or NavigatedViewer instance.
 */
export function initDiagramSearch(wrap, bpmnInstance, i18n = {}) {
  let searchBar = wrap.querySelector('.ha-bpmn-search-bar');
  const searchBtn = wrap.querySelector('.ha-btn-search');

  const placeholder = escapeHtml(i18n.searchPlaceholder || 'Diagramm durchsuchen...');
  const prevTitle = escapeHtml(i18n.previousMatch || 'Vorheriger Treffer');
  const nextTitle = escapeHtml(i18n.nextMatch || 'Nächster Treffer');
  const closeTitle = escapeHtml(i18n.closeSearch || 'Suche schließen');

  if (!searchBar) {
    searchBar = document.createElement('div');
    searchBar.className = 'ha-bpmn-search-bar';
    searchBar.innerHTML = `
      <div class="ha-search-input-wrap">
        <svg class="ha-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="ha-search-input" placeholder="${placeholder}" aria-label="${placeholder}" />
        <span class="ha-search-count">0/0</span>
        <button type="button" class="ha-search-btn ha-search-prev" title="${prevTitle}" disabled>&uarr;</button>
        <button type="button" class="ha-search-btn ha-search-next" title="${nextTitle}" disabled>&darr;</button>
        <button type="button" class="ha-search-btn ha-search-close" title="${closeTitle}">&times;</button>
      </div>
    `;
    wrap.appendChild(searchBar);
  }

  const input = searchBar.querySelector('.ha-search-input');
  const countLabel = searchBar.querySelector('.ha-search-count');
  const prevBtn = searchBar.querySelector('.ha-search-prev');
  const nextBtn = searchBar.querySelector('.ha-search-next');
  const closeBtn = searchBar.querySelector('.ha-search-close');

  let matches = [];
  let currentIndex = -1;

  const clearHighlighting = () => {
    try {
      const canvas = bpmnInstance.get('canvas');
      matches.forEach(el => {
        canvas.removeMarker(el.id, 'ha-bpmn-search-match');
        canvas.removeMarker(el.id, 'ha-bpmn-search-active');
      });
    } catch (e) {}
    matches = [];
    currentIndex = -1;
    countLabel.textContent = '0/0';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  };

  const focusCurrentMatch = () => {
    if (matches.length === 0 || currentIndex < 0) return;
    const canvas = bpmnInstance.get('canvas');
    const target = matches[currentIndex];

    // Remove active state from all, set on current
    matches.forEach(el => canvas.removeMarker(el.id, 'ha-bpmn-search-active'));
    canvas.addMarker(target.id, 'ha-bpmn-search-active');

    try {
      const selection = bpmnInstance.get('selection', false);
      if (selection && typeof selection.set === 'function') {
        selection.set(target);
      }
    } catch (e) {}

    // Smoothly pan viewport to element
    if (typeof canvas.scrollToElement === 'function') {
      canvas.scrollToElement(target);
    } else {
      // Fallback centering
      const viewbox = canvas.viewbox();
      const midX = target.x + target.width / 2;
      const midY = target.y + target.height / 2;
      canvas.viewbox({
        x: midX - viewbox.width / 2,
        y: midY - viewbox.height / 2,
        width: viewbox.width,
        height: viewbox.height
      });
    }

    countLabel.textContent = `${currentIndex + 1}/${matches.length}`;
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  };

  const performSearch = (query) => {
    clearHighlighting();
    const term = (query || '').trim().toLowerCase();
    if (!term) return;

    try {
      const elementRegistry = bpmnInstance.get('elementRegistry');
      const canvas = bpmnInstance.get('canvas');

      elementRegistry.forEach(el => {
        if (!el.businessObject || el.type === 'bpmn:Process' || el.type === 'bpmn:SequenceFlow') {
          return;
        }

        const name = (el.businessObject.name || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        let doc = '';
        if (Array.isArray(el.businessObject.documentation) && el.businessObject.documentation.length > 0) {
          doc = (el.businessObject.documentation[0]?.text || '').toLowerCase();
        }

        if (name.includes(term) || id.includes(term) || doc.includes(term)) {
          matches.push(el);
          canvas.addMarker(el.id, 'ha-bpmn-search-match');
        }
      });

      if (matches.length > 0) {
        currentIndex = 0;
        focusCurrentMatch();
      } else {
        countLabel.textContent = '0/0';
      }
    } catch (err) {
      console.warn('[HA-BPMN] Search error:', err);
    }
  };

  input.addEventListener('input', () => {
    performSearch(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matches.length > 0) {
        currentIndex = (currentIndex + 1) % matches.length;
        focusCurrentMatch();
      }
    } else if (e.key === 'Escape') {
      toggleSearch(false);
    }
  });

  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (matches.length > 0) {
      currentIndex = (currentIndex - 1 + matches.length) % matches.length;
      focusCurrentMatch();
    }
  });

  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (matches.length > 0) {
      currentIndex = (currentIndex + 1) % matches.length;
      focusCurrentMatch();
    }
  });

  const toggleSearch = (show) => {
    const isVisible = (typeof show === 'boolean') ? show : !searchBar.classList.contains('active');
    searchBar.classList.toggle('active', isVisible);
    if (searchBtn) {
      searchBtn.classList.toggle('active', isVisible);
    }
    if (isVisible) {
      input.focus();
      input.select();
      if (input.value) performSearch(input.value);
    } else {
      clearHighlighting();
    }
  };

  closeBtn.addEventListener('click', () => toggleSearch(false));

  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSearch();
    });
  }

  // Global Ctrl+F / Cmd+F shortcut within wrap
  wrap.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleSearch(true);
    }
  });

  return {
    toggle: toggleSearch,
    search: performSearch,
    clear: clearHighlighting
  };
}
