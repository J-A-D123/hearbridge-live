import { capture, createSession, decide, demo, englishRecap, labels, mandarinDemo, phrases, recap, repairPrompt, sessionStatus } from './verify.mjs';
import { createAudio } from './audio.mjs';

const $ = id => document.getElementById(id);
const element = (tag, text = '', className = '') => {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
};
const button = (text, action, className = '') => {
  const node = element('button', text, className);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
};
let session = createSession();
let sample = null;
const scenarios = {
  en: { title: 'Audiology follow-up', turns: demo },
  zh: { title: 'Rehab reception · 普通话', turns: mandarinDemo },
};
let shared = null;
const announce = message => { $('announce').textContent = message; };
const audio = createAudio($, {
  interim: value => { $('interim').textContent = value; },
  final: (value, confidence) => {
    if (sample !== null) $('mode').textContent = 'SAMPLE + INPUT';
    add(value, 'Microphone', confidence);
  },
});

function renderFeed() {
  const feed = $('feed');
  feed.replaceChildren();
  if (!session.turns.length) {
    const empty = element('div', '', 'empty');
    empty.append(element('b', 'Ready to listen'), element('span', 'Run the guided demo or add a conversation turn.'));
    feed.append(empty);
  }
  for (const turn of session.turns) {
    const row = element('article', '', 'turn');
    row.append(element('small', String(turn.id).padStart(2, '0') + ' / ' + turn.source), element('p', turn.text));
    feed.append(row);
  }
  feed.scrollTop = feed.scrollHeight;
}

function renderCards(focusKind) {
  const cards = $('cards');
  const active = cards.contains(document.activeElement) ? document.activeElement : null;
  const activeKind = active?.closest('.card')?.dataset.kind;
  const activeLabel = active?.textContent;
  const drafts = new Map([...cards.querySelectorAll('input')].map(input => [input.id, input.value]));
  const openPanels = new Set([...cards.querySelectorAll('details[open]')].map(node => node.closest('.card').dataset.kind + '/' + node.className));
  const selection = active?.tagName === 'INPUT' ? [active.selectionStart, active.selectionEnd] : null;
  cards.replaceChildren();
  const priority = card => card.decision ? 2 : card.candidates.size > 1 ? 0 : 1;
  const entries = Object.entries(session.cards).sort(([, a], [, b]) => priority(a) - priority(b));
  const status = sessionStatus(session);
  $('count').textContent = status.pending + ' to review';
  $('turn-total').textContent = status.turns;
  $('conflict-total').textContent = status.conflicts;
  $('confirmed-total').textContent = status.confirmed;
  $('recap-note').textContent = status.confirmed
    ? status.confirmed + ' confirmed · ' + status.pending + ' unresolved will be omitted'
    : 'Confirm a detail to add it to the shared recap.';
  if (!entries.length) {
    const empty = element('div', '', 'empty');
    empty.append(element('b', 'No details flagged yet'), element('span', 'Try “Tuesday at 3:30 p.m. in room 204.”'));
    cards.append(empty);
  }
  for (const [kind, card] of entries) {
    const article = element('article', '', 'card');
    article.dataset.kind = kind;
    article.dataset.state = card.decision ? 'confirmed' : card.candidates.size > 1 ? 'conflict' : 'pending';
    const heading = element('div', '', 'card-top');
    heading.append(element('small', labels[kind].join(' / ')), element('span', {
      confirmed: 'Confirmed by you', conflict: 'Conflicting captions', pending: 'Needs review',
    }[article.dataset.state], 'pill'));
    article.append(heading);
    const values = [...card.candidates.values()];
    article.append(element('p', card.decision?.value ?? values.map(item => item.value).join(' / '), 'value'));
    if (values.some(item => [item.first, item.last].some(({ turn }) => turn.confidence > 0 && turn.confidence < 0.65))) {
      article.append(element('p', 'Low recognition signal in recent or first evidence. Ask the speaker.', 'reason'));
    }
    const evidence = element('details', '', 'evidence');
    evidence.open = openPanels.has(kind + '/evidence');
    evidence.append(element('summary', 'See source turns'));
    for (const item of values) {
      for (const { turn, span } of item.first.turn === item.last.turn && item.first.span.start === item.last.span.start ? [item.first] : [item.first, item.last]) {
        const quote = element('p', '#' + turn.id + ' · ' + turn.source + ' — ');
        quote.append(turn.text.slice(0, span.start), element('mark', span.value), turn.text.slice(span.end));
        evidence.append(quote);
      }
    }
    article.append(evidence);
    const options = element('div', '', 'candidate');
    const commit = (value, source) => {
      if (!decide(session, kind, value, source)) return;
      renderCards(kind);
      announce(labels[kind][0] + ' confirmed as ' + value);
    };
    for (const item of values) {
      options.append(button('Confirm ' + item.value, () => commit(item.value, 'caption')));
    }
    article.append(options);
    if (!card.decision) {
      article.append(button('Ask the speaker ↗', () => showQuestion(kind, values), 'ask'));
    }
    const form = element('form');
    const input = element('input');
    input.id = 'edit-' + kind;
    input.maxLength = 80;
    if (focusKind !== kind) input.value = drafts.get(input.id) ?? '';
    input.required = true;
    input.placeholder = 'Ask, then enter the verified detail';
    const label = element('label', 'Correct with speaker');
    label.htmlFor = input.id;
    const submit = element('button', 'Confirm correction');
    form.append(label, input, submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      commit(input.value, 'manual');
    });
    const correction = element('details', '', 'correction');
    correction.open = focusKind !== kind && openPanels.has(kind + '/correction');
    correction.append(element('summary', 'Enter a correction'), form);
    article.append(correction);
    cards.append(article);
    if (focusKind === kind) {
      heading.tabIndex = -1;
      heading.focus();
    } else if (!focusKind && activeKind === kind) {
      const target = selection ? input : [...article.querySelectorAll('summary,button')].find(node => node.textContent === activeLabel);
      target?.focus({ preventScroll: true });
      if (selection) input.setSelectionRange(...selection);
    }
  }
}

function add(raw, source, confidence) {
  const value = raw.trim().slice(0, 500);
  if (!value) return;
  if (session.turns.length >= 200) {
    audio.stopMic();
    announce('Session limit reached. Clear the session to continue.');
    $('hint').textContent = 'Session limit reached. Clear the session to continue.';
    return;
  }
  capture(session, { id: session.turns.length + 1, text: value, source, confidence });
  renderFeed();
  renderCards();
  announce(source + ': ' + value);
}

function reset() {
  audio.stop();
  session = createSession();
  sample = null;
  shared = null;
  $('input').value = '';
  $('interim').textContent = '';
  $('mode').textContent = 'READY';
  $('scene').textContent = 'Conversation workspace';
  $('hint').textContent = 'Start with the demo, microphone or typed input.';
  $('demo').textContent = '▷  Run guided demo';
  renderFeed();
  renderCards();
}

$('clear').onclick = () => {
  if (session.turns.length && !window.confirm('Clear all conversation turns and confirmed details?')) return;
  reset();
  announce('Session cleared.');
};
$('demo').onclick = () => {
  const selected = $('scenario').value;
  const scenario = scenarios[selected];
  if (!sample || sample.key !== selected || sample.index >= scenario.turns.length) {
    if (session.turns.length && !window.confirm('Start a fresh sample session and clear the current conversation?')) return;
    reset();
    sample = { key: selected, index: 0 };
    $('mode').textContent = 'SAMPLE DATA';
    $('scene').textContent = scenario.title + ' · fictional';
  }
  add(...scenario.turns[sample.index]);
  sample.index += 1;
  $('demo').textContent = sample.index < scenario.turns.length ? 'Next sample turn →' : '↻ Replay demo';
  $('hint').textContent = [
    'Turn 1 of 3 · See the detected appointment details.',
    'Turn 2 of 3 · Open the highlighted card and compare the source turns.',
    'Turn 3 of 3 · Confirm the details with your partner, then open the recap.',
  ][sample.index - 1];
};
$('scenario').onchange = () => {
  const selected = scenarios[$('scenario').value];
  if (sample?.key !== $('scenario').value) $('demo').textContent = '▷  Run guided demo';
  else $('demo').textContent = sample.index < selected.turns.length ? 'Next sample turn →' : '↻ Replay demo';
};
$('entry').onsubmit = event => {
  event.preventDefault();
  if (sample !== null) $('mode').textContent = 'SAMPLE + INPUT';
  add($('input').value, 'Typed', null);
  $('input').value = '';
};
$('size').onclick = () => {
  const enabled = $('feed').classList.toggle('large');
  $('interim').classList.toggle('large', enabled);
  $('size').setAttribute('aria-pressed', String(enabled));
};
$('privacy').onclick = () => {
  $('preview-status').textContent = '';
  $('settings').showModal();
};
$('settings').addEventListener('close', () => audio.stopVoice());
document.querySelectorAll('[data-close]').forEach(node => {
  node.onclick = () => node.closest('dialog').close();
});

function renderPhrase() {
  $('phrase-text').replaceChildren(...phrases[$('phrase').value].map((text, index) => {
    const line = element('span', text);
    line.lang = index ? 'zh-CN' : 'en';
    return line;
  }));
}
$('phrase').onchange = renderPhrase;

function showShared(title, nodes, details) {
  // Freeze the displayed recap so a background recognition event cannot change what is spoken or exported.
  audio.stopMic();
  $('display-title').textContent = title;
  $('display-body').replaceChildren(...nodes);
  $('download').hidden = !details;
  $('answer').hidden = !shared.kind;
  $('speak').disabled = !shared.en;
  $('speak-zh').disabled = !shared.zh;
  $('voice-status').textContent = '';
  $('display').showModal();
}
function showQuestion(kind, candidates) {
  shared = { ...repairPrompt(kind, candidates), kind };
  const translation = element('p', shared.zh, 'shared-translation');
  translation.lang = 'zh-CN';
  const context = element('small', 'Caption candidates / 字幕候选');
  const values = element('ul', '', 'shared-candidates');
  values.append(...shared.candidates.map(value => element('li', value)));
  showShared('Check with the speaker / 请对方确认', [element('p', shared.en), translation, context, values], false);
}

$('answer').onclick = () => {
  const input = $('edit-' + shared.kind);
  $('display').close();
  input.closest('details').open = true;
  input.focus();
};

$('show').onclick = () => {
  const [en, zh] = phrases[$('phrase').value];
  shared = { en, zh };
  const translation = element('p', zh);
  translation.lang = 'zh-CN';
  showShared('Repair phrase / 沟通提示', [element('p', en), translation], false);
};
$('recap').onclick = () => {
  const decisions = recap(session);
  const omitted = Object.keys(session.cards).length - decisions.length;
  const missing = Object.keys(labels).filter(kind => !session.cards[kind]).map(kind => labels[kind][0]);
  const isSample = sample !== null;
  shared = {
    en: decisions.length ? englishRecap(decisions, isSample) : '',
    zh: '', decisions, isSample,
  };
  const nodes = decisions.map(({ kind, value }) => element('p', labels[kind][0] + ' / ' + labels[kind][1] + ' · ' + value));
  nodes.push(element('small', (isSample ? 'Fictional sample session. ' : '') + (decisions.length ? '' : 'No confirmed details yet. ') + omitted + ' unresolved detail(s) omitted.'));
  if (missing.length) nodes.push(element('small', 'Not captured: ' + missing.join(' · ')));
  showShared('Confirmed recap / 已确认', nodes, decisions.length > 0);
};
$('display').addEventListener('close', () => audio.stopVoice());
$('speak').onclick = () => audio.speak(shared.en, 'en-US');
$('speak-zh').onclick = () => audio.speak(shared.zh, 'zh-CN');
$('download').onclick = () => {
  const payload = JSON.stringify({ sample: shared.isSample, confirmed: shared.decisions }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const link = element('a');
  link.href = url;
  link.download = 'hearbridge-confirmed.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
window.addEventListener('pagehide', () => audio.stop());
renderPhrase();
renderFeed();
renderCards();
