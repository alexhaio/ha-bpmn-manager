/**
 * Unit Tests for HTML/URL Sanitization, Node-safe UI Modules, and Certificate Configuration.
 *
 * @package HA_BPMN_Manager
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml,
  sanitizeHexColor,
  sanitizeMediaUrl
} from '../src/modules/escape-html.js';
import { COLOR_PRESETS, getColorPresets } from '../src/modules/color-presets.js';
import { showCertificateModal } from '../src/modules/quest/certificate.js';

test('Security Helpers - escapeHtml', () => {
  assert.strictEqual(escapeHtml(null), '');
  assert.strictEqual(escapeHtml(undefined), '');
  assert.strictEqual(
    escapeHtml('<script>alert("xss&\'1")</script>'),
    '&lt;script&gt;alert(&quot;xss&amp;&#39;1&quot;)&lt;/script&gt;'
  );
  assert.strictEqual(escapeHtml(42), '42');
});

test('Security Helpers - sanitizeHexColor', () => {
  assert.strictEqual(sanitizeHexColor('#1e293b'), '#1e293b');
  assert.strictEqual(sanitizeHexColor('  #ABC  '), '#ABC');
  assert.strictEqual(sanitizeHexColor('#123456ff'), '#123456ff');
  assert.strictEqual(sanitizeHexColor('red" onload="alert(1)', '#bf953f'), '#bf953f');
  assert.strictEqual(sanitizeHexColor('javascript:alert(1)', '#000000'), '#000000');
  assert.strictEqual(sanitizeHexColor(null), '#bf953f');
});

test('Security Helpers - sanitizeMediaUrl', () => {
  assert.strictEqual(sanitizeMediaUrl('https://example.com/logo.png'), 'https://example.com/logo.png');
  assert.strictEqual(sanitizeMediaUrl('/wp-content/uploads/seal.png'), '/wp-content/uploads/seal.png');
  assert.strictEqual(
    sanitizeMediaUrl('data:image/png;base64,iVBORw0KGgo='),
    'data:image/png;base64,iVBORw0KGgo='
  );
  assert.strictEqual(sanitizeMediaUrl('//evil.example.com/a.png'), '');
  assert.strictEqual(sanitizeMediaUrl('javascript:alert(1)'), '');
  assert.strictEqual(sanitizeMediaUrl('data:image/svg+xml,<svg onload="alert(1)"/>'), '');
  assert.strictEqual(sanitizeMediaUrl('   '), '');
});

test('Color Presets - safe Node import without DOM', () => {
  assert.ok(Array.isArray(COLOR_PRESETS) && COLOR_PRESETS.length >= 4);
  const presets = getColorPresets();
  const happy = presets.find((p) => p.id === 'happy');
  assert.ok(happy && happy.stroke && happy.fill);
});

test('Certificate Modal - escapes XSS, normalizes themes, and respects isPreview', () => {
  const appended = [];
  const createEl = (tag) => ({
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    innerHTML: '',
    remove() {},
    querySelector() {
      return { addEventListener() {} };
    },
    addEventListener() {}
  });

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;

  let fetchCalled = false;
  globalThis.window = { haBpmnSettings: {} };
  globalThis.document = {
    getElementById: () => null,
    createElement: createEl,
    addEventListener() {},
    removeEventListener() {},
    body: {
      appendChild(node) {
        appended.push(node);
      }
    }
  };
  globalThis.fetch = () => {
    fetchCalled = true;
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  try {
    showCertificateModal({
      userName: '<img src=x onerror=alert(1)>',
      xp: 1800,
      lang: 'de',
      isPreview: true,
      completedChapters: [1, 2, 3, 4, 5, 6],
      completedChallenges: ['c1', 'c2'],
      certConfig: {
        colorTheme: 'emerald_green',
        customColor: 'not-a-color" onclick="alert(1)',
        signerName: '<b>Evil</b>',
        sealImage: 'javascript:alert(1)',
        watermarkImage: 'https://example.com/wm.png'
      }
    });

    assert.strictEqual(appended.length, 1);
    assert.strictEqual(fetchCalled, false, 'Preview mode must NOT POST to credentials/issue API');

    const html = appended[0].innerHTML;
    assert.ok(!html.includes('<img src=x'), 'XSS payload in userName must be escaped');
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'Escaped userName appears safely');
    assert.ok(html.includes('&lt;b&gt;Evil&lt;/b&gt;'), 'Signer name HTML is escaped');
    assert.ok(!html.includes('javascript:alert(1)'), 'Unsafe seal URL is stripped');
    assert.ok(html.includes('https://example.com/wm.png'), 'Safe HTTPS watermark URL is preserved');
    assert.ok(html.includes('#059669'), 'emerald_green theme maps to emerald stroke color');
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
  }
});
