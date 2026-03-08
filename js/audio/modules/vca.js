import { VCA_MODES } from '../../utils/constants.js';

/**
 * VCA (Voltage Controlled Amplifier) module.
 * Controls the amplitude of the audio signal.
 * Three modes: ENV, KB RLS, DRONE.
 */
export class VCAModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    this._mode = VCA_MODES.ENV;
    this._outputLevel = 0.7; // 0-1

    // Input junction (audio input)
    this.input = this.ctx.createGain();
    this.input.gain.value = 1.0;

    // CV input (envelope or other modulation)
    this.cvInput = this.ctx.createGain();
    this.cvInput.gain.value = 1.0;

    // Main VCA gain node
    this.vca = this.ctx.createGain();
    this.vca.gain.value = 0; // Start silent

    // Output level control
    this.outputLevel = this.ctx.createGain();
    this.outputLevel.gain.value = this._outputLevel;

    // Output junction
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    // Connect: input → vca → outputLevel → output
    this.input.connect(this.vca);
    this.vca.connect(this.outputLevel);
    this.outputLevel.connect(this.output);

    // In ENV mode, connect CV input to VCA gain
    this.cvInput.connect(this.vca.gain);
  }

  setMode(mode) {
    this._mode = mode;

    // Disconnect CV from VCA gain
    try { this.cvInput.disconnect(this.vca.gain); } catch (e) { /* already disconnected */ }

    switch (mode) {
      case VCA_MODES.ENV:
        // Envelope controls VCA gain
        this.vca.gain.value = 0;
        this.cvInput.connect(this.vca.gain);
        break;

      case VCA_MODES.KB_RELEASE:
        // Handled by engine: instant attack, envelope release
        this.vca.gain.value = 0;
        this.cvInput.connect(this.vca.gain);
        break;

      case VCA_MODES.DRONE:
        // Always on
        this.vca.gain.value = 1.0;
        break;
    }
  }

  setOutputLevel(value) {
    // value: 0-10 knob range
    this._outputLevel = value / 10;
    this.outputLevel.gain.setValueAtTime(this._outputLevel, this.ctx.currentTime);
  }

  destroy() {
    this.input.disconnect();
    this.vca.disconnect();
    this.outputLevel.disconnect();
    this.output.disconnect();
    this.cvInput.disconnect();
  }
}
