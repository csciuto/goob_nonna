import { JACK_TYPE } from '../../utils/constants.js';

/**
 * Patch point (jack) component.
 * Clickable circle that can participate in cable connections.
 */
export class Jack {
  /**
   * @param {object} options
   * @param {string} options.id - Patch point ID
   * @param {string} options.type - 'input' or 'output'
   * @param {string} options.label - Display label
   * @param {function} options.onClick - Callback(jackId, type, element)
   */
  constructor({ id, type, label = '', onClick = null }) {
    this.id = id;
    this.type = type;
    this.label = label;
    this.onClick = onClick;
    this._connected = false;

    this.element = this._create();
  }

  _create() {
    const container = document.createElement('div');
    container.className = 'jack-container';

    const jack = document.createElement('div');
    jack.className = `jack jack-${this.type}`;
    jack.dataset.jackId = this.id;
    jack.dataset.jackType = this.type;

    const hole = document.createElement('div');
    hole.className = 'jack-hole';
    jack.appendChild(hole);

    const labelEl = document.createElement('div');
    labelEl.className = 'jack-label';
    labelEl.textContent = this.label;

    container.appendChild(jack);
    container.appendChild(labelEl);

    this._jack = jack;

    jack.addEventListener('click', () => {
      if (this.onClick) this.onClick(this.id, this.type, this._jack);
    });

    return container;
  }

  setConnected(connected) {
    this._connected = connected;
    this._jack.classList.toggle('connected', connected);
  }

  getPosition() {
    const rect = this._jack.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  getElement() {
    return this.element;
  }
}
