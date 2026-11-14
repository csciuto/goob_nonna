import { OscillatorModule, PW_PER_UNIT } from './modules/oscillator.js';
import { NoiseModule } from './modules/noise.js';
import { MixerModule } from './modules/mixer.js';
import { FilterModule } from './modules/filter.js';
import { EnvelopeModule, ENV_VOLTS } from './modules/envelope.js';
import { VCAModule } from './modules/vca.js';
import { LFOModule } from './modules/lfo.js';
import { ReverbModule } from './modules/reverb.js';
import { HighPassFilterModule } from './modules/high-pass-filter.js';
import { AttenuatorModule } from './modules/attenuator.js';
import { SignalBus } from './routing/signal-bus.js';
import { PatchManager } from './routing/patch-manager.js';
import { GlideTracker } from './glide.js';
import { ArpSeqController } from '../arp-seq/arp-seq-controller.js';
import { PATCH_POINTS, JACK_TYPE, VCA_MODES, PITCH_WHEEL_RANGE, KEYBOARD_START_NOTE } from '../utils/constants.js';
import { mapToLogRange } from '../utils/math.js';

/** Most the mod wheel can bend pitch with PITCH AMT at full: one octave each way. Model value. The knob is
 *  squared (gentle at the bottom, like an audio-taper pot), so a knob just off zero is a light vibrato. */
export const LFO_PITCH_OCTAVES = 1;
/** Most it can move the cutoff with CUTOFF AMT at full: the LFO's 5 V at 1 V per octave. Model value. */
export const LFO_CUTOFF_OCTAVES = 5;
/** How long the gate drops between two notes so the envelope starts again. */
const RETRIGGER_GAP = 0.003;
const SMOOTH = 0.012;

/** Output stage: clean up to about 70% of full scale, then an increasingly soft ceiling at 1. */
export function softLimit(x) {
  const a = Math.abs(x), knee = 0.7;
  if (a <= knee) return x;
  return Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
}

/**
 * Main audio engine: creates every module, registers the patch points, makes the normalled
 * connections and the ones the hardware makes without a jack, and gives the panel one API.
 *
 * Signals between modules are in units of 5 volts (see worklets.js). Pitch travels as a signal too:
 * `_pitch` holds the keyboard's note in octaves above C4 and feeds both oscillators and the filter's
 * keyboard tracking, so glide and the arpeggiator move all three together.
 */
export class AudioEngine {
  /** Loads the worklet processors, then builds the engine. */
  static async create(audioContext, options) {
    await audioContext.audioWorklet.addModule(new URL('./worklets.js', import.meta.url).href);
    return new AudioEngine(audioContext, options);
  }

  /** @param options.driftCents oscillator pitch drift; 0 for tests that measure pitch exactly */
  constructor(audioContext, { driftCents = 2.5 } = {}) {
    this.ctx = audioContext;
    this.signalBus = new SignalBus();
    this.patchManager = new PatchManager(this.signalBus);

    this._currentNote = null;
    this._heldNotes = [];
    this._vcaMode = VCA_MODES.ENV;
    this._modWheel = 0;
    this._pitchAmt = 0;
    this._cutoffAmt = 0;
    this._pwAmt = 0;
    this._glide = 0;            // knob value, 0 to 10
    this._legatoGlide = false;
    this._gateHigh = false;
    this._gateOffAt = -1;

    this.osc1 = new OscillatorModule(this.ctx, 'osc1', { driftCents, seed: 101 });
    this.osc2 = new OscillatorModule(this.ctx, 'osc2', { driftCents, seed: 202 });
    this.noise = new NoiseModule(this.ctx);
    this.mixer = new MixerModule(this.ctx);
    this.filter = new FilterModule(this.ctx);
    this.envelope = new EnvelopeModule(this.ctx);
    this.vca = new VCAModule(this.ctx);
    this.lfo = new LFOModule(this.ctx);
    this.reverb = new ReverbModule(this.ctx);
    this.hpf = new HighPassFilterModule(this.ctx);
    this.attenuator = new AttenuatorModule(this.ctx);

    this._createKeyboardSignals();
    this._createClockJacks();
    this._wireInternal();
    this._registerPatchPoints();
    this.patchManager.establishNormalledConnections();
    this._setupModulation();

    // Output: reverb -> VOLUME -> soft limiter -> speakers
    this.volume = this.ctx.createGain();
    this.volume.gain.value = 0.7;
    this.limiter = this.ctx.createWaveShaper();
    this.limiter.curve = Float32Array.from({ length: 2049 }, (_, i) => softLimit(i / 1024 - 1));
    this.limiter.oversample = '2x';
    this.reverb.output.connect(this.volume);
    this.volume.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    this.arpSeq = new ArpSeqController(this.ctx);
    this.arpSeq.onNoteOn = (note, vel) => this.noteOn(note, vel);
    this.arpSeq.onNoteOff = (note) => this.noteOff(note);
    this.arpSeq.onClock = () => this._clockPulse();
  }

  // ── Wiring ─────────────────────────────────────────────────────────────

  _constant(value) {
    const src = this.ctx.createConstantSource();
    src.offset.value = value;
    src.start();
    (this._sources ||= []).push(src);
    return src;
  }

  _createKeyboardSignals() {
    // Pitch, in octaves above C4
    this._pitch = this._constant(0);
    this._glideTracker = new GlideTracker(0);

    // KB OUT: 1 V per octave, 0 V at the lowest key of the unshifted keyboard (model value)
    this._kbPitchOutput = this.ctx.createGain();
    const perOctave = this.ctx.createGain();
    perOctave.gain.value = 1 / 5;
    this._pitch.connect(perOctave);
    perOctave.connect(this._kbPitchOutput);
    this._constant((60 - KEYBOARD_START_NOTE) / 12 / 5).connect(this._kbPitchOutput);

    // GATE OUT: +8 V while a note is held
    this._gate = this._constant(0);
    this._kbGateOutput = this.ctx.createGain();
    this._gate.connect(this._kbGateOutput);

    // KB VEL OUT: 0 to +5 V
    this._vel = this._constant(0);
    this._kbVelOutput = this.ctx.createGain();
    this._vel.connect(this._kbVelOutput);
  }

  _createClockJacks() {
    // CLOCK OUT: a short +5 V pulse on every arpeggiator / sequencer step
    this._clock = this._constant(0);
    this._clockOutput = this.ctx.createGain();
    this._clock.connect(this._clockOutput);

    // CLOCK IN, ON/OFF IN, RESET IN: a worklet reports their edges
    this._clockIn = this.ctx.createGain();
    this._onOffIn = this.ctx.createGain();
    this._resetIn = this.ctx.createGain();
    this._edges = new AudioWorkletNode(this.ctx, 'gn-edge', { numberOfInputs: 3, numberOfOutputs: 1, outputChannelCount: [1] });
    this._clockIn.connect(this._edges, 0, 0);
    this._onOffIn.connect(this._edges, 0, 1);
    this._resetIn.connect(this._edges, 0, 2);
    const keepAlive = this.ctx.createGain();      // a node is only run while it leads to the output
    keepAlive.gain.value = 0;
    this._edges.connect(keepAlive);
    keepAlive.connect(this.ctx.destination);
    this._edges.port.onmessage = ({ data }) => {
      if (data.input === 0 && data.up) this.arpSeq.externalClockTick();
      if (data.input === 1) this.arpSeq.externalRun(data.up);
      if (data.input === 2 && data.up) this.arpSeq.externalReset();
    };
  }

  /** Connections the hardware makes with no jack in between, so no cable can break them. */
  _wireInternal() {
    for (const osc of [this.osc1, this.osc2]) this._pitch.connect(osc.pitch);
    this._pitch.connect(this.filter.kbInput);
    this.envelope.level.connect(this.filter.envInput);
    this.envelope.level.connect(this.vca.envInput);
    this.envelope.kbRelease.connect(this.vca.kbReleaseInput);
    this.osc1.node.connect(this.osc2.syncInput);          // used only while SYNC is lit
  }

  _registerPatchPoints() {
    const bus = this.signalBus;
    const OUT = JACK_TYPE.OUTPUT, IN = JACK_TYPE.INPUT, BOTH = JACK_TYPE.BOTH, PP = PATCH_POINTS;

    // Arp / seq
    bus.register(PP.KB_PITCH_CV, { type: OUT, node: this._kbPitchOutput, label: 'KB OUT', module: 'keyboard' });
    bus.register(PP.KB_GATE, { type: OUT, node: this._kbGateOutput, label: 'GATE OUT', module: 'keyboard' });
    bus.register(PP.KB_VEL, { type: OUT, node: this._kbVelOutput, label: 'KB VEL OUT', module: 'keyboard' });
    bus.register(PP.CLOCK_OUT, { type: OUT, node: this._clockOutput, label: 'CLOCK OUT', module: 'arpSeq' });
    bus.register(PP.CLOCK_IN, { type: IN, node: this._clockIn, label: 'CLOCK IN', module: 'arpSeq', onPatch: on => this.arpSeq.setExternalClock(on) });
    bus.register(PP.ON_OFF_IN, { type: IN, node: this._onOffIn, label: 'ON/OFF IN', module: 'arpSeq' });
    bus.register(PP.RESET_IN, { type: IN, node: this._resetIn, label: 'RESET IN', module: 'arpSeq' });

    // Oscillators
    bus.register(PP.OSC1_WAVE_OUT, { type: OUT, node: this.osc1.output, label: 'OSC 1 WAVE OUT', module: 'osc1' });
    bus.register(PP.OSC2_WAVE_OUT, { type: OUT, node: this.osc2.output, label: 'OSC 2 WAVE OUT', module: 'osc2' });
    bus.register(PP.OSC1_PITCH_IN, { type: IN, node: this.osc1.pitchInput, label: 'OSC 1 PITCH IN', module: 'osc1' });
    bus.register(PP.OSC1_PWM_IN, { type: IN, node: this.osc1.pwmInput, label: 'OSC 1 PWM IN', module: 'osc1' });
    bus.register(PP.OSC2_PITCH_IN, { type: IN, node: this.osc2.pitchInput, label: 'OSC 2 PITCH IN', module: 'osc2' });
    bus.register(PP.OSC2_LIN_FM_IN, { type: IN, node: this.osc2.linFmInput, label: 'OSC 2 LIN FM IN', module: 'osc2' });

    // Noise has no jack of its own; it is the mixer's NOISE IN normal
    bus.register(PP.NOISE_OUT, { type: OUT, node: this.noise.output, label: 'NOISE', module: 'noise' });

    // Mixer
    bus.register(PP.MIXER_OSC1_IN, { type: IN, node: this.mixer.osc1Input, normalledFrom: PP.OSC1_WAVE_OUT, label: 'OSC 1 IN', module: 'mixer' });
    bus.register(PP.MIXER_OSC2_IN, { type: IN, node: this.mixer.osc2Input, normalledFrom: PP.OSC2_WAVE_OUT, label: 'OSC 2 IN', module: 'mixer' });
    bus.register(PP.MIXER_NOISE_IN, { type: IN, node: this.mixer.noiseInput, normalledFrom: PP.NOISE_OUT, label: 'NOISE IN', module: 'mixer' });
    bus.register(PP.MIXER_OUT, { type: OUT, node: this.mixer.output, label: 'MIXER OUTPUT', module: 'mixer' });

    // Filter
    bus.register(PP.FILTER_IN, { type: IN, node: this.filter.input, normalledFrom: PP.MIXER_OUT, label: 'FILTER INPUT', module: 'filter' });
    bus.register(PP.FILTER_OUT, { type: OUT, node: this.filter.output, label: 'FILTER OUTPUT', module: 'filter' });
    bus.register(PP.CUTOFF_IN, { type: IN, node: this.filter.cutoffInput, label: 'CUTOFF IN', module: 'filter' });
    bus.register(PP.ENV_AMT_IN, { type: IN, node: this.filter.envAmtInput, label: 'ENV AMT IN', module: 'filter' });

    // Envelope
    bus.register(PP.ENV_GATE_IN, { type: IN, node: this.envelope.gateInput, normalledFrom: PP.KB_GATE, label: 'TRIGGER IN', module: 'envelope' });
    bus.register(PP.ENV_OUT, { type: OUT, node: this.envelope.output, label: '+ENV OUT', module: 'envelope' });
    bus.register(PP.ENV_NEG_OUT, { type: OUT, node: this.envelope.negOutput, label: '-ENV OUT', module: 'envelope' });

    // Output
    bus.register(PP.VCA_IN, { type: IN, node: this.vca.input, normalledFrom: PP.FILTER_OUT, label: 'VCA IN', module: 'vca' });
    bus.register(PP.VCA_CV_IN, { type: IN, node: this.vca.cvInput, label: 'VCA AMT IN', module: 'vca', onPatch: on => this.vca.setCvPatched(on) });
    bus.register(PP.VCA_OUT, { type: OUT, node: this.vca.output, label: 'VCA', module: 'vca' });      // REVERB IN's normal
    bus.register(PP.REVERB_IN, { type: IN, node: this.reverb.input, normalledFrom: PP.VCA_OUT, label: 'REVERB IN', module: 'reverb' });

    // Modulation
    bus.register(PP.LFO_WAVE_OUT, { type: OUT, node: this.lfo.output, label: 'WAVE OUT', module: 'lfo' });
    bus.register(PP.LFO_SH_OUT, { type: OUT, node: this.lfo.shOutput, label: 'S/H OUT', module: 'lfo' });
    bus.register(PP.LFO_RATE_IN, { type: IN, node: this.lfo.rateInput, label: 'RATE IN', module: 'lfo' });
    bus.register(PP.LFO_SYNC_IN, { type: IN, node: this.lfo.syncInput, label: 'SYNC IN', module: 'lfo' });

    // Utilities
    bus.register(PP.HPF_IN, { type: IN, node: this.hpf.input, label: 'HIGH PASS INPUT', module: 'hpf' });
    bus.register(PP.HPF_OUT, { type: OUT, node: this.hpf.output, label: 'HIGH PASS OUTPUT', module: 'hpf' });
    bus.register(PP.ATTEN_DC, { type: OUT, node: this.attenuator.dc, label: '+8 V', module: 'attenuator' });   // ATTENUATOR INPUT's normal
    bus.register(PP.ATTEN_IN, { type: IN, node: this.attenuator.input, normalledFrom: PP.ATTEN_DC, label: 'ATTENUATOR INPUT', module: 'attenuator' });
    bus.register(PP.ATTEN_OUT, { type: OUT, node: this.attenuator.output, label: 'ATTENUATOR OUTPUT', module: 'attenuator' });

    // Mult: four jacks wired together, each usable as an input or an output
    this._multNode = this.ctx.createGain();
    for (const id of [PP.MULT_1, PP.MULT_2, PP.MULT_3, PP.MULT_4]) {
      bus.register(id, { type: BOTH, node: this._multNode, label: 'MULT', module: 'mult' });
    }
  }

  /** The LFO through the mod wheel and the three AMT knobs. */
  _setupModulation() {
    const route = (dests) => {
      const g = this.ctx.createGain();
      g.gain.value = 0;
      this.lfo.output.connect(g);
      for (const d of dests) g.connect(d);
      return g;
    };
    this._pitchModGain = route([this.osc1.pitch, this.osc2.pitch]);
    this._cutoffModGain = route([this.filter.cv]);
    this._pwmModGain = route([this.osc1.pw, this.osc2.pw]);
  }

  _updateModulation() {
    const mod = this._modWheel, t = this.ctx.currentTime;
    this._pitchModGain.gain.setTargetAtTime(mod * this._pitchAmt ** 2 * LFO_PITCH_OCTAVES, t, SMOOTH);
    this._cutoffModGain.gain.setTargetAtTime(mod * this._cutoffAmt * LFO_CUTOFF_OCTAVES, t, SMOOTH);
    this._pwmModGain.gain.setTargetAtTime(mod * this._pwAmt * PW_PER_UNIT, t, SMOOTH);
  }

  _clockPulse() {
    const p = this._clock.offset, t = this.ctx.currentTime;
    p.cancelScheduledValues(t);
    p.setValueAtTime(1, t);
    p.setValueAtTime(0, t + 0.01);
  }

  // ── Notes ──────────────────────────────────────────────────────────────

  /** Decides whether a new note glides and whether it restarts the envelope. Pure; unit-tested. */
  static noteOnPlan({ glideTime, hadPreviousNote, wasHoldingNotes, legatoGlide }) {
    const glide = glideTime > 0 && hadPreviousNote && (!legatoGlide || wasHoldingNotes);
    return { glideTime: glide ? glideTime : 0, retrigger: !(legatoGlide && wasHoldingNotes) };
  }

  noteOn(midiNote, velocity = 1.0) {
    const plan = AudioEngine.noteOnPlan({
      glideTime: this._getGlideTime(),
      hadPreviousNote: this._currentNote !== null,
      wasHoldingNotes: this._heldNotes.length > 0,
      legatoGlide: this._legatoGlide,
    });
    this._currentNote = midiNote;
    this._heldNotes.push(midiNote);

    const now = this.ctx.currentTime;
    this._setPitch(midiNote, plan.glideTime);
    this._vel.offset.setValueAtTime(Math.max(0, Math.min(1, velocity)), now);
    if (plan.retrigger) this._gateOn();
  }

  noteOff(midiNote) {
    this._heldNotes = this._heldNotes.filter(n => n !== midiNote);
    if (this._heldNotes.length > 0) {
      // fall back to the last key still held, without restarting the envelope
      this._currentNote = this._heldNotes[this._heldNotes.length - 1];
      this._setPitch(this._currentNote, this._getGlideTime());
    } else {
      this._gateOff();
    }
  }

  _setPitch(midiNote, glideTime) {
    this._glideTracker.moveTo((midiNote - 60) / 12, this.ctx.currentTime, glideTime, this._pitch.offset);
  }

  _gateOn() {
    const p = this._gate.offset, now = this.ctx.currentTime;
    // a note straight after another: drop the gate briefly so the envelope starts again
    const restart = this._gateHigh || now - this._gateOffAt < RETRIGGER_GAP;
    p.cancelScheduledValues(now);
    if (restart) {
      p.setValueAtTime(0, now);
      p.setValueAtTime(ENV_VOLTS, now + RETRIGGER_GAP);
    } else {
      p.setValueAtTime(ENV_VOLTS, now);
    }
    this._gateHigh = true;
  }

  _gateOff() {
    const p = this._gate.offset, now = this.ctx.currentTime;
    p.cancelScheduledValues(now);
    p.setValueAtTime(0, now);
    this._gateHigh = false;
    this._gateOffAt = now;
  }

  _getGlideTime() {
    // Knob 0-10 → 5ms to 2 seconds, logarithmic
    if (this._glide <= 0) return 0;
    return mapToLogRange(this._glide / 10, 0.005, 2.0);
  }

  // ── Panel API ──────────────────────────────────────────────────────────

  setOsc1Waveform(waveform) { this.osc1.setWaveform(waveform); }
  setOsc1Octave(foot) { this.osc1.setOctave(foot); }
  setOsc1Detune(semitones) { this.osc1.setDetune(semitones); }

  setOsc2Waveform(waveform) { this.osc2.setWaveform(waveform); }
  setOsc2Octave(foot) { this.osc2.setOctave(foot); }
  setOsc2Detune(semitones) { this.osc2.setDetune(semitones); }
  setOsc2Sync(enabled) { this._syncEnabled = enabled; this.osc2.setSync(enabled); }

  setMixerOsc1Level(value) { this.mixer.setOsc1Level(value); }
  setMixerOsc2Level(value) { this.mixer.setOsc2Level(value); }
  setMixerNoiseLevel(value) { this.mixer.setNoiseLevel(value); }

  setFilterCutoff(normalized) { this.filter.setCutoff(normalized); }
  setFilterResonance(value) { this.filter.setResonance(value); }
  setFilterKbTrack(mode) { this.filter.setKbTrack(mode); }
  setFilterEnvAmount(value) { this.filter.setEnvAmount(value); }

  setEnvAttack(value) { this.envelope.setAttack(value); }
  setEnvDecay(value) { this.envelope.setDecay(value); }
  setEnvSustain(value) { this.envelope.setSustain(value); }
  setEnvRelease(value) { this.envelope.setRelease(value); }

  setVCAMode(mode) { this._vcaMode = mode; this.vca.setMode(mode); }
  /** VOLUME knob, 0 to 10. It sits after the reverb. */
  setOutputLevel(value) { this.volume.gain.setTargetAtTime(value / 10, this.ctx.currentTime, SMOOTH); }

  setLFORate(value) { this.lfo.setRate(value); }
  setLFOWaveform(waveform) { this.lfo.setWaveform(waveform); }
  getLFOValue() { return this.lfo.getCurrentValue(); }

  setPitchAmount(normalized) { this._pitchAmt = normalized; this._updateModulation(); }
  setCutoffAmount(normalized) { this._cutoffAmt = normalized; this._updateModulation(); }
  setPWAmount(normalized) { this._pwAmt = normalized; this._updateModulation(); }

  /** Pitch wheel, -1 to +1. */
  setPitchWheel(value) {
    this._pitchBend = value * PITCH_WHEEL_RANGE;
    this.osc1.setPitchBend(this._pitchBend);
    this.osc2.setPitchBend(this._pitchBend);
  }
  /** Mod wheel, 0 to 1. */
  setModWheel(value) { this._modWheel = value; this._updateModulation(); }

  setReverbMix(value) { this.reverb.setMix(value); }
  setHPFCutoff(normalized) { this.hpf.setCutoff(normalized); this._updateMixerLoop(); }
  setAttenuatorAmount(value) { this.attenuator.setAmount(value); this._updateMixerLoop(); }

  /**
   * A cable path from MIXER OUTPUT back into one of the mixer's inputs, through any of the mult, the high-pass
   * and the attenuator. Web Audio mutes a loop, so the cable that closes it carries no audio here; the mixer
   * runs the loop itself (see MixerCore), with the same high-pass and gain.
   * @returns {{ slot: number, hp: boolean, atten: boolean, closing: {sourceId: string, destId: string} } | null}
   */
  findMixerLoop() {
    const PP = PATCH_POINTS;
    const MIX_IN = { [PP.MIXER_OSC1_IN]: 1, [PP.MIXER_OSC2_IN]: 2, [PP.MIXER_NOISE_IN]: 3 };
    const MULT = new Set([PP.MULT_1, PP.MULT_2, PP.MULT_3, PP.MULT_4]);
    const node = id => (MULT.has(id) ? 'mult' : id);
    const THROUGH = { [PP.HPF_IN]: [PP.HPF_OUT, 'hp'], [PP.ATTEN_IN]: [PP.ATTEN_OUT, 'atten'] };
    const patches = this.patchManager.getPatches();
    const seen = new Set();
    const walk = (from, path) => {
      if (seen.has(from)) return null;
      seen.add(from);
      for (const p of patches) {
        if (node(p.sourceId) !== from) continue;
        const to = node(p.destId);
        if (MIX_IN[to]) return { slot: MIX_IN[to], hp: path.hp, atten: path.atten, closing: p };
        const next = to === 'mult' ? ['mult', null] : THROUGH[to];
        if (!next) continue;
        const found = walk(next[0], { ...path, ...(next[1] ? { [next[1]]: true } : {}) });
        if (found) return found;
      }
      return null;
    };
    return walk(PP.MIXER_OUT, { hp: false, atten: false });
  }

  _updateMixerLoop() {
    if (!this.patchManager) return;
    const loop = this.findMixerLoop(), was = this._mixerLoopCable;
    const audio = c => [this.signalBus.getNode(c.sourceId), this.signalBus.getNode(c.destId)];
    const stillThere = c => this.patchManager.getPatches().some(p => p.sourceId === c.sourceId && p.destId === c.destId);
    if (was && (!loop || loop.closing.sourceId !== was.sourceId || loop.closing.destId !== was.destId)) {
      if (stillThere(was)) { const [a, b] = audio(was); a.connect(b); }
      this._mixerLoopCable = null;
    }
    if (loop && !this._mixerLoopCable) {
      const [a, b] = audio(loop.closing);
      try { a.disconnect(b); } catch (e) { /* not connected */ }
      this._mixerLoopCable = { sourceId: loop.closing.sourceId, destId: loop.closing.destId };
    }
    if (loop) this.mixer.setFeedback(loop.slot, loop.atten ? this.attenuator.amount : 1, loop.hp ? this.hpf.hz : 0);
    else this.mixer.setFeedback(0);
  }

  setGlide(value) { this._glide = value; }
  setLegatoGlide(enabled) { this._legatoGlide = enabled; }

  getArpSeq() { return this.arpSeq; }

  createPatch(sourceId, destId, color) { const id = this.patchManager.connect(sourceId, destId, color); this._updateMixerLoop(); return id; }
  removePatch(patchId) { this.patchManager.disconnect(patchId); this._updateMixerLoop(); }
  removeAllPatches() { this.patchManager.disconnectAll(); this._updateMixerLoop(); }
  getPatches() { return this.patchManager.getPatches(); }

  destroy() {
    this.arpSeq.destroy();
    for (const m of [this.osc1, this.osc2, this.noise, this.mixer, this.filter, this.envelope, this.vca, this.lfo, this.reverb, this.hpf, this.attenuator]) m.destroy();
    for (const s of this._sources) { s.stop(); s.disconnect(); }
    this._edges.port.onmessage = null;
    for (const n of [this._edges, this.volume, this.limiter]) n.disconnect();
  }
}
