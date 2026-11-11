import { LFO_WAVEFORMS, LFO_RATE_MIN, LFO_RATE_MAX } from '../../utils/constants.js';
import { mapToLogRange } from '../../utils/math.js';
import { OCTAVES_PER_UNIT } from './oscillator.js';

// the gn-lfo worklet's outputs, in order
const OUT = { [LFO_WAVEFORMS.SINE]: 0, [LFO_WAVEFORMS.SAWTOOTH]: 1, [LFO_WAVEFORMS.RAMP]: 2, [LFO_WAVEFORMS.SQUARE]: 3, [LFO_WAVEFORMS.SAMPLE_HOLD]: 4, [LFO_WAVEFORMS.TRIANGLE]: 5 };

/**
 * Modulation oscillator: the `gn-lfo` worklet. All waveforms run together; the switch picks which
 * one reaches WAVE OUT and the mod-wheel routing. Sample and hold takes a new random value at the
 * start of each cycle, and a pulse at SYNC IN restarts the cycle. RATE IN is 1 V per octave.
 */
export class LFOModule {
  constructor(audioContext) {
    this.ctx = audioContext;
    this._rate = 5;
    this._waveform = LFO_WAVEFORMS.TRIANGLE;

    this.node = new AudioWorkletNode(this.ctx, 'gn-lfo', { numberOfInputs: 1, numberOfOutputs: 6, outputChannelCount: [1, 1, 1, 1, 1, 1] });

    const tap = index => { const g = this.ctx.createGain(); this.node.connect(g, index); return g; };
    this.triOutput = tap(5);
    this.sqOutput = tap(3);
    this.sawOutput = tap(1);
    this.shOutput = tap(4);

    this.output = this.ctx.createGain();        // the selected waveform
    this._selected = null;
    this.setWaveform(this._waveform);

    this.rateInput = this.ctx.createGain();
    this.rateInput.gain.value = OCTAVES_PER_UNIT;
    this.rateInput.connect(this.node.parameters.get('rateCv'));

    this.syncInput = this.ctx.createGain();
    this.syncInput.connect(this.node, 0, 0);

    // for the panel's LED
    this._analyser = this.ctx.createAnalyser();
    this._analyser.fftSize = 256;
    this.output.connect(this._analyser);
    this._analyserData = new Float32Array(this._analyser.fftSize);
  }

  setRate(knobValue) {
    this._rate = mapToLogRange(Math.max(knobValue, 0.01) / 10, LFO_RATE_MIN, LFO_RATE_MAX);
    this.node.parameters.get('rate').setValueAtTime(this._rate, this.ctx.currentTime);
  }

  setWaveform(waveform) {
    const index = OUT[waveform] ?? 5;
    if (this._selected !== null) { try { this.node.disconnect(this.output, this._selected); } catch (e) { /* not connected */ } }
    this.node.connect(this.output, index);
    this._selected = index;
    this._waveform = waveform;
  }

  getCurrentValue() {
    this._analyser.getFloatTimeDomainData(this._analyserData);
    return this._analyserData[0];
  }

  destroy() {
    for (const n of [this.node, this.output, this.triOutput, this.sqOutput, this.sawOutput, this.shOutput, this.rateInput, this.syncInput]) n.disconnect();
  }
}
