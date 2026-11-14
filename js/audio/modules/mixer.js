import { mixSaturate } from '../worklets.js';

const SMOOTH = 0.012;

/**
 * Three-channel mixer: OSC 1, OSC 2 and noise, each replaceable by a cable into its input.
 * Like the hardware, it starts to overdrive gently above about 1 o'clock on a level knob and
 * harder as levels rise. The mixing runs in the `gn-mixer` worklet, which can also run a cable loop from
 * MIXER OUTPUT back into one of its inputs (see `setFeedback`).
 */
export class MixerModule {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.osc1Input = this.ctx.createGain();
    this.osc2Input = this.ctx.createGain();
    this.noiseInput = this.ctx.createGain();
    this.node = new AudioWorkletNode(this.ctx, 'gn-mixer', { numberOfInputs: 3, numberOfOutputs: 1, outputChannelCount: [1] });
    this.osc1Input.connect(this.node, 0, 0);
    this.osc2Input.connect(this.node, 0, 1);
    this.noiseInput.connect(this.node, 0, 2);
    this.output = this.ctx.createGain();
    this.node.connect(this.output);
  }

  static saturate(x) { return mixSaturate(x); }

  _set(name, v) { this.node.parameters.get(name).setTargetAtTime(v, this.ctx.currentTime, SMOOTH); }

  // knob values, 0 to 10
  setOsc1Level(value) { this._set('l1', value / 10); }
  setOsc2Level(value) { this._set('l2', value / 10); }
  setNoiseLevel(value) { this._set('l3', value / 10); }

  /**
   * A cable loop from MIXER OUTPUT back into an input. @param slot 0 none, 1 OSC 1, 2 OSC 2, 3 NOISE;
   * @param gain the loop's gain outside the mixer; @param hpHz the high-pass cutoff if it is in the loop, else 0
   */
  setFeedback(slot, gain = 0, hpHz = 0) {
    const p = this.node.parameters;
    p.get('fbSlot').setValueAtTime(slot, this.ctx.currentTime);
    p.get('fbHp').setValueAtTime(hpHz, this.ctx.currentTime);
    this._set('fbGain', gain);
  }

  destroy() {
    for (const n of [this.osc1Input, this.osc2Input, this.noiseInput, this.node, this.output]) n.disconnect();
  }
}
