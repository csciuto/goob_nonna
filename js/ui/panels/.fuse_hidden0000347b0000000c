import { Wheel } from '../components/wheel.js';

/**
 * Left-hand controller panel: Pitch wheel + Mod wheel + Glide knob.
 */
export class PanelController {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-controller';
    this.element.innerHTML = '<h3>CONTROLLER</h3>';

    this.pitchWheel = new Wheel({
      label: 'PITCH',
      springReturn: true,
      min: -1,
      max: 1,
      value: 0,
    });

    this.modWheel = new Wheel({
      label: 'MOD',
      springReturn: false,
      min: 0,
      max: 1,
      value: 0,
    });

    this.element.appendChild(this.pitchWheel.getElement());
    this.element.appendChild(this.modWheel.getElement());
  }

  wire(engine) {
    this.pitchWheel.onChange = (v) => engine.setPitchWheel(v);
    this.modWheel.onChange = (v) => engine.setModWheel(v);
  }

  getElement() { return this.element; }
}
