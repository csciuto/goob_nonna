import { OscillatorModule } from './modules/oscillator.js';
import { NoiseModule } from './modules/noise.js';
import { MixerModule } from './modules/mixer.js';
import { FilterModule } from './modules/filter.js';
import { EnvelopeModule } from './modules/envelope.js';
import { VCAModule } from './modules/vca.js';
import { LFOModule } from './modules/lfo.js';
import { ReverbModule } from './modules/reverb.js';
import { HighPassFilterModule } from './modules/high-pass-filter.js';
import { AttenuatorModule } from './modules/attenuator.js';
import { SignalBus } from './routing/signal-bus.js';
import { PatchManager } from './routing/patch-manager.js';
import { ArpSeqController } from '../arp-seq/arp-seq-controller.js';
import { PATCH_POINTS, JACK_TYPE, VCA_MODES, PITCH_WHEEL_RANGE } from '../utils/constants.js';
import { midiToFrequency, mapToLogRange } from '../utils/math.js';

/**
 * Main Audio Engine.
 * Creates all modules, registers patch points, establishes normalled connections.
 * Provides high-level API for the UI controller.
 */
export class AudioEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.signalBus = new SignalBus();
    this.patchManager = new PatchManager(this.signalBus);

    // Current state
    this._currentNote = null;
    this._heldNotes = [];
    this._vcaMode = VCA_MODES.ENV;
    this._pitchBend = 0;
    this._modWheel = 0;
    this._pitchAmt = 0;
    this._cutoffAmt = 0;
    this._pwAmt = 0;
    this._glide = 0; // knob value 0-10
    this._legatoGlide = false;

    // Create modules
    this._createModules();

    // Keyboard CV/Gate sources (must be created before _registerPatchPoints)
    this._kbPitchSource = this.ctx.createConstantSource();
    this._kbPitchSource.offset.value = 0;
    this._kbPitchSource.start();

    this._kbGateSource = this.ctx.createConstantSource();
    this._kbGateSource.offset.value = 0;
    this._kbGateSource.start();

    this._kbVelSource = this.ctx.createConstantSource();
    this._kbVelSource.offset.value = 0;
    this._kbVelSource.start();

    // KB output nodes
    this._kbPitchOutput = this.ctx.createGain();
    this._kbPitchOutput.gain.value = 1.0;
    this._kbPitchSource.connect(this._kbPitchOutput);

    this._kbGateOutput = this.ctx.createGain();
    this._kbGateOutput.gain.value = 1.0;
    this._kbGateSource.connect(this._kbGateOutput);

    this._kbVelOutput = this.ctx.createGain();
    this._kbVelOutput.gain.value = 1.0;
    this._kbVelSource.connect(this._kbVelOutput);

    // Register all patch points
    this._registerPatchPoints();

    // Establish normalled connections
    this.patchManager.establishNormalledConnections();

    // Set up modulation routing
    this._setupModulation();

    // Connect final output to destination
    this.reverb.output.connect(this.ctx.destination);

    // Arp/Seq controller
    this.arpSeq = new ArpSeqController(this.ctx);
    this.arpSeq.onNoteOn = (note, vel) => this.noteOn(note, vel);
    this.arpSeq.onNoteOff = (note) => this.noteOff(note);
  }

  _createModules() {
    this.osc1 = new OscillatorModule(this.ctx, 'osc1');
    this.osc2 = new OscillatorModule(this.ctx, 'osc2');
    this.noise = new NoiseModule(this.ctx);
    this.mixer = new MixerModule(this.ctx);
    this.filter = new FilterModule(this.ctx);
    this.envelope = new EnvelopeModule(this.ctx);
    this.vca = new VCAModule(this.ctx);
    this.lfo = new LFOModule(this.ctx);
    this.reverb = new ReverbModule(this.ctx);
    this.hpf = new HighPassFilterModule(this.ctx);
    this.attenuator = new AttenuatorModule(this.ctx);
  }

  _registerPatchPoints() {
    const bus = this.signalBus;
    const OUT = JACK_TYPE.OUTPUT;
    const IN = JACK_TYPE.INPUT;
    const PP = PATCH_POINTS;

    // Keyboard outputs
    bus.register(PP.KB_PITCH_CV, { type: OUT, node: this._kbPitchOutput, label: 'KB PITCH', module: 'keyboard' });
    bus.register(PP.KB_GATE, { type: OUT, node: this._kbGateOutput, label: 'KB GATE', module: 'keyboard' });
    bus.register(PP.KB_VEL, { type: OUT, node: this._kbVelOutput, label: 'KB VEL', module: 'keyboard' });

    // Oscillator outputs and inputs
    bus.register(PP.OSC1_WAVE_OUT, { type: OUT, node: this.osc1.output, label: 'OSC1 OUT', module: 'osc1' });
    bus.register(PP.OSC2_WAVE_OUT, { type: OUT, node: this.osc2.output, label: 'OSC2 OUT', module: 'osc2' });
    bus.register(PP.OSC1_PITCH_IN, { type: IN, node: this.osc1.pitchInput, normalledFrom: PP.KB_PITCH_CV, label: 'OSC1 PITCH', module: 'osc1' });
    bus.register(PP.OSC2_PITCH_IN, { type: IN, node: this.osc2.pitchInput, normalledFrom: PP.KB_PITCH_CV, label: 'OSC2 PITCH', module: 'osc2' });
    bus.register(PP.OSC1_PWM_IN, { type: IN, node: this.osc1.pwmInput, label: 'OSC1 PWM', module: 'osc1' });
    bus.register(PP.OSC2_PWM_IN, { type: IN, node: this.osc2.pwmInput, label: 'OSC2 PWM', module: 'osc2' });
    bus.register(PP.SYNC_IN, { type: IN, node: this.ctx.createGain(), label: 'SYNC', module: 'osc2' }); // Placeholder

    // Noise
    bus.register(PP.NOISE_OUT, { type: OUT, node: this.noise.output, label: 'NOISE', module: 'noise' });

    // Mixer
    bus.register(PP.MIXER_OSC1_IN, { type: IN, node: this.mixer.osc1Input, normalledFrom: PP.OSC1_WAVE_OUT, label: 'MIX OSC1', module: 'mixer' });
    bus.register(PP.MIXER_OSC2_IN, { type: IN, node: this.mixer.osc2Input, normalledFrom: PP.OSC2_WAVE_OUT, label: 'MIX OSC2', module: 'mixer' });
    bus.register(PP.MIXER_NOISE_IN, { type: IN, node: this.mixer.noiseInput, normalledFrom: PP.NOISE_OUT, label: 'MIX NOISE', module: 'mixer' });
    bus.register(PP.MIXER_OUT, { type: OUT, node: this.mixer.output, label: 'MIX OUT', module: 'mixer' });

    // Filter
    bus.register(PP.FILTER_IN, { type: IN, node: this.filter.input, normalledFrom: PP.MIXER_OUT, label: 'FILTER IN', module: 'filter' });
    bus.register(PP.FILTER_OUT, { type: OUT, node: this.filter.output, label: 'FILTER OUT', module: 'filter' });
    bus.register(PP.CUTOFF_IN, { type: IN, node: this.filter.cutoffInput, normalledFrom: PP.ENV_OUT, label: 'CUTOFF', module: 'filter' });
    bus.register(PP.RESONANCE_IN, { type: IN, node: this.filter.resonanceInput, label: 'RES', module: 'filter' });

    // Envelope
    bus.register(PP.ENV_GATE_IN, { type: IN, node: this.envelope.gateInput, normalledFrom: PP.KB_GATE, label: 'ENV GATE', module: 'envelope' });
    bus.register(PP.ENV_OUT, { type: OUT, node: this.envelope.output, label: 'ENV OUT', module: 'envelope' });

    // VCA
    bus.register(PP.VCA_IN, { type: IN, node: this.vca.input, normalledFrom: PP.FILTER_OUT, label: 'VCA IN', module: 'vca' });
    bus.register(PP.VCA_CV_IN, { type: IN, node: this.vca.cvInput, normalledFrom: PP.ENV_OUT, label: 'VCA CV', module: 'vca' });
    bus.register(PP.VCA_OUT, { type: OUT, node: this.vca.output, label: 'VCA OUT', module: 'vca' });

    // Reverb
    bus.register(PP.REVERB_IN, { type: IN, node: this.reverb.input, normalledFrom: PP.VCA_OUT, label: 'REVERB IN', module: 'reverb' });

    // LFO
    bus.register(PP.LFO_TRI_OUT, { type: OUT, node: this.lfo.triOutput, label: 'LFO TRI', module: 'lfo' });
    bus.register(PP.LFO_SQ_OUT, { type: OUT, node: this.lfo.sqOutput, label: 'LFO SQ', module: 'lfo' });
    bus.register(PP.LFO_SAW_OUT, { type: OUT, node: this.lfo.sawOutput, label: 'LFO SAW', module: 'lfo' });
    bus.register(PP.LFO_SH_OUT, { type: OUT, node: this.lfo.shOutput, label: 'LFO S/H', module: 'lfo' });
    bus.register(PP.LFO_WAVE_OUT, { type: OUT, node: this.lfo.output, label: 'LFO WAVE', module: 'lfo' });
    bus.register(PP.LFO_RATE_IN, { type: IN, node: this.lfo.rateInput, label: 'LFO RATE', module: 'lfo' });

    // Utilities
    bus.register(PP.HPF_IN, { type: IN, node: this.hpf.input, label: 'HPF IN', module: 'hpf' });
    bus.register(PP.HPF_OUT, { type: OUT, node: this.hpf.output, label: 'HPF OUT', module: 'hpf' });
    bus.register(PP.ATTEN_IN, { type: IN, node: this.attenuator.input, label: 'ATTEN IN', module: 'attenuator' });
    bus.register(PP.ATTEN_OUT, { type: OUT, node: this.attenuator.output, label: 'ATTEN OUT', module: 'attenuator' });

    // Mult (4 jacks all connected - use a single gain node)
    this._multNode = this.ctx.createGain();
    this._multNode.gain.value = 1.0;
    bus.register(PP.MULT_1, { type: OUT, node: this._multNode, label: 'MULT 1', module: 'mult' });
    bus.register(PP.MULT_2, { type: OUT, node: this._multNode, label: 'MULT 2', module: 'mult' });
    bus.register(PP.MULT_3, { type: IN, node: this._multNode, label: 'MULT 3', module: 'mult' });
    bus.register(PP.MULT_4, { type: IN, node: this._multNode, label: 'MULT 4', module: 'mult' });
  }

  _setupModulation() {
    // LFO → pitch modulation (via mod wheel × pitch amount)
    this._pitchModGain = this.ctx.createGain();
    this._pitchModGain.gain.value = 0; // Controlled by mod wheel × pitch amt
    this.lfo.output.connect(this._pitchModGain);
    // Connect to oscillator detune params
    this._pitchModGain.connect(this.osc1.oscillator.detune);
    this._pitchModGain.connect(this.osc2.oscillator.detune);

    // LFO → cutoff modulation (via mod wheel × cutoff amount)
    this._cutoffModGain = this.ctx.createGain();
    this._cutoffModGain.gain.value = 0;
    this.lfo.output.connect(this._cutoffModGain);
    this._cutoffModGain.connect(this.filter.filter1.frequency);
    this._cutoffModGain.connect(this.filter.filter2.frequency);

    // LFO → PWM modulation (via mod wheel × PW amount) - placeholder
    this._pwmModGain = this.ctx.createGain();
    this._pwmModGain.gain.value = 0;
    this.lfo.output.connect(this._pwmModGain);
  }

  _updateModulation() {
    const mod = this._modWheel;
    // Pitch mod: mod wheel × pitch amt × 1200 cents (1 octave max)
    this._pitchModGain.gain.setValueAtTime(
      mod * this._pitchAmt * 1200,
      this.ctx.currentTime
    );
    // Cutoff mod: mod wheel × cutoff amt × 5000 Hz
    this._cutoffModGain.gain.setValueAtTime(
      mod * this._cutoffAmt * 5000,
      this.ctx.currentTime
    );
    // PWM mod: placeholder
    this._pwmModGain.gain.setValueAtTime(
      mod * this._pwAmt,
      this.ctx.currentTime
    );
  }

  // --- Public API ---

  /**
   * Note on - called when a key is pressed.
   */
  noteOn(midiNote, velocity = 1.0) {
    const wasHoldingNotes = this._heldNotes.length > 0;
    const hadPreviousNote = this._currentNote !== null;
    const prevNote = this._currentNote;
    this._currentNote = midiNote;
    this._heldNotes.push(midiNote);

    // Glide between notes. Skip only for the very first note ever played
    // (when _currentNote was null — oscillator is at a default frequency).
    // Once any note has played, the oscillator sits at that pitch, so glide is correct.
    const glideTime = this._glide > 0 ? this._getGlideTime() : 0;
    const shouldGlide = glideTime > 0 && hadPreviousNote && (!this._legatoGlide || wasHoldingNotes);

    console.log(`noteOn(${midiNote}): prev=${prevNote} held=[${this._heldNotes}] glide=${this._glide} shouldGlide=${shouldGlide} glideTime=${shouldGlide ? glideTime.toFixed(3) : 0}`);

    // Set oscillator frequencies (with glide if applicable)
    this.osc1.setNote(midiNote, shouldGlide ? glideTime : 0);
    this.osc2.setNote(midiNote, shouldGlide ? glideTime : 0);

    // Set filter keyboard tracking
    this.filter.setNote(midiNote);

    // Legato glide: don't retrigger envelope when gliding between held notes
    if (this._legatoGlide && wasHoldingNotes) {
      return;
    }

    // Trigger envelope
    if (this._vcaMode === VCA_MODES.KB_RELEASE) {
      this.envelope.triggerInstant();
    } else {
      this.envelope.trigger();
    }
  }

  /**
   * Note off - called when a key is released.
   */
  noteOff(midiNote) {
    this._heldNotes = this._heldNotes.filter(n => n !== midiNote);
    console.log(`noteOff(${midiNote}): held=[${this._heldNotes}] currentNote=${this._currentNote}`);

    if (this._heldNotes.length > 0) {
      // Play the last held note (for legato behavior)
      const lastNote = this._heldNotes[this._heldNotes.length - 1];
      const glideTime = this._glide > 0 ? this._getGlideTime() : 0;
      this.osc1.setNote(lastNote, glideTime);
      this.osc2.setNote(lastNote, glideTime);
      this.filter.setNote(lastNote);
    } else {
      // Release envelope
      this.envelope.release();
    }
  }

  _getGlideTime() {
    // Knob 0-10 → 5ms to 2 seconds, logarithmic
    if (this._glide <= 0) return 0;
    return mapToLogRange(this._glide / 10, 0.005, 2.0);
  }

  // OSC 1 controls
  setOsc1Waveform(waveform) { this.osc1.setWaveform(waveform); }
  setOsc1Octave(foot) { this.osc1.setOctave(foot); }
  setOsc1Detune(semitones) { this.osc1.setDetune(semitones); }

  // OSC 2 controls
  setOsc2Waveform(waveform) { this.osc2.setWaveform(waveform); }
  setOsc2Octave(foot) { this.osc2.setOctave(foot); }
  setOsc2Detune(semitones) { this.osc2.setDetune(semitones); }
  setOsc2Sync(enabled) { this._syncEnabled = enabled; /* placeholder */ }

  // Mixer controls
  setMixerOsc1Level(value) { this.mixer.setOsc1Level(value); }
  setMixerOsc2Level(value) { this.mixer.setOsc2Level(value); }
  setMixerNoiseLevel(value) { this.mixer.setNoiseLevel(value); }

  // Filter controls
  setFilterCutoff(normalized) { this.filter.setCutoff(normalized); }
  setFilterResonance(value) { this.filter.setResonance(value); }
  setFilterKbTrack(mode) { this.filter.setKbTrack(mode); }
  setFilterEnvAmount(value) { this.filter.setEnvAmount(value); }

  // Envelope controls
  setEnvAttack(value) { this.envelope.setAttack(value); }
  setEnvDecay(value) { this.envelope.setDecay(value); }
  setEnvSustain(value) { this.envelope.setSustain(value); }
  setEnvRelease(value) { this.envelope.setRelease(value); }

  // VCA controls
  setVCAMode(mode) {
    this._vcaMode = mode;
    this.vca.setMode(mode);
  }
  setOutputLevel(value) { this.vca.setOutputLevel(value); }

  // LFO controls
  setLFORate(value) { this.lfo.setRate(value); }
  setLFOWaveform(waveform) { this.lfo.setWaveform(waveform); }
  getLFOValue() { return this.lfo.getCurrentValue(); }

  // Modulation amounts
  setPitchAmount(normalized) {
    this._pitchAmt = normalized;
    this._updateModulation();
  }
  setCutoffAmount(normalized) {
    this._cutoffAmt = normalized;
    this._updateModulation();
  }
  setPWAmount(normalized) {
    this._pwAmt = normalized;
    this._updateModulation();
  }

  // Wheels
  setPitchWheel(value) {
    // value: -1 to +1
    this._pitchBend = value * PITCH_WHEEL_RANGE;
    this.osc1.setPitchBend(this._pitchBend);
    this.osc2.setPitchBend(this._pitchBend);
  }
  setModWheel(value) {
    // value: 0 to 1
    this._modWheel = value;
    this._updateModulation();
  }

  // Reverb
  setReverbMix(value) { this.reverb.setMix(value); }

  // Utilities
  setHPFCutoff(normalized) { this.hpf.setCutoff(normalized); }
  setAttenuatorAmount(value) { this.attenuator.setAmount(value); }

  // Glide
  setGlide(value) { this._glide = value; }
  setLegatoGlide(enabled) { this._legatoGlide = enabled; }

  // Arp/Seq
  getArpSeq() { return this.arpSeq; }

  // Patch cable management (delegates to PatchManager)
  createPatch(sourceId, destId, color) {
    return this.patchManager.connect(sourceId, destId, color);
  }
  removePatch(patchId) {
    this.patchManager.disconnect(patchId);
  }
  removeAllPatches() {
    this.patchManager.disconnectAll();
  }
  getPatches() {
    return this.patchManager.getPatches();
  }

  destroy() {
    this.osc1.destroy();
    this.osc2.destroy();
    this.noise.destroy();
    this.mixer.destroy();
    this.filter.destroy();
    this.envelope.destroy();
    this.vca.destroy();
    this.lfo.destroy();
    this.reverb.destroy();
    this.hpf.destroy();
    this.attenuator.destroy();
    this.arpSeq.destroy();
    this._kbPitchSource.stop();
    this._kbGateSource.stop();
    this._kbVelSource.stop();
  }
}
