import { Knob } from '../components/knob.js';
import { Jack } from '../components/jack.js';
import { PATCH_POINTS } from '../../utils/constants.js';

export class PanelUtilities {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-utilities';
    this.element.innerHTML = '<h3>UTILITIES</h3>';

    this.jacks = {};

    // Mult section
    const multSection = document.createElement('div');
    multSection.className = 'panel-section';
    multSection.innerHTML = '<h4>MULT</h4>';

    this.jacks.mult1 = new Jack({ id: PATCH_POINTS.MULT_1, type: 'output', label: '1', onClick: onJackClick });
    this.jacks.mult2 = new Jack({ id: PATCH_POINTS.MULT_2, type: 'output', label: '2', onClick: onJackClick });
    this.jacks.mult3 = new Jack({ id: PATCH_POINTS.MULT_3, type: 'input', label: '3', onClick: onJackClick });
    this.jacks.mult4 = new Jack({ id: PATCH_POINTS.MULT_4, type: 'input', label: '4', onClick: onJackClick });

    const multJacks = document.createElement('div');
    multJacks.className = 'jack-row';
    multJacks.appendChild(this.jacks.mult1.getElement());
    multJacks.appendChild(this.jacks.mult2.getElement());
    multJacks.appendChild(this.jacks.mult3.getElement());
    multJacks.appendChild(this.jacks.mult4.getElement());
    multSection.appendChild(multJacks);

    // HPF section
    const hpfSection = document.createElement('div');
    hpfSection.className = 'panel-section';
    hpfSection.innerHTML = '<h4>HPF</h4>';

    this.hpfCutoff = new Knob({ label: 'CUTOFF', min: 0, max: 10, value: 5 });
    hpfSection.appendChild(this.hpfCutoff.getElement());

    this.jacks.hpfIn = new Jack({ id: PATCH_POINTS.HPF_IN, type: 'input', label: 'IN', onClick: onJackClick });
    this.jacks.hpfOut = new Jack({ id: PATCH_POINTS.HPF_OUT, type: 'output', label: 'OUT', onClick: onJackClick });

    const hpfJacks = document.createElement('div');
    hpfJacks.className = 'jack-row';
    hpfJacks.appendChild(this.jacks.hpfIn.getElement());
    hpfJacks.appendChild(this.jacks.hpfOut.getElement());
    hpfSection.appendChild(hpfJacks);

    // Attenuator section
    const attenSection = document.createElement('div');
    attenSection.className = 'panel-section';
    attenSection.innerHTML = '<h4>ATTEN</h4>';

    this.attenAmount = new Knob({ label: 'AMOUNT', min: -10, max: 10, value: 10, bipolar: true });
    attenSection.appendChild(this.attenAmount.getElement());

    this.jacks.attenIn = new Jack({ id: PATCH_POINTS.ATTEN_IN, type: 'input', label: 'IN', onClick: onJackClick });
    this.jacks.attenOut = new Jack({ id: PATCH_POINTS.ATTEN_OUT, type: 'output', label: 'OUT', onClick: onJackClick });

    const attenJacks = document.createElement('div');
    attenJacks.className = 'jack-row';
    attenJacks.appendChild(this.jacks.attenIn.getElement());
    attenJacks.appendChild(this.jacks.attenOut.getElement());
    attenSection.appendChild(attenJacks);

    this.element.appendChild(multSection);
    this.element.appendChild(hpfSection);
    this.element.appendChild(attenSection);
  }

  wire(engine) {
    this.hpfCutoff.onChange = (v) => engine.setHPFCutoff(v / 10);
    this.attenAmount.onChange = (v) => engine.setAttenuatorAmount(v / 10);
  }

  getElement() { return this.element; }
}
