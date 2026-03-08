/**
 * Button component - toggle or momentary.
 */
export class Button {
  /**
   * @param {object} options
   * @param {string} options.label - Display label
   * @param {boolean} options.toggle - If true, button toggles on/off
   * @param {boolean} options.active - Initial state (for toggle)
   * @param {function} options.onPress - Callback() on press
   * @param {function} options.onRelease - Callback() on release (momentary)
   * @param {function} options.onChange - Callback(active) on state change (toggle)
   */
  constructor({ label = '', toggle = false, active = false, onPress = null, onRelease = null, onChange = null }) {
    this.label = label;
    this.toggle = toggle;
    this.active = active;
    this.onPress = onPress;
    this.onRelease = onRelease;
    this.onChange = onChange;

    this.element = this._create();
    this._updateVisual();
  }

  _create() {
    const container = document.createElement('div');
    container.className = 'button-container';

    const btn = document.createElement('div');
    btn.className = 'synth-button';

    const labelEl = document.createElement('div');
    labelEl.className = 'button-label';
    labelEl.textContent = this.label;

    container.appendChild(btn);
    container.appendChild(labelEl);

    this._btn = btn;

    if (this.toggle) {
      btn.addEventListener('click', () => {
        this.active = !this.active;
        this._updateVisual();
        if (this.onChange) this.onChange(this.active);
      });
    } else {
      btn.addEventListener('mousedown', (e) => {
        this.active = true;
        this._updateVisual();
        if (this.onPress) this.onPress();
        e.preventDefault();
      });
      btn.addEventListener('mouseup', () => {
        this.active = false;
        this._updateVisual();
        if (this.onRelease) this.onRelease();
      });
      btn.addEventListener('mouseleave', () => {
        if (this.active) {
          this.active = false;
          this._updateVisual();
          if (this.onRelease) this.onRelease();
        }
      });
    }

    return container;
  }

  setActive(active) {
    this.active = active;
    this._updateVisual();
  }

  _updateVisual() {
    this._btn.classList.toggle('active', this.active);
  }

  getElement() {
    return this.element;
  }
}
