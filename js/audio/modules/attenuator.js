/**
 * Bipolar Attenuator utility module.
 * Input normalled to +1.0 DC (simulating +8V constant).
 * Attenuator knob scales from -1 to +1.
 */
export class AttenuatorModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    // DC source (normalled input: constant +1.0)
    this.dcSource = this.ctx.createConstantSource();
    this.dcSource.offset.value = 1.0;
    this.dcSource.start();

    // Input junction (patch breaks DC normalling)
    this.input = this.ctx.createGain();
    this.input.gain.value = 1.0;

    // Attenuator gain (bipolar: -1 to +1)
    this.attenuator = this.ctx.createGain();
    this.attenuator.gain.value = 1.0;

    // Output junction
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    // Default: DC source → input → attenuator → output
    this.dcSource.connect(this.input);
    this.input.connect(this.attenuator);
    this.attenuator.connect(this.output);

    this._dcConnected = true;
  }

  setAmount(bipolarValue) {
    // -1 to +1
    this.attenuator.gain.setValueAtTime(bipolarValue, this.ctx.currentTime);
  }

  /** Called when a patch cable is connected to input */
  breakNormal() {
    if (this._dcConnected) {
      this.dcSource.disconnect(this.input);
      this._dcConnected = false;
    }
  }

  /** Called when patch cable is removed from input */
  restoreNormal() {
    if (!this._dcConnected) {
      this.dcSource.connect(this.input);
      this._dcConnected = true;
    }
  }

  destroy() {
    this.dcSource.stop();
    this.dcSource.disconnect();
    this.input.disconnect();
    this.attenuator.disconnect();
    this.output.disconnect();
  }
}
