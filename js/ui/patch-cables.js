import { CABLE_COLORS } from '../utils/constants.js';

/**
 * Patch cable SVG rendering system.
 * SVG overlay on top of the synth panel.
 * Click output jack → cable follows mouse → click input jack → finalize.
 */
export class PatchCableRenderer {
  /**
   * @param {object} options
   * @param {HTMLElement} options.container - Container element for SVG overlay
   * @param {function} options.onConnect - Callback(sourceId, destId, color)
   * @param {function} options.onDisconnect - Callback(patchId)
   */
  constructor({ container, onConnect = null, onDisconnect = null }) {
    this.container = container;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;

    this._cables = new Map(); // patchId → SVG path element
    this._colorIndex = 0;
    this._pending = null; // { sourceId, sourcePos, color }

    this.svg = this._createSVG();
    this.container.appendChild(this.svg);

    // Pending cable (follows mouse)
    this._pendingPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this._pendingPath.setAttribute('class', 'patch-cable pending');
    this._pendingPath.setAttribute('fill', 'none');
    this._pendingPath.setAttribute('stroke-width', '4');
    this._pendingPath.style.display = 'none';
    this.svg.appendChild(this._pendingPath);

    // Mouse tracking for pending cable
    document.addEventListener('mousemove', (e) => this._onMouseMove(e));

    // ESC to cancel pending
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cancelPending();
    });
  }

  _createSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'patch-cable-overlay');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '100';
    return svg;
  }

  _nextColor() {
    const color = CABLE_COLORS[this._colorIndex % CABLE_COLORS.length];
    this._colorIndex++;
    return color;
  }

  /**
   * Called when a jack is clicked.
   * If no pending connection: start one (if output jack).
   * If pending: finish connection (if input jack).
   */
  handleJackClick(jackId, jackType, jackElement) {
    if (!this._pending) {
      // Start a new connection from an output jack
      if (jackType === 'both') {
        // a MULT jack: the other end decides which way the signal runs
        const pos = this._getJackCenter(jackElement);
        const color = this._nextColor();
        this._pending = { sourceId: jackId, sourcePos: pos, color, isBoth: true };
        this._pendingPath.setAttribute('stroke', color);
        this._pendingPath.style.display = 'block';
      } else if (jackType === 'output') {
        const pos = this._getJackCenter(jackElement);
        const color = this._nextColor();
        this._pending = { sourceId: jackId, sourcePos: pos, color };
        this._pendingPath.setAttribute('stroke', color);
        this._pendingPath.style.display = 'block';
      } else {
        // Clicked an input without pending - check if we should start from input
        // (allow reverse-direction patching: click input first, then output)
        const pos = this._getJackCenter(jackElement);
        const color = this._nextColor();
        this._pending = { sourceId: jackId, sourcePos: pos, color, isInput: true };
        this._pendingPath.setAttribute('stroke', color);
        this._pendingPath.style.display = 'block';
      }
    } else {
      // Complete the connection
      let sourceId, destId;
      if (this._pending.isBoth) {
        // Started from a MULT jack: to an input it sends, from an output it receives
        if (jackType === 'input') { sourceId = this._pending.sourceId; destId = jackId; }
        else if (jackType === 'output') { sourceId = jackId; destId = this._pending.sourceId; }
        else { this.cancelPending(); return; }
      } else if (this._pending.isInput) {
        // Started from input, now clicking output (or a MULT jack)
        if (jackType !== 'output' && jackType !== 'both') {
          this.cancelPending();
          return;
        }
        sourceId = jackId;
        destId = this._pending.sourceId;
      } else {
        // Started from output, now clicking input (or a MULT jack)
        if (jackType !== 'input' && jackType !== 'both') {
          this.cancelPending();
          return;
        }
        sourceId = this._pending.sourceId;
        destId = jackId;
      }

      const color = this._pending.color;
      this.cancelPending();

      // Remove existing cable on either jack (one cable per jack)
      this._removeExistingCables(sourceId);
      this._removeExistingCables(destId);

      if (this.onConnect) {
        this.onConnect(sourceId, destId, color);
      }
    }
  }

  /**
   * Add a visual cable between two jacks.
   */
  addCable(patchId, sourceElement, destElement, color) {
    const sourcePos = this._getJackCenter(sourceElement);
    const destPos = this._getJackCenter(destElement);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'patch-cable');
    path.setAttribute('d', this._cablePath(sourcePos, destPos));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '4');
    path.setAttribute('stroke-linecap', 'round');
    path.dataset.patchId = patchId;

    // Invisible wider hit area for easier clicking
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitArea.setAttribute('d', this._cablePath(sourcePos, destPos));
    hitArea.setAttribute('fill', 'none');
    hitArea.setAttribute('stroke', 'transparent');
    hitArea.setAttribute('stroke-width', '14');
    hitArea.style.pointerEvents = 'stroke';
    hitArea.style.cursor = 'pointer';
    hitArea.dataset.patchId = patchId;

    // Click hit area to disconnect
    hitArea.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onDisconnect) {
        this.onDisconnect(patchId);
      }
    });

    this.svg.appendChild(path);
    this.svg.appendChild(hitArea);
    this._cables.set(patchId, { path, hitArea, sourceElement, destElement });
  }

  /**
   * Remove a visual cable.
   */
  removeCable(patchId) {
    const cable = this._cables.get(patchId);
    if (cable) {
      cable.path.remove();
      if (cable.hitArea) cable.hitArea.remove();
      this._cables.delete(patchId);
    }
  }

  /**
   * Remove all cables.
   */
  removeAllCables() {
    for (const [patchId] of this._cables) {
      this.removeCable(patchId);
    }
  }

  /**
   * Update all cable positions (call on resize).
   */
  updatePositions() {
    for (const cable of this._cables.values()) {
      const sourcePos = this._getJackCenter(cable.sourceElement);
      const destPos = this._getJackCenter(cable.destElement);
      const d = this._cablePath(sourcePos, destPos);
      cable.path.setAttribute('d', d);
      if (cable.hitArea) cable.hitArea.setAttribute('d', d);
    }
  }

  /**
   * Remove all cables connected to a jack (for right-click removal).
   */
  removeJackCables(jackId) {
    for (const [patchId] of this._cables) {
      if (patchId.startsWith(jackId + '->') || patchId.endsWith('->' + jackId)) {
        if (this.onDisconnect) this.onDisconnect(patchId);
        return;
      }
    }
  }

  /**
   * Remove any existing cables connected to a jack (one cable per jack rule).
   */
  _removeExistingCables(jackId) {
    for (const [patchId] of this._cables) {
      // patchId format: "sourceId->destId"
      if (patchId.startsWith(jackId + '->') || patchId.endsWith('->' + jackId)) {
        if (this.onDisconnect) this.onDisconnect(patchId);
        return; // Only one can exist per jack
      }
    }
  }

  cancelPending() {
    this._pending = null;
    this._pendingPath.style.display = 'none';
  }

  _onMouseMove(e) {
    if (!this._pending) return;
    const svgRect = this.svg.getBoundingClientRect();
    const mousePos = {
      x: e.clientX - svgRect.left,
      y: e.clientY - svgRect.top,
    };
    this._pendingPath.setAttribute('d', this._cablePath(this._pending.sourcePos, mousePos));
  }

  _getJackCenter(element) {
    const rect = element.getBoundingClientRect();
    const svgRect = this.svg.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - svgRect.left,
      y: rect.top + rect.height / 2 - svgRect.top,
    };
  }

  /**
   * Generate a drooping cable path (cubic bezier).
   */
  _cablePath(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Droop amount proportional to distance
    const droop = Math.min(dist * 0.3, 80);

    const midX = (from.x + to.x) / 2;
    const midY = Math.max(from.y, to.y) + droop;

    return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
  }
}
