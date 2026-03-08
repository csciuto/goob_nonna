import { Slider } from '../components/slider.js';
import { Jack } from '../components/jack.js';
import { PATCH_POINTS } from '../../utils/constants.js';

export class PanelEnvelope {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-envelope';
    this.element.innerHTML = '<h3>ENVELOPE</h3>';

    this.jacks = {};

    const slidersRow = document.createElement('div');
    slidersRow.className = 'sliders-row';

    this.attack = new Slider({ label: 'A', min: 0, max: 10, value: 0.5 });
    this.decay = new Slider({ label: 'D', min: 0, max: 10, value: 2 });
    this.sustain = new Slider({ label: 'S', min: 0, max: 10, value: 7 });
    this.release = new Slider({ label: 'R', min: 0, max: 10, value: 3 });

    slidersRow.appendChild(this.attack.getElement());
    slidersRow.appendChild(this.decay.getElement());
    slidersRow.appendChild(this.sustain.getElement());
    slidersRow.appendChild(this.release.getElement());

    this.element.appendChild(slidersRow);

    // Jacks
    this.jacks.envGateIn = new Jack({ id: PATCH_POINTS.ENV_GATE_IN, type: 'input', label: 'GATE IN', onClick: onJackClick });
    this.jacks.envOut = new Jack({ id: PATCH_POINTS.ENV_OUT, type: 'output', label: 'ENV OUT', onClick: onJackClick });

    const jackRow = document.createElement('div');
    jackRow.className = 'jack-row';
    jackRow.appendChild(this.jacks.envGateIn.getElement());
    jackRow.appendChild(this.jacks.envOut.getElement());
    this.element.appendChild(jackRow);
  }

  wire(engine) {
    this.attack.onChange = (v) => engine.setEnvAttack(v);
    this.decay.onChange = (v) => engine.setEnvDecay(v);
    this.sustain.onChange = (v) => engine.setEnvSustain(v);
    this.release.onChange = (v) => engine.setEnvRelease(v);
  }

  getElement() { return this.element; }
}
