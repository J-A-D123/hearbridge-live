import test from 'node:test';
import assert from 'node:assert/strict';
import { capture, createSession, decide, demo, englishRecap, extract, mandarinDemo, recap, sessionStatus } from '../dist/verify.mjs';

function add(session, text, confidence = null) {
  capture(session, { id: session.turns.length + 1, source: 'Test', text, confidence });
}

test('English evidence spans point back to the exact raw text', () => {
  const text = 'See you Tuesday at 3:30 p.m., room 204B.';
  const spans = extract(text);
  assert.deepEqual(spans.map(span => span.kind), ['date', 'time', 'room']);
  assert.deepEqual(spans.map(span => text.slice(span.start, span.end)), ['Tuesday', '3:30 p.m.', 'room 204B']);
});
test('Mandarin patterns identify a date, time and room', () => {
  assert.deepEqual(extract('周二下午三点半去204室').map(item => item.value), ['周二', '下午三点半', '204室']);
});
test('all demo turns are synthetic and preserve opposing room evidence', () => {
  const session = createSession();
  for (const [text, , confidence] of demo) add(session, text, confidence);
  assert.equal(session.cards.room.candidates.size, 2);
  const proposed = [...session.cards.room.candidates.values()].at(-1);
  assert.equal(proposed.first.turn.confidence, 0.55);
  assert.equal(proposed.last.turn.id, 3);
  assert.deepEqual(recap(session), []);
});
test('user decisions only, with explicit correction provenance', () => {
  const session = createSession();
  add(session, 'Tuesday 15:30 in room 204');
  assert.equal(decide(session, 'room', 'room 205', 'caption'), false);
  assert.equal(decide(session, 'room', ' ', 'manual'), false);
  assert.equal(decide(session, 'room', ' room 205 ', 'manual'), true);
  assert.deepEqual(recap(session), [{ kind: 'room', value: 'room 205', source: 'manual' }]);
});
test('a later contradiction invalidates only the affected confirmed detail', () => {
  const session = createSession();
  add(session, 'Tuesday in room 204');
  decide(session, 'room', 'room 204', 'caption');
  decide(session, 'date', 'Tuesday', 'caption');
  add(session, 'Actually room 240');
  assert.deepEqual(recap(session), [{ kind: 'date', value: 'Tuesday', source: 'caption' }]);
  decide(session, 'room', 'room 240', 'caption');
  add(session, 'Room 204');
  assert.equal(session.cards.room.decision, null);
});
test('equivalent times merge without altering original evidence or reopening the decision', () => {
  const session = createSession();
  add(session, '3:30 p.m.');
  decide(session, 'time', '3:30 p.m.', 'caption');
  add(session, '15:30');
  assert.equal(session.cards.time.candidates.size, 1);
  assert.equal(recap(session)[0].value, '3:30 p.m.');
});
test('a fresh session has no turns, candidates or recap', () => {
  const session = createSession();
  add(session, 'Wednesday 12 p.m. room 22');
  assert.equal(session.turns.length, 1);
  assert.equal(createSession().turns.length, 0);
  assert.deepEqual(recap(createSession()), []);
});

test('Mandarin replay prioritizes an unresolved time change and tracks confirmation', () => {
  const session = createSession();
  for (const [text, , confidence] of mandarinDemo) add(session, text, confidence);
  assert.deepEqual(sessionStatus(session), { turns: 3, conflicts: 1, confirmed: 0, pending: 3 });
  assert.deepEqual([...session.cards.time.candidates.values()].map(item => item.value), ['下午两点', '下午三点']);
  decide(session, 'time', '下午三点', 'caption');
  assert.deepEqual(sessionStatus(session), { turns: 3, conflicts: 0, confirmed: 1, pending: 2 });
  add(session, '还是下午两点。');
  assert.deepEqual(sessionStatus(session), { turns: 4, conflicts: 1, confirmed: 0, pending: 3 });
});

test('repair prompts ask a question and preserve the caption candidates for the speaker', async () => {
  const { repairPrompt } = await import('../dist/verify.mjs');
  assert.deepEqual(repairPrompt('room', [{ value: 'room 204' }, { value: 'room 240' }]), {
    en: 'Could you confirm the room number?',
    zh: '请问可以确认一下房间号吗？',
    candidates: ['room 204', 'room 240'],
  });
});

test('English recap reads room identifiers digit by digit and keeps the confirmed time', () => {
  assert.equal(englishRecap([
    { kind: 'room', value: 'room 204B' },
    { kind: 'time', value: '3:30 p.m.' },
    { kind: 'date', value: 'Tuesday' },
  ], true), 'Sample only. Room two, zero, four, B. Time: 3:30 P M. Date: Tuesday.');
  assert.equal(englishRecap([{ kind: 'room', value: 'West Wing' }], false), 'Room: West Wing.');
});
