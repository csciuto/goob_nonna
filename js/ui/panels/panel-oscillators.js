import { Knob } from '../components/knob.js';
import { SwitchControl } from '../components/switch-control.js';
import { Jack } from '../components/jack.js';
import { WAVEFORMS, OCTAVE_FEET, PATCH_POINTS } from '../../utils/constants.js';

/**
 * Oscillators panel: OSC1 + OSC2.
 */
export class PanelOscillators {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-oscillators';

    this.jacks = {};

    // --- OSC 1 ---
    const osc1Section = document.createElement('div');
    osc1Section.className = 'panel-section';
    osc1Section.innerHTML = '<h3>OSC 1</h3>';

    this.osc1Waveform = new SwitchControl({
      label: 'WAVE',
      positions: [
        { value: WAVEFORMS.SAW, label: 'SAW' },
        { value: WAVEFORMS.TRIANGLE, label: 'TRI' },
        { value: WAVEFORMS.SQUARE, label: 'SQR' },
        { value: WAVEFORMS.NARROW_PULSE, label: 'PULSE' },
      ],
      selectedIndex: 0,
    });

    this.osc1Octave = new SwitchControl({
      label: 'OCTAVE',
      positions: OCTAVE_FEET.map(f => ({ value: f, label: `${f}'` })),
      selectedIndex: 2, // 8'
    });

    this.osc1Freq = new Knob({
      label: 'FREQ',
      min: -7,
      max: 7,
      value: 0,
      step: 0.1,
      bipolar: true,
    });

    osc1Section.appendChild(this.osc1Waveform.getElement());
    osc1Section.appendChild(this.osc1Octave.getElement());
    osc1Section.appendChild(this.osc1Freq.getElement());

    // OSC1 jacks
    this.jacks.osc1WaveOut = new Jack({ id: PATCH_POINTS.OSC1_WAVE_OUT, type: 'output', label: 'WAVE OUT', onClick: onJackClick });
    this.jacks.osc1PitchIn = new Jack({ id: PATCH_POINTS.OSC1_PITCH_IN, type: 'input', label: 'PITCH IN', onClick: onJackClick });
    this.jacks.osc1PwmIn = new Jack({ id: PATCH_POINTS.OSC1_PWM_IN, type: 'input', label: 'PWM IN', onClick: onJackClick });

    const osc1Jacks = document.createElement('div');
    osc1Jacks.className = 'jack-row';
    osc1Jacks.appendChild(this.jacks.osc1WaveOut.getElement());
    osc1Jacks.appendChild(this.jacks.osc1PitchIn.getElement());
    osc1Jacks.appendChild(this.jacks.osc1PwmIn.getElement());
    osc1Section.appendChild(osc1Jacks);

    // --- OSC 2 ---
    const osc2Section = document.createElement('div');
    osc2Section.className = 'panel-section';
    osc2Section.innerHTML = '<h3>OSC 2</h3>';

    this.osc2Waveform = new SwitchControl({
      label: 'WAVE',
      positions: [
        { value: WAVEFORMS.SAW, label: 'SAW' },
        { value: WAVEFORMS.TRIANGLE, label: 'TRI' },
        { value: WAVEFORMS.SQUARE, label: 'SQR' },
        { value: WAVEFORMS.NARROW_PULSE, label: 'PULSE' },
      ],
      selectedIndex: 0,
    });

    this.osc2Octave = new SwitchControl({
      label: 'OCTAVE',
      positions: OCTAVE_FEET.map(f => ({ value: f, label: `${f}'` })),
      selectedIndex: 2, // 8'
    });

    this.osc2Freq = new Knob({
      label: 'FREQ',
      min: -7,
      max: 7,
      value: 0,
      step: 0.1,
      bipolar: true,
    });

    this.osc2Sync = new SwitchControl({
      label: 'SYNC',
      positions: [
        { value: false, label: 'OFF' },
        { value: true, label: 'ON' },
      ],
      selectedIndex: 0,
    });

    osc2Section.appendChild(this.osc2Waveform.getElement());
    osc2Section.appendChild(this.osc2Octave.getElement());
    osc2Section.appendChild(this.osc2Freq.getElement());
    osc2Section.appendChild(this.osc2Sync.getElement());

    // OSC2 jacks
    this.jacks.osc2WaveOut = new Jack({ id: PATCH_POINTS.OSC2_WAVE_OUT, type: 'output', label: 'WAVE OUT', onClick: onJackClick });
    this.jacks.osc2PitchIn = new Jack({ id: PATCH_POINTS.OSC2_PITCH_IN, type: 'input', label: 'PITCH IN', onClick: onJackClick });
    this.jacks.osc2PwmIn = new Jack({ id: PATCH_POINTS.OSC2_PWM_IN, type: 'input', label: 'PWM IN', onClick: onJackClick });
    this.jacks.syncIn = new Jack({ id: PATCH_POINTS.SYNC_IN, type: 'input', label: 'SYNC IN', onClick: onJackClick });

    const osc2Jacks = document.createElement('div');
    osc2Jacks.className = 'jack-row';
    osc2Jacks.appendChild(this.jacks.osc2WaveOut.getElement());
    osc2Jacks.appendChild(this.jacks.osc2PitchIn.getElement());
    osc2Jacks.appendChild(this.jacks.osc2PwmIn.getElement());
    osc2Jacks.appendChild(this.jacks.syncIn.getElement());
    osc2Section.appendChild(osc2Jacks);

    this.element.appendChild(osc1Section);
    this.element.appendChild(osc2Section);
  }

  wire(engine) {
    this.osc1Waveform.onChange = (v) => engine.setOsc1Waveform(v);
    this.osc1Octave.onChange = (v) => engine.setOsc1Octave(v);
    this.osc1Freq.onChange = (v) => engine.setOsc1Detune(v);

    this.osc2Waveform.onChange = (v) => engine.setOsc2Waveform(v);
    this.osc2Octave.onChange = (v) => engine.setOsc2Octave(v);
    this.osc2Freq.onChange = (v) => engine.setOsc2Detune(v);
    this.osc2Sync.onChange = (v) => engine.setOsc2Sync(v);
  }

  getElement() { return this.element; }
}
