/**
 * Spring Reverb module.
 * Uses ConvolverNode with a procedurally generated impulse response
 * that simulates spring reverb characteristics.
 */
export class ReverbModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    this._mix = 0.3; // 0-1

    // Input junction
    this.input = this.ctx.createGain();
    this.input.gain.value = 1.0;

    // Dry path
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1 - this._mix;

    // Wet path
    this.convolver = this.ctx.createConvolver();
    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.value = this._mix;

    // Output junction
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    // Generate impulse response
    this._generateImpulseResponse();

    // Connect: input → dry → output
    //          input → convolver → wet → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.input.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  _generateImpulseResponse() {
    // Generate a spring reverb-like impulse response
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 1.5; // 1.5 seconds
    const buffer = this.ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Base decay
        let decay = Math.exp(-t * 4);

        // Spring resonances - multiple delayed reflections
        let sample = (Math.random() * 2 - 1) * decay;

        // Add metallic spring character with comb-filter-like resonances
        const springFreq1 = 120 + channel * 15; // Slight stereo difference
        const springFreq2 = 340 + channel * 20;
        sample += Math.sin(2 * Math.PI * springFreq1 * t) * decay * 0.3;
        sample += Math.sin(2 * Math.PI * springFreq2 * t) * decay * 0.15;

        // Early reflections (spring "boing")
        if (t < 0.05) {
          sample *= 2;
        }

        data[i] = sample * 0.5;
      }
    }

    this.convolver.buffer = buffer;
  }

  setMix(value) {
    // value: 0-10 knob range
    this._mix = value / 10;
    const now = this.ctx.currentTime;
    this.dryGain.gain.setValueAtTime(1 - this._mix, now);
    this.wetGain.gain.setValueAtTime(this._mix, now);
  }

  destroy() {
    this.input.disconnect();
    this.dryGain.disconnect();
    this.convolver.disconnect();
    this.wetGain.disconnect();
    this.output.disconnect();
  }
}
