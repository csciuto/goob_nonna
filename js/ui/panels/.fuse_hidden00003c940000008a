import { Jack } from '../components/jack.js';
import { PATCH_POINTS } from '../../utils/constants.js';

/**
 * Back panel - clock and arp/seq utility jacks.
 * On the real Grandmother these are on the rear panel.
 * They may not have functional wiring but are included for completeness.
 */
export class PanelBack {
  constructor({ onJackClick }) {
    this.element = document.createElement('div');
    this.element.className = 'panel panel-back';
    this.element.innerHTML = '<h3>BACK</h3>';

    this.jacks = {};

    this.jacks.clockIn = new Jack({ id: PATCH_POINTS.CLOCK_IN, type: 'input', label: 'CLK IN', onClick: onJackClick });
    this.jacks.onOffIn = new Jack({ id: PATCH_POINTS.ON_OFF_IN, type: 'input', label: 'ON/OFF IN', onClick: onJackClick });
    this.jacks.resetIn = new Jack({ id: PATCH_POINTS.RESET_IN, type: 'input', label: 'RESET IN', onClick: onJackClick });
    this.jacks.clockOut = new Jack({ id: PATCH_POINTS.CLOCK_OUT, type: 'output', label: 'CLK OUT', onClick: onJackClick });

    this.jacks.clockIn.getElement().dataset.tooltip = 'External clock input for arp/seq sync';
    this.jacks.onOffIn.getElement().dataset.tooltip = 'Gate input to start/stop arp/seq externally';
    this.jacks.resetIn.getElement().dataset.tooltip = 'Reset arp/seq to step 1 on trigger';
    this.jacks.clockOut.getElement().dataset.tooltip = 'Clock pulse output for syncing external gear';

    const jackRow = document.createElement('div');
    jackRow.className = 'jack-row';
    jackRow.appendChild(this.jacks.clockIn.getElement());
    jackRow.appendChild(this.jacks.onOffIn.getElement());
    jackRow.appendChild(this.jacks.resetIn.getElement());
    jackRow.appendChild(this.jacks.clockOut.getElement());
    this.element.appendChild(jackRow);
  }

  wire(engine) {
    // Back panel jacks — placeholder, no functional wiring yet
  }

  getElement() { return this.element; }
}
