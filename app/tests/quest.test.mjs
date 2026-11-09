/**
 * Unit Tests for Quest HUD, i18n, Honor Tiers, Challenges, and Certificate Generator.
 *
 * @package HA_BPMN_Manager
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveQuestLang,
  getHudString,
  getChapterInfo,
  getNextTierInfo,
  getHonorGrade,
  getLinterRulesContent,
  HUD_STRINGS,
  CHAPTER_I18N
} from '../src/modules/quest/quest-i18n.js';

import { LINTER_CHALLENGES } from '../src/modules/quest/challenges.js';

test('Quest i18n - resolveQuestLang', async (t) => {
  await t.test('resolves supported languages directly', () => {
    assert.strictEqual(resolveQuestLang('de'), 'de');
    assert.strictEqual(resolveQuestLang('en'), 'en');
    assert.strictEqual(resolveQuestLang('es'), 'es');
    assert.strictEqual(resolveQuestLang('fr'), 'fr');
    assert.strictEqual(resolveQuestLang('it'), 'it');
    assert.strictEqual(resolveQuestLang('pt'), 'pt');
    assert.strictEqual(resolveQuestLang('nl'), 'nl');
    assert.strictEqual(resolveQuestLang('pl'), 'pl');
    assert.strictEqual(resolveQuestLang('ru'), 'ru');
    assert.strictEqual(resolveQuestLang('ja'), 'ja');
    assert.strictEqual(resolveQuestLang('zh'), 'zh');
  });

  await t.test('handles regional locales gracefully', () => {
    assert.strictEqual(resolveQuestLang('de_DE'), 'de');
    assert.strictEqual(resolveQuestLang('en_US'), 'en');
    assert.strictEqual(resolveQuestLang('en_GB'), 'en');
    assert.strictEqual(resolveQuestLang('fr_FR'), 'fr');
  });

  await t.test('resolves empty or null to default de', () => {
    assert.strictEqual(resolveQuestLang(''), 'de');
    assert.strictEqual(resolveQuestLang(null), 'de');
  });
});

test('Quest i18n - getHudString', async (t) => {
  await t.test('returns localized string for key', () => {
    const deSolved = getHudString('solved', 'de');
    const enSolved = getHudString('solved', 'en');
    assert.strictEqual(deSolved, 'Gelöst');
    assert.strictEqual(enSolved, 'Solved');
  });

  await t.test('returns empty string when key does not exist', () => {
    const fallback = getHudString('nonExistentKey123', 'de');
    assert.strictEqual(fallback, '');
  });
});

test('Quest i18n - getChapterInfo', async (t) => {
  await t.test('provides 6 distinct chapters (chapter1 to chapter6)', () => {
    const chapterKeys = Object.keys(CHAPTER_I18N);
    assert.strictEqual(chapterKeys.length, 6);

    for (const chapId of chapterKeys) {
      const infoDe = getChapterInfo(chapId, 'de');
      const infoEn = getChapterInfo(chapId, 'en');

      assert.ok(infoDe, `${chapId} (de) exists`);
      assert.ok(infoEn, `${chapId} (en) exists`);
      assert.ok(infoDe.taskText.length > 0, `${chapId} has taskText`);
    }
  });

  await t.test('out of range chapter returns null', () => {
    const invalid = getChapterInfo('chapter99', 'de');
    assert.strictEqual(invalid, null);
  });
});

test('Quest Honor Tiers - getHonorGrade & getNextTierInfo', async (t) => {
  await t.test('getHonorGrade returns tiered distinctions based on XP', () => {
    const grandmaster = getHonorGrade(1800, 'de');
    assert.strictEqual(grandmaster.tier, 5);
    assert.ok(grandmaster.badgeColor);
    assert.ok(grandmaster.translation.length > 0);
    assert.ok(grandmaster.guildTitle.length > 0);

    const novice = getHonorGrade(100, 'de');
    assert.strictEqual(novice.tier, 1);
    assert.ok(novice.translation.length > 0);
  });

  await t.test('getNextTierInfo returns human-readable goal progress', () => {
    const nextTierDe = getNextTierInfo(100, 'de');
    assert.ok(nextTierDe.includes('300 XP'), `Expected 300 XP in string, got: ${nextTierDe}`);
  });
});

test('Linter Challenges - Integrity', async (t) => {
  await t.test('contains exactly 8 gamified linter challenges', () => {
    assert.strictEqual(LINTER_CHALLENGES.length, 8);
  });

  await t.test('each challenge has required structure and valid XML', () => {
    const seenIds = new Set();
    for (const challenge of LINTER_CHALLENGES) {
      assert.ok(challenge.id, 'Challenge has id');
      assert.ok(!seenIds.has(challenge.id), `Challenge id '${challenge.id}' is unique`);
      seenIds.add(challenge.id);

      assert.ok(challenge.title && challenge.title.de, `Challenge ${challenge.id} has title`);
      assert.ok(challenge.intro && challenge.intro.de, `Challenge ${challenge.id} has intro`);
      assert.ok(typeof challenge.xp === 'number' && challenge.xp > 0, `Challenge ${challenge.id} has positive XP`);
      assert.ok(challenge.initialXml && challenge.initialXml.includes('<bpmn:definitions'), `Challenge ${challenge.id} has valid BPMN XML`);
      assert.ok(challenge.ruleKey, `Challenge ${challenge.id} has ruleKey`);
    }
  });
});
