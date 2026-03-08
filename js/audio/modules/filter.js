import { FILTER_FREQ_MIN, FILTER_FREQ_MAX, KB_TRACK } from '../../utils/constants.js';
import { mapToLogRange } from '../../utils/math.js';

/**
 * Moog Ladder Filter approximation using two cascaded BiquadFilterNodes.
 * Two -12dB/oct lowpass filters = -24dB/oct total.
 */
export class FilterModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    // State
    this._cutoffNormalized = 0.7; // 0-1 normalized position
    this._resonance = 0; // 0-4
    this._kbTrack = KB_TRACK.FULL;
    this._envAmount = 0; // -1 to +1
    this._currentNote = 60;

    // Input junction
    this.input = this.ctx.createGain();
    this.input.gain.value = 1.0;

    // Two cascaded lowpass filters for -24dB/oct
    this.filter1 = this.ctx.createBiquadFilter();
    this.filter1.type = 'lowpass';

    this.filter2 = this.ctx.createBiquadFilter();
    this.filter2.type = 'lowpass';

    // Output junction
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    // Cutoff CV input (for envelope modulation, external CV)
    this.cutoffInput = this.ctx.createGain();
    this.cutoffInput.gain.value = 0; // Scaled by ENV AMT

    // Resonance CV input
    this.resonanceInput = this.ctx.createGain();
    this.resonanceInput.gain.value = 0;

    // Connect chain
    this.input.connect(this.filter1);
    this.filter1.connect(this.filter2);
    this.filter2.connect(this.output);

    // Connect cutoff CV to filter frequency params
    this.cutoffInput.connect(this.filter1.frequency);
    this.cutoffInput.connect(this.filter2.frequency);

    // Set initial values
    this._updateCutoff();
    this._updateResonance();
  }

  setCutoff(normalized) {
    this._cutoffNormalized = normalized;
    this._updateCutoff();
  }

  setResonance(value) {
    // value: 0-4
    this._resonance = value;
    this._updateResonance();
  }

  setKbTrack(mode) {
    this._kbTrack = mode;
    this._updateCutoff();
  }

  setEnvAmount(bipolarValue) {
    // -1 to +1
    this._envAmount = bipolarValue;
    // Scale the cutoff CV input gain so envelope affects cutoff
    // Env output is 0-1, we want it to modulate cutoff by ±full range
    const maxModulation = FILTER_FREQ_MAX * 0.5;
    this.cutoffInput.gain.setValueAtTime(
      bipolarValue * maxModulation,
      this.ctx.currentTime
    );
  }

  setNote(midiNote) {
    this._currentNote = midiNote;
    this._updateCutoff();
  }

  _updateCutoff() {
    let cutoff = mapToLogRange(this._cutoffNormalized, FILTER_FREQ_MIN, FILTER_FREQ_MAX);

    // Apply keyboard tracking
    if (this._kbTrack > 0) {
      const semitonesFromCenter = (this._currentNote - 60) * this._kbTrack;
      cutoff *= Math.pow(2, semitonesFromCenter / 12);
    }

    // Clamp
    cutoff = Math.max(FILTER_FREQ_MIN, Math.min(FILTER_FREQ_MAX, cutoff));

    const now = this.ctx.currentTime;
    this.filter1.frequency.setValueAtTime(cutoff, now);
    this.filter2.frequency.setValueAtTime(cutoff, now);
  }

  _updateResonance() {
    // Map resonance 0-4 to Q values
    // First filter: moderate Q, second filter: higher Q for ladder feedback
    const q1 = this._resonance * 3;
    const q2 = this._resonance * 6;

    const now = this.ctx.currentTime;
    this.filter1.Q.setValueAtTime(q1, now);
    this.filter2.Q.setValueAtTime(q2, now);
  }

  getCutoffFrequency() {
    return this.filter1.frequency.value;
  }

  destroy() {
    this.input.disconnect();
    this.filter1.disconnect();
    this.filter2.disconnect();
    this.output.disconnect();
    this.cutoffInput.disconnect();
  }
}
