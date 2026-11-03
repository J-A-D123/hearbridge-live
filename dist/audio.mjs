const noveltyVoice = /^(?:albert|bad news|bahh|bells|boing|bubbles|cellos|fred|good news|jester|junior|organ|superstar|trinoids|whisper|wobble|zarvox)(?:$|\s)/i;
const narrationVoice = /^(?:samantha|ava|allison|susan|joelle|tom|alex|daniel|serena|karen|moira|tessa|zira|jenny|guy)(?:$|\s|\()/i;

export function englishVoices(voices) {
  const rank = voice => {
    if (noveltyVoice.test(voice.name)) return -100;
    return (/premium|enhanced|natural|neural/i.test(voice.name + ' ' + voice.voiceURI) ? 40 : 0)
      + (narrationVoice.test(voice.name) ? 20 : 0)
      + (voice.lang.toLowerCase() === 'en-us' ? 10 : 0)
      + (voice.default ? 1 : 0);
  };
  return voices.filter(voice => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang))
    .sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
}

export function createAudio($, events) {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  let recognition = null;
  let room = null;
  let roomRequest = 0;
  let frame = 0;
  let voiceGeneration = 0;
  let preparing = false;

  function micState(active, message) {
    $('mic').textContent = active ? 'Stop mic' : 'Start mic';
    $('mic').setAttribute('aria-pressed', String(active));
    $('mic-note').textContent = message;
  }

  function stopMic(message = 'Microphone off') {
    const previous = recognition;
    recognition = null;
    if (previous) {
      try { previous.abort(); } catch { /* Already closed by the browser. */ }
    }
    events.interim('');
    micState(false, message);
  }

  const localSupport = () => Recognition && 'processLocally' in Recognition.prototype && Recognition.available;

  $('mic').onclick = async () => {
    if (recognition) return stopMic();
    if (!Recognition) return stopMic('Speech recognition unavailable in this browser. Use typed input or try Chrome.');
    if (!window.isSecureContext) return stopMic('Open over HTTPS or localhost to use the microphone.');
    const local = $('engine').value === 'local';
    if (local && !localSupport()) return stopMic('On-device recognition unavailable. See Privacy & audio or use typed input.');
    stopVoice();
    const active = new Recognition();
    recognition = active;
    const lang = $('language').value;
    micState(true, local ? 'Checking on-device speech support…' : 'Requesting browser-service microphone…');
    active.lang = lang;
    active.interimResults = true;
    active.continuous = true;
    if (local) active.processLocally = true;
    active.onstart = () => {
      if (recognition === active) micState(true, local ? 'Listening · on-device' : 'Listening · browser service may send audio');
    };
    active.onresult = event => {
      if (recognition !== active) return;
      const pending = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) events.final(result[0].transcript, result[0].confidence);
        else pending.push(result[0].transcript);
      }
      if (recognition === active) events.interim(pending.join(' '));
    };
    active.onerror = event => {
      if (recognition === active) stopMic('Speech stopped (' + event.error + '). Check permissions or use typed input.');
    };
    active.onend = () => {
      if (recognition === active) stopMic('Speech session ended. Start mic again to continue.');
    };
    try {
      if (local) {
        const status = await Recognition.available({ langs: [lang], processLocally: true });
        if (recognition !== active) return;
        if (status !== 'available') return stopMic('Local language pack unavailable or missing. Open Privacy & audio to prepare it.');
      }
      active.start();
    } catch {
      if (recognition === active) stopMic('Could not start speech recognition. Check browser permissions or use typed input.');
    }
  };

  $('pack').onclick = async () => {
    if (preparing) return;
    const status = $('pack-status');
    if (!localSupport() || !Recognition.install) {
      status.textContent = 'This browser does not expose on-device language pack installation.';
      return;
    }
    const options = { langs: [$('language').value], processLocally: true };
    const lang = options.langs[0];
    preparing = true;
    $('pack').disabled = true;
    status.textContent = 'Checking ' + lang + '…';
    try {
      const availability = await Recognition.available(options);
      if (availability === 'unavailable') {
        status.textContent = lang + ' is unavailable on this browser or device.';
        return;
      }
      const ready = availability === 'available' || await Recognition.install(options);
      status.textContent = ready ? lang + ' is ready for local speech.' : 'The browser could not prepare ' + lang + '.';
    } catch {
      status.textContent = 'Language pack setup failed. Check browser support and network access.';
    } finally {
      preparing = false;
      $('pack').disabled = false;
    }
  };
  $('engine').onchange = () => stopMic('Microphone off · ' + ($('engine').value === 'local' ? 'on-device mode' : 'browser service selected'));
  $('language').onchange = () => stopMic('Language changed. Start mic to use it.');

  function roomState(active, message) {
    $('room').setAttribute('aria-pressed', String(active));
    $('room').textContent = active ? 'Stop level meter' : 'Enable level meter';
    $('room-note').textContent = message;
  }

  function stopRoom() {
    roomRequest += 1;
    cancelAnimationFrame(frame);
    if (room) {
      room.stream.getTracks().forEach(track => track.stop());
      room.context.close().catch(() => {});
      room = null;
    }
    $('meter').value = 0;
    roomState(false, 'Meter off');
  }

  $('room').onclick = async () => {
    if ($('room').getAttribute('aria-pressed') === 'true') return stopRoom();
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      roomState(false, 'Audio meter requires HTTPS or localhost and a compatible browser.');
      return;
    }
    const request = ++roomRequest;
    let stream;
    let context;
    roomState(true, 'Requesting microphone permission…');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false },
      });
      if (request !== roomRequest) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      context = new AudioContext();
      room = { stream, context };
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      await context.resume();
      if (request !== roomRequest) return;
      const samples = new Float32Array(analyser.fftSize);
      let smoothed = 0;
      let state = '';
      function update() {
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        const level = Math.min(100, Math.max(0, (20 * Math.log10(Math.max(rms, 0.0001)) + 60) * 100 / 60));
        smoothed += (level - smoothed) * 0.12;
        $('meter').value = smoothed;
        const next = smoothed > 72 ? 'High activity' : smoothed > 34 ? 'Activity detected' : 'Low activity';
        if (next !== state) {
          state = next;
          $('room-note').textContent = state + ' · relative level';
        }
        frame = requestAnimationFrame(update);
      }
      stream.getTracks().forEach(track => track.onended = () => {
        if (request === roomRequest) stopRoom();
      });
      update();
    } catch {
      if (request !== roomRequest) return;
      if (stream && !room) stream.getTracks().forEach(track => track.stop());
      stopRoom();
      roomState(false, 'Meter unavailable. Check microphone permission or device settings.');
    }
  };

  function stopVoice() {
    voiceGeneration += 1;
    window.speechSynthesis?.cancel();
  }
  function speak(text, lang, status = $('voice-status')) {
    stopMic();
    stopVoice();
    const generation = voiceGeneration;
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const isEnglish = lang === 'en-US';
    const ranked = isEnglish ? englishVoices(voices) : [];
    const voice = isEnglish
      ? ranked.find(item => item.voiceURI === $('english-voice').value)
        ?? ranked.find(item => !noveltyVoice.test(item.name))
      : voices.find(item => item.localService && /^zh(?:[-_]|$)/i.test(item.lang));
    if (!voice) {
      status.textContent = 'No matching local voice is available. Use the displayed text or install a system voice.';
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = isEnglish ? Number($('english-pace').value) || 0.95 : 0.9;
    utterance.onend = () => { if (generation === voiceGeneration) status.textContent = 'Finished speaking.'; };
    utterance.onerror = () => { if (generation === voiceGeneration) status.textContent = 'Could not use the local voice.'; };
    status.textContent = 'Speaking with ' + voice.name + '…';
    window.speechSynthesis.speak(utterance);
  }
  function refreshEnglishVoices() {
    const select = $('english-voice');
    const previous = select.value;
    const ranked = englishVoices(window.speechSynthesis?.getVoices() ?? []);
    const preferred = ranked.find(voice => !noveltyVoice.test(voice.name));
    const automatic = preferred ? 'Automatic · ' + preferred.name : 'Automatic · no standard local voice found';
    select.replaceChildren(new Option(automatic, ''), ...ranked.map(voice =>
      new Option(voice.name + ' · ' + voice.lang, voice.voiceURI)));
    if (ranked.some(voice => voice.voiceURI === previous)) select.value = previous;
  }

  $('preview-voice').onclick = () => speak(
    'Could you confirm the room number? The appointment is at three thirty P M, in room two, four, zero.',
    'en-US', $('preview-status'),
  );
  if (window.speechSynthesis) {
    refreshEnglishVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshEnglishVoices);
  }
  return { stopMic, speak, stopVoice, stop() { stopMic(); stopRoom(); stopVoice(); } };
}
