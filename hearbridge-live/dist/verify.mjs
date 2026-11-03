// Extraction deliberately preserves source spans. Normalization only merges equivalent candidates.
const kinds = {
  date: /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)\b|(?:星期|周)[一二三四五六日天]|\d{1,2}月\d{1,2}[日号]/giu,
  time: /\b(?:(?:[01]?\d|2[0-3]):[0-5]\d\b(?:\s*[ap]\.?m\b\.?)?|(?:1[0-2]|[1-9])\s*[ap]\.?m\b\.?)|(?:上午|下午|晚上|中午)?(?:\d{1,2}|[一二三四五六七八九十两]{1,3})点(?:半|\d{1,2}分)?/giu,
  room: /\broom\s+[a-z]?\d{1,4}[a-z]?\b|[A-Za-z]?\d{1,4}[A-Za-z]?(?:号房间|号诊室|房间|诊室|室)/giu,
};

export const labels = {
  date: ['Date / day', '日期'],
  time: ['Time', '时间'],
  room: ['Room', '房间'],
};

export function extract(text) {
  return Object.entries(kinds).flatMap(([kind, pattern]) =>
    [...text.matchAll(pattern)].map(match => ({
      kind, value: match[0], start: match.index, end: match.index + match[0].length,
    })),
  ).sort((a, b) => a.start - b.start);
}

function key(kind, value) {
  const cleaned = value.normalize('NFKC').toLowerCase().replace(/[.\s]/g, '');
  if (kind !== 'time') return cleaned;
  const time = cleaned.match(/^(\d{1,2})(?::(\d{2}))?([ap]m)?$/);
  if (!time) return cleaned;
  const [, hours, minutes, period] = time;
  if (!minutes && !period) return cleaned;
  const hour = period ? Number(hours) % 12 + (period === 'pm' ? 12 : 0) : Number(hours);
  return hour + ':' + (minutes ?? '00');
}

export function capture(session, turn) {
  session.turns.push(turn);
  for (const span of extract(turn.text)) {
    const card = session.cards[span.kind] ??= { candidates: new Map(), decision: null };
    const identity = key(span.kind, span.value);
    const known = card.candidates.get(identity);
    if (known) {
      known.last = { turn, span };
      known.mentions += 1;
    } else {
      card.candidates.set(identity, {
        value: span.value, first: { turn, span }, last: { turn, span }, mentions: 1,
      });
    }
    // A new contradiction reopens review even if that candidate appeared before.
    if (card.decision && key(span.kind, card.decision.value) !== identity) {
      card.decision = null;
    }
  }
}

export function decide(session, kind, value, source) {
  const card = session.cards[kind];
  const trimmed = value.trim();
  if (!card || !trimmed || trimmed.length > 80) return false;
  if (source === 'caption' && ![...card.candidates.values()].some(item => item.value === trimmed)) return false;
  card.decision = { value: trimmed, source };
  return true;
}

export function recap(session) {
  return Object.entries(session.cards).flatMap(([kind, card]) =>
    card.decision ? [{ kind, ...card.decision }] : [],
  );
}

export function createSession() {
  return { turns: [], cards: Object.create(null) };
}

export const phrases = {
  repeat: ['Could you repeat that?', '您可以再说一遍吗？'],
  slow: ['Could you speak more slowly?', '您可以说慢一点吗？'],
  write: ['Could you write that down?', '您可以把这写下来吗？'],
  confirm: ['Can we confirm the details together?', '我们可以一起确认一下这些细节吗？'],
};

export const demo = [
  ['Your follow-up is Tuesday at 3:30 p.m. in room 204.', 'Sample · Front desk', 0.91],
  ['Sorry, the room changed. It is room 240.', 'Sample · Front desk', 0.55],
  ['Let’s write it down. Tuesday at 3:30 p.m., room 240.', 'Sample · Front desk', 0.95],
];

export const mandarinDemo = [
  ['康复随访安排在周四下午两点，地点是306室。', 'Sample · Reception', 0.92],
  ['时间改了，请下午三点来。', 'Sample · Reception', 0.58],
  ['我们再核对一下，周四下午三点，地点还是306室。', 'Sample · Reception', 0.94],
];

export function sessionStatus(session) {
  const cards = Object.values(session.cards);
  return {
    turns: session.turns.length,
    conflicts: cards.filter(card => !card.decision && card.candidates.size > 1).length,
    confirmed: cards.filter(card => card.decision).length,
    pending: cards.filter(card => !card.decision).length,
  };
}

const repairQuestions = {
  date: ['Could you confirm the day or date?', '请问可以确认一下日期或星期几吗？'],
  time: ['Could you confirm the exact time?', '请问可以确认一下具体时间吗？'],
  room: ['Could you confirm the room number?', '请问可以确认一下房间号吗？'],
};

export function repairPrompt(kind, candidates) {
  const [en, zh] = repairQuestions[kind];
  return { en, zh, candidates: [...candidates].map(candidate => candidate.value) };
}

const spokenDigits = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export function englishRecap(decisions, isSample) {
  return [
    ...(isSample ? ['Sample only'] : []),
    ...decisions.map(({ kind, value }) => {
      if (kind === 'room') {
        const room = value.replace(/^room\s+/i, '');
        if (/^[a-z]?\d{1,4}[a-z]?$/i.test(room)) {
          return 'Room ' + [...room].map(character => spokenDigits[character] ?? character.toUpperCase()).join(', ');
        }
        return /^room\s/i.test(value) ? value : 'Room: ' + value;
      }
      if (kind === 'time') return 'Time: ' + value.replace(/\b([ap])\.?m\b\.?/gi, (_, period) => period.toUpperCase() + ' M');
      return 'Date: ' + value;
    }),
  ].map(sentence => /[.!?]$/.test(sentence) ? sentence : sentence + '.').join(' ');
}
