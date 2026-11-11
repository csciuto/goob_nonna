/**
 * Every panel control that shapes the sound, by name. One table serves three jobs: sending the
 * panel's settings to the engine when the audio starts, loading a preset, and reading or writing
 * the settings in a share link.
 *
 * Each entry has get(), set(value) (moves the control, which tells the engine) and send() (tells the
 * engine the current value again).
 */
export function buildControls(layout) {
  const p = layout.panels;
  const knob = c => ({
    get: () => Math.round(c.value * 100) / 100,
    set: v => { if (Number.isFinite(v)) c.setValue(v); },
    send: () => { if (c.onChange) c.onChange(c.value); },
  });
  const sw = c => ({
    get: () => c.getValue(),
    set: v => { const i = c.positions.findIndex(x => x.value === v); if (i >= 0) c.setIndex(i); },
    send: () => { if (c.onChange) c.onChange(c.getValue(), c.selectedIndex); },
  });
  const sync = {
    get: () => p.oscillators.getSync(),
    set: v => p.oscillators.setSync(v === true),
    send: () => p.oscillators.setSync(p.oscillators.getSync()),
  };
  return {
    osc1Waveform: sw(p.oscillators.osc1Waveform), osc1Octave: sw(p.oscillators.osc1Octave),
    osc2Waveform: sw(p.oscillators.osc2Waveform), osc2Octave: sw(p.oscillators.osc2Octave),
    osc2Detune: knob(p.oscillators.osc2Freq), osc2Sync: sync,
    osc1Level: knob(p.mixer.osc1Level), osc2Level: knob(p.mixer.osc2Level), noiseLevel: knob(p.mixer.noiseLevel),
    cutoff: knob(p.filter.cutoff), resonance: knob(p.filter.resonance), envAmt: knob(p.filter.envAmt), kbTrack: sw(p.filter.kbTrack),
    attack: knob(p.envelope.attack), decay: knob(p.envelope.decay), sustain: knob(p.envelope.sustain), release: knob(p.envelope.release),
    vcaMode: sw(p.output.vcaMode), volume: knob(p.output.volume), reverbMix: knob(p.output.reverbMix),
    lfoRate: knob(p.modulation.lfoRate), lfoWaveform: sw(p.modulation.lfoWaveform),
    pitchAmt: knob(p.modulation.pitchAmt), cutoffAmt: knob(p.modulation.cutoffAmt), pwAmt: knob(p.modulation.pwAmt),
    modWheel: knob(p.controller.modWheel),
    highPass: knob(p.utilities.hpfCutoff), attenuator: knob(p.utilities.attenAmount),
    glide: knob(layout.glideKnob),
    arpRate: knob(p.arpSeq.rate), arpDirection: sw(p.arpSeq.direction), arpOctave: sw(p.arpSeq.octSeq),
  };
}

export const readState = controls => Object.fromEntries(Object.entries(controls).map(([k, c]) => [k, c.get()]));

/** Set every control: from `state` where it has a value, otherwise from `defaults`. */
export function applyState(controls, state, defaults) {
  for (const [k, c] of Object.entries(controls)) c.set(state && state[k] !== undefined ? state[k] : defaults[k]);
}

export const sendAll = controls => { for (const c of Object.values(controls)) c.send(); };

// ── Share links ─────────────────────────────────────────────────────────────────────────────────

const b64 = {
  to: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  from: s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))),
};

/**
 * A patch as link text: only the settings that differ from the defaults, plus the cables.
 * @param cables [[sourceJackId, destJackId], ...]
 * @returns '' for the default patch with no cables
 */
export function encodePatch(state, defaults, cables) {
  const k = {};
  for (const [name, v] of Object.entries(state)) if (v !== defaults[name]) k[name] = v;
  if (!Object.keys(k).length && !cables.length) return '';
  return b64.to(JSON.stringify({ v: 1, k, c: cables }));
}

/**
 * Read link text back. Anything unknown or malformed is dropped: a link is typed by strangers.
 * @returns { state, cables } or null
 */
export function decodePatch(text, defaults, isJack = () => true) {
  let raw;
  try { raw = JSON.parse(b64.from(text)); } catch (e) { return null; }
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
  const state = {};
  for (const [name, v] of Object.entries(raw.k && typeof raw.k === 'object' ? raw.k : {})) {
    if (!(name in defaults)) continue;
    const want = typeof defaults[name];
    if (typeof v === want && (want !== 'number' || Number.isFinite(v))) state[name] = v;
  }
  const cables = (Array.isArray(raw.c) ? raw.c : [])
    .filter(c => Array.isArray(c) && c.length === 2 && c.every(id => typeof id === 'string' && isJack(id)))
    .slice(0, 24).map(([a, b]) => [a, b]);
  return { state, cables };
}
