/**
 * Bipolar attenuator. Its input is normalled to a positive voltage (+8 V), so with nothing patched
 * the output is a steady voltage set by the knob, -8 V to +8 V. That normal is a regular normalled
 * connection in the patch bay (from `dc`), so a cable into the input replaces it.
 */
export class AttenuatorModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    this.dcSource = this.ctx.createConstantSource();
    this.dcSource.offset.value = 1.6;
    this.dcSource.start();
    this.dc = this.ctx.createGain();           // the hidden source the input is normalled to
    this.dcSource.connect(this.dc);

    this.input = this.ctx.createGain();
    this.attenuator = this.ctx.createGain();
    this.attenuator.gain.value = 0;            // center: fully attenuated
    this.amount = 0;
    this.output = this.ctx.createGain();
    this.input.connect(this.attenuator);
    this.attenuator.connect(this.output);
  }

  /** -1 to +1 */
  setAmount(bipolarValue) {
    this.amount = bipolarValue;
    this.attenuator.gain.setTargetAtTime(bipolarValue, this.ctx.currentTime, 0.012);
  }

  destroy() {
    this.dcSource.stop();
    for (const n of [this.dcSource, this.dc, this.input, this.attenuator, this.output]) n.disconnect();
  }
}
