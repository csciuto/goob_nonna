import { Knob } from '../components/knob.js';
import { SwitchControl } from '../components/switch-control.js';
import { LED } from '../components/led.js';
import { Jack } from '../components/jack.js';
import { PATCH_POINTS, ARP_MODES } from '../../utils/constants.js';

export class PanelArpSeq {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-arp-seq';
    this.element.innerHTML = '<h3>ARP / SEQ</h3>';

    this.jacks = {};

    // Top: KB jacks (GATE OUT, then KB OUT + KB VEL OUT side by side)
    this.jacks.kbGate = new Jack({ id: PATCH_POINTS.KB_GATE, type: 'output', label: 'GATE', onClick: onJackClick });
    this.jacks.kbPitchCv = new Jack({ id: PATCH_POINTS.KB_PITCH_CV, type: 'output', label: 'KB', onClick: onJackClick });
    this.jacks.kbVel = new Jack({ id: PATCH_POINTS.KB_VEL, type: 'output', label: 'VEL', onClick: onJackClick });
    this.jacks.kbGate.getElement().dataset.tooltip = 'Gate signal — on while a key is held';
    this.jacks.kbPitchCv.getElement().dataset.tooltip = '1V/oct pitch CV from the keyboard';
    this.jacks.kbVel.getElement().dataset.tooltip = 'Velocity output from key press';

    const kbJackRow1 = document.createElement('div');
    kbJackRow1.className = 'jack-row jack-row-top';
    kbJackRow1.appendChild(this.jacks.kbGate.getElement());
    this.element.appendChild(kbJackRow1);

    const kbJackRow2 = document.createElement('div');
    kbJackRow2.className = 'jack-row jack-row-top';
    kbJackRow2.appendChild(this.jacks.kbPitchCv.getElement());
    kbJackRow2.appendChild(this.jacks.kbVel.getElement());
    this.element.appendChild(kbJackRow2);

    // RATE knob + LED — display BPM (20-280)
    this.rate = new Knob({ label: 'RATE', min: 0, max: 10, value: 5 });
    this.rate.getElement().dataset.tooltip = 'Clock speed for arpeggiator and sequencer (20-280 BPM)';
    // Override value display to show BPM
    const origRateUpdate = this.rate._updateVisual.bind(this.rate);
    this.rate._updateVisual = () => {
      origRateUpdate();
      const bpm = Math.round(20 + (this.rate.value / 10) * 260);
      this.rate._valueEl.textContent = `${bpm}`;
    };
    this.rate._updateVisual();
    this.led = new LED();

    const rateSection = document.createElement('div');
    rateSection.className = 'rate-section';
    rateSection.appendChild(this.rate.getElement());
    rateSection.appendChild(this.led.getElement());
    this.element.appendChild(rateSection);

    // MODE toggle: ARP, SEQ, REC
    this.mode = new SwitchControl({
      label: 'MODE',
      positions: [
        { value: 'arp', label: 'ARP' },
        { value: 'seq', label: 'SEQ' },
        { value: 'rec', label: 'REC' },
      ],
      selectedIndex: 0,
    });
    this.mode.getElement().dataset.tooltip = 'ARP / SEQ playback / REC to record';
    this.element.appendChild(this.mode.getElement());

    // DIRECTION toggle: ORDR, FWD/BWD, RNDM
    this.direction = new SwitchControl({
      label: 'DIRECTION',
      positions: [
        { value: ARP_MODES.ORDER, label: 'ORDR' },
        { value: ARP_MODES.FORWARD_BACKWARD, label: 'FWD/BWD' },
        { value: ARP_MODES.RANDOM, label: 'RNDM' },
      ],
      selectedIndex: 0,
    });
    this.direction.getElement().dataset.tooltip = 'Pattern direction: played order, forward-backward sweep, or random';
    this.element.appendChild(this.direction.getElement());

    // OCT / SEQ toggle: 1, 2, 3
    this.octSeq = new SwitchControl({
      label: 'OCT / SEQ',
      positions: [
        { value: 1, label: '1' },
        { value: 2, label: '2' },
        { value: 3, label: '3' },
      ],
      selectedIndex: 0,
    });
    this.octSeq.getElement().dataset.tooltip = 'Octave range for arpeggiator / sequence slot selection';
    this.element.appendChild(this.octSeq.getElement());

  }

  wire(engine) {
    // Arp/Seq wiring will be connected when those modules are implemented
  }

  getElement() { return this.element; }
}
