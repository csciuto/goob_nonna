import { WAVEFORMS, OCTAVE_FEET } from '../../utils/constants.js';
import { midiToFrequency, footToOctaveMultiplier, detuneFrequency } from '../../utils/math.js';

/**
 * Oscillator module - represents one oscillator (OSC1 or OSC2).
 * Uses OscillatorNode for standard waveforms.
 * Narrow pulse uses a custom PeriodicWave.
 */
export class OscillatorModule {
  constructor(audioContext, id = 'osc1') {
    this.ctx = audioContext;
    this.id = id;

    // State
    this._waveform = WAVEFORMS.SAW;
    this._octaveFoot = 8;
    this._detuneSemitones = 0;
    this._baseNote = 60; // Middle C
    this._frequency = 261.63;

    // Create oscillator
    this.oscillator = this.ctx.createOscillator();
    this.oscillator.type = 'sawtooth';

    // Output gain (junction point for patching)
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    // Pitch CV input - a gain node that sums pitch modulation
    this.pitchInput = this.ctx.createGain();
    this.pitchInput.gain.value = 1.0;

    // PWM input placeholder
    this.pwmInput = this.ctx.createGain();
    this.pwmInput.gain.value = 0;

    // Connect oscillator to output
    this.oscillator.connect(this.output);

    // Build narrow pulse PeriodicWave
    this._narrowPulseWave = this._createNarrowPulseWave();

    // Start the oscillator
    this.oscillator.start();
  }

  _createNarrowPulseWave() {
    // Create a 25% duty cycle pulse wave using Fourier coefficients
    const n = 64;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    const dutyCycle = 0.25;
    real[0] = 0;
    imag[0] = 0;
    for (let k = 1; k < n; k++) {
      real[k] = 0;
      imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * dutyCycle);
    }
    return this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  setWaveform(waveform) {
    this._waveform = waveform;
    if (waveform === WAVEFORMS.NARROW_PULSE) {
      this.oscillator.setPeriodicWave(this._narrowPulseWave);
    } else {
      this.oscillator.type = waveform;
    }
  }

  setOctave(foot) {
    this._octaveFoot = foot;
    this._updateFrequency();
  }

  setDetune(semitones) {
    this._detuneSemitones = semitones;
    this._updateFrequency();
  }

  setNote(midiNote) {
    this._baseNote = midiNote;
    this._updateFrequency();
  }

  setPitchBend(semitones) {
    // Apply pitch bend via detune in cents
    this.oscillator.detune.setValueAtTime(semitones * 100, this.ctx.currentTime);
  }

  _updateFrequency() {
    const baseFreq = midiToFrequency(this._baseNote);
    const octaveMultiplier = footToOctaveMultiplier(this._octaveFoot);
    const freq = detuneFrequency(baseFreq * octaveMultiplier, this._detuneSemitones);
    this._frequency = freq;
    this.oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);
  }

  getFrequency() {
    return this._frequency;
  }

  destroy() {
    this.oscillator.stop();
    this.oscillator.disconnect();
    this.output.disconnect();
  }
}
