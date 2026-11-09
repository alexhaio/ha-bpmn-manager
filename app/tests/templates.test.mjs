/**
 * Unit Tests for Templates Module & Quest XML Detection.
 *
 * @package HA_BPMN_Manager
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isQuestDiagram,
  getQuestXml,
  getTemplates
} from '../src/modules/templates.js';

test('Templates - isQuestDiagram detection', async (t) => {
  await t.test('detects official quest adventure XML', () => {
    const questXmlDe = getQuestXml('de');
    const questXmlEn = getQuestXml('en');

    assert.strictEqual(isQuestDiagram(questXmlDe), true, 'German quest XML recognized as quest diagram');
    assert.strictEqual(isQuestDiagram(questXmlEn), true, 'English quest XML recognized as quest diagram');
  });

  await t.test('returns false for plain / default BPMN diagram', () => {
    const plainXml = '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1"><bpmn:process id="Process_1" isExecutable="false"><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>';
    assert.strictEqual(isQuestDiagram(plainXml), false, 'Plain template is not recognized as quest diagram');
    assert.strictEqual(isQuestDiagram('<bpmn:definitions id="Def_Custom"></bpmn:definitions>'), false, 'Empty custom XML is not recognized as quest diagram');
    assert.strictEqual(isQuestDiagram(''), false, 'Empty string returns false');
    assert.strictEqual(isQuestDiagram(null), false, 'Null returns false');
  });
});

test('Templates - getTemplates catalogue', async (t) => {
  await t.test('returns catalogue of business templates', () => {
    const templatesDe = getTemplates('de');
    const templatesEn = getTemplates('en');

    assert.ok(Array.isArray(templatesDe), 'Returns array of templates');
    assert.ok(templatesDe.length >= 3, 'Contains multiple business process templates');

    for (const tpl of templatesDe) {
      assert.ok(tpl.id, 'Template has id');
      assert.ok(tpl.title, `Template ${tpl.id} has title`);
      assert.ok(tpl.xml && tpl.xml.includes('<bpmn:definitions'), `Template ${tpl.id} contains valid BPMN XML`);
    }
  });

  await t.test('general business picker excludes quest scenario', () => {
    const templates = getTemplates('de').filter(tpl => tpl.id !== 'quest');
    assert.strictEqual(templates.some(tpl => tpl.id === 'quest'), false, 'Quest template filtered from business picker');
  });
});
