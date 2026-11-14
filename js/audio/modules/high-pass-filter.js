import { mapToLogRange } from '../../utils/math.js';

/** Utility high-pass filter: static, 6 dB per octave (the `gn-hp1` worklet). */
export class HighPassFilterModule {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.input = this.ctx.createGain();
    this.node = new AudioWorkletNode(this.ctx, 'gn-hp1', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    this.output = this.ctx.createGain();
    this.input.connect(this.node);
    this.node.connect(this.output);
    this.setCutoff(0.5);
  }

  setCutoff(normalized) {
    this.node.parameters.get('cutoff').setTargetAtTime(mapToLogRange(normalized, 20, 2000), this.ctx.currentTime, 0.012);
  }

  destroy() {
    for (const n of [this.input, this.node, this.output]) n.disconnect();
  }
}
