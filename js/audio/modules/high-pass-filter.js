import { mapToLogRange } from '../../utils/math.js';

/**
 * Utility High-Pass Filter (-6dB/oct).
 */
export class HighPassFilterModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    // Input junction
    this.input = this.ctx.createGain();
    this.input.gain.value = 1.0;

    // HPF
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'highpass';
    this.filter.frequency.value = 200;
    this.filter.Q.value = 0.707;

    // Output junction
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    this.input.connect(this.filter);
    this.filter.connect(this.output);
  }

  setCutoff(normalized) {
    const freq = mapToLogRange(normalized, 20, 20000);
    this.filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
  }

  destroy() {
    this.input.disconnect();
    this.filter.disconnect();
    this.output.disconnect();
  }
}
