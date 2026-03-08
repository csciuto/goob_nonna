import { Knob } from '../components/knob.js';
import { Jack } from '../components/jack.js';
import { PATCH_POINTS } from '../../utils/constants.js';

export class PanelMixer {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-mixer';
    this.element.innerHTML = '<h3>MIXER</h3>';

    this.jacks = {};

    // Row 1: OSC 1 IN, OSC 2 IN
    this.jacks.mixerOsc1In = new Jack({ id: PATCH_POINTS.MIXER_OSC1_IN, type: 'input', label: 'OSC 1 IN', onClick: onJackClick });
    this.jacks.mixerOsc2In = new Jack({ id: PATCH_POINTS.MIXER_OSC2_IN, type: 'input', label: 'OSC 2 IN', onClick: onJackClick });
    this.jacks.mixerOsc1In.getElement().dataset.tooltip = 'Audio input for mixer channel 1 — normalled to OSC1';
    this.jacks.mixerOsc2In.getElement().dataset.tooltip = 'Audio input for mixer channel 2 — normalled to OSC2';

    const jackRow1 = document.createElement('div');
    jackRow1.className = 'jack-row jack-row-top';
    jackRow1.appendChild(this.jacks.mixerOsc1In.getElement());
    jackRow1.appendChild(this.jacks.mixerOsc2In.getElement());
    this.element.appendChild(jackRow1);

    // Row 2: NOISE IN, OUTPUT
    this.jacks.mixerNoiseIn = new Jack({ id: PATCH_POINTS.MIXER_NOISE_IN, type: 'input', label: 'NOISE IN', onClick: onJackClick });
    this.jacks.mixerOut = new Jack({ id: PATCH_POINTS.MIXER_OUT, type: 'output', label: 'OUTPUT', onClick: onJackClick });
    this.jacks.mixerNoiseIn.getElement().dataset.tooltip = 'Audio input for mixer channel 3 — normalled to noise';
    this.jacks.mixerOut.getElement().dataset.tooltip = 'Combined audio output from all mixer channels';
    this.jacks.mixerOut.getElement().classList.add('jack-output-label');

    const jackRow2 = document.createElement('div');
    jackRow2.className = 'jack-row jack-row-top';
    jackRow2.appendChild(this.jacks.mixerNoiseIn.getElement());
    jackRow2.appendChild(this.jacks.mixerOut.getElement());
    this.element.appendChild(jackRow2);

    // Knobs: OSC 1 (blue), OSC 2 (blue), NOISE
    this.osc1Level = new Knob({ label: 'OSCILLATOR 1', min: 0, max: 10, value: 8 });
    this.osc2Level = new Knob({ label: 'OSCILLATOR 2', min: 0, max: 10, value: 0 });
    this.noiseLevel = new Knob({ label: 'NOISE', min: 0, max: 10, value: 0 });

    this.osc1Level.getElement().classList.add('mixer-osc');
    this.osc2Level.getElement().classList.add('mixer-osc');

    this.osc1Level.getElement().dataset.tooltip = 'Volume level of oscillator 1 in the mix';
    this.osc2Level.getElement().dataset.tooltip = 'Volume level of oscillator 2 in the mix';
    this.noiseLevel.getElement().dataset.tooltip = 'Volume level of white noise in the mix';

    this.element.appendChild(this.osc1Level.getElement());
    this.element.appendChild(this.osc2Level.getElement());
    this.element.appendChild(this.noiseLevel.getElement());
  }

  wire(engine) {
    this.osc1Level.onChange = (v) => engine.setMixerOsc1Level(v);
    this.osc2Level.onChange = (v) => engine.setMixerOsc2Level(v);
    this.noiseLevel.onChange = (v) => engine.setMixerNoiseLevel(v);
  }

  getElement() { return this.element; }
}
