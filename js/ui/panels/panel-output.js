import { Knob } from '../components/knob.js';
import { SwitchControl } from '../components/switch-control.js';
import { Jack } from '../components/jack.js';
import { PATCH_POINTS, VCA_MODES } from '../../utils/constants.js';

export class PanelOutput {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-output';
    this.element.innerHTML = '<h3>OUTPUT</h3>';

    this.jacks = {};

    // Inverted V: VCA AMT IN centered on top
    this.jacks.vcaCvIn = new Jack({ id: PATCH_POINTS.VCA_CV_IN, type: 'input', label: 'VCA AMT IN', onClick: onJackClick });
    this.jacks.vcaCvIn.getElement().dataset.tooltip = 'CV input controlling VCA gain — normalled to envelope';

    const jackRow1 = document.createElement('div');
    jackRow1.className = 'jack-row jack-row-top filter-jacks-narrow';
    jackRow1.appendChild(this.jacks.vcaCvIn.getElement());
    this.element.appendChild(jackRow1);

    // Wide row: VCA IN, REVERB IN
    this.jacks.vcaIn = new Jack({ id: PATCH_POINTS.VCA_IN, type: 'input', label: 'VCA IN', onClick: onJackClick });
    this.jacks.reverbIn = new Jack({ id: PATCH_POINTS.REVERB_IN, type: 'input', label: 'REVERB IN', onClick: onJackClick });
    this.jacks.vcaIn.getElement().dataset.tooltip = 'Audio input to the amplifier — normalled to filter output';
    this.jacks.reverbIn.getElement().dataset.tooltip = 'Audio input to the reverb — normalled to VCA output';

    const jackRow2 = document.createElement('div');
    jackRow2.className = 'jack-row jack-row-top filter-jacks-wide';
    jackRow2.appendChild(this.jacks.vcaIn.getElement());
    jackRow2.appendChild(this.jacks.reverbIn.getElement());
    this.element.appendChild(jackRow2);

    // Volume knob
    this.volume = new Knob({ label: 'VOLUME', min: 0, max: 10, value: 7 });
    this.volume.getElement().dataset.tooltip = 'Master output level';
    this.element.appendChild(this.volume.getElement());

    // VCA MODE switch
    this.vcaMode = new SwitchControl({
      label: 'VCA MODE',
      positions: [
        { value: VCA_MODES.ENV, label: 'ENV' },
        { value: VCA_MODES.KB_RELEASE, label: 'KB RLS' },
        { value: VCA_MODES.DRONE, label: 'DRONE' },
      ],
      selectedIndex: 0,
    });
    this.vcaMode.getElement().dataset.tooltip = 'ENV uses full ADSR, KB RLS has instant attack, DRONE is always on';
    this.element.appendChild(this.vcaMode.getElement());

    // Spring Reverb sub-section — red box with black text
    const reverbSection = document.createElement('div');
    reverbSection.className = 'reverb-section';

    const reverbTitle = document.createElement('h4');
    reverbTitle.textContent = 'SPRING REVERB';
    reverbSection.appendChild(reverbTitle);

    this.reverbMix = new Knob({ label: 'MIX', min: 0, max: 10, value: 3 });
    this.reverbMix.getElement().dataset.tooltip = 'Dry/wet mix for the spring reverb effect';
    reverbSection.appendChild(this.reverbMix.getElement());

    this.element.appendChild(reverbSection);
  }

  wire(engine) {
    this.volume.onChange = (v) => engine.setOutputLevel(v);
    this.vcaMode.onChange = (v) => engine.setVCAMode(v);
    this.reverbMix.onChange = (v) => engine.setReverbMix(v);
  }

  getElement() { return this.element; }
}
