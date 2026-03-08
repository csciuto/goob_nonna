/**
 * Rotary knob component.
 * Rendered as a CSS circle with a pointer line.
 * Vertical drag to change value.
 */
export class Knob {
  /**
   * @param {object} options
   * @param {string} options.label - Display label
   * @param {number} options.min - Minimum value
   * @param {number} options.max - Maximum value
   * @param {number} options.value - Initial value
   * @param {number} options.step - Value increment
   * @param {function} options.onChange - Callback(value)
   * @param {boolean} options.bipolar - If true, center is zero
   */
  constructor({ label = '', min = 0, max = 10, value = 5, step = 0.1, onChange = null, bipolar = false }) {
    this.min = min;
    this.max = max;
    this.value = value;
    this.step = step;
    this.onChange = onChange;
    this.bipolar = bipolar;
    this.label = label;

    this._dragging = false;
    this._lastY = 0;

    this.element = this._create();
    this._updateVisual();
  }

  _create() {
    const container = document.createElement('div');
    container.className = 'knob-container';

    const knobBody = document.createElement('div');
    knobBody.className = 'knob';

    const pointer = document.createElement('div');
    pointer.className = 'knob-pointer';
    knobBody.appendChild(pointer);

    const labelEl = document.createElement('div');
    labelEl.className = 'knob-label';
    labelEl.textContent = this.label;

    const valueEl = document.createElement('div');
    valueEl.className = 'knob-value';
    this._valueEl = valueEl;

    container.appendChild(knobBody);
    container.appendChild(labelEl);
    container.appendChild(valueEl);

    this._knobBody = knobBody;
    this._pointer = pointer;

    // Mouse interaction
    knobBody.addEventListener('mousedown', (e) => this._onMouseDown(e));
    document.addEventListener('mousemove', (e) => this._onMouseMove(e));
    document.addEventListener('mouseup', () => this._onMouseUp());

    // Prevent text selection during drag
    knobBody.addEventListener('selectstart', (e) => e.preventDefault());

    return container;
  }

  _onMouseDown(e) {
    this._dragging = true;
    this._lastY = e.clientY;
    this._knobBody.classList.add('active');
    e.preventDefault();
  }

  _onMouseMove(e) {
    if (!this._dragging) return;

    const dy = this._lastY - e.clientY; // Up = positive
    this._lastY = e.clientY;

    const range = this.max - this.min;
    const sensitivity = range / 200; // 200px for full range
    const delta = dy * sensitivity;

    this.setValue(this.value + delta);
  }

  _onMouseUp() {
    if (this._dragging) {
      this._dragging = false;
      this._knobBody.classList.remove('active');
    }
  }

  setValue(newValue) {
    // Quantize to step
    newValue = Math.round(newValue / this.step) * this.step;
    newValue = Math.max(this.min, Math.min(this.max, newValue));

    if (newValue !== this.value) {
      this.value = newValue;
      this._updateVisual();
      if (this.onChange) this.onChange(this.value);
    }
  }

  _updateVisual() {
    // Map value to rotation: -135° to +135° (270° range)
    const normalized = (this.value - this.min) / (this.max - this.min);
    const angle = -135 + normalized * 270;
    this._knobBody.style.transform = `rotate(${angle}deg)`;
    this._valueEl.textContent = this.value.toFixed(1);
  }

  getElement() {
    return this.element;
  }
}
