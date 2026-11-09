/**
 * Unit Tests for QM Process Handbook Generator (openQmHandbook).
 *
 * @package HA_BPMN_Manager
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { openQmHandbook } from '../src/modules/qm-handbook.js';

test('QM Handbook - Module Interface & Robustness', async (t) => {
  await t.test('exports openQmHandbook function with 3 parameters', () => {
    assert.strictEqual(typeof openQmHandbook, 'function');
  });

  await t.test('executes safely without i18n parameter (no ReferenceError: i18n is not defined)', async () => {
    // Setup minimal DOM window mock
    let writtenHtml = '';
    const mockWindow = {
      document: {
        write: (html) => { writtenHtml += html; },
        close: () => {}
      }
    };
    globalThis.window = {
      open: () => mockWindow
    };
    globalThis.document = {
      documentElement: { lang: 'de' }
    };

    const mockBpmnInstance = {
      saveSVG: async () => ({ svg: '<svg viewBox="0 0 100 100"></svg>' }),
      get: (service) => {
        if (service === 'elementRegistry') {
          return {
            forEach: (cb) => {
              cb({
                id: 'StartEvent_1',
                type: 'bpmn:StartEvent',
                businessObject: {
                  name: 'Start',
                  documentation: [{ text: 'Initiate process' }],
                  outgoing: [{ targetRef: { id: 'Task_1', name: 'Step 1' } }]
                },
                parent: null
              });
              cb({
                id: 'Task_1',
                type: 'bpmn:UserTask',
                businessObject: {
                  name: 'Step 1',
                  documentation: [],
                  outgoing: []
                },
                parent: {
                  businessObject: {
                    $type: 'bpmn:Lane',
                    name: 'Quality Assurance'
                  }
                }
              });
            }
          };
        }
        return null;
      }
    };

    // Call without 3rd parameter (the previous bug triggered here)
    await assert.doesNotReject(async () => {
      await openQmHandbook(mockBpmnInstance, 'Test Audit Workflow');
    });

    assert.ok(writtenHtml.includes('Test Audit Workflow'), 'Written HTML includes diagram title');
    assert.ok(writtenHtml.includes('StartEvent_1'), 'Written HTML includes element ID');
    assert.ok(writtenHtml.includes('Quality Assurance'), 'Written HTML includes resolved Lane');
    assert.ok(writtenHtml.includes('Initiate process'), 'Written HTML includes documentation');
    assert.ok(writtenHtml.includes('window.print()'), 'Written HTML includes print trigger');
  });

  await t.test('accepts custom i18n dictionary and uses custom labels', async () => {
    let writtenHtml = '';
    const mockWindow = {
      document: {
        write: (html) => { writtenHtml += html; },
        close: () => {}
      }
    };
    globalThis.window = {
      open: () => mockWindow
    };
    globalThis.document = {
      documentElement: { lang: 'en' }
    };

    const mockBpmnInstance = {
      saveSVG: async () => ({ svg: '' }),
      get: () => ({ forEach: () => {} })
    };

    const customI18n = {
      qmHandbookTitle: 'Enterprise Process Audit',
      printPdf: 'Save Handbook PDF',
      statusValue: 'ISO 9001 Verified'
    };

    await openQmHandbook(mockBpmnInstance, 'Core Operations', customI18n);

    assert.ok(writtenHtml.includes('Enterprise Process Audit'), 'Uses custom qmHandbookTitle');
    assert.ok(writtenHtml.includes('Save Handbook PDF'), 'Uses custom print button text');
    assert.ok(writtenHtml.includes('ISO 9001 Verified'), 'Uses custom statusValue');
  });
});
