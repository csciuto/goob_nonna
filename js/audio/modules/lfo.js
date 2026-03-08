import { LFO_WAVEFORMS, LFO_RATE_MIN, LFO_RATE_MAX } from '../../utils/constants.js';
import { mapToLogRange } from '../../utils/math.js';

/**
 * LFO (Low Frequency Oscillator) module.
 * Provides modulation signals: triangle, square, sawtooth, ramp, S/H.
 */
export class LFOModule {
  constructor(audioContext) {
    this.ctx = audioContext;

    this._rate = 5; // Hz
    this._waveform = LFO_WAVEFORMS.TRIANGLE;

    // Main LFO oscillator
    this.oscillator = this.ctx.createOscillator();
    this.oscillator.type = 'triangle';
    this.oscillator.frequency.value = this._rate;

    // Individual waveform outputs (always available for patch points)
    // Triangle output
    this.triOutput = this.ctx.createGain();
    this.triOutput.gain.value = 1.0;

    // Square output
    this.sqOscillator = this.ctx.createOscillator();
    this.sqOscillator.type = 'square';
    this.sqOscillator.frequency.value = this._rate;
    this.sqOutput = this.ctx.createGain();
    this.sqOutput.gain.value = 1.0;
    this.sqOscillator.connect(this.sqOutput);
    this.sqOscillator.start();

    // Sawtooth output
    this.sawOscillator = this.ctx.createOscillator();
    this.sawOscillator.type = 'sawtooth';
    this.sawOscillator.frequency.value = this._rate;
    this.sawOutput = this.ctx.createGain();
    this.sawOutput.gain.value = 1.0;
    this.sawOscillator.connect(this.sawOutput);
    this.sawOscillator.start();

    // S/H output (sample and hold - stepped random)
    this.shOutput = this.ctx.createGain();
    this.shOutput.gain.value = 1.0;
    this._shSource = this.ctx.createConstantSource();
    this._shSource.offset.value = 0;
    this._shSource.connect(this.shOutput);
    this._shSource.start();
    this._shInterval = null;
    this._startSH();

    // Main selected waveform output
    this.output = this.ctx.createGain();
    this.output.gain.value = 1.0;

    // Connect triangle LFO
    this.oscillator.connect(this.triOutput);
    this.oscillator.connect(this.output); // Default: triangle to main output

    // Rate input for external modulation
    this.rateInput = this.ctx.createGain();
    this.rateInput.gain.value = 0;

    this.oscillator.start();
  }

  _startSH() {
    this._stopSH();
    const intervalMs = (1000 / this._rate);
    this._shInterval = setInterval(() => {
      const value = Math.random() * 2 - 1;
      this._shSource.offset.setValueAtTime(value, this.ctx.currentTime);
    }, intervalMs);
  }

  _stopSH() {
    if (this._shInterval !== null) {
      clearInterval(this._shInterval);
      this._shInterval = null;
    }
  }

  setRate(knobValue) {
    // knobValue: 0-10
    this._rate = mapToLogRange(Math.max(knobValue, 0.01) / 10, LFO_RATE_MIN, LFO_RATE_MAX);
    const now = this.ctx.currentTime;
    this.oscillator.frequency.setValueAtTime(this._rate, now);
    this.sqOscillator.frequency.setValueAtTime(this._rate, now);
    this.sawOscillator.frequency.setValueAtTime(this._rate, now);
    this._startSH();
  }

  setWaveform(waveform) {
    this._waveform = waveform;

    // Disconnect current from main output
    try { this.oscillator.disconnect(this.output); } catch (e) {}
    try { this.sqOscillator.disconnect(this.output); } catch (e) {}
    try { this.sawOscillator.disconnect(this.output); } catch (e) {}
    try { this._shSource.disconnect(this.output); } catch (e) {}

    switch (waveform) {
      case LFO_WAVEFORMS.TRIANGLE:
        this.oscillator.type = 'triangle';
        this.oscillator.connect(this.output);
        break;
      case LFO_WAVEFORMS.SQUARE:
        this.sqOscillator.connect(this.output);
        break;
      case LFO_WAVEFORMS.SAWTOOTH:
        this.sawOscillator.connect(this.output);
        break;
      case LFO_WAVEFORMS.RAMP:
        // Ramp = inverted sawtooth. Use a gain of -1.
        // We'll create an inverter
        if (!this._rampInverter) {
          this._rampInverter = this.ctx.createGain();
          this._rampInverter.gain.value = -1;
          this.sawOscillator.connect(this._rampInverter);
        }
        this._rampInverter.connect(this.output);
        break;
      case LFO_WAVEFORMS.SAMPLE_HOLD:
        this._shSource.connect(this.output);
        break;
    }
  }

  destroy() {
    this._stopSH();
    this.oscillator.stop();
    this.sqOscillator.stop();
    this.sawOscillator.stop();
    this._shSource.stop();
    this.oscillator.disconnect();
    this.sqOscillator.disconnect();
    this.sawOscillator.disconnect();
    this._shSource.disconnect();
    this.output.disconnect();
    this.triOutput.disconnect();
    this.sqOutput.disconnect();
    this.sawOutput.disconnect();
    this.shOutput.disconnect();
  }
}
