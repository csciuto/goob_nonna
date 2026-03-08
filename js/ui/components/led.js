/**
 * LED indicator component.
 */
export class LED {
  constructor({ color = '#ff0000' } = {}) {
    this.color = color;
    this._on = false;
    this.element = this._create();
  }

  _create() {
    const led = document.createElement('div');
    led.className = 'led';
    led.style.setProperty('--led-color', this.color);
    this._led = led;
    return led;
  }

  setOn(on) {
    this._on = on;
    this._led.classList.toggle('on', on);
  }

  toggle() {
    this.setOn(!this._on);
  }

  getElement() {
    return this.element;
  }
}
