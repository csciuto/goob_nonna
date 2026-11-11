import { envTimeKnobToMs, msToSeconds } from '../../utils/math.js';

/** A full envelope and a gate are +8 V: 1.6 in units of 5 V. */
export const ENV_VOLTS = 1.6;

/**
 * ADSR envelope: the `gn-env` worklet. It is driven by a gate signal (the keyboard's, unless
 * something is patched into TRIGGER IN), so anything over 1.2 V can trigger it.
 *
 *   level      0 to 1, wired inside the synth to the VCA and the filter's ENVELOPE AMT
 *   kbRelease  0 to 1, for the VCA's KB RLS mode: full at once, then the release
 *   output     +ENV OUT jack (0 to +8 V);  negOutput  -ENV OUT jack
 */
export class EnvelopeModule {
  constructor(audioContext) {
    this.ctx = audioContext;
    this._attack = 0.5; this._decay = 2; this._sustain = 7; this._release = 3;   // knob values, 0 to 10

    this.node = new AudioWorkletNode(this.ctx, 'gn-env', { numberOfInputs: 1, numberOfOutputs: 2, outputChannelCount: [1, 1] });

    this.gateInput = this.ctx.createGain();
    this.gateInput.connect(this.node);

    this.level = this.ctx.createGain();
    this.node.connect(this.level, 0);
    this.kbRelease = this.ctx.createGain();
    this.node.connect(this.kbRelease, 1);

    this.output = this.ctx.createGain();
    this.output.gain.value = ENV_VOLTS;
    this.level.connect(this.output);
    this.negOutput = this.ctx.createGain();
    this.negOutput.gain.value = -ENV_VOLTS;
    this.level.connect(this.negOutput);

    this._apply();
  }

  setAttack(value) { this._attack = value; this._apply(); }
  setDecay(value) { this._decay = value; this._apply(); }
  setSustain(value) { this._sustain = value; this._apply(); }
  setRelease(value) { this._release = value; this._apply(); }

  getAttackTime() { return msToSeconds(envTimeKnobToMs(this._attack)); }
  getDecayTime() { return msToSeconds(envTimeKnobToMs(this._decay)); }
  getSustainLevel() { return this._sustain / 10; }
  getReleaseTime() { return msToSeconds(envTimeKnobToMs(this._release)); }

  _apply() {
    const p = this.node.parameters, t = this.ctx.currentTime;
    p.get('attack').setValueAtTime(this.getAttackTime(), t);
    p.get('decay').setValueAtTime(this.getDecayTime(), t);
    p.get('sustain').setValueAtTime(this.getSustainLevel(), t);
    p.get('release').setValueAtTime(this.getReleaseTime(), t);
  }

  destroy() {
    for (const n of [this.node, this.gateInput, this.level, this.kbRelease, this.output, this.negOutput]) n.disconnect();
  }
}
