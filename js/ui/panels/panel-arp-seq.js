import { Knob } from '../components/knob.js';
import { SwitchControl } from '../components/switch-control.js';
import { Button } from '../components/button.js';
import { LED } from '../components/led.js';
import { Jack } from '../components/jack.js';
import { PATCH_POINTS, ARP_MODES } from '../../utils/constants.js';

export class PanelArpSeq {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-arp-seq';
    this.element.innerHTML = '<h3>ARP / SEQ</h3>';

    this.jacks = {};

    this.rate = new Knob({ label: 'RATE', min: 0, max: 10, value: 5 });
    this.glide = new Knob({ label: 'GLIDE', min: 0, max: 10, value: 0 });

    this.arpMode = new SwitchControl({
      label: 'ARP MODE',
      positions: [
        { value: ARP_MODES.ORDER, label: 'ORD' },
        { value: ARP_MODES.FORWARD, label: 'FWD' },
        { value: ARP_MODES.BACKWARD, label: 'BWD' },
        { value: ARP_MODES.FORWARD_BACKWARD, label: 'F/B' },
        { value: ARP_MODES.RANDOM, label: 'RND' },
      ],
      selectedIndex: 0,
    });

    this.octaveRange = new SwitchControl({
      label: 'RANGE',
      positions: [
        { value: 1, label: '1' },
        { value: 2, label: '2' },
        { value: 3, label: '3' },
      ],
      selectedIndex: 0,
    });

    const buttonsRow = document.createElement('div');
    buttonsRow.className = 'buttons-row';

    this.playBtn = new Button({ label: 'PLAY', toggle: true });
    this.holdBtn = new Button({ label: 'HOLD', toggle: true });
    this.recBtn = new Button({ label: 'REC', toggle: true });
    this.tapBtn = new Button({ label: 'TAP', toggle: false });

    this.led = new LED();

    buttonsRow.appendChild(this.playBtn.getElement());
    buttonsRow.appendChild(this.holdBtn.getElement());
    buttonsRow.appendChild(this.recBtn.getElement());
    buttonsRow.appendChild(this.tapBtn.getElement());
    buttonsRow.appendChild(this.led.getElement());

    this.element.appendChild(this.rate.getElement());
    this.element.appendChild(this.glide.getElement());
    this.element.appendChild(this.arpMode.getElement());
    this.element.appendChild(this.octaveRange.getElement());
    this.element.appendChild(buttonsRow);

    // Jacks
    this.jacks.arpSeqCvOut = new Jack({ id: PATCH_POINTS.ARP_SEQ_CV_OUT, type: 'output', label: 'CV OUT', onClick: onJackClick });
    this.jacks.arpSeqGateOut = new Jack({ id: PATCH_POINTS.ARP_SEQ_GATE_OUT, type: 'output', label: 'GATE OUT', onClick: onJackClick });
    this.jacks.clockOut = new Jack({ id: PATCH_POINTS.CLOCK_OUT, type: 'output', label: 'CLK OUT', onClick: onJackClick });
    this.jacks.arpSeqIn = new Jack({ id: PATCH_POINTS.ARP_SEQ_IN, type: 'input', label: 'CLK IN', onClick: onJackClick });

    const jackRow = document.createElement('div');
    jackRow.className = 'jack-row';
    jackRow.appendChild(this.jacks.arpSeqCvOut.getElement());
    jackRow.appendChild(this.jacks.arpSeqGateOut.getElement());
    jackRow.appendChild(this.jacks.clockOut.getElement());
    jackRow.appendChild(this.jacks.arpSeqIn.getElement());
    this.element.appendChild(jackRow);
  }

  wire(engine) {
    this.glide.onChange = (v) => engine.setGlide(v);
    // Arp/Seq wiring will be connected when those modules are implemented
  }

  getElement() { return this.element; }
}
