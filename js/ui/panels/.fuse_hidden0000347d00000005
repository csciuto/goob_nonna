import { Knob } from '../components/knob.js';
import { Jack } from '../components/jack.js';
import { PATCH_POINTS } from '../../utils/constants.js';

export class PanelMixer {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-mixer';
    this.element.innerHTML = '<h3>MIXER</h3>';

    this.jacks = {};

    this.osc1Level = new Knob({ label: 'OSC 1', min: 0, max: 10, value: 8, onChange: null });
    this.osc2Level = new Knob({ label: 'OSC 2', min: 0, max: 10, value: 0, onChange: null });
    this.noiseLevel = new Knob({ label: 'NOISE', min: 0, max: 10, value: 0, onChange: null });

    this.element.appendChild(this.osc1Level.getElement());
    this.element.appendChild(this.osc2Level.getElement());
    this.element.appendChild(this.noiseLevel.getElement());

    // Jacks
    this.jacks.mixerOsc1In = new Jack({ id: PATCH_POINTS.MIXER_OSC1_IN, type: 'input', label: 'OSC1 IN', onClick: onJackClick });
    this.jacks.mixerOsc2In = new Jack({ id: PATCH_POINTS.MIXER_OSC2_IN, type: 'input', label: 'OSC2 IN', onClick: onJackClick });
    this.jacks.mixerNoiseIn = new Jack({ id: PATCH_POINTS.MIXER_NOISE_IN, type: 'input', label: 'NOISE IN', onClick: onJackClick });
    this.jacks.mixerOut = new Jack({ id: PATCH_POINTS.MIXER_OUT, type: 'output', label: 'MIX OUT', onClick: onJackClick });
    this.jacks.noiseOut = new Jack({ id: PATCH_POINTS.NOISE_OUT, type: 'output', label: 'NOISE OUT', onClick: onJackClick });

    const jackRow = document.createElement('div');
    jackRow.className = 'jack-row';
    jackRow.appendChild(this.jacks.mixerOsc1In.getElement());
    jackRow.appendChild(this.jacks.mixerOsc2In.getElement());
    jackRow.appendChild(this.jacks.mixerNoiseIn.getElement());
    jackRow.appendChild(this.jacks.mixerOut.getElement());
    jackRow.appendChild(this.jacks.noiseOut.getElement());
    this.element.appendChild(jackRow);
  }

  wire(engine) {
    this.osc1Level.onChange = (v) => engine.setMixerOsc1Level(v);
    this.osc2Level.onChange = (v) => engine.setMixerOsc2Level(v);
    this.noiseLevel.onChange = (v) => engine.setMixerNoiseLevel(v);
  }

  getElement() { return this.element; }
}
