import { Knob } from '../components/knob.js';
import { Slider } from '../components/slider.js';
import { Jack } from '../components/jack.js';
import { PATCH_POINTS } from '../../utils/constants.js';

export class PanelEnvelope {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-envelope';
    this.element.innerHTML = '<h3>ENVELOPE</h3>';

    this.jacks = {};

    // Row 1 (centered): TRIGGER IN — inverted V top
    this.jacks.envGateIn = new Jack({ id: PATCH_POINTS.ENV_GATE_IN, type: 'input', label: 'TRIGGER IN', onClick: onJackClick });
    this.jacks.envGateIn.getElement().dataset.tooltip = 'Gate input — triggers the envelope on note-on';

    const jackRow1 = document.createElement('div');
    jackRow1.className = 'jack-row jack-row-top filter-jacks-narrow';
    jackRow1.appendChild(this.jacks.envGateIn.getElement());
    this.element.appendChild(jackRow1);

    // Row 2 (spread): +ENV OUT, -ENV OUT — inverted V bottom
    this.jacks.envOut = new Jack({ id: PATCH_POINTS.ENV_OUT, type: 'output', label: '+ENV OUT', onClick: onJackClick });
    this.jacks.envNegOut = new Jack({ id: PATCH_POINTS.ENV_NEG_OUT, type: 'output', label: '-ENV OUT', onClick: onJackClick });
    this.jacks.envOut.getElement().dataset.tooltip = 'Positive envelope CV output';
    this.jacks.envNegOut.getElement().dataset.tooltip = 'Inverted envelope CV output';
    this.jacks.envOut.getElement().classList.add('jack-output-label');
    this.jacks.envNegOut.getElement().classList.add('jack-output-label');

    const jackRow2 = document.createElement('div');
    jackRow2.className = 'jack-row jack-row-top filter-jacks-wide';
    jackRow2.appendChild(this.jacks.envOut.getElement());
    jackRow2.appendChild(this.jacks.envNegOut.getElement());
    this.element.appendChild(jackRow2);

    // Two columns: left = A/D/R knobs stacked, right = sustain slider
    const adsr = document.createElement('div');
    adsr.className = 'env-adsr';

    const knobCol = document.createElement('div');
    knobCol.className = 'env-knob-col';

    this.attack = new Knob({ label: 'ATTACK', min: 0, max: 10, value: 0.5 });
    this.decay = new Knob({ label: 'DECAY', min: 0, max: 10, value: 2 });
    this.release = new Knob({ label: 'RELEASE', min: 0, max: 10, value: 3 });
    this.attack.getElement().dataset.tooltip = 'Attack — how fast the sound reaches full volume';
    this.decay.getElement().dataset.tooltip = 'Decay — how fast it drops to the sustain level';
    this.release.getElement().dataset.tooltip = 'Release — how long the sound fades after letting go';

    knobCol.appendChild(this.attack.getElement());
    knobCol.appendChild(this.decay.getElement());
    knobCol.appendChild(this.release.getElement());

    // Sustain slider (tall, with graduation marks)
    const sustainCol = document.createElement('div');
    sustainCol.className = 'env-sustain-col';

    this.sustain = new Slider({ label: 'SUSTAIN', min: 0, max: 10, value: 7 });
    this.sustain.getElement().dataset.tooltip = 'Sustain — level held while the key is pressed';
    this.sustain.getElement().classList.add('sustain-tall');

    // Graduation marks
    const grads = document.createElement('div');
    grads.className = 'sustain-grads';
    for (let i = 0; i <= 10; i++) {
      const mark = document.createElement('div');
      mark.className = 'sustain-grad' + (i % 5 === 0 ? ' sustain-grad-major' : '');
      grads.appendChild(mark);
    }

    const sustainRow = document.createElement('div');
    sustainRow.className = 'sustain-with-grads';
    sustainRow.appendChild(grads);
    sustainRow.appendChild(this.sustain.getElement());

    sustainCol.appendChild(sustainRow);

    adsr.appendChild(knobCol);
    adsr.appendChild(sustainCol);
    this.element.appendChild(adsr);
  }

  wire(engine) {
    this.attack.onChange = (v) => engine.setEnvAttack(v);
    this.decay.onChange = (v) => engine.setEnvDecay(v);
    this.sustain.onChange = (v) => engine.setEnvSustain(v);
    this.release.onChange = (v) => engine.setEnvRelease(v);
  }

  getElement() { return this.element; }
}
