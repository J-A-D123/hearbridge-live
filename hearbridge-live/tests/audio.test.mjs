import assert from 'node:assert/strict';
import test from 'node:test';
import { createAudio, englishVoices } from '../dist/audio.mjs';

function setup(available) {
  const controls = new Map();
  const get = id => {
    if (!controls.has(id)) controls.set(id, {
      attributes: new Map(),
      setAttribute(name, value) { this.attributes.set(name, value); },
      getAttribute(name) { return this.attributes.get(name); },
    });
    return controls.get(id);
  };
  get('engine').value = 'local';
  get('language').value = 'en-US';
  const output = [];
  const instances = [];
  class Recognition {
    static available = available;
    get processLocally() { return this.local; }
    set processLocally(value) { this.local = value; }
    constructor() { instances.push(this); }
    start() { this.started = true; this.onstart(); }
    abort() { this.aborted = true; this.onend(); }
  }
  globalThis.window = { SpeechRecognition: Recognition, isSecureContext: true };
  const audio = createAudio(get, {
    interim: value => output.push(['interim', value]),
    final: (value, signal) => output.push(['final', value, signal]),
  });
  return { get, instances, audio, output };
}

test('on-device mode requires a ready language pack and never silently falls back', async () => {
  const { get, instances } = setup(async options => {
    assert.deepEqual(options, { langs: ['en-US'], processLocally: true });
    return 'downloadable';
  });
  await get('mic').onclick();
  assert.equal(instances[0].started, undefined);
  assert.match(get('mic-note').textContent, /pack unavailable or missing/);
  assert.equal(get('mic').getAttribute('aria-pressed'), 'false');
});

test('on-device capture forwards real API result shape and ignores callbacks after stop', async () => {
  const { get, instances, audio, output } = setup(async () => 'available');
  await get('mic').onclick();
  const active = instances[0];
  assert.equal(active.local, true);
  assert.equal(active.started, true);
  const interim = [{ transcript: 'room' }];
  const final = [{ transcript: 'room 240', confidence: 0.75 }];
  final.isFinal = true;
  active.onresult({ resultIndex: 0, results: [interim] });
  active.onresult({ resultIndex: 0, results: [final] });
  audio.stopMic();
  active.onresult({ resultIndex: 0, results: [final] });
  assert.deepEqual(output, [['interim', 'room'], ['final', 'room 240', 0.75], ['interim', ''], ['interim', '']]);
  assert.equal(active.aborted, true);
});

test('cancelling a pending start prevents the microphone from starting later', async () => {
  let ready;
  const { get, instances } = setup(() => new Promise(resolve => { ready = resolve; }));
  const pending = get('mic').onclick();
  await get('mic').onclick();
  ready('available');
  await pending;
  assert.equal(instances[0].started, undefined);
  assert.equal(get('mic').getAttribute('aria-pressed'), 'false');
});

test('English playback ranks local narration ahead of novelty voices and excludes remote speech', () => {
  const voices = [
    { name: 'Albert', lang: 'en-US', localService: true, default: true },
    { name: 'Samantha', lang: 'en-US', localService: true },
    { name: 'Remote Natural', lang: 'en-US', localService: false },
    { name: 'Daniel (Enhanced)', lang: 'en-GB', localService: true },
    { name: 'Tingting', lang: 'zh-CN', localService: true },
  ];
  assert.deepEqual(englishVoices(voices).map(voice => voice.name), ['Daniel (Enhanced)', 'Samantha', 'Albert']);
});

test('voice preview uses the selected installed voice and pace with fixed sample text', () => {
  const { get } = setup(async () => 'available');
  const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'samantha', localService: true };
  let utterance;
  globalThis.Option = class { constructor(text, value) { Object.assign(this, { text, value }); } };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  window.speechSynthesis = {
    getVoices: () => [voice], addEventListener() {}, cancel() {},
    speak: value => { utterance = value; },
  };
  get('english-voice').replaceChildren = () => {};
  createAudio(get, { interim() {}, final() {} });
  get('english-voice').value = voice.voiceURI;
  get('english-pace').value = '0.82';
  get('preview-voice').onclick();
  assert.equal(utterance.voice, voice);
  assert.equal(utterance.rate, 0.82);
  assert.match(utterance.text, /room two, four, zero/);
  utterance.onend();
  assert.equal(get('preview-status').textContent, 'Finished speaking.');
  delete globalThis.Option;
  delete globalThis.SpeechSynthesisUtterance;
});
