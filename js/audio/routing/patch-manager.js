import { JACK_TYPE } from '../../utils/constants.js';
import { NORMALLED_CONNECTIONS } from './normalled-connections.js';

/**
 * Patch Manager - Manages patch cable connections and normalled routing.
 *
 * When a cable is connected to an input jack:
 *   1. Break the normalled connection to that input
 *   2. Connect the new source to the input
 *
 * When a cable is removed from an input jack:
 *   1. Disconnect the patched source
 *   2. Restore the normalled connection
 */
export class PatchManager {
  /**
   * @param {import('./signal-bus.js').SignalBus} signalBus
   */
  constructor(signalBus) {
    this.signalBus = signalBus;

    /** @type {Map<string, {sourceId: string, destId: string, color: string}>} */
    this.patches = new Map(); // key: "sourceId->destId"

    /** @type {Map<string, boolean>} active normalled connections */
    this._normalledActive = new Map();
  }

  /**
   * Establish all normalled (default) connections.
   * Called after all modules are registered in the signal bus.
   */
  establishNormalledConnections() {
    for (const conn of NORMALLED_CONNECTIONS) {
      const sourceNode = this.signalBus.getNode(conn.source);
      const destNode = this.signalBus.getNode(conn.destination);

      if (sourceNode && destNode) {
        try {
          sourceNode.connect(destNode);
          this._normalledActive.set(conn.destination, true);
        } catch (e) {
          console.warn(`Failed to establish normalled connection ${conn.source} → ${conn.destination}:`, e);
        }
      }
    }
  }

  /**
   * Create a patch cable connection.
   * @param {string} sourceId - Output jack ID
   * @param {string} destId - Input jack ID
   * @param {string} color - Cable color
   * @returns {string|null} Patch ID or null if invalid
   */
  connect(sourceId, destId, color = '#e74c3c') {
    const sourceJack = this.signalBus.get(sourceId);
    const destJack = this.signalBus.get(destId);

    if (!sourceJack || !destJack) return null;
    if (sourceJack.type !== JACK_TYPE.OUTPUT || destJack.type !== JACK_TYPE.INPUT) return null;

    const patchId = `${sourceId}->${destId}`;

    // Don't create duplicate patches
    if (this.patches.has(patchId)) return patchId;

    // Break normalled connection to this input (if any)
    this._breakNormalled(destId);

    // Connect the new source
    const sourceNode = sourceJack.node;
    const destNode = destJack.node;
    try {
      sourceNode.connect(destNode);
    } catch (e) {
      console.warn(`Failed to connect ${sourceId} → ${destId}:`, e);
      return null;
    }

    // Record the patch
    this.patches.set(patchId, { sourceId, destId, color });
    this.signalBus.setPatched(destId, true);
    this.signalBus.setPatched(sourceId, true);

    return patchId;
  }

  /**
   * Remove a patch cable connection.
   * @param {string} patchId - The patch ID ("sourceId->destId")
   */
  disconnect(patchId) {
    const patch = this.patches.get(patchId);
    if (!patch) return;

    const sourceNode = this.signalBus.getNode(patch.sourceId);
    const destNode = this.signalBus.getNode(patch.destId);

    // Disconnect the patched source from the destination
    if (sourceNode && destNode) {
      try {
        sourceNode.disconnect(destNode);
      } catch (e) {
        // May already be disconnected
      }
    }

    this.patches.delete(patchId);

    // Check if any other patches still connect to this dest
    const destStillPatched = this._isDestinationPatched(patch.destId);
    if (!destStillPatched) {
      this.signalBus.setPatched(patch.destId, false);
      // Restore normalled connection
      this._restoreNormalled(patch.destId);
    }

    // Check if source is still patched anywhere
    const sourceStillPatched = this._isSourcePatched(patch.sourceId);
    if (!sourceStillPatched) {
      this.signalBus.setPatched(patch.sourceId, false);
    }
  }

  /**
   * Remove all patch cables.
   */
  disconnectAll() {
    const patchIds = [...this.patches.keys()];
    for (const patchId of patchIds) {
      this.disconnect(patchId);
    }
  }

  /**
   * Get all current patches.
   */
  getPatches() {
    return [...this.patches.values()];
  }

  /**
   * Get patches connected to a specific jack.
   */
  getPatchesForJack(jackId) {
    const result = [];
    for (const patch of this.patches.values()) {
      if (patch.sourceId === jackId || patch.destId === jackId) {
        result.push(patch);
      }
    }
    return result;
  }

  /**
   * Break the normalled connection for an input jack.
   */
  _breakNormalled(destId) {
    const normalledConn = NORMALLED_CONNECTIONS.find(c => c.destination === destId);
    if (!normalledConn) return;
    if (!this._normalledActive.get(destId)) return;

    const sourceNode = this.signalBus.getNode(normalledConn.source);
    const destNode = this.signalBus.getNode(destId);

    if (sourceNode && destNode) {
      try {
        sourceNode.disconnect(destNode);
      } catch (e) {
        // May not be connected
      }
    }

    this._normalledActive.set(destId, false);
  }

  /**
   * Restore the normalled connection for an input jack.
   */
  _restoreNormalled(destId) {
    const normalledConn = NORMALLED_CONNECTIONS.find(c => c.destination === destId);
    if (!normalledConn) return;

    const sourceNode = this.signalBus.getNode(normalledConn.source);
    const destNode = this.signalBus.getNode(destId);

    if (sourceNode && destNode) {
      try {
        sourceNode.connect(destNode);
        this._normalledActive.set(destId, true);
      } catch (e) {
        console.warn(`Failed to restore normalled connection to ${destId}:`, e);
      }
    }
  }

  /**
   * Check if any patch cable is connected to a destination.
   */
  _isDestinationPatched(destId) {
    for (const patch of this.patches.values()) {
      if (patch.destId === destId) return true;
    }
    return false;
  }

  /**
   * Check if any patch cable is connected from a source.
   */
  _isSourcePatched(sourceId) {
    for (const patch of this.patches.values()) {
      if (patch.sourceId === sourceId) return true;
    }
    return false;
  }
}
