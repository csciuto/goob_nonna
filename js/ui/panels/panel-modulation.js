import { Knob } from '../components/knob.js';
import { SwitchControl } from '../components/switch-control.js';
import { Jack } from '../components/jack.js';
import { PATCH_POINTS, LFO_WAVEFORMS } from '../../utils/constants.js';

export class PanelModulation {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-modulation';
    this.element.innerHTML = '<h3>MODULATION</h3>';

    this.jacks = {};

    this.lfoRate = new Knob({ label: 'LFO RATE', min: 0, max: 10, value: 5 });

    this.lfoWaveform = new SwitchControl({
      label: 'LFO WAVE',
      positions: [
        { value: LFO_WAVEFORMS.TRIANGLE, label: 'TRI' },
        { value: LFO_WAVEFORMS.SQUARE, label: 'SQR' },
        { value: LFO_WAVEFORMS.SAWTOOTH, label: 'SAW' },
        { value: LFO_WAVEFORMS.RAMP, label: 'RAMP' },
        { value: LFO_WAVEFORMS.SAMPLE_HOLD, label: 'S/H' },
      ],
      selectedIndex: 0,
    });

    this.pitchAmt = new Knob({ label: 'PITCH AMT', min: 0, max: 10, value: 0 });
    this.cutoffAmt = new Knob({ label: 'CUTOFF AMT', min: 0, max: 10, value: 0 });
    this.pwAmt = new Knob({ label: 'PW AMT', min: 0, max: 10, value: 0 });

    this.element.appendChild(this.lfoRate.getElement());
    this.element.appendChild(this.lfoWaveform.getElement());
    this.element.appendChild(this.pitchAmt.getElement());
    this.element.appendChild(this.cutoffAmt.getElement());
    this.element.appendChild(this.pwAmt.getElement());

    // Jacks
    this.jacks.lfoTriOut = new Jack({ id: PATCH_POINTS.LFO_TRI_OUT, type: 'output', label: 'TRI OUT', onClick: onJackClick });
    this.jacks.lfoSqOut = new Jack({ id: PATCH_POINTS.LFO_SQ_OUT, type: 'output', label: 'SQ OUT', onClick: onJackClick });
    this.jacks.lfoSawOut = new Jack({ id: PATCH_POINTS.LFO_SAW_OUT, type: 'output', label: 'SAW OUT', onClick: onJackClick });
    this.jacks.lfoShOut = new Jack({ id: PATCH_POINTS.LFO_SH_OUT, type: 'output', label: 'S/H OUT', onClick: onJackClick });
    this.jacks.lfoRateIn = new Jack({ id: PATCH_POINTS.LFO_RATE_IN, type: 'input', label: 'RATE IN', onClick: onJackClick });

    const jackRow = document.createElement('div');
    jackRow.className = 'jack-row';
    jackRow.appendChild(this.jacks.lfoTriOut.getElement());
    jackRow.appendChild(this.jacks.lfoSqOut.getElement());
    jackRow.appendChild(this.jacks.lfoSawOut.getElement());
    jackRow.appendChild(this.jacks.lfoShOut.getElement());
    jackRow.appendChild(this.jacks.lfoRateIn.getElement());
    this.element.appendChild(jackRow);
  }

  wire(engine) {
    this.lfoRate.onChange = (v) => engine.setLFORate(v);
    this.lfoWaveform.onChange = (v) => engine.setLFOWaveform(v);
    this.pitchAmt.onChange = (v) => engine.setPitchAmount(v / 10);
    this.cutoffAmt.onChange = (v) => engine.setCutoffAmount(v / 10);
    this.pwAmt.onChange = (v) => engine.setPWAmount(v / 10);
  }

  getElement() { return this.element; }
}
