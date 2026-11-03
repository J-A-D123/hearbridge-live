import { capture, createSession, decide, recap } from '../dist/verify.mjs';

// Hand-authored scenarios stress distinct paths. These cases are not a population sample.
const cases = [
  ['EN room change', 'room', ['Go to room 204.', 'The new room is room 240.'], 'room 240'],
  ['EN time change', 'time', ['Come at 10:00.', 'Make that 11:30.'], '11:30'],
  ['EN date change', 'date', ['It’s on Monday.', 'We moved it to Tuesday.'], 'Tuesday'],
  ['ZH time change', 'time', ['请下午两点来。', '时间改成下午三点。'], '下午三点'],
  ['ZH room change', 'room', ['在306室。', '换到360室。'], '360室'],
  ['EN equivalent time', 'time', ['Meet at 15:30.', 'Yes, 3:30 p.m.'], '15:30'],
  ['EN stable room', 'room', ['The office is room 204.'], 'room 204'],
  ['EN unsupported room wording', 'room', ['Go to room two forty.'], 'room 240'],
];

const results = cases.map(([name, kind, turns, expected]) => {
  const session = createSession();
  turns.forEach((text, index) => capture(session, { text, id: index + 1, source: 'Synthetic' }));
  const candidates = [...(session.cards[kind]?.candidates.values() ?? [])];
  const early = recap(session).some(detail => detail.kind === kind);
  const matched = candidates.some(candidate => candidate.value === expected);
  if (matched) decide(session, kind, expected, 'caption');
  return {
    case: name,
    'First extracted': candidates[0]?.value ?? 'Missing',
    Conflict: candidates.length > 1,
    'Before confirmation': early ? 'Published' : 'Withheld',
    'After scripted confirmation': recap(session).find(detail => detail.kind === kind)?.value ?? 'Missing',
  };
});
console.table(results);
