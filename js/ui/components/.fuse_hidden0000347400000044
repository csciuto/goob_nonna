/**
 * Multi-position switch component.
 * Can be 2-position (toggle) or 3+ position.
 */
export class SwitchControl {
  /**
   * @param {object} options
   * @param {string} options.label - Display label
   * @param {Array<{value: *, label: string}>} options.positions - Switch positions
   * @param {number} options.selectedIndex - Initial position index
   * @param {function} options.onChange - Callback(value, index)
   */
  constructor({ label = '', positions = [], selectedIndex = 0, onChange = null }) {
    this.positions = positions;
    this.selectedIndex = selectedIndex;
    this.onChange = onChange;
    this.label = label;

    this.element = this._create();
  }

  _create() {
    const container = document.createElement('div');
    container.className = 'switch-container';

    const labelEl = document.createElement('div');
    labelEl.className = 'switch-label';
    labelEl.textContent = this.label;
    container.appendChild(labelEl);

    const switchBody = document.createElement('div');
    switchBody.className = 'switch-body';

    this._optionEls = [];

    this.positions.forEach((pos, i) => {
      const option = document.createElement('div');
      option.className = 'switch-option';
      option.textContent = pos.label;
      if (i === this.selectedIndex) option.classList.add('active');

      option.addEventListener('click', () => {
        this.setIndex(i);
      });

      switchBody.appendChild(option);
      this._optionEls.push(option);
    });

    container.appendChild(switchBody);
    return container;
  }

  setIndex(index) {
    if (index < 0 || index >= this.positions.length) return;
    this._optionEls[this.selectedIndex]?.classList.remove('active');
    this.selectedIndex = index;
    this._optionEls[this.selectedIndex]?.classList.add('active');
    if (this.onChange) {
      this.onChange(this.positions[index].value, index);
    }
  }

  getValue() {
    return this.positions[this.selectedIndex]?.value;
  }

  getElement() {
    return this.element;
  }
}
